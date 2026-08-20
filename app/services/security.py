from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
import hashlib
import ipaddress
from threading import Lock
from time import monotonic
from urllib.parse import urlsplit

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


@dataclass(frozen=True)
class RatePolicy:
    requests: int
    window_seconds: int


RATE_POLICIES = {
    "auth": RatePolicy(10, 60),
    "llm": RatePolicy(20, 60),
    "write": RatePolicy(90, 60),
    "default": RatePolicy(240, 60),
}


def _origin_matches_safe_local_request(request: Request, origin: str) -> bool:
    """Allow genuine same-origin requests made through a loopback/private LAN host."""
    try:
        parsed = urlsplit(origin)
        request_host = request.url.hostname
        if not parsed.scheme or not parsed.hostname or not request_host:
            return False
        origin_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        request_port = request.url.port or (443 if request.url.scheme == "https" else 80)
        same_origin = (
            parsed.scheme == request.url.scheme
            and parsed.hostname.casefold() == request_host.casefold()
            and origin_port == request_port
        )
        if not same_origin:
            return False
        if request_host.casefold() == "localhost":
            return True
        address = ipaddress.ip_address(request_host)
        return address.is_private or address.is_loopback
    except (ValueError, TypeError):
        return False


class SlidingWindowRateLimiter:
    """Thread-safe limiter with an interface that can later be backed by Redis."""

    def __init__(self) -> None:
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, bucket: str, identity: str, policy: RatePolicy) -> tuple[bool, int, int]:
        now = monotonic()
        key = (bucket, identity)
        with self._lock:
            events = self._events[key]
            while events and events[0] <= now - policy.window_seconds:
                events.popleft()
            if len(events) >= policy.requests:
                retry_after = max(1, int(policy.window_seconds - (now - events[0])))
                return False, 0, retry_after
            events.append(now)
            return True, policy.requests - len(events), policy.window_seconds


def route_bucket(request: Request) -> str:
    path = request.url.path
    if path.startswith("/auth/"):
        return "auth"
    if path in {"/me/recommendations", "/me/chat", "/me/chat/stream"}:
        return "llm"
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        return "write"
    return "default"


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origins: tuple[str, ...], enabled: bool = True) -> None:
        super().__init__(app)
        self.allowed_origins = set(allowed_origins)
        self.enabled = enabled
        self.limiter = SlidingWindowRateLimiter()

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        origin_allowed = not origin or origin in self.allowed_origins or _origin_matches_safe_local_request(request, origin)
        if request.method not in {"GET", "HEAD", "OPTIONS"} and not origin_allowed:
            return JSONResponse({"detail": "Geçersiz istek kaynağı."}, status_code=403)
        if self.enabled and not request.url.path.startswith(("/static/", "/health", "/ready")):
            session_token = request.cookies.get("book_access_token")
            identity = ("session:" + hashlib.sha256(session_token.encode()).hexdigest()[:20]) if session_token else (
                "ip:" + (request.client.host if request.client else "unknown")
            )
            bucket = route_bucket(request)
            allowed, remaining, retry_after = self.limiter.check(bucket, identity, RATE_POLICIES[bucket])
            if not allowed:
                return JSONResponse(
                    {"detail": "Çok fazla istek gönderildi. Lütfen kısa süre sonra yeniden deneyin."},
                    status_code=429,
                    headers={"Retry-After": str(retry_after), "X-RateLimit-Remaining": "0"},
                )
        else:
            remaining = 0
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
            "Content-Security-Policy": "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
            "X-RateLimit-Remaining": str(remaining),
        })
        return response

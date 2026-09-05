from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
import hashlib
import ipaddress
import secrets
from threading import Lock
from time import monotonic, time
from urllib.parse import urlsplit

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.concurrency import run_in_threadpool


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


class RedisSlidingWindowRateLimiter:
    """Atomic cross-process rate limiter backed by a shared Redis instance."""

    SCRIPT = """
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local maximum = tonumber(ARGV[3])
    local member = ARGV[4]
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    local count = redis.call('ZCARD', key)
    if count >= maximum then
      local ttl = redis.call('PTTL', key)
      if ttl < 1 then ttl = window end
      return {0, 0, ttl}
    end
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, window)
    return {1, maximum - count - 1, window}
    """

    def __init__(self, redis_url: str, key_prefix: str = "mihenk") -> None:
        try:
            import redis
            from redis.backoff import NoBackoff
            from redis.retry import Retry
        except ImportError as error:  # pragma: no cover - guarded by production dependencies
            raise RuntimeError("REDIS_URL için redis paketi kurulmalıdır.") from error
        self.client = redis.Redis.from_url(
            redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2,
            retry=Retry(NoBackoff(), 0),
        )
        self.key_prefix = key_prefix
        self.script = self.client.register_script(self.SCRIPT)

    def check(self, bucket: str, identity: str, policy: RatePolicy) -> tuple[bool, int, int]:
        digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()
        key = f"{self.key_prefix}:rate:{bucket}:{digest}"
        now_ms = int(time() * 1000)
        result = self.script(
            keys=[key],
            args=[now_ms, policy.window_seconds * 1000, policy.requests,
                  f"{now_ms}:{secrets.token_hex(8)}"],
        )
        return bool(int(result[0])), int(result[1]), max(1, int(result[2]) // 1000)


class EmailSendGuard:
    """Shared quotas stop IP rotation from generating unlimited auth email."""
    def __init__(self, redis_url="", key_prefix="mihenk"):
        self.limiter = (RedisSlidingWindowRateLimiter(redis_url, key_prefix)
                        if redis_url else SlidingWindowRateLimiter())

    def check(self, email: str) -> tuple[bool, int, int]:
        identity = hashlib.sha256(email.strip().casefold().encode()).hexdigest()
        result = self.limiter.check("auth-email-recipient", identity, RatePolicy(3, 3600))
        if not result[0]:
            return result
        return self.limiter.check("auth-email-total", "application", RatePolicy(100, 3600))


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
    def __init__(self, app, allowed_origins: tuple[str, ...], enabled: bool = True,
                 redis_url: str = "", redis_key_prefix: str = "mihenk",
                 strict_origin: bool = False) -> None:
        super().__init__(app)
        self.allowed_origins = set(allowed_origins)
        self.enabled = enabled
        self.strict_origin = strict_origin
        self.fallback_limiter = SlidingWindowRateLimiter()
        self.limiter = (
            RedisSlidingWindowRateLimiter(redis_url, redis_key_prefix)
            if redis_url else self.fallback_limiter
        )

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        origin_allowed = origin in self.allowed_origins or (
            not self.strict_origin and origin and _origin_matches_safe_local_request(request, origin)
        )
        # Explicit foreign origins are rejected even for reads. A missing Origin
        # is normal for navigation/health checks, but not for browser mutations.
        unsafe = request.method not in {"GET", "HEAD", "OPTIONS"}
        if (origin and not origin_allowed) or (
            self.strict_origin and unsafe and not origin
            and request.url.path != "/internal/pipelines/prices"
        ) or (self.strict_origin and request.headers.get("sec-fetch-site") == "cross-site"
              and not origin_allowed):
            return JSONResponse({"detail": "Geçersiz istek kaynağı."}, status_code=403)
        if self.enabled and not (request.url.path.startswith("/static/") or request.url.path in {"/health", "/ready"}):
            # Never trust an unverified cookie (or raw X-Forwarded-For) as the
            # limiter identity. Uvicorn handles only configured trusted proxies.
            identity = "ip:" + (request.client.host if request.client else "unknown")
            bucket = route_bucket(request)
            try:
                allowed, remaining, retry_after = await run_in_threadpool(
                    self.limiter.check, bucket, identity, RATE_POLICIES[bucket]
                )
            except Exception:
                if self.strict_origin:
                    return JSONResponse({"detail": "İstek koruması geçici olarak kullanılamıyor."},
                                        status_code=503, headers={"Retry-After": "30"})
                # A Redis outage degrades to per-process protection instead of disabling limits.
                allowed, remaining, retry_after = self.fallback_limiter.check(
                    bucket, identity, RATE_POLICIES[bucket]
                )
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
            "Content-Security-Policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
            "X-RateLimit-Remaining": str(remaining),
        })
        if self.strict_origin:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        if request.url.path.startswith(("/me/", "/admin/", "/auth/")):
            response.headers["Cache-Control"] = "no-store, private"
        return response

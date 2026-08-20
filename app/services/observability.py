"""Dependency-light structured logging and bounded in-process RED metrics."""

from __future__ import annotations

from collections import Counter, defaultdict, deque
import asyncio
import json
import logging
from threading import RLock
from time import perf_counter
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


logger = logging.getLogger("kitap_pusulasi.http")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class MetricsRegistry:
    def __init__(self, sample_size: int = 5000) -> None:
        self.counts: Counter = Counter()
        self.durations: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=sample_size))
        self._lock = RLock()

    def observe(self, route: str, status: int, duration_ms: float) -> None:
        with self._lock:
            self.counts[(route, status)] += 1
            self.durations[route].append(duration_ms)

    def increment(self, name: str, amount: int = 1) -> None:
        with self._lock:
            self.counts[("business", name)] += amount

    @staticmethod
    def percentile(values: list[float], value: float) -> float:
        if not values: return 0.0
        ordered = sorted(values); index = min(len(ordered) - 1, round((len(ordered) - 1) * value))
        return round(ordered[index], 2)

    def snapshot(self) -> dict:
        with self._lock:
            routes = {}
            for route, samples in self.durations.items():
                values = list(samples)
                routes[route] = {"requests": sum(count for (path, _), count in self.counts.items() if path == route),
                                 "errors": sum(count for (path, status), count in self.counts.items() if path == route and status >= 500),
                                 "p50_ms": self.percentile(values, .50), "p95_ms": self.percentile(values, .95), "p99_ms": self.percentile(values, .99)}
            business = {
                name: count for (namespace, name), count in self.counts.items()
                if namespace == "business"
            }
            auth_attempts = business.get("login_success", 0) + business.get("login_failure", 0)
            business["login_failure_rate"] = round(
                business.get("login_failure", 0) / auth_attempts, 4
            ) if auth_attempts else 0
            return {"routes": routes, "business": business,
                    "sample_window": max((len(value) for value in self.durations.values()), default=0)}


metrics = MetricsRegistry()


class RecentEvents:
    def __init__(self, maximum: int = 1000) -> None:
        self._items: deque[dict] = deque(maxlen=maximum)
        self._lock = RLock()

    def add(self, item: dict) -> None:
        with self._lock: self._items.appendleft(item)

    def snapshot(self, limit: int = 200, level: str | None = None) -> list[dict]:
        with self._lock:
            rows = list(self._items)
        if level: rows = [row for row in rows if row["level"] == level]
        return rows[:limit]


recent_events = RecentEvents()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", "")[:100] or str(uuid4())
        request.state.request_id = request_id
        started = perf_counter(); status = 500
        try:
            response = await call_next(request); status = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            elapsed = round((perf_counter() - started) * 1000, 2)
            route = request.scope.get("route"); route_path = getattr(route, "path", request.url.path)
            metrics.observe(route_path, status, elapsed)
            if route_path == "/auth/login":
                metrics.increment("login_success" if status < 400 else "login_failure")
                if status in {401, 429}:
                    metrics.increment("suspicious_login_attempts")
            if status == 429:
                metrics.increment("rate_limited_requests")
            event = {"level": "error" if status >= 500 else "warning" if status >= 400 else "info",
                     "event_type": "http_request", "request_id": request_id, "method": request.method,
                     "route": route_path, "status_code": status, "duration_ms": elapsed}
            recent_events.add(event)
            logger.info(json.dumps(event, ensure_ascii=False))
            sink = getattr(request.app.state, "application_event_sink", None)
            # Successful requests are already available in the bounded in-memory
            # log. Persist only failures so observability never adds a database
            # round-trip to a successful admin response.
            if sink and status >= 400:
                try:
                    await asyncio.to_thread(sink, event["level"], event["event_type"], request_id,
                                            route_path, status, elapsed, {"method": request.method})
                except Exception:
                    logger.exception("application_event_persist_failed")

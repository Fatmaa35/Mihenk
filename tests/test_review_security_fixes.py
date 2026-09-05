import asyncio
import threading
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.repositories.supabase.community import SupabaseCommunityMixin
from app.services.security import RedisSlidingWindowRateLimiter, SecurityMiddleware
from app.services.observability import MetricsRegistry, ObservabilityMiddleware


OPERATIONS = [
    ("send_room_message", "book_club_rooms", "book_club_room_messages", "message", PermissionError),
    ("toggle_book_club_reaction", "book_club_discussions", "book_club_reactions", "heart", KeyError),
    ("rsvp_book_club_event", "book_club_events", "book_club_event_rsvps", "attending", KeyError),
]


@pytest.mark.parametrize("operation,target_table,write_table,value,error", OPERATIONS)
@pytest.mark.parametrize("target_club", ["club-A", "club-B", None])
def test_supabase_club_mutations_require_matching_target(
        operation, target_table, write_table, value, error, target_club):
    repository = SupabaseCommunityMixin()
    calls = []

    def request(method, path, **kwargs):
        calls.append((method, path, kwargs))
        params = kwargs.get("params", {})
        if path == "/rest/v1/book_club_members":
            rows = [{"role": "member", "user_id": "reader"}]
        elif path == f"/rest/v1/{target_table}":
            rows = [{"id": "target", "club_id": target_club}] if target_club else []
            rows = [row for row in rows if all(
                params.get(key, f"eq.{row[key]}") == f"eq.{row[key]}" for key in ("id", "club_id"))]
        else:
            rows = []
        return SimpleNamespace(json=lambda: rows)

    repository._request = request
    repository.get_or_create_club_room = Mock(return_value={"ok": True})
    repository.book_club_detail = Mock(return_value={"ok": True})
    invoke = lambda: getattr(repository, operation)("reader", "club-A", "target", value)
    if target_club == "club-A":
        assert invoke() == {"ok": True}
        assert any(method == "POST" and path == f"/rest/v1/{write_table}" for method, path, _ in calls)
    else:
        with pytest.raises(error):
            invoke()
        assert all(method == "GET" for method, _, _ in calls)


def test_sqlite_cannot_send_to_another_clubs_room(tmp_path):
    from app.database import Repository
    repository = Repository(tmp_path / "rooms.db")
    user = repository.create_user("Reader")
    other = repository.create_user("Other")
    club_a = repository.create_book_club(user["id"], "Club A", "", "private")
    club_b = repository.create_book_club(other["id"], "Club B", "", "private")
    room_b = repository.get_or_create_club_room(other["id"], club_b["id"])
    with pytest.raises(PermissionError):
        repository.send_room_message(user["id"], club_a["id"], room_b["id"], "unauthorized")
    with repository.connect() as connection:
        assert connection.execute("SELECT count(*) FROM book_club_room_messages").fetchone()[0] == 0


def request_for(app):
    return Request({"type": "http", "http_version": "1.1", "method": "GET", "scheme": "https",
                    "path": "/catalog", "query_string": b"", "headers": [],
                    "client": ("8.8.8.8", 123), "server": ("mihenk.test", 443), "app": app})


@pytest.mark.parametrize("kind", ["limiter", "metrics"])
def test_redis_work_does_not_block_event_loop(kind):
    async def scenario():
        app = FastAPI()
        started = asyncio.Event()
        release = threading.Event()
        loop = asyncio.get_running_loop()

        def blocking(*args):
            loop.call_soon_threadsafe(started.set)
            release.wait(1)
            return True, 10, 60

        if kind == "limiter":
            middleware = SecurityMiddleware(app, (), strict_origin=True)
            middleware.limiter = SimpleNamespace(check=blocking)
        else:
            middleware = ObservabilityMiddleware(app)
            middleware.record_metrics = blocking

        async def next_handler(request):
            return JSONResponse({"ok": True})

        pending = asyncio.create_task(middleware.dispatch(request_for(app), next_handler))
        try:
            await asyncio.wait_for(started.wait(), timeout=2)
            # The event loop must execute this while Redis is still waiting.
            assert not pending.done()
        finally:
            release.set()
            response = await pending
        assert response.status_code == 200

    asyncio.run(scenario())


def test_redis_timeout_fails_closed_in_production():
    async def scenario():
        app = FastAPI()
        middleware = SecurityMiddleware(app, (), strict_origin=True)
        middleware.limiter = SimpleNamespace(check=Mock(side_effect=TimeoutError("Redis timed out")))
        next_handler = Mock()
        response = await middleware.dispatch(request_for(app), next_handler)
        assert response.status_code == 503
        assert response.headers["Retry-After"] == "30"
        next_handler.assert_not_called()
    asyncio.run(scenario())


def test_all_redis_clients_have_bounded_io_and_no_retries():
    limiter = RedisSlidingWindowRateLimiter("redis://localhost:6379")
    metrics = MetricsRegistry()
    metrics.configure_redis("redis://localhost:6379", "test")
    for client in (limiter.client, metrics._redis):
        options = client.connection_pool.connection_kwargs
        assert options["socket_timeout"] == 2
        assert options["socket_connect_timeout"] == 2
        assert options["retry"].get_retries() == 0
        client.close()

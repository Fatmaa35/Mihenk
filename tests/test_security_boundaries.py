import socket
from dataclasses import replace
from unittest.mock import Mock

import pytest
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.schemas import BookCommentCreate, BookCommentPatch, PushSubscriptionUpsert
from app.services import outbound_http
from app.services.security import SecurityMiddleware


def secured_client(*, enabled=False, origin="https://mihenk.test"):
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=[origin],
                       allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
    app.add_middleware(SecurityMiddleware, allowed_origins=(origin,),
                       strict_origin=True, enabled=enabled)
    @app.api_route("/auth/login", methods=["GET", "POST"])
    def login():
        return {"ok": True}
    @app.api_route("/", methods=["GET", "HEAD", "POST"])
    def landing():
        return {"ok": True}
    return TestClient(app, base_url=origin)


def test_mihenk_render_origin_is_the_only_allowed_site():
    origin = "https://mihenk-web-production.onrender.com"
    client = secured_client(origin=origin)
    allowed = client.post("/auth/login", headers={"Origin": origin})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == origin
    for foreign in ["https://other.onrender.com", origin + ".evil.test", "http://localhost:5173"]:
        result = client.post("/auth/login", headers={"Origin": foreign})
        assert result.status_code == 403
        assert "access-control-allow-origin" not in result.headers


def test_production_origin_boundary_and_preflight():
    client = secured_client()
    assert client.post("/auth/login").status_code == 403
    for origin in ["null", "https://evil.test", "https://mihenk.test.evil.test", "http://127.0.0.1"]:
        assert client.get("/auth/login", headers={"Origin": origin}).status_code == 403
        assert client.post("/auth/login", headers={"Origin": origin}).status_code == 403
    allowed = client.post("/auth/login", headers={"Origin": "https://mihenk.test"})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://mihenk.test"
    assert client.options("/auth/login", headers={"Origin": "https://mihenk.test",
                          "Access-Control-Request-Method": "POST"}).status_code == 200
    assert client.get("/auth/login").status_code == 200
    assert client.get("/auth/login", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403


def test_email_redirect_allows_only_public_document_navigation():
    client = secured_client()
    headers = {"Sec-Fetch-Site": "cross-site", "Sec-Fetch-Mode": "navigate",
               "Sec-Fetch-Dest": "document"}
    for method in ["GET", "HEAD"]:
        result = client.request(method, "/", headers=headers)
        assert result.status_code == 200
        assert "access-control-allow-origin" not in result.headers
    assert client.post("/", headers=headers).status_code == 403
    assert client.get("/auth/login", headers=headers).status_code == 403
    assert client.get("/", headers={**headers, "Origin": "https://evil.test"}).status_code == 403
    assert client.get("/", headers={**headers, "Sec-Fetch-Dest": "iframe"}).status_code == 403
    assert client.get("/", headers={**headers, "Sec-Fetch-Mode": "cors"}).status_code == 403


def test_cookie_and_forwarded_header_rotation_cannot_evade_ip_limit():
    client = secured_client(enabled=True)
    for index in range(10):
        result = client.post("/auth/login", headers={"Origin": "https://mihenk.test",
            "Cookie": f"book_access_token=forged-{index}", "X-Forwarded-For": f"8.8.8.{index}"})
        assert result.status_code == 200
    assert client.post("/auth/login", headers={"Origin": "https://mihenk.test"}).status_code == 429


@pytest.mark.parametrize("content", [
    '<script>alert(1)</script>Güzel kitap', '<img src=x onerror=alert(1)>Güzel kitap',
    '&lt;script&gt;alert(1)&lt;/script&gt;Güzel kitap', '<svg onload=alert(1)></svg>Güzel kitap',
])
def test_comments_create_and_edit_strip_active_markup(content):
    assert BookCommentCreate(book_id="book", content=content).content == "Güzel kitap"
    assert BookCommentPatch(content=content).content == "Güzel kitap"


def test_empty_script_comment_is_not_stored():
    with pytest.raises(ValidationError):
        BookCommentCreate(book_id="book", content="<script>alert(1)</script>")


@pytest.mark.parametrize("url", ["https://127.0.0.1/private", "https://169.254.169.254/latest",
    "https://fcm.googleapis.com.evil.test/token", "https://fcm.googleapis.com@evil.test/token",
    "https://fcm.googleapis.com:8443/token", "http://fcm.googleapis.com/token"])
def test_push_rejects_untrusted_endpoints(url):
    with pytest.raises(ValidationError):
        PushSubscriptionUpsert(endpoint=url, p256dh="x" * 30, auth="a" * 12)


def test_saved_push_endpoint_is_checked_before_delivery():
    from app.services.notification_delivery import WebPushDelivery
    with pytest.raises(ValueError):
        WebPushDelivery("unused", "mailto:test@example.com").send(
            {"endpoint": "https://127.0.0.1/private"}, "Title", "Body")


def test_dns_private_address_is_rejected(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **kw: [
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))])
    with pytest.raises(ValueError):
        outbound_http.safe_get("https://fcm.googleapis.com/token", allowed_hosts=outbound_http.PUSH_HOSTS)


@pytest.mark.parametrize("status,body", [(302, b""), (200, b"x" * (outbound_http.MAX_RESPONSE_BYTES + 1))],
                         ids=["redirect", "oversized"])
def test_redirects_and_large_responses_are_blocked(monkeypatch, status, body):
    raw = Mock(status=status, headers={})
    raw.read.return_value = body
    pool = Mock()
    pool.urlopen.return_value = raw
    factory = Mock(return_value=pool)
    monkeypatch.setattr(outbound_http, "public_address", lambda host: "8.8.8.8")
    monkeypatch.setattr(outbound_http.urllib3, "HTTPSConnectionPool", factory)
    with pytest.raises(ValueError):
        outbound_http.safe_get("https://fcm.googleapis.com/token", allowed_hosts=outbound_http.PUSH_HOSTS)
    assert factory.call_args.args[0] == "8.8.8.8"
    assert factory.call_args.kwargs["assert_hostname"] == "fcm.googleapis.com"
    assert factory.call_args.kwargs["server_hostname"] == "fcm.googleapis.com"
    assert pool.urlopen.call_args.kwargs["redirect"] is False
    assert pool.urlopen.call_count == 1


def test_auth_response_omits_credentials():
    from app.routers.auth import public_account
    assert public_account({"id": "user", "email": "user@example.com", "password_hash": "secret",
                           "access_token": "secret", "refresh_token": "secret", "internal": "hidden"}) == {
        "id": "user", "email": "user@example.com"}


def test_database_error_does_not_disclose_schema():
    from app.main import supabase_error_handler
    from app.supabase_repository import SupabaseRequestError
    response = supabase_error_handler(None, SupabaseRequestError("public.secret_table secret_value", 404))
    assert response.status_code == 502
    assert b"secret" not in response.body


def test_validation_response_does_not_echo_password():
    from app.main import app
    result = TestClient(app).post("/auth/login", json={"email": "user@example.com", "password": "secret"})
    assert result.status_code == 422
    assert "secret" not in result.text
    assert "input" not in result.text


def test_sql_injection_does_not_bypass_login(tmp_path):
    from app.database import Repository
    repository = Repository(tmp_path / "injection.db")
    repository.register("Reader", "reader@example.com", "correct-password")
    with pytest.raises(ValueError):
        repository.open_login_session("' OR 1=1 --", "incorrect-password")


def test_auth_email_quota_is_shared_across_case_changes():
    from app.services.security import EmailSendGuard
    guard = EmailSendGuard()
    for _ in range(3):
        assert guard.check("Reader@example.com")[0]
    assert not guard.check(" reader@EXAMPLE.com ")[0]
    assert guard.check("another@example.com")[0]


def test_auth_email_global_quota_limits_rotating_recipients():
    from app.services.security import EmailSendGuard
    guard = EmailSendGuard()
    for index in range(100):
        assert guard.check(f"reader{index}@example.com")[0]
    assert not guard.check("reader101@example.com")[0]


@pytest.mark.parametrize("origin", ["https://*", "https://", "https://evil.test/path",
                                      "https://user:password@evil.test", "https://localhost"])
def test_production_rejects_unsafe_cors_configuration(origin):
    from app.config import settings
    config = replace(settings, app_environment="production", data_backend="supabase",
        cookie_secure=True, rate_limit_enabled=True, redis_url="redis://localhost:6379",
        supabase_url="https://project.supabase.co", supabase_publishable_key="test",
        supabase_secret_key="test", privacy_contact_email="privacy@example.com",
        recovery_redirect_url="https://mihenk.test/", allowed_origins=(origin,))
    with pytest.raises(ValueError):
        config.validate()

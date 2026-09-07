from dataclasses import replace
from unittest.mock import Mock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import runtime
from app.routers import admin, auth
from app.supabase_repository import SupabaseRepository, SupabaseRequestError


@pytest.fixture
def invitation_service(monkeypatch):
    service = Mock(backend_name="supabase")
    service.invite_user.return_value = {"id": "invited-reader"}
    monkeypatch.setattr(admin, "repository", service)
    monkeypatch.setattr(admin, "settings", replace(admin.settings, recovery_redirect_url="https://mihenk.test/"))
    return service


def client_for(role):
    client = TestClient(app)
    if role is not None:
        email = f"{uuid4()}@example.com"
        user = runtime.repository.register("Test Reader", email, "safe-password")
        runtime.repository.set_user_role(user["id"], role)
        client.cookies.set(runtime.ACCESS_COOKIE, runtime.repository.create_session(user["id"]))
    return client


@pytest.mark.parametrize("role,status", [(None, 401), ("user", 403), ("editor", 403)])
def test_only_admin_can_send_invitation(invitation_service, role, status):
    response = client_for(role).post("/admin/invitations", json={"display_name": "Reader", "email": "reader@example.com"})
    assert response.status_code == status
    invitation_service.invite_user.assert_not_called()


def test_admin_invitation_uses_server_redirect_and_audits(invitation_service):
    response = client_for("admin").post("/admin/invitations", json={
        "display_name": "Reader", "email": "reader@example.com", "redirect_to": "https://untrusted.test/", "role": "admin",
    })
    assert response.status_code == 201
    invitation_service.invite_user.assert_called_once_with("Reader", "reader@example.com", "https://mihenk.test/")
    assert invitation_service.audit.call_args.args[1:4] == ("user.invited", "user", "invited-reader")
    assert set(response.json()) == {"message"}


def test_invitation_respects_email_quota(invitation_service, monkeypatch):
    from fastapi import HTTPException
    def exhausted(email):
        raise HTTPException(429, "E-posta istek sınırına ulaşıldı.")
    monkeypatch.setattr(admin, "guard_auth_email", exhausted)
    response = client_for("admin").post("/admin/invitations", json={"display_name": "Reader", "email": "reader@example.com"})
    assert response.status_code == 429
    invitation_service.invite_user.assert_not_called()


@pytest.mark.parametrize("email", ["invalid", "reader@example.com\n", "a" * 255 + "@example.com"])
def test_invalid_invitation_email_is_not_sent(invitation_service, email):
    response = client_for("admin").post("/admin/invitations", json={"display_name": "Reader", "email": email})
    assert response.status_code == 422
    invitation_service.invite_user.assert_not_called()


def test_existing_account_invitation_has_actionable_error(invitation_service):
    invitation_service.invite_user.side_effect = SupabaseRequestError("private upstream details", 422)
    response = client_for("admin").post("/admin/invitations", json={"display_name": "Reader", "email": "reader@example.com"})
    assert response.status_code == 400
    assert "zaten kayıtlı" in response.json()["detail"]
    assert "private upstream" not in response.text
    invitation_service.audit.assert_not_called()


def test_sqlite_invitation_does_not_claim_email_sent(invitation_service):
    invitation_service.backend_name = "sqlite"
    response = client_for("admin").post("/admin/invitations", json={"display_name": "Reader", "email": "reader@example.com"})
    assert response.status_code == 503
    invitation_service.invite_user.assert_not_called()


def test_public_registration_can_be_open_or_closed(monkeypatch):
    for enabled, status in [(True, 201), (False, 403)]:
        monkeypatch.setattr(auth, "settings", replace(auth.settings, allow_registration=enabled))
        response = TestClient(app).post("/auth/register", json={
            "display_name": "Public Reader", "email": f"{uuid4()}@example.com", "password": "safe-password",
        })
        assert response.status_code == status


def test_invitation_and_password_use_separate_credentials():
    import json
    seen = []
    def handler(request):
        seen.append(request.url.path)
        if request.url.path == "/auth/v1/invite":
            assert request.headers["apikey"] == "test-secret"
            assert request.url.params["redirect_to"] == "https://mihenk.test/"
            assert json.loads(request.content) == {"email": "reader@example.com", "data": {"display_name": "Reader"}}
            return httpx.Response(200, json={"id": "reader-id", "email": "reader@example.com"})
        assert request.url.path == "/auth/v1/user"
        assert request.headers["apikey"] == "test-public"
        assert request.headers["authorization"] == "Bearer invitation-access-token"
        assert json.loads(request.content) == {"password": "safe-password"}
        return httpx.Response(200, json={"id": "reader-id"})
    repository = SupabaseRepository("https://project.supabase.co", "test-public", "test-secret")
    repository.client.close()
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        repository.client = client
        assert repository.invite_user(" Reader ", "READER@example.com", "https://mihenk.test/") == {"id": "reader-id"}
        repository.reset_password("invitation-access-token", "safe-password")
    assert seen == ["/auth/v1/invite", "/auth/v1/user"]


@pytest.mark.parametrize("status", [401, 403, 404])
def test_expired_invitation_token_cannot_set_password(monkeypatch, status):
    service = Mock()
    service.reset_password.side_effect = SupabaseRequestError("private auth error", status)
    monkeypatch.setattr(auth, "repository", service)
    response = TestClient(app).post("/auth/password/reset", json={
        "recovery_token": "expired-invitation-token", "new_password": "safe-password",
    })
    assert response.status_code == 400
    assert "süresi dolmuş" in response.json()["detail"]
    assert "private auth" not in response.text

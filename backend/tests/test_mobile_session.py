"""The native app carries the session in headers instead of cookies."""
from uuid import uuid4

from fastapi.testclient import TestClient

MOBILE = {"X-Mihenk-Client": "mobile"}


def _mobile_client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_mobile_login_returns_tokens_in_headers_not_cookies() -> None:
    client = _mobile_client()
    email = f"mobile-{uuid4().hex[:8]}@example.com"
    registered = client.post("/auth/register", headers=MOBILE,
                             json={"display_name": "Mobil Okur", "email": email, "password": "en-az-sekiz"})
    assert registered.status_code == 201
    assert "set-cookie" not in registered.headers
    assert "no-store" in registered.headers.get("cache-control", "")
    access = registered.headers["x-session-access-token"]

    client.cookies.clear()
    login = client.post("/auth/login", headers=MOBILE, json={"email": email, "password": "en-az-sekiz"})
    assert login.status_code == 200
    assert "set-cookie" not in login.headers
    access = login.headers["x-session-access-token"]

    authed = {**MOBILE, "Authorization": f"Bearer {access}"}
    me = client.get("/auth/me", headers=authed)
    assert me.status_code == 200
    assert me.json()["email"] == email
    shelf = client.put("/me/library", headers=authed,
                       json={"book_id": "sherlock-holmes-kizil-dosya", "shelf": "to_read"})
    assert shelf.status_code == 200

    assert client.post("/auth/logout", headers=authed).status_code == 204
    assert client.get("/auth/me", headers=authed).status_code == 401


def test_bearer_header_is_ignored_for_browser_clients() -> None:
    client = _mobile_client()
    email = f"mobile-{uuid4().hex[:8]}@example.com"
    registered = client.post("/auth/register", headers=MOBILE,
                             json={"display_name": "Mobil Okur", "email": email, "password": "en-az-sekiz"})
    access = registered.headers["x-session-access-token"]
    client.cookies.clear()
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {access}"}).status_code == 401


def test_data_export_downloads_a_json_file() -> None:
    client = _mobile_client()
    email = f"mobile-{uuid4().hex[:8]}@example.com"
    registered = client.post("/auth/register", headers=MOBILE,
                             json={"display_name": "Mobil Okur", "email": email, "password": "en-az-sekiz"})
    authed = {**MOBILE, "Authorization": f"Bearer {registered.headers['x-session-access-token']}"}
    exported = client.get("/me/data-export", headers=authed)
    assert exported.status_code == 200
    assert "attachment" in exported.headers["content-disposition"]
    assert exported.json()["account"]["email"] == email

from pathlib import Path

from fastapi.testclient import TestClient

from app.database import Repository


def test_password_is_hashed_and_session_resolves_user(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "auth.db")
    user = repository.register("Ada", "ada@example.com", "guvenli-parola")
    authenticated = repository.authenticate("ADA@example.com", "guvenli-parola")
    token = repository.create_session(user["id"])

    assert authenticated["id"] == user["id"]
    assert repository.session_user(token)["email"] == "ada@example.com"

    with repository.connect() as connection:
        account = connection.execute("SELECT password_hash FROM auth_accounts WHERE user_id=?", (user["id"],)).fetchone()
    assert account["password_hash"] != "guvenli-parola"


def test_me_endpoints_require_session() -> None:
    from app.main import app

    isolated_client = TestClient(app)
    assert isolated_client.get("/me/profile").status_code == 401


def test_register_cookie_supports_personal_library() -> None:
    from app.main import app

    session_client = TestClient(app)
    email = "reader-auth-test@example.com"
    response = session_client.post("/auth/register", json={"display_name": "Okur", "email": email, "password": "en-az-sekiz"})
    if response.status_code == 409:
        response = session_client.post("/auth/login", json={"email": email, "password": "en-az-sekiz"})
    assert response.status_code in (200, 201)
    assert session_client.get("/auth/me").status_code == 200
    update = session_client.put("/me/library", json={"book_id": "sherlock-holmes-kizil-dosya", "shelf": "to_read", "is_favorite": False})
    assert update.status_code == 200
    assert session_client.get("/me/profile").json()["to_read_books"][0]["id"] == "sherlock-holmes-kizil-dosya"


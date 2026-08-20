import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app

client = TestClient(app)


def test_pkm_reading_sessions_and_stats():
    email = f"pkm-reader-{uuid4().hex}@example.com"
    # Login or resolve session
    login_res = client.post("/auth/register", json={
        "display_name": "Test Reader",
        "email": email,
        "password": "Password123!"
    })
    if login_res.status_code == 409:
        login_res = client.post("/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
    assert login_res.status_code in (200, 201)
    cookies = login_res.cookies

    # Create custom book first
    custom_book_res = client.post("/me/custom-books", json={
        "title": "Kürk Mantolu Madonna",
        "author": "Sabahattin Ali",
        "genre": "Roman",
        "shelf": "reading",
        "current_page": 10,
        "total_pages": 160
    }, cookies=cookies)
    assert custom_book_res.status_code in (200, 201)
    custom_book_id = custom_book_res.json()["id"]

    # 1. Add reading session
    session_res = client.post("/me/reading-sessions", json={
        "custom_book_id": custom_book_id,
        "start_page": 10,
        "end_page": 40,
        "duration_minutes": 25
    }, cookies=cookies)
    assert session_res.status_code == 200
    data = session_res.json()
    assert data["pages_read"] == 30
    assert data["duration_minutes"] == 25
    assert data["reading_speed_pages_per_min"] == 1.2
    assert data["book_title"] == "Kürk Mantolu Madonna"

    # 2. List reading sessions
    list_res = client.get("/me/reading-sessions", cookies=cookies)
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert len(sessions) >= 1
    assert sessions[0]["id"] == data["id"]

    # 3. Get session stats & heatmap
    stats_res = client.get("/me/reading-sessions/stats", cookies=cookies)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_sessions"] >= 1
    assert stats["total_minutes"] >= 25
    assert stats["total_pages_read"] >= 30
    assert stats["average_reading_speed_pages_per_min"] > 0
    assert len(stats["heatmap_data"]) >= 1


def test_pkm_quotes():
    email = f"pkm-quotes-{uuid4().hex}@example.com"
    login_res = client.post("/auth/register", json={
        "display_name": "Quote Reader",
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 201
    cookies = login_res.cookies

    # Create custom book for quotes test
    custom_book_res = client.post("/me/custom-books", json={
        "title": "Saatleri Ayarlama Enstitüsü",
        "author": "Ahmet Hamdi Tanpınar",
        "genre": "Roman",
        "shelf": "reading",
        "current_page": 0,
        "total_pages": 380
    }, cookies=cookies)
    assert custom_book_res.status_code in (200, 201)
    custom_book_id = custom_book_res.json()["id"]

    # 1. Create quote
    quote_res = client.post("/me/quotes", json={
        "custom_book_id": custom_book_id,
        "quote_text": "Dünyada bana hiçbir şey, felsefeden daha heyecan verici görünmüyordu.",
        "page_number": 38,
        "tags": ["varoluşçuluk", "felsefe"],
        "source_type": "ocr"
    }, cookies=cookies)
    assert quote_res.status_code == 200
    q_data = quote_res.json()
    assert q_data["quote_text"].startswith("Dünyada bana")
    assert q_data["page_number"] == 38
    assert q_data["tags"] == ["varoluşçuluk", "felsefe"]

    # 2. List quotes
    quotes_res = client.get("/me/quotes", cookies=cookies)
    assert quotes_res.status_code == 200
    quotes_list = quotes_res.json()
    assert len(quotes_list) >= 1
    assert quotes_list[0]["id"] == q_data["id"]


def test_isbn_lookup_invalid():
    res = client.get("/books/isbn/invalid_isbn_123")
    assert res.status_code in (400, 404)


def test_isbn_lookup_get_is_read_only(monkeypatch):
    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "ISBN:9789750719387": {
                    "title": "Test Kitabı",
                    "authors": [{"name": "Test Yazarı"}],
                    "number_of_pages": 144,
                    "publishers": [{"name": "Test Yayınları"}],
                    "subjects": [{"name": "Roman"}],
                }
            }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.main.httpx.AsyncClient", lambda **kwargs: FakeClient())
    before = len(app.state.application_event_sink.__self__.list_books())
    response = client.get("/books/isbn/9789750719387")
    after = len(app.state.application_event_sink.__self__.list_books())

    assert response.status_code == 200
    assert response.json()["catalog_saved"] is False
    assert before == after


def test_isbn_import_requires_authentication():
    response = TestClient(app).post("/me/books/isbn/9789750719387")
    assert response.status_code == 401

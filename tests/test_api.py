import os
from pathlib import Path
from uuid import uuid4

os.environ["DATABASE_PATH"] = "data/test_api.db"
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_and_catalog() -> None:
    assert client.get("/health").json()["scoring"] == {
        "character": 0.45, "themes": 0.15, "reading_history": 0.4,
    }
    assert len(client.get("/books").json()) >= 10
    page = client.get("/catalog/books", params={"q": "roman", "limit": 3, "offset": 0}).json()
    assert page["limit"] == 3
    assert page["total"] >= len(page["items"])
    assert len(page["items"]) <= 3
    coverage = client.get("/catalog/coverage").json()
    assert coverage["books"] >= 10
    assert {"editions", "verified_turkish_editions", "priced_books", "offers"} <= coverage.keys()


def test_profile_to_recommendation_flow() -> None:
    email = f"ada-{uuid4()}@example.com"
    registration = client.post(
        "/auth/register",
        json={"display_name": "Ada", "email": email, "password": "guvenli-parola"},
    )
    assert registration.status_code == 201
    client.put("/me/library", json={"book_id": "suc-ve-ceza", "shelf": "read", "is_favorite": True})
    client.put("/me/library", json={"book_id": "sherlock-holmes-kizil-dosya", "shelf": "to_read", "is_favorite": False})
    response = client.post(
        "/me/recommendations",
        json={"character_description": "Analitik ve stratejik, gizem seven biriyim.", "limit": 4},
    )
    assert response.status_code == 200
    books = response.json()["recommended_books"]
    assert all(book["book_title"] != "Suç ve Ceza" for book in books)
    assert books[0]["book_title"] == "Kızıl Dosya"
    assert books[0]["already_in_watchlist"] is True


def test_user_preferences_are_saved_and_restored() -> None:
    email = f"tercih-{uuid4()}@example.com"
    registration = client.post(
        "/auth/register",
        json={"display_name": "Deniz", "email": email, "password": "guvenli-parola"},
    )
    assert registration.status_code == 201

    payload = {
        "personality_text": "Analitik, meraklı ve gizem seven biriyim.",
        "selected_traits": ["Analitik", "Meraklı"],
        "preferred_genres": ["Polisiye", "Bilim Kurgu"],
        "disliked_genres": ["Korku"],
    }
    saved = client.put("/me/preferences", json=payload)
    assert saved.status_code == 200
    assert saved.json()["user_id"] == registration.json()["id"]
    assert saved.json()["selected_traits"] == ["Analitik", "Meraklı"]

    restored = client.get("/me/preferences")
    assert restored.status_code == 200
    assert restored.json()["personality_text"] == payload["personality_text"]
    assert restored.json()["preferred_genres"] == ["Polisiye", "Bilim Kurgu"]


def test_reading_progress_goal_and_dashboard_flow() -> None:
    email = f"okuma-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Ece", "email": email, "password": "guvenli-parola"},
    ).status_code == 201

    progress = client.put(
        "/me/library",
        json={
            "book_id": "suc-ve-ceza", "shelf": "reading", "is_favorite": True,
            "current_page": 120, "total_pages": 600,
        },
    )
    assert progress.status_code == 200
    assert progress.json()["progress_percent"] == 20.0
    goal = client.put(
        "/me/reading-goal",
        json={"goal_year": 2026, "target_books": 24},
    )
    assert goal.status_code == 200
    dashboard = client.get("/me/reading-dashboard", params={"year": 2026}).json()
    assert dashboard["goal"]["target_books"] == 24
    assert dashboard["total_pages_read"] >= 120
    assert dashboard["currently_reading"][0]["progress_percent"] == 20.0


def test_price_alert_crud_flow() -> None:
    email = f"alarm-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Mert", "email": email, "password": "guvenli-parola"},
    ).status_code == 201
    saved = client.put(
        "/me/price-alerts",
        json={"book_id": "suc-ve-ceza", "target_price_minor": 25000},
    )
    assert saved.status_code == 200
    alerts = client.get("/me/price-alerts").json()
    assert any(item["book_id"] == "suc-ve-ceza" for item in alerts)
    assert client.delete("/me/price-alerts/suc-ve-ceza").status_code == 204


def test_custom_book_crud_and_statistics_flow() -> None:
    email = f"kisisel-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Selin", "email": email, "password": "guvenli-parola"},
    ).status_code == 201

    created = client.post(
        "/me/custom-books",
        json={
            "title": "Kendi Kitabım", "author": "Özel Yazar", "genre": "Deneme",
            "shelf": "reading", "is_favorite": True,
            "current_page": 40, "total_pages": 200,
        },
    )
    assert created.status_code == 201
    book = created.json()
    assert book["is_custom"] is True
    assert book["progress_percent"] == 20.0

    profile = client.get("/me/profile").json()
    assert any(item["id"] == book["id"] for item in profile["reading_books"])
    assert any(item["id"] == book["id"] for item in profile["favorite_books"])
    dashboard = client.get("/me/reading-dashboard", params={"year": 2026}).json()
    assert dashboard["total_pages_read"] >= 40

    updated = client.put(
        f"/me/custom-books/{book['id']}",
        json={
            "title": "Kendi Kitabım", "author": "Özel Yazar", "genre": "Deneme",
            "shelf": "read", "is_favorite": True,
            "current_page": 200, "total_pages": 200,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["shelf"] == "read"
    dashboard = client.get("/me/reading-dashboard", params={"year": 2026}).json()
    assert any(row["genre"] == "Deneme" for row in dashboard["genre_distribution"])

    assert client.delete(f"/me/custom-books/{book['id']}").status_code == 204
    assert not any(
        item["id"] == book["id"] for item in client.get("/me/profile").json()["read_books"]
    )


def test_library_rejects_same_work_across_catalog_and_custom_books() -> None:
    first_email = f"tekil-katalog-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Tekil Katalog", "email": first_email, "password": "guvenli-parola"},
    ).status_code == 201
    assert client.put(
        "/me/library",
        json={"book_id": "martin-eden", "shelf": "read", "is_favorite": False},
    ).status_code == 200
    duplicate_custom = client.post(
        "/me/custom-books",
        json={
            "title": "Martin Eden", "author": "Jack London", "genre": "Roman",
            "shelf": "read", "is_favorite": False,
        },
    )
    assert duplicate_custom.status_code == 400
    assert "zaten mevcut" in duplicate_custom.json()["detail"]

    second_email = f"tekil-ozel-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Tekil Özel", "email": second_email, "password": "guvenli-parola"},
    ).status_code == 201
    assert client.post(
        "/me/custom-books",
        json={
            "title": "Martin Eden", "author": "Jack London", "genre": "Roman",
            "shelf": "read", "is_favorite": False,
        },
    ).status_code == 201
    duplicate_catalog = client.put(
        "/me/library",
        json={"book_id": "martin-eden", "shelf": "read", "is_favorite": False},
    )
    assert duplicate_catalog.status_code == 400
    assert "zaten mevcut" in duplicate_catalog.json()["detail"]


def test_chatbot_uses_profile_and_trusted_catalog() -> None:
    email = f"chat-{uuid4()}@example.com"
    assert client.post(
        "/auth/register",
        json={"display_name": "Chat Okuru", "email": email, "password": "guvenli-parola"},
    ).status_code == 201
    client.put(
        "/me/library",
        json={
            "book_id": "suc-ve-ceza", "shelf": "reading", "is_favorite": True,
            "current_page": 100, "total_pages": 500,
        },
    )

    library = client.post("/me/chat", json={"message": "Şu an ne okuyorum?"})
    assert library.status_code == 200
    assert library.json()["intent"] == "library"
    assert library.json()["books"][0]["id"] == "suc-ve-ceza"
    assert "%20" in library.json()["answer"]

    recommendation = client.post(
        "/me/chat", json={"message": "Analitik ve gizemli bir kitap öner"},
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["intent"] == "recommendation"
    assert 1 <= len(recommendation.json()["books"]) <= 3
    catalog_ids = {book["id"] for book in client.get("/books").json()}
    assert {book["id"] for book in recommendation.json()["books"]} <= catalog_ids

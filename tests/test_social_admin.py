from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import Repository
from app.main import app, repository as app_repository
from app.services.search_pipeline import diversify


def repository_with_users(tmp_path):
    repository = Repository(tmp_path / "social.db")
    repository.seed_books(Path(__file__).parents[1] / "data" / "books.json")
    admin = repository.register("Admin", "admin@example.com", "guvenli-parola")
    reader = repository.register("Okur", "reader@example.com", "guvenli-parola")
    repository.set_user_role(admin["id"], "admin")
    return repository, admin["id"], reader["id"]


def test_ratings_comments_and_public_profile_projection(tmp_path) -> None:
    repository, _, reader_id = repository_with_users(tmp_path)
    book_id = "suc-ve-ceza"
    repository.upsert_book_rating(reader_id, book_id, 5)
    created = repository.create_book_comment(reader_id, book_id, "Çok güçlü bir roman.", False)
    community = repository.book_community(book_id, reader_id)

    assert community["rating_count"] == 1
    assert community["rating_average"] == 5
    assert community["own_rating"] == 5
    assert community["comments"][0]["id"] == created["id"]
    assert set(community["comments"][0]["author"]) == {"display_name", "is_verified", "verification_label"}


def test_admin_can_verify_and_ban_but_not_self_ban(tmp_path) -> None:
    repository, admin_id, reader_id = repository_with_users(tmp_path)
    repository.admin_set_verification(reader_id, True, "Eleştirmen", admin_id)
    result = repository.admin_set_ban(reader_id, True, "Topluluk kurallarının ihlali", 7, admin_id)

    assert result["is_banned"] is True
    assert repository.account_status(reader_id)["is_banned"] is True
    users = {user["id"]: user for user in repository.admin_users()}
    assert users[reader_id]["is_verified"] is True
    assert users[reader_id]["is_banned"] is True

    try:
        repository.admin_set_ban(admin_id, True, "self", None, admin_id)
    except ValueError:
        pass
    else:
        raise AssertionError("Admin self-ban must be rejected")


def test_diversity_uses_popularity_adjusted_ranking_score() -> None:
    base = {"canonical_work_key": None, "series_name": None, "genre": "Roman"}
    popular = {"book": {**base, "id": "popular", "title": "Popular", "author": "A"}, "match_score": .70, "ranking_score": .88}
    lexical = {"book": {**base, "id": "lexical", "title": "Lexical", "author": "B"}, "match_score": .80, "ranking_score": .81}
    assert diversify([lexical, popular], 1)[0]["book"]["id"] == "popular"


def test_social_api_and_admin_ban_enforcement() -> None:
    admin_client, reader_client = TestClient(app), TestClient(app)
    suffix = uuid4().hex
    admin_client.post("/auth/register", json={"display_name": "Admin", "email": f"admin-{suffix}@example.com", "password": "guvenli-parola"})
    reader_client.post("/auth/register", json={"display_name": "Okur", "email": f"reader-{suffix}@example.com", "password": "guvenli-parola"})
    admin_id = admin_client.get("/auth/me").json()["id"]
    reader_id = reader_client.get("/auth/me").json()["id"]
    app_repository.set_user_role(admin_id, "admin")

    assert reader_client.put("/me/book-ratings/suc-ve-ceza", json={"rating": 5}).status_code == 200
    assert reader_client.post("/me/book-comments", json={"book_id": "suc-ve-ceza", "content": "Harika bir eser.", "contains_spoiler": False}).status_code == 201
    community = reader_client.get("/books/suc-ve-ceza/community").json()
    assert community["own_rating"] == 5

    banned = admin_client.patch(f"/admin/users/{reader_id}/ban", json={"banned": True, "reason": "Test ihlali", "duration_days": 1})
    assert banned.status_code == 200
    response = reader_client.get("/me/profile")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "account_banned"

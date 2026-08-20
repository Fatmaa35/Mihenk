from pathlib import Path

import pytest

from app.database import Repository
from app.services.gamification import build_gamification_summary, level_for_xp


BOOKS = Path(__file__).resolve().parents[1] / "data" / "books.json"


def test_xp_and_level_boundaries_are_deterministic() -> None:
    stats = {
        "library_books": 1,
        "read_books": 5,
        "published_comments": 1,
        "ratings": 10,
        "active_days": 7,
        "longest_streak": 7,
        "read_genres": 5,
        "completed_goals": 0,
    }
    earned = [
        {"badge_code": code, "earned_at": "2026-08-13T00:00:00+00:00"}
        for code in ("first_shelf", "first_review", "reader_5", "genre_explorer", "active_7", "streak_7", "ratings_10")
    ]
    summary = build_gamification_summary(stats, earned, ["reader_5"])

    assert summary["xp"] == 700
    assert summary["level"]["name"] == "Keşifçi"
    assert summary["showcase"] == ["reader_5"]
    assert level_for_xp(200)["number"] == 2
    assert level_for_xp(4000)["progress_percent"] == 100


def test_repository_awards_badges_and_preserves_showcase_choice(tmp_path) -> None:
    repository = Repository(tmp_path / "gamification.db")
    repository.seed_books(BOOKS)
    user = repository.create_user("Rozet Okuru")

    empty = repository.gamification_summary(user["id"])
    assert empty["xp"] == 0
    assert empty["earned_count"] == 0

    repository.upsert_library_entry(user["id"], "suc-ve-ceza", "to_read", False)
    earned = repository.gamification_summary(user["id"])
    assert earned["xp"] == 10
    assert earned["showcase"] == ["first_shelf"]
    assert next(item for item in earned["badges"] if item["code"] == "first_shelf")["earned"] is True

    cleared = repository.update_badge_showcase(user["id"], [])
    assert cleared["showcase"] == []
    assert repository.gamification_summary(user["id"])["showcase"] == []

    with pytest.raises(ValueError, match="kazanılmış"):
        repository.update_badge_showcase(user["id"], ["reader_25"])


def test_comments_and_ratings_add_xp_without_client_authority(tmp_path) -> None:
    repository = Repository(tmp_path / "gamification-social.db")
    repository.seed_books(BOOKS)
    user = repository.create_user("Topluluk Okuru")
    repository.upsert_book_rating(user["id"], "suc-ve-ceza", 5)
    repository.create_book_comment(user["id"], "suc-ve-ceza", "Düşündürücü bir eser.", False)

    summary = repository.gamification_summary(user["id"])
    assert summary["xp"] == 35
    assert {badge["code"] for badge in summary["badges"] if badge["earned"]} == {"first_review"}

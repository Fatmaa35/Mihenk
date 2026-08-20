from datetime import date, timedelta
from pathlib import Path

from app.database import Repository
from app.services.catalog_quality import (
    book_matches_intent, deduplicate_library_entries, normalize_isbn, parse_query_intent,
)
from app.services.chatbot import BookChatbot


def test_isbn10_is_validated_and_converted_to_isbn13() -> None:
    assert normalize_isbn("0-306-40615-2") == ("0306406152", "9780306406157")
    assert normalize_isbn("9780306406157") == (None, "9780306406157")
    assert normalize_isbn("9780306406158") == (None, None)


def test_legacy_library_duplicates_are_collapsed_to_catalog_identity() -> None:
    entries = [
        {
            "id": "martin-eden", "title": "Martin Eden", "author": "Jack London",
            "shelf": "read", "is_favorite": False, "current_page": 0,
            "total_pages": None, "cover_url": None, "is_custom": False,
        },
        {
            "id": "custom-martin", "title": "MARTIN EDEN", "author": "Jack London",
            "shelf": "read", "is_favorite": True, "current_page": 420,
            "total_pages": 420, "cover_url": "https://example.com/martin.jpg", "is_custom": True,
        },
    ]
    result = deduplicate_library_entries(entries)
    assert len(result) == 1
    assert result[0]["id"] == "martin-eden"
    assert result[0]["is_favorite"] is True
    assert result[0]["cover_url"] == "https://example.com/martin.jpg"


def test_hard_filters_exclude_wrong_type_length_and_negative_theme() -> None:
    intent = parse_query_intent("Kısa, savaş temalı olmayan tarihî roman")
    base = {"is_recommendable": True, "publication_type": "fiction", "language": "tr",
            "page_count": 210, "genre": "Tarihî Roman", "themes": ["aile"],
            "title": "Sessiz Şehir", "description": "Geçmişte geçen bir aile hikâyesi.",
            "narrative_pace": "medium"}
    assert book_matches_intent(base, intent)
    assert not book_matches_intent({**base, "publication_type": "essay"}, intent)
    assert not book_matches_intent({**base, "themes": ["savaş"]}, intent)
    assert not book_matches_intent({**base, "page_count": 500}, intent)


def test_chat_action_is_structured_and_requires_confirmation() -> None:
    context = {"books": [{"id": "b2", "title": "İkinci Kitap", "author": "Yazar", "genre": "Roman", "position": 2}]}
    action = BookChatbot._pending_action("bu kitabı 250 tl'ye düşünce haber ver", context)
    assert action["action_type"] == "set_price_alert"
    assert action["arguments"]["target_price_minor"] == 25000
    assert "Onaylıyor musun" in action["confirmation"]


def test_feedback_chat_and_plan_repository_roundtrip(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "intelligence.db")
    repository.seed_books(Path(__file__).parents[1] / "data" / "books.json")
    user = repository.create_user("Akıllı Okur")
    feedback = repository.upsert_recommendation_feedback(user["id"], "suc-ve-ceza", "not_for_me", "karanlık roman")
    assert feedback["feedback_type"] == "not_for_me"
    session = repository.create_chat_session(user["id"])
    repository.save_chat_message(user["id"], session["id"], "user", "Kısa bir roman öner")
    assert repository.chat_messages(user["id"], session["id"])[0]["content"] == "Kısa bir roman öner"
    target = (date.today() + timedelta(days=14)).isoformat()
    plan = repository.upsert_reading_plan(user["id"], "suc-ve-ceza", target)
    assert plan["daily_pages"] > 0

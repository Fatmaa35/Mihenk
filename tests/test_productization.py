from datetime import date, timedelta
from pathlib import Path
import pytest

from app.database import Repository
from app.schemas import ChatAction
from app.services.catalog_quality import parse_query_intent
from app.services.reading_planner import build_schedule
from app.services.search_pipeline import TTLResultCache, filter_stages


def test_action_json_schema_rejects_unknown_or_invalid_arguments() -> None:
    with pytest.raises(ValueError): ChatAction(action_type="update_progress", book_id="b", book_title="B", arguments={"current_page": -1}, confirmation="?")
    with pytest.raises(ValueError): ChatAction(action_type="favorite", book_id="b", book_title="B", arguments={"admin": True}, confirmation="?")


def test_filter_relaxation_never_removes_negative_terms() -> None:
    intent = parse_query_intent("kısa, savaş temalı olmayan tarihî roman")
    stages = filter_stages(intent)
    assert stages[0][0] == "strict"
    assert all(stage.excluded_terms == intent.excluded_terms for _, stage in stages)
    assert all(stage.publication_types == intent.publication_types for _, stage in stages)


def test_cache_is_copy_safe() -> None:
    cache = TTLResultCache(); cache.put("x", {"items": [1]}); value = cache.get("x"); value["items"].append(2)
    assert cache.get("x") == {"items": [1]}


def test_planner_respects_days_off_and_allocates_all_pages() -> None:
    schedule = build_schedule(101, date.today() + timedelta(days=14), [5, 6])
    assert sum(day["planned_pages"] for day in schedule) == 101
    assert all(date.fromisoformat(day["plan_date"]).weekday() not in {5, 6} for day in schedule)


def test_chat_lifecycle_and_plan_calendar(tmp_path: Path) -> None:
    repo = Repository(tmp_path / "product.db"); repo.seed_books(Path(__file__).parents[1] / "data" / "books.json")
    user = repo.create_user("Ürün Testi"); session = repo.create_chat_session(user["id"])
    changed = repo.update_chat_session(user["id"], session["id"], {"title": "Sabit sohbet", "is_pinned": True})
    assert changed["is_pinned"] == 1
    message = repo.save_chat_message(user["id"], session["id"], "user", "Bir roman öner")
    assert repo.update_chat_message(user["id"], message["id"], "Kısa roman öner")["edited_at"]
    target = (date.today() + timedelta(days=10)).isoformat()
    plan = repo.upsert_reading_plan(user["id"], "suc-ve-ceza", target, excluded_weekdays=[6])
    assert plan["planned_pages"] > 0
    assert repo.reading_plan_calendar(user["id"], date.today().isoformat(), target)

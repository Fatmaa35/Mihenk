from datetime import datetime, timezone
from pathlib import Path

from app.database import Repository


BOOKS = Path(__file__).resolve().parents[1] / "data" / "books.json"


def repository_and_user(tmp_path):
    repository = Repository(tmp_path / "reading.db")
    repository.seed_books(BOOKS)
    return repository, repository.create_user("Okur")


def test_progress_increments_activity_without_double_counting(tmp_path) -> None:
    repository, user = repository_and_user(tmp_path)
    repository.upsert_library_entry(
        user["id"], "suc-ve-ceza", "reading", False, current_page=40, total_pages=400
    )
    repository.upsert_library_entry(
        user["id"], "suc-ve-ceza", "reading", False, current_page=65, total_pages=400
    )
    dashboard = repository.reading_dashboard(user["id"], datetime.now(timezone.utc).year)
    assert dashboard["total_pages_read"] == 65
    assert dashboard["currently_reading"][0]["progress_percent"] == 16.2


def test_price_alert_emits_only_for_new_lower_price(tmp_path) -> None:
    repository, user = repository_and_user(tmp_path)
    repository.upsert_price_alert(user["id"], "suc-ve-ceza", 20000)
    now = datetime.now(timezone.utc).isoformat()
    repository.save_retail_offer({
        "book_id": "suc-ve-ceza", "isbn": "9789750719387",
        "canonical_title": "Suç ve Ceza", "author": "Fyodor Dostoyevski",
        "publisher": "Can", "retailer_id": "test", "retailer_name": "Test Kitap",
        "base_url": "https://example.com", "robots_url": "https://example.com/robots.txt",
        "content_policy": "test fixture", "product_url": "https://example.com/suc-ve-ceza",
        "price_minor": 19000, "list_price_minor": None, "currency": "TRY",
        "stock_status": "in_stock", "checked_at": now, "content_hash": "first",
    })
    assert repository.evaluate_price_alerts() == 1
    assert repository.evaluate_price_alerts() == 0
    assert len(repository.list_notifications(user["id"])) == 1

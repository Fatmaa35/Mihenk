from pathlib import Path
import sqlite3

import httpx
import pytest

from app.database import Repository
from app.supabase_repository import SupabaseRepository


@pytest.fixture
def club(tmp_path):
    repo = Repository(tmp_path / "club.db")
    repo.seed_books(Path(__file__).parents[1] / "data/books.json")
    user = repo.create_user("Club Owner")
    group = repo.create_book_club(user["id"], "Active Read Test", "", "private")
    books = [book["id"] for book in repo.list_books()[:2]]
    return repo, user["id"], group["id"], books


def save(repo, user, group, book, status="reading"):
    return repo.upsert_book_club_read(user, group, {"book_id": book, "status": status, "start_date": None, "target_date": None})


def test_switch_and_reselect_active_read_preserves_progress_and_other_clubs(club):
    repo, user, group, (old, new) = club
    other = repo.create_book_club(user, "Other Club", "", "private")["id"]
    save(repo, user, other, old)
    save(repo, user, group, old)
    repo.upsert_book_club_progress(user, group, {"book_id": old, "current_page": 30, "total_pages": 200})
    detail = save(repo, user, group, new)
    assert detail["active_read"]["book_id"] == new
    assert {r["book_id"]: r["status"] for r in detail["reads"]} == {old: "planned", new: "reading"}
    assert next(p for p in detail["progress"] if p["book_id"] == old)["current_page"] == 30
    assert repo.book_club_detail(user, other)["active_read"]["book_id"] == old
    assert save(repo, user, group, old)["active_read"]["book_id"] == old
    assert repo.book_club_detail(user, group)["active_read"]["book_id"] == old


@pytest.mark.parametrize("status", ["planned", "completed"])
def test_non_reading_book_is_not_reported_as_active(club, status):
    repo, user, group, (book, _) = club
    save(repo, user, group, book)
    assert save(repo, user, group, book, status)["active_read"] is None


def test_failed_book_switch_rolls_back_previous_active_read(club):
    repo, user, group, (book, _) = club
    save(repo, user, group, book)
    with pytest.raises(sqlite3.IntegrityError):
        save(repo, user, group, "missing-book")
    assert repo.book_club_detail(user, group)["active_read"]["book_id"] == book


def test_non_member_cannot_replace_active_book(club):
    repo, user, group, (old, new) = club
    save(repo, user, group, old)
    other = repo.create_user("Other User")["id"]
    with pytest.raises(PermissionError):
        save(repo, other, group, new)
    assert repo.book_club_detail(user, group)["active_read"]["book_id"] == old


@pytest.mark.parametrize("status,expected", [("reading", "new"), ("planned", None), ("completed", None)])
def test_supabase_selects_active_read_deterministically(status, expected):
    def handler(request):
        if request.url.path == "/rest/v1/book_club_members":
            return httpx.Response(200, json=[{"user_id": "owner", "role": "owner"}])
        if request.url.path == "/rest/v1/book_clubs":
            return httpx.Response(200, json=[{"id": "club", "name": "Test", "book_club_reads": [
                {"book_id": "old", "status": status, "created_at": "2026-01-01", "books": {"title": "Old"}},
                {"book_id": "new", "status": status, "created_at": "2026-02-01", "books": {"title": "New"}},
            ]}])
        return httpx.Response(200, json=[])
    repo = SupabaseRepository("https://project.supabase.co", "test-public", "test-secret")
    repo.client.close()
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        repo.client = client
        active = repo.book_club_detail("owner", "club")["active_read"]
        assert (active["book_id"] if active else None) == expected

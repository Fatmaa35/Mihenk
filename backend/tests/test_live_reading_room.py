from __future__ import annotations

from pathlib import Path
import pytest

from app.database import Repository

ROOT = Path(__file__).parents[1]


def prepared(tmp_path: Path):
    repository = Repository(tmp_path / "live_room_growth.db")
    repository.seed_books(ROOT / "data" / "books.json")
    ali = repository.create_user("Ali Kurucu")
    ayse = repository.create_user("Ayşe Canlı Okur")
    return repository, ali, ayse


def test_live_reading_room_and_session_completion(tmp_path: Path):
    repository, ali, ayse = prepared(tmp_path)

    # 1. Ali creates club and active read
    club = repository.create_book_club(
        ali["id"],
        name="Canlı Okuma Kulübü",
        description="Her gün 25 dk Pomodoro ile okuyoruz.",
        rules="Sessizlik ve odaklanma esastır.",
        visibility="public",
    )
    club_id = club["id"]

    repository.upsert_book_club_read(ali["id"], club_id, {
        "book_id": "suc-ve-ceza",
        "start_date": "2026-09-01",
        "target_date": "2026-09-30",
        "status": "reading",
    })

    # 2. Ayşe joins club & reading
    repository.join_book_club(ayse["id"], club["invite_code"])
    repository.join_reading(ayse["id"], club_id, "suc-ve-ceza", daily_target_pages=15)

    # 3. Ayşe opens / creates the Live Reading Room
    room = repository.get_or_create_club_room(ayse["id"], club_id, title="Birlikte Okuyoruz Seansı")
    assert room["club_id"] == club_id
    assert room["phase"] == "reading"
    assert room["duration_minutes"] == 25
    assert len(room["participants"]) == 2

    # 4. Ayşe completes a 25-minute Pomodoro Session with 25 pages read and notes
    updated_room = repository.complete_room_session(ayse["id"], club_id, {
        "room_id": room["id"],
        "book_id": "suc-ve-ceza",
        "minutes_read": 25,
        "pages_read": 25,
        "current_page": 25,
        "notes": "Raskolnikov'un Saint Petersburg sokaklarındaki iç monoloğu çok etkileyiciydi.",
    })
    ayse_p = next(p for p in updated_room["participants"] if p["user_id"] == ayse["id"])
    assert ayse_p["current_page"] == 25

    # Check reading activity & quote discussion
    with repository.connect() as conn:
        activity = conn.execute(
            "SELECT sum(pages_read) as total FROM reading_activity WHERE user_id=?", (ayse["id"],)
        ).fetchone()
        assert activity["total"] == 25

        quote = conn.execute(
            "SELECT content, discussion_type FROM book_club_discussions WHERE club_id=? AND user_id=?",
            (club_id, ayse["id"]),
        ).fetchone()
        assert "Saint Petersburg" in quote["content"]
        assert quote["discussion_type"] == "quote"

    # 5. Ayşe sends Live Discussion Message during break/discussion phase
    room_with_msg = repository.send_room_message(
        ayse["id"], club_id, room["id"], "25. sayfadaki bölüm hakkında ne düşünüyorsunuz?"
    )
    assert len(room_with_msg["messages"]) == 1
    assert "25. sayfadaki" in room_with_msg["messages"][0]["content"]
    assert room_with_msg["messages"][0]["display_name"] == "Ayşe Canlı Okur"

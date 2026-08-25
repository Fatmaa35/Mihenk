from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.database import Repository


def test_user_export_excludes_credentials_and_contains_owned_records(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "export.db")
    session = repository.open_registration_session("Ada", "ada-export@example.com", "guvenli-parola")
    user_id = session["user"]["id"]
    repository.upsert_reading_goal(user_id, 2026, 24)

    exported = repository.export_user_data(user_id)

    assert exported["format"] == "mihenk-user-export-v1"
    assert exported["account"]["email"] == "ada-export@example.com"
    assert "password_hash" not in exported["account"]
    assert exported["records"]["reading_goals"][0]["target_books"] == 24


def test_retention_deletes_only_expired_read_notifications(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "retention.db")
    user = repository.register("Ada", "ada-retention@example.com", "guvenli-parola")
    old = (datetime.now(timezone.utc) - timedelta(days=200)).isoformat()
    with repository.connect() as connection:
        connection.execute(
            "INSERT INTO notifications(id,user_id,kind,title,body,payload_json,read_at,created_at) VALUES(?,?,?,?,?,'{}',?,?)",
            ("old-read", user["id"], "reading_reminder", "Eski", "Eski", old, old),
        )
        connection.execute(
            "INSERT INTO notifications(id,user_id,kind,title,body,payload_json,created_at) VALUES(?,?,?,?,?,'{}',?)",
            ("old-unread", user["id"], "reading_reminder", "Okunmamış", "Kalmalı", old),
        )

    deleted = repository.purge_expired_data(
        audit_days=365, event_days=90, notification_days=180, chat_days=365
    )

    assert deleted["notifications"] == 1
    with repository.connect() as connection:
        assert connection.execute("SELECT id FROM notifications").fetchone()["id"] == "old-unread"

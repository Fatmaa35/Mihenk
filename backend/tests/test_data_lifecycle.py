from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

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


def test_retention_removes_old_product_events_but_keeps_open_feedback(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "beta-retention.db")
    user = repository.create_user("Beta Saklama")
    old = (datetime.now(timezone.utc) - timedelta(days=120)).isoformat()
    with repository.connect() as connection:
        connection.execute(
            "INSERT INTO product_events(user_id,event_name,properties_json,occurred_at) VALUES(?,?,?,?)",
            (user["id"], "session_started", "{}", old),
        )
        for status in ("new", "resolved"):
            connection.execute(
                """INSERT INTO beta_feedback(id,user_id,category,rating,message,context_json,status,created_at,updated_at)
                   VALUES(?,?,?,?,?,'{}',?,?,?)""",
                (str(uuid4()), user["id"], "bug", 7, "Eski beta geri bildirimi", status, old, old),
            )

    deleted = repository.purge_expired_data(
        audit_days=365, event_days=90, notification_days=180, chat_days=365
    )

    assert deleted["product_events"] == 1
    assert deleted["beta_feedback"] == 1
    with repository.connect() as connection:
        assert connection.execute("SELECT status FROM beta_feedback").fetchone()["status"] == "new"

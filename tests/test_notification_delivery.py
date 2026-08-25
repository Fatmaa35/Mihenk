from datetime import datetime, timezone
from pathlib import Path

from app.database import Repository
from app.services.notification_delivery import SMTPDelivery
from app.services.reading_planner import reminder_datetime_utc


def test_reminder_time_is_stored_as_utc() -> None:
    assert reminder_datetime_utc("2026-08-26", "20:00", "Europe/Istanbul") == "2026-08-26T17:00:00+00:00"


def test_push_secrets_are_not_in_user_export(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "push.db")
    user = repository.register("Ada", "ada-push@example.com", "guvenli-parola")
    repository.upsert_web_push_subscription(
        user["id"], "https://push.example.test/subscription/12345",
        "p256dh-secret-material-123", "auth-secret", "Test Browser",
    )

    exported = repository.export_user_data(user["id"])
    subscription = exported["records"]["web_push_subscriptions"][0]
    assert subscription["user_agent"] == "Test Browser"
    assert "endpoint" not in subscription
    assert "p256dh" not in subscription
    assert "auth" not in subscription


def test_failed_reminder_retries_then_moves_to_dead_letter(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "retry.db")
    user = repository.register("Ada", "ada-retry@example.com", "guvenli-parola")
    repository.seed_books(Path(__file__).parents[1] / "data" / "books.json")
    book_id = repository.list_books()[0]["id"]
    now = datetime.now(timezone.utc).isoformat()
    with repository.connect() as connection:
        connection.execute(
            """INSERT INTO reminder_deliveries
               (id,user_id,book_id,scheduled_for,channel,status,attempts,idempotency_key,created_at)
               VALUES(?,?,?,?,?,'processing',1,?,?)""",
            ("retry", user["id"], book_id, now, "email", "retry-key", now),
        )
        connection.execute(
            """INSERT INTO reminder_deliveries
               (id,user_id,book_id,scheduled_for,channel,status,attempts,idempotency_key,created_at)
               VALUES(?,?,?,?,?,'processing',3,?,?)""",
            ("dead", user["id"], book_id, now, "email", "dead-key", now),
        )

    repository.finish_reminder("retry", False, "temporary")
    repository.finish_reminder("dead", False, "permanent")
    with repository.connect() as connection:
        assert connection.execute("SELECT status FROM reminder_deliveries WHERE id='retry'").fetchone()["status"] == "pending"
        assert connection.execute("SELECT status FROM reminder_deliveries WHERE id='dead'").fetchone()["status"] == "dead_letter"


def test_smtp_adapter_uses_tls_and_authentication(monkeypatch) -> None:
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout): calls.append(("connect", host, port, timeout))
        def __enter__(self): return self
        def __exit__(self, *_): return None
        def starttls(self, context): calls.append(("tls", bool(context)))
        def login(self, username, password): calls.append(("login", username, password))
        def send_message(self, message): calls.append(("send", message["To"], message["Subject"]))

    monkeypatch.setattr("app.services.notification_delivery.smtplib.SMTP", FakeSMTP)
    SMTPDelivery("smtp.example.test", 587, "user", "pass", "noreply@example.test").send(
        "reader@example.test", "Okuma zamanı", "Bugünkü hedefin hazır."
    )
    assert calls[0] == ("connect", "smtp.example.test", 587, 15)
    assert calls[1][0] == "tls"
    assert calls[2] == ("login", "user", "pass")
    assert calls[3] == ("send", "reader@example.test", "Okuma zamanı")

"""Claim due reading reminders and deliver in-app notifications idempotently."""
from datetime import datetime, timezone
from app.config import settings
from app.repository_factory import create_repository


def main() -> None:
    repository = create_repository(settings)
    now = datetime.now(timezone.utc).isoformat()
    if settings.data_backend == "sqlite":
        with repository.connect() as connection:
            rows = connection.execute("SELECT * FROM reminder_deliveries WHERE status='pending' AND scheduled_for<=? ORDER BY scheduled_for LIMIT 100", (now,)).fetchall()
            for row in rows:
                connection.execute("UPDATE reminder_deliveries SET status='processing',attempts=attempts+1 WHERE id=? AND status='pending'", (row["id"],))
                book = connection.execute("SELECT title FROM books WHERE id=?", (row["book_id"],)).fetchone()
                if row["channel"] == "in_app":
                    connection.execute("""INSERT INTO notifications(id,user_id,kind,book_id,title,body,payload_json,created_at)
                        VALUES(lower(hex(randomblob(16))),?,'reading_reminder',?,?,?, '{}',?)""",
                        (row["user_id"], row["book_id"], "Okuma zamanı", f"{book['title']} için bugünkü hedefin hazır.", now))
                    connection.execute("UPDATE reminder_deliveries SET status='sent',sent_at=? WHERE id=?", (now, row["id"]))
                else:
                    connection.execute("UPDATE reminder_deliveries SET status='failed',last_error=? WHERE id=?", ("Teslimat sağlayıcısı yapılandırılmadı.", row["id"]))
        print(f"Processed {len(rows)} reminder(s).")
        return
    rows = repository._request("GET", "/rest/v1/reminder_deliveries", admin=True,
                               params={"select": "*", "status": "eq.pending", "scheduled_for": f"lte.{now}", "order": "scheduled_for", "limit": 100}).json()
    for row in rows:
        # External email/push adapters deliberately fail closed until provider credentials exist.
        status, error = ("sent", None) if row["channel"] == "in_app" else ("failed", "Teslimat sağlayıcısı yapılandırılmadı.")
        repository._request("PATCH", "/rest/v1/reminder_deliveries", admin=True, params={"id": f"eq.{row['id']}", "status": "eq.pending"},
                            json_body={"status": status, "attempts": row["attempts"] + 1, "sent_at": now if status == "sent" else None, "last_error": error})
    print(f"Processed {len(rows)} reminder(s).")


if __name__ == "__main__": main()

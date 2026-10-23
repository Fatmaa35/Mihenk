"""Bildirimler, hatırlatmalar ve web push."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from uuid import uuid4

class SQLiteNotificationsMixin:
    def list_notifications(
        self, user_id: str, access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT n.*,b.cover_url FROM notifications n
                   LEFT JOIN books b ON b.id=n.book_id
                   WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 100""",
                (user_id,),
            ).fetchall()
        return [{
            **dict(row), "payload": json.loads(row["payload_json"] or "{}")
        } for row in rows]


    def upsert_web_push_subscription(self, user_id: str, endpoint: str, p256dh: str,
                                     auth: str, user_agent: str | None = None,
                                     access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO web_push_subscriptions(id,user_id,endpoint,p256dh,auth,user_agent,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET
                   user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,
                   user_agent=excluded.user_agent,updated_at=excluded.updated_at""",
                (str(uuid4()), user_id, endpoint, p256dh, auth, user_agent, now, now),
            )
            row = connection.execute(
                "SELECT * FROM web_push_subscriptions WHERE endpoint=? AND user_id=?",
                (endpoint, user_id),
            ).fetchone()
        return dict(row)


    def delete_web_push_subscription(self, user_id: str, endpoint: str,
                                     access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "DELETE FROM web_push_subscriptions WHERE user_id=? AND endpoint=?",
                (user_id, endpoint),
            )


    def list_web_push_subscriptions(self, user_id: str) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(
                "SELECT * FROM web_push_subscriptions WHERE user_id=?", (user_id,)
            ).fetchall()]


    def user_email(self, user_id: str) -> str | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT email FROM auth_accounts WHERE user_id=?", (user_id,)
            ).fetchone()
        return row["email"] if row else None


    def claim_due_reminders(self, now: str, limit: int = 100) -> list[dict]:
        claimed = []
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM reminder_deliveries WHERE status='pending' AND scheduled_for<=? ORDER BY scheduled_for LIMIT ?",
                (now, limit),
            ).fetchall()
            for row in rows:
                cursor = connection.execute(
                    "UPDATE reminder_deliveries SET status='processing',attempts=attempts+1 WHERE id=? AND status='pending'",
                    (row["id"],),
                )
                if cursor.rowcount:
                    book = connection.execute("SELECT title FROM books WHERE id=?", (row["book_id"],)).fetchone()
                    claimed.append({**dict(row), "attempts": row["attempts"] + 1,
                                    "book_title": book["title"] if book else "Kitabın"})
        return claimed


    def finish_reminder(self, reminder_id: str, success: bool, error: str | None = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                "SELECT attempts FROM reminder_deliveries WHERE id=? AND status='processing'",
                (reminder_id,),
            ).fetchone()
            if not row:
                return
            retry = not success and row["attempts"] < 3
            next_attempt = (datetime.now(timezone.utc) + timedelta(minutes=5 * (2 ** max(0, row["attempts"] - 1)))).isoformat()
            connection.execute(
                "UPDATE reminder_deliveries SET status=?,scheduled_for=?,sent_at=?,last_error=? WHERE id=? AND status='processing'",
                ("sent" if success else "pending" if retry else "dead_letter",
                 next_attempt if retry else now, now if success else None,
                 error[:500] if error else None, reminder_id),
            )


    def create_reminder_notification(self, user_id: str, book_id: str, title: str, body: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO notifications(id,user_id,kind,book_id,title,body,payload_json,created_at)
                   VALUES(?,?,?,?,?,?,'{}',?)""",
                (str(uuid4()), user_id, "reading_reminder", book_id, title, body,
                 datetime.now(timezone.utc).isoformat()),
            )


    def mark_notification_read(
        self, user_id: str, notification_id: str, access_token: str | None = None,
    ) -> dict:
        read_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "UPDATE notifications SET read_at=? WHERE id=? AND user_id=?",
                (read_at, notification_id, user_id),
            )
            row = connection.execute(
                "SELECT * FROM notifications WHERE id=? AND user_id=?",
                (notification_id, user_id),
            ).fetchone()
        if not row:
            raise KeyError("Bildirim bulunamadi.")
        return dict(row)


    def mark_all_notifications_read(self, user_id: str, access_token: str | None = None) -> int:
        read_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
                (read_at, user_id),
            )
        return cursor.rowcount


    @staticmethod
    def _create_notification(connection: sqlite3.Connection, user_id: str, kind: str,
                             title: str, body: str, book_id: str | None = None,
                             payload: dict | None = None) -> None:
        connection.execute(
            """INSERT INTO notifications(id,user_id,kind,book_id,title,body,payload_json,created_at)
               VALUES(?,?,?,?,?,?,?,?)""",
            (str(uuid4()), user_id, kind, book_id, title, body,
             json.dumps(payload or {}, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
        )

    # Social reading and administrator operations. These methods deliberately
    # return a public profile projection instead of exposing the users table.


    def notification_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM notification_preferences WHERE user_id=?", (user_id,)).fetchone()
        if not row:
            return {"user_id": user_id, "consent_granted": False, "weekly_digest": True, "recommendations": True,
                    "price_drops": True, "stock_updates": False, "social_updates": True, "frequency": "weekly",
                    "quiet_hours_start": None, "quiet_hours_end": None}
        result = dict(row)
        for key in ("consent_granted", "weekly_digest", "recommendations", "price_drops", "stock_updates", "social_updates"):
            result[key] = bool(result[key])
        return result


    def upsert_notification_preferences(self, user_id: str, values: dict, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        keys = ("consent_granted", "weekly_digest", "recommendations", "price_drops", "stock_updates", "social_updates",
                "frequency", "quiet_hours_start", "quiet_hours_end")
        params = [int(values[key]) if isinstance(values[key], bool) else values[key] for key in keys]
        with self.connect() as connection:
            connection.execute(
                f"""INSERT INTO notification_preferences(user_id,{','.join(keys)},updated_at)
                    VALUES({','.join('?' for _ in range(len(keys)+2))}) ON CONFLICT(user_id) DO UPDATE SET
                    {','.join(f'{key}=excluded.{key}' for key in keys)},updated_at=excluded.updated_at""",
                [user_id, *params, now],
            )
        return self.notification_preferences(user_id)


    def upsert_edition_subscription(self, user_id: str, book_id: str, event_type: str, is_active: bool,
                                    access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO edition_subscriptions(user_id,book_id,event_type,is_active,created_at,updated_at)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,book_id,event_type) DO UPDATE SET
                   is_active=excluded.is_active,updated_at=excluded.updated_at""",
                (user_id, book_id, event_type, int(is_active), now, now),
            )
            row = connection.execute(
                "SELECT * FROM edition_subscriptions WHERE user_id=? AND book_id=? AND event_type=?",
                (user_id, book_id, event_type),
            ).fetchone()
        return {**dict(row), "is_active": bool(row["is_active"])}


    def list_edition_subscriptions(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT s.*,b.title,b.author FROM edition_subscriptions s JOIN books b ON b.id=s.book_id
                   WHERE s.user_id=? ORDER BY s.updated_at DESC""", (user_id,)
            ).fetchall()
        return [{**dict(row), "is_active": bool(row["is_active"])} for row in rows]

"""Bildirimler, hatırlatmalar ve web push."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseNotificationsMixin:
    def notification_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/notification_preferences", admin=True,
                             params={"user_id": f"eq.{user_id}", "select": "*", "limit": 1}).json()
        if rows:
            return rows[0]
        return {"user_id": user_id, "consent_granted": False, "weekly_digest": True, "recommendations": True,
                "price_drops": True, "stock_updates": False, "social_updates": True, "frequency": "weekly",
                "quiet_hours_start": None, "quiet_hours_end": None}


    def upsert_notification_preferences(self, user_id: str, values: dict, access_token: str | None = None) -> dict:
        payload = {"user_id": user_id, **values, "updated_at": datetime.now(timezone.utc).isoformat()}
        rows = self._request("POST", "/rest/v1/notification_preferences", admin=True,
                             params={"on_conflict": "user_id"}, json_body=payload,
                             extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]


    def upsert_edition_subscription(self, user_id: str, book_id: str, event_type: str, is_active: bool,
                                    access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        payload = {"user_id": user_id, "book_id": book_id, "event_type": event_type, "is_active": is_active,
                   "created_at": now, "updated_at": now}
        rows = self._request("POST", "/rest/v1/edition_subscriptions", admin=True,
                             params={"on_conflict": "user_id,book_id,event_type"}, json_body=payload,
                             extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]


    def list_edition_subscriptions(self, user_id: str, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/edition_subscriptions", admin=True,
                             params={"user_id": f"eq.{user_id}", "select": "*,books(title,author)", "order": "updated_at.desc"}).json()


    def list_notifications(self, user_id: str, access_token: str | None = None) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        return self._request(
            "GET", "/rest/v1/notifications", token=access_token,
            params={
                "select": "*,book:books(cover_url)", "user_id": f"eq.{user_id}",
                "order": "created_at.desc", "limit": 100,
            },
        ).json()


    def upsert_web_push_subscription(self, user_id: str, endpoint: str, p256dh: str,
                                     auth: str, user_agent: str | None = None,
                                     access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/rpc/save_web_push_subscription", token=access_token,
            json_body={"p_endpoint": endpoint, "p_p256dh": p256dh,
                       "p_auth": auth, "p_user_agent": user_agent},
        ).json()
        if not rows:
            raise SupabaseRequestError("Push aboneliği kaydedilemedi.", 409)
        return rows[0]


    def delete_web_push_subscription(self, user_id: str, endpoint: str,
                                     access_token: str | None = None) -> None:
        self._request(
            "DELETE", "/rest/v1/web_push_subscriptions", token=access_token,
            params={"user_id": f"eq.{user_id}", "endpoint": f"eq.{endpoint}"},
        )


    def list_web_push_subscriptions(self, user_id: str) -> list[dict]:
        return self._request(
            "GET", "/rest/v1/web_push_subscriptions", admin=True,
            params={"select": "*", "user_id": f"eq.{user_id}"},
        ).json()


    def user_email(self, user_id: str) -> str | None:
        response = self._request("GET", f"/auth/v1/admin/users/{user_id}", admin=True)
        return response.json().get("email")


    def claim_due_reminders(self, now: str, limit: int = 100) -> list[dict]:
        rows = self._request(
            "GET", "/rest/v1/reminder_deliveries", admin=True,
            params={"select": "*,book:books(title)", "status": "eq.pending",
                    "scheduled_for": f"lte.{now}", "order": "scheduled_for", "limit": limit},
        ).json()
        claimed = []
        for row in rows:
            updated = self._request(
                "PATCH", "/rest/v1/reminder_deliveries", admin=True,
                params={"id": f"eq.{row['id']}", "status": "eq.pending"},
                json_body={"status": "processing", "attempts": row["attempts"] + 1},
                extra_headers={"Prefer": "return=representation"},
            ).json()
            if updated:
                claimed.append({**updated[0], "book_title": (row.get("book") or {}).get("title", "Kitabın")})
        return claimed


    def finish_reminder(self, reminder_id: str, success: bool, error: str | None = None) -> None:
        current = self._request(
            "GET", "/rest/v1/reminder_deliveries", admin=True,
            params={"select": "attempts", "id": f"eq.{reminder_id}", "status": "eq.processing", "limit": 1},
        ).json()
        if not current:
            return
        attempts = int(current[0].get("attempts", 1))
        retry = not success and attempts < 3
        next_attempt = (datetime.now(timezone.utc) + timedelta(minutes=5 * (2 ** max(0, attempts - 1)))).isoformat()
        self._request(
            "PATCH", "/rest/v1/reminder_deliveries", admin=True,
            params={"id": f"eq.{reminder_id}", "status": "eq.processing"},
            json_body={"status": "sent" if success else "pending" if retry else "dead_letter",
                       "scheduled_for": next_attempt if retry else datetime.now(timezone.utc).isoformat(),
                       "sent_at": datetime.now(timezone.utc).isoformat() if success else None,
                       "last_error": error[:500] if error else None},
        )


    def create_reminder_notification(self, user_id: str, book_id: str, title: str, body: str) -> None:
        self._request(
            "POST", "/rest/v1/notifications", admin=True,
            json_body={"user_id": user_id, "kind": "reading_reminder", "book_id": book_id,
                       "title": title, "body": body, "payload": {}},
            extra_headers={"Prefer": "return=minimal"},
        )


    def mark_notification_read(
        self, user_id: str, notification_id: str, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "PATCH", "/rest/v1/notifications", token=access_token,
            params={"id": f"eq.{notification_id}", "user_id": f"eq.{user_id}"},
            json_body={"read_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise KeyError("Bildirim bulunamadi.")
        return rows[0]


    def mark_all_notifications_read(self, user_id: str, access_token: str | None = None) -> int:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "PATCH", "/rest/v1/notifications", token=access_token,
            params={"user_id": f"eq.{user_id}", "read_at": "is.null"},
            json_body={"read_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        return len(rows)

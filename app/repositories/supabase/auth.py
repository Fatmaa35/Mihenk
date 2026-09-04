from __future__ import annotations

from app.repositories.supabase.shared import *  # noqa: F403
from app.repositories.supabase.base import SupabaseRequestError


class SupabaseAuthMixin:
    def open_registration_session(self, display_name: str, email: str, password: str) -> dict:
        response = self._request(
            "POST",
            "/auth/v1/signup",
            json_body={
                "email": email.strip().casefold(),
                "password": password,
                "data": {"display_name": display_name.strip()},
            },
        )
        payload = response.json()
        return self._auth_envelope(payload, confirmation_required=not bool(payload.get("access_token")))

    def open_login_session(self, email: str, password: str) -> dict:
        response = self._request(
            "POST",
            "/auth/v1/token",
            params={"grant_type": "password"},
            json_body={"email": email.strip().casefold(), "password": password},
        )
        return self._auth_envelope(response.json())

    def request_password_reset(self, email: str, redirect_to: str | None = None) -> None:
        params = {"redirect_to": redirect_to} if redirect_to else None
        self._request(
            "POST", "/auth/v1/recover", params=params,
            json_body={"email": email.strip().casefold()},
        )

    def reset_password(self, recovery_token: str, new_password: str) -> None:
        self._request(
            "PUT", "/auth/v1/user", token=recovery_token,
            json_body={"password": new_password},
        )

    def resend_confirmation(self, email: str) -> None:
        self._request(
            "POST", "/auth/v1/resend",
            json_body={"type": "signup", "email": email.strip().casefold()},
        )

    def resolve_session(self, access_token: str | None, refresh_token: str | None = None) -> dict | None:
        if not access_token:
            if not refresh_token:
                return None
            refreshed = self._request(
                "POST",
                "/auth/v1/token",
                params={"grant_type": "refresh_token"},
                json_body={"refresh_token": refresh_token},
                allow_statuses={400, 401, 403},
            )
            return self._auth_envelope(refreshed.json()) if refreshed.is_success else None
        response = self._request(
            "GET",
            "/auth/v1/user",
            token=access_token,
            allow_statuses={401, 403},
        )
        if response.is_success:
            user = response.json()
            return {
                "user": self._user(user, self._profile_name(user["id"], access_token)),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        if not refresh_token:
            return None
        refreshed = self._request(
            "POST",
            "/auth/v1/token",
            params={"grant_type": "refresh_token"},
            json_body={"refresh_token": refresh_token},
            allow_statuses={400, 401, 403},
        )
        if not refreshed.is_success:
            return None
        return self._auth_envelope(refreshed.json())

    def close_session(self, access_token: str | None, refresh_token: str | None = None) -> None:
        if not access_token:
            return
        self._request(
            "POST",
            "/auth/v1/logout",
            token=access_token,
            allow_statuses={401, 403},
        )

    def user_role(self, user_id: str, access_token: str | None = None) -> str:
        if not access_token:
            return "user"
        rows = self._request(
            "GET", "/rest/v1/profiles", token=access_token,
            params={"select": "app_role", "id": f"eq.{user_id}", "limit": 1},
        ).json()
        return rows[0].get("app_role", "user") if rows else "user"

    def set_user_role(self, user_id: str, role: str, access_token: str | None = None) -> dict:
        rows = self._request(
            "PATCH", "/rest/v1/profiles", admin=True, params={"id": f"eq.{user_id}"},
            json_body={"app_role": role, "updated_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise KeyError("Kullanıcı bulunamadı.")
        return {"user_id": user_id, "role": rows[0]["app_role"]}

    def delete_user_account(self, user_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", f"/auth/v1/admin/users/{user_id}", admin=True)

    def export_user_data(self, user_id: str, access_token: str | None = None) -> dict:
        """Return the authenticated user's portable data without secrets or auth tokens."""
        if not access_token:
            raise ValueError("Veri dışa aktarma için etkin oturum gerekir.")
        tables = (
            "user_preferences", "user_books", "user_custom_books", "reading_goals",
            "reading_activity", "reading_sessions", "book_quotes", "price_alerts",
            "notifications", "recommendation_feedback", "book_ratings", "book_comments",
            "comment_helpful_votes", "comment_reports", "user_badges", "user_badge_showcase",
            "chat_sessions", "chat_messages", "reading_plans", "reading_plan_days",
            "reminder_deliveries",
            "beta_feedback",
        )
        profile = self._request(
            "GET", "/rest/v1/profiles", token=access_token,
            params={"select": "id,display_name,app_role,is_verified,verification_label,created_at,updated_at",
                    "id": f"eq.{user_id}", "limit": 1},
        ).json()
        records: dict[str, list[dict]] = {}
        for table in tables:
            records[table] = self._request(
                "GET", f"/rest/v1/{table}", token=access_token,
                params={"select": "*", "user_id": f"eq.{user_id}"},
            ).json()
        try:
            records["product_events"] = self._request(
                "GET", "/rest/v1/product_events", admin=True,
                params={"select": "*", "user_id": f"eq.{user_id}"},
            ).json()
            records["web_push_subscriptions"] = self._request(
                "GET", "/rest/v1/web_push_subscriptions", token=access_token,
                params={"select": "id,user_id,user_agent,created_at,updated_at", "user_id": f"eq.{user_id}"},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code != 404:
                raise
            records["web_push_subscriptions"] = []
        follows = self._request(
            "GET", "/rest/v1/user_follows", token=access_token,
            params={"select": "*", "or": f"(follower_id.eq.{user_id},followed_id.eq.{user_id})"},
        ).json()
        return {
            "format": "mihenk-user-export-v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "account": profile[0] if profile else {"id": user_id},
            "records": {**records, "user_follows": follows},
        }

    def purge_expired_data(self, *, audit_days: int, event_days: int,
                           notification_days: int, chat_days: int) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        rules = (
            ("audit_log", "created_at", audit_days, {}),
            ("application_events", "created_at", event_days, {}),
            ("product_events", "occurred_at", event_days, {}),
            ("beta_feedback", "created_at", event_days, {"status": "in.(resolved,closed)"}),
            ("recommendation_events", "created_at", event_days, {}),
            ("notifications", "created_at", notification_days, {"read_at": "not.is.null"}),
            ("chat_messages", "created_at", chat_days, {}),
            ("reminder_deliveries", "created_at", event_days, {"status": "in.(sent,failed,dead_letter)"}),
        )
        deleted: dict[str, int] = {}
        for table, column, days, filters in rules:
            cutoff = (now - timedelta(days=days)).isoformat()
            response = self._request(
                "DELETE", f"/rest/v1/{table}", admin=True,
                params={column: f"lt.{cutoff}", **filters},
                extra_headers={"Prefer": "return=representation"},
            )
            deleted[table] = len(response.json())
        return deleted

    def audit(self, actor_user_id: str | None, action: str, entity_type: str, entity_id: str | None,
              before: dict | None = None, after: dict | None = None, request_id: str | None = None,
              access_token: str | None = None) -> None:
        self._request(
            "POST", "/rest/v1/audit_log", admin=True,
            json_body={"actor_user_id": actor_user_id, "action": action, "entity_type": entity_type,
                       "entity_id": entity_id, "before_data": before, "after_data": after, "request_id": request_id},
            extra_headers={"Prefer": "return=minimal"},
        )

    def action_execution(self, user_id: str, key: str, access_token: str | None = None) -> dict | None:
        rows = self._request(
            "GET", "/rest/v1/action_executions", admin=True,
            params={"select": "result,status", "idempotency_key": f"eq.{key}", "user_id": f"eq.{user_id}", "limit": 1},
        ).json()
        return rows[0]["result"] if rows and rows[0]["status"] == "succeeded" else None

    def save_action_execution(self, user_id: str, key: str, action_type: str, result: dict,
                              access_token: str | None = None, action_payload: dict | None = None,
                              inverse_action: dict | None = None, status: str = "succeeded",
                              error_code: str | None = None, duration_ms: int = 0) -> dict:
        self._request(
            "POST", "/rest/v1/action_executions", admin=True, params={"on_conflict": "idempotency_key"},
            json_body={"idempotency_key": key, "user_id": user_id, "action_type": action_type, "result": result,
                       "action_payload": action_payload or {}, "inverse_action": inverse_action, "status": status,
                       "error_code": error_code, "duration_ms": duration_ms},
            extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
        )
        return result

    def action_history(self, user_id: str, limit: int = 50, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/action_executions", admin=True,
                             params={"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": limit}).json()

    def mark_action_undone(self, user_id: str, key: str, access_token: str | None = None) -> None:
        self._request("PATCH", "/rest/v1/action_executions", admin=True,
                      params={"user_id": f"eq.{user_id}", "idempotency_key": f"eq.{key}", "status": "eq.succeeded"},
                      json_body={"status": "undone", "undone_at": datetime.now(timezone.utc).isoformat()})

    def remove_library_entry(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/user_books", token=access_token,
                      params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"})

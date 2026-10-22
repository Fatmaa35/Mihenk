"""Kitap asistanı sohbetleri ve geri alınabilir işlemler."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

class SupabaseAssistantMixin:
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


    def create_chat_session(self, user_id: str, title: str = "Yeni sohbet",
                            access_token: str | None = None) -> dict:
        session_id = str(uuid4())
        rows = self._request(
            "POST", "/rest/v1/chat_sessions", token=access_token,
            json_body={"id": session_id, "user_id": user_id, "title": title[:120] or "Yeni sohbet"},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        return rows[0]


    def list_chat_sessions(self, user_id: str, access_token: str | None = None,
                           query: str | None = None, archived: bool = False) -> list[dict]:
        params = {"select": "*", "user_id": f"eq.{user_id}", "is_archived": f"eq.{str(archived).lower()}",
                  "order": "is_pinned.desc,updated_at.desc", "limit": 50}
        if query:
            safe = query.replace(",", " ")
            params["or"] = f"(title.ilike.*{safe}*,summary.ilike.*{safe}*)"
        return self._request(
            "GET", "/rest/v1/chat_sessions", token=access_token,
            params=params,
        ).json()


    def chat_messages(self, user_id: str, session_id: str, limit: int = 50,
                      access_token: str | None = None) -> list[dict]:
        return self._request(
            "GET", "/rest/v1/chat_messages", token=access_token,
            params={"select": "*", "session_id": f"eq.{session_id}", "user_id": f"eq.{user_id}", "order": "created_at.asc", "limit": limit},
        ).json()


    def save_chat_message(self, user_id: str, session_id: str, role: str, content: str,
                          books: list[dict] | None = None, access_token: str | None = None) -> dict:
        message_id = str(uuid4())
        rows = self._request(
            "POST", "/rest/v1/chat_messages", token=access_token,
            json_body={"id": message_id, "session_id": session_id, "user_id": user_id,
                       "role": role, "content": content, "books": books or [],
                       "citations": [{"book_id": book.get("id"), "title": book.get("title"), "author": book.get("author")} for book in (books or [])]},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        title = content.strip()[:60] if role == "user" else None
        update = {"summary": content[-1200:], "updated_at": datetime.now(timezone.utc).isoformat()}
        if title:
            update["title"] = title
        self._request("PATCH", "/rest/v1/chat_sessions", token=access_token,
                      params={"id": f"eq.{session_id}", "user_id": f"eq.{user_id}"}, json_body=update)
        return rows[0]


    def update_chat_session(self, user_id: str, session_id: str, changes: dict, access_token: str | None = None) -> dict:
        values = {key: value for key, value in changes.items() if key in {"title", "is_pinned", "is_archived"} and value is not None}
        values["updated_at"] = datetime.now(timezone.utc).isoformat()
        rows = self._request("PATCH", "/rest/v1/chat_sessions", token=access_token,
                             params={"id": f"eq.{session_id}", "user_id": f"eq.{user_id}"}, json_body=values,
                             extra_headers={"Prefer": "return=representation"}).json()
        if not rows:
            raise KeyError("Sohbet bulunamadı.")
        return rows[0]


    def update_chat_message(self, user_id: str, message_id: str, content: str | None, delete: bool = False,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        body = {"content": "", "deleted_at": now} if delete else {"content": content, "edited_at": now}
        rows = self._request("PATCH", "/rest/v1/chat_messages", token=access_token,
                             params={"id": f"eq.{message_id}", "user_id": f"eq.{user_id}"}, json_body=body,
                             extra_headers={"Prefer": "return=representation"}).json()
        if not rows:
            raise KeyError("Mesaj bulunamadı.")
        return rows[0]


    def delete_chat_session(self, user_id: str, session_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/chat_sessions", token=access_token,
                      params={"id": f"eq.{session_id}", "user_id": f"eq.{user_id}"})


    def compare_books(self, book_ids: list[str], user_id: str | None = None,
                      access_token: str | None = None) -> list[dict]:
        books = [book for book in self.list_books() if book["id"] in set(book_ids)]
        offers = self.list_retail_offers()
        for book in books:
            prices = [offer["price_minor"] for offer in offers if offer.get("book_id") == book["id"] and offer.get("stock_status") == "in_stock"]
            book["price_minor"] = min(prices) if prices else None
            pages = book.get("page_count") or 0
            book["difficulty"] = "kolay" if pages < 260 else "orta" if pages < 450 else "yüksek"
        return books

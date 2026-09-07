from __future__ import annotations

from app.repositories.supabase.shared import *  # noqa: F403
from app.repositories.supabase.base import SupabaseRequestError


class SupabaseRecommendationsMixin:
    def semantic_book_search(
        self, embedding: list[float], limit: int = 20,
        access_token: str | None = None, query: str | None = None,
    ) -> list[dict]:
        if not access_token:
            return []
        rpc = "search_books_hybrid" if query else "match_books"
        body = {"query_embedding": embedding, "match_count": min(max(limit, 1), 100)}
        if query:
            body["query_text"] = query
        return self._request("POST", f"/rest/v1/rpc/{rpc}", token=access_token, json_body=body).json()

    def upsert_book_embeddings(self, records: list[dict]) -> int:
        updated = 0
        for record in records:
            self._request(
                "PATCH", "/rest/v1/books", admin=True,
                params={"id": f"eq.{record['id']}"},
                json_body={
                    "embedding": record["embedding"],
                    "embedding_model": record["embedding_model"],
                    "embedding_updated_at": record["embedding_updated_at"],
                },
                extra_headers={"Prefer": "return=minimal"},
            )
            updated += 1
        return updated

    def upsert_recommendation_feedback(self, user_id: str, book_id: str, feedback_type: str,
                                       query_text: str | None = None, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/recommendation_feedback", token=access_token,
            params={"on_conflict": "user_id,book_id,feedback_type"},
            json_body={"user_id": user_id, "book_id": book_id, "feedback_type": feedback_type, "query_text": query_text},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Geri bildirim kaydedilemedi.", 409)
        return rows[0]

    def recommendation_feedback(self, user_id: str, access_token: str | None = None) -> list[dict]:
        if not access_token:
            return []
        try:
            return self._request(
                "GET", "/rest/v1/recommendation_feedback", token=access_token,
                params={"select": "*", "user_id": f"eq.{user_id}", "order": "updated_at.desc", "limit": 1000},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code in {400, 404}:
                return []
            raise

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

    def upsert_reading_plan(self, user_id: str, book_id: str, target_date: str,
                            reminder_enabled: bool = False, access_token: str | None = None,
                            reminder_time: str = "20:00", timezone: str = "Europe/Istanbul",
                            excluded_weekdays: list[int] | None = None, weekday_pages: int | None = None,
                            weekend_pages: int | None = None, delivery_channel: str = "in_app") -> dict:
        book = next((item for item in self.list_books() if item["id"] == book_id), None)
        if not book:
            raise KeyError("Kitap bulunamadı.")
        profile = self.user_profile(user_id, access_token)
        entry = next((item for item in profile["reading_books"] + profile["to_read_books"] if item["id"] == book_id), {})
        remaining = max(1, (book.get("page_count") or 1) - (entry.get("current_page") or 0))
        schedule = build_schedule(remaining, date.fromisoformat(target_date), excluded_weekdays or [], weekday_pages, weekend_pages)
        daily_pages = max(1, (remaining + len(schedule) - 1) // len(schedule))
        rows = self._request(
            "POST", "/rest/v1/reading_plans", token=access_token,
            params={"on_conflict": "user_id,book_id"},
            json_body={"user_id": user_id, "book_id": book_id, "target_date": target_date,
                       "daily_pages": daily_pages, "reminder_enabled": reminder_enabled, "reminder_time": reminder_time,
                       "timezone": timezone, "excluded_weekdays": excluded_weekdays or [], "weekday_pages": weekday_pages,
                       "weekend_pages": weekend_pages, "delivery_channel": delivery_channel, "status": "active"},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        self._request("DELETE", "/rest/v1/reading_plan_days", token=access_token,
                      params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}", "completed_pages": "eq.0"})
        now = datetime.now(UTC).isoformat()
        day_rows = [{"user_id": user_id, "book_id": book_id, **day} for day in schedule]
        if day_rows:
            self._request("POST", "/rest/v1/reading_plan_days", token=access_token,
                          params={"on_conflict": "user_id,book_id,plan_date"}, json_body=day_rows,
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        if reminder_enabled and self.secret_key:
            deliveries = [{"user_id": user_id, "book_id": book_id, "scheduled_for": reminder_datetime_utc(day["plan_date"], reminder_time, timezone),
                           "channel": delivery_channel, "idempotency_key": f"reading:{user_id}:{book_id}:{day['plan_date']}:{reminder_time}:{delivery_channel}"} for day in schedule]
            if deliveries:
                self._request("POST", "/rest/v1/reminder_deliveries", admin=True,
                              params={"on_conflict": "idempotency_key"}, json_body=deliveries,
                              extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
        return {**rows[0], "schedule": schedule, **schedule_summary(schedule), "updated_at": now}

    def list_reading_plans(self, user_id: str, access_token: str | None = None) -> list[dict]:
        return self._request(
            "GET", "/rest/v1/reading_plans", token=access_token,
            params={"select": "*,book:books(title,author,page_count)", "user_id": f"eq.{user_id}", "order": "target_date.asc"},
        ).json()

    def reading_plan_calendar(self, user_id: str, start: str, end: str, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/reading_plan_days", token=access_token,
                             params={"select": "*,book:books(title,author)", "user_id": f"eq.{user_id}",
                                     "plan_date": f"gte.{start}", "and": f"(plan_date.lte.{end})", "order": "plan_date.asc"}).json()

    def set_reading_plan_status(self, user_id: str, book_id: str, status: str, access_token: str | None = None) -> dict:
        rows = self._request("PATCH", "/rest/v1/reading_plans", token=access_token,
                             params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"},
                             json_body={"status": status, "updated_at": datetime.now(timezone.utc).isoformat()},
                             extra_headers={"Prefer": "return=representation"}).json()
        if not rows:
            raise KeyError("Okuma planı bulunamadı.")
        return rows[0]

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

    def log_recommendation_event(self, user_id: str | None, query_text: str, result_count: int,
                                 fallback_used: bool, latency_ms: int, access_token: str | None = None) -> None:
        if not self.secret_key:
            return
        self._request(
            "POST", "/rest/v1/recommendation_events", admin=True,
            json_body={"user_id": user_id, "query_text": query_text, "result_count": result_count,
                       "fallback_used": fallback_used, "latency_ms": latency_ms},
        )

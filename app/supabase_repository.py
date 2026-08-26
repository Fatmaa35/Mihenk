from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.services.catalog_quality import canonical_work_key, deduplicate_library_entries, enrich_book_record, normalize_isbn
from app.services.gamification import BADGE_RULES, build_gamification_summary, earned_badge_codes
from app.services.reading_planner import build_schedule, reminder_datetime_utc, schedule_summary
from app.services.product_growth import funnel_metrics, weekly_window


class SupabaseRequestError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


class SupabaseRepository:
    """Supabase Auth ve Data API üzerinden çalışan repository adaptörü."""

    BOOK_COLUMNS = (
        "id,title,author,canonical_work_key,genre,publication_type,language,original_language,page_count,"
        "themes,character_traits,atmosphere,narrative_style,narrative_pace,description,quality_score,quality_flags,is_recommendable,"
        "source_name,source_url,cover_url,series_name,series_index,metadata_updated_at,rating_count,rating_average,popularity_score"
    )

    def __init__(self, url: str, publishable_key: str, secret_key: str = "") -> None:
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key
        self.secret_key = secret_key
        self.client = httpx.Client(timeout=httpx.Timeout(20.0, connect=8.0))

    @property
    def backend_name(self) -> str:
        return "supabase"

    @staticmethod
    def _message(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return "Supabase isteği tamamlanamadı."
        if isinstance(payload, dict):
            code = str(payload.get("code") or payload.get("error_code") or "")
            raw_message = str(
                payload.get("msg")
                or payload.get("message")
                or payload.get("error_description")
                or payload.get("error")
                or "Supabase isteği tamamlanamadı."
            )
            if response.status_code == 429 and (
                code == "over_email_send_rate_limit"
                or "email rate limit" in raw_message.casefold()
            ):
                return (
                    "E-posta gönderim sınırına ulaşıldı. Yeni kayıt isteği göndermeyin; "
                    "gelen kutusunu kontrol edin veya yaklaşık bir saat sonra tekrar deneyin."
                )
            if code == "email_address_invalid":
                return "Geçerli ve erişebildiğiniz gerçek bir e-posta adresi kullanın."
            if code in {"invalid_credentials", "invalid_grant"} or "invalid login credentials" in raw_message.casefold():
                return "E-posta veya parola hatalı."
            return raw_message
        return "Supabase isteği tamamlanamadı."

    def _request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        admin: bool = False,
        params: dict[str, Any] | None = None,
        json_body: Any = None,
        extra_headers: dict[str, str] | None = None,
        allow_statuses: set[int] | None = None,
    ) -> httpx.Response:
        key = self.secret_key if admin else self.publishable_key
        if admin and not key:
            raise SupabaseRequestError(
                "Bu işlem için döndürülmüş yeni bir SUPABASE_SECRET_KEY gereklidir.", 503
            )
        headers = {"apikey": key, "Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if extra_headers:
            headers.update(extra_headers)
        try:
            response = self.client.request(
                method,
                f"{self.url}{path}",
                params=params,
                json=json_body,
                headers=headers,
            )
        except httpx.HTTPError as error:
            raise SupabaseRequestError("Supabase sunucusuna ulaşılamadı.", 503) from error
        if not response.is_success and (not allow_statuses or response.status_code not in allow_statuses):
            raise SupabaseRequestError(self._message(response), response.status_code)
        return response

    def _safe_request_json(self, method: str, path: str, default: Any = None, **kwargs) -> Any:
        try:
            return self._request(method, path, **kwargs).json()
        except Exception:
            return default if default is not None else []

    @staticmethod
    def _user(user: dict, display_name: str | None = None) -> dict:
        metadata = user.get("user_metadata") or {}
        return {
            "id": user["id"],
            "display_name": display_name or metadata.get("display_name") or "Okur",
            "email": user.get("email", ""),
            "created_at": user.get("created_at"),
        }

    def _profile_name(self, user_id: str, token: str) -> str | None:
        response = self._request(
            "GET",
            "/rest/v1/profiles",
            token=token,
            params={"select": "display_name", "id": f"eq.{user_id}", "limit": 1},
        )
        rows = response.json()
        return rows[0]["display_name"] if rows else None

    def _auth_envelope(self, payload: dict, confirmation_required: bool = False) -> dict:
        user = payload.get("user") or {}
        access_token = payload.get("access_token")
        display_name = self._profile_name(user["id"], access_token) if access_token and user.get("id") else None
        return {
            "user": self._user(user, display_name),
            "access_token": access_token,
            "refresh_token": payload.get("refresh_token"),
            "email_confirmation_required": confirmation_required,
        }

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

    @staticmethod
    def _book(row: dict) -> dict:
        return {
            "id": row["id"],
            "title": row["title"],
            "author": row["author"],
            "canonical_work_key": row.get("canonical_work_key"),
            "genre": row["genre"],
            "publication_type": row.get("publication_type") or "unknown",
            "language": row.get("language") or "tr",
            "original_language": row.get("original_language"),
            "page_count": row.get("page_count"),
            "themes": row.get("themes") or [],
            "character_traits": row.get("character_traits") or [],
            "atmosphere": row.get("atmosphere") or [],
            "narrative_style": row.get("narrative_style") or [],
            "narrative_pace": row.get("narrative_pace"),
            "description": row.get("description") or "",
            "quality_score": float(row.get("quality_score") or 0),
            "quality_flags": row.get("quality_flags") or [],
            "is_recommendable": bool(row.get("is_recommendable", True)),
            "source_name": row.get("source_name"),
            "source_url": row.get("source_url"),
            "cover_url": row.get("cover_url"),
            "series_name": row.get("series_name"),
            "series_index": row.get("series_index"),
            "rating_count": int(row.get("rating_count") or 0),
            "rating_average": float(row.get("rating_average") or 0),
            "popularity_score": float(row.get("popularity_score") or 0),
        }

    def list_books(self) -> list[dict]:
        response = self._request(
            "GET",
            "/rest/v1/books",
            params={"select": self.BOOK_COLUMNS, "order": "title.asc", "limit": 1000},
        )
        return [self._book(row) for row in response.json()]

    @staticmethod
    def _search_phrase(query: str) -> str:
        cleaned = re.sub(r"[^\w\sçğıöşüÇĞİÖŞÜ-]", " ", query, flags=re.UNICODE)
        return " ".join(cleaned.split())[:200]

    def search_books(self, query: str | None, limit: int, offset: int, sort: str = "title") -> dict:
        params: dict[str, Any] = {
            "select": self.BOOK_COLUMNS,
            "order": "popularity_score.desc,rating_count.desc,title.asc" if sort == "popular" else "title.asc",
            "limit": limit,
            "offset": offset,
        }
        phrase = self._search_phrase((query or "").strip())
        if phrase:
            pattern = f"*{phrase}*"
            params["or"] = (
                f"(title.ilike.{pattern},author.ilike.{pattern},"
                f"genre.ilike.{pattern},description.ilike.{pattern})"
            )
        response = self._request(
            "GET",
            "/rest/v1/books",
            params=params,
            extra_headers={"Prefer": "count=exact"},
        )
        content_range = response.headers.get("content-range", "0-0/0")
        total_text = content_range.rsplit("/", 1)[-1]
        total = int(total_text) if total_text.isdigit() else len(response.json())
        return {
            "items": [self._book(row) for row in response.json()],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    def _count(self, table: str, params: dict[str, Any] | None = None) -> int:
        query = {"select": "*", "limit": 1, **(params or {})}
        response = self._request(
            "GET",
            f"/rest/v1/{table}",
            params=query,
            extra_headers={"Prefer": "count=exact"},
        )
        total = response.headers.get("content-range", "0-0/0").rsplit("/", 1)[-1]
        return int(total) if total.isdigit() else 0

    def catalog_coverage(self) -> dict:
        offers_response = self._request(
            "GET",
            "/rest/v1/offers",
            params={"select": "checked_at,editions(book_id)", "limit": 1000},
        )
        offer_rows = offers_response.json()
        priced_books = {
            row.get("editions", {}).get("book_id")
            for row in offer_rows
            if row.get("editions") and row["editions"].get("book_id")
        }
        last_price_check = max(
            (row.get("checked_at") for row in offer_rows if row.get("checked_at")),
            default=None,
        )
        return {
            "books": self._count("books"),
            "recommendable_books": self._count("books", {"is_recommendable": "eq.true"}),
            "low_quality_books": self._count("books", {"quality_score": "lt.0.48"}),
            "editions": self._count("editions"),
            "verified_turkish_editions": self._count(
                "editions",
                {
                    "language": "eq.tur",
                    "verification_status": "in.(verified,retailer_verified)",
                },
            ),
            "priced_books": len(priced_books),
            "offers": len(offer_rows),
            "last_price_check": last_price_check,
        }

    def upsert_metadata_book(self, raw_record: dict) -> str:
        """Merge external metadata at work level and retain ISBN at edition level."""
        record = enrich_book_record(raw_record)
        existing_rows = self._request(
            "GET", "/rest/v1/books", admin=True,
            params={
                "select": "id,source_name",
                "canonical_work_key": f"eq.{record['canonical_work_key']}",
                "limit": 10,
            },
        ).json()
        if not existing_rows:
            existing_rows = self._request(
                "GET", "/rest/v1/books", admin=True,
                params={
                    "select": "id,source_name",
                    "title": f"eq.{record['title']}",
                    "author": f"eq.{record['author']}",
                    "limit": 10,
                },
            ).json()
        if not existing_rows:
            existing_rows = self._request(
                "GET", "/rest/v1/books", admin=True,
                params={"select": "id,source_name", "id": f"eq.{record['id']}", "limit": 1},
            ).json()
        existing_rows.sort(key=lambda row: row.get("source_name") != "local_curated")
        existing = existing_rows[0] if existing_rows else None
        book_id = existing["id"] if existing else record["id"]
        book_payload = {
            "id": book_id,
            "title": record["title"],
            "author": record["author"],
            "canonical_work_key": record["canonical_work_key"],
            "genre": record["genre"],
            "publication_type": record["publication_type"],
            "language": record["language"],
            "original_language": record.get("original_language"),
            "page_count": record["page_count"],
            "themes": record["themes"],
            "character_traits": record["character_traits"],
            "atmosphere": record["atmosphere"], "narrative_style": record["narrative_style"],
            "narrative_pace": record["narrative_pace"],
            "description": record["description"],
            "quality_score": record["quality_score"],
            "quality_flags": record["quality_flags"],
            "is_recommendable": record["is_recommendable"],
            "source_name": record.get("source_name"),
            "source_url": record.get("source_url"),
            "cover_url": record.get("cover_url"),
            "metadata_updated_at": record.get("metadata_updated_at"),
        }
        if not existing:
            self._request(
                "POST", "/rest/v1/books", admin=True, json_body=book_payload,
                extra_headers={"Prefer": "return=minimal"},
            )
        elif existing.get("source_name") != "local_curated":
            self._request(
                "PATCH", "/rest/v1/books", admin=True,
                params={"id": f"eq.{book_id}"}, json_body=book_payload,
                extra_headers={"Prefer": "return=minimal"},
            )
        if record.get("isbn"):
            isbn10, isbn13 = normalize_isbn(record["isbn"])
            # Production editions use ISBN-13 as the canonical key; valid
            # ISBN-10 values are converted by normalize_isbn.
            canonical_isbn = isbn13
            if not canonical_isbn:
                return book_id
            self._request(
                "POST", "/rest/v1/editions", admin=True,
                params={"on_conflict": "isbn"},
                json_body={
                    "isbn": canonical_isbn, "isbn10": isbn10, "isbn13": isbn13, "book_id": book_id,
                    "title": record["title"], "author": record["author"],
                    "publisher": record.get("publisher"),
                    "translator": record.get("translator"), "edition_label": record.get("edition_label"),
                    "language": record["language"], "page_count": record["page_count"],
                    "source_name": record.get("source_name"),
                    "source_url": record.get("source_url"),
                },
                extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            )
        return book_id

    def list_retail_offers(self, book_id: str | None = None, isbn: str | None = None) -> list[dict]:
        params: dict[str, Any] = {
            "select": (
                "product_url,price_minor,list_price_minor,currency,stock_status,checked_at,"
                "edition:editions!inner(book_id,isbn,title,author,publisher),"
                "retailer:retailers!inner(name)"
            ),
            "order": "price_minor.asc",
            "limit": 1000,
        }
        if book_id:
            params["edition.book_id"] = f"eq.{book_id}"
        if isbn:
            params["edition.isbn"] = f"eq.{isbn}"
        rows = self._request("GET", "/rest/v1/offers", params=params).json()
        stale_before = datetime.now(timezone.utc) - timedelta(days=7)
        result = []
        for row in rows:
            edition, retailer = row["edition"], row["retailer"]
            try:
                checked_at = datetime.fromisoformat(row["checked_at"].replace("Z", "+00:00"))
                if checked_at.tzinfo is None:
                    checked_at = checked_at.replace(tzinfo=timezone.utc)
                is_stale = checked_at < stale_before
            except (AttributeError, TypeError, ValueError):
                is_stale = True
            result.append(
                {
                    "book_id": edition.get("book_id"),
                    "isbn": edition["isbn"],
                    "title": edition["title"],
                    "author": edition.get("author"),
                    "publisher": edition.get("publisher"),
                    "retailer_name": retailer["name"],
                    "product_url": row["product_url"],
                    "price_minor": row["price_minor"],
                    "list_price_minor": row.get("list_price_minor"),
                    "currency": row["currency"],
                    "stock_status": row["stock_status"],
                    "checked_at": row["checked_at"],
                    "is_stale": is_stale,
                }
            )
        return result

    def list_book_price_history(self, book_id: str, limit: int = 90) -> list[dict]:
        rows = self._request(
            "GET", "/rest/v1/price_history",
            params={
                "select": (
                    "price_minor,stock_status,observed_at,"
                    "offer:offers!inner(currency,product_url,retailer:retailers!inner(name),"
                    "edition:editions!inner(book_id))"
                ),
                "offer.edition.book_id": f"eq.{book_id}",
                "order": "observed_at.desc",
                "limit": min(max(limit, 1), 365),
            },
        ).json()
        return [{
            "price_minor": row["price_minor"], "stock_status": row["stock_status"],
            "observed_at": row["observed_at"], "currency": row["offer"]["currency"],
            "product_url": row["offer"]["product_url"],
            "retailer_name": row["offer"]["retailer"]["name"],
        } for row in rows]

    def list_offer_urls(self, retailer_ids: list[str] | None = None) -> list[str]:
        params: dict[str, Any] = {"select": "product_url", "limit": 1000}
        if retailer_ids: params["retailer_id"] = f"in.({','.join(retailer_ids)})"
        return [row["product_url"] for row in self._request("GET", "/rest/v1/offers", admin=True, params=params).json()]

    def list_verified_editions(self, limit: int = 200) -> list[dict]:
        rows = self._request("GET", "/rest/v1/editions", admin=True, params={
            "select": "*,book:books(title,author)", "language": "eq.tur",
            "verification_status": "in.(verified,retailer_verified)", "order": "verified_at.desc", "limit": limit}).json()
        result = []
        for row in rows:
            book = row.pop("book", None) or {}
            result.append({**row, "book_title": book.get("title"), "book_author": book.get("author")})
        return result

    def list_unpriced_books(self, limit: int = 20) -> list[dict]:
        priced = self._request("GET", "/rest/v1/offers", admin=True,
            params={"select": "edition:editions!inner(book_id)", "limit": 5000}).json()
        priced_ids = {row["edition"]["book_id"] for row in priced if row.get("edition") and row["edition"].get("book_id")}
        rows = self.list_books()
        return [book for book in rows if book["id"] not in priced_ids][:limit]

    def save_retail_offer(self, offer: dict) -> dict:
        self._request("POST", "/rest/v1/retailers", admin=True, params={"on_conflict": "id"}, json_body={
            "id": offer["retailer_id"], "name": offer["retailer_name"], "base_url": offer["base_url"],
            "robots_url": offer["robots_url"], "content_policy": offer["content_policy"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        existing_editions = self._request("GET", "/rest/v1/editions", admin=True,
            params={"select": "book_id", "isbn": f"eq.{offer['isbn']}", "limit": 1}).json()
        book_id = offer.get("book_id") or (existing_editions[0].get("book_id") if existing_editions else None)
        if not book_id:
            match = self._request("GET", "/rest/v1/books", admin=True,
                params={"select": "id", "title": f"eq.{offer['canonical_title']}", "limit": 1}).json()
            book_id = match[0]["id"] if match else None
        self._request("POST", "/rest/v1/editions", admin=True, params={"on_conflict": "isbn"}, json_body={
            "isbn": offer["isbn"], "isbn13": offer["isbn"], "book_id": book_id, "title": offer["canonical_title"],
            "author": offer.get("author"), "publisher": offer.get("publisher"), "language": "tur",
            "source_name": offer["retailer_name"], "source_url": offer["product_url"],
            "verification_status": "retailer_verified", "verified_at": offer["checked_at"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        rows = self._request("POST", "/rest/v1/offers", admin=True, params={"on_conflict": "edition_isbn,retailer_id"}, json_body={
            "edition_isbn": offer["isbn"], "retailer_id": offer["retailer_id"], "product_url": offer["product_url"],
            "price_minor": offer["price_minor"], "list_price_minor": offer.get("list_price_minor"), "currency": offer["currency"],
            "stock_status": offer["stock_status"], "checked_at": offer["checked_at"], "content_hash": offer["content_hash"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        if rows:
            latest_rows = self._request("GET", "/rest/v1/price_history", admin=True, params={
                "select": "price_minor,stock_status,observed_at", "offer_id": f"eq.{rows[0]['id']}",
                "order": "observed_at.desc", "limit": 1,
            }).json()
            latest = latest_rows[0] if latest_rows else None
            checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
            last_at = datetime.fromisoformat(latest["observed_at"].replace("Z", "+00:00")) if latest else None
            should_record = not latest or latest["price_minor"] != offer["price_minor"] or latest["stock_status"] != offer["stock_status"]
            should_record = should_record or bool(last_at and checked_at - last_at >= timedelta(hours=24))
            if should_record:
                self._request("POST", "/rest/v1/price_history", admin=True,
                    json_body={"offer_id": rows[0]["id"], "price_minor": offer["price_minor"], "stock_status": offer["stock_status"],
                               "observed_at": offer["checked_at"]}, extra_headers={"Prefer": "return=minimal"})
        return {key: offer[key] for key in ("isbn", "canonical_title", "retailer_name", "price_minor", "currency", "stock_status", "product_url", "checked_at")}

    def create_pipeline_run(self, idempotency_key: str, job_type: str, orchestrator: str = "manual",
                            trigger_kind: str = "manual") -> dict:
        existing = self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "idempotency_key": f"eq.{idempotency_key}", "limit": 1,
        }).json()
        if existing:
            return {**existing[0], "duplicate": True}
        rows = self._request("POST", "/rest/v1/data_pipeline_runs", admin=True,
        params={"on_conflict": "idempotency_key"}, json_body={
            "idempotency_key": idempotency_key, "job_type": job_type, "orchestrator": orchestrator,
            "trigger_kind": trigger_kind, "status": "running",
        }, extra_headers={"Prefer": "resolution=ignore-duplicates,return=representation"}).json()
        if rows:
            return {**rows[0], "duplicate": False}
        existing = self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "idempotency_key": f"eq.{idempotency_key}", "limit": 1,
        }).json()
        return {**existing[0], "duplicate": True}

    def log_pipeline_event(self, run_id: str, level: str, stage: str, message: str,
                           context: dict | None = None) -> None:
        self._request("POST", "/rest/v1/data_pipeline_logs", admin=True, json_body={
            "run_id": run_id, "level": level, "stage": stage, "message": message, "context": context or {},
        }, extra_headers={"Prefer": "return=minimal"})

    def finish_pipeline_run(self, run_id: str, status: str, report: dict) -> dict:
        checked = int(report.get("checked", report.get("refreshed", 0) + report.get("discovered", 0) + report.get("not_found", 0)))
        success = int(report.get("success", report.get("refreshed", 0) + report.get("discovered", 0)))
        failure = int(report.get("failure", len(report.get("errors", []))))
        rows = self._request("PATCH", "/rest/v1/data_pipeline_runs", admin=True,
            params={"id": f"eq.{run_id}"}, json_body={"status": status, "checked_count": checked,
            "success_count": success, "failure_count": failure, "finished_at": datetime.now(timezone.utc).isoformat(),
            "report": report}, extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]

    def list_pipeline_runs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "order": "started_at.desc", "limit": min(max(limit, 1), 200),
        }).json()

    def list_pipeline_logs(self, limit: int = 100, run_id: str | None = None,
                           access_token: str | None = None) -> list[dict]:
        params: dict[str, Any] = {"select": "*", "order": "created_at.desc", "limit": min(max(limit, 1), 500)}
        if run_id:
            params["run_id"] = f"eq.{run_id}"
        return self._request("GET", "/rest/v1/data_pipeline_logs", admin=True, params=params).json()

    def replace_price_forecasts(self, book_id: str, forecasts: list[dict]) -> int:
        if not forecasts:
            return 0
        version = forecasts[0]["model_version"]
        self._request("DELETE", "/rest/v1/price_forecasts", admin=True,
                      params={"book_id": f"eq.{book_id}", "model_version": f"eq.{version}"})
        payload = [{**row, "book_id": book_id} for row in forecasts]
        self._request("POST", "/rest/v1/price_forecasts", admin=True, json_body=payload,
                      extra_headers={"Prefer": "return=minimal"})
        return len(payload)

    def list_book_price_forecasts(self, book_id: str) -> list[dict]:
        return self._request("GET", "/rest/v1/price_forecasts", params={
            "select": "*", "book_id": f"eq.{book_id}", "forecast_date": f"gte.{datetime.now(timezone.utc).date()}",
            "order": "forecast_date.asc", "limit": 15,
        }).json()

    def upsert_library_entry(
        self,
        user_id: str,
        book_id: str,
        shelf: str,
        is_favorite: bool,
        current_page: int = 0,
        total_pages: int | None = None,
        abandonment_reason: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        target_rows = self._request(
            "GET", "/rest/v1/books", token=access_token,
            params={"select": "id,title,author", "id": f"eq.{book_id}", "limit": 1},
        ).json()
        if not target_rows:
            raise KeyError("Kitap bulunamadı.")
        self._assert_library_identity_available(
            user_id, target_rows[0]["title"], target_rows[0]["author"], access_token,
            exclude_book_id=book_id,
        )
        response = self._request(
            "POST",
            "/rest/v1/rpc/update_reading_progress",
            token=access_token,
            json_body={
                "p_book_id": book_id,
                "p_shelf": shelf,
                "p_is_favorite": is_favorite,
                "p_current_page": current_page,
                "p_total_pages": total_pages,
            },
        )
        rows = response.json()
        if not rows:
            raise SupabaseRequestError("Kitaplık kaydı oluşturulamadı.", 409)
        return rows[0]

    @staticmethod
    def _custom_book(row: dict) -> dict:
        total_pages = row.get("total_pages")
        return {
            "id": row["id"], "title": row["title"], "author": row["author"],
            "genre": row["genre"], "themes": [row["genre"]], "character_traits": [],
            "description": "Kullanıcının kişisel kitaplığına eklediği kitap.",
            "source_name": "user_custom", "source_url": None,
            "cover_url": row.get("cover_url"), "series_name": None, "series_index": None,
            "is_custom": True, "shelf": row["shelf"],
            "is_favorite": row["is_favorite"], "current_page": row["current_page"],
            "total_pages": total_pages,
            "progress_percent": round(row["current_page"] / total_pages * 100, 1) if total_pages else 0,
            "started_at": row.get("started_at"), "finished_at": row.get("finished_at"),
            "library_updated_at": row.get("updated_at"),
        }

    def _assert_library_identity_available(
        self, user_id: str, title: str, author: str, access_token: str,
        *, exclude_book_id: str | None = None, exclude_custom_id: str | None = None,
    ) -> None:
        target_key = canonical_work_key(title, author)
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "id,title,author", "user_id": f"eq.{user_id}", "limit": 1000},
        ).json()
        catalog_rows = self._request(
            "GET", "/rest/v1/user_books", token=access_token,
            params={
                "select": "book_id,book:books!inner(title,author)",
                "user_id": f"eq.{user_id}", "limit": 1000,
            },
        ).json()
        existing_custom = next((row for row in custom_rows if row["id"] == exclude_custom_id), None)
        if existing_custom and canonical_work_key(existing_custom["title"], existing_custom["author"]) == target_key:
            return
        existing_catalog = next((row for row in catalog_rows if row["book_id"] == exclude_book_id), None)
        if existing_catalog and canonical_work_key(
            existing_catalog["book"]["title"], existing_catalog["book"]["author"]
        ) == target_key:
            return
        duplicate_custom = any(
            row["id"] != exclude_custom_id
            and canonical_work_key(row["title"], row["author"]) == target_key
            for row in custom_rows
        )
        duplicate_catalog = any(
            row["book_id"] != exclude_book_id
            and canonical_work_key(row["book"]["title"], row["book"]["author"]) == target_key
            for row in catalog_rows
        )
        if duplicate_custom or duplicate_catalog:
            raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")

    def save_custom_book(
        self, user_id: str, title: str, author: str, genre: str, cover_url: str | None,
        shelf: str, is_favorite: bool, current_page: int = 0,
        total_pages: int | None = None, custom_book_id: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        self._assert_library_identity_available(
            user_id, title.strip(), author.strip() or "Bilinmeyen yazar", access_token,
            exclude_custom_id=custom_book_id,
        )
        now = datetime.now(UTC).isoformat()
        previous = []
        if custom_book_id:
            previous = self._request(
                "GET", "/rest/v1/user_custom_books", token=access_token,
                params={"select": "*", "id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
            if not previous:
                raise KeyError("Kişisel kitap bulunamadı.")
        old = previous[0] if previous else None
        started_at = old.get("started_at") if old else None
        finished_at = old.get("finished_at") if old else None
        if shelf in {"reading", "read"} and not started_at:
            started_at = now
        finished_at = (finished_at or now) if shelf == "read" else None
        body = {
            "user_id": user_id, "title": title.strip(),
            "author": author.strip() or "Bilinmeyen yazar", "genre": genre.strip() or "Genel",
            "cover_url": cover_url or None, "shelf": shelf, "is_favorite": is_favorite,
            "current_page": current_page, "total_pages": total_pages,
            "started_at": started_at, "finished_at": finished_at,
        }
        if custom_book_id:
            rows = self._request(
                "PATCH", "/rest/v1/user_custom_books", token=access_token,
                params={"id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}"},
                json_body=body, extra_headers={"Prefer": "return=representation"},
            ).json()
        else:
            rows = self._request(
                "POST", "/rest/v1/user_custom_books", token=access_token,
                json_body=body, extra_headers={"Prefer": "return=representation"},
            ).json()
        if not rows:
            raise SupabaseRequestError("Kişisel kitap kaydedilemedi.", 409)
        pages_read = max(0, current_page - (old.get("current_page", 0) if old else 0))
        if pages_read:
            self._request(
                "POST", "/rest/v1/reading_activity", token=access_token,
                json_body={"user_id": user_id, "custom_book_id": rows[0]["id"], "pages_read": pages_read},
            )
        return self._custom_book(rows[0])

    def delete_custom_book(
        self, user_id: str, custom_book_id: str, access_token: str | None = None,
    ) -> None:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        response = self._request(
            "DELETE", "/rest/v1/user_custom_books", token=access_token,
            params={"id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}"},
            extra_headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise KeyError("Kişisel kitap bulunamadı.")

    def user_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        base_columns = "user_id,personality_text,selected_traits,preferred_genres,disliked_genres,updated_at"
        detailed_columns = base_columns + ",liked_styles,disliked_styles,pace_preference,focus_preference,tone_preference,violence_sensitivity,romance_sensitivity,spoiler_sensitivity,length_preference"
        try:
            rows = self._request(
                "GET", "/rest/v1/user_preferences", token=access_token,
                params={"select": detailed_columns, "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code != 400:
                raise
            rows = self._request(
                "GET", "/rest/v1/user_preferences", token=access_token,
                params={"select": base_columns, "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
        if rows:
            return {
                "liked_styles": [], "disliked_styles": [], "pace_preference": None,
                "focus_preference": None, "tone_preference": None, "violence_sensitivity": 0,
                "romance_sensitivity": 0, "spoiler_sensitivity": 2, "length_preference": None,
                **rows[0],
            }
        return {
            "user_id": user_id,
            "personality_text": "",
            "selected_traits": [],
            "preferred_genres": [],
            "disliked_genres": [],
            "liked_styles": [], "disliked_styles": [], "pace_preference": None,
            "focus_preference": None, "tone_preference": None, "violence_sensitivity": 0,
            "romance_sensitivity": 0, "spoiler_sensitivity": 2, "length_preference": None,
            "updated_at": None,
        }

    def upsert_user_preferences(
        self,
        user_id: str,
        personality_text: str,
        selected_traits: list[str],
        preferred_genres: list[str],
        disliked_genres: list[str],
        liked_styles: list[str] | None = None,
        disliked_styles: list[str] | None = None,
        pace_preference: str | None = None,
        focus_preference: str | None = None,
        tone_preference: str | None = None,
        violence_sensitivity: int = 0,
        romance_sensitivity: int = 0,
        spoiler_sensitivity: int = 2,
        length_preference: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        payload = {
                "user_id": user_id,
                "personality_text": personality_text.strip(),
                "selected_traits": selected_traits,
                "preferred_genres": preferred_genres,
                "disliked_genres": disliked_genres,
            }
        if any((liked_styles, disliked_styles, pace_preference, focus_preference, tone_preference,
                violence_sensitivity, romance_sensitivity, spoiler_sensitivity != 2, length_preference)):
            payload.update({
                "liked_styles": liked_styles or [], "disliked_styles": disliked_styles or [],
                "pace_preference": pace_preference, "focus_preference": focus_preference,
                "tone_preference": tone_preference, "violence_sensitivity": violence_sensitivity,
                "romance_sensitivity": romance_sensitivity, "spoiler_sensitivity": spoiler_sensitivity,
                "length_preference": length_preference,
            })
        try:
            rows = self._request(
                "POST", "/rest/v1/user_preferences", token=access_token,
                params={"on_conflict": "user_id"}, json_body=payload,
                extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code != 400:
                raise
            legacy = {key: payload[key] for key in ("user_id", "personality_text", "selected_traits", "preferred_genres", "disliked_genres")}
            rows = self._request(
                "POST", "/rest/v1/user_preferences", token=access_token,
                params={"on_conflict": "user_id"}, json_body=legacy,
                extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            ).json()
        if not rows:
            raise SupabaseRequestError("Okuma tercihleri kaydedilemedi.", 409)
        return rows[0]

    def user_profile(self, user_id: str, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        auth_user = self._request("GET", "/auth/v1/user", token=access_token).json()
        profile_rows = self._request(
            "GET",
            "/rest/v1/profiles",
            token=access_token,
            params={"select": "id,display_name,created_at", "id": f"eq.{user_id}", "limit": 1},
        ).json()
        if not profile_rows:
            raise KeyError("Kullanıcı bulunamadı.")
        rows = self._request(
            "GET",
            "/rest/v1/user_books",
            token=access_token,
            params={
                "select": (
                    "shelf,is_favorite,current_page,total_pages,started_at,finished_at,updated_at,"
                    f"book:books!inner({self.BOOK_COLUMNS})"
                ),
                "user_id": f"eq.{user_id}",
                "limit": 1000,
            },
        ).json()
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "title.asc", "limit": 1000},
        ).json()
        entries = [
            {
                **self._book(row["book"]), "shelf": row["shelf"],
                "is_favorite": row["is_favorite"], "current_page": row["current_page"],
                "total_pages": row.get("total_pages"),
                "progress_percent": round(
                    row["current_page"] / row["total_pages"] * 100, 1
                ) if row.get("total_pages") else 0,
                "started_at": row.get("started_at"), "finished_at": row.get("finished_at"),
                "library_updated_at": row.get("updated_at"),
            }
            for row in rows
        ]
        entries.extend(self._custom_book(row) for row in custom_rows)
        entries = deduplicate_library_entries(entries)
        profile = profile_rows[0]
        feedback = self.recommendation_feedback(user_id, access_token)
        feedback_ids = sorted({item["book_id"] for item in feedback})
        feedback_books = []
        if feedback_ids:
            feedback_rows = self._request(
                "GET", "/rest/v1/books", token=access_token,
                params={"select": self.BOOK_COLUMNS, "id": f"in.({','.join(feedback_ids)})"},
            ).json()
            feedback_books = [self._book(row) for row in feedback_rows]
        return {
            "user": {
                **profile,
                "email": auth_user.get("email", ""),
            },
            "read_books": [item for item in entries if item["shelf"] == "read"],
            "reading_books": [item for item in entries if item["shelf"] == "reading"],
            "to_read_books": [item for item in entries if item["shelf"] == "to_read"],
            "abandoned_books": [item for item in entries if item["shelf"] == "abandoned"],
            "favorite_books": [item for item in entries if item["is_favorite"]],
            "recommendation_feedback": feedback,
            "feedback_books": feedback_books,
        }

    def upsert_reading_goal(
        self, user_id: str, goal_year: int, target_books: int,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/reading_goals", token=access_token,
            params={"on_conflict": "user_id,goal_year"},
            json_body={
                "user_id": user_id, "goal_year": goal_year,
                "target_books": target_books,
            },
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Okuma hedefi kaydedilemedi.", 409)
        return rows[0]

    @staticmethod
    def _reading_streaks(activity_days: list[date]) -> tuple[int, int]:
        unique_days = sorted(set(activity_days))
        if not unique_days:
            return 0, 0
        longest = run = 1
        for previous, current in zip(unique_days, unique_days[1:]):
            run = run + 1 if current - previous == timedelta(days=1) else 1
            longest = max(longest, run)
        if date.today() - unique_days[-1] > timedelta(days=1):
            return 0, longest
        current_streak = 1
        for index in range(len(unique_days) - 1, 0, -1):
            if unique_days[index] - unique_days[index - 1] != timedelta(days=1):
                break
            current_streak += 1
        return current_streak, longest

    def reading_dashboard(
        self, user_id: str, year: int, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        goal_rows = self._request(
            "GET", "/rest/v1/reading_goals", token=access_token,
            params={
                "select": "target_books", "user_id": f"eq.{user_id}",
                "goal_year": f"eq.{year}", "limit": 1,
            },
        ).json()
        library_rows = self._request(
            "GET", "/rest/v1/user_books", token=access_token,
            params={
                "select": (
                    "shelf,current_page,total_pages,started_at,finished_at,"
                    f"book:books!inner({self.BOOK_COLUMNS})"
                ),
                "user_id": f"eq.{user_id}", "limit": 1000,
            },
        ).json()
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "*", "user_id": f"eq.{user_id}", "limit": 1000},
        ).json()
        activity_rows = self._request(
            "GET", "/rest/v1/reading_activity", token=access_token,
            params={
                "select": "activity_date,pages_read,book_id,custom_book_id",
                "user_id": f"eq.{user_id}",
                "activity_date": f"gte.{year}-01-01",
                "and": f"(activity_date.lt.{year + 1}-01-01)",
                "order": "activity_date.asc", "limit": 5000,
            },
        ).json()
        series_catalog = self._request(
            "GET", "/rest/v1/books",
            params={
                "select": "id,series_name", "series_name": "not.is.null",
                "limit": 1000,
            },
        ).json()

        calendar_by_date: dict[str, dict] = {}
        for row in activity_rows:
            item = calendar_by_date.setdefault(
                row["activity_date"], {"activity_date": row["activity_date"], "pages_read": 0, "book_ids": set()}
            )
            item["pages_read"] += row["pages_read"]
            item["book_ids"].add(row.get("book_id") or row.get("custom_book_id"))
        calendar = [{
            "activity_date": item["activity_date"], "pages_read": item["pages_read"],
            "books": len(item["book_ids"]),
        } for item in calendar_by_date.values()]
        activity_days = [date.fromisoformat(item["activity_date"]) for item in calendar]
        current_streak, longest_streak = self._reading_streaks(activity_days)

        genre_counts: dict[str, int] = {}
        read_ids = set()
        completed_books = 0
        currently_reading = []
        for row in library_rows:
            book = self._book(row["book"])
            if row["shelf"] == "read":
                read_ids.add(book["id"])
                genre_counts[book["genre"]] = genre_counts.get(book["genre"], 0) + 1
                if str(row.get("finished_at") or "").startswith(str(year)):
                    completed_books += 1
            if row["shelf"] == "reading":
                total_pages = row.get("total_pages")
                currently_reading.append({
                    **book, "current_page": row["current_page"], "total_pages": total_pages,
                    "progress_percent": round(row["current_page"] / total_pages * 100, 1)
                    if total_pages else 0,
                    "started_at": row.get("started_at"),
                })
        for row in custom_rows:
            if row["shelf"] == "read":
                genre_counts[row["genre"]] = genre_counts.get(row["genre"], 0) + 1
                if str(row.get("finished_at") or "").startswith(str(year)):
                    completed_books += 1
            if row["shelf"] == "reading":
                currently_reading.append(self._custom_book(row))

        series: dict[str, dict] = {}
        for book in series_catalog:
            name = book.get("series_name")
            if not name:
                continue
            item = series.setdefault(name, {"series_name": name, "total_books": 0, "read_books": 0})
            item["total_books"] += 1
            item["read_books"] += int(book["id"] in read_ids)
        series_progress = [{
            **item,
            "progress_percent": round(item["read_books"] / item["total_books"] * 100, 1),
        } for item in sorted(series.values(), key=lambda value: value["series_name"])]
        target_books = goal_rows[0]["target_books"] if goal_rows else 12
        return {
            "year": year,
            "goal": {
                "target_books": target_books, "completed_books": completed_books,
                "progress_percent": round(min(1, completed_books / target_books) * 100, 1),
                "is_default": not goal_rows,
            },
            "total_pages_read": sum(row["pages_read"] for row in activity_rows),
            "active_days": len(calendar), "current_streak": current_streak,
            "longest_streak": longest_streak, "calendar": calendar,
            "genre_distribution": [
                {"genre": genre, "count": count}
                for genre, count in sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "series_progress": series_progress,
            "currently_reading": currently_reading,
        }

    def get_reading_session_stats(
        self, user_id: str, access_token: str | None = None,
    ) -> dict:
        """Build PKM statistics from user-owned Supabase rows.

        Older Supabase installations do not have the optional reading_sessions
        table, so reading_activity remains the reliable source for the heatmap.
        """
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)

        activity_rows = self._request(
            "GET", "/rest/v1/reading_activity", token=access_token,
            params={
                "select": "activity_date,pages_read",
                "user_id": f"eq.{user_id}", "order": "activity_date.asc", "limit": 5000,
            },
        ).json()

        session_rows: list[dict] = []
        try:
            session_rows = self._request(
                "GET", "/rest/v1/reading_sessions", token=access_token,
                params={
                    "select": "duration_minutes,start_page,end_page",
                    "user_id": f"eq.{user_id}", "limit": 5000,
                },
            ).json()
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise

        heatmap: dict[str, int] = {}
        for row in activity_rows:
            activity_date = str(row.get("activity_date") or "")
            if activity_date:
                heatmap[activity_date] = heatmap.get(activity_date, 0) + int(row.get("pages_read") or 0)

        if session_rows:
            total_sessions = len(session_rows)
            total_minutes = sum(int(row.get("duration_minutes") or 0) for row in session_rows)
            total_pages = sum(
                max(0, int(row.get("end_page") or 0) - int(row.get("start_page") or 0))
                for row in session_rows
            )
        else:
            total_sessions = len(activity_rows)
            total_minutes = 0
            total_pages = sum(int(row.get("pages_read") or 0) for row in activity_rows)

        average_speed = round(total_pages / total_minutes, 2) if total_minutes > 0 else 0.0
        estimated_hours = round((300 / average_speed) / 60, 1) if average_speed > 0 else 0.0
        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "total_pages_read": total_pages,
            "average_reading_speed_pages_per_min": average_speed,
            "estimated_hours_for_300_page_book": estimated_hours,
            "heatmap_data": heatmap,
        }

    @staticmethod
    def _reading_session_view(row: dict) -> dict:
        start_page = int(row.get("start_page") or 0)
        end_page = int(row.get("end_page") or 0)
        duration = int(row.get("duration_minutes") or 0)
        pages_read = max(0, end_page - start_page)
        book = row.get("book") or {}
        custom_book = row.get("custom_book") or {}
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "book_id": row.get("book_id"),
            "custom_book_id": row.get("custom_book_id"),
            "book_title": book.get("title") or custom_book.get("title"),
            "start_page": start_page,
            "end_page": end_page,
            "pages_read": pages_read,
            "duration_minutes": duration,
            "reading_speed_pages_per_min": round(pages_read / duration, 2) if duration else 0.0,
            "session_date": row["session_date"],
            "created_at": row["created_at"],
        }

    @staticmethod
    def _book_quote_view(row: dict) -> dict:
        book = row.get("book") or {}
        custom_book = row.get("custom_book") or {}
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "book_id": row.get("book_id"),
            "custom_book_id": row.get("custom_book_id"),
            "book_title": book.get("title") or custom_book.get("title"),
            "quote_text": row["quote_text"],
            "page_number": row.get("page_number"),
            "tags": row.get("tags") or [],
            "source_type": row.get("source_type") or "manual",
            "created_at": row["created_at"],
        }

    def _pkm_book_title(
        self, user_id: str, book_id: str | None, custom_book_id: str | None,
        access_token: str,
    ) -> str:
        if book_id:
            rows = self._request(
                "GET", "/rest/v1/books", token=access_token,
                params={"select": "title", "id": f"eq.{book_id}", "limit": 1},
            ).json()
        else:
            rows = self._request(
                "GET", "/rest/v1/user_custom_books", token=access_token,
                params={
                    "select": "title", "id": f"eq.{custom_book_id}",
                    "user_id": f"eq.{user_id}", "limit": 1,
                },
            ).json()
        if not rows:
            raise KeyError("Kitap bulunamadı.")
        return rows[0]["title"]

    def add_reading_session(
        self, user_id: str, payload: dict, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        title = self._pkm_book_title(user_id, book_id, custom_book_id, access_token)
        body = {
            "user_id": user_id,
            "book_id": book_id,
            "custom_book_id": custom_book_id,
            "start_page": payload["start_page"],
            "end_page": payload["end_page"],
            "duration_minutes": payload["duration_minutes"],
        }
        rows = self._request(
            "POST", "/rest/v1/reading_sessions", token=access_token,
            json_body=body, extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Okuma seansı kaydedilemedi.", 502)

        pages_read = max(0, int(payload["end_page"]) - int(payload["start_page"]))
        if pages_read:
            self._request(
                "POST", "/rest/v1/reading_activity", token=access_token,
                json_body={
                    "user_id": user_id, "book_id": book_id,
                    "custom_book_id": custom_book_id, "pages_read": pages_read,
                },
                extra_headers={"Prefer": "return=minimal"},
            )
            if book_id:
                self._request(
                    "PATCH", "/rest/v1/user_books", token=access_token,
                    params={
                        "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}",
                        "current_page": f"lt.{payload['end_page']}",
                    },
                    json_body={"current_page": payload["end_page"]},
                    extra_headers={"Prefer": "return=minimal"},
                )
            else:
                self._request(
                    "PATCH", "/rest/v1/user_custom_books", token=access_token,
                    params={
                        "user_id": f"eq.{user_id}", "id": f"eq.{custom_book_id}",
                        "current_page": f"lt.{payload['end_page']}",
                    },
                    json_body={"current_page": payload["end_page"]},
                    extra_headers={"Prefer": "return=minimal"},
                )

        row = {**rows[0], "book": {"title": title} if book_id else None,
               "custom_book": {"title": title} if custom_book_id else None}
        return self._reading_session_view(row)

    def list_reading_sessions(
        self, user_id: str, book_id: str | None = None, limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        params: dict[str, Any] = {
            "select": "*,book:books(title),custom_book:user_custom_books(title)",
            "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": limit,
        }
        if book_id:
            params["or"] = f"(book_id.eq.{book_id},custom_book_id.eq.{book_id})"
        rows = self._request(
            "GET", "/rest/v1/reading_sessions", token=access_token, params=params,
        ).json()
        return [self._reading_session_view(row) for row in rows]

    def add_book_quote(
        self, user_id: str, payload: dict, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        title = self._pkm_book_title(user_id, book_id, custom_book_id, access_token)
        rows = self._request(
            "POST", "/rest/v1/book_quotes", token=access_token,
            json_body={
                "user_id": user_id, "book_id": book_id,
                "custom_book_id": custom_book_id,
                "quote_text": payload["quote_text"],
                "page_number": payload.get("page_number"),
                "tags": payload.get("tags") or [],
                "source_type": payload.get("source_type") or "manual",
            },
            extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Alıntı kaydedilemedi.", 502)
        row = {**rows[0], "book": {"title": title} if book_id else None,
               "custom_book": {"title": title} if custom_book_id else None}
        return self._book_quote_view(row)

    def list_book_quotes(
        self, user_id: str, book_id: str | None = None, limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        params: dict[str, Any] = {
            "select": "*,book:books(title),custom_book:user_custom_books(title)",
            "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": limit,
        }
        if book_id:
            params["or"] = f"(book_id.eq.{book_id},custom_book_id.eq.{book_id})"
        rows = self._request(
            "GET", "/rest/v1/book_quotes", token=access_token, params=params,
        ).json()
        return [self._book_quote_view(row) for row in rows]

    def gamification_summary(self, user_id: str, access_token: str | None = None) -> dict:
        stats = self._request(
            "POST", "/rest/v1/rpc/gamification_stats", admin=True,
            json_body={"target_user_id": user_id},
        ).json()
        if not isinstance(stats, dict):
            raise SupabaseRequestError("Rozet ilerlemesi hesaplanamadı.", 502)
        stats = {key: int(value or 0) for key, value in stats.items()}
        qualified = earned_badge_codes(stats)
        existing_rows = self._request(
            "GET", "/rest/v1/user_badges", admin=True,
            params={"select": "badge_code,earned_at", "user_id": f"eq.{user_id}", "order": "earned_at.asc"},
        ).json()
        existing = {row["badge_code"] for row in existing_rows}
        revoked = existing - qualified
        if revoked:
            self._request(
                "DELETE", "/rest/v1/user_badges", admin=True,
                params={"user_id": f"eq.{user_id}", "badge_code": f"in.({','.join(sorted(revoked))})"},
            )
        new_codes = qualified - existing
        if new_codes:
            now = datetime.now(timezone.utc).isoformat()
            self._request(
                "POST", "/rest/v1/user_badges", admin=True,
                params={"on_conflict": "user_id,badge_code"},
                json_body=[{"user_id": user_id, "badge_code": code, "earned_at": now} for code in sorted(new_codes)],
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
            )
        earned_rows = self._request(
            "GET", "/rest/v1/user_badges", admin=True,
            params={"select": "badge_code,earned_at", "user_id": f"eq.{user_id}", "order": "earned_at.asc"},
        ).json()
        showcase_rows = self._request(
            "GET", "/rest/v1/user_badge_showcase", admin=True,
            params={"select": "slot,badge_code", "user_id": f"eq.{user_id}", "order": "slot.asc"},
        ).json()
        showcase = [row["badge_code"] for row in showcase_rows]
        earned_now = {row["badge_code"] for row in earned_rows}
        additions = []
        if not showcase and new_codes:
            for rule in BADGE_RULES:
                if len(showcase) >= 3:
                    break
                if rule.code in earned_now:
                    showcase.append(rule.code)
                    additions.append({"user_id": user_id, "slot": len(showcase), "badge_code": rule.code})
        if additions:
            self._request(
                "POST", "/rest/v1/user_badge_showcase", admin=True,
                json_body=additions, extra_headers={"Prefer": "return=minimal"},
            )
        return build_gamification_summary(stats, earned_rows, showcase)

    def update_badge_showcase(self, user_id: str, badge_codes: list[str], access_token: str | None = None) -> dict:
        codes = list(dict.fromkeys(badge_codes))
        if len(codes) != len(badge_codes) or len(codes) > 3:
            raise ValueError("Vitrinde en fazla üç farklı rozet gösterilebilir.")
        current = self.gamification_summary(user_id, access_token)
        earned = {badge["code"] for badge in current["badges"] if badge["earned"]}
        if any(code not in earned for code in codes):
            raise ValueError("Yalnızca kazanılmış rozetler vitrine eklenebilir.")
        self._request(
            "DELETE", "/rest/v1/user_badge_showcase", admin=True,
            params={"user_id": f"eq.{user_id}"},
        )
        if codes:
            self._request(
                "POST", "/rest/v1/user_badge_showcase", admin=True,
                json_body=[{"user_id": user_id, "slot": slot, "badge_code": code} for slot, code in enumerate(codes, 1)],
                extra_headers={"Prefer": "return=minimal"},
            )
        return self.gamification_summary(user_id, access_token)

    def upsert_price_alert(
        self, user_id: str, book_id: str, target_price_minor: int,
        currency: str = "TRY", is_active: bool = True,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/price_alerts", token=access_token,
            params={"on_conflict": "user_id,book_id"},
            json_body={
                "user_id": user_id, "book_id": book_id,
                "target_price_minor": target_price_minor,
                "currency": currency, "is_active": is_active,
                "last_notified_price_minor": None,
            },
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Fiyat alarmi kaydedilemedi.", 409)
        return rows[0]

    def list_price_alerts(self, user_id: str, access_token: str | None = None) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "GET", "/rest/v1/price_alerts", token=access_token,
            params={
                "select": "*,book:books!inner(id,title,author,cover_url)",
                "user_id": f"eq.{user_id}", "order": "updated_at.desc", "limit": 1000,
            },
        ).json()
        lowest_prices: dict[str, int] = {}
        for offer in self.list_retail_offers():
            if offer["stock_status"] != "in_stock" or not offer.get("book_id"):
                continue
            book_id = offer["book_id"]
            lowest_prices[book_id] = min(lowest_prices.get(book_id, offer["price_minor"]), offer["price_minor"])
        return [{
            **{key: value for key, value in row.items() if key != "book"},
            **row["book"], "current_price_minor": lowest_prices.get(row["book_id"]),
        } for row in rows]

    def delete_price_alert(
        self, user_id: str, book_id: str, access_token: str | None = None,
    ) -> None:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        self._request(
            "DELETE", "/rest/v1/price_alerts", token=access_token,
            params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"},
        )

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

    def evaluate_price_alerts(self) -> int:
        rows = self._request(
            "POST", "/rest/v1/rpc/evaluate_price_alerts", admin=True, json_body={}
        ).json()
        return int(rows or 0)

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

    def quality_dashboard(self, access_token: str | None = None) -> dict:
        report = self.catalog_coverage()
        def admin_count(table: str, params: dict[str, str] | None = None) -> int:
            response = self._request(
                "GET", f"/rest/v1/{table}", admin=True,
                params={"select": "*", "limit": 1, **(params or {})},
                extra_headers={"Prefer": "count=exact"},
            )
            total = response.headers.get("content-range", "0-0/0").rsplit("/", 1)[-1]
            return int(total) if total.isdigit() else 0
        report.update({
            "missing_covers": admin_count("books", {"cover_url": "is.null"}),
            "duplicate_works": 0,
            "suspicious_records": admin_count("books", {"quality_score": "lt.0.48"}),
            "zero_result_queries": admin_count("recommendation_events", {"result_count": "eq.0"}),
            "fallback_rate": 0.0, "average_latency_ms": 0.0,
            "feedback": {kind: admin_count("recommendation_feedback", {"feedback_type": f"eq.{kind}"})
                         for kind in ("great_match", "not_for_me", "already_know", "more_like_this")},
        })
        return report

    def list_feature_flags(self, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/feature_flags", token=access_token,
                             params={"select": "*", "order": "key"}).json()

    def upsert_feature_flag(self, key: str, description: str, enabled: bool, rollout_percent: int,
                            access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/feature_flags", admin=True, params={"on_conflict": "key"},
                             json_body={"key": key, "description": description, "enabled": enabled, "rollout_percent": rollout_percent},
                             extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]

    def admin_catalog_issues(self, status: str = "open", limit: int = 100,
                             access_token: str | None = None) -> list[dict]:
        books = self.list_books()
        editions = self._request("GET", "/rest/v1/editions", admin=True, params={"select": "book_id", "limit": 10000}).json()
        edition_ids = {row.get("book_id") for row in editions}
        payload = []
        for book in books:
            issue_type = "missing_cover" if not book.get("cover_url") else "suspicious_metadata" if book["quality_score"] < .48 else "missing_isbn" if book["id"] not in edition_ids else None
            if issue_type:
                payload.append({"book_id": book["id"], "issue_type": issue_type,
                                "severity": "high" if book["quality_score"] < .48 else "medium",
                                "details": {"title": book["title"], "author": book["author"], "flags": book["quality_flags"]}})
        if payload:
            self._request(
                "POST", "/rest/v1/catalog_review_items", admin=True,
                params={"on_conflict": "book_id,issue_type"}, json_body=payload,
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
            )
        return self._request(
            "GET", "/rest/v1/catalog_review_items", admin=True,
            params={"select": "*,book:books(title,author,quality_score)", "status": f"eq.{status}",
                    "order": "severity.desc,created_at.asc", "limit": limit},
        ).json()

    def resolve_catalog_issue(self, issue_id: str, status: str, actor_id: str,
                              access_token: str | None = None) -> dict:
        rows = self._request(
            "PATCH", "/rest/v1/catalog_review_items", admin=True,
            params={"id": f"eq.{issue_id}", "status": "eq.open"},
            json_body={"status": status, "resolved_by": actor_id, "resolved_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise KeyError("İnceleme kaydı bulunamadı.")
        return rows[0]

    def admin_update_book(self, book_id: str, changes: dict, access_token: str | None = None) -> tuple[dict, dict]:
        allowed = {"title", "author", "genre", "publication_type", "language", "original_language", "page_count",
                   "cover_url", "description", "narrative_pace", "is_recommendable"}
        changes = {key: value for key, value in changes.items() if key in allowed and value is not None}
        before_rows = self._request("GET", "/rest/v1/books", admin=True,
                                    params={"select": self.BOOK_COLUMNS, "id": f"eq.{book_id}", "limit": 1}).json()
        if not before_rows:
            raise KeyError("Kitap bulunamadı.")
        if not changes:
            raise ValueError("Güncellenecek alan yok.")
        changes["metadata_updated_at"] = datetime.now(timezone.utc).isoformat()
        after_rows = self._request(
            "PATCH", "/rest/v1/books", admin=True, params={"id": f"eq.{book_id}"}, json_body=changes,
            extra_headers={"Prefer": "return=representation"},
        ).json()
        return self._book(before_rows[0]), self._book(after_rows[0])

    def merge_catalog_books(self, source_id: str, target_id: str, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        actor_id = self._request("GET", "/auth/v1/user", token=access_token).json()["id"]
        return self._request(
            "POST", "/rest/v1/rpc/catalog_merge_books", admin=True,
            json_body={"source_book_id": source_id, "target_book_id": target_id, "actor_user_id": actor_id},
        ).json()

    def create_catalog_job(self, job_type: str, payload: dict, created_by: str,
                           access_token: str | None = None) -> dict:
        rows = self._request(
            "POST", "/rest/v1/catalog_jobs", admin=True,
            json_body={"job_type": job_type, "payload": payload, "created_by": created_by},
            extra_headers={"Prefer": "return=representation"},
        ).json()
        return rows[0]

    def list_catalog_jobs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        return self._request(
            "GET", "/rest/v1/catalog_jobs", admin=True,
            params={"select": "*", "order": "created_at.desc", "limit": limit},
        ).json()

    def claim_catalog_job(self) -> dict | None:
        rows = self._request("POST", "/rest/v1/rpc/claim_catalog_job", admin=True, json_body={}).json()
        return rows[0] if rows else None

    def finish_catalog_job(self, job_id: str, success: bool, error: str | None = None) -> None:
        rows = self._request("GET", "/rest/v1/catalog_jobs", admin=True,
                             params={"select": "attempts,max_attempts", "id": f"eq.{job_id}", "limit": 1}).json()
        if not rows:
            raise KeyError("Katalog işi bulunamadı.")
        status = "completed" if success else "dead_letter" if rows[0]["attempts"] >= rows[0]["max_attempts"] else "pending"
        self._request("PATCH", "/rest/v1/catalog_jobs", admin=True, params={"id": f"eq.{job_id}"},
                      json_body={"status": status, "last_error": error[:2000] if error else None,
                                 "finished_at": datetime.now(timezone.utc).isoformat() if status in {"completed","dead_letter"} else None})

    def seed_books(self, source: Path) -> None:
        if not self.secret_key:
            return
        books = json.loads(source.read_text(encoding="utf-8"))
        for start in range(0, len(books), 100):
            payload = []
            for raw_book in books[start : start + 100]:
                book = enrich_book_record({**raw_book, "source_name": "local_curated"})
                payload.append({
                    "id": book["id"],
                    "title": book["title"],
                    "author": book["author"],
                    "canonical_work_key": book["canonical_work_key"],
                    "genre": book["genre"],
                    "publication_type": book["publication_type"],
                    "language": book["language"],
                    "page_count": book["page_count"],
                    "themes": book["themes"],
                    "character_traits": book["character_traits"],
                    "description": book["description"],
                    "quality_score": book["quality_score"],
                    "quality_flags": book["quality_flags"],
                    "is_recommendable": book["is_recommendable"],
                    "source_name": book["source_name"],
                })
            self._request(
                "POST",
                "/rest/v1/books",
                admin=True,
                params={"on_conflict": "id"},
                json_body=payload,
                extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            )

    def account_status(self, user_id: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/profiles", admin=True, params={
            "select": "is_verified,verification_label,banned_at,banned_until,ban_reason", "id": f"eq.{user_id}", "limit": 1}) .json()
        if not rows: raise KeyError("Kullanıcı bulunamadı.")
        result = rows[0]; until = result.get("banned_until")
        result["is_banned"] = bool(result.get("banned_at")) and (not until or datetime.fromisoformat(until.replace("Z", "+00:00")) > datetime.now(timezone.utc))
        return result

    def upsert_book_rating(self, user_id: str, book_id: str, rating: int, access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/book_ratings", token=access_token, params={"on_conflict": "user_id,book_id"},
            json_body={"user_id": user_id, "book_id": book_id, "rating": rating, "updated_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        if not rows: raise SupabaseRequestError("Puan kaydedilemedi.", 409)
        return rows[0]

    def delete_book_rating(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/book_ratings", token=access_token,
                      params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"})

    def _book_community_legacy(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        books = self._request("GET", "/rest/v1/books", params={"select": "rating_count,rating_average,popularity_score", "id": f"eq.{book_id}", "limit": 1}).json()
        if not books: raise KeyError("Kitap bulunamadı.")
        own = self._request("GET", "/rest/v1/book_ratings", token=access_token,
                            params={"select": "rating", "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}", "limit": 1}).json()
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token,
            params={"select": "id,user_id,book_id,content,contains_spoiler,status,created_at,updated_at", "book_id": f"eq.{book_id}", "order": "created_at.desc", "limit": 200}).json()
        author_ids = sorted({row["user_id"] for row in comments}); profiles = {}
        if author_ids:
            profile_rows = self._request("GET", "/rest/v1/profiles", admin=True,
                params={"select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(author_ids)})"}).json()
            profiles = {row["id"]: {key: row.get(key) for key in ("display_name", "is_verified", "verification_label")} for row in profile_rows}
        public_comments = [{key: row[key] for key in ("id", "book_id", "content", "contains_spoiler", "status", "created_at", "updated_at")} |
                           {"is_mine": row["user_id"] == user_id, "author": profiles.get(row["user_id"], {"display_name": "Okur", "is_verified": False, "verification_label": None})}
                           for row in comments]
        return {**books[0], "rating_average": float(books[0].get("rating_average") or 0),
                "popularity_score": float(books[0].get("popularity_score") or 0),
                "own_rating": own[0]["rating"] if own else None, "comments": public_comments}

    def _create_book_comment_legacy(self, user_id: str, book_id: str, content: str, contains_spoiler: bool, access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/book_comments", token=access_token,
            json_body={"user_id": user_id, "book_id": book_id, "content": content.strip(), "contains_spoiler": contains_spoiler},
            extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]

    def update_book_comment(self, user_id: str, comment_id: str, changes: dict, access_token: str | None = None) -> dict:
        payload = {key: value for key, value in changes.items() if key in {"content", "contains_spoiler"}}
        if not payload: raise ValueError("Değiştirilecek alan yok.")
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        rows = self._request("PATCH", "/rest/v1/book_comments", token=access_token,
            params={"id": f"eq.{comment_id}", "user_id": f"eq.{user_id}"}, json_body=payload,
            extra_headers={"Prefer": "return=representation"}).json()
        if not rows: raise KeyError("Yorum bulunamadı.")
        return rows[0]

    def delete_book_comment(self, user_id: str, comment_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/book_comments", token=access_token, params={"id": f"eq.{comment_id}", "user_id": f"eq.{user_id}"})

    # Extended community projection. This later definition intentionally keeps
    # the repository contract backward compatible while adding social metadata.
    def book_community(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        books = self._request("GET", "/rest/v1/books", params={
            "select": "rating_count,rating_average,popularity_score", "id": f"eq.{book_id}", "limit": 1}).json()
        if not books:
            raise KeyError("Kitap bulunamadı.")
        own = self._request("GET", "/rest/v1/book_ratings", token=access_token, params={
            "select": "rating", "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}", "limit": 1}).json()
        ratings = self._request("GET", "/rest/v1/book_ratings", token=access_token,
                                params={"select": "rating", "book_id": f"eq.{book_id}", "limit": 5000}).json()
        distribution = {str(value): sum(row["rating"] == value for row in ratings) for value in range(1, 6)}
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id,parent_comment_id,content,contains_spoiler,status,created_at,updated_at",
            "book_id": f"eq.{book_id}", "order": "created_at.desc", "limit": 200}).json()
        author_ids = sorted({row["user_id"] for row in comments})
        profiles = {}
        if author_ids:
            rows = self._request("GET", "/rest/v1/profiles", admin=True, params={
                "select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(author_ids)})"}).json()
            profiles = {row["id"]: {"display_name": row["display_name"],
                        "is_verified": row.get("is_verified", False), "verification_label": row.get("verification_label")} for row in rows}
        comment_ids = [row["id"] for row in comments]
        votes = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token, params={
            "select": "user_id,comment_id", "comment_id": f"in.({','.join(comment_ids)})", "limit": 5000}).json() if comment_ids else []
        followed = self._request("GET", "/rest/v1/user_follows", token=access_token, params={
            "select": "followed_id", "follower_id": f"eq.{user_id}", "limit": 5000}).json()
        followed_ids = {row["followed_id"] for row in followed}
        projected = []
        for row in comments:
            projected.append({
                **{key: row.get(key) for key in ("id", "book_id", "parent_comment_id", "content", "contains_spoiler", "status", "created_at", "updated_at")},
                "is_mine": row["user_id"] == user_id, "author_id": row["user_id"],
                "helpful_count": sum(v["comment_id"] == row["id"] for v in votes),
                "own_helpful": any(v["comment_id"] == row["id"] and v["user_id"] == user_id for v in votes),
                "following_author": row["user_id"] in followed_ids,
                "author": profiles.get(row["user_id"], {"display_name": "Okur", "is_verified": False, "verification_label": None}),
            })
        return {**books[0], "rating_average": float(books[0].get("rating_average") or 0),
                "popularity_score": float(books[0].get("popularity_score") or 0),
                "own_rating": own[0]["rating"] if own else None,
                "rating_distribution": distribution, "comments": projected}

    def create_book_comment(self, user_id: str, book_id: str, content: str, contains_spoiler: bool,
                            access_token: str | None = None, parent_comment_id: str | None = None) -> dict:
        parent = None
        if parent_comment_id:
            rows = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
                "select": "id,user_id,book_id", "id": f"eq.{parent_comment_id}", "limit": 1}).json()
            parent = rows[0] if rows else None
            if not parent or parent["book_id"] != book_id:
                raise ValueError("Yanıt verilen yorum bu kitaba ait değil.")
        rows = self._request("POST", "/rest/v1/book_comments", token=access_token,
            json_body={"user_id": user_id, "book_id": book_id, "parent_comment_id": parent_comment_id,
                       "content": content.strip(), "contains_spoiler": contains_spoiler},
            extra_headers={"Prefer": "return=representation"}).json()
        created = rows[0]
        if parent and parent["user_id"] != user_id:
            self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                "user_id": parent["user_id"], "kind": "comment_reply", "book_id": book_id,
                "title": "Yorumuna yanıt geldi", "body": "Bir okur kitap yorumuna yanıt verdi.",
                "payload": {"comment_id": created["id"], "parent_comment_id": parent_comment_id}},
                extra_headers={"Prefer": "return=minimal"})
        return created

    def set_comment_helpful(self, user_id: str, comment_id: str, helpful: bool,
                            access_token: str | None = None) -> dict:
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id", "id": f"eq.{comment_id}", "limit": 1}).json()
        if not comments:
            raise KeyError("Yorum bulunamadı.")
        comment = comments[0]
        if helpful:
            before = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token, params={
                "select": "comment_id", "user_id": f"eq.{user_id}", "comment_id": f"eq.{comment_id}", "limit": 1}).json()
            self._request("POST", "/rest/v1/comment_helpful_votes", token=access_token,
                params={"on_conflict": "user_id,comment_id"},
                json_body={"user_id": user_id, "comment_id": comment_id},
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
            if not before and comment["user_id"] != user_id:
                self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                    "user_id": comment["user_id"], "kind": "comment_helpful", "book_id": comment["book_id"],
                    "title": "Yorumun faydalı bulundu", "body": "Bir okur yorumunu faydalı olarak işaretledi.",
                    "payload": {"comment_id": comment_id}}, extra_headers={"Prefer": "return=minimal"})
        else:
            self._request("DELETE", "/rest/v1/comment_helpful_votes", token=access_token,
                          params={"user_id": f"eq.{user_id}", "comment_id": f"eq.{comment_id}"})
        rows = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token,
                             params={"select": "comment_id", "comment_id": f"eq.{comment_id}", "limit": 5000}).json()
        return {"comment_id": comment_id, "helpful": helpful, "helpful_count": len(rows)}

    def report_comment(self, user_id: str, comment_id: str, reason: str, details: str | None,
                       access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/comment_reports", token=access_token,
            params={"on_conflict": "user_id,comment_id"},
            json_body={"user_id": user_id, "comment_id": comment_id, "reason": reason,
                       "details": (details or "").strip() or None, "status": "open"},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]

    def set_follow(self, follower_id: str, followed_id: str, following: bool,
                   access_token: str | None = None) -> dict:
        if follower_id == followed_id:
            raise ValueError("Kendini takip edemezsin.")
        if following:
            before = self._request("GET", "/rest/v1/user_follows", token=access_token, params={
                "select": "followed_id", "follower_id": f"eq.{follower_id}", "followed_id": f"eq.{followed_id}", "limit": 1}).json()
            self._request("POST", "/rest/v1/user_follows", token=access_token,
                params={"on_conflict": "follower_id,followed_id"}, json_body={"follower_id": follower_id, "followed_id": followed_id},
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
            if not before:
                self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                    "user_id": followed_id, "kind": "new_follower", "title": "Yeni bir takipçin var",
                    "body": "Bir Mihenk okuru seni takip etmeye başladı.", "payload": {"follower_id": follower_id}},
                    extra_headers={"Prefer": "return=minimal"})
        else:
            self._request("DELETE", "/rest/v1/user_follows", token=access_token,
                          params={"follower_id": f"eq.{follower_id}", "followed_id": f"eq.{followed_id}"})
        return {"user_id": followed_id, "following": following}

    def community_feed(self, user_id: str, limit: int = 40, access_token: str | None = None) -> list[dict]:
        follows = self._request("GET", "/rest/v1/user_follows", token=access_token,
            params={"select": "followed_id", "follower_id": f"eq.{user_id}", "limit": 5000}).json()
        ids = [row["followed_id"] for row in follows]
        if not ids:
            return []
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id,parent_comment_id,content,contains_spoiler,created_at,book:books(title,author,cover_url)",
            "user_id": f"in.({','.join(ids)})", "status": "eq.published", "order": "created_at.desc", "limit": limit}).json()
        profiles = self._request("GET", "/rest/v1/profiles", admin=True, params={
            "select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(ids)})"}).json()
        by_id = {row["id"]: row for row in profiles}
        return [{**{key: row.get(key) for key in ("id", "book_id", "parent_comment_id", "content", "contains_spoiler", "created_at")},
                 "author_id": row["user_id"], **by_id.get(row["user_id"], {}),
                 "book_title": row["book"]["title"], "book_author": row["book"]["author"], "cover_url": row["book"].get("cover_url")}
                for row in comments]

    def admin_comment_reports(self, status: str | None = None, limit: int = 100,
                              access_token: str | None = None) -> list[dict]:
        params = {"select": "*,comment:book_comments(content,book_id)", "order": "created_at.desc", "limit": limit}
        if status:
            params["status"] = f"eq.{status}"
        return self._request("GET", "/rest/v1/comment_reports", admin=True, params=params).json()

    def resolve_comment_report(self, report_id: int, status: str, moderator_id: str,
                               comment_status: str | None = None, access_token: str | None = None) -> dict:
        rows = self._request("PATCH", "/rest/v1/comment_reports", admin=True, params={"id": f"eq.{report_id}"},
            json_body={"status": status, "moderator_id": moderator_id,
                       "resolved_at": datetime.now(timezone.utc).isoformat() if status in {"resolved", "dismissed"} else None},
            extra_headers={"Prefer": "return=representation"}).json()
        if not rows:
            raise KeyError("Şikâyet bulunamadı.")
        if comment_status:
            self._request("PATCH", "/rest/v1/book_comments", admin=True,
                params={"id": f"eq.{rows[0]['comment_id']}"}, json_body={"status": comment_status},
                extra_headers={"Prefer": "return=minimal"})
        return {**rows[0], "comment_status": comment_status}

    def admin_users(self, query: str | None = None, limit: int = 100, access_token: str | None = None) -> list[dict]:
        params = {"select": "id,display_name,app_role,is_verified,verification_label,banned_at,banned_until,ban_reason,created_at", "order": "created_at.desc", "limit": limit}
        if query: params["display_name"] = f"ilike.*{self._search_phrase(query)}*"
        rows = self._request("GET", "/rest/v1/profiles", admin=True, params=params).json(); now = datetime.now(timezone.utc)
        for row in rows:
            until = row.get("banned_until"); row["is_banned"] = bool(row.get("banned_at")) and (not until or datetime.fromisoformat(until.replace("Z", "+00:00")) > now)
        return rows

    def admin_set_verification(self, user_id: str, verified: bool, label: str | None, actor_id: str, access_token: str | None = None) -> dict:
        payload = {"is_verified": verified, "verification_label": label.strip() if verified and label else None,
                   "verified_at": datetime.now(timezone.utc).isoformat() if verified else None, "verified_by": actor_id if verified else None}
        rows = self._request("PATCH", "/rest/v1/profiles", admin=True, params={"id": f"eq.{user_id}"}, json_body=payload,
                             extra_headers={"Prefer": "return=representation"}).json()
        if not rows: raise KeyError("Kullanıcı bulunamadı.")
        return {"user_id": user_id, **payload}

    def admin_set_ban(self, user_id: str, banned: bool, reason: str | None, duration_days: int | None, actor_id: str, access_token: str | None = None) -> dict:
        if user_id == actor_id and banned: raise ValueError("Kendi hesabınızı banlayamazsınız.")
        now = datetime.now(timezone.utc); until = (now + timedelta(days=duration_days)).isoformat() if banned and duration_days else None
        payload = {"banned_at": now.isoformat() if banned else None, "banned_until": until, "banned_by": actor_id if banned else None,
                   "ban_reason": reason.strip() if banned and reason else None}
        rows = self._request("PATCH", "/rest/v1/profiles", admin=True, params={"id": f"eq.{user_id}"}, json_body=payload,
                             extra_headers={"Prefer": "return=representation"}).json()
        if not rows: raise KeyError("Kullanıcı bulunamadı.")
        return {"user_id": user_id, "is_banned": banned, **payload}

    def moderate_comment(self, comment_id: str, status: str, access_token: str | None = None) -> dict:
        rows = self._request("PATCH", "/rest/v1/book_comments", admin=True, params={"id": f"eq.{comment_id}"},
            json_body={"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}, extra_headers={"Prefer": "return=representation"}).json()
        if not rows: raise KeyError("Yorum bulunamadı.")
        return {"comment_id": comment_id, "status": status}

    def application_event(self, level: str, event_type: str, request_id: str | None = None, route: str | None = None,
                          status_code: int | None = None, duration_ms: float | None = None, details: dict | None = None) -> None:
        self._request("POST", "/rest/v1/application_events", admin=True,
            json_body={"level": level, "event_type": event_type, "request_id": request_id, "route": route, "status_code": status_code,
                       "duration_ms": duration_ms, "details": details or {}}, extra_headers={"Prefer": "return=minimal"})

    def admin_system_logs(self, limit: int = 200, level: str | None = None, access_token: str | None = None) -> list[dict]:
        params = {"select": "*", "order": "created_at.desc", "limit": limit}
        if level: params["level"] = f"eq.{level}"
        return self._request("GET", "/rest/v1/application_events", admin=True, params=params).json()

    def admin_dashboard(self, access_token: str | None = None) -> dict:
        payload = self._request(
            "POST",
            "/rest/v1/rpc/admin_dashboard_stats",
            admin=True,
            json_body={},
        ).json()
        if not isinstance(payload, dict):
            raise SupabaseRequestError("Yönetim paneli özeti alınamadı.", 502)
        return payload

    def create_user(self, display_name: str) -> dict:
        raise SupabaseRequestError("Kullanıcılar Supabase Auth kayıt akışıyla oluşturulmalıdır.", 400)

    # Product growth -----------------------------------------------------
    def onboarding_profile(self, user_id: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/onboarding_profiles", admin=True,
                             params={"user_id": f"eq.{user_id}", "select": "*", "limit": 1}).json()
        if not rows:
            return {"user_id": user_id, "liked_book_ids": [], "liked_authors": [], "onboarding_completed": False}
        return rows[0]

    def upsert_onboarding_profile(self, user_id: str, liked_book_ids: list[str], liked_authors: list[str],
                                  completed: bool, access_token: str | None = None) -> dict:
        valid_ids: list[str] = []
        if liked_book_ids:
            valid_ids = [row["id"] for row in self._request(
                "GET", "/rest/v1/books", admin=True,
                params={"id": f"in.({','.join(liked_book_ids)})", "select": "id"},
            ).json()]
        now = datetime.now(timezone.utc).isoformat()
        payload = {"user_id": user_id, "liked_book_ids": valid_ids, "liked_authors": liked_authors[:20],
                   "onboarding_completed": completed, "completed_at": now if completed else None, "updated_at": now}
        rows = self._request("POST", "/rest/v1/onboarding_profiles", admin=True, params={"on_conflict": "user_id"},
                             json_body=payload, extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]

    def import_library_records(self, user_id: str, records: list[dict], access_token: str | None = None) -> dict:
        imported = matched = custom = 0
        errors: list[str] = []
        for record in records:
            try:
                book_id = None
                if record.get("isbn"):
                    rows = self._request("GET", "/rest/v1/editions", admin=True,
                                         params={"isbn": f"eq.{record['isbn']}", "select": "book_id", "limit": 1}).json()
                    book_id = rows[0].get("book_id") if rows else None
                if not book_id:
                    rows = self._request("GET", "/rest/v1/books", admin=True,
                                         params={"title": f"ilike.{record['title']}", "author": f"ilike.{record['author']}",
                                                 "select": "id", "limit": 1}).json()
                    book_id = rows[0]["id"] if rows else None
                if book_id:
                    self.upsert_library_entry(user_id, book_id, record["shelf"], False, access_token=access_token)
                    matched += 1
                else:
                    self.save_custom_book(user_id, title=record["title"], author=record["author"], genre="Genel",
                                          cover_url=None, shelf=record["shelf"], is_favorite=False, access_token=access_token)
                    custom += 1
                imported += 1
            except Exception as error:
                errors.append(f"{record.get('title', 'Kayıt')}: {error}")
        return {"processed": len(records), "imported": imported, "catalog_matches": matched,
                "custom_books": custom, "errors": errors[:30]}

    def log_recommendation_interaction(self, user_id: str | None, payload: dict,
                                       access_token: str | None = None) -> dict:
        row = {"recommendation_id": payload["recommendation_id"], "user_id": user_id,
               "book_id": payload.get("book_id"), "event_type": payload["event_type"], "position": payload.get("position"),
               "experiment_variant": payload["experiment_variant"], "query_text": payload.get("query_text"),
               "metadata": payload.get("metadata") or {}}
        rows = self._request("POST", "/rest/v1/recommendation_interactions", admin=True, json_body=row,
                             extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]

    def recommendation_funnel(self, days: int = 30, access_token: str | None = None) -> dict:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = self._request("GET", "/rest/v1/recommendation_interactions", admin=True,
                             params={"created_at": f"gte.{since}", "select": "experiment_variant,event_type"}).json()
        return {"days": days, "variants": funnel_metrics(rows)}

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

    def weekly_summary(self, user_id: str, access_token: str | None = None) -> dict:
        start, end = weekly_window()
        sessions = self._request("GET", "/rest/v1/reading_sessions", admin=True,
                                 params={"user_id": f"eq.{user_id}", "session_date": f"gte.{start}",
                                         "select": "start_page,end_page,duration_minutes,session_date"}).json()
        finished = self._request("GET", "/rest/v1/user_books", admin=True,
                                 params={"user_id": f"eq.{user_id}", "shelf": "eq.read", "finished_at": f"gte.{start}T00:00:00Z",
                                         "select": "book_id"}).json()
        owned = self._request("GET", "/rest/v1/user_books", admin=True,
                              params={"user_id": f"eq.{user_id}", "select": "book_id"}).json()
        owned_ids = [row["book_id"] for row in owned]
        params = {"is_recommendable": "eq.true", "select": self.BOOK_COLUMNS, "order": "quality_score.desc,popularity_score.desc", "limit": 5}
        if owned_ids:
            params["id"] = f"not.in.({','.join(owned_ids)})"
        picks = [self._book(row) for row in self._request("GET", "/rest/v1/books", admin=True, params=params).json()]
        return {"start_date": start, "end_date": end,
                "minutes_read": sum(row["duration_minutes"] for row in sessions),
                "pages_read": sum(row["end_page"] - row["start_page"] for row in sessions),
                "sessions": len(sessions), "books_finished": len(finished), "recommendations": picks}

    def create_reading_list(self, user_id: str, title: str, description: str, visibility: str,
                            access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/reading_lists", admin=True,
                             json_body={"owner_id": user_id, "title": title, "description": description, "visibility": visibility},
                             extra_headers={"Prefer": "return=representation"}).json()
        return {**rows[0], "items": []}

    def list_reading_lists(self, user_id: str, access_token: str | None = None) -> list[dict]:
        rows = self._request("GET", "/rest/v1/reading_lists", admin=True,
                             params={"owner_id": f"eq.{user_id}", "select": "*,reading_list_items(count)", "order": "updated_at.desc"}).json()
        result = []
        for row in rows:
            counts = row.pop("reading_list_items", []) or []
            result.append({**row, "item_count": counts[0].get("count", 0) if counts else 0})
        return result

    def upsert_reading_list_item(self, user_id: str, list_id: str, book_id: str, note: str, position: int,
                                 access_token: str | None = None) -> dict:
        owned = self._request("GET", "/rest/v1/reading_lists", admin=True,
                              params={"id": f"eq.{list_id}", "owner_id": f"eq.{user_id}", "select": "id", "limit": 1}).json()
        if not owned:
            raise KeyError("Okuma listesi bulunamadı.")
        self._request("POST", "/rest/v1/reading_list_items", admin=True,
                      params={"on_conflict": "list_id,book_id"},
                      json_body={"list_id": list_id, "book_id": book_id, "note": note, "position": position},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.reading_list_detail(list_id, user_id=user_id)

    def reading_list_detail(self, list_id: str | None = None, *, user_id: str | None = None,
                            share_token: str | None = None, access_token: str | None = None) -> dict:
        params: dict[str, Any] = {"select": "*,reading_list_items(note,position,added_at,books(*))", "limit": 1}
        if share_token:
            params.update({"share_token": f"eq.{share_token}", "visibility": "neq.private"})
        else:
            params.update({"id": f"eq.{list_id}", "owner_id": f"eq.{user_id}"})
        rows = self._request("GET", "/rest/v1/reading_lists", admin=True, params=params).json()
        if not rows:
            raise KeyError("Okuma listesi bulunamadı.")
        row = rows[0]
        nested_items = row.pop("reading_list_items", []) or []
        items = []
        for item in nested_items:
            book = item.pop("books", None)
            if book:
                items.append({**item, "book": self._book(book)})
        return {**row, "items": items}

    def create_book_club(self, user_id: str, name: str, description: str, visibility: str,
                         rules: str = "", access_token: str | None = None) -> dict:
        try:
            club = self._request("POST", "/rest/v1/book_clubs", admin=True,
                                 json_body={"owner_id": user_id, "name": name, "description": description, "rules": rules, "visibility": visibility},
                                 extra_headers={"Prefer": "return=representation"}).json()[0]
        except Exception:
            club = self._request("POST", "/rest/v1/book_clubs", admin=True,
                                 json_body={"owner_id": user_id, "name": name, "description": description, "visibility": visibility},
                                 extra_headers={"Prefer": "return=representation"}).json()[0]
        self._request("POST", "/rest/v1/book_club_members", admin=True,
                      json_body={"club_id": club["id"], "user_id": user_id, "role": "owner"},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club["id"])

    def update_book_club(self, user_id: str, club_id: str, values: dict,
                         access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Kulüp ayarlarını yalnızca yönetici düzenleyebilir.")
        self._request("PATCH", "/rest/v1/book_clubs", admin=True,
                      params={"id": f"eq.{club_id}"},
                      json_body={**values, "updated_at": datetime.now(timezone.utc).isoformat()},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def update_book_club_member_role(self, user_id: str, club_id: str, target_user_id: str, role: str,
                                     access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] != "owner":
            raise PermissionError("Yalnızca kulüp sahibi üye rollerini değiştirebilir.")
        if user_id == target_user_id and role != "owner":
            raise ValueError("Kulüp sahibi kendi rolünü düşüremez.")
        self._request("PATCH", "/rest/v1/book_club_members", admin=True,
                      params={"club_id": f"eq.{club_id}", "user_id": f"eq.{target_user_id}"},
                      json_body={"role": role},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def join_book_club(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/book_clubs", admin=True,
                             params={"invite_code": f"eq.{invite_code}", "select": "id", "limit": 1}).json()
        if not rows:
            raise KeyError("Davet kodu geçersiz.")
        self._request("POST", "/rest/v1/book_club_members", admin=True,
                      params={"on_conflict": "club_id,user_id"},
                      json_body={"club_id": rows[0]["id"], "user_id": user_id, "role": "member"},
                      extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
        return self.book_club_detail(user_id, rows[0]["id"])

    def list_book_clubs(self, user_id: str, access_token: str | None = None) -> list[dict]:
        memberships = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                    params={"user_id": f"eq.{user_id}", "select": "role,book_clubs(*)", "order": "joined_at.desc"}).json()
        return [{**row.get("book_clubs", {}), "role": row["role"]} for row in memberships]

    def join_reading(self, user_id: str, club_id: str, book_id: str, daily_target_pages: int = 10,
                     shelf: str = "reading", access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise KeyError("Kulüp üyeliği gerekiyor.")
        books = self._request("GET", "/rest/v1/books", admin=True, params={"id": f"eq.{book_id}", "select": "page_count", "limit": 1}).json()
        total_pages = books[0]["page_count"] if books else None
        self._request("POST", "/rest/v1/user_books", admin=True,
                      params={"on_conflict": "user_id,book_id"},
                      json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                 "current_page": 0, "total_pages": total_pages, "started_at": today, "updated_at": now},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        try:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": 0, "total_pages": total_pages, "daily_target_pages": max(1, daily_target_pages), "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": 0, "total_pages": total_pages, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def upsert_book_club_progress(self, user_id: str, club_id: str, values: dict,
                                  access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise KeyError("Kitap kulübü bulunamadı.")
        now = datetime.now(timezone.utc).isoformat()
        book_id = values["book_id"]
        current_page = values["current_page"]
        total_pages = values.get("total_pages")
        daily_target = values.get("daily_target_pages", 10)
        try:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": current_page, "total_pages": total_pages,
                                     "daily_target_pages": daily_target or 10, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": current_page, "total_pages": total_pages, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
        finished_at = now if shelf == "read" else None
        self._request("POST", "/rest/v1/user_books", admin=True,
                      params={"on_conflict": "user_id,book_id"},
                      json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                 "current_page": current_page, "total_pages": total_pages,
                                 "finished_at": finished_at, "updated_at": now},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def create_book_club_discussion(self, user_id: str, club_id: str, values: dict,
                                    access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        progress = self._request("GET", "/rest/v1/book_club_progress", admin=True,
                                 params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}",
                                         "book_id": f"eq.{values['book_id']}", "select": "current_page", "limit": 1}).json()
        curr = progress[0]["current_page"] if progress else 0
        if values.get("page_number") and values["page_number"] > curr:
            raise PermissionError("Henüz ulaşmadığın sayfa için tartışma açamazsın.")
        try:
            self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                          json_body={"club_id": club_id, "user_id": user_id, **values},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": values["book_id"],
                                     "content": values["content"], "page_number": values.get("page_number")},
                          extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def toggle_book_club_reaction(self, user_id: str, club_id: str, discussion_id: str, reaction_type: str,
                                  access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        try:
            existing = self._request("GET", "/rest/v1/book_club_reactions", admin=True,
                                    params={"discussion_id": f"eq.{discussion_id}", "user_id": f"eq.{user_id}",
                                            "reaction_type": f"eq.{reaction_type}", "select": "id", "limit": 1}).json()
            if existing:
                self._request("DELETE", "/rest/v1/book_club_reactions", admin=True, params={"id": f"eq.{existing[0]['id']}"})
            else:
                self._request("POST", "/rest/v1/book_club_reactions", admin=True,
                              json_body={"discussion_id": discussion_id, "user_id": user_id, "reaction_type": reaction_type},
                              extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)

    def create_book_club_event(self, user_id: str, club_id: str, values: dict,
                               access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Etkinlikleri yalnızca kulüp yöneticisi oluşturabilir.")
        try:
            event = self._request("POST", "/rest/v1/book_club_events", admin=True,
                                  json_body={"club_id": club_id, "created_by": user_id, **values},
                                  extra_headers={"Prefer": "return=representation"}).json()[0]
            self._request("POST", "/rest/v1/book_club_event_rsvps", admin=True,
                          json_body={"event_id": event["id"], "user_id": user_id, "status": "attending"},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)

    def rsvp_book_club_event(self, user_id: str, club_id: str, event_id: str, status: str,
                             access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        try:
            self._request("POST", "/rest/v1/book_club_event_rsvps", admin=True,
                          params={"on_conflict": "event_id,user_id"},
                          json_body={"event_id": event_id, "user_id": user_id, "status": status},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)

    def create_book_club_poll(self, user_id: str, club_id: str, title: str, option_book_ids: list[str],
                              access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Oylamayı yalnızca kulüp yöneticisi açabilir.")
        poll = self._request("POST", "/rest/v1/book_club_polls", admin=True,
                             json_body={"club_id": club_id, "title": title, "created_by": user_id},
                             extra_headers={"Prefer": "return=representation"}).json()[0]
        self._request("POST", "/rest/v1/book_club_poll_options", admin=True,
                      json_body=[{"poll_id": poll["id"], "book_id": book_id} for book_id in dict.fromkeys(option_book_ids)],
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def vote_book_club_poll(self, user_id: str, club_id: str, poll_id: str, option_id: str,
                            access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        option = self._request("GET", "/rest/v1/book_club_poll_options", admin=True,
                               params={"id": f"eq.{option_id}", "poll_id": f"eq.{poll_id}",
                                       "select": "id,book_club_polls!inner(club_id,status)", "limit": 1}).json()
        if not membership or not option or option[0]["book_club_polls"]["club_id"] != club_id or option[0]["book_club_polls"]["status"] != "open":
            raise KeyError("Oylama seçeneği bulunamadı.")
        self._request("POST", "/rest/v1/book_club_votes", admin=True,
                      params={"on_conflict": "poll_id,user_id"},
                      json_body={"poll_id": poll_id, "user_id": user_id, "option_id": option_id,
                                 "voted_at": datetime.now(timezone.utc).isoformat()},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def upsert_book_club_read(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Kulüp okumasını yalnızca yönetici düzenleyebilir.")
        self._request("POST", "/rest/v1/book_club_reads", admin=True,
                      params={"on_conflict": "club_id,book_id"}, json_body={"club_id": club_id, **values},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)

    def book_club_detail(self, user_id: str, club_id: str, access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise KeyError("Kitap kulübü bulunamadı.")
        user_role = membership[0]["role"]

        clubs = self._request("GET", "/rest/v1/book_clubs", admin=True,
                              params={"id": f"eq.{club_id}", "select": "*,book_club_reads(*,books(title,author,cover_url,page_count))", "limit": 1}).json()
        club = clubs[0]
        nested_reads = club.pop("book_club_reads", []) or []
        reads = []
        active_read = None
        for item in nested_reads:
            book = item.pop("books", None) or {}
            rd = {**item, **book}
            reads.append(rd)
            if not active_read and rd.get("status") == "reading":
                active_read = rd
        if not active_read and reads:
            active_read = reads[0]

        # Members list
        members_data = self._safe_request_json("GET", "/rest/v1/book_club_members", default=[], admin=True,
                                               params={"club_id": f"eq.{club_id}", "select": "user_id,role,joined_at", "order": "joined_at.asc"})
        member_user_ids = list({m.get("user_id") for m in members_data if m.get("user_id")})
        member_profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                                  params={"id": f"in.({','.join(member_user_ids)})", "select": "id,display_name"}) if member_user_ids else []
        member_names = {p["id"]: p.get("display_name", "Okur") for p in member_profiles if "id" in p}
        members = [{
            "user_id": m.get("user_id", user_id),
            "role": m.get("role", "member"),
            "joined_at": m.get("joined_at", ""),
            "display_name": member_names.get(m.get("user_id", user_id), "Okur"),
        } for m in members_data]

        progress = self._safe_request_json("GET", "/rest/v1/book_club_progress", default=[], admin=True,
                                           params={"club_id": f"eq.{club_id}", "select": "*"})
        user_progress_map = {row["book_id"]: row for row in progress if row.get("user_id") == user_id}

        # Joint progress and user progress with milestones
        user_books_data = self._safe_request_json("GET", "/rest/v1/user_books", default=[], admin=True,
                                                  params={"user_id": f"eq.{user_id}", "select": "book_id"})
        in_library_set = {b["book_id"] for b in user_books_data if "book_id" in b}

        user_progress_list = []
        for rd in reads:
            b_id = rd["book_id"]
            # Joint progress
            b_progress = [p for p in progress if p.get("book_id") == b_id]
            if b_progress:
                percents = [min(100.0, (row["current_page"] / (row["total_pages"] or rd.get("page_count") or 100)) * 100)
                            for row in b_progress if (row.get("total_pages") or rd.get("page_count"))]
                rd["joint_progress_percent"] = round(sum(percents) / len(percents), 1) if percents else 0
                rd["active_readers_count"] = len(b_progress)
            else:
                rd["joint_progress_percent"] = 0
                rd["active_readers_count"] = 0

            p = user_progress_map.get(b_id, {
                "club_id": club_id, "user_id": user_id, "book_id": b_id,
                "current_page": 0, "total_pages": rd.get("page_count"), "daily_target_pages": 10
            })
            total = p.get("total_pages") or rd.get("page_count") or 200
            curr = p.get("current_page", 0)
            daily = max(1, p.get("daily_target_pages") or 10)
            pct = min(100.0, round((curr / total) * 100, 1)) if total else 0
            pages_left = max(0, total - curr)
            days_left = max(1, (pages_left + daily - 1) // daily) if pages_left > 0 else 0
            finish_date = (date.today() + timedelta(days=days_left)).isoformat() if pages_left > 0 else date.today().isoformat()
            milestones = [
                {"percent": 25, "page": round(total * 0.25), "title": "Giriş ve Karakterler", "reached": curr >= round(total * 0.25)},
                {"percent": 50, "page": round(total * 0.50), "title": "Ara Değerlendirme", "reached": curr >= round(total * 0.50)},
                {"percent": 75, "page": round(total * 0.75), "title": "Düğüm ve Çatışma", "reached": curr >= round(total * 0.75)},
                {"percent": 100, "page": total, "title": "Final ve Kapanış", "reached": curr >= total},
            ]
            user_progress_list.append({
                **p, "percent": pct, "total_pages": total, "daily_target_pages": daily,
                "days_left": days_left, "projected_finish_date": finish_date,
                "milestones": milestones, "in_library": b_id in in_library_set,
            })

        # Discussions & Reactions
        discussions = self._safe_request_json("GET", "/rest/v1/book_club_discussions", default=[], admin=True,
                                              params={"club_id": f"eq.{club_id}", "select": "*",
                                                      "order": "created_at.desc", "limit": 100})
        reactions = self._safe_request_json("GET", "/rest/v1/book_club_reactions", default=[], admin=True,
                                            params={"select": "discussion_id,user_id,reaction_type"})
        reactions_by_disc = {}
        user_reactions_by_disc = {}
        for rx in reactions:
            d_id = rx.get("discussion_id")
            r_type = rx.get("reaction_type")
            if not d_id or not r_type:
                continue
            reactions_by_disc.setdefault(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
            if r_type in reactions_by_disc[d_id]:
                reactions_by_disc[d_id][r_type] += 1
            if rx.get("user_id") == user_id:
                user_reactions_by_disc.setdefault(d_id, []).append(r_type)

        user_ids = list({item["user_id"] for item in discussions if "user_id" in item})
        book_ids = list({item["book_id"] for item in discussions if "book_id" in item})
        profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                           params={"id": f"in.({','.join(user_ids)})", "select": "id,display_name"}) if user_ids else []
        discussion_books = self._safe_request_json("GET", "/rest/v1/books", default=[], admin=True,
                                                   params={"id": f"in.({','.join(book_ids)})", "select": "id,title"}) if book_ids else []
        names = {item["id"]: item.get("display_name", "Okur") for item in profiles if "id" in item}
        titles = {item["id"]: item.get("title", "Kitap") for item in discussion_books if "id" in item}
        user_curr_pages = {p["book_id"]: p.get("current_page", 0) for p in user_progress_list}

        discussions_list = []
        upcoming_spoilers = 0
        for item in discussions:
            d_id = item["id"]
            b_id = item["book_id"]
            p_num = item.get("page_number")
            user_page = user_curr_pages.get(b_id, 0)
            is_locked = bool(p_num and p_num > user_page and user_role not in {"owner", "moderator"})
            if is_locked:
                upcoming_spoilers += 1
                discussions_list.append({
                    "id": d_id, "club_id": club_id, "book_id": b_id, "book_title": titles.get(b_id, "Kitap"),
                    "page_number": p_num, "chapter_title": item.get("chapter_title"),
                    "discussion_type": item.get("discussion_type", "discussion"),
                    "is_spoiler_locked": True, "created_at": item.get("created_at"),
                })
            else:
                discussions_list.append({
                    **item, "display_name": names.get(item.get("user_id"), "Okur"),
                    "book_title": titles.get(b_id, "Kitap"),
                    "is_spoiler_locked": False,
                    "reactions": reactions_by_disc.get(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0}),
                    "user_reactions": user_reactions_by_disc.get(d_id, []),
                })

        # Events
        events_data = self._safe_request_json("GET", "/rest/v1/book_club_events", default=[], admin=True,
                                              params={"club_id": f"eq.{club_id}", "select": "*", "order": "event_date.asc"})
        rsvps_data = self._safe_request_json("GET", "/rest/v1/book_club_event_rsvps", default=[], admin=True, params={"select": "*"})
        events = []
        for ev in events_data:
            ev_id = ev.get("id")
            ev_rsvps = [r for r in rsvps_data if r.get("event_id") == ev_id]
            my_rsvp = next((r["status"] for r in ev_rsvps if r.get("user_id") == user_id), None)
            attending = len([r for r in ev_rsvps if r.get("status") == "attending"])
            maybe = len([r for r in ev_rsvps if r.get("status") == "maybe"])
            declined = len([r for r in ev_rsvps if r.get("status") == "declined"])
            events.append({
                **ev, "rsvp_counts": {"attending": attending, "maybe": maybe, "declined": declined},
                "user_rsvp": my_rsvp,
            })

        # Polls
        polls = self._safe_request_json("GET", "/rest/v1/book_club_polls", default=[], admin=True,
                                        params={"club_id": f"eq.{club_id}", "select": "*,book_club_poll_options(id,book_id,books(title,author,cover_url),book_club_votes(user_id))",
                                                "order": "created_at.desc"})
        poll_items = []
        for poll in polls:
            options = []
            for option in poll.pop("book_club_poll_options", []) or []:
                book, votes = option.pop("books", None) or {}, option.pop("book_club_votes", []) or []
                options.append({**option, **book, "vote_count": len(votes), "selected": any(v["user_id"] == user_id for v in votes)})
            poll_items.append({**poll, "options": options})

        # Badges and stats
        completed_reads_count = len([r for r in reads if r.get("status") == "completed"])
        user_disc_count = len([d for d in discussions if d["user_id"] == user_id])
        user_rx_count = len([rx for rx in reactions if rx["user_id"] == user_id])
        user_is_pioneer = any(m["user_id"] == user_id and (m["role"] == "owner" or idx < 5) for idx, m in enumerate(members))
        user_active_progress = next((p for p in user_progress_list if active_read and p["book_id"] == active_read["book_id"]), None)
        user_has_read_active = bool(user_active_progress and user_active_progress["current_page"] >= 30)
        user_finished_any = bool(user_active_progress and user_active_progress["percent"] >= 100) or completed_reads_count > 0

        badges = []
        if user_is_pioneer:
            badges.append({"code": "club_pioneer", "title": "Kulüp Öncüsü", "description": "Kulübün ilk kurucu veya öncü üyelerinden biri.", "icon": "👑"})
        if user_disc_count >= 3:
            badges.append({"code": "discussion_starter", "title": "Tartışma Ustası", "description": "Kulüpte 3 ve üzeri tartışma/alıntı paylaştı.", "icon": "💬"})
        if user_has_read_active:
            badges.append({"code": "pace_keeper", "title": "Sadık Okur", "description": "Aktif okumada istikrarlı ilerleme kaydetti.", "icon": "🔥"})
        if user_rx_count >= 5:
            badges.append({"code": "thought_spark", "title": "Fikir Lideri", "description": "Tartışma ve alıntıları topluluktan ilgi gördü.", "icon": "✨"})
        if user_finished_any:
            badges.append({"code": "classic_explorer", "title": "Klasik Kaşifi", "description": "Kulüple birlikte bir kitabı başarıyla tamamladı.", "icon": "🏆"})

        return {
            **club,
            "role": user_role,
            "members": members,
            "reads": reads,
            "active_read": active_read,
            "progress": user_progress_list,
            "user_progress": user_progress_list,
            "discussions": discussions_list,
            "upcoming_spoilers_count": upcoming_spoilers,
            "events": events,
            "polls": poll_items,
            "stats": {
                "member_count": len(members),
                "total_discussions": len(discussions),
                "completed_books_count": completed_reads_count,
            },
            "badges": badges,
        }

    def get_or_create_club_room(self, user_id: str, club_id: str, title: str | None = None,
                                book_id: str | None = None, duration_minutes: int = 25,
                                access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        
        rooms = self._safe_request_json("GET", "/rest/v1/book_club_rooms", default=[], admin=True,
                                        params={"club_id": f"eq.{club_id}", "select": "*", "order": "created_at.desc", "limit": 1})
        if rooms:
            room = rooms[0]
        else:
            now = datetime.now(timezone.utc).isoformat()
            room_title = title or "Birlikte Okuyoruz Odası"
            try:
                room = self._request("POST", "/rest/v1/book_club_rooms", admin=True,
                                     json_body={"club_id": club_id, "title": room_title, "book_id": book_id,
                                                "phase": "reading", "duration_minutes": duration_minutes, "created_by": user_id, "created_at": now},
                                     extra_headers={"Prefer": "return=representation"}).json()[0]
            except Exception:
                room = {
                    "id": str(uuid4()), "club_id": club_id, "title": room_title, "book_id": book_id,
                    "phase": "reading", "duration_minutes": duration_minutes, "created_by": user_id, "created_at": now
                }

        # Members and active progress
        members_data = self._safe_request_json("GET", "/rest/v1/book_club_members", default=[], admin=True,
                                               params={"club_id": f"eq.{club_id}", "select": "user_id,role,joined_at", "order": "joined_at.asc"})
        member_ids = [m["user_id"] for m in members_data if "user_id" in m]
        profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                           params={"id": f"in.({','.join(member_ids)})", "select": "id,display_name"}) if member_ids else []
        prof_map = {p["id"]: p.get("display_name", "Okur") for p in profiles if "id" in p}
        
        progress = self._safe_request_json("GET", "/rest/v1/book_club_progress", default=[], admin=True,
                                           params={"club_id": f"eq.{club_id}", "select": "*"})
        prog_map = {p["user_id"]: p for p in progress if "user_id" in p}
        
        participants = []
        for m in members_data:
            u_id = m.get("user_id", "")
            u_prog = prog_map.get(u_id, {})
            participants.append({
                "user_id": u_id,
                "display_name": prof_map.get(u_id, "Okur"),
                "role": m.get("role", "member"),
                "current_page": u_prog.get("current_page", 0),
                "daily_target_pages": u_prog.get("daily_target_pages", 10),
            })

        messages_data = self._safe_request_json("GET", "/rest/v1/book_club_room_messages", default=[], admin=True,
                                                params={"room_id": f"eq.{room.get('id')}", "select": "*", "order": "created_at.asc", "limit": 50}) if room.get("id") else []
        msg_user_ids = list({msg["user_id"] for msg in messages_data if "user_id" in msg})
        msg_profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                               params={"id": f"in.({','.join(msg_user_ids)})", "select": "id,display_name"}) if msg_user_ids else []
        msg_prof_map = {p["id"]: p.get("display_name", "Okur") for p in msg_profiles if "id" in p}
        
        messages = [{
            **msg,
            "display_name": msg_prof_map.get(msg.get("user_id"), "Okur")
        } for msg in messages_data]

        return {
            **room,
            "participants": participants,
            "messages": messages,
        }

    def complete_room_session(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        minutes_read = values.get("minutes_read", 25)
        pages_read = values.get("pages_read", 0)
        book_id = values.get("book_id")
        current_page = values.get("current_page")
        notes = values.get("notes")

        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")

        if book_id and pages_read > 0:
            try:
                self._request("POST", "/rest/v1/reading_activity", admin=True,
                              json_body={"user_id": user_id, "book_id": book_id, "activity_date": today,
                                         "pages_read": pages_read, "created_at": now},
                              extra_headers={"Prefer": "return=minimal"})
            except Exception:
                pass

        if book_id and current_page is not None:
            books = self._safe_request_json("GET", "/rest/v1/books", default=[], admin=True,
                                            params={"id": f"eq.{book_id}", "select": "page_count", "limit": 1})
            total_pages = books[0]["page_count"] if books else None
            shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
            finished_at = now if shelf == "read" else None
            try:
                self._request("POST", "/rest/v1/user_books", admin=True,
                              params={"on_conflict": "user_id,book_id"},
                              json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                         "current_page": current_page, "total_pages": total_pages,
                                         "finished_at": finished_at, "updated_at": now},
                              extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
            except Exception:
                pass
            try:
                self._request("POST", "/rest/v1/book_club_progress", admin=True,
                              params={"on_conflict": "club_id,user_id,book_id"},
                              json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                         "current_page": current_page, "total_pages": total_pages,
                                         "daily_target_pages": 10, "updated_at": now},
                              extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
            except Exception:
                pass

        if notes and notes.strip() and book_id:
            try:
                self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                              json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                         "content": notes.strip(), "page_number": current_page,
                                         "discussion_type": "quote", "created_at": now},
                              extra_headers={"Prefer": "return=minimal"})
            except Exception:
                pass

        return self.get_or_create_club_room(user_id, club_id)

    def send_room_message(self, user_id: str, club_id: str, room_id: str, content: str,
                          access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        now = datetime.now(timezone.utc).isoformat()
        try:
            self._request("POST", "/rest/v1/book_club_room_messages", admin=True,
                          json_body={"room_id": room_id, "user_id": user_id, "content": content.strip(), "created_at": now},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.get_or_create_club_room(user_id, club_id)



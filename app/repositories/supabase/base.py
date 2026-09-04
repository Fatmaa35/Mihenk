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


class SupabaseBase:
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

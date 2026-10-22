"""Öneri geri bildirimi ve huni ölçümleri."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services.reading.product_growth import funnel_metrics
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseRecommendationsMixin:
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


    def log_recommendation_event(self, user_id: str | None, query_text: str, result_count: int,
                                 fallback_used: bool, latency_ms: int, access_token: str | None = None) -> None:
        if not self.secret_key:
            return
        self._request(
            "POST", "/rest/v1/recommendation_events", admin=True,
            json_body={"user_id": user_id, "query_text": query_text, "result_count": result_count,
                       "fallback_used": fallback_used, "latency_ms": latency_ms},
        )

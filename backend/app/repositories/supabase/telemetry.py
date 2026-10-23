"""Uygulama olayları, ürün ölçümleri ve kapalı beta."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseTelemetryMixin:
    def application_event(self, level: str, event_type: str, request_id: str | None = None, route: str | None = None,
                          status_code: int | None = None, duration_ms: float | None = None, details: dict | None = None) -> None:
        self._request("POST", "/rest/v1/application_events", admin=True,
            json_body={"level": level, "event_type": event_type, "request_id": request_id, "route": route, "status_code": status_code,
                       "duration_ms": duration_ms, "details": details or {}}, extra_headers={"Prefer": "return=minimal"})


    def track_product_event(self, user_id: str, event_name: str, properties: dict,
                            access_token: str | None = None) -> dict:
        payload = {"user_id": user_id, "event_name": event_name,
                   "properties": dict(list((properties or {}).items())[:20])}
        try:
            rows = self._request(
                "POST", "/rest/v1/product_events", admin=True, json_body=payload,
                extra_headers={"Prefer": "return=representation"},
            ).json()
            return rows[0]
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise
            self.application_event("info", "product_event", details=payload)
            return {**payload, "occurred_at": datetime.now(timezone.utc).isoformat(), "compatibility_mode": True}


    def create_beta_feedback(self, user_id: str, category: str, rating: int | None,
                             message: str, context: dict, access_token: str | None = None) -> dict:
        payload = {"user_id": user_id, "category": category, "rating": rating,
                   "message": message.strip(), "context": dict(list((context or {}).items())[:20]), "status": "new"}
        try:
            rows = self._request(
                "POST", "/rest/v1/beta_feedback", token=access_token, json_body=payload,
                extra_headers={"Prefer": "return=representation"},
            ).json()
            saved = rows[0]
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise
            saved = {"id": str(uuid4()), **payload, "created_at": datetime.now(timezone.utc).isoformat(),
                     "compatibility_mode": True}
            self.application_event("info", "beta_feedback", details=saved)
        self.track_product_event(user_id, "feedback_submitted", {"category": category}, access_token)
        return saved


    def list_beta_feedback(self, user_id: str, limit: int = 20,
                           access_token: str | None = None) -> list[dict]:
        try:
            return self._request(
                "GET", "/rest/v1/beta_feedback", token=access_token,
                params={"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc", "limit": limit},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise
            rows = self._request(
                "GET", "/rest/v1/application_events", admin=True,
                params={"event_type": "eq.beta_feedback", "select": "details,created_at",
                        "order": "created_at.desc", "limit": 500},
            ).json()
            return [{**row.get("details", {}), "created_at": row.get("created_at")}
                    for row in rows if row.get("details", {}).get("user_id") == user_id][:limit]


    def beta_dashboard(self, days: int = 30, access_token: str | None = None) -> dict:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        try:
            events = self._request(
                "GET", "/rest/v1/product_events", admin=True,
                params={"occurred_at": f"gte.{cutoff}", "select": "user_id,event_name,occurred_at", "limit": 10000},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise
            legacy = self._request(
                "GET", "/rest/v1/application_events", admin=True,
                params={"event_type": "eq.product_event", "created_at": f"gte.{cutoff}",
                        "select": "details,created_at", "limit": 10000},
            ).json()
            events = [{**row.get("details", {}), "occurred_at": row.get("created_at")} for row in legacy]
        try:
            feedback = self._request(
                "GET", "/rest/v1/beta_feedback", admin=True,
                params={"created_at": f"gte.{cutoff}", "select": "id,user_id,category,rating,message,status,created_at", "order": "created_at.desc", "limit": 500},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise
            legacy = self._request(
                "GET", "/rest/v1/application_events", admin=True,
                params={"event_type": "eq.beta_feedback", "created_at": f"gte.{cutoff}",
                        "select": "details,created_at", "order": "created_at.desc", "limit": 500},
            ).json()
            feedback = [{**row.get("details", {}), "created_at": row.get("created_at")} for row in legacy]
        onboarding = self._request(
            "GET", "/rest/v1/onboarding_profiles", admin=True,
            params={"onboarding_completed": "eq.true", "completed_at": f"gte.{cutoff}", "select": "user_id", "limit": 10000},
        ).json()
        counts: dict[str, int] = {}
        for event in events:
            counts[event["event_name"]] = counts.get(event["event_name"], 0) + 1
        ratings = [item["rating"] for item in feedback if item.get("rating") is not None]
        return {"days": days, "active_users": len({item["user_id"] for item in events}),
                "onboarding_completed": len(onboarding), "feedback_count": len(feedback),
                "average_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
                "events": counts, "recent_feedback": feedback[:50]}

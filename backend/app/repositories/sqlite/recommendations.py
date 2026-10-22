"""Öneri geri bildirimi ve huni ölçümleri."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.reading.product_growth import funnel_metrics

class SQLiteRecommendationsMixin:
    def upsert_recommendation_feedback(self, user_id: str, book_id: str, feedback_type: str,
                                       query_text: str | None = None, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
                raise KeyError("Kitap bulunamadı.")
            feedback_id = str(uuid4())
            connection.execute(
                """INSERT INTO recommendation_feedback(id,user_id,book_id,feedback_type,query_text,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,book_id,feedback_type) DO UPDATE SET
                   query_text=excluded.query_text,updated_at=excluded.updated_at""",
                (feedback_id, user_id, book_id, feedback_type, query_text, now, now),
            )
            row = connection.execute(
                "SELECT * FROM recommendation_feedback WHERE user_id=? AND book_id=? AND feedback_type=?",
                (user_id, book_id, feedback_type),
            ).fetchone()
        return dict(row)


    def recommendation_feedback(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(
                "SELECT * FROM recommendation_feedback WHERE user_id=? ORDER BY updated_at DESC", (user_id,)
            )]


    def log_recommendation_event(self, user_id: str | None, query_text: str, result_count: int,
                                 fallback_used: bool, latency_ms: int, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO recommendation_events(id,user_id,query_text,result_count,fallback_used,latency_ms,created_at) VALUES(?,?,?,?,?,?,?)",
                (str(uuid4()), user_id, query_text, result_count, int(fallback_used), latency_ms, datetime.now(timezone.utc).isoformat()),
            )


    def log_recommendation_interaction(self, user_id: str | None, payload: dict,
                                       access_token: str | None = None) -> dict:
        interaction_id = str(uuid4())
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO recommendation_interactions(id,recommendation_id,user_id,book_id,event_type,position,
                   experiment_variant,query_text,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (interaction_id, payload["recommendation_id"], user_id, payload.get("book_id"), payload["event_type"],
                 payload.get("position"), payload["experiment_variant"], payload.get("query_text"),
                 json.dumps(payload.get("metadata") or {}, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
            )
        return {"id": interaction_id, **payload}


    def recommendation_funnel(self, days: int = 30, access_token: str | None = None) -> dict:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        with self.connect() as connection:
            rows = [dict(row) for row in connection.execute(
                "SELECT experiment_variant,event_type FROM recommendation_interactions WHERE created_at>=?", (since,)
            )]
        return {"days": days, "variants": funnel_metrics(rows)}

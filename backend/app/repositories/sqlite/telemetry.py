"""Uygulama olayları, ürün ölçümleri ve kapalı beta."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

class SQLiteTelemetryMixin:
    def application_event(self, level: str, event_type: str, request_id: str | None = None, route: str | None = None,
                          status_code: int | None = None, duration_ms: float | None = None, details: dict | None = None) -> None:
        with self.connect() as connection:
            connection.execute("INSERT INTO application_events(level,event_type,request_id,route,status_code,duration_ms,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
                               (level, event_type, request_id, route, status_code, duration_ms, json.dumps(details or {}, ensure_ascii=False), datetime.now(timezone.utc).isoformat()))


    def track_product_event(self, user_id: str, event_name: str, properties: dict,
                            access_token: str | None = None) -> dict:
        occurred_at = datetime.now(timezone.utc).isoformat()
        safe_properties = dict(list((properties or {}).items())[:20])
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT INTO product_events(user_id,event_name,properties_json,occurred_at) VALUES(?,?,?,?)",
                (user_id, event_name, json.dumps(safe_properties, ensure_ascii=False), occurred_at),
            )
        return {"id": cursor.lastrowid, "user_id": user_id, "event_name": event_name,
                "properties": safe_properties, "occurred_at": occurred_at}


    def create_beta_feedback(self, user_id: str, category: str, rating: int | None,
                             message: str, context: dict, access_token: str | None = None) -> dict:
        feedback_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
        safe_context = dict(list((context or {}).items())[:20])
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO beta_feedback(id,user_id,category,rating,message,context_json,status,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,'new',?,?)""",
                (feedback_id, user_id, category, rating, message.strip(),
                 json.dumps(safe_context, ensure_ascii=False), now, now),
            )
        self.track_product_event(user_id, "feedback_submitted", {"category": category})
        return {"id": feedback_id, "user_id": user_id, "category": category, "rating": rating,
                "message": message.strip(), "context": safe_context, "status": "new", "created_at": now}


    def list_beta_feedback(self, user_id: str, limit: int = 20,
                           access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM beta_feedback WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
        return [{**dict(row), "context": json.loads(row["context_json"] or "{}")} for row in rows]


    def beta_dashboard(self, days: int = 30, access_token: str | None = None) -> dict:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        with self.connect() as connection:
            events = [dict(row) for row in connection.execute(
                "SELECT user_id,event_name,occurred_at FROM product_events WHERE occurred_at>=?", (cutoff,)
            ).fetchall()]
            feedback = [dict(row) for row in connection.execute(
                "SELECT id,user_id,category,rating,message,status,created_at FROM beta_feedback WHERE created_at>=? ORDER BY created_at DESC",
                (cutoff,),
            ).fetchall()]
            completed = connection.execute(
                "SELECT count(*) FROM onboarding_profiles WHERE onboarding_completed=1 AND completed_at>=?", (cutoff,)
            ).fetchone()[0]
        counts: dict[str, int] = {}
        for event in events:
            counts[event["event_name"]] = counts.get(event["event_name"], 0) + 1
        ratings = [item["rating"] for item in feedback if item["rating"] is not None]
        return {"days": days, "active_users": len({item["user_id"] for item in events}),
                "onboarding_completed": completed, "feedback_count": len(feedback),
                "average_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
                "events": counts, "recent_feedback": feedback[:50]}

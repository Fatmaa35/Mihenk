from __future__ import annotations

from app.repositories.supabase.shared import *  # noqa: F403
from app.repositories.supabase.base import SupabaseRequestError


class SupabaseAdminMixin:
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

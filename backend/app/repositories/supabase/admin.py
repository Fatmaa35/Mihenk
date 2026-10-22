"""Yönetim paneli, katalog kalitesi ve moderasyon."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseAdminMixin:
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

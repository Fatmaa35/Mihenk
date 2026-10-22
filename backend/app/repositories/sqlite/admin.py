"""Yönetim paneli, katalog kalitesi ve moderasyon."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

class SQLiteAdminMixin:
    def quality_dashboard(self, access_token: str | None = None) -> dict:
        report = self.catalog_coverage()
        with self.connect() as connection:
            report.update({
                "missing_covers": connection.execute("SELECT count(*) n FROM books WHERE cover_url IS NULL").fetchone()["n"],
                "duplicate_works": connection.execute("SELECT count(*) n FROM (SELECT canonical_work_key FROM books GROUP BY canonical_work_key HAVING count(*)>1)").fetchone()["n"],
                "suspicious_records": connection.execute("SELECT count(*) n FROM books WHERE length(trim(title))<2 OR length(trim(author))<2 OR quality_score<0.48").fetchone()["n"],
                "zero_result_queries": connection.execute("SELECT count(*) n FROM recommendation_events WHERE result_count=0").fetchone()["n"],
                "fallback_rate": round(connection.execute("SELECT coalesce(avg(fallback_used),0) n FROM recommendation_events").fetchone()["n"] * 100, 1),
                "average_latency_ms": round(connection.execute("SELECT coalesce(avg(latency_ms),0) n FROM recommendation_events").fetchone()["n"], 1),
                "feedback": {row["feedback_type"]: row["n"] for row in connection.execute("SELECT feedback_type,count(*) n FROM recommendation_feedback GROUP BY feedback_type")},
            })
        return report


    def list_feature_flags(self, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute("SELECT * FROM feature_flags ORDER BY key")]


    def upsert_feature_flag(self, key: str, description: str, enabled: bool, rollout_percent: int,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute("""INSERT INTO feature_flags(key,description,enabled,rollout_percent,updated_at) VALUES(?,?,?,?,?)
                ON CONFLICT(key) DO UPDATE SET description=excluded.description,enabled=excluded.enabled,rollout_percent=excluded.rollout_percent,updated_at=excluded.updated_at""",
                (key, description, int(enabled), rollout_percent, now))
            return dict(connection.execute("SELECT * FROM feature_flags WHERE key=?", (key,)).fetchone())


    def admin_catalog_issues(self, status: str = "open", limit: int = 100,
                             access_token: str | None = None) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            candidates = connection.execute(
                """SELECT id,
                   CASE WHEN cover_url IS NULL THEN 'missing_cover'
                        WHEN quality_score < 0.48 THEN 'suspicious_metadata'
                        WHEN NOT EXISTS(SELECT 1 FROM editions e WHERE e.book_id=books.id) THEN 'missing_isbn'
                   END issue_type,
                   quality_score,title,author,quality_flags_json
                   FROM books WHERE cover_url IS NULL OR quality_score<0.48
                      OR NOT EXISTS(SELECT 1 FROM editions e WHERE e.book_id=books.id)"""
            ).fetchall()
            for row in candidates:
                issue_id = hashlib.sha256(f"{row['id']}:{row['issue_type']}".encode()).hexdigest()[:32]
                connection.execute(
                    """INSERT OR IGNORE INTO catalog_review_items(id,book_id,issue_type,severity,status,details_json,created_at)
                       VALUES(?,?,?,?, 'open', ?,?)""",
                    (issue_id, row["id"], row["issue_type"], "high" if row["quality_score"] < .48 else "medium",
                     json.dumps({"title": row["title"], "author": row["author"], "flags": json.loads(row["quality_flags_json"] or "[]")}, ensure_ascii=False), now),
                )
            rows = connection.execute(
                """SELECT r.*,b.title,b.author,b.quality_score FROM catalog_review_items r
                   LEFT JOIN books b ON b.id=r.book_id WHERE r.status=?
                   ORDER BY CASE r.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,r.created_at LIMIT ?""",
                (status, limit),
            ).fetchall()
        return [{**dict(row), "details": json.loads(row["details_json"] or "{}")} for row in rows]


    def resolve_catalog_issue(self, issue_id: str, status: str, actor_id: str,
                              access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE catalog_review_items SET status=?,resolved_by=?,resolved_at=? WHERE id=? AND status='open'",
                (status, actor_id, now, issue_id),
            )
            if not cursor.rowcount:
                raise KeyError("İnceleme kaydı bulunamadı.")
            row = connection.execute("SELECT * FROM catalog_review_items WHERE id=?", (issue_id,)).fetchone()
        return dict(row)


    def admin_update_book(self, book_id: str, changes: dict, access_token: str | None = None) -> tuple[dict, dict]:
        allowed = {"title", "author", "genre", "publication_type", "language", "original_language", "page_count",
                   "cover_url", "description", "narrative_pace", "is_recommendable"}
        changes = {key: value for key, value in changes.items() if key in allowed and value is not None}
        if not changes:
            raise ValueError("Güncellenecek alan yok.")
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
            if not row:
                raise KeyError("Kitap bulunamadı.")
            before = self._book(row)
            values = [int(value) if key == "is_recommendable" else value for key, value in changes.items()]
            connection.execute(f"UPDATE books SET {','.join(f'{key}=?' for key in changes)},metadata_updated_at=? WHERE id=?",
                               (*values, datetime.now(timezone.utc).isoformat(), book_id))
            after = self._book(connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone())
        return before, after


    def merge_catalog_books(self, source_id: str, target_id: str, access_token: str | None = None) -> dict:
        if source_id == target_id:
            raise ValueError("Kaynak ve hedef kitap farklı olmalı.")
        with self.connect() as connection:
            source = connection.execute("SELECT * FROM books WHERE id=?", (source_id,)).fetchone()
            target = connection.execute("SELECT * FROM books WHERE id=?", (target_id,)).fetchone()
            if not source or not target:
                raise KeyError("Kaynak veya hedef kitap bulunamadı.")
            for table, extra in (("user_books", "shelf,is_favorite,current_page,total_pages,started_at,finished_at,abandonment_reason,updated_at"),
                                 ("reading_plans", "target_date,daily_pages,reminder_enabled,updated_at")):
                cols = "user_id," + extra
                connection.execute(f"INSERT OR IGNORE INTO {table}({cols},book_id) SELECT {cols},? FROM {table} WHERE book_id=?", (target_id, source_id))
                connection.execute(f"DELETE FROM {table} WHERE book_id=?", (source_id,))
            connection.execute("UPDATE editions SET book_id=? WHERE book_id=?", (target_id, source_id))
            connection.execute("UPDATE reading_activity SET book_id=? WHERE book_id=?", (target_id, source_id))
            connection.execute(
                """INSERT OR IGNORE INTO price_alerts(user_id,book_id,target_price_minor,currency,is_active,last_notified_price_minor,created_at,updated_at)
                   SELECT user_id,?,target_price_minor,currency,is_active,last_notified_price_minor,created_at,updated_at FROM price_alerts WHERE book_id=?""",
                (target_id, source_id),
            )
            connection.execute("DELETE FROM price_alerts WHERE book_id=?", (source_id,))
            connection.execute("UPDATE notifications SET book_id=? WHERE book_id=?", (target_id, source_id))
            connection.execute("UPDATE catalog_review_items SET book_id=? WHERE book_id=?", (target_id, source_id))
            connection.execute("DELETE FROM recommendation_feedback WHERE book_id=?", (source_id,))
            connection.execute("DELETE FROM books WHERE id=?", (source_id,))
        return {"source_book_id": source_id, "target_book_id": target_id, "merged": True}


    def create_catalog_job(self, job_type: str, payload: dict, created_by: str,
                           access_token: str | None = None) -> dict:
        job = {"id": str(uuid4()), "job_type": job_type, "payload": payload, "status": "pending", "attempts": 0,
               "max_attempts": 3, "created_by": created_by, "created_at": datetime.now(timezone.utc).isoformat()}
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO catalog_jobs(id,job_type,payload_json,status,attempts,max_attempts,created_by,created_at) VALUES(?,?,?,'pending',0,3,?,?)",
                (job["id"], job_type, json.dumps(payload, ensure_ascii=False), created_by, job["created_at"]),
            )
        return job


    def list_catalog_jobs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute("SELECT * FROM catalog_jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [{**dict(row), "payload": json.loads(row["payload_json"])} for row in rows]


    def claim_catalog_job(self) -> dict | None:
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT * FROM catalog_jobs WHERE status='pending' ORDER BY created_at LIMIT 1").fetchone()
            if not row:
                return None
            connection.execute("UPDATE catalog_jobs SET status='processing',attempts=attempts+1,started_at=?,last_error=NULL WHERE id=?",
                               (datetime.now(timezone.utc).isoformat(), row["id"]))
            claimed = connection.execute("SELECT * FROM catalog_jobs WHERE id=?", (row["id"],)).fetchone()
        return {**dict(claimed), "payload": json.loads(claimed["payload_json"])}


    def finish_catalog_job(self, job_id: str, success: bool, error: str | None = None) -> None:
        with self.connect() as connection:
            row = connection.execute("SELECT attempts,max_attempts FROM catalog_jobs WHERE id=?", (job_id,)).fetchone()
            if not row:
                raise KeyError("Katalog işi bulunamadı.")
            status = "completed" if success else "dead_letter" if row["attempts"] >= row["max_attempts"] else "pending"
            connection.execute("UPDATE catalog_jobs SET status=?,last_error=?,finished_at=? WHERE id=?",
                               (status, error[:2000] if error else None, datetime.now(timezone.utc).isoformat() if status in {"completed","dead_letter"} else None, job_id))


    def admin_comment_reports(self, status: str | None = None, limit: int = 100,
                              access_token: str | None = None) -> list[dict]:
        where, values = ("WHERE cr.status=?", [status]) if status else ("", [])
        with self.connect() as connection:
            rows = connection.execute(
                f"""SELECT cr.*,c.content,c.book_id,u.display_name reporter_name
                    FROM comment_reports cr JOIN book_comments c ON c.id=cr.comment_id
                    JOIN users u ON u.id=cr.user_id {where}
                    ORDER BY CASE cr.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
                             cr.created_at DESC LIMIT ?""", [*values, limit],
            ).fetchall()
        return [dict(row) for row in rows]


    def resolve_comment_report(self, report_id: int, status: str, moderator_id: str,
                               comment_status: str | None = None, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            row = connection.execute("SELECT comment_id FROM comment_reports WHERE id=?", (report_id,)).fetchone()
            if not row:
                raise KeyError("Şikâyet bulunamadı.")
            connection.execute("UPDATE comment_reports SET status=?,moderator_id=?,resolved_at=? WHERE id=?",
                               (status, moderator_id, now if status in {"resolved", "dismissed"} else None, report_id))
            if comment_status:
                connection.execute("UPDATE book_comments SET status=?,updated_at=? WHERE id=?",
                                   (comment_status, now, row["comment_id"]))
        return {"id": report_id, "status": status, "comment_id": row["comment_id"], "comment_status": comment_status}


    def admin_users(self, query: str | None = None, limit: int = 100, access_token: str | None = None) -> list[dict]:
        where, values = "", []
        if query:
            where, values = "WHERE lower(u.display_name) LIKE lower(?) OR lower(coalesce(a.email,'')) LIKE lower(?)", [f"%{query}%", f"%{query}%"]
        with self.connect() as connection:
            rows = connection.execute(
                f"""SELECT u.id,u.display_name,a.email,u.app_role,u.is_verified,u.verification_label,u.banned_at,u.banned_until,u.ban_reason,u.created_at,
                    (SELECT count(*) FROM book_comments c WHERE c.user_id=u.id) comment_count,
                    (SELECT count(*) FROM book_ratings r WHERE r.user_id=u.id) rating_count
                    FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id {where} ORDER BY u.created_at DESC LIMIT ?""",
                [*values, limit],
            ).fetchall()
        return [{**dict(row), "is_verified": bool(row["is_verified"]),
                 "is_banned": bool(row["banned_at"]) and (not row["banned_until"] or datetime.fromisoformat(row["banned_until"].replace("Z", "+00:00")) > datetime.now(timezone.utc))} for row in rows]


    def admin_set_verification(self, user_id: str, verified: bool, label: str | None, actor_id: str,
                               access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat() if verified else None
        with self.connect() as connection:
            cursor = connection.execute("UPDATE users SET is_verified=?,verification_label=?,verified_at=?,verified_by=? WHERE id=?",
                                        (int(verified), label.strip() if verified and label else None, now, actor_id if verified else None, user_id))
            if not cursor.rowcount: raise KeyError("KullanÄ±cÄ± bulunamadÄ±.")
        return {"user_id": user_id, "is_verified": verified, "verification_label": label if verified else None}


    def admin_set_ban(self, user_id: str, banned: bool, reason: str | None, duration_days: int | None, actor_id: str,
                      access_token: str | None = None) -> dict:
        if user_id == actor_id and banned: raise ValueError("Kendi hesabÄ±nÄ±zÄ± banlayamazsÄ±nÄ±z.")
        now = datetime.now(timezone.utc)
        until = (now + timedelta(days=duration_days)).isoformat() if banned and duration_days else None
        with self.connect() as connection:
            cursor = connection.execute("UPDATE users SET banned_at=?,banned_until=?,banned_by=?,ban_reason=? WHERE id=?",
                                        (now.isoformat() if banned else None, until, actor_id if banned else None, reason.strip() if banned and reason else None, user_id))
            if not cursor.rowcount: raise KeyError("KullanÄ±cÄ± bulunamadÄ±.")
        return {"user_id": user_id, "is_banned": banned, "banned_until": until, "ban_reason": reason if banned else None}


    def moderate_comment(self, comment_id: str, status: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            cursor = connection.execute("UPDATE book_comments SET status=?,updated_at=? WHERE id=?", (status, datetime.now(timezone.utc).isoformat(), comment_id))
            if not cursor.rowcount: raise KeyError("Yorum bulunamadÄ±.")
        return {"comment_id": comment_id, "status": status}


    def admin_system_logs(self, limit: int = 200, level: str | None = None, access_token: str | None = None) -> list[dict]:
        where, values = (" WHERE level=?", [level]) if level else ("", [])
        with self.connect() as connection:
            rows = connection.execute(f"SELECT * FROM application_events{where} ORDER BY created_at DESC LIMIT ?", [*values, limit]).fetchall()
        return [{**dict(row), "details": json.loads(row["details_json"] or "{}")} for row in rows]


    def admin_dashboard(self, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            counts = {name: connection.execute(sql).fetchone()[0] for name, sql in {
                "users": "SELECT count(*) FROM users", "verified_users": "SELECT count(*) FROM users WHERE is_verified=1",
                "banned_users": "SELECT count(*) FROM users WHERE banned_at IS NOT NULL AND (banned_until IS NULL OR banned_until>datetime('now'))",
                "comments": "SELECT count(*) FROM book_comments WHERE status='published'", "ratings": "SELECT count(*) FROM book_ratings",
                "books": "SELECT count(*) FROM books", "offers": "SELECT count(*) FROM offers"}.items()}
            top = [dict(row) for row in connection.execute("SELECT id,title,author,rating_average,rating_count,popularity_score FROM books ORDER BY popularity_score DESC,rating_count DESC LIMIT 8")]
        return {**counts, "top_books": top}

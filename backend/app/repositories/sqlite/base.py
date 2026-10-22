"""SQLite bağlantısı ve şema kurulumu."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.services.catalog.catalog_quality import enrich_book_record


class SQLiteBase:
    """Yerel SQLite deposu; servis katmanı bu sınıfın SQL ayrıntılarını bilmez."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()


    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()


    def initialize(self) -> None:
        schema = (Path(__file__).resolve().parents[1] / "database" / "schema.sql").read_text(encoding="utf-8")
        with self.connect() as connection:
            connection.executescript(schema)
            user_columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)")}
            if "app_role" not in user_columns:
                connection.execute("ALTER TABLE users ADD COLUMN app_role TEXT NOT NULL DEFAULT 'user'")
            user_social_fields = {"is_verified": "INTEGER NOT NULL DEFAULT 0", "verification_label": "TEXT", "verified_at": "TEXT", "verified_by": "TEXT",
                                  "banned_at": "TEXT", "banned_until": "TEXT", "banned_by": "TEXT", "ban_reason": "TEXT"}
            for name, sql_type in user_social_fields.items():
                if name not in user_columns:
                    connection.execute(f"ALTER TABLE users ADD COLUMN {name} {sql_type}")
            columns = {row["name"] for row in connection.execute("PRAGMA table_info(books)")}
            book_fields = {
                "source_name": "TEXT", "source_url": "TEXT", "cover_url": "TEXT",
                "series_name": "TEXT", "series_index": "REAL", "metadata_updated_at": "TEXT",
                "canonical_work_key": "TEXT", "publication_type": "TEXT NOT NULL DEFAULT 'unknown'",
                "language": "TEXT NOT NULL DEFAULT 'tr'", "page_count": "INTEGER",
                "original_language": "TEXT", "atmosphere_json": "TEXT NOT NULL DEFAULT '[]'",
                "narrative_style_json": "TEXT NOT NULL DEFAULT '[]'", "narrative_pace": "TEXT",
                "quality_score": "REAL NOT NULL DEFAULT 0",
                "quality_flags_json": "TEXT NOT NULL DEFAULT '[]'",
                "is_recommendable": "INTEGER NOT NULL DEFAULT 0",
                "rating_count": "INTEGER NOT NULL DEFAULT 0", "rating_average": "REAL NOT NULL DEFAULT 0",
                "popularity_score": "REAL NOT NULL DEFAULT 0",
            }
            for name, sql_type in book_fields.items():
                if name not in columns:
                    connection.execute(f"ALTER TABLE books ADD COLUMN {name} {sql_type}")
            preference_columns = {row["name"] for row in connection.execute("PRAGMA table_info(user_preferences)")}
            preference_fields = {
                "liked_styles_json": "TEXT NOT NULL DEFAULT '[]'", "disliked_styles_json": "TEXT NOT NULL DEFAULT '[]'",
                "pace_preference": "TEXT", "focus_preference": "TEXT", "tone_preference": "TEXT",
                "violence_sensitivity": "INTEGER NOT NULL DEFAULT 0", "romance_sensitivity": "INTEGER NOT NULL DEFAULT 0",
                "spoiler_sensitivity": "INTEGER NOT NULL DEFAULT 2", "length_preference": "TEXT",
            }
            for name, sql_type in preference_fields.items():
                if name not in preference_columns:
                    connection.execute(f"ALTER TABLE user_preferences ADD COLUMN {name} {sql_type}")
            upgrades = {
                "action_executions": {"status": "TEXT NOT NULL DEFAULT 'succeeded'", "action_payload_json": "TEXT NOT NULL DEFAULT '{}'", "inverse_action_json": "TEXT", "error_code": "TEXT", "duration_ms": "INTEGER NOT NULL DEFAULT 0", "undone_at": "TEXT"},
                "chat_sessions": {"is_pinned": "INTEGER NOT NULL DEFAULT 0", "is_archived": "INTEGER NOT NULL DEFAULT 0"},
                "chat_messages": {"citations_json": "TEXT NOT NULL DEFAULT '[]'", "edited_at": "TEXT", "deleted_at": "TEXT"},
                "reading_plans": {"reminder_time": "TEXT NOT NULL DEFAULT '20:00'", "timezone": "TEXT NOT NULL DEFAULT 'Europe/Istanbul'", "excluded_weekdays_json": "TEXT NOT NULL DEFAULT '[]'", "weekday_pages": "INTEGER", "weekend_pages": "INTEGER", "delivery_channel": "TEXT NOT NULL DEFAULT 'in_app'", "status": "TEXT NOT NULL DEFAULT 'active'"},
                "book_clubs": {"rules": "TEXT NOT NULL DEFAULT ''"},
                "book_club_progress": {"daily_target_pages": "INTEGER NOT NULL DEFAULT 10"},
                "book_club_discussions": {"chapter_title": "TEXT", "discussion_type": "TEXT NOT NULL DEFAULT 'discussion'", "parent_id": "TEXT"},
            }
            for table, fields in upgrades.items():
                existing = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
                for name, sql_type in fields.items():
                    if name not in existing:
                        connection.execute(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_book_club_discussions_parent ON book_club_discussions(parent_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_books_canonical_work ON books(canonical_work_key)"
            )
            connection.execute(
                """CREATE INDEX IF NOT EXISTS idx_books_recommendation_pool
                   ON books(is_recommendable,publication_type,quality_score DESC)"""
            )
            user_books_sql = connection.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='user_books'"
            ).fetchone()["sql"]
            if "'abandoned'" not in user_books_sql:
                connection.execute("ALTER TABLE user_books RENAME TO user_books_legacy")
                connection.execute(
                    """CREATE TABLE user_books (
                        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                        shelf TEXT NOT NULL CHECK (shelf IN ('read','reading','to_read','abandoned')),
                        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0,1)),
                        current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
                        total_pages INTEGER CHECK (total_pages IS NULL OR total_pages > 0),
                        started_at TEXT,
                        finished_at TEXT,
                        abandonment_reason TEXT,
                        updated_at TEXT NOT NULL,
                        PRIMARY KEY(user_id, book_id),
                        CHECK (total_pages IS NULL OR current_page <= total_pages)
                    )"""
                )
                connection.execute(
                    """INSERT INTO user_books(
                           user_id,book_id,shelf,is_favorite,current_page,total_pages,
                           started_at,finished_at,abandonment_reason,updated_at
                       )
                       SELECT user_id,book_id,shelf,is_favorite,current_page,total_pages,
                              started_at,finished_at,NULL,
                              updated_at
                       FROM user_books_legacy"""
                )
                connection.execute("DROP TABLE user_books_legacy")
                connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_user_books_shelf ON user_books(user_id,shelf)"
                )
            activity_columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(reading_activity)")
            }
            if "custom_book_id" not in activity_columns:
                connection.execute("ALTER TABLE reading_activity RENAME TO reading_activity_legacy")
                connection.execute(
                    """CREATE TABLE reading_activity (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
                        custom_book_id TEXT REFERENCES user_custom_books(id) ON DELETE CASCADE,
                        activity_date TEXT NOT NULL,
                        pages_read INTEGER NOT NULL CHECK (pages_read > 0),
                        created_at TEXT NOT NULL,
                        CHECK ((book_id IS NOT NULL) != (custom_book_id IS NOT NULL))
                    )"""
                )
                connection.execute(
                    """INSERT INTO reading_activity(
                           id,user_id,book_id,custom_book_id,activity_date,pages_read,created_at
                       ) SELECT id,user_id,book_id,NULL,activity_date,pages_read,created_at
                         FROM reading_activity_legacy"""
                )
                connection.execute("DROP TABLE reading_activity_legacy")
                connection.execute(
                    "CREATE INDEX idx_reading_activity_user_date ON reading_activity(user_id,activity_date)"
                )
            notifications_sql = connection.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").fetchone()["sql"]
            if "edition_update" not in notifications_sql:
                connection.execute("ALTER TABLE notifications RENAME TO notifications_legacy")
                connection.execute("""CREATE TABLE notifications (
                    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL CHECK(kind IN ('price_drop','reading_reminder','comment_reply','comment_helpful','new_follower','badge_earned','edition_update')),
                    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,body TEXT NOT NULL,payload_json TEXT NOT NULL DEFAULT '{}',read_at TEXT,created_at TEXT NOT NULL)""")
                connection.execute("INSERT INTO notifications SELECT * FROM notifications_legacy")
                connection.execute("DROP TABLE notifications_legacy")
                connection.execute("CREATE INDEX idx_notifications_user_created ON notifications(user_id,created_at DESC)")
            comment_columns = {row["name"] for row in connection.execute("PRAGMA table_info(book_comments)")}
            if "parent_comment_id" not in comment_columns:
                connection.execute(
                    "ALTER TABLE book_comments ADD COLUMN parent_comment_id TEXT REFERENCES book_comments(id) ON DELETE CASCADE"
                )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_book_comments_parent ON book_comments(parent_comment_id,created_at)"
            )
            edition_columns = {row["name"] for row in connection.execute("PRAGMA table_info(editions)")}
            edition_fields = {
                "language": "TEXT", "published_date": "TEXT", "source_name": "TEXT", "source_url": "TEXT",
                "verification_status": "TEXT NOT NULL DEFAULT 'unverified'", "verified_at": "TEXT",
                "page_count": "INTEGER",
                "isbn10": "TEXT", "isbn13": "TEXT", "translator": "TEXT", "edition_label": "TEXT",
            }
            for name, sql_type in edition_fields.items():
                if name not in edition_columns:
                    connection.execute(f"ALTER TABLE editions ADD COLUMN {name} {sql_type}")
            connection.execute("CREATE INDEX IF NOT EXISTS idx_editions_verification ON editions(verification_status, language)")
            connection.execute("CREATE INDEX IF NOT EXISTS idx_books_canonical_work ON books(canonical_work_key)")
            connection.execute("CREATE INDEX IF NOT EXISTS idx_books_recommendation_pool ON books(is_recommendable,publication_type,quality_score DESC)")
            rows = connection.execute(
                """SELECT b.*, EXISTS(SELECT 1 FROM editions e WHERE e.book_id=b.id) has_isbn,
                          (SELECT max(e.page_count) FROM editions e WHERE e.book_id=b.id) edition_pages
                     FROM books b"""
            ).fetchall()
            for row in rows:
                raw = self._book(row)
                raw["isbn"] = "known" if row["has_isbn"] else None
                raw["page_count"] = row["page_count"] or row["edition_pages"]
                enriched = enrich_book_record(raw)
                connection.execute(
                    """UPDATE books SET canonical_work_key=?,publication_type=?,language=?,page_count=?,
                           quality_score=?,quality_flags_json=?,is_recommendable=? WHERE id=?""",
                    (enriched["canonical_work_key"], enriched["publication_type"], enriched["language"],
                     enriched["page_count"], enriched["quality_score"],
                     json.dumps(enriched["quality_flags"], ensure_ascii=False),
                     int(enriched["is_recommendable"]), row["id"]),
                )
            duplicate_groups = connection.execute(
                """SELECT canonical_work_key FROM books
                   WHERE canonical_work_key IS NOT NULL
                   GROUP BY canonical_work_key HAVING count(*) > 1"""
            ).fetchall()
            for group in duplicate_groups:
                duplicates = connection.execute(
                    """SELECT id,source_name,quality_score FROM books
                       WHERE canonical_work_key=?
                       ORDER BY CASE WHEN source_name='local_curated' THEN 0 ELSE 1 END,
                                quality_score DESC,id""",
                    (group["canonical_work_key"],),
                ).fetchall()
                survivor_id = duplicates[0]["id"]
                for duplicate in duplicates[1:]:
                    duplicate_id = duplicate["id"]
                    reference_count = sum(
                        connection.execute(
                            f"SELECT count(*) n FROM {table} WHERE book_id=?", (duplicate_id,)
                        ).fetchone()["n"]
                        for table in (
                            "user_books", "reading_activity", "price_alerts",
                            "notifications", "edition_verification_attempts",
                        )
                    )
                    if reference_count:
                        continue
                    connection.execute(
                        "UPDATE editions SET book_id=? WHERE book_id=?",
                        (survivor_id, duplicate_id),
                    )
                    connection.execute("DELETE FROM books WHERE id=?", (duplicate_id,))

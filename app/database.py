import json
import hashlib
import hmac
import secrets
import sqlite3
import re
from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.services.catalog_quality import canonical_work_key, deduplicate_library_entries, enrich_book_record, normalize_isbn
from app.services.gamification import BADGE_RULES, build_gamification_summary, earned_badge_codes
from app.services.reading_planner import build_schedule, reminder_datetime_utc, schedule_summary
from app.services.product_growth import funnel_metrics, weekly_window


class Repository:
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

    def seed_books(self, source: Path) -> None:
        books = json.loads(source.read_text(encoding="utf-8"))
        updated_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            for book in books:
                book = enrich_book_record({**book, "source_name": "local_curated", "language": "tr"})
                connection.execute(
                    """INSERT INTO books(id,title,author,genre,themes_json,traits_json,description,source_name,
                           canonical_work_key,publication_type,language,original_language,page_count,atmosphere_json,narrative_style_json,narrative_pace,
                           quality_score,quality_flags_json,is_recommendable,metadata_updated_at)
                       VALUES(:id,:title,:author,:genre,:themes_json,:traits_json,:description,'local_curated',
                           :canonical_work_key,:publication_type,:language,:original_language,:page_count,:atmosphere_json,:narrative_style_json,:narrative_pace,
                           :quality_score,:quality_flags_json,:is_recommendable,:metadata_updated_at)
                       ON CONFLICT(id) DO UPDATE SET title=excluded.title, author=excluded.author,
                       genre=excluded.genre, themes_json=excluded.themes_json,
                       traits_json=excluded.traits_json, description=excluded.description,
                       source_name='local_curated',canonical_work_key=excluded.canonical_work_key,
                       publication_type=excluded.publication_type,language=excluded.language,original_language=excluded.original_language,page_count=excluded.page_count,
                       atmosphere_json=excluded.atmosphere_json,narrative_style_json=excluded.narrative_style_json,narrative_pace=excluded.narrative_pace,
                       quality_score=excluded.quality_score,quality_flags_json=excluded.quality_flags_json,
                       is_recommendable=excluded.is_recommendable,metadata_updated_at=excluded.metadata_updated_at""",
                    {**book, "themes_json": json.dumps(book["themes"], ensure_ascii=False),
                     "traits_json": json.dumps(book["character_traits"], ensure_ascii=False),
                     "atmosphere_json": json.dumps(book["atmosphere"], ensure_ascii=False),
                     "narrative_style_json": json.dumps(book["narrative_style"], ensure_ascii=False),
                     "quality_flags_json": json.dumps(book["quality_flags"], ensure_ascii=False),
                     "is_recommendable": int(book["is_recommendable"]), "metadata_updated_at": updated_at},
                )

    @staticmethod
    def _book(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"], "title": row["title"], "author": row["author"], "genre": row["genre"],
            "themes": json.loads(row["themes_json"]), "character_traits": json.loads(row["traits_json"]),
            "description": row["description"],
            "source_name": row["source_name"], "source_url": row["source_url"], "cover_url": row["cover_url"],
            "series_name": row["series_name"], "series_index": row["series_index"],
            "canonical_work_key": row["canonical_work_key"], "publication_type": row["publication_type"],
            "language": row["language"], "page_count": row["page_count"],
            "original_language": row["original_language"],
            "atmosphere": json.loads(row["atmosphere_json"] or "[]"),
            "narrative_style": json.loads(row["narrative_style_json"] or "[]"),
            "narrative_pace": row["narrative_pace"],
            "quality_score": row["quality_score"],
            "quality_flags": json.loads(row["quality_flags_json"] or "[]"),
            "is_recommendable": bool(row["is_recommendable"]),
            "rating_count": row["rating_count"], "rating_average": row["rating_average"],
            "popularity_score": row["popularity_score"],
        }

    def list_books(self) -> list[dict]:
        with self.connect() as connection:
            return [self._book(row) for row in connection.execute("SELECT * FROM books ORDER BY title")]

    def search_books(self, query: str | None, limit: int, offset: int, sort: str = "title") -> dict:
        normalized = (query or "").strip()
        where, values = "", []
        if normalized:
            where = " WHERE lower(title || ' ' || author || ' ' || genre || ' ' || themes_json) LIKE lower(?)"
            values.append(f"%{normalized}%")
        with self.connect() as connection:
            total = connection.execute("SELECT count(*) count FROM books" + where, values).fetchone()["count"]
            order = "popularity_score DESC,rating_count DESC,title" if sort == "popular" else "title"
            rows = connection.execute("SELECT * FROM books" + where + f" ORDER BY {order} LIMIT ? OFFSET ?", [*values, limit, offset]).fetchall()
        return {"items": [self._book(row) for row in rows], "total": total, "limit": limit, "offset": offset}

    def upsert_metadata_book(self, record: dict) -> str:
        """Kaynaklı kitap metadata'sını eser düzeyinde birleştirir ve ISBN baskısını bağlar."""
        record = enrich_book_record(record)
        with self.connect() as connection:
            existing = connection.execute(
                """SELECT id,source_name FROM books
                   WHERE id=? OR canonical_work_key=? OR (lower(title)=lower(?) AND lower(author)=lower(?))
                   ORDER BY CASE WHEN source_name='local_curated' THEN 0 ELSE 1 END LIMIT 1""",
                (record["id"], record["canonical_work_key"], record["title"], record["author"]),
            ).fetchone()
            book_id = existing["id"] if existing else record["id"]
            if existing:
                if existing["source_name"] != "local_curated":
                    connection.execute(
                        """UPDATE books SET genre=?,themes_json=?,traits_json=?,description=?,source_name=?,source_url=?,cover_url=?,
                           canonical_work_key=?,publication_type=?,language=?,page_count=?,quality_score=?,quality_flags_json=?,is_recommendable=?,metadata_updated_at=? WHERE id=?""",
                        (record["genre"], json.dumps(record["themes"], ensure_ascii=False), json.dumps(record["character_traits"], ensure_ascii=False),
                         record["description"], record["source_name"], record["source_url"], record["cover_url"], record["canonical_work_key"],
                         record["publication_type"],record["language"],record["page_count"],record["quality_score"],
                         json.dumps(record["quality_flags"],ensure_ascii=False),int(record["is_recommendable"]),record["metadata_updated_at"], book_id),
                    )
            else:
                connection.execute(
                    """INSERT INTO books(id,title,author,genre,themes_json,traits_json,description,source_name,source_url,cover_url,
                           canonical_work_key,publication_type,language,page_count,quality_score,quality_flags_json,is_recommendable,metadata_updated_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (book_id, record["title"], record["author"], record["genre"], json.dumps(record["themes"], ensure_ascii=False),
                     json.dumps(record["character_traits"], ensure_ascii=False), record["description"], record["source_name"], record["source_url"],
                     record["cover_url"],record["canonical_work_key"],record["publication_type"],record["language"],record["page_count"],
                     record["quality_score"],json.dumps(record["quality_flags"],ensure_ascii=False),int(record["is_recommendable"]),record["metadata_updated_at"]),
                )
            if record.get("isbn"):
                isbn10, isbn13 = normalize_isbn(record["isbn"])
                canonical_isbn = isbn13 or isbn10
                if not canonical_isbn:
                    return book_id
                connection.execute(
                    """INSERT INTO editions(isbn,isbn10,isbn13,book_id,title,author,publisher,translator,edition_label,language,page_count)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?)
                       ON CONFLICT(isbn) DO UPDATE SET book_id=excluded.book_id,title=excluded.title,author=excluded.author,
                       publisher=excluded.publisher,translator=excluded.translator,edition_label=excluded.edition_label,
                       language=excluded.language,page_count=COALESCE(excluded.page_count,editions.page_count)""",
                    (canonical_isbn, isbn10, isbn13, book_id, record["title"], record["author"], record.get("publisher"),
                     record.get("translator"), record.get("edition_label"),record["language"],record["page_count"]),
                )
        return book_id

    def books_for_edition_verification(self, limit: int = 200) -> list[dict]:
        """Türkçe baskısı henüz doğrulanmamış katalog eserlerini döndürür."""
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT b.id,b.title,b.author,b.source_name,b.source_url FROM books b
                   WHERE NOT EXISTS (
                     SELECT 1 FROM editions e WHERE e.book_id=b.id
                     AND e.language='tur' AND e.verification_status IN ('verified','retailer_verified')
                   ) AND NOT EXISTS (
                     SELECT 1 FROM edition_verification_attempts a WHERE a.book_id=b.id
                     AND a.attempted_at >= datetime('now','-30 days')
                   ) ORDER BY CASE WHEN b.source_name='local_curated' THEN 0 ELSE 1 END,b.title LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def record_edition_verification(self, book_id: str, status: str, error: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO edition_verification_attempts(book_id,status,attempted_at,error) VALUES(?,?,?,?)
                   ON CONFLICT(book_id) DO UPDATE SET status=excluded.status,attempted_at=excluded.attempted_at,error=excluded.error""",
                (book_id, status, datetime.now(timezone.utc).isoformat(), error),
            )

    def save_verified_edition(self, edition: dict) -> dict:
        with self.connect() as connection:
            was_new = not connection.execute("SELECT 1 FROM editions WHERE isbn=?", (edition["isbn"],)).fetchone()
            connection.execute(
                """INSERT INTO editions(isbn,book_id,title,author,publisher,language,published_date,source_name,source_url,verification_status,verified_at)
                   VALUES(:isbn,:book_id,:title,:author,:publisher,:language,:published_date,:source_name,:source_url,:verification_status,:verified_at)
                   ON CONFLICT(isbn) DO UPDATE SET book_id=excluded.book_id,title=excluded.title,author=excluded.author,
                   publisher=excluded.publisher,language=excluded.language,published_date=excluded.published_date,
                   source_name=excluded.source_name,source_url=excluded.source_url,
                   verification_status=excluded.verification_status,verified_at=excluded.verified_at""",
                edition,
            )
        if was_new and edition.get("book_id"):
            self.notify_edition_subscribers(edition["book_id"], "new_edition", edition.get("title") or "Yeni baskı")
        return edition

    def list_verified_editions(self, limit: int = 200) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT e.*,b.title book_title,b.author book_author FROM editions e JOIN books b ON b.id=e.book_id
                   WHERE e.language='tur' AND e.verification_status IN ('verified','retailer_verified')
                   ORDER BY b.title,e.verified_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def list_offer_urls(self, retailer_ids: list[str] | None = None) -> list[str]:
        query, values = "SELECT product_url FROM offers", []
        if retailer_ids:
            placeholders = ",".join("?" for _ in retailer_ids)
            query += f" WHERE retailer_id IN ({placeholders})"
            values.extend(retailer_ids)
        with self.connect() as connection:
            return [row["product_url"] for row in connection.execute(query, values)]

    def list_unpriced_books(self, limit: int = 20) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT b.* FROM books b WHERE NOT EXISTS (
                     SELECT 1 FROM editions e JOIN offers o ON o.edition_isbn=e.isbn WHERE e.book_id=b.id
                   ) ORDER BY CASE WHEN b.source_name='local_curated' THEN 0 ELSE 1 END,b.title LIMIT ?""",
                (limit,),
            ).fetchall()
        return [self._book(row) for row in rows]

    def catalog_coverage(self) -> dict:
        with self.connect() as connection:
            return {
                "books": connection.execute("SELECT count(*) n FROM books").fetchone()["n"],
                "recommendable_books": connection.execute(
                    "SELECT count(*) n FROM books WHERE is_recommendable=1"
                ).fetchone()["n"],
                "low_quality_books": connection.execute(
                    "SELECT count(*) n FROM books WHERE quality_score < 0.48"
                ).fetchone()["n"],
                "duplicate_work_groups": connection.execute(
                    """SELECT count(*) n FROM (
                        SELECT canonical_work_key FROM books
                        WHERE canonical_work_key IS NOT NULL
                        GROUP BY canonical_work_key HAVING count(*) > 1
                    )"""
                ).fetchone()["n"],
                "editions": connection.execute("SELECT count(*) n FROM editions").fetchone()["n"],
                "verified_turkish_editions": connection.execute(
                    "SELECT count(*) n FROM editions WHERE language='tur' AND verification_status IN ('verified','retailer_verified')"
                ).fetchone()["n"],
                "priced_books": connection.execute(
                    "SELECT count(DISTINCT e.book_id) n FROM offers o JOIN editions e ON e.isbn=o.edition_isbn WHERE e.book_id IS NOT NULL"
                ).fetchone()["n"],
                "offers": connection.execute("SELECT count(*) n FROM offers").fetchone()["n"],
                "last_price_check": connection.execute("SELECT max(checked_at) value FROM offers").fetchone()["value"],
            }

    def create_user(self, display_name: str) -> dict:
        user = {"id": str(uuid4()), "display_name": display_name.strip(), "created_at": datetime.now(timezone.utc).isoformat()}
        with self.connect() as connection:
            connection.execute("INSERT INTO users(id,display_name,created_at) VALUES(:id,:display_name,:created_at)", user)
        return user

    @staticmethod
    def _password_hash(password: str, salt: bytes) -> str:
        return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32).hex()

    def register(self, display_name: str, email: str, password: str) -> dict:
        normalized_email = email.strip().casefold()
        salt = secrets.token_bytes(16)
        user = {"id": str(uuid4()), "display_name": display_name.strip(), "created_at": datetime.now(timezone.utc).isoformat()}
        try:
            with self.connect() as connection:
                connection.execute("INSERT INTO users(id,display_name,created_at) VALUES(:id,:display_name,:created_at)", user)
                connection.execute(
                    "INSERT INTO auth_accounts(user_id,email,password_hash,password_salt,created_at) VALUES(?,?,?,?,?)",
                    (user["id"], normalized_email, self._password_hash(password, salt), salt.hex(), user["created_at"]),
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("Bu e-posta adresi zaten kayıtlı.") from error
        return {**user, "email": normalized_email}

    def open_registration_session(self, display_name: str, email: str, password: str) -> dict:
        user = self.register(display_name, email, password)
        return {
            "user": user,
            "access_token": self.create_session(user["id"]),
            "refresh_token": None,
            "email_confirmation_required": False,
        }

    def authenticate(self, email: str, password: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT u.id,u.display_name,u.created_at,a.email,a.password_hash,a.password_salt
                   FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.email=?""",
                (email.strip().casefold(),),
            ).fetchone()
        if not row:
            raise ValueError("E-posta veya parola hatalı.")
        candidate = self._password_hash(password, bytes.fromhex(row["password_salt"]))
        if not hmac.compare_digest(candidate, row["password_hash"]):
            raise ValueError("E-posta veya parola hatalı.")
        return {"id": row["id"], "display_name": row["display_name"], "email": row["email"], "created_at": row["created_at"]}

    def open_login_session(self, email: str, password: str) -> dict:
        user = self.authenticate(email, password)
        return {
            "user": user,
            "access_token": self.create_session(user["id"]),
            "refresh_token": None,
            "email_confirmation_required": False,
        }

    def request_password_reset(self, email: str, redirect_to: str | None = None) -> str | None:
        """Create a single-use local recovery token without revealing account existence."""
        normalized_email = email.strip().casefold()
        with self.connect() as connection:
            row = connection.execute(
                "SELECT user_id FROM auth_accounts WHERE email=?", (normalized_email,)
            ).fetchone()
            if not row:
                return None
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            now = datetime.now(timezone.utc)
            connection.execute(
                "DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<=?",
                (row["user_id"], now.isoformat()),
            )
            connection.execute(
                """INSERT INTO password_reset_tokens(token_hash,user_id,expires_at,created_at)
                   VALUES(?,?,?,?)""",
                (token_hash, row["user_id"], (now + timedelta(hours=1)).isoformat(), now.isoformat()),
            )
        return raw_token

    def reset_password(self, recovery_token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(recovery_token.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc)
        salt = secrets.token_bytes(16)
        with self.connect() as connection:
            row = connection.execute(
                """SELECT user_id FROM password_reset_tokens
                   WHERE token_hash=? AND used_at IS NULL AND expires_at>?""",
                (token_hash, now.isoformat()),
            ).fetchone()
            if not row:
                raise ValueError("Parola sıfırlama bağlantısı geçersiz veya süresi dolmuş.")
            connection.execute(
                "UPDATE auth_accounts SET password_hash=?,password_salt=? WHERE user_id=?",
                (self._password_hash(new_password, salt), salt.hex(), row["user_id"]),
            )
            connection.execute(
                "UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?",
                (now.isoformat(), token_hash),
            )
            connection.execute("DELETE FROM sessions WHERE user_id=?", (row["user_id"],))

    def resend_confirmation(self, email: str) -> None:
        # Local accounts are confirmed immediately; keep the API contract uniform.
        return None

    def create_session(self, user_id: str, days: int = 14) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        created_at = datetime.now(timezone.utc)
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
                (token_hash, user_id, created_at.isoformat(), (created_at + timedelta(days=days)).isoformat()),
            )
        return token

    def session_user(self, token: str | None) -> dict | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = datetime.now(UTC).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                """SELECT u.id,u.display_name,u.app_role,u.created_at,a.email FROM sessions s
                   JOIN users u ON u.id=s.user_id JOIN auth_accounts a ON a.user_id=u.id
                   WHERE s.token_hash=? AND s.expires_at>?""", (token_hash, now),
            ).fetchone()
        return dict(row) if row else None

    def resolve_session(self, access_token: str | None, refresh_token: str | None = None) -> dict | None:
        user = self.session_user(access_token)
        if not user:
            return None
        return {"user": user, "access_token": access_token, "refresh_token": None}

    def user_role(self, user_id: str, access_token: str | None = None) -> str:
        with self.connect() as connection:
            row = connection.execute("SELECT app_role FROM users WHERE id=?", (user_id,)).fetchone()
        return row["app_role"] if row else "user"

    def set_user_role(self, user_id: str, role: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            cursor = connection.execute("UPDATE users SET app_role=? WHERE id=?", (role, user_id))
            if not cursor.rowcount:
                raise KeyError("Kullanıcı bulunamadı.")
        return {"user_id": user_id, "role": role}

    def delete_user_account(self, user_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM users WHERE id=?", (user_id,))

    def export_user_data(self, user_id: str, access_token: str | None = None) -> dict:
        """Return a portable copy without password hashes, tokens or moderator-only data."""
        direct_tables = (
            "user_preferences", "user_books", "user_custom_books", "reading_goals",
            "reading_activity", "reading_sessions", "book_quotes", "price_alerts",
            "notifications", "recommendation_feedback", "book_ratings", "book_comments",
            "comment_helpful_votes", "comment_reports", "user_badges", "user_badge_showcase",
            "chat_sessions", "chat_messages", "reading_plans", "reading_plan_days",
            "reminder_deliveries", "action_executions",
            "product_events", "beta_feedback",
        )
        with self.connect() as connection:
            account = connection.execute(
                """SELECT u.id,u.display_name,u.app_role,u.created_at,a.email
                   FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=?""",
                (user_id,),
            ).fetchone()
            if not account:
                raise KeyError("Kullanıcı bulunamadı.")
            available = {
                row["name"] for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            records = {}
            for table in direct_tables:
                if table not in available:
                    continue
                columns = {
                    row["name"] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()
                }
                if "user_id" in columns:
                    records[table] = [
                        dict(row) for row in connection.execute(
                            f"SELECT * FROM {table} WHERE user_id=?", (user_id,)
                        ).fetchall()
                    ]
            if "user_follows" in available:
                records["user_follows"] = [
                    dict(row) for row in connection.execute(
                        "SELECT * FROM user_follows WHERE follower_id=? OR followed_id=?",
                        (user_id, user_id),
                    ).fetchall()
                ]
            subscriptions = [dict(row) for row in connection.execute(
                "SELECT id,user_id,user_agent,created_at,updated_at FROM web_push_subscriptions WHERE user_id=?",
                (user_id,),
            ).fetchall()]
        return {
            "format": "mihenk-user-export-v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "account": dict(account),
            "records": {**records, "web_push_subscriptions": subscriptions},
        }

    def purge_expired_data(self, *, audit_days: int, event_days: int,
                           notification_days: int, chat_days: int) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        rules = (
            ("audit_log", "created_at", audit_days, "1=1"),
            ("application_events", "created_at", event_days, "1=1"),
            ("product_events", "occurred_at", event_days, "1=1"),
            ("beta_feedback", "created_at", event_days, "status IN ('resolved','closed')"),
            ("recommendation_events", "created_at", event_days, "1=1"),
            ("notifications", "created_at", notification_days, "read_at IS NOT NULL"),
            ("chat_messages", "created_at", chat_days, "1=1"),
            ("reminder_deliveries", "created_at", event_days, "status IN ('sent','failed','dead_letter')"),
        )
        deleted: dict[str, int] = {}
        with self.connect() as connection:
            available = {
                row["name"] for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            for table, column, days, predicate in rules:
                if table not in available:
                    continue
                cutoff = (now - timedelta(days=days)).isoformat()
                cursor = connection.execute(
                    f"DELETE FROM {table} WHERE {column}<? AND {predicate}", (cutoff,)
                )
                deleted[table] = cursor.rowcount
        return deleted

    def audit(self, actor_user_id: str | None, action: str, entity_type: str, entity_id: str | None,
              before: dict | None = None, after: dict | None = None, request_id: str | None = None,
              access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (str(uuid4()), actor_user_id, action, entity_type, entity_id,
                 json.dumps(before, ensure_ascii=False) if before is not None else None,
                 json.dumps(after, ensure_ascii=False) if after is not None else None,
                 request_id, datetime.now(timezone.utc).isoformat()),
            )

    def action_execution(self, user_id: str, key: str, access_token: str | None = None) -> dict | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM action_executions WHERE idempotency_key=? AND user_id=?", (key, user_id)
            ).fetchone()
        return json.loads(row["result_json"]) if row and row["status"] == "succeeded" else None

    def save_action_execution(self, user_id: str, key: str, action_type: str, result: dict,
                              access_token: str | None = None, action_payload: dict | None = None,
                              inverse_action: dict | None = None, status: str = "succeeded",
                              error_code: str | None = None, duration_ms: int = 0) -> dict:
        with self.connect() as connection:
            connection.execute(
                """INSERT OR IGNORE INTO action_executions(idempotency_key,user_id,action_type,result_json,status,
                   action_payload_json,inverse_action_json,error_code,duration_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (key, user_id, action_type, json.dumps(result, ensure_ascii=False), status,
                 json.dumps(action_payload or {}, ensure_ascii=False), json.dumps(inverse_action, ensure_ascii=False) if inverse_action else None,
                 error_code, duration_ms, datetime.now(timezone.utc).isoformat()),
            )
        return result

    def action_history(self, user_id: str, limit: int = 50, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute("SELECT * FROM action_executions WHERE user_id=? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
        return [{**dict(row), "result": json.loads(row["result_json"]), "action_payload": json.loads(row["action_payload_json"] or "{}"),
                 "inverse_action": json.loads(row["inverse_action_json"]) if row["inverse_action_json"] else None} for row in rows]

    def mark_action_undone(self, user_id: str, key: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("UPDATE action_executions SET status='undone',undone_at=? WHERE user_id=? AND idempotency_key=? AND status='succeeded'",
                               (datetime.now(timezone.utc).isoformat(), user_id, key))

    def remove_library_entry(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM user_books WHERE user_id=? AND book_id=?", (user_id, book_id))

    def delete_session(self, token: str | None) -> None:
        if not token:
            return
        with self.connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode("utf-8")).hexdigest(),))

    def close_session(self, access_token: str | None, refresh_token: str | None = None) -> None:
        self.delete_session(access_token)

    def user_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM user_preferences WHERE user_id=?", (user_id,)
            ).fetchone()
        if not row:
            return {
                "user_id": user_id,
                "personality_text": "",
                "selected_traits": [],
                "preferred_genres": [],
                "disliked_genres": [],
                "liked_styles": [], "disliked_styles": [],
                "pace_preference": None, "focus_preference": None, "tone_preference": None,
                "violence_sensitivity": 0, "romance_sensitivity": 0,
                "spoiler_sensitivity": 2, "length_preference": None,
                "updated_at": None,
            }
        return {
            "user_id": row["user_id"],
            "personality_text": row["personality_text"],
            "selected_traits": json.loads(row["selected_traits_json"]),
            "preferred_genres": json.loads(row["preferred_genres_json"]),
            "disliked_genres": json.loads(row["disliked_genres_json"]),
            "liked_styles": json.loads(row["liked_styles_json"] or "[]"),
            "disliked_styles": json.loads(row["disliked_styles_json"] or "[]"),
            "pace_preference": row["pace_preference"], "focus_preference": row["focus_preference"],
            "tone_preference": row["tone_preference"], "violence_sensitivity": row["violence_sensitivity"],
            "romance_sensitivity": row["romance_sensitivity"], "spoiler_sensitivity": row["spoiler_sensitivity"],
            "length_preference": row["length_preference"],
            "updated_at": row["updated_at"],
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
        updated_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            connection.execute(
                """INSERT INTO user_preferences(
                       user_id,personality_text,selected_traits_json,preferred_genres_json,
                       disliked_genres_json,liked_styles_json,disliked_styles_json,pace_preference,
                       focus_preference,tone_preference,violence_sensitivity,romance_sensitivity,
                       spoiler_sensitivity,length_preference,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(user_id) DO UPDATE SET
                       personality_text=excluded.personality_text,
                       selected_traits_json=excluded.selected_traits_json,
                       preferred_genres_json=excluded.preferred_genres_json,
                       disliked_genres_json=excluded.disliked_genres_json,
                       liked_styles_json=excluded.liked_styles_json,disliked_styles_json=excluded.disliked_styles_json,
                       pace_preference=excluded.pace_preference,focus_preference=excluded.focus_preference,
                       tone_preference=excluded.tone_preference,violence_sensitivity=excluded.violence_sensitivity,
                       romance_sensitivity=excluded.romance_sensitivity,spoiler_sensitivity=excluded.spoiler_sensitivity,
                       length_preference=excluded.length_preference,
                       updated_at=excluded.updated_at""",
                (
                    user_id,
                    personality_text.strip(),
                    json.dumps(selected_traits, ensure_ascii=False),
                    json.dumps(preferred_genres, ensure_ascii=False),
                    json.dumps(disliked_genres, ensure_ascii=False),
                    json.dumps(liked_styles or [], ensure_ascii=False), json.dumps(disliked_styles or [], ensure_ascii=False),
                    pace_preference, focus_preference, tone_preference, violence_sensitivity,
                    romance_sensitivity, spoiler_sensitivity, length_preference,
                    updated_at,
                ),
            )
        return self.user_preferences(user_id)

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
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        updated_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            target_book = connection.execute("SELECT title,author FROM books WHERE id=?", (book_id,)).fetchone()
            if not target_book:
                raise KeyError("Kitap bulunamadı.")
            previous = connection.execute(
                "SELECT current_page,started_at,finished_at FROM user_books WHERE user_id=? AND book_id=?",
                (user_id, book_id),
            ).fetchone()
            target_key = canonical_work_key(target_book["title"], target_book["author"])
            other_catalog = connection.execute(
                """SELECT b.title,b.author FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.book_id<>?""", (user_id, book_id),
            ).fetchall()
            custom_books = connection.execute(
                "SELECT title,author FROM user_custom_books WHERE user_id=?", (user_id,),
            ).fetchall()
            if not previous and any(canonical_work_key(row["title"], row["author"]) == target_key
                                    for row in [*other_catalog, *custom_books]):
                raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")
            previous_page = previous["current_page"] if previous else 0
            started_at = previous["started_at"] if previous else None
            finished_at = previous["finished_at"] if previous else None
            if shelf in {"reading", "read"} and not started_at:
                started_at = updated_at
            if shelf == "read" and not finished_at:
                finished_at = updated_at
            if shelf != "read":
                finished_at = None
            connection.execute(
                """INSERT INTO user_books(
                       user_id,book_id,shelf,is_favorite,current_page,total_pages,
                       started_at,finished_at,abandonment_reason,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET
                       shelf=excluded.shelf,is_favorite=excluded.is_favorite,
                       current_page=excluded.current_page,total_pages=excluded.total_pages,
                       started_at=excluded.started_at,finished_at=excluded.finished_at,
                       abandonment_reason=excluded.abandonment_reason,
                       updated_at=excluded.updated_at""",
                (
                    user_id, book_id, shelf, int(is_favorite), current_page, total_pages,
                    started_at, finished_at, abandonment_reason if shelf == "abandoned" else None, updated_at,
                ),
            )
            pages_read = max(0, current_page - previous_page)
            if pages_read:
                connection.execute(
                    """INSERT INTO reading_activity(
                           id,user_id,book_id,activity_date,pages_read,created_at
                       ) VALUES(?,?,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, date.today().isoformat(), pages_read, updated_at),
                )
        return {
            "user_id": user_id, "book_id": book_id, "shelf": shelf,
            "is_favorite": is_favorite, "current_page": current_page,
            "total_pages": total_pages,
            "progress_percent": round(current_page / total_pages * 100, 1) if total_pages else 0,
            "started_at": started_at, "finished_at": finished_at, "updated_at": updated_at,
            "abandonment_reason": abandonment_reason if shelf == "abandoned" else None,
        }

    def user_profile(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            user = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if not user:
                raise KeyError("Kullanıcı bulunamadı.")
            rows = connection.execute(
                """SELECT b.*, ub.shelf, ub.is_favorite,ub.current_page,ub.total_pages,
                          ub.started_at,ub.finished_at,ub.abandonment_reason,ub.updated_at library_updated_at
                   FROM user_books ub
                   JOIN books b ON b.id=ub.book_id WHERE ub.user_id=? ORDER BY b.title""", (user_id,),
            ).fetchall()
            custom_rows = connection.execute(
                "SELECT * FROM user_custom_books WHERE user_id=? ORDER BY title", (user_id,)
            ).fetchall()
        entries = [{
            **self._book(row), "shelf": row["shelf"], "is_favorite": bool(row["is_favorite"]),
            "current_page": row["current_page"], "total_pages": row["total_pages"],
            "progress_percent": round(row["current_page"] / row["total_pages"] * 100, 1)
            if row["total_pages"] else 0,
            "started_at": row["started_at"], "finished_at": row["finished_at"],
            "abandonment_reason": row["abandonment_reason"],
            "library_updated_at": row["library_updated_at"],
        } for row in rows]
        entries.extend(self._custom_book(row) for row in custom_rows)
        entries = deduplicate_library_entries(entries)
        feedback = self.recommendation_feedback(user_id)
        feedback_ids = {item["book_id"] for item in feedback}
        return {
            "user": dict(user),
            "read_books": [item for item in entries if item["shelf"] == "read"],
            "reading_books": [item for item in entries if item["shelf"] == "reading"],
            "to_read_books": [item for item in entries if item["shelf"] == "to_read"],
            "abandoned_books": [item for item in entries if item["shelf"] == "abandoned"],
            "favorite_books": [item for item in entries if item["is_favorite"]],
            "recommendation_feedback": feedback,
            "feedback_books": [book for book in self.list_books() if book["id"] in feedback_ids],
        }

    @staticmethod
    def _custom_book(row: sqlite3.Row | dict) -> dict:
        item = dict(row)
        total_pages = item.get("total_pages")
        return {
            "id": item["id"], "title": item["title"], "author": item["author"],
            "genre": item["genre"], "themes": [item["genre"]], "character_traits": [],
            "description": "Kullanıcının kişisel kitaplığına eklediği kitap.",
            "source_name": "user_custom", "source_url": None,
            "cover_url": item.get("cover_url"), "series_name": None, "series_index": None,
            "is_custom": True, "shelf": item["shelf"],
            "is_favorite": bool(item["is_favorite"]), "current_page": item["current_page"],
            "total_pages": total_pages,
            "progress_percent": round(item["current_page"] / total_pages * 100, 1) if total_pages else 0,
            "started_at": item.get("started_at"), "finished_at": item.get("finished_at"),
            "library_updated_at": item.get("updated_at"),
        }

    def save_custom_book(
        self, user_id: str, title: str, author: str, genre: str, cover_url: str | None,
        shelf: str, is_favorite: bool, current_page: int = 0,
        total_pages: int | None = None, custom_book_id: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        now = datetime.now(timezone.utc).isoformat()
        book_id = custom_book_id or str(uuid4())
        with self.connect() as connection:
            previous = connection.execute(
                "SELECT * FROM user_custom_books WHERE id=? AND user_id=?", (book_id, user_id)
            ).fetchone()
            if custom_book_id and not previous:
                raise KeyError("Kişisel kitap bulunamadı.")
            target_key = canonical_work_key(title.strip(), author.strip() or "Bilinmeyen yazar")
            custom_matches = connection.execute(
                "SELECT id,title,author FROM user_custom_books WHERE user_id=? AND id<>?",
                (user_id, book_id),
            ).fetchall()
            catalog_matches = connection.execute(
                """SELECT b.title,b.author FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=?""", (user_id,),
            ).fetchall()
            unchanged_existing = previous and canonical_work_key(previous["title"], previous["author"]) == target_key
            if not unchanged_existing and any(canonical_work_key(row["title"], row["author"]) == target_key
                                              for row in [*custom_matches, *catalog_matches]):
                raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")
            previous_page = previous["current_page"] if previous else 0
            started_at = previous["started_at"] if previous else None
            finished_at = previous["finished_at"] if previous else None
            if shelf in {"reading", "read"} and not started_at:
                started_at = now
            finished_at = (finished_at or now) if shelf == "read" else None
            connection.execute(
                """INSERT INTO user_custom_books(
                       id,user_id,title,author,genre,cover_url,shelf,is_favorite,current_page,
                       total_pages,started_at,finished_at,created_at,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author,
                       genre=excluded.genre,cover_url=excluded.cover_url,shelf=excluded.shelf,
                       is_favorite=excluded.is_favorite,current_page=excluded.current_page,
                       total_pages=excluded.total_pages,started_at=excluded.started_at,
                       finished_at=excluded.finished_at,updated_at=excluded.updated_at""",
                (book_id, user_id, title.strip(), author.strip() or "Bilinmeyen yazar",
                 genre.strip() or "Genel", cover_url or None, shelf, int(is_favorite),
                 current_page, total_pages, started_at, finished_at,
                 previous["created_at"] if previous else now, now),
            )
            pages_read = max(0, current_page - previous_page)
            if pages_read:
                connection.execute(
                    """INSERT INTO reading_activity(
                           id,user_id,book_id,custom_book_id,activity_date,pages_read,created_at
                       ) VALUES(?,?,NULL,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, date.today().isoformat(), pages_read, now),
                )
            row = connection.execute("SELECT * FROM user_custom_books WHERE id=?", (book_id,)).fetchone()
        return self._custom_book(row)

    def delete_custom_book(
        self, user_id: str, custom_book_id: str, access_token: str | None = None,
    ) -> None:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM user_custom_books WHERE id=? AND user_id=?", (custom_book_id, user_id)
            )
            if not cursor.rowcount:
                raise KeyError("Kişisel kitap bulunamadı.")

    def upsert_reading_goal(
        self, user_id: str, goal_year: int, target_books: int,
        access_token: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanici bulunamadi.")
            connection.execute(
                """INSERT INTO reading_goals(user_id,goal_year,target_books,created_at,updated_at)
                   VALUES(?,?,?,?,?)
                   ON CONFLICT(user_id,goal_year) DO UPDATE SET
                   target_books=excluded.target_books,updated_at=excluded.updated_at""",
                (user_id, goal_year, target_books, now, now),
            )
        return {
            "user_id": user_id, "goal_year": goal_year,
            "target_books": target_books, "updated_at": now,
        }

    @staticmethod
    def _reading_streaks(activity_days: list[date]) -> tuple[int, int]:
        unique_days = sorted(set(activity_days))
        if not unique_days:
            return 0, 0
        longest = run = 1
        for previous, current in zip(unique_days, unique_days[1:]):
            run = run + 1 if current - previous == timedelta(days=1) else 1
            longest = max(longest, run)
        last_day = unique_days[-1]
        if date.today() - last_day > timedelta(days=1):
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
        with self.connect() as connection:
            goal = connection.execute(
                "SELECT target_books FROM reading_goals WHERE user_id=? AND goal_year=?",
                (user_id, year),
            ).fetchone()
            completed_books = connection.execute(
                """SELECT count(*) count FROM user_books
                   WHERE user_id=? AND shelf='read' AND substr(finished_at,1,4)=?""",
                (user_id, str(year)),
            ).fetchone()["count"] + connection.execute(
                """SELECT count(*) count FROM user_custom_books
                   WHERE user_id=? AND shelf='read' AND substr(finished_at,1,4)=?""",
                (user_id, str(year)),
            ).fetchone()["count"]
            activity_rows = connection.execute(
                """SELECT activity_date,sum(pages_read) pages_read,
                          count(distinct coalesce(book_id,custom_book_id)) books
                   FROM reading_activity WHERE user_id=? AND substr(activity_date,1,4)=?
                   GROUP BY activity_date ORDER BY activity_date""",
                (user_id, str(year)),
            ).fetchall()
            genre_rows = connection.execute(
                """SELECT b.genre,count(*) count FROM user_books ub
                   JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.shelf='read'
                   GROUP BY b.genre ORDER BY count DESC,b.genre""",
                (user_id,),
            ).fetchall()
            custom_genre_rows = connection.execute(
                """SELECT genre,count(*) count FROM user_custom_books
                   WHERE user_id=? AND shelf='read' GROUP BY genre""", (user_id,)
            ).fetchall()
            series_rows = connection.execute(
                """SELECT b.series_name,count(distinct b.id) total_books,
                          count(distinct case when ub.shelf='read' then b.id end) read_books
                   FROM books b LEFT JOIN user_books ub
                     ON ub.book_id=b.id AND ub.user_id=?
                   WHERE b.series_name is not null AND trim(b.series_name)<>''
                   GROUP BY b.series_name ORDER BY b.series_name""",
                (user_id,),
            ).fetchall()
            current_rows = connection.execute(
                """SELECT b.*,ub.current_page,ub.total_pages,ub.started_at
                   FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.shelf='reading'
                   ORDER BY ub.updated_at DESC""",
                (user_id,),
            ).fetchall()
            custom_current_rows = connection.execute(
                """SELECT * FROM user_custom_books WHERE user_id=? AND shelf='reading'
                   ORDER BY updated_at DESC""", (user_id,)
            ).fetchall()
        calendar = [dict(row) for row in activity_rows]
        activity_days = [date.fromisoformat(row["activity_date"]) for row in activity_rows]
        current_streak, longest_streak = self._reading_streaks(activity_days)
        target_books = goal["target_books"] if goal else 12
        currently_reading = []
        for row in current_rows:
            book = self._book(row)
            total_pages = row["total_pages"]
            currently_reading.append({
                **book,
                "current_page": row["current_page"],
                "total_pages": total_pages,
                "progress_percent": round(row["current_page"] / total_pages * 100, 1)
                if total_pages else 0,
                "started_at": row["started_at"],
            })
        currently_reading.extend(self._custom_book(row) for row in custom_current_rows)
        genre_counts = {row["genre"]: row["count"] for row in genre_rows}
        for row in custom_genre_rows:
            genre_counts[row["genre"]] = genre_counts.get(row["genre"], 0) + row["count"]
        return {
            "year": year,
            "goal": {
                "target_books": target_books,
                "completed_books": completed_books,
                "progress_percent": round(min(1, completed_books / target_books) * 100, 1),
                "is_default": goal is None,
            },
            "total_pages_read": sum(row["pages_read"] for row in activity_rows),
            "active_days": len(activity_rows),
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "calendar": calendar,
            "genre_distribution": [
                {"genre": genre, "count": count}
                for genre, count in sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "series_progress": [{
                **dict(row),
                "progress_percent": round(row["read_books"] / row["total_books"] * 100, 1),
            } for row in series_rows],
            "currently_reading": currently_reading,
        }

    def gamification_summary(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            stats = {
                "library_books": connection.execute(
                    "SELECT (SELECT count(*) FROM user_books WHERE user_id=?) + (SELECT count(*) FROM user_custom_books WHERE user_id=?)",
                    (user_id, user_id),
                ).fetchone()[0],
                "read_books": connection.execute(
                    "SELECT (SELECT count(*) FROM user_books WHERE user_id=? AND shelf='read') + (SELECT count(*) FROM user_custom_books WHERE user_id=? AND shelf='read')",
                    (user_id, user_id),
                ).fetchone()[0],
                "published_comments": connection.execute(
                    "SELECT count(*) FROM book_comments WHERE user_id=? AND status='published'", (user_id,)
                ).fetchone()[0],
                "ratings": connection.execute(
                    "SELECT count(*) FROM book_ratings WHERE user_id=?", (user_id,)
                ).fetchone()[0],
                "active_days": connection.execute(
                    "SELECT count(distinct activity_date) FROM reading_activity WHERE user_id=?", (user_id,)
                ).fetchone()[0],
                "read_genres": connection.execute(
                    """SELECT count(distinct genre) FROM (
                         SELECT b.genre genre FROM user_books ub JOIN books b ON b.id=ub.book_id
                         WHERE ub.user_id=? AND ub.shelf='read'
                         UNION ALL
                         SELECT genre FROM user_custom_books WHERE user_id=? AND shelf='read'
                       ) WHERE trim(coalesce(genre,''))<>''""",
                    (user_id, user_id),
                ).fetchone()[0],
                "completed_goals": connection.execute(
                    """SELECT count(*) FROM reading_goals g WHERE g.user_id=? AND g.target_books <=
                       ((SELECT count(*) FROM user_books ub WHERE ub.user_id=g.user_id AND ub.shelf='read' AND substr(ub.finished_at,1,4)=cast(g.goal_year as text)) +
                        (SELECT count(*) FROM user_custom_books cb WHERE cb.user_id=g.user_id AND cb.shelf='read' AND substr(cb.finished_at,1,4)=cast(g.goal_year as text)))""",
                    (user_id,),
                ).fetchone()[0],
            }
            activity_dates = [
                date.fromisoformat(row[0]) for row in connection.execute(
                    "SELECT distinct activity_date FROM reading_activity WHERE user_id=? ORDER BY activity_date", (user_id,)
                )
            ]
            stats["longest_streak"] = self._reading_streaks(activity_dates)[1]
            qualified = earned_badge_codes(stats)
            existing = {row["badge_code"] for row in connection.execute(
                "SELECT badge_code FROM user_badges WHERE user_id=?", (user_id,)
            )}
            new_codes = qualified - existing
            revoked = existing - qualified
            if revoked:
                placeholders = ",".join("?" for _ in revoked)
                connection.execute(
                    f"DELETE FROM user_badges WHERE user_id=? AND badge_code IN ({placeholders})",
                    (user_id, *sorted(revoked)),
                )
            now = datetime.now(timezone.utc).isoformat()
            for code in qualified:
                connection.execute(
                    "INSERT OR IGNORE INTO user_badges(user_id,badge_code,earned_at) VALUES(?,?,?)",
                    (user_id, code, now),
                )
            showcase = [row["badge_code"] for row in connection.execute(
                "SELECT badge_code FROM user_badge_showcase WHERE user_id=? ORDER BY slot", (user_id,)
            )]
            if not showcase and new_codes:
                for rule in BADGE_RULES:
                    if len(showcase) >= 3:
                        break
                    if rule.code in qualified:
                        showcase.append(rule.code)
                        connection.execute(
                            "INSERT INTO user_badge_showcase(user_id,slot,badge_code,updated_at) VALUES(?,?,?,?)",
                            (user_id, len(showcase), rule.code, now),
                        )
            earned_rows = [dict(row) for row in connection.execute(
                "SELECT badge_code,earned_at FROM user_badges WHERE user_id=? ORDER BY earned_at", (user_id,)
            )]
        return build_gamification_summary(stats, earned_rows, showcase)

    def update_badge_showcase(self, user_id: str, badge_codes: list[str], access_token: str | None = None) -> dict:
        codes = list(dict.fromkeys(badge_codes))
        if len(codes) != len(badge_codes) or len(codes) > 3:
            raise ValueError("Vitrinde en fazla üç farklı rozet gösterilebilir.")
        current = self.gamification_summary(user_id)
        earned = {badge["code"] for badge in current["badges"] if badge["earned"]}
        if any(code not in earned for code in codes):
            raise ValueError("Yalnızca kazanılmış rozetler vitrine eklenebilir.")
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute("DELETE FROM user_badge_showcase WHERE user_id=?", (user_id,))
            connection.executemany(
                "INSERT INTO user_badge_showcase(user_id,slot,badge_code,updated_at) VALUES(?,?,?,?)",
                [(user_id, slot, code, now) for slot, code in enumerate(codes, 1)],
            )
        return self.gamification_summary(user_id)

    def upsert_price_alert(
        self, user_id: str, book_id: str, target_price_minor: int,
        currency: str = "TRY", is_active: bool = True,
        access_token: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
                raise KeyError("Kitap bulunamadi.")
            connection.execute(
                """INSERT INTO price_alerts(
                       user_id,book_id,target_price_minor,currency,is_active,created_at,updated_at
                   ) VALUES(?,?,?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET
                       target_price_minor=excluded.target_price_minor,
                       currency=excluded.currency,is_active=excluded.is_active,
                       last_notified_price_minor=NULL,updated_at=excluded.updated_at""",
                (user_id, book_id, target_price_minor, currency, int(is_active), now, now),
            )
        alerts = self.list_price_alerts(user_id)
        return next(alert for alert in alerts if alert["book_id"] == book_id)

    def list_price_alerts(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT a.*,b.title,b.author,b.cover_url,
                          (SELECT min(o.price_minor) FROM editions e JOIN offers o
                           ON o.edition_isbn=e.isbn
                           WHERE e.book_id=a.book_id AND o.stock_status='in_stock'
                             AND o.currency=a.currency) current_price_minor
                   FROM price_alerts a JOIN books b ON b.id=a.book_id
                   WHERE a.user_id=? ORDER BY a.updated_at DESC""",
                (user_id,),
            ).fetchall()
        return [{**dict(row), "is_active": bool(row["is_active"])} for row in rows]

    def delete_price_alert(
        self, user_id: str, book_id: str, access_token: str | None = None,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                "DELETE FROM price_alerts WHERE user_id=? AND book_id=?", (user_id, book_id)
            )

    def list_notifications(
        self, user_id: str, access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT n.*,b.cover_url FROM notifications n
                   LEFT JOIN books b ON b.id=n.book_id
                   WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 100""",
                (user_id,),
            ).fetchall()
        return [{
            **dict(row), "payload": json.loads(row["payload_json"] or "{}")
        } for row in rows]

    def upsert_web_push_subscription(self, user_id: str, endpoint: str, p256dh: str,
                                     auth: str, user_agent: str | None = None,
                                     access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO web_push_subscriptions(id,user_id,endpoint,p256dh,auth,user_agent,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET
                   user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,
                   user_agent=excluded.user_agent,updated_at=excluded.updated_at""",
                (str(uuid4()), user_id, endpoint, p256dh, auth, user_agent, now, now),
            )
            row = connection.execute(
                "SELECT * FROM web_push_subscriptions WHERE endpoint=? AND user_id=?",
                (endpoint, user_id),
            ).fetchone()
        return dict(row)

    def delete_web_push_subscription(self, user_id: str, endpoint: str,
                                     access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "DELETE FROM web_push_subscriptions WHERE user_id=? AND endpoint=?",
                (user_id, endpoint),
            )

    def list_web_push_subscriptions(self, user_id: str) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(
                "SELECT * FROM web_push_subscriptions WHERE user_id=?", (user_id,)
            ).fetchall()]

    def user_email(self, user_id: str) -> str | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT email FROM auth_accounts WHERE user_id=?", (user_id,)
            ).fetchone()
        return row["email"] if row else None

    def claim_due_reminders(self, now: str, limit: int = 100) -> list[dict]:
        claimed = []
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM reminder_deliveries WHERE status='pending' AND scheduled_for<=? ORDER BY scheduled_for LIMIT ?",
                (now, limit),
            ).fetchall()
            for row in rows:
                cursor = connection.execute(
                    "UPDATE reminder_deliveries SET status='processing',attempts=attempts+1 WHERE id=? AND status='pending'",
                    (row["id"],),
                )
                if cursor.rowcount:
                    book = connection.execute("SELECT title FROM books WHERE id=?", (row["book_id"],)).fetchone()
                    claimed.append({**dict(row), "attempts": row["attempts"] + 1,
                                    "book_title": book["title"] if book else "Kitabın"})
        return claimed

    def finish_reminder(self, reminder_id: str, success: bool, error: str | None = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                "SELECT attempts FROM reminder_deliveries WHERE id=? AND status='processing'",
                (reminder_id,),
            ).fetchone()
            if not row:
                return
            retry = not success and row["attempts"] < 3
            next_attempt = (datetime.now(timezone.utc) + timedelta(minutes=5 * (2 ** max(0, row["attempts"] - 1)))).isoformat()
            connection.execute(
                "UPDATE reminder_deliveries SET status=?,scheduled_for=?,sent_at=?,last_error=? WHERE id=? AND status='processing'",
                ("sent" if success else "pending" if retry else "dead_letter",
                 next_attempt if retry else now, now if success else None,
                 error[:500] if error else None, reminder_id),
            )

    def create_reminder_notification(self, user_id: str, book_id: str, title: str, body: str) -> None:
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO notifications(id,user_id,kind,book_id,title,body,payload_json,created_at)
                   VALUES(?,?,?,?,?,?,'{}',?)""",
                (str(uuid4()), user_id, "reading_reminder", book_id, title, body,
                 datetime.now(timezone.utc).isoformat()),
            )

    def mark_notification_read(
        self, user_id: str, notification_id: str, access_token: str | None = None,
    ) -> dict:
        read_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "UPDATE notifications SET read_at=? WHERE id=? AND user_id=?",
                (read_at, notification_id, user_id),
            )
            row = connection.execute(
                "SELECT * FROM notifications WHERE id=? AND user_id=?",
                (notification_id, user_id),
            ).fetchone()
        if not row:
            raise KeyError("Bildirim bulunamadi.")
        return dict(row)

    def mark_all_notifications_read(self, user_id: str, access_token: str | None = None) -> int:
        read_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
                (read_at, user_id),
            )
        return cursor.rowcount

    def evaluate_price_alerts(self) -> int:
        now = datetime.now(timezone.utc).isoformat()
        notifications_created = 0
        with self.connect() as connection:
            candidates = connection.execute(
                """SELECT a.user_id,a.book_id,a.target_price_minor,a.currency,
                          a.last_notified_price_minor,b.title,min(o.price_minor) current_price_minor
                   FROM price_alerts a JOIN books b ON b.id=a.book_id
                   JOIN editions e ON e.book_id=a.book_id
                   JOIN offers o ON o.edition_isbn=e.isbn
                   WHERE a.is_active=1 AND o.stock_status='in_stock' AND o.currency=a.currency
                   GROUP BY a.user_id,a.book_id,a.target_price_minor,a.currency,
                            a.last_notified_price_minor,b.title
                   HAVING current_price_minor<=a.target_price_minor AND
                          (a.last_notified_price_minor IS NULL OR
                           current_price_minor<a.last_notified_price_minor)"""
            ).fetchall()
            for candidate in candidates:
                payload = {
                    "price_minor": candidate["current_price_minor"],
                    "target_price_minor": candidate["target_price_minor"],
                    "currency": candidate["currency"],
                }
                connection.execute(
                    """INSERT INTO notifications(
                           id,user_id,kind,book_id,title,body,payload_json,created_at
                       ) VALUES(?,?,?,?,?,?,?,?)""",
                    (
                        str(uuid4()), candidate["user_id"], "price_drop", candidate["book_id"],
                        "Fiyat hedefinize ulasti",
                        f"{candidate['title']} icin yeni bir fiyat bulundu.",
                        json.dumps(payload, ensure_ascii=False), now,
                    ),
                )
                connection.execute(
                    """UPDATE price_alerts SET last_notified_price_minor=?,updated_at=?
                       WHERE user_id=? AND book_id=?""",
                    (
                        candidate["current_price_minor"], now,
                        candidate["user_id"], candidate["book_id"],
                    ),
                )
                notifications_created += 1
        return notifications_created

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

    def create_chat_session(self, user_id: str, title: str = "Yeni sohbet",
                            access_token: str | None = None) -> dict:
        now, session_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO chat_sessions(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                (session_id, user_id, title[:120] or "Yeni sohbet", now, now),
            )
        return {"id": session_id, "user_id": user_id, "title": title[:120] or "Yeni sohbet", "summary": "", "created_at": now, "updated_at": now}

    def list_chat_sessions(self, user_id: str, access_token: str | None = None,
                           query: str | None = None, archived: bool = False) -> list[dict]:
        with self.connect() as connection:
            sql = "SELECT * FROM chat_sessions WHERE user_id=? AND is_archived=?"
            values: list = [user_id, int(archived)]
            if query:
                sql += " AND (title LIKE ? OR summary LIKE ?)"
                values.extend([f"%{query}%", f"%{query}%"])
            sql += " ORDER BY is_pinned DESC,updated_at DESC LIMIT 50"
            return [dict(row) for row in connection.execute(sql, values)]

    def chat_messages(self, user_id: str, session_id: str, limit: int = 50,
                      access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT m.* FROM chat_messages m JOIN chat_sessions s ON s.id=m.session_id
                   WHERE m.session_id=? AND s.user_id=? ORDER BY m.created_at DESC LIMIT ?""",
                (session_id, user_id, limit),
            ).fetchall()
        return [{**dict(row), "books": json.loads(row["books_json"] or "[]"),
                 "citations": json.loads(row["citations_json"] or "[]")} for row in reversed(rows)]

    def save_chat_message(self, user_id: str, session_id: str, role: str, content: str,
                          books: list[dict] | None = None, access_token: str | None = None) -> dict:
        now, message_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            session = connection.execute(
                "SELECT * FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id)
            ).fetchone()
            if not session:
                raise KeyError("Sohbet bulunamadı.")
            citations = [{"book_id": book.get("id"), "title": book.get("title"), "author": book.get("author")} for book in (books or [])]
            connection.execute(
                "INSERT INTO chat_messages(id,session_id,user_id,role,content,books_json,citations_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
                (message_id, session_id, user_id, role, content, json.dumps(books or [], ensure_ascii=False), json.dumps(citations, ensure_ascii=False), now),
            )
            title = session["title"]
            if title == "Yeni sohbet" and role == "user":
                title = content.strip()[:60]
            summary_rows = connection.execute(
                "SELECT role,content FROM chat_messages WHERE session_id=? ORDER BY created_at DESC LIMIT 6", (session_id,)
            ).fetchall()
            summary = " | ".join(f"{row['role']}: {row['content'][:180]}" for row in reversed(summary_rows))[:1200]
            connection.execute("UPDATE chat_sessions SET title=?,summary=?,updated_at=? WHERE id=?", (title, summary, now, session_id))
        return {"id": message_id, "session_id": session_id, "role": role, "content": content, "books": books or [], "created_at": now}

    def update_chat_session(self, user_id: str, session_id: str, changes: dict, access_token: str | None = None) -> dict:
        allowed = {"title", "is_pinned", "is_archived"}
        values = {key: int(value) if key.startswith("is_") else value for key, value in changes.items() if key in allowed and value is not None}
        if not values:
            raise ValueError("Güncellenecek alan yok.")
        values["updated_at"] = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(f"UPDATE chat_sessions SET {','.join(f'{key}=?' for key in values)} WHERE id=? AND user_id=?", [*values.values(), session_id, user_id])
            row = connection.execute("SELECT * FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id)).fetchone()
        if not row:
            raise KeyError("Sohbet bulunamadı.")
        return dict(row)

    def update_chat_message(self, user_id: str, message_id: str, content: str | None, delete: bool = False,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if delete:
                connection.execute("UPDATE chat_messages SET content='',deleted_at=? WHERE id=? AND user_id=?", (now, message_id, user_id))
            else:
                connection.execute("UPDATE chat_messages SET content=?,edited_at=? WHERE id=? AND user_id=?", (content, now, message_id, user_id))
            row = connection.execute("SELECT * FROM chat_messages WHERE id=? AND user_id=?", (message_id, user_id)).fetchone()
        if not row:
            raise KeyError("Mesaj bulunamadı.")
        return dict(row)

    def delete_chat_session(self, user_id: str, session_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id))
            if not cursor.rowcount:
                raise KeyError("Sohbet bulunamadı.")

    def upsert_reading_plan(self, user_id: str, book_id: str, target_date: str,
                            reminder_enabled: bool = False, access_token: str | None = None,
                            reminder_time: str = "20:00", timezone: str = "Europe/Istanbul",
                            excluded_weekdays: list[int] | None = None, weekday_pages: int | None = None,
                            weekend_pages: int | None = None, delivery_channel: str = "in_app") -> dict:
        target = date.fromisoformat(target_date)
        now = datetime.now(UTC).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                """SELECT b.page_count,coalesce(ub.current_page,0) current_page FROM books b
                   LEFT JOIN user_books ub ON ub.book_id=b.id AND ub.user_id=? WHERE b.id=?""",
                (user_id, book_id),
            ).fetchone()
            if not row:
                raise KeyError("Kitap bulunamadı.")
            remaining = max(1, (row["page_count"] or 1) - row["current_page"])
            schedule = build_schedule(remaining, target, excluded_weekdays or [], weekday_pages, weekend_pages)
            daily_pages = max(1, (remaining + len(schedule) - 1) // len(schedule))
            connection.execute(
                """INSERT INTO reading_plans(user_id,book_id,target_date,daily_pages,reminder_enabled,reminder_time,timezone,
                   excluded_weekdays_json,weekday_pages,weekend_pages,delivery_channel,status,updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,'active',?) ON CONFLICT(user_id,book_id) DO UPDATE SET target_date=excluded.target_date,
                   daily_pages=excluded.daily_pages,reminder_enabled=excluded.reminder_enabled,reminder_time=excluded.reminder_time,
                   timezone=excluded.timezone,excluded_weekdays_json=excluded.excluded_weekdays_json,weekday_pages=excluded.weekday_pages,
                   weekend_pages=excluded.weekend_pages,delivery_channel=excluded.delivery_channel,status='active',updated_at=excluded.updated_at""",
                (user_id, book_id, target_date, daily_pages, int(reminder_enabled), reminder_time, timezone,
                 json.dumps(excluded_weekdays or []), weekday_pages, weekend_pages, delivery_channel, now),
            )
            connection.execute("DELETE FROM reading_plan_days WHERE user_id=? AND book_id=? AND completed_pages=0", (user_id, book_id))
            for day in schedule:
                connection.execute("""INSERT INTO reading_plan_days(id,user_id,book_id,plan_date,planned_pages,completed_pages,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,book_id,plan_date) DO UPDATE SET planned_pages=excluded.planned_pages,updated_at=excluded.updated_at""",
                    (str(uuid4()), user_id, book_id, day["plan_date"], day["planned_pages"], 0, now, now))
            if reminder_enabled:
                for day in schedule:
                    key = f"reading:{user_id}:{book_id}:{day['plan_date']}:{reminder_time}:{delivery_channel}"
                    connection.execute("""INSERT OR IGNORE INTO reminder_deliveries(id,user_id,book_id,scheduled_for,channel,status,attempts,idempotency_key,created_at)
                        VALUES(?,?,?,?,?,'pending',0,?,?)""", (str(uuid4()), user_id, book_id, reminder_datetime_utc(day["plan_date"], reminder_time, timezone), delivery_channel, key, now))
        return {"user_id": user_id, "book_id": book_id, "target_date": target_date, "daily_pages": daily_pages,
                "reminder_enabled": reminder_enabled, "reminder_time": reminder_time, "timezone": timezone,
                "delivery_channel": delivery_channel, "schedule": schedule, **schedule_summary(schedule), "updated_at": now}

    def list_reading_plans(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(
                """SELECT rp.*,b.title,b.author,b.page_count,coalesce(ub.current_page,0) current_page
                   FROM reading_plans rp JOIN books b ON b.id=rp.book_id
                   LEFT JOIN user_books ub ON ub.user_id=rp.user_id AND ub.book_id=rp.book_id
                   WHERE rp.user_id=? ORDER BY rp.target_date""", (user_id,)
            )]

    def reading_plan_calendar(self, user_id: str, start: str, end: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute("""SELECT d.*,b.title,b.author FROM reading_plan_days d
                JOIN books b ON b.id=d.book_id WHERE d.user_id=? AND d.plan_date BETWEEN ? AND ? ORDER BY d.plan_date,b.title""", (user_id, start, end))]

    def set_reading_plan_status(self, user_id: str, book_id: str, status: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            connection.execute("UPDATE reading_plans SET status=?,updated_at=? WHERE user_id=? AND book_id=?",
                               (status, datetime.now(timezone.utc).isoformat(), user_id, book_id))
            row = connection.execute("SELECT * FROM reading_plans WHERE user_id=? AND book_id=?", (user_id, book_id)).fetchone()
        if not row:
            raise KeyError("Okuma planı bulunamadı.")
        return dict(row)

    def compare_books(self, book_ids: list[str], user_id: str | None = None,
                      access_token: str | None = None) -> list[dict]:
        placeholders = ",".join("?" for _ in book_ids)
        with self.connect() as connection:
            rows = connection.execute(f"SELECT * FROM books WHERE id IN ({placeholders})", book_ids).fetchall()
            price_rows = connection.execute(
                f"""SELECT e.book_id,min(o.price_minor) price_minor FROM editions e JOIN offers o ON o.edition_isbn=e.isbn
                    WHERE e.book_id IN ({placeholders}) AND o.stock_status='in_stock' GROUP BY e.book_id""", book_ids
            ).fetchall()
        prices = {row["book_id"]: row["price_minor"] for row in price_rows}
        return [{**self._book(row), "price_minor": prices.get(row["id"]),
                 "difficulty": "kolay" if (row["page_count"] or 0) < 260 else "orta" if (row["page_count"] or 0) < 450 else "yüksek"}
                for row in rows]

    def log_recommendation_event(self, user_id: str | None, query_text: str, result_count: int,
                                 fallback_used: bool, latency_ms: int, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO recommendation_events(id,user_id,query_text,result_count,fallback_used,latency_ms,created_at) VALUES(?,?,?,?,?,?,?)",
                (str(uuid4()), user_id, query_text, result_count, int(fallback_used), latency_ms, datetime.now(timezone.utc).isoformat()),
            )

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

    def semantic_book_search(self, embedding: list[float], limit: int = 20,
                             access_token: str | None = None, query: str | None = None) -> list[dict]:
        return []

    def save_retail_offer(self, offer: dict) -> dict:
        """Fiyatı ve baskı metadata'sını saklar; mağaza açıklamasını saklamaz."""
        restocked = False
        matched_book_id = None
        with self.connect() as connection:
            book = None
            if offer.get("book_id"):
                book = connection.execute("SELECT id FROM books WHERE id=?", (offer["book_id"],)).fetchone()
            if not book:
                book = connection.execute(
                    "SELECT id FROM books WHERE lower(title)=lower(?) LIMIT 1", (offer["canonical_title"],),
                ).fetchone()
            matched_book_id = book["id"] if book else None
            previous_offer = connection.execute(
                "SELECT stock_status FROM offers WHERE edition_isbn=? AND retailer_id=?",
                (offer["isbn"], offer["retailer_id"]),
            ).fetchone()
            restocked = offer["stock_status"] == "in_stock" and bool(
                previous_offer and previous_offer["stock_status"] != "in_stock"
            )
            connection.execute(
                """INSERT INTO retailers(id,name,base_url,robots_url,content_policy) VALUES(?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET name=excluded.name, base_url=excluded.base_url,
                   robots_url=excluded.robots_url, content_policy=excluded.content_policy""",
                (offer["retailer_id"], offer["retailer_name"], offer["base_url"], offer["robots_url"], offer["content_policy"]),
            )
            connection.execute(
                """INSERT INTO editions(isbn,book_id,title,author,publisher,language,source_name,source_url,verification_status,verified_at)
                   VALUES(?,?,?,?,?,'tur',?,?,'retailer_verified',?)
                   ON CONFLICT(isbn) DO UPDATE SET book_id=COALESCE(excluded.book_id,editions.book_id),
                   title=excluded.title, author=excluded.author, publisher=excluded.publisher,
                   language='tur',source_name=excluded.source_name,source_url=excluded.source_url,
                   verification_status='retailer_verified',verified_at=excluded.verified_at""",
                (offer["isbn"], matched_book_id, offer["canonical_title"], offer["author"], offer["publisher"],
                 offer["retailer_name"], offer["product_url"], offer["checked_at"]),
            )
            connection.execute(
                """INSERT INTO offers(edition_isbn,retailer_id,product_url,price_minor,list_price_minor,currency,stock_status,checked_at,content_hash)
                   VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(product_url) DO UPDATE SET price_minor=excluded.price_minor,
                   list_price_minor=excluded.list_price_minor,currency=excluded.currency,stock_status=excluded.stock_status,
                   checked_at=excluded.checked_at,content_hash=excluded.content_hash""",
                (offer["isbn"], offer["retailer_id"], offer["product_url"], offer["price_minor"], offer["list_price_minor"],
                 offer["currency"], offer["stock_status"], offer["checked_at"], offer["content_hash"]),
            )
            row = connection.execute("SELECT id FROM offers WHERE product_url=?", (offer["product_url"],)).fetchone()
            latest = connection.execute(
                "SELECT price_minor,stock_status,observed_at FROM price_history WHERE offer_id=? ORDER BY observed_at DESC LIMIT 1",
                (row["id"],),
            ).fetchone()
            checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
            last_at = datetime.fromisoformat(latest["observed_at"].replace("Z", "+00:00")) if latest else None
            should_record = not latest or latest["price_minor"] != offer["price_minor"] or latest["stock_status"] != offer["stock_status"]
            should_record = should_record or bool(last_at and checked_at - last_at >= timedelta(hours=24))
            if should_record:
                connection.execute(
                    "INSERT INTO price_history(offer_id,price_minor,stock_status,observed_at) VALUES(?,?,?,?)",
                    (row["id"], offer["price_minor"], offer["stock_status"], offer["checked_at"]),
                )
        if restocked and matched_book_id:
            self.notify_edition_subscribers(matched_book_id, "back_in_stock", offer["canonical_title"])
        return {key: offer[key] for key in ("isbn", "canonical_title", "retailer_name", "price_minor", "currency", "stock_status", "product_url", "checked_at")}

    def list_retail_offers(self, book_id: str | None = None, isbn: str | None = None) -> list[dict]:
        where, values = [], []
        if book_id:
            where.append("e.book_id=?")
            values.append(book_id)
        if isbn:
            where.append("e.isbn=?")
            values.append(isbn)
        clause = " WHERE " + " AND ".join(where) if where else ""
        query = """SELECT e.book_id,e.isbn,e.title,e.author,e.publisher,r.name retailer_name,
                   o.product_url,o.price_minor,o.list_price_minor,o.currency,o.stock_status,o.checked_at
                   FROM offers o JOIN editions e ON e.isbn=o.edition_isbn
                   JOIN retailers r ON r.id=o.retailer_id""" + clause + " ORDER BY e.title,o.price_minor"
        with self.connect() as connection:
            offers = [dict(row) for row in connection.execute(query, values)]
        stale_before = datetime.now(timezone.utc) - timedelta(days=7)
        for offer in offers:
            try:
                checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
                if checked_at.tzinfo is None:
                    checked_at = checked_at.replace(tzinfo=timezone.utc)
                offer["is_stale"] = checked_at < stale_before
            except (TypeError, ValueError):
                offer["is_stale"] = True
        return offers

    def list_book_price_history(self, book_id: str, limit: int = 90) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT ph.price_minor,ph.stock_status,ph.observed_at,r.name retailer_name,
                          o.currency,o.product_url
                   FROM price_history ph JOIN offers o ON o.id=ph.offer_id
                   JOIN editions e ON e.isbn=o.edition_isbn
                   JOIN retailers r ON r.id=o.retailer_id
                   WHERE e.book_id=? ORDER BY ph.observed_at DESC LIMIT ?""",
                (book_id, limit),
            ).fetchall()
        return [dict(row) for row in rows]

    def create_pipeline_run(self, idempotency_key: str, job_type: str, orchestrator: str = "manual",
                            trigger_kind: str = "manual") -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            existing = connection.execute(
                "SELECT * FROM data_pipeline_runs WHERE idempotency_key=?", (idempotency_key,)
            ).fetchone()
            if existing:
                return {**dict(existing), "report": json.loads(existing["report_json"]), "duplicate": True}
            run_id = str(uuid4())
            connection.execute(
                """INSERT INTO data_pipeline_runs(id,idempotency_key,job_type,orchestrator,trigger_kind,status,started_at)
                   VALUES(?,?,?,?,?,'running',?)""",
                (run_id, idempotency_key, job_type, orchestrator, trigger_kind, now),
            )
            row = connection.execute("SELECT * FROM data_pipeline_runs WHERE id=?", (run_id,)).fetchone()
        return {**dict(row), "report": {}, "duplicate": False}

    def log_pipeline_event(self, run_id: str, level: str, stage: str, message: str,
                           context: dict | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO data_pipeline_logs(id,run_id,level,stage,message,context_json,created_at) VALUES(?,?,?,?,?,?,?)",
                (str(uuid4()), run_id, level, stage, message, json.dumps(context or {}, ensure_ascii=False),
                 datetime.now(timezone.utc).isoformat()),
            )

    def finish_pipeline_run(self, run_id: str, status: str, report: dict) -> dict:
        checked = int(report.get("checked", report.get("refreshed", 0) + report.get("discovered", 0) + report.get("not_found", 0)))
        success = int(report.get("success", report.get("refreshed", 0) + report.get("discovered", 0)))
        failure = int(report.get("failure", len(report.get("errors", []))))
        with self.connect() as connection:
            connection.execute(
                """UPDATE data_pipeline_runs SET status=?,checked_count=?,success_count=?,failure_count=?,
                   finished_at=?,report_json=? WHERE id=?""",
                (status, checked, success, failure, datetime.now(timezone.utc).isoformat(),
                 json.dumps(report, ensure_ascii=False), run_id),
            )
            row = connection.execute("SELECT * FROM data_pipeline_runs WHERE id=?", (run_id,)).fetchone()
        return {**dict(row), "report": json.loads(row["report_json"])}

    def list_pipeline_runs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute("SELECT * FROM data_pipeline_runs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [{**dict(row), "report": json.loads(row["report_json"])} for row in rows]

    def list_pipeline_logs(self, limit: int = 100, run_id: str | None = None,
                           access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            if run_id:
                rows = connection.execute(
                    "SELECT * FROM data_pipeline_logs WHERE run_id=? ORDER BY created_at DESC LIMIT ?", (run_id, limit)
                ).fetchall()
            else:
                rows = connection.execute("SELECT * FROM data_pipeline_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [{**dict(row), "context": json.loads(row["context_json"])} for row in rows]

    def replace_price_forecasts(self, book_id: str, forecasts: list[dict]) -> int:
        if not forecasts:
            return 0
        version = forecasts[0]["model_version"]
        with self.connect() as connection:
            connection.execute("DELETE FROM price_forecasts WHERE book_id=? AND model_version=?", (book_id, version))
            connection.executemany(
                """INSERT INTO price_forecasts(book_id,forecast_date,predicted_price_minor,lower_price_minor,
                   upper_price_minor,drop_probability,model_name,model_version,trained_through,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                [(book_id, row["forecast_date"], row["predicted_price_minor"], row["lower_price_minor"],
                  row["upper_price_minor"], row["drop_probability"], row["model_name"], row["model_version"],
                  row["trained_through"], datetime.now(timezone.utc).isoformat()) for row in forecasts],
            )
        return len(forecasts)

    def list_book_price_forecasts(self, book_id: str) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM price_forecasts WHERE book_id=? AND forecast_date>=date('now') ORDER BY forecast_date LIMIT 15",
                (book_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def _create_notification(connection: sqlite3.Connection, user_id: str, kind: str,
                             title: str, body: str, book_id: str | None = None,
                             payload: dict | None = None) -> None:
        connection.execute(
            """INSERT INTO notifications(id,user_id,kind,book_id,title,body,payload_json,created_at)
               VALUES(?,?,?,?,?,?,?,?)""",
            (str(uuid4()), user_id, kind, book_id, title, body,
             json.dumps(payload or {}, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
        )

    # Social reading and administrator operations. These methods deliberately
    # return a public profile projection instead of exposing the users table.
    def account_status(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT is_verified,verification_label,banned_at,banned_until,ban_reason FROM users WHERE id=?",
                (user_id,),
            ).fetchone()
        if not row:
            raise KeyError("KullanÄ±cÄ± bulunamadÄ±.")
        result = dict(row)
        until = result.get("banned_until")
        result["is_banned"] = bool(result.get("banned_at")) and (
            not until or datetime.fromisoformat(until.replace("Z", "+00:00")) > datetime.now(timezone.utc)
        )
        result["is_verified"] = bool(result.get("is_verified"))
        return result

    def _refresh_book_rating(self, connection: sqlite3.Connection, book_id: str) -> None:
        aggregate = connection.execute(
            "SELECT count(*) rating_count,coalesce(avg(rating),0) rating_average FROM book_ratings WHERE book_id=?",
            (book_id,),
        ).fetchone()
        count, average = int(aggregate["rating_count"]), float(aggregate["rating_average"])
        import math
        popularity = min(1.0, (math.log1p(count) / math.log(101)) * (average / 5)) if count else 0
        connection.execute(
            "UPDATE books SET rating_count=?,rating_average=?,popularity_score=? WHERE id=?",
            (count, round(average, 2), round(popularity, 4), book_id),
        )

    def upsert_book_rating(self, user_id: str, book_id: str, rating: int, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
                raise KeyError("Kitap bulunamadÄ±.")
            connection.execute(
                """INSERT INTO book_ratings(user_id,book_id,rating,created_at,updated_at) VALUES(?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET rating=excluded.rating,updated_at=excluded.updated_at""",
                (user_id, book_id, rating, now, now),
            )
            self._refresh_book_rating(connection, book_id)
        return {"book_id": book_id, "rating": rating}

    def delete_book_rating(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM book_ratings WHERE user_id=? AND book_id=?", (user_id, book_id))
            self._refresh_book_rating(connection, book_id)

    def book_community(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            book = connection.execute("SELECT rating_count,rating_average,popularity_score FROM books WHERE id=?", (book_id,)).fetchone()
            if not book:
                raise KeyError("Kitap bulunamadÄ±.")
            own = connection.execute("SELECT rating FROM book_ratings WHERE user_id=? AND book_id=?", (user_id, book_id)).fetchone()
            distribution = connection.execute(
                """SELECT rating,count(*) count FROM book_ratings WHERE book_id=?
                   GROUP BY rating ORDER BY rating DESC""", (book_id,),
            ).fetchall()
            rows = connection.execute(
                """SELECT c.*,u.display_name,u.is_verified,u.verification_label,
                          (SELECT count(*) FROM comment_helpful_votes hv WHERE hv.comment_id=c.id) helpful_count,
                          EXISTS(SELECT 1 FROM comment_helpful_votes hv WHERE hv.comment_id=c.id AND hv.user_id=?) own_helpful,
                          EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=? AND f.followed_id=c.user_id) following_author
                   FROM book_comments c
                   JOIN users u ON u.id=c.user_id WHERE c.book_id=? AND (c.status='published' OR c.user_id=?)
                   ORDER BY CASE WHEN c.parent_comment_id IS NULL THEN c.created_at ELSE
                     (SELECT created_at FROM book_comments parent WHERE parent.id=c.parent_comment_id) END DESC,
                     c.parent_comment_id IS NOT NULL,c.created_at LIMIT 200""", (user_id, user_id, book_id, user_id),
            ).fetchall()
        comments = [{"id": row["id"], "book_id": row["book_id"], "content": row["content"],
                     "parent_comment_id": row["parent_comment_id"],
                     "contains_spoiler": bool(row["contains_spoiler"]), "status": row["status"],
                     "created_at": row["created_at"], "updated_at": row["updated_at"],
                     "is_mine": row["user_id"] == user_id, "author_id": row["user_id"], "helpful_count": row["helpful_count"],
                     "own_helpful": bool(row["own_helpful"]), "following_author": bool(row["following_author"]),
                     "author": {"display_name": row["display_name"], "is_verified": bool(row["is_verified"]),
                                "verification_label": row["verification_label"]}} for row in rows]
        return {**dict(book), "own_rating": own["rating"] if own else None,
                "rating_distribution": {str(row["rating"]): row["count"] for row in distribution},
                "comments": comments}

    def create_book_comment(self, user_id: str, book_id: str, content: str, contains_spoiler: bool,
                            access_token: str | None = None, parent_comment_id: str | None = None) -> dict:
        now, comment_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            parent = None
            if parent_comment_id:
                parent = connection.execute(
                    "SELECT user_id,book_id FROM book_comments WHERE id=? AND status='published'",
                    (parent_comment_id,),
                ).fetchone()
                if not parent or parent["book_id"] != book_id:
                    raise ValueError("Yanıt verilen yorum bu kitaba ait değil.")
            connection.execute(
                """INSERT INTO book_comments(id,user_id,book_id,parent_comment_id,content,contains_spoiler,status,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,'published',?,?)""",
                (comment_id, user_id, book_id, parent_comment_id, content.strip(), int(contains_spoiler), now, now),
            )
            if parent and parent["user_id"] != user_id:
                self._create_notification(
                    connection, parent["user_id"], "comment_reply", "Yorumuna yanıt geldi",
                    "Bir okur kitap yorumuna yanıt verdi.", book_id,
                    {"comment_id": comment_id, "parent_comment_id": parent_comment_id},
                )
        return {"id": comment_id, "book_id": book_id, "content": content.strip(), "contains_spoiler": contains_spoiler,
                "parent_comment_id": parent_comment_id, "status": "published", "created_at": now, "updated_at": now}

    def update_book_comment(self, user_id: str, comment_id: str, changes: dict, access_token: str | None = None) -> dict:
        allowed = {key: value for key, value in changes.items() if key in {"content", "contains_spoiler"}}
        if not allowed:
            raise ValueError("DeÄŸiÅŸtirilecek alan yok.")
        allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "contains_spoiler" in allowed: allowed["contains_spoiler"] = int(allowed["contains_spoiler"])
        assignments = ",".join(f"{key}=?" for key in allowed)
        with self.connect() as connection:
            cursor = connection.execute(f"UPDATE book_comments SET {assignments} WHERE id=? AND user_id=?", [*allowed.values(), comment_id, user_id])
            if not cursor.rowcount: raise KeyError("Yorum bulunamadÄ±.")
            row = connection.execute("SELECT * FROM book_comments WHERE id=?", (comment_id,)).fetchone()
        return dict(row)

    def delete_book_comment(self, user_id: str, comment_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM book_comments WHERE id=? AND user_id=?", (comment_id, user_id))
            if not cursor.rowcount: raise KeyError("Yorum bulunamadÄ±.")

    def set_comment_helpful(self, user_id: str, comment_id: str, helpful: bool,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            comment = connection.execute(
                "SELECT user_id,book_id FROM book_comments WHERE id=? AND status='published'", (comment_id,),
            ).fetchone()
            if not comment:
                raise KeyError("Yorum bulunamadı.")
            inserted = False
            if helpful:
                cursor = connection.execute(
                    "INSERT OR IGNORE INTO comment_helpful_votes(user_id,comment_id,created_at) VALUES(?,?,?)",
                    (user_id, comment_id, now),
                )
                inserted = bool(cursor.rowcount)
            else:
                connection.execute("DELETE FROM comment_helpful_votes WHERE user_id=? AND comment_id=?", (user_id, comment_id))
            if inserted and comment["user_id"] != user_id:
                self._create_notification(connection, comment["user_id"], "comment_helpful",
                                          "Yorumun faydalı bulundu", "Bir okur yorumunu faydalı olarak işaretledi.",
                                          comment["book_id"], {"comment_id": comment_id})
            count = connection.execute("SELECT count(*) count FROM comment_helpful_votes WHERE comment_id=?", (comment_id,)).fetchone()["count"]
        return {"comment_id": comment_id, "helpful": helpful, "helpful_count": count}

    def report_comment(self, user_id: str, comment_id: str, reason: str, details: str | None,
                       access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            comment = connection.execute("SELECT user_id FROM book_comments WHERE id=?", (comment_id,)).fetchone()
            if not comment:
                raise KeyError("Yorum bulunamadı.")
            if comment["user_id"] == user_id:
                raise ValueError("Kendi yorumunu şikâyet edemezsin.")
            connection.execute(
                """INSERT INTO comment_reports(user_id,comment_id,reason,details,status,created_at)
                   VALUES(?,?,?,?, 'open',?) ON CONFLICT(user_id,comment_id) DO UPDATE SET
                   reason=excluded.reason,details=excluded.details,status='open',created_at=excluded.created_at""",
                (user_id, comment_id, reason, (details or "").strip() or None, now),
            )
            row = connection.execute("SELECT id,status FROM comment_reports WHERE user_id=? AND comment_id=?", (user_id, comment_id)).fetchone()
        return dict(row)

    def set_follow(self, follower_id: str, followed_id: str, following: bool,
                   access_token: str | None = None) -> dict:
        if follower_id == followed_id:
            raise ValueError("Kendini takip edemezsin.")
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (followed_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            if following:
                cursor = connection.execute(
                    "INSERT OR IGNORE INTO user_follows(follower_id,followed_id,created_at) VALUES(?,?,?)",
                    (follower_id, followed_id, datetime.now(timezone.utc).isoformat()),
                )
                if cursor.rowcount:
                    self._create_notification(connection, followed_id, "new_follower", "Yeni bir takipçin var",
                                              "Bir Mihenk okuru seni takip etmeye başladı.",
                                              payload={"follower_id": follower_id})
            else:
                connection.execute("DELETE FROM user_follows WHERE follower_id=? AND followed_id=?", (follower_id, followed_id))
            count = connection.execute("SELECT count(*) count FROM user_follows WHERE followed_id=?", (followed_id,)).fetchone()["count"]
        return {"user_id": followed_id, "following": following, "follower_count": count}

    def community_feed(self, user_id: str, limit: int = 40, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT c.id,c.book_id,c.content,c.contains_spoiler,c.created_at,c.parent_comment_id,
                          u.id author_id,u.display_name,u.is_verified,u.verification_label,
                          b.title book_title,b.author book_author,b.cover_url,
                          (SELECT count(*) FROM comment_helpful_votes h WHERE h.comment_id=c.id) helpful_count
                   FROM book_comments c JOIN user_follows f ON f.followed_id=c.user_id
                   JOIN users u ON u.id=c.user_id JOIN books b ON b.id=c.book_id
                   WHERE f.follower_id=? AND c.status='published'
                   ORDER BY c.created_at DESC LIMIT ?""", (user_id, limit),
            ).fetchall()
        return [{**dict(row), "contains_spoiler": bool(row["contains_spoiler"]), "is_verified": bool(row["is_verified"])} for row in rows]

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

    def add_reading_session(
        self, user_id: str, payload: dict, access_token: str | None = None
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        session_id = str(uuid4())
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        start_page = payload["start_page"]
        end_page = payload["end_page"]
        duration_minutes = payload["duration_minutes"]
        pages_read = max(0, end_page - start_page)

        with self.connect() as connection:
            connection.execute(
                """INSERT INTO reading_sessions(
                    id, user_id, book_id, custom_book_id, start_page, end_page,
                    duration_minutes, session_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (session_id, user_id, book_id, custom_book_id, start_page, end_page, duration_minutes, today, now)
            )

            if pages_read > 0:
                activity_id = str(uuid4())
                connection.execute(
                    """INSERT INTO reading_activity(id, user_id, book_id, custom_book_id, activity_date, pages_read, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (activity_id, user_id, book_id, custom_book_id, today, pages_read, now)
                )

                if book_id:
                    connection.execute(
                        """UPDATE user_books SET current_page = max(current_page, ?), updated_at = ?
                           WHERE user_id = ? AND book_id = ?""",
                        (end_page, now, user_id, book_id)
                    )
                elif custom_book_id:
                    connection.execute(
                        """UPDATE user_custom_books SET current_page = max(current_page, ?), updated_at = ?
                           WHERE user_id = ? AND id = ?""",
                        (end_page, now, user_id, custom_book_id)
                    )

        return self.get_reading_session(session_id, user_id)

    def get_reading_session(self, session_id: str, user_id: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT s.*, 
                          coalesce(b.title, cb.title) as book_title
                   FROM reading_sessions s
                   LEFT JOIN books b ON b.id = s.book_id
                   LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                   WHERE s.id = ? AND s.user_id = ?""",
                (session_id, user_id)
            ).fetchone()
            if not row:
                raise KeyError("Okuma seansı bulunamadı.")
            res = dict(row)
            res["pages_read"] = max(0, res["end_page"] - res["start_page"])
            duration = res["duration_minutes"]
            res["reading_speed_pages_per_min"] = round(res["pages_read"] / duration, 2) if duration > 0 else 0.0
            return res

    def list_reading_sessions(
        self, user_id: str, book_id: str | None = None, limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            if book_id:
                rows = connection.execute(
                    """SELECT s.*, coalesce(b.title, cb.title) as book_title
                       FROM reading_sessions s
                       LEFT JOIN books b ON b.id = s.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                       WHERE s.user_id = ? AND (s.book_id = ? OR s.custom_book_id = ?)
                       ORDER BY s.created_at DESC LIMIT ?""",
                    (user_id, book_id, book_id, limit)
                ).fetchall()
            else:
                rows = connection.execute(
                    """SELECT s.*, coalesce(b.title, cb.title) as book_title
                       FROM reading_sessions s
                       LEFT JOIN books b ON b.id = s.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                       WHERE s.user_id = ?
                       ORDER BY s.created_at DESC LIMIT ?""",
                    (user_id, limit)
                ).fetchall()

            result = []
            for r in rows:
                item = dict(r)
                item["pages_read"] = max(0, item["end_page"] - item["start_page"])
                duration = item["duration_minutes"]
                item["reading_speed_pages_per_min"] = round(item["pages_read"] / duration, 2) if duration > 0 else 0.0
                result.append(item)
            return result

    def get_reading_session_stats(
        self, user_id: str, access_token: str | None = None,
    ) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT count(*) as total_sessions,
                          coalesce(sum(duration_minutes), 0) as total_minutes,
                          coalesce(sum(max(0, end_page - start_page)), 0) as total_pages_read
                   FROM reading_sessions
                   WHERE user_id = ?""",
                (user_id,)
            ).fetchone()
            
            total_sessions = row["total_sessions"] if row else 0
            total_minutes = row["total_minutes"] if row else 0
            total_pages = row["total_pages_read"] if row else 0
            avg_speed = round(total_pages / total_minutes, 2) if total_minutes > 0 else 0.0
            est_hours = round((300 / avg_speed) / 60, 1) if avg_speed > 0 else 5.0

            activity_rows = connection.execute(
                """SELECT activity_date, sum(pages_read) as total_pages
                   FROM reading_activity
                   WHERE user_id = ?
                   GROUP BY activity_date
                   ORDER BY activity_date""",
                (user_id,)
            ).fetchall()

            heatmap = {r["activity_date"]: r["total_pages"] for r in activity_rows}

            return {
                "total_sessions": total_sessions,
                "total_minutes": total_minutes,
                "total_pages_read": total_pages,
                "average_reading_speed_pages_per_min": avg_speed,
                "estimated_hours_for_300_page_book": est_hours,
                "heatmap_data": heatmap,
            }

    def add_book_quote(self, user_id: str, payload: dict, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        quote_id = str(uuid4())
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        quote_text = payload["quote_text"]
        page_number = payload.get("page_number")
        tags = payload.get("tags", [])
        source_type = payload.get("source_type", "manual")

        with self.connect() as connection:
            connection.execute(
                """INSERT INTO book_quotes(
                    id, user_id, book_id, custom_book_id, quote_text, page_number, tags_json, source_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (quote_id, user_id, book_id, custom_book_id, quote_text, page_number, json.dumps(tags), source_type, now)
            )

        return self.get_book_quote(quote_id, user_id)

    def get_book_quote(self, quote_id: str, user_id: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT q.*, coalesce(b.title, cb.title) as book_title
                   FROM book_quotes q
                   LEFT JOIN books b ON b.id = q.book_id
                   LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                   WHERE q.id = ? AND q.user_id = ?""",
                (quote_id, user_id)
            ).fetchone()
            if not row:
                raise KeyError("Alıntı bulunamadı.")
            res = dict(row)
            res["tags"] = json.loads(res.pop("tags_json", "[]"))
            return res

    def list_book_quotes(
        self, user_id: str, book_id: str | None = None, limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            if book_id:
                rows = connection.execute(
                    """SELECT q.*, coalesce(b.title, cb.title) as book_title
                       FROM book_quotes q
                       LEFT JOIN books b ON b.id = q.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                       WHERE q.user_id = ? AND (q.book_id = ? OR q.custom_book_id = ?)
                       ORDER BY q.created_at DESC LIMIT ?""",
                    (user_id, book_id, book_id, limit)
                ).fetchall()
            else:
                rows = connection.execute(
                    """SELECT q.*, coalesce(b.title, cb.title) as book_title
                       FROM book_quotes q
                       LEFT JOIN books b ON b.id = q.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                       WHERE q.user_id = ?
                       ORDER BY q.created_at DESC LIMIT ?""",
                    (user_id, limit)
                ).fetchall()

            res = []
            for r in rows:
                item = dict(r)
                item["tags"] = json.loads(item.pop("tags_json", "[]"))
                res.append(item)
            return res

    # Product growth -----------------------------------------------------
    def onboarding_profile(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM onboarding_profiles WHERE user_id=?", (user_id,)
            ).fetchone()
        if not row:
            return {"user_id": user_id, "liked_book_ids": [], "liked_authors": [], "onboarding_completed": False}
        item = dict(row)
        item["liked_book_ids"] = json.loads(item.pop("liked_book_ids_json", "[]"))
        item["liked_authors"] = json.loads(item.pop("liked_authors_json", "[]"))
        item["onboarding_completed"] = bool(item["onboarding_completed"])
        return item

    def upsert_onboarding_profile(self, user_id: str, liked_book_ids: list[str], liked_authors: list[str],
                                  completed: bool, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            valid_ids = [row["id"] for row in connection.execute(
                f"SELECT id FROM books WHERE id IN ({','.join('?' for _ in liked_book_ids)})",
                liked_book_ids,
            )] if liked_book_ids else []
            connection.execute(
                """INSERT INTO onboarding_profiles(user_id,liked_book_ids_json,liked_authors_json,onboarding_completed,completed_at,updated_at)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
                   liked_book_ids_json=excluded.liked_book_ids_json,liked_authors_json=excluded.liked_authors_json,
                   onboarding_completed=excluded.onboarding_completed,completed_at=excluded.completed_at,updated_at=excluded.updated_at""",
                (user_id, json.dumps(valid_ids), json.dumps(liked_authors[:20], ensure_ascii=False), int(completed), now if completed else None, now),
            )
        return self.onboarding_profile(user_id)

    def import_library_records(self, user_id: str, records: list[dict], access_token: str | None = None) -> dict:
        imported = matched = custom = 0
        errors: list[str] = []
        for record in records:
            try:
                book_id = None
                with self.connect() as connection:
                    if record.get("isbn"):
                        row = connection.execute(
                            "SELECT book_id FROM editions WHERE isbn=? OR isbn10=? OR isbn13=? LIMIT 1",
                            (record["isbn"], record["isbn"], record["isbn"]),
                        ).fetchone()
                        book_id = row["book_id"] if row else None
                    if not book_id:
                        row = connection.execute(
                            "SELECT id FROM books WHERE lower(title)=lower(?) AND lower(author)=lower(?) LIMIT 1",
                            (record["title"], record["author"]),
                        ).fetchone()
                        book_id = row["id"] if row else None
                if book_id:
                    self.upsert_library_entry(user_id, book_id, record["shelf"], False, access_token=access_token)
                    matched += 1
                else:
                    self.save_custom_book(user_id, title=record["title"], author=record["author"], genre="Genel",
                                          cover_url=None, shelf=record["shelf"], is_favorite=False,
                                          access_token=access_token)
                    custom += 1
                imported += 1
            except Exception as error:
                errors.append(f"{record.get('title', 'Kayıt')}: {error}")
        return {"processed": len(records), "imported": imported, "catalog_matches": matched,
                "custom_books": custom, "errors": errors[:30]}

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

    def notification_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM notification_preferences WHERE user_id=?", (user_id,)).fetchone()
        if not row:
            return {"user_id": user_id, "consent_granted": False, "weekly_digest": True, "recommendations": True,
                    "price_drops": True, "stock_updates": False, "social_updates": True, "frequency": "weekly",
                    "quiet_hours_start": None, "quiet_hours_end": None}
        result = dict(row)
        for key in ("consent_granted", "weekly_digest", "recommendations", "price_drops", "stock_updates", "social_updates"):
            result[key] = bool(result[key])
        return result

    def upsert_notification_preferences(self, user_id: str, values: dict, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        keys = ("consent_granted", "weekly_digest", "recommendations", "price_drops", "stock_updates", "social_updates",
                "frequency", "quiet_hours_start", "quiet_hours_end")
        params = [int(values[key]) if isinstance(values[key], bool) else values[key] for key in keys]
        with self.connect() as connection:
            connection.execute(
                f"""INSERT INTO notification_preferences(user_id,{','.join(keys)},updated_at)
                    VALUES({','.join('?' for _ in range(len(keys)+2))}) ON CONFLICT(user_id) DO UPDATE SET
                    {','.join(f'{key}=excluded.{key}' for key in keys)},updated_at=excluded.updated_at""",
                [user_id, *params, now],
            )
        return self.notification_preferences(user_id)

    def upsert_edition_subscription(self, user_id: str, book_id: str, event_type: str, is_active: bool,
                                    access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                """INSERT INTO edition_subscriptions(user_id,book_id,event_type,is_active,created_at,updated_at)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,book_id,event_type) DO UPDATE SET
                   is_active=excluded.is_active,updated_at=excluded.updated_at""",
                (user_id, book_id, event_type, int(is_active), now, now),
            )
            row = connection.execute(
                "SELECT * FROM edition_subscriptions WHERE user_id=? AND book_id=? AND event_type=?",
                (user_id, book_id, event_type),
            ).fetchone()
        return {**dict(row), "is_active": bool(row["is_active"])}

    def list_edition_subscriptions(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT s.*,b.title,b.author FROM edition_subscriptions s JOIN books b ON b.id=s.book_id
                   WHERE s.user_id=? ORDER BY s.updated_at DESC""", (user_id,)
            ).fetchall()
        return [{**dict(row), "is_active": bool(row["is_active"])} for row in rows]

    def weekly_summary(self, user_id: str, access_token: str | None = None) -> dict:
        start, end = weekly_window()
        with self.connect() as connection:
            stats = connection.execute(
                """SELECT coalesce(sum(duration_minutes),0) minutes,coalesce(sum(end_page-start_page),0) pages,
                   count(*) sessions FROM reading_sessions WHERE user_id=? AND session_date BETWEEN ? AND ?""",
                (user_id, start, end),
            ).fetchone()
            finished = connection.execute(
                "SELECT count(*) n FROM user_books WHERE user_id=? AND shelf='read' AND substr(finished_at,1,10) BETWEEN ? AND ?",
                (user_id, start, end),
            ).fetchone()["n"]
            picks = [self._book(row) for row in connection.execute(
                """SELECT b.* FROM books b WHERE b.is_recommendable=1 AND NOT EXISTS(
                   SELECT 1 FROM user_books ub WHERE ub.user_id=? AND ub.book_id=b.id)
                   ORDER BY b.quality_score DESC,b.popularity_score DESC LIMIT 5""", (user_id,)
            )]
        return {"start_date": start, "end_date": end, "minutes_read": stats["minutes"], "pages_read": stats["pages"],
                "sessions": stats["sessions"], "books_finished": finished, "recommendations": picks}

    def create_reading_list(self, user_id: str, title: str, description: str, visibility: str,
                            access_token: str | None = None) -> dict:
        list_id, token, now = str(uuid4()), str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO reading_lists(id,owner_id,title,description,visibility,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                (list_id, user_id, title, description, visibility, token, now, now),
            )
        return {"id": list_id, "owner_id": user_id, "title": title, "description": description,
                "visibility": visibility, "share_token": token, "items": [], "created_at": now, "updated_at": now}

    def list_reading_lists(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT l.*,count(i.book_id) item_count FROM reading_lists l LEFT JOIN reading_list_items i ON i.list_id=l.id
                   WHERE l.owner_id=? GROUP BY l.id ORDER BY l.updated_at DESC""", (user_id,)
            ).fetchall()
        return [dict(row) for row in rows]

    def upsert_reading_list_item(self, user_id: str, list_id: str, book_id: str, note: str, position: int,
                                 access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM reading_lists WHERE id=? AND owner_id=?", (list_id, user_id)).fetchone():
                raise KeyError("Okuma listesi bulunamadı.")
            connection.execute(
                """INSERT INTO reading_list_items(list_id,book_id,note,position,added_at) VALUES(?,?,?,?,?)
                   ON CONFLICT(list_id,book_id) DO UPDATE SET note=excluded.note,position=excluded.position""",
                (list_id, book_id, note, position, now),
            )
            connection.execute("UPDATE reading_lists SET updated_at=? WHERE id=?", (now, list_id))
        return self.reading_list_detail(list_id, user_id=user_id)

    def reading_list_detail(self, list_id: str | None = None, *, user_id: str | None = None,
                            share_token: str | None = None, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            if share_token:
                row = connection.execute("SELECT * FROM reading_lists WHERE share_token=? AND visibility<>'private'", (share_token,)).fetchone()
            else:
                row = connection.execute("SELECT * FROM reading_lists WHERE id=? AND owner_id=?", (list_id, user_id)).fetchone()
            if not row:
                raise KeyError("Okuma listesi bulunamadı.")
            items = connection.execute(
                """SELECT i.note,i.position,i.added_at,b.* FROM reading_list_items i JOIN books b ON b.id=i.book_id
                   WHERE i.list_id=? ORDER BY i.position,i.added_at""", (row["id"],)
            ).fetchall()
        return {**dict(row), "items": [{"note": item["note"], "position": item["position"], "added_at": item["added_at"],
                                         "book": self._book(item)} for item in items]}

    def create_book_club(self, user_id: str, name: str, description: str, visibility: str,
                         rules: str = "", access_token: str | None = None) -> dict:
        club_id, code, now = str(uuid4()), str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO book_clubs(id,owner_id,name,description,rules,visibility,invite_code,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (club_id, user_id, name.strip(), description.strip(), rules.strip(), visibility, code, now, now),
            )
            connection.execute("INSERT INTO book_club_members(club_id,user_id,role,joined_at) VALUES(?,?,?,?)",
                               (club_id, user_id, "owner", now))
        return self.book_club_detail(user_id, club_id)

    def update_book_club(self, user_id: str, club_id: str, values: dict,
                         access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member or member["role"] not in {"owner", "moderator"}:
                raise PermissionError("Kulüp ayarlarını yalnızca yönetici düzenleyebilir.")
            club = connection.execute("SELECT * FROM book_clubs WHERE id=?", (club_id,)).fetchone()
            if not club:
                raise KeyError("Kitap kulübü bulunamadı.")
            name = values.get("name", club["name"]).strip()
            description = values.get("description", club["description"]).strip()
            rules = values.get("rules", club["rules"]).strip()
            visibility = values.get("visibility", club["visibility"])
            connection.execute(
                "UPDATE book_clubs SET name=?, description=?, rules=?, visibility=?, updated_at=? WHERE id=?",
                (name, description, rules, visibility, now, club_id),
            )
        return self.book_club_detail(user_id, club_id)

    def update_book_club_member_role(self, user_id: str, club_id: str, target_user_id: str, role: str,
                                     access_token: str | None = None) -> dict:
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member or member["role"] != "owner":
                raise PermissionError("Yalnızca kulüp sahibi üye rollerini değiştirebilir.")
            if user_id == target_user_id and role != "owner":
                raise ValueError("Kulüp sahibi kendi rolünü düşüremez.")
            target = connection.execute(
                "SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, target_user_id)
            ).fetchone()
            if not target:
                raise KeyError("Üye bulunamadı.")
            connection.execute("UPDATE book_club_members SET role=? WHERE club_id=? AND user_id=?", (role, club_id, target_user_id))
        return self.book_club_detail(user_id, club_id)

    def join_book_club(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            club = connection.execute("SELECT * FROM book_clubs WHERE invite_code=?", (invite_code,)).fetchone()
            if not club:
                raise KeyError("Davet kodu geçersiz.")
            connection.execute("INSERT OR IGNORE INTO book_club_members(club_id,user_id,role,joined_at) VALUES(?,?,?,?)",
                               (club["id"], user_id, "member", now))
        return self.book_club_detail(user_id, club["id"])

    def list_book_clubs(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT c.*,m.role,(SELECT count(*) FROM book_club_members x WHERE x.club_id=c.id) member_count
                   FROM book_clubs c JOIN book_club_members m ON m.club_id=c.id WHERE m.user_id=? ORDER BY c.updated_at DESC""",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def join_reading(self, user_id: str, club_id: str, book_id: str, daily_target_pages: int = 10,
                     shelf: str = "reading", access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise KeyError("Kulüp üyeliği gerekiyor.")
            book = connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
            if not book:
                raise KeyError("Kitap bulunamadı.")
            total_pages = book["page_count"]
            connection.execute(
                """INSERT INTO user_books(user_id,book_id,shelf,is_favorite,current_page,total_pages,started_at,updated_at)
                   VALUES(?,?,?,0,0,?,?,?) ON CONFLICT(user_id,book_id) DO UPDATE SET
                   shelf=excluded.shelf,total_pages=coalesce(user_books.total_pages,excluded.total_pages),
                   started_at=coalesce(user_books.started_at,excluded.started_at),updated_at=excluded.updated_at""",
                (user_id, book_id, shelf, total_pages, today, now),
            )
            connection.execute(
                """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                   VALUES(?,?,?,0,?,?,?) ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                   total_pages=coalesce(book_club_progress.total_pages,excluded.total_pages),
                   daily_target_pages=excluded.daily_target_pages,updated_at=excluded.updated_at""",
                (club_id, user_id, book_id, total_pages, max(1, daily_target_pages), now),
            )
        return self.book_club_detail(user_id, club_id)

    def upsert_book_club_progress(self, user_id: str, club_id: str, values: dict,
                                  access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        book_id = values["book_id"]
        current_page = values["current_page"]
        daily_target = values.get("daily_target_pages")
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone():
                raise KeyError("Kitap kulübü bulunamadı.")
            book = connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
            total_pages = values.get("total_pages") or (book["page_count"] if book else None)
            connection.execute(
                """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                   VALUES(?,?,?,?,?,?,?) ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                   current_page=excluded.current_page,total_pages=coalesce(excluded.total_pages,book_club_progress.total_pages),
                   daily_target_pages=coalesce(excluded.daily_target_pages,book_club_progress.daily_target_pages),updated_at=excluded.updated_at""",
                (club_id, user_id, book_id, current_page, total_pages, daily_target or 10, now),
            )
            shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
            finished_at = now if shelf == "read" else None
            connection.execute(
                """INSERT INTO user_books(user_id,book_id,shelf,is_favorite,current_page,total_pages,finished_at,updated_at)
                   VALUES(?,?,?,0,?,?,?,?) ON CONFLICT(user_id,book_id) DO UPDATE SET
                   current_page=excluded.current_page,total_pages=coalesce(excluded.total_pages,user_books.total_pages),
                   shelf=CASE WHEN excluded.current_page>=coalesce(user_books.total_pages,excluded.total_pages,0) AND coalesce(user_books.total_pages,excluded.total_pages,0)>0 THEN 'read' ELSE user_books.shelf END,
                   finished_at=CASE WHEN excluded.current_page>=coalesce(user_books.total_pages,excluded.total_pages,0) AND coalesce(user_books.total_pages,excluded.total_pages,0)>0 THEN coalesce(user_books.finished_at,excluded.finished_at) ELSE user_books.finished_at END,
                   updated_at=excluded.updated_at""",
                (user_id, book_id, shelf, current_page, total_pages, finished_at, now),
            )
        return self.book_club_detail(user_id, club_id)

    def create_book_club_discussion(self, user_id: str, club_id: str, values: dict,
                                    access_token: str | None = None) -> dict:
        with self.connect() as connection:
            membership = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not membership:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            progress = connection.execute(
                "SELECT current_page FROM book_club_progress WHERE club_id=? AND user_id=? AND book_id=?",
                (club_id, user_id, values["book_id"]),
            ).fetchone()
            curr = progress["current_page"] if progress else 0
            if values.get("page_number") and values["page_number"] > curr:
                raise PermissionError("Henüz ulaşmadığın sayfa için tartışma açamazsın.")
            discussion_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
            connection.execute(
                """INSERT INTO book_club_discussions(id,club_id,user_id,book_id,content,page_number,chapter_title,discussion_type,parent_id,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (discussion_id, club_id, user_id, values["book_id"], values["content"].strip(),
                 values.get("page_number"), values.get("chapter_title"), values.get("discussion_type", "discussion"),
                 values.get("parent_id"), now),
            )
        return self.book_club_detail(user_id, club_id)

    def toggle_book_club_reaction(self, user_id: str, club_id: str, discussion_id: str, reaction_type: str,
                                  access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            disc = connection.execute("SELECT 1 FROM book_club_discussions WHERE id=? AND club_id=?", (discussion_id, club_id)).fetchone()
            if not disc:
                raise KeyError("Tartışma bulunamadı.")
            existing = connection.execute(
                "SELECT id FROM book_club_reactions WHERE discussion_id=? AND user_id=? AND reaction_type=?",
                (discussion_id, user_id, reaction_type),
            ).fetchone()
            if existing:
                connection.execute("DELETE FROM book_club_reactions WHERE id=?", (existing["id"],))
            else:
                connection.execute(
                    "INSERT INTO book_club_reactions(id,discussion_id,user_id,reaction_type,created_at) VALUES(?,?,?,?,?)",
                    (str(uuid4()), discussion_id, user_id, reaction_type, now),
                )
        return self.book_club_detail(user_id, club_id)

    def create_book_club_event(self, user_id: str, club_id: str, values: dict,
                               access_token: str | None = None) -> dict:
        event_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member or member["role"] not in {"owner", "moderator"}:
                raise PermissionError("Etkinlikleri yalnızca kulüp yöneticisi oluşturabilir.")
            connection.execute(
                """INSERT INTO book_club_events(id,club_id,title,description,event_type,event_date,location,created_by,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?)""",
                (event_id, club_id, values["title"].strip(), values.get("description", "").strip(),
                 values.get("event_type", "general"), values["event_date"], values.get("location", "").strip(), user_id, now),
            )
            connection.execute(
                "INSERT INTO book_club_event_rsvps(event_id,user_id,status,created_at) VALUES(?,?,'attending',?)",
                (event_id, user_id, now),
            )
        return self.book_club_detail(user_id, club_id)

    def rsvp_book_club_event(self, user_id: str, club_id: str, event_id: str, status: str,
                             access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            event = connection.execute("SELECT 1 FROM book_club_events WHERE id=? AND club_id=?", (event_id, club_id)).fetchone()
            if not event:
                raise KeyError("Etkinlik bulunamadı.")
            connection.execute(
                """INSERT INTO book_club_event_rsvps(event_id,user_id,status,created_at) VALUES(?,?,?,?)
                   ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,created_at=excluded.created_at""",
                (event_id, user_id, status, now),
            )
        return self.book_club_detail(user_id, club_id)

    def create_book_club_poll(self, user_id: str, club_id: str, title: str, option_book_ids: list[str],
                              access_token: str | None = None) -> dict:
        poll_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
        unique_ids = list(dict.fromkeys(option_book_ids))
        with self.connect() as connection:
            membership = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not membership or membership["role"] not in {"owner", "moderator"}:
                raise PermissionError("Oylamayı yalnızca kulüp yöneticisi açabilir.")
            connection.execute("INSERT INTO book_club_polls(id,club_id,title,status,created_by,created_at) VALUES(?,?,?,'open',?,?)",
                               (poll_id, club_id, title.strip(), user_id, now))
            connection.executemany("INSERT INTO book_club_poll_options(id,poll_id,book_id) VALUES(?,?,?)",
                                   [(str(uuid4()), poll_id, book_id) for book_id in unique_ids])
        return self.book_club_detail(user_id, club_id)

    def vote_book_club_poll(self, user_id: str, club_id: str, poll_id: str, option_id: str,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            valid = connection.execute(
                """SELECT 1 FROM book_club_members m JOIN book_club_polls p ON p.club_id=m.club_id
                   JOIN book_club_poll_options o ON o.poll_id=p.id
                   WHERE m.club_id=? AND m.user_id=? AND p.id=? AND p.status='open' AND o.id=?""",
                (club_id, user_id, poll_id, option_id),
            ).fetchone()
            if not valid:
                raise KeyError("Oylama seçeneği bulunamadı.")
            connection.execute(
                """INSERT INTO book_club_votes(poll_id,user_id,option_id,voted_at) VALUES(?,?,?,?)
                   ON CONFLICT(poll_id,user_id) DO UPDATE SET option_id=excluded.option_id,voted_at=excluded.voted_at""",
                (poll_id, user_id, option_id, now),
            )
        return self.book_club_detail(user_id, club_id)

    def upsert_book_club_read(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            membership = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not membership or membership["role"] not in {"owner", "moderator"}:
                raise PermissionError("Kulüp okumasını yalnızca yönetici düzenleyebilir.")
            connection.execute(
                """INSERT INTO book_club_reads(club_id,book_id,start_date,target_date,status,created_at) VALUES(?,?,?,?,?,?)
                   ON CONFLICT(club_id,book_id) DO UPDATE SET start_date=excluded.start_date,target_date=excluded.target_date,status=excluded.status""",
                (club_id, values["book_id"], values.get("start_date"), values.get("target_date"), values["status"], now),
            )
            connection.execute("UPDATE book_clubs SET updated_at=? WHERE id=?", (now, club_id))
        return self.book_club_detail(user_id, club_id)

    def book_club_detail(self, user_id: str, club_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            club = connection.execute(
                """SELECT c.*,m.role FROM book_clubs c JOIN book_club_members m ON m.club_id=c.id
                   WHERE c.id=? AND m.user_id=?""", (club_id, user_id)
            ).fetchone()
            if not club:
                raise KeyError("Kitap kulübü bulunamadı.")
            club_dict = dict(club)
            user_role = club_dict.get("role", "member")

            # Members
            members_rows = connection.execute(
                """SELECT m.user_id, m.role, m.joined_at, u.display_name
                   FROM book_club_members m JOIN users u ON u.id=m.user_id
                   WHERE m.club_id=? ORDER BY CASE m.role WHEN 'owner' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, m.joined_at ASC""",
                (club_id,),
            ).fetchall()
            members = [dict(m) for m in members_rows]

            # Reads
            reads_rows = connection.execute(
                """SELECT r.*,b.title,b.author,b.cover_url,b.page_count FROM book_club_reads r JOIN books b ON b.id=r.book_id
                   WHERE r.club_id=? ORDER BY CASE r.status WHEN 'reading' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END, r.created_at DESC""",
                (club_id,),
            ).fetchall()
            reads = []
            active_read = None
            for r in reads_rows:
                rd = dict(r)
                book_id = rd["book_id"]
                # Calculate joint progress
                member_progress_rows = connection.execute(
                    "SELECT current_page, total_pages FROM book_club_progress WHERE club_id=? AND book_id=?",
                    (club_id, book_id),
                ).fetchall()
                if member_progress_rows:
                    percents = [min(100.0, (row["current_page"] / (row["total_pages"] or rd["page_count"] or 100)) * 100)
                                for row in member_progress_rows if (row["total_pages"] or rd["page_count"])]
                    rd["joint_progress_percent"] = round(sum(percents) / len(percents), 1) if percents else 0
                    rd["active_readers_count"] = len(member_progress_rows)
                else:
                    rd["joint_progress_percent"] = 0
                    rd["active_readers_count"] = 0
                reads.append(rd)
                if not active_read and rd["status"] == "reading":
                    active_read = rd
            if not active_read and reads:
                active_read = reads[0]

            # User progress & roadmap
            progress_rows = connection.execute(
                "SELECT * FROM book_club_progress WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchall()
            user_progress_map = {row["book_id"]: dict(row) for row in progress_rows}

            user_progress_list = []
            for rd in reads:
                b_id = rd["book_id"]
                p = user_progress_map.get(b_id, {
                    "club_id": club_id, "user_id": user_id, "book_id": b_id,
                    "current_page": 0, "total_pages": rd["page_count"], "daily_target_pages": 10
                })
                total = p.get("total_pages") or rd["page_count"] or 200
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
                in_lib = connection.execute("SELECT 1 FROM user_books WHERE user_id=? AND book_id=?", (user_id, b_id)).fetchone() is not None
                user_progress_list.append({
                    **p, "percent": pct, "total_pages": total, "daily_target_pages": daily,
                    "days_left": days_left, "projected_finish_date": finish_date,
                    "milestones": milestones, "in_library": in_lib,
                })

            # Discussions (with replies, reactions, and spoiler handling)
            user_curr_pages = {p["book_id"]: p.get("current_page", 0) for p in user_progress_list}
            disc_rows = connection.execute(
                """SELECT d.*, u.display_name, b.title book_title FROM book_club_discussions d
                   JOIN users u ON u.id=d.user_id JOIN books b ON b.id=d.book_id
                   WHERE d.club_id=? ORDER BY d.created_at DESC LIMIT 150""",
                (club_id,),
            ).fetchall()

            reactions_rows = connection.execute(
                """SELECT r.discussion_id, r.user_id, r.reaction_type FROM book_club_reactions r
                   JOIN book_club_discussions d ON d.id=r.discussion_id WHERE d.club_id=?""",
                (club_id,),
            ).fetchall()
            reactions_by_disc = {}
            user_reactions_by_disc = {}
            for rx in reactions_rows:
                d_id = rx["discussion_id"]
                r_type = rx["reaction_type"]
                reactions_by_disc.setdefault(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
                if r_type in reactions_by_disc[d_id]:
                    reactions_by_disc[d_id][r_type] += 1
                if rx["user_id"] == user_id:
                    user_reactions_by_disc.setdefault(d_id, []).append(r_type)

            discussions_list = []
            upcoming_spoilers = 0
            for d in disc_rows:
                dd = dict(d)
                d_id = dd["id"]
                b_id = dd["book_id"]
                p_num = dd.get("page_number")
                user_page = user_curr_pages.get(b_id, 0)
                is_locked = bool(p_num and p_num > user_page and user_role not in {"owner", "moderator"})
                if is_locked:
                    upcoming_spoilers += 1
                    discussions_list.append({
                        "id": d_id, "club_id": club_id, "book_id": b_id, "book_title": dd["book_title"],
                        "page_number": p_num, "chapter_title": dd.get("chapter_title"),
                        "discussion_type": dd.get("discussion_type", "discussion"),
                        "is_spoiler_locked": True, "created_at": dd["created_at"],
                    })
                else:
                    dd["is_spoiler_locked"] = False
                    dd["reactions"] = reactions_by_disc.get(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
                    dd["user_reactions"] = user_reactions_by_disc.get(d_id, [])
                    discussions_list.append(dd)

            # Events & RSVPs
            events_rows = connection.execute(
                """SELECT e.*, u.display_name creator_name FROM book_club_events e
                   JOIN users u ON u.id=e.created_by WHERE e.club_id=? ORDER BY e.event_date ASC""",
                (club_id,),
            ).fetchall()
            events = []
            for ev in events_rows:
                evd = dict(ev)
                ev_id = evd["id"]
                rsvps = connection.execute("SELECT status, count(*) cnt FROM book_club_event_rsvps WHERE event_id=? GROUP BY status", (ev_id,)).fetchall()
                rsvp_counts = {r["status"]: r["cnt"] for r in rsvps}
                my_rsvp = connection.execute("SELECT status FROM book_club_event_rsvps WHERE event_id=? AND user_id=?", (ev_id, user_id)).fetchone()
                evd["rsvp_counts"] = {"attending": rsvp_counts.get("attending", 0), "maybe": rsvp_counts.get("maybe", 0), "declined": rsvp_counts.get("declined", 0)}
                evd["user_rsvp"] = my_rsvp["status"] if my_rsvp else None
                events.append(evd)

            # Polls
            polls = connection.execute(
                "SELECT * FROM book_club_polls WHERE club_id=? ORDER BY created_at DESC", (club_id,)
            ).fetchall()
            poll_items = []
            for poll in polls:
                options = connection.execute(
                    """SELECT o.id,o.book_id,b.title,b.author,b.cover_url,count(v.user_id) vote_count,
                       max(CASE WHEN v.user_id=? THEN 1 ELSE 0 END) selected
                       FROM book_club_poll_options o JOIN books b ON b.id=o.book_id
                       LEFT JOIN book_club_votes v ON v.option_id=o.id WHERE o.poll_id=?
                       GROUP BY o.id,o.book_id,b.title,b.author ORDER BY vote_count DESC,b.title""",
                    (user_id, poll["id"]),
                ).fetchall()
                poll_items.append({**dict(poll), "options": [{**dict(o), "selected": bool(o["selected"])} for o in options]})

            # Badges and stats
            completed_reads_count = len([r for r in reads if r["status"] == "completed"])
            user_disc_count = len([d for d in disc_rows if d["user_id"] == user_id])
            user_rx_count = len([rx for rx in reactions_rows if rx["user_id"] == user_id])
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
            **club_dict,
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
                "total_discussions": len(disc_rows),
                "completed_books_count": completed_reads_count,
            },
            "badges": badges,
        }

    def get_or_create_club_room(self, user_id: str, club_id: str, title: str | None = None,
                                book_id: str | None = None, duration_minutes: int = 25,
                                access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            room = connection.execute(
                "SELECT * FROM book_club_rooms WHERE club_id=? ORDER BY created_at DESC LIMIT 1", (club_id,)
            ).fetchone()
            if not room:
                room_id = str(uuid4())
                room_title = title or "Birlikte Okuyoruz Odası"
                connection.execute(
                    """INSERT INTO book_club_rooms(id,club_id,title,book_id,phase,duration_minutes,created_by,created_at)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (room_id, club_id, room_title, book_id, "reading", duration_minutes, user_id, now),
                )
                room = connection.execute("SELECT * FROM book_club_rooms WHERE id=?", (room_id,)).fetchone()
            
            # Active participants in this club
            members = connection.execute(
                """SELECT m.user_id, u.display_name, m.role,
                          p.current_page, p.daily_target_pages, b.title as reading_book_title
                   FROM book_club_members m
                   JOIN users u ON u.id = m.user_id
                   LEFT JOIN book_club_progress p ON p.club_id = m.club_id AND p.user_id = m.user_id
                   LEFT JOIN books b ON b.id = p.book_id
                   WHERE m.club_id = ?
                   ORDER BY m.joined_at ASC""",
                (club_id,),
            ).fetchall()

            messages = connection.execute(
                """SELECT msg.id, msg.room_id, msg.user_id, u.display_name, msg.content, msg.created_at
                   FROM book_club_room_messages msg
                   JOIN users u ON u.id = msg.user_id
                   WHERE msg.room_id = ?
                   ORDER BY msg.created_at ASC LIMIT 50""",
                (room["id"],),
            ).fetchall()

            return {
                **dict(room),
                "participants": [dict(m) for m in members],
                "messages": [dict(msg) for msg in messages],
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

        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")

            # 1. Log reading activity if pages read
            if book_id and pages_read > 0:
                connection.execute(
                    """INSERT INTO reading_activity(id, user_id, book_id, activity_date, pages_read, created_at)
                       VALUES(?,?,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, today, pages_read, now),
                )

            # 2. Update user_books & club progress if page given
            if book_id and current_page is not None:
                book = connection.execute("SELECT page_count FROM books WHERE id=?", (book_id,)).fetchone()
                total_pages = book["page_count"] if book else None
                shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
                finished_at = now if shelf == "read" else None
                connection.execute(
                    """INSERT INTO user_books(user_id,book_id,shelf,current_page,total_pages,finished_at,updated_at)
                       VALUES(?,?,?,?,?,?,?)
                       ON CONFLICT(user_id,book_id) DO UPDATE SET
                       shelf=excluded.shelf, current_page=excluded.current_page,
                       total_pages=COALESCE(excluded.total_pages, user_books.total_pages),
                       finished_at=excluded.finished_at, updated_at=excluded.updated_at""",
                    (user_id, book_id, shelf, current_page, total_pages, finished_at, now),
                )
                connection.execute(
                    """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                       VALUES(?,?,?,?,?,?,?)
                       ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                       current_page=excluded.current_page, total_pages=COALESCE(excluded.total_pages, book_club_progress.total_pages),
                       updated_at=excluded.updated_at""",
                    (club_id, user_id, book_id, current_page, total_pages, 10, now),
                )

            # 3. If note/quote was entered in session, save to book_club_discussions
            if notes and notes.strip() and book_id:
                connection.execute(
                    """INSERT INTO book_club_discussions(id,club_id,user_id,book_id,content,page_number,discussion_type,created_at)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (str(uuid4()), club_id, user_id, book_id, notes.strip(), current_page, "quote", now),
                )

        return self.get_or_create_club_room(user_id, club_id)

    def send_room_message(self, user_id: str, club_id: str, room_id: str, content: str,
                          access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            msg_id = str(uuid4())
            connection.execute(
                "INSERT INTO book_club_room_messages(id,room_id,user_id,content,created_at) VALUES(?,?,?,?,?)",
                (msg_id, room_id, user_id, content.strip(), now),
            )
        return self.get_or_create_club_room(user_id, club_id)

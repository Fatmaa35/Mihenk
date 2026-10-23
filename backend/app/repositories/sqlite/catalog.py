"""Kitap kataloğu, arama ve baskı doğrulama."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.services.catalog.catalog_quality import enrich_book_record, normalize_isbn

class SQLiteCatalogMixin:
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


    def semantic_book_search(self, embedding: list[float], limit: int = 20,
                             access_token: str | None = None, query: str | None = None) -> list[dict]:
        return []

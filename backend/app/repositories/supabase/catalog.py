"""Kitap kataloğu, arama ve baskı doğrulama."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.services.catalog.catalog_quality import enrich_book_record, normalize_isbn

class SupabaseCatalogMixin:
    def list_verified_editions(self, limit: int = 200) -> list[dict]:
        rows = self._request("GET", "/rest/v1/editions", admin=True, params={
            "select": "*,book:books(title,author)", "language": "eq.tur",
            "verification_status": "in.(verified,retailer_verified)", "order": "verified_at.desc", "limit": limit}).json()
        result = []
        for row in rows:
            book = row.pop("book", None) or {}
            result.append({**row, "book_title": book.get("title"), "book_author": book.get("author")})
        return result


    def semantic_book_search(
        self, embedding: list[float], limit: int = 20,
        access_token: str | None = None, query: str | None = None,
    ) -> list[dict]:
        if not access_token:
            return []
        rpc = "search_books_hybrid" if query else "match_books"
        body = {"query_embedding": embedding, "match_count": min(max(limit, 1), 100)}
        if query:
            body["query_text"] = query
        return self._request("POST", f"/rest/v1/rpc/{rpc}", token=access_token, json_body=body).json()


    def upsert_book_embeddings(self, records: list[dict]) -> int:
        updated = 0
        for record in records:
            self._request(
                "PATCH", "/rest/v1/books", admin=True,
                params={"id": f"eq.{record['id']}"},
                json_body={
                    "embedding": record["embedding"],
                    "embedding_model": record["embedding_model"],
                    "embedding_updated_at": record["embedding_updated_at"],
                },
                extra_headers={"Prefer": "return=minimal"},
            )
            updated += 1
        return updated


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


    @staticmethod
    def _book(row: dict) -> dict:
        return {
            "id": row["id"],
            "title": row["title"],
            "author": row["author"],
            "canonical_work_key": row.get("canonical_work_key"),
            "genre": row["genre"],
            "publication_type": row.get("publication_type") or "unknown",
            "language": row.get("language") or "tr",
            "original_language": row.get("original_language"),
            "page_count": row.get("page_count"),
            "themes": row.get("themes") or [],
            "character_traits": row.get("character_traits") or [],
            "atmosphere": row.get("atmosphere") or [],
            "narrative_style": row.get("narrative_style") or [],
            "narrative_pace": row.get("narrative_pace"),
            "description": row.get("description") or "",
            "quality_score": float(row.get("quality_score") or 0),
            "quality_flags": row.get("quality_flags") or [],
            "is_recommendable": bool(row.get("is_recommendable", True)),
            "source_name": row.get("source_name"),
            "source_url": row.get("source_url"),
            "cover_url": row.get("cover_url"),
            "series_name": row.get("series_name"),
            "series_index": row.get("series_index"),
            "rating_count": int(row.get("rating_count") or 0),
            "rating_average": float(row.get("rating_average") or 0),
            "popularity_score": float(row.get("popularity_score") or 0),
        }


    def list_books(self) -> list[dict]:
        response = self._request(
            "GET",
            "/rest/v1/books",
            params={"select": self.BOOK_COLUMNS, "order": "title.asc", "limit": 1000},
        )
        return [self._book(row) for row in response.json()]


    @staticmethod
    def _search_phrase(query: str) -> str:
        cleaned = re.sub(r"[^\w\sçğıöşüÇĞİÖŞÜ-]", " ", query, flags=re.UNICODE)
        return " ".join(cleaned.split())[:200]


    def search_books(self, query: str | None, limit: int, offset: int, sort: str = "title") -> dict:
        params: dict[str, Any] = {
            "select": self.BOOK_COLUMNS,
            "order": "popularity_score.desc,rating_count.desc,title.asc" if sort == "popular" else "title.asc",
            "limit": limit,
            "offset": offset,
        }
        phrase = self._search_phrase((query or "").strip())
        if phrase:
            pattern = f"*{phrase}*"
            params["or"] = (
                f"(title.ilike.{pattern},author.ilike.{pattern},"
                f"genre.ilike.{pattern},description.ilike.{pattern})"
            )
        response = self._request(
            "GET",
            "/rest/v1/books",
            params=params,
            extra_headers={"Prefer": "count=exact"},
        )
        content_range = response.headers.get("content-range", "0-0/0")
        total_text = content_range.rsplit("/", 1)[-1]
        total = int(total_text) if total_text.isdigit() else len(response.json())
        return {
            "items": [self._book(row) for row in response.json()],
            "total": total,
            "limit": limit,
            "offset": offset,
        }


    def _count(self, table: str, params: dict[str, Any] | None = None) -> int:
        query = {"select": "*", "limit": 1, **(params or {})}
        response = self._request(
            "GET",
            f"/rest/v1/{table}",
            params=query,
            extra_headers={"Prefer": "count=exact"},
        )
        total = response.headers.get("content-range", "0-0/0").rsplit("/", 1)[-1]
        return int(total) if total.isdigit() else 0


    def catalog_coverage(self) -> dict:
        offers_response = self._request(
            "GET",
            "/rest/v1/offers",
            params={"select": "checked_at,editions(book_id)", "limit": 1000},
        )
        offer_rows = offers_response.json()
        priced_books = {
            row.get("editions", {}).get("book_id")
            for row in offer_rows
            if row.get("editions") and row["editions"].get("book_id")
        }
        last_price_check = max(
            (row.get("checked_at") for row in offer_rows if row.get("checked_at")),
            default=None,
        )
        return {
            "books": self._count("books"),
            "recommendable_books": self._count("books", {"is_recommendable": "eq.true"}),
            "low_quality_books": self._count("books", {"quality_score": "lt.0.48"}),
            "editions": self._count("editions"),
            "verified_turkish_editions": self._count(
                "editions",
                {
                    "language": "eq.tur",
                    "verification_status": "in.(verified,retailer_verified)",
                },
            ),
            "priced_books": len(priced_books),
            "offers": len(offer_rows),
            "last_price_check": last_price_check,
        }


    def upsert_metadata_book(self, raw_record: dict) -> str:
        """Merge external metadata at work level and retain ISBN at edition level."""
        record = enrich_book_record(raw_record)
        existing_rows = self._request(
            "GET", "/rest/v1/books", admin=True,
            params={
                "select": "id,source_name",
                "canonical_work_key": f"eq.{record['canonical_work_key']}",
                "limit": 10,
            },
        ).json()
        if not existing_rows:
            existing_rows = self._request(
                "GET", "/rest/v1/books", admin=True,
                params={
                    "select": "id,source_name",
                    "title": f"eq.{record['title']}",
                    "author": f"eq.{record['author']}",
                    "limit": 10,
                },
            ).json()
        if not existing_rows:
            existing_rows = self._request(
                "GET", "/rest/v1/books", admin=True,
                params={"select": "id,source_name", "id": f"eq.{record['id']}", "limit": 1},
            ).json()
        existing_rows.sort(key=lambda row: row.get("source_name") != "local_curated")
        existing = existing_rows[0] if existing_rows else None
        book_id = existing["id"] if existing else record["id"]
        book_payload = {
            "id": book_id,
            "title": record["title"],
            "author": record["author"],
            "canonical_work_key": record["canonical_work_key"],
            "genre": record["genre"],
            "publication_type": record["publication_type"],
            "language": record["language"],
            "original_language": record.get("original_language"),
            "page_count": record["page_count"],
            "themes": record["themes"],
            "character_traits": record["character_traits"],
            "atmosphere": record["atmosphere"], "narrative_style": record["narrative_style"],
            "narrative_pace": record["narrative_pace"],
            "description": record["description"],
            "quality_score": record["quality_score"],
            "quality_flags": record["quality_flags"],
            "is_recommendable": record["is_recommendable"],
            "source_name": record.get("source_name"),
            "source_url": record.get("source_url"),
            "cover_url": record.get("cover_url"),
            "metadata_updated_at": record.get("metadata_updated_at"),
        }
        if not existing:
            self._request(
                "POST", "/rest/v1/books", admin=True, json_body=book_payload,
                extra_headers={"Prefer": "return=minimal"},
            )
        elif existing.get("source_name") != "local_curated":
            self._request(
                "PATCH", "/rest/v1/books", admin=True,
                params={"id": f"eq.{book_id}"}, json_body=book_payload,
                extra_headers={"Prefer": "return=minimal"},
            )
        if record.get("isbn"):
            isbn10, isbn13 = normalize_isbn(record["isbn"])
            # Production editions use ISBN-13 as the canonical key; valid
            # ISBN-10 values are converted by normalize_isbn.
            canonical_isbn = isbn13
            if not canonical_isbn:
                return book_id
            self._request(
                "POST", "/rest/v1/editions", admin=True,
                params={"on_conflict": "isbn"},
                json_body={
                    "isbn": canonical_isbn, "isbn10": isbn10, "isbn13": isbn13, "book_id": book_id,
                    "title": record["title"], "author": record["author"],
                    "publisher": record.get("publisher"),
                    "translator": record.get("translator"), "edition_label": record.get("edition_label"),
                    "language": record["language"], "page_count": record["page_count"],
                    "source_name": record.get("source_name"),
                    "source_url": record.get("source_url"),
                },
                extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            )
        return book_id

"""Eserleri Open Library'nin Türkçe baskı kayıtlarıyla ISBN-13 düzeyinde doğrular."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from app.services.outbound_http import SafeHTTPSession


SEARCH_URL = "https://openlibrary.org/search.json"
USER_AGENT = "AkilliKitapDanismaniEditionVerifier/1.0"


def valid_isbn13(value: str) -> bool:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) != 13 or not digits.startswith(("978", "979")):
        return False
    total = sum(int(digit) * (1 if index % 2 == 0 else 3) for index, digit in enumerate(digits[:12]))
    return (10 - total % 10) % 10 == int(digits[-1])


def parse_turkish_edition(payload: dict, book: dict) -> dict | None:
    for work in payload.get("docs", []):
        editions = (work.get("editions") or {}).get("docs", [])
        for edition in editions:
            if "tur" not in (edition.get("language") or []):
                continue
            isbn = next((str(value) for value in edition.get("isbn", []) if valid_isbn13(str(value))), None)
            key = edition.get("key")
            if not isbn or not key:
                continue
            publishers = edition.get("publisher") or []
            dates = edition.get("publish_date") or []
            return {
                "isbn": isbn,
                "book_id": book["id"],
                "title": edition.get("title") or book["title"],
                "author": book["author"],
                "publisher": publishers[0] if publishers else None,
                "language": "tur",
                "published_date": dates[0] if dates else None,
                "source_name": "Open Library Edition",
                "source_url": f"https://openlibrary.org{key}",
                "verification_status": "verified",
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }
    return None


class TurkishEditionVerifier:
    def __init__(self, timeout: int = 12) -> None:
        self.timeout = timeout
        self.session = SafeHTTPSession({"openlibrary.org"})

    def verify(self, book: dict) -> dict | None:
        query = f'title:"{book["title"]}" author:"{book["author"]}" language:tur'
        params = {
            "q": query,
            "limit": 3,
            "fields": "key,title,author_name,editions,editions.key,editions.title,editions.language,editions.isbn,editions.publisher,editions.publish_date",
        }
        response = self.session.get(SEARCH_URL, params=params, timeout=self.timeout, headers={"User-Agent": USER_AGENT})
        response.raise_for_status()
        return parse_turkish_edition(response.json(), book)

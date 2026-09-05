"""Open Library Search API'den Türkçe katalog metadata'sı alır."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from requests import RequestException
from app.services.outbound_http import safe_get

from app.services.google_books import TRAITS, _genre, _plain_text


API_URL = "https://openlibrary.org/search.json"


def parse_document(document: dict) -> dict | None:
    title = _plain_text(document.get("title", ""))
    authors = [_plain_text(value) for value in document.get("author_name", []) if _plain_text(value)]
    languages = document.get("language") or []
    isbns = [value for value in document.get("isbn", []) if len(value) == 13 and value.isdigit()]
    subjects = [_plain_text(value) for value in document.get("subject", []) if _plain_text(value)][:8]
    work_key = document.get("key")
    if not title or not authors or "tur" not in languages or not isbns or not work_key:
        return None
    genre = _genre(title, "", subjects)
    author = ", ".join(authors)[:200]
    category_text = ", ".join(subjects[:3]) if subjects else genre
    description = f"{author} tarafından yazılan bu eser, Open Library kataloğunda {category_text} başlıkları altında sınıflandırılmıştır. Ayrıntılar ve baskı bilgileri kaynak kaydından doğrulanabilir."
    cover_id = document.get("cover_i")
    publishers = document.get("publisher") or []
    return {
        "id": f"openlibrary-{work_key.rsplit('/', 1)[-1]}",
        "title": title[:255],
        "author": author,
        "genre": genre,
        "themes": subjects or [genre],
        "character_traits": TRAITS[genre],
        "description": description[:900],
        "source_name": "Open Library",
        "source_url": f"https://openlibrary.org{work_key}",
        "cover_url": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
        "metadata_updated_at": datetime.now(timezone.utc).isoformat(),
        "isbn": isbns[0],
        "publisher": _plain_text(publishers[0])[:200] if publishers else None,
        "language": "tr",
        "page_count": document.get("number_of_pages_median"),
    }


class OpenLibraryClient:
    def __init__(self, timeout: int = 20) -> None:
        self.timeout = timeout

    def search(self, query: str, page: int = 1, limit: int = 40) -> list[dict]:
        params = {
            "q": query,
            "language": "tur",
            "page": page,
            "limit": min(limit, 100),
            "fields": "key,title,author_name,language,isbn,subject,cover_i,publisher,number_of_pages_median,first_publish_year",
        }
        response = safe_get(API_URL, allowed_hosts={"openlibrary.org"}, params=params,
                            timeout=self.timeout,
                            headers={"User-Agent": "AkilliKitapDanismani/1.0 (educational catalog)"})
        response.raise_for_status()
        return response.json().get("docs", [])

    def iter_records(self, queries: list[str], pages: int, page_size: int, delay: float):
        seen: set[str] = set()
        for query in queries:
            for page in range(1, pages + 1):
                documents = None
                for attempt in range(3):
                    try:
                        documents = self.search(query, page, page_size)
                        break
                    except (TimeoutError, RequestException) as error:
                        if attempt == 2:
                            print(f"Open Library sorgusu atlandı: {query!r}, sayfa {page}: {error}")
                        else:
                            time.sleep(1.5 * (attempt + 1))
                if documents is None:
                    continue
                for document in documents:
                    record = parse_document(document)
                    if record and record["isbn"] not in seen:
                        seen.add(record["isbn"])
                        yield record
                if delay:
                    time.sleep(delay)

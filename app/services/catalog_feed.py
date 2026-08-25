"""Validation and normalization for licensed publisher/distributor catalog feeds."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import urlparse

from app.services.catalog_quality import normalize_isbn
from app.services.google_books import TRAITS, _genre, _plain_text


def normalize_feed_record(raw: dict, source_name: str) -> dict:
    title = _plain_text(str(raw.get("title") or ""))[:255]
    author = _plain_text(str(raw.get("author") or ""))[:200]
    raw_isbn = str(raw.get("isbn13") or raw.get("isbn") or "")
    _, isbn13 = normalize_isbn(raw_isbn)
    if not title or not author:
        raise ValueError("title ve author zorunludur")
    if not isbn13:
        raise ValueError("geçerli ISBN-13 zorunludur")
    language = str(raw.get("language") or "tr").strip().casefold()
    if language not in {"tr", "tur"}:
        raise ValueError("yalnızca Türkçe baskılar içe aktarılabilir")
    description = _plain_text(str(raw.get("description") or ""))
    categories = [
        _plain_text(item) for item in str(raw.get("themes") or raw.get("categories") or "").split("|")
        if _plain_text(item)
    ][:8]
    genre = _plain_text(str(raw.get("genre") or "")) or _genre(title, description, categories)
    source_url = str(raw.get("source_url") or "").strip() or None
    if source_url and urlparse(source_url).scheme not in {"http", "https"}:
        raise ValueError("source_url http veya https olmalıdır")
    try:
        page_count = int(raw["page_count"]) if raw.get("page_count") not in {None, ""} else None
    except (TypeError, ValueError) as error:
        raise ValueError("page_count tam sayı olmalıdır") from error
    if page_count is not None and not 1 <= page_count <= 20_000:
        raise ValueError("page_count 1 ile 20000 arasında olmalıdır")
    return {
        "id": f"feed-{isbn13}",
        "isbn": isbn13,
        "title": title,
        "author": author,
        "genre": genre or "Genel",
        "themes": categories or [genre or "Genel"],
        "character_traits": TRAITS.get(genre, ["meraklı"]),
        "description": description[:900] or f"{author} tarafından yazılan {title} kitabının doğrulanmış Türkçe baskısı.",
        "publisher": _plain_text(str(raw.get("publisher") or ""))[:200] or None,
        "translator": _plain_text(str(raw.get("translator") or ""))[:200] or None,
        "page_count": page_count,
        "language": "tr",
        "cover_url": str(raw.get("cover_url") or "").strip() or None,
        "source_name": source_name,
        "source_url": source_url,
    }


def iter_feed(path: Path, source_name: str):
    suffix = path.suffix.casefold()
    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            yield from (normalize_feed_record(row, source_name) for row in csv.DictReader(stream))
        return
    if suffix in {".jsonl", ".ndjson"}:
        with path.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                if line.strip():
                    try:
                        yield normalize_feed_record(json.loads(line), source_name)
                    except json.JSONDecodeError as error:
                        raise ValueError(f"{line_number}. satır geçerli JSON değil") from error
        return
    raise ValueError("Feed biçimi .csv, .jsonl veya .ndjson olmalıdır")

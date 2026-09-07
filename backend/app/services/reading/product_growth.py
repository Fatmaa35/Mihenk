from __future__ import annotations

import csv
import hashlib
import io
from collections import Counter
from datetime import date, timedelta
from typing import Iterable


RECOMMENDATION_EVENTS = {
    "impression", "click", "library_add", "reading_start", "reading_finish", "like", "dislike"
}


def experiment_variant(user_id: str) -> str:
    """Stable 50/50 assignment; the same reader always sees the same variant."""
    bucket = int(hashlib.sha256(f"recommendations-v1:{user_id}".encode()).hexdigest()[:8], 16) % 100
    return "catalog_control" if bucket < 50 else "ai_assisted"


def parse_library_csv(raw: str, limit: int = 2_000) -> tuple[list[dict], list[str]]:
    """Parse Goodreads-style or generic CSV without trusting spreadsheet formulas."""
    if len(raw.encode("utf-8")) > 2_000_000:
        raise ValueError("CSV dosyası 2 MB sınırını aşıyor.")
    reader = csv.DictReader(io.StringIO(raw.lstrip("\ufeff")))
    if not reader.fieldnames:
        raise ValueError("CSV başlık satırı bulunamadı.")
    normalized = {name.casefold().strip(): name for name in reader.fieldnames if name}

    def field(row: dict, *names: str) -> str:
        for name in names:
            original = normalized.get(name.casefold())
            if original and row.get(original):
                value = str(row[original]).strip()
                if value.startswith(("=", "+", "-", "@")):
                    value = "'" + value
                return value
        return ""

    records: list[dict] = []
    warnings: list[str] = []
    for line, row in enumerate(reader, start=2):
        if len(records) >= limit:
            warnings.append(f"İlk {limit} kayıt işlendi; kalan satırlar atlandı.")
            break
        title = field(row, "title", "book title", "kitap", "kitap adı")
        if not title:
            warnings.append(f"{line}. satır: kitap adı bulunamadı.")
            continue
        shelf_raw = field(row, "exclusive shelf", "shelf", "raf").casefold()
        shelf = {
            "read": "read", "okudum": "read", "currently-reading": "reading", "reading": "reading",
            "okuyorum": "reading", "to-read": "to_read", "to_read": "to_read", "okuyacağım": "to_read",
            "abandoned": "abandoned", "yarım bıraktım": "abandoned",
        }.get(shelf_raw, "to_read")
        isbn = "".join(ch for ch in field(row, "isbn13", "isbn", "ISBN13", "ISBN") if ch.isdigit() or ch.upper() == "X")
        records.append({
            "title": title[:255],
            "author": field(row, "author", "yazar")[:200] or "Bilinmeyen yazar",
            "isbn": isbn if len(isbn) in {10, 13} else None,
            "shelf": shelf,
            "rating": field(row, "my rating", "rating", "puan"),
        })
    return records, warnings[:50]


def funnel_metrics(rows: Iterable[dict]) -> dict:
    variants: dict[str, Counter] = {}
    for row in rows:
        variants.setdefault(row["experiment_variant"], Counter())[row["event_type"]] += 1
    result = {}
    for variant, counts in variants.items():
        impressions = max(1, counts["impression"])
        result[variant] = {
            "counts": dict(counts),
            "click_through_rate": round(counts["click"] / impressions, 4),
            "library_add_rate": round(counts["library_add"] / impressions, 4),
            "reading_start_rate": round(counts["reading_start"] / impressions, 4),
            "reading_finish_rate": round(counts["reading_finish"] / impressions, 4),
            "positive_feedback_rate": round(counts["like"] / max(1, counts["like"] + counts["dislike"]), 4),
        }
    return result


def weekly_window(today: date | None = None) -> tuple[str, str]:
    end = today or date.today()
    return (end - timedelta(days=6)).isoformat(), end.isoformat()


def onboarding_tasks(profile: dict, onboarding: dict) -> list[dict]:
    library_size = sum(len(profile.get(key, [])) for key in ("reading_books", "to_read_books", "read_books"))
    tasks = [
        {"key": "taste", "title": "Okuma zevkini tanımla", "done": bool(onboarding.get("onboarding_completed"))},
        {"key": "favorites", "title": "En az 3 sevdiğin kitap veya yazar seç", "done": len(onboarding.get("liked_book_ids", [])) + len(onboarding.get("liked_authors", [])) >= 3},
        {"key": "library", "title": "İlk kitabını kitaplığına ekle", "done": library_size > 0},
        {"key": "goal", "title": "Yıllık okuma hedefini belirle", "done": bool(profile.get("reading_goal"))},
    ]
    return tasks

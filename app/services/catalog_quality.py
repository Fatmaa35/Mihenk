"""Catalog identity, publication classification and retrieval guardrails."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass


NON_RECOMMENDABLE_TYPES = {"academic", "reference", "unknown"}

GENRE_SIGNALS = {
    "polisiye": ("polisiye", "gizem", "dedektif", "suç"),
    "bilim kurgu": ("bilimkurgu", "bilim kurgu", "uzay", "distopya"),
    "fantastik": ("fantastik", "büyü", "epik"),
    "tarihî roman": ("tarihi roman", "tarihî roman"),
    "romantik": ("romantik", "aşk roman"),
    "korku-gerilim": ("korku", "gerilim"),
}
PACE_SIGNALS = {
    "fast": ("sürükleyici", "hızlı", "tempolu", "aksiyon"),
    "slow": ("yavaş", "sakin", "ağır tempolu", "meditatif"),
}
ATMOSPHERE_SIGNALS = (
    "atmosferik", "karanlık", "umutlu", "melankolik", "tekinsiz", "sıcak",
    "kasvetli", "gizemli", "neşeli", "gerilimli",
)
STYLE_SIGNALS = (
    "kolay okunan", "şiirsel", "deneysel", "sade", "yoğun", "mizahi",
    "karakter odaklı", "olay odaklı", "çok katmanlı",
)

REFERENCE_SIGNALS = (
    "ansiklopedi", "encyclopedia", "sözlük", "dictionary", "bibliyograf",
    "bibliograph", "kaynakça", "rehber", "handbook", "catalogue", "katalog",
)
ACADEMIC_SIGNALS = (
    "ders kitab", "öğrenciler için", "öğrencilere", "seçme örnekler",
    "history and criticism", "eleştiri tarihi", "araştırmaları", "sempozyum",
    "bildiriler", "tezler", "incelemeler", "yazarları", "sosyolojiye giriş",
)

TYPE_BY_GENRE = {
    "deneme": "essay",
    "şiir": "poetry",
    "çocuk ve gençlik": "children",
    "biyografi": "nonfiction",
    "felsefe": "nonfiction",
    "sosyoloji": "nonfiction",
    "ekonomi": "nonfiction",
    "bilim": "nonfiction",
    "sanat": "nonfiction",
    "psikoloji": "nonfiction",
    "tarih": "nonfiction",
}

FICTION_GENRE_SIGNALS = (
    "roman", "öykü", "hikâye", "hikaye", "polisiye", "bilim kurgu",
    "fantastik", "gerilim", "korku", "macera", "romantik", "grafik roman",
    "klasik", "mizah",
)


def _ascii_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    without_marks = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_marks).strip()


def canonical_work_key(title: str, author: str) -> str:
    identity = f"{_ascii_key(title)}|{_ascii_key(author)}"
    return "work-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]


def deduplicate_library_entries(entries: list[dict]) -> list[dict]:
    """Collapse legacy custom/catalog copies of the same work into one library card."""
    unique: dict[str, dict] = {}
    shelf_rank = {"abandoned": 0, "to_read": 1, "reading": 2, "read": 3}
    for source in entries:
        key = canonical_work_key(source.get("title", ""), source.get("author", ""))
        current = unique.get(key)
        if current is None:
            unique[key] = dict(source)
            continue

        # Prefer the catalog identity, while retaining richer personal state.
        if current.get("is_custom") and not source.get("is_custom"):
            primary, secondary = dict(source), current
        else:
            primary, secondary = current, source
        primary["is_favorite"] = bool(primary.get("is_favorite") or secondary.get("is_favorite"))
        primary["current_page"] = max(primary.get("current_page") or 0, secondary.get("current_page") or 0)
        primary["total_pages"] = primary.get("total_pages") or secondary.get("total_pages")
        if not primary.get("cover_url") and secondary.get("cover_url"):
            primary["cover_url"] = secondary["cover_url"]
        if shelf_rank.get(secondary.get("shelf"), -1) > shelf_rank.get(primary.get("shelf"), -1):
            primary["shelf"] = secondary["shelf"]
        if primary.get("total_pages"):
            primary["progress_percent"] = round(
                min(primary["current_page"], primary["total_pages"]) / primary["total_pages"] * 100, 1
            )
        primary["started_at"] = primary.get("started_at") or secondary.get("started_at")
        primary["finished_at"] = primary.get("finished_at") or secondary.get("finished_at")
        primary["library_updated_at"] = max(
            filter(None, (primary.get("library_updated_at"), secondary.get("library_updated_at"))),
            default=None,
        )
        unique[key] = primary
    return sorted(unique.values(), key=lambda item: item.get("title", "").casefold())


def normalize_isbn(value: str | None) -> tuple[str | None, str | None]:
    """Return validated ISBN-10/ISBN-13 without punctuation."""
    compact = re.sub(r"[^0-9Xx]", "", value or "").upper()
    if len(compact) == 10:
        total = sum((10 - index) * (10 if char == "X" else int(char)) for index, char in enumerate(compact))
        if total % 11:
            return None, None
        core = "978" + compact[:9]
        check = (10 - sum((1 if index % 2 == 0 else 3) * int(char) for index, char in enumerate(core)) % 10) % 10
        return compact, core + str(check)
    if len(compact) == 13 and compact.startswith(("978", "979")):
        check = (10 - sum((1 if index % 2 == 0 else 3) * int(char) for index, char in enumerate(compact[:12])) % 10) % 10
        if check == int(compact[-1]):
            return None, compact
    return None, None


def infer_publication_type(title: str, genre: str, themes: list[str] | None = None) -> str:
    haystack = " ".join([title, genre, *(themes or [])]).casefold()
    if any(signal in haystack for signal in REFERENCE_SIGNALS):
        return "reference"
    if any(signal in haystack for signal in ACADEMIC_SIGNALS):
        return "academic"
    normalized_genre = genre.casefold().strip()
    if any(signal in normalized_genre for signal in FICTION_GENRE_SIGNALS):
        return "fiction"
    for label, publication_type in TYPE_BY_GENRE.items():
        if label in normalized_genre:
            return publication_type
    return "unknown" if normalized_genre in {"", "genel"} else "nonfiction"


def assess_book_quality(book: dict) -> tuple[float, list[str]]:
    flags: list[str] = []
    source = (book.get("source_name") or "").casefold()
    description = (book.get("description") or "").strip()
    publication_type = book.get("publication_type") or infer_publication_type(
        book.get("title", ""), book.get("genre", ""), book.get("themes") or []
    )
    if source == "local_curated":
        return 0.98, ["editorial_curated"]

    score = 0.20 if book.get("title") and book.get("author") else 0.0
    if book.get("isbn"):
        score += 0.14
    else:
        flags.append("missing_isbn")
    if book.get("cover_url"):
        score += 0.10
    else:
        flags.append("missing_cover")
    if book.get("genre") and book.get("genre") != "Genel":
        score += 0.10
    else:
        flags.append("generic_genre")
    if len(book.get("themes") or []) >= 2:
        score += 0.08
    boilerplate = "open library kataloğunda" in description.casefold()
    if len(description) >= 120 and not boilerplate:
        score += 0.14
    else:
        flags.append("weak_description")
    if book.get("source_url"):
        score += 0.08
    if book.get("publisher"):
        score += 0.06
    if book.get("page_count"):
        score += 0.05
    else:
        flags.append("missing_page_count")
    if publication_type in NON_RECOMMENDABLE_TYPES:
        flags.append(f"publication_type:{publication_type}")
        score = min(score, 0.44)
    return round(min(1.0, score), 2), flags


def enrich_book_record(book: dict) -> dict:
    enriched = dict(book)
    enriched["canonical_work_key"] = book.get("canonical_work_key") or canonical_work_key(
        book["title"], book["author"]
    )
    current_type = book.get("publication_type")
    enriched["publication_type"] = (
        infer_publication_type(book["title"], book.get("genre", ""), book.get("themes") or [])
        if current_type in {None, "", "unknown"}
        else current_type
    )
    enriched["language"] = (book.get("language") or "tr").casefold()[:8]
    enriched["original_language"] = (book.get("original_language") or "").casefold()[:8] or None
    page_count = book.get("page_count")
    enriched["page_count"] = int(page_count) if page_count and int(page_count) > 0 else None
    haystack = " ".join([
        book.get("title", ""), book.get("genre", ""), book.get("description", ""),
        *(book.get("themes") or []),
    ]).casefold()
    enriched["atmosphere"] = book.get("atmosphere") or [item for item in ATMOSPHERE_SIGNALS if item in haystack]
    enriched["narrative_style"] = book.get("narrative_style") or [item for item in STYLE_SIGNALS if item in haystack]
    enriched["narrative_pace"] = book.get("narrative_pace") or next(
        (pace for pace, signals in PACE_SIGNALS.items() if any(signal in haystack for signal in signals)),
        "medium",
    )
    quality_score, quality_flags = assess_book_quality(enriched)
    enriched["quality_score"] = quality_score
    enriched["quality_flags"] = quality_flags
    enriched["is_recommendable"] = (
        enriched["publication_type"] not in NON_RECOMMENDABLE_TYPES
        and quality_score >= 0.48
    )
    return enriched


@dataclass(frozen=True)
class QueryIntent:
    publication_types: frozenset[str]
    genres: frozenset[str] = frozenset()
    language: str | None = None
    min_pages: int | None = None
    max_pages: int | None = None
    allow_reference: bool = False
    pace: str | None = None
    excluded_terms: frozenset[str] = frozenset()


def parse_query_intent(query: str) -> QueryIntent:
    text = query.casefold()
    types: set[str] = set()
    if any(token in text for token in ("roman", "öykü", "hikâye", "hikaye", "polisiye", "gizem", "gerilim", "fantastik", "bilimkurgu", "bilim kurgu", "macera")):
        types.add("fiction")
    if "deneme" in text:
        types.add("essay")
    if "şiir" in text:
        types.add("poetry")
    if any(token in text for token in ("biyografi", "otobiyografi", "anı", "kurgu dışı", "tarih kitab", "felsefe kitab")):
        types.add("nonfiction")
    if any(token in text for token in ("çocuk", "gençlik")):
        types.add("children")
    language = "eng" if any(token in text for token in ("ingilizce", "english")) else None
    if any(token in text for token in ("türkçe", "türkçe çeviri")):
        language = "tr"
    min_pages = 350 if any(token in text for token in ("uzun roman", "kalın kitap", "uzun kitap")) else None
    max_pages = 220 if any(token in text for token in ("çok kısa", "tek oturuşta")) else 320 if any(token in text for token in ("kısa", "ince kitap")) else None
    allow_reference = any(token in text for token in ("akademik", "kaynak kitap", "başvuru", "ders kitab", "sözlük", "ansiklopedi"))
    genres = {label for label, signals in GENRE_SIGNALS.items() if any(signal in text for signal in signals)}
    pace = next((label for label, signals in PACE_SIGNALS.items() if any(signal in text for signal in signals)), None)
    excluded_terms: set[str] = set()
    for match in re.finditer(
        r"([a-zçğıöşü]{3,20})\s+temalı olmayan|(?:istemiyorum|içermeyen)\s+([a-zçğıöşü ]{3,30})",
        text,
    ):
        excluded_terms.add(next(value for value in match.groups() if value).strip())
    if "savaş temalı olmayan" in text:
        excluded_terms.add("savaş")
    return QueryIntent(frozenset(types), frozenset(genres), language, min_pages, max_pages, allow_reference, pace, frozenset(excluded_terms))


def book_matches_intent(book: dict, intent: QueryIntent) -> bool:
    publication_type = book.get("publication_type", "unknown")
    if not book.get("is_recommendable", True) and not (
        intent.allow_reference and publication_type in {"academic", "reference"}
    ):
        return False
    if publication_type in {"academic", "reference"} and not intent.allow_reference:
        return False
    if intent.publication_types and publication_type not in intent.publication_types:
        return False
    if intent.genres:
        genre_text = f"{book.get('genre', '')} {' '.join(book.get('themes') or [])}".casefold()
        if not any(any(signal in genre_text for signal in GENRE_SIGNALS.get(genre, (genre,))) for genre in intent.genres):
            return False
    if intent.language and book.get("language") not in {intent.language, None, ""}:
        return False
    pages = book.get("page_count")
    if pages and intent.min_pages and pages < intent.min_pages:
        return False
    if pages and intent.max_pages and pages > intent.max_pages:
        return False
    if intent.pace and book.get("narrative_pace") not in {intent.pace, None, ""}:
        return False
    haystack = f"{book.get('title', '')} {book.get('genre', '')} {' '.join(book.get('themes') or [])} {book.get('description', '')}".casefold()
    if any(term in haystack for term in intent.excluded_terms):
        return False
    return True

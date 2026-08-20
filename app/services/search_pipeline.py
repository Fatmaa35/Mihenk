"""Explainable retrieval utilities shared by recommendation surfaces."""

from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
from dataclasses import asdict, replace
from hashlib import sha256
from threading import RLock
from time import monotonic

from app.services.catalog_quality import QueryIntent, book_matches_intent


class TTLResultCache:
    """Small process-local cache; replaceable by Redis without changing callers."""

    def __init__(self, ttl_seconds: int = 90, max_entries: int = 256) -> None:
        self.ttl_seconds, self.max_entries = ttl_seconds, max_entries
        self._items: OrderedDict[str, tuple[float, object]] = OrderedDict()
        self._lock = RLock()

    @staticmethod
    def key(*parts: object) -> str:
        return sha256(repr(parts).encode("utf-8")).hexdigest()

    def get(self, key: str):
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None
            expires_at, value = item
            if expires_at <= monotonic():
                self._items.pop(key, None)
                return None
            self._items.move_to_end(key)
            return deepcopy(value)

    def put(self, key: str, value: object) -> None:
        with self._lock:
            self._items[key] = (monotonic() + self.ttl_seconds, deepcopy(value))
            self._items.move_to_end(key)
            while len(self._items) > self.max_entries:
                self._items.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


def filter_stages(intent: QueryIntent) -> list[tuple[str, QueryIntent]]:
    """Relax positive constraints only; safety and negative themes stay hard."""
    stages = [("strict", intent)]
    current = intent
    if current.pace:
        current = replace(current, pace=None)
        stages.append(("pace_relaxed", current))
    if current.min_pages is not None or current.max_pages is not None:
        current = replace(current, min_pages=None, max_pages=None)
        stages.append(("page_range_relaxed", current))
    if current.genres:
        current = replace(current, genres=frozenset())
        stages.append(("genre_relaxed", current))
    return stages


def controlled_filter(candidates: list, intent: QueryIntent, desired_pool: int = 30):
    stages = filter_stages(intent)
    selected, used_stage = [], "strict"
    for stage, stage_intent in stages:
        selected = [candidate for candidate in candidates if book_matches_intent(candidate.book, stage_intent)]
        used_stage = stage
        if len(selected) >= desired_pool:
            break
    return selected, used_stage


def query_explanation(intent: QueryIntent, relaxation: str, cache_hit: bool = False) -> dict:
    filters: list[str] = []
    if intent.publication_types:
        labels = {"fiction": "kurgu/roman", "nonfiction": "kurgu dışı", "essay": "deneme", "poetry": "şiir", "children": "çocuk/gençlik"}
        filters.append("yayın türü: " + ", ".join(labels.get(item, item) for item in sorted(intent.publication_types)))
    if intent.genres:
        filters.append("tür: " + ", ".join(sorted(intent.genres)))
    if intent.language:
        filters.append("dil: " + intent.language)
    if intent.max_pages:
        filters.append(f"en fazla {intent.max_pages} sayfa")
    if intent.min_pages:
        filters.append(f"en az {intent.min_pages} sayfa")
    if intent.pace:
        filters.append("tempo: " + intent.pace)
    if intent.excluded_terms:
        filters.append("hariç: " + ", ".join(sorted(intent.excluded_terms)))
    relaxation_labels = {
        "strict": None,
        "pace_relaxed": "Yeterli aday için tempo filtresi gevşetildi.",
        "page_range_relaxed": "Yeterli aday için tempo ve sayfa aralığı gevşetildi.",
        "genre_relaxed": "Pozitif tür filtresi gevşetildi; negatif temalar korunuyor.",
    }
    return {
        "applied_filters": filters,
        "relaxation": relaxation_labels.get(relaxation),
        "cache_hit": cache_hit,
        "ranking_layers": ["alan ağırlıklı tam metin/typo toleransı", "pgvector semantik benzerlik", "kullanıcı profili", "katalog kalitesi ve popülerlik", "Gemma yeniden sıralaması", "yazar/eser çeşitliliği"],
        "fallback": "Gemma kullanılamazsa deterministik katalog sırası korunur.",
    }


def diversify(ranked: list[dict], limit: int, lambda_relevance: float = .82) -> list[dict]:
    """MMR-like deterministic diversification by work, author, genre and series."""
    remaining, selected, seen_works = list(ranked), [], set()
    while remaining and len(selected) < limit:
        def adjusted(item: dict) -> tuple[float, float, str]:
            book = item["book"]
            if book.get("canonical_work_key") in seen_works:
                return (-1.0, item.get("ranking_score", item["match_score"]), book["title"])
            similarity = 0.0
            for chosen in selected:
                other = chosen["book"]
                similarity = max(similarity,
                    .65 if book.get("author") == other.get("author") else 0,
                    .45 if book.get("series_name") and book.get("series_name") == other.get("series_name") else 0,
                    .22 if book.get("genre") == other.get("genre") else 0)
            relevance = item.get("ranking_score", item["match_score"])
            value = lambda_relevance * relevance - (1 - lambda_relevance) * similarity
            return (value, relevance, book["title"])
        best = max(remaining, key=adjusted)
        remaining.remove(best)
        work = best["book"].get("canonical_work_key")
        if work in seen_works:
            continue
        if work:
            seen_works.add(work)
        selected.append(best)
    return selected


def serializable_intent(intent: QueryIntent) -> dict:
    return {key: sorted(value) if isinstance(value, frozenset) else value for key, value in asdict(intent).items()}

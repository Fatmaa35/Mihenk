from collections import Counter

from app.services.catalog_quality import book_matches_intent, parse_query_intent
from app.services.vector_search import LocalVectorIndex, SearchIndex, expand_query, tokenize
from app.services.search_pipeline import TTLResultCache, controlled_filter, diversify, query_explanation


CHARACTER_WEIGHT = 0.45
THEME_WEIGHT = 0.15
HISTORY_WEIGHT = 0.40
QUALITY_WEIGHT = 0.08
POPULARITY_WEIGHT = 0.10
RETRIEVAL_POOL_SIZE = 50


class ConsensusRecommender:
    """Aday getirme, SQL filtreleme ve açıklanabilir ağırlıklı sıralama."""

    def __init__(self, books: list[dict], index: SearchIndex | None = None) -> None:
        self.books = books
        self.index = index or LocalVectorIndex(books)
        self.cache = TTLResultCache()
        self.last_query_explanation: dict = {}

    @staticmethod
    def _history_terms(profile: dict) -> Counter:
        terms: Counter = Counter()
        for book in profile["favorite_books"]:
            terms.update({term: 3 for term in [book["genre"], *book["themes"], *book["character_traits"]]})
        for book in profile["read_books"]:
            terms.update({term: 1 for term in [book["genre"], *book["themes"], *book["character_traits"]]})
        feedback_weights = {"great_match": 4, "more_like_this": 3, "not_for_me": -5, "already_know": 0}
        books_by_id = {book["id"]: book for book in profile.get("feedback_books", [])}
        for feedback in profile.get("recommendation_feedback", []):
            book = books_by_id.get(feedback.get("book_id"))
            weight = feedback_weights.get(feedback.get("feedback_type"), 0)
            if book and weight:
                terms.update({term: weight for term in [book["genre"], *book["themes"], *book["character_traits"]]})
        for book in profile.get("abandoned_books", []):
            terms.update({term: -3 for term in [book["genre"], *book["themes"], *book["character_traits"]]})
        return terms

    @staticmethod
    def _history_score(book: dict, history: Counter) -> float:
        if not history:
            return 0.0
        candidate_terms = {book["genre"], *book["themes"], *book["character_traits"]}
        matched = sum(history[term] for term in candidate_terms)
        maximum = sum(value for value in sorted(history.values(), reverse=True)[:max(1, len(candidate_terms))] if value > 0)
        return max(0.0, min(1.0, matched / maximum)) if maximum else 0.0

    @staticmethod
    def _signal_matches(query: str, book: dict) -> tuple[float, list[str]]:
        query_terms = set(tokenize(expand_query(query)))
        theme_matches = [
            theme for theme in book["themes"]
            if query_terms.intersection(tokenize(theme))
        ]
        trait_matches = [
            trait for trait in book["character_traits"]
            if query_terms.intersection(tokenize(trait))
        ]
        theme_score = len(theme_matches) / max(1, len(book["themes"]))
        return min(1.0, theme_score), [*trait_matches, *theme_matches]

    def recommend(
        self, character_description: str, profile: dict, limit: int,
        access_token: str | None = None,
    ) -> tuple[str, list[dict]]:
        cache_key = self.cache.key(
            character_description.casefold().strip(), limit,
            profile.get("user", {}).get("id"),
            [(item.get("book_id"), item.get("feedback_type")) for item in profile.get("recommendation_feedback", [])],
        )
        cached = self.cache.get(cache_key)
        if cached:
            summary, selected, explanation = cached
            explanation["cache_hit"] = True
            self.last_query_explanation = explanation
            return summary, selected
        read_ids = {book["id"] for book in profile["read_books"]}
        watchlist_ids = {book["id"] for book in profile["to_read_books"]}
        history = self._history_terms(profile)
        excluded_feedback_ids = {
            item["book_id"] for item in profile.get("recommendation_feedback", [])
            if item.get("feedback_type") in {"not_for_me", "already_know"}
        }
        intent = parse_query_intent(character_description)
        raw_candidates = self.index.search(
            character_description, limit=len(self.books), access_token=access_token
        )
        filtered, relaxation = controlled_filter(raw_candidates, intent, RETRIEVAL_POOL_SIZE)
        ranked: list[dict] = []
        for candidate in filtered:
            book = candidate.book
            if book["id"] in read_ids or book["id"] in excluded_feedback_ids:
                continue
            history_score = self._history_score(book, history)
            theme_score, matched_signals = self._signal_matches(character_description, book)
            quality_score = float(book.get("quality_score", 0))
            popularity_score = min(1.0, float(book.get("popularity_score", 0)))
            score = (
                CHARACTER_WEIGHT * candidate.hybrid_score
                + THEME_WEIGHT * theme_score
                + HISTORY_WEIGHT * history_score
            )
            ranking_score = score + QUALITY_WEIGHT * quality_score + POPULARITY_WEIGHT * popularity_score
            ranked.append({
                "book": book,
                "character_score": candidate.hybrid_score,
                "semantic_score": candidate.semantic_score,
                "lexical_score": candidate.lexical_score,
                "history_score": history_score,
                "theme_score": theme_score,
                "matched_signals": matched_signals,
                "match_score": round(min(1.0, score), 4),
                "ranking_score": round(min(1.0, ranking_score), 4),
                "score_breakdown": {
                    "character": {
                        "raw_score": round(candidate.hybrid_score, 4),
                        "weight": CHARACTER_WEIGHT,
                        "contribution": round(CHARACTER_WEIGHT * candidate.hybrid_score, 4),
                    },
                    "themes": {
                        "raw_score": round(theme_score, 4),
                        "weight": THEME_WEIGHT,
                        "contribution": round(THEME_WEIGHT * theme_score, 4),
                    },
                    "reading_history": {
                        "raw_score": round(history_score, 4),
                        "weight": HISTORY_WEIGHT,
                        "contribution": round(HISTORY_WEIGHT * history_score, 4),
                    },
                    "semantic_score": round(candidate.semantic_score, 4),
                    "lexical_score": round(candidate.lexical_score, 4),
                    "matched_signals": matched_signals,
                    "quality_score": round(quality_score, 4),
                    "popularity_score": round(popularity_score, 4),
                },
                "already_in_watchlist": book["id"] in watchlist_ids,
            })
            if len(ranked) >= RETRIEVAL_POOL_SIZE:
                break

        ranked.sort(key=lambda item: (
            -int(item["already_in_watchlist"]),
            -item["ranking_score"],
            -float(item["book"].get("quality_score", 0)),
            item["book"]["title"],
        ))
        selected = diversify(ranked, limit)
        summary = self._summary(character_description, selected)
        self.last_query_explanation = query_explanation(intent, relaxation)
        self.cache.put(cache_key, (summary, selected, self.last_query_explanation))
        return summary, selected

    @staticmethod
    def _summary(description: str, candidates: list[dict]) -> str:
        if not candidates:
            return "Okunmamış katalog adayları arasında yeterli eşleşme bulunamadı."
        traits = []
        lowered = description.casefold()
        for item in candidates:
            for trait in item["book"]["character_traits"]:
                if trait.casefold() in lowered and trait not in traits:
                    traits.append(trait)
        signal_text = ", ".join(traits[:4]) if traits else "belirttiğiniz kişilik ve ilgi sinyalleri"
        return f"Profilinizde {signal_text} öne çıkıyor. Sonuçlar karakter uyumuna %45, tema uyumuna %15 ve okuma geçmişine %40 ağırlık verilerek sıralandı."

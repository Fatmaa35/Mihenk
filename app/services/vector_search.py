from dataclasses import dataclass
from collections import Counter
import math
import re
from typing import Protocol

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except (ImportError, OSError):
    # Managed Windows installations can block SciPy's native DLLs. Keep the
    # application usable by falling back to the pure-Python implementation.
    TfidfVectorizer = None
    cosine_similarity = None


@dataclass(frozen=True)
class VectorCandidate:
    book: dict
    semantic_score: float
    lexical_score: float
    hybrid_score: float


class SearchIndex(Protocol):
    def search(
        self, query: str, limit: int = 20, access_token: str | None = None,
    ) -> list[VectorCandidate]: ...


QUERY_EXPANSIONS = {
    "polisiye": ("gizem", "dedektif", "suç", "soruşturma"),
    "gizemli": ("gizem", "polisiye", "tekinsiz"),
    "kısa": ("ince", "novella", "öykü"),
    "kolay": ("sade", "akıcı", "kolay okunan"),
    "içe": ("içsel", "içedönük", "karakter odaklı"),
    "cinayet": ("suç", "polisiye", "gizem", "dedektif", "soruşturma"),
    "katil": ("suç", "cinayet", "polisiye", "gizem", "soruşturma"),
    "dedektif": ("polisiye", "gizem", "suç", "gözlem", "mantık"),
    "gerilim": ("gizem", "suç", "korku", "gotik"),
    "uzay": ("bilim", "teknoloji", "keşif", "bilim kurgu"),
    "romantik": ("aşk", "ilişkiler", "duygusal"),
    "hüzünlü": ("melankolik", "yalnızlık", "duygusal"),
}


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zçğıöşü0-9]+", text.casefold())


def expand_query(query: str) -> str:
    tokens = tokenize(query)
    expanded = list(tokens)
    for token in tokens:
        expanded.extend(QUERY_EXPANSIONS.get(token, ()))
    return " ".join(expanded)


def character_ngrams(text: str, minimum: int = 3, maximum: int = 5) -> Counter:
    normalized = f" {text.casefold()} "
    return Counter(
        normalized[index:index + size]
        for size in range(minimum, maximum + 1)
        for index in range(max(0, len(normalized) - size + 1))
    )


def counter_cosine(left: Counter, right: Counter) -> float:
    if not left or not right:
        return 0.0
    numerator = sum(left[item] * right[item] for item in left.keys() & right.keys())
    left_length = math.sqrt(sum(value * value for value in left.values()))
    right_length = math.sqrt(sum(value * value for value in right.values()))
    return numerator / (left_length * right_length) if left_length and right_length else 0.0


class BM25Index:
    def __init__(self, documents: list[str], k1: float = 1.5, b: float = 0.75) -> None:
        self.k1, self.b = k1, b
        self.documents = [Counter(tokenize(document)) for document in documents]
        self.lengths = [sum(document.values()) for document in self.documents]
        self.average_length = sum(self.lengths) / max(1, len(self.lengths))
        self.document_frequency: Counter = Counter()
        for document in self.documents:
            self.document_frequency.update(document.keys())

    def scores(self, query: str) -> list[float]:
        query_terms = tokenize(expand_query(query))
        raw_scores: list[float] = []
        document_count = len(self.documents)
        for document, length in zip(self.documents, self.lengths):
            score = 0.0
            for term in query_terms:
                frequency = document[term]
                if not frequency:
                    continue
                document_frequency = self.document_frequency[term]
                inverse_frequency = math.log(1 + (document_count - document_frequency + 0.5) / (document_frequency + 0.5))
                denominator = frequency + self.k1 * (1 - self.b + self.b * length / max(1, self.average_length))
                score += inverse_frequency * frequency * (self.k1 + 1) / denominator
            raw_scores.append(score)
        maximum = max(raw_scores, default=0.0)
        return [score / maximum if maximum else 0.0 for score in raw_scores]


class LocalVectorIndex:
    """Yerel TF-IDF vektör adaptörü; Chroma/FAISS aynı arayüzle eklenebilir."""

    def __init__(self, books: list[dict]) -> None:
        self.books = books
        documents = [self._document(book) for book in books]
        self.vectorizer = None
        self.matrix = None
        self.document_vectors = None
        if TfidfVectorizer is not None:
            self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), lowercase=True)
            self.matrix = self.vectorizer.fit_transform(documents)
        else:
            self.document_vectors = [character_ngrams(document) for document in documents]
        self.bm25 = BM25Index(documents)

    @staticmethod
    def _document(book: dict) -> str:
        # Repetition deliberately weights title > author > theme > description.
        return " ".join([
            book["title"], book["title"], book["title"],
            book["author"], book["author"], book["genre"], book["genre"],
            book.get("publication_type", ""),
            *book["themes"], *book["themes"], *book["character_traits"],
            *book.get("atmosphere", []), *book.get("narrative_style", []),
            book["description"],
        ])

    def search(
        self, query: str, limit: int = 20, access_token: str | None = None,
    ) -> list[VectorCandidate]:
        expanded_query = expand_query(query)
        if self.vectorizer is not None:
            query_vector = self.vectorizer.transform([expanded_query])
            semantic_scores = cosine_similarity(query_vector, self.matrix)[0]
        else:
            query_vector = character_ngrams(expanded_query)
            semantic_scores = [counter_cosine(query_vector, document) for document in self.document_vectors]
        lexical_scores = self.bm25.scores(query)
        hybrid_scores = [0.55 * float(semantic_scores[index]) + 0.45 * lexical_scores[index] for index in range(len(self.books))]
        order = sorted(range(len(self.books)), key=lambda index: hybrid_scores[index], reverse=True)[:limit]
        return [VectorCandidate(self.books[index], float(semantic_scores[index]), lexical_scores[index], hybrid_scores[index]) for index in order]


class PgVectorSearchIndex:
    """Supabase pgvector retrieval with a deterministic local fallback."""

    def __init__(self, books: list[dict], repository, embedding_provider) -> None:
        self.books_by_id = {book["id"]: book for book in books}
        self.repository = repository
        self.embedding_provider = embedding_provider
        self.fallback = LocalVectorIndex(books)

    def search(
        self, query: str, limit: int = 20, access_token: str | None = None,
    ) -> list[VectorCandidate]:
        if not access_token or not self.embedding_provider.available:
            return self.fallback.search(query, limit)
        try:
            query_embedding = self.embedding_provider.embed_query(query)
            rows = self.repository.semantic_book_search(
                query_embedding, limit=max(limit, 20), access_token=access_token, query=query
            )
            if not rows:
                return self.fallback.search(query, limit)
            lexical_by_id = {
                item.book["id"]: item.lexical_score
                for item in self.fallback.search(query, len(self.books_by_id))
            }
            candidates = []
            for row in rows:
                book = self.books_by_id.get(row["book_id"])
                if not book:
                    continue
                semantic = max(0.0, min(1.0, float(row["semantic_score"])))
                lexical = max(lexical_by_id.get(book["id"], 0.0), float(row.get("lexical_score", 0)))
                candidates.append(VectorCandidate(
                    book=book,
                    semantic_score=semantic,
                    lexical_score=lexical,
                    hybrid_score=0.70 * semantic + 0.30 * lexical,
                ))
            return candidates[:limit] or self.fallback.search(query, limit)
        except Exception:
            return self.fallback.search(query, limit)

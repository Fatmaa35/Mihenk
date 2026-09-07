from __future__ import annotations

import math


class EmbeddingUnavailable(RuntimeError):
    """Embedding provider is disabled or temporarily unavailable."""


class GeminiEmbeddingProvider:
    """Adapter around Gemini embeddings; provider details stay out of ranking."""

    def __init__(self, api_key: str, model: str, dimensions: int = 768) -> None:
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _normalize(self, values: list[float]) -> list[float]:
        if self.model != "gemini-embedding-001" or self.dimensions == 3072:
            return values
        magnitude = math.sqrt(sum(value * value for value in values))
        return [value / magnitude for value in values] if magnitude else values

    def _embed(self, contents: str | list[str], task_type: str) -> list[list[float]]:
        if not self.available:
            raise EmbeddingUnavailable("Embedding API anahtari tanimli degil.")
        from google import genai
        from google.genai import types

        try:
            response = genai.Client(api_key=self.api_key).models.embed_content(
                model=self.model,
                contents=contents,
                config=types.EmbedContentConfig(
                    output_dimensionality=self.dimensions,
                    task_type=task_type,
                ),
            )
            return [self._normalize(list(item.values)) for item in response.embeddings]
        except Exception as error:
            raise EmbeddingUnavailable("Embedding servisine ulasilamadi.") from error

    def embed_query(self, query: str) -> list[float]:
        return self._embed(query, "RETRIEVAL_QUERY")[0]

    def embed_documents(self, documents: list[str]) -> list[list[float]]:
        return self._embed(documents, "RETRIEVAL_DOCUMENT")

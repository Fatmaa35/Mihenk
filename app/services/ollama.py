import json
import asyncio

import httpx

from app.schemas import AIDiscoveredBook, CharacterRecommendationResponse
from app.services.gemini import (
    AI_MATCH_WEIGHT,
    CATALOG_MATCH_WEIGHT,
    GeminiExplainer,
    GeminiUnavailable,
)
from app.services.prompts import SYSTEM_PROMPT, build_prompt
from app.services.assistant_prompt import ASSISTANT_SYSTEM_PROMPT, build_assistant_context
from app.services.llm_profiles import ASSISTANT_PROFILE, MATCHER_PROFILE


class OllamaExplainer(GeminiExplainer):
    """Yerel Ollama API'si üzerinden yerel veya Cloud modellerini kullanır."""

    def __init__(self, base_url: str, model: str, enabled: bool) -> None:
        super().__init__("ollama-local", model, enabled)
        self.base_url = base_url.rstrip("/")

    async def explain(
        self, profile: dict, character_description: str, summary: str,
        candidates: list[dict], output_limit: int | None = None,
    ) -> CharacterRecommendationResponse:
        fallback = self._fallback(summary, candidates)
        if not self.enabled:
            if output_limit:
                fallback.recommended_books = fallback.recommended_books[:output_limit]
            return fallback
        return await asyncio.to_thread(
            self._explain_sync, profile, character_description, summary, candidates, output_limit
        )

    def _explain_sync(
        self, profile: dict, character_description: str, summary: str,
        candidates: list[dict], output_limit: int | None = None,
    ) -> CharacterRecommendationResponse:
        fallback = self._fallback(summary, candidates)
        try:
            response = httpx.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_prompt(profile, character_description, candidates, output_limit)},
                    ],
                    "stream": False,
                    "format": CharacterRecommendationResponse.model_json_schema(),
                    "options": {"temperature": MATCHER_PROFILE.temperature},
                    "keep_alive": "10m",
                },
                timeout=httpx.Timeout(90.0, connect=4.0),
            )
            response.raise_for_status()
            content = response.json()["message"]["content"].strip()
            try:
                parsed = CharacterRecommendationResponse.model_validate_json(
                    self._without_code_fence(content)
                )
            except ValueError:
                # Ollama Cloud modelleri JSON şemasını her zaman uygulamayabilir.
                # Böyle durumda yalnızca serbest metin özeti alınır; kitaplar ve skorlar
                # deterministik fallback yanıtından korunur.
                if self._apply_alternative_json(content, fallback, profile):
                    return fallback
                fallback.character_analysis_summary = self._safe_summary(content, summary)
                return fallback
            return self._guard(parsed, fallback, profile, output_limit)
        except (httpx.HTTPError, KeyError) as error:
            raise GeminiUnavailable("Ollama açıklama katmanına ulaşılamadı.") from error

    async def answer_book_question(
        self, question: str, profile: dict | None = None,
        history: list[dict] | None = None, active_view_context: dict | None = None,
    ) -> str:
        """Genel edebiyat sorularını dar kapsam ve belirsizlik kurallarıyla yanıtlar."""
        if not self.enabled:
            raise GeminiUnavailable("Ollama genel kitap danışmanı kapalı.")
        return await asyncio.to_thread(
            self._answer_sync, question, profile or {}, history or [], active_view_context
        )

    def _answer_sync(
        self, question: str, profile: dict, history: list[dict],
        active_view_context: dict | None,
    ) -> str:
        recent_history = history[-ASSISTANT_PROFILE.max_history_messages:]
        messages = [
            {"role": "system", "content": ASSISTANT_SYSTEM_PROMPT},
            {"role": "system", "content": build_assistant_context(profile, active_view_context)},
            *[
                {"role": item["role"], "content": item["content"]}
                for item in recent_history
            ],
            {"role": "user", "content": question},
        ]
        try:
            response = httpx.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": ASSISTANT_PROFILE.temperature},
                    "keep_alive": "10m",
                },
                timeout=httpx.Timeout(90.0, connect=4.0),
            )
            response.raise_for_status()
            answer = response.json()["message"]["content"].strip()
            if not answer or len(answer) > 8_000:
                raise ValueError("Geçersiz Ollama yanıtı")
            return answer
        except (httpx.HTTPError, KeyError, ValueError) as error:
            raise GeminiUnavailable("Ollama genel kitap danışmanına ulaşılamadı.") from error

    @staticmethod
    def _without_code_fence(content: str) -> str:
        if content.startswith("```") and content.endswith("```"):
            lines = content.splitlines()
            return "\n".join(lines[1:-1]).strip()
        return content

    @classmethod
    def _safe_summary(cls, content: str, fallback_summary: str) -> str:
        plain = cls._without_code_fence(content).strip()
        if not plain or len(plain) > 4_000:
            return fallback_summary
        return plain

    @classmethod
    def _apply_alternative_json(
        cls, content: str, trusted: CharacterRecommendationResponse,
        profile: dict | None = None,
    ) -> bool:
        try:
            payload = json.loads(cls._without_code_fence(content))
        except (json.JSONDecodeError, TypeError):
            return False
        if not isinstance(payload, dict):
            return False
        rows = payload.get("recommendations") or payload.get("recommended_books")
        if not isinstance(rows, list):
            rows = []
        assessments = {
            str(row.get("book_title", "")).casefold(): row
            for row in rows if isinstance(row, dict)
        }
        matched = False
        for book in trusted.recommended_books:
            assessment = assessments.get(book.book_title.casefold(), {})
            reason = assessment.get("reason") or assessment.get("reasoning")
            if isinstance(reason, str) and reason.strip():
                book.reasoning = reason.strip()
                matched = True
            ai_score = assessment.get("match_score")
            if isinstance(ai_score, (int, float)) and 0 <= ai_score <= 1:
                catalog_score = book.match_score
                book.score_breakdown.ai_score = float(ai_score)
                book.score_breakdown.ai_weight = AI_MATCH_WEIGHT
                book.score_breakdown.catalog_score = catalog_score
                book.score_breakdown.catalog_weight = CATALOG_MATCH_WEIGHT
                book.match_score = round(
                    AI_MATCH_WEIGHT * float(ai_score)
                    + CATALOG_MATCH_WEIGHT * catalog_score,
                    4,
                )
                matched = True
        discovery_rows = payload.get("ai_discoveries") or payload.get("discoveries")
        excluded = {book.book_title.casefold() for book in trusted.recommended_books}
        if profile:
            for shelf in ("read_books", "reading_books", "to_read_books", "favorite_books"):
                excluded.update(
                    book["title"].casefold()
                    for book in profile.get(shelf, []) if book.get("title")
                )
        if isinstance(discovery_rows, list):
            for row in discovery_rows:
                if not isinstance(row, dict):
                    continue
                normalized_row = {
                    "book_title": row.get("book_title") or row.get("title"),
                    "author": row.get("author"),
                    "genre": row.get("genre") or "Edebiyat",
                    "reasoning": row.get("reasoning") or row.get("reason"),
                }
                try:
                    discovery = AIDiscoveredBook.model_validate(normalized_row)
                except ValueError:
                    continue
                normalized = discovery.book_title.strip().casefold()
                if normalized in excluded:
                    continue
                excluded.add(normalized)
                trusted.ai_discoveries.append(discovery)
                matched = True
                if len(trusted.ai_discoveries) == 4:
                    break
        trusted.recommended_books.sort(
            key=lambda book: (-book.match_score, -int(book.already_in_watchlist), book.book_title)
        )
        return matched

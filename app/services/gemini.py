import asyncio

from app.schemas import CharacterRecommendationResponse
from app.services.assistant_prompt import ASSISTANT_SYSTEM_PROMPT, build_assistant_context
from app.services.llm_profiles import ASSISTANT_PROFILE, MATCHER_PROFILE
from app.services.prompts import SYSTEM_PROMPT, build_prompt


AI_MATCH_WEIGHT = 0.80
CATALOG_MATCH_WEIGHT = 0.20


class GeminiUnavailable(RuntimeError):
    """Gemini çağrısı yapılamadığında temel öneri akışının kullanacağı hata."""


class GeminiExplainer:
    """LLM yalnızca önceden seçilmiş adayların açıklamasını üretir."""

    def __init__(self, api_key: str, model: str, enabled: bool) -> None:
        self.api_key = api_key
        self.model = model
        self.enabled = enabled and bool(api_key)

    async def explain(self, profile: dict, character_description: str, summary: str, candidates: list[dict], output_limit: int | None = None) -> CharacterRecommendationResponse:
        fallback = self._fallback(summary, candidates)
        if not self.enabled:
            if output_limit:
                fallback.recommended_books = fallback.recommended_books[:output_limit]
            return fallback

        return await asyncio.to_thread(
            self._explain_sync, profile, character_description, fallback, candidates, output_limit
        )

    def _explain_sync(
        self, profile: dict, character_description: str,
        fallback: CharacterRecommendationResponse, candidates: list[dict], output_limit: int | None = None,
    ) -> CharacterRecommendationResponse:

        from google import genai
        from google.genai import types

        try:
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model,
                contents=build_prompt(profile, character_description, candidates, output_limit),
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=MATCHER_PROFILE.temperature,
                    response_mime_type="application/json",
                    response_schema=CharacterRecommendationResponse,
                ),
            )
            parsed = CharacterRecommendationResponse.model_validate_json(response.text)
            return self._guard(parsed, fallback, profile, output_limit)
        except Exception as error:
            raise GeminiUnavailable("Gemini açıklama katmanına ulaşılamadı.") from error

    async def answer_book_question(
        self, question: str, profile: dict | None = None,
        history: list[dict] | None = None, active_view_context: dict | None = None,
    ) -> str:
        if not self.enabled:
            raise GeminiUnavailable("Gemini edebiyat danışmanı kapalı.")
        return await asyncio.to_thread(
            self._answer_sync, question, profile or {}, history or [], active_view_context
        )

    def _answer_sync(
        self, question: str, profile: dict, history: list[dict],
        active_view_context: dict | None,
    ) -> str:
        from google import genai
        from google.genai import types

        try:
            client = genai.Client(api_key=self.api_key)
            transcript = "\n".join(
                f"{item['role']}: {item['content']}"
                for item in history[-ASSISTANT_PROFILE.max_history_messages:]
            )
            contents = (
                build_assistant_context(profile, active_view_context)
                + (f"\nSON KONUŞMA:\n{transcript}" if transcript else "")
                + f"\nKULLANICI SORUSU:\n{question}"
            )
            response = client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=ASSISTANT_SYSTEM_PROMPT,
                    temperature=ASSISTANT_PROFILE.temperature,
                ),
            )
            answer = response.text.strip()
            if not answer or len(answer) > 8_000:
                raise ValueError("Geçersiz Gemini yanıtı")
            return answer
        except Exception as error:
            raise GeminiUnavailable("Gemini edebiyat danışmanına ulaşılamadı.") from error

    @staticmethod
    def _fallback(summary: str, candidates: list[dict]) -> CharacterRecommendationResponse:
        return CharacterRecommendationResponse(
            character_analysis_summary=summary,
            recommended_books=[{
                "book_title": item["book"]["title"],
                "author": item["book"]["author"],
                "match_score": item["match_score"],
                "reasoning": f"{item['book']['description']} Karakter uyumu %{item['character_score'] * 100:.0f}, okuma geçmişi uyumu %{item['history_score'] * 100:.0f} olarak hesaplandı."
                    + (" Zaten okuma listenizde var!" if item["already_in_watchlist"] else ""),
                "genre": item["book"]["genre"],
                "already_in_watchlist": item["already_in_watchlist"],
                "score_breakdown": item["score_breakdown"],
            } for item in candidates],
        )

    @staticmethod
    def _guard(
        parsed: CharacterRecommendationResponse,
        trusted: CharacterRecommendationResponse,
        profile: dict | None = None,
        output_limit: int | None = None,
    ) -> CharacterRecommendationResponse:
        """Katalog verisini korur; nihai skorda Gemma 4'e %80 ağırlık verir."""
        assessments = {book.book_title.casefold(): book for book in parsed.recommended_books}
        for book in trusted.recommended_books:
            assessment = assessments.get(book.book_title.casefold())
            catalog_score = book.match_score
            book.score_breakdown.catalog_score = catalog_score
            if assessment:
                book.reasoning = assessment.reasoning
                book.score_breakdown.ai_score = assessment.match_score
                book.score_breakdown.ai_weight = AI_MATCH_WEIGHT
                book.score_breakdown.catalog_weight = CATALOG_MATCH_WEIGHT
                book.match_score = round(
                    AI_MATCH_WEIGHT * assessment.match_score
                    + CATALOG_MATCH_WEIGHT * catalog_score,
                    4,
                )
        if parsed.character_analysis_summary.strip():
            trusted.character_analysis_summary = parsed.character_analysis_summary
        trusted.recommended_books.sort(
            key=lambda book: (-book.match_score, -int(book.already_in_watchlist), book.book_title)
        )
        if output_limit:
            trusted.recommended_books = trusted.recommended_books[:output_limit]
        excluded = {book.book_title.casefold() for book in trusted.recommended_books}
        if profile:
            for shelf in ("read_books", "reading_books", "to_read_books", "favorite_books"):
                excluded.update(
                    book["title"].casefold()
                    for book in profile.get(shelf, []) if book.get("title")
                )
        discoveries = []
        for book in parsed.ai_discoveries:
            normalized = book.book_title.strip().casefold()
            if not normalized or normalized in excluded:
                continue
            excluded.add(normalized)
            discoveries.append(book)
            if len(discoveries) == 4:
                break
        trusted.ai_discoveries = discoveries
        return trusted

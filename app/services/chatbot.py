import re

from app.schemas import ChatResponse
from app.services.gemini import GeminiExplainer, GeminiUnavailable


class BookChatbot:
    """Küçük sohbet yüzeyi; güvenilir katalog ve profil verisini kullanır."""

    SUGGESTIONS = [
        "Bana bir kitap öner",
        "Şu an ne okuyorum?",
        "Yıllık hedefim nasıl gidiyor?",
    ]
    RECOMMENDATION_SIGNALS = (
        "öner", "tavsiye", "ne okuyayım", "benzer kitap", "okumalıyım",
        "kitap bul", "roman bul", "öykü bul",
    )
    OUT_OF_SCOPE_SIGNALS = (
        "hava durumu", "maç sonucu", "borsa", "kripto", "yatırım tavsiyesi",
        "hastalığım", "ilaç", "teşhis", "hukuki", "dava", "kod yaz",
        "programlama", "cumhurbaşkanı", "seçim sonucu", "yemek tarifi",
    )

    def __init__(self, recommender, explainer: GeminiExplainer, fallback_model: str) -> None:
        self.recommender = recommender
        self.explainer = explainer
        self.fallback_model = fallback_model

    async def reply(
        self, message: str, profile: dict, dashboard: dict,
        access_token: str | None = None, history: list[dict] | None = None,
        active_view_context: dict | None = None,
    ) -> ChatResponse:
        normalized = message.strip().casefold()
        if self._contains(normalized, "merhaba", "selam", "yardım", "neler yapabilirsin"):
            return ChatResponse(
                intent="help",
                answer=(
                    "Merhaba! Kitaplar, yazarlar, edebî türler ve okuma yöntemleri hakkında "
                    "sorularını yanıtlayabilir; geçmişine göre kitap önerebilir ve hedefini özetleyebilirim."
                ),
                suggestions=self.SUGGESTIONS,
            )

        if self._contains(normalized, *self.OUT_OF_SCOPE_SIGNALS):
            return self._out_of_scope()

        action = self._pending_action(normalized, active_view_context)
        if action:
            return ChatResponse(
                intent="action", answer=action["confirmation"], pending_action=action,
                books=self._chat_books([action.pop("_book")]),
                suggestions=["Onayla", "Vazgeç"],
            )

        if self._contains(normalized, "şu an", "okuyorum", "kitaplığım", "favori"):
            reading = profile["reading_books"]
            favorites = profile["favorite_books"]
            if "favori" in normalized:
                books = favorites[:3]
                answer = self._book_list_answer("Favorilerindeki kitaplar", books)
            else:
                books = reading[:3]
                answer = self._book_list_answer("Şu an okuduğun kitaplar", books)
                if books:
                    progress = [
                        f"{book['title']} %{book.get('progress_percent', 0):g}"
                        for book in books if book.get("total_pages")
                    ]
                    if progress:
                        answer += " İlerleme: " + ", ".join(progress) + "."
            return ChatResponse(
                intent="library", answer=answer, books=self._chat_books(books),
                suggestions=["Favorilerimi göster", "Hedefim nasıl gidiyor?", "Yeni bir kitap öner"],
            )

        if self._contains(
            normalized, "hedef", "istatistik", "kaç kitap okudum",
            "kaç sayfa okudum", "okuma serim", "güncel serim",
        ):
            goal = dashboard["goal"]
            answer = (
                f"{dashboard['year']} hedefin {goal['target_books']} kitap. "
                f"Şimdiye kadar {goal['completed_books']} kitap tamamladın; "
                f"hedefin %{goal['progress_percent']:g} seviyesinde. "
                f"Kaydedilen toplam okuma {dashboard['total_pages_read']} sayfa."
            )
            return ChatResponse(
                intent="stats", answer=answer,
                suggestions=["Şu an ne okuyorum?", "Bana kısa bir roman öner", "Favorilerimi göster"],
            )

        if not self._contains(normalized, *self.RECOMMENDATION_SIGNALS):
            return await self._general_answer(
                message, profile, history or [], active_view_context
            )

        summary, candidates = self.recommender.recommend(
            message, profile, 3, access_token=access_token,
        )
        try:
            explained = await self.explainer.explain(profile, message, summary, candidates)
        except GeminiUnavailable:
            explained = await GeminiExplainer("", self.fallback_model, False).explain(
                profile, message, summary, candidates
            )
        candidate_books = [item["book"] for item in candidates]
        if explained.recommended_books:
            details = " ".join(
                f"{index}. {book.book_title}: {book.reasoning}"
                for index, book in enumerate(explained.recommended_books, start=1)
            )
            answer = f"{explained.character_analysis_summary} {details}"
        else:
            answer = explained.character_analysis_summary
        return ChatResponse(
            intent="recommendation", answer=answer,
            books=self._chat_books(candidate_books),
            suggestions=["Daha gizemli olsun", "Daha kısa kitaplar öner", "Okuma hedefimi göster"],
        )

    async def _general_answer(
        self, message: str, profile: dict, history: list[dict],
        active_view_context: dict | None,
    ) -> ChatResponse:
        answer_method = getattr(self.explainer, "answer_book_question", None)
        if not callable(answer_method):
            answer = (
                "Genel edebiyat sohbeti şu anda çevrimdışı. Yine de katalogdan kitap önerebilir, "
                "kitaplığını ve okuma hedefini yorumlayabilirim."
            )
        else:
            try:
                answer = await answer_method(
                    message, profile=profile, history=history,
                    active_view_context=active_view_context,
                )
            except GeminiUnavailable:
                answer = (
                    "Edebiyat danışmanına şu anda ulaşamıyorum. Biraz sonra tekrar deneyebilir "
                    "veya katalogdan öneri isteyebilirsin."
                )
        return ChatResponse(
            intent="general", answer=answer,
            suggestions=["Roman ile novella farkı nedir?", "Modernizm nedir?", "Bana kitap öner"],
        )

    @staticmethod
    def _out_of_scope() -> ChatResponse:
        return ChatResponse(
            intent="out_of_scope",
            answer=(
                "Ben kitap ve edebiyat alanında yardımcı olan bir danışmanım. Bu konu kapsamımın "
                "dışında; istersen bir eser, yazar, edebî kavram veya okuma önerisi konuşabiliriz."
            ),
            suggestions=["Bir edebî türü açıkla", "Bir yazar hakkında konuşalım", "Bana kitap öner"],
        )

    @staticmethod
    def _contains(text: str, *signals: str) -> bool:
        return any(signal in text for signal in signals)

    @staticmethod
    def _pending_action(text: str, context: dict | None) -> dict | None:
        books = (context or {}).get("books") or []
        if not books:
            return None
        ordinals = {"birinci": 1, "ilk": 1, "ikinci": 2, "üçüncü": 3, "dördüncü": 4}
        position = next((value for label, value in ordinals.items() if label in text), 1 if len(books) == 1 or "bu kitap" in text else None)
        if position is None or position > len(books):
            return None
        book = books[position - 1]
        if not book.get("id"):
            return None
        action_type, arguments, verb = None, {}, ""
        price = re.search(r"(\d{1,6})(?:[.,](\d{1,2}))?\s*(?:tl|₺)", text)
        page = re.search(r"(\d{1,6})[.]?\s*sayfa", text)
        if price and any(signal in text for signal in ("düş", "haber ver", "alarm")):
            action_type, verb = "set_price_alert", "fiyat alarmı kurulsun"
            arguments = {"target_price_minor": int(price.group(1)) * 100 + int((price.group(2) or "0").ljust(2, "0"))}
        elif page and any(signal in text for signal in ("sayfadayım", "sayfaya geldim", "ilerleme")):
            action_type, verb = "update_progress", "okuma ilerlemesi güncellensin"
            arguments = {"current_page": int(page.group(1))}
        elif any(signal in text for signal in ("bitirdim", "tamamladım", "okudum olarak")):
            action_type, verb = "finish_book", "okundu olarak işaretlensin"
        elif any(signal in text for signal in ("favorile", "favoriye ekle", "favorilerime ekle")):
            action_type, verb = "favorite", "favorilere eklensin"
        elif any(signal in text for signal in ("okuyacaklarıma ekle", "okuma listeme ekle", "rafa ekle")):
            action_type, verb = "add_to_library", "okuyacaklarına eklensin"
        if not action_type:
            return None
        return {
            "action_type": action_type, "book_id": book["id"], "book_title": book["title"],
            "arguments": arguments, "confirmation": f"{book['title']} {verb}. Onaylıyor musun?",
            "_book": book,
        }

    @staticmethod
    def _book_list_answer(label: str, books: list[dict]) -> str:
        if not books:
            return f"{label} arasında henüz bir kayıt yok. Kitaplığından kolayca ekleyebilirsin."
        return f"{label}: " + ", ".join(book["title"] for book in books) + "."

    @staticmethod
    def _chat_books(books: list[dict]) -> list[dict]:
        return [{
            "id": book["id"], "title": book["title"], "author": book["author"],
            "genre": book["genre"], "cover_url": book.get("cover_url"),
        } for book in books]

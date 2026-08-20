import asyncio

from app.services.chatbot import BookChatbot


class FakeExplainer:
    enabled = True

    def __init__(self) -> None:
        self.questions = []

    async def answer_book_question(self, question: str, **kwargs) -> str:
        self.questions.append(question)
        self.context = kwargs
        return "Novella, romandan daha kısa ve öyküden daha kapsamlı bir anlatı türüdür."


class FakeRecommender:
    books = []


PROFILE = {"read_books": [], "reading_books": [], "to_read_books": [], "favorite_books": []}
DASHBOARD = {
    "year": 2026, "goal": {"target_books": 12, "completed_books": 0, "progress_percent": 0},
    "total_pages_read": 0,
}


def test_general_literature_question_uses_bounded_provider() -> None:
    explainer = FakeExplainer()
    chatbot = BookChatbot(FakeRecommender(), explainer, "unused")
    response = asyncio.run(chatbot.reply("Roman ile novella arasındaki fark nedir?", PROFILE, DASHBOARD))
    assert response.intent == "general"
    assert "Novella" in response.answer
    assert explainer.questions == ["Roman ile novella arasındaki fark nedir?"]


def test_obvious_out_of_scope_question_is_refused_without_model_call() -> None:
    explainer = FakeExplainer()
    chatbot = BookChatbot(FakeRecommender(), explainer, "unused")
    response = asyncio.run(chatbot.reply("Bugün hava durumu nasıl?", PROFILE, DASHBOARD))
    assert response.intent == "out_of_scope"
    assert "kitap ve edebiyat" in response.answer
    assert explainer.questions == []


def test_active_view_context_and_history_reach_literary_assistant() -> None:
    explainer = FakeExplainer()
    chatbot = BookChatbot(FakeRecommender(), explainer, "unused")
    history = [{"role": "user", "content": "Bu sonuçları hatırla."}]
    context = {
        "view": "discover", "query": "gizem",
        "books": [{"position": 2, "id": "donusum", "title": "Dönüşüm", "author": "Kafka", "genre": "Roman"}],
    }
    asyncio.run(chatbot.reply(
        "Ekrandaki ikinci kitabın dili ağır mı?", PROFILE, DASHBOARD,
        history=history, active_view_context=context,
    ))
    assert explainer.context["history"] == history
    assert explainer.context["active_view_context"] == context

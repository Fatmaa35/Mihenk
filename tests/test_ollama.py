import asyncio
import json

import httpx

from app.services.ollama import OllamaExplainer


def test_ollama_only_changes_trusted_explanation(monkeypatch) -> None:
    candidate = {
        "book": {
            "id": "guvenilir-kitap", "title": "Güvenilir Kitap", "author": "Yazar",
            "genre": "Roman", "themes": ["adalet"], "character_traits": ["analitik"],
            "description": "Doğrulanmış açıklama.",
        },
        "match_score": 0.72, "character_score": 0.8, "history_score": 0.6,
        "already_in_watchlist": False,
        "score_breakdown": {
            "character": {"raw_score": 0.8, "weight": 0.45, "contribution": 0.36},
            "themes": {"raw_score": 0.4, "weight": 0.15, "contribution": 0.06},
            "reading_history": {"raw_score": 0.6, "weight": 0.4, "contribution": 0.24},
            "semantic_score": 0.8, "lexical_score": 0.7, "matched_signals": ["adalet"],
        },
    }
    model_payload = {
        "character_analysis_summary": "Model özeti.",
        "recommended_books": [{
            "book_title": "Güvenilir Kitap", "author": "Değiştirilmiş Yazar",
            "match_score": 0.01, "reasoning": "Daha doğal model açıklaması.",
            "genre": "Yanlış Tür", "already_in_watchlist": True,
            "score_breakdown": candidate["score_breakdown"],
        }],
        "ai_discoveries": [{
            "book_title": "Gülün Adı", "author": "Umberto Eco",
            "genre": "Tarihî gizem", "reasoning": "Analitik gizem arayışına uyar.",
        }],
    }

    def fake_post(*args, **kwargs):
        request = httpx.Request("POST", args[0])
        return httpx.Response(
            200, request=request,
            json={"message": {"content": json.dumps(model_payload, ensure_ascii=False)}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    profile = {"read_books": [], "favorite_books": [], "to_read_books": []}
    result = asyncio.run(OllamaExplainer("http://127.0.0.1:11434", "gemma4:cloud", True).explain(
        profile, "analitik", "Güvenilir özet", [candidate]
    ))

    book = result.recommended_books[0]
    assert result.character_analysis_summary == "Model özeti."
    assert book.reasoning == "Daha doğal model açıklaması."
    assert book.author == "Yazar"
    assert book.genre == "Roman"
    assert book.match_score == 0.152
    assert book.score_breakdown.ai_score == 0.01
    assert book.score_breakdown.ai_weight == 0.8
    assert book.score_breakdown.catalog_score == 0.72
    assert book.score_breakdown.catalog_weight == 0.2
    assert book.already_in_watchlist is False
    assert result.ai_discoveries[0].book_title == "Gülün Adı"


def test_ollama_filters_duplicate_and_library_discoveries(monkeypatch) -> None:
    candidate = {
        "book": {
            "id": "book-1", "title": "Katalog Kitabı", "author": "Yazar",
            "genre": "Roman", "themes": [], "character_traits": [],
            "description": "Doğrulanmış açıklama.",
        },
        "match_score": 0.5, "character_score": 0.5, "history_score": 0,
        "already_in_watchlist": False,
        "score_breakdown": {
            "character": {"raw_score": 0.5, "weight": 0.45, "contribution": 0.225},
            "themes": {"raw_score": 0, "weight": 0.15, "contribution": 0},
            "reading_history": {"raw_score": 0, "weight": 0.4, "contribution": 0},
            "semantic_score": 0.5, "lexical_score": 0.5, "matched_signals": [],
        },
    }
    payload = {
        "character_analysis_summary": "Özet",
        "recommended_books": [],
        "ai_discoveries": [
            {"book_title": "Katalog Kitabı", "author": "Y", "genre": "Roman", "reasoning": "Tekrar."},
            {"book_title": "Okunmuş Kitap", "author": "Y", "genre": "Roman", "reasoning": "Tekrar."},
            {"book_title": "Yeni Kitap", "author": "Yeni Yazar", "genre": "Roman", "reasoning": "Yeni keşif."},
        ],
    }

    def fake_post(*args, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]),
            json={"message": {"content": json.dumps(payload, ensure_ascii=False)}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    profile = {
        "read_books": [{"title": "Okunmuş Kitap"}], "reading_books": [],
        "favorite_books": [], "to_read_books": [],
    }
    result = asyncio.run(OllamaExplainer("http://127.0.0.1:11434", "gemma4:cloud", True).explain(
        profile, "roman", "Fallback", [candidate]
    ))
    assert [book.book_title for book in result.ai_discoveries] == ["Yeni Kitap"]


def test_ollama_unstructured_cloud_reply_only_changes_summary(monkeypatch) -> None:
    candidate = {
        "book": {
            "id": "book-1", "title": "Kitap", "author": "Yazar", "genre": "Roman",
            "themes": [], "character_traits": [], "description": "Güvenilir açıklama.",
        },
        "match_score": 0.5, "character_score": 0.5, "history_score": 0,
        "already_in_watchlist": False,
        "score_breakdown": {
            "character": {"raw_score": 0.5, "weight": 0.45, "contribution": 0.225},
            "themes": {"raw_score": 0, "weight": 0.15, "contribution": 0},
            "reading_history": {"raw_score": 0, "weight": 0.4, "contribution": 0},
            "semantic_score": 0.5, "lexical_score": 0.5, "matched_signals": [],
        },
    }

    def fake_post(*args, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]),
            json={"message": {"content": "Doğal Türkçe bir model özeti."}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    profile = {"read_books": [], "favorite_books": [], "to_read_books": []}
    result = asyncio.run(OllamaExplainer("http://127.0.0.1:11434", "gemma4:cloud", True).explain(
        profile, "roman", "Fallback özet", [candidate]
    ))
    assert result.character_analysis_summary == "Doğal Türkçe bir model özeti."
    assert result.recommended_books[0].book_title == "Kitap"
    assert result.recommended_books[0].match_score == 0.5


def test_ollama_accepts_gemma_cloud_recommendations_shape(monkeypatch) -> None:
    candidate = {
        "book": {
            "id": "book-1", "title": "Kitap", "author": "Yazar", "genre": "Roman",
            "themes": [], "character_traits": [], "description": "Güvenilir açıklama.",
        },
        "match_score": 0.5, "character_score": 0.5, "history_score": 0,
        "already_in_watchlist": False,
        "score_breakdown": {
            "character": {"raw_score": 0.5, "weight": 0.45, "contribution": 0.225},
            "themes": {"raw_score": 0, "weight": 0.15, "contribution": 0},
            "reading_history": {"raw_score": 0, "weight": 0.4, "contribution": 0},
            "semantic_score": 0.5, "lexical_score": 0.5, "matched_signals": [],
        },
    }
    content = json.dumps({
        "recommendations": [
            {"book_title": "Kitap", "author": "Sahte", "reason": "Gemma gerekçesi."},
            {"book_title": "Uydurma Kitap", "reason": "Bu yok sayılmalı."},
        ]
    }, ensure_ascii=False)

    def fake_post(*args, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]), json={"message": {"content": content}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    profile = {"read_books": [], "favorite_books": [], "to_read_books": []}
    result = asyncio.run(OllamaExplainer("http://127.0.0.1:11434", "gemma4:cloud", True).explain(
        profile, "roman", "Güvenilir özet", [candidate]
    ))
    assert result.character_analysis_summary == "Güvenilir özet"
    assert result.recommended_books[0].reasoning == "Gemma gerekçesi."
    assert result.recommended_books[0].author == "Yazar"
    assert len(result.recommended_books) == 1


def test_ollama_alternative_recommended_books_shape_applies_ai_weight(monkeypatch) -> None:
    candidate = {
        "book": {
            "id": "book-1", "title": "Kitap", "author": "Yazar", "genre": "Roman",
            "themes": [], "character_traits": [], "description": "Açıklama.",
        },
        "match_score": 0.5, "character_score": 0.5, "history_score": 0,
        "already_in_watchlist": False,
        "score_breakdown": {
            "character": {"raw_score": 0.5, "weight": 0.45, "contribution": 0.225},
            "themes": {"raw_score": 0, "weight": 0.15, "contribution": 0},
            "reading_history": {"raw_score": 0, "weight": 0.4, "contribution": 0},
            "semantic_score": 0.5, "lexical_score": 0.5, "matched_signals": [],
        },
    }
    content = json.dumps({
        "recommended_books": [{
            "book_title": "Kitap", "match_score": 0.9,
            "reasoning": "Gemma değerlendirmesi.",
        }],
        "ai_discoveries": [],
    }, ensure_ascii=False)

    def fake_post(*args, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]), json={"message": {"content": content}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    profile = {"read_books": [], "reading_books": [], "favorite_books": [], "to_read_books": []}
    result = asyncio.run(OllamaExplainer("http://127.0.0.1:11434", "gemma4:cloud", True).explain(
        profile, "roman", "Özet", [candidate]
    ))
    assert result.recommended_books[0].match_score == 0.82
    assert result.recommended_books[0].score_breakdown.ai_weight == 0.8


def test_general_book_answer_sends_strict_scope_prompt(monkeypatch) -> None:
    captured = {}

    def fake_post(*args, **kwargs):
        captured.update(kwargs["json"])
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]),
            json={"message": {"content": "Modernizm, geleneksel anlatı kalıplarını sorgular."}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    answer = asyncio.run(OllamaExplainer(
        "http://127.0.0.1:11434", "gemma4:cloud", True
    ).answer_book_question(
        "Edebiyatta modernizm nedir?",
        profile={"reading_books": [], "favorite_books": [], "read_books": []},
        history=[{"role": "user", "content": "Edebî akımları konuşalım."}],
        active_view_context={"view": "discover", "books": []},
    ))
    system = captured["messages"][0]["content"]
    assert "Yalnızca kitaplar" in system
    assert "uydurma" in system
    assert "Spoiler uyarısı" in system
    assert "pasaj" in system
    assert captured["options"]["temperature"] == 0.65
    assert captured["messages"][-2]["content"] == "Edebî akımları konuşalım."
    assert answer.startswith("Modernizm")


def test_ollama_records_token_usage_and_estimated_cost(monkeypatch) -> None:
    events = []

    def fake_post(*args, **kwargs):
        return httpx.Response(
            200, request=httpx.Request("POST", args[0]),
            json={
                "message": {"content": "Kitaplar hakkında kısa yanıt."},
                "prompt_eval_count": 1_000,
                "eval_count": 500,
            },
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    answer = asyncio.run(OllamaExplainer(
        "http://127.0.0.1:11434", "test-model", True,
        events.append, 2.0, 4.0,
    ).answer_book_question("Ne okuyayım?"))

    assert answer.startswith("Kitaplar")
    assert events[0]["provider"] == "ollama"
    assert events[0]["operation"] == "chat"
    assert events[0]["prompt_tokens"] == 1_000
    assert events[0]["output_tokens"] == 500
    assert events[0]["estimated_cost_usd"] == 0.004

import asyncio
from pathlib import Path

from app.database import Repository
from app.services.consensus import ConsensusRecommender
from app.services.gemini import GeminiExplainer


BOOKS = Path(__file__).resolve().parents[1] / "data" / "books.json"


def prepared(tmp_path):
    repository = Repository(tmp_path / "test.db")
    repository.seed_books(BOOKS)
    user = repository.create_user("Deniz")
    repository.upsert_library_entry(user["id"], "suc-ve-ceza", "read", True)
    repository.upsert_library_entry(user["id"], "sherlock-holmes-kizil-dosya", "to_read", False)
    return repository, user


def test_read_book_is_never_recommended_and_watchlist_is_prioritized(tmp_path) -> None:
    repository, user = prepared(tmp_path)
    profile = repository.user_profile(user["id"])
    engine = ConsensusRecommender(repository.list_books())

    _, candidates = engine.recommend("analitik, stratejik, gözlemci ve gizem seven", profile, 5)

    assert all(item["book"]["id"] != "suc-ve-ceza" for item in candidates)
    assert candidates[0]["book"]["id"] == "sherlock-holmes-kizil-dosya"
    assert candidates[0]["already_in_watchlist"] is True


def test_score_uses_explainable_consensus_components(tmp_path) -> None:
    repository, user = prepared(tmp_path)
    profile = repository.user_profile(user["id"])
    engine = ConsensusRecommender(repository.list_books())
    _, candidates = engine.recommend("analitik ve gizemli", profile, 3)
    item = candidates[0]
    expected = round(
        0.45 * item["character_score"]
        + 0.15 * item["theme_score"]
        + 0.40 * item["history_score"],
        4,
    )
    assert item["match_score"] == expected
    assert item["score_breakdown"]["character"]["weight"] == 0.45
    assert item["score_breakdown"]["themes"]["weight"] == 0.15
    assert item["score_breakdown"]["reading_history"]["weight"] == 0.40


def test_llm_disabled_returns_exact_json_contract(tmp_path) -> None:
    repository, user = prepared(tmp_path)
    profile = repository.user_profile(user["id"])
    summary, candidates = ConsensusRecommender(repository.list_books()).recommend("analitik ve gizemli", profile, 2)
    response = asyncio.run(GeminiExplainer("", "unused", False).explain(profile, "analitik ve gizemli", summary, candidates))
    payload = response.model_dump()
    assert set(payload) == {"character_analysis_summary", "recommended_books", "ai_discoveries"}
    assert payload["ai_discoveries"] == []
    assert set(payload["recommended_books"][0]) == {
        "book_title", "author", "match_score", "reasoning", "genre",
        "already_in_watchlist", "score_breakdown",
    }


def test_short_murder_query_beats_generic_adventure_signal(tmp_path) -> None:
    repository = Repository(tmp_path / "hybrid.db")
    repository.seed_books(BOOKS)
    user = repository.create_user("Ece")
    profile = repository.user_profile(user["id"])

    _, candidates = ConsensusRecommender(repository.list_books()).recommend("maceracı cinayet", profile, 3)

    assert candidates[0]["book"]["id"] == "sherlock-holmes-kizil-dosya"
    assert candidates[0]["lexical_score"] > 0

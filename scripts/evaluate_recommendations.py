"""Run deterministic recommendation quality regression cases."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ROOT
from app.database import Repository
from app.services.consensus import ConsensusRecommender
from app.services.recommendation_evaluation import run_evaluation
from app.services.vector_search import LocalVectorIndex


def main() -> None:
    repository = Repository(ROOT / "tmp" / "recommendation-eval.db")
    repository.seed_books(ROOT / "data" / "books.json")
    books = repository.list_books()
    recommender = ConsensusRecommender(books, LocalVectorIndex(books))
    import json
    print(json.dumps(run_evaluation(ROOT / "data" / "recommendation_eval_cases.json", recommender, books), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import math
from pathlib import Path


def _dcg(grades: list[int]) -> float:
    return sum((2**grade - 1) / math.log2(index + 2) for index, grade in enumerate(grades))


def evaluate_ranking(case: dict, titles: list[str], books_by_title: dict[str, dict]) -> dict:
    relevance = {title: 3 for title in case.get("ideal_titles", [])}
    relevance.update({title: 1 for title in case.get("acceptable_titles", [])})
    irrelevant = set(case.get("irrelevant_titles", []))
    k = min(10, max(1, len(titles)))
    grades = [0 if title in irrelevant else relevance.get(title, 0) for title in titles[:k]]
    relevant_hits = sum(grade > 0 for grade in grades)
    known_relevant = max(1, len(relevance))
    ideal_grades = sorted(relevance.values(), reverse=True)[:k]
    ndcg = _dcg(grades) / max(_dcg(ideal_grades), 1e-9)
    reciprocal_rank = next((1 / (index + 1) for index, grade in enumerate(grades) if grade > 0), 0)
    violations = []
    for title in titles[:k]:
        book = books_by_title.get(title, {})
        haystack = " ".join([title, book.get("genre", ""), *(book.get("themes") or []), book.get("description", "")]).casefold()
        if title in irrelevant:
            violations.append(f"{title}:explicitly_irrelevant")
        if case.get("required_types") and book.get("publication_type") not in case["required_types"]:
            violations.append(f"{title}:wrong_type")
        if case.get("max_pages") and book.get("page_count") and book["page_count"] > case["max_pages"]:
            violations.append(f"{title}:too_long")
        if any(term.casefold() in haystack for term in case.get("forbidden_signals", [])):
            violations.append(f"{title}:forbidden_signal")
    unique_authors = len({books_by_title.get(title, {}).get("author") for title in titles[:k] if books_by_title.get(title)})
    return {
        "precision_at_5": round(sum(grade > 0 for grade in grades[:5]) / 5, 4),
        "recall_at_10": round(relevant_hits / known_relevant, 4),
        "ndcg_at_10": round(ndcg, 4),
        "mrr": round(reciprocal_rank, 4),
        "author_diversity": round(unique_authors / k, 4),
        "constraint_violations": violations,
        "passed": ndcg >= case.get("minimum_ndcg", .35) and not violations,
    }


def run_evaluation(cases_path: Path, recommender, books: list[dict]) -> dict:
    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    books_by_title = {book["title"]: book for book in books}
    empty_profile = {"read_books": [], "reading_books": [], "to_read_books": [], "favorite_books": [],
                     "abandoned_books": [], "recommendation_feedback": [], "feedback_books": []}
    results = []
    for case in cases:
        _, candidates = recommender.recommend(case["query"], empty_profile, 10)
        titles = [item["book"]["title"] for item in candidates]
        results.append({"id": case["id"], "query": case["query"], "titles": titles,
                        **evaluate_ranking(case, titles, books_by_title)})
    metrics = ("precision_at_5", "recall_at_10", "ndcg_at_10", "mrr", "author_diversity")
    summary = {metric: round(sum(row[metric] for row in results) / max(1, len(results)), 4) for metric in metrics}
    summary.update({"cases": len(results), "passed": sum(row["passed"] for row in results),
                    "violation_count": sum(len(row["constraint_violations"]) for row in results)})
    return {"summary": summary, "results": results}

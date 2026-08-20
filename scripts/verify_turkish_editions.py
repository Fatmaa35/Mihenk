"""Katalogdaki eserleri Türkçe baskı ve geçerli ISBN-13 ile zenginleştirir."""

import argparse
import json
import time

from app.config import settings
from app.database import Repository
from app.services.edition_verification import TurkishEditionVerifier


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--delay", type=float, default=0.25)
    args = parser.parse_args()
    repository = Repository(settings.database_path)
    verifier = TurkishEditionVerifier()
    report = {"checked": 0, "verified": 0, "missing": 0, "errors": []}
    for book in repository.books_for_edition_verification(args.limit):
        report["checked"] += 1
        try:
            edition = verifier.verify(book)
            if edition:
                repository.save_verified_edition(edition)
                repository.record_edition_verification(book["id"], "verified")
                report["verified"] += 1
            else:
                repository.record_edition_verification(book["id"], "missing")
                report["missing"] += 1
        except Exception as error:
            repository.record_edition_verification(book["id"], "error", str(error)[:500])
            report["errors"].append({"book_id": book["id"], "error": str(error)[:180]})
        time.sleep(max(0.1, args.delay))
    report["coverage"] = repository.catalog_coverage()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

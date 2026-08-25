"""Import an authorized publisher/distributor feed idempotently."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.config import settings
from app.repository_factory import create_repository
from app.services.catalog_feed import iter_feed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--limit", type=int, default=50_000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    repository = create_repository(settings)
    report = {"accepted": 0, "imported": 0, "rejected": 0, "errors": []}
    for index, record in enumerate(iter_feed(args.feed, args.source_name), 1):
        if report["accepted"] >= args.limit:
            break
        report["accepted"] += 1
        try:
            if not args.dry_run:
                repository.upsert_metadata_book(record)
                report["imported"] += 1
        except Exception as error:
            report["rejected"] += 1
            report["errors"].append({"row": index, "isbn": record.get("isbn"), "error": str(error)[:300]})
    report["dry_run"] = args.dry_run
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

"""Refresh retailer prices, persist run logs and produce 15-day forecasts."""

import argparse
import json

from app.config import settings
from app.repository_factory import create_repository
from app.services.price_pipeline import run_full_price_pipeline
from app.services.retailer_discovery import DISCOVERY


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--retailers", nargs="+", choices=tuple(DISCOVERY),
                        default=["kitapsec", "kitapsepeti", "bkmkitap"])
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--max-candidates", type=int, default=5)
    parser.add_argument("--skip-existing-refresh", action="store_true")
    parser.add_argument("--discover-books", type=int, default=0)
    parser.add_argument("--idempotency-key")
    parser.add_argument("--orchestrator", default="cli", choices=("cli", "n8n", "cron", "admin"))
    args = parser.parse_args()
    repository = create_repository(settings)
    report = run_full_price_pipeline(
        repository, idempotency_key=args.idempotency_key, orchestrator=args.orchestrator,
        trigger_kind="scheduled" if args.orchestrator in {"n8n", "cron"} else "manual",
        limit=min(max(args.limit, 1), 500), retailer_ids=args.retailers,
        delay=max(args.delay, 0), max_candidates=min(max(args.max_candidates, 1), 20),
        discover_books=min(max(args.discover_books, 0), 200),
        refresh_existing=not args.skip_existing_refresh,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

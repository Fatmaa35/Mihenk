"""Durable price collection orchestration; n8n only triggers this service."""

from __future__ import annotations

import random
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.price_forecasting import forecast_prices
from app.services.retailer_discovery import DISCOVERY, discover_offer, discover_offer_for_book
from app.services.retailer_offers import fetch_offer


def _key(job_type: str, orchestrator: str, supplied: str | None = None) -> str:
    return supplied or f"{job_type}:{orchestrator}:{datetime.now(ZoneInfo('Europe/Istanbul')).date()}"


def run_forecast_pipeline(repository, *, idempotency_key: str | None = None,
                          orchestrator: str = "manual", trigger_kind: str = "manual",
                          limit: int = 500) -> dict:
    run = repository.create_pipeline_run(_key("price_forecast", orchestrator, idempotency_key),
                                         "price_forecast", orchestrator, trigger_kind)
    if run.get("duplicate"):
        return run
    report = {"checked": 0, "success": 0, "failure": 0, "skipped": 0, "forecast_points": 0}
    repository.log_pipeline_event(run["id"], "info", "forecast", "15 günlük tahmin üretimi başladı.")
    try:
        for book in repository.list_books()[:limit]:
            report["checked"] += 1
            history = repository.list_book_price_history(book["id"], 365)
            forecasts = forecast_prices(history)
            if not forecasts:
                report["skipped"] += 1
                continue
            report["forecast_points"] += repository.replace_price_forecasts(book["id"], forecasts)
            report["success"] += 1
        status = "succeeded" if not report["failure"] else "partial"
        repository.log_pipeline_event(run["id"], "info", "forecast", "Tahmin üretimi tamamlandı.", report)
        return repository.finish_pipeline_run(run["id"], status, report)
    except Exception as error:
        report["failure"] += 1
        repository.log_pipeline_event(run["id"], "error", "forecast", str(error)[:500])
        repository.finish_pipeline_run(run["id"], "failed", report)
        raise


def run_price_refresh(repository, *, idempotency_key: str | None = None,
                      orchestrator: str = "manual", trigger_kind: str = "manual",
                      limit: int = 20, retailer_ids: list[str] | None = None,
                      delay: float = 2.0, max_candidates: int = 5,
                      discover_books: int = 0, refresh_existing: bool = True) -> dict:
    retailer_ids = retailer_ids or ["kitapsec", "kitapsepeti", "bkmkitap"]
    invalid = set(retailer_ids) - set(DISCOVERY)
    if invalid:
        raise ValueError(f"Desteklenmeyen mağaza: {', '.join(sorted(invalid))}")
    run = repository.create_pipeline_run(_key("price_refresh", orchestrator, idempotency_key),
                                         "price_refresh", orchestrator, trigger_kind)
    if run.get("duplicate"):
        return run
    report = {"refreshed": 0, "discovered": 0, "not_found": 0, "errors": []}
    repository.log_pipeline_event(run["id"], "info", "collect", "Fiyat toplama başladı.", {
        "limit": limit, "retailers": retailer_ids, "discover_books": discover_books,
    })
    try:
        if refresh_existing:
            for url in repository.list_offer_urls(retailer_ids):
                try:
                    repository.save_retail_offer(fetch_offer(url))
                    report["refreshed"] += 1
                except Exception as error:
                    item = {"url": url, "error": str(error)[:300]}
                    report["errors"].append(item)
                    repository.log_pipeline_event(run["id"], "warning", "refresh", "Teklif yenilenemedi.", item)
                time.sleep(random.uniform(max(2.0, delay), max(2.0, delay) + 1.5))
        for edition in repository.list_verified_editions(min(max(limit, 1), 500)):
            for retailer_id in retailer_ids:
                try:
                    offer = discover_offer(edition, retailer_id, delay, max_candidates)
                    if offer:
                        repository.save_retail_offer(offer)
                        report["discovered"] += 1
                    else:
                        report["not_found"] += 1
                except Exception as error:
                    item = {"isbn": edition["isbn"], "retailer": retailer_id, "error": str(error)[:300]}
                    report["errors"].append(item)
                    repository.log_pipeline_event(run["id"], "warning", "discover", "Baskı fiyatı bulunamadı.", item)
        for book in repository.list_unpriced_books(min(max(discover_books, 0), 200)):
            for retailer_id in retailer_ids:
                try:
                    offer = discover_offer_for_book(book, retailer_id, delay, max_candidates)
                    if offer:
                        repository.save_retail_offer(offer)
                        report["discovered"] += 1
                    else:
                        report["not_found"] += 1
                except Exception as error:
                    item = {"book_id": book["id"], "retailer": retailer_id, "error": str(error)[:300]}
                    report["errors"].append(item)
                    repository.log_pipeline_event(run["id"], "warning", "discover", "Eser fiyatı bulunamadı.", item)
        report["coverage"] = repository.catalog_coverage()
        status = "partial" if report["errors"] else "succeeded"
        repository.log_pipeline_event(run["id"], "info", "collect", "Fiyat toplama tamamlandı.", report)
        return repository.finish_pipeline_run(run["id"], status, report)
    except Exception as error:
        report["errors"].append({"stage": "pipeline", "error": str(error)[:500]})
        repository.log_pipeline_event(run["id"], "error", "pipeline", "Fiyat hattı durdu.", {"error": str(error)[:500]})
        repository.finish_pipeline_run(run["id"], "failed", report)
        raise


def run_full_price_pipeline(repository, **kwargs) -> dict:
    refresh = run_price_refresh(repository, **kwargs)
    if refresh.get("duplicate"):
        return {"refresh": refresh, "forecast": {"status": "skipped", "reason": "duplicate"}}
    forecast_key = f"price_forecast:{kwargs.get('orchestrator', 'manual')}:{datetime.now(ZoneInfo('Europe/Istanbul')).date()}"
    forecast = run_forecast_pipeline(repository, idempotency_key=forecast_key,
                                     orchestrator=kwargs.get("orchestrator", "manual"),
                                     trigger_kind=kwargs.get("trigger_kind", "manual"))
    return {"refresh": refresh, "forecast": forecast}

from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.database import Repository
from app.services.price_forecasting import forecast_prices, price_intelligence


def history(days: int = 20) -> list[dict]:
    start = datetime(2026, 7, 1, tzinfo=timezone.utc)
    return [{
        "price_minor": 20000 - index * 170 + (index % 3) * 90,
        "stock_status": "in_stock",
        "observed_at": (start + timedelta(days=index)).isoformat(),
    } for index in range(days)]


def test_forecast_has_15_days_confidence_bounds_and_explanation() -> None:
    forecasts = forecast_prices(history())
    signal = price_intelligence(history())
    assert len(forecasts) == 15
    assert all(row["lower_price_minor"] <= row["predicted_price_minor"] <= row["upper_price_minor"] for row in forecasts)
    assert all(0 <= row["drop_probability"] <= 1 for row in forecasts)
    assert forecasts[0]["model_version"] == "mihenk-price-v1"
    assert signal["status"] == "ready"
    assert signal["windows"]["30"]["sample_days"] == 20


def test_pipeline_runs_are_idempotent_and_logs_are_queryable(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "pipeline.db")
    first = repository.create_pipeline_run("daily:2026-08-14", "price_refresh", "n8n", "scheduled")
    duplicate = repository.create_pipeline_run("daily:2026-08-14", "price_refresh", "n8n", "scheduled")
    repository.log_pipeline_event(first["id"], "info", "collect", "Başladı", {"count": 3})
    completed = repository.finish_pipeline_run(first["id"], "succeeded", {"checked": 3, "success": 3, "failure": 0})
    assert duplicate["duplicate"] is True
    assert duplicate["id"] == first["id"]
    assert completed["success_count"] == 3
    assert repository.list_pipeline_logs(run_id=first["id"])[0]["context"] == {"count": 3}


def test_forecasts_are_replaced_per_model_version(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "forecast.db")
    repository.seed_books(Path(__file__).parents[1] / "data" / "books.json")
    rows = forecast_prices(history())
    assert repository.replace_price_forecasts("suc-ve-ceza", rows) == 15
    assert repository.replace_price_forecasts("suc-ve-ceza", rows) == 15
    assert len(repository.list_book_price_forecasts("suc-ve-ceza")) <= 15

"""Explainable price signals and conservative 15-day book-price forecasts."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from math import erf, sqrt
from statistics import mean, pstdev


MODEL_VERSION = "mihenk-price-v1"


def _day(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def daily_minimums(history: list[dict]) -> list[tuple[date, int]]:
    grouped: dict[date, list[int]] = defaultdict(list)
    for row in history:
        if row.get("stock_status") == "out_of_stock":
            continue
        try:
            grouped[_day(row["observed_at"])].append(int(row["price_minor"]))
        except (KeyError, TypeError, ValueError):
            continue
    return sorted((day, min(values)) for day, values in grouped.items())


def price_intelligence(history: list[dict]) -> dict:
    points = daily_minimums(history)
    if not points:
        return {"status": "insufficient", "message": "Fiyat verisi henüz oluşmadı."}
    latest_day, current = points[-1]
    windows = {}
    for days in (7, 30, 90):
        values = [price for day, price in points if day >= latest_day - timedelta(days=days - 1)]
        windows[str(days)] = {
            "lowest_price_minor": min(values),
            "average_price_minor": round(mean(values)),
            "sample_days": len(values),
        }
    previous = points[-2][1] if len(points) > 1 else current
    baseline = windows["30"]["average_price_minor"] or current
    discount = max(0.0, (baseline - current) / baseline)
    last_drop = next((str(day) for (day, price), (_, prior) in zip(reversed(points[1:]), reversed(points[:-1])) if price < prior), None)
    return {
        "status": "ready", "current_price_minor": current,
        "change_percent": round((current - previous) / max(previous, 1) * 100, 1),
        "deal_score": round(min(100.0, 45 + discount * 220), 1),
        "deal_label": "Çok iyi fiyat" if discount >= .15 else "İyi fiyat" if discount >= .07 else "Normal aralık",
        "last_drop_date": last_drop, "windows": windows, "sample_days": len(points),
    }


def forecast_prices(history: list[dict], horizon: int = 15) -> list[dict]:
    points = daily_minimums(history)
    if len(points) < 3:
        return []
    origin = points[0][0]
    x = [(day - origin).days for day, _ in points]
    y = [price for _, price in points]
    model_name = "weighted-linear"
    try:
        from sklearn.linear_model import HuberRegressor

        model = HuberRegressor(epsilon=1.5, max_iter=300).fit([[value] for value in x], y)
        predict = lambda value: float(model.predict([[value]])[0])
        model_name = "huber-regression"
    except (ImportError, ValueError, RuntimeError):
        slope = (y[-1] - y[0]) / max(1, x[-1] - x[0])
        predict = lambda value: y[-1] + slope * (value - x[-1])
    residuals = [actual - predict(day) for day, actual in zip(x, y)]
    sigma = max(pstdev(residuals) if len(residuals) > 1 else 0, mean(y) * .025, 1)
    current = y[-1]
    result = []
    for offset in range(1, horizon + 1):
        target_day = points[-1][0] + timedelta(days=offset)
        estimate = max(0, round(predict((target_day - origin).days)))
        uncertainty = sigma * sqrt(1 + offset / max(len(points), 1))
        z = (current - estimate) / max(uncertainty, 1)
        drop_probability = .5 * (1 + erf(z / sqrt(2)))
        result.append({
            "forecast_date": str(target_day), "predicted_price_minor": estimate,
            "lower_price_minor": max(0, round(estimate - 1.64 * uncertainty)),
            "upper_price_minor": round(estimate + 1.64 * uncertainty),
            "drop_probability": round(max(0.0, min(1.0, drop_probability)), 4),
            "model_name": model_name, "model_version": MODEL_VERSION,
            "trained_through": str(points[-1][0]),
        })
    return result

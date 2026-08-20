"""Deterministic, timezone-aware reading schedule generation."""

from __future__ import annotations

from datetime import date, timedelta
from math import ceil


def build_schedule(remaining_pages: int, target_date: date, excluded_weekdays: list[int],
                   weekday_pages: int | None = None, weekend_pages: int | None = None,
                   start_date: date | None = None) -> list[dict]:
    start = start_date or date.today()
    days, cursor = [], start
    while cursor <= target_date:
        if cursor.weekday() not in excluded_weekdays:
            days.append(cursor)
        cursor += timedelta(days=1)
    if not days:
        raise ValueError("Seçilen aralıkta okunabilir gün bulunmuyor.")
    remaining = max(0, remaining_pages)
    default_pages = max(1, ceil(remaining / len(days))) if remaining else 0
    schedule = []
    for index, day in enumerate(days):
        preferred = weekend_pages if day.weekday() >= 5 else weekday_pages
        planned = min(remaining, preferred or default_pages)
        days_left = len(days) - index - 1
        if days_left == 0:
            planned = remaining
        schedule.append({"plan_date": day.isoformat(), "planned_pages": planned, "completed_pages": 0})
        remaining -= planned
    if remaining > 0:
        # Explicit daily targets were too small; distribute the shortfall evenly.
        extra = ceil(remaining / len(schedule))
        for row in schedule:
            add = min(remaining, extra)
            row["planned_pages"] += add
            remaining -= add
            if not remaining:
                break
    return schedule


def schedule_summary(schedule: list[dict]) -> dict:
    planned = sum(day["planned_pages"] for day in schedule)
    completed = sum(day.get("completed_pages", 0) for day in schedule)
    return {"planned_pages": planned, "completed_pages": completed,
            "completion_percent": round(completed / planned * 100, 1) if planned else 100.0,
            "days": len(schedule)}

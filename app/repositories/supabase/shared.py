from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.services.catalog_quality import canonical_work_key, deduplicate_library_entries, enrich_book_record, normalize_isbn
from app.services.gamification import BADGE_RULES, build_gamification_summary, earned_badge_codes
from app.services.reading_planner import build_schedule, reminder_datetime_utc, schedule_summary
from app.services.product_growth import funnel_metrics, weekly_window

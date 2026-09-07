"""Deterministic, server-authoritative badge and XP rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BadgeRule:
    code: str
    name: str
    description: str
    icon: str
    stat: str
    goal: int
    xp_reward: int


BADGE_RULES = (
    BadgeRule("first_shelf", "İlk Sayfa", "İlk kitabını kitaplığına ekle.", "📖", "library_books", 1, 10),
    BadgeRule("first_review", "İlk İzlenim", "İlk yayımlanmış yorumunu paylaş.", "✍️", "published_comments", 1, 15),
    BadgeRule("reader_5", "Yolun Başında", "Beş kitabı tamamla.", "🌱", "read_books", 5, 50),
    BadgeRule("reader_25", "Kitap Kurdu", "Yirmi beş kitabı tamamla.", "🐛", "read_books", 25, 150),
    BadgeRule("genre_explorer", "Tür Kaşifi", "Beş farklı türden kitap tamamla.", "🧭", "read_genres", 5, 75),
    BadgeRule("active_7", "Düzenli Okur", "Yedi farklı günde okuma ilerlemesi kaydet.", "📅", "active_days", 7, 40),
    BadgeRule("streak_7", "Okuma Serisi", "Yedi günlük kesintisiz okuma serisine ulaş.", "🔥", "longest_streak", 7, 100),
    BadgeRule("critic_10", "Eleştirel Bakış", "On yayımlanmış kitap yorumu paylaş.", "🖋️", "published_comments", 10, 120),
    BadgeRule("ratings_10", "Topluluğun Sesi", "On farklı kitabı yıldızla.", "⭐", "ratings", 10, 60),
    BadgeRule("goal_getter", "Hedef Tamam", "Bir yıllık okuma hedefini tamamla.", "🏆", "completed_goals", 1, 100),
)

LEVELS = (
    (0, "Okur"),
    (200, "Kitapsever"),
    (500, "Keşifçi"),
    (1000, "Eleştirmen"),
    (2000, "Bibliyofil"),
    (4000, "Edebiyat Ustası"),
)


def earned_badge_codes(stats: dict[str, int]) -> set[str]:
    return {rule.code for rule in BADGE_RULES if int(stats.get(rule.stat, 0)) >= rule.goal}


def experience_points(stats: dict[str, int], earned_codes: set[str]) -> int:
    activity_xp = (
        int(stats.get("read_books", 0)) * 50
        + int(stats.get("published_comments", 0)) * 15
        + int(stats.get("ratings", 0)) * 5
        + int(stats.get("active_days", 0)) * 5
    )
    badge_xp = sum(rule.xp_reward for rule in BADGE_RULES if rule.code in earned_codes)
    return activity_xp + badge_xp


def level_for_xp(xp: int) -> dict[str, Any]:
    index = max(i for i, (threshold, _) in enumerate(LEVELS) if xp >= threshold)
    floor, name = LEVELS[index]
    if index == len(LEVELS) - 1:
        return {"name": name, "number": index + 1, "floor_xp": floor, "next_xp": None, "progress_percent": 100}
    next_xp = LEVELS[index + 1][0]
    progress = round((xp - floor) / max(1, next_xp - floor) * 100)
    return {"name": name, "number": index + 1, "floor_xp": floor, "next_xp": next_xp, "progress_percent": progress}


def build_gamification_summary(
    stats: dict[str, int],
    earned_rows: list[dict],
    showcase_codes: list[str],
) -> dict[str, Any]:
    earned_dates = {row["badge_code"]: row.get("earned_at") for row in earned_rows}
    earned_codes = set(earned_dates)
    xp = experience_points(stats, earned_codes)
    badges = []
    for rule in BADGE_RULES:
        value = max(0, int(stats.get(rule.stat, 0)))
        badges.append({
            "code": rule.code,
            "name": rule.name,
            "description": rule.description,
            "icon": rule.icon,
            "xp_reward": rule.xp_reward,
            "progress": min(value, rule.goal),
            "goal": rule.goal,
            "progress_percent": min(100, round(value / rule.goal * 100)),
            "earned": rule.code in earned_codes,
            "earned_at": earned_dates.get(rule.code),
            "showcased": rule.code in showcase_codes,
        })
    return {
        "xp": xp,
        "level": level_for_xp(xp),
        "earned_count": len(earned_codes),
        "total_badges": len(BADGE_RULES),
        "showcase": [code for code in showcase_codes if code in earned_codes][:3],
        "badges": badges,
        "stats": {key: int(value) for key, value in stats.items()},
    }

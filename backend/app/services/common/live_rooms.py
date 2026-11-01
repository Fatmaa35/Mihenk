"""Canlı odaların iki veri katmanında ortak kuralları: varlık süresi, davet kodu, yanıt biçimi."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

# Sayfa birkaç saniyede bir yoklama yapar; bu süre boyunca ses gelmeyen kişi "odada değil" sayılır.
PRESENT_SECONDS = 40
MAX_MEMBERS = 30
HISTORY_LIMIT = 100
INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

SYSTEM_TEXT = {
    "joined": "odaya katıldı",
    "left": "odadan ayrıldı",
    "removed": "odadan çıkarıldı",
}


def now_utc() -> datetime:
    return datetime.now(UTC)


def parse_time(value: str | datetime | None) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def is_present(last_seen: str | datetime | None, now: datetime | None = None) -> bool:
    seen = parse_time(last_seen)
    return bool(seen) and (now or now_utc()) - seen <= timedelta(seconds=PRESENT_SECONDS)


def new_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(8))


def normalize_invite_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def participant_view(member: dict, display_name: str | None, now: datetime) -> dict:
    return {
        "user_id": member["user_id"],
        "display_name": display_name or "Okur",
        "role": member["role"],
        "status_text": member.get("status_text"),
        "present": is_present(member.get("last_seen_at"), now),
        "last_seen_at": member.get("last_seen_at"),
    }


def sort_participants(participants: list[dict]) -> list[dict]:
    """Odada olanlar önce, sonra kurucu, sonra ada göre."""
    return sorted(participants, key=lambda p: (not p["present"], p["role"] != "owner", p["display_name"].casefold()))


def message_view(message: dict, display_name: str | None) -> dict:
    kind = message.get("kind") or "text"
    return {
        "id": message["id"],
        "user_id": message.get("user_id"),
        "display_name": display_name or "Okur",
        "kind": kind,
        "content": message["content"],
        "created_at": message["created_at"],
    }


def room_view(room: dict, member_role: str | None = None) -> dict:
    return {
        "id": room["id"],
        "title": room["title"],
        "purpose": room["purpose"],
        "owner_id": room["owner_id"],
        "invite_code": room["invite_code"],
        "created_at": room["created_at"],
        "closed": bool(room.get("closed_at")),
        "role": member_role,
    }


def iso(moment: datetime | None = None) -> str:
    return (moment or now_utc()).isoformat()

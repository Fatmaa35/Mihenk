"""Canlı odalar (Supabase): katılımcı listesi, varlık ve sohbet. Yetki kontrolü burada yapılır,
tablolar servis rolüyle okunup yazılır (istemcinin doğrudan erişimi yoktur)."""
from __future__ import annotations

from uuid import UUID

from app.repositories.supabase.base import SupabaseRequestError
from app.services.common.live_rooms import (
    HISTORY_LIMIT, MAX_MEMBERS, SYSTEM_TEXT, is_present, iso, message_view, new_invite_code,
    normalize_invite_code, now_utc, participant_view, room_view, sort_participants,
)


def _uuid(value: str) -> bool:
    try:
        UUID(str(value))
    except ValueError:
        return False
    return True


class SupabaseLiveRoomsMixin:
    def _live_rows(self, path: str, params: dict) -> list[dict]:
        return self._request("GET", path, admin=True, params=params).json()

    def _live_names(self, user_ids: set[str]) -> dict[str, str]:
        ids = sorted(value for value in user_ids if value and _uuid(value))
        if not ids:
            return {}
        rows = self._live_rows("/rest/v1/profiles", {"id": f"in.({','.join(ids)})", "select": "id,display_name"})
        return {row["id"]: row.get("display_name") or "Okur" for row in rows}

    def _live_member(self, room_id: str, user_id: str) -> tuple[dict, dict]:
        if not _uuid(room_id):
            raise KeyError("Oda bulunamadı.")
        rooms = self._live_rows("/rest/v1/live_rooms", {"id": f"eq.{room_id}", "select": "*", "limit": 1})
        if not rooms:
            raise KeyError("Oda bulunamadı.")
        members = self._live_rows("/rest/v1/live_room_members",
                                  {"room_id": f"eq.{room_id}", "user_id": f"eq.{user_id}", "select": "*", "limit": 1})
        if not members or members[0].get("removed_at"):
            raise PermissionError("Bu odaya katılmadın ya da odadan çıkarıldın.")
        return rooms[0], members[0]

    def _live_insert_message(self, room_id: str, user_id: str, kind: str, content: str) -> dict:
        rows = self._request("POST", "/rest/v1/live_room_messages", admin=True,
                             json_body={"room_id": room_id, "user_id": user_id, "kind": kind, "content": content},
                             extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]

    def _live_touch(self, room_id: str, user_id: str, values: dict) -> None:
        self._request("PATCH", "/rest/v1/live_room_members", admin=True,
                      params={"room_id": f"eq.{room_id}", "user_id": f"eq.{user_id}"}, json_body=values,
                      extra_headers={"Prefer": "return=minimal"})

    def create_live_room(self, user_id: str, title: str, purpose: str, access_token: str | None = None) -> dict:
        room = None
        for _ in range(5):
            try:
                room = self._request("POST", "/rest/v1/live_rooms", admin=True,
                                     json_body={"owner_id": user_id, "title": title.strip(), "purpose": purpose,
                                                "invite_code": new_invite_code()},
                                     extra_headers={"Prefer": "return=representation"}).json()[0]
                break
            except SupabaseRequestError as error:
                if error.status_code != 409:
                    raise
        if room is None:
            raise SupabaseRequestError("Oda oluşturulamadı.", 409)
        now = iso()
        self._request("POST", "/rest/v1/live_room_members", admin=True,
                      json_body={"room_id": room["id"], "user_id": user_id, "role": "owner", "joined_at": now, "last_seen_at": now},
                      extra_headers={"Prefer": "return=minimal"})
        self._live_insert_message(room["id"], user_id, "joined", SYSTEM_TEXT["joined"])
        return room_view(room, "owner")

    def list_live_rooms(self, user_id: str, access_token: str | None = None) -> list[dict]:
        mine = self._live_rows("/rest/v1/live_room_members",
                               {"user_id": f"eq.{user_id}", "removed_at": "is.null", "select": "room_id,role"})
        if not mine:
            return []
        roles = {row["room_id"]: row["role"] for row in mine}
        ids = ",".join(roles)
        rooms = self._live_rows("/rest/v1/live_rooms", {"id": f"in.({ids})", "closed_at": "is.null", "select": "*",
                                                        "order": "created_at.desc"})
        members = self._live_rows("/rest/v1/live_room_members",
                                  {"room_id": f"in.({ids})", "removed_at": "is.null", "select": "room_id,last_seen_at"})
        now = now_utc()
        result = []
        for room in rooms:
            seen = [row for row in members if row["room_id"] == room["id"]]
            view = room_view(room, roles.get(room["id"]))
            view["member_count"] = len(seen)
            view["present_count"] = sum(is_present(row["last_seen_at"], now) for row in seen)
            result.append(view)
        return sorted(result, key=lambda room: -room["present_count"])

    def join_live_room(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        code = normalize_invite_code(invite_code)
        rooms = self._live_rows("/rest/v1/live_rooms", {"invite_code": f"eq.{code}", "select": "*", "limit": 1}) if code else []
        if not rooms or rooms[0].get("closed_at"):
            raise KeyError("Bu davet koduyla açık bir oda bulunamadı.")
        room = rooms[0]
        members = self._live_rows("/rest/v1/live_room_members",
                                  {"room_id": f"eq.{room['id']}", "user_id": f"eq.{user_id}", "select": "*", "limit": 1})
        if members and members[0].get("removed_at"):
            raise PermissionError("Bu odadan çıkarıldığın için yeniden katılamazsın.")
        if members:
            return room_view(room, members[0]["role"])
        count = len(self._live_rows("/rest/v1/live_room_members",
                                    {"room_id": f"eq.{room['id']}", "removed_at": "is.null", "select": "user_id"}))
        if count >= MAX_MEMBERS:
            raise ValueError(f"Oda dolu; en fazla {MAX_MEMBERS} kişi katılabilir.")
        self._request("POST", "/rest/v1/live_room_members", admin=True,
                      json_body={"room_id": room["id"], "user_id": user_id, "role": "member"},
                      extra_headers={"Prefer": "return=minimal"})
        return room_view(room, "member")

    def live_room_state(self, user_id: str, room_id: str, after_id: int | None = None,
                        access_token: str | None = None) -> dict:
        now = now_utc()
        room, member = self._live_member(room_id, user_id)
        if not room.get("closed_at"):
            if not is_present(member.get("last_seen_at"), now):
                self._live_insert_message(room_id, user_id, "joined", SYSTEM_TEXT["joined"])
            self._live_touch(room_id, user_id, {"last_seen_at": iso(now)})
            member["last_seen_at"] = iso(now)
        members = self._live_rows("/rest/v1/live_room_members",
                                  {"room_id": f"eq.{room_id}", "removed_at": "is.null", "select": "*"})
        if after_id is None:
            messages = list(reversed(self._live_rows("/rest/v1/live_room_messages",
                                                     {"room_id": f"eq.{room_id}", "select": "*", "order": "id.desc",
                                                      "limit": HISTORY_LIMIT})))
        else:
            messages = self._live_rows("/rest/v1/live_room_messages",
                                       {"room_id": f"eq.{room_id}", "id": f"gt.{after_id}", "select": "*", "order": "id.asc",
                                        "limit": 200})
        names = self._live_names({row["user_id"] for row in members} | {row.get("user_id") for row in messages})
        participants = sort_participants([participant_view(row, names.get(row["user_id"]), now) for row in members])
        return {
            "room": room_view(room, member["role"]),
            "participants": participants,
            "present_count": sum(p["present"] for p in participants),
            "messages": [message_view(row, names.get(row.get("user_id"))) for row in messages],
        }

    def post_live_room_message(self, user_id: str, room_id: str, content: str, access_token: str | None = None) -> dict:
        room, _ = self._live_member(room_id, user_id)
        if room.get("closed_at"):
            raise PermissionError("Oda kapatıldı.")
        row = self._live_insert_message(room_id, user_id, "text", content.strip())
        self._live_touch(room_id, user_id, {"last_seen_at": iso()})
        return message_view(row, self._live_names({user_id}).get(user_id))

    def set_live_room_status(self, user_id: str, room_id: str, status_text: str | None,
                             access_token: str | None = None) -> dict:
        self._live_member(room_id, user_id)
        text = (status_text or "").strip() or None
        self._live_touch(room_id, user_id, {"status_text": text})
        return {"status_text": text}

    def leave_live_room(self, user_id: str, room_id: str, access_token: str | None = None) -> None:
        room, member = self._live_member(room_id, user_id)
        if is_present(member.get("last_seen_at")) and not room.get("closed_at"):
            self._live_insert_message(room_id, user_id, "left", SYSTEM_TEXT["left"])
        self._live_touch(room_id, user_id, {"last_seen_at": None})

    def remove_live_room_member(self, owner_id: str, room_id: str, target_user_id: str,
                                access_token: str | None = None) -> None:
        _, member = self._live_member(room_id, owner_id)
        if member["role"] != "owner":
            raise PermissionError("Yalnızca odayı açan kişi birini çıkarabilir.")
        if target_user_id == owner_id:
            raise ValueError("Kendini odadan çıkaramazsın; odayı kapatabilirsin.")
        if not _uuid(target_user_id):
            raise KeyError("Bu kişi odada değil.")
        changed = self._request("PATCH", "/rest/v1/live_room_members", admin=True,
                                params={"room_id": f"eq.{room_id}", "user_id": f"eq.{target_user_id}", "removed_at": "is.null"},
                                json_body={"removed_at": iso(), "last_seen_at": None},
                                extra_headers={"Prefer": "return=representation"}).json()
        if not changed:
            raise KeyError("Bu kişi odada değil.")
        self._live_insert_message(room_id, target_user_id, "removed", SYSTEM_TEXT["removed"])

    def close_live_room(self, owner_id: str, room_id: str, access_token: str | None = None) -> None:
        room, member = self._live_member(room_id, owner_id)
        if member["role"] != "owner":
            raise PermissionError("Odayı yalnızca açan kişi kapatabilir.")
        if not room.get("closed_at"):
            self._request("PATCH", "/rest/v1/live_rooms", admin=True, params={"id": f"eq.{room_id}"},
                          json_body={"closed_at": iso()}, extra_headers={"Prefer": "return=minimal"})

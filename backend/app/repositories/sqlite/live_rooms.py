"""Canlı odalar (SQLite): katılımcı listesi, varlık ve sohbet."""
from __future__ import annotations

from uuid import uuid4

from app.services.common.live_rooms import (
    HISTORY_LIMIT, MAX_MEMBERS, SYSTEM_TEXT, is_present, iso, message_view, new_invite_code,
    normalize_invite_code, now_utc, participant_view, room_view, sort_participants,
)


class SQLiteLiveRoomsMixin:
    def _live_member(self, connection, room_id: str, user_id: str):
        """Odayı ve kişinin aktif üyeliğini döndürür; üye değilse ya da çıkarıldıysa PermissionError."""
        room = connection.execute("SELECT * FROM live_rooms WHERE id=?", (room_id,)).fetchone()
        if not room:
            raise KeyError("Oda bulunamadı.")
        member = connection.execute("SELECT * FROM live_room_members WHERE room_id=? AND user_id=?",
                                    (room_id, user_id)).fetchone()
        if not member or member["removed_at"]:
            raise PermissionError("Bu odaya katılmadın ya da odadan çıkarıldın.")
        return dict(room), dict(member)

    def _live_system(self, connection, room_id: str, user_id: str, kind: str, when: str) -> None:
        connection.execute("INSERT INTO live_room_messages(room_id,user_id,kind,content,created_at) VALUES(?,?,?,?,?)",
                           (room_id, user_id, kind, SYSTEM_TEXT[kind], when))

    def create_live_room(self, user_id: str, title: str, purpose: str, access_token: str | None = None) -> dict:
        room_id, now = str(uuid4()), iso()
        with self.connect() as connection:
            for _ in range(5):
                code = new_invite_code()
                if not connection.execute("SELECT 1 FROM live_rooms WHERE invite_code=?", (code,)).fetchone():
                    break
            connection.execute("INSERT INTO live_rooms(id,owner_id,title,purpose,invite_code,created_at) VALUES(?,?,?,?,?,?)",
                               (room_id, user_id, title.strip(), purpose, code, now))
            connection.execute("""INSERT INTO live_room_members(room_id,user_id,role,joined_at,last_seen_at)
                                  VALUES(?,?, 'owner',?,?)""", (room_id, user_id, now, now))
            self._live_system(connection, room_id, user_id, "joined", now)
            room = connection.execute("SELECT * FROM live_rooms WHERE id=?", (room_id,)).fetchone()
        return room_view(dict(room), "owner")

    def list_live_rooms(self, user_id: str, access_token: str | None = None) -> list[dict]:
        now = now_utc()
        with self.connect() as connection:
            rooms = connection.execute(
                """SELECT r.*, m.role FROM live_rooms r JOIN live_room_members m ON m.room_id=r.id
                   WHERE m.user_id=? AND m.removed_at IS NULL AND r.closed_at IS NULL ORDER BY r.created_at DESC""",
                (user_id,)).fetchall()
            result = []
            for room in rooms:
                seen = connection.execute("SELECT last_seen_at FROM live_room_members WHERE room_id=? AND removed_at IS NULL",
                                          (room["id"],)).fetchall()
                view = room_view(dict(room), room["role"])
                view["member_count"] = len(seen)
                view["present_count"] = sum(is_present(row["last_seen_at"], now) for row in seen)
                result.append(view)
        return sorted(result, key=lambda room: -room["present_count"])

    def join_live_room(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        code = normalize_invite_code(invite_code)
        with self.connect() as connection:
            room = connection.execute("SELECT * FROM live_rooms WHERE invite_code=?", (code,)).fetchone()
            if not room or room["closed_at"]:
                raise KeyError("Bu davet koduyla açık bir oda bulunamadı.")
            member = connection.execute("SELECT * FROM live_room_members WHERE room_id=? AND user_id=?",
                                        (room["id"], user_id)).fetchone()
            if member and member["removed_at"]:
                raise PermissionError("Bu odadan çıkarıldığın için yeniden katılamazsın.")
            if not member:
                count = connection.execute("SELECT count(*) n FROM live_room_members WHERE room_id=? AND removed_at IS NULL",
                                           (room["id"],)).fetchone()["n"]
                if count >= MAX_MEMBERS:
                    raise ValueError(f"Oda dolu; en fazla {MAX_MEMBERS} kişi katılabilir.")
                connection.execute("INSERT INTO live_room_members(room_id,user_id,role,joined_at) VALUES(?,?, 'member',?)",
                                   (room["id"], user_id, iso()))
        return room_view(dict(room), member["role"] if member else "member")

    def live_room_state(self, user_id: str, room_id: str, after_id: int | None = None,
                        access_token: str | None = None) -> dict:
        """Odanın anlık durumu. Çağrı aynı zamanda kişinin "buradayım" sinyalidir."""
        now = now_utc()
        with self.connect() as connection:
            room, member = self._live_member(connection, room_id, user_id)
            if not room["closed_at"]:
                if not is_present(member["last_seen_at"], now):
                    self._live_system(connection, room_id, user_id, "joined", iso(now))
                connection.execute("UPDATE live_room_members SET last_seen_at=? WHERE room_id=? AND user_id=?",
                                   (iso(now), room_id, user_id))
            members = connection.execute(
                """SELECT m.*, u.display_name FROM live_room_members m JOIN users u ON u.id=m.user_id
                   WHERE m.room_id=? AND m.removed_at IS NULL""", (room_id,)).fetchall()
            if after_id is None:
                rows = connection.execute(
                    """SELECT * FROM (SELECT msg.*, u.display_name FROM live_room_messages msg LEFT JOIN users u ON u.id=msg.user_id
                       WHERE msg.room_id=? ORDER BY msg.id DESC LIMIT ?) ORDER BY id""", (room_id, HISTORY_LIMIT)).fetchall()
            else:
                rows = connection.execute(
                    """SELECT msg.*, u.display_name FROM live_room_messages msg LEFT JOIN users u ON u.id=msg.user_id
                       WHERE msg.room_id=? AND msg.id>? ORDER BY msg.id LIMIT 200""", (room_id, after_id)).fetchall()
        participants = sort_participants([participant_view(dict(row), row["display_name"], now) for row in members])
        return {
            "room": room_view(room, member["role"]),
            "participants": participants,
            "present_count": sum(p["present"] for p in participants),
            "messages": [message_view(dict(row), row["display_name"]) for row in rows],
        }

    def post_live_room_message(self, user_id: str, room_id: str, content: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            room, _ = self._live_member(connection, room_id, user_id)
            if room["closed_at"]:
                raise PermissionError("Oda kapatıldı.")
            now = iso()
            cursor = connection.execute(
                "INSERT INTO live_room_messages(room_id,user_id,kind,content,created_at) VALUES(?,?, 'text',?,?)",
                (room_id, user_id, content.strip(), now))
            connection.execute("UPDATE live_room_members SET last_seen_at=? WHERE room_id=? AND user_id=?", (now, room_id, user_id))
            name = connection.execute("SELECT display_name FROM users WHERE id=?", (user_id,)).fetchone()["display_name"]
        return message_view({"id": cursor.lastrowid, "user_id": user_id, "kind": "text", "content": content.strip(),
                             "created_at": now}, name)

    def set_live_room_status(self, user_id: str, room_id: str, status_text: str | None,
                             access_token: str | None = None) -> dict:
        text = (status_text or "").strip() or None
        with self.connect() as connection:
            self._live_member(connection, room_id, user_id)
            connection.execute("UPDATE live_room_members SET status_text=? WHERE room_id=? AND user_id=?",
                               (text, room_id, user_id))
        return {"status_text": text}

    def leave_live_room(self, user_id: str, room_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            room, member = self._live_member(connection, room_id, user_id)
            if is_present(member["last_seen_at"]) and not room["closed_at"]:
                self._live_system(connection, room_id, user_id, "left", iso())
            connection.execute("UPDATE live_room_members SET last_seen_at=NULL WHERE room_id=? AND user_id=?", (room_id, user_id))

    def remove_live_room_member(self, owner_id: str, room_id: str, target_user_id: str,
                                access_token: str | None = None) -> None:
        with self.connect() as connection:
            room, member = self._live_member(connection, room_id, owner_id)
            if member["role"] != "owner":
                raise PermissionError("Yalnızca odayı açan kişi birini çıkarabilir.")
            if target_user_id == owner_id:
                raise ValueError("Kendini odadan çıkaramazsın; odayı kapatabilirsin.")
            changed = connection.execute(
                "UPDATE live_room_members SET removed_at=?, last_seen_at=NULL WHERE room_id=? AND user_id=? AND removed_at IS NULL",
                (iso(), room_id, target_user_id)).rowcount
            if not changed:
                raise KeyError("Bu kişi odada değil.")
            self._live_system(connection, room_id, target_user_id, "removed", iso())

    def close_live_room(self, owner_id: str, room_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            room, member = self._live_member(connection, room_id, owner_id)
            if member["role"] != "owner":
                raise PermissionError("Odayı yalnızca açan kişi kapatabilir.")
            connection.execute("UPDATE live_rooms SET closed_at=? WHERE id=? AND closed_at IS NULL", (iso(), room_id))

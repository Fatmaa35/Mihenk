"""Kitap asistanı sohbetleri ve geri alınabilir işlemler."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

class SQLiteAssistantMixin:
    def audit(self, actor_user_id: str | None, action: str, entity_type: str, entity_id: str | None,
              before: dict | None = None, after: dict | None = None, request_id: str | None = None,
              access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (str(uuid4()), actor_user_id, action, entity_type, entity_id,
                 json.dumps(before, ensure_ascii=False) if before is not None else None,
                 json.dumps(after, ensure_ascii=False) if after is not None else None,
                 request_id, datetime.now(timezone.utc).isoformat()),
            )


    def action_execution(self, user_id: str, key: str, access_token: str | None = None) -> dict | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM action_executions WHERE idempotency_key=? AND user_id=?", (key, user_id)
            ).fetchone()
        return json.loads(row["result_json"]) if row and row["status"] == "succeeded" else None


    def save_action_execution(self, user_id: str, key: str, action_type: str, result: dict,
                              access_token: str | None = None, action_payload: dict | None = None,
                              inverse_action: dict | None = None, status: str = "succeeded",
                              error_code: str | None = None, duration_ms: int = 0) -> dict:
        with self.connect() as connection:
            connection.execute(
                """INSERT OR IGNORE INTO action_executions(idempotency_key,user_id,action_type,result_json,status,
                   action_payload_json,inverse_action_json,error_code,duration_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (key, user_id, action_type, json.dumps(result, ensure_ascii=False), status,
                 json.dumps(action_payload or {}, ensure_ascii=False), json.dumps(inverse_action, ensure_ascii=False) if inverse_action else None,
                 error_code, duration_ms, datetime.now(timezone.utc).isoformat()),
            )
        return result


    def action_history(self, user_id: str, limit: int = 50, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute("SELECT * FROM action_executions WHERE user_id=? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
        return [{**dict(row), "result": json.loads(row["result_json"]), "action_payload": json.loads(row["action_payload_json"] or "{}"),
                 "inverse_action": json.loads(row["inverse_action_json"]) if row["inverse_action_json"] else None} for row in rows]


    def mark_action_undone(self, user_id: str, key: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("UPDATE action_executions SET status='undone',undone_at=? WHERE user_id=? AND idempotency_key=? AND status='succeeded'",
                               (datetime.now(timezone.utc).isoformat(), user_id, key))


    def create_chat_session(self, user_id: str, title: str = "Yeni sohbet",
                            access_token: str | None = None) -> dict:
        now, session_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO chat_sessions(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                (session_id, user_id, title[:120] or "Yeni sohbet", now, now),
            )
        return {"id": session_id, "user_id": user_id, "title": title[:120] or "Yeni sohbet", "summary": "", "created_at": now, "updated_at": now}


    def list_chat_sessions(self, user_id: str, access_token: str | None = None,
                           query: str | None = None, archived: bool = False) -> list[dict]:
        with self.connect() as connection:
            sql = "SELECT * FROM chat_sessions WHERE user_id=? AND is_archived=?"
            values: list = [user_id, int(archived)]
            if query:
                sql += " AND (title LIKE ? OR summary LIKE ?)"
                values.extend([f"%{query}%", f"%{query}%"])
            sql += " ORDER BY is_pinned DESC,updated_at DESC LIMIT 50"
            return [dict(row) for row in connection.execute(sql, values)]


    def chat_messages(self, user_id: str, session_id: str, limit: int = 50,
                      access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT m.* FROM chat_messages m JOIN chat_sessions s ON s.id=m.session_id
                   WHERE m.session_id=? AND s.user_id=? ORDER BY m.created_at DESC LIMIT ?""",
                (session_id, user_id, limit),
            ).fetchall()
        return [{**dict(row), "books": json.loads(row["books_json"] or "[]"),
                 "citations": json.loads(row["citations_json"] or "[]")} for row in reversed(rows)]


    def save_chat_message(self, user_id: str, session_id: str, role: str, content: str,
                          books: list[dict] | None = None, access_token: str | None = None) -> dict:
        now, message_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            session = connection.execute(
                "SELECT * FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id)
            ).fetchone()
            if not session:
                raise KeyError("Sohbet bulunamadı.")
            citations = [{"book_id": book.get("id"), "title": book.get("title"), "author": book.get("author")} for book in (books or [])]
            connection.execute(
                "INSERT INTO chat_messages(id,session_id,user_id,role,content,books_json,citations_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
                (message_id, session_id, user_id, role, content, json.dumps(books or [], ensure_ascii=False), json.dumps(citations, ensure_ascii=False), now),
            )
            title = session["title"]
            if title == "Yeni sohbet" and role == "user":
                title = content.strip()[:60]
            summary_rows = connection.execute(
                "SELECT role,content FROM chat_messages WHERE session_id=? ORDER BY created_at DESC LIMIT 6", (session_id,)
            ).fetchall()
            summary = " | ".join(f"{row['role']}: {row['content'][:180]}" for row in reversed(summary_rows))[:1200]
            connection.execute("UPDATE chat_sessions SET title=?,summary=?,updated_at=? WHERE id=?", (title, summary, now, session_id))
        return {"id": message_id, "session_id": session_id, "role": role, "content": content, "books": books or [], "created_at": now}


    def update_chat_session(self, user_id: str, session_id: str, changes: dict, access_token: str | None = None) -> dict:
        allowed = {"title", "is_pinned", "is_archived"}
        values = {key: int(value) if key.startswith("is_") else value for key, value in changes.items() if key in allowed and value is not None}
        if not values:
            raise ValueError("Güncellenecek alan yok.")
        values["updated_at"] = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(f"UPDATE chat_sessions SET {','.join(f'{key}=?' for key in values)} WHERE id=? AND user_id=?", [*values.values(), session_id, user_id])
            row = connection.execute("SELECT * FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id)).fetchone()
        if not row:
            raise KeyError("Sohbet bulunamadı.")
        return dict(row)


    def update_chat_message(self, user_id: str, message_id: str, content: str | None, delete: bool = False,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if delete:
                connection.execute("UPDATE chat_messages SET content='',deleted_at=? WHERE id=? AND user_id=?", (now, message_id, user_id))
            else:
                connection.execute("UPDATE chat_messages SET content=?,edited_at=? WHERE id=? AND user_id=?", (content, now, message_id, user_id))
            row = connection.execute("SELECT * FROM chat_messages WHERE id=? AND user_id=?", (message_id, user_id)).fetchone()
        if not row:
            raise KeyError("Mesaj bulunamadı.")
        return dict(row)


    def delete_chat_session(self, user_id: str, session_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM chat_sessions WHERE id=? AND user_id=?", (session_id, user_id))
            if not cursor.rowcount:
                raise KeyError("Sohbet bulunamadı.")


    def compare_books(self, book_ids: list[str], user_id: str | None = None,
                      access_token: str | None = None) -> list[dict]:
        placeholders = ",".join("?" for _ in book_ids)
        with self.connect() as connection:
            rows = connection.execute(f"SELECT * FROM books WHERE id IN ({placeholders})", book_ids).fetchall()
            price_rows = connection.execute(
                f"""SELECT e.book_id,min(o.price_minor) price_minor FROM editions e JOIN offers o ON o.edition_isbn=e.isbn
                    WHERE e.book_id IN ({placeholders}) AND o.stock_status='in_stock' GROUP BY e.book_id""", book_ids
            ).fetchall()
        prices = {row["book_id"]: row["price_minor"] for row in price_rows}
        return [{**self._book(row), "price_minor": prices.get(row["id"]),
                 "difficulty": "kolay" if (row["page_count"] or 0) < 260 else "orta" if (row["page_count"] or 0) < 450 else "yüksek"}
                for row in rows]

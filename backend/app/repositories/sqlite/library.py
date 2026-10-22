"""Kişisel kitaplık, tercihler ve okuma listeleri."""
from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timezone
from uuid import uuid4

from app.services.catalog.catalog_quality import canonical_work_key, deduplicate_library_entries

class SQLiteLibraryMixin:
    def remove_library_entry(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM user_books WHERE user_id=? AND book_id=?", (user_id, book_id))


    def user_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM user_preferences WHERE user_id=?", (user_id,)
            ).fetchone()
        if not row:
            return {
                "user_id": user_id,
                "personality_text": "",
                "selected_traits": [],
                "preferred_genres": [],
                "disliked_genres": [],
                "liked_styles": [], "disliked_styles": [],
                "pace_preference": None, "focus_preference": None, "tone_preference": None,
                "violence_sensitivity": 0, "romance_sensitivity": 0,
                "spoiler_sensitivity": 2, "length_preference": None,
                "updated_at": None,
            }
        return {
            "user_id": row["user_id"],
            "personality_text": row["personality_text"],
            "selected_traits": json.loads(row["selected_traits_json"]),
            "preferred_genres": json.loads(row["preferred_genres_json"]),
            "disliked_genres": json.loads(row["disliked_genres_json"]),
            "liked_styles": json.loads(row["liked_styles_json"] or "[]"),
            "disliked_styles": json.loads(row["disliked_styles_json"] or "[]"),
            "pace_preference": row["pace_preference"], "focus_preference": row["focus_preference"],
            "tone_preference": row["tone_preference"], "violence_sensitivity": row["violence_sensitivity"],
            "romance_sensitivity": row["romance_sensitivity"], "spoiler_sensitivity": row["spoiler_sensitivity"],
            "length_preference": row["length_preference"],
            "updated_at": row["updated_at"],
        }


    def upsert_user_preferences(
        self,
        user_id: str,
        personality_text: str,
        selected_traits: list[str],
        preferred_genres: list[str],
        disliked_genres: list[str],
        liked_styles: list[str] | None = None,
        disliked_styles: list[str] | None = None,
        pace_preference: str | None = None,
        focus_preference: str | None = None,
        tone_preference: str | None = None,
        violence_sensitivity: int = 0,
        romance_sensitivity: int = 0,
        spoiler_sensitivity: int = 2,
        length_preference: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        updated_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            connection.execute(
                """INSERT INTO user_preferences(
                       user_id,personality_text,selected_traits_json,preferred_genres_json,
                       disliked_genres_json,liked_styles_json,disliked_styles_json,pace_preference,
                       focus_preference,tone_preference,violence_sensitivity,romance_sensitivity,
                       spoiler_sensitivity,length_preference,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(user_id) DO UPDATE SET
                       personality_text=excluded.personality_text,
                       selected_traits_json=excluded.selected_traits_json,
                       preferred_genres_json=excluded.preferred_genres_json,
                       disliked_genres_json=excluded.disliked_genres_json,
                       liked_styles_json=excluded.liked_styles_json,disliked_styles_json=excluded.disliked_styles_json,
                       pace_preference=excluded.pace_preference,focus_preference=excluded.focus_preference,
                       tone_preference=excluded.tone_preference,violence_sensitivity=excluded.violence_sensitivity,
                       romance_sensitivity=excluded.romance_sensitivity,spoiler_sensitivity=excluded.spoiler_sensitivity,
                       length_preference=excluded.length_preference,
                       updated_at=excluded.updated_at""",
                (
                    user_id,
                    personality_text.strip(),
                    json.dumps(selected_traits, ensure_ascii=False),
                    json.dumps(preferred_genres, ensure_ascii=False),
                    json.dumps(disliked_genres, ensure_ascii=False),
                    json.dumps(liked_styles or [], ensure_ascii=False), json.dumps(disliked_styles or [], ensure_ascii=False),
                    pace_preference, focus_preference, tone_preference, violence_sensitivity,
                    romance_sensitivity, spoiler_sensitivity, length_preference,
                    updated_at,
                ),
            )
        return self.user_preferences(user_id)


    def upsert_library_entry(
        self,
        user_id: str,
        book_id: str,
        shelf: str,
        is_favorite: bool,
        current_page: int = 0,
        total_pages: int | None = None,
        abandonment_reason: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        updated_at = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            target_book = connection.execute("SELECT title,author FROM books WHERE id=?", (book_id,)).fetchone()
            if not target_book:
                raise KeyError("Kitap bulunamadı.")
            previous = connection.execute(
                "SELECT current_page,started_at,finished_at FROM user_books WHERE user_id=? AND book_id=?",
                (user_id, book_id),
            ).fetchone()
            target_key = canonical_work_key(target_book["title"], target_book["author"])
            other_catalog = connection.execute(
                """SELECT b.title,b.author FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.book_id<>?""", (user_id, book_id),
            ).fetchall()
            custom_books = connection.execute(
                "SELECT title,author FROM user_custom_books WHERE user_id=?", (user_id,),
            ).fetchall()
            if not previous and any(canonical_work_key(row["title"], row["author"]) == target_key
                                    for row in [*other_catalog, *custom_books]):
                raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")
            previous_page = previous["current_page"] if previous else 0
            started_at = previous["started_at"] if previous else None
            finished_at = previous["finished_at"] if previous else None
            if shelf in {"reading", "read"} and not started_at:
                started_at = updated_at
            if shelf == "read" and not finished_at:
                finished_at = updated_at
            if shelf != "read":
                finished_at = None
            connection.execute(
                """INSERT INTO user_books(
                       user_id,book_id,shelf,is_favorite,current_page,total_pages,
                       started_at,finished_at,abandonment_reason,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET
                       shelf=excluded.shelf,is_favorite=excluded.is_favorite,
                       current_page=excluded.current_page,total_pages=excluded.total_pages,
                       started_at=excluded.started_at,finished_at=excluded.finished_at,
                       abandonment_reason=excluded.abandonment_reason,
                       updated_at=excluded.updated_at""",
                (
                    user_id, book_id, shelf, int(is_favorite), current_page, total_pages,
                    started_at, finished_at, abandonment_reason if shelf == "abandoned" else None, updated_at,
                ),
            )
            pages_read = max(0, current_page - previous_page)
            if pages_read:
                connection.execute(
                    """INSERT INTO reading_activity(
                           id,user_id,book_id,activity_date,pages_read,created_at
                       ) VALUES(?,?,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, date.today().isoformat(), pages_read, updated_at),
                )
        return {
            "user_id": user_id, "book_id": book_id, "shelf": shelf,
            "is_favorite": is_favorite, "current_page": current_page,
            "total_pages": total_pages,
            "progress_percent": round(current_page / total_pages * 100, 1) if total_pages else 0,
            "started_at": started_at, "finished_at": finished_at, "updated_at": updated_at,
            "abandonment_reason": abandonment_reason if shelf == "abandoned" else None,
        }


    def user_profile(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            user = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if not user:
                raise KeyError("Kullanıcı bulunamadı.")
            rows = connection.execute(
                """SELECT b.*, ub.shelf, ub.is_favorite,ub.current_page,ub.total_pages,
                          ub.started_at,ub.finished_at,ub.abandonment_reason,ub.updated_at library_updated_at
                   FROM user_books ub
                   JOIN books b ON b.id=ub.book_id WHERE ub.user_id=? ORDER BY b.title""", (user_id,),
            ).fetchall()
            custom_rows = connection.execute(
                "SELECT * FROM user_custom_books WHERE user_id=? ORDER BY title", (user_id,)
            ).fetchall()
        entries = [{
            **self._book(row), "shelf": row["shelf"], "is_favorite": bool(row["is_favorite"]),
            "current_page": row["current_page"], "total_pages": row["total_pages"],
            "progress_percent": round(row["current_page"] / row["total_pages"] * 100, 1)
            if row["total_pages"] else 0,
            "started_at": row["started_at"], "finished_at": row["finished_at"],
            "abandonment_reason": row["abandonment_reason"],
            "library_updated_at": row["library_updated_at"],
        } for row in rows]
        entries.extend(self._custom_book(row) for row in custom_rows)
        entries = deduplicate_library_entries(entries)
        feedback = self.recommendation_feedback(user_id)
        feedback_ids = {item["book_id"] for item in feedback}
        return {
            "user": dict(user),
            "read_books": [item for item in entries if item["shelf"] == "read"],
            "reading_books": [item for item in entries if item["shelf"] == "reading"],
            "to_read_books": [item for item in entries if item["shelf"] == "to_read"],
            "abandoned_books": [item for item in entries if item["shelf"] == "abandoned"],
            "favorite_books": [item for item in entries if item["is_favorite"]],
            "recommendation_feedback": feedback,
            "feedback_books": [book for book in self.list_books() if book["id"] in feedback_ids],
        }


    @staticmethod
    def _custom_book(row: sqlite3.Row | dict) -> dict:
        item = dict(row)
        total_pages = item.get("total_pages")
        return {
            "id": item["id"], "title": item["title"], "author": item["author"],
            "genre": item["genre"], "themes": [item["genre"]], "character_traits": [],
            "description": "Kullanıcının kişisel kitaplığına eklediği kitap.",
            "source_name": "user_custom", "source_url": None,
            "cover_url": item.get("cover_url"), "series_name": None, "series_index": None,
            "is_custom": True, "shelf": item["shelf"],
            "is_favorite": bool(item["is_favorite"]), "current_page": item["current_page"],
            "total_pages": total_pages,
            "progress_percent": round(item["current_page"] / total_pages * 100, 1) if total_pages else 0,
            "started_at": item.get("started_at"), "finished_at": item.get("finished_at"),
            "library_updated_at": item.get("updated_at"),
        }


    def save_custom_book(
        self, user_id: str, title: str, author: str, genre: str, cover_url: str | None,
        shelf: str, is_favorite: bool, current_page: int = 0,
        total_pages: int | None = None, custom_book_id: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        now = datetime.now(timezone.utc).isoformat()
        book_id = custom_book_id or str(uuid4())
        with self.connect() as connection:
            previous = connection.execute(
                "SELECT * FROM user_custom_books WHERE id=? AND user_id=?", (book_id, user_id)
            ).fetchone()
            if custom_book_id and not previous:
                raise KeyError("Kişisel kitap bulunamadı.")
            target_key = canonical_work_key(title.strip(), author.strip() or "Bilinmeyen yazar")
            custom_matches = connection.execute(
                "SELECT id,title,author FROM user_custom_books WHERE user_id=? AND id<>?",
                (user_id, book_id),
            ).fetchall()
            catalog_matches = connection.execute(
                """SELECT b.title,b.author FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=?""", (user_id,),
            ).fetchall()
            unchanged_existing = previous and canonical_work_key(previous["title"], previous["author"]) == target_key
            if not unchanged_existing and any(canonical_work_key(row["title"], row["author"]) == target_key
                                              for row in [*custom_matches, *catalog_matches]):
                raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")
            previous_page = previous["current_page"] if previous else 0
            started_at = previous["started_at"] if previous else None
            finished_at = previous["finished_at"] if previous else None
            if shelf in {"reading", "read"} and not started_at:
                started_at = now
            finished_at = (finished_at or now) if shelf == "read" else None
            connection.execute(
                """INSERT INTO user_custom_books(
                       id,user_id,title,author,genre,cover_url,shelf,is_favorite,current_page,
                       total_pages,started_at,finished_at,created_at,updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author,
                       genre=excluded.genre,cover_url=excluded.cover_url,shelf=excluded.shelf,
                       is_favorite=excluded.is_favorite,current_page=excluded.current_page,
                       total_pages=excluded.total_pages,started_at=excluded.started_at,
                       finished_at=excluded.finished_at,updated_at=excluded.updated_at""",
                (book_id, user_id, title.strip(), author.strip() or "Bilinmeyen yazar",
                 genre.strip() or "Genel", cover_url or None, shelf, int(is_favorite),
                 current_page, total_pages, started_at, finished_at,
                 previous["created_at"] if previous else now, now),
            )
            pages_read = max(0, current_page - previous_page)
            if pages_read:
                connection.execute(
                    """INSERT INTO reading_activity(
                           id,user_id,book_id,custom_book_id,activity_date,pages_read,created_at
                       ) VALUES(?,?,NULL,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, date.today().isoformat(), pages_read, now),
                )
            row = connection.execute("SELECT * FROM user_custom_books WHERE id=?", (book_id,)).fetchone()
        return self._custom_book(row)


    def delete_custom_book(
        self, user_id: str, custom_book_id: str, access_token: str | None = None,
    ) -> None:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM user_custom_books WHERE id=? AND user_id=?", (custom_book_id, user_id)
            )
            if not cursor.rowcount:
                raise KeyError("Kişisel kitap bulunamadı.")


    def onboarding_profile(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM onboarding_profiles WHERE user_id=?", (user_id,)
            ).fetchone()
        if not row:
            return {"user_id": user_id, "liked_book_ids": [], "liked_authors": [], "onboarding_completed": False}
        item = dict(row)
        item["liked_book_ids"] = json.loads(item.pop("liked_book_ids_json", "[]"))
        item["liked_authors"] = json.loads(item.pop("liked_authors_json", "[]"))
        item["onboarding_completed"] = bool(item["onboarding_completed"])
        return item


    def upsert_onboarding_profile(self, user_id: str, liked_book_ids: list[str], liked_authors: list[str],
                                  completed: bool, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            valid_ids = [row["id"] for row in connection.execute(
                f"SELECT id FROM books WHERE id IN ({','.join('?' for _ in liked_book_ids)})",
                liked_book_ids,
            )] if liked_book_ids else []
            connection.execute(
                """INSERT INTO onboarding_profiles(user_id,liked_book_ids_json,liked_authors_json,onboarding_completed,completed_at,updated_at)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
                   liked_book_ids_json=excluded.liked_book_ids_json,liked_authors_json=excluded.liked_authors_json,
                   onboarding_completed=excluded.onboarding_completed,completed_at=excluded.completed_at,updated_at=excluded.updated_at""",
                (user_id, json.dumps(valid_ids), json.dumps(liked_authors[:20], ensure_ascii=False), int(completed), now if completed else None, now),
            )
        return self.onboarding_profile(user_id)


    def import_library_records(self, user_id: str, records: list[dict], access_token: str | None = None) -> dict:
        imported = matched = custom = 0
        errors: list[str] = []
        for record in records:
            try:
                book_id = None
                with self.connect() as connection:
                    if record.get("isbn"):
                        row = connection.execute(
                            "SELECT book_id FROM editions WHERE isbn=? OR isbn10=? OR isbn13=? LIMIT 1",
                            (record["isbn"], record["isbn"], record["isbn"]),
                        ).fetchone()
                        book_id = row["book_id"] if row else None
                    if not book_id:
                        row = connection.execute(
                            "SELECT id FROM books WHERE lower(title)=lower(?) AND lower(author)=lower(?) LIMIT 1",
                            (record["title"], record["author"]),
                        ).fetchone()
                        book_id = row["id"] if row else None
                if book_id:
                    self.upsert_library_entry(user_id, book_id, record["shelf"], False, access_token=access_token)
                    matched += 1
                else:
                    self.save_custom_book(user_id, title=record["title"], author=record["author"], genre="Genel",
                                          cover_url=None, shelf=record["shelf"], is_favorite=False,
                                          access_token=access_token)
                    custom += 1
                imported += 1
            except Exception as error:
                errors.append(f"{record.get('title', 'Kayıt')}: {error}")
        return {"processed": len(records), "imported": imported, "catalog_matches": matched,
                "custom_books": custom, "errors": errors[:30]}


    def create_reading_list(self, user_id: str, title: str, description: str, visibility: str,
                            access_token: str | None = None) -> dict:
        list_id, token, now = str(uuid4()), str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO reading_lists(id,owner_id,title,description,visibility,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                (list_id, user_id, title, description, visibility, token, now, now),
            )
        return {"id": list_id, "owner_id": user_id, "title": title, "description": description,
                "visibility": visibility, "share_token": token, "items": [], "created_at": now, "updated_at": now}


    def list_reading_lists(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT l.*,count(i.book_id) item_count FROM reading_lists l LEFT JOIN reading_list_items i ON i.list_id=l.id
                   WHERE l.owner_id=? GROUP BY l.id ORDER BY l.updated_at DESC""", (user_id,)
            ).fetchall()
        return [dict(row) for row in rows]


    def upsert_reading_list_item(self, user_id: str, list_id: str, book_id: str, note: str, position: int,
                                 access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM reading_lists WHERE id=? AND owner_id=?", (list_id, user_id)).fetchone():
                raise KeyError("Okuma listesi bulunamadı.")
            connection.execute(
                """INSERT INTO reading_list_items(list_id,book_id,note,position,added_at) VALUES(?,?,?,?,?)
                   ON CONFLICT(list_id,book_id) DO UPDATE SET note=excluded.note,position=excluded.position""",
                (list_id, book_id, note, position, now),
            )
            connection.execute("UPDATE reading_lists SET updated_at=? WHERE id=?", (now, list_id))
        return self.reading_list_detail(list_id, user_id=user_id)


    def reading_list_detail(self, list_id: str | None = None, *, user_id: str | None = None,
                            share_token: str | None = None, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            if share_token:
                row = connection.execute("SELECT * FROM reading_lists WHERE share_token=? AND visibility<>'private'", (share_token,)).fetchone()
            else:
                row = connection.execute("SELECT * FROM reading_lists WHERE id=? AND owner_id=?", (list_id, user_id)).fetchone()
            if not row:
                raise KeyError("Okuma listesi bulunamadı.")
            items = connection.execute(
                """SELECT i.note,i.position,i.added_at,b.* FROM reading_list_items i JOIN books b ON b.id=i.book_id
                   WHERE i.list_id=? ORDER BY i.position,i.added_at""", (row["id"],)
            ).fetchall()
        return {**dict(row), "items": [{"note": item["note"], "position": item["position"], "added_at": item["added_at"],
                                         "book": self._book(item)} for item in items]}

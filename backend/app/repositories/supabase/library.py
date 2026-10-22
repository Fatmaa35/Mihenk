"""Kişisel kitaplık, tercihler ve okuma listeleri."""
from __future__ import annotations

from datetime import UTC, datetime, timezone
from typing import Any

from app.services.catalog.catalog_quality import canonical_work_key, deduplicate_library_entries
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseLibraryMixin:
    def remove_library_entry(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/user_books", token=access_token,
                      params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"})


    def onboarding_profile(self, user_id: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/onboarding_profiles", admin=True,
                             params={"user_id": f"eq.{user_id}", "select": "*", "limit": 1}).json()
        if not rows:
            return {"user_id": user_id, "liked_book_ids": [], "liked_authors": [], "onboarding_completed": False}
        return rows[0]


    def upsert_onboarding_profile(self, user_id: str, liked_book_ids: list[str], liked_authors: list[str],
                                  completed: bool, access_token: str | None = None) -> dict:
        valid_ids: list[str] = []
        if liked_book_ids:
            valid_ids = [row["id"] for row in self._request(
                "GET", "/rest/v1/books", admin=True,
                params={"id": f"in.({','.join(liked_book_ids)})", "select": "id"},
            ).json()]
        now = datetime.now(timezone.utc).isoformat()
        payload = {"user_id": user_id, "liked_book_ids": valid_ids, "liked_authors": liked_authors[:20],
                   "onboarding_completed": completed, "completed_at": now if completed else None, "updated_at": now}
        rows = self._request("POST", "/rest/v1/onboarding_profiles", admin=True, params={"on_conflict": "user_id"},
                             json_body=payload, extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]


    def import_library_records(self, user_id: str, records: list[dict], access_token: str | None = None) -> dict:
        imported = matched = custom = 0
        errors: list[str] = []
        for record in records:
            try:
                book_id = None
                if record.get("isbn"):
                    rows = self._request("GET", "/rest/v1/editions", admin=True,
                                         params={"isbn": f"eq.{record['isbn']}", "select": "book_id", "limit": 1}).json()
                    book_id = rows[0].get("book_id") if rows else None
                if not book_id:
                    rows = self._request("GET", "/rest/v1/books", admin=True,
                                         params={"title": f"ilike.{record['title']}", "author": f"ilike.{record['author']}",
                                                 "select": "id", "limit": 1}).json()
                    book_id = rows[0]["id"] if rows else None
                if book_id:
                    self.upsert_library_entry(user_id, book_id, record["shelf"], False, access_token=access_token)
                    matched += 1
                else:
                    self.save_custom_book(user_id, title=record["title"], author=record["author"], genre="Genel",
                                          cover_url=None, shelf=record["shelf"], is_favorite=False, access_token=access_token)
                    custom += 1
                imported += 1
            except Exception as error:
                errors.append(f"{record.get('title', 'Kayıt')}: {error}")
        return {"processed": len(records), "imported": imported, "catalog_matches": matched,
                "custom_books": custom, "errors": errors[:30]}


    def create_reading_list(self, user_id: str, title: str, description: str, visibility: str,
                            access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/reading_lists", admin=True,
                             json_body={"owner_id": user_id, "title": title, "description": description, "visibility": visibility},
                             extra_headers={"Prefer": "return=representation"}).json()
        return {**rows[0], "items": []}


    def list_reading_lists(self, user_id: str, access_token: str | None = None) -> list[dict]:
        rows = self._request("GET", "/rest/v1/reading_lists", admin=True,
                             params={"owner_id": f"eq.{user_id}", "select": "*,reading_list_items(count)", "order": "updated_at.desc"}).json()
        result = []
        for row in rows:
            counts = row.pop("reading_list_items", []) or []
            result.append({**row, "item_count": counts[0].get("count", 0) if counts else 0})
        return result


    def upsert_reading_list_item(self, user_id: str, list_id: str, book_id: str, note: str, position: int,
                                 access_token: str | None = None) -> dict:
        owned = self._request("GET", "/rest/v1/reading_lists", admin=True,
                              params={"id": f"eq.{list_id}", "owner_id": f"eq.{user_id}", "select": "id", "limit": 1}).json()
        if not owned:
            raise KeyError("Okuma listesi bulunamadı.")
        self._request("POST", "/rest/v1/reading_list_items", admin=True,
                      params={"on_conflict": "list_id,book_id"},
                      json_body={"list_id": list_id, "book_id": book_id, "note": note, "position": position},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.reading_list_detail(list_id, user_id=user_id)


    def reading_list_detail(self, list_id: str | None = None, *, user_id: str | None = None,
                            share_token: str | None = None, access_token: str | None = None) -> dict:
        params: dict[str, Any] = {"select": "*,reading_list_items(note,position,added_at,books(*))", "limit": 1}
        if share_token:
            params.update({"share_token": f"eq.{share_token}", "visibility": "neq.private"})
        else:
            params.update({"id": f"eq.{list_id}", "owner_id": f"eq.{user_id}"})
        rows = self._request("GET", "/rest/v1/reading_lists", admin=True, params=params).json()
        if not rows:
            raise KeyError("Okuma listesi bulunamadı.")
        row = rows[0]
        nested_items = row.pop("reading_list_items", []) or []
        items = []
        for item in nested_items:
            book = item.pop("books", None)
            if book:
                items.append({**item, "book": self._book(book)})
        return {**row, "items": items}


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
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        target_rows = self._request(
            "GET", "/rest/v1/books", token=access_token,
            params={"select": "id,title,author", "id": f"eq.{book_id}", "limit": 1},
        ).json()
        if not target_rows:
            raise KeyError("Kitap bulunamadı.")
        self._assert_library_identity_available(
            user_id, target_rows[0]["title"], target_rows[0]["author"], access_token,
            exclude_book_id=book_id,
        )
        response = self._request(
            "POST",
            "/rest/v1/rpc/update_reading_progress",
            token=access_token,
            json_body={
                "p_book_id": book_id,
                "p_shelf": shelf,
                "p_is_favorite": is_favorite,
                "p_current_page": current_page,
                "p_total_pages": total_pages,
            },
        )
        rows = response.json()
        if not rows:
            raise SupabaseRequestError("Kitaplık kaydı oluşturulamadı.", 409)
        return rows[0]


    @staticmethod
    def _custom_book(row: dict) -> dict:
        total_pages = row.get("total_pages")
        return {
            "id": row["id"], "title": row["title"], "author": row["author"],
            "genre": row["genre"], "themes": [row["genre"]], "character_traits": [],
            "description": "Kullanıcının kişisel kitaplığına eklediği kitap.",
            "source_name": "user_custom", "source_url": None,
            "cover_url": row.get("cover_url"), "series_name": None, "series_index": None,
            "is_custom": True, "shelf": row["shelf"],
            "is_favorite": row["is_favorite"], "current_page": row["current_page"],
            "total_pages": total_pages,
            "progress_percent": round(row["current_page"] / total_pages * 100, 1) if total_pages else 0,
            "started_at": row.get("started_at"), "finished_at": row.get("finished_at"),
            "library_updated_at": row.get("updated_at"),
        }


    def _assert_library_identity_available(
        self, user_id: str, title: str, author: str, access_token: str,
        *, exclude_book_id: str | None = None, exclude_custom_id: str | None = None,
    ) -> None:
        target_key = canonical_work_key(title, author)
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "id,title,author", "user_id": f"eq.{user_id}", "limit": 1000},
        ).json()
        catalog_rows = self._request(
            "GET", "/rest/v1/user_books", token=access_token,
            params={
                "select": "book_id,book:books!inner(title,author)",
                "user_id": f"eq.{user_id}", "limit": 1000,
            },
        ).json()
        existing_custom = next((row for row in custom_rows if row["id"] == exclude_custom_id), None)
        if existing_custom and canonical_work_key(existing_custom["title"], existing_custom["author"]) == target_key:
            return
        existing_catalog = next((row for row in catalog_rows if row["book_id"] == exclude_book_id), None)
        if existing_catalog and canonical_work_key(
            existing_catalog["book"]["title"], existing_catalog["book"]["author"]
        ) == target_key:
            return
        duplicate_custom = any(
            row["id"] != exclude_custom_id
            and canonical_work_key(row["title"], row["author"]) == target_key
            for row in custom_rows
        )
        duplicate_catalog = any(
            row["book_id"] != exclude_book_id
            and canonical_work_key(row["book"]["title"], row["book"]["author"]) == target_key
            for row in catalog_rows
        )
        if duplicate_custom or duplicate_catalog:
            raise ValueError("Bu kitap kitaplığınızda zaten mevcut.")


    def save_custom_book(
        self, user_id: str, title: str, author: str, genre: str, cover_url: str | None,
        shelf: str, is_favorite: bool, current_page: int = 0,
        total_pages: int | None = None, custom_book_id: str | None = None,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        if total_pages is not None and current_page > total_pages:
            raise ValueError("Okunan sayfa, toplam sayfa sayisini asamaz.")
        self._assert_library_identity_available(
            user_id, title.strip(), author.strip() or "Bilinmeyen yazar", access_token,
            exclude_custom_id=custom_book_id,
        )
        now = datetime.now(UTC).isoformat()
        previous = []
        if custom_book_id:
            previous = self._request(
                "GET", "/rest/v1/user_custom_books", token=access_token,
                params={"select": "*", "id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
            if not previous:
                raise KeyError("Kişisel kitap bulunamadı.")
        old = previous[0] if previous else None
        started_at = old.get("started_at") if old else None
        finished_at = old.get("finished_at") if old else None
        if shelf in {"reading", "read"} and not started_at:
            started_at = now
        finished_at = (finished_at or now) if shelf == "read" else None
        body = {
            "user_id": user_id, "title": title.strip(),
            "author": author.strip() or "Bilinmeyen yazar", "genre": genre.strip() or "Genel",
            "cover_url": cover_url or None, "shelf": shelf, "is_favorite": is_favorite,
            "current_page": current_page, "total_pages": total_pages,
            "started_at": started_at, "finished_at": finished_at,
        }
        if custom_book_id:
            rows = self._request(
                "PATCH", "/rest/v1/user_custom_books", token=access_token,
                params={"id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}"},
                json_body=body, extra_headers={"Prefer": "return=representation"},
            ).json()
        else:
            rows = self._request(
                "POST", "/rest/v1/user_custom_books", token=access_token,
                json_body=body, extra_headers={"Prefer": "return=representation"},
            ).json()
        if not rows:
            raise SupabaseRequestError("Kişisel kitap kaydedilemedi.", 409)
        pages_read = max(0, current_page - (old.get("current_page", 0) if old else 0))
        if pages_read:
            self._request(
                "POST", "/rest/v1/reading_activity", token=access_token,
                json_body={"user_id": user_id, "custom_book_id": rows[0]["id"], "pages_read": pages_read},
            )
        return self._custom_book(rows[0])


    def delete_custom_book(
        self, user_id: str, custom_book_id: str, access_token: str | None = None,
    ) -> None:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        response = self._request(
            "DELETE", "/rest/v1/user_custom_books", token=access_token,
            params={"id": f"eq.{custom_book_id}", "user_id": f"eq.{user_id}"},
            extra_headers={"Prefer": "return=representation"},
        )
        if not response.json():
            raise KeyError("Kişisel kitap bulunamadı.")


    def user_preferences(self, user_id: str, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        base_columns = "user_id,personality_text,selected_traits,preferred_genres,disliked_genres,updated_at"
        detailed_columns = base_columns + ",liked_styles,disliked_styles,pace_preference,focus_preference,tone_preference,violence_sensitivity,romance_sensitivity,spoiler_sensitivity,length_preference"
        try:
            rows = self._request(
                "GET", "/rest/v1/user_preferences", token=access_token,
                params={"select": detailed_columns, "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code != 400:
                raise
            rows = self._request(
                "GET", "/rest/v1/user_preferences", token=access_token,
                params={"select": base_columns, "user_id": f"eq.{user_id}", "limit": 1},
            ).json()
        if rows:
            return {
                "liked_styles": [], "disliked_styles": [], "pace_preference": None,
                "focus_preference": None, "tone_preference": None, "violence_sensitivity": 0,
                "romance_sensitivity": 0, "spoiler_sensitivity": 2, "length_preference": None,
                **rows[0],
            }
        return {
            "user_id": user_id,
            "personality_text": "",
            "selected_traits": [],
            "preferred_genres": [],
            "disliked_genres": [],
            "liked_styles": [], "disliked_styles": [], "pace_preference": None,
            "focus_preference": None, "tone_preference": None, "violence_sensitivity": 0,
            "romance_sensitivity": 0, "spoiler_sensitivity": 2, "length_preference": None,
            "updated_at": None,
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
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        payload = {
                "user_id": user_id,
                "personality_text": personality_text.strip(),
                "selected_traits": selected_traits,
                "preferred_genres": preferred_genres,
                "disliked_genres": disliked_genres,
            }
        if any((liked_styles, disliked_styles, pace_preference, focus_preference, tone_preference,
                violence_sensitivity, romance_sensitivity, spoiler_sensitivity != 2, length_preference)):
            payload.update({
                "liked_styles": liked_styles or [], "disliked_styles": disliked_styles or [],
                "pace_preference": pace_preference, "focus_preference": focus_preference,
                "tone_preference": tone_preference, "violence_sensitivity": violence_sensitivity,
                "romance_sensitivity": romance_sensitivity, "spoiler_sensitivity": spoiler_sensitivity,
                "length_preference": length_preference,
            })
        try:
            rows = self._request(
                "POST", "/rest/v1/user_preferences", token=access_token,
                params={"on_conflict": "user_id"}, json_body=payload,
                extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            ).json()
        except SupabaseRequestError as error:
            if error.status_code != 400:
                raise
            legacy = {key: payload[key] for key in ("user_id", "personality_text", "selected_traits", "preferred_genres", "disliked_genres")}
            rows = self._request(
                "POST", "/rest/v1/user_preferences", token=access_token,
                params={"on_conflict": "user_id"}, json_body=legacy,
                extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            ).json()
        if not rows:
            raise SupabaseRequestError("Okuma tercihleri kaydedilemedi.", 409)
        return rows[0]


    def user_profile(self, user_id: str, access_token: str | None = None) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        auth_user = self._request("GET", "/auth/v1/user", token=access_token).json()
        profile_rows = self._request(
            "GET",
            "/rest/v1/profiles",
            token=access_token,
            params={"select": "id,display_name,created_at", "id": f"eq.{user_id}", "limit": 1},
        ).json()
        if not profile_rows:
            raise KeyError("Kullanıcı bulunamadı.")
        rows = self._request(
            "GET",
            "/rest/v1/user_books",
            token=access_token,
            params={
                "select": (
                    "shelf,is_favorite,current_page,total_pages,started_at,finished_at,updated_at,"
                    f"book:books!inner({self.BOOK_COLUMNS})"
                ),
                "user_id": f"eq.{user_id}",
                "limit": 1000,
            },
        ).json()
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "title.asc", "limit": 1000},
        ).json()
        entries = [
            {
                **self._book(row["book"]), "shelf": row["shelf"],
                "is_favorite": row["is_favorite"], "current_page": row["current_page"],
                "total_pages": row.get("total_pages"),
                "progress_percent": round(
                    row["current_page"] / row["total_pages"] * 100, 1
                ) if row.get("total_pages") else 0,
                "started_at": row.get("started_at"), "finished_at": row.get("finished_at"),
                "library_updated_at": row.get("updated_at"),
            }
            for row in rows
        ]
        entries.extend(self._custom_book(row) for row in custom_rows)
        entries = deduplicate_library_entries(entries)
        profile = profile_rows[0]
        feedback = self.recommendation_feedback(user_id, access_token)
        feedback_ids = sorted({item["book_id"] for item in feedback})
        feedback_books = []
        if feedback_ids:
            feedback_rows = self._request(
                "GET", "/rest/v1/books", token=access_token,
                params={"select": self.BOOK_COLUMNS, "id": f"in.({','.join(feedback_ids)})"},
            ).json()
            feedback_books = [self._book(row) for row in feedback_rows]
        return {
            "user": {
                **profile,
                "email": auth_user.get("email", ""),
            },
            "read_books": [item for item in entries if item["shelf"] == "read"],
            "reading_books": [item for item in entries if item["shelf"] == "reading"],
            "to_read_books": [item for item in entries if item["shelf"] == "to_read"],
            "abandoned_books": [item for item in entries if item["shelf"] == "abandoned"],
            "favorite_books": [item for item in entries if item["is_favorite"]],
            "recommendation_feedback": feedback,
            "feedback_books": feedback_books,
        }

from __future__ import annotations

from app.repositories.supabase.shared import *  # noqa: F403
from app.repositories.supabase.base import SupabaseRequestError


class SupabaseLibraryMixin:
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

    def upsert_reading_goal(
        self, user_id: str, goal_year: int, target_books: int,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/reading_goals", token=access_token,
            params={"on_conflict": "user_id,goal_year"},
            json_body={
                "user_id": user_id, "goal_year": goal_year,
                "target_books": target_books,
            },
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Okuma hedefi kaydedilemedi.", 409)
        return rows[0]

    @staticmethod
    def _reading_streaks(activity_days: list[date]) -> tuple[int, int]:
        unique_days = sorted(set(activity_days))
        if not unique_days:
            return 0, 0
        longest = run = 1
        for previous, current in zip(unique_days, unique_days[1:]):
            run = run + 1 if current - previous == timedelta(days=1) else 1
            longest = max(longest, run)
        if date.today() - unique_days[-1] > timedelta(days=1):
            return 0, longest
        current_streak = 1
        for index in range(len(unique_days) - 1, 0, -1):
            if unique_days[index] - unique_days[index - 1] != timedelta(days=1):
                break
            current_streak += 1
        return current_streak, longest

    def reading_dashboard(
        self, user_id: str, year: int, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        goal_rows = self._request(
            "GET", "/rest/v1/reading_goals", token=access_token,
            params={
                "select": "target_books", "user_id": f"eq.{user_id}",
                "goal_year": f"eq.{year}", "limit": 1,
            },
        ).json()
        library_rows = self._request(
            "GET", "/rest/v1/user_books", token=access_token,
            params={
                "select": (
                    "shelf,current_page,total_pages,started_at,finished_at,"
                    f"book:books!inner({self.BOOK_COLUMNS})"
                ),
                "user_id": f"eq.{user_id}", "limit": 1000,
            },
        ).json()
        custom_rows = self._request(
            "GET", "/rest/v1/user_custom_books", token=access_token,
            params={"select": "*", "user_id": f"eq.{user_id}", "limit": 1000},
        ).json()
        activity_rows = self._request(
            "GET", "/rest/v1/reading_activity", token=access_token,
            params={
                "select": "activity_date,pages_read,book_id,custom_book_id",
                "user_id": f"eq.{user_id}",
                "activity_date": f"gte.{year}-01-01",
                "and": f"(activity_date.lt.{year + 1}-01-01)",
                "order": "activity_date.asc", "limit": 5000,
            },
        ).json()
        series_catalog = self._request(
            "GET", "/rest/v1/books",
            params={
                "select": "id,series_name", "series_name": "not.is.null",
                "limit": 1000,
            },
        ).json()

        calendar_by_date: dict[str, dict] = {}
        for row in activity_rows:
            item = calendar_by_date.setdefault(
                row["activity_date"], {"activity_date": row["activity_date"], "pages_read": 0, "book_ids": set()}
            )
            item["pages_read"] += row["pages_read"]
            item["book_ids"].add(row.get("book_id") or row.get("custom_book_id"))
        calendar = [{
            "activity_date": item["activity_date"], "pages_read": item["pages_read"],
            "books": len(item["book_ids"]),
        } for item in calendar_by_date.values()]
        activity_days = [date.fromisoformat(item["activity_date"]) for item in calendar]
        current_streak, longest_streak = self._reading_streaks(activity_days)

        genre_counts: dict[str, int] = {}
        read_ids = set()
        completed_books = 0
        currently_reading = []
        for row in library_rows:
            book = self._book(row["book"])
            if row["shelf"] == "read":
                read_ids.add(book["id"])
                genre_counts[book["genre"]] = genre_counts.get(book["genre"], 0) + 1
                if str(row.get("finished_at") or "").startswith(str(year)):
                    completed_books += 1
            if row["shelf"] == "reading":
                total_pages = row.get("total_pages")
                currently_reading.append({
                    **book, "current_page": row["current_page"], "total_pages": total_pages,
                    "progress_percent": round(row["current_page"] / total_pages * 100, 1)
                    if total_pages else 0,
                    "started_at": row.get("started_at"),
                })
        for row in custom_rows:
            if row["shelf"] == "read":
                genre_counts[row["genre"]] = genre_counts.get(row["genre"], 0) + 1
                if str(row.get("finished_at") or "").startswith(str(year)):
                    completed_books += 1
            if row["shelf"] == "reading":
                currently_reading.append(self._custom_book(row))

        series: dict[str, dict] = {}
        for book in series_catalog:
            name = book.get("series_name")
            if not name:
                continue
            item = series.setdefault(name, {"series_name": name, "total_books": 0, "read_books": 0})
            item["total_books"] += 1
            item["read_books"] += int(book["id"] in read_ids)
        series_progress = [{
            **item,
            "progress_percent": round(item["read_books"] / item["total_books"] * 100, 1),
        } for item in sorted(series.values(), key=lambda value: value["series_name"])]
        target_books = goal_rows[0]["target_books"] if goal_rows else 12
        return {
            "year": year,
            "goal": {
                "target_books": target_books, "completed_books": completed_books,
                "progress_percent": round(min(1, completed_books / target_books) * 100, 1),
                "is_default": not goal_rows,
            },
            "total_pages_read": sum(row["pages_read"] for row in activity_rows),
            "active_days": len(calendar), "current_streak": current_streak,
            "longest_streak": longest_streak, "calendar": calendar,
            "genre_distribution": [
                {"genre": genre, "count": count}
                for genre, count in sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "series_progress": series_progress,
            "currently_reading": currently_reading,
        }

    def get_reading_session_stats(
        self, user_id: str, access_token: str | None = None,
    ) -> dict:
        """Build PKM statistics from user-owned Supabase rows.

        Older Supabase installations do not have the optional reading_sessions
        table, so reading_activity remains the reliable source for the heatmap.
        """
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)

        activity_rows = self._request(
            "GET", "/rest/v1/reading_activity", token=access_token,
            params={
                "select": "activity_date,pages_read",
                "user_id": f"eq.{user_id}", "order": "activity_date.asc", "limit": 5000,
            },
        ).json()

        session_rows: list[dict] = []
        try:
            session_rows = self._request(
                "GET", "/rest/v1/reading_sessions", token=access_token,
                params={
                    "select": "duration_minutes,start_page,end_page",
                    "user_id": f"eq.{user_id}", "limit": 5000,
                },
            ).json()
        except SupabaseRequestError as error:
            if error.status_code not in {400, 404}:
                raise

        heatmap: dict[str, int] = {}
        for row in activity_rows:
            activity_date = str(row.get("activity_date") or "")
            if activity_date:
                heatmap[activity_date] = heatmap.get(activity_date, 0) + int(row.get("pages_read") or 0)

        if session_rows:
            total_sessions = len(session_rows)
            total_minutes = sum(int(row.get("duration_minutes") or 0) for row in session_rows)
            total_pages = sum(
                max(0, int(row.get("end_page") or 0) - int(row.get("start_page") or 0))
                for row in session_rows
            )
        else:
            total_sessions = len(activity_rows)
            total_minutes = 0
            total_pages = sum(int(row.get("pages_read") or 0) for row in activity_rows)

        average_speed = round(total_pages / total_minutes, 2) if total_minutes > 0 else 0.0
        estimated_hours = round((300 / average_speed) / 60, 1) if average_speed > 0 else 0.0
        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "total_pages_read": total_pages,
            "average_reading_speed_pages_per_min": average_speed,
            "estimated_hours_for_300_page_book": estimated_hours,
            "heatmap_data": heatmap,
        }

    @staticmethod
    def _reading_session_view(row: dict) -> dict:
        start_page = int(row.get("start_page") or 0)
        end_page = int(row.get("end_page") or 0)
        duration = int(row.get("duration_minutes") or 0)
        pages_read = max(0, end_page - start_page)
        book = row.get("book") or {}
        custom_book = row.get("custom_book") or {}
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "book_id": row.get("book_id"),
            "custom_book_id": row.get("custom_book_id"),
            "book_title": book.get("title") or custom_book.get("title"),
            "start_page": start_page,
            "end_page": end_page,
            "pages_read": pages_read,
            "duration_minutes": duration,
            "reading_speed_pages_per_min": round(pages_read / duration, 2) if duration else 0.0,
            "session_date": row["session_date"],
            "created_at": row["created_at"],
        }

    @staticmethod
    def _book_quote_view(row: dict) -> dict:
        book = row.get("book") or {}
        custom_book = row.get("custom_book") or {}
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "book_id": row.get("book_id"),
            "custom_book_id": row.get("custom_book_id"),
            "book_title": book.get("title") or custom_book.get("title"),
            "quote_text": row["quote_text"],
            "page_number": row.get("page_number"),
            "tags": row.get("tags") or [],
            "source_type": row.get("source_type") or "manual",
            "created_at": row["created_at"],
        }

    def _pkm_book_title(
        self, user_id: str, book_id: str | None, custom_book_id: str | None,
        access_token: str,
    ) -> str:
        if book_id:
            rows = self._request(
                "GET", "/rest/v1/books", token=access_token,
                params={"select": "title", "id": f"eq.{book_id}", "limit": 1},
            ).json()
        else:
            rows = self._request(
                "GET", "/rest/v1/user_custom_books", token=access_token,
                params={
                    "select": "title", "id": f"eq.{custom_book_id}",
                    "user_id": f"eq.{user_id}", "limit": 1,
                },
            ).json()
        if not rows:
            raise KeyError("Kitap bulunamadı.")
        return rows[0]["title"]

    def add_reading_session(
        self, user_id: str, payload: dict, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        title = self._pkm_book_title(user_id, book_id, custom_book_id, access_token)
        body = {
            "user_id": user_id,
            "book_id": book_id,
            "custom_book_id": custom_book_id,
            "start_page": payload["start_page"],
            "end_page": payload["end_page"],
            "duration_minutes": payload["duration_minutes"],
        }
        rows = self._request(
            "POST", "/rest/v1/reading_sessions", token=access_token,
            json_body=body, extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Okuma seansı kaydedilemedi.", 502)

        pages_read = max(0, int(payload["end_page"]) - int(payload["start_page"]))
        if pages_read:
            self._request(
                "POST", "/rest/v1/reading_activity", token=access_token,
                json_body={
                    "user_id": user_id, "book_id": book_id,
                    "custom_book_id": custom_book_id, "pages_read": pages_read,
                },
                extra_headers={"Prefer": "return=minimal"},
            )
            if book_id:
                self._request(
                    "PATCH", "/rest/v1/user_books", token=access_token,
                    params={
                        "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}",
                        "current_page": f"lt.{payload['end_page']}",
                    },
                    json_body={"current_page": payload["end_page"]},
                    extra_headers={"Prefer": "return=minimal"},
                )
            else:
                self._request(
                    "PATCH", "/rest/v1/user_custom_books", token=access_token,
                    params={
                        "user_id": f"eq.{user_id}", "id": f"eq.{custom_book_id}",
                        "current_page": f"lt.{payload['end_page']}",
                    },
                    json_body={"current_page": payload["end_page"]},
                    extra_headers={"Prefer": "return=minimal"},
                )

        row = {**rows[0], "book": {"title": title} if book_id else None,
               "custom_book": {"title": title} if custom_book_id else None}
        return self._reading_session_view(row)

    def list_reading_sessions(
        self, user_id: str, book_id: str | None = None, limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        params: dict[str, Any] = {
            "select": "*,book:books(title),custom_book:user_custom_books(title)",
            "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": limit,
        }
        if book_id:
            params["or"] = f"(book_id.eq.{book_id},custom_book_id.eq.{book_id})"
        rows = self._request(
            "GET", "/rest/v1/reading_sessions", token=access_token, params=params,
        ).json()
        return [self._reading_session_view(row) for row in rows]

    def add_book_quote(
        self, user_id: str, payload: dict, access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        title = self._pkm_book_title(user_id, book_id, custom_book_id, access_token)
        rows = self._request(
            "POST", "/rest/v1/book_quotes", token=access_token,
            json_body={
                "user_id": user_id, "book_id": book_id,
                "custom_book_id": custom_book_id,
                "quote_text": payload["quote_text"],
                "page_number": payload.get("page_number"),
                "tags": payload.get("tags") or [],
                "source_type": payload.get("source_type") or "manual",
            },
            extra_headers={"Prefer": "return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Alıntı kaydedilemedi.", 502)
        row = {**rows[0], "book": {"title": title} if book_id else None,
               "custom_book": {"title": title} if custom_book_id else None}
        return self._book_quote_view(row)

    def list_book_quotes(
        self, user_id: str, book_id: str | None = None, limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum açmanız gerekiyor.", 401)
        params: dict[str, Any] = {
            "select": "*,book:books(title),custom_book:user_custom_books(title)",
            "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": limit,
        }
        if book_id:
            params["or"] = f"(book_id.eq.{book_id},custom_book_id.eq.{book_id})"
        rows = self._request(
            "GET", "/rest/v1/book_quotes", token=access_token, params=params,
        ).json()
        return [self._book_quote_view(row) for row in rows]

    def gamification_summary(self, user_id: str, access_token: str | None = None) -> dict:
        stats = self._request(
            "POST", "/rest/v1/rpc/gamification_stats", admin=True,
            json_body={"target_user_id": user_id},
        ).json()
        if not isinstance(stats, dict):
            raise SupabaseRequestError("Rozet ilerlemesi hesaplanamadı.", 502)
        stats = {key: int(value or 0) for key, value in stats.items()}
        qualified = earned_badge_codes(stats)
        existing_rows = self._request(
            "GET", "/rest/v1/user_badges", admin=True,
            params={"select": "badge_code,earned_at", "user_id": f"eq.{user_id}", "order": "earned_at.asc"},
        ).json()
        existing = {row["badge_code"] for row in existing_rows}
        revoked = existing - qualified
        if revoked:
            self._request(
                "DELETE", "/rest/v1/user_badges", admin=True,
                params={"user_id": f"eq.{user_id}", "badge_code": f"in.({','.join(sorted(revoked))})"},
            )
        new_codes = qualified - existing
        if new_codes:
            now = datetime.now(timezone.utc).isoformat()
            self._request(
                "POST", "/rest/v1/user_badges", admin=True,
                params={"on_conflict": "user_id,badge_code"},
                json_body=[{"user_id": user_id, "badge_code": code, "earned_at": now} for code in sorted(new_codes)],
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
            )
        earned_rows = self._request(
            "GET", "/rest/v1/user_badges", admin=True,
            params={"select": "badge_code,earned_at", "user_id": f"eq.{user_id}", "order": "earned_at.asc"},
        ).json()
        showcase_rows = self._request(
            "GET", "/rest/v1/user_badge_showcase", admin=True,
            params={"select": "slot,badge_code", "user_id": f"eq.{user_id}", "order": "slot.asc"},
        ).json()
        showcase = [row["badge_code"] for row in showcase_rows]
        earned_now = {row["badge_code"] for row in earned_rows}
        additions = []
        if not showcase and new_codes:
            for rule in BADGE_RULES:
                if len(showcase) >= 3:
                    break
                if rule.code in earned_now:
                    showcase.append(rule.code)
                    additions.append({"user_id": user_id, "slot": len(showcase), "badge_code": rule.code})
        if additions:
            self._request(
                "POST", "/rest/v1/user_badge_showcase", admin=True,
                json_body=additions, extra_headers={"Prefer": "return=minimal"},
            )
        return build_gamification_summary(stats, earned_rows, showcase)

    def update_badge_showcase(self, user_id: str, badge_codes: list[str], access_token: str | None = None) -> dict:
        codes = list(dict.fromkeys(badge_codes))
        if len(codes) != len(badge_codes) or len(codes) > 3:
            raise ValueError("Vitrinde en fazla üç farklı rozet gösterilebilir.")
        current = self.gamification_summary(user_id, access_token)
        earned = {badge["code"] for badge in current["badges"] if badge["earned"]}
        if any(code not in earned for code in codes):
            raise ValueError("Yalnızca kazanılmış rozetler vitrine eklenebilir.")
        self._request(
            "DELETE", "/rest/v1/user_badge_showcase", admin=True,
            params={"user_id": f"eq.{user_id}"},
        )
        if codes:
            self._request(
                "POST", "/rest/v1/user_badge_showcase", admin=True,
                json_body=[{"user_id": user_id, "slot": slot, "badge_code": code} for slot, code in enumerate(codes, 1)],
                extra_headers={"Prefer": "return=minimal"},
            )
        return self.gamification_summary(user_id, access_token)

"""Kitap kulüpleri ve canlı okuma odaları."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

class SupabaseClubsMixin:
    def create_book_club(self, user_id: str, name: str, description: str, visibility: str,
                         rules: str = "", access_token: str | None = None) -> dict:
        try:
            club = self._request("POST", "/rest/v1/book_clubs", admin=True,
                                 json_body={"owner_id": user_id, "name": name, "description": description, "rules": rules, "visibility": visibility},
                                 extra_headers={"Prefer": "return=representation"}).json()[0]
        except Exception:
            club = self._request("POST", "/rest/v1/book_clubs", admin=True,
                                 json_body={"owner_id": user_id, "name": name, "description": description, "visibility": visibility},
                                 extra_headers={"Prefer": "return=representation"}).json()[0]
        self._request("POST", "/rest/v1/book_club_members", admin=True,
                      json_body={"club_id": club["id"], "user_id": user_id, "role": "owner"},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club["id"])


    def update_book_club(self, user_id: str, club_id: str, values: dict,
                         access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Kulüp ayarlarını yalnızca yönetici düzenleyebilir.")
        self._request("PATCH", "/rest/v1/book_clubs", admin=True,
                      params={"id": f"eq.{club_id}"},
                      json_body={**values, "updated_at": datetime.now(timezone.utc).isoformat()},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def update_book_club_member_role(self, user_id: str, club_id: str, target_user_id: str, role: str,
                                     access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] != "owner":
            raise PermissionError("Yalnızca kulüp sahibi üye rollerini değiştirebilir.")
        if user_id == target_user_id and role != "owner":
            raise ValueError("Kulüp sahibi kendi rolünü düşüremez.")
        self._request("PATCH", "/rest/v1/book_club_members", admin=True,
                      params={"club_id": f"eq.{club_id}", "user_id": f"eq.{target_user_id}"},
                      json_body={"role": role},
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def join_book_club(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        rows = self._request("GET", "/rest/v1/book_clubs", admin=True,
                             params={"invite_code": f"eq.{invite_code}", "select": "id", "limit": 1}).json()
        if not rows:
            raise KeyError("Davet kodu geçersiz.")
        self._request("POST", "/rest/v1/book_club_members", admin=True,
                      params={"on_conflict": "club_id,user_id"},
                      json_body={"club_id": rows[0]["id"], "user_id": user_id, "role": "member"},
                      extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
        return self.book_club_detail(user_id, rows[0]["id"])


    def list_book_clubs(self, user_id: str, access_token: str | None = None) -> list[dict]:
        memberships = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                    params={"user_id": f"eq.{user_id}", "select": "role,book_clubs(*)", "order": "joined_at.desc"}).json()
        return [{**row.get("book_clubs", {}), "role": row["role"]} for row in memberships]


    def join_reading(self, user_id: str, club_id: str, book_id: str, daily_target_pages: int = 10,
                     shelf: str = "reading", access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise KeyError("Kulüp üyeliği gerekiyor.")
        books = self._request("GET", "/rest/v1/books", admin=True, params={"id": f"eq.{book_id}", "select": "page_count", "limit": 1}).json()
        total_pages = books[0]["page_count"] if books else None
        self._request("POST", "/rest/v1/user_books", admin=True,
                      params={"on_conflict": "user_id,book_id"},
                      json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                 "current_page": 0, "total_pages": total_pages, "started_at": today, "updated_at": now},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        try:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": 0, "total_pages": total_pages, "daily_target_pages": max(1, daily_target_pages), "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": 0, "total_pages": total_pages, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def upsert_book_club_progress(self, user_id: str, club_id: str, values: dict,
                                  access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise KeyError("Kitap kulübü bulunamadı.")
        now = datetime.now(timezone.utc).isoformat()
        book_id = values["book_id"]
        current_page = values["current_page"]
        total_pages = values.get("total_pages")
        daily_target = values.get("daily_target_pages", 10)
        try:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": current_page, "total_pages": total_pages,
                                     "daily_target_pages": daily_target or 10, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_progress", admin=True,
                          params={"on_conflict": "club_id,user_id,book_id"},
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                     "current_page": current_page, "total_pages": total_pages, "updated_at": now},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
        finished_at = now if shelf == "read" else None
        self._request("POST", "/rest/v1/user_books", admin=True,
                      params={"on_conflict": "user_id,book_id"},
                      json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                 "current_page": current_page, "total_pages": total_pages,
                                 "finished_at": finished_at, "updated_at": now},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def create_book_club_discussion(self, user_id: str, club_id: str, values: dict,
                                    access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        progress = self._request("GET", "/rest/v1/book_club_progress", admin=True,
                                 params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}",
                                         "book_id": f"eq.{values['book_id']}", "select": "current_page", "limit": 1}).json()
        curr = progress[0]["current_page"] if progress else 0
        if values.get("page_number") and values["page_number"] > curr:
            raise PermissionError("Henüz ulaşmadığın sayfa için tartışma açamazsın.")
        try:
            self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                          json_body={"club_id": club_id, "user_id": user_id, **values},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                          json_body={"club_id": club_id, "user_id": user_id, "book_id": values["book_id"],
                                     "content": values["content"], "page_number": values.get("page_number")},
                          extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def toggle_book_club_reaction(self, user_id: str, club_id: str, discussion_id: str, reaction_type: str,
                                  access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        discussion = self._request("GET", "/rest/v1/book_club_discussions", admin=True,
                                   params={"id": f"eq.{discussion_id}", "club_id": f"eq.{club_id}",
                                           "select": "id", "limit": 1}).json()
        if not discussion:
            raise KeyError("Tartışma bulunamadı.")
        try:
            existing = self._request("GET", "/rest/v1/book_club_reactions", admin=True,
                                    params={"discussion_id": f"eq.{discussion_id}", "user_id": f"eq.{user_id}",
                                            "reaction_type": f"eq.{reaction_type}", "select": "id", "limit": 1}).json()
            if existing:
                self._request("DELETE", "/rest/v1/book_club_reactions", admin=True, params={"id": f"eq.{existing[0]['id']}"})
            else:
                self._request("POST", "/rest/v1/book_club_reactions", admin=True,
                              json_body={"discussion_id": discussion_id, "user_id": user_id, "reaction_type": reaction_type},
                              extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)


    def create_book_club_event(self, user_id: str, club_id: str, values: dict,
                               access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Etkinlikleri yalnızca kulüp yöneticisi oluşturabilir.")
        try:
            event = self._request("POST", "/rest/v1/book_club_events", admin=True,
                                  json_body={"club_id": club_id, "created_by": user_id, **values},
                                  extra_headers={"Prefer": "return=representation"}).json()[0]
            self._request("POST", "/rest/v1/book_club_event_rsvps", admin=True,
                          json_body={"event_id": event["id"], "user_id": user_id, "status": "attending"},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)


    def rsvp_book_club_event(self, user_id: str, club_id: str, event_id: str, status: str,
                             access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        event = self._request("GET", "/rest/v1/book_club_events", admin=True,
                              params={"id": f"eq.{event_id}", "club_id": f"eq.{club_id}",
                                      "select": "id", "limit": 1}).json()
        if not event:
            raise KeyError("Etkinlik bulunamadı.")
        try:
            self._request("POST", "/rest/v1/book_club_event_rsvps", admin=True,
                          params={"on_conflict": "event_id,user_id"},
                          json_body={"event_id": event_id, "user_id": user_id, "status": status},
                          extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        except Exception:
            pass
        return self.book_club_detail(user_id, club_id)


    def create_book_club_poll(self, user_id: str, club_id: str, title: str, option_book_ids: list[str],
                              access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Oylamayı yalnızca kulüp yöneticisi açabilir.")
        poll = self._request("POST", "/rest/v1/book_club_polls", admin=True,
                             json_body={"club_id": club_id, "title": title, "created_by": user_id},
                             extra_headers={"Prefer": "return=representation"}).json()[0]
        self._request("POST", "/rest/v1/book_club_poll_options", admin=True,
                      json_body=[{"poll_id": poll["id"], "book_id": book_id} for book_id in dict.fromkeys(option_book_ids)],
                      extra_headers={"Prefer": "return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def vote_book_club_poll(self, user_id: str, club_id: str, poll_id: str, option_id: str,
                            access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "user_id", "limit": 1}).json()
        option = self._request("GET", "/rest/v1/book_club_poll_options", admin=True,
                               params={"id": f"eq.{option_id}", "poll_id": f"eq.{poll_id}",
                                       "select": "id,book_club_polls!inner(club_id,status)", "limit": 1}).json()
        if not membership or not option or option[0]["book_club_polls"]["club_id"] != club_id or option[0]["book_club_polls"]["status"] != "open":
            raise KeyError("Oylama seçeneği bulunamadı.")
        self._request("POST", "/rest/v1/book_club_votes", admin=True,
                      params={"on_conflict": "poll_id,user_id"},
                      json_body={"poll_id": poll_id, "user_id": user_id, "option_id": option_id,
                                 "voted_at": datetime.now(timezone.utc).isoformat()},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def upsert_book_club_read(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership or membership[0]["role"] not in {"owner", "moderator"}:
            raise PermissionError("Kulüp okumasını yalnızca yönetici düzenleyebilir.")
        self._request("POST", "/rest/v1/book_club_reads", admin=True,
                      params={"on_conflict": "club_id,book_id"}, json_body={"club_id": club_id, **values},
                      extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return self.book_club_detail(user_id, club_id)


    def book_club_detail(self, user_id: str, club_id: str, access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise KeyError("Kitap kulübü bulunamadı.")
        user_role = membership[0]["role"]

        clubs = self._request("GET", "/rest/v1/book_clubs", admin=True,
                              params={"id": f"eq.{club_id}", "select": "*,book_club_reads(*,books(title,author,cover_url,page_count))", "limit": 1}).json()
        club = clubs[0]
        nested_reads = club.pop("book_club_reads", []) or []
        nested_reads.sort(key=lambda row: (row.get("created_at", ""), row.get("book_id", "")), reverse=True)
        nested_reads.sort(key=lambda row: {"reading": 0, "planned": 1, "completed": 2}.get(row.get("status"), 3))
        reads = []
        active_read = None
        for item in nested_reads:
            book = item.pop("books", None) or {}
            rd = {**item, **book}
            reads.append(rd)
            if not active_read and rd.get("status") == "reading":
                active_read = rd

        # Members list
        members_data = self._safe_request_json("GET", "/rest/v1/book_club_members", default=[], admin=True,
                                               params={"club_id": f"eq.{club_id}", "select": "user_id,role,joined_at", "order": "joined_at.asc"})
        member_user_ids = list({m.get("user_id") for m in members_data if m.get("user_id")})
        member_profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                                  params={"id": f"in.({','.join(member_user_ids)})", "select": "id,display_name"}) if member_user_ids else []
        member_names = {p["id"]: p.get("display_name", "Okur") for p in member_profiles if "id" in p}
        members = [{
            "user_id": m.get("user_id", user_id),
            "role": m.get("role", "member"),
            "joined_at": m.get("joined_at", ""),
            "display_name": member_names.get(m.get("user_id", user_id), "Okur"),
        } for m in members_data]

        progress = self._safe_request_json("GET", "/rest/v1/book_club_progress", default=[], admin=True,
                                           params={"club_id": f"eq.{club_id}", "select": "*"})
        user_progress_map = {row["book_id"]: row for row in progress if row.get("user_id") == user_id}

        # Joint progress and user progress with milestones
        user_books_data = self._safe_request_json("GET", "/rest/v1/user_books", default=[], admin=True,
                                                  params={"user_id": f"eq.{user_id}", "select": "book_id"})
        in_library_set = {b["book_id"] for b in user_books_data if "book_id" in b}

        user_progress_list = []
        for rd in reads:
            b_id = rd["book_id"]
            # Joint progress
            b_progress = [p for p in progress if p.get("book_id") == b_id]
            if b_progress:
                percents = [min(100.0, (row["current_page"] / (row["total_pages"] or rd.get("page_count") or 100)) * 100)
                            for row in b_progress if (row.get("total_pages") or rd.get("page_count"))]
                rd["joint_progress_percent"] = round(sum(percents) / len(percents), 1) if percents else 0
                rd["active_readers_count"] = len(b_progress)
            else:
                rd["joint_progress_percent"] = 0
                rd["active_readers_count"] = 0

            p = user_progress_map.get(b_id, {
                "club_id": club_id, "user_id": user_id, "book_id": b_id,
                "current_page": 0, "total_pages": rd.get("page_count"), "daily_target_pages": 10
            })
            total = p.get("total_pages") or rd.get("page_count") or 200
            curr = p.get("current_page", 0)
            daily = max(1, p.get("daily_target_pages") or 10)
            pct = min(100.0, round((curr / total) * 100, 1)) if total else 0
            pages_left = max(0, total - curr)
            days_left = max(1, (pages_left + daily - 1) // daily) if pages_left > 0 else 0
            finish_date = (date.today() + timedelta(days=days_left)).isoformat() if pages_left > 0 else date.today().isoformat()
            milestones = [
                {"percent": 25, "page": round(total * 0.25), "title": "Giriş ve Karakterler", "reached": curr >= round(total * 0.25)},
                {"percent": 50, "page": round(total * 0.50), "title": "Ara Değerlendirme", "reached": curr >= round(total * 0.50)},
                {"percent": 75, "page": round(total * 0.75), "title": "Düğüm ve Çatışma", "reached": curr >= round(total * 0.75)},
                {"percent": 100, "page": total, "title": "Final ve Kapanış", "reached": curr >= total},
            ]
            user_progress_list.append({
                **p, "percent": pct, "total_pages": total, "daily_target_pages": daily,
                "days_left": days_left, "projected_finish_date": finish_date,
                "milestones": milestones, "in_library": b_id in in_library_set,
            })

        # Discussions & Reactions
        discussions = self._safe_request_json("GET", "/rest/v1/book_club_discussions", default=[], admin=True,
                                              params={"club_id": f"eq.{club_id}", "select": "*",
                                                      "order": "created_at.desc", "limit": 100})
        reactions = self._safe_request_json("GET", "/rest/v1/book_club_reactions", default=[], admin=True,
                                            params={"select": "discussion_id,user_id,reaction_type"})
        reactions_by_disc = {}
        user_reactions_by_disc = {}
        for rx in reactions:
            d_id = rx.get("discussion_id")
            r_type = rx.get("reaction_type")
            if not d_id or not r_type:
                continue
            reactions_by_disc.setdefault(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
            if r_type in reactions_by_disc[d_id]:
                reactions_by_disc[d_id][r_type] += 1
            if rx.get("user_id") == user_id:
                user_reactions_by_disc.setdefault(d_id, []).append(r_type)

        user_ids = list({item["user_id"] for item in discussions if "user_id" in item})
        book_ids = list({item["book_id"] for item in discussions if "book_id" in item})
        profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                           params={"id": f"in.({','.join(user_ids)})", "select": "id,display_name"}) if user_ids else []
        discussion_books = self._safe_request_json("GET", "/rest/v1/books", default=[], admin=True,
                                                   params={"id": f"in.({','.join(book_ids)})", "select": "id,title"}) if book_ids else []
        names = {item["id"]: item.get("display_name", "Okur") for item in profiles if "id" in item}
        titles = {item["id"]: item.get("title", "Kitap") for item in discussion_books if "id" in item}
        user_curr_pages = {p["book_id"]: p.get("current_page", 0) for p in user_progress_list}

        discussions_list = []
        upcoming_spoilers = 0
        for item in discussions:
            d_id = item["id"]
            b_id = item["book_id"]
            p_num = item.get("page_number")
            user_page = user_curr_pages.get(b_id, 0)
            is_locked = bool(p_num and p_num > user_page and user_role not in {"owner", "moderator"})
            if is_locked:
                upcoming_spoilers += 1
                discussions_list.append({
                    "id": d_id, "club_id": club_id, "book_id": b_id, "book_title": titles.get(b_id, "Kitap"),
                    "page_number": p_num, "chapter_title": item.get("chapter_title"),
                    "discussion_type": item.get("discussion_type", "discussion"),
                    "is_spoiler_locked": True, "created_at": item.get("created_at"),
                })
            else:
                discussions_list.append({
                    **item, "display_name": names.get(item.get("user_id"), "Okur"),
                    "book_title": titles.get(b_id, "Kitap"),
                    "is_spoiler_locked": False,
                    "reactions": reactions_by_disc.get(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0}),
                    "user_reactions": user_reactions_by_disc.get(d_id, []),
                })

        # Events
        events_data = self._safe_request_json("GET", "/rest/v1/book_club_events", default=[], admin=True,
                                              params={"club_id": f"eq.{club_id}", "select": "*", "order": "event_date.asc"})
        rsvps_data = self._safe_request_json("GET", "/rest/v1/book_club_event_rsvps", default=[], admin=True, params={"select": "*"})
        events = []
        for ev in events_data:
            ev_id = ev.get("id")
            ev_rsvps = [r for r in rsvps_data if r.get("event_id") == ev_id]
            my_rsvp = next((r["status"] for r in ev_rsvps if r.get("user_id") == user_id), None)
            attending = len([r for r in ev_rsvps if r.get("status") == "attending"])
            maybe = len([r for r in ev_rsvps if r.get("status") == "maybe"])
            declined = len([r for r in ev_rsvps if r.get("status") == "declined"])
            events.append({
                **ev, "rsvp_counts": {"attending": attending, "maybe": maybe, "declined": declined},
                "user_rsvp": my_rsvp,
            })

        # Polls
        polls = self._safe_request_json("GET", "/rest/v1/book_club_polls", default=[], admin=True,
                                        params={"club_id": f"eq.{club_id}", "select": "*,book_club_poll_options(id,book_id,books(title,author,cover_url),book_club_votes(user_id))",
                                                "order": "created_at.desc"})
        poll_items = []
        for poll in polls:
            options = []
            for option in poll.pop("book_club_poll_options", []) or []:
                book, votes = option.pop("books", None) or {}, option.pop("book_club_votes", []) or []
                options.append({**option, **book, "vote_count": len(votes), "selected": any(v["user_id"] == user_id for v in votes)})
            poll_items.append({**poll, "options": options})

        # Badges and stats
        completed_reads_count = len([r for r in reads if r.get("status") == "completed"])
        user_disc_count = len([d for d in discussions if d["user_id"] == user_id])
        user_rx_count = len([rx for rx in reactions if rx["user_id"] == user_id])
        user_is_pioneer = any(m["user_id"] == user_id and (m["role"] == "owner" or idx < 5) for idx, m in enumerate(members))
        user_active_progress = next((p for p in user_progress_list if active_read and p["book_id"] == active_read["book_id"]), None)
        user_has_read_active = bool(user_active_progress and user_active_progress["current_page"] >= 30)
        user_finished_any = bool(user_active_progress and user_active_progress["percent"] >= 100) or completed_reads_count > 0

        badges = []
        if user_is_pioneer:
            badges.append({"code": "club_pioneer", "title": "Kulüp Öncüsü", "description": "Kulübün ilk kurucu veya öncü üyelerinden biri.", "icon": "👑"})
        if user_disc_count >= 3:
            badges.append({"code": "discussion_starter", "title": "Tartışma Ustası", "description": "Kulüpte 3 ve üzeri tartışma/alıntı paylaştı.", "icon": "💬"})
        if user_has_read_active:
            badges.append({"code": "pace_keeper", "title": "Sadık Okur", "description": "Aktif okumada istikrarlı ilerleme kaydetti.", "icon": "🔥"})
        if user_rx_count >= 5:
            badges.append({"code": "thought_spark", "title": "Fikir Lideri", "description": "Tartışma ve alıntıları topluluktan ilgi gördü.", "icon": "✨"})
        if user_finished_any:
            badges.append({"code": "classic_explorer", "title": "Klasik Kaşifi", "description": "Kulüple birlikte bir kitabı başarıyla tamamladı.", "icon": "🏆"})

        return {
            **club,
            "role": user_role,
            "members": members,
            "reads": reads,
            "active_read": active_read,
            "progress": user_progress_list,
            "user_progress": user_progress_list,
            "discussions": discussions_list,
            "upcoming_spoilers_count": upcoming_spoilers,
            "events": events,
            "polls": poll_items,
            "stats": {
                "member_count": len(members),
                "total_discussions": len(discussions),
                "completed_books_count": completed_reads_count,
            },
            "badges": badges,
        }


    def get_or_create_club_room(self, user_id: str, club_id: str, title: str | None = None,
                                book_id: str | None = None, duration_minutes: int = 25,
                                access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")

        rooms = self._safe_request_json("GET", "/rest/v1/book_club_rooms", default=[], admin=True,
                                        params={"club_id": f"eq.{club_id}", "select": "*", "order": "created_at.desc", "limit": 1})
        if rooms:
            room = rooms[0]
        else:
            now = datetime.now(timezone.utc).isoformat()
            room_title = title or "Birlikte Okuyoruz Odası"
            try:
                room = self._request("POST", "/rest/v1/book_club_rooms", admin=True,
                                     json_body={"club_id": club_id, "title": room_title, "book_id": book_id,
                                                "phase": "reading", "duration_minutes": duration_minutes, "created_by": user_id, "created_at": now},
                                     extra_headers={"Prefer": "return=representation"}).json()[0]
            except Exception:
                room = {
                    "id": str(uuid4()), "club_id": club_id, "title": room_title, "book_id": book_id,
                    "phase": "reading", "duration_minutes": duration_minutes, "created_by": user_id, "created_at": now
                }

        # Members and active progress
        members_data = self._safe_request_json("GET", "/rest/v1/book_club_members", default=[], admin=True,
                                               params={"club_id": f"eq.{club_id}", "select": "user_id,role,joined_at", "order": "joined_at.asc"})
        member_ids = [m["user_id"] for m in members_data if "user_id" in m]
        profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                           params={"id": f"in.({','.join(member_ids)})", "select": "id,display_name"}) if member_ids else []
        prof_map = {p["id"]: p.get("display_name", "Okur") for p in profiles if "id" in p}

        progress = self._safe_request_json("GET", "/rest/v1/book_club_progress", default=[], admin=True,
                                           params={"club_id": f"eq.{club_id}", "select": "*"})
        prog_map = {p["user_id"]: p for p in progress if "user_id" in p}

        participants = []
        for m in members_data:
            u_id = m.get("user_id", "")
            u_prog = prog_map.get(u_id, {})
            participants.append({
                "user_id": u_id,
                "display_name": prof_map.get(u_id, "Okur"),
                "role": m.get("role", "member"),
                "current_page": u_prog.get("current_page", 0),
                "daily_target_pages": u_prog.get("daily_target_pages", 10),
            })

        messages_data = self._safe_request_json("GET", "/rest/v1/book_club_room_messages", default=[], admin=True,
                                                params={"room_id": f"eq.{room.get('id')}", "select": "*", "order": "created_at.asc", "limit": 50}) if room.get("id") else []
        msg_user_ids = list({msg["user_id"] for msg in messages_data if "user_id" in msg})
        msg_profiles = self._safe_request_json("GET", "/rest/v1/profiles", default=[], admin=True,
                                               params={"id": f"in.({','.join(msg_user_ids)})", "select": "id,display_name"}) if msg_user_ids else []
        msg_prof_map = {p["id"]: p.get("display_name", "Okur") for p in msg_profiles if "id" in p}

        messages = [{
            **msg,
            "display_name": msg_prof_map.get(msg.get("user_id"), "Okur")
        } for msg in messages_data]

        return {
            **room,
            "participants": participants,
            "messages": messages,
        }


    def complete_room_session(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        minutes_read = values.get("minutes_read", 25)
        pages_read = values.get("pages_read", 0)
        book_id = values.get("book_id")
        current_page = values.get("current_page")
        notes = values.get("notes")

        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")

        if book_id and pages_read > 0:
            try:
                self._request("POST", "/rest/v1/reading_activity", admin=True,
                              json_body={"user_id": user_id, "book_id": book_id, "activity_date": today,
                                         "pages_read": pages_read, "created_at": now},
                              extra_headers={"Prefer": "return=minimal"})
            except Exception:
                pass

        if book_id and current_page is not None:
            books = self._safe_request_json("GET", "/rest/v1/books", default=[], admin=True,
                                            params={"id": f"eq.{book_id}", "select": "page_count", "limit": 1})
            total_pages = books[0]["page_count"] if books else None
            shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
            finished_at = now if shelf == "read" else None
            try:
                self._request("POST", "/rest/v1/user_books", admin=True,
                              params={"on_conflict": "user_id,book_id"},
                              json_body={"user_id": user_id, "book_id": book_id, "shelf": shelf,
                                         "current_page": current_page, "total_pages": total_pages,
                                         "finished_at": finished_at, "updated_at": now},
                              extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
            except Exception:
                pass
            try:
                self._request("POST", "/rest/v1/book_club_progress", admin=True,
                              params={"on_conflict": "club_id,user_id,book_id"},
                              json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                         "current_page": current_page, "total_pages": total_pages,
                                         "daily_target_pages": 10, "updated_at": now},
                              extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
            except Exception:
                pass

        if notes and notes.strip() and book_id:
            try:
                self._request("POST", "/rest/v1/book_club_discussions", admin=True,
                              json_body={"club_id": club_id, "user_id": user_id, "book_id": book_id,
                                         "content": notes.strip(), "page_number": current_page,
                                         "discussion_type": "quote", "created_at": now},
                              extra_headers={"Prefer": "return=minimal"})
            except Exception:
                pass

        return self.get_or_create_club_room(user_id, club_id)


    def send_room_message(self, user_id: str, club_id: str, room_id: str, content: str,
                          access_token: str | None = None) -> dict:
        membership = self._request("GET", "/rest/v1/book_club_members", admin=True,
                                   params={"club_id": f"eq.{club_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": 1}).json()
        if not membership:
            raise PermissionError("Kulüp üyeliği gerekiyor.")
        room = self._request("GET", "/rest/v1/book_club_rooms", admin=True,
                             params={"id": f"eq.{room_id}", "club_id": f"eq.{club_id}",
                                     "select": "id", "limit": 1}).json()
        if not room:
            raise PermissionError("Oda bu kulübe ait değil veya bulunamadı.")
        now = datetime.now(timezone.utc).isoformat()
        try:
            self._request("POST", "/rest/v1/book_club_room_messages", admin=True,
                          json_body={"room_id": room_id, "user_id": user_id, "content": content.strip(), "created_at": now},
                          extra_headers={"Prefer": "return=minimal"})
        except Exception:
            pass
        return self.get_or_create_club_room(user_id, club_id)

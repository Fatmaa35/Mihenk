"""Kitap kulüpleri ve canlı okuma odaları."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

class SQLiteClubsMixin:
    def create_book_club(self, user_id: str, name: str, description: str, visibility: str,
                         rules: str = "", access_token: str | None = None) -> dict:
        club_id, code, now = str(uuid4()), str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO book_clubs(id,owner_id,name,description,rules,visibility,invite_code,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (club_id, user_id, name.strip(), description.strip(), rules.strip(), visibility, code, now, now),
            )
            connection.execute("INSERT INTO book_club_members(club_id,user_id,role,joined_at) VALUES(?,?,?,?)",
                               (club_id, user_id, "owner", now))
        return self.book_club_detail(user_id, club_id)


    def update_book_club(self, user_id: str, club_id: str, values: dict,
                         access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member or member["role"] not in {"owner", "moderator"}:
                raise PermissionError("Kulüp ayarlarını yalnızca yönetici düzenleyebilir.")
            club = connection.execute("SELECT * FROM book_clubs WHERE id=?", (club_id,)).fetchone()
            if not club:
                raise KeyError("Kitap kulübü bulunamadı.")
            name = values.get("name", club["name"]).strip()
            description = values.get("description", club["description"]).strip()
            rules = values.get("rules", club["rules"]).strip()
            visibility = values.get("visibility", club["visibility"])
            connection.execute(
                "UPDATE book_clubs SET name=?, description=?, rules=?, visibility=?, updated_at=? WHERE id=?",
                (name, description, rules, visibility, now, club_id),
            )
        return self.book_club_detail(user_id, club_id)


    def update_book_club_member_role(self, user_id: str, club_id: str, target_user_id: str, role: str,
                                     access_token: str | None = None) -> dict:
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member or member["role"] != "owner":
                raise PermissionError("Yalnızca kulüp sahibi üye rollerini değiştirebilir.")
            if user_id == target_user_id and role != "owner":
                raise ValueError("Kulüp sahibi kendi rolünü düşüremez.")
            target = connection.execute(
                "SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, target_user_id)
            ).fetchone()
            if not target:
                raise KeyError("Üye bulunamadı.")
            connection.execute("UPDATE book_club_members SET role=? WHERE club_id=? AND user_id=?", (role, club_id, target_user_id))
        return self.book_club_detail(user_id, club_id)


    def join_book_club(self, user_id: str, invite_code: str, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            club = connection.execute("SELECT * FROM book_clubs WHERE invite_code=?", (invite_code,)).fetchone()
            if not club:
                raise KeyError("Davet kodu geçersiz.")
            connection.execute("INSERT OR IGNORE INTO book_club_members(club_id,user_id,role,joined_at) VALUES(?,?,?,?)",
                               (club["id"], user_id, "member", now))
        return self.book_club_detail(user_id, club["id"])


    def list_book_clubs(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT c.*,m.role,(SELECT count(*) FROM book_club_members x WHERE x.club_id=c.id) member_count
                   FROM book_clubs c JOIN book_club_members m ON m.club_id=c.id WHERE m.user_id=? ORDER BY c.updated_at DESC""",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]


    def join_reading(self, user_id: str, club_id: str, book_id: str, daily_target_pages: int = 10,
                     shelf: str = "reading", access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise KeyError("Kulüp üyeliği gerekiyor.")
            book = connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
            if not book:
                raise KeyError("Kitap bulunamadı.")
            total_pages = book["page_count"]
            connection.execute(
                """INSERT INTO user_books(user_id,book_id,shelf,is_favorite,current_page,total_pages,started_at,updated_at)
                   VALUES(?,?,?,0,0,?,?,?) ON CONFLICT(user_id,book_id) DO UPDATE SET
                   shelf=excluded.shelf,total_pages=coalesce(user_books.total_pages,excluded.total_pages),
                   started_at=coalesce(user_books.started_at,excluded.started_at),updated_at=excluded.updated_at""",
                (user_id, book_id, shelf, total_pages, today, now),
            )
            connection.execute(
                """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                   VALUES(?,?,?,0,?,?,?) ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                   total_pages=coalesce(book_club_progress.total_pages,excluded.total_pages),
                   daily_target_pages=excluded.daily_target_pages,updated_at=excluded.updated_at""",
                (club_id, user_id, book_id, total_pages, max(1, daily_target_pages), now),
            )
        return self.book_club_detail(user_id, club_id)


    def upsert_book_club_progress(self, user_id: str, club_id: str, values: dict,
                                  access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        book_id = values["book_id"]
        current_page = values["current_page"]
        daily_target = values.get("daily_target_pages")
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone():
                raise KeyError("Kitap kulübü bulunamadı.")
            book = connection.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
            total_pages = values.get("total_pages") or (book["page_count"] if book else None)
            connection.execute(
                """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                   VALUES(?,?,?,?,?,?,?) ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                   current_page=excluded.current_page,total_pages=coalesce(excluded.total_pages,book_club_progress.total_pages),
                   daily_target_pages=coalesce(excluded.daily_target_pages,book_club_progress.daily_target_pages),updated_at=excluded.updated_at""",
                (club_id, user_id, book_id, current_page, total_pages, daily_target or 10, now),
            )
            shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
            finished_at = now if shelf == "read" else None
            connection.execute(
                """INSERT INTO user_books(user_id,book_id,shelf,is_favorite,current_page,total_pages,finished_at,updated_at)
                   VALUES(?,?,?,0,?,?,?,?) ON CONFLICT(user_id,book_id) DO UPDATE SET
                   current_page=excluded.current_page,total_pages=coalesce(excluded.total_pages,user_books.total_pages),
                   shelf=CASE WHEN excluded.current_page>=coalesce(user_books.total_pages,excluded.total_pages,0) AND coalesce(user_books.total_pages,excluded.total_pages,0)>0 THEN 'read' ELSE user_books.shelf END,
                   finished_at=CASE WHEN excluded.current_page>=coalesce(user_books.total_pages,excluded.total_pages,0) AND coalesce(user_books.total_pages,excluded.total_pages,0)>0 THEN coalesce(user_books.finished_at,excluded.finished_at) ELSE user_books.finished_at END,
                   updated_at=excluded.updated_at""",
                (user_id, book_id, shelf, current_page, total_pages, finished_at, now),
            )
        return self.book_club_detail(user_id, club_id)


    def create_book_club_discussion(self, user_id: str, club_id: str, values: dict,
                                    access_token: str | None = None) -> dict:
        with self.connect() as connection:
            membership = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not membership:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            progress = connection.execute(
                "SELECT current_page FROM book_club_progress WHERE club_id=? AND user_id=? AND book_id=?",
                (club_id, user_id, values["book_id"]),
            ).fetchone()
            curr = progress["current_page"] if progress else 0
            if values.get("page_number") and values["page_number"] > curr:
                raise PermissionError("Henüz ulaşmadığın sayfa için tartışma açamazsın.")
            discussion_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
            connection.execute(
                """INSERT INTO book_club_discussions(id,club_id,user_id,book_id,content,page_number,chapter_title,discussion_type,parent_id,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (discussion_id, club_id, user_id, values["book_id"], values["content"].strip(),
                 values.get("page_number"), values.get("chapter_title"), values.get("discussion_type", "discussion"),
                 values.get("parent_id"), now),
            )
        return self.book_club_detail(user_id, club_id)


    def toggle_book_club_reaction(self, user_id: str, club_id: str, discussion_id: str, reaction_type: str,
                                  access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            disc = connection.execute("SELECT 1 FROM book_club_discussions WHERE id=? AND club_id=?", (discussion_id, club_id)).fetchone()
            if not disc:
                raise KeyError("Tartışma bulunamadı.")
            existing = connection.execute(
                "SELECT id FROM book_club_reactions WHERE discussion_id=? AND user_id=? AND reaction_type=?",
                (discussion_id, user_id, reaction_type),
            ).fetchone()
            if existing:
                connection.execute("DELETE FROM book_club_reactions WHERE id=?", (existing["id"],))
            else:
                connection.execute(
                    "INSERT INTO book_club_reactions(id,discussion_id,user_id,reaction_type,created_at) VALUES(?,?,?,?,?)",
                    (str(uuid4()), discussion_id, user_id, reaction_type, now),
                )
        return self.book_club_detail(user_id, club_id)


    def create_book_club_event(self, user_id: str, club_id: str, values: dict,
                               access_token: str | None = None) -> dict:
        event_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member or member["role"] not in {"owner", "moderator"}:
                raise PermissionError("Etkinlikleri yalnızca kulüp yöneticisi oluşturabilir.")
            connection.execute(
                """INSERT INTO book_club_events(id,club_id,title,description,event_type,event_date,location,created_by,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?)""",
                (event_id, club_id, values["title"].strip(), values.get("description", "").strip(),
                 values.get("event_type", "general"), values["event_date"], values.get("location", "").strip(), user_id, now),
            )
            connection.execute(
                "INSERT INTO book_club_event_rsvps(event_id,user_id,status,created_at) VALUES(?,?,'attending',?)",
                (event_id, user_id, now),
            )
        return self.book_club_detail(user_id, club_id)


    def rsvp_book_club_event(self, user_id: str, club_id: str, event_id: str, status: str,
                             access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute("SELECT 1 FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            event = connection.execute("SELECT 1 FROM book_club_events WHERE id=? AND club_id=?", (event_id, club_id)).fetchone()
            if not event:
                raise KeyError("Etkinlik bulunamadı.")
            connection.execute(
                """INSERT INTO book_club_event_rsvps(event_id,user_id,status,created_at) VALUES(?,?,?,?)
                   ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,created_at=excluded.created_at""",
                (event_id, user_id, status, now),
            )
        return self.book_club_detail(user_id, club_id)


    def create_book_club_poll(self, user_id: str, club_id: str, title: str, option_book_ids: list[str],
                              access_token: str | None = None) -> dict:
        poll_id, now = str(uuid4()), datetime.now(timezone.utc).isoformat()
        unique_ids = list(dict.fromkeys(option_book_ids))
        with self.connect() as connection:
            membership = connection.execute("SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)).fetchone()
            if not membership or membership["role"] not in {"owner", "moderator"}:
                raise PermissionError("Oylamayı yalnızca kulüp yöneticisi açabilir.")
            connection.execute("INSERT INTO book_club_polls(id,club_id,title,status,created_by,created_at) VALUES(?,?,?,'open',?,?)",
                               (poll_id, club_id, title.strip(), user_id, now))
            connection.executemany("INSERT INTO book_club_poll_options(id,poll_id,book_id) VALUES(?,?,?)",
                                   [(str(uuid4()), poll_id, book_id) for book_id in unique_ids])
        return self.book_club_detail(user_id, club_id)


    def vote_book_club_poll(self, user_id: str, club_id: str, poll_id: str, option_id: str,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            valid = connection.execute(
                """SELECT 1 FROM book_club_members m JOIN book_club_polls p ON p.club_id=m.club_id
                   JOIN book_club_poll_options o ON o.poll_id=p.id
                   WHERE m.club_id=? AND m.user_id=? AND p.id=? AND p.status='open' AND o.id=?""",
                (club_id, user_id, poll_id, option_id),
            ).fetchone()
            if not valid:
                raise KeyError("Oylama seçeneği bulunamadı.")
            connection.execute(
                """INSERT INTO book_club_votes(poll_id,user_id,option_id,voted_at) VALUES(?,?,?,?)
                   ON CONFLICT(poll_id,user_id) DO UPDATE SET option_id=excluded.option_id,voted_at=excluded.voted_at""",
                (poll_id, user_id, option_id, now),
            )
        return self.book_club_detail(user_id, club_id)


    def upsert_book_club_read(self, user_id: str, club_id: str, values: dict,
                              access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            membership = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not membership or membership["role"] not in {"owner", "moderator"}:
                raise PermissionError("Kulüp okumasını yalnızca yönetici düzenleyebilir.")
            if values["status"] == "reading":
                connection.execute(
                    "UPDATE book_club_reads SET status='planned' WHERE club_id=? AND book_id<>? AND status='reading'",
                    (club_id, values["book_id"]),
                )
            connection.execute(
                """INSERT INTO book_club_reads(club_id,book_id,start_date,target_date,status,created_at) VALUES(?,?,?,?,?,?)
                   ON CONFLICT(club_id,book_id) DO UPDATE SET start_date=excluded.start_date,target_date=excluded.target_date,status=excluded.status""",
                (club_id, values["book_id"], values.get("start_date"), values.get("target_date"), values["status"], now),
            )
            connection.execute("UPDATE book_clubs SET updated_at=? WHERE id=?", (now, club_id))
        return self.book_club_detail(user_id, club_id)


    def book_club_detail(self, user_id: str, club_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            club = connection.execute(
                """SELECT c.*,m.role FROM book_clubs c JOIN book_club_members m ON m.club_id=c.id
                   WHERE c.id=? AND m.user_id=?""", (club_id, user_id)
            ).fetchone()
            if not club:
                raise KeyError("Kitap kulübü bulunamadı.")
            club_dict = dict(club)
            user_role = club_dict.get("role", "member")

            # Members
            members_rows = connection.execute(
                """SELECT m.user_id, m.role, m.joined_at, u.display_name
                   FROM book_club_members m JOIN users u ON u.id=m.user_id
                   WHERE m.club_id=? ORDER BY CASE m.role WHEN 'owner' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, m.joined_at ASC""",
                (club_id,),
            ).fetchall()
            members = [dict(m) for m in members_rows]

            # Reads
            reads_rows = connection.execute(
                """SELECT r.*,b.title,b.author,b.cover_url,b.page_count FROM book_club_reads r JOIN books b ON b.id=r.book_id
                   WHERE r.club_id=? ORDER BY CASE r.status WHEN 'reading' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END, r.created_at DESC""",
                (club_id,),
            ).fetchall()
            reads = []
            active_read = None
            for r in reads_rows:
                rd = dict(r)
                book_id = rd["book_id"]
                # Calculate joint progress
                member_progress_rows = connection.execute(
                    "SELECT current_page, total_pages FROM book_club_progress WHERE club_id=? AND book_id=?",
                    (club_id, book_id),
                ).fetchall()
                if member_progress_rows:
                    percents = [min(100.0, (row["current_page"] / (row["total_pages"] or rd["page_count"] or 100)) * 100)
                                for row in member_progress_rows if (row["total_pages"] or rd["page_count"])]
                    rd["joint_progress_percent"] = round(sum(percents) / len(percents), 1) if percents else 0
                    rd["active_readers_count"] = len(member_progress_rows)
                else:
                    rd["joint_progress_percent"] = 0
                    rd["active_readers_count"] = 0
                reads.append(rd)
                if not active_read and rd["status"] == "reading":
                    active_read = rd

            # User progress & roadmap
            progress_rows = connection.execute(
                "SELECT * FROM book_club_progress WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchall()
            user_progress_map = {row["book_id"]: dict(row) for row in progress_rows}

            user_progress_list = []
            for rd in reads:
                b_id = rd["book_id"]
                p = user_progress_map.get(b_id, {
                    "club_id": club_id, "user_id": user_id, "book_id": b_id,
                    "current_page": 0, "total_pages": rd["page_count"], "daily_target_pages": 10
                })
                total = p.get("total_pages") or rd["page_count"] or 200
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
                in_lib = connection.execute("SELECT 1 FROM user_books WHERE user_id=? AND book_id=?", (user_id, b_id)).fetchone() is not None
                user_progress_list.append({
                    **p, "percent": pct, "total_pages": total, "daily_target_pages": daily,
                    "days_left": days_left, "projected_finish_date": finish_date,
                    "milestones": milestones, "in_library": in_lib,
                })

            # Discussions (with replies, reactions, and spoiler handling)
            user_curr_pages = {p["book_id"]: p.get("current_page", 0) for p in user_progress_list}
            disc_rows = connection.execute(
                """SELECT d.*, u.display_name, b.title book_title FROM book_club_discussions d
                   JOIN users u ON u.id=d.user_id JOIN books b ON b.id=d.book_id
                   WHERE d.club_id=? ORDER BY d.created_at DESC LIMIT 150""",
                (club_id,),
            ).fetchall()

            reactions_rows = connection.execute(
                """SELECT r.discussion_id, r.user_id, r.reaction_type FROM book_club_reactions r
                   JOIN book_club_discussions d ON d.id=r.discussion_id WHERE d.club_id=?""",
                (club_id,),
            ).fetchall()
            reactions_by_disc = {}
            user_reactions_by_disc = {}
            for rx in reactions_rows:
                d_id = rx["discussion_id"]
                r_type = rx["reaction_type"]
                reactions_by_disc.setdefault(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
                if r_type in reactions_by_disc[d_id]:
                    reactions_by_disc[d_id][r_type] += 1
                if rx["user_id"] == user_id:
                    user_reactions_by_disc.setdefault(d_id, []).append(r_type)

            discussions_list = []
            upcoming_spoilers = 0
            for d in disc_rows:
                dd = dict(d)
                d_id = dd["id"]
                b_id = dd["book_id"]
                p_num = dd.get("page_number")
                user_page = user_curr_pages.get(b_id, 0)
                is_locked = bool(p_num and p_num > user_page and user_role not in {"owner", "moderator"})
                if is_locked:
                    upcoming_spoilers += 1
                    discussions_list.append({
                        "id": d_id, "club_id": club_id, "book_id": b_id, "book_title": dd["book_title"],
                        "page_number": p_num, "chapter_title": dd.get("chapter_title"),
                        "discussion_type": dd.get("discussion_type", "discussion"),
                        "is_spoiler_locked": True, "created_at": dd["created_at"],
                    })
                else:
                    dd["is_spoiler_locked"] = False
                    dd["reactions"] = reactions_by_disc.get(d_id, {"thoughtful": 0, "agree": 0, "heart": 0, "bookmark": 0})
                    dd["user_reactions"] = user_reactions_by_disc.get(d_id, [])
                    discussions_list.append(dd)

            # Events & RSVPs
            events_rows = connection.execute(
                """SELECT e.*, u.display_name creator_name FROM book_club_events e
                   JOIN users u ON u.id=e.created_by WHERE e.club_id=? ORDER BY e.event_date ASC""",
                (club_id,),
            ).fetchall()
            events = []
            for ev in events_rows:
                evd = dict(ev)
                ev_id = evd["id"]
                rsvps = connection.execute("SELECT status, count(*) cnt FROM book_club_event_rsvps WHERE event_id=? GROUP BY status", (ev_id,)).fetchall()
                rsvp_counts = {r["status"]: r["cnt"] for r in rsvps}
                my_rsvp = connection.execute("SELECT status FROM book_club_event_rsvps WHERE event_id=? AND user_id=?", (ev_id, user_id)).fetchone()
                evd["rsvp_counts"] = {"attending": rsvp_counts.get("attending", 0), "maybe": rsvp_counts.get("maybe", 0), "declined": rsvp_counts.get("declined", 0)}
                evd["user_rsvp"] = my_rsvp["status"] if my_rsvp else None
                events.append(evd)

            # Polls
            polls = connection.execute(
                "SELECT * FROM book_club_polls WHERE club_id=? ORDER BY created_at DESC", (club_id,)
            ).fetchall()
            poll_items = []
            for poll in polls:
                options = connection.execute(
                    """SELECT o.id,o.book_id,b.title,b.author,b.cover_url,count(v.user_id) vote_count,
                       max(CASE WHEN v.user_id=? THEN 1 ELSE 0 END) selected
                       FROM book_club_poll_options o JOIN books b ON b.id=o.book_id
                       LEFT JOIN book_club_votes v ON v.option_id=o.id WHERE o.poll_id=?
                       GROUP BY o.id,o.book_id,b.title,b.author ORDER BY vote_count DESC,b.title""",
                    (user_id, poll["id"]),
                ).fetchall()
                poll_items.append({**dict(poll), "options": [{**dict(o), "selected": bool(o["selected"])} for o in options]})

            # Badges and stats
            completed_reads_count = len([r for r in reads if r["status"] == "completed"])
            user_disc_count = len([d for d in disc_rows if d["user_id"] == user_id])
            user_rx_count = len([rx for rx in reactions_rows if rx["user_id"] == user_id])
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
            **club_dict,
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
                "total_discussions": len(disc_rows),
                "completed_books_count": completed_reads_count,
            },
            "badges": badges,
        }


    def get_or_create_club_room(self, user_id: str, club_id: str, title: str | None = None,
                                book_id: str | None = None, duration_minutes: int = 25,
                                access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            room = connection.execute(
                "SELECT * FROM book_club_rooms WHERE club_id=? ORDER BY created_at DESC LIMIT 1", (club_id,)
            ).fetchone()
            if not room:
                room_id = str(uuid4())
                room_title = title or "Birlikte Okuyoruz Odası"
                connection.execute(
                    """INSERT INTO book_club_rooms(id,club_id,title,book_id,phase,duration_minutes,created_by,created_at)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (room_id, club_id, room_title, book_id, "reading", duration_minutes, user_id, now),
                )
                room = connection.execute("SELECT * FROM book_club_rooms WHERE id=?", (room_id,)).fetchone()
            
            # Active participants in this club
            members = connection.execute(
                """SELECT m.user_id, u.display_name, m.role,
                          p.current_page, p.daily_target_pages, b.title as reading_book_title
                   FROM book_club_members m
                   JOIN users u ON u.id = m.user_id
                   LEFT JOIN book_club_progress p ON p.club_id = m.club_id AND p.user_id = m.user_id
                   LEFT JOIN books b ON b.id = p.book_id
                   WHERE m.club_id = ?
                   ORDER BY m.joined_at ASC""",
                (club_id,),
            ).fetchall()

            messages = connection.execute(
                """SELECT msg.id, msg.room_id, msg.user_id, u.display_name, msg.content, msg.created_at
                   FROM book_club_room_messages msg
                   JOIN users u ON u.id = msg.user_id
                   WHERE msg.room_id = ?
                   ORDER BY msg.created_at ASC LIMIT 50""",
                (room["id"],),
            ).fetchall()

            return {
                **dict(room),
                "participants": [dict(m) for m in members],
                "messages": [dict(msg) for msg in messages],
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

        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")

            # 1. Log reading activity if pages read
            if book_id and pages_read > 0:
                connection.execute(
                    """INSERT INTO reading_activity(id, user_id, book_id, activity_date, pages_read, created_at)
                       VALUES(?,?,?,?,?,?)""",
                    (str(uuid4()), user_id, book_id, today, pages_read, now),
                )

            # 2. Update user_books & club progress if page given
            if book_id and current_page is not None:
                book = connection.execute("SELECT page_count FROM books WHERE id=?", (book_id,)).fetchone()
                total_pages = book["page_count"] if book else None
                shelf = "read" if (total_pages and current_page >= total_pages) else "reading"
                finished_at = now if shelf == "read" else None
                connection.execute(
                    """INSERT INTO user_books(user_id,book_id,shelf,current_page,total_pages,finished_at,updated_at)
                       VALUES(?,?,?,?,?,?,?)
                       ON CONFLICT(user_id,book_id) DO UPDATE SET
                       shelf=excluded.shelf, current_page=excluded.current_page,
                       total_pages=COALESCE(excluded.total_pages, user_books.total_pages),
                       finished_at=excluded.finished_at, updated_at=excluded.updated_at""",
                    (user_id, book_id, shelf, current_page, total_pages, finished_at, now),
                )
                connection.execute(
                    """INSERT INTO book_club_progress(club_id,user_id,book_id,current_page,total_pages,daily_target_pages,updated_at)
                       VALUES(?,?,?,?,?,?,?)
                       ON CONFLICT(club_id,user_id,book_id) DO UPDATE SET
                       current_page=excluded.current_page, total_pages=COALESCE(excluded.total_pages, book_club_progress.total_pages),
                       updated_at=excluded.updated_at""",
                    (club_id, user_id, book_id, current_page, total_pages, 10, now),
                )

            # 3. If note/quote was entered in session, save to book_club_discussions
            if notes and notes.strip() and book_id:
                connection.execute(
                    """INSERT INTO book_club_discussions(id,club_id,user_id,book_id,content,page_number,discussion_type,created_at)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (str(uuid4()), club_id, user_id, book_id, notes.strip(), current_page, "quote", now),
                )

        return self.get_or_create_club_room(user_id, club_id)


    def send_room_message(self, user_id: str, club_id: str, room_id: str, content: str,
                          access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            member = connection.execute(
                "SELECT role FROM book_club_members WHERE club_id=? AND user_id=?", (club_id, user_id)
            ).fetchone()
            if not member:
                raise PermissionError("Kulüp üyeliği gerekiyor.")
            room = connection.execute(
                "SELECT 1 FROM book_club_rooms WHERE id=? AND club_id=?", (room_id, club_id)
            ).fetchone()
            if not room:
                raise PermissionError("Oda bu kulübe ait değil veya bulunamadı.")
            msg_id = str(uuid4())
            connection.execute(
                "INSERT INTO book_club_room_messages(id,room_id,user_id,content,created_at) VALUES(?,?,?,?,?)",
                (msg_id, room_id, user_id, content.strip(), now),
            )
        return self.get_or_create_club_room(user_id, club_id)

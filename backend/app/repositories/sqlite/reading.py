"""Okuma hedefleri, seanslar, alıntılar, planlar ve oyunlaştırma."""
from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta, timezone
from uuid import uuid4

from app.services.reading.gamification import BADGE_RULES, build_gamification_summary, earned_badge_codes
from app.services.reading.product_growth import weekly_window
from app.services.reading.reading_planner import build_schedule, reminder_datetime_utc, schedule_summary

class SQLiteReadingMixin:
    def upsert_reading_goal(
        self, user_id: str, goal_year: int, target_books: int,
        access_token: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
                raise KeyError("Kullanici bulunamadi.")
            connection.execute(
                """INSERT INTO reading_goals(user_id,goal_year,target_books,created_at,updated_at)
                   VALUES(?,?,?,?,?)
                   ON CONFLICT(user_id,goal_year) DO UPDATE SET
                   target_books=excluded.target_books,updated_at=excluded.updated_at""",
                (user_id, goal_year, target_books, now, now),
            )
        return {
            "user_id": user_id, "goal_year": goal_year,
            "target_books": target_books, "updated_at": now,
        }


    @staticmethod
    def _reading_streaks(activity_days: list[date]) -> tuple[int, int]:
        unique_days = sorted(set(activity_days))
        if not unique_days:
            return 0, 0
        longest = run = 1
        for previous, current in zip(unique_days, unique_days[1:]):
            run = run + 1 if current - previous == timedelta(days=1) else 1
            longest = max(longest, run)
        last_day = unique_days[-1]
        if date.today() - last_day > timedelta(days=1):
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
        with self.connect() as connection:
            goal = connection.execute(
                "SELECT target_books FROM reading_goals WHERE user_id=? AND goal_year=?",
                (user_id, year),
            ).fetchone()
            completed_books = connection.execute(
                """SELECT count(*) count FROM user_books
                   WHERE user_id=? AND shelf='read' AND substr(finished_at,1,4)=?""",
                (user_id, str(year)),
            ).fetchone()["count"] + connection.execute(
                """SELECT count(*) count FROM user_custom_books
                   WHERE user_id=? AND shelf='read' AND substr(finished_at,1,4)=?""",
                (user_id, str(year)),
            ).fetchone()["count"]
            activity_rows = connection.execute(
                """SELECT activity_date,sum(pages_read) pages_read,
                          count(distinct coalesce(book_id,custom_book_id)) books
                   FROM reading_activity WHERE user_id=? AND substr(activity_date,1,4)=?
                   GROUP BY activity_date ORDER BY activity_date""",
                (user_id, str(year)),
            ).fetchall()
            genre_rows = connection.execute(
                """SELECT b.genre,count(*) count FROM user_books ub
                   JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.shelf='read'
                   GROUP BY b.genre ORDER BY count DESC,b.genre""",
                (user_id,),
            ).fetchall()
            custom_genre_rows = connection.execute(
                """SELECT genre,count(*) count FROM user_custom_books
                   WHERE user_id=? AND shelf='read' GROUP BY genre""", (user_id,)
            ).fetchall()
            series_rows = connection.execute(
                """SELECT b.series_name,count(distinct b.id) total_books,
                          count(distinct case when ub.shelf='read' then b.id end) read_books
                   FROM books b LEFT JOIN user_books ub
                     ON ub.book_id=b.id AND ub.user_id=?
                   WHERE b.series_name is not null AND trim(b.series_name)<>''
                   GROUP BY b.series_name ORDER BY b.series_name""",
                (user_id,),
            ).fetchall()
            current_rows = connection.execute(
                """SELECT b.*,ub.current_page,ub.total_pages,ub.started_at
                   FROM user_books ub JOIN books b ON b.id=ub.book_id
                   WHERE ub.user_id=? AND ub.shelf='reading'
                   ORDER BY ub.updated_at DESC""",
                (user_id,),
            ).fetchall()
            custom_current_rows = connection.execute(
                """SELECT * FROM user_custom_books WHERE user_id=? AND shelf='reading'
                   ORDER BY updated_at DESC""", (user_id,)
            ).fetchall()
        calendar = [dict(row) for row in activity_rows]
        activity_days = [date.fromisoformat(row["activity_date"]) for row in activity_rows]
        current_streak, longest_streak = self._reading_streaks(activity_days)
        target_books = goal["target_books"] if goal else 12
        currently_reading = []
        for row in current_rows:
            book = self._book(row)
            total_pages = row["total_pages"]
            currently_reading.append({
                **book,
                "current_page": row["current_page"],
                "total_pages": total_pages,
                "progress_percent": round(row["current_page"] / total_pages * 100, 1)
                if total_pages else 0,
                "started_at": row["started_at"],
            })
        currently_reading.extend(self._custom_book(row) for row in custom_current_rows)
        genre_counts = {row["genre"]: row["count"] for row in genre_rows}
        for row in custom_genre_rows:
            genre_counts[row["genre"]] = genre_counts.get(row["genre"], 0) + row["count"]
        return {
            "year": year,
            "goal": {
                "target_books": target_books,
                "completed_books": completed_books,
                "progress_percent": round(min(1, completed_books / target_books) * 100, 1),
                "is_default": goal is None,
            },
            "total_pages_read": sum(row["pages_read"] for row in activity_rows),
            "active_days": len(activity_rows),
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "calendar": calendar,
            "genre_distribution": [
                {"genre": genre, "count": count}
                for genre, count in sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "series_progress": [{
                **dict(row),
                "progress_percent": round(row["read_books"] / row["total_books"] * 100, 1),
            } for row in series_rows],
            "currently_reading": currently_reading,
        }


    def gamification_summary(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            stats = {
                "library_books": connection.execute(
                    "SELECT (SELECT count(*) FROM user_books WHERE user_id=?) + (SELECT count(*) FROM user_custom_books WHERE user_id=?)",
                    (user_id, user_id),
                ).fetchone()[0],
                "read_books": connection.execute(
                    "SELECT (SELECT count(*) FROM user_books WHERE user_id=? AND shelf='read') + (SELECT count(*) FROM user_custom_books WHERE user_id=? AND shelf='read')",
                    (user_id, user_id),
                ).fetchone()[0],
                "published_comments": connection.execute(
                    "SELECT count(*) FROM book_comments WHERE user_id=? AND status='published'", (user_id,)
                ).fetchone()[0],
                "ratings": connection.execute(
                    "SELECT count(*) FROM book_ratings WHERE user_id=?", (user_id,)
                ).fetchone()[0],
                "active_days": connection.execute(
                    "SELECT count(distinct activity_date) FROM reading_activity WHERE user_id=?", (user_id,)
                ).fetchone()[0],
                "read_genres": connection.execute(
                    """SELECT count(distinct genre) FROM (
                         SELECT b.genre genre FROM user_books ub JOIN books b ON b.id=ub.book_id
                         WHERE ub.user_id=? AND ub.shelf='read'
                         UNION ALL
                         SELECT genre FROM user_custom_books WHERE user_id=? AND shelf='read'
                       ) WHERE trim(coalesce(genre,''))<>''""",
                    (user_id, user_id),
                ).fetchone()[0],
                "completed_goals": connection.execute(
                    """SELECT count(*) FROM reading_goals g WHERE g.user_id=? AND g.target_books <=
                       ((SELECT count(*) FROM user_books ub WHERE ub.user_id=g.user_id AND ub.shelf='read' AND substr(ub.finished_at,1,4)=cast(g.goal_year as text)) +
                        (SELECT count(*) FROM user_custom_books cb WHERE cb.user_id=g.user_id AND cb.shelf='read' AND substr(cb.finished_at,1,4)=cast(g.goal_year as text)))""",
                    (user_id,),
                ).fetchone()[0],
            }
            activity_dates = [
                date.fromisoformat(row[0]) for row in connection.execute(
                    "SELECT distinct activity_date FROM reading_activity WHERE user_id=? ORDER BY activity_date", (user_id,)
                )
            ]
            stats["longest_streak"] = self._reading_streaks(activity_dates)[1]
            qualified = earned_badge_codes(stats)
            existing = {row["badge_code"] for row in connection.execute(
                "SELECT badge_code FROM user_badges WHERE user_id=?", (user_id,)
            )}
            new_codes = qualified - existing
            revoked = existing - qualified
            if revoked:
                placeholders = ",".join("?" for _ in revoked)
                connection.execute(
                    f"DELETE FROM user_badges WHERE user_id=? AND badge_code IN ({placeholders})",
                    (user_id, *sorted(revoked)),
                )
            now = datetime.now(timezone.utc).isoformat()
            for code in qualified:
                connection.execute(
                    "INSERT OR IGNORE INTO user_badges(user_id,badge_code,earned_at) VALUES(?,?,?)",
                    (user_id, code, now),
                )
            showcase = [row["badge_code"] for row in connection.execute(
                "SELECT badge_code FROM user_badge_showcase WHERE user_id=? ORDER BY slot", (user_id,)
            )]
            if not showcase and new_codes:
                for rule in BADGE_RULES:
                    if len(showcase) >= 3:
                        break
                    if rule.code in qualified:
                        showcase.append(rule.code)
                        connection.execute(
                            "INSERT INTO user_badge_showcase(user_id,slot,badge_code,updated_at) VALUES(?,?,?,?)",
                            (user_id, len(showcase), rule.code, now),
                        )
            earned_rows = [dict(row) for row in connection.execute(
                "SELECT badge_code,earned_at FROM user_badges WHERE user_id=? ORDER BY earned_at", (user_id,)
            )]
        return build_gamification_summary(stats, earned_rows, showcase)


    def update_badge_showcase(self, user_id: str, badge_codes: list[str], access_token: str | None = None) -> dict:
        codes = list(dict.fromkeys(badge_codes))
        if len(codes) != len(badge_codes) or len(codes) > 3:
            raise ValueError("Vitrinde en fazla üç farklı rozet gösterilebilir.")
        current = self.gamification_summary(user_id)
        earned = {badge["code"] for badge in current["badges"] if badge["earned"]}
        if any(code not in earned for code in codes):
            raise ValueError("Yalnızca kazanılmış rozetler vitrine eklenebilir.")
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            connection.execute("DELETE FROM user_badge_showcase WHERE user_id=?", (user_id,))
            connection.executemany(
                "INSERT INTO user_badge_showcase(user_id,slot,badge_code,updated_at) VALUES(?,?,?,?)",
                [(user_id, slot, code, now) for slot, code in enumerate(codes, 1)],
            )
        return self.gamification_summary(user_id)


    def upsert_reading_plan(self, user_id: str, book_id: str, target_date: str,
                            reminder_enabled: bool = False, access_token: str | None = None,
                            reminder_time: str = "20:00", timezone: str = "Europe/Istanbul",
                            excluded_weekdays: list[int] | None = None, weekday_pages: int | None = None,
                            weekend_pages: int | None = None, delivery_channel: str = "in_app") -> dict:
        target = date.fromisoformat(target_date)
        now = datetime.now(UTC).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                """SELECT b.page_count,coalesce(ub.current_page,0) current_page FROM books b
                   LEFT JOIN user_books ub ON ub.book_id=b.id AND ub.user_id=? WHERE b.id=?""",
                (user_id, book_id),
            ).fetchone()
            if not row:
                raise KeyError("Kitap bulunamadı.")
            remaining = max(1, (row["page_count"] or 1) - row["current_page"])
            schedule = build_schedule(remaining, target, excluded_weekdays or [], weekday_pages, weekend_pages)
            daily_pages = max(1, (remaining + len(schedule) - 1) // len(schedule))
            connection.execute(
                """INSERT INTO reading_plans(user_id,book_id,target_date,daily_pages,reminder_enabled,reminder_time,timezone,
                   excluded_weekdays_json,weekday_pages,weekend_pages,delivery_channel,status,updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,'active',?) ON CONFLICT(user_id,book_id) DO UPDATE SET target_date=excluded.target_date,
                   daily_pages=excluded.daily_pages,reminder_enabled=excluded.reminder_enabled,reminder_time=excluded.reminder_time,
                   timezone=excluded.timezone,excluded_weekdays_json=excluded.excluded_weekdays_json,weekday_pages=excluded.weekday_pages,
                   weekend_pages=excluded.weekend_pages,delivery_channel=excluded.delivery_channel,status='active',updated_at=excluded.updated_at""",
                (user_id, book_id, target_date, daily_pages, int(reminder_enabled), reminder_time, timezone,
                 json.dumps(excluded_weekdays or []), weekday_pages, weekend_pages, delivery_channel, now),
            )
            connection.execute("DELETE FROM reading_plan_days WHERE user_id=? AND book_id=? AND completed_pages=0", (user_id, book_id))
            for day in schedule:
                connection.execute("""INSERT INTO reading_plan_days(id,user_id,book_id,plan_date,planned_pages,completed_pages,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,book_id,plan_date) DO UPDATE SET planned_pages=excluded.planned_pages,updated_at=excluded.updated_at""",
                    (str(uuid4()), user_id, book_id, day["plan_date"], day["planned_pages"], 0, now, now))
            if reminder_enabled:
                for day in schedule:
                    key = f"reading:{user_id}:{book_id}:{day['plan_date']}:{reminder_time}:{delivery_channel}"
                    connection.execute("""INSERT OR IGNORE INTO reminder_deliveries(id,user_id,book_id,scheduled_for,channel,status,attempts,idempotency_key,created_at)
                        VALUES(?,?,?,?,?,'pending',0,?,?)""", (str(uuid4()), user_id, book_id, reminder_datetime_utc(day["plan_date"], reminder_time, timezone), delivery_channel, key, now))
        return {"user_id": user_id, "book_id": book_id, "target_date": target_date, "daily_pages": daily_pages,
                "reminder_enabled": reminder_enabled, "reminder_time": reminder_time, "timezone": timezone,
                "delivery_channel": delivery_channel, "schedule": schedule, **schedule_summary(schedule), "updated_at": now}


    def list_reading_plans(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(
                """SELECT rp.*,b.title,b.author,b.page_count,coalesce(ub.current_page,0) current_page
                   FROM reading_plans rp JOIN books b ON b.id=rp.book_id
                   LEFT JOIN user_books ub ON ub.user_id=rp.user_id AND ub.book_id=rp.book_id
                   WHERE rp.user_id=? ORDER BY rp.target_date""", (user_id,)
            )]


    def reading_plan_calendar(self, user_id: str, start: str, end: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute("""SELECT d.*,b.title,b.author FROM reading_plan_days d
                JOIN books b ON b.id=d.book_id WHERE d.user_id=? AND d.plan_date BETWEEN ? AND ? ORDER BY d.plan_date,b.title""", (user_id, start, end))]


    def set_reading_plan_status(self, user_id: str, book_id: str, status: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            connection.execute("UPDATE reading_plans SET status=?,updated_at=? WHERE user_id=? AND book_id=?",
                               (status, datetime.now(timezone.utc).isoformat(), user_id, book_id))
            row = connection.execute("SELECT * FROM reading_plans WHERE user_id=? AND book_id=?", (user_id, book_id)).fetchone()
        if not row:
            raise KeyError("Okuma planı bulunamadı.")
        return dict(row)


    def add_reading_session(
        self, user_id: str, payload: dict, access_token: str | None = None
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        today = date.today().isoformat()
        session_id = str(uuid4())
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        start_page = payload["start_page"]
        end_page = payload["end_page"]
        duration_minutes = payload["duration_minutes"]
        pages_read = max(0, end_page - start_page)

        with self.connect() as connection:
            connection.execute(
                """INSERT INTO reading_sessions(
                    id, user_id, book_id, custom_book_id, start_page, end_page,
                    duration_minutes, session_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (session_id, user_id, book_id, custom_book_id, start_page, end_page, duration_minutes, today, now)
            )

            if pages_read > 0:
                activity_id = str(uuid4())
                connection.execute(
                    """INSERT INTO reading_activity(id, user_id, book_id, custom_book_id, activity_date, pages_read, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (activity_id, user_id, book_id, custom_book_id, today, pages_read, now)
                )

                if book_id:
                    connection.execute(
                        """UPDATE user_books SET current_page = max(current_page, ?), updated_at = ?
                           WHERE user_id = ? AND book_id = ?""",
                        (end_page, now, user_id, book_id)
                    )
                elif custom_book_id:
                    connection.execute(
                        """UPDATE user_custom_books SET current_page = max(current_page, ?), updated_at = ?
                           WHERE user_id = ? AND id = ?""",
                        (end_page, now, user_id, custom_book_id)
                    )

        return self.get_reading_session(session_id, user_id)


    def get_reading_session(self, session_id: str, user_id: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT s.*, 
                          coalesce(b.title, cb.title) as book_title
                   FROM reading_sessions s
                   LEFT JOIN books b ON b.id = s.book_id
                   LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                   WHERE s.id = ? AND s.user_id = ?""",
                (session_id, user_id)
            ).fetchone()
            if not row:
                raise KeyError("Okuma seansı bulunamadı.")
            res = dict(row)
            res["pages_read"] = max(0, res["end_page"] - res["start_page"])
            duration = res["duration_minutes"]
            res["reading_speed_pages_per_min"] = round(res["pages_read"] / duration, 2) if duration > 0 else 0.0
            return res


    def list_reading_sessions(
        self, user_id: str, book_id: str | None = None, limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            if book_id:
                rows = connection.execute(
                    """SELECT s.*, coalesce(b.title, cb.title) as book_title
                       FROM reading_sessions s
                       LEFT JOIN books b ON b.id = s.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                       WHERE s.user_id = ? AND (s.book_id = ? OR s.custom_book_id = ?)
                       ORDER BY s.created_at DESC LIMIT ?""",
                    (user_id, book_id, book_id, limit)
                ).fetchall()
            else:
                rows = connection.execute(
                    """SELECT s.*, coalesce(b.title, cb.title) as book_title
                       FROM reading_sessions s
                       LEFT JOIN books b ON b.id = s.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = s.custom_book_id
                       WHERE s.user_id = ?
                       ORDER BY s.created_at DESC LIMIT ?""",
                    (user_id, limit)
                ).fetchall()

            result = []
            for r in rows:
                item = dict(r)
                item["pages_read"] = max(0, item["end_page"] - item["start_page"])
                duration = item["duration_minutes"]
                item["reading_speed_pages_per_min"] = round(item["pages_read"] / duration, 2) if duration > 0 else 0.0
                result.append(item)
            return result


    def get_reading_session_stats(
        self, user_id: str, access_token: str | None = None,
    ) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT count(*) as total_sessions,
                          coalesce(sum(duration_minutes), 0) as total_minutes,
                          coalesce(sum(max(0, end_page - start_page)), 0) as total_pages_read
                   FROM reading_sessions
                   WHERE user_id = ?""",
                (user_id,)
            ).fetchone()
            
            total_sessions = row["total_sessions"] if row else 0
            total_minutes = row["total_minutes"] if row else 0
            total_pages = row["total_pages_read"] if row else 0
            avg_speed = round(total_pages / total_minutes, 2) if total_minutes > 0 else 0.0
            est_hours = round((300 / avg_speed) / 60, 1) if avg_speed > 0 else 5.0

            activity_rows = connection.execute(
                """SELECT activity_date, sum(pages_read) as total_pages
                   FROM reading_activity
                   WHERE user_id = ?
                   GROUP BY activity_date
                   ORDER BY activity_date""",
                (user_id,)
            ).fetchall()

            heatmap = {r["activity_date"]: r["total_pages"] for r in activity_rows}

            return {
                "total_sessions": total_sessions,
                "total_minutes": total_minutes,
                "total_pages_read": total_pages,
                "average_reading_speed_pages_per_min": avg_speed,
                "estimated_hours_for_300_page_book": est_hours,
                "heatmap_data": heatmap,
            }


    def add_book_quote(self, user_id: str, payload: dict, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        quote_id = str(uuid4())
        book_id = payload.get("book_id")
        custom_book_id = payload.get("custom_book_id")
        quote_text = payload["quote_text"]
        page_number = payload.get("page_number")
        tags = payload.get("tags", [])
        source_type = payload.get("source_type", "manual")

        with self.connect() as connection:
            connection.execute(
                """INSERT INTO book_quotes(
                    id, user_id, book_id, custom_book_id, quote_text, page_number, tags_json, source_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (quote_id, user_id, book_id, custom_book_id, quote_text, page_number, json.dumps(tags), source_type, now)
            )

        return self.get_book_quote(quote_id, user_id)


    def get_book_quote(self, quote_id: str, user_id: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT q.*, coalesce(b.title, cb.title) as book_title
                   FROM book_quotes q
                   LEFT JOIN books b ON b.id = q.book_id
                   LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                   WHERE q.id = ? AND q.user_id = ?""",
                (quote_id, user_id)
            ).fetchone()
            if not row:
                raise KeyError("Alıntı bulunamadı.")
            res = dict(row)
            res["tags"] = json.loads(res.pop("tags_json", "[]"))
            return res


    def list_book_quotes(
        self, user_id: str, book_id: str | None = None, limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]:
        with self.connect() as connection:
            if book_id:
                rows = connection.execute(
                    """SELECT q.*, coalesce(b.title, cb.title) as book_title
                       FROM book_quotes q
                       LEFT JOIN books b ON b.id = q.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                       WHERE q.user_id = ? AND (q.book_id = ? OR q.custom_book_id = ?)
                       ORDER BY q.created_at DESC LIMIT ?""",
                    (user_id, book_id, book_id, limit)
                ).fetchall()
            else:
                rows = connection.execute(
                    """SELECT q.*, coalesce(b.title, cb.title) as book_title
                       FROM book_quotes q
                       LEFT JOIN books b ON b.id = q.book_id
                       LEFT JOIN user_custom_books cb ON cb.id = q.custom_book_id
                       WHERE q.user_id = ?
                       ORDER BY q.created_at DESC LIMIT ?""",
                    (user_id, limit)
                ).fetchall()

            res = []
            for r in rows:
                item = dict(r)
                item["tags"] = json.loads(item.pop("tags_json", "[]"))
                res.append(item)
            return res

    # Product growth -----------------------------------------------------


    def weekly_summary(self, user_id: str, access_token: str | None = None) -> dict:
        start, end = weekly_window()
        with self.connect() as connection:
            stats = connection.execute(
                """SELECT coalesce(sum(duration_minutes),0) minutes,coalesce(sum(end_page-start_page),0) pages,
                   count(*) sessions FROM reading_sessions WHERE user_id=? AND session_date BETWEEN ? AND ?""",
                (user_id, start, end),
            ).fetchone()
            finished = connection.execute(
                "SELECT count(*) n FROM user_books WHERE user_id=? AND shelf='read' AND substr(finished_at,1,10) BETWEEN ? AND ?",
                (user_id, start, end),
            ).fetchone()["n"]
            picks = [self._book(row) for row in connection.execute(
                """SELECT b.* FROM books b WHERE b.is_recommendable=1 AND NOT EXISTS(
                   SELECT 1 FROM user_books ub WHERE ub.user_id=? AND ub.book_id=b.id)
                   ORDER BY b.quality_score DESC,b.popularity_score DESC LIMIT 5""", (user_id,)
            )]
        return {"start_date": start, "end_date": end, "minutes_read": stats["minutes"], "pages_read": stats["pages"],
                "sessions": stats["sessions"], "books_finished": finished, "recommendations": picks}

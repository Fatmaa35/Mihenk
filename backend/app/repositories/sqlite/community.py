"""Puanlar, yorumlar, takip ve topluluk akışı."""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

class SQLiteCommunityMixin:
    def _refresh_book_rating(self, connection: sqlite3.Connection, book_id: str) -> None:
        aggregate = connection.execute(
            "SELECT count(*) rating_count,coalesce(avg(rating),0) rating_average FROM book_ratings WHERE book_id=?",
            (book_id,),
        ).fetchone()
        count, average = int(aggregate["rating_count"]), float(aggregate["rating_average"])
        import math
        popularity = min(1.0, (math.log1p(count) / math.log(101)) * (average / 5)) if count else 0
        connection.execute(
            "UPDATE books SET rating_count=?,rating_average=?,popularity_score=? WHERE id=?",
            (count, round(average, 2), round(popularity, 4), book_id),
        )


    def upsert_book_rating(self, user_id: str, book_id: str, rating: int, access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
                raise KeyError("Kitap bulunamadÄ±.")
            connection.execute(
                """INSERT INTO book_ratings(user_id,book_id,rating,created_at,updated_at) VALUES(?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET rating=excluded.rating,updated_at=excluded.updated_at""",
                (user_id, book_id, rating, now, now),
            )
            self._refresh_book_rating(connection, book_id)
        return {"book_id": book_id, "rating": rating}


    def delete_book_rating(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM book_ratings WHERE user_id=? AND book_id=?", (user_id, book_id))
            self._refresh_book_rating(connection, book_id)


    def book_community(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            book = connection.execute("SELECT rating_count,rating_average,popularity_score FROM books WHERE id=?", (book_id,)).fetchone()
            if not book:
                raise KeyError("Kitap bulunamadÄ±.")
            own = connection.execute("SELECT rating FROM book_ratings WHERE user_id=? AND book_id=?", (user_id, book_id)).fetchone()
            distribution = connection.execute(
                """SELECT rating,count(*) count FROM book_ratings WHERE book_id=?
                   GROUP BY rating ORDER BY rating DESC""", (book_id,),
            ).fetchall()
            rows = connection.execute(
                """SELECT c.*,u.display_name,u.is_verified,u.verification_label,
                          (SELECT count(*) FROM comment_helpful_votes hv WHERE hv.comment_id=c.id) helpful_count,
                          EXISTS(SELECT 1 FROM comment_helpful_votes hv WHERE hv.comment_id=c.id AND hv.user_id=?) own_helpful,
                          EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=? AND f.followed_id=c.user_id) following_author
                   FROM book_comments c
                   JOIN users u ON u.id=c.user_id WHERE c.book_id=? AND (c.status='published' OR c.user_id=?)
                   ORDER BY CASE WHEN c.parent_comment_id IS NULL THEN c.created_at ELSE
                     (SELECT created_at FROM book_comments parent WHERE parent.id=c.parent_comment_id) END DESC,
                     c.parent_comment_id IS NOT NULL,c.created_at LIMIT 200""", (user_id, user_id, book_id, user_id),
            ).fetchall()
        comments = [{"id": row["id"], "book_id": row["book_id"], "content": row["content"],
                     "parent_comment_id": row["parent_comment_id"],
                     "contains_spoiler": bool(row["contains_spoiler"]), "status": row["status"],
                     "created_at": row["created_at"], "updated_at": row["updated_at"],
                     "is_mine": row["user_id"] == user_id, "author_id": row["user_id"], "helpful_count": row["helpful_count"],
                     "own_helpful": bool(row["own_helpful"]), "following_author": bool(row["following_author"]),
                     "author": {"display_name": row["display_name"], "is_verified": bool(row["is_verified"]),
                                "verification_label": row["verification_label"]}} for row in rows]
        return {**dict(book), "own_rating": own["rating"] if own else None,
                "rating_distribution": {str(row["rating"]): row["count"] for row in distribution},
                "comments": comments}


    def create_book_comment(self, user_id: str, book_id: str, content: str, contains_spoiler: bool,
                            access_token: str | None = None, parent_comment_id: str | None = None) -> dict:
        now, comment_id = datetime.now(timezone.utc).isoformat(), str(uuid4())
        with self.connect() as connection:
            parent = None
            if parent_comment_id:
                parent = connection.execute(
                    "SELECT user_id,book_id FROM book_comments WHERE id=? AND status='published'",
                    (parent_comment_id,),
                ).fetchone()
                if not parent or parent["book_id"] != book_id:
                    raise ValueError("Yanıt verilen yorum bu kitaba ait değil.")
            connection.execute(
                """INSERT INTO book_comments(id,user_id,book_id,parent_comment_id,content,contains_spoiler,status,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,'published',?,?)""",
                (comment_id, user_id, book_id, parent_comment_id, content.strip(), int(contains_spoiler), now, now),
            )
            if parent and parent["user_id"] != user_id:
                self._create_notification(
                    connection, parent["user_id"], "comment_reply", "Yorumuna yanıt geldi",
                    "Bir okur kitap yorumuna yanıt verdi.", book_id,
                    {"comment_id": comment_id, "parent_comment_id": parent_comment_id},
                )
        return {"id": comment_id, "book_id": book_id, "content": content.strip(), "contains_spoiler": contains_spoiler,
                "parent_comment_id": parent_comment_id, "status": "published", "created_at": now, "updated_at": now}


    def update_book_comment(self, user_id: str, comment_id: str, changes: dict, access_token: str | None = None) -> dict:
        allowed = {key: value for key, value in changes.items() if key in {"content", "contains_spoiler"}}
        if not allowed:
            raise ValueError("DeÄŸiÅŸtirilecek alan yok.")
        allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "contains_spoiler" in allowed: allowed["contains_spoiler"] = int(allowed["contains_spoiler"])
        assignments = ",".join(f"{key}=?" for key in allowed)
        with self.connect() as connection:
            cursor = connection.execute(f"UPDATE book_comments SET {assignments} WHERE id=? AND user_id=?", [*allowed.values(), comment_id, user_id])
            if not cursor.rowcount: raise KeyError("Yorum bulunamadÄ±.")
            row = connection.execute("SELECT * FROM book_comments WHERE id=?", (comment_id,)).fetchone()
        return dict(row)


    def delete_book_comment(self, user_id: str, comment_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM book_comments WHERE id=? AND user_id=?", (comment_id, user_id))
            if not cursor.rowcount: raise KeyError("Yorum bulunamadÄ±.")


    def set_comment_helpful(self, user_id: str, comment_id: str, helpful: bool,
                            access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            comment = connection.execute(
                "SELECT user_id,book_id FROM book_comments WHERE id=? AND status='published'", (comment_id,),
            ).fetchone()
            if not comment:
                raise KeyError("Yorum bulunamadı.")
            inserted = False
            if helpful:
                cursor = connection.execute(
                    "INSERT OR IGNORE INTO comment_helpful_votes(user_id,comment_id,created_at) VALUES(?,?,?)",
                    (user_id, comment_id, now),
                )
                inserted = bool(cursor.rowcount)
            else:
                connection.execute("DELETE FROM comment_helpful_votes WHERE user_id=? AND comment_id=?", (user_id, comment_id))
            if inserted and comment["user_id"] != user_id:
                self._create_notification(connection, comment["user_id"], "comment_helpful",
                                          "Yorumun faydalı bulundu", "Bir okur yorumunu faydalı olarak işaretledi.",
                                          comment["book_id"], {"comment_id": comment_id})
            count = connection.execute("SELECT count(*) count FROM comment_helpful_votes WHERE comment_id=?", (comment_id,)).fetchone()["count"]
        return {"comment_id": comment_id, "helpful": helpful, "helpful_count": count}


    def report_comment(self, user_id: str, comment_id: str, reason: str, details: str | None,
                       access_token: str | None = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            comment = connection.execute("SELECT user_id FROM book_comments WHERE id=?", (comment_id,)).fetchone()
            if not comment:
                raise KeyError("Yorum bulunamadı.")
            if comment["user_id"] == user_id:
                raise ValueError("Kendi yorumunu şikâyet edemezsin.")
            connection.execute(
                """INSERT INTO comment_reports(user_id,comment_id,reason,details,status,created_at)
                   VALUES(?,?,?,?, 'open',?) ON CONFLICT(user_id,comment_id) DO UPDATE SET
                   reason=excluded.reason,details=excluded.details,status='open',created_at=excluded.created_at""",
                (user_id, comment_id, reason, (details or "").strip() or None, now),
            )
            row = connection.execute("SELECT id,status FROM comment_reports WHERE user_id=? AND comment_id=?", (user_id, comment_id)).fetchone()
        return dict(row)


    def set_follow(self, follower_id: str, followed_id: str, following: bool,
                   access_token: str | None = None) -> dict:
        if follower_id == followed_id:
            raise ValueError("Kendini takip edemezsin.")
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM users WHERE id=?", (followed_id,)).fetchone():
                raise KeyError("Kullanıcı bulunamadı.")
            if following:
                cursor = connection.execute(
                    "INSERT OR IGNORE INTO user_follows(follower_id,followed_id,created_at) VALUES(?,?,?)",
                    (follower_id, followed_id, datetime.now(timezone.utc).isoformat()),
                )
                if cursor.rowcount:
                    self._create_notification(connection, followed_id, "new_follower", "Yeni bir takipçin var",
                                              "Bir Mihenk okuru seni takip etmeye başladı.",
                                              payload={"follower_id": follower_id})
            else:
                connection.execute("DELETE FROM user_follows WHERE follower_id=? AND followed_id=?", (follower_id, followed_id))
            count = connection.execute("SELECT count(*) count FROM user_follows WHERE followed_id=?", (followed_id,)).fetchone()["count"]
        return {"user_id": followed_id, "following": following, "follower_count": count}


    def community_feed(self, user_id: str, limit: int = 40, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT c.id,c.book_id,c.content,c.contains_spoiler,c.created_at,c.parent_comment_id,
                          u.id author_id,u.display_name,u.is_verified,u.verification_label,
                          b.title book_title,b.author book_author,b.cover_url,
                          (SELECT count(*) FROM comment_helpful_votes h WHERE h.comment_id=c.id) helpful_count
                   FROM book_comments c JOIN user_follows f ON f.followed_id=c.user_id
                   JOIN users u ON u.id=c.user_id JOIN books b ON b.id=c.book_id
                   WHERE f.follower_id=? AND c.status='published'
                   ORDER BY c.created_at DESC LIMIT ?""", (user_id, limit),
            ).fetchall()
        return [{**dict(row), "contains_spoiler": bool(row["contains_spoiler"]), "is_verified": bool(row["is_verified"])} for row in rows]

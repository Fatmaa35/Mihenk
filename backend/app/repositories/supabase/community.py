"""Puanlar, yorumlar, takip ve topluluk akışı."""
from __future__ import annotations

from datetime import datetime, timezone
from app.repositories.supabase.base import SupabaseRequestError

class SupabaseCommunityMixin:
    def upsert_book_rating(self, user_id: str, book_id: str, rating: int, access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/book_ratings", token=access_token, params={"on_conflict": "user_id,book_id"},
            json_body={"user_id": user_id, "book_id": book_id, "rating": rating, "updated_at": datetime.now(timezone.utc).isoformat()},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        if not rows: raise SupabaseRequestError("Puan kaydedilemedi.", 409)
        return rows[0]


    def delete_book_rating(self, user_id: str, book_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/book_ratings", token=access_token,
                      params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"})


    def _book_community_legacy(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        books = self._request("GET", "/rest/v1/books", params={"select": "rating_count,rating_average,popularity_score", "id": f"eq.{book_id}", "limit": 1}).json()
        if not books: raise KeyError("Kitap bulunamadı.")
        own = self._request("GET", "/rest/v1/book_ratings", token=access_token,
                            params={"select": "rating", "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}", "limit": 1}).json()
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token,
            params={"select": "id,user_id,book_id,content,contains_spoiler,status,created_at,updated_at", "book_id": f"eq.{book_id}", "order": "created_at.desc", "limit": 200}).json()
        author_ids = sorted({row["user_id"] for row in comments}); profiles = {}
        if author_ids:
            profile_rows = self._request("GET", "/rest/v1/profiles", admin=True,
                params={"select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(author_ids)})"}).json()
            profiles = {row["id"]: {key: row.get(key) for key in ("display_name", "is_verified", "verification_label")} for row in profile_rows}
        public_comments = [{key: row[key] for key in ("id", "book_id", "content", "contains_spoiler", "status", "created_at", "updated_at")} |
                           {"is_mine": row["user_id"] == user_id, "author": profiles.get(row["user_id"], {"display_name": "Okur", "is_verified": False, "verification_label": None})}
                           for row in comments]
        return {**books[0], "rating_average": float(books[0].get("rating_average") or 0),
                "popularity_score": float(books[0].get("popularity_score") or 0),
                "own_rating": own[0]["rating"] if own else None, "comments": public_comments}


    def _create_book_comment_legacy(self, user_id: str, book_id: str, content: str, contains_spoiler: bool, access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/book_comments", token=access_token,
            json_body={"user_id": user_id, "book_id": book_id, "content": content.strip(), "contains_spoiler": contains_spoiler},
            extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]


    def update_book_comment(self, user_id: str, comment_id: str, changes: dict, access_token: str | None = None) -> dict:
        payload = {key: value for key, value in changes.items() if key in {"content", "contains_spoiler"}}
        if not payload: raise ValueError("Değiştirilecek alan yok.")
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        rows = self._request("PATCH", "/rest/v1/book_comments", token=access_token,
            params={"id": f"eq.{comment_id}", "user_id": f"eq.{user_id}"}, json_body=payload,
            extra_headers={"Prefer": "return=representation"}).json()
        if not rows: raise KeyError("Yorum bulunamadı.")
        return rows[0]


    def delete_book_comment(self, user_id: str, comment_id: str, access_token: str | None = None) -> None:
        self._request("DELETE", "/rest/v1/book_comments", token=access_token, params={"id": f"eq.{comment_id}", "user_id": f"eq.{user_id}"})

    # Extended community projection. This later definition intentionally keeps
    # the repository contract backward compatible while adding social metadata.


    def book_community(self, book_id: str, user_id: str, access_token: str | None = None) -> dict:
        books = self._request("GET", "/rest/v1/books", params={
            "select": "rating_count,rating_average,popularity_score", "id": f"eq.{book_id}", "limit": 1}).json()
        if not books:
            raise KeyError("Kitap bulunamadı.")
        own = self._request("GET", "/rest/v1/book_ratings", token=access_token, params={
            "select": "rating", "user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}", "limit": 1}).json()
        ratings = self._request("GET", "/rest/v1/book_ratings", token=access_token,
                                params={"select": "rating", "book_id": f"eq.{book_id}", "limit": 5000}).json()
        distribution = {str(value): sum(row["rating"] == value for row in ratings) for value in range(1, 6)}
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id,parent_comment_id,content,contains_spoiler,status,created_at,updated_at",
            "book_id": f"eq.{book_id}", "order": "created_at.desc", "limit": 200}).json()
        author_ids = sorted({row["user_id"] for row in comments})
        profiles = {}
        if author_ids:
            rows = self._request("GET", "/rest/v1/profiles", admin=True, params={
                "select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(author_ids)})"}).json()
            profiles = {row["id"]: {"display_name": row["display_name"],
                        "is_verified": row.get("is_verified", False), "verification_label": row.get("verification_label")} for row in rows}
        comment_ids = [row["id"] for row in comments]
        votes = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token, params={
            "select": "user_id,comment_id", "comment_id": f"in.({','.join(comment_ids)})", "limit": 5000}).json() if comment_ids else []
        followed = self._request("GET", "/rest/v1/user_follows", token=access_token, params={
            "select": "followed_id", "follower_id": f"eq.{user_id}", "limit": 5000}).json()
        followed_ids = {row["followed_id"] for row in followed}
        projected = []
        for row in comments:
            projected.append({
                **{key: row.get(key) for key in ("id", "book_id", "parent_comment_id", "content", "contains_spoiler", "status", "created_at", "updated_at")},
                "is_mine": row["user_id"] == user_id, "author_id": row["user_id"],
                "helpful_count": sum(v["comment_id"] == row["id"] for v in votes),
                "own_helpful": any(v["comment_id"] == row["id"] and v["user_id"] == user_id for v in votes),
                "following_author": row["user_id"] in followed_ids,
                "author": profiles.get(row["user_id"], {"display_name": "Okur", "is_verified": False, "verification_label": None}),
            })
        return {**books[0], "rating_average": float(books[0].get("rating_average") or 0),
                "popularity_score": float(books[0].get("popularity_score") or 0),
                "own_rating": own[0]["rating"] if own else None,
                "rating_distribution": distribution, "comments": projected}


    def create_book_comment(self, user_id: str, book_id: str, content: str, contains_spoiler: bool,
                            access_token: str | None = None, parent_comment_id: str | None = None) -> dict:
        parent = None
        if parent_comment_id:
            rows = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
                "select": "id,user_id,book_id", "id": f"eq.{parent_comment_id}", "limit": 1}).json()
            parent = rows[0] if rows else None
            if not parent or parent["book_id"] != book_id:
                raise ValueError("Yanıt verilen yorum bu kitaba ait değil.")
        rows = self._request("POST", "/rest/v1/book_comments", token=access_token,
            json_body={"user_id": user_id, "book_id": book_id, "parent_comment_id": parent_comment_id,
                       "content": content.strip(), "contains_spoiler": contains_spoiler},
            extra_headers={"Prefer": "return=representation"}).json()
        created = rows[0]
        if parent and parent["user_id"] != user_id:
            self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                "user_id": parent["user_id"], "kind": "comment_reply", "book_id": book_id,
                "title": "Yorumuna yanıt geldi", "body": "Bir okur kitap yorumuna yanıt verdi.",
                "payload": {"comment_id": created["id"], "parent_comment_id": parent_comment_id}},
                extra_headers={"Prefer": "return=minimal"})
        return created


    def set_comment_helpful(self, user_id: str, comment_id: str, helpful: bool,
                            access_token: str | None = None) -> dict:
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id", "id": f"eq.{comment_id}", "limit": 1}).json()
        if not comments:
            raise KeyError("Yorum bulunamadı.")
        comment = comments[0]
        if helpful:
            before = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token, params={
                "select": "comment_id", "user_id": f"eq.{user_id}", "comment_id": f"eq.{comment_id}", "limit": 1}).json()
            self._request("POST", "/rest/v1/comment_helpful_votes", token=access_token,
                params={"on_conflict": "user_id,comment_id"},
                json_body={"user_id": user_id, "comment_id": comment_id},
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
            if not before and comment["user_id"] != user_id:
                self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                    "user_id": comment["user_id"], "kind": "comment_helpful", "book_id": comment["book_id"],
                    "title": "Yorumun faydalı bulundu", "body": "Bir okur yorumunu faydalı olarak işaretledi.",
                    "payload": {"comment_id": comment_id}}, extra_headers={"Prefer": "return=minimal"})
        else:
            self._request("DELETE", "/rest/v1/comment_helpful_votes", token=access_token,
                          params={"user_id": f"eq.{user_id}", "comment_id": f"eq.{comment_id}"})
        rows = self._request("GET", "/rest/v1/comment_helpful_votes", token=access_token,
                             params={"select": "comment_id", "comment_id": f"eq.{comment_id}", "limit": 5000}).json()
        return {"comment_id": comment_id, "helpful": helpful, "helpful_count": len(rows)}


    def report_comment(self, user_id: str, comment_id: str, reason: str, details: str | None,
                       access_token: str | None = None) -> dict:
        rows = self._request("POST", "/rest/v1/comment_reports", token=access_token,
            params={"on_conflict": "user_id,comment_id"},
            json_body={"user_id": user_id, "comment_id": comment_id, "reason": reason,
                       "details": (details or "").strip() or None, "status": "open"},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        return rows[0]


    def set_follow(self, follower_id: str, followed_id: str, following: bool,
                   access_token: str | None = None) -> dict:
        if follower_id == followed_id:
            raise ValueError("Kendini takip edemezsin.")
        if following:
            before = self._request("GET", "/rest/v1/user_follows", token=access_token, params={
                "select": "followed_id", "follower_id": f"eq.{follower_id}", "followed_id": f"eq.{followed_id}", "limit": 1}).json()
            self._request("POST", "/rest/v1/user_follows", token=access_token,
                params={"on_conflict": "follower_id,followed_id"}, json_body={"follower_id": follower_id, "followed_id": followed_id},
                extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"})
            if not before:
                self._request("POST", "/rest/v1/notifications", admin=True, json_body={
                    "user_id": followed_id, "kind": "new_follower", "title": "Yeni bir takipçin var",
                    "body": "Bir Mihenk okuru seni takip etmeye başladı.", "payload": {"follower_id": follower_id}},
                    extra_headers={"Prefer": "return=minimal"})
        else:
            self._request("DELETE", "/rest/v1/user_follows", token=access_token,
                          params={"follower_id": f"eq.{follower_id}", "followed_id": f"eq.{followed_id}"})
        return {"user_id": followed_id, "following": following}


    def community_feed(self, user_id: str, limit: int = 40, access_token: str | None = None) -> list[dict]:
        follows = self._request("GET", "/rest/v1/user_follows", token=access_token,
            params={"select": "followed_id", "follower_id": f"eq.{user_id}", "limit": 5000}).json()
        ids = [row["followed_id"] for row in follows]
        if not ids:
            return []
        comments = self._request("GET", "/rest/v1/book_comments", token=access_token, params={
            "select": "id,user_id,book_id,parent_comment_id,content,contains_spoiler,created_at,book:books(title,author,cover_url)",
            "user_id": f"in.({','.join(ids)})", "status": "eq.published", "order": "created_at.desc", "limit": limit}).json()
        profiles = self._request("GET", "/rest/v1/profiles", admin=True, params={
            "select": "id,display_name,is_verified,verification_label", "id": f"in.({','.join(ids)})"}).json()
        by_id = {row["id"]: row for row in profiles}
        return [{**{key: row.get(key) for key in ("id", "book_id", "parent_comment_id", "content", "contains_spoiler", "created_at")},
                 "author_id": row["user_id"], **by_id.get(row["user_id"], {}),
                 "book_title": row["book"]["title"], "book_author": row["book"]["author"], "cover_url": row["book"].get("cover_url")}
                for row in comments]

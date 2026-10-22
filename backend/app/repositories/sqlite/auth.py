"""Kimlik, oturum ve hesap yaşam döngüsü."""
from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta, timezone
from uuid import uuid4

class SQLiteAuthMixin:
    def create_user(self, display_name: str) -> dict:
        user = {"id": str(uuid4()), "display_name": display_name.strip(), "created_at": datetime.now(timezone.utc).isoformat()}
        with self.connect() as connection:
            connection.execute("INSERT INTO users(id,display_name,created_at) VALUES(:id,:display_name,:created_at)", user)
        return user


    @staticmethod
    def _password_hash(password: str, salt: bytes) -> str:
        return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32).hex()


    def register(self, display_name: str, email: str, password: str) -> dict:
        normalized_email = email.strip().casefold()
        salt = secrets.token_bytes(16)
        user = {"id": str(uuid4()), "display_name": display_name.strip(), "created_at": datetime.now(timezone.utc).isoformat()}
        try:
            with self.connect() as connection:
                connection.execute("INSERT INTO users(id,display_name,created_at) VALUES(:id,:display_name,:created_at)", user)
                connection.execute(
                    "INSERT INTO auth_accounts(user_id,email,password_hash,password_salt,created_at) VALUES(?,?,?,?,?)",
                    (user["id"], normalized_email, self._password_hash(password, salt), salt.hex(), user["created_at"]),
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("Bu e-posta adresi zaten kayıtlı.") from error
        return {**user, "email": normalized_email}


    def open_registration_session(self, display_name: str, email: str, password: str) -> dict:
        user = self.register(display_name, email, password)
        return {
            "user": user,
            "access_token": self.create_session(user["id"]),
            "refresh_token": None,
            "email_confirmation_required": False,
        }


    def authenticate(self, email: str, password: str) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                """SELECT u.id,u.display_name,u.created_at,a.email,a.password_hash,a.password_salt
                   FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.email=?""",
                (email.strip().casefold(),),
            ).fetchone()
        if not row:
            raise ValueError("E-posta veya parola hatalı.")
        candidate = self._password_hash(password, bytes.fromhex(row["password_salt"]))
        if not hmac.compare_digest(candidate, row["password_hash"]):
            raise ValueError("E-posta veya parola hatalı.")
        return {"id": row["id"], "display_name": row["display_name"], "email": row["email"], "created_at": row["created_at"]}


    def open_login_session(self, email: str, password: str) -> dict:
        user = self.authenticate(email, password)
        return {
            "user": user,
            "access_token": self.create_session(user["id"]),
            "refresh_token": None,
            "email_confirmation_required": False,
        }


    def request_password_reset(self, email: str, redirect_to: str | None = None) -> str | None:
        """Create a single-use local recovery token without revealing account existence."""
        normalized_email = email.strip().casefold()
        with self.connect() as connection:
            row = connection.execute(
                "SELECT user_id FROM auth_accounts WHERE email=?", (normalized_email,)
            ).fetchone()
            if not row:
                return None
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            now = datetime.now(timezone.utc)
            connection.execute(
                "DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<=?",
                (row["user_id"], now.isoformat()),
            )
            connection.execute(
                """INSERT INTO password_reset_tokens(token_hash,user_id,expires_at,created_at)
                   VALUES(?,?,?,?)""",
                (token_hash, row["user_id"], (now + timedelta(hours=1)).isoformat(), now.isoformat()),
            )
        return raw_token


    def reset_password(self, recovery_token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(recovery_token.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc)
        salt = secrets.token_bytes(16)
        with self.connect() as connection:
            row = connection.execute(
                """SELECT user_id FROM password_reset_tokens
                   WHERE token_hash=? AND used_at IS NULL AND expires_at>?""",
                (token_hash, now.isoformat()),
            ).fetchone()
            if not row:
                raise ValueError("Parola sıfırlama bağlantısı geçersiz veya süresi dolmuş.")
            connection.execute(
                "UPDATE auth_accounts SET password_hash=?,password_salt=? WHERE user_id=?",
                (self._password_hash(new_password, salt), salt.hex(), row["user_id"]),
            )
            connection.execute(
                "UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?",
                (now.isoformat(), token_hash),
            )
            connection.execute("DELETE FROM sessions WHERE user_id=?", (row["user_id"],))


    def resend_confirmation(self, email: str) -> None:
        # Local accounts are confirmed immediately; keep the API contract uniform.
        return None


    def create_session(self, user_id: str, days: int = 14) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        created_at = datetime.now(timezone.utc)
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
                (token_hash, user_id, created_at.isoformat(), (created_at + timedelta(days=days)).isoformat()),
            )
        return token


    def session_user(self, token: str | None) -> dict | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = datetime.now(UTC).isoformat()
        with self.connect() as connection:
            row = connection.execute(
                """SELECT u.id,u.display_name,u.app_role,u.created_at,a.email FROM sessions s
                   JOIN users u ON u.id=s.user_id JOIN auth_accounts a ON a.user_id=u.id
                   WHERE s.token_hash=? AND s.expires_at>?""", (token_hash, now),
            ).fetchone()
        return dict(row) if row else None


    def resolve_session(self, access_token: str | None, refresh_token: str | None = None) -> dict | None:
        user = self.session_user(access_token)
        if not user:
            return None
        return {"user": user, "access_token": access_token, "refresh_token": None}


    def user_role(self, user_id: str, access_token: str | None = None) -> str:
        with self.connect() as connection:
            row = connection.execute("SELECT app_role FROM users WHERE id=?", (user_id,)).fetchone()
        return row["app_role"] if row else "user"


    def set_user_role(self, user_id: str, role: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            cursor = connection.execute("UPDATE users SET app_role=? WHERE id=?", (role, user_id))
            if not cursor.rowcount:
                raise KeyError("Kullanıcı bulunamadı.")
        return {"user_id": user_id, "role": role}


    def delete_user_account(self, user_id: str, access_token: str | None = None) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM users WHERE id=?", (user_id,))


    def export_user_data(self, user_id: str, access_token: str | None = None) -> dict:
        """Return a portable copy without password hashes, tokens or moderator-only data."""
        direct_tables = (
            "user_preferences", "user_books", "user_custom_books", "reading_goals",
            "reading_activity", "reading_sessions", "book_quotes", "price_alerts",
            "notifications", "recommendation_feedback", "book_ratings", "book_comments",
            "comment_helpful_votes", "comment_reports", "user_badges", "user_badge_showcase",
            "chat_sessions", "chat_messages", "reading_plans", "reading_plan_days",
            "reminder_deliveries", "action_executions",
            "product_events", "beta_feedback",
        )
        with self.connect() as connection:
            account = connection.execute(
                """SELECT u.id,u.display_name,u.app_role,u.created_at,a.email
                   FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=?""",
                (user_id,),
            ).fetchone()
            if not account:
                raise KeyError("Kullanıcı bulunamadı.")
            available = {
                row["name"] for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            records = {}
            for table in direct_tables:
                if table not in available:
                    continue
                columns = {
                    row["name"] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()
                }
                if "user_id" in columns:
                    records[table] = [
                        dict(row) for row in connection.execute(
                            f"SELECT * FROM {table} WHERE user_id=?", (user_id,)
                        ).fetchall()
                    ]
            if "user_follows" in available:
                records["user_follows"] = [
                    dict(row) for row in connection.execute(
                        "SELECT * FROM user_follows WHERE follower_id=? OR followed_id=?",
                        (user_id, user_id),
                    ).fetchall()
                ]
            subscriptions = [dict(row) for row in connection.execute(
                "SELECT id,user_id,user_agent,created_at,updated_at FROM web_push_subscriptions WHERE user_id=?",
                (user_id,),
            ).fetchall()]
        return {
            "format": "mihenk-user-export-v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "account": dict(account),
            "records": {**records, "web_push_subscriptions": subscriptions},
        }


    def purge_expired_data(self, *, audit_days: int, event_days: int,
                           notification_days: int, chat_days: int) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        rules = (
            ("audit_log", "created_at", audit_days, "1=1"),
            ("application_events", "created_at", event_days, "1=1"),
            ("product_events", "occurred_at", event_days, "1=1"),
            ("beta_feedback", "created_at", event_days, "status IN ('resolved','closed')"),
            ("recommendation_events", "created_at", event_days, "1=1"),
            ("notifications", "created_at", notification_days, "read_at IS NOT NULL"),
            ("chat_messages", "created_at", chat_days, "1=1"),
            ("reminder_deliveries", "created_at", event_days, "status IN ('sent','failed','dead_letter')"),
        )
        deleted: dict[str, int] = {}
        with self.connect() as connection:
            available = {
                row["name"] for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            for table, column, days, predicate in rules:
                if table not in available:
                    continue
                cutoff = (now - timedelta(days=days)).isoformat()
                cursor = connection.execute(
                    f"DELETE FROM {table} WHERE {column}<? AND {predicate}", (cutoff,)
                )
                deleted[table] = cursor.rowcount
        return deleted


    def delete_session(self, token: str | None) -> None:
        if not token:
            return
        with self.connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode("utf-8")).hexdigest(),))


    def close_session(self, access_token: str | None, refresh_token: str | None = None) -> None:
        self.delete_session(access_token)


    def account_status(self, user_id: str, access_token: str | None = None) -> dict:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT is_verified,verification_label,banned_at,banned_until,ban_reason FROM users WHERE id=?",
                (user_id,),
            ).fetchone()
        if not row:
            raise KeyError("KullanÄ±cÄ± bulunamadÄ±.")
        result = dict(row)
        until = result.get("banned_until")
        result["is_banned"] = bool(result.get("banned_at")) and (
            not until or datetime.fromisoformat(until.replace("Z", "+00:00")) > datetime.now(timezone.utc)
        )
        result["is_verified"] = bool(result.get("is_verified"))
        return result

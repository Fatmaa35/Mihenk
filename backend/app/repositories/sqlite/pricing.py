"""Mağaza teklifleri, fiyat hattı ve fiyat alarmları."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

class SQLitePricingMixin:
    def list_offer_urls(self, retailer_ids: list[str] | None = None) -> list[str]:
        query, values = "SELECT product_url FROM offers", []
        if retailer_ids:
            placeholders = ",".join("?" for _ in retailer_ids)
            query += f" WHERE retailer_id IN ({placeholders})"
            values.extend(retailer_ids)
        with self.connect() as connection:
            return [row["product_url"] for row in connection.execute(query, values)]


    def list_unpriced_books(self, limit: int = 20) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT b.* FROM books b WHERE NOT EXISTS (
                     SELECT 1 FROM editions e JOIN offers o ON o.edition_isbn=e.isbn WHERE e.book_id=b.id
                   ) ORDER BY CASE WHEN b.source_name='local_curated' THEN 0 ELSE 1 END,b.title LIMIT ?""",
                (limit,),
            ).fetchall()
        return [self._book(row) for row in rows]


    def upsert_price_alert(
        self, user_id: str, book_id: str, target_price_minor: int,
        currency: str = "TRY", is_active: bool = True,
        access_token: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            if not connection.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
                raise KeyError("Kitap bulunamadi.")
            connection.execute(
                """INSERT INTO price_alerts(
                       user_id,book_id,target_price_minor,currency,is_active,created_at,updated_at
                   ) VALUES(?,?,?,?,?,?,?)
                   ON CONFLICT(user_id,book_id) DO UPDATE SET
                       target_price_minor=excluded.target_price_minor,
                       currency=excluded.currency,is_active=excluded.is_active,
                       last_notified_price_minor=NULL,updated_at=excluded.updated_at""",
                (user_id, book_id, target_price_minor, currency, int(is_active), now, now),
            )
        alerts = self.list_price_alerts(user_id)
        return next(alert for alert in alerts if alert["book_id"] == book_id)


    def list_price_alerts(self, user_id: str, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT a.*,b.title,b.author,b.cover_url,
                          (SELECT min(o.price_minor) FROM editions e JOIN offers o
                           ON o.edition_isbn=e.isbn
                           WHERE e.book_id=a.book_id AND o.stock_status='in_stock'
                             AND o.currency=a.currency) current_price_minor
                   FROM price_alerts a JOIN books b ON b.id=a.book_id
                   WHERE a.user_id=? ORDER BY a.updated_at DESC""",
                (user_id,),
            ).fetchall()
        return [{**dict(row), "is_active": bool(row["is_active"])} for row in rows]


    def delete_price_alert(
        self, user_id: str, book_id: str, access_token: str | None = None,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                "DELETE FROM price_alerts WHERE user_id=? AND book_id=?", (user_id, book_id)
            )


    def evaluate_price_alerts(self) -> int:
        now = datetime.now(timezone.utc).isoformat()
        notifications_created = 0
        with self.connect() as connection:
            candidates = connection.execute(
                """SELECT a.user_id,a.book_id,a.target_price_minor,a.currency,
                          a.last_notified_price_minor,b.title,min(o.price_minor) current_price_minor
                   FROM price_alerts a JOIN books b ON b.id=a.book_id
                   JOIN editions e ON e.book_id=a.book_id
                   JOIN offers o ON o.edition_isbn=e.isbn
                   WHERE a.is_active=1 AND o.stock_status='in_stock' AND o.currency=a.currency
                   GROUP BY a.user_id,a.book_id,a.target_price_minor,a.currency,
                            a.last_notified_price_minor,b.title
                   HAVING current_price_minor<=a.target_price_minor AND
                          (a.last_notified_price_minor IS NULL OR
                           current_price_minor<a.last_notified_price_minor)"""
            ).fetchall()
            for candidate in candidates:
                payload = {
                    "price_minor": candidate["current_price_minor"],
                    "target_price_minor": candidate["target_price_minor"],
                    "currency": candidate["currency"],
                }
                connection.execute(
                    """INSERT INTO notifications(
                           id,user_id,kind,book_id,title,body,payload_json,created_at
                       ) VALUES(?,?,?,?,?,?,?,?)""",
                    (
                        str(uuid4()), candidate["user_id"], "price_drop", candidate["book_id"],
                        "Fiyat hedefinize ulasti",
                        f"{candidate['title']} icin yeni bir fiyat bulundu.",
                        json.dumps(payload, ensure_ascii=False), now,
                    ),
                )
                connection.execute(
                    """UPDATE price_alerts SET last_notified_price_minor=?,updated_at=?
                       WHERE user_id=? AND book_id=?""",
                    (
                        candidate["current_price_minor"], now,
                        candidate["user_id"], candidate["book_id"],
                    ),
                )
                notifications_created += 1
        return notifications_created


    def save_retail_offer(self, offer: dict) -> dict:
        """Fiyatı ve baskı metadata'sını saklar; mağaza açıklamasını saklamaz."""
        restocked = False
        matched_book_id = None
        with self.connect() as connection:
            book = None
            if offer.get("book_id"):
                book = connection.execute("SELECT id FROM books WHERE id=?", (offer["book_id"],)).fetchone()
            if not book:
                book = connection.execute(
                    "SELECT id FROM books WHERE lower(title)=lower(?) LIMIT 1", (offer["canonical_title"],),
                ).fetchone()
            matched_book_id = book["id"] if book else None
            previous_offer = connection.execute(
                "SELECT stock_status FROM offers WHERE edition_isbn=? AND retailer_id=?",
                (offer["isbn"], offer["retailer_id"]),
            ).fetchone()
            restocked = offer["stock_status"] == "in_stock" and bool(
                previous_offer and previous_offer["stock_status"] != "in_stock"
            )
            connection.execute(
                """INSERT INTO retailers(id,name,base_url,robots_url,content_policy) VALUES(?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET name=excluded.name, base_url=excluded.base_url,
                   robots_url=excluded.robots_url, content_policy=excluded.content_policy""",
                (offer["retailer_id"], offer["retailer_name"], offer["base_url"], offer["robots_url"], offer["content_policy"]),
            )
            connection.execute(
                """INSERT INTO editions(isbn,book_id,title,author,publisher,language,source_name,source_url,verification_status,verified_at)
                   VALUES(?,?,?,?,?,'tur',?,?,'retailer_verified',?)
                   ON CONFLICT(isbn) DO UPDATE SET book_id=COALESCE(excluded.book_id,editions.book_id),
                   title=excluded.title, author=excluded.author, publisher=excluded.publisher,
                   language='tur',source_name=excluded.source_name,source_url=excluded.source_url,
                   verification_status='retailer_verified',verified_at=excluded.verified_at""",
                (offer["isbn"], matched_book_id, offer["canonical_title"], offer["author"], offer["publisher"],
                 offer["retailer_name"], offer["product_url"], offer["checked_at"]),
            )
            connection.execute(
                """INSERT INTO offers(edition_isbn,retailer_id,product_url,price_minor,list_price_minor,currency,stock_status,checked_at,content_hash)
                   VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(product_url) DO UPDATE SET price_minor=excluded.price_minor,
                   list_price_minor=excluded.list_price_minor,currency=excluded.currency,stock_status=excluded.stock_status,
                   checked_at=excluded.checked_at,content_hash=excluded.content_hash""",
                (offer["isbn"], offer["retailer_id"], offer["product_url"], offer["price_minor"], offer["list_price_minor"],
                 offer["currency"], offer["stock_status"], offer["checked_at"], offer["content_hash"]),
            )
            row = connection.execute("SELECT id FROM offers WHERE product_url=?", (offer["product_url"],)).fetchone()
            latest = connection.execute(
                "SELECT price_minor,stock_status,observed_at FROM price_history WHERE offer_id=? ORDER BY observed_at DESC LIMIT 1",
                (row["id"],),
            ).fetchone()
            checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
            last_at = datetime.fromisoformat(latest["observed_at"].replace("Z", "+00:00")) if latest else None
            should_record = not latest or latest["price_minor"] != offer["price_minor"] or latest["stock_status"] != offer["stock_status"]
            should_record = should_record or bool(last_at and checked_at - last_at >= timedelta(hours=24))
            if should_record:
                connection.execute(
                    "INSERT INTO price_history(offer_id,price_minor,stock_status,observed_at) VALUES(?,?,?,?)",
                    (row["id"], offer["price_minor"], offer["stock_status"], offer["checked_at"]),
                )
        if restocked and matched_book_id:
            self.notify_edition_subscribers(matched_book_id, "back_in_stock", offer["canonical_title"])
        return {key: offer[key] for key in ("isbn", "canonical_title", "retailer_name", "price_minor", "currency", "stock_status", "product_url", "checked_at")}


    def list_retail_offers(self, book_id: str | None = None, isbn: str | None = None) -> list[dict]:
        where, values = [], []
        if book_id:
            where.append("e.book_id=?")
            values.append(book_id)
        if isbn:
            where.append("e.isbn=?")
            values.append(isbn)
        clause = " WHERE " + " AND ".join(where) if where else ""
        query = """SELECT e.book_id,e.isbn,e.title,e.author,e.publisher,r.name retailer_name,
                   o.product_url,o.price_minor,o.list_price_minor,o.currency,o.stock_status,o.checked_at
                   FROM offers o JOIN editions e ON e.isbn=o.edition_isbn
                   JOIN retailers r ON r.id=o.retailer_id""" + clause + " ORDER BY e.title,o.price_minor"
        with self.connect() as connection:
            offers = [dict(row) for row in connection.execute(query, values)]
        stale_before = datetime.now(timezone.utc) - timedelta(days=7)
        for offer in offers:
            try:
                checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
                if checked_at.tzinfo is None:
                    checked_at = checked_at.replace(tzinfo=timezone.utc)
                offer["is_stale"] = checked_at < stale_before
            except (TypeError, ValueError):
                offer["is_stale"] = True
        return offers


    def list_book_price_history(self, book_id: str, limit: int = 90) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT ph.price_minor,ph.stock_status,ph.observed_at,r.name retailer_name,
                          o.currency,o.product_url
                   FROM price_history ph JOIN offers o ON o.id=ph.offer_id
                   JOIN editions e ON e.isbn=o.edition_isbn
                   JOIN retailers r ON r.id=o.retailer_id
                   WHERE e.book_id=? ORDER BY ph.observed_at DESC LIMIT ?""",
                (book_id, limit),
            ).fetchall()
        return [dict(row) for row in rows]


    def create_pipeline_run(self, idempotency_key: str, job_type: str, orchestrator: str = "manual",
                            trigger_kind: str = "manual") -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self.connect() as connection:
            existing = connection.execute(
                "SELECT * FROM data_pipeline_runs WHERE idempotency_key=?", (idempotency_key,)
            ).fetchone()
            if existing:
                return {**dict(existing), "report": json.loads(existing["report_json"]), "duplicate": True}
            run_id = str(uuid4())
            connection.execute(
                """INSERT INTO data_pipeline_runs(id,idempotency_key,job_type,orchestrator,trigger_kind,status,started_at)
                   VALUES(?,?,?,?,?,'running',?)""",
                (run_id, idempotency_key, job_type, orchestrator, trigger_kind, now),
            )
            row = connection.execute("SELECT * FROM data_pipeline_runs WHERE id=?", (run_id,)).fetchone()
        return {**dict(row), "report": {}, "duplicate": False}


    def log_pipeline_event(self, run_id: str, level: str, stage: str, message: str,
                           context: dict | None = None) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO data_pipeline_logs(id,run_id,level,stage,message,context_json,created_at) VALUES(?,?,?,?,?,?,?)",
                (str(uuid4()), run_id, level, stage, message, json.dumps(context or {}, ensure_ascii=False),
                 datetime.now(timezone.utc).isoformat()),
            )


    def finish_pipeline_run(self, run_id: str, status: str, report: dict) -> dict:
        checked = int(report.get("checked", report.get("refreshed", 0) + report.get("discovered", 0) + report.get("not_found", 0)))
        success = int(report.get("success", report.get("refreshed", 0) + report.get("discovered", 0)))
        failure = int(report.get("failure", len(report.get("errors", []))))
        with self.connect() as connection:
            connection.execute(
                """UPDATE data_pipeline_runs SET status=?,checked_count=?,success_count=?,failure_count=?,
                   finished_at=?,report_json=? WHERE id=?""",
                (status, checked, success, failure, datetime.now(timezone.utc).isoformat(),
                 json.dumps(report, ensure_ascii=False), run_id),
            )
            row = connection.execute("SELECT * FROM data_pipeline_runs WHERE id=?", (run_id,)).fetchone()
        return {**dict(row), "report": json.loads(row["report_json"])}


    def list_pipeline_runs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute("SELECT * FROM data_pipeline_runs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [{**dict(row), "report": json.loads(row["report_json"])} for row in rows]


    def list_pipeline_logs(self, limit: int = 100, run_id: str | None = None,
                           access_token: str | None = None) -> list[dict]:
        with self.connect() as connection:
            if run_id:
                rows = connection.execute(
                    "SELECT * FROM data_pipeline_logs WHERE run_id=? ORDER BY created_at DESC LIMIT ?", (run_id, limit)
                ).fetchall()
            else:
                rows = connection.execute("SELECT * FROM data_pipeline_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [{**dict(row), "context": json.loads(row["context_json"])} for row in rows]


    def replace_price_forecasts(self, book_id: str, forecasts: list[dict]) -> int:
        if not forecasts:
            return 0
        version = forecasts[0]["model_version"]
        with self.connect() as connection:
            connection.execute("DELETE FROM price_forecasts WHERE book_id=? AND model_version=?", (book_id, version))
            connection.executemany(
                """INSERT INTO price_forecasts(book_id,forecast_date,predicted_price_minor,lower_price_minor,
                   upper_price_minor,drop_probability,model_name,model_version,trained_through,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                [(book_id, row["forecast_date"], row["predicted_price_minor"], row["lower_price_minor"],
                  row["upper_price_minor"], row["drop_probability"], row["model_name"], row["model_version"],
                  row["trained_through"], datetime.now(timezone.utc).isoformat()) for row in forecasts],
            )
        return len(forecasts)


    def list_book_price_forecasts(self, book_id: str) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM price_forecasts WHERE book_id=? AND forecast_date>=date('now') ORDER BY forecast_date LIMIT 15",
                (book_id,),
            ).fetchall()
        return [dict(row) for row in rows]

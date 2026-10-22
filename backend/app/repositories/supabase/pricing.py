"""Mağaza teklifleri, fiyat hattı ve fiyat alarmları."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from app.repositories.supabase.base import SupabaseRequestError

class SupabasePricingMixin:
    def list_retail_offers(self, book_id: str | None = None, isbn: str | None = None) -> list[dict]:
        params: dict[str, Any] = {
            "select": (
                "product_url,price_minor,list_price_minor,currency,stock_status,checked_at,"
                "edition:editions!inner(book_id,isbn,title,author,publisher),"
                "retailer:retailers!inner(name)"
            ),
            "order": "price_minor.asc",
            "limit": 1000,
        }
        if book_id:
            params["edition.book_id"] = f"eq.{book_id}"
        if isbn:
            params["edition.isbn"] = f"eq.{isbn}"
        rows = self._request("GET", "/rest/v1/offers", params=params).json()
        stale_before = datetime.now(timezone.utc) - timedelta(days=7)
        result = []
        for row in rows:
            edition, retailer = row["edition"], row["retailer"]
            try:
                checked_at = datetime.fromisoformat(row["checked_at"].replace("Z", "+00:00"))
                if checked_at.tzinfo is None:
                    checked_at = checked_at.replace(tzinfo=timezone.utc)
                is_stale = checked_at < stale_before
            except (AttributeError, TypeError, ValueError):
                is_stale = True
            result.append(
                {
                    "book_id": edition.get("book_id"),
                    "isbn": edition["isbn"],
                    "title": edition["title"],
                    "author": edition.get("author"),
                    "publisher": edition.get("publisher"),
                    "retailer_name": retailer["name"],
                    "product_url": row["product_url"],
                    "price_minor": row["price_minor"],
                    "list_price_minor": row.get("list_price_minor"),
                    "currency": row["currency"],
                    "stock_status": row["stock_status"],
                    "checked_at": row["checked_at"],
                    "is_stale": is_stale,
                }
            )
        return result


    def list_book_price_history(self, book_id: str, limit: int = 90) -> list[dict]:
        rows = self._request(
            "GET", "/rest/v1/price_history",
            params={
                "select": (
                    "price_minor,stock_status,observed_at,"
                    "offer:offers!inner(currency,product_url,retailer:retailers!inner(name),"
                    "edition:editions!inner(book_id))"
                ),
                "offer.edition.book_id": f"eq.{book_id}",
                "order": "observed_at.desc",
                "limit": min(max(limit, 1), 365),
            },
        ).json()
        return [{
            "price_minor": row["price_minor"], "stock_status": row["stock_status"],
            "observed_at": row["observed_at"], "currency": row["offer"]["currency"],
            "product_url": row["offer"]["product_url"],
            "retailer_name": row["offer"]["retailer"]["name"],
        } for row in rows]


    def list_offer_urls(self, retailer_ids: list[str] | None = None) -> list[str]:
        params: dict[str, Any] = {"select": "product_url", "limit": 1000}
        if retailer_ids: params["retailer_id"] = f"in.({','.join(retailer_ids)})"
        return [row["product_url"] for row in self._request("GET", "/rest/v1/offers", admin=True, params=params).json()]


    def list_unpriced_books(self, limit: int = 20) -> list[dict]:
        priced = self._request("GET", "/rest/v1/offers", admin=True,
            params={"select": "edition:editions!inner(book_id)", "limit": 5000}).json()
        priced_ids = {row["edition"]["book_id"] for row in priced if row.get("edition") and row["edition"].get("book_id")}
        rows = self.list_books()
        return [book for book in rows if book["id"] not in priced_ids][:limit]


    def save_retail_offer(self, offer: dict) -> dict:
        self._request("POST", "/rest/v1/retailers", admin=True, params={"on_conflict": "id"}, json_body={
            "id": offer["retailer_id"], "name": offer["retailer_name"], "base_url": offer["base_url"],
            "robots_url": offer["robots_url"], "content_policy": offer["content_policy"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        existing_editions = self._request("GET", "/rest/v1/editions", admin=True,
            params={"select": "book_id", "isbn": f"eq.{offer['isbn']}", "limit": 1}).json()
        book_id = offer.get("book_id") or (existing_editions[0].get("book_id") if existing_editions else None)
        if not book_id:
            match = self._request("GET", "/rest/v1/books", admin=True,
                params={"select": "id", "title": f"eq.{offer['canonical_title']}", "limit": 1}).json()
            book_id = match[0]["id"] if match else None
        self._request("POST", "/rest/v1/editions", admin=True, params={"on_conflict": "isbn"}, json_body={
            "isbn": offer["isbn"], "isbn13": offer["isbn"], "book_id": book_id, "title": offer["canonical_title"],
            "author": offer.get("author"), "publisher": offer.get("publisher"), "language": "tur",
            "source_name": offer["retailer_name"], "source_url": offer["product_url"],
            "verification_status": "retailer_verified", "verified_at": offer["checked_at"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        rows = self._request("POST", "/rest/v1/offers", admin=True, params={"on_conflict": "edition_isbn,retailer_id"}, json_body={
            "edition_isbn": offer["isbn"], "retailer_id": offer["retailer_id"], "product_url": offer["product_url"],
            "price_minor": offer["price_minor"], "list_price_minor": offer.get("list_price_minor"), "currency": offer["currency"],
            "stock_status": offer["stock_status"], "checked_at": offer["checked_at"], "content_hash": offer["content_hash"]},
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}).json()
        if rows:
            latest_rows = self._request("GET", "/rest/v1/price_history", admin=True, params={
                "select": "price_minor,stock_status,observed_at", "offer_id": f"eq.{rows[0]['id']}",
                "order": "observed_at.desc", "limit": 1,
            }).json()
            latest = latest_rows[0] if latest_rows else None
            checked_at = datetime.fromisoformat(offer["checked_at"].replace("Z", "+00:00"))
            last_at = datetime.fromisoformat(latest["observed_at"].replace("Z", "+00:00")) if latest else None
            should_record = not latest or latest["price_minor"] != offer["price_minor"] or latest["stock_status"] != offer["stock_status"]
            should_record = should_record or bool(last_at and checked_at - last_at >= timedelta(hours=24))
            if should_record:
                self._request("POST", "/rest/v1/price_history", admin=True,
                    json_body={"offer_id": rows[0]["id"], "price_minor": offer["price_minor"], "stock_status": offer["stock_status"],
                               "observed_at": offer["checked_at"]}, extra_headers={"Prefer": "return=minimal"})
        return {key: offer[key] for key in ("isbn", "canonical_title", "retailer_name", "price_minor", "currency", "stock_status", "product_url", "checked_at")}


    def create_pipeline_run(self, idempotency_key: str, job_type: str, orchestrator: str = "manual",
                            trigger_kind: str = "manual") -> dict:
        existing = self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "idempotency_key": f"eq.{idempotency_key}", "limit": 1,
        }).json()
        if existing:
            return {**existing[0], "duplicate": True}
        rows = self._request("POST", "/rest/v1/data_pipeline_runs", admin=True,
        params={"on_conflict": "idempotency_key"}, json_body={
            "idempotency_key": idempotency_key, "job_type": job_type, "orchestrator": orchestrator,
            "trigger_kind": trigger_kind, "status": "running",
        }, extra_headers={"Prefer": "resolution=ignore-duplicates,return=representation"}).json()
        if rows:
            return {**rows[0], "duplicate": False}
        existing = self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "idempotency_key": f"eq.{idempotency_key}", "limit": 1,
        }).json()
        return {**existing[0], "duplicate": True}


    def log_pipeline_event(self, run_id: str, level: str, stage: str, message: str,
                           context: dict | None = None) -> None:
        self._request("POST", "/rest/v1/data_pipeline_logs", admin=True, json_body={
            "run_id": run_id, "level": level, "stage": stage, "message": message, "context": context or {},
        }, extra_headers={"Prefer": "return=minimal"})


    def finish_pipeline_run(self, run_id: str, status: str, report: dict) -> dict:
        checked = int(report.get("checked", report.get("refreshed", 0) + report.get("discovered", 0) + report.get("not_found", 0)))
        success = int(report.get("success", report.get("refreshed", 0) + report.get("discovered", 0)))
        failure = int(report.get("failure", len(report.get("errors", []))))
        rows = self._request("PATCH", "/rest/v1/data_pipeline_runs", admin=True,
            params={"id": f"eq.{run_id}"}, json_body={"status": status, "checked_count": checked,
            "success_count": success, "failure_count": failure, "finished_at": datetime.now(timezone.utc).isoformat(),
            "report": report}, extra_headers={"Prefer": "return=representation"}).json()
        return rows[0]


    def list_pipeline_runs(self, limit: int = 50, access_token: str | None = None) -> list[dict]:
        return self._request("GET", "/rest/v1/data_pipeline_runs", admin=True, params={
            "select": "*", "order": "started_at.desc", "limit": min(max(limit, 1), 200),
        }).json()


    def list_pipeline_logs(self, limit: int = 100, run_id: str | None = None,
                           access_token: str | None = None) -> list[dict]:
        params: dict[str, Any] = {"select": "*", "order": "created_at.desc", "limit": min(max(limit, 1), 500)}
        if run_id:
            params["run_id"] = f"eq.{run_id}"
        return self._request("GET", "/rest/v1/data_pipeline_logs", admin=True, params=params).json()


    def replace_price_forecasts(self, book_id: str, forecasts: list[dict]) -> int:
        if not forecasts:
            return 0
        version = forecasts[0]["model_version"]
        self._request("DELETE", "/rest/v1/price_forecasts", admin=True,
                      params={"book_id": f"eq.{book_id}", "model_version": f"eq.{version}"})
        payload = [{**row, "book_id": book_id} for row in forecasts]
        self._request("POST", "/rest/v1/price_forecasts", admin=True, json_body=payload,
                      extra_headers={"Prefer": "return=minimal"})
        return len(payload)


    def list_book_price_forecasts(self, book_id: str) -> list[dict]:
        return self._request("GET", "/rest/v1/price_forecasts", params={
            "select": "*", "book_id": f"eq.{book_id}", "forecast_date": f"gte.{datetime.now(timezone.utc).date()}",
            "order": "forecast_date.asc", "limit": 15,
        }).json()


    def upsert_price_alert(
        self, user_id: str, book_id: str, target_price_minor: int,
        currency: str = "TRY", is_active: bool = True,
        access_token: str | None = None,
    ) -> dict:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "POST", "/rest/v1/price_alerts", token=access_token,
            params={"on_conflict": "user_id,book_id"},
            json_body={
                "user_id": user_id, "book_id": book_id,
                "target_price_minor": target_price_minor,
                "currency": currency, "is_active": is_active,
                "last_notified_price_minor": None,
            },
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        ).json()
        if not rows:
            raise SupabaseRequestError("Fiyat alarmi kaydedilemedi.", 409)
        return rows[0]


    def list_price_alerts(self, user_id: str, access_token: str | None = None) -> list[dict]:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        rows = self._request(
            "GET", "/rest/v1/price_alerts", token=access_token,
            params={
                "select": "*,book:books!inner(id,title,author,cover_url)",
                "user_id": f"eq.{user_id}", "order": "updated_at.desc", "limit": 1000,
            },
        ).json()
        lowest_prices: dict[str, int] = {}
        for offer in self.list_retail_offers():
            if offer["stock_status"] != "in_stock" or not offer.get("book_id"):
                continue
            book_id = offer["book_id"]
            lowest_prices[book_id] = min(lowest_prices.get(book_id, offer["price_minor"]), offer["price_minor"])
        return [{
            **{key: value for key, value in row.items() if key != "book"},
            **row["book"], "current_price_minor": lowest_prices.get(row["book_id"]),
        } for row in rows]


    def delete_price_alert(
        self, user_id: str, book_id: str, access_token: str | None = None,
    ) -> None:
        if not access_token:
            raise SupabaseRequestError("Oturum acmaniz gerekiyor.", 401)
        self._request(
            "DELETE", "/rest/v1/price_alerts", token=access_token,
            params={"user_id": f"eq.{user_id}", "book_id": f"eq.{book_id}"},
        )


    def evaluate_price_alerts(self) -> int:
        rows = self._request(
            "POST", "/rest/v1/rpc/evaluate_price_alerts", admin=True, json_body={}
        ).json()
        return int(rows or 0)

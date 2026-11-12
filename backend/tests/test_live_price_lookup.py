"""Kitap açıldığında çalışan canlı mağaza fiyatı araması."""
from datetime import timedelta

import pytest

from app.services.pricing import live_lookup
from app.services.pricing.live_lookup import (
    LiveLookupBusy, LivePriceLookups, StorePacer, idle_snapshot, known_offer_urls, lookup_retailer,
)


BOOK = {"id": "suc-ve-ceza", "title": "Suç ve Ceza", "author": "Fyodor Dostoyevski", "isbn": "9789750719387"}


def offer(retailer_id: str = "kitapsec", price_minor: int = 24900) -> dict:
    return {"retailer_id": retailer_id, "retailer_name": live_lookup.RETAILER_NAMES[retailer_id],
            "isbn": BOOK["isbn"], "canonical_title": BOOK["title"], "price_minor": price_minor,
            "currency": "TRY", "stock_status": "in_stock",
            "product_url": f"https://www.{retailer_id}.com/urun-1", "book_id": BOOK["id"]}


class FakeRepository:
    """Canlı aramanın dokunduğu üç uç: kayıtlı teklifler, kayıt ve hata günlüğü."""

    def __init__(self, stored: list[dict] | None = None) -> None:
        self.stored = stored or []
        self.saved: list[dict] = []
        self.events: list[dict] = []

    def list_retail_offers(self, book_id=None, isbn=None) -> list[dict]:
        return list(self.stored)

    def save_retail_offer(self, value: dict) -> dict:
        self.saved.append(value)
        return value

    def application_event(self, level, event_type, **kwargs) -> None:
        self.events.append({"level": level, "event_type": event_type, **kwargs})


def lookups(finder, **kwargs) -> LivePriceLookups:
    return LivePriceLookups(retailers=("kitapsec", "kitapsepeti"), finder=finder,
                            pacer=StorePacer(gap=0, sleep=lambda _: None),
                            spawn=live_lookup.inline_spawn, **kwargs)


def test_each_retailer_is_reported_and_found_prices_are_saved() -> None:
    def finder(book, retailer_id, known_url):
        if retailer_id == "kitapsec":
            return {"state": "found", "message": None, "offer": offer()}
        return {"state": "missing", "message": "Bu kitap mağazada bulunamadı"}

    repository = FakeRepository()
    snapshot = lookups(finder).start(repository, BOOK)

    assert snapshot["status"] == "done"
    assert snapshot["found"] == 1
    states = {step["retailer_id"]: step["state"] for step in snapshot["retailers"]}
    assert states == {"kitapsec": "found", "kitapsepeti": "missing"}
    found = next(step for step in snapshot["retailers"] if step["state"] == "found")
    assert (found["price_minor"], found["currency"]) == (24900, "TRY")
    assert found["product_url"] == offer()["product_url"]
    assert [saved["isbn"] for saved in repository.saved] == [BOOK["isbn"]]


def test_known_product_page_is_passed_to_the_finder_so_no_search_is_needed() -> None:
    seen = {}

    def finder(book, retailer_id, known_url):
        seen[retailer_id] = known_url
        return {"state": "missing", "message": "yok"}

    stored = [{"retailer_name": "Kitapseç", "product_url": "https://www.kitapsec.com/Products/x-1.html"}]
    lookups(finder).start(FakeRepository(stored), BOOK)
    assert seen == {"kitapsec": "https://www.kitapsec.com/Products/x-1.html", "kitapsepeti": None}


def test_recent_result_is_reused_instead_of_asking_the_stores_again() -> None:
    calls = []

    def finder(book, retailer_id, known_url):
        calls.append(retailer_id)
        return {"state": "missing", "message": "yok"}

    manager = lookups(finder)
    repository = FakeRepository()
    manager.start(repository, BOOK)
    again = manager.start(repository, BOOK)

    assert len(calls) == 2
    assert again["status"] == "done"



def test_manual_refresh_may_search_again_sooner_than_the_automatic_one() -> None:
    calls = []

    def finder(book, retailer_id, known_url):
        calls.append(retailer_id)
        return {"state": "missing", "message": "yok"}

    manager = lookups(finder)
    repository = FakeRepository()
    manager.start(repository, BOOK)
    manager.start(repository, BOOK)
    assert len(calls) == 2
    manager.start(repository, BOOK, fresh_for=timedelta(0))
    assert len(calls) == 4

def test_old_result_is_refreshed_and_dropped_after_its_lifetime() -> None:
    def finder(book, retailer_id, known_url):
        return {"state": "missing", "message": "yok"}

    manager = lookups(finder, fresh_for=timedelta(0), result_ttl=timedelta(0))
    repository = FakeRepository()
    manager.start(repository, BOOK)
    assert manager.start(repository, BOOK)["status"] == "done"
    assert manager.snapshot("baska-kitap") is None


def test_store_failure_becomes_a_step_state_and_is_logged() -> None:
    def finder(book, retailer_id, known_url):
        if retailer_id == "kitapsec":
            raise RuntimeError("bağlantı koptu")
        return {"state": "blocked", "message": "Mağaza otomatik aramaya kapalı"}

    repository = FakeRepository()
    snapshot = lookups(finder).start(repository, BOOK)

    states = {step["retailer_id"]: step["state"] for step in snapshot["retailers"]}
    assert states == {"kitapsec": "error", "kitapsepeti": "blocked"}
    assert repository.events[0]["event_type"] == "live_price_lookup"


def test_queue_is_capped_so_the_stores_are_not_flooded() -> None:
    manager = lookups(lambda *args: {"state": "missing", "message": "yok"}, max_waiting=0)
    with pytest.raises(LiveLookupBusy):
        manager.start(FakeRepository(), BOOK)


def test_pacer_waits_between_two_requests_to_the_same_store() -> None:
    slept, clock = [], iter([0.0, 0.0, 1.0, 1.0, 9.0, 9.0])
    pacer = StorePacer(gap=4.0, sleep=slept.append, clock=lambda: next(clock))
    for _ in range(3):
        with pacer.slot("kitapsec"):
            pass
    assert slept == [3.0]


def test_lookup_turns_a_policy_refusal_into_a_blocked_step(monkeypatch) -> None:
    def refuse(*args, **kwargs):
        raise live_lookup.RetailerPolicyError("robots.txt mağaza arama yoluna izin vermiyor.")

    monkeypatch.setattr(live_lookup, "discover_offer", refuse)
    result = lookup_retailer(BOOK, "kitapsec")
    assert result == {"state": "blocked", "message": "robots.txt mağaza arama yoluna izin vermiyor."}


def test_lookup_falls_back_to_search_when_the_known_page_is_another_book(monkeypatch) -> None:
    monkeypatch.setattr(live_lookup, "fetch_offer", lambda url: {**offer(), "isbn": "9789750000000"})
    monkeypatch.setattr(live_lookup, "discover_offer", lambda *args, **kwargs: offer(price_minor=19900))
    result = lookup_retailer(BOOK, "kitapsec", known_url="https://www.kitapsec.com/Products/x-1.html")
    assert result["state"] == "found" and result["offer"]["price_minor"] == 19900


def test_offer_without_a_price_counts_as_not_found(monkeypatch) -> None:
    monkeypatch.setattr(live_lookup, "discover_offer", lambda *args, **kwargs: {**offer(), "price_minor": None})
    monkeypatch.setattr(live_lookup, "discover_offer_for_book", lambda *args, **kwargs: None)
    assert lookup_retailer(BOOK, "kitapsec")["state"] == "missing"


def test_idle_snapshot_lists_every_store_before_the_first_search() -> None:
    snapshot = idle_snapshot(BOOK["id"])
    assert snapshot["status"] == "idle"
    assert [step["retailer_id"] for step in snapshot["retailers"]] == list(live_lookup.LIVE_RETAILERS)
    assert all(step["state"] == "pending" for step in snapshot["retailers"])


def test_known_offer_urls_maps_store_names_to_identifiers() -> None:
    repository = FakeRepository([
        {"retailer_name": "BKM Kitap", "product_url": "https://www.bkmkitap.com/kitap-1"},
        {"retailer_name": "Bilinmeyen", "product_url": "https://example.com/x"},
    ])
    assert known_offer_urls(repository, BOOK["id"]) == {"bkmkitap": "https://www.bkmkitap.com/kitap-1"}


# --- HTTP uçları -------------------------------------------------------------

MOBILE = {"X-Mihenk-Client": "mobile"}


def _signed_in_client():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    from app.main import app
    client = TestClient(app)
    registered = client.post("/auth/register", headers=MOBILE, json={
        "display_name": "Fiyat", "email": f"fiyat-{uuid4().hex[:8]}@example.com", "password": "en-az-sekiz"})
    assert registered.status_code == 201
    return client, {**MOBILE, "Authorization": f"Bearer {registered.headers['x-session-access-token']}"}


def test_live_offer_endpoints_need_a_session_and_a_real_book() -> None:
    client, headers = _signed_in_client()
    assert client.get("/books/suc-ve-ceza/offers/live").status_code == 401
    assert client.post("/books/yok-boyle-kitap/offers/live", headers=headers).status_code == 404
    idle = client.get("/books/suc-ve-ceza/offers/live", headers=headers).json()
    assert idle["status"] == "idle" and len(idle["retailers"]) == len(live_lookup.LIVE_RETAILERS)


def test_starting_a_lookup_reports_progress_without_touching_the_stores(monkeypatch) -> None:
    from app import runtime

    manager = lookups(lambda book, retailer_id, known_url: {"state": "found", "message": None, "offer": offer()})
    monkeypatch.setattr(runtime, "live_lookups", manager)
    monkeypatch.setattr("app.routers.pricing.live_lookups", manager, raising=False)
    client, headers = _signed_in_client()

    started = client.post("/books/suc-ve-ceza/offers/live", headers=headers)
    assert started.status_code == 202
    assert started.json()["found"] == len(started.json()["retailers"])
    assert client.get("/books/suc-ve-ceza/offers/live", headers=headers).json()["status"] == "done"

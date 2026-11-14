"""Tek kitabın mağaza fiyatlarını canlı arayan, adım adım ilerleyen iş.

Günlük toplu hattan (``price_pipeline``) farkı: kişi kitabı açtığında çalışır,
sonucu beklemeden döner ve arayüz mağaza mağaza ilerlemeyi okur. Mağazalar
birbirini beklemeden aranır, böylece arama dakikalar değil saniyeler sürer.

Mağazalara yük bindirmemek için:

- aynı mağazaya iki istek arasında en az ``STORE_GAP`` saniye bırakılır,
- aynı anda en çok ``MAX_ACTIVE`` kitap aranır, fazlası sıraya girer,
- son ``FRESH_FOR`` içinde aranmış kitap yeniden aranmaz, son sonuç döner,
- yalnızca robots.txt'in izin verdiği mağazalar aranır; politika denetimi
  ``retailer_offers`` ve ``retailer_discovery`` katmanlarındadır.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import requests

from app.services.pricing.dynamic_browser import DynamicBrowserUnavailable
from app.services.pricing.retailer_discovery import discover_offer, discover_offer_for_book, same_book
from app.services.pricing.retailer_offers import RETAILERS, RetailerPolicyError, fetch_offer


LIVE_RETAILERS = ("kitapsec", "kitapsepeti", "bkmkitap")
FRESH_FOR = timedelta(hours=6)
MANUAL_FRESH_FOR = timedelta(minutes=10)
RESULT_TTL = FRESH_FOR
MAX_REMEMBERED = 300
STORE_GAP = 4.0
MAX_ACTIVE = 2
MAX_WAITING = 6
MAX_CANDIDATES = 3

RETAILER_NAMES = {retailer["id"]: retailer["name"] for retailer in RETAILERS.values()}
RETAILER_IDS = {retailer["name"]: retailer["id"] for retailer in RETAILERS.values()}

MESSAGES = {
    "pending": "Sıra bekliyor",
    "searching": "Aranıyor…",
    "missing": "Bu kitap mağazada bulunamadı",
    "blocked": "Mağaza otomatik aramaya kapalı",
    "error": "Mağazaya ulaşılamadı",
}


class LiveLookupBusy(RuntimeError):
    """Sıra dolu; kişiye birazdan tekrar denemesi söylenir."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _isbn(book: dict) -> str:
    return "".join(character for character in str(book.get("isbn") or "") if character.isalnum())


def _matches(book: dict, offer: dict) -> bool:
    isbn = _isbn(book)
    return offer["isbn"] == isbn if isbn else same_book(book, offer)


def _discover(book: dict, retailer_id: str, max_candidates: int) -> dict | None:
    """Önce ISBN ile, ISBN yoksa ya da tutmazsa kitap adıyla arar."""
    isbn = _isbn(book)
    if isbn:
        edition = {"isbn": isbn, "book_title": book["title"]}
        offer = discover_offer(edition, retailer_id, max_candidates=max_candidates)
        if offer:
            return {**offer, "book_id": book["id"]}
    return discover_offer_for_book(book, retailer_id, max_candidates=max_candidates)


def lookup_retailer(book: dict, retailer_id: str, known_url: str | None = None,
                    max_candidates: int = MAX_CANDIDATES) -> dict:
    """Bir mağazada tek kitabı arar; ağ ve politika hatalarını adım durumuna çevirir.

    Daha önce bulunmuş ürün sayfası varsa önce o okunur (arama yapılmaz); sayfa
    kaybolmuşsa ya da başka bir kitaba aitse aramaya düşülür.
    """
    try:
        offer = None
        if known_url:
            try:
                candidate = fetch_offer(known_url)
            except (ValueError, requests.RequestException):
                candidate = None
            if candidate and _matches(book, candidate):
                offer = {**candidate, "book_id": book["id"]}
        if offer is None:
            offer = _discover(book, retailer_id, max_candidates)
    except RetailerPolicyError as error:
        return {"state": "blocked", "message": str(error) or MESSAGES["blocked"]}
    except DynamicBrowserUnavailable:
        return {"state": "error", "message": "Mağaza araması şu an yapılamıyor"}
    except requests.RequestException:
        return {"state": "error", "message": MESSAGES["error"]}
    except ValueError:
        return {"state": "error", "message": "Mağaza sayfası okunamadı"}
    if not offer or offer.get("price_minor") is None:
        return {"state": "missing", "message": MESSAGES["missing"]}
    return {"state": "found", "message": None, "offer": offer}


def known_offer_urls(repository, book_id: str) -> dict[str, str]:
    """Kitap için daha önce bulunmuş ürün sayfaları: mağaza kimliğine göre."""
    urls: dict[str, str] = {}
    for offer in repository.list_retail_offers(book_id=book_id):
        retailer_id = RETAILER_IDS.get(offer.get("retailer_name"))
        if retailer_id and offer.get("product_url"):
            urls.setdefault(retailer_id, offer["product_url"])
    return urls


class StorePacer:
    """Aynı mağazaya iki istek arasında en az ``gap`` saniye bırakır.

    Farklı mağazalar birbirini beklemez; aynı mağazaya aynı anda yalnızca tek
    arama gider, böylece eşzamanlı kitap aramaları bir mağazayı yormaz.
    """

    def __init__(self, gap: float = STORE_GAP, sleep=time.sleep, clock=time.monotonic) -> None:
        self._gap, self._sleep, self._clock = gap, sleep, clock
        self._locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
        self._guard = threading.Lock()
        self._last: dict[str, float] = {}

    @contextmanager
    def slot(self, retailer_id: str):
        with self._guard:
            lock = self._locks[retailer_id]
        with lock:
            elapsed = self._clock() - self._last.get(retailer_id, float("-inf"))
            if elapsed < self._gap:
                self._sleep(self._gap - elapsed)
            try:
                yield
            finally:
                self._last[retailer_id] = self._clock()


def spawn_thread(target):
    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    return thread


class _Finished:
    def join(self) -> None:
        return None


def inline_spawn(target):
    """Testlerde kullanılır: işi arka plana atmadan hemen çalıştırır."""
    target()
    return _Finished()


class LivePriceLookups:
    """Kitap bazında canlı aramaları başlatır, durumlarını tutar, eskiyeni atar."""

    def __init__(self, *, retailers=LIVE_RETAILERS, finder=lookup_retailer, pacer: StorePacer | None = None,
                 max_active: int = MAX_ACTIVE, max_waiting: int = MAX_WAITING,
                 fresh_for: timedelta = FRESH_FOR, result_ttl: timedelta = RESULT_TTL, spawn=spawn_thread) -> None:
        self._retailers = tuple(retailers)
        self._finder, self._spawn = finder, spawn
        self._pacer = pacer or StorePacer()
        self._slots = threading.BoundedSemaphore(max_active)
        self._max_waiting, self._fresh_for, self._result_ttl = max_waiting, fresh_for, result_ttl
        self._guard = threading.Lock()
        self._lookups: dict[str, dict] = {}

    def snapshot(self, book_id: str) -> dict | None:
        with self._guard:
            lookup = self._lookups.get(book_id)
        return self._view(lookup) if lookup else None

    def start(self, repository, book: dict, fresh_for: timedelta | None = None) -> dict:
        """Kitabı aramaya alır; süren ya da yeterince yeni bir arama varsa onu döner.

        ``fresh_for`` kişi "yenile" dediğinde kısalır: aynı kitap on dakikada
        birden sık mağazalara sorulmaz.
        """
        now = _now()
        reuse_for = self._fresh_for if fresh_for is None else fresh_for
        with self._guard:
            self._prune(now)
            current = self._lookups.get(book["id"])
            if current and (current["status"] != "done" or now - current["finished_at"] < reuse_for):
                return self._view(current)
            waiting = sum(1 for lookup in self._lookups.values() if lookup["status"] != "done")
            if waiting >= self._max_waiting:
                raise LiveLookupBusy("Şu anda çok sayıda fiyat araması sürüyor. Birkaç dakika sonra dener misin?")
            lookup = self._new(book["id"], now)
            self._lookups[book["id"]] = lookup
        self._spawn(lambda: self._run(repository, book, lookup))
        return self._view(lookup)

    def _new(self, book_id: str, now: datetime) -> dict:
        return {
            "book_id": book_id, "status": "waiting", "started_at": now, "finished_at": None,
            "lock": threading.Lock(),
            "steps": {retailer_id: {"retailer_id": retailer_id, "retailer_name": RETAILER_NAMES[retailer_id],
                                    "state": "pending", "message": MESSAGES["pending"], "price_minor": None,
                                    "currency": None, "product_url": None, "stock_status": None}
                      for retailer_id in self._retailers},
        }

    def _prune(self, now: datetime) -> None:
        """Eski sonuçları unutur; bellek kitap sayısıyla birlikte büyümesin."""
        finished = [(lookup["finished_at"], book_id) for book_id, lookup in self._lookups.items()
                    if lookup["status"] == "done"]
        stale = {book_id for when, book_id in finished if now - when > self._result_ttl}
        overflow = max(0, len(self._lookups) - len(stale) - MAX_REMEMBERED)
        stale.update(book_id for _, book_id in sorted(finished)[:overflow])
        for book_id in stale:
            self._lookups.pop(book_id, None)

    def _run(self, repository, book: dict, lookup: dict) -> None:
        with self._slots:
            known = self._known(repository, book["id"])
            self._patch(lookup, None, {"status": "running"})
            workers = [self._spawn(lambda retailer_id=retailer_id: self._step(repository, book, lookup, retailer_id,
                                                                              known.get(retailer_id)))
                       for retailer_id in self._retailers]
            for worker in workers:
                worker.join()
        self._patch(lookup, None, {"status": "done", "finished_at": _now()})

    def _known(self, repository, book_id: str) -> dict[str, str]:
        try:
            return known_offer_urls(repository, book_id)
        except Exception:  # noqa: BLE001 - kayıtlı URL okunamazsa arama yine yapılır
            return {}

    def _step(self, repository, book: dict, lookup: dict, retailer_id: str, known_url: str | None) -> None:
        self._patch(lookup, retailer_id, {"state": "searching", "message": MESSAGES["searching"]})
        try:
            with self._pacer.slot(retailer_id):
                result = self._finder(book, retailer_id, known_url)
        except Exception as error:  # noqa: BLE001 - tek mağazanın hatası aramayı düşürmez
            self._report(repository, book, retailer_id, error)
            result = {"state": "error", "message": MESSAGES["error"]}
        offer = result.pop("offer", None)
        if offer:
            result.update(self._save(repository, book, retailer_id, offer))
        self._patch(lookup, retailer_id, result)

    def _save(self, repository, book: dict, retailer_id: str, offer: dict) -> dict:
        try:
            repository.save_retail_offer(offer)
        except Exception as error:  # noqa: BLE001 - kayıt başarısızsa fiyat yine gösterilir
            self._report(repository, book, retailer_id, error)
        return {"price_minor": offer["price_minor"], "currency": offer.get("currency", "TRY"),
                "product_url": offer["product_url"], "stock_status": offer.get("stock_status")}

    def _report(self, repository, book: dict, retailer_id: str, error: Exception) -> None:
        try:
            repository.application_event(
                "error", "live_price_lookup", route=f"/books/{book['id']}/offers/live",
                details={"retailer_id": retailer_id, "error": type(error).__name__, "message": str(error)[:200]},
            )
        except Exception:  # noqa: BLE001 - günlükleme aramayı etkilemez
            pass

    def _patch(self, lookup: dict, retailer_id: str | None, values: dict) -> None:
        with lookup["lock"]:
            (lookup["steps"][retailer_id] if retailer_id else lookup).update(values)

    def _view(self, lookup: dict) -> dict:
        with lookup["lock"]:
            steps = [dict(lookup["steps"][retailer_id]) for retailer_id in self._retailers]
            return {
                "book_id": lookup["book_id"], "status": lookup["status"],
                "started_at": lookup["started_at"].isoformat(),
                "finished_at": lookup["finished_at"].isoformat() if lookup["finished_at"] else None,
                "retailers": steps, "found": sum(1 for step in steps if step["state"] == "found"),
            }


def idle_snapshot(book_id: str, retailers=LIVE_RETAILERS) -> dict:
    """Henüz arama başlatılmamış kitabın durumu."""
    return {
        "book_id": book_id, "status": "idle", "started_at": None, "finished_at": None, "found": 0,
        "retailers": [{"retailer_id": retailer_id, "retailer_name": RETAILER_NAMES[retailer_id],
                       "state": "pending", "message": MESSAGES["pending"], "price_minor": None,
                       "currency": None, "product_url": None, "stock_status": None}
                      for retailer_id in retailers],
    }


live_lookups = LivePriceLookups()

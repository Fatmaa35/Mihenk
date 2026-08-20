"""İzinli mağaza aramalarından ISBN ile ürün URL'si keşfeder."""

from __future__ import annotations

import time
import re
import random
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import quote_plus, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

from app.services.retailer_offers import RETAILERS, USER_AGENT, RetailerPolicyError, fetch_offer
from app.services.dynamic_browser import render_dynamic_html


DISCOVERY = {
    "bkmkitap": {"host": "www.bkmkitap.com", "path": "/arama?q={query}", "selector": "a[href]", "browser_fallback": True},
    "kitapsec": {"host": "www.kitapsec.com", "path": "/Arama/index.php?a={query}", "selector": 'a[href*="/Products/"]'},
    "kitapsepeti": {"host": "www.kitapsepeti.com", "path": "/arama?q={query}", "selector": ".product-item a[href]"},
}


def polite_delay(minimum: float = 2.0) -> None:
    time.sleep(random.uniform(max(2.0, minimum), max(2.0, minimum) + 1.5))


def extract_product_links(html: str, search_url: str, retailer_id: str, limit: int = 8) -> list[str]:
    config = DISCOVERY[retailer_id]
    base = RETAILERS[config["host"]]["base_url"]
    links: list[str] = []
    for anchor in BeautifulSoup(html, "html.parser").select(config["selector"]):
        url = urljoin(search_url, anchor.get("href", ""))
        parsed = urlparse(url)
        accepted_hosts = {config["host"], config["host"].removeprefix("www.")}
        if parsed.netloc.casefold() not in accepted_hosts:
            continue
        if parsed.netloc.casefold() != config["host"]:
            url = parsed._replace(netloc=config["host"]).geturl()
        if url in links:
            continue
        if retailer_id == "bkmkitap":
            if not re.search(r"/[^/?]+-\d+(?:\?|$)", url, re.I) or "waw_keyword=" not in parsed.query:
                continue
        if retailer_id == "kitapsec" and not re.search(r"/Products/.+-\d+\.html(?:$|\?)", url, re.I):
            continue
        links.append(url)
        if len(links) >= limit:
            break
    return links


def _allowed_search(url: str, base_url: str) -> None:
    robots_url = base_url + "/robots.txt"
    response = requests.get(robots_url, timeout=20, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    parser = RobotFileParser(robots_url)
    parser.parse(response.text.splitlines())
    if not parser.can_fetch(USER_AGENT, url):
        raise RetailerPolicyError("robots.txt mağaza arama yoluna izin vermiyor.")


def search_product_links(retailer_id: str, query: str, max_candidates: int = 8, renderer=render_dynamic_html) -> list[str]:
    config = DISCOVERY.get(retailer_id)
    if not config:
        raise RetailerPolicyError("Bu mağaza yalnızca önceden bilinen ürün URL'lerini yenileyebilir.")
    retailer = RETAILERS[config["host"]]
    url = retailer["base_url"] + config["path"].format(query=quote_plus(query))
    _allowed_search(url, retailer["base_url"])
    polite_delay()
    response = requests.get(url, timeout=30, headers={"User-Agent": USER_AGENT, "Accept-Language": "tr-TR,tr;q=0.9"})
    response.raise_for_status()
    links = extract_product_links(response.text, url, retailer_id, max_candidates)
    if not links and config.get("browser_fallback"):
        polite_delay()
        links = extract_product_links(renderer(url, USER_AGENT), url, retailer_id, max_candidates)
    return links


def discover_offer(edition: dict, retailer_id: str, delay: float = 2.0, max_candidates: int = 8) -> dict | None:
    checked: set[str] = set()
    for query in (edition["isbn"], edition["book_title"]):
        links = search_product_links(retailer_id, query, max_candidates)
        if links:
            polite_delay(delay)
        for url in links:
            if url in checked:
                continue
            checked.add(url)
            try:
                offer = fetch_offer(url)
            except (ValueError, requests.RequestException):
                polite_delay(delay)
                continue
            if offer["isbn"] == edition["isbn"]:
                return offer
            polite_delay(delay)
    return None


def _normalized(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", (value or "").casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9çğıöşü]+", text))


def same_book(book: dict, offer: dict) -> bool:
    expected_title, actual_title = _normalized(book["title"]), _normalized(offer["canonical_title"])
    title_match = expected_title in actual_title or actual_title in expected_title or SequenceMatcher(None, expected_title, actual_title).ratio() >= 0.82
    if not title_match:
        return False
    expected_author, actual_author = set(_normalized(book["author"]).split()), set(_normalized(offer.get("author")).split())
    if not actual_author:
        return SequenceMatcher(None, expected_title, actual_title).ratio() >= 0.92
    return bool(expected_author & actual_author) and len(expected_author & actual_author) / max(1, len(expected_author)) >= 0.5


def discover_offer_for_book(book: dict, retailer_id: str, delay: float = 2.0, max_candidates: int = 8) -> dict | None:
    links = search_product_links(retailer_id, book["title"], max_candidates)
    if links:
        polite_delay(delay)
    for url in links:
        try:
            offer = fetch_offer(url)
        except (ValueError, requests.RequestException):
            polite_delay(delay)
            continue
        if same_book(book, offer):
            offer["book_id"] = book["id"]
            return offer
        polite_delay(delay)
    return None

import hashlib
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup


USER_AGENT = "AkilliKitapDanismaniPriceIndexer/1.0"
RETAILERS = {
    "www.bkmkitap.com": {
        "id": "bkmkitap", "name": "BKM Kitap", "base_url": "https://www.bkmkitap.com",
        "content_policy": "search_reference_only;ai_train_forbidden;description_not_stored", "integration_mode": "scrape_if_robots_allows",
    },
    "www.kitapsec.com": {
        "id": "kitapsec", "name": "Kitapseç", "base_url": "https://www.kitapsec.com",
        "content_policy": "metadata_and_price_only;description_not_stored", "integration_mode": "scrape_if_robots_allows",
    },
    "www.kitapsepeti.com": {
        "id": "kitapsepeti", "name": "Kitapsepeti", "base_url": "https://www.kitapsepeti.com",
        "content_policy": "metadata_and_price_only;description_not_stored", "integration_mode": "scrape_if_robots_allows",
    },
    "www.dr.com.tr": {
        "id": "dr", "name": "D&R", "base_url": "https://www.dr.com.tr",
        "content_policy": "product_metadata_only;description_not_stored", "integration_mode": "scrape_if_robots_allows",
    },
    "www.n11.com": {
        "id": "n11", "name": "n11", "base_url": "https://www.n11.com",
        "content_policy": "target_product_only;manual_terms_review_required", "integration_mode": "scrape_if_robots_allows",
    },
    "www.hepsiburada.com": {
        "id": "hepsiburada", "name": "Hepsiburada", "base_url": "https://www.hepsiburada.com",
        "content_policy": "robots_restricted;official_feed_preferred", "integration_mode": "scrape_if_robots_allows",
    },
    "www.trendyol.com": {
        "id": "trendyol", "name": "Trendyol", "base_url": "https://www.trendyol.com",
        "content_policy": "screen_scraping_forbidden_without_written_permission", "integration_mode": "official_api_required",
    },
    "www.amazon.com.tr": {
        "id": "amazon_tr", "name": "Amazon Türkiye", "base_url": "https://www.amazon.com.tr",
        "content_policy": "scraping_and_price_database_forbidden;product_advertising_api_required", "integration_mode": "official_api_required",
    },
}


class RetailerPolicyError(ValueError):
    pass


def _money_minor(value: str | float | None) -> int | None:
    if value in (None, ""):
        return None
    return int((Decimal(str(value).replace(",", ".")) * 100).quantize(Decimal("1")))


def _property(product: dict, name: str) -> str | None:
    for item in product.get("additionalProperty", []):
        if item.get("name", "").casefold() == name.casefold():
            return item.get("unitText") or item.get("value")
    return None


def _name(value) -> str | None:
    if isinstance(value, dict):
        return value.get("name")
    return value if isinstance(value, str) else None


def _canonical_title(title: str, publisher: str | None, host: str) -> str:
    clean = re.sub(r"\s+", " ", title).strip()
    if host == "www.n11.com":
        clean = clean.split(" - ", 1)[0]
    if publisher and clean.casefold().endswith(publisher.casefold()):
        clean = clean[: -len(publisher)].strip(" -–|")
    return clean


def parse_product_page(html: str, url: str) -> dict:
    host = urlparse(url).netloc.casefold()
    retailer = RETAILERS.get(host)
    if not retailer:
        raise RetailerPolicyError("Bu mağaza için doğrulanmış adaptör bulunmuyor.")
    soup = BeautifulSoup(html, "html.parser")
    products = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            value = json.loads(script.string or script.get_text(), strict=False)
        except (json.JSONDecodeError, TypeError):
            continue
        values = value if isinstance(value, list) else [value]
        expanded = []
        for item in values:
            if isinstance(item, dict):
                expanded.append(item)
                expanded.extend(graph_item for graph_item in item.get("@graph", []) if isinstance(graph_item, dict))
        products.extend(item for item in expanded if item.get("offers") or item.get("@type") == "Product")
    if not products:
        raise ValueError("Ürün sayfasında Schema.org Product verisi bulunamadı.")
    product = next((item for item in products if item.get("offers") and (item.get("isbn") or item.get("sku"))), products[0])
    offers = product.get("offers") or {}
    publisher = _name(product.get("publisher")) or _name(product.get("brand")) or _property(product, "Yayınevi")
    title = product.get("name", "").strip()
    isbn = str(product.get("isbn") or product.get("gtin13") or product.get("sku") or "").replace("-", "")
    if not re.fullmatch(r"97[89]\d{10}", isbn):
        raise ValueError("Geçerli ISBN-13 bulunamadı.")
    return {
        "retailer_id": retailer["id"], "retailer_name": retailer["name"], "base_url": retailer["base_url"],
        "robots_url": retailer["base_url"] + "/robots.txt", "content_policy": retailer["content_policy"],
        "product_url": url, "isbn": isbn, "canonical_title": _canonical_title(title, publisher, host),
        "author": _name(product.get("author")) or _property(product, "Yazar"), "publisher": publisher,
        "price_minor": _money_minor(offers.get("price") or offers.get("lowPrice")),
        "list_price_minor": _money_minor((offers.get("priceSpecification") or {}).get("price")),
        "currency": offers.get("priceCurrency", "TRY"),
        "stock_status": (
            "in_stock" if str(offers.get("availability", "")).casefold().endswith("instock")
            else "out_of_stock" if str(offers.get("availability", "")).casefold().endswith("outofstock")
            else "unknown"
        ),
        "checked_at": datetime.now(timezone.utc).isoformat(), "content_hash": hashlib.sha256(html.encode("utf-8")).hexdigest(),
    }


def fetch_offer(url: str) -> dict:
    host = urlparse(url).netloc.casefold()
    retailer = RETAILERS.get(host)
    if not retailer or urlparse(url).scheme != "https":
        raise RetailerPolicyError("Yalnızca izinli mağazaların HTTPS ürün adresleri kabul edilir.")
    if retailer["integration_mode"] == "official_api_required":
        raise RetailerPolicyError(f"{retailer['name']} için web scraping yerine resmi API/affiliate feed kimlik bilgileri gereklidir.")
    robots_url = retailer["base_url"] + "/robots.txt"
    from app.services.outbound_http import safe_get
    robots_response = safe_get(robots_url, allowed_hosts=set(RETAILERS), timeout=20, headers={"User-Agent": USER_AGENT})
    robots_response.raise_for_status()
    parser = RobotFileParser(robots_url)
    parser.parse(robots_response.text.splitlines())
    if not parser.can_fetch(USER_AGENT, url):
        raise RetailerPolicyError("robots.txt bu ürün adresinin alınmasına izin vermiyor.")
    response = safe_get(url, allowed_hosts=set(RETAILERS), timeout=30, headers={"User-Agent": USER_AGENT, "Accept-Language": "tr-TR,tr;q=0.9"})
    response.raise_for_status()
    offer = parse_product_page(response.text, url)
    if offer["price_minor"] is None:
        raise ValueError("Satış fiyatı bulunamadı.")
    return offer

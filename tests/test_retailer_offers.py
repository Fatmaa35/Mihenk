import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.services.retailer_offers import RetailerPolicyError, fetch_offer, parse_product_page
from app.database import Repository


def html(product: dict) -> str:
    return f'<html><script type="application/ld+json">{json.dumps(product)}</script></html>'


def test_bkm_schema_org_offer_is_parsed_without_description() -> None:
    product = {
        "@type": ["Product", "Book"], "name": "Suç ve Ceza", "isbn": "9786055272289",
        "description": "Bu telifli mağaza açıklaması kayda girmemelidir.",
        "author": {"name": "Fyodor Dostoyevski"}, "publisher": {"name": "Doruk Yayınları"},
        "offers": {"price": "674.50", "priceCurrency": "TRY", "availability": "https://schema.org/InStock",
                   "priceSpecification": {"price": "950.00"}},
    }
    offer = parse_product_page(html(product), "https://www.bkmkitap.com/suc-ve-ceza-650504")
    assert offer["isbn"] == "9786055272289"
    assert offer["price_minor"] == 67450
    assert offer["list_price_minor"] == 95000
    assert offer["stock_status"] == "in_stock"
    assert "description" not in offer


def test_kitapsec_publisher_suffix_is_removed_from_canonical_title() -> None:
    product = {
        "@type": "Product", "name": "Suç ve Ceza Nilüfer Yayınları", "sku": "9786055907730",
        "brand": {"name": "Nilüfer Yayınları"},
        "offers": {"price": "200.00", "priceCurrency": "TRY", "availability": "https://schema.org/OutOfStock"},
        "additionalProperty": [{"name": "Yazar", "unitText": "Fyodor Dostoyevski"}],
    }
    offer = parse_product_page(html(product), "https://www.kitapsec.com/Products/Suc-ve-Ceza-511499.html")
    assert offer["canonical_title"] == "Suç ve Ceza"
    assert offer["stock_status"] == "out_of_stock"


@pytest.mark.parametrize("url", [
    "https://www.trendyol.com/ornek-kitap-p-123",
    "https://www.amazon.com.tr/dp/1234567890",
])
def test_retailers_that_forbid_scraping_require_official_api(url: str) -> None:
    with pytest.raises(RetailerPolicyError, match="resmi API"):
        fetch_offer(url)


def test_offer_older_than_seven_days_is_marked_stale(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "stale.db")
    old_offer = {
        "retailer_id": "bkmkitap", "retailer_name": "BKM Kitap", "base_url": "https://www.bkmkitap.com",
        "robots_url": "https://www.bkmkitap.com/robots.txt", "content_policy": "metadata_only",
        "product_url": "https://www.bkmkitap.com/old-book", "isbn": "9789755105505", "canonical_title": "Sula",
        "author": "Toni Morrison", "publisher": "Can", "price_minor": 10000, "list_price_minor": None,
        "currency": "TRY", "stock_status": "in_stock",
        "checked_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(), "content_hash": "hash",
    }
    repository.save_retail_offer(old_offer)
    assert repository.list_retail_offers()[0]["is_stale"] is True

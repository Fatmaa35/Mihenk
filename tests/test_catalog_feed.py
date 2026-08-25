from pathlib import Path

import pytest

from app.services.catalog_feed import iter_feed, normalize_feed_record


def test_catalog_feed_normalizes_turkish_edition(tmp_path: Path) -> None:
    feed = tmp_path / "publisher.csv"
    feed.write_text(
        "isbn13,title,author,publisher,page_count,themes,source_url\n"
        "9789750719387,Örnek Kitap,Örnek Yazar,Örnek Yayınları,240,kimlik|yolculuk,https://example.com/book\n",
        encoding="utf-8",
    )
    record = next(iter_feed(feed, "licensed-publisher"))
    assert record["isbn"] == "9789750719387"
    assert record["language"] == "tr"
    assert record["source_name"] == "licensed-publisher"
    assert record["themes"] == ["kimlik", "yolculuk"]


def test_catalog_feed_rejects_invalid_isbn_and_foreign_language() -> None:
    with pytest.raises(ValueError, match="ISBN-13"):
        normalize_feed_record({"isbn": "123", "title": "Kitap", "author": "Yazar"}, "feed")
    with pytest.raises(ValueError, match="Türkçe"):
        normalize_feed_record(
            {"isbn": "9789750719387", "title": "Book", "author": "Author", "language": "en"},
            "feed",
        )

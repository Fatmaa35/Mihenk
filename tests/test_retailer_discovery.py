from app.services.retailer_discovery import extract_product_links, same_book
from app.services import retailer_discovery


def test_kitapsec_product_links_are_deduplicated_and_scoped() -> None:
    html = """
    <a href="https://www.kitapsec.com/Products/Book-123.html">A</a>
    <a href="https://www.kitapsec.com/Products/Book-123.html">A duplicate</a>
    <a href="https://www.kitapsec.com/Products/Category/">Category</a>
    <a href="https://evil.example/Products/Book-222.html">External</a>
    """
    assert extract_product_links(html, "https://www.kitapsec.com/Arama/index.php?a=x", "kitapsec") == [
        "https://www.kitapsec.com/Products/Book-123.html"
    ]


def test_kitapsepeti_only_reads_product_cards() -> None:
    html = """
    <div class="product-item"><a href="/roman-123">Roman</a></div>
    <nav><a href="/kampanya">Kampanya</a></nav>
    """
    assert extract_product_links(html, "https://www.kitapsepeti.com/arama?q=x", "kitapsepeti") == [
        "https://www.kitapsepeti.com/roman-123"
    ]


def test_title_and_author_must_both_support_retailer_match() -> None:
    book = {"title": "Kızıl Dosya", "author": "Arthur Conan Doyle"}
    assert same_book(book, {"canonical_title": "Kızıl Dosya - Sherlock Holmes", "author": "Sir Arthur Conan Doyle"})
    assert not same_book(book, {"canonical_title": "Kızıl Dosya", "author": "Başka Yazar"})
    assert not same_book(book, {"canonical_title": "Mavi Dosya", "author": "Arthur Conan Doyle"})


def test_bkm_uses_dynamic_renderer_only_after_empty_static_result(monkeypatch) -> None:
    class Response:
        text = "<html><body>static shell</body></html>"

        @staticmethod
        def raise_for_status() -> None:
            return None

    monkeypatch.setattr(retailer_discovery, "_allowed_search", lambda *_: None)
    monkeypatch.setattr(retailer_discovery, "polite_delay", lambda *_: None)
    monkeypatch.setattr(retailer_discovery.requests, "get", lambda *_, **__: Response())
    dynamic = '<a href="https://bkmkitap.com/dinamik-kitap-123?waw_keyword=kitap">Kitap</a><a href="/kampanya">Kampanya</a>'
    links = retailer_discovery.search_product_links("bkmkitap", "kitap", renderer=lambda *_: dynamic)
    assert links == ["https://www.bkmkitap.com/dinamik-kitap-123?waw_keyword=kitap"]

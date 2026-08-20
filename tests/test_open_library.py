from app.services.open_library import parse_document


def test_open_library_document_is_traceable() -> None:
    document = {
        "key": "/works/OL123W",
        "title": "Gizemli Kitap",
        "author_name": ["Ada Yazar"],
        "language": ["tur"],
        "isbn": ["9781234567890"],
        "subject": ["Detective and mystery stories", "Polisiye"],
        "cover_i": 42,
        "publisher": ["Örnek Yayınları"],
    }
    record = parse_document(document)
    assert record is not None
    assert record["source_name"] == "Open Library"
    assert record["genre"] == "Polisiye"
    assert record["source_url"] == "https://openlibrary.org/works/OL123W"
    assert "Open Library" in record["description"]

from app.services.google_books import _genre, parse_volume


def test_google_books_volume_is_clean_and_traceable() -> None:
    item = {
        "id": "volume-1",
        "volumeInfo": {
            "title": "Örnek <b>Roman</b>",
            "authors": ["Ada Yazar"],
            "description": "<p>Bir dedektifin karmaşık bir cinayeti çözmesini anlatan yeterince uzun Türkçe açıklama metnidir.</p>",
            "language": "tr",
            "categories": ["Polisiye Roman"],
            "industryIdentifiers": [{"type": "ISBN_13", "identifier": "9781234567890"}],
            "canonicalVolumeLink": "https://books.google.com/books?id=volume-1",
            "imageLinks": {"thumbnail": "http://books.google.com/cover.jpg"},
        },
    }
    record = parse_volume(item)
    assert record is not None
    assert record["title"] == "Örnek Roman"
    assert record["genre"] == "Polisiye"
    assert record["source_name"] == "Google Books"
    assert record["cover_url"].startswith("https://")
    assert "<p>" not in record["description"]


def test_incomplete_or_non_turkish_volume_is_rejected() -> None:
    assert parse_volume({"id": "x", "volumeInfo": {"title": "Book", "language": "en"}}) is None


def test_expanded_genre_taxonomy_covers_non_fiction_and_youth() -> None:
    assert _genre("Etik Üzerine", "Bir felsefe incelemesi", []) == "Felsefe"
    assert _genre("Bir Bilim İnsanının Yaşamı", "", ["Biography"]) == "Biyografi"
    assert _genre("Genç Okurlar", "", ["Juvenile fiction"]) == "Çocuk ve Gençlik"

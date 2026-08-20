from app.services.edition_verification import parse_turkish_edition, valid_isbn13


def test_isbn13_checksum() -> None:
    assert valid_isbn13("9789755105505")
    assert not valid_isbn13("9789755105506")
    assert not valid_isbn13("9755105506")


def test_only_turkish_edition_is_accepted() -> None:
    payload = {
        "docs": [{
            "editions": {"docs": [
                {"key": "/books/EN", "language": ["eng"], "isbn": ["9789755105505"]},
                {"key": "/books/TR", "title": "Sula", "language": ["tur"], "isbn": ["9755105506", "9789755105505"],
                 "publisher": ["Can"], "publish_date": ["1994"]},
            ]}
        }]
    }
    edition = parse_turkish_edition(payload, {"id": "sula", "title": "Sula", "author": "Toni Morrison"})
    assert edition is not None
    assert edition["isbn"] == "9789755105505"
    assert edition["language"] == "tur"
    assert edition["verification_status"] == "verified"
    assert edition["source_url"].endswith("/books/TR")

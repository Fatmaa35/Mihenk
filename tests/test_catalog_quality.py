from app.database import Repository
from app.services.catalog_quality import (
    book_matches_intent,
    canonical_work_key,
    enrich_book_record,
    parse_query_intent,
)
from app.services.consensus import ConsensusRecommender


def _record(book_id: str, title: str, genre: str, page_count: int) -> dict:
    return enrich_book_record({
        "id": book_id,
        "title": title,
        "author": "Örnek Yazar",
        "genre": genre,
        "themes": [genre, "gizem"],
        "character_traits": ["meraklı", "analitik"],
        "description": "Gizemli olayların karakter gelişimiyle birlikte işlendiği ayrıntılı bir anlatı." * 2,
        "source_name": "Google Books",
        "source_url": f"https://example.test/{book_id}",
        "cover_url": f"https://example.test/{book_id}.jpg",
        "isbn": "9789750719387",
        "publisher": "Örnek Yayınları",
        "language": "tr",
        "page_count": page_count,
        "metadata_updated_at": "2026-08-12T00:00:00+00:00",
    })


def test_canonical_work_identity_ignores_case_spacing_and_accents() -> None:
    assert canonical_work_key("Dönüşüm", "Franz Kafka") == canonical_work_key(
        "  DONUSUM ", "franz   kafka"
    )


def test_metadata_upsert_merges_same_work_and_keeps_edition(tmp_path) -> None:
    repository = Repository(tmp_path / "catalog.db")
    first = _record("source-a", "Dönüşüm", "Roman", 144)
    second = {**first, "id": "source-b", "isbn": "9789750720000"}

    assert repository.upsert_metadata_book(first) == "source-a"
    assert repository.upsert_metadata_book(second) == "source-a"
    assert repository.search_books("Dönüşüm", 10, 0)["total"] == 1
    with repository.connect() as connection:
        editions = connection.execute(
            "SELECT count(*) n FROM editions WHERE book_id='source-a'"
        ).fetchone()["n"]
    assert editions == 2


def test_query_intent_enforces_publication_type_and_page_limit() -> None:
    intent = parse_query_intent("tek oturuşta okunacak kısa gizemli roman")
    short_fiction = _record("short", "Kısa Roman", "Roman", 180)
    long_fiction = _record("long", "Uzun Roman", "Roman", 480)
    essay = _record("essay", "Bir Deneme", "Deneme", 160)

    assert book_matches_intent(short_fiction, intent)
    assert not book_matches_intent(long_fiction, intent)
    assert not book_matches_intent(essay, intent)


def test_invalid_isbn_is_not_persisted_as_an_edition(tmp_path) -> None:
    repository = Repository(tmp_path / "invalid-isbn.db")
    record = _record("invalid", "Hatalı Barkod", "Roman", 200)
    record["isbn"] = "8572981562454"

    repository.upsert_metadata_book(record)

    with repository.connect() as connection:
        assert connection.execute("SELECT count(*) FROM editions").fetchone()[0] == 0


def test_recommender_excludes_academic_records_from_fiction_query() -> None:
    fiction = _record("fiction", "Gece Gizemi", "Polisiye", 240)
    academic = _record(
        "academic", "Polisiye Roman Yazarları İçin Seçme Örnekler", "Roman", 200
    )
    profile = {
        "favorite_books": [], "read_books": [], "reading_books": [],
        "to_read_books": [],
    }

    _, candidates = ConsensusRecommender([academic, fiction]).recommend(
        "analitik ve gizemli roman", profile, 5
    )

    assert [item["book"]["id"] for item in candidates] == ["fiction"]

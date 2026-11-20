"""Kitaplıktaki kitapların kapak aramasında kullanılacak ISBN'i."""
from app.database import Repository
from app.services.common.editions import primary_isbn_by_book


def edition(isbn: str, book_id: str = "b1", language: str = "eng", status: str = "unverified") -> dict:
    return {"isbn": isbn, "book_id": book_id, "language": language, "verification_status": status}


class TestSecim:
    def test_dogrulanmis_baski_dogrulanmamisin_onune_gecer(self) -> None:
        rows = [edition("9780000000001"), edition("9789750000002", status="verified")]
        assert primary_isbn_by_book(rows) == {"b1": "9789750000002"}

    def test_esit_kosulda_turkce_baski_secilir(self) -> None:
        rows = [edition("9780000000001", status="verified"),
                edition("9789750000002", language="tur", status="verified")]
        assert primary_isbn_by_book(rows) == {"b1": "9789750000002"}

    def test_ayni_kitap_her_cagrida_ayni_baskiyi_verir(self) -> None:
        rows = [edition("9789750000009"), edition("9789750000002"), edition("9789750000005")]
        assert primary_isbn_by_book(rows) == {"b1": "9789750000002"}
        assert primary_isbn_by_book(list(reversed(rows))) == {"b1": "9789750000002"}

    def test_her_kitap_kendi_baskisini_alir(self) -> None:
        rows = [edition("9789750000002", "b1"), edition("9789750000003", "b2")]
        assert primary_isbn_by_book(rows) == {"b1": "9789750000002", "b2": "9789750000003"}

    def test_eksik_kayitlar_atlanir(self) -> None:
        rows = [edition("", "b1"), {"isbn": "9789750000004", "book_id": None}, edition("9789750000005", "b2")]
        assert primary_isbn_by_book(rows) == {"b2": "9789750000005"}


def library_with_book(tmp_path) -> tuple:
    """Tek kitabı ve o kitabı rafına almış bir kişisi olan boş bir veritabanı."""
    repository = Repository(tmp_path / "mihenk.db")
    user = repository.create_user("Fatma")
    with repository.connect() as connection:
        connection.execute(
            """INSERT INTO books(id,title,author,genre,themes_json,traits_json,description)
               VALUES('b1','Suç ve Ceza','Dostoyevski','Roman','[]','[]','')""",
        )
    repository.upsert_library_entry(user["id"], "b1", "reading", False)
    return repository, user


class TestKitaplik:
    def test_profil_kitabin_isbn_ini_tasir(self, tmp_path) -> None:
        repository, user = library_with_book(tmp_path)
        with repository.connect() as connection:
            connection.executemany(
                """INSERT INTO editions(isbn,book_id,title,language,verification_status)
                   VALUES(?,?,?,?,?)""",
                [("9780000000001", "b1", "Crime and Punishment", "eng", "unverified"),
                 ("9789750719387", "b1", "Suç ve Ceza", "tur", "verified")],
            )

        entry = repository.user_profile(user["id"])["reading_books"][0]
        # Doğrulanmış Türkçe baskı seçilir; kapak bu ISBN ile aranır.
        assert entry["isbn"] == "9789750719387"

    def test_baskisi_olmayan_kitapta_isbn_bos_kalir(self, tmp_path) -> None:
        repository, user = library_with_book(tmp_path)
        assert repository.user_profile(user["id"])["reading_books"][0]["isbn"] is None

"""Bellekteki katalogda olmayan kitabın da bulunabildiğini kanıtlar.

Katalog, süreç başlarken bir kez okunup bellekte tutuluyor. Supabase tarafında
bu okuma 1000 satırla sınırlıydı, dolayısıyla alfabenin sonundaki kitaplar
listeye hiç girmiyordu: asistanın önerdiği kitaba tıklandığında detay ucu
"Kitap bulunamadı." diyordu. Uçlar artık bulamadıklarında veritabanına
düşüyor. Bu testler, bellekteki kopyada olmayan bir kitapla o yolu sabitliyor.
"""
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_PATH", "data/test_book_lookup.db")
from fastapi.testclient import TestClient  # noqa: E402

from app.runtime import repository, save_isbn_lookup_to_catalog, services  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _katalog_disinda_kitap() -> str:
    """Veritabanına kitap yazar ama bellekteki kataloğu bilerek tazelemez."""
    book_id = save_isbn_lookup_to_catalog(
        {"isbn": "9790000000001", "title": "Zümrüt Defterler", "author": "Test Yazar"},
        source_name="test", source_url=None,
    )["catalog_book_id"]
    # Üretimde katalog yenilense bile bellekteki kopya her kitabı içermeyebilir
    # (sayfalama sınırı, başka süreç). Testte bu durumu kataloğu boşaltarak
    # birebir kuruyoruz.
    services.catalog = [item for item in services.catalog if item["id"] != book_id]
    return book_id


def test_katalogda_olmayan_kitabin_detayi_gelir() -> None:
    client.post("/auth/register", json={
        "display_name": "Ada", "email": f"ada-{uuid4()}@example.com", "password": "guvenli-parola",
    })
    book_id = _katalog_disinda_kitap()

    response = client.get(f"/books/{book_id}/details")

    assert response.status_code == 200, response.text
    assert response.json()["book"]["title"] == "Zümrüt Defterler"


def test_olmayan_kimlik_hala_404_doner() -> None:
    client.post("/auth/register", json={
        "display_name": "Ada", "email": f"ada-{uuid4()}@example.com", "password": "guvenli-parola",
    })

    assert client.get("/books/boyle-bir-kitap-yok/details").status_code == 404

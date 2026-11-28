"""Kullanıcının kendi eklediği kitabın detayının açılabildiğini kanıtlar.

Bu kitaplar katalog tablosunda değil, `user_custom_books` içinde durur. Buna
rağmen kitaplıkta ve asistan yanıtlarında listeleniyorlar; detay ucu onları
tanımadığı için tıklandığında "Kitap bulunamadı." çıkıyordu.
"""
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_PATH", "data/test_custom_book_details.db")
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def _kayit_ol() -> None:
    response = client.post("/auth/register", json={
        "display_name": "Ada", "email": f"ada-{uuid4()}@example.com", "password": "guvenli-parola",
    })
    assert response.status_code == 201, response.text


def test_kisisel_kitabin_detayi_acilir() -> None:
    _kayit_ol()
    created = client.post("/me/custom-books", json={
        "title": "Kendi Defterim", "author": "Ada", "genre": "Genel",
        "cover_url": None, "shelf": "reading", "is_favorite": False,
    })
    assert created.status_code == 201, created.text
    book_id = created.json()["id"]

    response = client.get(f"/books/{book_id}/details")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["book"]["title"] == "Kendi Defterim"
    assert payload["book"]["is_custom"] is True
    # Katalogdan gelen alanlar boş olmalı, eksik değil: arayüz bunları okuyor.
    assert payload["offers"] == []
    assert payload["community"]["comments"] == []
    assert payload["community"]["rating_count"] == 0


def test_baskasinin_kisisel_kitabi_gorunmez() -> None:
    _kayit_ol()
    created = client.post("/me/custom-books", json={
        "title": "Gizli Defter", "author": "Ada", "genre": "Genel",
        "cover_url": None, "shelf": "reading", "is_favorite": False,
    })
    book_id = created.json()["id"]

    _kayit_ol()  # başka bir kullanıcı olarak oturum açılır

    assert client.get(f"/books/{book_id}/details").status_code == 404

"""Bir kitabın hangi baskısının ISBN'iyle temsil edileceği.

Kitaplık ekranları kapak görselini ISBN üzerinden bulabiliyor, bu yüzden her
kitabın tek ve kararlı bir ISBN'i olmalı. Seçim sırası: önce doğrulanmış
baskılar, sonra Türkçe baskılar, sonra ISBN'in kendisi. Son ölçüt, aynı kitabın
her çağrıda aynı baskıyı vermesi içindir.
"""
from __future__ import annotations

VERIFIED = ("verified", "retailer_verified")


def _rank(edition: dict) -> tuple:
    return (
        0 if str(edition.get("verification_status") or "") in VERIFIED else 1,
        0 if str(edition.get("language") or "").lower() in {"tur", "tr"} else 1,
        str(edition.get("isbn") or ""),
    )


def primary_isbn_by_book(editions) -> dict[str, str]:
    """Kitap kimliğinden o kitabı temsil eden ISBN'e eşleme."""
    best: dict[str, dict] = {}
    for edition in editions:
        book_id = edition.get("book_id")
        isbn = str(edition.get("isbn") or "").strip()
        if not book_id or not isbn:
            continue
        current = best.get(book_id)
        if current is None or _rank(edition) < _rank(current):
            best[book_id] = edition
    return {book_id: str(edition["isbn"]).strip() for book_id, edition in best.items()}

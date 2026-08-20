"""Türkçe kitap metadata'sını Google Books API'den yerel kataloğa aktarır."""

import argparse
from urllib.error import HTTPError, URLError

from app.config import settings
from app.repository_factory import create_repository
from app.services.google_books import GoogleBooksClient
from app.services.open_library import OpenLibraryClient


DEFAULT_QUERIES = [
    "roman", "polisiye", "bilim kurgu", "fantastik", "şiir", "öykü",
    "tarih", "psikoloji", "macera", "felsefe", "biyografi", "sosyoloji",
    "ekonomi", "popüler bilim", "deneme", "çocuk edebiyatı", "gençlik",
    "romantik", "mizah", "sanat",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", nargs="+", default=DEFAULT_QUERIES)
    parser.add_argument("--pages", type=int, default=1)
    parser.add_argument("--page-size", type=int, default=30)
    parser.add_argument("--max-books", type=int, default=180)
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--source", choices=("auto", "google", "openlibrary"), default="auto")
    args = parser.parse_args()

    repository = create_repository(settings)
    google = GoogleBooksClient(settings.google_books_api_key)
    open_library = OpenLibraryClient()
    client = open_library if args.source == "openlibrary" else google
    imported = 0
    try:
        records = client.iter_records(args.queries, args.pages, args.page_size, args.delay)
        for record in records:
            repository.upsert_metadata_book(record)
            imported += 1
            if imported >= args.max_books:
                break
    except (HTTPError, URLError, TimeoutError) as error:
        is_quota = isinstance(error, HTTPError) and error.code == 429
        if args.source != "auto":
            raise
        reason = "kota sınırı" if is_quota else "geçici bağlantı hatası"
        print(f"Google Books {reason}; Open Library yedeğine geçiliyor.")
        for record in open_library.iter_records(args.queries, args.pages, args.page_size, args.delay):
            repository.upsert_metadata_book(record)
            imported += 1
            if imported >= args.max_books:
                break
    total = repository.search_books(None, 1, 0)["total"]
    print(f"İçe aktarılan metadata: {imported}; katalog toplamı: {total}")


if __name__ == "__main__":
    main()

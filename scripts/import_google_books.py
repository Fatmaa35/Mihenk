"""Türkçe kitap metadata'sını Google Books API'den yerel kataloğa aktarır."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from itertools import islice
from urllib.error import HTTPError, URLError

from app.config import settings
from app.repository_factory import create_repository
from app.services.catalog_quality import canonical_work_key
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
    parser.add_argument("--workers", type=int, default=1, choices=range(1, 9))
    args = parser.parse_args()

    repository = create_repository(settings)
    google = GoogleBooksClient(settings.google_books_api_key)
    open_library = OpenLibraryClient()
    client = open_library if args.source == "openlibrary" else google
    imported = 0
    rejected = 0

    def persist(records):
        nonlocal imported, rejected
        candidates = list(islice(records, max(0, args.max_books - imported)))
        groups: dict[str, list[dict]] = {}
        for record in candidates:
            groups.setdefault(canonical_work_key(record["title"], record["author"]), []).append(record)

        def persist_group(group):
            result = []
            for record in group:
                try:
                    repository.upsert_metadata_book(record)
                    result.append((record, None))
                except Exception as error:
                    result.append((record, error))
            return result

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            for results in executor.map(persist_group, groups.values()):
                for record, error in results:
                    if error is None:
                        imported += 1
                    else:
                        rejected += 1
                        print(f"Kayıt atlandı ({record.get('isbn')}): {str(error)[:180]}")

    try:
        records = client.iter_records(args.queries, args.pages, args.page_size, args.delay)
        persist(records)
    except (HTTPError, URLError, TimeoutError) as error:
        is_quota = isinstance(error, HTTPError) and error.code == 429
        if args.source != "auto":
            raise
        reason = "kota sınırı" if is_quota else "geçici bağlantı hatası"
        print(f"Google Books {reason}; Open Library yedeğine geçiliyor.")
        persist(open_library.iter_records(args.queries, args.pages, args.page_size, args.delay))
    total = repository.search_books(None, 1, 0)["total"]
    print(f"İçe aktarılan metadata: {imported}; reddedilen: {rejected}; katalog toplamı: {total}")


if __name__ == "__main__":
    main()

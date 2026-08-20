"""Process durable catalog jobs. Run as a separate worker process."""

from __future__ import annotations

import argparse
import os
from urllib.error import HTTPError, URLError

from app.config import settings
from app.repository_factory import create_repository
from app.services.google_books import GoogleBooksClient, parse_volume
from app.services.open_library import OpenLibraryClient, parse_document


def process(repository, job: dict) -> int:
    payload = job.get("payload") or {}
    limit = min(int(payload.get("limit") or 30), 200)
    query = payload.get("query") or "roman"
    if job["job_type"] == "quality_scan":
        return len(repository.admin_catalog_issues("open", limit))
    if job["job_type"] in {"google_books_import", "metadata_refresh"}:
        items = GoogleBooksClient(os.getenv("GOOGLE_BOOKS_API_KEY", "")).search(query, 0, min(limit, 40))
        records = (parse_volume(item) for item in items)
    elif job["job_type"] == "open_library_import":
        items = OpenLibraryClient().search(query, 1, min(limit, 100))
        records = (parse_document(item) for item in items)
    else:
        raise ValueError(f"Desteklenmeyen katalog işi: {job['job_type']}")
    imported = 0
    for record in records:
        if record:
            repository.upsert_metadata_book(record)
            imported += 1
    return imported


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-jobs", type=int, default=10)
    args = parser.parse_args()
    repository = create_repository(settings)
    for _ in range(max(1, args.max_jobs)):
        job = repository.claim_catalog_job()
        if not job:
            break
        try:
            count = process(repository, job)
            repository.finish_catalog_job(job["id"], True)
            print(f"{job['id']} tamamlandı: {count} kayıt")
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError) as error:
            repository.finish_catalog_job(job["id"], False, str(error))
            print(f"{job['id']} yeniden denenecek/karantinaya alınacak: {error}")


if __name__ == "__main__":
    main()

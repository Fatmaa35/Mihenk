"""Create and verify a recoverable SQLite backup without touching the live database."""
import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from app.config import settings


def main() -> None:
    parser = argparse.ArgumentParser(); parser.add_argument("--output", type=Path, default=Path("backups")); args = parser.parse_args()
    if settings.data_backend != "sqlite": raise SystemExit("Supabase yedek tatbikatı hosting ortamında PITR/CLI ile çalıştırılmalıdır; bu araç SQLite içindir.")
    args.output.mkdir(parents=True, exist_ok=True)
    target = args.output / f"app-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.db"
    with sqlite3.connect(settings.database_path) as source, sqlite3.connect(target) as backup: source.backup(backup)
    with sqlite3.connect(target) as check:
        integrity = check.execute("PRAGMA integrity_check").fetchone()[0]
        books = check.execute("SELECT count(*) FROM books").fetchone()[0]
    if integrity != "ok" or books < 1: raise SystemExit(f"Backup verification failed: integrity={integrity}, books={books}")
    print(f"Verified backup: {target} ({books} books)")


if __name__ == "__main__": main()

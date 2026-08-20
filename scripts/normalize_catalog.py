"""Normalize legacy catalog labels and reclassify generic metadata records."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path

from app.services.google_books import TRAITS, _genre


LEGACY_GENRES = {
    "Ţiir": "Şiir",
    "Aile Romaný": "Aile Romanı",
    "Geliţim Romaný": "Gelişim Romanı",
}


def normalize(path: Path) -> dict[str, int]:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    labels_fixed = reclassified = 0
    try:
        rows = connection.execute(
            "SELECT id,title,description,genre,themes_json FROM books"
        ).fetchall()
        for row in rows:
            genre = LEGACY_GENRES.get(row["genre"], row["genre"])
            if genre != row["genre"]:
                labels_fixed += 1
            themes = json.loads(row["themes_json"] or "[]")
            if genre == "Genel":
                candidate = _genre(row["title"], row["description"], themes)
                if candidate != "Genel":
                    genre = candidate
                    reclassified += 1
            traits = TRAITS.get(genre)
            if genre != row["genre"] or traits:
                connection.execute(
                    "UPDATE books SET genre=?,traits_json=? WHERE id=?",
                    (
                        genre,
                        json.dumps(traits or ["meraklı"], ensure_ascii=False),
                        row["id"],
                    ),
                )
        connection.commit()
    finally:
        connection.close()
    return {"labels_fixed": labels_fixed, "reclassified": reclassified}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default=os.getenv("DATABASE_PATH", "data/app.db"))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    path = Path(args.database)
    if not path.is_absolute():
        path = root / path
    print({**normalize(path), "database": str(path)})


if __name__ == "__main__":
    main()

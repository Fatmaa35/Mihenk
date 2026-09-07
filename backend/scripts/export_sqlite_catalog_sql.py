"""Yerel SQLite katalog verisini Supabase/PostgreSQL uyumlu SQL olarak üretir.

Parola, kullanıcı ve oturum tabloları bilinçli olarak dışa aktarılmaz. Kullanıcılar
Supabase Auth üzerinden yeniden oluşturulur.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def records(connection: sqlite3.Connection, query: str) -> list[dict]:
    return [dict(row) for row in connection.execute(query)]


def json_recordset(rows: list[dict], columns: str) -> str:
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    return f"jsonb_to_recordset($catalog${payload}$catalog$::jsonb) as x({columns})"


def export(
    database_path: Path,
    entity: str = "all",
    offset: int = 0,
    limit: int | None = None,
) -> str:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row

    books = records(
        connection,
        """select id,title,author,genre,themes_json,traits_json,description,
                  source_name,source_url,cover_url,metadata_updated_at from books""",
    )
    for book in books:
        book["themes"] = json.loads(book.pop("themes_json"))
        book["character_traits"] = json.loads(book.pop("traits_json"))

    retailers = records(
        connection,
        "select id,name,base_url,robots_url,content_policy from retailers",
    )
    editions = records(
        connection,
        """select isbn,book_id,title,author,publisher,language,published_date,
                  source_name,source_url,verification_status,verified_at from editions""",
    )
    editions = [edition for edition in editions if re.fullmatch(r"97[89][0-9]{10}", edition["isbn"] or "")]
    valid_isbns = {edition["isbn"] for edition in editions}
    offers = records(
        connection,
        """select edition_isbn,retailer_id,product_url,price_minor,list_price_minor,
                  currency,stock_status,checked_at,content_hash from offers""",
    )
    offers = [offer for offer in offers if offer["edition_isbn"] in valid_isbns]
    history = records(
        connection,
        """select o.edition_isbn,o.retailer_id,h.price_minor,h.stock_status,h.observed_at
             from price_history h join offers o on o.id=h.offer_id""",
    )
    history = [row for row in history if row["edition_isbn"] in valid_isbns]
    attempts = records(
        connection,
        "select book_id,status,attempted_at,error from edition_verification_attempts",
    )
    connection.close()

    datasets = {
        "books": books,
        "retailers": retailers,
        "editions": editions,
        "offers": offers,
        "history": history,
        "attempts": attempts,
    }
    if entity != "all":
        if entity not in datasets:
            raise ValueError(f"Bilinmeyen veri grubu: {entity}")
        for name in datasets:
            if name != entity:
                datasets[name] = []
        selected = datasets[entity]
        datasets[entity] = selected[offset : offset + limit if limit is not None else None]
    books = datasets["books"]
    retailers = datasets["retailers"]
    editions = datasets["editions"]
    offers = datasets["offers"]
    history = datasets["history"]
    attempts = datasets["attempts"]

    statements = ["begin;"]
    statements.append(
        f"""
with source as (
    select * from {json_recordset(books, 'id text,title text,author text,genre text,themes jsonb,character_traits jsonb,description text,source_name text,source_url text,cover_url text,metadata_updated_at timestamptz')}
)
insert into public.books (
    id,title,author,genre,themes,character_traits,description,
    source_name,source_url,cover_url,metadata_updated_at
)
select id,title,author,genre,
       array(select jsonb_array_elements_text(themes)),
       array(select jsonb_array_elements_text(character_traits)),
       description,source_name,source_url,cover_url,metadata_updated_at
from source
on conflict (id) do update set
    title=excluded.title,author=excluded.author,genre=excluded.genre,
    themes=excluded.themes,character_traits=excluded.character_traits,
    description=excluded.description,source_name=excluded.source_name,
    source_url=excluded.source_url,cover_url=excluded.cover_url,
    metadata_updated_at=excluded.metadata_updated_at;
"""
    )
    if retailers:
        statements.append(
            f"""
insert into public.retailers (id,name,base_url,robots_url,content_policy)
select id,name,base_url,robots_url,content_policy
from {json_recordset(retailers, 'id text,name text,base_url text,robots_url text,content_policy text')}
on conflict (id) do update set
    name=excluded.name,base_url=excluded.base_url,robots_url=excluded.robots_url,
    content_policy=excluded.content_policy;
"""
        )
    if editions:
        statements.append(
            f"""
insert into public.editions (
    isbn,book_id,title,author,publisher,language,published_date,
    source_name,source_url,verification_status,verified_at
)
select isbn,book_id,title,author,publisher,language,published_date,
       source_name,source_url,coalesce(verification_status,'unverified'),verified_at
from {json_recordset(editions, 'isbn text,book_id text,title text,author text,publisher text,language text,published_date text,source_name text,source_url text,verification_status text,verified_at timestamptz')}
on conflict (isbn) do update set
    book_id=excluded.book_id,title=excluded.title,author=excluded.author,
    publisher=excluded.publisher,language=excluded.language,
    published_date=excluded.published_date,source_name=excluded.source_name,
    source_url=excluded.source_url,verification_status=excluded.verification_status,
    verified_at=excluded.verified_at;
"""
        )
    if offers:
        statements.append(
            f"""
insert into public.offers (
    edition_isbn,retailer_id,product_url,price_minor,list_price_minor,
    currency,stock_status,checked_at,content_hash
)
select edition_isbn,retailer_id,product_url,price_minor,list_price_minor,
       currency,stock_status,checked_at,content_hash
from {json_recordset(offers, 'edition_isbn text,retailer_id text,product_url text,price_minor integer,list_price_minor integer,currency text,stock_status text,checked_at timestamptz,content_hash text')}
on conflict (edition_isbn,retailer_id) do update set
    product_url=excluded.product_url,price_minor=excluded.price_minor,
    list_price_minor=excluded.list_price_minor,currency=excluded.currency,
    stock_status=excluded.stock_status,checked_at=excluded.checked_at,
    content_hash=excluded.content_hash;
"""
        )
    if history:
        statements.append(
            f"""
with source as (
    select * from {json_recordset(history, 'edition_isbn text,retailer_id text,price_minor integer,stock_status text,observed_at timestamptz')}
)
insert into public.price_history (offer_id,price_minor,stock_status,observed_at)
select o.id,s.price_minor,s.stock_status,s.observed_at
from source s
join public.offers o
  on o.edition_isbn=s.edition_isbn and o.retailer_id=s.retailer_id
where not exists (
    select 1 from public.price_history h
    where h.offer_id=o.id and h.price_minor=s.price_minor and h.observed_at=s.observed_at
);
"""
        )
    if attempts:
        statements.append(
            f"""
insert into public.edition_verification_attempts (book_id,status,attempted_at,error)
select book_id,status,attempted_at,error
from {json_recordset(attempts, 'book_id text,status text,attempted_at timestamptz,error text')}
on conflict (book_id) do update set
    status=excluded.status,attempted_at=excluded.attempted_at,error=excluded.error;
"""
        )
    statements.append("commit;")
    return "\n".join(statements)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("database", nargs="?", type=Path, default=ROOT / "data" / "app.db")
    parser.add_argument(
        "--entity",
        choices=("all", "books", "retailers", "editions", "offers", "history", "attempts"),
        default="all",
    )
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int)
    arguments = parser.parse_args()
    print(export(arguments.database, arguments.entity, arguments.offset, arguments.limit))

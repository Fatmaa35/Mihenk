"""Google Books'ün resmî API'sinden kaynaklı katalog metadata'sı alır."""

from __future__ import annotations

import html
import re
import time
from datetime import datetime, timezone
from app.services.outbound_http import safe_get

from bs4 import BeautifulSoup


API_URL = "https://www.googleapis.com/books/v1/volumes"

GENRE_RULES = (
    ("Polisiye", ("polisiye", "dedektif", "cinayet", "cinayat", "mystery", "crime", "krimi", "polar")),
    ("Bilim Kurgu", ("bilim kurgu", "science fiction", "distopya", "uzay", "ciencia ficción")),
    ("Fantastik", ("fantastik", "fantasy", "büyü", "mitoloji", "fantastique", "fantasía")),
    ("Korku ve Gerilim", ("korku", "gerilim", "horror", "thriller", "suspense", "horreur", "terror")),
    ("Grafik Roman", ("grafik roman", "graphic novel", "comics", "çizgi roman", "bandes dessinées", "cómics")),
    ("Klasik", ("dünya klasikleri", "klasik edebiyat", "literary classics", "classics", "classiques", "clásicos")),
    ("Biyografi", ("biyografi", "otobiyografi", "biography", "memoir", "anı", "hatırat", "biographie", "biografía")),
    ("Felsefe", ("felsefe", "philosophy", "philosophie", "filosofía", "etik", "varoluşçuluk")),
    ("Sosyoloji", ("sosyoloji", "sociology", "sociologie", "sociología", "toplum", "gesellschaft", "sociedad", "antropoloji")),
    ("Ekonomi", ("ekonomi", "economics", "économie", "economía", "wirtschaft", "finans", "iş dünyası")),
    ("Bilim", ("popüler bilim", "science", "sciences", "ciencia", "wissenschaft", "fizik", "astronomi", "biyoloji", "matematik")),
    ("Sanat", ("sanat", "art", "arte", "kunst", "müzik", "musique", "musik", "sinema", "fotoğraf", "mimarlık")),
    ("Çocuk ve Gençlik", ("çocuk", "gençlik", "children", "juvenile", "young adult", "junge", "mädchen", "kinder", "jugend", "jeunesse", "enfant", "juvenil", "niños")),
    ("Romantik", ("romantik", "romance", "aşk romanı", "liebe", "amour", "amor")),
    ("Mizah", ("mizah", "humor", "humour", "komedi", "comédie", "comedia", "hiciv")),
    ("Deneme", ("deneme", "essays", "essay", "essais", "ensayo", "eleştiri")),
    ("Şiir", ("şiir", "poetry", "poem", "poésie", "poesie", "poesía")),
    ("Psikoloji", ("psikoloji", "psychology", "psychologie", "psicología", "kişisel gelişim")),
    ("Tarih", ("tarih", "history", "historical", "histoire", "historia", "geschichte")),
    ("Öykü", ("öykü", "hikâye", "hikaye", "short stories", "erzählungen", "contes", "cuentos")),
    ("Macera", ("macera", "adventure", "abenteuer", "aventure", "aventura", "aksiyon")),
    ("Roman", ("roman", "fiction", "edebiyat")),
)

TRAITS = {
    "Polisiye": ["analitik", "gözlemci", "meraklı"],
    "Bilim Kurgu": ["meraklı", "analitik", "maceracı"],
    "Fantastik": ["hayalperest", "cesur", "maceracı"],
    "Korku ve Gerilim": ["cesur", "meraklı", "gözlemci"],
    "Grafik Roman": ["yaratıcı", "gözlemci", "hayalperest"],
    "Klasik": ["gözlemci", "duygusal", "meraklı"],
    "Şiir": ["duygusal", "melankolik", "yaratıcı"],
    "Psikoloji": ["içe dönük", "analitik", "duygusal"],
    "Tarih": ["meraklı", "dirençli", "gözlemci"],
    "Öykü": ["gözlemci", "meraklı", "duygusal"],
    "Macera": ["maceracı", "cesur", "bağımsız"],
    "Roman": ["meraklı", "duygusal", "gözlemci"],
    "Biyografi": ["meraklı", "gözlemci", "dirençli"],
    "Felsefe": ["analitik", "içe dönük", "meraklı"],
    "Sosyoloji": ["gözlemci", "analitik", "idealist"],
    "Ekonomi": ["stratejik", "analitik", "bağımsız"],
    "Bilim": ["meraklı", "analitik", "gözlemci"],
    "Sanat": ["yaratıcı", "duygusal", "gözlemci"],
    "Çocuk ve Gençlik": ["maceracı", "hayalperest", "meraklı"],
    "Romantik": ["duygusal", "idealist", "içe dönük"],
    "Mizah": ["yaratıcı", "gözlemci", "bağımsız"],
    "Deneme": ["gözlemci", "analitik", "içe dönük"],
    "Genel": ["meraklı"],
}


def _plain_text(value: str) -> str:
    text = BeautifulSoup(html.unescape(value or ""), "html.parser").get_text(" ")
    return re.sub(r"\s+", " ", text).strip()


def _genre(title: str, description: str, categories: list[str]) -> str:
    haystack = " ".join([title, description, *categories]).casefold()
    for genre, keywords in GENRE_RULES:
        if any(keyword in haystack for keyword in keywords):
            return genre
    return "Genel"


def parse_volume(item: dict) -> dict | None:
    info = item.get("volumeInfo") or {}
    title = _plain_text(info.get("title", ""))
    authors = [_plain_text(author) for author in info.get("authors", []) if _plain_text(author)]
    description = _plain_text(info.get("description", ""))
    language = (info.get("language") or "").casefold()
    identifiers = info.get("industryIdentifiers") or []
    isbn = next((x.get("identifier") for x in identifiers if x.get("type") == "ISBN_13"), None)
    if not title or not authors or len(description) < 60 or language != "tr" or not isbn:
        return None
    categories = [_plain_text(value) for value in info.get("categories", []) if _plain_text(value)]
    genre = _genre(title, description, categories)
    links = info.get("imageLinks") or {}
    cover = links.get("thumbnail") or links.get("smallThumbnail")
    if cover:
        cover = cover.replace("http://", "https://")
    source_url = info.get("canonicalVolumeLink") or info.get("infoLink")
    return {
        "id": f"google-{item['id']}",
        "title": title[:255],
        "author": ", ".join(authors)[:200],
        "genre": genre,
        "themes": (categories or [genre])[:8],
        "character_traits": TRAITS[genre],
        "description": description[:900],
        "source_name": "Google Books",
        "source_url": source_url,
        "cover_url": cover,
        "metadata_updated_at": datetime.now(timezone.utc).isoformat(),
        "isbn": isbn,
        "publisher": _plain_text(info.get("publisher", "")) or None,
        "language": language,
        "page_count": info.get("pageCount"),
    }


class GoogleBooksClient:
    def __init__(self, api_key: str = "", timeout: int = 20) -> None:
        self.api_key = api_key
        self.timeout = timeout

    def search(self, query: str, start_index: int = 0, max_results: int = 40) -> list[dict]:
        params = {
            "q": query,
            "langRestrict": "tr",
            "printType": "books",
            "startIndex": start_index,
            "maxResults": min(max_results, 40),
        }
        if self.api_key:
            params["key"] = self.api_key
        response = safe_get(API_URL, allowed_hosts={"www.googleapis.com"}, params=params,
                            timeout=self.timeout, headers={"User-Agent": "AkilliKitapDanismani/1.0"})
        response.raise_for_status()
        payload = response.json()
        return payload.get("items", [])

    def iter_records(self, queries: list[str], pages: int, page_size: int, delay: float):
        seen: set[str] = set()
        for query in queries:
            for page in range(pages):
                for item in self.search(query, page * page_size, page_size):
                    record = parse_volume(item)
                    if record and record["isbn"] not in seen:
                        seen.add(record["isbn"])
                        yield record
                if delay:
                    time.sleep(delay)

"""Asistanın kitaplıktan ne gördüğü: kişinin kendi eklediği kitaplar dâhil her raf."""
import json

from app.services.ai.assistant_prompt import MAX_CONTEXT_BOOKS, build_assistant_context


def book(title: str, shelf: str, **extra) -> dict:
    return {"title": title, "author": "Yazar", "shelf": shelf, **extra}


def library(context: str) -> dict:
    return json.loads(context.split("\n", 1)[1])["library"]


def titles(context: str) -> list[str]:
    return [item["title"] for item in library(context)["books"]]


PROFILE = {
    "reading_books": [book("Suç ve Ceza", "reading", progress_percent=42)],
    "to_read_books": [book("Dedemin İnsanları", "to_read", is_custom=True)],
    "read_books": [book("Kürk Mantolu Madonna", "read")],
    "abandoned_books": [book("Ulysses", "abandoned")],
    "favorite_books": [book("Suç ve Ceza", "reading", is_favorite=True)],
}


def test_books_the_person_added_themselves_reach_the_assistant() -> None:
    context = build_assistant_context(PROFILE, None)
    assert "Dedemin İnsanları" in titles(context)
    added = next(item for item in library(context)["books"] if item["title"] == "Dedemin İnsanları")
    assert added["added_by_user"] is True
    assert added["shelf"] == "okuyacak"


def test_every_shelf_is_visible_not_only_the_three_old_ones() -> None:
    assert set(titles(build_assistant_context(PROFILE, None))) == {
        "Suç ve Ceza", "Dedemin İnsanları", "Kürk Mantolu Madonna", "Ulysses",
    }


def test_author_and_progress_travel_with_the_book() -> None:
    reading = next(item for item in library(build_assistant_context(PROFILE, None))["books"]
                   if item["title"] == "Suç ve Ceza")
    assert reading["author"] == "Yazar"
    assert reading["progress_percent"] == 42
    assert reading["favorite"] is True


def test_a_book_on_two_shelves_is_listed_once() -> None:
    assert titles(build_assistant_context(PROFILE, None)).count("Suç ve Ceza") == 1


def test_long_library_is_capped_but_says_how_many_there_are() -> None:
    profile = {"read_books": [book(f"Kitap {index}", "read") for index in range(120)],
               "reading_books": [book("Elimdeki", "reading")], "to_read_books": [],
               "abandoned_books": [], "favorite_books": []}
    context = build_assistant_context(profile, None)
    assert library(context)["count"] == 121
    assert len(library(context)["books"]) == MAX_CONTEXT_BOOKS
    # Elde okunan kitap, yüzlerce bitmiş kitabın arasında kaybolmaz.
    assert "Elimdeki" in titles(context)


def test_active_view_context_is_still_passed_through() -> None:
    context = build_assistant_context(PROFILE, {"view": "catalog", "books": [{"title": "Ekrandaki"}]})
    assert json.loads(context.split("\n", 1)[1])["active_view_context"]["view"] == "catalog"


def test_empty_library_does_not_break_the_context() -> None:
    context = build_assistant_context({}, None)
    assert library(context) == {"count": 0, "books": []}

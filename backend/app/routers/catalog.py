"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()

@router.get("/books", response_model=list[BookView])
def books() -> list[BookView]:
    return [BookView(**book) for book in repository.list_books()]


@router.get("/catalog/books")
def catalog_books(
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=12, ge=1, le=48),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="title", pattern="^(title|popular)$"),
) -> dict:
    """Büyüyen katalog için sunucu taraflı arama ve sayfalama."""
    return repository.search_books(q, limit, offset, sort)


@router.get("/catalog/coverage")
def catalog_coverage() -> dict:
    """Katalog, Türkçe baskı doğrulaması ve fiyat kapsama durumunu gösterir."""
    return repository.catalog_coverage()


@router.get("/books/{book_id}/details")
def book_details(book_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    book = next((item for item in repository.list_books() if item["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Kitap bulunamadı.")
    community = repository.book_community(book_id, session["user"]["id"], session["access_token"])
    offers = repository.list_retail_offers(book_id=book_id)
    history = repository.list_book_price_history(book_id)
    forecasts = repository.list_book_price_forecasts(book_id)
    profile = repository.user_preferences(session["user"]["id"], session["access_token"])
    preferred = {value.casefold() for value in profile.get("preferred_genres", [])}
    genre_match = book.get("genre", "").casefold() in preferred
    quality = float(book.get("quality_score") or 0)
    popularity = float(book.get("popularity_score") or 0)
    match_score = round(min(0.98, 0.42 + quality * 0.28 + popularity * 0.18 + (0.12 if genre_match else 0)), 2)
    reasons = ["Katalog kalite sinyalleri güçlü" if quality >= .7 else "Eser bilgileri katalog sinyalleriyle eşleşiyor"]
    if genre_match:
        reasons.append("Tercih ettiğin türlerden biri")
    if community.get("rating_count", 0):
        reasons.append("Topluluk puanı öneriyi destekliyor")
    return {"book": book, "community": community, "offers": offers, "price_history": history,
            "price_forecasts": forecasts, "price_intelligence": price_intelligence(history),
            "ai_match": {"score": match_score, "reasons": reasons, "deterministic": True}}

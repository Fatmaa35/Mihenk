"""Price discovery and user price-alert HTTP routes."""
from fastapi import APIRouter

from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter(tags=["pricing"])


@router.get("/market/offers")
def market_offers(isbn: str | None = None) -> list[dict]:
    return repository.list_retail_offers(isbn=isbn)


@router.get("/books/{book_id}/offers")
def book_offers(book_id: str) -> list[dict]:
    return repository.list_retail_offers(book_id=book_id)


@router.post("/books/{book_id}/offers/live", status_code=202)
def start_live_book_offers(book_id: str, request: Request, response: Response, force: bool = False) -> dict:
    """Kitabı izinli mağazalarda canlı arar; sonucu beklemeden ilk durumu döner.

    ``force`` kişi "fiyatları yenile" dediğinde gelir: bekleme süresi kısalır ama
    yine de aynı kitap on dakikada birden sık mağazalara sorulmaz.
    """
    current_session(request, response)
    book = next((item for item in services.catalog if item["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Kitap bulunamadı.")
    try:
        return live_lookups.start(repository, book, fresh_for=MANUAL_FRESH_FOR if force else None)
    except LiveLookupBusy as error:
        raise HTTPException(status_code=429, detail=error.args[0]) from error


@router.get("/books/{book_id}/offers/live")
def live_book_offers(book_id: str, request: Request, response: Response) -> dict:
    """Süren ya da yeni bitmiş aramanın mağaza mağaza durumu."""
    current_session(request, response)
    return live_lookups.snapshot(book_id) or idle_snapshot(book_id)


@router.get("/me/price-alerts")
def my_price_alerts(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_price_alerts(
        session["user"]["id"], access_token=session["access_token"]
    )


@router.put("/me/price-alerts")
def update_my_price_alert(
    payload: PriceAlertUpsert, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    try:
        return repository.upsert_price_alert(
            session["user"]["id"], **payload.model_dump(),
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@router.delete("/me/price-alerts/{book_id}", status_code=204)
def delete_my_price_alert(book_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.delete_price_alert(
        session["user"]["id"], book_id, access_token=session["access_token"]
    )
    response.status_code = 204
    return response

"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()


@router.put("/users/{user_id}/library")
def update_library(user_id: str, payload: LibraryEntryUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    if session["user"]["id"] != user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcının kitaplığı değiştirilemez.")
    try:
        return repository.upsert_library_entry(
            user_id,
            **payload.model_dump(),
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

@router.put("/me/library")
def update_my_library(payload: LibraryEntryUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.upsert_library_entry(
            session["user"]["id"],
            **payload.model_dump(),
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/me/custom-books", status_code=201)
def create_my_custom_book(
    payload: CustomBookUpsert, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    try:
        return repository.save_custom_book(
            session["user"]["id"], **payload.model_dump(), access_token=session["access_token"]
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.put("/me/custom-books/{custom_book_id}")
def update_my_custom_book(
    custom_book_id: str, payload: CustomBookUpsert, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    try:
        return repository.save_custom_book(
            session["user"]["id"], **payload.model_dump(), custom_book_id=custom_book_id,
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/me/custom-books/{custom_book_id}", status_code=204)
def delete_my_custom_book(
    custom_book_id: str, request: Request, response: Response,
) -> Response:
    session = current_session(request, response)
    try:
        repository.delete_custom_book(
            session["user"]["id"], custom_book_id, access_token=session["access_token"]
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    response.status_code = 204
    return response


@router.put("/me/reading-goal")
def update_my_reading_goal(
    payload: ReadingGoalUpsert, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    return repository.upsert_reading_goal(
        session["user"]["id"], **payload.model_dump(), access_token=session["access_token"]
    )


@router.get("/me/reading-dashboard")
def my_reading_dashboard(
    request: Request, response: Response,
    year: int = Query(default=date.today().year, ge=2000, le=2200),
) -> dict:
    session = current_session(request, response)
    return repository.reading_dashboard(
        session["user"]["id"], year, access_token=session["access_token"]
    )


@router.post("/me/reading-sessions", response_model=ReadingSessionView)
def create_my_reading_session(
    payload: ReadingSessionCreate, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    return repository.add_reading_session(
        session["user"]["id"], payload.model_dump(), access_token=session["access_token"]
    )


@router.get("/me/reading-sessions", response_model=list[ReadingSessionView])
def list_my_reading_sessions(
    request: Request, response: Response, book_id: str | None = None
) -> list[dict]:
    session = current_session(request, response)
    return repository.list_reading_sessions(
        session["user"]["id"], book_id=book_id, access_token=session["access_token"]
    )


@router.get("/me/reading-sessions/stats", response_model=ReadingSessionStats)
def my_reading_session_stats(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.get_reading_session_stats(
        session["user"]["id"], access_token=session["access_token"]
    )


@router.post("/me/quotes", response_model=BookQuoteView)
def create_my_quote(
    payload: BookQuoteCreate, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    return repository.add_book_quote(
        session["user"]["id"], payload.model_dump(), access_token=session["access_token"]
    )


@router.get("/me/quotes", response_model=list[BookQuoteView])
def list_my_quotes(
    request: Request, response: Response, book_id: str | None = None
) -> list[dict]:
    session = current_session(request, response)
    return repository.list_book_quotes(
        session["user"]["id"], book_id=book_id, access_token=session["access_token"]
    )


@router.get("/books/isbn/{isbn}", response_model=ISBNBookLookupResponse)
async def lookup_book_by_isbn(isbn: str) -> dict:
    clean_isbn = "".join(c for c in isbn if c.isdigit() or c.upper() == "X")
    if not clean_isbn:
        raise HTTPException(status_code=400, detail="Geçersiz ISBN numarası.")

    if len(clean_isbn) == 13:
        formatted_isbn = "-".join((clean_isbn[:3], clean_isbn[3:6], clean_isbn[6:8], clean_isbn[8:12], clean_isbn[12:]))
    elif len(clean_isbn) == 10:
        formatted_isbn = "-".join((clean_isbn[:1], clean_isbn[1:4], clean_isbn[4:9], clean_isbn[9:]))
    else:
        formatted_isbn = clean_isbn
    isbn_candidates = list(dict.fromkeys((clean_isbn, formatted_isbn)))

    # 1. Open Library API lookup
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            ol_keys = [f"ISBN:{candidate}" for candidate in isbn_candidates]
            ol_res = await client.get(
                "https://openlibrary.org/api/books",
                params={"bibkeys": ",".join(ol_keys), "format": "json", "jscmd": "data"},
            )
            if ol_res.status_code == 200:
                data = ol_res.json()
                key = next((candidate for candidate in ol_keys if candidate in data), None)
                if key:
                    item = data[key]
                    authors = [a.get("name") for a in item.get("authors", []) if a.get("name")]
                    cover = item.get("cover", {}).get("large") or item.get("cover", {}).get("medium")
                    subjects = [subject.get("name") for subject in item.get("subjects", []) if subject.get("name")]
                    result = {
                        "isbn": clean_isbn,
                        "title": item.get("title", "Bilinmeyen Kitap"),
                        "author": ", ".join(authors) if authors else "Bilinmeyen Yazar",
                        "page_count": item.get("number_of_pages"),
                        "cover_url": cover,
                        "description": item.get("notes") or item.get("by_statement"),
                        "publication_year": str(item.get("publish_date")) if item.get("publish_date") else None,
                        "publisher": ", ".join([p.get("name") for p in item.get("publishers", []) if p.get("name")]) or None,
                    }
                    return result
    except Exception:
        pass

    # 2. Google Books API fallback lookup
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            for candidate in isbn_candidates:
                gb_res = await client.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params={"q": f"isbn:{candidate}"},
                )
                items = gb_res.json().get("items", []) if gb_res.status_code == 200 else []
                if items:
                    info = items[0].get("volumeInfo", {})
                    authors = info.get("authors", [])
                    image_links = info.get("imageLinks", {})
                    cover = image_links.get("thumbnail") or image_links.get("smallThumbnail")
                    if cover and cover.startswith("http:"):
                        cover = "https:" + cover[5:]
                    result = {
                        "isbn": clean_isbn,
                        "title": info.get("title", "Bilinmeyen Kitap"),
                        "author": ", ".join(authors) if authors else "Bilinmeyen Yazar",
                        "page_count": info.get("pageCount"),
                        "cover_url": cover,
                        "description": info.get("description"),
                        "publication_year": str(info.get("publishedDate")) if info.get("publishedDate") else None,
                        "publisher": info.get("publisher"),
                    }
                    return result
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="ISBN numarası ile kitap bulunamadı.")


@router.post("/me/books/isbn/{isbn}", response_model=ISBNBookLookupResponse)
async def import_book_by_isbn(
    isbn: str, request: Request, response: Response,
) -> dict:
    """Persist an ISBN lookup only after an authenticated, state-changing request."""
    current_session(request, response)
    book = await lookup_book_by_isbn(isbn)
    return save_isbn_lookup_to_catalog(
        book,
        source_name="Open Library / Google Books",
        source_url=None,
    )


@router.get("/me/gamification")
def my_gamification(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.gamification_summary(
        session["user"]["id"], access_token=session["access_token"]
    )


@router.put("/me/gamification/showcase")
def update_my_badge_showcase(
    payload: BadgeShowcaseUpdate, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    try:
        return repository.update_badge_showcase(
            session["user"]["id"], payload.badge_codes,
            access_token=session["access_token"],
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/me/notifications")
def my_notifications(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_notifications(
        session["user"]["id"], access_token=session["access_token"]
    )


@router.get("/notifications/capabilities")
def notification_capabilities() -> dict:
    return {
        "email": settings.reminder_provider in {"smtp", "multi"},
        "push": settings.reminder_provider in {"webpush", "multi"},
        "vapid_public_key": settings.web_push_vapid_public_key
        if settings.reminder_provider in {"webpush", "multi"} else None,
    }


@router.post("/me/push-subscriptions", status_code=201)
def save_push_subscription(payload: PushSubscriptionUpsert, request: Request,
                           response: Response) -> dict:
    if settings.reminder_provider not in {"webpush", "multi"}:
        raise HTTPException(status_code=503, detail="Push bildirimleri yapılandırılmadı.")
    session = current_session(request, response)
    return repository.upsert_web_push_subscription(
        session["user"]["id"], payload.endpoint, payload.p256dh, payload.auth,
        request.headers.get("user-agent", "")[:500], session["access_token"],
    )


@router.delete("/me/push-subscriptions", status_code=204)
def remove_push_subscription(payload: PushSubscriptionDelete, request: Request,
                             response: Response) -> Response:
    session = current_session(request, response)
    repository.delete_web_push_subscription(
        session["user"]["id"], payload.endpoint, session["access_token"]
    )
    response.status_code = 204
    return response


@router.put("/me/notifications/{notification_id}/read")
def read_my_notification(
    notification_id: str, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    try:
        return repository.mark_notification_read(
            session["user"]["id"], notification_id,
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@router.put("/me/notifications/read-all")
def read_all_my_notifications(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return {"updated": repository.mark_all_notifications_read(
        session["user"]["id"], session["access_token"]
    )}

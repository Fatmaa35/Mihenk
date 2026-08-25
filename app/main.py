from datetime import date, datetime, timezone
import asyncio
import json
import secrets
import httpx
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.config import ROOT, settings
from app.repository_factory import create_repository, create_search_index
from app.schemas import (
    BookView,
    CharacterSearchRequest,
    CharacterRecommendationRequest,
    CharacterRecommendationResponse,
    ChatRequest,
    ChatActionExecute,
    ChatSessionPatch,
    ChatMessagePatch,
    ChatResponse,
    CustomBookUpsert,
    LibraryEntryUpsert,
    LoginRequest,
    PasswordRecoveryRequest,
    PasswordResetRequest,
    ConfirmationResendRequest,
    PriceAlertUpsert,
    RecommendationFeedbackUpsert,
    BookComparisonRequest,
    ReadingPlanUpsert,
    ReadingPlanStatusPatch,
    ReadingGoalUpsert,
    RegisterRequest,
    UserCreate,
    UserPreferencesUpsert,
    AdminBookPatch,
    CatalogMergeRequest,
    CatalogJobCreate,
    ReviewResolution,
    UserRoleUpdate,
    FeatureFlagUpsert,
    BookRatingUpsert,
    BadgeShowcaseUpdate,
    BookCommentCreate,
    BookCommentPatch,
    CommentReportCreate,
    AdminReportResolutionPatch,
    AdminUserVerificationPatch,
    AdminUserBanPatch,
    AdminCommentModerationPatch,
    PricePipelineTrigger,
    ReadingSessionCreate,
    ReadingSessionView,
    ReadingSessionStats,
    BookQuoteCreate,
    BookQuoteView,
    ISBNBookLookupResponse,
)
from app.services.consensus import ConsensusRecommender
from app.services.chatbot import BookChatbot
from app.services.gemini import GeminiExplainer, GeminiUnavailable
from app.services.llm_factory import create_explainer
from app.services.llm_profiles import ASSISTANT_PROFILE, MATCHER_PROFILE
from app.services.recommendation_evaluation import run_evaluation
from app.services.security import SecurityMiddleware
from app.services.observability import ObservabilityMiddleware, metrics, recent_events
from app.services.price_forecasting import price_intelligence
from app.services.price_pipeline import run_full_price_pipeline
from app.supabase_repository import SupabaseRequestError


app = FastAPI(title="Akıllı Kitap Danışmanı", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_middleware(SecurityMiddleware, allowed_origins=settings.allowed_origins, enabled=settings.rate_limit_enabled)
app.add_middleware(ObservabilityMiddleware)
repository = create_repository(settings)
app.state.application_event_sink = repository.application_event
repository.seed_books(ROOT / "data" / "books.json")
catalog = repository.list_books()
search_index = create_search_index(settings, repository, catalog)
recommender = ConsensusRecommender(catalog, search_index)
explainer = create_explainer(settings)
chatbot = BookChatbot(recommender, explainer, settings.gemini_model)
STATIC_DIR = Path(__file__).parent / "static"
STATIC_PAGE = STATIC_DIR / "index.html"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
ACCESS_COOKIE = "book_access_token"
REFRESH_COOKIE = "book_refresh_token"


def current_session(request: Request, response: Response) -> dict:
    session = repository.resolve_session(
        request.cookies.get(ACCESS_COOKIE),
        request.cookies.get(REFRESH_COOKIE),
    )
    if not session:
        raise HTTPException(status_code=401, detail="Oturum açmanız gerekiyor.")
    if session.get("access_token") != request.cookies.get(ACCESS_COOKIE):
        set_session_cookies(response, session)
    user = session["user"]
    try:
        account = repository.account_status(user["id"], session.get("access_token"))
    except KeyError as error:
        raise HTTPException(status_code=401, detail="Hesap bulunamadı.") from error
    if account.get("is_banned"):
        raise HTTPException(status_code=403, detail={"code": "account_banned", "message": "Hesabınız yönetici tarafından askıya alındı.",
                                                       "reason": account.get("ban_reason"), "until": account.get("banned_until")})
    user.update({"is_verified": bool(account.get("is_verified")), "verification_label": account.get("verification_label")})
    role = repository.user_role(user["id"], session.get("access_token"))
    if user.get("email", "").casefold() in settings.admin_emails:
        if role != "admin":
            repository.set_user_role(user["id"], "admin", session.get("access_token"))
        role = "admin"
    user["app_role"] = role
    return session


def require_role(request: Request, response: Response, *roles: str) -> dict:
    session = current_session(request, response)
    if session["user"].get("app_role", "user") not in roles:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
    return session


def refresh_catalog_state() -> None:
    global catalog, search_index, recommender, chatbot
    catalog = repository.list_books()
    search_index = create_search_index(settings, repository, catalog)
    recommender = ConsensusRecommender(catalog, search_index)
    chatbot = BookChatbot(recommender, explainer, settings.gemini_model)


def save_isbn_lookup_to_catalog(book: dict, *, source_name: str, source_url: str | None,
                                language: str = "tr", themes: list[str] | None = None) -> dict:
    """Persist barcode metadata idempotently and return catalog status to the client."""
    clean_isbn = "".join(char for char in str(book["isbn"]) if char.isdigit() or char.upper() == "X")
    theme_values = [str(value).strip() for value in (themes or []) if str(value).strip()][:8]
    record = {
        "id": f"isbn-{clean_isbn}",
        "isbn": clean_isbn,
        "title": book["title"],
        "author": book["author"],
        "genre": theme_values[0] if theme_values else "Genel",
        "themes": theme_values or ["Genel"],
        "character_traits": ["meraklı"],
        "description": book.get("description") or (
            f"{book['author']} tarafından yazılan {book['title']} eserinin ISBN {clean_isbn} baskısı."
        ),
        "source_name": source_name,
        "source_url": source_url,
        "cover_url": book.get("cover_url"),
        "publisher": book.get("publisher"),
        "language": (language or "tr").casefold(),
        "page_count": book.get("page_count"),
        "metadata_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    book_id = repository.upsert_metadata_book(record)
    refresh_catalog_state()
    return {**book, "catalog_saved": True, "catalog_book_id": book_id}


def set_session_cookies(response: Response, session: dict) -> None:
    access_max_age = 55 * 60 if session.get("refresh_token") else 14 * 24 * 60 * 60
    response.set_cookie(
        ACCESS_COOKIE,
        session["access_token"],
        max_age=access_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    if session.get("refresh_token"):
        response.set_cookie(
            REFRESH_COOKIE,
            session["refresh_token"],
            max_age=14 * 24 * 60 * 60,
            httponly=True,
            samesite="lax",
            secure=settings.cookie_secure,
            path="/",
        )


@app.exception_handler(SupabaseRequestError)
def supabase_error_handler(request: Request, error: SupabaseRequestError) -> JSONResponse:
    metrics.increment("supabase_errors")
    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(STATIC_PAGE, media_type="text/html; charset=utf-8")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "data_backend": settings.data_backend,
        "books": len(repository.list_books()),
        "llm_enabled": explainer.enabled,
        "ai_provider": settings.ai_provider,
        "ai_model": getattr(explainer, "model", None),
        "llm_profiles": {
            MATCHER_PROFILE.name: {
                "temperature": MATCHER_PROFILE.temperature,
                "output": "structured_json",
            },
            ASSISTANT_PROFILE.name: {
                "temperature": ASSISTANT_PROFILE.temperature,
                "output": "markdown_text",
                "history_messages": ASSISTANT_PROFILE.max_history_messages,
            },
        },
        "scoring": {"character": 0.45, "themes": 0.15, "reading_history": 0.40},
        "semantic_search": type(search_index).__name__,
    }


@app.get("/ready")
def ready() -> dict:
    books = repository.list_books()
    if not books:
        raise HTTPException(status_code=503, detail="Katalog hazır değil.")
    return {"status": "ready", "catalog_books": len(books), "backend": settings.data_backend}


@app.get("/admin/metrics")
def admin_metrics(request: Request, response: Response) -> dict:
    require_role(request, response, "admin")
    quality = repository.quality_dashboard()
    snapshot = metrics.snapshot()
    login = snapshot.get("routes", {}).get("/auth/login", {})
    business = snapshot.get("business", {})
    alerts = []
    if business.get("login_failure_rate", 0) >= .35 and login.get("requests", 0) >= 10:
        alerts.append({"severity": "warning", "code": "login_failure_spike", "message": "Giriş başarısızlık oranı %35 eşiğini aştı."})
    if login.get("p95_ms", 0) >= 1500:
        alerts.append({"severity": "warning", "code": "login_p95_high", "message": "Giriş P95 süresi 1500 ms eşiğini aştı."})
    if business.get("supabase_errors", 0) >= 5:
        alerts.append({"severity": "critical", "code": "supabase_error_spike", "message": "Supabase hata sayısı alarm eşiğini aştı."})
    if business.get("suspicious_login_attempts", 0) >= 10:
        alerts.append({"severity": "critical", "code": "suspicious_login_spike", "message": "Şüpheli giriş denemeleri alarm eşiğini aştı."})
    return {**snapshot, "alerts": alerts, "product": {
        "zero_result_queries": quality.get("zero_result_queries", 0),
        "gemma_fallback_rate": quality.get("fallback_rate", 0),
        "catalog_books": len(catalog),
    }}


@app.get("/me/feature-flags")
def my_feature_flags(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_feature_flags(session["access_token"])


@app.put("/admin/feature-flags/{key}")
def admin_feature_flag(key: str, payload: FeatureFlagUpsert, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    if not key.replace("_", "").replace("-", "").isalnum() or len(key) > 80:
        raise HTTPException(status_code=400, detail="Geçersiz feature flag anahtarı.")
    result = repository.upsert_feature_flag(key, **payload.model_dump(), access_token=session["access_token"])
    repository.audit(session["user"]["id"], "feature_flag.upsert", "feature_flag", key,
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result


@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, response: Response) -> dict:
    try:
        session = repository.open_registration_session(payload.display_name, payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if session.get("access_token"):
        set_session_cookies(response, session)
    return {
        **session["user"],
        "email_confirmation_required": session.get("email_confirmation_required", False),
    }


@app.post("/auth/login")
def login(payload: LoginRequest, response: Response) -> dict:
    try:
        session = repository.open_login_session(payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    set_session_cookies(response, session)
    return session["user"]


@app.post("/auth/password/forgot", status_code=202)
def forgot_password(payload: PasswordRecoveryRequest) -> dict:
    repository.request_password_reset(payload.email, settings.recovery_redirect_url)
    return {"message": "Hesap mevcutsa parola sıfırlama bağlantısı e-posta adresine gönderildi."}


@app.post("/auth/password/reset")
def reset_password(payload: PasswordResetRequest) -> dict:
    try:
        repository.reset_password(payload.recovery_token, payload.new_password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"message": "Parolan güncellendi. Yeni parolanla giriş yapabilirsin."}


@app.post("/auth/confirmation/resend", status_code=202)
def resend_confirmation(payload: ConfirmationResendRequest) -> dict:
    repository.resend_confirmation(payload.email)
    return {"message": "Hesap mevcutsa doğrulama e-postası yeniden gönderildi."}


@app.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response) -> Response:
    repository.close_session(
        request.cookies.get(ACCESS_COOKIE),
        request.cookies.get(REFRESH_COOKIE),
    )
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    response.status_code = 204
    return response


@app.get("/auth/me")
def auth_me(request: Request, response: Response) -> dict:
    return current_session(request, response)["user"]


@app.get("/me/bootstrap")
def bootstrap_me(request: Request, response: Response) -> dict:
    """Resolve auth once and return only the data required to paint the app shell."""
    session = current_session(request, response)
    user_id, token = session["user"]["id"], session["access_token"]
    return {
        "user": session["user"],
        "profile": repository.user_profile(user_id, token),
        "preferences": repository.user_preferences(user_id, token),
        "gamification": repository.gamification_summary(user_id, token),
        "notifications": repository.list_notifications(user_id, token),
    }


@app.delete("/me/account", status_code=204)
def delete_my_account(request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.audit(session["user"]["id"], "account.delete", "user", session["user"]["id"],
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    repository.delete_user_account(session["user"]["id"], session["access_token"])
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)
    response.status_code = 204
    return response


@app.get("/me/profile")
def my_profile(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.user_profile(session["user"]["id"], access_token=session["access_token"])


@app.get("/me/preferences")
def my_preferences(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.user_preferences(
        session["user"]["id"], access_token=session["access_token"]
    )


@app.put("/me/preferences")
def update_my_preferences(
    payload: UserPreferencesUpsert, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    try:
        return repository.upsert_user_preferences(
            session["user"]["id"],
            **payload.model_dump(),
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@app.put("/me/library")
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


@app.post("/me/custom-books", status_code=201)
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


@app.put("/me/custom-books/{custom_book_id}")
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


@app.delete("/me/custom-books/{custom_book_id}", status_code=204)
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


@app.put("/me/reading-goal")
def update_my_reading_goal(
    payload: ReadingGoalUpsert, request: Request, response: Response,
) -> dict:
    session = current_session(request, response)
    return repository.upsert_reading_goal(
        session["user"]["id"], **payload.model_dump(), access_token=session["access_token"]
    )


@app.get("/me/reading-dashboard")
def my_reading_dashboard(
    request: Request, response: Response,
    year: int = Query(default=date.today().year, ge=2000, le=2200),
) -> dict:
    session = current_session(request, response)
    return repository.reading_dashboard(
        session["user"]["id"], year, access_token=session["access_token"]
    )


@app.post("/me/reading-sessions", response_model=ReadingSessionView)
def create_my_reading_session(
    payload: ReadingSessionCreate, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    return repository.add_reading_session(
        session["user"]["id"], payload.model_dump(), access_token=session["access_token"]
    )


@app.get("/me/reading-sessions", response_model=list[ReadingSessionView])
def list_my_reading_sessions(
    request: Request, response: Response, book_id: str | None = None
) -> list[dict]:
    session = current_session(request, response)
    return repository.list_reading_sessions(
        session["user"]["id"], book_id=book_id, access_token=session["access_token"]
    )


@app.get("/me/reading-sessions/stats", response_model=ReadingSessionStats)
def my_reading_session_stats(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.get_reading_session_stats(
        session["user"]["id"], access_token=session["access_token"]
    )


@app.post("/me/quotes", response_model=BookQuoteView)
def create_my_quote(
    payload: BookQuoteCreate, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    return repository.add_book_quote(
        session["user"]["id"], payload.model_dump(), access_token=session["access_token"]
    )


@app.get("/me/quotes", response_model=list[BookQuoteView])
def list_my_quotes(
    request: Request, response: Response, book_id: str | None = None
) -> list[dict]:
    session = current_session(request, response)
    return repository.list_book_quotes(
        session["user"]["id"], book_id=book_id, access_token=session["access_token"]
    )


@app.get("/books/isbn/{isbn}", response_model=ISBNBookLookupResponse)
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


@app.post("/me/books/isbn/{isbn}", response_model=ISBNBookLookupResponse)
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


@app.get("/me/gamification")
def my_gamification(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.gamification_summary(
        session["user"]["id"], access_token=session["access_token"]
    )


@app.put("/me/gamification/showcase")
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


@app.get("/me/price-alerts")
def my_price_alerts(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_price_alerts(
        session["user"]["id"], access_token=session["access_token"]
    )


@app.put("/me/price-alerts")
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


@app.delete("/me/price-alerts/{book_id}", status_code=204)
def delete_my_price_alert(book_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.delete_price_alert(
        session["user"]["id"], book_id, access_token=session["access_token"]
    )
    response.status_code = 204
    return response


@app.get("/me/notifications")
def my_notifications(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_notifications(
        session["user"]["id"], access_token=session["access_token"]
    )


@app.put("/me/notifications/{notification_id}/read")
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


@app.put("/me/notifications/read-all")
def read_all_my_notifications(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return {"updated": repository.mark_all_notifications_read(
        session["user"]["id"], session["access_token"]
    )}


@app.post("/me/recommendations", response_model=CharacterRecommendationResponse)
async def my_recommendations(payload: CharacterSearchRequest, request: Request, response: Response) -> CharacterRecommendationResponse:
    started = perf_counter()
    session = current_session(request, response)
    user = session["user"]
    profile = repository.user_profile(user["id"], access_token=session["access_token"])
    profile["preferences"] = repository.user_preferences(user["id"], session["access_token"])
    summary, candidates = recommender.recommend(
        payload.character_description, profile, 50,
        access_token=session["access_token"],
    )
    fallback_used = False
    try:
        result = await explainer.explain(profile, payload.character_description, summary, candidates, payload.limit)
    except GeminiUnavailable:
        fallback_used = True
        result = await GeminiExplainer("", settings.gemini_model, False).explain(profile, payload.character_description, summary, candidates, payload.limit)
    repository.log_recommendation_event(user["id"], payload.character_description, len(result.recommended_books),
                                        fallback_used, round((perf_counter() - started) * 1000), session["access_token"])
    response.headers["X-Search-Explanation"] = json.dumps(recommender.last_query_explanation, ensure_ascii=True, separators=(",", ":"))[:4000]
    return result


@app.get("/me/recommendations/explanation")
def my_recommendation_explanation(request: Request, response: Response) -> dict:
    current_session(request, response)
    return recommender.last_query_explanation


@app.post("/me/chat", response_model=ChatResponse)
async def chat_with_book_assistant(
    payload: ChatRequest, request: Request, response: Response,
) -> ChatResponse:
    session = current_session(request, response)
    user_id = session["user"]["id"]
    profile = repository.user_profile(user_id, access_token=session["access_token"])
    profile["preferences"] = repository.user_preferences(user_id, session["access_token"])
    dashboard = repository.reading_dashboard(
        user_id, date.today().year, access_token=session["access_token"]
    )
    chat_session = None
    if payload.session_id:
        existing = repository.list_chat_sessions(user_id, session["access_token"])
        chat_session = next((item for item in existing if item["id"] == payload.session_id), None)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")
    else:
        chat_session = repository.create_chat_session(user_id, access_token=session["access_token"])
    stored = repository.chat_messages(user_id, chat_session["id"], 12, session["access_token"])
    history = [{"role": item["role"], "content": item["content"]} for item in stored[-8:]] or [item.model_dump() for item in payload.history]
    repository.save_chat_message(user_id, chat_session["id"], "user", payload.message, access_token=session["access_token"])
    result = await chatbot.reply(
        payload.message, profile, dashboard, access_token=session["access_token"],
        history=history,
        active_view_context=(
            payload.active_view_context.model_dump() if payload.active_view_context else None
        ),
    )
    repository.save_chat_message(user_id, chat_session["id"], "assistant", result.answer,
                                 [book.model_dump() for book in result.books], session["access_token"])
    result.session_id = chat_session["id"]
    return result


@app.get("/me/chat/sessions")
def my_chat_sessions(request: Request, response: Response,
                     q: str | None = Query(default=None, max_length=120), archived: bool = False) -> list[dict]:
    session = current_session(request, response)
    return repository.list_chat_sessions(session["user"]["id"], session["access_token"], q, archived)


@app.patch("/me/chat/sessions/{session_id}")
def patch_my_chat_session(session_id: str, payload: ChatSessionPatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_session(session["user"]["id"], session_id,
                                          payload.model_dump(exclude_unset=True), session["access_token"])


@app.get("/me/chat/sessions/{session_id}/messages")
def my_chat_messages(session_id: str, request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.chat_messages(session["user"]["id"], session_id, 100, session["access_token"])


@app.delete("/me/chat/sessions/{session_id}", status_code=204)
def delete_my_chat_session(session_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.delete_chat_session(session["user"]["id"], session_id, session["access_token"])
    response.status_code = 204
    return response


@app.patch("/me/chat/messages/{message_id}")
def patch_my_chat_message(message_id: str, payload: ChatMessagePatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_message(session["user"]["id"], message_id, payload.content, False, session["access_token"])


@app.delete("/me/chat/messages/{message_id}")
def delete_my_chat_message(message_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_message(session["user"]["id"], message_id, None, True, session["access_token"])


@app.post("/me/chat/stream")
async def stream_book_assistant(payload: ChatRequest, request: Request) -> StreamingResponse:
    """SSE transport supports stop/retry UX; persistence uses the same validated chat path."""
    async def events():
        result = await chat_with_book_assistant(payload, request, Response())
        for word in result.answer.split(" "):
            if await request.is_disconnected():
                return
            yield "event: delta\ndata: " + json.dumps({"text": word + " "}, ensure_ascii=False) + "\n\n"
            await asyncio.sleep(0)
        yield "event: complete\ndata: " + result.model_dump_json() + "\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


@app.post("/me/chat/actions/execute")
def execute_chat_action(payload: ChatActionExecute, request: Request, response: Response) -> dict:
    started = perf_counter()
    session = current_session(request, response)
    action, user_id, token = payload.action, session["user"]["id"], session["access_token"]
    existing_result = repository.action_execution(user_id, payload.idempotency_key, token)
    if existing_result is not None:
        return {**existing_result, "replayed": True}
    book = next((item for item in catalog if item["id"] == action.book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Bu işlem yapılamıyor: kitap katalogda bulunamadı.")
    profile = repository.user_profile(user_id, token)
    entry = next((item for shelf in ("read_books", "reading_books", "to_read_books")
                  for item in profile[shelf] if item["id"] == action.book_id), None)
    action_payload = action.model_dump()
    try:
        if action.action_type == "set_price_alert":
            previous = next((item for item in repository.list_price_alerts(user_id, token) if item["book_id"] == action.book_id), None)
            result = repository.upsert_price_alert(user_id, action.book_id, int(action.arguments["target_price_minor"]), "TRY", True, token)
            inverse = {"kind": "restore_price_alert", "value": previous, "book_id": action.book_id}
        else:
            inverse = {"kind": "restore_library", "value": entry, "book_id": action.book_id}
            shelf = "read" if action.action_type == "finish_book" else "reading" if action.action_type == "update_progress" else str(action.arguments.get("shelf", entry.get("shelf", "to_read") if entry else "to_read"))
            favorite = True if action.action_type == "favorite" else bool(entry and entry.get("is_favorite"))
            current_page = int(action.arguments.get("current_page", entry.get("current_page", 0) if entry else 0))
            total_pages = entry.get("total_pages") if entry else book.get("page_count")
            if total_pages and current_page > total_pages:
                raise HTTPException(status_code=422, detail=f"Bu işlem yapılamıyor: kitap {total_pages} sayfa, istenen ilerleme {current_page}.")
            if shelf == "read" and total_pages:
                current_page = total_pages
            result = repository.upsert_library_entry(user_id, action.book_id, shelf, favorite, current_page, total_pages, None, token)
        result = {**result, "idempotency_key": payload.idempotency_key, "undo_available": True}
        repository.save_action_execution(user_id, payload.idempotency_key, action.action_type, result, token,
                                         action_payload=action_payload, inverse_action=inverse,
                                         duration_ms=round((perf_counter() - started) * 1000))
        return result
    except HTTPException:
        raise
    except (KeyError, ValueError, SupabaseRequestError) as error:
        repository.save_action_execution(user_id, payload.idempotency_key, action.action_type,
                                         {"detail": str(error)}, token, action_payload=action_payload,
                                         status="failed", error_code=type(error).__name__,
                                         duration_ms=round((perf_counter() - started) * 1000))
        raise HTTPException(status_code=422, detail=f"Bu işlem yapılamıyor: {error}") from error


@app.get("/me/chat/actions/schema")
def chat_action_schema(request: Request, response: Response) -> dict:
    current_session(request, response)
    from app.schemas import ChatAction
    return ChatAction.model_json_schema()


@app.get("/me/chat/actions/history")
def chat_action_history(request: Request, response: Response, limit: int = Query(default=50, ge=1, le=100)) -> list[dict]:
    session = current_session(request, response)
    return repository.action_history(session["user"]["id"], limit, session["access_token"])


@app.post("/me/chat/actions/{idempotency_key}/undo")
def undo_chat_action(idempotency_key: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    user_id, token = session["user"]["id"], session["access_token"]
    row = next((item for item in repository.action_history(user_id, 100, token) if item["idempotency_key"] == idempotency_key), None)
    if not row or row.get("status") != "succeeded" or not row.get("inverse_action"):
        raise HTTPException(status_code=409, detail="Bu işlem geri alınamaz veya daha önce geri alınmış.")
    inverse = row["inverse_action"]
    previous, book_id = inverse.get("value"), inverse["book_id"]
    if inverse["kind"] == "restore_price_alert":
        if previous:
            repository.upsert_price_alert(user_id, book_id, previous["target_price_minor"], previous.get("currency", "TRY"), previous.get("is_active", True), token)
        else:
            repository.delete_price_alert(user_id, book_id, token)
    elif previous:
        repository.upsert_library_entry(user_id, book_id, previous["shelf"], previous.get("is_favorite", False),
                                        previous.get("current_page", 0), previous.get("total_pages"), previous.get("abandonment_reason"), token)
    else:
        repository.remove_library_entry(user_id, book_id, token)
    repository.mark_action_undone(user_id, idempotency_key, token)
    return {"undone": True, "idempotency_key": idempotency_key}


@app.get("/me/recommendation-feedback")
def my_feedback(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.recommendation_feedback(session["user"]["id"], session["access_token"])


@app.put("/me/recommendation-feedback")
def update_my_feedback(payload: RecommendationFeedbackUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.upsert_recommendation_feedback(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])


@app.post("/me/books/compare")
def compare_my_books(payload: BookComparisonRequest, request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    if len(set(payload.book_ids)) != len(payload.book_ids):
        raise HTTPException(status_code=400, detail="Karşılaştırma için farklı kitaplar seçin.")
    return repository.compare_books(payload.book_ids, session["user"]["id"], session["access_token"])


@app.get("/me/reading-plans")
def my_reading_plans(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_reading_plans(session["user"]["id"], session["access_token"])


@app.put("/me/reading-plans")
def update_my_reading_plan(payload: ReadingPlanUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.upsert_reading_plan(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Geçerli bir bitiş tarihi seçin.") from error


@app.get("/me/reading-plans/calendar")
def my_reading_plan_calendar(request: Request, response: Response,
                             start: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
                             end: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")) -> list[dict]:
    session = current_session(request, response)
    if date.fromisoformat(end) < date.fromisoformat(start):
        raise HTTPException(status_code=400, detail="Bitiş tarihi başlangıçtan önce olamaz.")
    return repository.reading_plan_calendar(session["user"]["id"], start, end, session["access_token"])


@app.patch("/me/reading-plans/{book_id}/status")
def patch_my_reading_plan_status(book_id: str, payload: ReadingPlanStatusPatch,
                                 request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_reading_plan_status(session["user"]["id"], book_id, payload.status, session["access_token"])


@app.get("/admin/quality")
def admin_quality(request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    return repository.quality_dashboard(session["access_token"])


@app.get("/admin/catalog/issues")
def admin_catalog_issues(request: Request, response: Response,
                         status: str = Query(default="open", pattern="^(open|resolved|dismissed)$"),
                         limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "editor", "admin")
    return repository.admin_catalog_issues(status, limit, session["access_token"])


@app.patch("/admin/catalog/issues/{issue_id}")
def admin_resolve_issue(issue_id: str, payload: ReviewResolution, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    result = repository.resolve_catalog_issue(issue_id, payload.status, session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], f"catalog.issue.{payload.status}", "catalog_review", issue_id,
                     after=result, request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return result


@app.patch("/admin/catalog/books/{book_id}")
def admin_update_book(book_id: str, payload: AdminBookPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    try:
        before, after = repository.admin_update_book(book_id, payload.model_dump(exclude_unset=True), session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    repository.audit(session["user"]["id"], "catalog.book.update", "book", book_id, before, after,
                     request.headers.get("x-request-id"), session["access_token"])
    refresh_catalog_state()
    return after


@app.post("/admin/catalog/merge")
def admin_merge_books(payload: CatalogMergeRequest, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    try:
        result = repository.merge_catalog_books(payload.source_book_id, payload.target_book_id, session["access_token"])
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error.args[0] if error.args else error)) from error
    repository.audit(session["user"]["id"], "catalog.book.merge", "book", payload.target_book_id,
                     before={"source": payload.source_book_id}, after=result,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    refresh_catalog_state()
    return result


@app.get("/admin/catalog/jobs")
def admin_catalog_jobs(request: Request, response: Response) -> list[dict]:
    session = require_role(request, response, "editor", "admin")
    return repository.list_catalog_jobs(100, session["access_token"])


@app.post("/admin/catalog/jobs", status_code=202)
def admin_create_catalog_job(payload: CatalogJobCreate, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    job = repository.create_catalog_job(payload.job_type, {"query": payload.query, "limit": payload.limit},
                                        session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], "catalog.job.create", "catalog_job", job["id"], after=job,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return job


@app.post("/admin/evaluations/recommendations")
def admin_run_recommendation_evaluation(request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    report = run_evaluation(ROOT / "data" / "recommendation_eval_cases.json", recommender, catalog)
    repository.audit(session["user"]["id"], "evaluation.recommendations.run", "evaluation", str(uuid4()),
                     after=report["summary"], request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return report


@app.put("/admin/users/{user_id}/role")
def admin_update_user_role(user_id: str, payload: UserRoleUpdate, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.set_user_role(user_id, payload.role, session["access_token"])
    repository.audit(session["user"]["id"], "user.role.update", "user", user_id, after=result,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return result


@app.get("/admin/dashboard")
def admin_dashboard(request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    return repository.admin_dashboard(session["access_token"])


@app.get("/admin/logs")
def admin_logs(request: Request, response: Response, level: str | None = Query(default=None, pattern="^(info|warning|error)$"),
               limit: int = Query(default=200, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    persisted = repository.admin_system_logs(limit, level, session["access_token"])
    return [*recent_events.snapshot(limit, level), *persisted][:limit]


@app.get("/admin/pipelines/runs")
def admin_pipeline_runs(request: Request, response: Response,
                        limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.list_pipeline_runs(limit, session["access_token"])


@app.get("/admin/pipelines/logs")
def admin_pipeline_logs(request: Request, response: Response, run_id: str | None = None,
                        limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.list_pipeline_logs(limit, run_id, session["access_token"])


@app.post("/admin/pipelines/prices", status_code=202)
def admin_trigger_price_pipeline(payload: PricePipelineTrigger, background_tasks: BackgroundTasks,
                                 request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    background_tasks.add_task(
        run_full_price_pipeline, repository, idempotency_key=payload.idempotency_key,
        orchestrator="admin", trigger_kind="manual", limit=payload.limit,
        retailer_ids=payload.retailers, discover_books=payload.discover_books,
        refresh_existing=payload.refresh_existing,
    )
    repository.audit(session["user"]["id"], "pipeline.price.trigger", "pipeline", payload.idempotency_key,
                     after=payload.model_dump(), request_id=request.state.request_id,
                     access_token=session["access_token"])
    return {"accepted": True, "idempotency_key": payload.idempotency_key}


@app.post("/internal/pipelines/prices", status_code=202)
def n8n_trigger_price_pipeline(payload: PricePipelineTrigger, background_tasks: BackgroundTasks,
                               request: Request) -> dict:
    configured = settings.pipeline_webhook_secret
    supplied = request.headers.get("x-pipeline-key", "")
    if not configured:
        raise HTTPException(status_code=503, detail="Pipeline webhook anahtarı yapılandırılmamış.")
    if not secrets.compare_digest(supplied, configured):
        raise HTTPException(status_code=401, detail="Pipeline anahtarı geçersiz.")
    background_tasks.add_task(
        run_full_price_pipeline, repository, idempotency_key=payload.idempotency_key,
        orchestrator="n8n", trigger_kind="scheduled", limit=payload.limit,
        retailer_ids=payload.retailers, discover_books=payload.discover_books,
        refresh_existing=payload.refresh_existing,
    )
    return {"accepted": True, "idempotency_key": payload.idempotency_key}


@app.get("/admin/users")
def admin_users(request: Request, response: Response, q: str | None = Query(default=None, max_length=100),
                limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.admin_users(q, limit, session["access_token"])


@app.patch("/admin/users/{user_id}/verification")
def admin_verify_user(user_id: str, payload: AdminUserVerificationPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.admin_set_verification(user_id, payload.verified, payload.label, session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], "user.verification.update", "user", user_id, after=result,
                     request_id=request.state.request_id, access_token=session["access_token"])
    return result


@app.patch("/admin/users/{user_id}/ban")
def admin_ban_user(user_id: str, payload: AdminUserBanPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    try:
        result = repository.admin_set_ban(user_id, payload.banned, payload.reason, payload.duration_days,
                                          session["user"]["id"], session["access_token"])
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    repository.audit(session["user"]["id"], "user.ban" if payload.banned else "user.unban", "user", user_id,
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result


@app.patch("/admin/comments/{comment_id}/moderation")
def admin_moderate_comment(comment_id: str, payload: AdminCommentModerationPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.moderate_comment(comment_id, payload.status, session["access_token"])
    repository.audit(session["user"]["id"], "comment.moderate", "book_comment", comment_id, after=result,
                     request_id=request.state.request_id, access_token=session["access_token"])
    return result


@app.get("/admin/community/reports")
def admin_community_reports(request: Request, response: Response,
                            status: str | None = Query(default=None, pattern="^(open|reviewing|resolved|dismissed)$"),
                            limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.admin_comment_reports(status, limit, session["access_token"])


@app.patch("/admin/community/reports/{report_id}")
def admin_resolve_report(report_id: int, payload: AdminReportResolutionPatch,
                         request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.resolve_comment_report(
        report_id, payload.status, session["user"]["id"], payload.comment_status,
        session["access_token"],
    )
    repository.audit(session["user"]["id"], "comment_report.resolve", "comment_report", str(report_id),
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result


@app.get("/books/{book_id}/community")
def book_community(book_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.book_community(book_id, session["user"]["id"], session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@app.put("/me/book-ratings/{book_id}")
def rate_book(book_id: str, payload: BookRatingUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        result = repository.upsert_book_rating(session["user"]["id"], book_id, payload.rating, session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    refresh_catalog_state()
    return result


@app.delete("/me/book-ratings/{book_id}", status_code=204)
def remove_book_rating(book_id: str, request: Request, response: Response):
    session = current_session(request, response)
    repository.delete_book_rating(session["user"]["id"], book_id, session["access_token"])
    refresh_catalog_state()
    return response


@app.post("/me/book-comments", status_code=201)
def create_book_comment(payload: BookCommentCreate, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.create_book_comment(session["user"]["id"], payload.book_id, payload.content,
                                          payload.contains_spoiler, session["access_token"], payload.parent_comment_id)


@app.put("/me/comments/{comment_id}/helpful")
def mark_comment_helpful(comment_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_comment_helpful(session["user"]["id"], comment_id, True, session["access_token"])


@app.delete("/me/comments/{comment_id}/helpful")
def unmark_comment_helpful(comment_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_comment_helpful(session["user"]["id"], comment_id, False, session["access_token"])


@app.post("/me/comments/{comment_id}/reports", status_code=201)
def report_comment(comment_id: str, payload: CommentReportCreate,
                   request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.report_comment(session["user"]["id"], comment_id, payload.reason,
                                         payload.details, session["access_token"])
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=error.args[0]) from error


@app.put("/me/follows/{user_id}")
def follow_user(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_follow(session["user"]["id"], user_id, True, session["access_token"])


@app.delete("/me/follows/{user_id}")
def unfollow_user(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_follow(session["user"]["id"], user_id, False, session["access_token"])


@app.get("/me/community-feed")
def my_community_feed(request: Request, response: Response,
                      limit: int = Query(default=40, ge=1, le=100)) -> list[dict]:
    session = current_session(request, response)
    return repository.community_feed(session["user"]["id"], limit, session["access_token"])


@app.patch("/me/book-comments/{comment_id}")
def update_book_comment(comment_id: str, payload: BookCommentPatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.update_book_comment(session["user"]["id"], comment_id, payload.model_dump(exclude_unset=True), session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.delete("/me/book-comments/{comment_id}", status_code=204)
def delete_book_comment(comment_id: str, request: Request, response: Response):
    session = current_session(request, response)
    try:
        repository.delete_book_comment(session["user"]["id"], comment_id, session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    return response


@app.get("/books", response_model=list[BookView])
def books() -> list[BookView]:
    return [BookView(**book) for book in repository.list_books()]


@app.get("/catalog/books")
def catalog_books(
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=12, ge=1, le=48),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="title", pattern="^(title|popular)$"),
) -> dict:
    """Büyüyen katalog için sunucu taraflı arama ve sayfalama."""
    return repository.search_books(q, limit, offset, sort)


@app.get("/catalog/coverage")
def catalog_coverage() -> dict:
    """Katalog, Türkçe baskı doğrulaması ve fiyat kapsama durumunu gösterir."""
    return repository.catalog_coverage()


@app.get("/market/offers")
def market_offers(isbn: str | None = None) -> list[dict]:
    return repository.list_retail_offers(isbn=isbn)


@app.get("/books/{book_id}/offers")
def book_offers(book_id: str) -> list[dict]:
    return repository.list_retail_offers(book_id=book_id)


@app.get("/books/{book_id}/details")
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


@app.post("/users", status_code=201)
def create_user(payload: UserCreate) -> dict:
    return repository.create_user(payload.display_name)


@app.put("/users/{user_id}/library")
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


@app.get("/users/{user_id}/profile")
def user_profile(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    if session["user"]["id"] != user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcının profili görüntülenemez.")
    try:
        return repository.user_profile(user_id, access_token=session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@app.post("/recommendations/character", response_model=CharacterRecommendationResponse)
async def character_recommendations(
    payload: CharacterRecommendationRequest,
    request: Request,
    response: Response,
) -> CharacterRecommendationResponse:
    session = current_session(request, response)
    if session["user"]["id"] != payload.user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcı adına öneri alınamaz.")
    try:
        profile = repository.user_profile(payload.user_id, access_token=session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    summary, candidates = recommender.recommend(
        payload.character_description, profile, payload.limit,
        access_token=session["access_token"],
    )
    try:
        return await explainer.explain(profile, payload.character_description, summary, candidates)
    except GeminiUnavailable:
        # LLM erişimi ürünün temel öneri akışını kesmemelidir.
        fallback = GeminiExplainer("", settings.gemini_model, False)
        return await fallback.explain(profile, payload.character_description, summary, candidates)

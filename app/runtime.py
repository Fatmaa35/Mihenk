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
from app.routers.product import create_product_router
from app.routers.beta import create_beta_router
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
    PushSubscriptionDelete,
    PushSubscriptionUpsert,
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
from app.services.product_growth import experiment_variant
from app.supabase_repository import SupabaseRequestError


app = FastAPI(title="Akıllı Kitap Danışmanı", version="1.0.0",
              docs_url=None if settings.app_environment == "production" else "/docs",
              redoc_url=None if settings.app_environment == "production" else "/redoc",
              openapi_url=None if settings.app_environment == "production" else "/openapi.json")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)
metrics.configure_redis(settings.redis_url, settings.redis_key_prefix)
app.add_middleware(
    SecurityMiddleware,
    allowed_origins=settings.allowed_origins,
    enabled=settings.rate_limit_enabled,
    redis_url=settings.redis_url,
    redis_key_prefix=settings.redis_key_prefix,
    strict_origin=settings.app_environment == "production",
)
app.add_middleware(ObservabilityMiddleware)
repository = create_repository(settings)
app.state.application_event_sink = repository.application_event
repository.seed_books(ROOT / "data" / "books.json")
catalog = repository.list_books()
search_index = create_search_index(settings, repository, catalog)
recommender = ConsensusRecommender(catalog, search_index)


def record_ai_usage(event: dict) -> None:
    metrics.increment("ai_calls")
    metrics.increment("ai_failures", 0 if event["success"] else 1)
    metrics.increment("ai_prompt_tokens", event["prompt_tokens"])
    metrics.increment("ai_output_tokens", event["output_tokens"])
    metrics.increment("ai_estimated_cost_microusd", round(event["estimated_cost_usd"] * 1_000_000))
    repository.application_event(
        "info" if event["success"] else "error", "ai_usage",
        route=event["operation"], duration_ms=event["latency_ms"], details=event,
    )


explainer = create_explainer(settings, record_ai_usage)
chatbot = BookChatbot(recommender, explainer, settings.gemini_model)
STATIC_DIR = Path(__file__).parent / "static"
STATIC_PAGE = STATIC_DIR / "index.html"
PRIVACY_PAGE = STATIC_DIR / "privacy.html"
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

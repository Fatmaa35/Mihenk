from typing import Literal
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, model_validator


Shelf = Literal["read", "reading", "to_read", "abandoned"]


class UserCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)


class RegisterRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class PasswordRecoveryRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class PasswordResetRequest(BaseModel):
    recovery_token: str = Field(min_length=16, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)


class ConfirmationResendRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class LibraryEntryUpsert(BaseModel):
    book_id: str
    shelf: Shelf
    is_favorite: bool = False
    current_page: int = Field(default=0, ge=0, le=100_000)
    total_pages: int | None = Field(default=None, ge=1, le=100_000)
    abandonment_reason: str | None = Field(default=None, max_length=500)


class CustomBookUpsert(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(default="Bilinmeyen yazar", max_length=200)
    genre: str = Field(default="Genel", max_length=120)
    cover_url: str | None = Field(default=None, max_length=1000)
    shelf: Shelf
    is_favorite: bool = False
    current_page: int = Field(default=0, ge=0, le=100_000)
    total_pages: int | None = Field(default=None, ge=1, le=100_000)


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2_000)


class ActiveViewBook(BaseModel):
    id: str | None = Field(default=None, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(default="Bilinmeyen yazar", max_length=200)
    genre: str = Field(default="Genel", max_length=120)
    position: int = Field(ge=1, le=20)


class ActiveViewContext(BaseModel):
    view: Literal["discover", "catalog", "library", "insights", "alerts", "quality"]
    query: str | None = Field(default=None, max_length=1_500)
    books: list[ActiveViewBook] = Field(default_factory=list, max_length=10)


class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=1_000)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=8)
    active_view_context: ActiveViewContext | None = None
    session_id: str | None = Field(default=None, max_length=100)


class ChatBook(BaseModel):
    id: str
    title: str
    author: str
    genre: str
    cover_url: str | None = None


class ChatAction(BaseModel):
    action_type: Literal["add_to_library", "favorite", "set_price_alert", "update_progress", "finish_book"]
    book_id: str
    book_title: str
    arguments: dict[str, str | int | bool] = Field(default_factory=dict)
    confirmation: str

    @model_validator(mode="after")
    def validate_arguments(self):
        allowed = {
            "add_to_library": {"shelf"}, "favorite": set(),
            "set_price_alert": {"target_price_minor"},
            "update_progress": {"current_page"}, "finish_book": set(),
        }[self.action_type]
        unknown = set(self.arguments) - allowed
        if unknown:
            raise ValueError(f"Desteklenmeyen eylem argümanı: {', '.join(sorted(unknown))}")
        if self.action_type == "set_price_alert":
            value = self.arguments.get("target_price_minor")
            if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 100_000_000:
                raise ValueError("target_price_minor pozitif bir kuruş değeri olmalıdır")
        if self.action_type == "update_progress":
            value = self.arguments.get("current_page")
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 100_000:
                raise ValueError("current_page 0-100000 arasında olmalıdır")
        if self.action_type == "add_to_library" and self.arguments.get("shelf", "to_read") not in {"read", "reading", "to_read", "abandoned"}:
            raise ValueError("Geçersiz raf")
        return self


class ChatResponse(BaseModel):
    intent: Literal["help", "library", "stats", "recommendation", "action", "general", "out_of_scope"]
    answer: str
    books: list[ChatBook] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    pending_action: ChatAction | None = None
    session_id: str | None = None


class ChatActionExecute(BaseModel):
    action: ChatAction
    idempotency_key: str = Field(default_factory=lambda: str(uuid4()), min_length=16, max_length=100)


class ChatSessionPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    is_pinned: bool | None = None
    is_archived: bool | None = None


class ChatMessagePatch(BaseModel):
    content: str = Field(min_length=1, max_length=2_000)


class AdminBookPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    author: str | None = Field(default=None, min_length=1, max_length=200)
    genre: str | None = Field(default=None, min_length=1, max_length=120)
    publication_type: Literal["fiction", "nonfiction", "poetry", "essay", "children", "academic", "reference", "unknown"] | None = None
    language: str | None = Field(default=None, min_length=2, max_length=12)
    original_language: str | None = Field(default=None, max_length=12)
    page_count: int | None = Field(default=None, ge=1, le=100_000)
    cover_url: str | None = Field(default=None, max_length=1000)
    description: str | None = Field(default=None, max_length=5000)
    narrative_pace: Literal["slow", "medium", "fast"] | None = None
    is_recommendable: bool | None = None


class CatalogMergeRequest(BaseModel):
    source_book_id: str = Field(min_length=1, max_length=255)
    target_book_id: str = Field(min_length=1, max_length=255)


class CatalogJobCreate(BaseModel):
    job_type: Literal["google_books_import", "open_library_import", "metadata_refresh", "quality_scan"]
    query: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=30, ge=1, le=200)


class ReviewResolution(BaseModel):
    status: Literal["resolved", "dismissed"]


class UserRoleUpdate(BaseModel):
    role: Literal["user", "editor", "admin"]


class BookRatingUpsert(BaseModel):
    rating: int = Field(ge=1, le=5)


class BookCommentCreate(BaseModel):
    book_id: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=2, max_length=2_000)
    contains_spoiler: bool = False
    parent_comment_id: str | None = Field(default=None, max_length=100)


class BookCommentPatch(BaseModel):
    content: str | None = Field(default=None, min_length=2, max_length=2_000)
    contains_spoiler: bool | None = None


class CommentReportCreate(BaseModel):
    reason: Literal["spam", "harassment", "spoiler", "hate", "misinformation", "other"]
    details: str | None = Field(default=None, max_length=500)


class AdminReportResolutionPatch(BaseModel):
    status: Literal["reviewing", "resolved", "dismissed"]
    comment_status: Literal["published", "hidden", "removed"] | None = None


class AdminUserVerificationPatch(BaseModel):
    verified: bool
    label: str | None = Field(default=None, max_length=80)


class AdminUserBanPatch(BaseModel):
    banned: bool
    reason: str | None = Field(default=None, max_length=500)
    duration_days: int | None = Field(default=None, ge=1, le=3_650)

    @model_validator(mode="after")
    def validate_ban(self):
        if self.banned and not (self.reason or "").strip():
            raise ValueError("Ban nedeni zorunludur.")
        return self


class AdminCommentModerationPatch(BaseModel):
    status: Literal["published", "hidden", "removed"]


class FeatureFlagUpsert(BaseModel):
    description: str = Field(default="", max_length=500)
    enabled: bool = False
    rollout_percent: int = Field(default=0, ge=0, le=100)


class RecommendationFeedbackUpsert(BaseModel):
    book_id: str
    feedback_type: Literal["great_match", "not_for_me", "already_know", "more_like_this"]
    query_text: str | None = Field(default=None, max_length=1_500)


class BookComparisonRequest(BaseModel):
    book_ids: list[str] = Field(min_length=2, max_length=4)


class ReadingPlanUpsert(BaseModel):
    book_id: str
    target_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    reminder_enabled: bool = False
    reminder_time: str = Field(default="20:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    timezone: str = Field(default="Europe/Istanbul", min_length=3, max_length=64)
    excluded_weekdays: list[int] = Field(default_factory=list, max_length=7)
    weekday_pages: int | None = Field(default=None, ge=1, le=5000)
    weekend_pages: int | None = Field(default=None, ge=1, le=5000)
    delivery_channel: Literal["in_app", "email", "push"] = "in_app"

    @model_validator(mode="after")
    def validate_weekdays(self):
        if any(day < 0 or day > 6 for day in self.excluded_weekdays) or len(set(self.excluded_weekdays)) != len(self.excluded_weekdays):
            raise ValueError("excluded_weekdays 0-6 arasında tekil günler içermelidir")
        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Geçerli bir IANA saat dilimi girilmelidir") from error
        return self


class PushSubscriptionUpsert(BaseModel):
    endpoint: str = Field(min_length=20, max_length=4000, pattern=r"^https://")
    p256dh: str = Field(min_length=20, max_length=1000)
    auth: str = Field(min_length=8, max_length=500)


class PushSubscriptionDelete(BaseModel):
    endpoint: str = Field(min_length=20, max_length=4000, pattern=r"^https://")


class ReadingGoalUpsert(BaseModel):
    goal_year: int = Field(ge=2000, le=2200)
    target_books: int = Field(ge=1, le=1000)


class ReadingPlanStatusPatch(BaseModel):
    status: Literal["active", "paused", "completed"]


class PriceAlertUpsert(BaseModel):
    book_id: str
    target_price_minor: int = Field(gt=0, le=100_000_000)
    currency: str = Field(default="TRY", pattern=r"^[A-Z]{3}$")
    is_active: bool = True


class UserPreferencesUpsert(BaseModel):
    personality_text: str = Field(default="", max_length=1_500)
    selected_traits: list[str] = Field(default_factory=list, max_length=20)
    preferred_genres: list[str] = Field(default_factory=list, max_length=30)
    disliked_genres: list[str] = Field(default_factory=list, max_length=30)
    liked_styles: list[str] = Field(default_factory=list, max_length=30)
    disliked_styles: list[str] = Field(default_factory=list, max_length=30)
    pace_preference: Literal["slow", "medium", "fast", "mixed"] | None = None
    focus_preference: Literal["character", "plot", "balanced"] | None = None
    tone_preference: Literal["dark", "hopeful", "balanced"] | None = None
    violence_sensitivity: int = Field(default=0, ge=0, le=3)
    romance_sensitivity: int = Field(default=0, ge=0, le=3)
    spoiler_sensitivity: int = Field(default=2, ge=0, le=3)
    length_preference: Literal["short", "medium", "long", "any"] | None = None


class BadgeShowcaseUpdate(BaseModel):
    badge_codes: list[str] = Field(default_factory=list, max_length=3)


class CharacterRecommendationRequest(BaseModel):
    user_id: str
    character_description: str = Field(min_length=3, max_length=1_500)
    limit: int = Field(default=5, ge=1, le=10)


class CharacterSearchRequest(BaseModel):
    character_description: str = Field(min_length=3, max_length=1_500)
    limit: int = Field(default=5, ge=1, le=10)


class RecommendedBook(BaseModel):
    book_title: str
    author: str
    match_score: float = Field(ge=0, le=1)
    reasoning: str
    genre: str
    already_in_watchlist: bool
    score_breakdown: "ScoreBreakdown"


class ScoreComponent(BaseModel):
    raw_score: float = Field(ge=0, le=1)
    weight: float = Field(ge=0, le=1)
    contribution: float = Field(ge=0, le=1)


class ScoreBreakdown(BaseModel):
    character: ScoreComponent
    themes: ScoreComponent
    reading_history: ScoreComponent
    semantic_score: float = Field(ge=0, le=1)
    lexical_score: float = Field(ge=0, le=1)
    matched_signals: list[str] = Field(default_factory=list)
    ai_score: float | None = Field(default=None, ge=0, le=1)
    ai_weight: float = Field(default=0, ge=0, le=1)
    catalog_score: float | None = Field(default=None, ge=0, le=1)
    catalog_weight: float = Field(default=1, ge=0, le=1)


class AIDiscoveredBook(BaseModel):
    """Katalog dışında LLM tarafından önerilen, henüz doğrulanmamış eser."""

    book_title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=200)
    genre: str = Field(min_length=1, max_length=120)
    reasoning: str = Field(min_length=1, max_length=1_000)


class PricePipelineTrigger(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=200)
    limit: int = Field(default=20, ge=1, le=500)
    discover_books: int = Field(default=10, ge=0, le=200)
    retailers: list[Literal["kitapsec", "kitapsepeti", "bkmkitap"]] = Field(
        default_factory=lambda: ["kitapsec", "kitapsepeti", "bkmkitap"], min_length=1, max_length=3
    )
    refresh_existing: bool = True


class CharacterRecommendationResponse(BaseModel):
    character_analysis_summary: str
    recommended_books: list[RecommendedBook]
    ai_discoveries: list[AIDiscoveredBook] = Field(default_factory=list, max_length=4)


class BookView(BaseModel):
    id: str
    title: str
    author: str
    canonical_work_key: str | None = None
    genre: str
    publication_type: str = "unknown"
    language: str = "tr"
    original_language: str | None = None
    page_count: int | None = None
    atmosphere: list[str] = Field(default_factory=list)
    narrative_style: list[str] = Field(default_factory=list)
    narrative_pace: Literal["slow", "medium", "fast"] | None = None
    themes: list[str]
    character_traits: list[str]
    description: str
    quality_score: float = Field(default=0, ge=0, le=1)
    quality_flags: list[str] = Field(default_factory=list)
    is_recommendable: bool = True
    source_name: str | None = None
    source_url: str | None = None
    cover_url: str | None = None
    series_name: str | None = None
    series_index: float | None = None
    rating_count: int = Field(default=0, ge=0)
    rating_average: float = Field(default=0, ge=0, le=5)
    popularity_score: float = Field(default=0, ge=0, le=1)


class ReadingSessionCreate(BaseModel):
    book_id: str | None = None
    custom_book_id: str | None = None
    start_page: int = Field(ge=0)
    end_page: int = Field(ge=0)
    duration_minutes: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_book_reference(self):
        if (self.book_id is None and self.custom_book_id is None) or (self.book_id is not None and self.custom_book_id is not None):
            raise ValueError("book_id veya custom_book_id alanlarından biri verilmelidir.")
        if self.end_page < self.start_page:
            raise ValueError("end_page start_page değerinden küçük olamaz.")
        return self


class ReadingSessionView(BaseModel):
    id: str
    user_id: str
    book_id: str | None = None
    custom_book_id: str | None = None
    book_title: str | None = None
    start_page: int
    end_page: int
    pages_read: int
    duration_minutes: int
    reading_speed_pages_per_min: float
    session_date: str
    created_at: str


class ReadingSessionStats(BaseModel):
    total_sessions: int
    total_minutes: int
    total_pages_read: int
    average_reading_speed_pages_per_min: float
    estimated_hours_for_300_page_book: float
    heatmap_data: dict[str, int]


class BookQuoteCreate(BaseModel):
    book_id: str | None = None
    custom_book_id: str | None = None
    quote_text: str = Field(min_length=1, max_length=5000)
    page_number: int | None = Field(default=None, ge=0)
    tags: list[str] = Field(default_factory=list, max_length=10)
    source_type: Literal["manual", "ocr", "barcode_import"] = "manual"

    @model_validator(mode="after")
    def validate_book_reference(self):
        if (self.book_id is None and self.custom_book_id is None) or (self.book_id is not None and self.custom_book_id is not None):
            raise ValueError("book_id veya custom_book_id alanlarından biri verilmelidir.")
        return self


class BookQuoteView(BaseModel):
    id: str
    user_id: str
    book_id: str | None = None
    custom_book_id: str | None = None
    book_title: str | None = None
    quote_text: str
    page_number: int | None = None
    tags: list[str]
    source_type: str
    created_at: str


class ISBNBookLookupResponse(BaseModel):
    isbn: str
    title: str
    author: str
    page_count: int | None = None
    cover_url: str | None = None
    description: str | None = None
    publication_year: str | None = None
    publisher: str | None = None
    catalog_saved: bool = False
    catalog_book_id: str | None = None

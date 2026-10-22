"""Veri katmanı sözleşmesi.

Uygulama yalnızca bu Protocol'lerde tanımlı metotlara güvenir. Supabase (production)
ve SQLite (yerel geliştirme/test) uygulamaları bu sözleşmeyi birlikte karşılar;
`tests/test_repository_contract.py` iki uygulamanın ayrışmasını engeller.

Yeni bir veri metodu eklerken: önce burada ilgili alana imzayı ekleyin, sonra
`repositories/supabase/<alan>.py` ve `repositories/sqlite/<alan>.py` içinde uygulayın.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol


class AuthStore(Protocol):
    """Kimlik, oturum ve hesap yaşam döngüsü."""

    def invite_user(self, display_name: str, email: str, redirect_to: str) -> dict: ...
    def open_registration_session(
        self, display_name: str, email: str, password: str
    ) -> dict: ...
    def open_login_session(self, email: str, password: str) -> dict: ...
    def request_password_reset(
        self, email: str, redirect_to: str | None = None
    ) -> None: ...
    def reset_password(self, recovery_token: str, new_password: str) -> None: ...
    def resend_confirmation(self, email: str) -> None: ...
    def resolve_session(
        self, access_token: str | None, refresh_token: str | None = None
    ) -> dict | None: ...
    def close_session(
        self, access_token: str | None, refresh_token: str | None = None
    ) -> None: ...
    def user_role(self, user_id: str, access_token: str | None = None) -> str: ...
    def set_user_role(
        self, user_id: str, role: str, access_token: str | None = None
    ) -> dict: ...
    def delete_user_account(
        self, user_id: str, access_token: str | None = None
    ) -> None: ...
    def export_user_data(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def purge_expired_data(
        self,
        *,
        audit_days: int,
        event_days: int,
        notification_days: int,
        chat_days: int,
    ) -> dict[str, int]: ...
    def account_status(self, user_id: str, access_token: str | None = None) -> dict: ...
    def create_user(self, display_name: str) -> dict: ...


class CatalogStore(Protocol):
    """Kitap kataloğu, arama ve baskı doğrulama."""

    def list_verified_editions(self, limit: int = 200) -> list[dict]: ...
    def semantic_book_search(
        self,
        embedding: list[float],
        limit: int = 20,
        access_token: str | None = None,
        query: str | None = None,
    ) -> list[dict]: ...
    def upsert_book_embeddings(self, records: list[dict]) -> int: ...
    def seed_books(self, source: Path) -> None: ...
    def list_books(self) -> list[dict]: ...
    def search_books(
        self, query: str | None, limit: int, offset: int, sort: str = "title"
    ) -> dict: ...
    def catalog_coverage(self) -> dict: ...
    def upsert_metadata_book(self, raw_record: dict) -> str: ...


class LibraryStore(Protocol):
    """Kişisel kitaplık, tercihler ve okuma listeleri."""

    def remove_library_entry(
        self, user_id: str, book_id: str, access_token: str | None = None
    ) -> None: ...
    def onboarding_profile(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def upsert_onboarding_profile(
        self,
        user_id: str,
        liked_book_ids: list[str],
        liked_authors: list[str],
        completed: bool,
        access_token: str | None = None,
    ) -> dict: ...
    def import_library_records(
        self, user_id: str, records: list[dict], access_token: str | None = None
    ) -> dict: ...
    def create_reading_list(
        self,
        user_id: str,
        title: str,
        description: str,
        visibility: str,
        access_token: str | None = None,
    ) -> dict: ...
    def list_reading_lists(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def upsert_reading_list_item(
        self,
        user_id: str,
        list_id: str,
        book_id: str,
        note: str,
        position: int,
        access_token: str | None = None,
    ) -> dict: ...
    def reading_list_detail(
        self,
        list_id: str | None = None,
        *,
        user_id: str | None = None,
        share_token: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def upsert_library_entry(
        self,
        user_id: str,
        book_id: str,
        shelf: str,
        is_favorite: bool,
        current_page: int = 0,
        total_pages: int | None = None,
        abandonment_reason: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def save_custom_book(
        self,
        user_id: str,
        title: str,
        author: str,
        genre: str,
        cover_url: str | None,
        shelf: str,
        is_favorite: bool,
        current_page: int = 0,
        total_pages: int | None = None,
        custom_book_id: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def delete_custom_book(
        self, user_id: str, custom_book_id: str, access_token: str | None = None
    ) -> None: ...
    def user_preferences(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def upsert_user_preferences(
        self,
        user_id: str,
        personality_text: str,
        selected_traits: list[str],
        preferred_genres: list[str],
        disliked_genres: list[str],
        liked_styles: list[str] | None = None,
        disliked_styles: list[str] | None = None,
        pace_preference: str | None = None,
        focus_preference: str | None = None,
        tone_preference: str | None = None,
        violence_sensitivity: int = 0,
        romance_sensitivity: int = 0,
        spoiler_sensitivity: int = 2,
        length_preference: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def user_profile(self, user_id: str, access_token: str | None = None) -> dict: ...


class ReadingStore(Protocol):
    """Okuma hedefleri, seanslar, alıntılar, planlar ve oyunlaştırma."""

    def weekly_summary(self, user_id: str, access_token: str | None = None) -> dict: ...
    def upsert_reading_goal(
        self,
        user_id: str,
        goal_year: int,
        target_books: int,
        access_token: str | None = None,
    ) -> dict: ...
    def reading_dashboard(
        self, user_id: str, year: int, access_token: str | None = None
    ) -> dict: ...
    def get_reading_session_stats(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def add_reading_session(
        self, user_id: str, payload: dict, access_token: str | None = None
    ) -> dict: ...
    def list_reading_sessions(
        self,
        user_id: str,
        book_id: str | None = None,
        limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def add_book_quote(
        self, user_id: str, payload: dict, access_token: str | None = None
    ) -> dict: ...
    def list_book_quotes(
        self,
        user_id: str,
        book_id: str | None = None,
        limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def gamification_summary(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def update_badge_showcase(
        self, user_id: str, badge_codes: list[str], access_token: str | None = None
    ) -> dict: ...
    def upsert_reading_plan(
        self,
        user_id: str,
        book_id: str,
        target_date: str,
        reminder_enabled: bool = False,
        access_token: str | None = None,
        reminder_time: str = "20:00",
        timezone: str = "Europe/Istanbul",
        excluded_weekdays: list[int] | None = None,
        weekday_pages: int | None = None,
        weekend_pages: int | None = None,
        delivery_channel: str = "in_app",
    ) -> dict: ...
    def list_reading_plans(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def reading_plan_calendar(
        self, user_id: str, start: str, end: str, access_token: str | None = None
    ) -> list[dict]: ...
    def set_reading_plan_status(
        self, user_id: str, book_id: str, status: str, access_token: str | None = None
    ) -> dict: ...


class NotificationsStore(Protocol):
    """Bildirimler, hatırlatmalar ve web push."""

    def notification_preferences(
        self, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def upsert_notification_preferences(
        self, user_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def upsert_edition_subscription(
        self,
        user_id: str,
        book_id: str,
        event_type: str,
        is_active: bool,
        access_token: str | None = None,
    ) -> dict: ...
    def list_edition_subscriptions(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def list_notifications(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def upsert_web_push_subscription(
        self,
        user_id: str,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def delete_web_push_subscription(
        self, user_id: str, endpoint: str, access_token: str | None = None
    ) -> None: ...
    def list_web_push_subscriptions(self, user_id: str) -> list[dict]: ...
    def user_email(self, user_id: str) -> str | None: ...
    def claim_due_reminders(self, now: str, limit: int = 100) -> list[dict]: ...
    def finish_reminder(
        self, reminder_id: str, success: bool, error: str | None = None
    ) -> None: ...
    def create_reminder_notification(
        self, user_id: str, book_id: str, title: str, body: str
    ) -> None: ...
    def mark_notification_read(
        self, user_id: str, notification_id: str, access_token: str | None = None
    ) -> dict: ...
    def mark_all_notifications_read(
        self, user_id: str, access_token: str | None = None
    ) -> int: ...


class PricingStore(Protocol):
    """Mağaza teklifleri, fiyat hattı ve fiyat alarmları."""

    def list_retail_offers(
        self, book_id: str | None = None, isbn: str | None = None
    ) -> list[dict]: ...
    def list_book_price_history(self, book_id: str, limit: int = 90) -> list[dict]: ...
    def list_offer_urls(self, retailer_ids: list[str] | None = None) -> list[str]: ...
    def list_unpriced_books(self, limit: int = 20) -> list[dict]: ...
    def save_retail_offer(self, offer: dict) -> dict: ...
    def create_pipeline_run(
        self,
        idempotency_key: str,
        job_type: str,
        orchestrator: str = "manual",
        trigger_kind: str = "manual",
    ) -> dict: ...
    def log_pipeline_event(
        self,
        run_id: str,
        level: str,
        stage: str,
        message: str,
        context: dict | None = None,
    ) -> None: ...
    def finish_pipeline_run(self, run_id: str, status: str, report: dict) -> dict: ...
    def list_pipeline_runs(
        self, limit: int = 50, access_token: str | None = None
    ) -> list[dict]: ...
    def list_pipeline_logs(
        self,
        limit: int = 100,
        run_id: str | None = None,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def replace_price_forecasts(self, book_id: str, forecasts: list[dict]) -> int: ...
    def list_book_price_forecasts(self, book_id: str) -> list[dict]: ...
    def upsert_price_alert(
        self,
        user_id: str,
        book_id: str,
        target_price_minor: int,
        currency: str = "TRY",
        is_active: bool = True,
        access_token: str | None = None,
    ) -> dict: ...
    def list_price_alerts(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def delete_price_alert(
        self, user_id: str, book_id: str, access_token: str | None = None
    ) -> None: ...
    def evaluate_price_alerts(self) -> int: ...


class RecommendationsStore(Protocol):
    """Öneri geri bildirimi ve huni ölçümleri."""

    def log_recommendation_interaction(
        self, user_id: str | None, payload: dict, access_token: str | None = None
    ) -> dict: ...
    def recommendation_funnel(
        self, days: int = 30, access_token: str | None = None
    ) -> dict: ...
    def upsert_recommendation_feedback(
        self,
        user_id: str,
        book_id: str,
        feedback_type: str,
        query_text: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def recommendation_feedback(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def log_recommendation_event(
        self,
        user_id: str | None,
        query_text: str,
        result_count: int,
        fallback_used: bool,
        latency_ms: int,
        access_token: str | None = None,
    ) -> None: ...


class AssistantStore(Protocol):
    """Kitap asistanı sohbetleri ve geri alınabilir işlemler."""

    def audit(
        self,
        actor_user_id: str | None,
        action: str,
        entity_type: str,
        entity_id: str | None,
        before: dict | None = None,
        after: dict | None = None,
        request_id: str | None = None,
        access_token: str | None = None,
    ) -> None: ...
    def action_execution(
        self, user_id: str, key: str, access_token: str | None = None
    ) -> dict | None: ...
    def save_action_execution(
        self,
        user_id: str,
        key: str,
        action_type: str,
        result: dict,
        access_token: str | None = None,
        action_payload: dict | None = None,
        inverse_action: dict | None = None,
        status: str = "succeeded",
        error_code: str | None = None,
        duration_ms: int = 0,
    ) -> dict: ...
    def action_history(
        self, user_id: str, limit: int = 50, access_token: str | None = None
    ) -> list[dict]: ...
    def mark_action_undone(
        self, user_id: str, key: str, access_token: str | None = None
    ) -> None: ...
    def create_chat_session(
        self, user_id: str, title: str = "Yeni sohbet", access_token: str | None = None
    ) -> dict: ...
    def list_chat_sessions(
        self,
        user_id: str,
        access_token: str | None = None,
        query: str | None = None,
        archived: bool = False,
    ) -> list[dict]: ...
    def chat_messages(
        self,
        user_id: str,
        session_id: str,
        limit: int = 50,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def save_chat_message(
        self,
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        books: list[dict] | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def update_chat_session(
        self,
        user_id: str,
        session_id: str,
        changes: dict,
        access_token: str | None = None,
    ) -> dict: ...
    def update_chat_message(
        self,
        user_id: str,
        message_id: str,
        content: str | None,
        delete: bool = False,
        access_token: str | None = None,
    ) -> dict: ...
    def delete_chat_session(
        self, user_id: str, session_id: str, access_token: str | None = None
    ) -> None: ...
    def compare_books(
        self,
        book_ids: list[str],
        user_id: str | None = None,
        access_token: str | None = None,
    ) -> list[dict]: ...


class CommunityStore(Protocol):
    """Puanlar, yorumlar, takip ve topluluk akışı."""

    def upsert_book_rating(
        self, user_id: str, book_id: str, rating: int, access_token: str | None = None
    ) -> dict: ...
    def delete_book_rating(
        self, user_id: str, book_id: str, access_token: str | None = None
    ) -> None: ...
    def update_book_comment(
        self,
        user_id: str,
        comment_id: str,
        changes: dict,
        access_token: str | None = None,
    ) -> dict: ...
    def delete_book_comment(
        self, user_id: str, comment_id: str, access_token: str | None = None
    ) -> None: ...
    def book_community(
        self, book_id: str, user_id: str, access_token: str | None = None
    ) -> dict: ...
    def create_book_comment(
        self,
        user_id: str,
        book_id: str,
        content: str,
        contains_spoiler: bool,
        access_token: str | None = None,
        parent_comment_id: str | None = None,
    ) -> dict: ...
    def set_comment_helpful(
        self,
        user_id: str,
        comment_id: str,
        helpful: bool,
        access_token: str | None = None,
    ) -> dict: ...
    def report_comment(
        self,
        user_id: str,
        comment_id: str,
        reason: str,
        details: str | None,
        access_token: str | None = None,
    ) -> dict: ...
    def set_follow(
        self,
        follower_id: str,
        followed_id: str,
        following: bool,
        access_token: str | None = None,
    ) -> dict: ...
    def community_feed(
        self, user_id: str, limit: int = 40, access_token: str | None = None
    ) -> list[dict]: ...


class ClubsStore(Protocol):
    """Kitap kulüpleri ve canlı okuma odaları."""

    def create_book_club(
        self,
        user_id: str,
        name: str,
        description: str,
        visibility: str,
        rules: str = "",
        access_token: str | None = None,
    ) -> dict: ...
    def update_book_club(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def update_book_club_member_role(
        self,
        user_id: str,
        club_id: str,
        target_user_id: str,
        role: str,
        access_token: str | None = None,
    ) -> dict: ...
    def join_book_club(
        self, user_id: str, invite_code: str, access_token: str | None = None
    ) -> dict: ...
    def list_book_clubs(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict]: ...
    def join_reading(
        self,
        user_id: str,
        club_id: str,
        book_id: str,
        daily_target_pages: int = 10,
        shelf: str = "reading",
        access_token: str | None = None,
    ) -> dict: ...
    def upsert_book_club_progress(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def create_book_club_discussion(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def toggle_book_club_reaction(
        self,
        user_id: str,
        club_id: str,
        discussion_id: str,
        reaction_type: str,
        access_token: str | None = None,
    ) -> dict: ...
    def create_book_club_event(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def rsvp_book_club_event(
        self,
        user_id: str,
        club_id: str,
        event_id: str,
        status: str,
        access_token: str | None = None,
    ) -> dict: ...
    def create_book_club_poll(
        self,
        user_id: str,
        club_id: str,
        title: str,
        option_book_ids: list[str],
        access_token: str | None = None,
    ) -> dict: ...
    def vote_book_club_poll(
        self,
        user_id: str,
        club_id: str,
        poll_id: str,
        option_id: str,
        access_token: str | None = None,
    ) -> dict: ...
    def upsert_book_club_read(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def book_club_detail(
        self, user_id: str, club_id: str, access_token: str | None = None
    ) -> dict: ...
    def get_or_create_club_room(
        self,
        user_id: str,
        club_id: str,
        title: str | None = None,
        book_id: str | None = None,
        duration_minutes: int = 25,
        access_token: str | None = None,
    ) -> dict: ...
    def complete_room_session(
        self, user_id: str, club_id: str, values: dict, access_token: str | None = None
    ) -> dict: ...
    def send_room_message(
        self,
        user_id: str,
        club_id: str,
        room_id: str,
        content: str,
        access_token: str | None = None,
    ) -> dict: ...


class AdminStore(Protocol):
    """Yönetim paneli, katalog kalitesi ve moderasyon."""

    def admin_comment_reports(
        self,
        status: str | None = None,
        limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def resolve_comment_report(
        self,
        report_id: int,
        status: str,
        moderator_id: str,
        comment_status: str | None = None,
        access_token: str | None = None,
    ) -> dict: ...
    def admin_users(
        self,
        query: str | None = None,
        limit: int = 100,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def admin_set_verification(
        self,
        user_id: str,
        verified: bool,
        label: str | None,
        actor_id: str,
        access_token: str | None = None,
    ) -> dict: ...
    def admin_set_ban(
        self,
        user_id: str,
        banned: bool,
        reason: str | None,
        duration_days: int | None,
        actor_id: str,
        access_token: str | None = None,
    ) -> dict: ...
    def moderate_comment(
        self, comment_id: str, status: str, access_token: str | None = None
    ) -> dict: ...
    def quality_dashboard(self, access_token: str | None = None) -> dict: ...
    def list_feature_flags(self, access_token: str | None = None) -> list[dict]: ...
    def upsert_feature_flag(
        self,
        key: str,
        description: str,
        enabled: bool,
        rollout_percent: int,
        access_token: str | None = None,
    ) -> dict: ...
    def admin_catalog_issues(
        self, status: str = "open", limit: int = 100, access_token: str | None = None
    ) -> list[dict]: ...
    def resolve_catalog_issue(
        self, issue_id: str, status: str, actor_id: str, access_token: str | None = None
    ) -> dict: ...
    def admin_update_book(
        self, book_id: str, changes: dict, access_token: str | None = None
    ) -> tuple[dict, dict]: ...
    def merge_catalog_books(
        self, source_id: str, target_id: str, access_token: str | None = None
    ) -> dict: ...
    def create_catalog_job(
        self,
        job_type: str,
        payload: dict,
        created_by: str,
        access_token: str | None = None,
    ) -> dict: ...
    def list_catalog_jobs(
        self, limit: int = 50, access_token: str | None = None
    ) -> list[dict]: ...
    def claim_catalog_job(self) -> dict | None: ...
    def finish_catalog_job(
        self, job_id: str, success: bool, error: str | None = None
    ) -> None: ...
    def admin_system_logs(
        self,
        limit: int = 200,
        level: str | None = None,
        access_token: str | None = None,
    ) -> list[dict]: ...
    def admin_dashboard(self, access_token: str | None = None) -> dict: ...


class TelemetryStore(Protocol):
    """Uygulama olayları, ürün ölçümleri ve kapalı beta."""

    def application_event(
        self,
        level: str,
        event_type: str,
        request_id: str | None = None,
        route: str | None = None,
        status_code: int | None = None,
        duration_ms: float | None = None,
        details: dict | None = None,
    ) -> None: ...
    def track_product_event(
        self,
        user_id: str,
        event_name: str,
        properties: dict,
        access_token: str | None = None,
    ) -> dict: ...
    def create_beta_feedback(
        self,
        user_id: str,
        category: str,
        rating: int | None,
        message: str,
        context: dict,
        access_token: str | None = None,
    ) -> dict: ...
    def list_beta_feedback(
        self, user_id: str, limit: int = 20, access_token: str | None = None
    ) -> list[dict]: ...
    def beta_dashboard(
        self, days: int = 30, access_token: str | None = None
    ) -> dict: ...


class RepositoryContract(
    AuthStore,
    CatalogStore,
    LibraryStore,
    ReadingStore,
    NotificationsStore,
    PricingStore,
    RecommendationsStore,
    AssistantStore,
    CommunityStore,
    ClubsStore,
    AdminStore,
    TelemetryStore,
    Protocol,
):
    """Uygulamanın kullandığı tam veri API'si."""

    @property
    def backend_name(self) -> str: ...


DOMAIN_STORES: dict[str, type] = {
    "auth": AuthStore,
    "catalog": CatalogStore,
    "library": LibraryStore,
    "reading": ReadingStore,
    "notifications": NotificationsStore,
    "pricing": PricingStore,
    "recommendations": RecommendationsStore,
    "assistant": AssistantStore,
    "community": CommunityStore,
    "clubs": ClubsStore,
    "admin": AdminStore,
    "telemetry": TelemetryStore,
}

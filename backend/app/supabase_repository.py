"""Public facade for the feature-scoped Supabase repository implementation."""
from app.repositories.supabase.base import SupabaseBase, SupabaseRequestError
from app.repositories.supabase.auth import SupabaseAuthMixin
from app.repositories.supabase.catalog import SupabaseCatalogMixin
from app.repositories.supabase.library import SupabaseLibraryMixin
from app.repositories.supabase.reading import SupabaseReadingMixin
from app.repositories.supabase.notifications import SupabaseNotificationsMixin
from app.repositories.supabase.pricing import SupabasePricingMixin
from app.repositories.supabase.recommendations import SupabaseRecommendationsMixin
from app.repositories.supabase.assistant import SupabaseAssistantMixin
from app.repositories.supabase.community import SupabaseCommunityMixin
from app.repositories.supabase.clubs import SupabaseClubsMixin
from app.repositories.supabase.admin import SupabaseAdminMixin
from app.repositories.supabase.telemetry import SupabaseTelemetryMixin


class SupabaseRepository(
    SupabaseAuthMixin,
    SupabaseCatalogMixin,
    SupabaseLibraryMixin,
    SupabaseReadingMixin,
    SupabaseNotificationsMixin,
    SupabasePricingMixin,
    SupabaseRecommendationsMixin,
    SupabaseAssistantMixin,
    SupabaseCommunityMixin,
    SupabaseClubsMixin,
    SupabaseAdminMixin,
    SupabaseTelemetryMixin,
    SupabaseBase,
):
    """Stable adapter API composed from product-domain mixins."""


__all__ = ["SupabaseRepository", "SupabaseRequestError"]

"""Özellik alanlarına bölünmüş yerel SQLite repository uygulaması."""
from app.repositories.sqlite.base import SQLiteBase
from app.repositories.sqlite.auth import SQLiteAuthMixin
from app.repositories.sqlite.catalog import SQLiteCatalogMixin
from app.repositories.sqlite.library import SQLiteLibraryMixin
from app.repositories.sqlite.reading import SQLiteReadingMixin
from app.repositories.sqlite.notifications import SQLiteNotificationsMixin
from app.repositories.sqlite.pricing import SQLitePricingMixin
from app.repositories.sqlite.recommendations import SQLiteRecommendationsMixin
from app.repositories.sqlite.assistant import SQLiteAssistantMixin
from app.repositories.sqlite.community import SQLiteCommunityMixin
from app.repositories.sqlite.clubs import SQLiteClubsMixin
from app.repositories.sqlite.admin import SQLiteAdminMixin
from app.repositories.sqlite.telemetry import SQLiteTelemetryMixin


class SQLiteRepository(
    SQLiteAuthMixin,
    SQLiteCatalogMixin,
    SQLiteLibraryMixin,
    SQLiteReadingMixin,
    SQLiteNotificationsMixin,
    SQLitePricingMixin,
    SQLiteRecommendationsMixin,
    SQLiteAssistantMixin,
    SQLiteCommunityMixin,
    SQLiteClubsMixin,
    SQLiteAdminMixin,
    SQLiteTelemetryMixin,
    SQLiteBase,
):
    """Yerel geliştirme ve testler için SQLite repository."""

    @property
    def backend_name(self) -> str:
        return "sqlite"


__all__ = ["SQLiteRepository"]

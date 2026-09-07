"""Delete records whose documented retention period has elapsed."""

from app.config import settings
from app.repository_factory import create_repository


def main() -> None:
    repository = create_repository(settings)
    deleted = repository.purge_expired_data(
        audit_days=settings.audit_retention_days,
        event_days=settings.event_retention_days,
        notification_days=settings.notification_retention_days,
        chat_days=settings.chat_retention_days,
    )
    print(" ".join(f"{table}={count}" for table, count in sorted(deleted.items())))


if __name__ == "__main__":
    main()

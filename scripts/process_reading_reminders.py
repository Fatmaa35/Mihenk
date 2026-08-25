"""Claim and deliver reading reminders through configured production adapters."""

from datetime import datetime, timezone

from app.config import settings
from app.repository_factory import create_repository
from app.services.notification_delivery import SMTPDelivery, WebPushDelivery


def main() -> None:
    repository = create_repository(settings)
    email = SMTPDelivery(
        settings.smtp_host, settings.smtp_port, settings.smtp_username,
        settings.smtp_password, settings.smtp_from_email, settings.smtp_starttls,
    ) if settings.reminder_provider in {"smtp", "multi"} else None
    push = WebPushDelivery(
        settings.web_push_vapid_private_key, settings.web_push_vapid_subject
    ) if settings.reminder_provider in {"webpush", "multi"} else None
    rows = repository.claim_due_reminders(datetime.now(timezone.utc).isoformat(), 100)
    sent = failed = 0
    for row in rows:
        title = "Okuma zamanı"
        body = f"{row['book_title']} için bugünkü hedefin hazır."
        try:
            if row["channel"] == "in_app":
                repository.create_reminder_notification(row["user_id"], row["book_id"], title, body)
            elif row["channel"] == "email":
                recipient = repository.user_email(row["user_id"])
                if not email or not recipient:
                    raise RuntimeError("E-posta teslimat sağlayıcısı veya alıcı adresi bulunamadı.")
                email.send(recipient, f"Mihenk · {title}", body)
            elif row["channel"] == "push":
                subscriptions = repository.list_web_push_subscriptions(row["user_id"])
                if not push or not subscriptions:
                    raise RuntimeError("Etkin bir push aboneliği bulunamadı.")
                for subscription in subscriptions:
                    push.send(subscription, title, body, "/?view=reading-mode")
            repository.finish_reminder(row["id"], True)
            sent += 1
        except Exception as error:
            repository.finish_reminder(row["id"], False, str(error))
            failed += 1
    print(f"processed={len(rows)} sent={sent} failed={failed}")


if __name__ == "__main__":
    main()

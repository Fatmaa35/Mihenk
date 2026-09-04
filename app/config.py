from dataclasses import dataclass
from pathlib import Path
import os
from urllib.parse import urlparse

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    app_environment: str = os.getenv("APP_ENVIRONMENT", "development").strip().lower()
    data_backend: str = os.getenv("DATA_BACKEND", "sqlite").strip().lower()
    database_path: Path = ROOT / os.getenv("DATABASE_PATH", "data/app.db")
    supabase_url: str = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supabase_publishable_key: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "").strip()
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    recovery_redirect_url: str = os.getenv(
        "RECOVERY_REDIRECT_URL", "http://127.0.0.1:8010/"
    ).strip()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    google_books_api_key: str = os.getenv("GOOGLE_BOOKS_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    llm_enabled: bool = os.getenv("LLM_ENABLED", "false").lower() == "true"
    ai_provider: str = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip().rstrip("/")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma4:cloud").strip()
    ai_input_cost_per_million_usd: float = float(os.getenv("AI_INPUT_COST_PER_MILLION_USD", "0"))
    ai_output_cost_per_million_usd: float = float(os.getenv("AI_OUTPUT_COST_PER_MILLION_USD", "0"))
    semantic_search_backend: str = os.getenv("SEMANTIC_SEARCH_BACKEND", "auto").strip().lower()
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001").strip()
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    allowed_origins: tuple[str, ...] = tuple(
        value.strip() for value in os.getenv(
            "ALLOWED_ORIGINS", "http://127.0.0.1:8010,http://localhost:8010"
        ).split(",") if value.strip()
    )
    rate_limit_enabled: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    allow_registration: bool = os.getenv("ALLOW_REGISTRATION", "true").lower() == "true"
    redis_url: str = os.getenv("REDIS_URL", "").strip()
    redis_key_prefix: str = os.getenv("REDIS_KEY_PREFIX", "mihenk").strip() or "mihenk"
    admin_emails: tuple[str, ...] = tuple(
        value.strip().casefold() for value in os.getenv("ADMIN_EMAILS", "").split(",") if value.strip()
    )
    pipeline_webhook_secret: str = os.getenv("PIPELINE_WEBHOOK_SECRET", "").strip()
    legal_entity_name: str = os.getenv("LEGAL_ENTITY_NAME", "Mihenk").strip()
    privacy_contact_email: str = os.getenv("PRIVACY_CONTACT_EMAIL", "").strip()
    audit_retention_days: int = int(os.getenv("AUDIT_RETENTION_DAYS", "365"))
    event_retention_days: int = int(os.getenv("EVENT_RETENTION_DAYS", "90"))
    notification_retention_days: int = int(os.getenv("NOTIFICATION_RETENTION_DAYS", "180"))
    chat_retention_days: int = int(os.getenv("CHAT_RETENTION_DAYS", "365"))
    reminder_provider: str = os.getenv("REMINDER_PROVIDER", "none").strip().lower()
    smtp_host: str = os.getenv("SMTP_HOST", "").strip()
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "").strip()
    smtp_starttls: bool = os.getenv("SMTP_STARTTLS", "true").lower() == "true"
    web_push_vapid_public_key: str = os.getenv("WEB_PUSH_VAPID_PUBLIC_KEY", "").strip()
    web_push_vapid_private_key: str = os.getenv("WEB_PUSH_VAPID_PRIVATE_KEY", "").strip()
    web_push_vapid_subject: str = os.getenv("WEB_PUSH_VAPID_SUBJECT", "").strip()

    def validate(self) -> None:
        if self.app_environment not in {"development", "test", "staging", "production"}:
            raise ValueError("APP_ENVIRONMENT development, test, staging veya production olabilir.")
        if self.app_environment == "production" and not self.cookie_secure:
            raise ValueError("Production ortamında COOKIE_SECURE=true zorunludur.")
        if self.app_environment == "production" and not self.redis_url:
            raise ValueError("Production ortamında REDIS_URL dağıtık limit ve metrikler için zorunludur.")
        if self.app_environment == "production":
            if self.data_backend != "supabase" or not self.supabase_secret_key:
                raise ValueError("Production ortamında Supabase backend ve secret key zorunludur.")
            if not self.privacy_contact_email or "@" not in self.privacy_contact_email:
                raise ValueError("Production ortamında PRIVACY_CONTACT_EMAIL zorunludur.")
            if urlparse(self.recovery_redirect_url).scheme != "https":
                raise ValueError("Production parola kurtarma adresi HTTPS olmalıdır.")
            if not self.allowed_origins or any(
                urlparse(origin).scheme != "https"
                or (urlparse(origin).hostname or "").casefold() in {"localhost", "127.0.0.1"}
                for origin in self.allowed_origins
            ):
                raise ValueError("Production ALLOWED_ORIGINS yalnızca gerçek HTTPS originleri içermelidir.")
        if self.data_backend not in {"sqlite", "supabase"}:
            raise ValueError("DATA_BACKEND yalnızca 'sqlite' veya 'supabase' olabilir.")
        if self.data_backend == "supabase" and not (self.supabase_url and self.supabase_publishable_key):
            raise ValueError(
                "Supabase modu için SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY tanımlanmalıdır."
            )
        if self.semantic_search_backend not in {"auto", "local", "pgvector"}:
            raise ValueError("SEMANTIC_SEARCH_BACKEND 'auto', 'local' veya 'pgvector' olabilir.")
        if self.ai_provider not in {"gemini", "ollama", "none"}:
            raise ValueError("AI_PROVIDER 'gemini', 'ollama' veya 'none' olabilir.")
        if self.ai_provider == "ollama" and not (self.ollama_base_url and self.ollama_model):
            raise ValueError("Ollama için OLLAMA_BASE_URL ve OLLAMA_MODEL tanımlanmalıdır.")
        if self.ai_input_cost_per_million_usd < 0 or self.ai_output_cost_per_million_usd < 0:
            raise ValueError("AI token maliyetleri negatif olamaz.")
        if self.embedding_dimensions != 768:
            raise ValueError("Mevcut pgvector semasi EMBEDDING_DIMENSIONS=768 bekler.")
        for name, value in {
            "AUDIT_RETENTION_DAYS": self.audit_retention_days,
            "EVENT_RETENTION_DAYS": self.event_retention_days,
            "NOTIFICATION_RETENTION_DAYS": self.notification_retention_days,
            "CHAT_RETENTION_DAYS": self.chat_retention_days,
        }.items():
            if value < 1:
                raise ValueError(f"{name} en az 1 olmalıdır.")
        if self.reminder_provider not in {"none", "smtp", "webpush", "multi"}:
            raise ValueError("REMINDER_PROVIDER none, smtp, webpush veya multi olabilir.")
        if self.reminder_provider in {"smtp", "multi"} and not (self.smtp_host and self.smtp_from_email):
            raise ValueError("SMTP bildirimleri için SMTP_HOST ve SMTP_FROM_EMAIL zorunludur.")
        if self.reminder_provider in {"webpush", "multi"} and not (
            self.web_push_vapid_public_key and self.web_push_vapid_private_key
            and self.web_push_vapid_subject
        ):
            raise ValueError("Web Push için VAPID public/private key ve subject zorunludur.")


settings = Settings()
settings.validate()

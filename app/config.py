from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)
load_dotenv(ROOT / ".env.pipeline", override=False)


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
    semantic_search_backend: str = os.getenv("SEMANTIC_SEARCH_BACKEND", "auto").strip().lower()
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001").strip()
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    allowed_origins: tuple[str, ...] = tuple(
        value.strip() for value in os.getenv(
            "ALLOWED_ORIGINS", "http://127.0.0.1:8010,http://localhost:8010"
        ).split(",") if value.strip()
    )
    rate_limit_enabled: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    admin_emails: tuple[str, ...] = tuple(
        value.strip().casefold() for value in os.getenv("ADMIN_EMAILS", "").split(",") if value.strip()
    )
    pipeline_webhook_secret: str = os.getenv("PIPELINE_WEBHOOK_SECRET", "").strip()

    def validate(self) -> None:
        if self.app_environment not in {"development", "test", "staging", "production"}:
            raise ValueError("APP_ENVIRONMENT development, test, staging veya production olabilir.")
        if self.app_environment == "production" and not self.cookie_secure:
            raise ValueError("Production ortamında COOKIE_SECURE=true zorunludur.")
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
        if self.embedding_dimensions != 768:
            raise ValueError("Mevcut pgvector semasi EMBEDDING_DIMENSIONS=768 bekler.")


settings = Settings()
settings.validate()

from app.config import Settings
from app.database import Repository
from app.supabase_repository import SupabaseRepository
from app.services.embeddings import GeminiEmbeddingProvider
from app.services.vector_search import LocalVectorIndex, PgVectorSearchIndex


def create_repository(settings: Settings) -> Repository | SupabaseRepository:
    if settings.data_backend == "supabase":
        return SupabaseRepository(
            settings.supabase_url,
            settings.supabase_publishable_key,
            settings.supabase_secret_key,
        )
    return Repository(settings.database_path)


def create_search_index(settings: Settings, repository, books: list[dict]):
    use_pgvector = (
        settings.data_backend == "supabase"
        and settings.semantic_search_backend in {"auto", "pgvector"}
    )
    if use_pgvector:
        provider = GeminiEmbeddingProvider(
            settings.gemini_api_key, settings.embedding_model, settings.embedding_dimensions
        )
        return PgVectorSearchIndex(books, repository, provider)
    return LocalVectorIndex(books)

import argparse
from datetime import datetime, timezone

from app.config import settings
from app.repository_factory import create_repository
from app.services.embeddings import GeminiEmbeddingProvider


def embedding_document(book: dict) -> str:
    return "\n".join([
        f"Baslik: {book['title']}",
        f"Yazar: {book['author']}",
        f"Tur: {book['genre']}",
        f"Temalar: {', '.join(book['themes'])}",
        f"Karakter ozellikleri: {', '.join(book['character_traits'])}",
        book["description"],
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Supabase kitap embeddinglerini yeniler.")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    if settings.data_backend != "supabase" or not settings.supabase_secret_key:
        raise SystemExit("Supabase backend ve SUPABASE_SECRET_KEY gereklidir.")
    provider = GeminiEmbeddingProvider(
        settings.gemini_api_key, settings.embedding_model, settings.embedding_dimensions
    )
    if not provider.available:
        raise SystemExit("GEMINI_API_KEY gereklidir.")
    repository = create_repository(settings)
    books = repository.list_books()
    if args.limit:
        books = books[:args.limit]
    updated = 0
    for start in range(0, len(books), args.batch_size):
        batch = books[start:start + args.batch_size]
        embeddings = provider.embed_documents([embedding_document(book) for book in batch])
        timestamp = datetime.now(timezone.utc).isoformat()
        updated += repository.upsert_book_embeddings([{
            "id": book["id"], "embedding": embedding,
            "embedding_model": settings.embedding_model,
            "embedding_updated_at": timestamp,
        } for book, embedding in zip(batch, embeddings)])
    print({"updated": updated, "model": settings.embedding_model})


if __name__ == "__main__":
    main()

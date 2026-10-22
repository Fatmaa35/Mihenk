"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()

SPA_PAGE = STATIC_DIR / "generated" / "app" / "index.html"
# React uygulamasının istemci tarafı rotaları. API yollarıyla çakışmaması için açıkça listelenir.
SPA_ROUTES = ("giris", "bugun", "kesfet", "kitapligim", "kulupler", "odak")


def spa_page() -> FileResponse:
    """Yeni arayüz derlenmemişse klasik arayüze düşer; geliştirme ortamı hiç kırılmaz."""
    page = SPA_PAGE if SPA_PAGE.exists() else STATIC_PAGE
    return FileResponse(page, media_type="text/html; charset=utf-8", headers={"Cache-Control": "no-cache"})


@router.get("/", include_in_schema=False)
def home() -> FileResponse:
    return spa_page()


for _route in SPA_ROUTES:
    router.add_api_route(f"/{_route}", spa_page, methods=["GET"], include_in_schema=False)


@router.get("/classic", include_in_schema=False)
def classic_home() -> FileResponse:
    """Henüz yeni arayüze taşınmamış ekranlar için klasik arayüz."""
    return FileResponse(STATIC_PAGE, media_type="text/html; charset=utf-8")


@router.get("/privacy", include_in_schema=False)
def privacy_notice() -> FileResponse:
    return FileResponse(PRIVACY_PAGE, media_type="text/html; charset=utf-8")


@router.get("/health")
def health() -> dict:
    if settings.app_environment == "production":
        return {"status": "ok"}
    return {
        "status": "ok",
        "data_backend": settings.data_backend,
        "books": len(repository.list_books()),
        "llm_enabled": explainer.enabled,
        "ai_provider": settings.ai_provider,
        "ai_model": getattr(explainer, "model", None),
        "llm_profiles": {
            MATCHER_PROFILE.name: {
                "temperature": MATCHER_PROFILE.temperature,
                "output": "structured_json",
            },
            ASSISTANT_PROFILE.name: {
                "temperature": ASSISTANT_PROFILE.temperature,
                "output": "markdown_text",
                "history_messages": ASSISTANT_PROFILE.max_history_messages,
            },
        },
        "scoring": {"character": 0.45, "themes": 0.15, "reading_history": 0.40},
        "semantic_search": type(services.search_index).__name__,
    }


@router.get("/ready")
def ready() -> dict:
    books = repository.list_books()
    if not books:
        raise HTTPException(status_code=503, detail="Katalog hazır değil.")
    if settings.app_environment == "production":
        return {"status": "ready"}
    return {"status": "ready", "catalog_books": len(books), "backend": settings.data_backend}

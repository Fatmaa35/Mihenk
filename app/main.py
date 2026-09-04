"""Mihenk FastAPI composition root."""
from fastapi import Request
from fastapi.responses import JSONResponse

from app.runtime import app, current_session, httpx, require_role, repository, recommender, settings
from app.supabase_repository import SupabaseRequestError
from app.routers.platform import router as platform_router
from app.routers.auth import router as auth_router
from app.routers.library import router as library_router
from app.routers.recommendations import router as recommendations_router
from app.routers.admin import router as admin_router
from app.routers.community import router as community_router
from app.routers.catalog import router as catalog_router
from app.routers.pricing import router as pricing_router
from app.routers.product import create_product_router
from app.routers.beta import create_beta_router

@app.exception_handler(SupabaseRequestError)
def supabase_error_handler(request: Request, error: SupabaseRequestError) -> JSONResponse:
    metrics.increment("supabase_errors")
    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})



for feature_router in (
    platform_router,
    auth_router,
    library_router,
    recommendations_router,
    admin_router,
    community_router,
    catalog_router,
    pricing_router,
):
    app.include_router(feature_router)

app.include_router(create_product_router(
    repository=repository,
    recommender=recommender,
    settings=settings,
    current_session=current_session,
    require_role=require_role,
))
app.include_router(create_beta_router(
    repository=repository,
    current_session=current_session,
    require_role=require_role,
))

__all__ = ["app", "repository"]

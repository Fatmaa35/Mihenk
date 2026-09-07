from __future__ import annotations

from typing import Callable

from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.schemas import BetaFeedbackCreate, ProductEventCreate


def create_beta_router(*, repository, current_session: Callable,
                       require_role: Callable) -> APIRouter:
    router = APIRouter(tags=["closed-beta"])

    @router.post("/me/product-events", status_code=201)
    def product_event(payload: ProductEventCreate, request: Request, response: Response) -> dict:
        session = current_session(request, response)
        if len(str(payload.properties)) > 8_000:
            raise HTTPException(status_code=422, detail="Olay ayrıntıları çok büyük.")
        return repository.track_product_event(
            session["user"]["id"], payload.event_name,
            payload.properties, session["access_token"],
        )

    @router.get("/me/beta-feedback")
    def my_beta_feedback(request: Request, response: Response,
                         limit: int = Query(default=20, ge=1, le=100)) -> list[dict]:
        session = current_session(request, response)
        return repository.list_beta_feedback(
            session["user"]["id"], limit, session["access_token"],
        )

    @router.post("/me/beta-feedback", status_code=201)
    def submit_beta_feedback(payload: BetaFeedbackCreate,
                             request: Request, response: Response) -> dict:
        session = current_session(request, response)
        if len(str(payload.context)) > 8_000:
            raise HTTPException(status_code=422, detail="Geri bildirim bağlamı çok büyük.")
        return repository.create_beta_feedback(
            session["user"]["id"], payload.category, payload.rating,
            payload.message, payload.context, session["access_token"],
        )

    @router.get("/admin/beta-dashboard")
    def beta_dashboard(request: Request, response: Response,
                       days: int = Query(default=30, ge=1, le=365)) -> dict:
        session = require_role(request, response, "editor", "admin")
        return repository.beta_dashboard(days, session["access_token"])

    return router

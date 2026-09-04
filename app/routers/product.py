from __future__ import annotations

from typing import Callable
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.schemas import (
    BookClubCreate,
    BookClubDiscussionCreate,
    BookClubEventCreate,
    BookClubEventRSVPUpsert,
    BookClubJoin,
    BookClubJoinReading,
    BookClubMemberRoleUpdate,
    BookClubPatch,
    BookClubPollCreate,
    BookClubProgressUpsert,
    BookClubReactionToggle,
    BookClubReadUpsert,
    BookClubRoomCreate,
    BookClubRoomMessageCreate,
    BookClubRoomSessionComplete,
    BookClubVoteUpsert,
    CharacterSearchRequest,
    EditionSubscriptionUpsert,
    LibraryCSVImport,
    NotificationPreferencesUpsert,
    OnboardingUpsert,
    ReadingListCreate,
    ReadingListItemUpsert,
    RecommendationInteractionCreate,
)
from app.services.gemini import GeminiExplainer
from app.services.product_growth import experiment_variant, onboarding_tasks, parse_library_csv


def create_product_router(*, repository, recommender, settings,
                          current_session: Callable, require_role: Callable) -> APIRouter:
    router = APIRouter(tags=["product-growth"])

    def session_for(request: Request, response: Response) -> dict:
        return current_session(request, response)

    @router.post("/demo/recommendations")
    async def demo_recommendations(payload: CharacterSearchRequest) -> dict:
        profile = {"read_books": [], "reading_books": [], "to_read_books": [], "favorite_books": [],
                   "abandoned_books": [], "recommendation_feedback": [], "feedback_books": [], "preferences": {}}
        summary, candidates = recommender.recommend(payload.character_description, profile, 40)
        result = await GeminiExplainer("", settings.gemini_model, False).explain(
            profile, payload.character_description, summary, candidates, min(payload.limit, 5)
        )
        return {**result.model_dump(), "recommendation_id": str(uuid4()), "experiment_variant": "catalog_control"}

    @router.get("/me/onboarding")
    def get_onboarding(request: Request, response: Response) -> dict:
        session = session_for(request, response)
        user_id, token = session["user"]["id"], session["access_token"]
        onboarding = repository.onboarding_profile(user_id, token)
        profile = repository.user_profile(user_id, token)
        preferences = repository.user_preferences(user_id, token)
        return {
            **onboarding,
            "preferred_genres": preferences.get("preferred_genres", []),
            "pace_preference": preferences.get("pace_preference") or "mixed",
            "tone_preference": preferences.get("tone_preference") or "balanced",
            "focus_preference": preferences.get("focus_preference") or "balanced",
            "tasks": onboarding_tasks(profile, onboarding),
        }

    @router.put("/me/onboarding")
    def save_onboarding(payload: OnboardingUpsert, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        user_id, token = session["user"]["id"], session["access_token"]
        current = repository.user_preferences(user_id, token)
        repository.upsert_user_preferences(
            user_id=user_id,
            personality_text=current.get("personality_text", ""),
            selected_traits=current.get("selected_traits", []),
            preferred_genres=payload.preferred_genres,
            disliked_genres=current.get("disliked_genres", []),
            liked_styles=current.get("liked_styles", []),
            disliked_styles=current.get("disliked_styles", []),
            pace_preference=payload.pace_preference,
            focus_preference=payload.focus_preference,
            tone_preference=payload.tone_preference,
            violence_sensitivity=current.get("violence_sensitivity", 0),
            romance_sensitivity=current.get("romance_sensitivity", 0),
            spoiler_sensitivity=current.get("spoiler_sensitivity", 2),
            length_preference=current.get("length_preference"),
            access_token=token,
        )
        saved = repository.upsert_onboarding_profile(
            user_id, payload.liked_book_ids, payload.liked_authors, payload.completed, token
        )
        repository.track_product_event(
            user_id, "onboarding_completed" if payload.completed else "onboarding_started",
            {"genres": len(payload.preferred_genres), "authors": len(payload.liked_authors)}, token,
        )
        profile = repository.user_profile(user_id, token)
        return {
            **saved,
            "preferred_genres": payload.preferred_genres,
            "pace_preference": payload.pace_preference or "mixed",
            "tone_preference": payload.tone_preference or "balanced",
            "focus_preference": payload.focus_preference or "balanced",
            "tasks": onboarding_tasks(profile, saved),
        }

    @router.post("/me/library/import")
    def import_library(payload: LibraryCSVImport, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            records, warnings = parse_library_csv(payload.csv_text)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        result = repository.import_library_records(
            session["user"]["id"], records, session["access_token"]
        )
        return {**result, "warnings": warnings}

    @router.post("/me/recommendation-interactions", status_code=201)
    def recommendation_interaction(payload: RecommendationInteractionCreate, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        values = payload.model_dump()
        values["experiment_variant"] = experiment_variant(session["user"]["id"])
        return repository.log_recommendation_interaction(
            session["user"]["id"], values, session["access_token"]
        )

    @router.get("/admin/recommendation-funnel")
    def recommendation_funnel(request: Request, response: Response,
                              days: int = Query(default=30, ge=1, le=365)) -> dict:
        session = require_role(request, response, "editor", "admin")
        return repository.recommendation_funnel(days, session["access_token"])

    @router.get("/me/notification-preferences")
    def get_notification_preferences(request: Request, response: Response) -> dict:
        session = session_for(request, response)
        return repository.notification_preferences(session["user"]["id"], session["access_token"])

    @router.put("/me/notification-preferences")
    def save_notification_preferences(payload: NotificationPreferencesUpsert,
                                      request: Request, response: Response) -> dict:
        session = session_for(request, response)
        saved = repository.upsert_notification_preferences(
            session["user"]["id"], payload.model_dump(), session["access_token"]
        )
        if payload.consent_granted:
            repository.track_product_event(
                session["user"]["id"], "notification_opt_in",
                {"frequency": payload.frequency}, session["access_token"],
            )
        return saved

    @router.get("/me/weekly-summary")
    def weekly_summary(request: Request, response: Response) -> dict:
        session = session_for(request, response)
        return repository.weekly_summary(session["user"]["id"], session["access_token"])

    @router.get("/me/edition-subscriptions")
    def edition_subscriptions(request: Request, response: Response) -> list[dict]:
        session = session_for(request, response)
        return repository.list_edition_subscriptions(session["user"]["id"], session["access_token"])

    @router.put("/me/edition-subscriptions")
    def save_edition_subscription(payload: EditionSubscriptionUpsert,
                                  request: Request, response: Response) -> dict:
        session = session_for(request, response)
        return repository.upsert_edition_subscription(
            session["user"]["id"], payload.book_id, payload.event_type, payload.is_active, session["access_token"]
        )

    @router.get("/me/reading-lists")
    def reading_lists(request: Request, response: Response) -> list[dict]:
        session = session_for(request, response)
        return repository.list_reading_lists(session["user"]["id"], session["access_token"])

    @router.post("/me/reading-lists", status_code=201)
    def create_reading_list(payload: ReadingListCreate, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        return repository.create_reading_list(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])

    @router.put("/me/reading-lists/{list_id}/items")
    def add_reading_list_item(list_id: str, payload: ReadingListItemUpsert,
                              request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.upsert_reading_list_item(
                session["user"]["id"], list_id, **payload.model_dump(), access_token=session["access_token"]
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.get("/shared/reading-lists/{share_token}")
    def shared_reading_list(share_token: str) -> dict:
        try:
            return repository.reading_list_detail(share_token=share_token)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.get("/me/book-clubs")
    def book_clubs(request: Request, response: Response) -> list[dict]:
        session = session_for(request, response)
        return repository.list_book_clubs(session["user"]["id"], session["access_token"])

    @router.post("/me/book-clubs", status_code=201)
    def create_book_club(payload: BookClubCreate, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        return repository.create_book_club(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])

    @router.post("/me/book-clubs/join")
    def join_book_club(payload: BookClubJoin, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.join_book_club(session["user"]["id"], payload.invite_code, session["access_token"])
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.patch("/me/book-clubs/{club_id}")
    def update_book_club(club_id: str, payload: BookClubPatch,
                         request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.update_book_club(session["user"]["id"], club_id, payload.model_dump(exclude_unset=True), session["access_token"])
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.put("/me/book-clubs/{club_id}/members/{target_user_id}/role")
    def update_member_role(club_id: str, target_user_id: str, payload: BookClubMemberRoleUpdate,
                           request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.update_book_club_member_role(
                session["user"]["id"], club_id, target_user_id, payload.role, session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/join-reading")
    def join_reading(club_id: str, payload: BookClubJoinReading,
                     request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.join_reading(
                session["user"]["id"], club_id, payload.book_id,
                payload.daily_target_pages, payload.shelf, session["access_token"]
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.put("/me/book-clubs/{club_id}/reads")
    def save_book_club_read(club_id: str, payload: BookClubReadUpsert,
                            request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.upsert_book_club_read(
                session["user"]["id"], club_id, payload.model_dump(), session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.get("/me/book-clubs/{club_id}")
    def get_book_club(club_id: str, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.book_club_detail(session["user"]["id"], club_id, session["access_token"])
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.put("/me/book-clubs/{club_id}/progress")
    def save_club_progress(club_id: str, payload: BookClubProgressUpsert,
                           request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.upsert_book_club_progress(
                session["user"]["id"], club_id, payload.model_dump(), session["access_token"]
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/discussions", status_code=201)
    def create_club_discussion(club_id: str, payload: BookClubDiscussionCreate,
                               request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.create_book_club_discussion(
                session["user"]["id"], club_id, payload.model_dump(), session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/discussions/{discussion_id}/reactions")
    def toggle_reaction(club_id: str, discussion_id: str, payload: BookClubReactionToggle,
                        request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.toggle_book_club_reaction(
                session["user"]["id"], club_id, discussion_id, payload.reaction_type, session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/events", status_code=201)
    def create_club_event(club_id: str, payload: BookClubEventCreate,
                          request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.create_book_club_event(
                session["user"]["id"], club_id, payload.model_dump(), session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.put("/me/book-clubs/{club_id}/events/{event_id}/rsvp")
    def rsvp_club_event(club_id: str, event_id: str, payload: BookClubEventRSVPUpsert,
                        request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.rsvp_book_club_event(
                session["user"]["id"], club_id, event_id, payload.status, session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/polls", status_code=201)
    def create_club_poll(club_id: str, payload: BookClubPollCreate,
                         request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.create_book_club_poll(
                session["user"]["id"], club_id, payload.title, payload.option_book_ids, session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.put("/me/book-clubs/{club_id}/polls/{poll_id}/vote")
    def vote_club_poll(club_id: str, poll_id: str, payload: BookClubVoteUpsert,
                       request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.vote_book_club_poll(
                session["user"]["id"], club_id, poll_id, payload.option_id, session["access_token"]
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.get("/me/book-clubs/{club_id}/room")
    def get_club_room(club_id: str, request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.get_or_create_club_room(
                session["user"]["id"], club_id, access_token=session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/room/complete-session")
    def complete_club_room_session(club_id: str, payload: BookClubRoomSessionComplete,
                                   request: Request, response: Response) -> dict:
        session = session_for(request, response)
        try:
            return repository.complete_room_session(
                session["user"]["id"], club_id, payload.model_dump(), session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    @router.post("/me/book-clubs/{club_id}/room/messages", status_code=201)
    def send_club_room_message(club_id: str, payload: BookClubRoomMessageCreate,
                               request: Request, response: Response,
                               room_id: str = Query(...)) -> dict:
        session = session_for(request, response)
        try:
            return repository.send_room_message(
                session["user"]["id"], club_id, room_id, payload.content, session["access_token"]
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error

    return router

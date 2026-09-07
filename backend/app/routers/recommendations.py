"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()


@router.post("/recommendations/character", response_model=CharacterRecommendationResponse)
async def character_recommendations(
    payload: CharacterRecommendationRequest,
    request: Request,
    response: Response,
) -> CharacterRecommendationResponse:
    session = current_session(request, response)
    if session["user"]["id"] != payload.user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcı adına öneri alınamaz.")
    try:
        profile = repository.user_profile(payload.user_id, access_token=session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    summary, candidates = recommender.recommend(
        payload.character_description, profile, payload.limit,
        access_token=session["access_token"],
    )
    try:
        return await explainer.explain(profile, payload.character_description, summary, candidates)
    except GeminiUnavailable:
        fallback = GeminiExplainer("", settings.gemini_model, False)
        return await fallback.explain(profile, payload.character_description, summary, candidates)

@router.post("/me/recommendations")
async def my_recommendations(payload: CharacterSearchRequest, request: Request, response: Response) -> dict:
    started = perf_counter()
    session = current_session(request, response)
    user = session["user"]
    profile = repository.user_profile(user["id"], access_token=session["access_token"])
    profile["preferences"] = repository.user_preferences(user["id"], session["access_token"])
    summary, candidates = recommender.recommend(
        payload.character_description, profile, 50,
        access_token=session["access_token"],
    )
    variant = experiment_variant(user["id"])
    fallback_used = variant == "catalog_control"
    if variant == "catalog_control":
        result = await GeminiExplainer("", settings.gemini_model, False).explain(
            profile, payload.character_description, summary, candidates, payload.limit
        )
    else:
        try:
            result = await explainer.explain(profile, payload.character_description, summary, candidates, payload.limit)
        except GeminiUnavailable:
            fallback_used = True
            result = await GeminiExplainer("", settings.gemini_model, False).explain(profile, payload.character_description, summary, candidates, payload.limit)
    recommendation_id = str(uuid4())
    title_to_id = {book["title"].casefold(): book["id"] for book in catalog}
    for position, item in enumerate(result.recommended_books, start=1):
        repository.log_recommendation_interaction(user["id"], {
            "recommendation_id": recommendation_id,
            "book_id": title_to_id.get(item.book_title.casefold()),
            "event_type": "impression",
            "position": position,
            "experiment_variant": variant,
            "query_text": payload.character_description,
            "metadata": {"match_score": item.match_score},
        }, session["access_token"])
    repository.log_recommendation_event(user["id"], payload.character_description, len(result.recommended_books),
                                        fallback_used, round((perf_counter() - started) * 1000), session["access_token"])
    response.headers["X-Search-Explanation"] = json.dumps(recommender.last_query_explanation, ensure_ascii=True, separators=(",", ":"))[:4000]
    return {**result.model_dump(), "recommendation_id": recommendation_id, "experiment_variant": variant}


@router.get("/me/recommendations/explanation")
def my_recommendation_explanation(request: Request, response: Response) -> dict:
    current_session(request, response)
    return recommender.last_query_explanation


@router.post("/me/chat", response_model=ChatResponse)
async def chat_with_book_assistant(
    payload: ChatRequest, request: Request, response: Response,
) -> ChatResponse:
    session = current_session(request, response)
    user_id = session["user"]["id"]
    profile = repository.user_profile(user_id, access_token=session["access_token"])
    profile["preferences"] = repository.user_preferences(user_id, session["access_token"])
    dashboard = repository.reading_dashboard(
        user_id, date.today().year, access_token=session["access_token"]
    )
    chat_session = None
    if payload.session_id:
        existing = repository.list_chat_sessions(user_id, session["access_token"])
        chat_session = next((item for item in existing if item["id"] == payload.session_id), None)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Sohbet bulunamadı.")
    else:
        chat_session = repository.create_chat_session(user_id, access_token=session["access_token"])
    stored = repository.chat_messages(user_id, chat_session["id"], 12, session["access_token"])
    history = [{"role": item["role"], "content": item["content"]} for item in stored[-8:]] or [item.model_dump() for item in payload.history]
    repository.save_chat_message(user_id, chat_session["id"], "user", payload.message, access_token=session["access_token"])
    result = await chatbot.reply(
        payload.message, profile, dashboard, access_token=session["access_token"],
        history=history,
        active_view_context=(
            payload.active_view_context.model_dump() if payload.active_view_context else None
        ),
    )
    repository.save_chat_message(user_id, chat_session["id"], "assistant", result.answer,
                                 [book.model_dump() for book in result.books], session["access_token"])
    result.session_id = chat_session["id"]
    return result


@router.get("/me/chat/sessions")
def my_chat_sessions(request: Request, response: Response,
                     q: str | None = Query(default=None, max_length=120), archived: bool = False) -> list[dict]:
    session = current_session(request, response)
    return repository.list_chat_sessions(session["user"]["id"], session["access_token"], q, archived)


@router.patch("/me/chat/sessions/{session_id}")
def patch_my_chat_session(session_id: str, payload: ChatSessionPatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_session(session["user"]["id"], session_id,
                                          payload.model_dump(exclude_unset=True), session["access_token"])


@router.get("/me/chat/sessions/{session_id}/messages")
def my_chat_messages(session_id: str, request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.chat_messages(session["user"]["id"], session_id, 100, session["access_token"])


@router.delete("/me/chat/sessions/{session_id}", status_code=204)
def delete_my_chat_session(session_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.delete_chat_session(session["user"]["id"], session_id, session["access_token"])
    response.status_code = 204
    return response


@router.patch("/me/chat/messages/{message_id}")
def patch_my_chat_message(message_id: str, payload: ChatMessagePatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_message(session["user"]["id"], message_id, payload.content, False, session["access_token"])


@router.delete("/me/chat/messages/{message_id}")
def delete_my_chat_message(message_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.update_chat_message(session["user"]["id"], message_id, None, True, session["access_token"])


@router.post("/me/chat/stream")
async def stream_book_assistant(payload: ChatRequest, request: Request) -> StreamingResponse:
    """SSE transport supports stop/retry UX; persistence uses the same validated chat path."""
    async def events():
        result = await chat_with_book_assistant(payload, request, Response())
        for word in result.answer.split(" "):
            if await request.is_disconnected():
                return
            yield "event: delta\ndata: " + json.dumps({"text": word + " "}, ensure_ascii=False) + "\n\n"
            await asyncio.sleep(0)
        yield "event: complete\ndata: " + result.model_dump_json() + "\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


@router.post("/me/chat/actions/execute")
def execute_chat_action(payload: ChatActionExecute, request: Request, response: Response) -> dict:
    started = perf_counter()
    session = current_session(request, response)
    action, user_id, token = payload.action, session["user"]["id"], session["access_token"]
    existing_result = repository.action_execution(user_id, payload.idempotency_key, token)
    if existing_result is not None:
        return {**existing_result, "replayed": True}
    book = next((item for item in catalog if item["id"] == action.book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Bu işlem yapılamıyor: kitap katalogda bulunamadı.")
    profile = repository.user_profile(user_id, token)
    entry = next((item for shelf in ("read_books", "reading_books", "to_read_books")
                  for item in profile[shelf] if item["id"] == action.book_id), None)
    action_payload = action.model_dump()
    try:
        if action.action_type == "set_price_alert":
            previous = next((item for item in repository.list_price_alerts(user_id, token) if item["book_id"] == action.book_id), None)
            result = repository.upsert_price_alert(user_id, action.book_id, int(action.arguments["target_price_minor"]), "TRY", True, token)
            inverse = {"kind": "restore_price_alert", "value": previous, "book_id": action.book_id}
        else:
            inverse = {"kind": "restore_library", "value": entry, "book_id": action.book_id}
            shelf = "read" if action.action_type == "finish_book" else "reading" if action.action_type == "update_progress" else str(action.arguments.get("shelf", entry.get("shelf", "to_read") if entry else "to_read"))
            favorite = True if action.action_type == "favorite" else bool(entry and entry.get("is_favorite"))
            current_page = int(action.arguments.get("current_page", entry.get("current_page", 0) if entry else 0))
            total_pages = entry.get("total_pages") if entry else book.get("page_count")
            if total_pages and current_page > total_pages:
                raise HTTPException(status_code=422, detail=f"Bu işlem yapılamıyor: kitap {total_pages} sayfa, istenen ilerleme {current_page}.")
            if shelf == "read" and total_pages:
                current_page = total_pages
            result = repository.upsert_library_entry(user_id, action.book_id, shelf, favorite, current_page, total_pages, None, token)
        result = {**result, "idempotency_key": payload.idempotency_key, "undo_available": True}
        repository.save_action_execution(user_id, payload.idempotency_key, action.action_type, result, token,
                                         action_payload=action_payload, inverse_action=inverse,
                                         duration_ms=round((perf_counter() - started) * 1000))
        return result
    except HTTPException:
        raise
    except (KeyError, ValueError, SupabaseRequestError) as error:
        repository.save_action_execution(user_id, payload.idempotency_key, action.action_type,
                                         {"detail": str(error)}, token, action_payload=action_payload,
                                         status="failed", error_code=type(error).__name__,
                                         duration_ms=round((perf_counter() - started) * 1000))
        raise HTTPException(status_code=422, detail=f"Bu işlem yapılamıyor: {error}") from error


@router.get("/me/chat/actions/schema")
def chat_action_schema(request: Request, response: Response) -> dict:
    current_session(request, response)
    from app.schemas import ChatAction
    return ChatAction.model_json_schema()


@router.get("/me/chat/actions/history")
def chat_action_history(request: Request, response: Response, limit: int = Query(default=50, ge=1, le=100)) -> list[dict]:
    session = current_session(request, response)
    return repository.action_history(session["user"]["id"], limit, session["access_token"])


@router.post("/me/chat/actions/{idempotency_key}/undo")
def undo_chat_action(idempotency_key: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    user_id, token = session["user"]["id"], session["access_token"]
    row = next((item for item in repository.action_history(user_id, 100, token) if item["idempotency_key"] == idempotency_key), None)
    if not row or row.get("status") != "succeeded" or not row.get("inverse_action"):
        raise HTTPException(status_code=409, detail="Bu işlem geri alınamaz veya daha önce geri alınmış.")
    inverse = row["inverse_action"]
    previous, book_id = inverse.get("value"), inverse["book_id"]
    if inverse["kind"] == "restore_price_alert":
        if previous:
            repository.upsert_price_alert(user_id, book_id, previous["target_price_minor"], previous.get("currency", "TRY"), previous.get("is_active", True), token)
        else:
            repository.delete_price_alert(user_id, book_id, token)
    elif previous:
        repository.upsert_library_entry(user_id, book_id, previous["shelf"], previous.get("is_favorite", False),
                                        previous.get("current_page", 0), previous.get("total_pages"), previous.get("abandonment_reason"), token)
    else:
        repository.remove_library_entry(user_id, book_id, token)
    repository.mark_action_undone(user_id, idempotency_key, token)
    return {"undone": True, "idempotency_key": idempotency_key}


@router.get("/me/recommendation-feedback")
def my_feedback(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.recommendation_feedback(session["user"]["id"], session["access_token"])


@router.put("/me/recommendation-feedback")
def update_my_feedback(payload: RecommendationFeedbackUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.upsert_recommendation_feedback(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])


@router.post("/me/books/compare")
def compare_my_books(payload: BookComparisonRequest, request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    if len(set(payload.book_ids)) != len(payload.book_ids):
        raise HTTPException(status_code=400, detail="Karşılaştırma için farklı kitaplar seçin.")
    return repository.compare_books(payload.book_ids, session["user"]["id"], session["access_token"])


@router.get("/me/reading-plans")
def my_reading_plans(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_reading_plans(session["user"]["id"], session["access_token"])


@router.put("/me/reading-plans")
def update_my_reading_plan(payload: ReadingPlanUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    if payload.delivery_channel == "email" and settings.reminder_provider not in {"smtp", "multi"}:
        raise HTTPException(status_code=503, detail="E-posta bildirimleri henüz yapılandırılmadı.")
    if payload.delivery_channel == "push" and settings.reminder_provider not in {"webpush", "multi"}:
        raise HTTPException(status_code=503, detail="Push bildirimleri henüz yapılandırılmadı.")
    try:
        return repository.upsert_reading_plan(session["user"]["id"], **payload.model_dump(), access_token=session["access_token"])
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Geçerli bir bitiş tarihi seçin.") from error


@router.get("/me/reading-plans/calendar")
def my_reading_plan_calendar(request: Request, response: Response,
                             start: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
                             end: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")) -> list[dict]:
    session = current_session(request, response)
    if date.fromisoformat(end) < date.fromisoformat(start):
        raise HTTPException(status_code=400, detail="Bitiş tarihi başlangıçtan önce olamaz.")
    return repository.reading_plan_calendar(session["user"]["id"], start, end, session["access_token"])


@router.patch("/me/reading-plans/{book_id}/status")
def patch_my_reading_plan_status(book_id: str, payload: ReadingPlanStatusPatch,
                                 request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_reading_plan_status(session["user"]["id"], book_id, payload.status, session["access_token"])

"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()

@router.get("/books/{book_id}/community")
def book_community(book_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.book_community(book_id, session["user"]["id"], session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error


@router.put("/me/book-ratings/{book_id}")
def rate_book(book_id: str, payload: BookRatingUpsert, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        result = repository.upsert_book_rating(session["user"]["id"], book_id, payload.rating, session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    refresh_catalog_state()
    return result


@router.delete("/me/book-ratings/{book_id}", status_code=204)
def remove_book_rating(book_id: str, request: Request, response: Response):
    session = current_session(request, response)
    repository.delete_book_rating(session["user"]["id"], book_id, session["access_token"])
    refresh_catalog_state()
    return response

@router.post("/me/book-comments", status_code=201)
def create_book_comment(payload: BookCommentCreate, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.create_book_comment(session["user"]["id"], payload.book_id, payload.content,
                                          payload.contains_spoiler, session["access_token"], payload.parent_comment_id)


@router.put("/me/comments/{comment_id}/helpful")
def mark_comment_helpful(comment_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_comment_helpful(session["user"]["id"], comment_id, True, session["access_token"])


@router.delete("/me/comments/{comment_id}/helpful")
def unmark_comment_helpful(comment_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_comment_helpful(session["user"]["id"], comment_id, False, session["access_token"])


@router.post("/me/comments/{comment_id}/reports", status_code=201)
def report_comment(comment_id: str, payload: CommentReportCreate,
                   request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.report_comment(session["user"]["id"], comment_id, payload.reason,
                                         payload.details, session["access_token"])
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=error.args[0]) from error


@router.put("/me/follows/{user_id}")
def follow_user(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_follow(session["user"]["id"], user_id, True, session["access_token"])


@router.delete("/me/follows/{user_id}")
def unfollow_user(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.set_follow(session["user"]["id"], user_id, False, session["access_token"])


@router.get("/me/community-feed")
def my_community_feed(request: Request, response: Response,
                      limit: int = Query(default=40, ge=1, le=100)) -> list[dict]:
    session = current_session(request, response)
    return repository.community_feed(session["user"]["id"], limit, session["access_token"])


@router.patch("/me/book-comments/{comment_id}")
def update_book_comment(comment_id: str, payload: BookCommentPatch, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    try:
        return repository.update_book_comment(session["user"]["id"], comment_id, payload.model_dump(exclude_unset=True), session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/me/book-comments/{comment_id}", status_code=204)
def delete_book_comment(comment_id: str, request: Request, response: Response):
    session = current_session(request, response)
    try:
        repository.delete_book_comment(session["user"]["id"], comment_id, session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    return response

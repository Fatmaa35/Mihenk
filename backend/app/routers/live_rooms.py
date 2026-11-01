"""Canlı odalar: arkadaşlarla birlikte okuma ya da ders çalışma. Kamera ve mikrofon yok;
sayfa birkaç saniyede bir odanın durumunu ister, bu istek aynı zamanda "buradayım" sinyalidir."""
from fastapi import APIRouter

from app.runtime import *  # noqa: F403 - explicit shared runtime boundary
from app.schemas import LiveRoomCreate, LiveRoomJoin, LiveRoomMessageCreate, LiveRoomStatus

router = APIRouter()


def _call(fn, *args):
    try:
        return fn(*args)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/me/live-rooms")
def my_live_rooms(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_live_rooms(session["user"]["id"], session["access_token"])


@router.post("/me/live-rooms", status_code=201)
def create_live_room(payload: LiveRoomCreate, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return _call(repository.create_live_room, session["user"]["id"], payload.title, payload.purpose, session["access_token"])


@router.post("/me/live-rooms/join")
def join_live_room(payload: LiveRoomJoin, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return _call(repository.join_live_room, session["user"]["id"], payload.invite_code, session["access_token"])


@router.get("/me/live-rooms/{room_id}")
def live_room_state(room_id: str, request: Request, response: Response,
                    after: int | None = Query(default=None, ge=0)) -> dict:
    session = current_session(request, response)
    response.headers["Cache-Control"] = "no-store"
    return _call(repository.live_room_state, session["user"]["id"], room_id, after, session["access_token"])


@router.post("/me/live-rooms/{room_id}/messages", status_code=201)
def post_live_room_message(room_id: str, payload: LiveRoomMessageCreate, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return _call(repository.post_live_room_message, session["user"]["id"], room_id, payload.content, session["access_token"])


@router.put("/me/live-rooms/{room_id}/status")
def set_live_room_status(room_id: str, payload: LiveRoomStatus, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return _call(repository.set_live_room_status, session["user"]["id"], room_id, payload.status_text, session["access_token"])


@router.post("/me/live-rooms/{room_id}/leave", status_code=204)
def leave_live_room(room_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    _call(repository.leave_live_room, session["user"]["id"], room_id, session["access_token"])
    response.status_code = 204
    return response


@router.delete("/me/live-rooms/{room_id}/members/{user_id}", status_code=204)
def remove_live_room_member(room_id: str, user_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    _call(repository.remove_live_room_member, session["user"]["id"], room_id, user_id, session["access_token"])
    response.status_code = 204
    return response


@router.post("/me/live-rooms/{room_id}/close", status_code=204)
def close_live_room(room_id: str, request: Request, response: Response) -> Response:
    session = current_session(request, response)
    _call(repository.close_live_room, session["user"]["id"], room_id, session["access_token"])
    response.status_code = 204
    return response

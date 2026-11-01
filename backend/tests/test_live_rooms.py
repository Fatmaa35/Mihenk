"""Canlı odalar: oda açma, davetle katılma, katılımcı listesi, sohbet ve odayı açanın yetkileri."""
from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.services.common.live_rooms import (
    PRESENT_SECONDS, is_present, iso, normalize_invite_code, now_utc, sort_participants,
)

MOBILE = {"X-Mihenk-Client": "mobile"}


def _user(client: TestClient, name: str) -> tuple[dict, str]:
    registered = client.post("/auth/register", headers=MOBILE, json={
        "display_name": name, "email": f"oda-{uuid4().hex[:8]}@example.com", "password": "en-az-sekiz"})
    assert registered.status_code == 201
    headers = {**MOBILE, "Authorization": f"Bearer {registered.headers['x-session-access-token']}"}
    return headers, client.get("/auth/me", headers=headers).json()["id"]


def _client() -> TestClient:
    from app.main import app
    return TestClient(app)


def test_friends_join_by_invite_see_each_other_and_chat() -> None:
    client = _client()
    ayse, ayse_id = _user(client, "Ayşe")
    can, can_id = _user(client, "Can")

    created = client.post("/me/live-rooms", headers=ayse, json={"title": "Final haftası", "purpose": "study"})
    assert created.status_code == 201
    room = created.json()
    assert room["role"] == "owner" and len(room["invite_code"]) == 8

    # Davet kodu küçük harf ve tireyle de çalışır.
    code = room["invite_code"].lower()
    joined = client.post("/me/live-rooms/join", headers=can, json={"invite_code": f"{code[:4]}-{code[4:]}"})
    assert joined.status_code == 200 and joined.json()["role"] == "member"

    state = client.get(f"/me/live-rooms/{room['id']}", headers=can).json()
    assert state["present_count"] == 2
    assert [p["display_name"] for p in state["participants"]] == ["Ayşe", "Can"]
    assert [(m["display_name"], m["kind"]) for m in state["messages"]] == [("Ayşe", "joined"), ("Can", "joined")]

    last = state["messages"][-1]["id"]
    sent = client.post(f"/me/live-rooms/{room['id']}/messages", headers=can, json={"content": "<b>Selam</b>, ben de geldim"})
    assert sent.status_code == 201 and sent.json()["content"] == "Selam, ben de geldim"
    client.put(f"/me/live-rooms/{room['id']}/status", headers=ayse, json={"status_text": "Fizik, 3. ünite"})

    update = client.get(f"/me/live-rooms/{room['id']}", headers=ayse, params={"after": last}).json()
    assert [m["content"] for m in update["messages"]] == ["Selam, ben de geldim"]
    assert next(p for p in update["participants"] if p["user_id"] == ayse_id)["status_text"] == "Fizik, 3. ünite"

    listed = client.get("/me/live-rooms", headers=can).json()
    assert listed[0]["id"] == room["id"] and listed[0]["present_count"] == 2

    # Ayrılan kişi listede kalır ama "odada" görünmez; tekrar açınca yine "katıldı" yazar.
    assert client.post(f"/me/live-rooms/{room['id']}/leave", headers=can).status_code == 204
    state = client.get(f"/me/live-rooms/{room['id']}", headers=ayse).json()
    assert not next(p for p in state["participants"] if p["user_id"] == can_id)["present"]
    assert state["messages"][-1]["kind"] == "left"
    back = client.get(f"/me/live-rooms/{room['id']}", headers=can).json()
    assert back["messages"][-1]["kind"] == "joined"


def test_outsiders_cannot_read_and_owner_can_remove_and_close() -> None:
    client = _client()
    owner, _ = _user(client, "Kurucu")
    guest, guest_id = _user(client, "Misafir")
    stranger, _ = _user(client, "Yabancı")
    room = client.post("/me/live-rooms", headers=owner, json={"title": "Gece okuması"}).json()
    client.post("/me/live-rooms/join", headers=guest, json={"invite_code": room["invite_code"]})

    assert client.get(f"/me/live-rooms/{room['id']}", headers=stranger).status_code == 403
    assert client.post(f"/me/live-rooms/{room['id']}/messages", headers=stranger, json={"content": "merhaba"}).status_code == 403
    assert client.get(f"/me/live-rooms/{uuid4()}", headers=stranger).status_code == 404
    assert client.post("/me/live-rooms/join", headers=stranger, json={"invite_code": "YANLISKOD"}).status_code == 404

    # Misafir kimseyi çıkaramaz, kurucu çıkarabilir; çıkarılan geri dönemez.
    owner_id = client.get("/auth/me", headers=owner).json()["id"]
    assert client.delete(f"/me/live-rooms/{room['id']}/members/{owner_id}", headers=guest).status_code == 403
    assert client.delete(f"/me/live-rooms/{room['id']}/members/{guest_id}", headers=owner).status_code == 204
    assert client.get(f"/me/live-rooms/{room['id']}", headers=guest).status_code == 403
    assert client.post("/me/live-rooms/join", headers=guest, json={"invite_code": room["invite_code"]}).status_code == 403
    state = client.get(f"/me/live-rooms/{room['id']}", headers=owner).json()
    assert [p["display_name"] for p in state["participants"]] == ["Kurucu"]
    assert state["messages"][-1]["kind"] == "removed"

    assert client.post(f"/me/live-rooms/{room['id']}/close", headers=owner).status_code == 204
    assert client.get(f"/me/live-rooms/{room['id']}", headers=owner).json()["room"]["closed"] is True
    assert client.post(f"/me/live-rooms/{room['id']}/messages", headers=owner, json={"content": "son"}).status_code == 403
    assert client.post("/me/live-rooms/join", headers=stranger, json={"invite_code": room["invite_code"]}).status_code == 404
    assert all(item["id"] != room["id"] for item in client.get("/me/live-rooms", headers=owner).json())


def test_validation_rejects_empty_and_html_only_input() -> None:
    client = _client()
    owner, _ = _user(client, "Doğrulama")
    assert client.post("/me/live-rooms", headers=owner, json={"title": "a"}).status_code == 422
    assert client.post("/me/live-rooms", headers=owner, json={"title": "Oda", "purpose": "party"}).status_code == 422
    room = client.post("/me/live-rooms", headers=owner, json={"title": "Oda"}).json()
    assert client.post(f"/me/live-rooms/{room['id']}/messages", headers=owner, json={"content": "x" * 501}).status_code == 422
    assert client.put(f"/me/live-rooms/{room['id']}/status", headers=owner, json={"status_text": ""}).json() == {"status_text": None}


def test_presence_rules() -> None:
    now = now_utc()
    assert is_present(iso(now - timedelta(seconds=PRESENT_SECONDS - 1)), now)
    assert not is_present(iso(now - timedelta(seconds=PRESENT_SECONDS + 1)), now)
    assert not is_present(None, now)
    assert normalize_invite_code("ab-cd 12ef") == "ABCD12EF"
    people = [{"present": False, "role": "member", "display_name": "Ali"},
              {"present": True, "role": "member", "display_name": "Zeynep"},
              {"present": True, "role": "owner", "display_name": "Mert"}]
    assert [p["display_name"] for p in sort_participants(people)] == ["Mert", "Zeynep", "Ali"]


def test_supabase_state_marks_arrival_and_uses_service_role() -> None:
    import httpx
    from app.supabase_repository import SupabaseRepository

    room_id, user_id = str(uuid4()), str(uuid4())
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["apikey"] == "secret"
        path, method = request.url.path, request.method
        calls.append((method, path))
        if path == "/rest/v1/live_rooms":
            return httpx.Response(200, json=[{"id": room_id, "owner_id": user_id, "title": "Oda", "purpose": "reading",
                                              "invite_code": "ABCDEFGH", "created_at": iso(), "closed_at": None}])
        if path == "/rest/v1/live_room_members" and method == "GET":
            return httpx.Response(200, json=[{"room_id": room_id, "user_id": user_id, "role": "owner", "status_text": None,
                                              "last_seen_at": None, "removed_at": None}])
        if path == "/rest/v1/live_room_messages" and method == "POST":
            return httpx.Response(201, json=[{"id": 1, "user_id": user_id, "kind": "joined", "content": "odaya katıldı",
                                              "created_at": iso()}])
        if path == "/rest/v1/live_room_messages":
            return httpx.Response(200, json=[{"id": 1, "user_id": user_id, "kind": "joined", "content": "odaya katıldı",
                                              "created_at": iso()}])
        if path == "/rest/v1/profiles":
            return httpx.Response(200, json=[{"id": user_id, "display_name": "Elif"}])
        return httpx.Response(204)

    repository = SupabaseRepository("https://project.supabase.co", "publishable", "secret")
    repository.client.close()
    repository.client = httpx.Client(transport=httpx.MockTransport(handler))
    state = repository.live_room_state(user_id, room_id)
    assert ("POST", "/rest/v1/live_room_messages") in calls  # gelişi sohbete yazıldı
    assert ("PATCH", "/rest/v1/live_room_members") in calls  # "buradayım" işareti
    assert state["participants"][0]["display_name"] == "Elif"
    assert state["messages"][0]["kind"] == "joined"

from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import Repository
from app.main import app, repository as app_repository


ROOT = Path(__file__).parents[1]


def test_beta_repository_tracks_activation_and_feedback(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "beta.db")
    user = repository.create_user("Beta Okuru")
    repository.track_product_event(user["id"], "session_started", {"source": "test"})
    repository.track_product_event(user["id"], "view_opened", {"view": "discover"})
    feedback = repository.create_beta_feedback(
        user["id"], "usability", 9, "Kitap ekleme akışı anlaşılır.", {"view": "settings"}
    )

    assert feedback["status"] == "new"
    assert repository.list_beta_feedback(user["id"])[0]["rating"] == 9
    dashboard = repository.beta_dashboard(30)
    assert dashboard["active_users"] == 1
    assert dashboard["feedback_count"] == 1
    assert dashboard["average_rating"] == 9
    assert dashboard["events"]["feedback_submitted"] == 1


def test_authenticated_beta_feedback_flow() -> None:
    client = TestClient(app)
    registered = client.post("/auth/register", json={
        "display_name": "Beta HTTP",
        "email": f"beta-{uuid4()}@example.com",
        "password": "guvenli-parola",
    })
    assert registered.status_code == 201
    event = client.post("/me/product-events", json={
        "event_name": "view_opened", "properties": {"view": "settings"},
    })
    assert event.status_code == 201
    feedback = client.post("/me/beta-feedback", json={
        "category": "idea", "rating": 8,
        "message": "Haftalık özet ekranını daha görünür yapabiliriz.",
        "context": {"view": "settings"},
    })
    assert feedback.status_code == 201
    mine = client.get("/me/beta-feedback")
    assert mine.status_code == 200
    assert mine.json()[0]["category"] == "idea"


def test_beta_payload_rejects_unknown_event_and_short_feedback() -> None:
    client = TestClient(app)
    registered = client.post("/auth/register", json={
        "display_name": "Beta Validation",
        "email": f"beta-validation-{uuid4()}@example.com",
        "password": "guvenli-parola",
    })
    assert registered.status_code == 201
    assert client.post("/me/product-events", json={"event_name": "email", "properties": {}}).status_code == 422
    assert client.post("/me/beta-feedback", json={
        "category": "bug", "message": "x", "context": {},
    }).status_code == 422


def test_editor_can_read_beta_dashboard() -> None:
    client = TestClient(app)
    registered = client.post("/auth/register", json={
        "display_name": "Beta Editor",
        "email": f"beta-editor-{uuid4()}@example.com",
        "password": "guvenli-parola",
    })
    assert registered.status_code == 201
    user_id = client.get("/auth/me").json()["id"]
    app_repository.set_user_role(user_id, "editor")
    response = client.get("/admin/beta-dashboard?days=30")
    assert response.status_code == 200
    assert {"active_users", "onboarding_completed", "feedback_count", "average_rating", "events", "recent_feedback"} <= response.json().keys()

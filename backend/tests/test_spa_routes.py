"""Yeni React arayüzünün sunucu tarafı rotaları ve onun kullandığı API eklemeleri."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.routers.platform import CLASSIC_VIEW_ROUTES, SPA_ROUTES

client = TestClient(app)


def test_spa_routes_and_classic_interface_are_served_as_html() -> None:
    for path in ("/", *(f"/{route}" for route in SPA_ROUTES)):
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.headers["content-type"].startswith("text/html")


def test_classic_links_redirect_to_their_new_screens() -> None:
    assert client.get("/classic", follow_redirects=False).headers["location"] == "/"
    for view, target in CLASSIC_VIEW_ROUTES.items():
        response = client.get(f"/classic?view={view}", follow_redirects=False)
        assert response.status_code == 308
        assert response.headers["location"] == target
        assert target.split("?")[0].strip("/") in SPA_ROUTES


def test_spa_route_list_matches_frontend_routes() -> None:
    from pathlib import Path
    import re

    routes_ts = (Path(__file__).resolve().parents[2] / "frontend/src/spa/routes.ts").read_text(encoding="utf-8")
    routes_block = routes_ts.split("export const routes", 1)[1].split("} as const", 1)[0]
    frontend = set(re.findall(r":\s*'/([a-z]+)'", routes_block))
    assert frontend == set(SPA_ROUTES)


def test_library_entry_can_be_removed_and_recommendations_carry_book_ids() -> None:
    client.post("/auth/register", json={"display_name": "Raf", "email": f"raf-{uuid4()}@example.com", "password": "guvenli-parola"})
    assert client.put("/me/library", json={"book_id": "frankenstein", "shelf": "to_read"}).status_code == 200
    assert any(book["id"] == "frankenstein" for book in client.get("/me/profile").json()["to_read_books"])

    assert client.delete("/me/library/frankenstein").status_code == 204
    assert not any(book["id"] == "frankenstein" for book in client.get("/me/profile").json()["to_read_books"])

    response = client.post("/me/recommendations", json={"character_description": "Gizemli ve analitik bir hikâye", "limit": 3})
    assert response.status_code == 200
    assert all(book["book_id"] for book in response.json()["recommended_books"])


def test_removing_from_library_requires_a_session() -> None:
    anonymous = TestClient(app)
    assert anonymous.delete("/me/library/frankenstein").status_code == 401

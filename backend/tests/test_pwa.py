"""Mihenk'in PWA olarak kurulabilmesi: kök servis çalışanı ve manifest."""
import json

from fastapi.testclient import TestClient

from app.runtime import STATIC_DIR


def test_service_worker_is_served_from_the_root_scope() -> None:
    from app.main import app

    response = TestClient(app).get("/service-worker.js")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/javascript")
    assert response.headers["service-worker-allowed"] == "/"
    assert "no-cache" in response.headers["cache-control"]
    assert "CLEAR_PRIVATE_CACHE" in response.text


def test_manifest_is_installable() -> None:
    manifest = json.loads((STATIC_DIR / "manifest.webmanifest").read_text(encoding="utf-8"))
    assert manifest["display"] == "standalone" and manifest["start_url"].startswith("/")
    purposes = {icon["purpose"] for icon in manifest["icons"]}
    assert {"any", "maskable"} <= purposes
    for icon in manifest["icons"]:
        assert (STATIC_DIR / icon["src"].removeprefix("/static/")).is_file(), icon["src"]
    assert all(shortcut["url"].startswith("/") for shortcut in manifest["shortcuts"])

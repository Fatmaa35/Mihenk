from pathlib import Path

from fastapi.testclient import TestClient

from app.database import Repository
from app.services.recommendation_evaluation import evaluate_ranking
from app.services.security import RatePolicy, SlidingWindowRateLimiter


def test_rate_limiter_enforces_policy_per_identity() -> None:
    limiter = SlidingWindowRateLimiter()
    policy = RatePolicy(requests=2, window_seconds=60)
    assert limiter.check("llm", "reader", policy)[0]
    assert limiter.check("llm", "reader", policy)[0]
    allowed, remaining, retry_after = limiter.check("llm", "reader", policy)
    assert not allowed
    assert remaining == 0
    assert retry_after > 0
    assert limiter.check("llm", "another-reader", policy)[0]


def test_private_lan_same_origin_write_is_allowed_but_cross_origin_is_rejected() -> None:
    from app.main import app

    client = TestClient(app, base_url="http://192.168.1.104:8010")
    payload = {"email": "missing@example.com", "password": "yanlis-parola"}
    same_origin = client.post(
        "/auth/login", json=payload, headers={"Origin": "http://192.168.1.104:8010"}
    )
    assert same_origin.status_code != 403
    cross_origin = client.post(
        "/auth/login", json=payload, headers={"Origin": "https://evil.example"}
    )
    assert cross_origin.status_code == 403
    assert cross_origin.json()["detail"] == "Geçersiz istek kaynağı."


def test_semantic_evaluation_penalizes_explicitly_irrelevant_result() -> None:
    case = {"ideal_titles": ["Kızıl Dosya"], "irrelevant_titles": ["Suç ve Ceza"], "minimum_ndcg": .5}
    books = {
        "Kızıl Dosya": {"title": "Kızıl Dosya", "author": "Doyle", "publication_type": "fiction", "themes": []},
        "Suç ve Ceza": {"title": "Suç ve Ceza", "author": "Dostoyevski", "publication_type": "fiction", "themes": []},
    }
    good = evaluate_ranking(case, ["Kızıl Dosya"], books)
    bad = evaluate_ranking(case, ["Suç ve Ceza"], books)
    assert good["ndcg_at_10"] == 1
    assert good["passed"]
    assert not bad["passed"]
    assert bad["constraint_violations"] == ["Suç ve Ceza:explicitly_irrelevant"]


def test_catalog_job_retry_and_dead_letter(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "jobs.db")
    user = repository.create_user("Editör")
    job = repository.create_catalog_job("quality_scan", {"limit": 20}, user["id"])
    for attempt in range(3):
        claimed = repository.claim_catalog_job()
        assert claimed and claimed["id"] == job["id"]
        repository.finish_catalog_job(job["id"], False, "geçici hata")
        status = repository.list_catalog_jobs()[0]["status"]
        assert status == ("dead_letter" if attempt == 2 else "pending")
    assert repository.claim_catalog_job() is None


def test_admin_endpoints_require_role_and_expose_evaluation() -> None:
    from app.main import app, repository

    client = TestClient(app)
    email = "rbac-editor@example.com"
    response = client.post("/auth/register", json={"display_name": "Editör", "email": email, "password": "guvenli-parola"})
    if response.status_code == 409:
        response = client.post("/auth/login", json={"email": email, "password": "guvenli-parola"})
    assert response.status_code in (200, 201)
    user_id = client.get("/auth/me").json()["id"]
    repository.set_user_role(user_id, "user")
    assert client.get("/admin/quality").status_code == 403
    repository.set_user_role(user_id, "editor")
    assert client.get("/auth/me").json()["app_role"] == "editor"
    report = client.post("/admin/evaluations/recommendations", json={})
    assert report.status_code == 200
    assert report.json()["summary"]["cases"] >= 10
    assert "ndcg_at_10" in report.json()["summary"]
    job = client.post("/admin/catalog/jobs", json={"job_type": "quality_scan", "limit": 100})
    assert job.status_code == 202


def test_catalog_edit_is_audited(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "catalog-admin.db")
    repository.seed_books(Path(__file__).resolve().parents[1] / "data" / "books.json")
    user = repository.create_user("Admin")
    before, after = repository.admin_update_book("sherlock-holmes-kizil-dosya", {"narrative_pace": "fast"})
    repository.audit(user["id"], "catalog.book.update", "book", after["id"], before, after)
    assert before["id"] == after["id"]
    assert after["narrative_pace"] == "fast"
    with repository.connect() as connection:
        assert connection.execute("SELECT count(*) n FROM audit_log").fetchone()["n"] == 1

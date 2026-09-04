"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary

router = APIRouter()

@router.get("/admin/metrics")
def admin_metrics(request: Request, response: Response) -> dict:
    require_role(request, response, "admin")
    quality = repository.quality_dashboard()
    snapshot = metrics.snapshot()
    login = snapshot.get("routes", {}).get("/auth/login", {})
    business = snapshot.get("business", {})
    alerts = []
    if business.get("login_failure_rate", 0) >= .35 and login.get("requests", 0) >= 10:
        alerts.append({"severity": "warning", "code": "login_failure_spike", "message": "Giriş başarısızlık oranı %35 eşiğini aştı."})
    if login.get("p95_ms", 0) >= 1500:
        alerts.append({"severity": "warning", "code": "login_p95_high", "message": "Giriş P95 süresi 1500 ms eşiğini aştı."})
    if business.get("supabase_errors", 0) >= 5:
        alerts.append({"severity": "critical", "code": "supabase_error_spike", "message": "Supabase hata sayısı alarm eşiğini aştı."})
    if business.get("suspicious_login_attempts", 0) >= 10:
        alerts.append({"severity": "critical", "code": "suspicious_login_spike", "message": "Şüpheli giriş denemeleri alarm eşiğini aştı."})
    return {**snapshot, "alerts": alerts, "product": {
        "zero_result_queries": quality.get("zero_result_queries", 0),
        "gemma_fallback_rate": quality.get("fallback_rate", 0),
        "catalog_books": len(catalog),
    }}


@router.get("/me/feature-flags")
def my_feature_flags(request: Request, response: Response) -> list[dict]:
    session = current_session(request, response)
    return repository.list_feature_flags(session["access_token"])


@router.put("/admin/feature-flags/{key}")
def admin_feature_flag(key: str, payload: FeatureFlagUpsert, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    if not key.replace("_", "").replace("-", "").isalnum() or len(key) > 80:
        raise HTTPException(status_code=400, detail="Geçersiz feature flag anahtarı.")
    result = repository.upsert_feature_flag(key, **payload.model_dump(), access_token=session["access_token"])
    repository.audit(session["user"]["id"], "feature_flag.upsert", "feature_flag", key,
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result

@router.get("/admin/quality")
def admin_quality(request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    return repository.quality_dashboard(session["access_token"])


@router.get("/admin/catalog/issues")
def admin_catalog_issues(request: Request, response: Response,
                         status: str = Query(default="open", pattern="^(open|resolved|dismissed)$"),
                         limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "editor", "admin")
    return repository.admin_catalog_issues(status, limit, session["access_token"])


@router.patch("/admin/catalog/issues/{issue_id}")
def admin_resolve_issue(issue_id: str, payload: ReviewResolution, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    result = repository.resolve_catalog_issue(issue_id, payload.status, session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], f"catalog.issue.{payload.status}", "catalog_review", issue_id,
                     after=result, request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return result


@router.patch("/admin/catalog/books/{book_id}")
def admin_update_book(book_id: str, payload: AdminBookPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    try:
        before, after = repository.admin_update_book(book_id, payload.model_dump(exclude_unset=True), session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
    repository.audit(session["user"]["id"], "catalog.book.update", "book", book_id, before, after,
                     request.headers.get("x-request-id"), session["access_token"])
    refresh_catalog_state()
    return after


@router.post("/admin/catalog/merge")
def admin_merge_books(payload: CatalogMergeRequest, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    try:
        result = repository.merge_catalog_books(payload.source_book_id, payload.target_book_id, session["access_token"])
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error.args[0] if error.args else error)) from error
    repository.audit(session["user"]["id"], "catalog.book.merge", "book", payload.target_book_id,
                     before={"source": payload.source_book_id}, after=result,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    refresh_catalog_state()
    return result


@router.get("/admin/catalog/jobs")
def admin_catalog_jobs(request: Request, response: Response) -> list[dict]:
    session = require_role(request, response, "editor", "admin")
    return repository.list_catalog_jobs(100, session["access_token"])


@router.post("/admin/catalog/jobs", status_code=202)
def admin_create_catalog_job(payload: CatalogJobCreate, request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    job = repository.create_catalog_job(payload.job_type, {"query": payload.query, "limit": payload.limit},
                                        session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], "catalog.job.create", "catalog_job", job["id"], after=job,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return job


@router.post("/admin/evaluations/recommendations")
def admin_run_recommendation_evaluation(request: Request, response: Response) -> dict:
    session = require_role(request, response, "editor", "admin")
    report = run_evaluation(ROOT / "data" / "recommendation_eval_cases.json", recommender, catalog)
    repository.audit(session["user"]["id"], "evaluation.recommendations.run", "evaluation", str(uuid4()),
                     after=report["summary"], request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return report


@router.put("/admin/users/{user_id}/role")
def admin_update_user_role(user_id: str, payload: UserRoleUpdate, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.set_user_role(user_id, payload.role, session["access_token"])
    repository.audit(session["user"]["id"], "user.role.update", "user", user_id, after=result,
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    return result


@router.get("/admin/dashboard")
def admin_dashboard(request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    return repository.admin_dashboard(session["access_token"])


@router.get("/admin/logs")
def admin_logs(request: Request, response: Response, level: str | None = Query(default=None, pattern="^(info|warning|error)$"),
               limit: int = Query(default=200, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    persisted = repository.admin_system_logs(limit, level, session["access_token"])
    return [*recent_events.snapshot(limit, level), *persisted][:limit]


@router.get("/admin/pipelines/runs")
def admin_pipeline_runs(request: Request, response: Response,
                        limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.list_pipeline_runs(limit, session["access_token"])


@router.get("/admin/pipelines/logs")
def admin_pipeline_logs(request: Request, response: Response, run_id: str | None = None,
                        limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.list_pipeline_logs(limit, run_id, session["access_token"])


@router.post("/admin/pipelines/prices", status_code=202)
def admin_trigger_price_pipeline(payload: PricePipelineTrigger, background_tasks: BackgroundTasks,
                                 request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    background_tasks.add_task(
        run_full_price_pipeline, repository, idempotency_key=payload.idempotency_key,
        orchestrator="admin", trigger_kind="manual", limit=payload.limit,
        retailer_ids=payload.retailers, discover_books=payload.discover_books,
        refresh_existing=payload.refresh_existing,
    )
    repository.audit(session["user"]["id"], "pipeline.price.trigger", "pipeline", payload.idempotency_key,
                     after=payload.model_dump(), request_id=request.state.request_id,
                     access_token=session["access_token"])
    return {"accepted": True, "idempotency_key": payload.idempotency_key}


@router.post("/internal/pipelines/prices", status_code=202)
def n8n_trigger_price_pipeline(payload: PricePipelineTrigger, background_tasks: BackgroundTasks,
                               request: Request) -> dict:
    configured = settings.pipeline_webhook_secret
    supplied = request.headers.get("x-pipeline-key", "")
    if not configured:
        raise HTTPException(status_code=503, detail="Pipeline webhook anahtarı yapılandırılmamış.")
    if not secrets.compare_digest(supplied, configured):
        raise HTTPException(status_code=401, detail="Pipeline anahtarı geçersiz.")
    background_tasks.add_task(
        run_full_price_pipeline, repository, idempotency_key=payload.idempotency_key,
        orchestrator="n8n", trigger_kind="scheduled", limit=payload.limit,
        retailer_ids=payload.retailers, discover_books=payload.discover_books,
        refresh_existing=payload.refresh_existing,
    )
    return {"accepted": True, "idempotency_key": payload.idempotency_key}


@router.get("/admin/users")
def admin_users(request: Request, response: Response, q: str | None = Query(default=None, max_length=100),
                limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.admin_users(q, limit, session["access_token"])


@router.patch("/admin/users/{user_id}/verification")
def admin_verify_user(user_id: str, payload: AdminUserVerificationPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.admin_set_verification(user_id, payload.verified, payload.label, session["user"]["id"], session["access_token"])
    repository.audit(session["user"]["id"], "user.verification.update", "user", user_id, after=result,
                     request_id=request.state.request_id, access_token=session["access_token"])
    return result


@router.patch("/admin/users/{user_id}/ban")
def admin_ban_user(user_id: str, payload: AdminUserBanPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    try:
        result = repository.admin_set_ban(user_id, payload.banned, payload.reason, payload.duration_days,
                                          session["user"]["id"], session["access_token"])
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    repository.audit(session["user"]["id"], "user.ban" if payload.banned else "user.unban", "user", user_id,
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result


@router.patch("/admin/comments/{comment_id}/moderation")
def admin_moderate_comment(comment_id: str, payload: AdminCommentModerationPatch, request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.moderate_comment(comment_id, payload.status, session["access_token"])
    repository.audit(session["user"]["id"], "comment.moderate", "book_comment", comment_id, after=result,
                     request_id=request.state.request_id, access_token=session["access_token"])
    return result


@router.get("/admin/community/reports")
def admin_community_reports(request: Request, response: Response,
                            status: str | None = Query(default=None, pattern="^(open|reviewing|resolved|dismissed)$"),
                            limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    session = require_role(request, response, "admin")
    return repository.admin_comment_reports(status, limit, session["access_token"])


@router.patch("/admin/community/reports/{report_id}")
def admin_resolve_report(report_id: int, payload: AdminReportResolutionPatch,
                         request: Request, response: Response) -> dict:
    session = require_role(request, response, "admin")
    result = repository.resolve_comment_report(
        report_id, payload.status, session["user"]["id"], payload.comment_status,
        session["access_token"],
    )
    repository.audit(session["user"]["id"], "comment_report.resolve", "comment_report", str(report_id),
                     after=result, request_id=request.state.request_id, access_token=session["access_token"])
    return result

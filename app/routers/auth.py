"""Feature-scoped HTTP routes extracted from the application composition root."""
from fastapi import APIRouter
from app.runtime import *  # noqa: F403 - explicit shared runtime boundary
from app.supabase_repository import SupabaseRequestError
from app.services.security import EmailSendGuard

router = APIRouter()
email_guard = EmailSendGuard(settings.redis_url, settings.redis_key_prefix)


def guard_auth_email(email: str) -> None:
    if not settings.rate_limit_enabled:
        return
    try:
        allowed, _, retry = email_guard.check(email)
    except Exception as error:
        raise HTTPException(status_code=503, detail="E-posta hizmeti geçici olarak kullanılamıyor.") from error
    if not allowed:
        raise HTTPException(status_code=429, detail="E-posta istek sınırına ulaşıldı. Lütfen daha sonra deneyin.",
                            headers={"Retry-After": str(retry)})


def public_account(user: dict) -> dict:
    return {key: value for key, value in user.items() if key in {
        "id", "display_name", "email", "created_at", "app_role", "is_verified", "verification_label",
    }}


@router.post("/users", status_code=201)
def create_user(payload: UserCreate) -> dict:
    """Compatibility endpoint for the pre-auth local user flow."""
    if settings.app_environment not in {"development", "test"} or settings.data_backend != "sqlite":
        raise HTTPException(status_code=404, detail="Bulunamadı.")
    return repository.create_user(payload.display_name)


@router.get("/users/{user_id}/profile")
def user_profile(user_id: str, request: Request, response: Response) -> dict:
    session = current_session(request, response)
    if session["user"]["id"] != user_id:
        raise HTTPException(status_code=403, detail="Başka bir kullanıcının profili görüntülenemez.")
    try:
        return repository.user_profile(user_id, access_token=session["access_token"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error
@router.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, response: Response) -> dict:
    if not settings.allow_registration:
        raise HTTPException(status_code=403, detail="Yeni kayıtlar şu anda davetle açılıyor.")
    guard_auth_email(payload.email)
    try:
        session = repository.open_registration_session(payload.display_name, payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if session.get("access_token"):
        set_session_cookies(response, session)
    return {
        **public_account(session["user"]),
        "email_confirmation_required": session.get("email_confirmation_required", False),
    }


@router.post("/auth/login")
def login(payload: LoginRequest, response: Response) -> dict:
    try:
        session = repository.open_login_session(payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except SupabaseRequestError as error:
        if error.status_code in {400, 401, 422}:
            raise HTTPException(status_code=401, detail="E-posta veya parola hatalı.") from error
        raise
    set_session_cookies(response, session)
    return public_account(session["user"])


@router.post("/auth/password/forgot", status_code=202)
def forgot_password(payload: PasswordRecoveryRequest) -> dict:
    guard_auth_email(payload.email)
    repository.request_password_reset(payload.email, settings.recovery_redirect_url)
    return {"message": "Hesap mevcutsa parola sıfırlama bağlantısı e-posta adresine gönderildi."}


@router.post("/auth/password/reset")
def reset_password(payload: PasswordResetRequest) -> dict:
    try:
        repository.reset_password(payload.recovery_token, payload.new_password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"message": "Parolan güncellendi. Yeni parolanla giriş yapabilirsin."}


@router.post("/auth/confirmation/resend", status_code=202)
def resend_confirmation(payload: ConfirmationResendRequest) -> dict:
    guard_auth_email(payload.email)
    repository.resend_confirmation(payload.email)
    return {"message": "Hesap mevcutsa doğrulama e-postası yeniden gönderildi."}


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response) -> Response:
    repository.close_session(
        request.cookies.get(ACCESS_COOKIE),
        request.cookies.get(REFRESH_COOKIE),
    )
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    response.status_code = 204
    return response


@router.get("/auth/me")
def auth_me(request: Request, response: Response) -> dict:
    return public_account(current_session(request, response)["user"])


@router.get("/me/bootstrap")
def bootstrap_me(request: Request, response: Response) -> dict:
    """Resolve auth once and return only the data required to paint the app shell."""
    session = current_session(request, response)
    user_id, token = session["user"]["id"], session["access_token"]
    return {
        "user": public_account(session["user"]),
        "profile": repository.user_profile(user_id, token),
        "preferences": repository.user_preferences(user_id, token),
        "gamification": repository.gamification_summary(user_id, token),
        "notifications": repository.list_notifications(user_id, token),
    }


@router.delete("/me/account", status_code=204)
def delete_my_account(request: Request, response: Response) -> Response:
    session = current_session(request, response)
    repository.audit(session["user"]["id"], "account.delete", "user", session["user"]["id"],
                     request_id=request.headers.get("x-request-id"), access_token=session["access_token"])
    repository.delete_user_account(session["user"]["id"], session["access_token"])
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)
    response.status_code = 204
    return response


@router.get("/me/data-export")
def export_my_data(request: Request, response: Response) -> Response:
    session = current_session(request, response)
    payload = repository.export_user_data(
        session["user"]["id"], session["access_token"]
    )
    body = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    response.body = body.encode("utf-8")
    response.media_type = "application/json"
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    response.headers["Content-Disposition"] = "attachment; filename=mihenk-verilerim.json"
    return response


@router.get("/me/profile")
def my_profile(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.user_profile(session["user"]["id"], access_token=session["access_token"])


@router.get("/me/preferences")
def my_preferences(request: Request, response: Response) -> dict:
    session = current_session(request, response)
    return repository.user_preferences(
        session["user"]["id"], access_token=session["access_token"]
    )


@router.put("/me/preferences")
def update_my_preferences(
    payload: UserPreferencesUpsert, request: Request, response: Response
) -> dict:
    session = current_session(request, response)
    try:
        return repository.upsert_user_preferences(
            session["user"]["id"],
            **payload.model_dump(),
            access_token=session["access_token"],
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail=error.args[0]) from error

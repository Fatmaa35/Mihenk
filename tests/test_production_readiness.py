from pathlib import Path

from scripts.production_readiness import check_environment, check_repository


ROOT = Path(__file__).parents[1]


def test_repository_has_production_release_controls() -> None:
    assert check_repository(ROOT) == []


def test_placeholder_production_environment_fails_closed(tmp_path: Path) -> None:
    env = tmp_path / ".env.production"
    env.write_text("APP_ENVIRONMENT=development\nSUPABASE_SECRET_KEY=replace-me\n", encoding="utf-8")
    errors = check_environment(env)
    assert any("APP_ENVIRONMENT=production" in item for item in errors)
    assert any("SUPABASE_SECRET_KEY" in item for item in errors)


def test_complete_environment_passes(tmp_path: Path) -> None:
    env = tmp_path / ".env.production"
    env.write_text(
        "\n".join([
            "APP_ENVIRONMENT=production", "DATA_BACKEND=supabase", "COOKIE_SECURE=true",
            "RATE_LIMIT_ENABLED=true", "ALLOW_REGISTRATION=false",
            "SUPABASE_URL=https://project.supabase.co",
            "SUPABASE_PUBLISHABLE_KEY=" + "sb_publishable_" + "a" * 26,
            "SUPABASE_SECRET_KEY=" + "sb_secret_" + "b" * 26,
            "SUPABASE_JWKS_URL=https://project.supabase.co/auth/v1/.well-known/jwks.json",
            "RECOVERY_REDIRECT_URL=https://mihenk.test/", "ALLOWED_ORIGINS=https://mihenk.test",
            "REDIS_URL=redis://redis:6379/0", "PIPELINE_WEBHOOK_SECRET=" + "x" * 48,
            "LEGAL_ENTITY_NAME=Mihenk", "PRIVACY_CONTACT_EMAIL=privacy@mihenk.test",
            "APP_DOMAIN=mihenk.test", "SECRETS_ROTATED_AT=2026-09-04", "REMINDER_PROVIDER=none",
        ]), encoding="utf-8",
    )
    assert check_environment(env) == []

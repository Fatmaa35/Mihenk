"""Fail-fast production configuration and repository security checks."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urlparse

from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[1]
PLACEHOLDERS = {"", "replace-me", "changeme", "todo", "example"}
REQUIRED = (
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_JWKS_URL",
    "RECOVERY_REDIRECT_URL", "ALLOWED_ORIGINS", "REDIS_URL", "PIPELINE_WEBHOOK_SECRET",
    "LEGAL_ENTITY_NAME", "PRIVACY_CONTACT_EMAIL", "APP_DOMAIN", "SECRETS_ROTATED_AT",
)


def is_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    return lowered in PLACEHOLDERS or "example.com" in lowered or "project_ref" in lowered


def check_environment(path: Path) -> list[str]:
    values = {key: str(value or "").strip() for key, value in dotenv_values(path).items()}
    errors: list[str] = []
    for key in REQUIRED:
        if is_placeholder(values.get(key, "")):
            errors.append(f"{key} gerçek bir production değeri olmalı")
    expected = {
        "APP_ENVIRONMENT": "production", "DATA_BACKEND": "supabase", "COOKIE_SECURE": "true",
        "RATE_LIMIT_ENABLED": "true", "ALLOW_REGISTRATION": "false",
    }
    for key, expected_value in expected.items():
        if values.get(key, "").lower() != expected_value:
            errors.append(f"{key}={expected_value} olmalı")
    for key in ("SUPABASE_URL", "SUPABASE_JWKS_URL", "RECOVERY_REDIRECT_URL"):
        value = values.get(key, "")
        if value and urlparse(value).scheme != "https":
            errors.append(f"{key} HTTPS kullanmalı")
    origins = [item.strip() for item in values.get("ALLOWED_ORIGINS", "").split(",") if item.strip()]
    if not origins or any(urlparse(item).scheme != "https" for item in origins):
        errors.append("ALLOWED_ORIGINS yalnızca gerçek HTTPS originleri içermeli")
    if len(values.get("PIPELINE_WEBHOOK_SECRET", "")) < 32:
        errors.append("PIPELINE_WEBHOOK_SECRET en az 32 karakter olmalı")
    if values.get("SUPABASE_SECRET_KEY", "") == values.get("SUPABASE_PUBLISHABLE_KEY", ""):
        errors.append("Supabase publishable ve secret anahtarları aynı olamaz")
    reminder = values.get("REMINDER_PROVIDER", "none")
    if reminder in {"smtp", "multi"}:
        for key in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"):
            if is_placeholder(values.get(key, "")):
                errors.append(f"{key}, {reminder} bildirim sağlayıcısı için zorunlu")
    if reminder in {"webpush", "multi"}:
        for key in ("WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT"):
            if is_placeholder(values.get(key, "")):
                errors.append(f"{key}, {reminder} bildirim sağlayıcısı için zorunlu")
    return errors


def check_repository(root: Path) -> list[str]:
    errors: list[str] = []
    required_paths = (
        root / "supabase" / "config.toml", root / "supabase" / "tests" / "core_rls_test.sql",
        root / "compose.production.yml", root / "Caddyfile", root / "requirements.lock.txt",
        root / "frontend" / "package-lock.json",
    )
    for path in required_paths:
        if not path.exists():
            errors.append(f"Eksik production dosyası: {path.relative_to(root)}")
    tracked_text = []
    for folder in (root / "app", root / "frontend", root / "database", root / "docs"):
        for path in folder.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".py", ".js", ".ts", ".tsx", ".sql", ".md"}:
                tracked_text.append(path.read_text(encoding="utf-8", errors="ignore"))
    combined = "\n".join(tracked_text)
    secret_patterns = (
        r"sb_secret_[A-Za-z0-9_-]{20,}",
        r"AIza[0-9A-Za-z_-]{30,}",
        r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----",
    )
    for pattern in secret_patterns:
        if re.search(pattern, combined):
            errors.append(f"Kaynak dosyalarda olası secret bulundu: {pattern.split('[')[0]}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Mihenk production release ön kontrolü")
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env.production")
    parser.add_argument("--repository-only", action="store_true")
    args = parser.parse_args()
    errors = check_repository(ROOT)
    if not args.repository_only:
        if not args.env_file.exists():
            errors.append(f"Environment dosyası bulunamadı: {args.env_file}")
        else:
            errors.extend(check_environment(args.env_file))
    if errors:
        print("Production preflight BAŞARISIZ:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Production preflight başarılı; secret değerleri çıktıya yazılmadı.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Politika kontrolünden geçmiş dinamik sayfaları Playwright ile render eder."""

from __future__ import annotations

import os
from pathlib import Path


BROWSER_PATH = Path(__file__).resolve().parents[2] / "data" / "ms-playwright"


class DynamicBrowserUnavailable(RuntimeError):
    pass


def render_dynamic_html(url: str, user_agent: str, wait_ms: int = 3500) -> str:
    """Stealth/CAPTCHA aşma uygulamadan, görünür DOM tamamlandıktan sonra HTML döndürür."""
    try:
        os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(BROWSER_PATH))
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise DynamicBrowserUnavailable("Playwright kurulu değil; dinamik mağaza fallback'i çalıştırılamadı.") from error

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(user_agent=user_agent, locale="tr-TR")
            page = context.new_page()
            page.route(
                "**/*",
                lambda route: route.abort() if route.request.resource_type in {"image", "media", "font"} else route.continue_(),
            )
            page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            page.wait_for_timeout(wait_ms)
            html = page.content()
            browser.close()
            return html
    except PlaywrightError as error:
        raise DynamicBrowserUnavailable(f"Dinamik sayfa render edilemedi: {error}") from error

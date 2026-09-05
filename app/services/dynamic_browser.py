"""Politika kontrolünden geçmiş dinamik sayfaları Playwright ile render eder."""

from __future__ import annotations

import os
from pathlib import Path
from app.services.outbound_http import safe_get, validate_url


BROWSER_PATH = Path(__file__).resolve().parents[2] / "data" / "ms-playwright"


class DynamicBrowserUnavailable(RuntimeError):
    pass


def render_dynamic_html(url: str, user_agent: str, wait_ms: int = 3500) -> str:
    """Stealth/CAPTCHA aşma uygulamadan, görünür DOM tamamlandıktan sonra HTML döndürür."""
    from app.services.retailer_offers import RETAILERS
    host = validate_url(url, set(RETAILERS))
    try:
        os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(BROWSER_PATH))
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise DynamicBrowserUnavailable("Playwright kurulu değil; dinamik mağaza fallback'i çalıştırılamadı.") from error

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(user_agent=user_agent, locale="tr-TR", service_workers="block")
            def guarded_route(route):
                if route.request.resource_type in {"image", "media", "font"} or route.request.method != "GET":
                    route.abort()
                    return
                try:
                    result = safe_get(route.request.url, allowed_hosts={host}, timeout=15,
                                      headers={"User-Agent": user_agent})
                    route.fulfill(status=result.status_code, body=result.content,
                                  content_type=result.headers.get("Content-Type", "text/plain"))
                except (ValueError, OSError):
                    route.abort()
            context.route("**/*", guarded_route)
            context.route_web_socket("**/*", lambda socket: socket.close())
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            page.wait_for_timeout(wait_ms)
            html = page.content()
            browser.close()
            return html
    except PlaywrightError as error:
        raise DynamicBrowserUnavailable(f"Dinamik sayfa render edilemedi: {error}") from error

from pathlib import Path

import pytest

from app.database import Repository


BOOKS = Path(__file__).parents[1] / "data" / "books.json"


def product_repository(tmp_path: Path):
    repository = Repository(tmp_path / "productization.db")
    repository.seed_books(BOOKS)
    author = repository.register("Yorumcu", "author@example.com", "guvenli-parola")
    reader = repository.register("Okur", "reader@example.com", "guvenli-parola")
    return repository, author, reader


def test_password_reset_is_single_use_and_revokes_sessions(tmp_path: Path) -> None:
    repository, author, _ = product_repository(tmp_path)
    old_session = repository.open_login_session(author["email"], "guvenli-parola")["access_token"]
    token = repository.request_password_reset(author["email"])
    assert token

    repository.reset_password(token, "yeni-guvenli-parola")

    assert repository.resolve_session(old_session) is None
    assert repository.open_login_session(author["email"], "yeni-guvenli-parola")["user"]["id"] == author["id"]
    with pytest.raises(ValueError):
        repository.reset_password(token, "bir-baska-parola")


def test_password_recovery_does_not_reveal_unknown_accounts(tmp_path: Path) -> None:
    repository, _, _ = product_repository(tmp_path)
    assert repository.request_password_reset("unknown@example.com") is None


def test_threaded_comments_helpful_follow_and_notifications(tmp_path: Path) -> None:
    repository, author, reader = product_repository(tmp_path)
    book_id = "suc-ve-ceza"
    parent = repository.create_book_comment(author["id"], book_id, "Derin bir yorum.", False)

    repository.set_follow(reader["id"], author["id"], True)
    reply = repository.create_book_comment(
        reader["id"], book_id, "Katılıyorum.", False, parent_comment_id=parent["id"]
    )
    helpful = repository.set_comment_helpful(reader["id"], parent["id"], True)

    community = repository.book_community(book_id, reader["id"])
    feed = repository.community_feed(reader["id"])
    notifications = repository.list_notifications(author["id"])

    assert reply["parent_comment_id"] == parent["id"]
    assert helpful["helpful_count"] == 1
    assert any(item["id"] == parent["id"] for item in feed)
    assert {item["kind"] for item in notifications} >= {"new_follower", "comment_helpful"}
    assert next(item for item in community["comments"] if item["id"] == parent["id"])["own_helpful"] is True


def test_report_moderation_queue(tmp_path: Path) -> None:
    repository, author, reader = product_repository(tmp_path)
    comment = repository.create_book_comment(author["id"], "suc-ve-ceza", "Tartışmalı içerik.", False)
    report = repository.report_comment(reader["id"], comment["id"], "other", "İncelensin")

    assert repository.admin_comment_reports("open")[0]["id"] == report["id"]
    resolved = repository.resolve_comment_report(report["id"], "resolved", reader["id"], "hidden")
    assert resolved["status"] == "resolved"
    assert repository.admin_comment_reports("resolved")[0]["id"] == report["id"]


def test_frontend_accessibility_and_asset_budgets() -> None:
    src = Path(__file__).parents[2] / "frontend" / "src"
    read = lambda relative: (src / relative).read_text(encoding="utf-8")
    entry = read("spa/index.html")
    assert '<html lang="tr">' in entry and '<link rel="manifest"' in entry
    assert 'name="viewport"' in entry and "theme-init.js" in entry
    sign_in = read("spa/pages/SignInPage.tsx")
    assert "Parolayı göster" in sign_in and 'autoComplete="email"' in sign_in
    assert "role={message.tone === 'error' ? 'alert' : 'status'}" in sign_in
    shell = read("spa/layout/AppShell.tsx")
    assert 'aria-haspopup="menu"' in shell and 'role="menu"' in shell and "İçeriğe geç" in shell
    assert all(item in shell for item in ("Profilim", "Ayarlar", "Çıkış yap"))
    tokens = read("spa/theme/tokens.css")
    assert ":root[data-theme='dark']" in tokens and "prefers-color-scheme: dark" in tokens
    static = Path(__file__).parents[1] / "app" / "static"
    assert not (static / "app.js").exists()

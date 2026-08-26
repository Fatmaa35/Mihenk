import json

import httpx
import pytest

from app.supabase_repository import SupabaseRepository, SupabaseRequestError


def repository_with(handler) -> SupabaseRepository:
    repository = SupabaseRepository("https://project.supabase.co", "sb_publishable_test")
    repository.client.close()
    repository.client = httpx.Client(transport=httpx.MockTransport(handler))
    return repository


def test_public_catalog_uses_publishable_key_and_maps_arrays() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["apikey"] == "sb_publishable_test"
        assert "authorization" not in request.headers
        return httpx.Response(
            200,
            json=[
                {
                    "id": "book-1",
                    "title": "Kitap",
                    "author": "Yazar",
                    "genre": "Roman",
                    "themes": ["adalet"],
                    "character_traits": ["analitik"],
                    "description": "Açıklama",
                    "source_name": None,
                    "source_url": None,
                    "cover_url": None,
                    "metadata_updated_at": None,
                }
            ],
        )

    repository = repository_with(handler)
    assert repository.list_books()[0]["themes"] == ["adalet"]


def test_refresh_cookie_can_restore_session_without_access_cookie() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/auth/v1/token":
            assert request.url.params["grant_type"] == "refresh_token"
            assert json.loads(request.content)["refresh_token"] == "old-refresh"
            return httpx.Response(
                200,
                json={
                    "access_token": "new-access",
                    "refresh_token": "new-refresh",
                    "user": {
                        "id": "00000000-0000-0000-0000-000000000001",
                        "email": "okur@example.com",
                        "created_at": "2026-08-12T00:00:00Z",
                        "user_metadata": {"display_name": "Okur"},
                    },
                },
            )
        if request.url.path == "/rest/v1/profiles":
            assert request.headers["authorization"] == "Bearer new-access"
            return httpx.Response(200, json=[{"display_name": "Okur"}])
        raise AssertionError(f"Beklenmeyen istek: {request.url}")

    repository = repository_with(handler)
    session = repository.resolve_session(None, "old-refresh")
    assert session is not None
    assert session["access_token"] == "new-access"
    assert session["user"]["display_name"] == "Okur"


def test_email_rate_limit_has_actionable_turkish_message() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            json={"code": "over_email_send_rate_limit", "msg": "email rate limit exceeded"},
        )

    repository = repository_with(handler)
    with pytest.raises(SupabaseRequestError) as captured:
        repository.open_registration_session("Okur", "okur@example.com", "guvenli-parola")

    assert captured.value.status_code == 429
    assert "yaklaşık bir saat" in str(captured.value)


def test_user_profile_does_not_order_by_embedded_relation_alias() -> None:
    user_id = "00000000-0000-0000-0000-000000000001"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": user_id, "email": "okur@example.com"})
        if request.url.path == "/rest/v1/profiles":
            return httpx.Response(200, json=[{"id": user_id, "display_name": "Okur", "created_at": "2026-08-13T00:00:00Z"}])
        if request.url.path == "/rest/v1/user_books":
            assert "order" not in request.url.params
            assert "book:books!inner" in request.url.params["select"]
            return httpx.Response(200, json=[])
        if request.url.path in {"/rest/v1/user_custom_books", "/rest/v1/recommendation_feedback"}:
            return httpx.Response(200, json=[])
        raise AssertionError(f"Beklenmeyen istek: {request.url}")

    repository = repository_with(handler)
    profile = repository.user_profile(user_id, "user-access-token")
    assert profile["user"]["email"] == "okur@example.com"
    assert profile["read_books"] == []


def test_admin_dashboard_uses_single_aggregate_rpc_call() -> None:
    calls = []
    dashboard = {
        "users": 12,
        "verified_users": 3,
        "banned_users": 1,
        "comments": 18,
        "ratings": 25,
        "books": 178,
        "offers": 22,
        "top_books": [],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        assert request.method == "POST"
        assert request.url.path == "/rest/v1/rpc/admin_dashboard_stats"
        assert json.loads(request.content) == {}
        return httpx.Response(200, json=dashboard)

    repository = SupabaseRepository("https://project.supabase.co", "sb_publishable_test", "sb_secret_test")
    repository.client.close()
    repository.client = httpx.Client(transport=httpx.MockTransport(handler))
    assert repository.admin_dashboard() == dashboard
    assert calls == ["/rest/v1/rpc/admin_dashboard_stats"]


def test_preferences_upsert_uses_user_jwt_and_returns_saved_row() -> None:
    user_id = "00000000-0000-0000-0000-000000000001"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/user_preferences"
        assert request.url.params["on_conflict"] == "user_id"
        assert request.headers["authorization"] == "Bearer user-access-token"
        assert request.headers["prefer"] == "resolution=merge-duplicates,return=representation"
        payload = json.loads(request.content)
        assert payload == {
            "user_id": user_id,
            "personality_text": "Analitik ve meraklı",
            "selected_traits": ["Analitik", "Meraklı"],
            "preferred_genres": ["Polisiye"],
            "disliked_genres": [],
        }
        return httpx.Response(201, json=[{**payload, "updated_at": "2026-08-12T00:00:00Z"}])

    repository = repository_with(handler)
    saved = repository.upsert_user_preferences(
        user_id,
        "  Analitik ve meraklı  ",
        ["Analitik", "Meraklı"],
        ["Polisiye"],
        [],
        access_token="user-access-token",
    )

    assert saved["personality_text"] == "Analitik ve meraklı"
    assert saved["selected_traits"] == ["Analitik", "Meraklı"]


def test_reading_session_stats_falls_back_to_reading_activity() -> None:
    user_id = "00000000-0000-0000-0000-000000000001"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer user-access-token"
        if request.url.path == "/rest/v1/reading_activity":
            return httpx.Response(200, json=[
                {"activity_date": "2026-08-19", "pages_read": 12},
                {"activity_date": "2026-08-19", "pages_read": 8},
                {"activity_date": "2026-08-20", "pages_read": 25},
            ])
        if request.url.path == "/rest/v1/reading_sessions":
            return httpx.Response(404, json={"message": "table not found"})
        raise AssertionError(f"Beklenmeyen istek: {request.url}")

    repository = repository_with(handler)
    stats = repository.get_reading_session_stats(user_id, "user-access-token")

    assert stats["total_sessions"] == 3
    assert stats["total_pages_read"] == 45
    assert stats["total_minutes"] == 0
    assert stats["heatmap_data"] == {"2026-08-19": 20, "2026-08-20": 25}


def test_product_growth_relations_match_sqlite_response_shape() -> None:
    user_id = "00000000-0000-0000-0000-000000000001"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/rest/v1/reading_lists":
            if "share_token" in request.url.params:
                return httpx.Response(200, json=[{
                    "id": "list-1", "title": "Liste", "reading_list_items": [{
                        "note": "Önce bunu oku", "position": 1, "added_at": "2026-08-26T00:00:00Z",
                        "books": {"id": "book-1", "title": "Kitap", "author": "Yazar", "genre": "Roman", "themes": [], "character_traits": []},
                    }],
                }])
            return httpx.Response(200, json=[{
                "id": "list-1", "title": "Liste", "reading_list_items": [{"count": 2}],
            }])
        if request.url.path == "/rest/v1/book_club_members":
            return httpx.Response(200, json=[{"user_id": user_id, "role": "owner", "joined_at": "2026-08-26T00:00:00Z", "profiles": {"display_name": "Okur"}}])
        if request.url.path == "/rest/v1/book_clubs":
            return httpx.Response(200, json=[{
                "id": "club-1", "name": "Kulüp", "book_club_reads": [{
                    "book_id": "book-1", "status": "reading",
                    "books": {"title": "Kitap", "author": "Yazar", "cover_url": None},
                }],
            }])
        if request.url.path == "/rest/v1/profiles":
            return httpx.Response(200, json=[{"id": user_id, "display_name": "Okur"}])
        if request.url.path in {"/rest/v1/book_club_progress", "/rest/v1/book_club_discussions", "/rest/v1/book_club_polls", "/rest/v1/book_club_events", "/rest/v1/book_club_reactions", "/rest/v1/book_club_event_rsvps", "/rest/v1/user_books"}:
            return httpx.Response(200, json=[])
        raise AssertionError(f"Beklenmeyen istek: {request.url}")

    repository = SupabaseRepository("https://project.supabase.co", "sb_publishable_test", "sb_secret_test")
    repository.client.close()
    repository.client = httpx.Client(transport=httpx.MockTransport(handler))

    assert repository.list_reading_lists(user_id)[0]["item_count"] == 2
    detail = repository.reading_list_detail(share_token="share-token")
    assert detail["items"][0]["book"]["title"] == "Kitap"
    club = repository.book_club_detail(user_id, "club-1")
    assert club["reads"][0]["title"] == "Kitap"

from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import Repository
from app.main import app
from app.services.product_growth import experiment_variant, funnel_metrics, parse_library_csv


ROOT = Path(__file__).parents[1]


def prepared(tmp_path: Path):
    repository = Repository(tmp_path / "growth.db")
    repository.seed_books(ROOT / "data" / "books.json")
    return repository, repository.create_user("Ürün Okuru")


def test_experiment_assignment_and_csv_parser_are_deterministic() -> None:
    assert experiment_variant("reader-1") == experiment_variant("reader-1")
    records, warnings = parse_library_csv(
        "Title,Author,Exclusive Shelf,ISBN13\nDune,Frank Herbert,read,9786053754794\nKörlük,José Saramago,to-read,"
    )
    assert not warnings
    assert records[0]["shelf"] == "read"
    assert records[1]["shelf"] == "to_read"


def test_onboarding_import_and_weekly_summary(tmp_path: Path) -> None:
    repository, user = prepared(tmp_path)
    saved = repository.upsert_onboarding_profile(user["id"], ["suc-ve-ceza"], ["Dostoyevski", "Le Guin"], True)
    assert saved["onboarding_completed"] is True
    result = repository.import_library_records(user["id"], [
        {"title": "Suç ve Ceza", "author": "Fyodor Dostoyevski", "isbn": None, "shelf": "read"},
        {"title": "Kişisel Deneme", "author": "Bir Yazar", "isbn": None, "shelf": "to_read"},
    ])
    assert result["imported"] == 2
    assert result["catalog_matches"] == 1
    assert result["custom_books"] == 1
    assert len(repository.weekly_summary(user["id"])["recommendations"]) == 5


def test_recommendation_funnel_lists_and_clubs(tmp_path: Path) -> None:
    repository, user = prepared(tmp_path)
    base = {"recommendation_id": "rec-12345678", "book_id": "suc-ve-ceza", "position": 1,
            "experiment_variant": "ai_assisted", "query_text": "klasik", "metadata": {}}
    for event_type in ("impression", "click", "library_add", "like"):
        repository.log_recommendation_interaction(user["id"], {**base, "event_type": event_type})
    metrics = repository.recommendation_funnel(30)["variants"]["ai_assisted"]
    assert metrics["click_through_rate"] == 1
    assert metrics["library_add_rate"] == 1

    reading_list = repository.create_reading_list(user["id"], "Kış listesi", "Sakin kitaplar", "unlisted")
    detail = repository.upsert_reading_list_item(user["id"], reading_list["id"], "suc-ve-ceza", "İlk sırada", 1)
    assert detail["items"][0]["book"]["title"] == "Suç ve Ceza"
    assert repository.reading_list_detail(share_token=reading_list["share_token"])["id"] == reading_list["id"]

    club = repository.create_book_club(user["id"], "Klasikler Kulübü", "Ayda bir klasik", "private")
    detail = repository.upsert_book_club_read(user["id"], club["id"], {
        "book_id": "suc-ve-ceza", "start_date": None, "target_date": None, "status": "reading"
    })
    assert detail["reads"][0]["status"] == "reading"
    detail = repository.upsert_book_club_progress(user["id"], club["id"], {
        "book_id": "suc-ve-ceza", "current_page": 40, "total_pages": 687,
    })
    assert detail["progress"][0]["current_page"] == 40
    detail = repository.create_book_club_discussion(user["id"], club["id"], {
        "book_id": "suc-ve-ceza", "content": "Vicdan teması burada güçleniyor.", "page_number": 35,
    })
    assert detail["discussions"][0]["page_number"] == 35
    with pytest.raises(PermissionError):
        repository.create_book_club_discussion(user["id"], club["id"], {
            "book_id": "suc-ve-ceza", "content": "Gelecek bölüm", "page_number": 80,
        })
    detail = repository.create_book_club_poll(
        user["id"], club["id"], "Sıradaki kitap", ["suc-ve-ceza", "gurur-ve-onyargi"]
    )
    option = detail["polls"][0]["options"][0]
    detail = repository.vote_book_club_poll(user["id"], club["id"], detail["polls"][0]["id"], option["id"])
    assert any(item["selected"] for item in detail["polls"][0]["options"])


def test_funnel_handles_zero_impressions() -> None:
    result = funnel_metrics([{"experiment_variant": "catalog_control", "event_type": "click"}])
    assert result["catalog_control"]["click_through_rate"] == 1


def test_product_growth_http_flow() -> None:
    client = TestClient(app)
    demo = client.post("/demo/recommendations", json={"character_description": "kısa ve gizemli", "limit": 3})
    assert demo.status_code == 200
    assert demo.json()["experiment_variant"] == "catalog_control"

    registered = client.post("/auth/register", json={
        "display_name": "Büyüme Testi", "email": f"growth-{uuid4()}@example.com", "password": "guvenli-parola"
    })
    assert registered.status_code == 201
    onboarding = client.put("/me/onboarding", json={
        "liked_authors": ["Le Guin", "Saramago", "Atay"], "liked_book_ids": [],
        "preferred_genres": ["Roman"], "pace_preference": "mixed", "tone_preference": "balanced",
        "focus_preference": "balanced", "completed": True,
    })
    assert onboarding.status_code == 200
    assert onboarding.json()["onboarding_completed"] is True
    assert onboarding.json()["preferred_genres"] == ["Roman"]
    assert onboarding.json()["pace_preference"] == "mixed"
    restored = client.get("/me/onboarding").json()
    assert restored["preferred_genres"] == ["Roman"]
    assert restored["pace_preference"] == "mixed"
    assert client.get("/me/weekly-summary").status_code == 200
    assert client.put("/me/notification-preferences", json={"consent_granted": True}).json()["consent_granted"] is True

    reading_list = client.post("/me/reading-lists", json={"title": "Paylaş", "visibility": "unlisted"})
    assert reading_list.status_code == 201
    shared = client.get(f"/shared/reading-lists/{reading_list.json()['share_token']}")
    assert shared.status_code == 200
    club = client.post("/me/book-clubs", json={"name": "Yeni Kulüp", "visibility": "private"})
    assert club.status_code == 201

    user_id = registered.json()["id"]
    expected_variant = experiment_variant(user_id)
    forged_variant = "ai_assisted" if expected_variant == "catalog_control" else "catalog_control"
    interaction = client.post("/me/recommendation-interactions", json={
        "recommendation_id": str(uuid4()), "book_id": "suc-ve-ceza", "event_type": "click",
        "position": 1, "experiment_variant": forged_variant, "metadata": {},
    })
    assert interaction.status_code == 201
    assert interaction.json()["experiment_variant"] == expected_variant


def test_ayse_book_club_user_story(tmp_path: Path) -> None:
    repository, ali = prepared(tmp_path)
    # 1. Kurucu Ali "Mihenk Klasikler Kulübü"nü kurar ve aktif kitabı belirler
    club = repository.create_book_club(
        ali["id"],
        name="Mihenk Klasikler Kulübü",
        description="Dünya klasiklerini derinlemesine incelediğimiz topluluk.",
        rules="1. Spoiler korumasına dikkat edin.\n2. Saygılı ve yapıcı tartışın.",
        visibility="unlisted",
    )
    invite_code = club["invite_code"]
    assert invite_code is not None

    repository.upsert_book_club_read(ali["id"], club["id"], {
        "book_id": "suc-ve-ceza",
        "start_date": "2026-09-01",
        "target_date": "2026-09-30",
        "status": "reading",
    })

    # Ali başlangıçta ilerlemesini 200. sayfaya çeker ve 150. sayfa için bir analiz paylaşır
    repository.upsert_book_club_progress(ali["id"], club["id"], {
        "book_id": "suc-ve-ceza", "current_page": 200, "total_pages": 687, "daily_target_pages": 15
    })
    repository.create_book_club_discussion(ali["id"], club["id"], {
        "book_id": "suc-ve-ceza",
        "content": "Raskolnikov'un vicdan azabı ve tefeci kadının evi sahnesi...",
        "page_number": 150,
        "chapter_title": "Bölüm 2",
        "discussion_type": "analysis",
    })

    # 2. Ayşe davet koduyla katılır
    ayse = repository.create_user("Ayşe Okur")
    ayse_club_view = repository.join_book_club(ayse["id"], invite_code)
    assert ayse_club_view["name"] == "Mihenk Klasikler Kulübü"
    assert ayse_club_view["role"] == "member"
    assert len(ayse_club_view["members"]) == 2

    # 1. Kulüp ana sayfasında ayın kitabını görür
    assert ayse_club_view["active_read"]["title"] == "Suç ve Ceza"
    assert ayse_club_view["active_read"]["status"] == "reading"

    # 2 & 3. "Okumaya katıl" diyerek kitabı kitaplığına ekler ve günde 10 sayfa hedefini seçer
    joined_view = repository.join_reading(ayse["id"], club["id"], "suc-ve-ceza", daily_target_pages=10)
    ayse_progress = next(p for p in joined_view["user_progress"] if p["book_id"] == "suc-ve-ceza")
    assert ayse_progress["in_library"] is True
    assert ayse_progress["daily_target_pages"] == 10
    assert ayse_progress["current_page"] == 0

    # 5. Henüz 0. sayfada olduğu için 150. sayfadaki Ali'nin paylaşımı spoiler kilitli olmalı
    assert joined_view["upcoming_spoilers_count"] == 1
    assert joined_view["discussions"][0]["is_spoiler_locked"] is True

    # 4. İlerlemesini kaydeder (Örn. s. 180) -> Yol haritasında ilerler
    updated_view = repository.upsert_book_club_progress(ayse["id"], club["id"], {
        "book_id": "suc-ve-ceza", "current_page": 180, "total_pages": 687, "daily_target_pages": 10
    })
    ayse_prog = next(p for p in updated_view["user_progress"] if p["book_id"] == "suc-ve-ceza")
    assert ayse_prog["current_page"] == 180
    # %25 kilometre taşı (s. 172) aşılmış olmalı
    milestone_25 = next(m for m in ayse_prog["milestones"] if m["percent"] == 25)
    assert milestone_25["reached"] is True

    # Artık 180. sayfada olduğu için 150. sayfadaki tartışmayı net görür (spoiler kalkar)
    assert updated_view["discussions"][0]["is_spoiler_locked"] is False
    assert "Raskolnikov" in updated_view["discussions"][0]["content"]

    # 6. Alıntı, yorum ve soru paylaşır
    disc_view = repository.create_book_club_discussion(ayse["id"], club["id"], {
        "book_id": "suc-ve-ceza",
        "content": "İnsan her şeye alışan bir yaratıktır, bence insanın en iyi tanımı budur.",
        "page_number": 85,
        "chapter_title": "Alıntı",
        "discussion_type": "quote",
    })
    ayse_post = next(d for d in disc_view["discussions"] if d["user_id"] == ayse["id"])
    assert ayse_post["discussion_type"] == "quote"

    # 7. Üyeler paylaşımlara tepki verir ("thoughtful" ve "agree")
    repository.toggle_book_club_reaction(ali["id"], club["id"], ayse_post["id"], "thoughtful")
    reacted_view = repository.toggle_book_club_reaction(ali["id"], club["id"], ayse_post["id"], "agree")
    post_now = next(d for d in reacted_view["discussions"] if d["id"] == ayse_post["id"])
    assert post_now["reactions"]["thoughtful"] == 1
    assert post_now["reactions"]["agree"] == 1

    # 8. Etkinlik oluşturma ve Kapanış Buluşmasına Katılma (RSVP)
    event_view = repository.create_book_club_event(ali["id"], club["id"], {
        "title": "Suç ve Ceza Kapanış Buluşması",
        "description": "Romanın felsefi arka planını tartışacağımız canlı oturum.",
        "event_type": "final",
        "event_date": "2026-09-28T19:00:00Z",
        "location": "Online Google Meet",
    })
    event_id = event_view["events"][0]["id"]
    rsvp_view = repository.rsvp_book_club_event(ayse["id"], club["id"], event_id, "attending")
    ev = next(e for e in rsvp_view["events"] if e["id"] == event_id)
    assert ev["rsvp_counts"]["attending"] == 2
    assert ev["user_rsvp"] == "attending"

    # 9. Kitap tamamlanır ve rozetler / istatistikler kazanılır
    final_view = repository.upsert_book_club_progress(ayse["id"], club["id"], {
        "book_id": "suc-ve-ceza", "current_page": 687, "total_pages": 687
    })
    badge_codes = [b["code"] for b in final_view["badges"]]
    assert "club_pioneer" in badge_codes
    assert "pace_keeper" in badge_codes
    assert "classic_explorer" in badge_codes

    # 10. Kulüp Sahibi yetkisiyle Ayşe'yi moderatör yapma
    promoted_view = repository.update_book_club_member_role(ali["id"], club["id"], ayse["id"], "moderator")
    ayse_member = next(m for m in promoted_view["members"] if m["user_id"] == ayse["id"])
    assert ayse_member["role"] == "moderator"

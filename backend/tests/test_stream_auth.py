"""Akışlı uçların oturumu akış başlamadan doğruladığını kanıtlar.

Doğrulama akışın gövdesinde yapılsaydı yetkisiz istek de 200 ile başlar,
istemci yarıda kesilen bir akış görürdü; reddedilmiş olurdu ama hata kodu
olmadan. Bu test, reddin gerçek bir 401 olarak döndüğünü sabitliyor.
"""
import os

os.environ.setdefault("DATABASE_PATH", "data/test_stream_auth.db")
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

STREAM_PATHS = ("/me/chat/stream",)


def test_oturumsuz_akis_istegi_401_doner() -> None:
    for path in STREAM_PATHS:
        response = client.post(path, json={"message": "Merhaba"})
        assert response.status_code == 401, f"{path} oturumsuz isteği reddetmedi"


def test_gecersiz_oturum_cerezi_akisi_baslatmaz() -> None:
    for path in STREAM_PATHS:
        response = client.post(path, json={"message": "Merhaba"},
                               cookies={"book_access_token": "gecersiz-belirtec"})
        assert response.status_code == 401, f"{path} geçersiz belirteci kabul etti"

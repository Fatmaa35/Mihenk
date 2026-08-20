# Mihenk - Akıllı Kitap Danışmanı

Mihenk, okuma alışkanlıklarınızı ve kişisel tercihlerinizi analiz ederek kitap önerileri sunan, kitaplık ve okuma takibi yapmanızı sağlayan bir web uygulamasıdır.

## Özellikler

- **Kişiselleştirilmiş Kitap Önerileri:** İlgi alanlarına ve okuma geçmişine göre dinamik kitap tavsiyeleri.
- **ISBN & Barkod Sorgulama:** Open Library ve Google Books entegrasyonu ile hızlı kitap ekleme.
- **Okuma Takibi:** Okuma süreleri, Pomodoro zamanlayıcı, alıntı takibi ve istatistikler.
- **Fiyat Alarmı:** Kitapların fiyat hareketlerini izleme ve bildirim alma.
- **Kullanıcı Yönetimi:** Supabase Auth desteği, kişisel profil ve tercihler.

## Teknolojiler

- **Backend:** Python, FastAPI, SQLite / Supabase (PostgreSQL)
- **Frontend:** React, TypeScript, Vite
- **Test:** Pytest, Playwright, Vitest

## Kurulum ve Çalıştırma

### 1. Backend

```bash
# Sanal ortam oluşturma ve bağımlılıkları yükleme
python -m venv .venv
source .venv/bin/activate  # Windows için: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Uygulamayı başlatma
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Uygulama [http://127.0.0.1:8010](http://127.0.0.1:8010) adresinde çalışır.

### 2. Frontend (Geliştirme / Derleme)

```bash
cd frontend
npm install
npm run build
```

## Testler

```bash
# Python backend testleri
pytest -q

# Frontend testleri
cd frontend
npm test
```

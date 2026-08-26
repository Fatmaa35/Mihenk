# Mihenk

Mihenk, okuma alışkanlıklarınızı ve kişisel tercihlerinizi analiz ederek kitap önerileri sunan, kitaplık ve okuma takibi yapmanızı sağlayan bir web uygulamasıdır.

## Özellikler

- **Kişiselleştirilmiş Kitap Önerileri:** İlgi alanlarına ve okuma geçmişine göre dinamik kitap tavsiyeleri.
- **ISBN & Barkod Sorgulama:** Open Library ve Google Books entegrasyonu ile hızlı kitap ekleme.
- **Okuma Takibi:** Okuma süreleri, Pomodoro zamanlayıcı, alıntı takibi ve istatistikler.
- **Fiyat Alarmı:** Kitapların fiyat hareketlerini izleme ve bildirim alma.
- **Kullanıcı Yönetimi:** Supabase Auth desteği, kişisel profil ve tercihler.

## Teknolojiler

- **Çalışma ortamı:** Python 3.12, Node.js 22
- **Backend:** FastAPI 0.141.1, Pydantic 2.13.4, SQLite / Supabase (PostgreSQL)
- **Frontend:** React 19.1.1, TypeScript 5.9.2, Vite 6.4.3
- **Test:** Pytest 9.1.1, Playwright 1.62.1, Vitest 4.1.11

GitHub Actions, tekrarlanabilir kurulum için `requirements.lock.txt` ve
`frontend/package-lock.json` dosyalarını kullanır.

## Kurulum ve Çalıştırma

### 1. Backend

```bash
# Sanal ortam oluşturma ve bağımlılıkları yükleme
python -m venv .venv
source .venv/bin/activate  # Windows için: .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.lock.txt

# Uygulamayı başlatma
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Uygulama [http://127.0.0.1:8010](http://127.0.0.1:8010) adresinde çalışır.

### 2. Frontend (Geliştirme / Derleme)

```bash
cd frontend
npm ci
npm run build
```

## Testler

```bash
# Python backend testleri
pytest -q

# Frontend testleri
cd frontend
npm test

# Uçtan uca smoke testleri (uygulama 8010 portunda çalışırken)
npm run test:e2e -- --project=desktop
```

## Üretim

`.env.production.example` dosyasını `.env.production` olarak kopyalayıp gerçek secret manager değerleriyle doldurun. Container yayın, Redis, otomatik bildirim/saklama worker'ları ve geri dönüş akışı için [dağıtım rehberine](docs/deployment.md) bakın. Supabase bildirim migration'ı `database/supabase_notification_delivery.sql` dosyasındadır.

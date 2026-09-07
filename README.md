# Mihenk 
<p align="center">
  <img src="./asset/logo.png" alt="Mihenk Logo" width="200">
</p>
Mihenk, okuma alışkanlıklarınızı ve kişisel tercihlerinizi analiz ederek kitap önerileri sunan, kitaplık ve okuma takibi yapmanızı sağlayan bir web uygulamasıdır.

## Özellikler

- **Kişiselleştirilmiş Kitap Önerileri:** İlgi alanlarına ve okuma geçmişine göre dinamik kitap tavsiyeleri.
- **ISBN & Barkod Sorgulama:** Open Library ve Google Books entegrasyonu ile hızlı kitap ekleme.
- **Okuma Takibi:** Okuma süreleri, Pomodoro zamanlayıcı, alıntı takibi ve istatistikler.
- **Fiyat Alarmı:** Kitapların fiyat hareketlerini izleme ve bildirim alma.
- **Kullanıcı Yönetimi:** Supabase Auth desteği, kişisel profil ve tercihler.

## Ekran Görüntüleri

###  Landing Page
<p align="center">
  <img src="./asset/LandingPage.png" alt="Mihenk Landing Page" width="800">
</p>


## Teknolojiler

- **Çalışma ortamı:** Python 3.12, Node.js 22
- **Backend:** FastAPI 0.141.1, Pydantic 2.13.4, SQLite / Supabase (PostgreSQL)
- **Frontend:** React 19.1.1, TypeScript 5.9.2, Vite 6.4.3
- **Test:** Pytest 9.1.1, Playwright 1.62.1, Vitest 4.1.11

GitHub Actions, tekrarlanabilir kurulum için `requirements.lock.txt` ve
`frontend/package-lock.json` dosyalarını kullanır.

## Proje Düzeni

Kodlar katman ve özellik bazında düzenlenir. Ayrıntılar ve yeni dosya ekleme
kuralları için [klasör rehberine](docs/project-structure.md) bakın.

```text
app/                         # Python backend
├── routers/                 # HTTP uç noktaları
├── repositories/            # Veri erişimi
├── services/                # İş mantığı
│   ├── ai/                  # Sohbet, model sağlayıcıları ve promptlar
│   ├── catalog/             # Kitap kaynakları ve katalog kalitesi
│   ├── recommendations/     # Arama, sıralama ve değerlendirme
│   ├── pricing/             # Mağazalar ve fiyat takibi
│   ├── reading/             # Okuma, bildirimler ve ilerleme
│   └── common/              # Güvenlik, HTTP ve gözlemlenebilirlik
└── static/                  # Sunulan statik dosyalar ve derleme çıktısı
frontend/src/
├── main.tsx                 # Vite giriş noktası
├── app/                     # Uygulama kabuğu
├── features/                # auth, catalog, growth, quotes, reading
├── shared/                  # api, i18n, validation
└── styles/                  # Ortak stiller
tests/                       # Backend testleri
scripts/                     # Bakım ve veri işleme komutları
database/                    # SQL şemaları ve yükseltmeler
supabase/                    # CLI yapılandırması, migration ve RLS testleri
docs/                        # Teknik rehberler
data/                        # Başlangıç ve değerlendirme verileri
asset/                       # README görselleri
n8n/                         # Otomasyon iş akışları
.github/workflows/           # CI/CD
```

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

Kayıt ve admin davetlerinin kurulumu için [kayıt ve davet rehberine](docs/registration-and-invitations.md) bakın.

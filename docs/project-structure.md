# Klasör rehberi

Depo kökünde yalnızca beş klasör ve altı temel dosya bulunur.

```text
Mihenk/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI giriş noktası
│   │   ├── routers/               # HTTP uç noktaları
│   │   ├── repositories/
│   │   │   ├── contracts.py       # Veri katmanı sözleşmesi (12 alan, Protocol)
│   │   │   ├── supabase/          # Production uygulaması, alan başına bir modül
│   │   │   └── sqlite/            # Yerel/test uygulaması, aynı alanlar
│   │   ├── services/
│   │   │   ├── ai/                # Model sağlayıcıları ve sohbet
│   │   │   ├── catalog/           # Kitap kaynakları ve doğrulama
│   │   │   ├── recommendations/   # Arama ve öneriler
│   │   │   ├── pricing/           # Fiyat ve mağazalar
│   │   │   ├── reading/           # Okuma ve bildirimler
│   │   │   └── common/            # Güvenlik, HTTP, izleme
│   │   └── static/                # Sunulan dosyalar ve generated/
│   ├── database/                  # SQL şemaları ve yükseltmeler
│   ├── supabase/                  # CLI ayarları, migration ve RLS testleri
│   ├── data/                      # Başlangıç ve değerlendirme verileri
│   ├── scripts/                   # Bakım ve veri işleme komutları
│   ├── tests/                     # Backend testleri
│   ├── requirements.txt
│   ├── requirements.lock.txt
│   ├── pytest.ini
│   ├── .python-version
│   ├── .env.example
│   └── .env.production.example
├── frontend/
│   ├── src/
│   │   ├── spa/                   # Yeni React uygulaması (router, sayfalar, tema)
│   │   │   ├── index.html, main.tsx, App.tsx, routes.ts
│   │   │   ├── layout/            # Uygulama kabuğu, oturum kapısı, hata sınırı
│   │   │   ├── pages/             # Bugün, Keşfet, Kitaplığım, Kulüpler, Odak, Giriş
│   │   │   └── theme/             # tokens.css (açık/koyu), ThemeProvider
│   │   ├── features/              # Özellik bileşenleri: catalog, library, growth, reading…
│   │   ├── shared/
│   │   │   ├── api/               # fetch istemcisi, tipler, TanStack Query kancaları
│   │   │   └── ui/                # Tasarım sistemi bileşenleri (Button, Tile, Dialog…)
│   │   ├── legacy/                # Klasik arayüz (/classic), taşındıkça küçülür
│   │   └── styles/                # Klasik bileşenlerin CSS'i (token'lara bağlı)
│   ├── public/                    # Yeni uygulamanın statik dosyaları (theme-init.js…)
│   ├── tests-e2e/
│   ├── scripts/                   # Derleme boyutu kontrolü
│   └── …                          # Node, TypeScript ve Vite ayarları
├── infra/
│   ├── docker-compose.yml
│   ├── compose.production.yml
│   ├── Caddyfile
│   └── n8n/
├── docs/
│   ├── assets/                    # README görselleri
│   └── …                          # Teknik rehberler
├── .github/workflows/
├── .dockerignore
├── .gitattributes
├── .gitignore
├── Dockerfile
├── render.yaml
└── README.md
```

## Çalıştırma konumları

Python komutlarını `backend/`, npm komutlarını `frontend/` klasöründen çalıştırın.
Python paket adı `app` olarak kalır: `uvicorn app.main:app` ve
`python -m scripts.production_readiness --repository-only` aynı komutlardır.
Supabase CLI komutları da `backend/` klasöründen çalıştırılır; bu klasör CLI'ın
aradığı `supabase/config.toml` dosyasını içerir.

Docker imajı depo kökünden derlenir. Konteyner içinde çalışma dizini ve
`app`, `scripts`, `data`, `database` yolları korunur; çalışan worker komutları
değişmez. Render'ın Dockerfile yolu yine `./Dockerfile` olarak kalır.

`infra/` içindeki Compose dosyaları ortam dosyalarını `../backend/.env` ve
`../backend/.env.production` konumlarında bulur. Gerçek ortam dosyaları Git'e eklenmez.

## Yeni dosya ekleme

Backend iş mantığını ilgili `backend/app/services/` alt klasörüne, HTTP uç
noktalarını `backend/app/routers/` altına koyun. Importlar örneğin
`from app.services.catalog.google_books import GoogleBooksClient` biçimindedir.

### Veri katmanı

Repository metotları 12 alana ayrılmıştır: auth, catalog, library, reading,
notifications, pricing, recommendations, assistant, community, clubs, admin,
telemetry. Yeni bir veri metodu eklerken:

1. İmzayı `backend/app/repositories/contracts.py` içinde ilgili `…Store` sınıfına ekleyin.
2. `repositories/supabase/<alan>.py` ve `repositories/sqlite/<alan>.py` içinde uygulayın.
3. `tests/test_repository_contract.py` iki uygulamanın ayrışmasını otomatik yakalar.

Katalogdan türeyen arama/öneri nesneleri (`services.catalog`, `services.recommender`,
`services.chatbot`) `app.runtime.CatalogServices` içinde tutulur. Router'larda bu
nesneleri modül düzeyinde kopyalamayın; her istekte `services.` üzerinden okuyun.

### Arayüz

Yeni ekranlar `frontend/src/spa/pages/` altına yazılır ve `spa/routes.ts` ile
backend'deki `SPA_ROUTES` listesine eklenir. Renk, boşluk ve köşe değerleri yalnızca
`spa/theme/tokens.css` içindedir; bileşenler `var(--…)` kullanır, böylece açık ve
koyu tema kendiliğinden çalışır. Sunucu verisi `shared/api/queries.ts` içindeki
TanStack Query kancalarıyla okunur; sorgu anahtarları `queryKeys` nesnesindedir.

`/classic` adresi henüz taşınmamış ekranları (topluluk, analiz, fiyat alarmları,
ayarlar, yönetim) sunar. `?view=alerts` gibi bir parametreyle doğrudan bir bölüm açılır.

Frontend bileşenlerini ilgili özellik klasörüne yerleştirin. Ortak modüller
`shared/`, frontend birim testleri ilgili kaynak dosyanın yanında bulunur.
`backend/app/static/generated/` derleme çıktısıdır; elle düzenlenmez.

Yeni rehberler ve görseller `docs/`, dağıtım yardımcıları `infra/` altına eklenir.
Köke yeni özellik dosyaları koymayın.

# Klasör rehberi

Depo kökünde yalnızca beş klasör ve altı temel dosya bulunur.

```text
Mihenk/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI giriş noktası
│   │   ├── routers/               # HTTP uç noktaları
│   │   ├── repositories/          # Veri erişimi
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
│   │   ├── main.tsx
│   │   ├── app/                   # Uygulama kabuğu
│   │   ├── features/              # auth, catalog, growth, quotes, reading
│   │   ├── shared/                # API, dil ve doğrulama
│   │   └── styles/
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

Frontend bileşenlerini ilgili özellik klasörüne yerleştirin. Ortak modüller
`shared/`, frontend birim testleri ilgili kaynak dosyanın yanında bulunur.
`backend/app/static/generated/` derleme çıktısıdır; elle düzenlenmez.

Yeni rehberler ve görseller `docs/`, dağıtım yardımcıları `infra/` altına eklenir.
Köke yeni özellik dosyaları koymayın.

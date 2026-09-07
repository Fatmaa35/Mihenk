# Klasör rehberi

## Backend

`app/main.py` uygulama giriş noktasıdır. `routers/` HTTP isteklerini,
`services/` iş mantığını, `repositories/` veri erişimini barındırır.
`config.py`, `runtime.py`, `schemas.py` ve mevcut repository giriş noktaları
uygulama düzeyindeki dosyalardır.

Servisleri sorumluluklarına göre yerleştirin:

| Klasör | Sorumluluk |
| --- | --- |
| `app/services/ai/` | Model sağlayıcıları, sohbet ve promptlar |
| `app/services/catalog/` | Google Books, Open Library, katalog aktarımı ve doğrulama |
| `app/services/recommendations/` | Embedding, arama, öneri sıralaması ve değerlendirme |
| `app/services/pricing/` | Mağaza keşfi, fiyat toplama ve tahmin |
| `app/services/reading/` | Okuma planı, bildirim, oyunlaştırma ve kullanıcı ilerlemesi |
| `app/services/common/` | Paylaşılan HTTP, güvenlik, metin temizleme ve izleme |

Importlarda tam paket yolunu kullanın; örneğin
`from app.services.catalog.google_books import GoogleBooksClient`.
Eski düz servis yolları kaldırılmıştır; harici araçların importları da bu düzene
göre güncellenmelidir. `python -m scripts.…` komutları değişmemiştir.

## Frontend

`frontend/src/main.tsx` Vite giriş noktasıdır; uygulama kabuğu `app/` içindedir.
Kimlik doğrulama bağlantıları `features/auth/` içindedir. Özellik bileşenlerini `features/catalog`, `features/growth`, `features/quotes`
ve `features/reading` altında tutun. Birden fazla özellikte kullanılan API,
çeviri ve doğrulama modülleri `shared/` altındadır. Ortak CSS `styles/` içindedir.

Frontend birim testlerini test ettikleri dosyayla aynı klasöre koyun.
Tarayıcı testleri `frontend/tests-e2e/`, backend testleri `tests/` içindedir.

`app/static/generated/` Vite çıktısıdır; elle düzenlemeyin. Kaynak değişikliklerini
`frontend/src/` içinde yapıp `npm run build` çalıştırın.

## Diğer dosyalar

Bakım komutları `scripts/`, işletim ve dağıtım açıklamaları `docs/` altındadır.
Docker, Render, Python ve Node giriş yapılandırmaları kökte kalır; böylece
mevcut kurulum, CI ve dağıtım komutları aynı konumları kullanır.

SQL dosyaları `database/`, Supabase CLI migration ve testleri `supabase/`
altındadır. Bu düzenleme SQL uygulama sırasını değiştirmez.

Yeni bir özellik eklerken önce mevcut sorumluluk klasörünü kullanın. Ayrı bir
iş alanı oluştuğunda yeni klasör açın ve bu rehberi güncelleyin.

# Mihenk — çalışma kuralları ve proje bilgileri

Bu dosya her oturumun başında okunur. Amacı, aynı şeyleri her seferinde yeniden
keşfetmeyi bitirmek. Bir bilgiyi aramak zorunda kaldıysan, bulduğun anda buraya yaz.

## Çalışma kuralları

- Cevaplar **Türkçe**.
- Commit yazarı **her zaman** `Fatmaa35 <kaplanf980@gmail.com>`.
- Kodda, commit mesajlarında, PR açıklamalarında ve belgelerde **asistan izi olmaz**:
  Claude/Anthropic adı, `Co-Authored-By`, `Claude-Session`, "Generated with…" satırları
  yazılmaz. Araçların eklediği böyle bir satır varsa kaldırılır.
- İş akışı: `main`den dal aç → commit'le → push et → PR aç. Birleştirmeyi Fatma yapar;
  acil bir düzeltmede "birleştir" denirse birleştirilir.
- `SUPABASE_SECRET_KEY` ve diğer sır **değerleri** hiçbir yere yazılmaz; yalnızca
  değişken adı ve nasıl yüklendiği yazılır.

## Yapı

| Klasör | Ne |
| --- | --- |
| `backend/` | FastAPI; API + derlenmiş SPA'yı aynı adresten sunar |
| `frontend/` | React 19 SPA (Vite), PWA |
| `mobile/` | Expo SDK 58 / React Native uygulaması (Play Store) |
| `docs/` | İşletim, uyum ve ekran görüntüleri |
| `.github/workflows/` | `ci.yml` (quality), `scheduled-operations.yml` |

## Komutlar

**backend** (Python 3.12, sanal ortam `backend/.venv`)

```bash
python -m venv .venv && .venv/bin/python -m pip install -r requirements.lock.txt
.venv/bin/python -m pytest -q                      # tüm testler (~245)
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
MIHENK_DB_PATH=/tmp/x.db ...                       # test veritabanı yolu
```

**frontend**

```bash
npm install
npm test          # vitest run
npm run build     # tsc --noEmit && vite build && paket boyutu denetimi
npm run test:e2e  # playwright
```

**mobile**

```bash
npm install
npx expo start      # Expo Go ile telefonda
npm run typecheck   # tsc --noEmit
npm test            # jest (saf mantık testleri)
```

## Bu ortamın tuzakları (zaman kaybettirenler)

- **`npx expo install` çalışmaz**: Expo'nun API'sine ağ izni yok. Paket eklerken
  sürümü `mobile/node_modules/expo/bundledNativeModules.json` dosyasından oku ve
  `npm install <paket>@<sürüm>` ile kur.
- **`react-dom` 19.3.0'a sabitli** olmalı (Expo SDK 58 `react` 19.3.0 ile geliyor).
  Kurulum çakışırsa `npm install --save-dev react-dom@19.3.0 <öteki paketler>`.
- **Web önizlemesi** (ekranları bu ortamda görmek için): `react-native-web@~0.21.4`
  geliştirme bağımlılığı olarak kurulu olmalı, sonra
  `npx expo export -p web --output-dir <klasör>`. Derin bağlantılar için bilinmeyen
  yolda `index.html` döndüren bir sunucu gerekir; düz `python -m http.server` 404 verir.
- **Dış görseller ve mağaza siteleri bu ortamdan açılamaz** (Open Library kapakları,
  kitap mağazaları, canlı Render adresi). Önizlemede bunlar yerel olarak taklit edilir.
- **Playwright tarayıcısı**: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
- **CORS**: yerel sunucuya tarayıcıdan bağlanırken `ALLOWED_ORIGINS` ortam değişkenine
  önizleme adresini eklemek gerekir; mobil istemci CORS'a tabi değildir.

## Mimari notlar

- **Mobil oturum başlıklarla taşınır**, çerezle değil: istekte `X-Mihenk-Client: mobile`,
  `Authorization: Bearer …`, `x-refresh-token`; yanıtta sunucu anahtarı yenilediyse
  `X-Session-Access-Token` / `X-Session-Refresh-Token` döner.
- **Yerel SQLite iki kez yazılmış**: canlı olan `backend/app/database.py` içindeki
  `Repository`; `backend/app/repositories/sqlite/` altındaki mixin'ler (`SQLiteRepository`)
  yalnızca sözleşme testinde kullanılıyor. Kitaplık/profil mantığını değiştirirken
  **ikisini birlikte** değiştir, yoksa canlı davranış değişmez.
- **Supabase ve SQLite aynı sözleşmeye bağlı** (`app/repositories/contracts.py`); bir
  alanı birine eklediğinde diğerine de ekle.
- Kapak görseli sırası: `cover_url` → ISBN ile Open Library → başlığı taşıyan renkli karo.
- Fiyat hattı: günlük tarama GitHub Actions'ta (`scheduled-operations.yml`, `prices` işi),
  kitap açılınca canlı arama `POST /books/{id}/offers/live` + yoklama. Mağaza kuralları
  `docs/RETAILER_COMPLIANCE.md`.

## Mobil uygulama durumu

- Paket adı **`com.mihenk.app`** (Play'e yüklendikten sonra değişmez).
- Sunucu adresi varsayılanı `https://mihenk-web-production.onrender.com`
  (`EXPO_PUBLIC_API_URL` ile değiştirilebilir).
- Sekmeler: Kitaplık · Keşfet · Odak · Kitap ekle · Profil; asistan Keşfet'ten açılır.
- Play Store engeli: kişisel geliştirici hesabı için **12 testçi × 14 gün kesintisiz**
  kapalı test, sonra üretime geçiş anketi ve 3–7 iş günü inceleme. Sayaç ancak mağazaya
  bir sürüm yüklenince başlar.
- Sıradaki işler: derleme hattı (imzalı AAB + Play Console yüklemesi), abonelik
  (Play Billing + sunucuda doğrulama), "Bugün" ekranı.

# Mihenk

<p align="center"><img src="docs/assets/logo.png" alt="Mihenk Logo" width="200"></p>

Mihenk; kişiselleştirilmiş kitap önerileri, kitaplık yönetimi, okuma takibi,
alıntılar ve fiyat alarmları sunan bir web uygulamasıdır. Telefona uygulama
gibi kurulabilir (PWA) ve arkadaşlarla birlikte okumak ya da ders çalışmak için
canlı odalar sunar.

## Özellikler

- **Ruh hâline göre öneri:** "Yağmurlu bir akşam için kısa ve gizemli bir şey"
  gibi serbest bir cümleden, karakter, tema ve okuma geçmişine göre sıralanmış
  öneriler ve her önerinin neden uygun olduğu.
- **Kitaplık ve okuma takibi:** okuyorum / okuyacağım / okudum rafları, sayfa
  ilerlemesi, kişisel kitaplar, barkodla (ISBN) kitap ekleme ve Goodreads içe
  aktarma.
- **Odak modu:** Pomodoro sayacıyla okuma seansları, okurken alıntı kaydetme,
  okuma hızı ve toplam süre.
- **Rozetler ve okuma takvimi:** seriler, seviyeler, yıllık hedef ve rozet
  vitrini; yeni kazanılan rozet konfeti ve paylaşılabilir kartla kutlanır.
- **Yıllık okuma özeti (`/ozet`):** okunan sayfalar, en sevilen tür, en uzun
  seri ve okur tipi; hikâye formatında kart kart paylaşılır.
- **Alıntı kartları (`/alintilar`):** kitaptan alıntıyı kapağın renkleriyle
  hikâye ya da gönderi boyutunda görsele çevirip paylaşma.
- **Topluluk:** kitaplara puan ve yorum, spoiler gizleme, faydalı bulma ve
  okurları takip etme.
- **Kitap kulüpleri:** ortak kitap, spoiler korumalı tartışmalar, ortak
  ilerleme, etkinlikler, oylamalar ve okuma odası.
- **Canlı odalar (`/odalar`):** arkadaşlarla aynı anda okuma ya da ders
  çalışma. Ayrıntılar aşağıda.
- **Kitap asistanı:** yapay zekâ destekli sohbet; rafa ekleme gibi işlemleri
  yalnızca kullanıcının onayıyla yapar.
- **Fiyatlar ve alarmlar:** mağaza fiyat karşılaştırması ve hedef fiyata
  düşünce bildirim.
- **Bildirimler ve hatırlatmalar:** uygulama içi bildirimler ve web push ile
  okuma hatırlatmaları.
- **Yönetim paneli (`/yonetim`):** kullanıcılar, yorum şikâyetleri, katalog,
  fiyat hattı ve kalite değerlendirmesi.
- **Gizlilik:** verileri indirme ve hesabı silme Ayarlar'dan yapılır.

## Ekran görüntüleri

Görüntüler örnek bir okur hesabıyla yerel sunucudan alındı; kitap kapakları
test kataloğunda üretilmiş kapaklardır.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/bugun.png" alt="Bugün" width="430"><br>
      <b>Bugün</b><br>
      Günün başlangıç ekranı: kaldığın kitap ve ilerleme çubuğu, haftalık okuma süresi, yıllık hedef, kulübün ve “Canlı odada birlikte oku” kısayolu. Altında rafına göre seçilmiş öneriler.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/kesfet.png" alt="Keşfet" width="430"><br>
      <b>Keşfet</b><br>
      Ne okumak istediğini kendi cümlenle yazarsın; her kitap bir uyum yüzdesi ve “neden sana uygun” açıklamasıyla listelenir. Üstteki şerit, sonucun profilindeki hangi sinyallerle ağırlıklandırıldığını söyler.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/kitap-detayi.png" alt="Kitap ayrıntısı" width="430"><br>
      <b>Kitap ayrıntısı</b><br>
      Kitabın konusu, türü, temaları ve sana uyum puanı. Buradan rafa eklenir, alıntı kartı başlatılır, mağaza fiyatları karşılaştırılır ve hedef fiyat için alarm kurulur.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/kitapligim.png" alt="Kitaplığım" width="430"><br>
      <b>Kitaplığım</b><br>
      Okuyorum, okuyacağım, okudum, bıraktım ve favoriler rafları. Her kitapta sayfa ilerlemesi ve raf değiştirme; “Kitap ekle” ile katalogdan, barkoddan ya da elle kitap eklenir.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/okuma-modu.png" alt="Okuma modu" width="430"><br>
      <b>Okuma modu</b><br>
      Pomodoro ya da kronometreyle okuma seansı; ortam sesi ve tema seçimi, tam ekran. Seans bitince okunan sayfalar takvime, serilere ve rozetlere işlenir.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/profil.png" alt="Profil" width="430"><br>
      <b>Profil</b><br>
      Seviye ve deneyim puanı, yıllık hedef, okunan sayfa, aktif gün ve seri kartları; yılın her gününü gösteren okuma takvimi, tür dağılımı ve rozet rafı.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/kulup.png" alt="Kitap kulübü" width="430"><br>
      <b>Kitap kulübü</b><br>
      Ayın kitabı, ortak ilerleme ve okuma yol haritası. Sekmelerde spoiler korumalı tartışmalar, kulüp okuma odası, etkinlikler, oylamalar ve istatistikler bulunur.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/canli-oda.png" alt="Canlı oda" width="430"><br>
      <b>Canlı oda</b><br>
      Kamera ve mikrofon olmadan birlikte okuma ya da ders çalışma. Solda o an odada olanlar ve ne yaptıkları, sağda giriş ve çıkışların da yazıldığı sohbet.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/yillik-ozet.png" alt="Yıllık okuma özeti" width="430"><br>
      <b>Yıllık okuma özeti</b><br>
      Yılın okuma hikâyesi kart kart: toplam sayfa, en sevilen tür, en uzun seri, en verimli ay ve okur tipi. Her kart paylaşılabilir görsele dönüşür.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/alinti-karti.png" alt="Alıntı kartı" width="430"><br>
      <b>Alıntı kartı</b><br>
      Alıntıyı yazarken sağda kart canlı olarak oluşur; renkler kitabın kapağından alınır. Hikâye ya da gönderi boyutunda indirilir veya paylaşılır.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/bugun-koyu.png" alt="Koyu tema" width="430"><br>
      <b>Koyu tema</b><br>
      Tüm ekranlar açık ve koyu temada çalışır; varsayılan olarak cihazın ayarı izlenir, Ayarlar’dan değiştirilebilir.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/web/landing.png" alt="Tanıtım sayfası" width="430"><br>
      <b>Tanıtım sayfası</b><br>
      Giriş yapmamış ziyaretçinin gördüğü sayfa. Hesap açmadan ruh hâline göre örnek öneri denenebilir.
    </td>
  </tr>
</table>

## Telefonda uygulama olarak kullanma (PWA)

Mihenk ayrı bir mağaza uygulaması gerektirmeden telefonun ana ekranına
eklenebilir. Tam ekran açılır, kısayollarla (Bugün, Keşfet, Kitaplığım, Okuma
modu) başlatılır, bağlantı zayıfken de uygulama kabuğu açılır ve web push
bildirimleri gelir.

- **Android / bilgisayar (Chrome, Edge, Samsung Internet):** Bugün ekranındaki
  "Mihenk'i ana ekranına ekle" kartından ya da tarayıcı menüsündeki
  "Uygulamayı yükle" seçeneğinden.
- **iPhone / iPad (Safari):** Paylaş › Ana Ekrana Ekle. Uygulama bu adımları
  kartta ve Ayarlar › Uygulama olarak kullan bölümünde gösterir.

Servis çalışanı sitenin kökünden (`/service-worker.js`) sunulur ve tüm
sayfaları kontrol eder. Manifest `backend/app/static/manifest.webmanifest`
dosyasındadır.

Telefon görüntüleri 390×844 boyutunda, Android ve iPhone tarayıcısıyla alındı.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/android-yukle.png" alt="Android: tek dokunuşla kurulum" width="260"><br>
      <b>Android: tek dokunuşla kurulum</b><br>
      Chrome, Edge ve Samsung Internet’te Bugün ekranında kart çıkar; “Yükle” tarayıcının kendi kurulum penceresini açar. Kart kapatılırsa 30 gün gösterilmez.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/iphone-ana-ekran.png" alt="iPhone: Ana Ekrana Ekle" width="260"><br>
      <b>iPhone: Ana Ekrana Ekle</b><br>
      Safari kurulum penceresi sunmadığı için kart iki adımı gösterir: Paylaş simgesi, ardından Ana Ekrana Ekle.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/ayarlar-uygulama.png" alt="Ayarlar › Uygulama olarak kullan" width="260"><br>
      <b>Ayarlar › Uygulama olarak kullan</b><br>
      Kurulum durumu her zaman buradadır: yüklüyse bunu söyler, değilse cihaza uygun yolu anlatır.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/kesfet.png" alt="Telefonda Keşfet" width="260"><br>
      <b>Telefonda Keşfet</b><br>
      Öneriler tek sütunda; alt gezinme çubuğuyla Bugün, Keşfet, Kitaplık, Topluluk ve Odak arasında geçilir.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/okuma-modu.png" alt="Telefonda okuma modu" width="260"><br>
      <b>Telefonda okuma modu</b><br>
      Kitap seçimi, barkodla kitap ekleme ve ortam ayarları; sayaç tam ekranda telefonu okuma saatine çevirir.
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/rozetler.png" alt="Rozet rafı" width="260"><br>
      <b>Rozet rafı</b><br>
      Kazanılan ve sıradaki rozetler, ne kadar kaldığıyla birlikte.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/pwa/canli-oda.png" alt="Telefonda canlı oda" width="260"><br>
      <b>Telefonda canlı oda</b><br>
      Katılımcılar üstte kısa bir liste, altında sohbet. Yüzen asistan düğmesi bu ekranda gizlenir ki mesaj kutusunu örtmesin.
    </td>
    <td width="50%"></td>
  </tr>
</table>

iPhone’da bilmen gerekenler:

- Bildirimler iOS 16.4 ve sonrasında, yalnızca ana ekrana eklenmiş uygulamada
  gelir; Safari sekmesinde gelmez.
- Uygulama kapalıyken arka planda veri eşitlenmez.
- Uzun süre açılmayan sitelerin önbelleğini Safari silebilir; oturum sunucuda
  tutulduğu için en fazla yeniden giriş istenir.

## Canlı odalar

Kamera ve mikrofon yoktur. Oda açan kişi bir ad ve tür seçer (kitap okuma,
ders çalışma ya da diğer), davet bağlantısını ya da 8 haneli kodu
arkadaşlarına gönderir.

- Katılımcı listesi o an odada olanları ve her kişinin ne yaptığını
  ("Fizik, 3. ünite" gibi) gösterir.
- Sohbette giriş ve çıkışlar otomatik olarak yazılır.
- Sayfa birkaç saniyede bir odanın durumunu yeniler; bu istek aynı zamanda
  "buradayım" sinyalidir. Sekme arka plandayken yenileme durur.
- Odayı açan kişi katılımcıyı çıkarabilir (çıkarılan kişi geri dönemez) ve
  odayı kapatabilir.

Adresler: `/odalar` odaların listesi, `/odalar?davet=KOD` davetle katılma,
`/odalar?oda=ID` oda ekranı. API `/me/live-rooms` altındadır.

## Sistem mimarisi

Mihenk tek bir Docker imajıdır: FastAPI sunucusu hem API'yi hem de derlenmiş
React uygulamasını aynı adresten sunar. Canlıda Render'da (Frankfurt) çalışır;
veriler ve kimlik doğrulama Supabase'de, hız sınırı ve metrikler Redis'te
tutulur. Yapay zekâ, katalog, e-posta ve fiyat kaynakları dış servislerdir;
zamanlanmış işler GitHub Actions ve n8n üzerinden çalışır.

```mermaid
flowchart TB
  subgraph Istemci["Tarayıcı / PWA"]
    SPA["React SPA<br/>TanStack Query"]
    SW["Servis çalışanı<br/>önbellek, web push"]
  end
  subgraph Render["Render · tek Docker imajı"]
    API["FastAPI<br/>router → servis → depo"]
    Redis[("Redis<br/>hız sınırı, metrik")]
  end
  subgraph Supabase["Supabase"]
    Auth["Auth<br/>kayıt, giriş, oturum"]
    PG[("PostgreSQL<br/>RLS, pgvector")]
  end
  subgraph Dis["Dış servisler"]
    AI["Ollama Cloud / Gemini<br/>asistan, açıklama, embedding"]
    Catalog["Google Books<br/>Open Library"]
    SMTP["Brevo SMTP<br/>e-posta"]
    Shops["Kitap mağazaları<br/>fiyatlar"]
    Push["Tarayıcı push servisi"]
  end
  subgraph Zaman["Zamanlanmış işler"]
    N8N["n8n<br/>her gün 04:15"]
    GHA["GitHub Actions<br/>hatırlatma, saklama, yedek"]
  end
  SPA -- "HTTPS + HTTP-only çerez" --> API
  SW -. "kabuk önbelleği" .-> SPA
  API --> Redis
  API -- "REST" --> PG
  API -- "token" --> Auth
  API --> AI
  API --> Catalog
  API --> SMTP
  API --> Shops
  API -- "VAPID" --> Push
  Push -.-> SW
  N8N -- "/internal/pipelines/prices" --> API
  GHA --> PG
```

| Bileşen | Görevi | Kod |
| --- | --- | --- |
| React SPA | Tüm ekranlar; sunucu verisini TanStack Query ile önbelleğe alır ve yeniler | `frontend/src/spa`, `frontend/src/features` |
| Servis çalışanı ve manifest | Ana ekrana kurulum, uygulama kabuğunun önbelleği, web push bildirimleri | `backend/app/static/service-worker.js`, `manifest.webmanifest` |
| FastAPI | API, güvenlik katmanı (köken denetimi, hız sınırı), SPA'nın sunulması | `backend/app/main.py`, `backend/app/routers` |
| Servisler | Öneri ve arama, yapay zekâ, katalog, fiyat, okuma ve bildirim mantığı | `backend/app/services` |
| Depo katmanı | 13 alanlı veri sözleşmesi; yerelde SQLite, canlıda Supabase | `backend/app/repositories` |
| Supabase | PostgreSQL, satır düzeyinde güvenlik (RLS), kimlik doğrulama, vektör arama | `backend/supabase/migrations` |
| Redis | Dağıtık hız sınırı, e-posta gönderim koruması, metrikler | `backend/app/services/common/security.py` |
| n8n | Günlük fiyat hattını tetikler | `infra/n8n` |
| GitHub Actions | Test ve güvenlik taraması, hatırlatmalar, veri saklama, şifreli yedek, imaj yayını | `.github/workflows` |

### Sunucunun katmanları

Her istek aynı yoldan geçer. Router'lar yalnızca HTTP ile ilgilenir; iş
kuralları servislerde, veri erişimi depo katmanındadır. Depo katmanı bir
sözleşmeye (`contracts.py`) bağlıdır: aynı kod yerelde SQLite ile, canlıda
Supabase ile çalışır ve iki uygulama da aynı sözleşme testlerinden geçer.

```mermaid
flowchart TB
  Req["HTTP isteği"] --> MW["Güvenlik katmanı<br/>köken denetimi, hız sınırı, güvenlik başlıkları"]
  MW --> Router["Router<br/>auth, catalog, library, community,<br/>recommendations, live_rooms, admin…"]
  Router --> Session["Oturum<br/>çerez ya da Bearer anahtar, gerekirse yenileme"]
  Session --> Service["Servisler<br/>öneri, yapay zekâ, fiyat, okuma"]
  Service --> Contract["Depo sözleşmesi<br/>13 alan: kitaplık, topluluk, kulüp, canlı oda…"]
  Contract --> SQLite[("SQLite<br/>yerel ve testler")]
  Contract --> Supa[("Supabase<br/>production")]
```

### Bir öneri isteğinin yolu

```mermaid
sequenceDiagram
  actor Okur
  participant SPA as React SPA
  participant API as FastAPI
  participant DB as Supabase
  participant AI as Yapay zekâ
  Okur->>SPA: "Yağmurlu bir akşam için gizemli bir şey"
  SPA->>API: POST /me/recommendations (çerezle)
  API->>API: Köken ve hız sınırı denetimi (Redis)
  API->>DB: Oturumu doğrula, profil ve tercihleri oku
  API->>DB: Anlamsal arama (pgvector) ile aday kitaplar
  API->>AI: Adaylar için uyum açıklaması
  AI-->>API: Sıralı öneriler ve gerekçeler
  API->>DB: Öneri etkileşimini kaydet
  API-->>SPA: Uyum yüzdeleri ve açıklamalar
  SPA-->>Okur: Keşfet ekranında liste
```

Yapay zekâ sağlayıcısına ulaşılamazsa sunucu yapay zekâsız açıklamaya geçer;
öneri listesi yine döner.

### Oturum ve güvenlik

- **Web:** Giriş Supabase Auth ile yapılır; erişim ve yenileme anahtarları
  tarayıcıda yalnızca HTTP-only, güvenli çerezlerde tutulur. JavaScript
  anahtarlara erişemez.
- **Mobil istemci:** Çerez yerine `Authorization: Bearer` ve `x-refresh-token`
  başlıkları kullanılır; yenilenen anahtarlar yanıt başlıklarında döner.
- **Veri erişimi:** Kullanıcıya ait tablolar Supabase'de satır düzeyinde
  güvenlikle (RLS) korunur. Canlı oda tabloları istemciye tamamen kapalıdır;
  yetki API'de denetlenir.
- **Koruma:** Yabancı kökenden gelen istekler reddedilir, uç noktalar Redis
  tabanlı hız sınırıyla korunur, kullanıcı metni HTML'den arındırılır.

### Canlı odaların çalışma şekli

WebSocket yerine kısa aralıklı yoklama kullanılır; Render'daki tek örnekli
sunucu ve Supabase REST ile en sade ve dayanıklı yol budur.

```mermaid
sequenceDiagram
  participant A as Okur (tarayıcı)
  participant API as FastAPI
  participant DB as Veritabanı
  loop Her 4 saniyede bir, sekme görünürken
    A->>API: GET /me/live-rooms/{id}?after=son_mesaj
    API->>DB: Üyelik denetimi, last_seen_at güncelle
    Note over API,DB: 40 saniyedir sinyal yoksa "odada değil",<br/>geri dönünce "odaya katıldı" satırı yazılır
    API-->>A: Katılımcılar ve yalnızca yeni mesajlar
  end
  A->>API: POST /me/live-rooms/{id}/messages
  A->>API: Sayfadan çıkınca POST /me/live-rooms/{id}/leave
```

### Test, yayın ve zamanlanmış işler

```mermaid
flowchart LR
  PR["Push / PR"] --> Q["quality iş akışı"]
  Q --> T1["pytest · vitest · derleme"]
  Q --> T2["Playwright<br/>masaüstü ve mobil"]
  Q --> T3["pip-audit · npm audit"]
  Q --> T4["migration-smoke<br/>Supabase şeması"]
  Q --> T5["Docker imajı"]
  T1 & T2 & T3 & T4 & T5 --> Main["main'e birleştirme"]
  Main --> Deploy["Render otomatik yayın<br/>/ready sağlık denetimi"]
  Main -. "elle: release" .-> GHCR["GHCR imajı<br/>değişmez sürüm"]
  GHCR -.-> Deploy
```

| Zamanlanmış iş | Sıklık | Ne yapar |
| --- | --- | --- |
| Okuma hatırlatmaları | 15 dakikada bir | Zamanı gelen hatırlatmaları e-posta ve web push ile gönderir |
| Veri saklama | Her gün 01:10 (UTC) | Süresi dolan olay kayıtlarını, okunmuş bildirimleri ve eski asistan sohbetlerini siler |
| Şifreli yedek | Her gün 00:00 (UTC) | Supabase veritabanının mantıksal yedeğini alır |
| Fiyat hattı (n8n) | Her gün 04:15 | Mağaza fiyatlarını yeniler ve fiyat tahminlerini günceller |

## Proje yapısı

```text
Mihenk/
├── backend/          # Python API, servisler, veritabanı ve testler
├── frontend/         # React / TypeScript arayüzü
├── infra/            # Docker Compose, Caddy ve n8n
├── docs/             # Rehberler ve görseller
├── .github/          # CI/CD iş akışları
├── Dockerfile        # Uygulama imajı
├── render.yaml       # Render dağıtımı
└── README.md
```

Git ve Docker'ın kullandığı üç gizli ayar dosyası da kökte bulunur.
[Ayrıntılı klasör rehberi](docs/project-structure.md).

## Geliştirme

Python 3.12 ve Node.js 22 kullanılır. Aşağıdaki iki komut grubu ayrı
terminallerde, depo kökünden başlatılır.

**Backend:**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.lock.txt
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

macOS/Linux üzerinde sanal ortamı `source .venv/bin/activate` ile etkinleştirin.
İsteğe bağlı yerel ayarlar için `backend/.env.example` dosyasını `backend/.env`
olarak kopyalayın.

**Frontend:**

```powershell
cd frontend
npm ci
npm run build      # React uygulamasını derler
npm run dev        # değişiklikte yeniden derler (backend açıkken)
```

Derleme `backend/app/static/generated/` klasörüne yazılır ve uygulama `/`
adresinde açılır. Açık ve koyu tema desteklenir; varsayılan olarak sistem ayarı
izlenir. Windows'ta `backend\run-local.bat` dosyasına çift tıklamak sanal ortamı
kurar ve sunucuyu başlatır. Yerel yönetici hesabı için `backend/.env` içine
`ADMIN_EMAILS=adres@ornek.com` yazın.
Uygulama [localhost:8010](http://127.0.0.1:8010) adresinde açılır.

Servis çalışanı ve "ana ekrana ekle" yalnızca `localhost` ya da HTTPS üzerinde
çalışır; telefonda yerel ağ IP'siyle denerken PWA özellikleri devre dışı kalır.

## Testler

Backend klasöründe `python -m pytest -q`, frontend klasöründe `npm test`
ve `npm run build` çalıştırılır. Uygulama açıkken frontend klasöründe
`npm run test:e2e` ile tarayıcı testleri çalıştırılır.

Tarayıcı testleri; iki ayrı kullanıcıyla canlı oda akışını (davet, katılımcı
listesi, sohbet, odadan çıkarma) ve servis çalışanının çevrimdışı açılışını da
kapsar. CI ayrıca `pip-audit` ve `npm audit` ile bağımlılık güvenlik taraması
yapar.

## Veritabanı değişiklikleri

Yerel geliştirmede SQLite şeması (`backend/database/schema.sql`) uygulama
açılırken kendiliğinden kurulur. Production'daki Supabase için değişiklikler
`backend/supabase/migrations/` klasöründedir ve kod yayınlanmadan önce
uygulanır: Supabase › SQL Editor'da dosyanın içeriği çalıştırılır ya da
`backend/` içinden `supabase db push` kullanılır.

| Migration | İçerik |
| --- | --- |
| `20260904135204_production_security_hardening.sql` | Güvenlik sıkılaştırması |
| `20260905123206_request_boundary_hardening.sql` | İstek sınırı korumaları |
| `20260907144425_single_active_club_read.sql` | Kulüp başına tek aktif kitap |
| `20261101140000_live_rooms.sql` | Canlı odalar: oda, üye ve mesaj tabloları |

## Dağıtım ve kullanım

- [Dağıtım rehberi](docs/deployment.md)
- [Kayıt ve admin davetleri](docs/registration-and-invitations.md)
- [İşletim notları](docs/operations.md)

Docker imajı depo kökünden `docker build -t mihenk .` ile oluşturulur.
Render aynı kök `Dockerfile` dosyasını kullanır.


## Landing Page


<p align="center">
  <img src="docs/assets/landing-page.png" alt="Mihenk landing page" width="900">
</p>

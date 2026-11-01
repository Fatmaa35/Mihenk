# Mihenk

<p align="center"><img src="docs/assets/logo.png" alt="Mihenk Logo" width="200"></p>

Mihenk; kişiselleştirilmiş kitap önerileri, kitaplık yönetimi, okuma takibi,
alıntılar ve fiyat alarmları sunan bir web uygulamasıdır. Telefona uygulama
gibi kurulabilir (PWA) ve arkadaşlarla birlikte okumak ya da ders çalışmak için
canlı odalar sunar.

Geliştirici: Fatma Kaplan ([@Fatmaa35](https://github.com/Fatmaa35))

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

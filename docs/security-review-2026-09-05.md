# Güvenlik incelemesi — 5 Eylül 2026

## Uygulanan veritabanı değişikliği

Yerel SUPABASE_URL ile eşleştirilen canlı projede `public` tablolarının tamamında
RLS etkin bulundu. ORM kapatılmadı: uygulama SQLite için parametreli SQL,
Supabase için REST repository kullanıyor. SQL injection ile giriş atlama testi eklendi.

`20260905123206_request_boundary_hardening.sql` canlı Supabase'e uygulandı;
yerel dosyanın sürümü canlı migration geçmişiyle eşleştirildi.

- Kullanıcı kendi profilini oluştururken `app_role`, `is_verified` veya diğer
  yönetici alanlarını gönderemiyor; yalnızca `id` ve `display_name` ekleyebiliyor.
- Yorum güncellemesinde yalnızca `content`, `contains_spoiler`, `updated_at`
  değiştirilebiliyor. Moderasyon durumu, kitap ve sahiplik alanları değiştirilemiyor.
- Son kontrol sorgularında bu engeller, normal düzenleme izinleri ve service-role
  erişiminin korunması doğrulandı. Mevcut kullanıcı verileri değiştirilmedi.

## Kodda tamamlanan korumalar

- Üretimde CORS originleri açık HTTPS adresleri olmalı; wildcard, kullanıcı bilgisi
  ve URL yolu içeren ayarlar reddediliyor. Parola kurtarma adresi de izinli originlerden olmalı.
- Açıkça yabancı Origin taşıyan okuma/yazma istekleri reddediliyor. Üretimde
  Origin'siz yazma istekleri reddediliyor. `/internal/pipelines/prices` istisnasında
  mevcut ayrı `x-pipeline-key` doğrulaması zorunlu kalıyor.
- Origin'siz GET/HEAD istekleri sayfa açılışı, sağlık kontrolleri ve sunucu istemcileri
  için çalışmaya devam ediyor. Özel veriler ayrıca oturum/yetki kontrolünden geçiyor.
- Rate limit kimliği doğrulanmamış çerezden türetilmiyor; bağlantı IP'si kullanılıyor.
  Ham X-Forwarded-For güvenilir sayılmıyor. Üretimde Redis arızasında koruma devre dışı
  kalmak yerine istek 503 ile reddediliyor.
- Kayıt, parola kurtarma ve doğrulama e-postaları ortak alıcı başına 3/saat,
  uygulama genelinde 100/saat kotasına tabi. Bu kotalar doğrudan Brevo veya Supabase Auth'a
  yapılan çağrılara değil, bu backend üzerinden yapılan çağrılara uygulanır.
- Auth yanıtları izinli kullanıcı alanlarıyla sınırlı. Supabase iç hata metni ve
  doğrulama hatalarındaki gönderilmiş parola/girdi istemciye dönmüyor.
- Üretimde eski anonim `/users` akışı ve API dokümantasyonu kapalı;
  sağlık yanıtları yalnızca durum bilgisi içeriyor.
- Yorum oluşturma/düzenleme, kulüp tartışmaları ve oda mesajlarında HTML temizleniyor.
  Mevcut arayüzün `textContent`/React metin gösterimi korunuyor; eski kayıtlar HTML
  olarak çalıştırılmıyor. CSP'ye object/base/frame/form sınırlamaları eklendi.
- Mağaza, katalog içe aktarma ve Web Push istekleri izinli HTTPS hizmetlerine
  sınırlandı. Özel IP çözümlemeleri, yönlendirmeler ve 5 MiB üzeri yanıtlar reddediliyor.
  Bağlantı DNS kontrolünde bulunan IP'ye sabitlenirken TLS gerçek hizmet adını doğruluyor.
- Dinamik mağaza taramasında ağ istekleri aynı güvenli istemci üzerinden karşılanıyor;
  yabancı alt kaynaklar, WebSocket ve service worker erişimi engelleniyor.
- Web Push adresi hem kayıtta hem gönderimde kontrol ediliyor. Şu an FCM, Mozilla
  ve Apple push alan adları destekli; başka sağlayıcılar otomatik kabul edilmiyor.
- Üretim SMTP için STARTTLS ve HTTP yanıtlarında HSTS zorunlu.

Yeni kısıtlar nedeniyle yönlendirme gerektiren mağaza URL'leri ve üçüncü taraf
script gerektiren dinamik taramalar başarısız olabilir; ilgili izinli adaptör açıkça
güncellenmelidir. Gerçek tarayıcı render testi ve gerçek e-posta/push gönderimi yapılmadı.

## Doğrulama ve kalan dağıtım işleri

Tüm Python testleri: 160 başarılı. Testler CORS/origin, çerez ve IP başlığıyla limit
atlama, SQL injection, XSS girdileri, SSRF, e-posta kotası ve veri sızıntısı senaryolarını
kapsıyor. Güvenli istemciyle Open Library'ye gerçek salt okunur HTTPS isteği 200/JSON döndü.
Canlı veritabanı izin sorguları başarılı; genişletilen pgTAP dosyası ayrıca repoda bulunuyor.

Kulüp odası mesajları, tartışma tepkileri ve etkinlik katılımında hedefin ilgili
kulübe ait olduğu yazmadan önce doğrulanıyor. Redis bağlantı/okuma süreleri sınırlı;
rate limit ve metrik işlemleri asenkron istek döngüsünü bloke etmiyor.

Render deploy ayrıca doğrulanmalıdır. Bu nedenle backend
korumaları henüz canlı uygulamada etkin kabul edilmemelidir. Kullanıcının belirttiği
tek origin `https://mihenk-web-production.onrender.com`, `render.yaml`, üretim örnek
ortam dosyası ve scheduled-operations workflow'una açıkça yazıldı. Parola kurtarma
adresi de aynı siteye ayarlandı. Özel alan adı eklenirse `ALLOWED_ORIGINS` ve
`RECOVERY_REDIRECT_URL` birlikte ve açıkça güncellenmelidir.

CORS bir kimlik doğrulama veya IP güvenlik duvarı değildir. Tarayıcı dışındaki bir
istemci Origin taklit edebilir; yalnızca CORS ile “sadece benim sitem istek atsın”
garantisi verilemez. Gizli anahtarların backend'de tutulması ve yetkilendirme esastır.

## Brevo ve Supabase panelinde kalanlar

Brevo uyarı metni ve uyarıdaki IP'ler henüz görülmedi; saldırı kaynağı kesinleşmedi.
Repo `scheduled-operations.yml` ile GitHub Actions üzerinde de SMTP çalıştırıyor.
Render, GitHub worker'ları ve (özel SMTP yapılandırıldıysa) Supabase Auth farklı çıkış
IP'leri kullanabilir. Web sitesinin DNS IP'si, SMTP gönderen sunucunun çıkış IP'siyle
aynı olmak zorunda değildir.

Brevo'da Settings → Security → Authorized IPs listesini gerçek gönderici çıkış
IP'leriyle eşleştirin. Tanınmayan IP'leri otomatik onaylamayın. Anahtar sızıntısı
şüphesinde ilgili SMTP/API anahtarını yenileyip onu kullanan Render/GitHub/Supabase
secretlarını güncelleyin. Değişken IP'li worker için geniş GitHub IP aralıklarını
açmak yerine sabit çıkış IP'li gönderim altyapısı gerekir. Brevo paneline erişilmedi,
IP listesi veya anahtarlar değiştirilmedi.

Kaynak: [Brevo API/SMTP IP güvenliği](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security).

Canlı Supabase Security Advisor'da sızdırılmış parola koruması kapalı uyarısı kaldı.
[Auth parola güvenliği ayarı](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
panelden etkinleştirilmelidir; mevcut araçlar Auth ayarı güncellemesi sağlamıyor.
Beş kulüp tablosunda RLS açık/policy yok bilgi notu var; bu durum varsayılan erişimi
reddeder, herkese erişim açmaz. [Supabase açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Çalışma ağacında yaygın gerçek Brevo/Supabase anahtar önekleri ve yerel Git geçmişinde
SMTP anahtar öneki arandı; eşleşme bulunmadı. Bu sınırlı kontrol anahtarın başka bir
kanaldan sızmadığının kanıtı değildir.

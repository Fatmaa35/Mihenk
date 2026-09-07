# Kayıt ve kullanıcı daveti

Herkese açık kayıt ve admin davetleri birlikte kullanılabilir.

## Kullanım

- Ziyaretçi: **Giriş yap → Yeni hesap oluştur**. Ad, e-posta ve parola girilir.
  E-posta doğrulaması açıksa Supabase doğrulama e-postası gönderir; doğrulama
  bağlantısı sonrası kullanıcı parolasıyla giriş yapar.
- Admin: **Yönetim → Kullanıcı ve topluluk → Kullanıcı davet et**.
  Ad ve e-posta girip **Davet gönder** seçilir. Bu form yalnızca adminlere görünür;
  API de oturum, hesap durumu ve admin rolünü doğrular. Editor davet gönderemez.
- Davet edilen kişi: e-postadaki bağlantıyı açar, **Parola oluştur** ekranını
  tamamlar ve davet edilen e-posta adresiyle giriş yapar.
- Süresi dolan davet için admin aynı adrese yeniden davet gönderebilir.
  Hesabı zaten doğrulanmış kişiler giriş veya **Parolamı unuttum** akışını kullanır.

## Canlı ortam ayarları

1. Render web servisi Environment bölümünde `ALLOW_REGISTRATION=true` olmalı.
   Blueprint ve `backend/.env.production.example` bu değeri kullanır. Mevcut serviste elle
   tanımlanmış `false` değerini güncelleyin ve servisi yeniden dağıtın.
2. Supabase Auth ayarlarında yeni kullanıcı kaydına ve e-posta kaydına izin verin.
   `backend/supabase/config.toml` yerel CLI ayarıdır; barındırılan projeyi kendiliğinden değiştirmez.
3. Supabase Auth URL Configuration içinde **Site URL** uygulama adresi olmalı.
   `RECOVERY_REDIRECT_URL` değerini **Redirect URLs** listesine aynen ekleyin;
   örneğin `https://mihenk-web-production.onrender.com/`.
4. Supabase Auth e-posta sağlayıcısını/SMTP ayarlarını doğrulayın. Backend'in
   okuma hatırlatmaları için kullandığı `SMTP_*` değerleri Supabase Auth SMTP
   ayarlarını kendiliğinden yapılandırmaz.
5. Varsayılan **Invite user**, **Confirm signup** ve **Reset password** şablonlarında
   `{{ .ConfirmationURL }}` bağlantısını koruyun. Uygulama Supabase'in doğrulama
   sonrası gönderdiği `#access_token=…&type=invite|recovery|signup` dönüşünü işler.
6. Backend'de `SUPABASE_SECRET_KEY` bulunmalı. Davetler yalnızca sunucudan bu
   anahtarla gönderilir; tarayıcıya anahtar ya da davet tokenı döndürülmez.

`POST /admin/invitations` yalnızca `display_name` ve `email` kullanır.
Rol yükseltmez ve istemciden yönlendirme adresi kabul etmez. Gönderimler mevcut
alıcı/uygulama e-posta kotasına tabidir; başarılı işlemler `user.invited` olarak
kullanıcı kimliğiyle denetim kaydına yazılır.

Davet/parola belirleme tokenı URL'den hemen kaldırılır, yalnızca bellekte tutulur
ve parola kaydından sonra temizlenir. Parola değişimi ilgili kullanıcının tokenı
ile Supabase'e gönderilir; admin anahtarı bu işlemde kullanılmaz.

SQLite geliştirme ortamında normal kayıt ve giriş kullanılabilir. E-posta
ile davet gönderimi Supabase ortamı gerektirir; SQLite gönderilmiş gibi yanıt vermez.

Kaynaklar: [Supabase kullanıcı davetleri](https://supabase.com/docs/guides/auth/users),
[URL yönlendirme ayarları](https://supabase.com/docs/guides/auth/redirect-urls).

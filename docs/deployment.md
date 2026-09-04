# Production deployment

Mihenk tek bir container imajı olarak paketlenir. Production trafiği TLS sonlandıran bir reverse proxy üzerinden `127.0.0.1:8010` adresine iletilmelidir.

## Ortamlar

- Development, staging ve production ayrı Supabase projeleri ve Redis veritabanları kullanır.
- Production sırları yalnızca secret manager veya sunucudaki `.env.production` dosyasında tutulur; repoya eklenmez.
- `APP_ENVIRONMENT=production`, `COOKIE_SECURE=true`, `REDIS_URL`, `SUPABASE_SECRET_KEY`, gerçek `ALLOWED_ORIGINS`, `LEGAL_ENTITY_NAME` ve `PRIVACY_CONTACT_EMAIL` release ön koşuludur.
- `FORWARDED_ALLOW_IPS` yalnızca reverse proxy IP'lerini içermelidir; `*` kullanılmaz.

## Yayın akışı

1. `python -m scripts.production_readiness --env-file .env.production` başarıyla tamamlanır.
2. CI testleri, frontend derlemesi ve container build tamamlanır.
3. Supabase migrasyonları staging projesine uygulanır; `supabase test db`, Security ve Performance Advisor temizlenir.
4. Staging smoke ve geri yükleme testi geçer.
5. İmaj değişmez digest ile production'a alınır.
6. `/ready`, `/health`, login P95 ve 5xx oranı izlenir.
7. Sorunda önceki imaj digest'ine dönülür; veri kaybettiren down migration yapılmaz.

```powershell
docker build -t registry.example.com/mihenk:<git-sha> .
$env:MIHENK_IMAGE='registry.example.com/mihenk:<git-sha>'
docker compose --env-file .env.production -f compose.production.yml up -d
```

Caddy `APP_DOMAIN` için TLS sertifikasını otomatik yönetir. DNS kaydı sunucuya yönlenmeden ve 80/443
portları açılmadan yayın başlatılmamalıdır. Uygulama portu doğrudan internete açılmaz.

## Supabase release kapısı

İlk geçişte mevcut canlı şema resmi migration geçmişine alınmalıdır:

```powershell
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref PROJECT_REF
npx --yes supabase@latest db pull baseline --linked --yes
npx --yes supabase@latest migration list --linked
npx --yes supabase@latest test db --linked
```

`supabase/config.toml` yeni tabloları otomatik Data API'ye açmaz. Her migration aynı dosyada RLS,
policy ve ihtiyaç duyulan açık `GRANT` ifadelerini içermelidir.

## Secret rotasyonu

Sohbet, log veya yanlışlıkla kaynak kontrolüne giren her secret sızmış kabul edilir. Supabase secret
key, SMTP parolası, VAPID private key ve pipeline webhook secret sağlayıcı tarafında döndürülür;
eski değerler iptal edildikten sonra secret manager güncellenir. `.env.production` repoya eklenmez.

Worker servislerini tek seferlik elle çalıştırmak gerekirse:

```powershell
docker compose -f compose.production.yml exec app python -m scripts.process_reading_reminders
docker compose -f compose.production.yml exec app python -m scripts.enforce_data_retention
```

`reminder-worker` her dakika teslimat kuyruğunu, `retention-worker` günde bir saklama politikasını işler. Hatırlatıcı worker birden fazla replika çalıştırabilir; koşullu claim aynı işi iki kez göndermeyi engeller. Retention worker tek replika tutulur.

Supabase PITR/yedek politikası ile üç ayda bir ayrı staging projesine geri yükleme tatbikatı release takvimine bağlanır.

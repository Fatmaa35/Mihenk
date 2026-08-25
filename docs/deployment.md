# Production deployment

Mihenk tek bir container imajı olarak paketlenir. Production trafiği TLS sonlandıran bir reverse proxy üzerinden `127.0.0.1:8010` adresine iletilmelidir.

## Ortamlar

- Development, staging ve production ayrı Supabase projeleri ve Redis veritabanları kullanır.
- Production sırları yalnızca secret manager veya sunucudaki `.env.production` dosyasında tutulur; repoya eklenmez.
- `APP_ENVIRONMENT=production`, `COOKIE_SECURE=true`, `REDIS_URL`, `SUPABASE_SECRET_KEY`, gerçek `ALLOWED_ORIGINS`, `LEGAL_ENTITY_NAME` ve `PRIVACY_CONTACT_EMAIL` release ön koşuludur.
- `FORWARDED_ALLOW_IPS` yalnızca reverse proxy IP'lerini içermelidir; `*` kullanılmaz.

## Yayın akışı

1. CI testleri, frontend derlemesi ve container build tamamlanır.
2. Supabase migrasyonları staging projesine uygulanır; Security/Performance Advisor temizlenir.
3. Staging smoke ve geri yükleme testi geçer.
4. İmaj değişmez digest ile production'a alınır.
5. `/ready`, `/health`, login P95 ve 5xx oranı izlenir.
6. Sorunda önceki imaj digest'ine dönülür; veri kaybettiren down migration yapılmaz.

```powershell
docker build -t registry.example.com/mihenk:<git-sha> .
$env:MIHENK_IMAGE='registry.example.com/mihenk:<git-sha>'
docker compose -f compose.production.yml up -d
```

Worker servislerini tek seferlik elle çalıştırmak gerekirse:

```powershell
docker compose -f compose.production.yml exec app python -m scripts.process_reading_reminders
docker compose -f compose.production.yml exec app python -m scripts.enforce_data_retention
```

`reminder-worker` her dakika teslimat kuyruğunu, `retention-worker` günde bir saklama politikasını işler. Hatırlatıcı worker birden fazla replika çalıştırabilir; koşullu claim aynı işi iki kez göndermeyi engeller. Retention worker tek replika tutulur.

Supabase PITR/yedek politikası ile üç ayda bir ayrı staging projesine geri yükleme tatbikatı release takvimine bağlanır.

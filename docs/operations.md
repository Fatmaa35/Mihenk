# Üretim işletim notları

Aşağıdaki Python komutları `backend/` klasöründen çalıştırılır.

- Geliştirme, staging ve production için ayrı Supabase projeleri ve ayrı sırlar kullanılır. Migrasyonlar önce staging'e uygulanır; doğrulama sonrası production'a geçirilir.
- `/health` uptime, `/ready` trafik kabulü; `/admin/metrics` P50/P95/P99, hata ve ürün sinyalleri içindir. Alarm başlangıç eşikleri: 5 dakikada `%2` 5xx, P95 `3 sn`, sonuçsuz arama `%10`, LLM fallback `%20`.
- SQLite kurulumu için `python -m scripts.backup_restore_drill`; Supabase için günlük yedek/PITR planı ve üç ayda bir ayrı projeye geri yükleme tatbikatı kullanılır.
- `python -m scripts.process_reading_reminders` her dakika zamanlanır. Uygulama içi kanal hazırdır; e-posta/push kanalları sağlayıcı sırrı olmadan güvenli biçimde başarısız olur.
- Migrasyonlar ileri yönlü ve tekrar çalıştırılabilir tutulur. Veri kaybettiren geri dönüş yerine önce eski uygulama sürümüne dönüş, ardından telafi migrasyonu uygulanır.
- Feature flag kayıtları `feature_flags` tablosunda tutulur; production açılışları kullanıcı kimliğinin deterministik yüzdelik dilimiyle kademeli yapılır.
- Supabase Auth panelinde sızdırılmış parola koruması açılmalıdır; bu ayar SQL migrasyonundan yönetilmez.
## Fiyat veri hattı

İki yol vardır; ikisi de aynı Python servisini çalıştırır, doğrulama, idempotency,
loglama ve tahmin orada kalır.

**Günlük tarama (zamanlanmış).** `.github/workflows/scheduled-operations.yml`
içindeki `prices` işi her gün 04:15 UTC'de çalışır; `Run workflow → prices` ile elle de
başlatılabilir. İş, hattı kendi sürecinde çalıştırır: Render'ın ücretsiz örneği uykuda
olsa bile tarama yapılır. BKM Kitap aramasının tarayıcı yedeği için iş, Chromium'u
kendisi kurar. Çalışma kayıtları yönetici panelindeki **Veri hattı** sekmesinde görünür.

**Kitap açıldığında canlı arama.** Kişi bir kitabı açtığında sunucu izinli mağazalarda
(Kitapseç, Kitapsepeti, BKM Kitap) aynı anda arama yapar ve sonuçlar geldikçe ekrana
düşer. Bulunan fiyatlar kayda geçtiği için kitap ikinci açılışta anında dolu gelir.
Mağazaları yormamak için: aynı mağazaya iki istek arasında en az dört saniye bırakılır,
aynı anda en çok iki kitap aranır, aynı kitap altı saatte bir (kişi "yenile" derse on
dakikada bir) yeniden aranır. Hata veren mağaza `live_price_lookup` olayıyla
`/admin/metrics` olay akışına yazılır.

Elle çalıştırmak için:

```powershell
python -m scripts.refresh_retail_prices --limit 40 --discover-books 15 --orchestrator cli
```

`infra/n8n/mihenk-daily-price-pipeline.json` isteğe bağlı bir alternatiftir: kendi n8n
kurulumu olanlar hattı `/internal/pipelines/prices` üzerinden tetikleyebilir. Uygulama ve
n8n aynı `PIPELINE_WEBHOOK_SECRET` değerini kullanır; Docker içinden yerel uygulamanın
varsayılan adresi `http://host.docker.internal:8010`'dur.

# Authentication and community alerts

`GET /admin/metrics` exposes bounded RED metrics plus product alarms. The admin dashboard
shows login failure rate, login P95 and suspicious login attempts. Current alarm thresholds:

- login failure rate >= 35% after at least 10 attempts: warning
- login P95 >= 1500 ms: warning
- 5 or more Supabase request failures in the process window: critical
- 10 or more rejected/rate-limited login attempts: critical

In a multi-instance production deployment, export these counters to the platform metric
backend and route critical alarms to the on-call channel. In-process metrics are deliberately
bounded and are not a replacement for long-term retention.

Supabase Security Advisor must be checked after every migration. Leaked-password protection,
custom SMTP, email confirmations and MFA for administrator accounts are release gates. See
the official [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

# PWA and offline data

The service worker caches static application assets and the latest authenticated library
projection (`/me/profile`) for network-loss recovery. Private cache entries are deleted on
logout. Do not add bootstrap, notifications, admin responses or session-bearing responses to
the offline cache.

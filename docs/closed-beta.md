# Mihenk kapalı beta çalışma planı

## Kabul ve erişim

- Production'da `ALLOW_REGISTRATION=false` tutulur. Kullanıcılar Supabase Auth panelinden davet edilir.
- İlk kohort 20-50 kişiyle sınırlıdır. Test hesapları production verisine eklenmez.
- Katılımcıya gizlilik metni, geri bildirim kapsamı ve iletişim adresi davet e-postasında verilir.

## Ölçülen temel sinyaller

`product_events` yalnızca ürün içinde izin verilen olay adlarını ve küçük, kişisel veri içermeyen bağlamları tutar:

- `session_started`
- `view_opened`
- `onboarding_started` / `onboarding_completed`
- `notification_opt_in`
- `feedback_submitted`

Admin özeti `GET /admin/beta-dashboard?days=30` üzerinden aktif kullanıcı, onboarding tamamlama,
geri bildirim sayısı, ortalama puan ve olay dağılımını verir. Ham geri bildirim yalnızca editor/admin rolüne açıktır.

## Haftalık ritim

1. Pazartesi: aktif kullanıcı ve onboarding kayıplarını incele.
2. Çarşamba: hata geri bildirimlerini önem/tekrar oranına göre grupla.
3. Cuma: en fazla bir davranış değişikliğini feature flag ile kademeli aç.
4. Kritik güvenlik veya veri kaybı dışında kohort ortasında büyük akış değişikliği yapma.

## Başarı eşikleri

- Davet edilenlerin en az `%60`ı onboarding'i tamamlar.
- Onboarding tamamlayanların en az `%40`ı ilk hafta ikinci kez oturum açar.
- İlk öneriden kitaplığa ekleme oranı en az `%15` olur.
- Kritik hata geri bildirimleri 24 saat içinde incelenir.
- Ortalama deneyim puanı ilk kohort sonunda en az `7/10` olur.

## Beta kapanışı

Kohort tamamlandığında sonuçları anonim toplulaştır, açık geri bildirimleri kapat veya ürün backlog'una
taşı ve saklama süreleri dolan olayları `scripts.enforce_data_retention` ile temizle.

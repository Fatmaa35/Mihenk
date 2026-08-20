# Mağaza entegrasyonu uyum matrisi

Son kontrol: 11 Ağustos 2026. Kurallar değişebileceği için kolektör her istekte `robots.txt` dosyasını yeniden denetler.

| Mağaza | Entegrasyon | Açıklama politikası |
|---|---|---|
| BKM Kitap | Arama yolu ve hedef ürün URL'si için her çalışmada robots kontrolü; HTML'de sonuç yoksa engel aşılmaz | Arama/referans metadata; AI eğitimi yok; uzun açıklama saklanmaz |
| Kitapseç | İzinli arama + hedef ürün URL'si; ISBN birebir doğrulanır | Fiyat/ISBN/baskı; uzun açıklama saklanmaz |
| Kitapsepeti | İzinli arama + hedef ürün URL'si; ISBN veya başlık+yazar doğrulanır | Fiyat/ISBN/baskı; uzun açıklama saklanmaz |
| D&R | Arama yolu robots tarafından kapalı; yalnızca önceden bilinen izinli ürün URL'leri yenilenir | Hesap, sepet ve arama yollarına girilmez; uzun açıklama saklanmaz |
| n11 | Yalnızca robots tarafından izinli hedef ürün URL'si | Pazaryeri koşulları ayrıca gözden geçirilmeli; açıklama saklanmaz |
| Hepsiburada | Yalnızca robots tarafından izinli hedef ürün URL'si; resmi feed tercih edilir | `/product/` ve `/api/` yolları taranmaz |
| Trendyol | **Scraping kapalı**; yazılı izin/resmî API gerekli | Üyelik sözleşmesi izinsiz screen scraping'i yasaklıyor |
| Amazon Türkiye | **Scraping kapalı**; Product Advertising API gerekli | Kullanım koşulları fiyat/ürün listesi veritabanı için robot kullanımını yasaklıyor |

Teknik olarak erişilebilir olmak, yeniden yayınlama veya ticari kullanım izni anlamına gelmez. Üretime geçmeden önce mağazalarla affiliate/feed anlaşması yapılmalıdır. Fiyat kayıtları kaynak URL ve kontrol zamanı olmadan gösterilmez.

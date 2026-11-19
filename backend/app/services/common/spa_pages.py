"""React uygulamasının istemci tarafı sayfaları.

Hem bu sayfaları sunan yönlendirici hem de güvenlik katmanı aynı listeyi
kullanır: güvenlik katmanı, dışarıdan (WhatsApp, e-posta, Instagram) tıklanan
bir bağlantının hangi adreslerde sayfa açabileceğini buradan bilir.
"""

SPA_ROUTES = (
    "giris", "bugun", "kesfet", "kitapligim", "topluluk", "kulupler", "odak", "profil",
    "bildirimler", "ayarlar", "yonetim", "ozet", "alintilar", "odalar",
)

#: Tarayıcıda doğrudan açılabilen adresler; kök sayfa da dâhil.
SPA_PATHS = frozenset({"/", *(f"/{route}" for route in SPA_ROUTES)})

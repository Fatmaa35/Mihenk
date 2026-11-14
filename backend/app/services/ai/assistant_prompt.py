import json


ASSISTANT_SYSTEM_PROMPT = """Sen Mihenk uygulamasının samimi, bilgili Edebî Asistanısın.
Yalnızca kitaplar, yazarlar, edebî türler, akımlar, temalar, okuma yöntemleri,
yayıncılık ve eserlerin spoiler kontrollü analizi hakkında Türkçe yanıt ver.
Kullanıcının kitaplık özetini, son konuşma mesajlarını ve AKTİF EKRAN BAĞLAMI'nı
referans çözmek için kullan. "İkinci kitap", "ekrandaki eser" gibi ifadeleri kitapların
position alanına göre çöz; bağlam yetmiyorsa kısa bir açıklayıcı soru sor.
Ekran bağlamındaki kitapları gerçek katalog kaydı gibi değerlendirme: id alanı olmayanlar
Gemma keşfidir ve henüz doğrulanmamıştır.
Kitaplık listesindeki her kitap gerçekten kullanıcının rafındadır; shelf alanı hangi rafta
olduğunu söyler (okuyor, okuyacak, okudu, bıraktı, favori). added_by_user alanı taşıyan
kitapları kullanıcı kendisi eklemiştir; katalogda bulunmasalar da kitaplığında vardır,
"böyle bir kitap yok" ya da "kitaplığında bulamadım" deme. Eserin kendisini tanımıyorsan
bunu açıkça söyle ve kullanıcıdan yazar ya da konu bilgisi iste; içeriğini uydurma.
Kitap dışı sağlık, hukuk, finans, siyaset, kodlama ve gündelik bilgi sorularını yanıtlama.
Doğruluğundan emin olmadığın eser, tarih, alıntı veya yazar ayrıntısını uydurma.
Kullanıcı bir kitaptan pasaj isterse telifli metni uzun biçimde aktarma; kısa bir özet,
analiz veya yasal önizleme/kütüphane yönlendirmesi sun. Önemli olay örgüsünden önce
"Spoiler uyarısı:" yaz. Güncel fiyat ve stok bildiğini iddia etme.
Yanıtı doğal, kısa ve en fazla beş kısa paragraf tut. Markdown kullanabilirsin."""


MAX_CONTEXT_BOOKS = 40

# Elde okunan kitap, yüzlerce bitmiş kitabın arasında kaybolmasın diye raflar
# bu sırayla taranır; sınıra önce yakın ilgili raflar girer.
SHELVES = (
    ("reading_books", "okuyor"),
    ("to_read_books", "okuyacak"),
    ("abandoned_books", "bıraktı"),
    ("read_books", "okudu"),
    ("favorite_books", "favori"),
)


def _entry(book: dict, shelf: str) -> dict:
    item = {"title": book["title"], "author": book.get("author"), "shelf": shelf}
    if book.get("is_favorite") or shelf == "favori":
        item["favorite"] = True
    if book.get("is_custom"):
        item["added_by_user"] = True
    if book.get("progress_percent"):
        item["progress_percent"] = book["progress_percent"]
    return item


def collect_library(profile: dict) -> dict:
    """Kişinin kitaplığını asistanın okuyabileceği tek listeye indirger.

    Kendi eklediği kitaplar da dâhil her raf buraya girer: asistan "okuyacağım"
    rafındaki ya da katalogda olmayan bir kitabı sorulduğunda "bilmiyorum"
    dememeli. Aynı kitap iki rafta görünüyorsa (favori + okuyor) bir kez yazılır.
    """
    books: dict[tuple[str, str], dict] = {}
    for key, shelf in SHELVES:
        for book in profile.get(key) or []:
            title = (book.get("title") or "").strip()
            if not title:
                continue
            identity = (title.casefold(), (book.get("author") or "").casefold())
            existing = books.get(identity)
            if existing is None:
                books[identity] = _entry(book, shelf)
            elif shelf == "favori":
                existing["favorite"] = True
    return {"count": len(books), "books": list(books.values())[:MAX_CONTEXT_BOOKS]}


def build_assistant_context(profile: dict, active_view_context: dict | None) -> str:
    context = {"library": collect_library(profile), "active_view_context": active_view_context}
    return "GÜVENİLİR UYGULAMA BAĞLAMI:\n" + json.dumps(context, ensure_ascii=False)

SYSTEM_PROMPT = """Sen kullanıcı kişiliği, okuma alışkanlıkları ve edebiyat analizi konusunda uzman bir Akıllı Kitap Danışmanısın.

Kurallar:
- recommended_books alanında yalnızca ADAYLAR içindeki kitapları kullan.
- recommended_books alanına ADAYLAR içinden yalnızca istenen SONUÇ SAYISI kadar en iyi kitabı döndür.
- Her aday için match_score alanına, kullanıcının isteği ve okuma profiline göre verdiğin 0 ile 1 arasındaki bağımsız GEMMA UYUM PUANINI yaz. Adayda gelen mevcut match_score değerini kopyalamak zorunda değilsin.
- Kitap adı, yazar, tür, already_in_watchlist ve score_breakdown alanlarını aday verisinden aynen koru.
- Okunmuş kitap önerme.
- already_in_watchlist değerini değiştirme.
- Kullanıcının kişilik özellikleriyle kitabın doğrulanmış tema ve karakter özellikleri arasındaki ilişkiyi kısa ve somut açıkla.
- Aday verisinde bulunmayan olay, karakter adı veya alıntı uydurma.
- ai_discoveries alanında ADAYLAR ve kullanıcı kitaplığında bulunmayan, gerçekten yayımlanmış olduğundan yüksek ölçüde emin olduğun en fazla 4 kitap öner.
- ai_discoveries için fiyat, stok, ISBN, baskı veya kapak bilgisi uydurma. Emin olmadığın eseri hiç önerme.
- ai_discoveries gerekçesinde bunun kullanıcının isteğiyle ilişkisini açıkla; doğrulanmamış olay örgüsü ayrıntısı verme.
- Çıktıyı verilen JSON şemasına uygun üret.
"""


def build_prompt(profile: dict, character_description: str, candidates: list[dict], output_limit: int | None = None) -> str:
    import json

    safe_candidates = [{
        "book_title": item["book"]["title"],
        "author": item["book"]["author"],
        "genre": item["book"]["genre"],
        "themes": item["book"]["themes"],
        "character_traits": item["book"]["character_traits"],
        "description": item["book"]["description"],
        "match_score": item["match_score"],
        "already_in_watchlist": item["already_in_watchlist"],
        "score_breakdown": item["score_breakdown"],
    } for item in candidates]
    context = {
        "character_description": character_description,
        "read_books": [book["title"] for book in profile["read_books"]],
        "favorite_books": [book["title"] for book in profile["favorite_books"]],
        "to_read_books": [book["title"] for book in profile["to_read_books"]],
        "abandoned_books": [book["title"] for book in profile.get("abandoned_books", [])],
        "detailed_preferences": profile.get("preferences", {}),
        "output_limit": output_limit or len(candidates),
        "candidates": safe_candidates,
    }
    return "Aşağıdaki doğrulanmış bağlamı yorumla:\n" + json.dumps(context, ensure_ascii=False)

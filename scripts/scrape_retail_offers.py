import argparse
import json
import time

from app.config import settings
from app.database import Repository
from app.services.retailer_offers import fetch_offer


def main() -> None:
    parser = argparse.ArgumentParser(description="İzinli ürün URL'lerinden fiyat/ISBN metadata'sı alır; açıklama saklamaz.")
    parser.add_argument("urls", nargs="+", help="BKM Kitap veya Kitapseç HTTPS ürün adresleri")
    parser.add_argument("--delay", type=float, default=2.0, help="İstekler arası asgari bekleme süresi")
    args = parser.parse_args()
    repository = Repository(settings.database_path)
    results = []
    for index, url in enumerate(args.urls):
        if index:
            time.sleep(max(2.0, args.delay))
        results.append(repository.save_retail_offer(fetch_offer(url)))
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()


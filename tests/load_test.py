"""Opt-in lightweight concurrent health/catalog smoke load: python tests/load_test.py."""
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter
import httpx

URLS = ["http://127.0.0.1:8010/health", "http://127.0.0.1:8010/catalog/books?limit=12&offset=0"] * 50
started = perf_counter()
with httpx.Client(timeout=10) as client, ThreadPoolExecutor(max_workers=10) as pool:
    statuses = list(pool.map(lambda url: client.get(url).status_code, URLS))
elapsed = perf_counter() - started
print({"requests": len(URLS), "seconds": round(elapsed, 2), "rps": round(len(URLS)/elapsed, 1), "errors": sum(code >= 400 for code in statuses)})

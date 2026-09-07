"""HTTPS allowlists, public DNS pinning, no redirects or environment proxies."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit

import requests
import urllib3


PUSH_HOSTS = frozenset({
    "fcm.googleapis.com", "updates.push.services.mozilla.com",
    "web.push.apple.com",
})
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def validate_url(url: str, allowed_hosts: set[str] | frozenset[str]) -> str:
    try:
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or parsed.hostname not in allowed_hosts
                or parsed.username is not None or parsed.password is not None
                or parsed.port not in {None, 443} or parsed.fragment
                or "\\" in url or any(ord(char) < 33 for char in url)):
            raise ValueError
    except ValueError as error:
        raise ValueError("Yalnızca izinli hizmetlerin HTTPS adresleri kullanılabilir.") from error
    return parsed.hostname


def validate_push_endpoint(url: str) -> str:
    validate_url(url, PUSH_HOSTS)
    return url


def public_address(host: str) -> str:
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError as error:
        raise requests.ConnectionError("Hizmet adresi çözümlenemedi.") from error
    if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
        raise ValueError("Yerel, özel veya ayrılmış ağ adreslerine erişim engellendi.")
    return addresses[0][4][0]


class SafeHTTPSession(requests.Session):
    """Connect to the validated IP; preserve the real hostname for TLS and Host.

    Pinning prevents a second DNS lookup from bypassing the public-IP check.
    Only used for public metadata and push delivery, never Supabase credentials.
    """
    def __init__(self, allowed_hosts):
        super().__init__()
        self.allowed_hosts = frozenset(allowed_hosts)
        self.trust_env = False

    def send(self, request, **kwargs):
        host = validate_url(request.url, self.allowed_hosts)
        address = public_address(host)
        parsed = urlsplit(request.url)
        target = (parsed.path or "/") + ("?" + parsed.query if parsed.query else "")
        headers = dict(request.headers)
        headers["Host"] = host
        headers["Accept-Encoding"] = "identity"
        timeout = kwargs.get("timeout") or 20
        if isinstance(timeout, tuple):
            timeout = urllib3.Timeout(connect=timeout[0], read=timeout[1])
        pool = urllib3.HTTPSConnectionPool(address, port=443, server_hostname=host,
                                         assert_hostname=host, cert_reqs="CERT_REQUIRED")
        try:
            raw = pool.urlopen(request.method, target, body=request.body, headers=headers,
                               timeout=timeout, redirect=False, retries=False, preload_content=False)
            try:
                if 300 <= raw.status < 400:
                    raise ValueError("Hizmet yönlendirmeleri güvenlik nedeniyle takip edilmez.")
                if raw.headers.get("Content-Encoding", "identity").lower() not in {"", "identity"}:
                    raise ValueError("Sıkıştırılmış hizmet yanıtı kabul edilmedi.")
                body = raw.read(MAX_RESPONSE_BYTES + 1, decode_content=False)
                if len(body) > MAX_RESPONSE_BYTES:
                    raise ValueError("Hizmet yanıtı boyut sınırını aşıyor.")
                response = requests.Response()
                response.status_code = raw.status
                response.headers = requests.structures.CaseInsensitiveDict(raw.headers)
                response._content = body
                response.encoding = requests.utils.get_encoding_from_headers(response.headers)
                response.url, response.request = request.url, request
                return response
            finally:
                raw.close()
        except urllib3.exceptions.HTTPError as error:
            raise requests.ConnectionError("Güvenli hizmet bağlantısı tamamlanamadı.") from error
        finally:
            pool.close()


def safe_get(url: str, *, allowed_hosts, **kwargs) -> requests.Response:
    with SafeHTTPSession(allowed_hosts) as session:
        return session.get(url, **kwargs)

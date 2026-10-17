"""
SSRF Guard Engine — Defense-in-depth protection against Server-Side Request Forgery
Blocks loopback, private networks, cloud metadata, link-local and DNS rebinding attacks.
"""

import ipaddress
import socket
from typing import List, Optional, Dict
from urllib.parse import urlparse
import httpx

# Blocked IP networks according to RFC 1918, RFC 3927, RFC 4291, Cloud Metadata
BLOCKED_NETWORKS: List[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),        # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),     # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),    # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / Cloud Metadata (169.254.169.254)
    ipaddress.ip_network("0.0.0.0/8"),         # Current network
    ipaddress.ip_network("100.64.0.0/10"),     # Carrier-grade NAT
    ipaddress.ip_network("198.18.0.0/15"),     # Benchmark testing
    ipaddress.ip_network("::1/128"),           # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),         # IPv6 Link-local
    ipaddress.ip_network("::ffff:0:0/96"),     # IPv4-mapped IPv6
]

ALLOWED_SCHEMES = {"http", "https"}


class SSRFValidationError(ValueError):
    """Raised when a URL violates SSRF security policies."""
    pass


class SSRFGuardEngine:
    @staticmethod
    def is_ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
        """Checks if an IP address belongs to any blocked network range."""
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return True
        for net in BLOCKED_NETWORKS:
            if ip in net:
                return True
        return False

    @classmethod
    def validate_url(cls, url: str) -> None:
        """
        Validates URL scheme, resolves hostname to IP addresses,
        and verifies none of the IPs are in blocked private/local subnets.
        """
        if not url or not isinstance(url, str):
            raise SSRFValidationError("URL must be a non-empty string.")

        parsed = urlparse(url.strip())
        if parsed.scheme.lower() not in ALLOWED_SCHEMES:
            raise SSRFValidationError(f"Invalid URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are allowed.")

        hostname = parsed.hostname
        if not hostname:
            raise SSRFValidationError("URL must contain a valid hostname.")

        # Check for numeric or hex IP tricks
        try:
            direct_ip = ipaddress.ip_address(hostname)
            if cls.is_ip_blocked(direct_ip):
                raise SSRFValidationError(f"Access to blocked IP address '{direct_ip}' is prohibited.")
            return
        except ValueError:
            pass

        # Resolve hostname via DNS
        try:
            addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
        except socket.gaierror as e:
            raise SSRFValidationError(f"Could not resolve hostname '{hostname}': {e}") from e

        if not addr_info:
            raise SSRFValidationError(f"No IP addresses resolved for hostname '{hostname}'.")

        for entry in addr_info:
            sockaddr = entry[4]
            ip_str = sockaddr[0]
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if cls.is_ip_blocked(ip_obj):
                    raise SSRFValidationError(
                        f"SSRF violation: Hostname '{hostname}' resolves to restricted IP address '{ip_str}'."
                    )
            except ValueError:
                raise SSRFValidationError(f"Invalid resolved IP address: '{ip_str}'")

    @classmethod
    async def safe_fetch(
        cls,
        url: str,
        timeout: float = 15.0,
        max_bytes: int = 5242880,  # 5MB max
        headers: Optional[Dict[str, str]] = None,
        max_redirects: int = 3
    ) -> httpx.Response:
        """
        Performs a secure HTTP GET request with SSRF validation at every redirect hop.
        """
        current_url = url
        redirect_count = 0

        default_headers = {
            "User-Agent": "AI-Chan-Assistant/1.0 (Security Bot)",
            "Accept": "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8"
        }
        if headers:
            default_headers.update(headers)

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            while True:
                cls.validate_url(current_url)

                try:
                    response = await client.get(current_url, headers=default_headers)
                except httpx.RequestError as e:
                    raise SSRFValidationError(f"Network request failed: {e}") from e

                # Check redirect
                if response.is_redirect:
                    redirect_count += 1
                    if redirect_count > max_redirects:
                        raise SSRFValidationError(f"Too many redirects (exceeded limit of {max_redirects}).")

                    location = response.headers.get("Location")
                    if not location:
                        raise SSRFValidationError("Redirect response missing Location header.")

                    # Handle relative redirect URLs
                    current_url = str(httpx.URL(current_url).join(location))
                    continue

                # Enforce response body size limit
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > max_bytes:
                    raise SSRFValidationError(
                        f"Response size {content_length} bytes exceeds maximum limit of {max_bytes} bytes."
                    )

                if len(response.content) > max_bytes:
                    raise SSRFValidationError(
                        f"Downloaded content {len(response.content)} bytes exceeds limit of {max_bytes} bytes."
                    )

                return response

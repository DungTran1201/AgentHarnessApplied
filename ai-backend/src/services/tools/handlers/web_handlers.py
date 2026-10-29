"""
Web and Retrieval Tool Handlers
Includes SSRF-safe page fetch, content extractor, metadata extractor, sitemap parser,
project document search, and provider-aware external web search (Brave, SerpAPI, DuckDuckGo).
"""

import html
import inspect
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Callable

from src.services.tools.ssrf_guard import SSRFGuardEngine, SSRFValidationError
from src.db import query_all


# ==============================================================================
# 1. FETCH WEBPAGE
# ==============================================================================

async def handle_fetch_webpage(url: str, timeout: float = 15.0) -> Dict[str, Any]:
    """Fetches a public web page with strict SSRF defense."""
    response = await SSRFGuardEngine.safe_fetch(url, timeout=timeout)
    content_type = response.headers.get("content-type", "")

    text_content = response.text

    return {
        "url": str(response.url),
        "status_code": response.status_code,
        "content_type": content_type,
        "content_length_bytes": len(response.content),
        "html": text_content[:100000]  # Cap HTML payload to 100KB for safety
    }


# ==============================================================================
# 2. EXTRACT WEB CONTENT
# ==============================================================================

_STRIP_TAGS_REGEX = re.compile(r"<(script|style|noscript|header|footer|nav|aside)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_HTML_TAG_REGEX = re.compile(r"<[^>]+>")
_MULTIPLE_NEWLINES = re.compile(r"\n\s*\n+")


def handle_extract_web_content(html_content: str, max_chars: int = 20000) -> Dict[str, Any]:
    """Strips HTML boilerplate, scripts, styles, and extracts main readable text."""
    if not html_content or not isinstance(html_content, str):
        return {"text": "", "char_count": 0}

    cleaned = _STRIP_TAGS_REGEX.sub(" ", html_content)
    cleaned = re.sub(r"<(p|br|div|li|h[1-6])[^>]*>", "\n", cleaned, flags=re.IGNORECASE)
    raw_text = _HTML_TAG_REGEX.sub("", cleaned)
    unescaped = html.unescape(raw_text)
    normalized = _MULTIPLE_NEWLINES.sub("\n\n", unescaped).strip()

    truncated = normalized[:max_chars]
    return {
        "text": truncated,
        "char_count": len(truncated),
        "is_truncated": len(normalized) > max_chars
    }


# ==============================================================================
# 3. EXTRACT WEB METADATA
# ==============================================================================

_TITLE_REGEX = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_META_TAG_REGEX = re.compile(r"<meta\s+([^>]+)>", re.IGNORECASE)
_CANONICAL_REGEX = re.compile(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', re.IGNORECASE)


def handle_extract_web_metadata(html_content: str) -> Dict[str, Any]:
    """Extracts title, meta description, canonical URL, and OpenGraph metadata."""
    if not html_content:
        return {}

    title_match = _TITLE_REGEX.search(html_content)
    title = html.unescape(title_match.group(1).strip()) if title_match else None

    canonical_match = _CANONICAL_REGEX.search(html_content)
    canonical = canonical_match.group(1).strip() if canonical_match else None

    metadata = {}
    for meta in _META_TAG_REGEX.finditer(html_content):
        tag_str = meta.group(1)
        name_m = re.search(r'(?:name|property)=["\']([^"\']+)["\']', tag_str, re.IGNORECASE)
        content_m = re.search(r'content=["\']([^"\']+)["\']', tag_str, re.IGNORECASE)
        if name_m and content_m:
            key = name_m.group(1).lower().strip()
            val = html.unescape(content_m.group(1).strip())
            metadata[key] = val

    return {
        "title": title or metadata.get("og:title"),
        "description": metadata.get("description") or metadata.get("og:description"),
        "canonical_url": canonical,
        "og_image": metadata.get("og:image"),
        "og_site_name": metadata.get("og:site_name"),
        "all_meta_tags": metadata
    }


# ==============================================================================
# 4. PARSE SITEMAP
# ==============================================================================

async def handle_parse_sitemap(sitemap_url: str, max_urls: int = 100) -> Dict[str, Any]:
    """Parses an XML sitemap and returns a list of URLs."""
    response = await SSRFGuardEngine.safe_fetch(sitemap_url, timeout=15.0)

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as e:
        raise ValueError(f"Failed to parse sitemap XML: {e}") from e

    urls = []
    for elem in root.iter():
        if elem.tag.endswith("loc") and elem.text:
            url_str = elem.text.strip()
            if url_str:
                urls.append(url_str)
                if len(urls) >= max_urls:
                    break

    return {
        "sitemap_url": sitemap_url,
        "total_urls_found": len(urls),
        "urls": urls
    }


# ==============================================================================
# 5. SEARCH PROJECT DOCUMENTS
# ==============================================================================

def handle_search_project_documents(
    project_id: str,
    query: str,
    limit: int = 10
) -> Dict[str, Any]:
    """Searches within uploaded attachments linked to the current project."""
    if not project_id:
        raise ValueError("project_id is required to search project documents.")

    search_term = f"%{query.strip()}%"
    rows = query_all(
        """
        SELECT id, filename, file_size, mime_type, category, extracted_text, created_at
        FROM attachments
        WHERE project_id = ? AND (filename LIKE ? OR extracted_text LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (project_id, search_term, search_term, max(1, min(50, limit)))
    )

    results = []
    for r in rows:
        text = r.get("extracted_text") or ""
        snippet = text[:300] if text else None
        results.append({
            "attachment_id": r["id"],
            "filename": r["filename"],
            "category": r["category"],
            "size_bytes": r["file_size"],
            "snippet": snippet,
            "created_at": r["created_at"]
        })

    return {
        "project_id": project_id,
        "query": query,
        "count": len(results),
        "documents": results
    }


# ==============================================================================
# 6. EXTERNAL WEB SEARCH (BRAVE / SERPAPI / DUCKDUCKGO ADAPTER)
# ==============================================================================

# Optional injectable adapter hook for unit/regression testing of search credentials
_custom_search_adapters: Dict[str, Callable[[str, str, int, Optional[str]], Any]] = {}


def register_search_provider_adapter(
    provider: str,
    adapter: Callable[[str, str, int, Optional[str]], Any]
) -> None:
    """Registers an injectable search adapter for deterministic testing without live network calls."""
    _custom_search_adapters[provider.lower().strip()] = adapter


def clear_search_provider_adapters() -> None:
    """Clears all registered custom search adapters."""
    _custom_search_adapters.clear()


async def handle_web_search(
    query: str,
    api_key: Optional[str] = None,
    provider: str = "duckduckgo",
    max_results: int = 5,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Adapter for external web search (Brave Search, SerpAPI, DuckDuckGo).
    Resolves user-scoped and system credentials via CredentialService (PERSONAL > SYSTEM > NONE).
    If an external API key is required but missing, raises NEEDS_CONFIGURATION error.
    """
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty.")

    provider_clean = (provider or "duckduckgo").lower().strip()
    if provider_clean == "brave_search":
        provider_clean = "brave"

    # Resolve effective key via CredentialService for the authenticated user_id
    if not api_key and provider_clean in ("brave", "serpapi", "google", "bing"):
        try:
            from src.services.credential_service import CredentialService
            lookup_prov = "serpapi" if provider_clean == "google" else provider_clean
            api_key = CredentialService.get_effective_key(user_id, lookup_prov, raise_on_decryption_error=True)
        except ValueError as dec_err:
            raise ValueError(f"NEEDS_CONFIGURATION: {dec_err}") from dec_err
        except Exception:
            pass

    if provider_clean in ("brave", "serpapi", "google", "bing") and not api_key:
        raise ValueError(
            f"NEEDS_CONFIGURATION: Provider '{provider_clean}' requires an API Key. Configure via Settings -> API Keys."
        )

    # Check injectable test adapter first
    if provider_clean in _custom_search_adapters:
        adapter_fn = _custom_search_adapters[provider_clean]
        res = adapter_fn(query, api_key or "", max_results, user_id)
        if inspect.isawaitable(res):
            res = await res
        return res

    try:
        if provider_clean == "brave":
            import httpx
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": api_key or "",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": query, "count": max(1, min(20, max_results))},
                    headers=headers,
                )
                if resp.status_code in (401, 403):
                    raise ValueError(f"Brave Search API rejected credential (HTTP {resp.status_code}).")
                resp.raise_for_status()
                payload = resp.json()
                web_items = payload.get("web", {}).get("results", [])
                results = [
                    {
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "snippet": item.get("description", ""),
                    }
                    for item in web_items[:max_results]
                ]
                return {
                    "query": query,
                    "provider": "brave",
                    "result_count": len(results),
                    "results": results,
                }

        elif provider_clean in ("serpapi", "google"):
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params={
                        "q": query,
                        "api_key": api_key or "",
                        "num": max(1, min(20, max_results)),
                    },
                )
                if resp.status_code in (401, 403):
                    raise ValueError(f"SerpAPI rejected credential (HTTP {resp.status_code}).")
                resp.raise_for_status()
                payload = resp.json()
                organic = payload.get("organic_results", [])
                results = [
                    {
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                    }
                    for item in organic[:max_results]
                ]
                return {
                    "query": query,
                    "provider": "serpapi",
                    "result_count": len(results),
                    "results": results,
                }

        # Default: DuckDuckGo HTML lite search
        search_url = f"https://html.duckduckgo.com/html/?q={html.escape(query)}"
        response = await SSRFGuardEngine.safe_fetch(search_url, timeout=10.0)

        results = []
        pattern = re.compile(r'<a class="result__url"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.IGNORECASE)
        for m in pattern.finditer(response.text):
            link = m.group(1).strip()
            title = html.unescape(_HTML_TAG_REGEX.sub("", m.group(2)).strip())
            results.append({"title": title, "url": link})
            if len(results) >= max_results:
                break

        return {
            "query": query,
            "provider": provider_clean,
            "result_count": len(results),
            "results": results
        }
    except Exception as e:
        try:
            from src.services.credential_service import redact_secrets_from_text
            clean_err = redact_secrets_from_text(str(e), [api_key])
        except Exception:
            clean_err = str(e)
        raise RuntimeError(f"Web search execution failed: {clean_err}") from e

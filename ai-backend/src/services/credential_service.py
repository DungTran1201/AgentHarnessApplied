"""
Credential and API Key Management Service (SEC-015, FR-SETTINGS-KEYS)

Handles secure storage, resolution precedence, provider validation,
and AES-256-GCM encryption/decryption of user and system API credentials.
Strictly redacts sensitive keys from responses, exceptions, and audit logs.
"""

import os
import re
import time
import uuid
import shutil
import inspect
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Callable

from src.core.config import settings
from src.core.secret_vault import (
    encrypt_secret,
    decrypt_secret,
    mask_secret,
    get_secret_fingerprint
)
from src.db import query_one, query_all, execute_commit

logger = logging.getLogger("credential_service")

# ==============================================================================
# 1. ALLOWLISTED PROVIDER REGISTRY
# ==============================================================================

SUPPORTED_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "google": {
        "id": "google",
        "aliases": ["gemini"],
        "name": "Google Gemini",
        "category": "LLM",
        "env_var": "GEMINI_API_KEY",
        "description": "API Key truy cập các mô hình Google Gemini (Gemini 3.5 Flash, 3.8 Flash, Flash Lite...)",
        "doc_url": "https://aistudio.google.com/app/apikey",
        "placeholder": "AIzaSy...",
        "is_secret": True,
        "default_model": "gemini-3.5-flash-lite",
    },
    "openai": {
        "id": "openai",
        "aliases": [],
        "name": "OpenAI",
        "category": "LLM",
        "env_var": "OPENAI_API_KEY",
        "description": "API Key truy cập OpenAI GPT-4o, GPT-4o Mini và mô hình dự phòng (failover)",
        "doc_url": "https://platform.openai.com/api-keys",
        "placeholder": "sk-proj-...",
        "is_secret": True,
        "default_model": "gpt-4o-mini",
    },
    "anthropic": {
        "id": "anthropic",
        "aliases": ["claude"],
        "name": "Anthropic Claude",
        "category": "LLM",
        "env_var": "ANTHROPIC_API_KEY",
        "description": "API Key truy cập các mô hình Claude 3.5 / 3.7 Sonnet từ Anthropic",
        "doc_url": "https://console.anthropic.com/settings/keys",
        "placeholder": "sk-ant-...",
        "is_secret": True,
        "default_model": "claude-3-7-sonnet",
    },
    "groq": {
        "id": "groq",
        "aliases": [],
        "name": "Groq Cloud",
        "category": "LLM",
        "env_var": "GROQ_API_KEY",
        "description": "API Key truy cập dịch vụ suy luận siêu tốc Groq (Llama 3.3 70B Versatile...)",
        "doc_url": "https://console.groq.com/keys",
        "placeholder": "gsk_...",
        "is_secret": True,
        "default_model": "llama-3.3-70b-versatile",
    },
    "ollama": {
        "id": "ollama",
        "aliases": [],
        "name": "Ollama Local Service",
        "category": "LLM",
        "env_var": "OLLAMA_BASE_URL",
        "description": "URL endpoint máy chủ Ollama chạy trên máy tính cục bộ hoặc mạng LAN (mặc định: http://localhost:11434)",
        "doc_url": "https://ollama.com",
        "placeholder": "http://localhost:11434",
        "is_secret": False,
        "default_model": "llama3",
    },
    "brave": {
        "id": "brave",
        "aliases": ["brave_search"],
        "name": "Brave Search API",
        "category": "SEARCH",
        "env_var": "BRAVE_SEARCH_API_KEY",
        "description": "API Key tìm kiếm web độc lập bảo vệ quyền riêng tư cho Tool Tìm Kiếm Web",
        "doc_url": "https://brave.com/search/api/",
        "placeholder": "BSA...",
        "is_secret": True,
    },
    "serpapi": {
        "id": "serpapi",
        "aliases": [],
        "name": "SerpAPI (Google Search)",
        "category": "SEARCH",
        "env_var": "SERPAPI_API_KEY",
        "description": "API Key tìm kiếm dữ liệu web Google / Bing / Yahoo thông qua SerpAPI adapter",
        "doc_url": "https://serpapi.com/manage-api-key",
        "placeholder": "...",
        "is_secret": True,
    },
}

# Allowlisted env vars that an administrator can modify in system .env
ALLOWLISTED_SYSTEM_ENV_VARS = {
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GROQ_API_KEY",
    "OLLAMA_BASE_URL",
    "BRAVE_SEARCH_API_KEY",
    "SERPAPI_API_KEY",
}


def canonicalize_provider(provider: str) -> Optional[str]:
    """Resolves provider name or alias to canonical ID."""
    if not provider:
        return None
    p_lower = provider.lower().strip()
    if p_lower in SUPPORTED_PROVIDERS:
        return p_lower
    for canon_id, meta in SUPPORTED_PROVIDERS.items():
        if p_lower in meta.get("aliases", []):
            return canon_id
    return None


def redact_secrets_from_text(text: str, secrets: List[Optional[str]] = None) -> str:
    """Removes sensitive keys, Authorization tokens, and given secrets from strings."""
    if not text:
        return ""
    result = text
    # 1. Redact specific secrets if provided
    if secrets:
        for s in secrets:
            if s and len(s) >= 4 and s in result:
                result = result.replace(s, f"[REDACTED_SECRET_{mask_secret(s)}]")
    # 2. Redact patterns like sk-..., AIzaSy..., gsk_..., Bearer ...
    result = re.sub(r"(AIzaSy[A-Za-z0-9_-]{30,45})", "[REDACTED_GEMINI_KEY]", result)
    result = re.sub(r"(sk-[A-Za-z0-9_-]{20,60})", "[REDACTED_API_KEY]", result)
    result = re.sub(r"(gsk_[A-Za-z0-9_-]{20,60})", "[REDACTED_GROQ_KEY]", result)
    result = re.sub(r"(Bearer\s+[A-Za-z0-9_.-]+)", "Bearer [REDACTED_TOKEN]", result, flags=re.IGNORECASE)
    return result


# ==============================================================================
# 2. CREDENTIAL SERVICE
# ==============================================================================

class CredentialService:
    """Manages user-scoped credentials with fallback to system .env."""

    # Optional injectable connection validators for deterministic offline tests
    _custom_validators: Dict[str, Callable[[str], Any]] = {}

    @classmethod
    def register_connection_validator(cls, provider: str, validator: Callable[[str], Any]) -> None:
        """Registers a custom connection validator for a canonical provider (used in tests/mocks)."""
        canon = canonicalize_provider(provider)
        if canon:
            cls._custom_validators[canon] = validator

    @classmethod
    def clear_connection_validators(cls) -> None:
        """Clears all registered custom connection validators."""
        cls._custom_validators.clear()

    @staticmethod
    def _clear_runtime_quota_cooldowns() -> None:
        """Clears model quota circuit-breaker cooldowns when credentials change."""
        try:
            from llm.agent import ModelQuotaTracker
            ModelQuotaTracker.clear_cooldowns()
        except Exception:
            pass

    @staticmethod
    def get_system_key(provider: str) -> Optional[str]:
        """Reads system-level default configuration for a provider from os.environ or settings/.env."""
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            return None
        meta = SUPPORTED_PROVIDERS[canon]
        env_var = meta["env_var"]

        # 1. If explicitly present in os.environ, respect it immediately (including empty override)
        if env_var in os.environ:
            env_val = (os.environ.get(env_var) or "").strip()
            if env_val:
                return env_val
            if canon == "google" and "GOOGLE_API_KEY" in os.environ:
                alt_env = (os.environ.get("GOOGLE_API_KEY") or "").strip()
                if alt_env:
                    return alt_env
            return None

        # 2. Check fallback alias in os.environ for google
        if canon == "google" and "GOOGLE_API_KEY" in os.environ:
            alt = (os.environ.get("GOOGLE_API_KEY") or "").strip()
            if alt:
                return alt

        # 3. Fallback to settings attribute loaded from .env
        val = getattr(settings, env_var, None)
        if val and str(val).strip():
            return str(val).strip()

        return None

    @classmethod
    def get_effective_key_info(cls, user_id: Optional[str], provider: str) -> Dict[str, Any]:
        """
        Resolves full credential metadata and plaintext key with strict precedence:
        PERSONAL > SYSTEM > NONE.
        Never silently falls back to SYSTEM when an active PERSONAL key fails decryption.
        """
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            return {
                "provider": provider,
                "key": None,
                "source": "NONE",
                "has_personal_key": False,
                "has_system_key": False,
                "key_fingerprint": "",
                "masked_hint": "",
                "decryption_error": False,
                "error_message": f"Nhà cung cấp '{provider}' không được hỗ trợ.",
                "updated_at": None,
            }

        meta = SUPPORTED_PROVIDERS[canon]
        system_key = cls.get_system_key(canon)
        has_system = bool(system_key and system_key.strip())

        # 1. User-scoped personal credential (highest precedence: PERSONAL > SYSTEM > NONE)
        if user_id:
            row = query_one(
                """
                SELECT id, key_ciphertext, key_last4, key_fingerprint, validation_status,
                       last_validated_at, last_error_summary, is_active, updated_at
                FROM user_api_keys
                WHERE user_id = ? AND provider = ? AND is_active = 1
                """,
                (user_id, canon)
            )
            if row and row.get("key_ciphertext"):
                try:
                    decrypted = decrypt_secret(row["key_ciphertext"])
                    if decrypted and decrypted.strip():
                        clean_key = decrypted.strip()
                        fp = row.get("key_fingerprint") or get_secret_fingerprint(clean_key)
                        hint = (
                            f"****{row['key_last4']}"
                            if (row.get("key_last4") and meta["is_secret"])
                            else (mask_secret(clean_key) if meta["is_secret"] else clean_key)
                        )
                        return {
                            "provider": canon,
                            "key": clean_key,
                            "source": "PERSONAL",
                            "has_personal_key": True,
                            "has_system_key": has_system,
                            "key_fingerprint": fp,
                            "masked_hint": hint,
                            "decryption_error": False,
                            "error_message": None,
                            "updated_at": row.get("updated_at"),
                        }
                except Exception as err:
                    logger.error(
                        f"Failed to decrypt personal key for user {user_id}, provider {canon}: {err}"
                    )
                    return {
                        "provider": canon,
                        "key": None,
                        "source": "PERSONAL",
                        "has_personal_key": True,
                        "has_system_key": has_system,
                        "key_fingerprint": row.get("key_fingerprint") or "",
                        "masked_hint": f"****{row['key_last4']}" if row.get("key_last4") else "****",
                        "decryption_error": True,
                        "error_message": (
                            "Không thể giải mã khóa API cá nhân đã lưu (SECRET_KEY đã thay đổi hoặc dữ liệu lỗi). "
                            "Vui lòng nhập lại khóa mới hoặc xóa khóa cá nhân để dùng cấu hình mặc định."
                        ),
                        "updated_at": row.get("updated_at"),
                    }

        # 2. System default fallback
        if has_system and system_key:
            clean_sys = system_key.strip()
            return {
                "provider": canon,
                "key": clean_sys,
                "source": "SYSTEM",
                "has_personal_key": False,
                "has_system_key": True,
                "key_fingerprint": get_secret_fingerprint(clean_sys),
                "masked_hint": mask_secret(clean_sys) if meta["is_secret"] else clean_sys,
                "decryption_error": False,
                "error_message": None,
                "updated_at": None,
            }

        # 3. Unconfigured
        return {
            "provider": canon,
            "key": None,
            "source": "NONE",
            "has_personal_key": False,
            "has_system_key": False,
            "key_fingerprint": "",
            "masked_hint": "",
            "decryption_error": False,
            "error_message": None,
            "updated_at": None,
        }

    @classmethod
    def get_effective_key(
        cls,
        user_id: Optional[str],
        provider: str,
        raise_on_decryption_error: bool = False
    ) -> Optional[str]:
        """
        Resolves active key with strict precedence: PERSONAL > SYSTEM > NONE.
        If a stored personal key exists but cannot be decrypted, does NOT silently fall back
        to the system key.
        """
        info = cls.get_effective_key_info(user_id, provider)
        if info.get("decryption_error"):
            if raise_on_decryption_error:
                raise ValueError(info.get("error_message") or "Decryption failed for stored personal key.")
            return None
        return info.get("key")

    @classmethod
    def is_provider_configured(cls, provider: str, user_id: Optional[str] = None) -> bool:
        """Checks if a provider has a valid decryptable key configured either by user or system."""
        key = cls.get_effective_key(user_id, provider)
        return bool(key and key.strip())

    @classmethod
    def get_user_keys_status(cls, user_id: str) -> List[Dict[str, Any]]:
        """Returns non-sensitive metadata and configuration status for all supported providers."""
        personal_rows = query_all(
            """
            SELECT provider, key_ciphertext, key_last4, key_fingerprint, validation_status,
                   last_validated_at, last_error_summary, is_active, updated_at
            FROM user_api_keys WHERE user_id = ?
            """,
            (user_id,)
        )
        personal_by_prov = {r["provider"]: r for r in personal_rows}

        results = []
        for p_id, meta in SUPPORTED_PROVIDERS.items():
            system_key = cls.get_system_key(p_id)
            has_system = bool(system_key and system_key.strip())
            personal_row = personal_by_prov.get(p_id)
            has_personal = bool(personal_row and personal_row.get("is_active"))
            decryption_error = False
            key_fingerprint = ""

            if has_personal and personal_row:
                source = "PERSONAL"
                updated_at = personal_row.get("updated_at")
                last_tested = personal_row.get("last_validated_at")
                try:
                    decrypted = decrypt_secret(personal_row["key_ciphertext"])
                    if not decrypted or not decrypted.strip():
                        raise ValueError("Empty decrypted secret")
                    clean_dec = decrypted.strip()
                    is_configured = True
                    masked_hint = (
                        f"****{personal_row['key_last4']}"
                        if (personal_row.get("key_last4") and meta["is_secret"])
                        else (mask_secret(clean_dec) if meta["is_secret"] else clean_dec)
                    )
                    key_fingerprint = personal_row.get("key_fingerprint") or get_secret_fingerprint(clean_dec)
                    val_status = personal_row.get("validation_status") or "NOT_TESTED"
                    last_error = personal_row.get("last_error_summary")
                except Exception:
                    decryption_error = True
                    is_configured = False
                    masked_hint = f"****{personal_row['key_last4']}" if personal_row.get("key_last4") else "****"
                    key_fingerprint = personal_row.get("key_fingerprint") or ""
                    val_status = "INVALID"
                    last_error = (
                        "Không thể giải mã khóa API cá nhân đã lưu (SECRET_KEY đã thay đổi hoặc dữ liệu lỗi). "
                        "Vui lòng lưu lại khóa mới hoặc xóa khóa cá nhân để khôi phục."
                    )
            elif has_system and system_key:
                source = "SYSTEM"
                is_configured = True
                masked_hint = mask_secret(system_key) if meta["is_secret"] else system_key
                key_fingerprint = get_secret_fingerprint(system_key)
                val_status = "NOT_TESTED"
                last_tested = None
                last_error = None
                updated_at = None
            else:
                source = "NONE"
                is_configured = False
                masked_hint = ""
                key_fingerprint = ""
                val_status = "NOT_TESTED"
                last_tested = None
                last_error = None
                updated_at = None

            results.append({
                "provider": p_id,
                "name": meta["name"],
                "category": meta["category"],
                "env_var": meta["env_var"],
                "description": meta["description"],
                "doc_url": meta["doc_url"],
                "placeholder": meta["placeholder"],
                "is_secret": meta["is_secret"],
                "is_configured": is_configured,
                "source": source,
                "effective_source": source,
                "masked_hint": masked_hint,
                "key_fingerprint": key_fingerprint,
                "has_personal_key": has_personal,
                "has_system_key": has_system,
                "decryption_error": decryption_error,
                "validation_status": val_status,
                "last_validated_at": last_tested,
                "last_error_summary": last_error,
                "updated_at": updated_at,
                "requires_restart": False,
                "routing_supported": True,
            })

        return results

    @classmethod
    def get_provider_diagnostics(cls, user_id: Optional[str], provider: str) -> Dict[str, Any]:
        """Returns non-sensitive credential resolution diagnostics for a provider."""
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Nhà cung cấp '{provider}' không được hỗ trợ trong danh mục allowlist.")

        meta = SUPPORTED_PROVIDERS[canon]
        info = cls.get_effective_key_info(user_id, canon)
        return {
            "provider": canon,
            "name": meta["name"],
            "category": meta["category"],
            "env_var": meta["env_var"],
            "effective_source": info["source"],
            "is_configured": bool(info.get("key")) and not info.get("decryption_error"),
            "has_personal_key": info["has_personal_key"],
            "has_system_key": info["has_system_key"],
            "masked_hint": info["masked_hint"],
            "key_fingerprint": info["key_fingerprint"],
            "decryption_error": info["decryption_error"],
            "error_message": info["error_message"],
            "updated_at": info["updated_at"],
            "routing_supported": True,
            "default_model": meta.get("default_model"),
            "precedence_contract": "PERSONAL > SYSTEM > NONE",
        }

    @classmethod
    def set_user_key(cls, user_id: str, provider: str, raw_key: str) -> Dict[str, Any]:
        """Encrypts and upserts a personal API key for the user."""
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Nhà cung cấp '{provider}' không được hỗ trợ trong danh mục allowlist.")

        key_clean = (raw_key or "").strip()
        if not key_clean:
            raise ValueError("Khóa API không được để trống. Để xóa khóa, hãy dùng thao tác Reset/Delete.")

        if len(key_clean) < 3:
            raise ValueError("Độ dài khóa API không hợp lệ (tối thiểu 3 ký tự).")
        if len(key_clean) > 500:
            raise ValueError("Độ dài khóa API vượt quá giới hạn an toàn (tối đa 500 ký tự).")

        meta = SUPPORTED_PROVIDERS[canon]
        # Encrypt at rest with AES-256-GCM
        ciphertext = encrypt_secret(key_clean)
        last4 = key_clean[-4:] if len(key_clean) >= 4 else key_clean
        fingerprint = get_secret_fingerprint(key_clean)
        masked_hint = f"****{last4}" if meta["is_secret"] else key_clean

        existing = query_one(
            "SELECT id FROM user_api_keys WHERE user_id = ? AND provider = ?",
            (user_id, canon)
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        if existing:
            execute_commit(
                """
                UPDATE user_api_keys
                SET key_ciphertext = ?, key_last4 = ?, key_fingerprint = ?,
                    validation_status = 'NOT_TESTED', last_error_summary = NULL,
                    is_active = 1, updated_at = ?
                WHERE user_id = ? AND provider = ?
                """,
                (ciphertext, last4, fingerprint, now_iso, user_id, canon)
            )
            key_id = existing["id"]
        else:
            key_id = str(uuid.uuid4())
            execute_commit(
                """
                INSERT INTO user_api_keys (
                    id, user_id, provider, key_ciphertext, key_last4, key_fingerprint,
                    validation_status, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'NOT_TESTED', 1, ?, ?)
                """,
                (key_id, user_id, canon, ciphertext, last4, fingerprint, now_iso, now_iso)
            )

        # Clear any rate-limit/quota cooldowns from the previous key so the new key is used immediately
        cls._clear_runtime_quota_cooldowns()

        logger.info(
            f"User {user_id} successfully stored encrypted credential for provider {canon} (fp={fingerprint})."
        )
        return {
            "provider": canon,
            "is_configured": True,
            "source": "PERSONAL",
            "effective_source": "PERSONAL",
            "masked_hint": masked_hint,
            "key_fingerprint": fingerprint,
            "decryption_error": False,
            "validation_status": "NOT_TESTED",
            "updated_at": now_iso,
        }

    @classmethod
    def delete_user_key(cls, user_id: str, provider: str) -> Dict[str, Any]:
        """Removes personal API key for a provider, reverting precedence to system .env default."""
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Nhà cung cấp '{provider}' không được hỗ trợ trong danh mục allowlist.")

        execute_commit(
            "DELETE FROM user_api_keys WHERE user_id = ? AND provider = ?",
            (user_id, canon)
        )

        # Clear any rate-limit/quota cooldowns from the removed personal key
        cls._clear_runtime_quota_cooldowns()

        system_key = cls.get_system_key(canon)
        has_system = bool(system_key and system_key.strip())
        meta = SUPPORTED_PROVIDERS[canon]
        sys_fp = get_secret_fingerprint(system_key) if (has_system and system_key) else ""

        logger.info(f"User {user_id} removed personal credential for provider {canon}.")
        return {
            "provider": canon,
            "is_configured": has_system,
            "source": "SYSTEM" if has_system else "NONE",
            "effective_source": "SYSTEM" if has_system else "NONE",
            "masked_hint": mask_secret(system_key) if (has_system and meta["is_secret"]) else (system_key if has_system else ""),
            "key_fingerprint": sys_fp,
            "has_system_key": has_system,
            "validation_status": "NOT_TESTED",
        }

    @classmethod
    async def validate_connection(
        cls,
        provider: str,
        user_id: Optional[str] = None,
        candidate_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates API key connectivity with the target provider.
        Distinguishes between testing an unsaved candidate_key vs testing the saved effective credential.
        Redacts all secrets from exceptions and responses.
        """
        canon = canonicalize_provider(provider)
        if not canon or canon not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Nhà cung cấp '{provider}' không được hỗ trợ trong danh mục allowlist.")

        is_candidate = bool(candidate_key and candidate_key.strip())
        if is_candidate:
            effective_key = (candidate_key or "").strip()
            tested_source = "CANDIDATE"
        else:
            info = cls.get_effective_key_info(user_id, canon)
            if info.get("decryption_error"):
                err_msg = info.get("error_message") or "Không thể giải mã khóa cá nhân đã lưu."
                if user_id:
                    execute_commit(
                        """
                        UPDATE user_api_keys
                        SET validation_status = 'INVALID', last_validated_at = CURRENT_TIMESTAMP, last_error_summary = ?
                        WHERE user_id = ? AND provider = ?
                        """,
                        (err_msg, user_id, canon)
                    )
                raise ValueError(err_msg)
            effective_key = (info.get("key") or "").strip()
            tested_source = info.get("source") or "NONE"

        if not effective_key:
            raise ValueError(f"Chưa có cấu hình khóa API cho nhà cung cấp {SUPPORTED_PROVIDERS[canon]['name']}.")

        start_time = time.perf_counter()
        tested_at_str = datetime.now(timezone.utc).isoformat()
        status_result = "VALID"
        error_summary = None
        key_fp = get_secret_fingerprint(effective_key)

        try:
            if canon in cls._custom_validators:
                validator_fn = cls._custom_validators[canon]
                res_val = validator_fn(effective_key)
                if inspect.isawaitable(res_val):
                    await res_val
            elif canon == "google":
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI(
                    model="gemini-3.5-flash-lite",
                    google_api_key=effective_key,
                    timeout=10.0,
                    max_retries=0
                )
                await llm.ainvoke("ping")

            elif canon == "openai":
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model="gpt-4o-mini",
                    api_key=effective_key,
                    timeout=10.0,
                    max_retries=0
                )
                await llm.ainvoke("ping")

            elif canon == "anthropic":
                import httpx
                headers = {
                    "x-api-key": effective_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json={
                            "model": "claude-3-7-sonnet-20250219",
                            "max_tokens": 1,
                            "messages": [{"role": "user", "content": "ping"}]
                        }
                    )
                    if resp.status_code in (401, 403):
                        raise ValueError(f"Khóa Anthropic không hợp lệ hoặc không có quyền (HTTP {resp.status_code}).")

            elif canon == "groq":
                import httpx
                headers = {
                    "Authorization": f"Bearer {effective_key}",
                    "Content-Type": "application/json"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
                    if resp.status_code in (401, 403):
                        raise ValueError(f"Khóa Groq không hợp lệ hoặc đã hết hạn (HTTP {resp.status_code}).")

            elif canon == "ollama":
                import httpx
                target_url = effective_key.rstrip("/") + "/api/tags"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(target_url)
                    if resp.status_code != 200:
                        raise ValueError(f"Ollama trả về mã trạng thái không mong đợi: HTTP {resp.status_code}")

            elif canon == "brave":
                import httpx
                headers = {
                    "Accept": "application/json",
                    "X-Subscription-Token": effective_key
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get("https://api.search.brave.com/res/v1/web/search?q=test&count=1", headers=headers)
                    if resp.status_code in (401, 403):
                        raise ValueError(f"Khóa Brave Search không hợp lệ (HTTP {resp.status_code}).")

            elif canon == "serpapi":
                import httpx
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(f"https://serpapi.com/account?api_key={effective_key}")
                    if resp.status_code in (401, 403):
                        raise ValueError(f"Khóa SerpAPI không hợp lệ (HTTP {resp.status_code}).")

            latency_ms = max(1, int((time.perf_counter() - start_time) * 1000))

        except Exception as exc:
            raw_err = str(exc)
            latency_ms = max(1, int((time.perf_counter() - start_time) * 1000))
            clean_err = redact_secrets_from_text(raw_err, [effective_key])
            error_summary = clean_err
            status_result = "INVALID" if any(w in raw_err.lower() for w in ["401", "403", "unauthorized", "invalid", "api_key_invalid"]) else "ERROR"

        # Only update stored personal key status if we actually tested the saved PERSONAL key (not an unsaved candidate!)
        if user_id and not is_candidate and tested_source == "PERSONAL":
            execute_commit(
                """
                UPDATE user_api_keys
                SET validation_status = ?, last_validated_at = ?, last_error_summary = ?
                WHERE user_id = ? AND provider = ?
                """,
                (status_result, tested_at_str, error_summary, user_id, canon)
            )

        provider_name = SUPPORTED_PROVIDERS[canon]["name"]
        source_label = "khóa ứng viên (chưa lưu)" if is_candidate else (
            "khóa cá nhân" if tested_source == "PERSONAL" else "khóa mặc định hệ thống (.env)"
        )
        if status_result == "VALID":
            return {
                "healthy": True,
                "provider": canon,
                "latency_ms": latency_ms,
                "validation_status": "VALID",
                "tested_source": tested_source,
                "key_fingerprint": key_fp,
                "message": f"Kết nối thành công với {provider_name} qua {source_label} (độ trễ {latency_ms}ms).",
                "tested_at": tested_at_str
            }
        else:
            return {
                "healthy": False,
                "provider": canon,
                "latency_ms": latency_ms,
                "validation_status": status_result,
                "tested_source": tested_source,
                "key_fingerprint": key_fp,
                "message": f"Kiểm tra kết nối ({source_label}) thất bại: {error_summary}",
                "tested_at": tested_at_str
            }

    @classmethod
    def update_system_env_variable(
        cls,
        env_var: str,
        new_value: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Safely updates an allowlisted environment variable in the system .env file.
        Uses atomic file replacement with backup preservation.
        Strictly restricted to allowlisted variable names.
        Reports whether a personal key override still shadows the system variable for the current user.
        """
        env_var_clean = (env_var or "").strip().upper()
        if env_var_clean not in ALLOWLISTED_SYSTEM_ENV_VARS:
            raise ValueError(f"Biến '{env_var_clean}' không nằm trong danh mục biến toàn cục được phép cập nhật.")

        val_clean = (new_value or "").strip()

        # Locate .env path relative to backend
        backend_dir = Path(__file__).resolve().parent.parent.parent
        env_file = backend_dir / ".env"
        if not env_file.exists():
            root_env = backend_dir.parent / ".env"
            if root_env.exists():
                env_file = root_env
            else:
                env_file = backend_dir / ".env"

        # Backup existing file before write
        bak_file = env_file.with_suffix(".env.bak")
        lines = []
        if env_file.exists():
            shutil.copy2(env_file, bak_file)
            with open(env_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

        # Update or append key while preserving comments and other variables
        key_pattern = re.compile(rf"^\s*{re.escape(env_var_clean)}\s*=", re.IGNORECASE)
        found = False
        new_lines = []
        for line in lines:
            if key_pattern.match(line):
                new_lines.append(f"{env_var_clean}={val_clean}\n")
                found = True
            else:
                new_lines.append(line)

        if not found:
            if new_lines and not new_lines[-1].endswith("\n"):
                new_lines.append("\n")
            new_lines.append(f"{env_var_clean}={val_clean}\n")

        # Atomic write via temporary file in the same directory
        tmp_file = env_file.with_name(f".env.{uuid.uuid4().hex[:8]}.tmp")
        try:
            with open(tmp_file, "w", encoding="utf-8") as tf:
                tf.writelines(new_lines)
                tf.flush()
                os.fsync(tf.fileno())
            os.replace(tmp_file, env_file)
        finally:
            if tmp_file.exists():
                try:
                    tmp_file.unlink()
                except Exception:
                    pass

        # Update in-memory settings and os.environ immediately
        if hasattr(settings, env_var_clean):
            setattr(settings, env_var_clean, val_clean)
        os.environ[env_var_clean] = val_clean

        cls._clear_runtime_quota_cooldowns()

        # Check if user has a PERSONAL override for this provider
        target_provider = None
        for p_id, meta in SUPPORTED_PROVIDERS.items():
            if meta["env_var"] == env_var_clean:
                target_provider = p_id
                break

        has_personal_override = False
        effective_source = "SYSTEM" if val_clean else "NONE"
        if user_id and target_provider:
            info = cls.get_effective_key_info(user_id, target_provider)
            if info.get("has_personal_key"):
                has_personal_override = True
                effective_source = "PERSONAL"

        base_msg = (
            f"Đã cập nhật {env_var_clean} vào .env và đồng bộ cấu hình hệ thống thành công."
        )
        if has_personal_override:
            base_msg += (
                " Lưu ý: Tài khoản của bạn hiện đang bật Khóa cá nhân (PERSONAL) cho nhà cung cấp này "
                "nên khóa cá nhân vẫn được ưu tiên sử dụng (PERSONAL > SYSTEM). "
                "Hãy xóa khóa cá nhân nếu bạn muốn sử dụng khóa hệ thống vừa cập nhật."
            )

        logger.info(f"System environment variable {env_var_clean} safely updated via atomic write.")
        return {
            "env_var": env_var_clean,
            "provider": target_provider,
            "restart_required": True,
            "has_personal_override": has_personal_override,
            "effective_source": effective_source,
            "masked_hint": mask_secret(val_clean) if val_clean else "",
            "key_fingerprint": get_secret_fingerprint(val_clean) if val_clean else "",
            "message": base_msg
        }

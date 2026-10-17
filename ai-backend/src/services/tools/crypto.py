"""
Cryptographic service for secure storage of Tool API Keys and Secrets
Using AES-256 (Fernet) derived via PBKDF2 from application SECRET_KEY
"""

import base64
import json
import logging
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from src.core.config import settings

logger = logging.getLogger("tools.crypto")

# Static salt for reproducible key derivation from secret key
_SALT = b"ai_chan_tool_secret_salt_v1"


def _get_fernet() -> Fernet:
    """Derives a Fernet 32-byte URL-safe base64 key from settings.SECRET_KEY."""
    raw_secret = getattr(settings, "SECRET_KEY", "ai_chan_fallback_secret_key_32bytes_min!").encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100000,
    )
    derived_key = base64.urlsafe_b64encode(kdf.derive(raw_secret))
    return Fernet(derived_key)


def encrypt_secrets(secrets: Dict[str, str]) -> Optional[str]:
    """Encrypts a dictionary of key-value secrets into a cipher string."""
    if not secrets:
        return None
    try:
        fernet = _get_fernet()
        payload = json.dumps(secrets).encode("utf-8")
        encrypted_bytes = fernet.encrypt(payload)
        return encrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to encrypt secrets: {e}")
        raise ValueError("Encryption failed") from e


def decrypt_secrets(encrypted_str: Optional[str]) -> Dict[str, str]:
    """Decrypts a cipher string back to a dictionary of secrets."""
    if not encrypted_str:
        return {}
    try:
        fernet = _get_fernet()
        decrypted_bytes = fernet.decrypt(encrypted_str.encode("utf-8"))
        return json.loads(decrypted_bytes.decode("utf-8"))
    except Exception as e:
        logger.warning(f"Failed to decrypt secrets (invalid token or key mismatch): {e}")
        return {}


def mask_secret(value: str) -> str:
    """Masks secret value for safe display in UI or logs."""
    if not value:
        return ""
    if len(value) <= 8:
        return "********"
    return f"{value[:3]}...{value[-4:]}"

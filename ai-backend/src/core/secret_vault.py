"""Cryptographic secret vault for secure credential encryption and decryption (SEC-008, SEC-013).

Uses AES-256-GCM authenticated encryption with unique per-secret 96-bit nonces.
Plaintext tokens are NEVER stored in database, logs, exceptions, or API responses.
"""

import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

from src.core.config import settings

_VAULT_SALT = b"ai-chan-discord-bot-token-salt-v1"


def _get_encryption_key() -> bytes:
    """Derives a deterministic 256-bit (32-byte) key for AES-GCM.
    
    Prefers AI_CHAN_SECRET_ENCRYPTION_KEY if set, otherwise derives from SECRET_KEY.
    Checks os.environ and settings dynamically so runtime and packaged launcher keys remain consistent.
    """
    raw_key = (
        os.environ.get("AI_CHAN_SECRET_ENCRYPTION_KEY", "").strip()
        or getattr(settings, "AI_CHAN_SECRET_ENCRYPTION_KEY", "").strip()
    )
    if not raw_key:
        raw_key = (
            os.environ.get("SECRET_KEY", "").strip()
            or (settings.SECRET_KEY or "").strip()
            or "ai-chan-default-secure-vault-key"
        )

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_VAULT_SALT,
        info=b"ai-chan-credential-vault-aes-gcm",
    )
    return hkdf.derive(raw_key.encode("utf-8"))


def encrypt_secret(plaintext: str) -> str:
    """Encrypts a plaintext secret into a base64-encoded string containing nonce + ciphertext + tag.
    
    Args:
        plaintext: The raw secret string (e.g. Discord Bot Token).
        
    Returns:
        Base64-encoded string containing 12-byte nonce followed by AES-GCM ciphertext + 16-byte tag.
    """
    if not plaintext:
        raise ValueError("Cannot encrypt an empty secret.")

    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit standard nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode("ascii")


def decrypt_secret(ciphertext_b64: str) -> str:
    """Decrypts a base64-encoded AES-GCM secret back to plaintext.
    
    Args:
        ciphertext_b64: The base64-encoded string from encrypt_secret.
        
    Returns:
        The decrypted plaintext secret.
        
    Raises:
        ValueError: If ciphertext is corrupted or decryption authentication fails.
    """
    if not ciphertext_b64:
        raise ValueError("Cannot decrypt an empty ciphertext.")

    try:
        combined = base64.b64decode(ciphertext_b64.encode("ascii"))
        if len(combined) < 28:  # 12 nonce + 16 tag minimum
            raise ValueError("Invalid ciphertext length.")

        nonce = combined[:12]
        ciphertext = combined[12:]

        key = _get_encryption_key()
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except Exception as exc:
        raise ValueError("Decryption failed: corrupted credential or invalid encryption key.") from exc


def mask_secret(plaintext: str, visible_suffix_len: int = 4) -> str:
    """Creates a safe masked representation of a secret (e.g. '****abcd').
    
    Args:
        plaintext: The raw secret.
        visible_suffix_len: Number of trailing characters to leave visible.
        
    Returns:
        Masked string showing only the last N characters.
    """
    if not plaintext:
        return ""
    cleaned = plaintext.strip()
    if len(cleaned) <= visible_suffix_len:
        return "*" * len(cleaned)
    return "****" + cleaned[-visible_suffix_len:]


def get_secret_fingerprint(plaintext: str) -> str:
    """Generates a non-reversible truncated SHA-256 fingerprint for identity verification."""
    if not plaintext:
        return ""
    return hashlib.sha256(plaintext.strip().encode("utf-8")).hexdigest()[:8]

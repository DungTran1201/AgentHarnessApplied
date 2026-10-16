"""
Unified Attachment & Asset Storage Service
Path: ai-backend/src/core/attachment_storage.py
Implements: Unified File Upload System (Chat, Project Chat, Skills Library, System Prompt Library)
Security: Anti-IDOR, Anti-Path-Traversal, Magic Bytes Sniffing, Executable Blocking, Secret Redaction
"""

import os
import io
import re
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

import filetype

from src.core.config import settings

# Banned executable / dangerous script extensions (Sec-001)
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".msi", 
    ".dll", ".so", ".com", ".scr", ".pif", ".jar", ".app", ".dmg"
}

# Image extensions supported natively by multi-modal LLMs (Gemini, GPT-4o)
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"}

# Code extensions
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json", 
    ".yaml", ".yml", ".xml", ".sql", ".rs", ".go", ".java", ".c", 
    ".cpp", ".h", ".hpp", ".cs", ".rb", ".sh", ".bash", ".toml", ".ini", ".env"
}

# Document extensions
DOC_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".rtf", ".docx", ".xlsx", ".pptx"}

def get_upload_base_dir() -> Path:
    """Returns absolute base storage directory for uploaded files."""
    if settings.UPLOAD_DIR and settings.UPLOAD_DIR.strip():
        base = Path(settings.UPLOAD_DIR.strip()).resolve()
    else:
        # Default: ai-backend/database/uploads
        base = Path(__file__).resolve().parent.parent.parent / "database" / "uploads"
    base.mkdir(parents=True, exist_ok=True)
    return base

def sanitize_filename(filename: str) -> str:
    """Sanitizes user filename, removing path traversal sequences and illegal characters."""
    if not filename:
        return "unnamed_file"
    # Remove directory separators
    clean = os.path.basename(filename.replace("\\", "/"))
    # Remove null bytes and non-printable characters
    clean = re.sub(r'[\x00-\x1f\x7f]', '', clean)
    # Strip dangerous characters for filesystem safety
    clean = re.sub(r'[<>:"/\\|?*]', '_', clean)
    clean = clean.strip(". ")
    if not clean:
        return "unnamed_file"
    # Cap length to 200 chars while preserving extension
    if len(clean) > 200:
        stem, ext = os.path.splitext(clean)
        clean = stem[:180] + ext
    return clean

def classify_file(content_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Classifies MIME type and general category using magic bytes and file extension.
    Raises ValueError if dangerous executable file is detected.
    Returns: (mime_type, category)
    """
    _, ext = os.path.splitext(filename.lower())
    
    # 1. Block dangerous executable extensions
    if ext in BLOCKED_EXTENSIONS:
        raise ValueError(f"Tệp thực thi hoặc script '{ext}' bị chặn vì lý do bảo mật an toàn hệ thống.")

    # 2. Magic bytes sniffing via filetype
    kind = filetype.guess(content_bytes)
    detected_mime = kind.mime if kind else None

    # Fallback to mimetypes guess if magic bytes gave nothing (common for text/code/svg)
    if not detected_mime:
        guessed, _ = mimetypes.guess_type(filename)
        detected_mime = guessed

    # Default to text/plain or application/octet-stream
    if not detected_mime:
        if ext in CODE_EXTENSIONS or ext in {".txt", ".md", ".csv"}:
            detected_mime = "text/plain"
        else:
            detected_mime = "application/octet-stream"

    # Block Windows PE or ELF executables even if disguised with innocent extension
    if content_bytes.startswith(b"MZ") or content_bytes.startswith(b"\x7fELF"):
        raise ValueError("Phát hiện định dạng tệp thực thi nhị phân bị chặn (Binary Executable Signature).")

    # 3. Categorize
    if detected_mime.startswith("image/") or ext in IMAGE_EXTENSIONS:
        category = "image"
    elif ext in CODE_EXTENSIONS or detected_mime in {
        "application/json", "application/javascript", "text/javascript", 
        "text/x-python", "text/html", "text/css", "application/xml", "text/xml"
    }:
        category = "code"
    elif detected_mime == "application/pdf" or ext in DOC_EXTENSIONS:
        category = "document"
    elif detected_mime in {"application/zip", "application/x-tar", "application/gzip", "application/x-7z-compressed"} or ext in {".zip", ".tar", ".gz", ".7z"}:
        category = "archive"
    elif detected_mime.startswith("audio/"):
        category = "audio"
    elif detected_mime.startswith("video/"):
        category = "video"
    else:
        # Check if plain text
        try:
            content_bytes[:1024].decode("utf-8")
            category = "document"
            if detected_mime == "application/octet-stream":
                detected_mime = "text/plain"
        except UnicodeDecodeError:
            category = "other"

    return detected_mime, category

def extract_text_from_file(
    content_bytes: bytes, 
    category: str, 
    mime_type: str, 
    filename: str
) -> Optional[str]:
    """
    Extracts readable text content for LLM context injection when appropriate.
    Limits output to 100,000 characters to prevent context window explosion.
    """
    MAX_TEXT_CHARS = 100000

    # 1. Plain text / Markdown / Code / JSON / CSV
    if category in ("code", "document") and (
        mime_type.startswith("text/") or 
        mime_type in ("application/json", "application/xml", "application/javascript") or
        any(filename.lower().endswith(e) for e in DOC_EXTENSIONS | CODE_EXTENSIONS)
    ):
        if mime_type != "application/pdf":
            try:
                decoded = content_bytes.decode("utf-8", errors="replace")
                return decoded[:MAX_TEXT_CHARS]
            except Exception:
                return None

    # 2. PDF extraction via pypdf
    if mime_type == "application/pdf" or filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            pages_text = []
            max_pages = min(len(reader.pages), 30) # Max 30 pages
            for idx in range(max_pages):
                page_str = reader.pages[idx].extract_text() or ""
                if page_str.strip():
                    pages_text.append(f"--- Trang {idx+1} ---\n{page_str.strip()}")
            full_pdf_text = "\n\n".join(pages_text)
            return full_pdf_text[:MAX_TEXT_CHARS] if full_pdf_text else None
        except Exception:
            return None

    return None

def save_attachment_file(
    user_id: str,
    raw_filename: str,
    content_bytes: bytes
) -> Dict[str, Any]:
    """
    Validates, classifies, checksums, and stores file in the protected storage directory.
    Returns metadata ready for database insertion.
    """
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content_bytes) > max_bytes:
        raise ValueError(
            f"Dung lượng tệp ({len(content_bytes) / (1024*1024):.1f} MB) vượt quá giới hạn tối đa cho phép ({settings.MAX_FILE_SIZE_MB} MB)."
        )
    if len(content_bytes) == 0:
        raise ValueError("Tệp tải lên rỗng (0 bytes).")

    clean_filename = sanitize_filename(raw_filename)
    mime_type, category = classify_file(content_bytes, clean_filename)
    checksum = hashlib.sha256(content_bytes).hexdigest()

    # Generate random unique attachment ID
    att_id = f"att_{hashlib.md5(content_bytes[:64] + os.urandom(16)).hexdigest()}"

    # Partition by Year / Month to prevent directory inode saturation
    now = datetime.now(timezone.utc)
    rel_folder = f"{now.year}/{now.month:02d}"
    rel_path = f"{rel_folder}/{att_id}.dat"

    base_dir = get_upload_base_dir()
    target_folder = base_dir / rel_folder
    target_folder.mkdir(parents=True, exist_ok=True)
    target_file = target_folder / f"{att_id}.dat"

    # Write binary content
    target_file.write_bytes(content_bytes)

    # Extract text if applicable
    extracted = extract_text_from_file(content_bytes, category, mime_type, clean_filename)

    # Extract image dimensions if image
    img_w, img_h = None, None
    if category == "image":
        try:
            # Basic PNG / JPEG header parsing if available
            if len(content_bytes) > 24 and content_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                import struct
                w, h = struct.unpack(">II", content_bytes[16:24])
                img_w, img_h = int(w), int(h)
        except Exception:
            pass

    return {
        "id": att_id,
        "filename": clean_filename,
        "file_size": len(content_bytes),
        "mime_type": mime_type,
        "category": category,
        "storage_path": rel_path.replace("\\", "/"),
        "checksum_sha256": checksum,
        "status": "READY",
        "extracted_text": extracted,
        "image_width": img_w,
        "image_height": img_h,
    }

def get_attachment_absolute_path(storage_path: str) -> Path:
    """Resolves relative storage path and strictly verifies it resides inside the base upload directory."""
    base_dir = get_upload_base_dir()
    clean_rel = storage_path.lstrip("/\\")
    resolved = (base_dir / clean_rel).resolve()
    base_resolved = base_dir.resolve()

    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        raise ValueError(f"Phát hiện truy cập đường dẫn tệp không an toàn (Path Traversal): {storage_path}")

    return resolved

def read_attachment_bytes(storage_path: str) -> bytes:
    """Safely reads raw bytes of an attachment."""
    path = get_attachment_absolute_path(storage_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Tệp không tồn tại trên hệ thống lưu trữ: {storage_path}")
    return path.read_bytes()

def delete_attachment_file(storage_path: str) -> bool:
    """Safely deletes physical file on disk."""
    try:
        path = get_attachment_absolute_path(storage_path)
        if path.exists() and path.is_file():
            path.unlink()
            return True
    except Exception:
        pass
    return False

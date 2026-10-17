"""
Storage Sandbox — Path traversal defense and safe filesystem isolation
Guarantees file tools only access verified data within authorized directories.
"""

import os
from pathlib import Path
from typing import List, Optional

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_ALLOWED_DIRS: List[Path] = [
    (BACKEND_DIR / "database" / "uploads").resolve(),
    (BACKEND_DIR / "data" / "storage").resolve(),
]


class StorageSandboxError(PermissionError):
    """Raised when an unauthorized path traversal is attempted."""
    pass


class StorageSandbox:
    @classmethod
    def get_allowed_roots(cls, additional_dirs: Optional[List[Path]] = None) -> List[Path]:
        roots = list(DEFAULT_ALLOWED_DIRS)
        if additional_dirs:
            for p in additional_dirs:
                if p:
                    roots.append(Path(p).resolve())
        return roots

    @classmethod
    def resolve_safe_path(cls, file_path_str: str, allowed_dirs: Optional[List[Path]] = None) -> Path:
        """
        Normalizes and resolves the path, checking that it resides within
        an allowed root directory to prevent directory traversal and symlink escapes.
        """
        if not file_path_str or not isinstance(file_path_str, str):
            raise StorageSandboxError("File path must be a non-empty string.")

        # Block explicit null bytes
        if "\0" in file_path_str:
            raise StorageSandboxError("Null byte injection detected in file path.")

        raw_path = Path(file_path_str)

        # If path is relative, resolve against the default uploads directory
        if not raw_path.is_absolute():
            resolved = (DEFAULT_ALLOWED_DIRS[0] / raw_path).resolve()
        else:
            resolved = raw_path.resolve()

        # Check bounds
        allowed_roots = cls.get_allowed_roots(allowed_dirs)
        is_safe = False
        for root in allowed_roots:
            try:
                if resolved.is_relative_to(root):
                    is_safe = True
                    break
            except AttributeError:
                # Fallback for Python < 3.9 compatibility
                if str(resolved).startswith(str(root)):
                    is_safe = True
                    break

        if not is_safe:
            raise StorageSandboxError(
                f"Path traversal blocked: Path '{file_path_str}' is outside allowed storage sandbox boundaries."
            )

        if not resolved.exists():
            raise FileNotFoundError(f"File not found: '{file_path_str}'")

        if not resolved.is_file():
            raise StorageSandboxError(f"Target path '{file_path_str}' is not a regular file.")

        return resolved

"""
Unified Text File Import Service for AI-Chan
Supports importing text files (.md, .markdown, .txt, .rst, .json, .yaml, .yml, .toml, .xml, .csv)
into Skills Library, Rules Library, and System Prompts Library.
"""

import os
import re
import json
import uuid
import yaml
import logging
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from fastapi import HTTPException, status

from src.db import query_one, execute_commit
from src.core.skill_validator import (
    validate_skill_content,
    split_frontmatter_and_body,
    NAME_REGEX
)
from src.core.skill_storage import (
    create_skill_filesystem,
    list_skill_files
)
from src.services.rule_service import (
    RuleService,
    RuleCreateRequest,
    RuleResponse
)

logger = logging.getLogger("text_import_service")

# Allowlisted text file extensions (lowercase)
ALLOWED_TEXT_EXTENSIONS = {
    ".md",
    ".markdown",
    ".txt",
    ".rst",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".csv"
}

# 5 MB maximum file size limit
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


class TextFileImportRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255, description="Tên tệp gốc của người dùng")
    content: str = Field(..., min_length=1, description="Nội dung văn bản đã giải mã")
    name: Optional[str] = Field(default=None, max_length=100, description="Tên tùy chỉnh cho mục thư viện")
    description: Optional[str] = Field(default=None, max_length=1024, description="Mô tả tùy chỉnh cho mục thư viện")
    # Rule-specific fields
    activation_mode: Optional[str] = Field(default=None, description="Chế độ kích hoạt cho Rule")
    glob_patterns: Optional[List[str]] = Field(default=None, description="Glob patterns cho Rule")
    tags: Optional[List[str]] = Field(default=None, description="Danh sách tags cho Rule")
    priority: Optional[int] = Field(default=None, ge=0, le=100, description="Mức độ ưu tiên cho Rule")
    # Skill-specific fields
    action: Optional[str] = Field(default="ACTIVATE", description="'ACTIVATE' hoặc 'SAVE_DRAFT'")
    license: Optional[str] = Field(default=None, max_length=255)
    compatibility: Optional[str] = Field(default=None, max_length=500)
    allowed_tools: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class TextImportService:
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Làm sạch tên file, loại bỏ path traversal."""
        clean = os.path.basename(filename or "").strip()
        # Loại bỏ ký tự điều hướng thư mục
        clean = clean.replace("..", "").replace("/", "").replace("\\", "")
        return clean or "untitled.txt"

    @staticmethod
    def get_extension(filename: str) -> str:
        """Lấy phần mở rộng chuẩn hóa chữ thường."""
        _, ext = os.path.splitext(filename or "")
        return ext.lower()

    @staticmethod
    def is_binary_bytes(content: bytes) -> bool:
        """
        Kiểm tra dấu hiệu file nhị phân:
        1. Chứa byte null (b'\\x00') trong nội dung.
        2. Tỉ lệ ký tự control không thể in cao hơn ngưỡng cho phép.
        """
        if not content:
            return False
        if b"\x00" in content:
            return True

        # Kiểm tra 4096 byte đầu tiên để phát hiện control characters
        sample = content[:4096]
        # Các byte văn bản hợp lệ: tab (9), newline (10), carriage return (13), printable ASCII (32-126), và UTF-8 multibyte (>= 128)
        non_text = sum(1 for byte in sample if byte < 32 and byte not in (9, 10, 13))
        if len(sample) > 0 and (non_text / len(sample)) > 0.30:
            return True

        return False

    @classmethod
    def validate_and_decode_bytes(cls, filename: str, content_bytes: bytes, max_size: int = MAX_FILE_SIZE_BYTES) -> str:
        """
        Xác thực và giải mã nội dung file:
        - Kiểm tra allowlist phần mở rộng
        - Kiểm tra dung lượng
        - Phát hiện nhị phân
        - Giải mã UTF-8 / UTF-8 BOM
        """
        clean_name = cls.sanitize_filename(filename)
        ext = cls.get_extension(clean_name)

        if ext not in ALLOWED_TEXT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Định dạng tệp '{ext}' không được hỗ trợ. Các định dạng cho phép: {', '.join(sorted(ALLOWED_TEXT_EXTENSIONS))}."
            )

        if len(content_bytes) > max_size:
            max_mb = max_size // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Dung lượng tệp ({len(content_bytes) / 1024 / 1024:.2f}MB) vượt quá giới hạn tối đa {max_mb}MB."
            )

        if cls.is_binary_bytes(content_bytes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tệp có dấu hiệu chứa dữ liệu nhị phân hoặc không phải là văn bản thuần túy."
            )

        try:
            # utf-8-sig tự động gỡ bỏ BOM nếu có
            text = content_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                text = content_bytes.decode("utf-8")
            except UnicodeDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nội dung tệp không thể giải mã theo chuẩn UTF-8 hoặc UTF-8 BOM: {str(e)}."
                )

        # Gỡ bỏ ký tự BOM nếu còn sót lại trong chuỗi Unicode
        text = text.lstrip("\ufeff")

        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        if not normalized.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nội dung tệp rỗng hoặc chỉ chứa khoảng trắng."
            )

        return normalized

    @staticmethod
    def extract_title_and_frontmatter(filename: str, content: str) -> Tuple[Optional[dict], str, str]:
        """
        Tách YAML frontmatter (nếu có), Markdown body, và gợi ý tên mục từ:
        1. Frontmatter (name/title)
        2. Dòng heading Markdown đầu tiên (# ...)
        3. Tên file gốc (bỏ extension)
        """
        frontmatter_text, body = split_frontmatter_and_body(content)
        meta_dict = None
        if frontmatter_text:
            try:
                parsed = yaml.safe_load(frontmatter_text)
                if isinstance(parsed, dict):
                    meta_dict = parsed
            except Exception:
                pass

        suggested_title = ""
        if meta_dict:
            suggested_title = str(meta_dict.get("name") or meta_dict.get("title") or "").strip()

        if not suggested_title:
            # Tìm first markdown heading
            for line in body.split("\n"):
                stripped = line.strip()
                if stripped.startswith("#"):
                    heading_text = stripped.lstrip("#").strip()
                    if heading_text:
                        suggested_title = heading_text[:100]
                        break

        if not suggested_title:
            base_name, _ = os.path.splitext(os.path.basename(filename or "untitled"))
            # Chuẩn hóa tên file thành tiêu đề dễ đọc
            suggested_title = base_name.replace("_", " ").replace("-", " ").strip()

        return meta_dict, body, suggested_title

    @staticmethod
    def to_kebab_case(s: str) -> str:
        """Chuyển chuỗi thành định dạng kebab-case hợp lệ cho Skill name (a-z, 0-9, -)."""
        # Thay thế ký tự không phải chữ và số thành '-'
        cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", s.strip().lower())
        # Bỏ dấu '-' ở đầu và cuối
        cleaned = cleaned.strip("-")
        # Gộp các dấu '-' liên tiếp
        cleaned = re.sub(r"-+", "-", cleaned)
        return cleaned[:64] or "custom-skill"

    # ==========================================================================
    # IMPORT SKILL
    # ==========================================================================
    @classmethod
    def import_skill(
        cls,
        user_id: str,
        filename: str,
        content: str,
        override_name: Optional[str] = None,
        override_desc: Optional[str] = None,
        action: str = "ACTIVATE",
        license_val: Optional[str] = None,
        compatibility: Optional[str] = None,
        allowed_tools: Optional[str] = None,
        extra_metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Nhập nội dung văn bản thành một Agent Skill mới:
        - Phân tích cú pháp SKILL.md frontmatter nếu có
        - Chuẩn hóa name theo chuẩn Agent Skills Specification (kebab-case)
        - Tạo cấu trúc thư mục lưu trữ thực tế
        - Ghi nhận vào DB với source_type = 'IMPORTED'
        """
        meta_dict, body, suggested = cls.extract_title_and_frontmatter(filename, content)

        # Xác định tên kỹ năng
        candidate_name = (override_name or (meta_dict.get("name") if meta_dict else None) or suggested).strip()
        skill_name = cls.to_kebab_case(candidate_name)

        if not NAME_REGEX.match(skill_name):
            skill_name = "imported-skill"

        # Kiểm tra trùng tên kỹ năng
        existing = query_one(
            "SELECT id FROM skills WHERE user_id = ? AND name = ? COLLATE NOCASE",
            (user_id, skill_name)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "SKILL_NAME_CONFLICT",
                    "message": f"Kỹ năng mang tên '{skill_name}' đã tồn tại trong tài khoản của bạn. Vui lòng chọn tên khác."
                }
            )

        # Xác định mô tả
        description = (
            override_desc or
            (meta_dict.get("description") if meta_dict else None) or
            f"Kỹ năng được nhập từ tệp {cls.sanitize_filename(filename)}"
        ).strip()[:1024]

        # Ráp SKILL.md đầy đủ
        skill_license = license_val or (meta_dict.get("license") if meta_dict else None)
        skill_compat = compatibility or (meta_dict.get("compatibility") if meta_dict else None)
        skill_tools = allowed_tools or (meta_dict.get("allowed-tools") if meta_dict else None)
        skill_meta = extra_metadata or (meta_dict.get("metadata") if meta_dict and isinstance(meta_dict.get("metadata"), dict) else {})

        # Xây dựng lại frontmatter chuẩn
        lines = ["---", f"name: {skill_name}", f"description: {description}"]
        if skill_license:
            lines.append(f"license: {skill_license}")
        if skill_compat:
            lines.append(f"compatibility: {skill_compat}")
        if skill_tools:
            lines.append(f"allowed-tools: {skill_tools}")
        if skill_meta:
            lines.append("metadata:")
            for k, v in skill_meta.items():
                lines.append(f"  {k}: \"{v}\"")
        lines.append("---")
        lines.append("")
        body_to_save = body.strip() or f"# {skill_name}\n\nHướng dẫn kỹ năng được nhập từ {filename}."
        lines.append(body_to_save)
        final_skill_md = "\n".join(lines)

        # Thẩm định theo đặc tả chuẩn
        report = validate_skill_content(final_skill_md, parent_folder_name=skill_name)
        if action == "ACTIVATE" and not report.is_valid:
            # Nếu người dùng muốn kích hoạt ngay nhưng có lỗi đặc tả
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "SKILL_VALIDATION_FAILED",
                    "message": "Không thể kích hoạt kỹ năng do có lỗi không tuân thủ đặc tả chuẩn Agent Skills.",
                    "errors": [e.model_dump() for e in report.errors],
                    "warnings": [w.model_dump() for w in report.warnings]
                }
            )

        # Tạo thư mục vật lý
        skill_id = f"skl_{uuid.uuid4().hex[:12]}"
        try:
            skill_dir = create_skill_filesystem(user_id, skill_name, final_skill_md)
        except Exception as e:
            logger.error(f"Lỗi khi khởi tạo thư mục kỹ năng: {e}")
            raise HTTPException(status_code=500, detail=f"Không thể khởi tạo thư mục kỹ năng: {str(e)}")

        final_status = "VALID" if (report.is_valid and action == "ACTIVATE") else "DRAFT"
        metadata_json_str = json.dumps(skill_meta)

        execute_commit(
            """
            INSERT INTO skills (
                id, user_id, name, description, license, compatibility, allowed_tools,
                metadata_json, status, source_type, storage_path, is_valid, last_validated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                skill_id,
                user_id,
                skill_name,
                description,
                skill_license,
                skill_compat,
                skill_tools,
                metadata_json_str,
                final_status,
                str(skill_dir),
                1 if report.is_valid else 0
            )
        )

        files = list_skill_files(str(skill_dir))
        created_row = query_one("SELECT created_at, updated_at FROM skills WHERE id = ?", (skill_id,))

        logger.info(
            "Nhập Skill thành công: id=%s, user_id=%s, name='%s', file='%s'",
            skill_id, user_id, skill_name, filename
        )

        return {
            "id": skill_id,
            "user_id": user_id,
            "name": skill_name,
            "description": description,
            "license": skill_license,
            "compatibility": skill_compat,
            "allowed_tools": skill_tools,
            "metadata": skill_meta,
            "raw_skill_md": final_skill_md,
            "status": final_status,
            "source_type": "IMPORTED",
            "storage_path": str(skill_dir),
            "is_valid": report.is_valid,
            "file_tree": files,
            "validation_report": report.model_dump(),
            "created_at": str(created_row["created_at"]),
            "updated_at": str(created_row["updated_at"])
        }

    # ==========================================================================
    # IMPORT RULE
    # ==========================================================================
    @classmethod
    def import_rule(
        cls,
        user_id: str,
        filename: str,
        content: str,
        override_name: Optional[str] = None,
        override_desc: Optional[str] = None,
        activation_mode: Optional[str] = None,
        glob_patterns: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        priority: Optional[int] = None
    ) -> RuleResponse:
        """
        Nhập nội dung văn bản thành một Rule mới:
        - Phân tích frontmatter nếu có (name, description, activation_mode, glob_patterns, tags, priority)
        - Tạo rule có scope = 'user'
        - Không tự động kích hoạt toàn cục cho các dự án hiện có
        - Tái sử dụng RuleService.create_rule để đảm bảo toàn bộ validation và OCC
        """
        meta_dict, body, suggested = cls.extract_title_and_frontmatter(filename, content)

        # Xác định tên rule
        rule_name = (override_name or (meta_dict.get("name") if meta_dict else None) or suggested).strip()
        if not rule_name:
            rule_name = "Imported Rule"
        rule_name = rule_name[:100]

        # Xác định mô tả
        description = override_desc
        if not description and meta_dict:
            description = meta_dict.get("description")
        if not description:
            description = f"Quy tắc được nhập từ tệp {cls.sanitize_filename(filename)}"
        description = str(description).strip()[:500]

        # Xác định activation_mode
        mode = activation_mode or (meta_dict.get("activation_mode") if meta_dict else None) or "always_on"
        if mode not in {"always_on", "model_decision", "glob", "manual"}:
            mode = "always_on"

        # Glob patterns
        globs = glob_patterns
        if globs is None and meta_dict and isinstance(meta_dict.get("glob_patterns"), list):
            globs = [str(p) for p in meta_dict["glob_patterns"]]
        if globs is None:
            globs = []

        # Tags
        rule_tags = tags
        if rule_tags is None and meta_dict:
            t = meta_dict.get("tags") or meta_dict.get("category")
            if isinstance(t, list):
                rule_tags = [str(x) for x in t]
            elif isinstance(t, str):
                rule_tags = [x.strip() for x in t.split(",") if x.strip()]
        if rule_tags is None:
            rule_tags = ["imported"]

        # Priority
        rule_priority = priority
        if rule_priority is None and meta_dict and "priority" in meta_dict:
            try:
                rule_priority = int(meta_dict["priority"])
            except Exception:
                rule_priority = 50
        if rule_priority is None:
            rule_priority = 50

        # Body: Nếu có frontmatter, dùng body; nếu không, dùng toàn bộ nội dung
        final_content = body.strip() if meta_dict else content.strip()
        if len(final_content) > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nội dung quy tắc vượt quá giới hạn tối đa 10.000 ký tự (hiện có: {len(final_content)} ký tự)."
            )

        req = RuleCreateRequest(
            name=rule_name,
            description=description,
            content=final_content,
            activation_mode=mode,
            glob_patterns=globs,
            tags=rule_tags,
            priority=max(0, min(100, rule_priority))
        )

        created = RuleService.create_rule(user_id=user_id, req=req)

        logger.info(
            "Nhập Rule thành công: id=%s, user_id=%s, name='%s', file='%s'",
            created.id, user_id, rule_name, filename
        )
        return created

    # ==========================================================================
    # IMPORT SYSTEM PROMPT
    # ==========================================================================
    @classmethod
    def import_system_prompt(
        cls,
        user_id: str,
        filename: str,
        content: str,
        override_name: Optional[str] = None,
        override_desc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Nhập nội dung văn bản thành một System Prompt mới:
        - Phân tích frontmatter nếu có
        - Bảo toàn Unicode, Markdown, line endings, và template placeholders
        - Kiểm tra trùng tên (NOCASE) -> 409 Conflict
        """
        meta_dict, body, suggested = cls.extract_title_and_frontmatter(filename, content)

        prompt_name = (override_name or (meta_dict.get("name") if meta_dict else None) or suggested).strip()
        if not prompt_name:
            prompt_name = "Imported System Prompt"
        prompt_name = prompt_name[:100]

        description = override_desc
        if not description and meta_dict:
            description = meta_dict.get("description")
        if not description:
            description = f"Chỉ dẫn hệ thống được nhập từ tệp {cls.sanitize_filename(filename)}"
        description = str(description).strip()[:500]

        final_content = body.strip() if meta_dict else content.strip()
        if len(final_content) > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nội dung System Prompt vượt quá giới hạn tối đa 10.000 ký tự (hiện có: {len(final_content)} ký tự)."
            )

        # Kiểm tra trùng tên
        existing = query_one(
            "SELECT id FROM system_prompts WHERE user_id = ? AND LOWER(name) = LOWER(?)",
            (user_id, prompt_name)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "PROMPT_NAME_CONFLICT",
                    "message": f"Bạn đã có một System Prompt mang tên '{prompt_name}'. Vui lòng chọn tên khác."
                }
            )

        prompt_id = f"sp_{uuid.uuid4().hex}"
        execute_commit(
            """
            INSERT INTO system_prompts (id, user_id, name, description, content)
            VALUES (?, ?, ?, ?, ?)
            """,
            (prompt_id, user_id, prompt_name, description, final_content)
        )

        row = query_one(
            "SELECT id, user_id, name, description, content, created_at, updated_at FROM system_prompts WHERE id = ?",
            (prompt_id,)
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"error_code": "DB_INSERT_FAILED", "message": "Không thể lưu System Prompt vào cơ sở dữ liệu."}
            )

        logger.info(
            "Nhập System Prompt thành công: id=%s, user_id=%s, name='%s', content_length=%d, file='%s'",
            prompt_id, user_id, prompt_name, len(final_content), filename
        )

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "name": row["name"],
            "description": row.get("description"),
            "content": row["content"],
            "attachments": [],
            "created_at": str(row.get("created_at")),
            "updated_at": str(row.get("updated_at"))
        }

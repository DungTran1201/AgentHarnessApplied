import hashlib
import json
import logging
import math
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException, status

from src.core.skill_storage import (
    create_skill_filesystem,
    get_skill_dir,
    list_skill_files,
    read_skill_md_content,
    write_skill_md_content,
)
from src.core.skill_validator import (
    split_frontmatter_and_body,
    validate_skill_content,
)
from src.db import execute_commit, query_all, query_one

logger = logging.getLogger("external_skills")

# Constants & Allowlist
CANONICAL_REPO_URL = "https://github.com/sickn33/agentic-awesome-skills"
REDIRECTED_FROM_URL = "https://github.com/sickn33/antigravity-awesome-skills"
ALLOWED_HOSTS = ["raw.githubusercontent.com", "api.github.com"]
ALLOWED_REPO_PATH = "sickn33/agentic-awesome-skills"
MANIFEST_RAW_URL = "https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/main/skills_index.json"
RAW_CONTENT_BASE_URL = "https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/main"

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "cache"
CATALOG_CACHE_FILE = CACHE_DIR / "awesome_skills_catalog.json"
SKILL_CACHE_DIR = CACHE_DIR / "external_skills"

CACHE_TTL_SECONDS = 24 * 3600  # 24 hours

SAFE_PATH_REGEX = re.compile(r"^[a-zA-Z0-9_\-\./]+$")
SLUG_SANITIZE_REGEX = re.compile(r"[^a-z0-9\-]+")


def ensure_cache_dirs():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    SKILL_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_slug(name: str) -> str:
    cleaned = SLUG_SANITIZE_REGEX.sub("-", name.lower()).strip("-")
    cleaned = re.sub(r"-+", "-", cleaned)
    return cleaned[:64] or f"skill-{uuid.uuid4().hex[:6]}"


def compute_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def scan_content_security(raw_content: str) -> Dict[str, Any]:
    """
    Quét nội dung Markdown để phát hiện các tín hiệu độc hại:
    - XSS injection trong HTML/Markdown (thẻ script, event handlers)
    - Command execution nguy hiểm (curl | sh, rm -rf, sudo)
    - Prompt injection và jailbreak vectors
    """
    warnings: List[str] = []
    risk_level = "SAFE"

    lower = raw_content.lower()

    # 1. Thẻ script hoặc HTML injection
    if re.search(r"<\s*script\b[^>]*>", lower):
        warnings.append("Phát hiện thẻ <script> tiềm ẩn nguy cơ thực thi mã JavaScript độc hại.")
        risk_level = "HIGH"
    if re.search(r"\bon\w+\s*=", lower):
        warnings.append("Phát hiện HTML event handlers (onload, onerror, ...) trong nội dung.")
        risk_level = "HIGH"
    if "javascript:" in lower or "data:text/html" in lower:
        warnings.append("Phát hiện giao thức javascript: hoặc data: URI không an toàn.")
        risk_level = "HIGH"

    # 2. Command execution hooks
    if re.search(r"\bcurl\b[^\n|]+\|\s*(ba)?sh\b", lower) or re.search(r"\bwget\b[^\n|]+\|\s*(ba)?sh\b", lower):
        warnings.append("Phát hiện lệnh tải và thực thi shell script từ xa (curl/wget | sh).")
        risk_level = "HIGH"
    if "rm -rf /" in lower or ":(){ :|:& };:" in lower:
        warnings.append("Phát hiện lệnh phá hoại hệ điều hành nguy hiểm.")
        risk_level = "HIGH"

    # 3. Prompt injection vectors
    prompt_injection_signals = [
        "ignore all previous instructions",
        "ignore previous instructions",
        "disregard all prior instructions",
        "system override: you are now",
        "jailbreak enabled",
        "bypass all guardrails",
    ]
    for signal in prompt_injection_signals:
        if signal in lower:
            warnings.append(f"Cảnh báo Prompt Injection: nội dung chứa cụm từ nghi vấn '{signal}'.")
            if risk_level != "HIGH":
                risk_level = "MEDIUM"

    return {
        "risk_level": risk_level,
        "warnings": warnings,
        "is_safe_to_preview": True,
        "has_prompt_injection_warning": any("Prompt Injection" in w for w in warnings),
    }


class ExternalSkillsService:
    _in_memory_catalog: Optional[List[Dict[str, Any]]] = None
    _catalog_metadata: Dict[str, Any] = {}

    @classmethod
    def get_providers_info(cls) -> List[Dict[str, Any]]:
        is_synced = cls._in_memory_catalog is not None or CATALOG_CACHE_FILE.exists()
        total_skills = len(cls._in_memory_catalog) if cls._in_memory_catalog else 0
        if total_skills == 0 and CATALOG_CACHE_FILE.exists():
            try:
                with open(CATALOG_CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    total_skills = len(data.get("skills", []))
            except Exception:
                pass

        return [
            {
                "id": "awesome-skills",
                "name": "Awesome Skills (Agentic Community Catalog)",
                "canonical_url": CANONICAL_REPO_URL,
                "redirected_from": REDIRECTED_FROM_URL,
                "status": "connected" if is_synced else "ready",
                "total_skills": total_skills,
                "last_synced_at": cls._catalog_metadata.get("last_synced_at"),
                "is_stale": cls._catalog_metadata.get("is_stale", False),
                "license_policy": "CC-BY-4.0 (Content), MIT (Code)",
                "attribution_requirement": "Bắt buộc ghi nhận nguồn tác giả cộng đồng Awesome Skills",
            }
        ]

    @classmethod
    def _read_disk_cache(cls) -> Optional[Tuple[List[Dict[str, Any]], Dict[str, Any]]]:
        if not CATALOG_CACHE_FILE.exists():
            return None
        try:
            with open(CATALOG_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                skills = data.get("skills", [])
                meta = data.get("metadata", {})
                return skills, meta
        except Exception as e:
            logger.warning(f"Không thể đọc file cache catalog: {e}")
            return None

    @classmethod
    def _write_disk_cache(cls, skills: List[Dict[str, Any]], commit_sha: str = "main"):
        ensure_cache_dirs()
        meta = {
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
            "source_repo": CANONICAL_REPO_URL,
            "commit_sha": commit_sha,
            "total_items": len(skills),
            "is_stale": False,
        }
        payload = {
            "metadata": meta,
            "skills": skills,
        }
        with open(CATALOG_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        cls._catalog_metadata = meta

    @classmethod
    async def get_or_sync_catalog(cls, force_refresh: bool = False) -> Tuple[List[Dict[str, Any]], bool, str]:
        """
        Lấy danh mục Awesome Skills:
        - Sử dụng in-memory hoặc disk cache nếu còn hạn
        - Tải từ GitHub raw content nếu chưa có hoặc force_refresh=True
        - Tự động fallback về disk cache (stale) nếu mạng lỗi hoặc bị rate limit
        """
        now = datetime.now(timezone.utc)

        # 1. Kiểm tra cache hiện có nếu không force_refresh
        if not force_refresh:
            if cls._in_memory_catalog is not None:
                return cls._in_memory_catalog, cls._catalog_metadata.get("is_stale", False), cls._catalog_metadata.get("last_synced_at", "")

            cached = cls._read_disk_cache()
            if cached:
                skills, meta = cached
                cls._in_memory_catalog = skills
                cls._catalog_metadata = meta
                # Kiểm tra hạn TTL
                last_sync = meta.get("last_synced_at")
                if last_sync:
                    try:
                        sync_dt = datetime.fromisoformat(last_sync)
                        age = (now - sync_dt).total_seconds()
                        if age < CACHE_TTL_SECONDS:
                            return skills, False, last_sync
                    except Exception:
                        pass

        # 2. Tải danh mục mới từ GitHub
        logger.info(f"Đang đồng bộ manifest Awesome Skills từ {MANIFEST_RAW_URL}...")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    MANIFEST_RAW_URL,
                    headers={"User-Agent": "AI-Chan-External-Skills-Connector/1.0"},
                )
                if resp.status_code == 200:
                    skills_data = resp.json()
                    if not isinstance(skills_data, list):
                        raise ValueError("Dữ liệu manifest không phải danh sách hợp lệ.")

                    cls._write_disk_cache(skills_data)
                    cls._in_memory_catalog = skills_data
                    logger.info(f"Đồng bộ thành công {len(skills_data)} kỹ năng từ Awesome Skills.")
                    return skills_data, False, cls._catalog_metadata.get("last_synced_at", "")
                elif resp.status_code == 403:
                    logger.warning("GitHub API rate limit khi tải catalog manifest.")
                    # Fallback cache
                    cached = cls._read_disk_cache()
                    if cached:
                        skills, meta = cached
                        cls._in_memory_catalog = skills
                        meta["is_stale"] = True
                        cls._catalog_metadata = meta
                        return skills, True, meta.get("last_synced_at", "")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="GitHub rate limit. Chưa có bản cache sẵn có. Vui lòng thử lại sau.",
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Lỗi phản hồi từ nguồn GitHub Awesome Skills: HTTP {resp.status_code}",
                    )
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.warning(f"Lỗi mạng khi tải catalog manifest: {e}")
            cached = cls._read_disk_cache()
            if cached:
                skills, meta = cached
                cls._in_memory_catalog = skills
                meta["is_stale"] = True
                cls._catalog_metadata = meta
                return skills, True, meta.get("last_synced_at", "")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Không thể kết nối đến Awesome Skills repository và chưa có bản cache: {str(e)}",
            )

    @classmethod
    async def search_skills(
        cls,
        q: Optional[str] = None,
        category: Optional[str] = None,
        risk: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Tìm kiếm, phân trang và lọc theo danh mục/độ rủi ro.
        Trả về danh sách kỹ năng kèm danh mục và số lượng cho bộ lọc frontend.
        """
        catalog, is_stale, last_synced_at = await cls.get_or_sync_catalog(force_refresh=False)

        # Thu thập thống kê danh mục
        cat_counts: Dict[str, int] = {}
        for item in catalog:
            c = item.get("category") or "uncategorized"
            cat_counts[c] = cat_counts.get(c, 0) + 1

        categories_list = [
            {"name": k, "count": v}
            for k, v in sorted(cat_counts.items(), key=lambda x: (-x[1], x[0]))
        ]

        # Áp dụng bộ lọc
        filtered = catalog

        if category and category.strip():
            cat_lower = category.strip().lower()
            filtered = [
                it for it in filtered
                if (it.get("category") or "uncategorized").lower() == cat_lower
            ]

        if risk and risk.strip():
            risk_lower = risk.strip().lower()
            filtered = [
                it for it in filtered
                if (it.get("risk") or "safe").lower() == risk_lower
            ]

        if q and q.strip():
            q_lower = q.strip().lower()
            filtered = [
                it for it in filtered
                if (
                    q_lower in (it.get("name") or "").lower()
                    or q_lower in (it.get("id") or "").lower()
                    or q_lower in (it.get("description") or "").lower()
                    or q_lower in (it.get("category") or "").lower()
                )
            ]

        total = len(filtered)
        limit = max(1, min(limit, 100))
        page = max(1, page)
        total_pages = math.ceil(total / limit) if total > 0 else 1
        offset = (page - 1) * limit
        items = filtered[offset: offset + limit]

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "categories": categories_list,
            "is_stale": is_stale,
            "last_synced_at": last_synced_at,
        }

    @classmethod
    def _validate_source_path(cls, path_str: str) -> str:
        """
        Kiểm tra SSRF & Path Traversal trên source path.
        """
        if not path_str or not SAFE_PATH_REGEX.match(path_str) or ".." in path_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Đường dẫn kỹ năng nguồn không hợp lệ hoặc chứa ký tự nguy hiểm.",
            )
        return path_str.strip("/")

    @classmethod
    async def get_skill_detail(
        cls,
        source_skill_id: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Lấy thông tin chi tiết một kỹ năng từ Awesome Skills:
        - Metadata từ manifest
        - Nội dung `SKILL.md` (tải từ raw GitHub hoặc cache)
        - Đánh giá bảo mật (security assessment)
        - Tính toán content hash
        - Kiểm tra trạng thái đã nhập (is_imported) vào tài khoản người dùng
        """
        catalog, _, _ = await cls.get_or_sync_catalog(force_refresh=False)

        # Tìm kiếm theo id hoặc path
        clean_id = source_skill_id.strip()
        matched = next(
            (it for it in catalog if it.get("id") == clean_id or it.get("path") == clean_id),
            None,
        )
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy kỹ năng '{clean_id}' trong catalog Awesome Skills.",
            )

        source_path = cls._validate_source_path(matched.get("path") or f"skills/{clean_id}")
        raw_content = await cls._fetch_raw_skill_content(source_path, matched.get("id", clean_id))

        # Phân tích nội dung
        frontmatter_str, body_str = split_frontmatter_and_body(raw_content)
        content_hash = compute_sha256(raw_content)
        security_report = scan_content_security(raw_content)

        # Phân tích license
        license_str = "CC-BY-4.0"
        attribution_str = f"Tác giả cộng đồng Awesome Skills ({CANONICAL_REPO_URL}) theo giấy phép CC BY 4.0 / MIT"

        # Kiểm tra xem user hiện tại đã import kỹ năng này chưa
        is_imported = False
        local_skill_id = None
        local_skill_name = None
        if user_id:
            row = query_one(
                """
                SELECT id, name FROM skills
                WHERE user_id = ? AND source_provider = 'awesome-skills' AND source_skill_id = ?
                """,
                (user_id, matched.get("id")),
            )
            if row:
                is_imported = True
                local_skill_id = row["id"]
                local_skill_name = row["name"]

        return {
            "source_provider": "awesome-skills",
            "source_repository_url": CANONICAL_REPO_URL,
            "source_skill_id": matched.get("id"),
            "source_path": source_path,
            "source_version": "main",
            "source_content_hash": content_hash,
            "source_license": license_str,
            "attribution": attribution_str,
            "name": matched.get("name") or matched.get("id"),
            "description": matched.get("description") or "",
            "category": matched.get("category") or "uncategorized",
            "risk": matched.get("risk") or "safe",
            "date_added": matched.get("date_added"),
            "plugin": matched.get("plugin"),
            "raw_content": raw_content,
            "frontmatter": frontmatter_str or "",
            "markdown_body": body_str,
            "security_assessment": security_report,
            "is_imported": is_imported,
            "local_skill_id": local_skill_id,
            "local_skill_name": local_skill_name,
        }

    @classmethod
    async def _fetch_raw_skill_content(cls, source_path: str, skill_id: str) -> str:
        ensure_cache_dirs()
        cache_file = SKILL_CACHE_DIR / f"{sanitize_slug(skill_id)}.md"

        if cache_file.exists():
            try:
                return cache_file.read_text(encoding="utf-8")
            except Exception:
                pass

        # Xây dựng URL tải file
        raw_url = f"{RAW_CONTENT_BASE_URL}/{source_path}/SKILL.md"

        # SSRF Protection: Xác nhận URL đích hoàn toàn nằm trong allowlist
        if not raw_url.startswith(RAW_CONTENT_BASE_URL):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yêu cầu tải nội dung vi phạm chính sách bảo mật SSRF allowlist.",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    raw_url,
                    headers={"User-Agent": "AI-Chan-External-Skills-Connector/1.0"},
                )
                if resp.status_code == 200:
                    content = resp.text
                    cache_file.write_text(content, encoding="utf-8")
                    return content
                elif resp.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Tệp SKILL.md không tồn tại tại đường dẫn '{source_path}'.",
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Không thể tải tệp SKILL.md từ nguồn: HTTP {resp.status_code}",
                    )
        except httpx.RequestError as e:
            if cache_file.exists():
                return cache_file.read_text(encoding="utf-8")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Lỗi mạng khi tải tệp SKILL.md từ kho lưu trữ ngoài: {str(e)}",
            )

    @classmethod
    async def import_skill_to_library(
        cls,
        user_id: str,
        source_skill_id: str,
        conflict_action: Optional[str] = None,
        target_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Nhập một kỹ năng từ Awesome Skills vào thư viện của người dùng:
        - Phát hiện trùng lặp theo source_skill_id hoặc tên hiển thị
        - Xử lý xung đột: RENAME, REPLACE, SKIP, hoặc báo lỗi 409 nếu chưa chọn action
        - Kiểm tra xem bản local có bị sửa đổi thủ công không trước khi cho phép ghi đè
        - Lưu tệp SKILL.md vào data/storage/skills/{user_id}/{name}/SKILL.md
        - Ghi bản ghi vào CSDL kèm đầy đủ thông tin Provenance (BR-020)
        """
        # 1. Lấy thông tin chi tiết và nội dung của kỹ năng ngoài
        detail = await cls.get_skill_detail(source_skill_id, user_id=user_id)
        raw_content = detail["raw_content"]
        source_hash = detail["source_content_hash"]

        initial_name = sanitize_slug(target_name or detail["name"] or source_skill_id)

        # 2. Kiểm tra xung đột:
        # Check A: Đã import cùng source_skill_id chưa?
        existing_by_source = query_one(
            """
            SELECT * FROM skills
            WHERE user_id = ? AND source_provider = 'awesome-skills' AND source_skill_id = ?
            """,
            (user_id, detail["source_skill_id"]),
        )

        # Check B: Có skill nào trùng tên trong tài khoản user chưa?
        existing_by_name = query_one(
            """
            SELECT * FROM skills
            WHERE user_id = ? AND name = ? COLLATE NOCASE
            """,
            (user_id, initial_name),
        )

        existing = existing_by_source or existing_by_name

        if existing:
            conflict_type = "DUPLICATE_SOURCE" if existing_by_source else "NAME_COLLISION"

            # Kiểm tra xem bản nội bộ đã bị người dùng sửa đổi chưa
            local_content = read_skill_md_content(existing["storage_path"])
            current_local_hash = compute_sha256(local_content) if local_content else ""
            is_locally_modified = (
                bool(existing.get("source_content_hash"))
                and current_local_hash != existing.get("source_content_hash")
            )

            if not conflict_action:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "SKILL_IMPORT_CONFLICT",
                        "message": (
                            f"Kỹ năng '{existing['name']}' đã tồn tại trong thư viện của bạn "
                            f"({'cùng nguồn' if conflict_type == 'DUPLICATE_SOURCE' else 'trùng tên'}). "
                            f"{'Nội dung local đã được chỉnh sửa.' if is_locally_modified else 'Nội dung chưa thay đổi so với bản gốc.'}"
                        ),
                        "conflict_type": conflict_type,
                        "existing_skill_id": existing["id"],
                        "existing_skill_name": existing["name"],
                        "is_locally_modified": is_locally_modified,
                        "supported_actions": ["RENAME", "REPLACE", "SKIP"],
                    },
                )

            conflict_action_upper = conflict_action.upper()

            if conflict_action_upper == "SKIP":
                return {
                    "imported": False,
                    "status": "SKIPPED",
                    "message": f"Bỏ qua kỹ năng '{existing['name']}' do đã tồn tại.",
                    "skill_id": existing["id"],
                    "name": existing["name"],
                }

            elif conflict_action_upper == "REPLACE":
                # Ghi đè lên kỹ năng local hiện có
                write_skill_md_content(existing["storage_path"], raw_content)
                execute_commit(
                    """
                    UPDATE skills
                    SET description = ?, license = ?, source_content_hash = ?,
                        source_version = 'main', source_updated_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP, source_status = 'current',
                        last_validated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        detail["description"][:1024],
                        detail["source_license"],
                        source_hash,
                        existing["id"],
                    ),
                )
                return {
                    "imported": True,
                    "status": "REPLACED",
                    "message": f"Đã cập nhật kỹ năng '{existing['name']}' từ Awesome Skills thành công.",
                    "skill_id": existing["id"],
                    "name": existing["name"],
                }

            elif conflict_action_upper == "RENAME":
                # Đổi tên tự động để tránh trùng
                suffix = 1
                new_candidate_name = f"{initial_name}-imported"
                while query_one("SELECT id FROM skills WHERE user_id = ? AND name = ? COLLATE NOCASE", (user_id, new_candidate_name)):
                    suffix += 1
                    new_candidate_name = f"{initial_name}-imported-{suffix}"
                initial_name = new_candidate_name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Action '{conflict_action}' không hợp lệ. Phải là RENAME, REPLACE hoặc SKIP.",
                )

        # 3. Tiến hành tạo mới Skill trong hệ thống AI-Chan
        skill_id = f"skl_{uuid.uuid4().hex[:12]}"

        # Tạo thư mục và lưu file vật lý
        skill_dir = create_skill_filesystem(user_id, initial_name, raw_content)

        # Kiểm tra tính hợp lệ với validator chuẩn Agent Skills
        report = validate_skill_content(raw_content, parent_folder_name=initial_name)
        final_status = "VALID" if report.is_valid else "DRAFT"

        metadata_dict = {
            "source_provider": "awesome-skills",
            "source_category": detail.get("category", "uncategorized"),
            "source_risk": detail.get("risk", "safe"),
        }

        execute_commit(
            """
            INSERT INTO skills (
                id, user_id, name, description, license, compatibility, allowed_tools,
                metadata_json, status, source_type, storage_path, is_valid, last_validated_at,
                source_provider, source_repository_url, source_skill_id, source_path,
                source_version, source_content_hash, source_license, attribution,
                imported_at, source_updated_at, source_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, ?, CURRENT_TIMESTAMP,
                    ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'current')
            """,
            (
                skill_id,
                user_id,
                initial_name,
                detail["description"][:1024] or f"Kỹ năng {initial_name} từ Awesome Skills",
                detail["source_license"],
                None,
                None,
                json.dumps(metadata_dict),
                final_status,
                str(skill_dir),
                1 if report.is_valid else 0,
                "awesome-skills",
                CANONICAL_REPO_URL,
                detail["source_skill_id"],
                detail["source_path"],
                "main",
                source_hash,
                detail["source_license"],
                detail["attribution"],
            ),
        )

        return {
            "imported": True,
            "status": "CREATED",
            "message": f"Đã nhập thành công kỹ năng '{initial_name}' vào thư viện của bạn.",
            "skill_id": skill_id,
            "name": initial_name,
            "is_valid": report.is_valid,
            "validation_report": report.model_dump(),
        }

    @classmethod
    def get_skill_provenance(cls, user_id: str, skill_id: str) -> Dict[str, Any]:
        """
        Lấy thông tin nguồn gốc (provenance) của một kỹ năng nội bộ:
        - Kiểm tra xem kỹ năng có được nhập từ bên ngoài không
        - Tính toán hash hiện tại để xác định xem người dùng đã chỉnh sửa hay chưa
        """
        row = query_one("SELECT * FROM skills WHERE id = ? AND user_id = ?", (skill_id, user_id))
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy kỹ năng hoặc bạn không có quyền truy cập.",
            )

        if not row["source_provider"]:
            return {
                "skill_id": skill_id,
                "name": row["name"],
                "is_imported": False,
                "source_type": row["source_type"],
            }

        local_content = read_skill_md_content(row["storage_path"])
        current_hash = compute_sha256(local_content) if local_content else ""
        is_locally_modified = (
            bool(row["source_content_hash"]) and current_hash != row["source_content_hash"]
        )

        return {
            "skill_id": skill_id,
            "name": row["name"],
            "is_imported": True,
            "source_type": row["source_type"],
            "source_provider": row["source_provider"],
            "source_repository_url": row["source_repository_url"],
            "source_skill_id": row["source_skill_id"],
            "source_path": row["source_path"],
            "source_version": row["source_version"],
            "source_content_hash": row["source_content_hash"],
            "current_content_hash": current_hash,
            "is_locally_modified": is_locally_modified,
            "source_license": row["source_license"],
            "attribution": row["attribution"],
            "imported_at": str(row["imported_at"]) if row["imported_at"] else None,
            "source_updated_at": str(row["source_updated_at"]) if row["source_updated_at"] else None,
            "source_status": row["source_status"] or "current",
        }

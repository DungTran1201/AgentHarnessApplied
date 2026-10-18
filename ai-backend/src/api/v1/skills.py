import uuid
import json
import logging
import io
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.db import query_one, query_all, execute_commit
from src.api.v1.projects import get_optional_current_user
from src.core.skill_validator import (
    validate_skill_content,
    ValidationErrorItem,
    ValidationWarningItem,
    SkillValidationReport,
    split_frontmatter_and_body
)
from src.core.skill_storage import (
    create_skill_filesystem,
    read_skill_md_content,
    write_skill_md_content,
    list_skill_files,
    delete_skill_filesystem,
    export_skill_to_zip,
    inspect_and_extract_zip,
    add_additional_resource,
    remove_additional_resource,
    get_skill_dir
)
from src.services.text_import_service import (
    TextImportService,
    TextFileImportRequest,
    ALLOWED_TEXT_EXTENSIONS
)
from src.services.external_skills_service import ExternalSkillsService

logger = logging.getLogger("skills")

skills_router = APIRouter(prefix="/skills", tags=["Agent Skills"])

# ==============================================================================
# 1. PYDANTIC V2 CONTRACT SCHEMAS
# ==============================================================================

class SkillSummaryResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    source_type: str
    file_count: int
    is_valid: bool
    created_at: str
    updated_at: str
    source_provider: Optional[str] = None
    source_repository_url: Optional[str] = None
    source_skill_id: Optional[str] = None
    source_path: Optional[str] = None
    source_version: Optional[str] = None
    source_content_hash: Optional[str] = None
    source_license: Optional[str] = None
    attribution: Optional[str] = None
    imported_at: Optional[str] = None
    source_updated_at: Optional[str] = None
    source_status: Optional[str] = None

class SkillListResponse(BaseModel):
    items: List[SkillSummaryResponse]
    total: int
    limit: int
    offset: int

class FileTreeItem(BaseModel):
    path: str
    category: str
    size_bytes: int
    updated_at: float

class SkillDetailResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    license: Optional[str] = None
    compatibility: Optional[str] = None
    allowed_tools: Optional[str] = None
    metadata: Dict[str, str] = Field(default_factory=dict)
    raw_skill_md: str
    status: str
    source_type: str
    storage_path: str
    is_valid: bool
    file_tree: List[FileTreeItem] = Field(default_factory=list)
    attachments: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    validation_report: SkillValidationReport
    created_at: str
    updated_at: str
    source_provider: Optional[str] = None
    source_repository_url: Optional[str] = None
    source_skill_id: Optional[str] = None
    source_path: Optional[str] = None
    source_version: Optional[str] = None
    source_content_hash: Optional[str] = None
    source_license: Optional[str] = None
    attribution: Optional[str] = None
    imported_at: Optional[str] = None
    source_updated_at: Optional[str] = None
    source_status: Optional[str] = None

# External Catalog Schemas (BR-020)
class ExternalCatalogProviderResponse(BaseModel):
    id: str
    name: str
    canonical_url: str
    redirected_from: Optional[str] = None
    status: str
    total_skills: int
    last_synced_at: Optional[str] = None
    is_stale: bool = False
    license_policy: str
    attribution_requirement: str

class ExternalSkillSummary(BaseModel):
    id: str
    path: str
    category: Optional[str] = None
    name: str
    description: Optional[str] = None
    risk: Optional[str] = "safe"
    source: Optional[str] = None
    date_added: Optional[str] = None
    plugin: Optional[Dict[str, Any]] = None

class ExternalSkillCategory(BaseModel):
    name: str
    count: int

class ExternalCatalogSearchResponse(BaseModel):
    items: List[ExternalSkillSummary]
    total: int
    page: int
    limit: int
    total_pages: int
    categories: List[ExternalSkillCategory]
    is_stale: bool = False
    last_synced_at: Optional[str] = None

class SecurityAssessment(BaseModel):
    risk_level: str
    warnings: List[str] = Field(default_factory=list)
    is_safe_to_preview: bool = True
    has_prompt_injection_warning: bool = False

class ExternalSkillDetailResponse(BaseModel):
    source_provider: str
    source_repository_url: str
    source_skill_id: str
    source_path: str
    source_version: str
    source_content_hash: str
    source_license: str
    attribution: str
    name: str
    description: str
    category: str
    risk: str
    date_added: Optional[str] = None
    plugin: Optional[Dict[str, Any]] = None
    raw_content: str
    frontmatter: str
    markdown_body: str
    security_assessment: SecurityAssessment
    is_imported: bool = False
    local_skill_id: Optional[str] = None
    local_skill_name: Optional[str] = None

class ExternalSkillImportRequest(BaseModel):
    conflict_action: Optional[str] = Field(default=None, description="RENAME, REPLACE, hoặc SKIP nếu trùng lặp")
    target_name: Optional[str] = Field(default=None, description="Tên tùy chỉnh cho kỹ năng nội bộ")

class ExternalSkillImportResponse(BaseModel):
    imported: bool
    status: str
    message: str
    skill_id: Optional[str] = None
    name: Optional[str] = None
    is_valid: Optional[bool] = None
    validation_report: Optional[Dict[str, Any]] = None

class SkillProvenanceResponse(BaseModel):
    skill_id: str
    name: str
    is_imported: bool
    source_type: Optional[str] = None
    source_provider: Optional[str] = None
    source_repository_url: Optional[str] = None
    source_skill_id: Optional[str] = None
    source_path: Optional[str] = None
    source_version: Optional[str] = None
    source_content_hash: Optional[str] = None
    current_content_hash: Optional[str] = None
    is_locally_modified: bool = False
    source_license: Optional[str] = None
    attribution: Optional[str] = None
    imported_at: Optional[str] = None
    source_updated_at: Optional[str] = None
    source_status: Optional[str] = None

class SkillCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64, description="Tên kỹ năng (chữ thường, số, dấu gạch nối)")
    description: str = Field(..., min_length=1, max_length=1024, description="Mô tả chức năng và ngữ cảnh sử dụng")
    license: Optional[str] = Field(default=None, max_length=255)
    compatibility: Optional[str] = Field(default=None, max_length=500)
    allowed_tools: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    content_markdown: Optional[str] = Field(default="", description="Nội dung hướng dẫn Markdown")
    action: str = Field(default="ACTIVATE", description="'ACTIVATE' hoặc 'SAVE_DRAFT'")

class SkillUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1, max_length=1024)
    license: Optional[str] = None
    compatibility: Optional[str] = None
    allowed_tools: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    content_markdown: str = Field(default="")
    raw_skill_md: Optional[str] = Field(default=None, description="Nếu cung cấp raw_skill_md trực tiếp")
    action: str = Field(default="ACTIVATE", description="'ACTIVATE' hoặc 'SAVE_DRAFT'")
    expected_updated_at: Optional[str] = None

class StatelessValidateRequest(BaseModel):
    raw_skill_md: str
    parent_folder_name: Optional[str] = None

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def assemble_skill_md(
    name: str,
    description: str,
    license_val: Optional[str],
    compatibility: Optional[str],
    allowed_tools: Optional[str],
    metadata_map: Optional[Dict[str, str]],
    body_markdown: str
) -> str:
    """
    Ráp các trường thành tệp SKILL.md chuẩn với YAML frontmatter.
    """
    lines = ["---", f"name: {name}", f"description: {description}"]
    if license_val:
        lines.append(f"license: {license_val}")
    if compatibility:
        lines.append(f"compatibility: {compatibility}")
    if allowed_tools:
        lines.append(f"allowed-tools: {allowed_tools}")
    if metadata_map:
        lines.append("metadata:")
        for k, v in metadata_map.items():
            lines.append(f"  {k}: \"{v}\"")
    lines.append("---")
    lines.append("")
    lines.append(body_markdown.strip())
    return "\n".join(lines)

# ==============================================================================
# 2. CONTROLLER ENDPOINTS
# ==============================================================================

@skills_router.get("", response_model=SkillListResponse)
async def list_skills(
    q: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mô tả"),
    status_filter: Optional[str] = Query("ALL", alias="status", description="ALL, VALID, INVALID, DRAFT"),
    source_filter: Optional[str] = Query("ALL", alias="source", description="ALL, USER_CREATED, IMPORTED"),
    sort: str = Query("updated_desc", description="updated_desc hoặc name_asc"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Lấy danh sách các kỹ năng thuộc quyền sở hữu của người dùng hiện tại (Anti-IDOR).
    """
    user_id = current_user.get("id", "guest_user")
    
    where_clauses = ["user_id = ?"]
    params: List[Any] = [user_id]

    if q and q.strip():
        pattern = f"%{q.strip()}%"
        where_clauses.append("(name LIKE ? OR description LIKE ?)")
        params.extend([pattern, pattern])

    if status_filter and status_filter.upper() != "ALL":
        where_clauses.append("status = ?")
        params.append(status_filter.upper())

    if source_filter and source_filter.upper() != "ALL":
        where_clauses.append("source_type = ?")
        params.append(source_filter.upper())

    where_sql = " AND ".join(where_clauses)

    sort_sql = "updated_at DESC"
    if sort == "name_asc":
        sort_sql = "name COLLATE NOCASE ASC"

    # Tổng số bản ghi khớp
    count_row = query_one(f"SELECT COUNT(*) AS total FROM skills WHERE {where_sql}", tuple(params))
    total = count_row["total"] if count_row else 0

    # Lấy danh sách phân trang
    query_params = list(params) + [limit, offset]
    sql = f"""
        SELECT id, name, description, status, source_type, storage_path, is_valid, created_at, updated_at,
               source_provider, source_repository_url, source_skill_id, source_path, source_version,
               source_content_hash, source_license, attribution, imported_at, source_updated_at, source_status
        FROM skills
        WHERE {where_sql}
        ORDER BY {sort_sql}
        LIMIT ? OFFSET ?
    """
    rows = query_all(sql, tuple(query_params))

    items: List[SkillSummaryResponse] = []
    for r in rows:
        # Đếm số lượng tệp vật lý
        try:
            files = list_skill_files(r["storage_path"])
            file_count = len(files)
        except Exception:
            file_count = 1

        items.append(SkillSummaryResponse(
            id=r["id"],
            name=r["name"],
            description=r["description"],
            status=r["status"],
            source_type=r["source_type"],
            file_count=file_count,
            is_valid=bool(r["is_valid"]),
            created_at=str(r["created_at"]),
            updated_at=str(r["updated_at"]),
            source_provider=r.get("source_provider"),
            source_repository_url=r.get("source_repository_url"),
            source_skill_id=r.get("source_skill_id"),
            source_path=r.get("source_path"),
            source_version=r.get("source_version"),
            source_content_hash=r.get("source_content_hash"),
            source_license=r.get("source_license"),
            attribution=r.get("attribution"),
            imported_at=str(r["imported_at"]) if r.get("imported_at") else None,
            source_updated_at=str(r["source_updated_at"]) if r.get("source_updated_at") else None,
            source_status=r.get("source_status"),
        ))

    return SkillListResponse(items=items, total=total, limit=limit, offset=offset)


@skills_router.post("", response_model=SkillDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    payload: SkillCreateRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Tạo mới một kỹ năng từ template/thông tin người dùng nhập.
    """
    user_id = current_user.get("id", "guest_user")
    name = payload.name.strip()

    # 1. Kiểm tra trùng tên kỹ năng trong phạm vi tài khoản người dùng
    existing = query_one("SELECT id FROM skills WHERE user_id = ? AND name = ? COLLATE NOCASE", (user_id, name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SKILL_NAME_CONFLICT",
                "message": f"Kỹ năng mang tên '{name}' đã tồn tại trong tài khoản của bạn. Vui lòng chọn tên khác."
            }
        )

    # 2. Xây dựng nội dung SKILL.md
    raw_content = assemble_skill_md(
        name=name,
        description=payload.description.strip(),
        license_val=payload.license,
        compatibility=payload.compatibility,
        allowed_tools=payload.allowed_tools,
        metadata_map=payload.metadata,
        body_markdown=payload.content_markdown or f"# {name}\n\nThực hiện các bước sau để hoàn thành tác vụ..."
    )

    # 3. Thẩm định chuẩn Agent Skills
    report = validate_skill_content(raw_content, parent_folder_name=name)

    if payload.action == "ACTIVATE" and not report.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "SKILL_VALIDATION_FAILED",
                "message": "Không thể kích hoạt kỹ năng do có lỗi không tuân thủ đặc tả chuẩn Agent Skills.",
                "errors": [e.model_dump() for e in report.errors],
                "warnings": [w.model_dump() for w in report.warnings]
            }
        )

    # 4. Tạo thư mục vật lý và lưu tệp
    skill_id = f"skl_{uuid.uuid4().hex[:12]}"
    try:
        skill_dir = create_skill_filesystem(user_id, name, raw_content)
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo thư mục kỹ năng: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể khởi tạo thư mục kỹ năng: {str(e)}")

    final_status = "VALID" if (report.is_valid and payload.action == "ACTIVATE") else "DRAFT"
    metadata_json_str = json.dumps(payload.metadata or {})

    # 5. Lưu vào Database
    execute_commit(
        """
        INSERT INTO skills (
            id, user_id, name, description, license, compatibility, allowed_tools,
            metadata_json, status, source_type, storage_path, is_valid, last_validated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USER_CREATED', ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            skill_id,
            user_id,
            name,
            payload.description.strip(),
            payload.license,
            payload.compatibility,
            payload.allowed_tools,
            metadata_json_str,
            final_status,
            str(skill_dir),
            1 if report.is_valid else 0
        )
    )

    # Lấy thông tin cây tệp
    files = list_skill_files(str(skill_dir))

    return SkillDetailResponse(
        id=skill_id,
        user_id=user_id,
        name=name,
        description=payload.description.strip(),
        license=payload.license,
        compatibility=payload.compatibility,
        allowed_tools=payload.allowed_tools,
        metadata=payload.metadata or {},
        raw_skill_md=raw_content,
        status=final_status,
        source_type="USER_CREATED",
        storage_path=str(skill_dir),
        is_valid=report.is_valid,
        file_tree=[FileTreeItem(**f) for f in files],
        validation_report=report,
        created_at=str(query_one("SELECT created_at FROM skills WHERE id = ?", (skill_id,))["created_at"]),
        updated_at=str(query_one("SELECT updated_at FROM skills WHERE id = ?", (skill_id,))["updated_at"])
    )


# ==============================================================================
# EXTERNAL SKILLS CATALOG ENDPOINTS (Awesome Skills Integration)
# ==============================================================================

@skills_router.get(
    "/external/providers",
    response_model=List[ExternalCatalogProviderResponse],
    summary="Lấy danh sách các nhà cung cấp Skills bên ngoài và trạng thái đồng bộ"
)
async def get_external_providers():
    return ExternalSkillsService.get_providers_info()


@skills_router.get(
    "/external/awesome/skills",
    response_model=ExternalCatalogSearchResponse,
    summary="Tìm kiếm, lọc danh mục và phân trang kỹ năng từ Awesome Skills catalog"
)
async def search_awesome_skills(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tên, mô tả hoặc danh mục"),
    category: Optional[str] = Query(None, description="Lọc theo danh mục"),
    risk: Optional[str] = Query(None, description="Lọc theo độ rủi ro (safe, standard, sensitive)"),
    page: int = Query(1, ge=1, description="Số trang (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Số lượng mục mỗi trang")
):
    return await ExternalSkillsService.search_skills(
        q=q,
        category=category,
        risk=risk,
        page=page,
        limit=limit
    )


@skills_router.get(
    "/external/awesome/search",
    response_model=ExternalCatalogSearchResponse,
    summary="Alias tìm kiếm catalog ngoài tương thích với đặc tả API"
)
async def search_awesome_skills_alias(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    return await ExternalSkillsService.search_skills(
        q=q,
        category=category,
        risk=risk,
        page=page,
        limit=limit
    )


@skills_router.post(
    "/external/awesome/refresh",
    summary="Làm mới cache catalog Awesome Skills từ kho lưu trữ nguồn"
)
async def refresh_awesome_catalog():
    skills, is_stale, last_synced_at = await ExternalSkillsService.get_or_sync_catalog(force_refresh=True)
    return {
        "refreshed": True,
        "total_skills": len(skills),
        "is_stale": is_stale,
        "last_synced_at": last_synced_at
    }


@skills_router.get(
    "/external/awesome/skills/{source_skill_id:path}",
    response_model=ExternalSkillDetailResponse,
    summary="Lấy chi tiết và xem trước nội dung tệp SKILL.md từ catalog ngoài"
)
async def get_awesome_skill_detail(
    source_skill_id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    user_id = current_user.get("id", "guest_user")
    return await ExternalSkillsService.get_skill_detail(source_skill_id, user_id=user_id)


@skills_router.post(
    "/external/awesome/skills/{source_skill_id:path}/import",
    response_model=ExternalSkillImportResponse,
    summary="Nhập kỹ năng từ Awesome Skills vào thư viện AI-Chan"
)
async def import_awesome_skill(
    source_skill_id: str,
    payload: Optional[ExternalSkillImportRequest] = None,
    current_user: dict = Depends(get_optional_current_user)
):
    user_id = current_user.get("id", "guest_user")
    conflict_action = payload.conflict_action if payload else None
    target_name = payload.target_name if payload else None
    return await ExternalSkillsService.import_skill_to_library(
        user_id=user_id,
        source_skill_id=source_skill_id,
        conflict_action=conflict_action,
        target_name=target_name
    )


@skills_router.get("/{id}", response_model=SkillDetailResponse)
async def get_skill_detail(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Lấy thông tin chi tiết một kỹ năng, nội dung văn bản SKILL.md, cây tệp và báo cáo kiểm tra.
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT * FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy kỹ năng hoặc bạn không có quyền truy cập."
        )

    storage_path = row["storage_path"]
    raw_skill_md = read_skill_md_content(storage_path)
    files = list_skill_files(storage_path)
    file_paths = [f["path"] for f in files]

    # Kiểm tra trạng thái hiện tại
    report = validate_skill_content(raw_skill_md, parent_folder_name=row["name"], existing_files=file_paths)

    meta_dict = {}
    if row.get("metadata_json"):
        try:
            meta_dict = json.loads(row["metadata_json"])
        except Exception:
            pass

    atts = query_all(
        """
        SELECT id, filename, mime_type, file_size, status, created_at
        FROM attachments
        WHERE skill_id = ?
        ORDER BY created_at DESC
        """,
        (id,)
    )


    return SkillDetailResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row["description"],
        license=row["license"],
        compatibility=row["compatibility"],
        allowed_tools=row["allowed_tools"],
        metadata=meta_dict,
        raw_skill_md=raw_skill_md,
        status=row["status"],
        source_type=row["source_type"],
        storage_path=storage_path,
        is_valid=bool(row["is_valid"]),
        file_tree=[FileTreeItem(**f) for f in files],
        attachments=atts,
        validation_report=report,
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
        source_provider=row.get("source_provider"),
        source_repository_url=row.get("source_repository_url"),
        source_skill_id=row.get("source_skill_id"),
        source_path=row.get("source_path"),
        source_version=row.get("source_version"),
        source_content_hash=row.get("source_content_hash"),
        source_license=row.get("source_license"),
        attribution=row.get("attribution"),
        imported_at=str(row["imported_at"]) if row.get("imported_at") else None,
        source_updated_at=str(row["source_updated_at"]) if row.get("source_updated_at") else None,
        source_status=row.get("source_status"),
    )


@skills_router.get("/{id}/source", response_model=SkillProvenanceResponse, summary="Lấy thông tin nguồn gốc (provenance) của một kỹ năng nội bộ")
async def get_local_skill_source(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    user_id = current_user.get("id", "guest_user")
    return ExternalSkillsService.get_skill_provenance(user_id=user_id, skill_id=id)


@skills_router.get("/{id}/attachments", summary="Lấy danh sách tệp tài nguyên đính kèm của Skill")
async def get_skill_attachments(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Truy vấn danh sách các tài nguyên thư viện đã đính kèm vào Skill (Anti-IDOR).
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one(
        "SELECT id FROM skills WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy kỹ năng hoặc bạn không có quyền truy cập."
        )

    atts = query_all(
        """
        SELECT id, filename, mime_type, file_size, status, created_at, updated_at
        FROM attachments
        WHERE skill_id = ?
        ORDER BY created_at DESC
        """,
        (id,)
    )

    return {"items": atts, "total": len(atts)}



@skills_router.put("/{id}", response_model=SkillDetailResponse)
async def update_skill(
    id: str,
    payload: SkillUpdateRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Cập nhật kỹ năng: Hỗ trợ chế độ Lưu nháp ('SAVE_DRAFT') hoặc Lưu & Kích hoạt ('ACTIVATE').
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT * FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng hoặc bạn không có quyền sửa.")

    # Kiểm tra Optimistic Concurrency Lock nếu có truyền expected_updated_at
    if payload.expected_updated_at and str(row["updated_at"]) != payload.expected_updated_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CONCURRENCY_CONFLICT",
                "message": "Kỹ năng đã bị chỉnh sửa bởi một phiên làm việc khác. Vui lòng tải lại trang trước khi lưu."
            }
        )

    storage_path = row["storage_path"]
    new_name = payload.name.strip()

    # Kiểm tra trùng tên nếu đổi tên
    if new_name.lower() != row["name"].lower():
        name_exist = query_one("SELECT id FROM skills WHERE user_id = ? AND name = ? COLLATE NOCASE AND id != ?", (user_id, new_name, id))
        if name_exist:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "SKILL_NAME_CONFLICT", "message": f"Tên '{new_name}' đã được sử dụng."}
            )

    # Xác định nội dung raw_skill_md
    if payload.raw_skill_md is not None and payload.raw_skill_md.strip():
        final_skill_md = payload.raw_skill_md
    else:
        final_skill_md = assemble_skill_md(
            name=new_name,
            description=payload.description.strip(),
            license_val=payload.license,
            compatibility=payload.compatibility,
            allowed_tools=payload.allowed_tools,
            metadata_map=payload.metadata,
            body_markdown=payload.content_markdown
        )

    # Thẩm tra chuẩn
    files = list_skill_files(storage_path)
    file_paths = [f["path"] for f in files]
    report = validate_skill_content(final_skill_md, parent_folder_name=new_name, existing_files=file_paths)

    if payload.action == "ACTIVATE" and not report.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "SKILL_VALIDATION_FAILED",
                "message": "Không thể kích hoạt kỹ năng do còn lỗi vi phạm chuẩn Agent Skills.",
                "errors": [e.model_dump() for e in report.errors],
                "warnings": [w.model_dump() for w in report.warnings]
            }
        )

    # Ghi nội dung vào tệp vật lý
    write_skill_md_content(storage_path, final_skill_md)

    final_status = "VALID" if (report.is_valid and payload.action == "ACTIVATE") else "DRAFT"
    metadata_json_str = json.dumps(payload.metadata or {})

    # Cập nhật Database
    execute_commit(
        """
        UPDATE skills
        SET name = ?, description = ?, license = ?, compatibility = ?, allowed_tools = ?,
            metadata_json = ?, status = ?, is_valid = ?, last_validated_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (
            new_name,
            payload.description.strip(),
            payload.license,
            payload.compatibility,
            payload.allowed_tools,
            metadata_json_str,
            final_status,
            1 if report.is_valid else 0,
            id,
            user_id
        )
    )

    updated_row = query_one("SELECT * FROM skills WHERE id = ?", (id,))
    files = list_skill_files(storage_path)

    return SkillDetailResponse(
        id=id,
        user_id=user_id,
        name=new_name,
        description=payload.description.strip(),
        license=payload.license,
        compatibility=payload.compatibility,
        allowed_tools=payload.allowed_tools,
        metadata=payload.metadata or {},
        raw_skill_md=final_skill_md,
        status=final_status,
        source_type=updated_row["source_type"],
        storage_path=storage_path,
        is_valid=report.is_valid,
        file_tree=[FileTreeItem(**f) for f in files],
        validation_report=report,
        created_at=str(updated_row["created_at"]),
        updated_at=str(updated_row["updated_at"])
    )


@skills_router.delete("/{id}")
async def delete_skill(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Xóa kỹ năng khỏi cơ sở dữ liệu và dọn dẹp thư mục vật lý trên đĩa cứng.
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT storage_path, name FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng hoặc bạn không có quyền xóa.")

    # Xóa database
    execute_commit("DELETE FROM skills WHERE id = ? AND user_id = ?", (id, user_id))

    # Xóa thư mục lưu trữ
    delete_skill_filesystem(row["storage_path"])

    return {
        "success": True,
        "message": f"Đã xóa vĩnh viễn kỹ năng '{row['name']}' và toàn bộ tệp liên quan.",
        "deleted_id": id
    }


@skills_router.post("/validate", response_model=SkillValidationReport)
async def validate_skill_stateless(
    payload: StatelessValidateRequest
):
    """
    Điểm cuối kiểm tra định dạng không trạng thái: Nhận raw_skill_md và trả về báo cáo lỗi/cảnh báo.
    """
    report = validate_skill_content(payload.raw_skill_md, parent_folder_name=payload.parent_folder_name)
    return report


@skills_router.post("/{id}/clone", response_model=SkillDetailResponse, status_code=status.HTTP_201_CREATED)
async def clone_skill(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Nhân bản một kỹ năng thành bản sao mới ({name}-copy).
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT * FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng để nhân bản.")

    raw_content = read_skill_md_content(row["storage_path"])
    base_name = row["name"]
    clone_name = f"{base_name}-copy"

    # Xử lý tránh trùng tên nếu đã có -copy
    counter = 1
    while query_one("SELECT id FROM skills WHERE user_id = ? AND name = ?", (user_id, clone_name)):
        counter += 1
        clone_name = f"{base_name}-copy-{counter}"

    # Cập nhật trường name trong frontmatter của bản sao
    frontmatter, body = split_frontmatter_and_body(raw_content)
    if frontmatter:
        # Thay thế name: ... thành name: clone_name
        lines = frontmatter.split("\n")
        new_lines = []
        for line in lines:
            if line.strip().startswith("name:"):
                new_lines.append(f"name: {clone_name}")
            else:
                new_lines.append(line)
        cloned_raw = "---\n" + "\n".join(new_lines) + "\n---\n" + body
    else:
        cloned_raw = raw_content

    new_id = f"skl_{uuid.uuid4().hex[:12]}"
    new_dir = create_skill_filesystem(user_id, clone_name, cloned_raw)

    execute_commit(
        """
        INSERT INTO skills (
            id, user_id, name, description, license, compatibility, allowed_tools,
            metadata_json, status, source_type, storage_path, is_valid, last_validated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'USER_CREATED', ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            new_id,
            user_id,
            clone_name,
            f"[Bản sao] {row['description']}",
            row["license"],
            row["compatibility"],
            row["allowed_tools"],
            row["metadata_json"],
            str(new_dir),
            row["is_valid"]
        )
    )

    report = validate_skill_content(cloned_raw, parent_folder_name=clone_name)
    files = list_skill_files(str(new_dir))
    created_row = query_one("SELECT * FROM skills WHERE id = ?", (new_id,))

    meta_dict = {}
    if row.get("metadata_json"):
        try:
            meta_dict = json.loads(row["metadata_json"])
        except Exception:
            pass

    return SkillDetailResponse(
        id=new_id,
        user_id=user_id,
        name=clone_name,
        description=f"[Bản sao] {row['description']}",
        license=row["license"],
        compatibility=row["compatibility"],
        allowed_tools=row["allowed_tools"],
        metadata=meta_dict,
        raw_skill_md=cloned_raw,
        status="DRAFT",
        source_type="USER_CREATED",
        storage_path=str(new_dir),
        is_valid=report.is_valid,
        file_tree=[FileTreeItem(**f) for f in files],
        validation_report=report,
        created_at=str(created_row["created_at"]),
        updated_at=str(created_row["updated_at"])
    )


@skills_router.get("/{id}/export")
async def export_skill(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Xuất toàn bộ gói kỹ năng thành tệp nén ZIP chuẩn.
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT name, storage_path FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng để xuất gói.")

    try:
        zip_bytes = export_skill_to_zip(row["storage_path"], row["name"])
        stream = io.BytesIO(zip_bytes)
        return StreamingResponse(
            stream,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{row["name"]}.zip"'}
        )
    except Exception as e:
        logger.error(f"Lỗi khi đóng gói kỹ năng: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể xuất gói kỹ năng: {str(e)}")


@skills_router.post("/import", response_model=SkillDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_skill_package(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Nhập kỹ năng từ tệp văn bản (.md, .txt, .json, .yaml...) hoặc gói nén .zip.
    """
    user_id = current_user.get("id", "guest_user")
    filename = file.filename or "untitled.txt"
    ext = TextImportService.get_extension(filename)

    if ext not in ALLOWED_TEXT_EXTENSIONS and not filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp nén .zip hoặc tệp văn bản: {', '.join(sorted(ALLOWED_TEXT_EXTENSIONS))}."
        )

    content_bytes = await file.read()

    # Xử lý tệp văn bản trực tiếp
    if ext in ALLOWED_TEXT_EXTENSIONS:
        text = TextImportService.validate_and_decode_bytes(filename, content_bytes)
        res = TextImportService.import_skill(
            user_id=user_id,
            filename=filename,
            content=text,
            action="ACTIVATE"
        )
        return SkillDetailResponse(**res)

    # Xử lý gói tệp nén ZIP
    try:
        skill_name, raw_skill_md, final_dest = inspect_and_extract_zip(content_bytes, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi giải nén gói: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý gói tệp nén: {str(e)}")

    # Kiểm tra và phân tích cú pháp
    report = validate_skill_content(raw_skill_md, parent_folder_name=skill_name)
    
    # Kiểm tra trùng tên trong DB
    name_to_use = skill_name
    counter = 1
    while query_one("SELECT id FROM skills WHERE user_id = ? AND name = ?", (user_id, name_to_use)):
        name_to_use = f"{skill_name}-{counter}"
        counter += 1

    skill_id = f"skl_{uuid.uuid4().hex[:12]}"
    desc = report.metadata.get("description", "Gói kỹ năng được nhập từ tệp ZIP")
    license_val = report.metadata.get("license")
    compatibility_val = report.metadata.get("compatibility")
    allowed_tools_val = report.metadata.get("allowed-tools")
    meta_json = json.dumps(report.metadata.get("metadata", {}))

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
            name_to_use,
            str(desc)[:1024],
            license_val,
            compatibility_val,
            allowed_tools_val,
            meta_json,
            "VALID" if report.is_valid else "INVALID",
            str(final_dest),
            1 if report.is_valid else 0
        )
    )

    files = list_skill_files(str(final_dest))
    created_row = query_one("SELECT * FROM skills WHERE id = ?", (skill_id,))

    return SkillDetailResponse(
        id=skill_id,
        user_id=user_id,
        name=name_to_use,
        description=str(desc),
        license=license_val,
        compatibility=compatibility_val,
        allowed_tools=allowed_tools_val,
        metadata=report.metadata.get("metadata", {}),
        raw_skill_md=raw_skill_md,
        status="VALID" if report.is_valid else "INVALID",
        source_type="IMPORTED",
        storage_path=str(final_dest),
        is_valid=report.is_valid,
        file_tree=[FileTreeItem(**f) for f in files],
        validation_report=report,
        created_at=str(created_row["created_at"]),
        updated_at=str(created_row["updated_at"])
    )


@skills_router.post("/import-file", response_model=SkillDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_skill_file(
    file: UploadFile = File(...),
    action: Optional[str] = Query("ACTIVATE", description="'ACTIVATE' hoặc 'SAVE_DRAFT'"),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Điểm cuối chuyên dụng nhập file văn bản từ local vào Skills Library.
    """
    user_id = current_user.get("id", "guest_user")
    filename = file.filename or "untitled.txt"
    content_bytes = await file.read()
    text = TextImportService.validate_and_decode_bytes(filename, content_bytes)
    res = TextImportService.import_skill(
        user_id=user_id,
        filename=filename,
        content=text,
        action=action or "ACTIVATE"
    )
    return SkillDetailResponse(**res)


@skills_router.post("/import-text", response_model=SkillDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_skill_text(
    payload: TextFileImportRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Điểm cuối nhập Skill từ nội dung văn bản sau khi người dùng đã xem trước (preview) và chỉnh sửa metadata.
    """
    user_id = current_user.get("id", "guest_user")
    text = TextImportService.validate_and_decode_bytes(payload.filename, payload.content.encode("utf-8"))
    res = TextImportService.import_skill(
        user_id=user_id,
        filename=payload.filename,
        content=text,
        override_name=payload.name,
        override_desc=payload.description,
        action=payload.action or "ACTIVATE",
        license_val=payload.license,
        compatibility=payload.compatibility,
        allowed_tools=payload.allowed_tools,
        extra_metadata=payload.metadata
    )
    return SkillDetailResponse(**res)


@skills_router.post("/{id}/resources")
async def add_resource(
    id: str,
    file: UploadFile = File(...),
    folder: str = Query("references", description="references hoặc assets"),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Tải lên tệp tài nguyên bổ trợ vào thư mục references/ hoặc assets/.
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT storage_path FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng.")

    if folder not in ["references", "assets"]:
        raise HTTPException(status_code=400, detail="Thư mục đích phải là 'references' hoặc 'assets'.")

    clean_filename = Path(file.filename or "resource.txt").name
    rel_path = f"{folder}/{clean_filename}"
    file_bytes = await file.read()

    try:
        add_additional_resource(row["storage_path"], rel_path, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    files = list_skill_files(row["storage_path"])
    return {
        "success": True,
        "message": f"Đã thêm tệp tài nguyên '{rel_path}' thành công.",
        "file_tree": [FileTreeItem(**f) for f in files]
    }


@skills_router.delete("/{id}/resources")
async def delete_resource(
    id: str,
    relative_path: str = Query(..., description="Đường dẫn tương đối của tệp cần xóa (ví dụ: references/rules.md)"),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Xóa một tệp tài nguyên bổ trợ khỏi gói kỹ năng.
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one("SELECT storage_path FROM skills WHERE id = ? AND user_id = ?", (id, user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỹ năng.")

    try:
        remove_additional_resource(row["storage_path"], relative_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    files = list_skill_files(row["storage_path"])
    return {
        "success": True,
        "message": f"Đã xóa tệp '{relative_path}' thành công.",
        "file_tree": [FileTreeItem(**f) for f in files]
    }

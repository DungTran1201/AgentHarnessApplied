import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, UploadFile, File
from pydantic import BaseModel, Field, field_validator

from src.db import query_one, query_all, execute_commit
from src.api.v1.projects import get_optional_current_user
from src.services.text_import_service import (
    TextImportService,
    TextFileImportRequest
)

logger = logging.getLogger("system_prompts")

prompts_router = APIRouter(prefix="/system-prompts", tags=["System Prompts"])

# ==============================================================================
# 1. PYDANTIC V2 SCHEMAS (CONTRACT SPECIFICATIONS)

# ==============================================================================

class SystemPromptCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Tên gợi nhớ của System Prompt (1-100 ký tự)"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Mô tả tóm tắt mục đích sử dụng (tối đa 500 ký tự)"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Nội dung văn bản chỉ dẫn hệ thống (1-10.000 ký tự)"
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Nội dung System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return v  # Giữ nguyên khoảng trắng và thụt lề ban đầu của nội dung

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class SystemPromptUpdateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Tên gợi nhớ mới của System Prompt (1-100 ký tự)"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Mô tả tóm tắt mới (tối đa 500 ký tự)"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Nội dung văn bản chỉ dẫn mới (1-10.000 ký tự)"
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nội dung System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return v

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class SystemPromptSummaryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    content_length: int
    created_at: str
    updated_at: str


class SystemPromptListResponse(BaseModel):
    items: List[SystemPromptSummaryResponse]
    total: int


class SystemPromptDetailResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    content: str
    attachments: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    created_at: str
    updated_at: str



# ==============================================================================
# 2. CONTROLLER ENDPOINTS
# ==============================================================================

@prompts_router.get("", response_model=SystemPromptListResponse)
async def list_system_prompts(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm lọc theo tên hoặc mô tả"),
    sort: str = Query("updated_desc", description="Thứ tự sắp xếp: updated_desc, name_asc, length_desc"),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Lấy danh sách System Prompt thuộc quyền sở hữu của người dùng hiện tại (hoặc guest_user).
    Chỉ trả về độ dài ký tự (content_length) thay vì toàn bộ text content để tối ưu payload.
    """
    user_id = current_user.get("id", "guest_user")

    # Xác định mệnh đề sắp xếp an toàn
    sort_clauses = {
        "updated_desc": "updated_at DESC",
        "name_asc": "name COLLATE NOCASE ASC",
        "length_desc": "LENGTH(content) DESC",
    }
    order_by = sort_clauses.get(sort, "updated_at DESC")

    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        sql = f"""
            SELECT id, name, description, LENGTH(content) AS content_length, created_at, updated_at
            FROM system_prompts
            WHERE user_id = ? AND (name LIKE ? OR description LIKE ?)
            ORDER BY {order_by}
        """
        rows = query_all(sql, (user_id, search_pattern, search_pattern))
    else:
        sql = f"""
            SELECT id, name, description, LENGTH(content) AS content_length, created_at, updated_at
            FROM system_prompts
            WHERE user_id = ?
            ORDER BY {order_by}
        """
        rows = query_all(sql, (user_id,))

    items = [
        SystemPromptSummaryResponse(
            id=r["id"],
            name=r["name"],
            description=r.get("description"),
            content_length=r.get("content_length", 0),
            created_at=str(r.get("created_at")),
            updated_at=str(r.get("updated_at"))
        )
        for r in rows
    ]

    return SystemPromptListResponse(items=items, total=len(items))


@prompts_router.post("", response_model=SystemPromptDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_system_prompt(
    payload: SystemPromptCreateRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Tạo mới một System Prompt trong thư viện người dùng.
    Kiểm tra trùng tên (NOCASE) -> 409 Conflict.
    Ghi log bảo mật: chỉ ghi metadata độ dài, tuyệt đối không log nội dung prompt.
    """
    user_id = current_user.get("id", "guest_user")
    name = payload.name.strip()

    # Kiểm tra trùng tên đối với user_id
    existing = query_one(
        "SELECT id FROM system_prompts WHERE user_id = ? AND LOWER(name) = LOWER(?)",
        (user_id, name)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "PROMPT_NAME_CONFLICT",
                "message": "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác."
            }
        )

    prompt_id = f"sp_{uuid.uuid4().hex}"
    execute_commit(
        """
        INSERT INTO system_prompts (id, user_id, name, description, content)
        VALUES (?, ?, ?, ?, ?)
        """,
        (prompt_id, user_id, name, payload.description, payload.content)
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
        "Tạo System Prompt thành công: id=%s, user_id=%s, name='%s', content_length=%d",
        prompt_id, user_id, name, len(payload.content)
    )

    return SystemPromptDetailResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        content=row["content"],
        created_at=str(row.get("created_at")),
        updated_at=str(row.get("updated_at"))
    )


@prompts_router.post("/import-file", response_model=SystemPromptDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_system_prompt_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Nhập System Prompt từ tệp văn bản tải lên từ máy tính cá nhân.
    """
    user_id = current_user.get("id", "guest_user")
    filename = file.filename or "untitled.txt"
    content_bytes = await file.read()
    text = TextImportService.validate_and_decode_bytes(filename, content_bytes)
    res = TextImportService.import_system_prompt(user_id=user_id, filename=filename, content=text)
    return SystemPromptDetailResponse(**res)


@prompts_router.post("/import-text", response_model=SystemPromptDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_system_prompt_text(
    req: TextFileImportRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Nhập System Prompt từ nội dung văn bản sau khi người dùng đã xem trước và tùy chỉnh.
    """
    user_id = current_user.get("id", "guest_user")
    text = TextImportService.validate_and_decode_bytes(req.filename, req.content.encode("utf-8"))
    res = TextImportService.import_system_prompt(
        user_id=user_id,
        filename=req.filename,
        content=text,
        override_name=req.name,
        override_desc=req.description
    )
    return SystemPromptDetailResponse(**res)


@prompts_router.get("/{id}", response_model=SystemPromptDetailResponse)
async def get_system_prompt_detail(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Lấy thông tin chi tiết (bao gồm chuỗi content đầy đủ) của một System Prompt.
    Cưỡng chế Anti-IDOR: chỉ chủ sở hữu mới có quyền truy cập.
    """
    user_id = current_user.get("id", "guest_user")

    row = query_one(
        "SELECT id, user_id, name, description, content, created_at, updated_at FROM system_prompts WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "PROMPT_NOT_FOUND",
                "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
            }
        )

    atts = query_all(
        """
        SELECT id, filename, mime_type, file_size, status, created_at
        FROM attachments
        WHERE prompt_id = ?
        ORDER BY created_at DESC
        """,
        (id,)
    )


    return SystemPromptDetailResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        content=row["content"],
        attachments=atts,
        created_at=str(row.get("created_at")),
        updated_at=str(row.get("updated_at"))
    )


@prompts_router.get("/{id}/attachments", summary="Lấy danh sách tệp tài nguyên đính kèm của System Prompt")
async def get_system_prompt_attachments(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Truy vấn danh sách các tài nguyên thư viện đã đính kèm vào System Prompt (Anti-IDOR).
    """
    user_id = current_user.get("id", "guest_user")
    row = query_one(
        "SELECT id FROM system_prompts WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "PROMPT_NOT_FOUND",
                "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
            }
        )

    atts = query_all(
        """
        SELECT id, filename, mime_type, file_size, status, created_at, updated_at
        FROM attachments
        WHERE prompt_id = ?
        ORDER BY created_at DESC
        """,
        (id,)
    )

    return {"items": atts, "total": len(atts)}



@prompts_router.put("/{id}", response_model=SystemPromptDetailResponse)
async def update_system_prompt(
    id: str,
    payload: SystemPromptUpdateRequest,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Cập nhật tên, mô tả hoặc nội dung của System Prompt có sẵn.
    Kiểm tra quyền sở hữu (404) và trùng tên với prompt khác (409).
    """
    user_id = current_user.get("id", "guest_user")
    name = payload.name.strip()

    # Kiểm tra tồn tại và quyền sở hữu (Anti-IDOR)
    existing = query_one(
        "SELECT id FROM system_prompts WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "PROMPT_NOT_FOUND",
                "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
            }
        )

    # Kiểm tra trùng tên với một bản ghi khác của cùng user
    conflict = query_one(
        "SELECT id FROM system_prompts WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ?",
        (user_id, name, id)
    )
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "PROMPT_NAME_CONFLICT",
                "message": "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác."
            }
        )

    execute_commit(
        """
        UPDATE system_prompts
        SET name = ?, description = ?, content = ?
        WHERE id = ? AND user_id = ?
        """,
        (name, payload.description, payload.content, id, user_id)
    )

    row = query_one(
        "SELECT id, user_id, name, description, content, created_at, updated_at FROM system_prompts WHERE id = ?",
        (id,)
    )

    logger.info(
        "Cập nhật System Prompt thành công: id=%s, user_id=%s, name='%s', content_length=%d",
        id, user_id, name, len(payload.content)
    )

    return SystemPromptDetailResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        content=row["content"],
        created_at=str(row.get("created_at")),
        updated_at=str(row.get("updated_at"))
    )


@prompts_router.delete("/{id}")
async def delete_system_prompt(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Xóa vĩnh viễn System Prompt khỏi cơ sở dữ liệu.
    Cưỡng chế Anti-IDOR: chỉ chủ sở hữu mới có quyền xóa.
    """
    user_id = current_user.get("id", "guest_user")

    existing = query_one(
        "SELECT id FROM system_prompts WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "PROMPT_NOT_FOUND",
                "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
            }
        )

    execute_commit("DELETE FROM system_prompts WHERE id = ? AND user_id = ?", (id, user_id))

    logger.info("Đã xóa System Prompt: id=%s, user_id=%s", id, user_id)

    return {
        "success": True,
        "message": "Đã xóa System Prompt thành công.",
        "deleted_id": id
    }


@prompts_router.post("/{id}/clone", response_model=SystemPromptDetailResponse, status_code=status.HTTP_201_CREATED)
async def clone_system_prompt(
    id: str,
    current_user: dict = Depends(get_optional_current_user)
):
    """
    Nhân bản một System Prompt có sẵn.
    Tự động sinh tên duy nhất (ví dụ: '[Tên gốc] (Copy)' hoặc '(Copy 2)'),
    đảm bảo không vượt quá giới hạn 100 ký tự và không gây lỗi trùng tên.
    """
    user_id = current_user.get("id", "guest_user")

    origin = query_one(
        "SELECT id, name, description, content FROM system_prompts WHERE id = ? AND user_id = ?",
        (id, user_id)
    )
    if not origin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "PROMPT_NOT_FOUND",
                "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
            }
        )

    # Sinh tên bản sao không trùng lặp
    base_name = origin["name"]
    clone_name = f"{base_name} (Copy)"
    if len(clone_name) > 100:
        base_name = base_name[: 100 - len(" (Copy)")]
        clone_name = f"{base_name} (Copy)"

    counter = 1
    while True:
        existing = query_one(
            "SELECT id FROM system_prompts WHERE user_id = ? AND LOWER(name) = LOWER(?)",
            (user_id, clone_name)
        )
        if not existing:
            break
        counter += 1
        suffix = f" (Copy {counter})"
        trimmed_base = base_name[: 100 - len(suffix)]
        clone_name = f"{trimmed_base}{suffix}"

    new_id = f"sp_{uuid.uuid4().hex}"
    execute_commit(
        """
        INSERT INTO system_prompts (id, user_id, name, description, content)
        VALUES (?, ?, ?, ?, ?)
        """,
        (new_id, user_id, clone_name, origin.get("description"), origin["content"])
    )

    row = query_one(
        "SELECT id, user_id, name, description, content, created_at, updated_at FROM system_prompts WHERE id = ?",
        (new_id,)
    )

    logger.info("Đã nhân bản System Prompt: origin_id=%s, new_id=%s, name='%s'", id, new_id, clone_name)

    return SystemPromptDetailResponse(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        description=row.get("description"),
        content=row["content"],
        created_at=str(row.get("created_at")),
        updated_at=str(row.get("updated_at"))
    )

"""
Unified File Attachments & Assets API Router
Path: ai-backend/src/api/v1/attachments.py
Implements: SRS Unified File Uploads (Chat, Project Chat, Skills Library, System Prompt Library)
Security: Anti-IDOR, Path Traversal Protection, Rate Limiting, MIME Sniffing, Executable Blocking
"""

import io
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.core.config import settings
from src.core.security import app_rate_limiter
from src.api.v1.projects import get_optional_current_user

from src.core.attachment_storage import (
    save_attachment_file,
    read_attachment_bytes,
    delete_attachment_file,
    get_attachment_absolute_path
)
from src.db import query_one, query_all, execute_commit

attachments_router = APIRouter(prefix="/attachments", tags=["File Attachments & Assets"])

# ==============================================================================
# PYDANTIC RESPONSE SCHEMAS
# ==============================================================================

class AttachmentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    mime_type: str
    category: str
    status: str
    checksum_sha256: Optional[str] = None
    extracted_text: Optional[str] = None
    created_at: str
    download_url: str
    view_url: str
    extracted_text_preview: Optional[str] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    project_id: Optional[str] = None
    skill_id: Optional[str] = None
    prompt_id: Optional[str] = None

class AttachmentListResponse(BaseModel):
    items: List[AttachmentResponse]
    total: int

class ModelCapability(BaseModel):
    model_id: str
    provider: str
    supports_images: bool
    supports_pdf_native: bool
    supports_text_documents: bool
    max_file_size_mb: int

class CapabilityResponse(BaseModel):
    default_provider: str
    max_file_size_mb: int
    max_files_per_request: int
    allowed_categories: List[str]
    supported_mime_types: List[str]
    models: List[ModelCapability]


def format_attachment_response(row: Dict[str, Any]) -> AttachmentResponse:
    """Formats database row into standard AttachmentResponse model."""
    att_id = row["id"]
    extracted = row.get("extracted_text") or ""
    preview = extracted[:200] + "..." if len(extracted) > 200 else (extracted or None)

    return AttachmentResponse(
        id=att_id,
        filename=row["filename"],
        file_size=row["file_size"],
        mime_type=row["mime_type"],
        category=row["category"],
        status=row["status"],
        checksum_sha256=row.get("checksum_sha256"),
        extracted_text=row.get("extracted_text"),
        created_at=str(row["created_at"]),
        download_url=f"/api/v1/attachments/{att_id}/download",
        view_url=f"/api/v1/attachments/{att_id}/view",
        extracted_text_preview=preview,
        image_width=row.get("image_width"),
        image_height=row.get("image_height"),
        conversation_id=row.get("conversation_id"),
        message_id=row.get("message_id"),
        project_id=row.get("project_id"),
        skill_id=row.get("skill_id"),
        prompt_id=row.get("prompt_id"),
    )


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@attachments_router.get("/capabilities", summary="Truy vấn khả năng xử lý tệp & mô hình hỗ trợ")
async def get_attachment_capabilities(
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Truy vấn giới hạn dung lượng tải lên và danh mục mô hình/modality hỗ trợ (SRS Capability-Aware).
    """
    return {
        "default_provider": settings.DEFAULT_LLM_PROVIDER or "gemini",
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        "max_files_per_request": settings.MAX_FILES_PER_REQUEST,
        "allowed_categories": ["image", "document", "code", "archive", "audio", "video", "other"],
        "supported_mime_types": [
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "application/pdf",
            "text/plain", "text/markdown", "text/csv", "application/json",
            "text/x-python", "text/javascript", "text/typescript", "text/html", "text/css"
        ],
        "models": [
            {
                "model_id": "gemini-3.8-flash",
                "provider": "google",
                "supports_images": True,
                "supports_pdf_native": True,
                "supports_text_documents": True,
                "max_file_size_mb": settings.MAX_FILE_SIZE_MB
            },
            {
                "model_id": "gemini-3.5-flash-lite",
                "provider": "google",
                "supports_images": True,
                "supports_pdf_native": True,
                "supports_text_documents": True,
                "max_file_size_mb": settings.MAX_FILE_SIZE_MB
            },
            {
                "model_id": "gpt-4o-mini",
                "provider": "openai",
                "supports_images": True,
                "supports_pdf_native": False,
                "supports_text_documents": True,
                "max_file_size_mb": settings.MAX_FILE_SIZE_MB
            }
        ]
    }


@attachments_router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED, summary="Tải lên tệp đính kèm hoặc tài nguyên thư viện")
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    context_type: Optional[str] = Form(None, description="'chat', 'project_chat', 'skill', 'system_prompt'"),
    context_id: Optional[str] = Form(None, description="ID của conversation, project, skill, hoặc prompt"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    app_rate_limiter.check(client_ip)
    user_id = current_user["id"]

    # Read binary content with size safeguard
    try:
        content_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể đọc luồng tệp tải lên: {str(e)}"
        )

    # Validate Context Ownership if context_id provided
    conversation_id = None
    project_id = None
    skill_id = None
    prompt_id = None

    if context_type == "chat" and context_id:
        conv = query_one("SELECT id FROM conversations WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')", (context_id, user_id))
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuộc trò chuyện không tồn tại hoặc bạn không có quyền.")
        conversation_id = context_id

    elif context_type in ("project_chat", "project") and context_id:
        proj = query_one("SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')", (context_id, user_id))
        if not proj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại hoặc bạn không có quyền.")
        project_id = context_id

    elif context_type == "skill" and context_id:
        sk = query_one("SELECT id FROM skills WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')", (context_id, user_id))
        if not sk:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kỹ năng không tồn tại hoặc bạn không có quyền.")
        skill_id = context_id

    elif context_type in ("system_prompt", "prompt") and context_id:
        sp = query_one("SELECT id FROM system_prompts WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')", (context_id, user_id))
        if not sp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System Prompt không tồn tại hoặc bạn không có quyền.")
        prompt_id = context_id

    # Save to safe storage & classify
    try:
        file_meta = save_attachment_file(user_id, file.filename or "file", content_bytes)
    except ValueError as val_err:
        err_str = str(val_err)
        err_code = "FILE_PROCESSING_FAILED"
        if "thực thi" in err_str or "script" in err_str or "Binary Executable" in err_str:
            err_code = "EXECUTABLE_FILE_BLOCKED"
        elif "rỗng" in err_str:
            err_code = "EMPTY_FILE"
        elif "vượt quá" in err_str:
            err_code = "FILE_TOO_LARGE"
        elif "MIME" in err_str or "định dạng" in err_str:
            err_code = "UNSUPPORTED_MEDIA_TYPE"


        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": err_code, "message": err_str}
        )


    # Persist in SQLite
    sql = """
        INSERT INTO attachments (
            id, user_id, conversation_id, project_id, skill_id, prompt_id,
            filename, file_size, mime_type, category, storage_path, checksum_sha256,
            status, extracted_text, image_width, image_height
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    execute_commit(
        sql,
        (
            file_meta["id"],
            user_id,
            conversation_id,
            project_id,
            skill_id,
            prompt_id,
            file_meta["filename"],
            file_meta["file_size"],
            file_meta["mime_type"],
            file_meta["category"],
            file_meta["storage_path"],
            file_meta["checksum_sha256"],
            file_meta["status"],
            file_meta["extracted_text"],
            file_meta["image_width"],
            file_meta["image_height"],
        )
    )

    created_row = query_one("SELECT * FROM attachments WHERE id = ?", (file_meta["id"],))
    return format_attachment_response(created_row)


@attachments_router.get("/capabilities", response_model=CapabilityResponse, summary="Lấy danh mục năng lực xử lý tệp của các mô hình")
async def get_attachment_capabilities():
    """Returns file modality capabilities for active LLM models in the system."""
    models_rows = query_all("SELECT id, name, provider, status FROM models WHERE status = 'ACTIVE'")
    model_caps: List[ModelCapability] = []

    for m in models_rows:
        prov = m.get("provider", "google").lower()
        mid = m["id"]
        
        # Gemini native multimodal: supports images and native PDF
        if prov == "google":
            model_caps.append(ModelCapability(
                model_id=mid,
                provider=prov,
                supports_images=True,
                supports_pdf_native=True,
                supports_text_documents=True,
                max_file_size_mb=settings.MAX_FILE_SIZE_MB
            ))
        elif prov == "openai":
            # GPT-4o / GPT-4o-mini supports images natively; PDF via text extraction fallback
            model_caps.append(ModelCapability(
                model_id=mid,
                provider=prov,
                supports_images=True,
                supports_pdf_native=False,
                supports_text_documents=True,
                max_file_size_mb=settings.MAX_FILE_SIZE_MB
            ))
        elif prov == "anthropic":
            model_caps.append(ModelCapability(
                model_id=mid,
                provider=prov,
                supports_images=True,
                supports_pdf_native=True,
                supports_text_documents=True,
                max_file_size_mb=settings.MAX_FILE_SIZE_MB
            ))
        else:
            # Groq / Ollama: text and document extraction only
            model_caps.append(ModelCapability(
                model_id=mid,
                provider=prov,
                supports_images=False,
                supports_pdf_native=False,
                supports_text_documents=True,
                max_file_size_mb=settings.MAX_FILE_SIZE_MB
            ))

    return CapabilityResponse(
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
        max_files_per_request=settings.MAX_FILES_PER_REQUEST,
        allowed_categories=["image", "document", "code", "archive", "audio", "video", "other"],
        models=model_caps
    )


@attachments_router.get("/", response_model=AttachmentListResponse, summary="Danh sách tệp đính kèm theo bộ lọc")
@attachments_router.get("", response_model=AttachmentListResponse, include_in_schema=False)
async def list_attachments(
    conversation_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    skill_id: Optional[str] = Query(None),
    prompt_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    conditions = ["(user_id = ? OR user_id = 'guest_user')", "status != 'DELETED'"]
    params: List[Any] = [user_id]

    if conversation_id:
        conditions.append("conversation_id = ?")
        params.append(conversation_id)
    if project_id:
        conditions.append("project_id = ?")
        params.append(project_id)
    if skill_id:
        conditions.append("skill_id = ?")
        params.append(skill_id)
    if prompt_id:
        conditions.append("prompt_id = ?")
        params.append(prompt_id)
    if status_filter:
        conditions.append("status = ?")
        params.append(status_filter)

    where_clause = " AND ".join(conditions)
    rows = query_all(
        f"SELECT * FROM attachments WHERE {where_clause} ORDER BY created_at DESC LIMIT 100",
        tuple(params)
    )
    return AttachmentListResponse(
        items=[format_attachment_response(r) for r in rows],
        total=len(rows)
    )


@attachments_router.get("/{attachment_id}", response_model=AttachmentResponse, summary="Lấy thông tin chi tiết tệp đính kèm")
async def get_attachment_detail(
    attachment_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    # Anti-IDOR check
    row = query_one(
        "SELECT * FROM attachments WHERE id = ? AND (user_id = ? OR user_id = 'guest_user') AND status != 'DELETED'",
        (attachment_id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tệp không tồn tại hoặc bạn không có quyền truy cập."
        )
    return format_attachment_response(row)


@attachments_router.get("/{attachment_id}/download", summary="Tải xuống tệp nhị phân gốc an toàn")
async def download_attachment(
    attachment_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    # Anti-IDOR check
    row = query_one(
        "SELECT * FROM attachments WHERE id = ? AND (user_id = ? OR user_id = 'guest_user') AND status != 'DELETED'",
        (attachment_id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tệp không tồn tại hoặc bạn không có quyền truy cập."
        )

    try:
        raw_bytes = read_attachment_bytes(row["storage_path"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không thể đọc nội dung tệp lưu trữ: {str(exc)}"
        )

    clean_filename = row["filename"]
    return StreamingResponse(
        io.BytesIO(raw_bytes),
        media_type=row["mime_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{clean_filename}"',
            "Content-Length": str(len(raw_bytes)),
            "X-Content-Type-Options": "nosniff"
        }
    )


@attachments_router.get("/{attachment_id}/view", summary="Xem nội dung tệp trực tiếp trong trình duyệt (Preview inline)")
async def view_attachment(
    attachment_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    # Anti-IDOR check
    row = query_one(
        "SELECT * FROM attachments WHERE id = ? AND (user_id = ? OR user_id = 'guest_user') AND status != 'DELETED'",
        (attachment_id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tệp không tồn tại hoặc bạn không có quyền truy cập."
        )

    try:
        raw_bytes = read_attachment_bytes(row["storage_path"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không thể đọc nội dung tệp lưu trữ: {str(exc)}"
        )

    # Disallow inline execution of HTML / SVG to prevent XSS (Sec-003)
    mime = row["mime_type"]
    if mime in ("text/html", "image/svg+xml", "application/xhtml+xml"):
        mime = "text/plain"

    return StreamingResponse(
        io.BytesIO(raw_bytes),
        media_type=mime,
        headers={
            "Content-Disposition": f'inline; filename="{row["filename"]}"',
            "Content-Length": str(len(raw_bytes)),
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline';"
        }
    )


@attachments_router.delete("/{attachment_id}", summary="Xóa tệp đính kèm")
async def delete_attachment(
    attachment_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    # Anti-IDOR check
    row = query_one(
        "SELECT * FROM attachments WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
        (attachment_id, user_id)
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tệp không tồn tại hoặc bạn không có quyền xóa."
        )

    # Delete physical file on disk
    delete_attachment_file(row["storage_path"])

    # Delete record from database
    execute_commit("DELETE FROM attachments WHERE id = ?", (attachment_id,))

    return {
        "id": attachment_id,
        "deleted": True,
        "message": "Đã xóa tệp đính kèm thành công."
    }

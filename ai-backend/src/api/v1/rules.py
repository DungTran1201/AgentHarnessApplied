"""
FastAPI Endpoints for Rules Management System
Prefix: /rules and /projects/{project_id}/rules
Tags: ["Rules Management"]
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, UploadFile, File

from src.api.v1.projects import get_optional_current_user
from src.services.rule_service import (
    RuleService,
    RuleCreateRequest,
    RuleUpdateRequest,
    RuleStatusUpdateRequest,
    RuleResponse,
    PaginatedRuleResponse,
    ProjectRuleBindingRequest
)
from src.services.text_import_service import (
    TextImportService,
    TextFileImportRequest
)

logger = logging.getLogger("api.rules")

rules_router = APIRouter(prefix="/rules", tags=["Rules Management"])
project_rules_router = APIRouter(prefix="/projects/{project_id}/rules", tags=["Project Rule Bindings"])


# ==============================================================================
# 1. RULES LIBRARY / CRUD ENDPOINTS
# ==============================================================================

@rules_router.get("", response_model=PaginatedRuleResponse, summary="List rules with search, filters, and pagination")
async def list_rules_endpoint(
    search: Optional[str] = Query(None, description="Search by name, description or tag"),
    scope: Optional[str] = Query("all", description="Filter by scope: 'all', 'user', 'system'"),
    activation_mode: Optional[str] = Query(None, description="Filter by activation mode: always_on, model_decision, glob, manual"),
    status: Optional[str] = Query("active", description="Filter by status: 'active', 'inactive', 'archived', 'all'"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("updated_at", description="Field to sort by: updated_at, created_at, name, priority"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Lấy danh sách các quy tắc (Rules Library) với đầy đủ bộ lọc, tìm kiếm và phân trang.
    Tự động áp dụng Anti-IDOR: chỉ trả về các quy tắc thuộc quyền người dùng và system rules.
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.list_rules(
        user_id=user_id,
        search=search,
        scope=scope,
        activation_mode=activation_mode,
        status_filter=status,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )


@rules_router.post("", response_model=RuleResponse, status_code=status.HTTP_201_CREATED, summary="Create a new rule")
async def create_rule_endpoint(
    req: RuleCreateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Tạo mới một quy tắc trong thư viện cá nhân của người dùng (RUL-FR-006).
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.create_rule(user_id=user_id, req=req)


@rules_router.post("/import-file", response_model=RuleResponse, status_code=status.HTTP_201_CREATED, summary="Import rule from a text file")
async def import_rule_file_endpoint(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Nhập quy tắc mới từ tệp văn bản (.md, .txt, .json, .yaml...) tải lên từ máy tính.
    """
    user_id = current_user.get("id", "guest_user")
    filename = file.filename or "untitled.txt"
    content_bytes = await file.read()
    text = TextImportService.validate_and_decode_bytes(filename, content_bytes)
    return TextImportService.import_rule(user_id=user_id, filename=filename, content=text)


@rules_router.post("/import-text", response_model=RuleResponse, status_code=status.HTTP_201_CREATED, summary="Import rule from verified text payload")
async def import_rule_text_endpoint(
    req: TextFileImportRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Nhập quy tắc từ nội dung văn bản sau khi người dùng đã xem trước (preview) và chỉnh sửa thông tin.
    """
    user_id = current_user.get("id", "guest_user")
    text = TextImportService.validate_and_decode_bytes(req.filename, req.content.encode("utf-8"))
    return TextImportService.import_rule(
        user_id=user_id,
        filename=req.filename,
        content=text,
        override_name=req.name,
        override_desc=req.description,
        activation_mode=req.activation_mode,
        glob_patterns=req.glob_patterns,
        tags=req.tags,
        priority=req.priority
    )


@rules_router.get("/{rule_id}", response_model=RuleResponse, summary="Get rule details by ID")
async def get_rule_endpoint(
    rule_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Lấy chi tiết một Rule theo ID.
    Áp dụng Anti-IDOR: Trả về HTTP 404 nếu ID không tồn tại hoặc thuộc người dùng khác.
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.get_rule(user_id=user_id, rule_id=rule_id)


@rules_router.put("/{rule_id}", response_model=RuleResponse, summary="Update an existing rule")
async def update_rule_endpoint(
    rule_id: str,
    req: RuleUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Cập nhật nội dung và metadata của Rule (RUL-FR-007).
    - Ngăn chặn sửa System Rule (HTTP 403 Forbidden).
    - Kiểm soát xung đột ghi đè Optimistic Concurrency Control qua trường version (HTTP 409 Conflict).
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.update_rule(user_id=user_id, rule_id=rule_id, req=req)


@rules_router.patch("/{rule_id}/status", response_model=RuleResponse, summary="Quick toggle rule active status")
async def update_rule_status_endpoint(
    rule_id: str,
    req: RuleStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Bật hoặc tắt nhanh trạng thái hoạt động (active / inactive) của Rule (RUL-FR-003).
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.update_status(user_id=user_id, rule_id=rule_id, new_status=req.status)


@rules_router.post("/{rule_id}/clone", response_model=RuleResponse, status_code=status.HTTP_201_CREATED, summary="Clone a rule to user library")
async def clone_rule_endpoint(
    rule_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Nhân bản một Rule (kể cả System Rule) thành Rule mới trong thư viện cá nhân (RUL-FR-004).
    Tự động thêm hậu tố (Copy) vào tên quy tắc.
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.clone_rule(user_id=user_id, rule_id=rule_id)


@rules_router.delete("/{rule_id}", summary="Soft delete a rule with reference guard")
async def delete_rule_endpoint(
    rule_id: str,
    force: bool = Query(False, description="Nếu true, tự động gỡ liên kết khỏi các dự án và xóa mềm"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Xóa mềm một Rule (RUL-FR-005).
    - Nếu force=false và Rule đang được liên kết trong dự án: Trả về HTTP 400 kèm danh sách dự án bị ảnh hưởng.
    - Nếu force=true: Tự động gỡ liên kết và xóa mềm an toàn.
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.delete_rule(user_id=user_id, rule_id=rule_id, force=force)


@rules_router.get("/{rule_id}/projects", summary="Get list of projects using this rule")
async def get_rule_projects_endpoint(
    rule_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Lấy danh sách các Project của người dùng hiện tại đang liên kết với Rule này (RUL-FR-011).
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.get_associated_projects(user_id=user_id, rule_id=rule_id)


# ==============================================================================
# 2. PROJECT RULES BINDING ENDPOINTS
# ==============================================================================

@project_rules_router.get("", summary="Get rules bound to a project")
async def get_project_rules_endpoint(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Lấy danh sách các Rule được gán cho một Project cụ thể.
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.get_project_rules(user_id=user_id, project_id=project_id)


@project_rules_router.put("", summary="Synchronize rules bound to a project")
async def sync_project_rules_endpoint(
    project_id: str,
    req: ProjectRuleBindingRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """
    Đồng bộ danh sách liên kết Rules cho một Project (RUL-FR-012).
    """
    user_id = current_user.get("id", "guest_user")
    return RuleService.sync_project_rules(user_id=user_id, project_id=project_id, rule_ids=req.rule_ids)

"""
Service and schema layer for Rules Management
Handles business rules, validations, persistence, and authorization for Rules Library & Editor.
"""

import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from pydantic import BaseModel, Field, field_validator

from src.db import query_one, query_all, execute_commit

logger = logging.getLogger("rules_service")

# ==============================================================================
# 1. PYDANTIC V2 SCHEMAS
# ==============================================================================

class RuleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên quy tắc (1-100 ký tự)")
    description: Optional[str] = Field(default=None, max_length=500, description="Mô tả tóm tắt mục đích (tối đa 500 ký tự)")
    content: str = Field(..., min_length=1, max_length=10000, description="Nội dung Markdown quy tắc (1-10.000 ký tự)")
    activation_mode: str = Field(default="always_on", description="Chế độ kích hoạt: always_on, model_decision, glob, manual")
    glob_patterns: List[str] = Field(default_factory=list, description="Danh sách glob patterns khi activation_mode = 'glob'")
    tags: List[str] = Field(default_factory=list, description="Danh sách các tag phân loại")
    priority: int = Field(default=50, ge=0, le=100, description="Mức độ ưu tiên từ 0 đến 100")

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên quy tắc không được để trống hoặc chỉ chứa khoảng trắng.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Nội dung quy tắc không được để trống hoặc chỉ chứa khoảng trắng.")
        return v

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None

    @field_validator("activation_mode")
    @classmethod
    def validate_activation_mode(cls, v: str) -> str:
        valid_modes = {"always_on", "model_decision", "glob", "manual"}
        if v not in valid_modes:
            raise ValueError(f"activation_mode không hợp lệ. Phải là một trong: {valid_modes}")
        return v

    @field_validator("glob_patterns")
    @classmethod
    def validate_glob_patterns(cls, patterns: List[str]) -> List[str]:
        cleaned = []
        for p in patterns:
            p_str = str(p).strip()
            if not p_str:
                continue
            if ".." in p_str:
                raise ValueError("Glob pattern không được chứa ký tự điều hướng thư mục cha '..'.")
            cleaned.append(p_str)
        return cleaned


class RuleUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên quy tắc mới (1-100 ký tự)")
    description: Optional[str] = Field(default=None, max_length=500, description="Mô tả tóm tắt mới")
    content: str = Field(..., min_length=1, max_length=10000, description="Nội dung Markdown mới")
    activation_mode: str = Field(default="always_on", description="Chế độ kích hoạt")
    glob_patterns: List[str] = Field(default_factory=list, description="Danh sách glob patterns")
    tags: List[str] = Field(default_factory=list, description="Danh sách tags")
    priority: int = Field(default=50, ge=0, le=100, description="Mức độ ưu tiên từ 0 đến 100")
    status: Optional[str] = Field(default="active", description="Trạng thái: active, inactive, archived")
    version: int = Field(..., ge=1, description="Số phiên bản hiện tại phục vụ Optimistic Concurrency Control")

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên quy tắc không được để trống hoặc chỉ chứa khoảng trắng.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nội dung quy tắc không được để trống hoặc chỉ chứa khoảng trắng.")
        return v

    @field_validator("activation_mode")
    @classmethod
    def validate_activation_mode(cls, v: str) -> str:
        valid_modes = {"always_on", "model_decision", "glob", "manual"}
        if v not in valid_modes:
            raise ValueError(f"activation_mode không hợp lệ. Phải là một trong: {valid_modes}")
        return v

    @field_validator("glob_patterns")
    @classmethod
    def validate_glob_patterns(cls, patterns: List[str]) -> List[str]:
        cleaned = []
        for p in patterns:
            p_str = str(p).strip()
            if not p_str:
                continue
            if ".." in p_str:
                raise ValueError("Glob pattern không được chứa ký tự điều hướng thư mục cha '..'.")
            cleaned.append(p_str)
        return cleaned


class RuleStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Trạng thái mới: 'active' hoặc 'inactive'")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("active", "inactive"):
            raise ValueError("Trạng thái chỉ có thể là 'active' hoặc 'inactive'.")
        return v


class RuleResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    content: str
    scope: str
    activation_mode: str
    glob_patterns: List[str] = []
    tags: List[str] = []
    priority: int
    status: str
    version: int
    is_editable: bool = True
    associated_projects_count: int = 0
    created_at: str
    updated_at: str
    deleted_at: Optional[str] = None


class PaginatedRuleResponse(BaseModel):
    items: List[RuleResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class ProjectRuleBindingRequest(BaseModel):
    rule_ids: List[str] = Field(default_factory=list, description="Danh sách rule_id muốn gán cho dự án")


# ==============================================================================
# 2. BUSINESS SERVICE IMPLEMENTATION
# ==============================================================================

class RuleService:

    @staticmethod
    def _parse_json_field(field_val: Any) -> List[str]:
        if not field_val:
            return []
        if isinstance(field_val, list):
            return [str(x) for x in field_val]
        if isinstance(field_val, str):
            try:
                parsed = json.loads(field_val)
                if isinstance(parsed, list):
                    return [str(x) for x in parsed]
            except Exception:
                return []
        return []

    @classmethod
    def _map_row_to_response(cls, row: Dict[str, Any], current_user_id: str) -> RuleResponse:
        scope = row.get("scope") or "user"
        user_id = row.get("user_id")
        is_editable = (scope != "system") and (user_id == current_user_id)
        
        # Count project associations
        rule_id = row["id"]
        count_row = query_one(
            "SELECT COUNT(*) as cnt FROM project_rules WHERE rule_id = ? AND is_enabled = 1",
            (rule_id,)
        )
        associated_count = count_row["cnt"] if count_row else 0

        return RuleResponse(
            id=row["id"],
            user_id=row.get("user_id"),
            name=row["name"],
            description=row.get("description"),
            content=row["content"],
            scope=scope,
            activation_mode=row.get("activation_mode") or "always_on",
            glob_patterns=cls._parse_json_field(row.get("glob_patterns")),
            tags=cls._parse_json_field(row.get("tags")),
            priority=row.get("priority", 50),
            status=row.get("status", "active"),
            version=row.get("version", 1),
            is_editable=is_editable,
            associated_projects_count=associated_count,
            created_at=str(row.get("created_at") or ""),
            updated_at=str(row.get("updated_at") or ""),
            deleted_at=str(row.get("deleted_at")) if row.get("deleted_at") else None
        )

    @classmethod
    def list_rules(
        cls,
        user_id: str,
        search: Optional[str] = None,
        scope: Optional[str] = "all",
        activation_mode: Optional[str] = None,
        status_filter: Optional[str] = "active",
        page: int = 1,
        limit: int = 20,
        sort_by: str = "updated_at",
        sort_order: str = "desc"
    ) -> PaginatedRuleResponse:
        """
        Lấy danh sách các rules thuộc quyền người dùng và system rules (RUL-FR-001, RUL-BR-003).
        """
        page = max(1, page)
        limit = min(max(1, limit), 100)
        offset = (page - 1) * limit

        conditions = ["deleted_at IS NULL"]
        params: List[Any] = []

        # Scope filter (Anti-IDOR)
        if scope == "user":
            conditions.append("user_id = ? AND scope = 'user'")
            params.append(user_id)
        elif scope == "system":
            conditions.append("scope = 'system'")
        else:
            # All available to user: own rules or system rules
            conditions.append("(user_id = ? OR scope = 'system')")
            params.append(user_id)

        # Status filter
        if status_filter and status_filter != "all":
            conditions.append("status = ?")
            params.append(status_filter)

        # Activation mode filter
        if activation_mode and activation_mode != "all":
            conditions.append("activation_mode = ?")
            params.append(activation_mode)

        # Search filter (name, description, tags)
        if search and search.strip():
            q = f"%{search.strip()}%"
            conditions.append("(name LIKE ? OR description LIKE ? OR tags LIKE ?)")
            params.extend([q, q, q])

        where_clause = " AND ".join(conditions)

        # Sort order
        allowed_sort_fields = {
            "updated_at": "updated_at",
            "created_at": "created_at",
            "name": "name",
            "priority": "priority"
        }
        order_col = allowed_sort_fields.get(sort_by, "updated_at")
        order_dir = "ASC" if str(sort_order).lower() == "asc" else "DESC"

        # Count total
        count_sql = f"SELECT COUNT(*) as total FROM rules WHERE {where_clause}"
        total_row = query_one(count_sql, tuple(params))
        total_items = total_row["total"] if total_row else 0

        # Query items
        query_sql = f"""
            SELECT * FROM rules 
            WHERE {where_clause}
            ORDER BY {order_col} {order_dir}
            LIMIT ? OFFSET ?
        """
        items_params = params + [limit, offset]
        rows = query_all(query_sql, tuple(items_params))

        items = [cls._map_row_to_response(r, user_id) for r in rows]
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 1

        return PaginatedRuleResponse(
            items=items,
            total=total_items,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    @classmethod
    def get_rule(cls, user_id: str, rule_id: str) -> RuleResponse:
        """
        Lấy chi tiết một Rule. Áp dụng Anti-IDOR: chỉ trả về nếu rule thuộc về user hoặc là system rule.
        """
        row = query_one(
            "SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL",
            (rule_id,)
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc với ID '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        # Anti-IDOR check
        if row.get("scope") != "system" and row.get("user_id") != user_id:
            # Ẩn sự tồn tại của UUID người khác
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc với ID '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        return cls._map_row_to_response(row, user_id)

    @classmethod
    def create_rule(cls, user_id: str, req: RuleCreateRequest) -> RuleResponse:
        """
        Tạo mới một quy tắc trong thư viện cá nhân (RUL-FR-006, RUL-BR-001).
        """
        # Validate glob_patterns requirement if activation_mode == 'glob'
        if req.activation_mode == "glob" and not req.glob_patterns:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Khi chế độ kích hoạt là 'glob', danh sách glob_patterns bắt buộc phải có ít nhất 1 pattern."
            )

        # Check duplicate name for this user (RUL-BR-001)
        existing = query_one(
            "SELECT id FROM rules WHERE user_id = ? AND name = ? COLLATE NOCASE AND deleted_at IS NULL",
            (user_id, req.name)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tên quy tắc '{req.name}' đã tồn tại trong tài khoản của bạn. Vui lòng chọn tên khác."
            )

        new_id = f"rul_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        globs_json = json.dumps(req.glob_patterns, ensure_ascii=False)
        tags_json = json.dumps(req.tags, ensure_ascii=False)

        execute_commit(
            """
            INSERT INTO rules (
                id, user_id, name, description, content,
                scope, activation_mode, glob_patterns, tags,
                priority, status, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, 'active', 1, ?, ?)
            """,
            (
                new_id, user_id, req.name, req.description, req.content,
                req.activation_mode, globs_json, tags_json,
                req.priority, now, now
            )
        )

        return cls.get_rule(user_id, new_id)

    @classmethod
    def update_rule(cls, user_id: str, rule_id: str, req: RuleUpdateRequest) -> RuleResponse:
        """
        Cập nhật Rule. Kiểm tra quyền sở hữu, ngăn chặn sửa System Rule, và kiểm tra Optimistic Lock (RUL-FR-007, RUL-BR-002, RUL-BR-011).
        """
        existing = query_one(
            "SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL",
            (rule_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        # Chặn sửa System Rule (RUL-BR-002)
        if existing.get("scope") == "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không thể chỉnh sửa Quy tắc Hệ thống (System Rule). Vui lòng nhân bản (Clone) để tạo bản sao riêng."
            )

        # Anti-IDOR check
        if existing.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        # Optimistic concurrency check (RUL-BR-011)
        current_version = existing.get("version", 1)
        if current_version != req.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Quy tắc đã bị sửa đổi bởi một phiên khác (Phiên bản máy chủ: {current_version}, bạn gửi: {req.version}). Vui lòng tải lại dữ liệu mới nhất."
            )

        # Check duplicate name if name changed
        if req.name.lower() != existing["name"].lower():
            dup = query_one(
                "SELECT id FROM rules WHERE user_id = ? AND name = ? COLLATE NOCASE AND id != ? AND deleted_at IS NULL",
                (user_id, req.name, rule_id)
            )
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Tên quy tắc '{req.name}' đã tồn tại trong tài khoản của bạn."
                )

        if req.activation_mode == "glob" and not req.glob_patterns:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Khi chế độ kích hoạt là 'glob', danh sách glob_patterns bắt buộc phải có ít nhất 1 pattern."
            )

        now = datetime.now(timezone.utc).isoformat()
        globs_json = json.dumps(req.glob_patterns, ensure_ascii=False)
        tags_json = json.dumps(req.tags, ensure_ascii=False)
        new_version = current_version + 1
        new_status = req.status or existing.get("status", "active")

        execute_commit(
            """
            UPDATE rules SET
                name = ?,
                description = ?,
                content = ?,
                activation_mode = ?,
                glob_patterns = ?,
                tags = ?,
                priority = ?,
                status = ?,
                version = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                req.name, req.description, req.content,
                req.activation_mode, globs_json, tags_json,
                req.priority, new_status, new_version, now,
                rule_id
            )
        )

        return cls.get_rule(user_id, rule_id)

    @classmethod
    def update_status(cls, user_id: str, rule_id: str, new_status: str) -> RuleResponse:
        """
        Bật/tắt nhanh trạng thái active/inactive của Rule (RUL-FR-003).
        """
        existing = query_one(
            "SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL",
            (rule_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        if existing.get("scope") == "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không thể thay đổi trạng thái của Quy tắc Hệ thống."
            )

        if existing.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        now = datetime.now(timezone.utc).isoformat()
        execute_commit(
            "UPDATE rules SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, rule_id)
        )
        return cls.get_rule(user_id, rule_id)

    @classmethod
    def clone_rule(cls, user_id: str, rule_id: str) -> RuleResponse:
        """
        Nhân bản một Rule (kể cả System Rule) thành Rule mới của người dùng (RUL-FR-004, RUL-BR-012).
        """
        source = query_one(
            "SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL",
            (rule_id,)
        )
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc nguồn '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        # Generate unique copy name
        base_name = source["name"].strip()
        copy_name = f"{base_name} (Copy)"
        idx = 2
        while True:
            exists = query_one(
                "SELECT id FROM rules WHERE user_id = ? AND name = ? COLLATE NOCASE AND deleted_at IS NULL",
                (user_id, copy_name)
            )
            if not exists:
                break
            copy_name = f"{base_name} (Copy {idx})"
            idx += 1

        new_id = f"rul_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        execute_commit(
            """
            INSERT INTO rules (
                id, user_id, name, description, content,
                scope, activation_mode, glob_patterns, tags,
                priority, status, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, 'active', 1, ?, ?)
            """,
            (
                new_id, user_id, copy_name, source.get("description"), source["content"],
                source.get("activation_mode", "always_on"),
                source.get("glob_patterns", "[]"),
                source.get("tags", "[]"),
                source.get("priority", 50),
                now, now
            )
        )

        return cls.get_rule(user_id, new_id)

    @classmethod
    def delete_rule(cls, user_id: str, rule_id: str, force: bool = False) -> Dict[str, Any]:
        """
        Xóa mềm Rule kèm kiểm tra tham chiếu dự án (RUL-FR-005, RUL-BR-006, RUL-BR-007).
        """
        existing = query_one(
            "SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL",
            (rule_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        if existing.get("scope") == "system":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không thể xóa Quy tắc Hệ thống."
            )

        if existing.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc '{rule_id}' không tồn tại hoặc đã bị xóa."
            )

        # Check project bindings
        active_bindings = query_all(
            """
            SELECT p.id, p.name 
            FROM project_rules pr
            JOIN projects p ON pr.project_id = p.id
            WHERE pr.rule_id = ? AND pr.is_enabled = 1
            """,
            (rule_id,)
        )

        if active_bindings and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "RULE_IN_USE_BY_PROJECTS",
                    "message": f"Quy tắc này đang được liên kết trong {len(active_bindings)} dự án. Cần xác nhận force=true để gỡ liên kết và xóa.",
                    "projects": active_bindings
                }
            )

        now = datetime.now(timezone.utc).isoformat()
        # Soft delete rule
        execute_commit(
            "UPDATE rules SET deleted_at = ?, status = 'archived' WHERE id = ?",
            (now, rule_id)
        )

        # Detach/disable project bindings
        detached_count = execute_commit(
            "UPDATE project_rules SET is_enabled = 0 WHERE rule_id = ?",
            (rule_id,)
        )

        return {
            "message": "Đã xóa mềm quy tắc thành công.",
            "id": rule_id,
            "deleted_at": now,
            "detached_projects_count": detached_count
        }

    @classmethod
    def get_associated_projects(cls, user_id: str, rule_id: str) -> List[Dict[str, Any]]:
        """
        Lấy danh sách các Project mà người dùng sở hữu đang sử dụng Rule này (RUL-FR-011).
        """
        # Ensure rule exists
        cls.get_rule(user_id, rule_id)

        rows = query_all(
            """
            SELECT p.id, p.name, p.status, pr.is_enabled, pr.bound_at
            FROM project_rules pr
            JOIN projects p ON pr.project_id = p.id
            WHERE pr.rule_id = ? AND p.user_id = ?
            ORDER BY pr.bound_at DESC
            """,
            (rule_id, user_id)
        )
        return rows

    @classmethod
    def get_project_rules(cls, user_id: str, project_id: str) -> List[Dict[str, Any]]:
        """
        Lấy danh sách các rules được gán cho một project cụ thể.
        """
        # Check project ownership
        project = query_one("SELECT id, user_id FROM projects WHERE id = ?", (project_id,))
        if not project:
            raise HTTPException(status_code=404, detail="Dự án không tồn tại.")
        if project["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Dự án không tồn tại.")

        rows = query_all(
            """
            SELECT r.*, pr.is_enabled as binding_enabled, pr.custom_priority, pr.bound_at
            FROM project_rules pr
            JOIN rules r ON pr.rule_id = r.id
            WHERE pr.project_id = ? AND r.deleted_at IS NULL
            ORDER BY pr.bound_at ASC
            """,
            (project_id,)
        )
        return rows

    @classmethod
    def sync_project_rules(cls, user_id: str, project_id: str, rule_ids: List[str]) -> Dict[str, Any]:
        """
        Đồng bộ danh sách rules gán cho một project.
        """
        project = query_one("SELECT id, user_id FROM projects WHERE id = ?", (project_id,))
        if not project:
            raise HTTPException(status_code=404, detail="Dự án không tồn tại.")
        if project["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Dự án không tồn tại.")

        # Delete existing bindings
        execute_commit("DELETE FROM project_rules WHERE project_id = ?", (project_id,))

        # Insert new bindings
        now = datetime.now(timezone.utc).isoformat()
        bound_count = 0
        for rid in rule_ids:
            # Verify rule exists and is accessible
            rule = query_one(
                "SELECT id FROM rules WHERE id = ? AND (user_id = ? OR scope = 'system') AND deleted_at IS NULL",
                (rid, user_id)
            )
            if rule:
                bid = f"pr_{uuid.uuid4().hex[:12]}"
                execute_commit(
                    "INSERT INTO project_rules (id, project_id, rule_id, is_enabled, bound_at) VALUES (?, ?, ?, 1, ?)",
                    (bid, project_id, rid, now)
                )
                bound_count += 1

        return {
            "message": "Đồng bộ liên kết quy tắc dự án thành công.",
            "project_id": project_id,
            "bound_rules_count": bound_count
        }

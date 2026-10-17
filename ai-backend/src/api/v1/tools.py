"""
FastAPI Endpoints for Tool Management & Registry
Prefix: /tools
Tags: ["Tool Management"]
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request

from src.api.v1.projects import get_optional_current_user
from src.services.tools.models import (
    ToolCategory,
    ToolStatus,
    ToolSummaryResponse,
    ToolDetailResponse,
    ToolListResponse,
    ToolStatusUpdateRequest,
    ToolConfigurationUpdateRequest,
    ToolTestRequest,
    ToolTestResponse,
    ToolExecutionRequest,
    ToolExecutionResponse,
    ProjectToolBindingRequest,
    ProjectToolBindingResponse
)
from src.services.tools.registry import ToolRegistryService
from src.services.tools.executor import ToolExecutorService

logger = logging.getLogger("api.tools")

tools_router = APIRouter(prefix="/tools", tags=["Tool Management"])
project_tools_router = APIRouter(prefix="/projects/{project_id}/tools", tags=["Project Tool Bindings"])


# ==============================================================================
# 1. TOOL REGISTRY / LIBRARY ENDPOINTS
# ==============================================================================

@tools_router.get("", response_model=ToolListResponse, summary="List tools with search, filter, and pagination")
async def list_tools_endpoint(
    search: Optional[str] = Query(None, description="Search by name, description or tag"),
    category: Optional[str] = Query(None, description="Filter by category (WEB, FILE, FAISS, DATA)"),
    status: Optional[str] = Query(None, description="Filter by status (AVAILABLE, DISABLED, etc.)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Lấy danh sách các công cụ trong Tool Registry với bộ lọc và phân trang."""
    try:
        return ToolRegistryService.list_tools(
            search=search,
            category=category,
            status=status,
            risk_level=risk_level,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tools: {str(e)}"
        )


@tools_router.get("/categories", summary="List categories and tool count")
async def get_categories_endpoint(
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Lấy danh sách các nhóm công cụ và số lượng tương ứng."""
    res = ToolRegistryService.list_tools(limit=100)
    return {"categories": res.categories}


@tools_router.get("/{tool_id}", response_model=ToolDetailResponse, summary="Get tool detail, schemas and configuration")
async def get_tool_endpoint(
    tool_id: str,
    project_id: Optional[str] = Query(None, description="Project context (tùy chọn)"),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Xem chi tiết định nghĩa, schemas, và trạng thái cấu hình của một công cụ."""
    try:
        user_id = current_user.get("id") if current_user else None
        return ToolRegistryService.get_tool(tool_id, project_id=project_id, user_id=user_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with id '{tool_id}' not found."
        )
    except Exception as e:
        logger.error(f"Error retrieving tool '{tool_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tool detail: {str(e)}"
        )


@tools_router.patch("/{tool_id}/status", summary="Enable or disable a tool")
async def update_tool_status_endpoint(
    tool_id: str,
    payload: ToolStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Bật hoặc tắt trạng thái hoạt động của một công cụ."""
    try:
        ToolRegistryService.set_tool_status(tool_id, payload.status)
        return {
            "tool_id": tool_id,
            "status": payload.status.value,
            "message": f"Tool '{tool_id}' status successfully updated to {payload.status.value}."
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{tool_id}' not found.")
    except Exception as e:
        logger.error(f"Error updating status for tool '{tool_id}': {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@tools_router.get("/{tool_id}/configuration", summary="Get tool configuration")
async def get_tool_configuration_endpoint(
    tool_id: str,
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Lấy cấu hình hiện tại của công cụ (secrets được ẩn/mask)."""
    try:
        user_id = current_user.get("id") if current_user else None
        detail = ToolRegistryService.get_tool(tool_id, project_id=project_id, user_id=user_id)
        return {
            "tool_id": tool_id,
            "configuration": detail.current_configuration or {}
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{tool_id}' not found.")


@tools_router.put("/{tool_id}/configuration", summary="Update tool configuration")
async def update_tool_configuration_endpoint(
    tool_id: str,
    payload: ToolConfigurationUpdateRequest,
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Cập nhật tham số và secrets (mã hóa AES-256) cho công cụ."""
    try:
        user_id = current_user.get("id") if current_user else None
        ToolRegistryService.save_configuration(
            tool_id=tool_id,
            parameters=payload.parameters or {},
            secrets=payload.secrets or {},
            is_enabled=payload.is_enabled if payload.is_enabled is not None else True,
            project_id=project_id,
            user_id=user_id
        )
        return {
            "tool_id": tool_id,
            "status": "CONFIGURED",
            "message": "Tool configuration saved successfully with encrypted secrets."
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{tool_id}' not found.")
    except Exception as e:
        logger.error(f"Error saving configuration for tool '{tool_id}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@tools_router.post("/{tool_id}/test", response_model=ToolTestResponse, summary="Test connection / health check")
async def test_tool_endpoint(
    tool_id: str,
    payload: ToolTestRequest,
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Chạy kiểm tra kết nối / health check cho công cụ."""
    try:
        user_id = current_user.get("id") if current_user else None
        return await ToolRegistryService.test_connection(
            tool_id=tool_id,
            parameters=payload.parameters or {},
            project_id=project_id,
            user_id=user_id
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{tool_id}' not found.")
    except Exception as e:
        logger.error(f"Error running test for tool '{tool_id}': {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@tools_router.post("/{tool_id}/execute", response_model=ToolExecutionResponse, summary="Authorized tool execution")
async def execute_tool_endpoint(
    tool_id: str,
    payload: ToolExecutionRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Thực thi công cụ thông qua cổng kiểm duyệt PolicyGateService."""
    user_id = current_user.get("id") if current_user else None
    response = await ToolExecutorService.execute_tool(
        tool_id=tool_id,
        arguments=payload.arguments,
        project_id=payload.project_id,
        user_id=user_id,
        conversation_id=payload.conversation_id
    )

    if response.status.value == "BLOCKED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=response.error)
    if response.status.value == "FAILED" and response.error and "validation" in response.error.lower():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=response.error)

    return response


@tools_router.get("/{tool_id}/executions", summary="Get execution audit logs")
async def get_tool_executions_endpoint(
    tool_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Xem lịch sử các lượt thực thi gần nhất của công cụ để kiểm toán."""
    logs = ToolExecutorService.get_recent_executions(tool_id=tool_id, limit=limit)
    return {"tool_id": tool_id, "total": len(logs), "executions": logs}


# ==============================================================================
# 2. PROJECT TOOL BINDINGS ENDPOINTS
# ==============================================================================

@project_tools_router.get("", response_model=List[ProjectToolBindingResponse], summary="List tools bound to project")
async def list_project_tools_endpoint(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Lấy danh sách các công cụ được cấp quyền sử dụng trong đồ án."""
    return ToolRegistryService.get_project_bindings(project_id)


@project_tools_router.post("", response_model=ProjectToolBindingResponse, summary="Bind tool to project")
async def bind_tool_to_project_endpoint(
    project_id: str,
    payload: ProjectToolBindingRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Liên kết và cấp quyền một công cụ vào đồ án."""
    try:
        return ToolRegistryService.bind_tool_to_project(
            project_id=project_id,
            tool_id=payload.tool_id,
            is_enabled=payload.is_enabled,
            custom_timeout_seconds=payload.custom_timeout_seconds
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool '{payload.tool_id}' not found.")
    except Exception as e:
        logger.error(f"Error binding tool '{payload.tool_id}' to project '{project_id}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@project_tools_router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Unbind tool from project")
async def unbind_tool_from_project_endpoint(
    project_id: str,
    tool_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    """Hủy liên kết công cụ khỏi đồ án."""
    ToolRegistryService.unbind_tool_from_project(project_id=project_id, tool_id=tool_id)
    return None

"""
Pydantic V2 Models and Schemas for Tool Management System
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ToolCategory(str, Enum):
    WEB = "WEB"
    FILE = "FILE"
    FAISS = "FAISS"
    DATA = "DATA"


class ToolRiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ToolSourceType(str, Enum):
    BUILTIN = "BUILTIN"
    CUSTOM = "CUSTOM"


class ToolStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    NEEDS_CONFIGURATION = "NEEDS_CONFIGURATION"
    DEPENDENCY_MISSING = "DEPENDENCY_MISSING"
    DISABLED = "DISABLED"
    ERROR = "ERROR"
    DEPRECATED = "DEPRECATED"


class ToolExecutionStatus(str, Enum):
    REQUESTED = "REQUESTED"
    VALIDATING = "VALIDATING"
    EXECUTING = "EXECUTING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    BLOCKED = "BLOCKED"


# ==============================================================================
# TOOL DEFINITIONS & RESPONSES
# ==============================================================================

class ToolSummaryResponse(BaseModel):
    id: str
    name: str
    description: str
    category: ToolCategory
    version: str
    risk_level: ToolRiskLevel
    source_type: ToolSourceType
    status: ToolStatus
    tags: List[str] = Field(default_factory=list)
    timeout_seconds: int = 30
    requires_network: bool = False
    requires_filesystem: bool = False
    is_configured: bool = False
    dependency_status: Optional[str] = None
    created_at: str
    updated_at: str


class ToolDetailResponse(ToolSummaryResponse):
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    configuration_schema: Dict[str, Any] = Field(default_factory=dict)
    max_payload_bytes: int = 10485760
    current_configuration: Optional[Dict[str, Any]] = None
    last_tested_at: Optional[str] = None
    last_test_result: Optional[str] = None
    last_test_message: Optional[str] = None


class ToolListResponse(BaseModel):
    items: List[ToolSummaryResponse]
    total: int
    page: int
    limit: int
    pages: int
    categories: Dict[str, int] = Field(default_factory=dict)


class ToolStatusUpdateRequest(BaseModel):
    status: ToolStatus = Field(..., description="Trạng thái hoạt động mới (AVAILABLE / DISABLED)")


class ToolConfigurationUpdateRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Các tham số cấu hình phi bí mật")
    secrets: Optional[Dict[str, str]] = Field(default_factory=dict, description="Các bí mật cần lưu (API keys, tokens)")
    is_enabled: Optional[bool] = Field(True, description="Kích hoạt cấu hình")


class ToolTestRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tham số kiểm thử kết nối / health check")


class ToolTestResponse(BaseModel):
    tool_id: str
    status: str = Field(..., description="SUCCESS hoặc FAILED")
    message: str
    latency_ms: int = 0
    details: Optional[Dict[str, Any]] = None


class ToolExecutionRequest(BaseModel):
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tham số đầu vào theo input_schema của tool")
    project_id: Optional[str] = Field(None, description="Project context (nếu có)")
    conversation_id: Optional[str] = Field(None, description="Conversation context (nếu có)")


class ToolExecutionResponse(BaseModel):
    execution_id: str
    tool_id: str
    status: ToolExecutionStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: int = 0


class ProjectToolBindingRequest(BaseModel):
    tool_id: str
    is_enabled: bool = True
    custom_timeout_seconds: Optional[int] = None


class ProjectToolBindingResponse(BaseModel):
    id: str
    project_id: str
    tool_id: str
    tool_name: str
    category: str
    is_enabled: bool
    custom_timeout_seconds: Optional[int]
    created_at: str

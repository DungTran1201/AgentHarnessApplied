"""
API Keys & Integrations Management Endpoints (FR-SETTINGS-KEYS, SEC-015)

Allows authenticated users to view configuration status, securely set/update personal
API keys encrypted with AES-256-GCM, test connectivity, and reset to system defaults.
Guarantees that plaintext secrets are never returned, logged, or exposed in exceptions.
"""

import time
from collections import defaultdict
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field

from src.core.security import get_current_user
from src.core.config import settings
from src.services.credential_service import (
    CredentialService,
    canonicalize_provider,
    SUPPORTED_PROVIDERS,
    ALLOWLISTED_SYSTEM_ENV_VARS,
    redact_secrets_from_text
)

api_keys_router = APIRouter(prefix="/settings/api-keys", tags=["Settings - API Keys & Integrations"])

# ==============================================================================
# RATE LIMITER FOR TEST CONNECTION ENDPOINTS
# ==============================================================================

class ConnectionTestRateLimiter:
    """Limits connection test calls per user to prevent provider quota exhaustion or spam."""
    def __init__(self, max_per_minute: int = 15):
        self.max_per_minute = max_per_minute
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check(self, user_id: str):
        now = time.time()
        cutoff = now - 60.0
        self.history[user_id] = [t for t in self.history[user_id] if t > cutoff]
        if len(self.history[user_id]) >= self.max_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Tần suất kiểm tra kết nối vượt quá giới hạn an toàn. Vui lòng thử lại sau 1 phút."
            )
        self.history[user_id].append(now)

connection_test_limiter = ConnectionTestRateLimiter(max_per_minute=15)

# ==============================================================================
# PYDANTIC SCHEMAS (NEVER INCLUDE RAW SECRETS IN RESPONSES)
# ==============================================================================

class ProviderKeyStatusResponse(BaseModel):
    provider: str = Field(..., description="Mã định danh chuẩn hóa của nhà cung cấp")
    name: str = Field(..., description="Tên hiển thị thân thiện")
    category: str = Field(..., description="Phân loại: LLM hoặc SEARCH")
    env_var: str = Field(..., description="Tên biến môi trường hệ thống tương ứng")
    description: str = Field(..., description="Mô tả mục đích sử dụng")
    doc_url: str = Field(..., description="Đường dẫn tài liệu tạo khóa API")
    placeholder: str = Field(..., description="Gợi ý định dạng mẫu")
    is_secret: bool = Field(default=True, description="Khóa có phải là thông tin bí mật cần che giấu không")
    is_configured: bool = Field(..., description="Trạng thái đã được cấu hình hay chưa")
    source: str = Field(..., description="Nguồn cấu hình: PERSONAL (khóa riêng), SYSTEM (mặc định server), hoặc NONE")
    masked_hint: str = Field(default="", description="Gợi ý đã che giấu (ví dụ: '****abcd')")
    has_personal_key: bool = Field(..., description="Người dùng hiện tại có khóa cá nhân riêng hay không")
    has_system_key: bool = Field(..., description="Hệ thống có cấu hình mặc định .env hay không")
    validation_status: str = Field(default="NOT_TESTED", description="Trạng thái kiểm tra: NOT_TESTED, VALID, INVALID, ERROR")
    last_validated_at: Optional[str] = Field(default=None, description="Thời điểm kiểm tra kết nối gần nhất")
    last_error_summary: Optional[str] = Field(default=None, description="Tóm tắt lỗi kiểm tra gần nhất (đã loại bỏ bí mật)")
    updated_at: Optional[str] = Field(default=None, description="Thời điểm cập nhật khóa cá nhân gần nhất")
    requires_restart: bool = Field(default=False, description="Có cần khởi động lại dịch vụ không (khóa user áp dụng runtime ngay)")


class SetApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=1, max_length=500, description="Giá trị khóa API mới")


class TestApiKeyRequest(BaseModel):
    candidate_key: Optional[str] = Field(default=None, max_length=500, description="Khóa API tạm thời cần kiểm tra trước khi lưu")


class TestApiKeyResponse(BaseModel):
    healthy: bool = Field(..., description="Kết nối thành công hay không")
    provider: str = Field(..., description="Mã định danh nhà cung cấp")
    latency_ms: int = Field(..., description="Độ trễ phản hồi (ms)")
    validation_status: str = Field(..., description="VALID, INVALID, hoặc ERROR")
    message: str = Field(..., description="Thông báo kết quả đã làm sạch bí mật")
    tested_at: str = Field(..., description="Thời điểm hoàn tất kiểm tra")


class UpdateSystemEnvRequest(BaseModel):
    env_var: str = Field(..., description="Tên biến môi trường cần cập nhật (phải thuộc allowlist)")
    value: str = Field(..., description="Giá trị mới cần ghi vào .env")


# ==============================================================================
# ROUTE HANDLERS
# ==============================================================================

@api_keys_router.get("", response_model=List[ProviderKeyStatusResponse], summary="Liệt kê trạng thái các khóa API của người dùng")
@api_keys_router.get("/", response_model=List[ProviderKeyStatusResponse], include_in_schema=False)
async def list_user_api_keys(
    current_user: dict = Depends(get_current_user)
):
    """
    Trả về danh mục toàn bộ các nhà cung cấp được hỗ trợ, kèm trạng thái cấu hình và nguồn khóa
    (PERSONAL > SYSTEM > NONE). Tuyệt đối KHÔNG bao giờ trả về giá trị khóa bí mật dạng plaintext.
    """
    user_id = current_user["id"]
    return CredentialService.get_user_keys_status(user_id)


@api_keys_router.put("/{provider}", response_model=Dict[str, Any], summary="Cập nhật hoặc lưu khóa API cá nhân")
async def save_user_api_key(
    provider: str,
    req: SetApiKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Lưu hoặc cập nhật khóa API cá nhân của người dùng cho nhà cung cấp được allowlist.
    Dữ liệu được mã hóa tức thì bằng AES-256-GCM trước khi lưu xuống CSDL.
    Khóa cá nhân có hiệu lực ngay ở runtime mà không cần restart máy chủ.
    """
    canon = canonicalize_provider(provider)
    if not canon or canon not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà cung cấp '{provider}' không nằm trong danh mục allowlist được hỗ trợ."
        )

    try:
        user_id = current_user["id"]
        res = CredentialService.set_user_key(user_id, canon, req.api_key)
        return {
            "status": "success",
            "provider": canon,
            "source": "PERSONAL",
            "masked_hint": res["masked_hint"],
            "validation_status": res["validation_status"],
            "message": f"Đã lưu khóa API cho nhà cung cấp {SUPPORTED_PROVIDERS[canon]['name']} thành công (áp dụng tức thì)."
        }
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        clean_msg = redact_secrets_from_text(str(exc), [req.api_key])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu trữ an toàn khóa API: {clean_msg}"
        )


@api_keys_router.delete("/{provider}", response_model=Dict[str, Any], summary="Xóa hoặc hoàn tác khóa API cá nhân")
async def delete_user_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Xóa khóa API cá nhân của người dùng, đưa cấu hình trở về trạng thái kế thừa mặc định từ .env
    (hoặc NOT_CONFIGURED nếu server không cấu hình sẵn).
    """
    canon = canonicalize_provider(provider)
    if not canon or canon not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà cung cấp '{provider}' không nằm trong danh mục allowlist được hỗ trợ."
        )

    try:
        user_id = current_user["id"]
        res = CredentialService.delete_user_key(user_id, canon)
        p_name = SUPPORTED_PROVIDERS[canon]["name"]
        if res["has_system_key"]:
            msg = f"Đã xóa khóa cá nhân cho {p_name}. Hệ thống sẽ sử dụng cấu hình mặc định server."
        else:
            msg = f"Đã xóa khóa cá nhân cho {p_name}. Nhà cung cấp hiện đang ở trạng thái chưa cấu hình."

        return {
            "status": "success",
            "provider": canon,
            "source": res["source"],
            "is_configured": res["is_configured"],
            "masked_hint": res["masked_hint"],
            "message": msg
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa khóa cá nhân: {str(exc)}"
        )


@api_keys_router.post("/{provider}/test", response_model=TestApiKeyResponse, summary="Kiểm tra kết nối tới nhà cung cấp")
async def test_provider_connection(
    provider: str,
    req: Optional[TestApiKeyRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Thực hiện kiểm tra kết nối (Ping / Health Check) trực tiếp tới dịch vụ nhà cung cấp.
    Hỗ trợ kiểm tra khóa cá nhân đã lưu hoặc kiểm tra thử khóa mới trước khi lưu.
    Được áp dụng Rate Limiter chống lạm dụng. Toàn bộ lỗi được redact bí mật 100%.
    """
    user_id = current_user["id"]
    connection_test_limiter.check(user_id)

    canon = canonicalize_provider(provider)
    if not canon or canon not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà cung cấp '{provider}' không nằm trong danh mục allowlist được hỗ trợ."
        )

    candidate = req.candidate_key if req else None
    try:
        res = await CredentialService.validate_connection(
            provider=canon,
            user_id=user_id,
            candidate_key=candidate
        )
        return TestApiKeyResponse(
            healthy=res["healthy"],
            provider=res["provider"],
            latency_ms=res["latency_ms"],
            validation_status=res["validation_status"],
            message=res["message"],
            tested_at=res["tested_at"]
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=redact_secrets_from_text(str(val_err), [candidate])
        )
    except Exception as exc:
        clean_err = redact_secrets_from_text(str(exc), [candidate])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi xác thực kết nối: {clean_err}"
        )


@api_keys_router.post("/system", response_model=Dict[str, Any], summary="Cập nhật cấu hình .env toàn cục (chỉ dành cho Quản trị viên)")
async def update_system_env(
    req: UpdateSystemEnvRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cập nhật an toàn một biến môi trường toàn cục allowlisted trong file .env.
    Thao tác sử dụng cơ chế ghi file nguyên tử (Atomic Write) và sao lưu backup.
    Chỉ cho phép quản trị viên hoặc chế độ local development.
    Yêu cầu khởi động lại tiến trình để biến có hiệu lực toàn diện.
    """
    user_email = (current_user.get("email") or "").lower()
    is_admin = ("admin" in user_email or settings.DEBUG or settings.APP_ENV == "development")

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị viên để chỉnh sửa cấu hình môi trường toàn cục (.env)."
        )

    var_name = req.env_var.strip().upper()
    if var_name not in ALLOWLISTED_SYSTEM_ENV_VARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Biến môi trường '{var_name}' không nằm trong danh mục được phép chỉnh sửa qua giao diện."
        )

    try:
        res = CredentialService.update_system_env_variable(var_name, req.value)
        return {
            "status": "success",
            "env_var": res["env_var"],
            "restart_required": res["restart_required"],
            "message": res["message"]
        }
    except ValueError as v_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(v_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật an toàn file .env: {str(exc)}"
        )

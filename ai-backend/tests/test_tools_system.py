"""
Unit and Integration Tests for Tool Registry, Policy Gate, Crypto, and Executor
"""

import json
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.services.tools.models import ToolStatus, ToolExecutionStatus
from src.services.tools.registry import ToolRegistryService
from src.services.tools.policy_gate import PolicyGateService, PolicyGateError
from src.services.tools.executor import ToolExecutorService
from src.services.tools.crypto import encrypt_secrets, decrypt_secrets, mask_secret
from src.db import query_one, execute_commit


class TestToolRegistryAndCrypto:
    def test_seed_builtin_tools(self):
        """Kiểm tra khởi tạo đủ 32 công cụ trong danh mục."""
        seeded = ToolRegistryService.seed_tools()
        row = query_one("SELECT COUNT(*) as count FROM tools")
        assert row["count"] >= 32

    def test_list_tools_pagination_and_filter(self):
        """Kiểm tra phân trang và lọc theo nhóm công cụ."""
        ToolRegistryService.seed_tools()
        res_data = ToolRegistryService.list_tools(category="DATA", limit=5)
        assert res_data.total >= 8
        assert len(res_data.items) <= 5
        assert all(item.category.value == "DATA" for item in res_data.items)

    def test_search_tools(self):
        """Kiểm tra tìm kiếm công cụ theo từ khóa."""
        ToolRegistryService.seed_tools()
        res = ToolRegistryService.list_tools(search="calculator")
        assert res.total >= 1
        assert any(item.id == "calculator" for item in res.items)

    def test_crypto_secrets_roundtrip(self):
        """Kiểm tra mã hóa và giải mã bí mật bằng AES-256."""
        secrets = {"api_key": "sk-secret-token-12345", "client_secret": "my-secret-pass"}
        enc_str = encrypt_secrets(secrets)
        assert enc_str is not None
        assert enc_str != "sk-secret-token-12345"

        decrypted = decrypt_secrets(enc_str)
        assert decrypted == secrets

    def test_mask_secret(self):
        """Kiểm tra che giấu secret hiển thị."""
        assert mask_secret("sk-1234567890abcdef") == "sk-...cdef"
        assert mask_secret("short") == "********"
        assert mask_secret("") == ""

    def test_tool_detail_and_configuration(self):
        """Kiểm tra cấu hình và xem chi tiết công cụ."""
        ToolRegistryService.seed_tools()
        detail = ToolRegistryService.get_tool("calculator")
        assert detail.id == "calculator"
        assert detail.input_schema is not None
        assert detail.output_schema is not None

        # Lưu cấu hình
        ToolRegistryService.save_configuration(
            tool_id="calculator",
            parameters={"precision": 4},
            secrets={"dummy_token": "secret_abc_123"},
            is_enabled=True
        )

        detail_after = ToolRegistryService.get_tool("calculator")
        assert detail_after.is_configured is True
        assert detail_after.current_configuration["parameters"]["precision"] == 4
        assert detail_after.current_configuration["secrets"]["dummy_token"].startswith("sec...")

    def test_set_tool_status(self):
        """Kiểm tra bật/tắt tool tại mức Registry."""
        ToolRegistryService.seed_tools()
        ToolRegistryService.set_tool_status("calculator", ToolStatus.DISABLED)
        detail = ToolRegistryService.get_tool("calculator")
        assert detail.status == ToolStatus.DISABLED

        # Re-enable
        ToolRegistryService.set_tool_status("calculator", ToolStatus.AVAILABLE)
        detail2 = ToolRegistryService.get_tool("calculator")
        assert detail2.status == ToolStatus.AVAILABLE


class TestPolicyGateAndExecutor:
    @pytest.mark.asyncio
    async def test_execute_calculator_success(self):
        """Kiểm tra thực thi an toàn công cụ calculator qua Executor."""
        ToolRegistryService.seed_tools()
        resp = await ToolExecutorService.execute_tool(
            tool_id="calculator",
            arguments={"expression": "(15 * 4) + 10"}
        )
        assert resp.status == ToolExecutionStatus.SUCCEEDED
        assert resp.result["result"] == 70
        assert resp.error is None
        assert resp.execution_time_ms >= 0

    @pytest.mark.asyncio
    async def test_policy_gate_blocks_disabled_tool(self):
        """Kiểm tra PolicyGate chặn thực thi khi tool bị DISABLED."""
        ToolRegistryService.seed_tools()
        ToolRegistryService.set_tool_status("calculator", ToolStatus.DISABLED)

        resp = await ToolExecutorService.execute_tool(
            tool_id="calculator",
            arguments={"expression": "1 + 1"}
        )
        assert resp.status == ToolExecutionStatus.BLOCKED
        assert "disabled by policy" in resp.error

        # Restore
        ToolRegistryService.set_tool_status("calculator", ToolStatus.AVAILABLE)

    @pytest.mark.asyncio
    async def test_policy_gate_project_binding_enforcement(self):
        """Kiểm tra PolicyGate chỉ cho phép gọi khi Project đã được bind tool."""
        ToolRegistryService.seed_tools()
        project_id = "prj_test_tools_001"
        execute_commit("INSERT OR IGNORE INTO projects (id, user_id, name) VALUES (?, 'guest_user', 'Test Project')", (project_id,))

        # Đảm bảo unbind
        ToolRegistryService.unbind_tool_from_project(project_id, "calculator")

        resp_blocked = await ToolExecutorService.execute_tool(
            tool_id="calculator",
            arguments={"expression": "2 * 3"},
            project_id=project_id
        )
        assert resp_blocked.status == ToolExecutionStatus.BLOCKED
        assert "not authorized" in resp_blocked.error

        # Bind tool vào project
        ToolRegistryService.bind_tool_to_project(project_id, "calculator", is_enabled=True)

        resp_allowed = await ToolExecutorService.execute_tool(
            tool_id="calculator",
            arguments={"expression": "2 * 3"},
            project_id=project_id
        )
        assert resp_allowed.status == ToolExecutionStatus.SUCCEEDED
        assert resp_allowed.result["result"] == 6

        # Clean up
        ToolRegistryService.unbind_tool_from_project(project_id, "calculator")

    @pytest.mark.asyncio
    async def test_health_check_test_connection(self):
        """Kiểm tra luồng test connection / health check của công cụ."""
        ToolRegistryService.seed_tools()
        res = await ToolRegistryService.test_connection("date_time_info", {"timezone_name": "UTC"})
        assert res.status == "SUCCESS"
        assert res.details["timezone"] == "UTC"

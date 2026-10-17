"""
REST API Integration Tests for Tool Management Endpoints
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.services.tools.registry import ToolRegistryService
from src.db import execute_commit


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


class TestToolsAPIEndpoints:
    def test_01_list_tools_api(self, client):
        """GET /api/v1/tools - Danh sách công cụ có phân trang."""
        response = client.get("/api/v1/tools?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 32
        assert len(data["items"]) == 10

    def test_02_filter_tools_by_category(self, client):
        """GET /api/v1/tools?category=DATA - Lọc công cụ theo category."""
        response = client.get("/api/v1/tools?category=DATA")
        assert response.status_code == 200
        data = response.json()
        assert all(item["category"] == "DATA" for item in data["items"])

    def test_03_get_tool_categories(self, client):
        """GET /api/v1/tools/categories - Lấy danh mục nhóm."""
        response = client.get("/api/v1/tools/categories")
        assert response.status_code == 200
        cats = response.json()["categories"]
        assert "WEB" in cats
        assert "FILE" in cats
        assert "FAISS" in cats
        assert "DATA" in cats

    def test_04_get_tool_detail(self, client):
        """GET /api/v1/tools/{id} - Lấy chi tiết công cụ và schema."""
        response = client.get("/api/v1/tools/calculator")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "calculator"
        assert "input_schema" in data
        assert "output_schema" in data

    def test_05_update_tool_status(self, client):
        """PATCH /api/v1/tools/{id}/status - Bật / Tắt công cụ."""
        # Disable
        res_dis = client.patch("/api/v1/tools/calculator/status", json={"status": "DISABLED"})
        assert res_dis.status_code == 200
        assert res_dis.json()["status"] == "DISABLED"

        # Re-enable
        res_en = client.patch("/api/v1/tools/calculator/status", json={"status": "AVAILABLE"})
        assert res_en.status_code == 200
        assert res_en.json()["status"] == "AVAILABLE"

    def test_06_configure_tool_and_mask_secrets(self, client):
        """PUT & GET /api/v1/tools/{id}/configuration - Lưu secret mã hóa và che giấu."""
        put_res = client.put(
            "/api/v1/tools/calculator/configuration",
            json={
                "parameters": {"test_param": 123},
                "secrets": {"test_key": "sk-my-super-secret-key-1234"},
                "is_enabled": True
            }
        )
        assert put_res.status_code == 200

        get_res = client.get("/api/v1/tools/calculator/configuration")
        assert get_res.status_code == 200
        cfg = get_res.json()["configuration"]
        assert cfg["parameters"]["test_param"] == 123
        assert cfg["secrets"]["test_key"].startswith("sk-")
        assert "super-secret" not in cfg["secrets"]["test_key"]

    def test_07_test_tool_health_check(self, client):
        """POST /api/v1/tools/{id}/test - Kiểm tra kết nối / health check."""
        response = client.post(
            "/api/v1/tools/calculator/test",
            json={"parameters": {"expression": "5 + 5"}}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUCCESS"
        assert data["details"]["result"] == 10

    def test_08_execute_tool_api(self, client):
        """POST /api/v1/tools/{id}/execute - Thực thi công cụ qua API."""
        response = client.post(
            "/api/v1/tools/calculator/execute",
            json={"arguments": {"expression": "100 / 4"}}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUCCEEDED"
        assert data["result"]["result"] == 25.0

    def test_09_get_tool_execution_history(self, client):
        """GET /api/v1/tools/{id}/executions - Lấy lịch sử thực thi."""
        response = client.get("/api/v1/tools/calculator/executions")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["executions"]) >= 1

    def test_10_project_tool_bindings_crud(self, client):
        """GET, POST, DELETE /api/v1/projects/{id}/tools - Quản lý binding với Project."""
        project_id = "prj_api_test_binding"
        execute_commit("INSERT OR IGNORE INTO projects (id, user_id, name) VALUES (?, 'guest_user', 'Test API Project')", (project_id,))

        # 1. Bind tool
        bind_res = client.post(
            f"/api/v1/projects/{project_id}/tools",
            json={"tool_id": "calculator", "is_enabled": True, "custom_timeout_seconds": 15}
        )
        assert bind_res.status_code == 200
        assert bind_res.json()["tool_id"] == "calculator"

        # 2. List bindings
        list_res = client.get(f"/api/v1/projects/{project_id}/tools")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(b["tool_id"] == "calculator" for b in items)

        # 3. Unbind tool
        del_res = client.delete(f"/api/v1/projects/{project_id}/tools/calculator")
        assert del_res.status_code == 204

        # 4. Verify list empty
        list_res2 = client.get(f"/api/v1/projects/{project_id}/tools")
        assert not any(b["tool_id"] == "calculator" for b in list_res2.json())

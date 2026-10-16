"""
Comprehensive Backend Tests for Unified File Attachments & Assets System
Path: ai-backend/tests/test_attachments.py
Implements verification for:
- Upload validation (size, magic bytes, executable blocking)
- Anti-IDOR & Path Traversal security
- Attachment lifecycle (staged -> attached -> cleanup)
- Chat and Project Chat integration
- Skills & System Prompts library resources
- Capabilities query & text extraction fallback
"""

import io
import sys
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import create_access_token, hash_password
from src.db import execute_commit, query_one

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers_user_a():
    token = create_access_token("user_att_a", "usera@example.com")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user_b():
    token = create_access_token("user_att_b", "userb@example.com")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(autouse=True)
def setup_test_users():
    hpw = hash_password("ValidPassword123!")
    # Setup test users
    execute_commit("INSERT OR IGNORE INTO users (id, email, full_name, hashed_password, status) VALUES ('user_att_a', 'usera@example.com', 'User A', ?, 'ACTIVE')", (hpw,))
    execute_commit("INSERT OR IGNORE INTO users (id, email, full_name, hashed_password, status) VALUES ('user_att_b', 'userb@example.com', 'User B', ?, 'ACTIVE')", (hpw,))
    execute_commit("INSERT OR IGNORE INTO users (id, email, full_name, hashed_password, status) VALUES ('guest_user', 'guest@example.com', 'Guest', ?, 'ACTIVE')", (hpw,))
    yield
    # Cleanup test attachments
    execute_commit("DELETE FROM attachments WHERE user_id IN ('user_att_a', 'user_att_b')")
    execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN ('user_att_a', 'user_att_b'))")
    execute_commit("DELETE FROM conversations WHERE user_id IN ('user_att_a', 'user_att_b')")
    execute_commit("DELETE FROM skills WHERE user_id IN ('user_att_a', 'user_att_b')")
    execute_commit("DELETE FROM system_prompts WHERE user_id IN ('user_att_a', 'user_att_b')")


class TestAttachmentsSystem:
    def test_01_capabilities_endpoint(self, client, auth_headers_user_a):
        res = client.get("/api/v1/attachments/capabilities", headers=auth_headers_user_a)
        assert res.status_code == 200
        data = res.json()
        assert "default_provider" in data
        assert "max_file_size_mb" in data
        assert "models" in data
        assert "supported_mime_types" in data
        assert "image/png" in data["supported_mime_types"]

    def test_02_upload_text_file_success(self, client, auth_headers_user_a):
        content = b"Day la noi dung kiem thu file dinh kem tieng Viet cua AI-Chan."
        file_obj = io.BytesIO(content)
        res = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("tailieu_test.txt", file_obj, "text/plain")},
            data={"context_type": "chat"},
            headers=auth_headers_user_a
        )
        assert res.status_code == 201
        data = res.json()
        assert data["filename"] == "tailieu_test.txt"
        assert data["file_size"] == len(content)
        assert data["status"] == "READY"
        assert data["checksum_sha256"] is not None
        assert data["extracted_text"] is not None
        assert "Day la noi dung kiem thu" in data["extracted_text"]

    def test_03_reject_executable_and_scripts(self, client, auth_headers_user_a):
        # 1. Reject by extension (.exe, .bat, .ps1, .sh)
        for ext in [".exe", ".bat", ".ps1", ".sh", ".cmd"]:
            file_obj = io.BytesIO(b"echo malicious command")
            res = client.post(
                "/api/v1/attachments/upload",
                files={"file": (f"danger{ext}", file_obj, "application/octet-stream")},
                data={"context_type": "chat"},
                headers=auth_headers_user_a
            )
            assert res.status_code in (400, 422)
            assert "EXECUTABLE_FILE_BLOCKED" in res.text

        # 2. Reject by Windows PE magic header (MZ) even if disguised as .txt
        pe_fake_txt = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00fake pe header")
        res_pe = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("fake_pe.txt", pe_fake_txt, "text/plain")},
            data={"context_type": "chat"},
            headers=auth_headers_user_a
        )
        assert res_pe.status_code in (400, 422)
        assert "EXECUTABLE_FILE_BLOCKED" in res_pe.text

    def test_04_reject_empty_file(self, client, auth_headers_user_a):
        empty_file = io.BytesIO(b"")
        res = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("empty.txt", empty_file, "text/plain")},
            data={"context_type": "chat"},
            headers=auth_headers_user_a
        )
        assert res.status_code in (400, 422)
        assert "EMPTY_FILE" in res.text


    def test_05_anti_idor_and_access_control(self, client, auth_headers_user_a, auth_headers_user_b):
        # User A uploads a file
        file_obj = io.BytesIO(b"Secret data of User A")
        res_a = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("user_a_private.txt", file_obj, "text/plain")},
            data={"context_type": "chat"},
            headers=auth_headers_user_a
        )
        assert res_a.status_code == 201
        att_id = res_a.json()["id"]

        # User B attempts to access metadata -> 404 (Anti-IDOR)
        res_meta_b = client.get(f"/api/v1/attachments/{att_id}", headers=auth_headers_user_b)
        assert res_meta_b.status_code == 404

        # User B attempts to download -> 404
        res_dl_b = client.get(f"/api/v1/attachments/{att_id}/download", headers=auth_headers_user_b)
        assert res_dl_b.status_code == 404

        # User B attempts to delete -> 404
        res_del_b = client.delete(f"/api/v1/attachments/{att_id}", headers=auth_headers_user_b)
        assert res_del_b.status_code == 404

        # User A can download successfully
        res_dl_a = client.get(f"/api/v1/attachments/{att_id}/download", headers=auth_headers_user_a)
        assert res_dl_a.status_code == 200
        assert res_dl_a.content == b"Secret data of User A"

    def test_06_path_traversal_sanitization(self, client, auth_headers_user_a):
        file_obj = io.BytesIO(b"traversal test")
        res = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("../../../../etc/passwd", file_obj, "text/plain")},
            data={"context_type": "chat"},
            headers=auth_headers_user_a
        )
        assert res.status_code == 201
        sanitized_name = res.json()["filename"]
        assert ".." not in sanitized_name
        assert "/" not in sanitized_name
        assert "\\" not in sanitized_name

    def test_07_attach_to_conversation_and_chat_stream(self, client, auth_headers_user_a):
        # 1. Create a conversation for User A
        res_conv = client.post("/api/v1/conversations", json={"title": "Cuoc tro chuyen test dinh kem"}, headers=auth_headers_user_a)
        assert res_conv.status_code in (200, 201)
        conv_id = res_conv.json()["conversation"]["id"]

        # 2. Upload file
        file_obj = io.BytesIO(b"Thong tin du an: AI-Chan la he thong mo rong ho tro Agents.")
        res_up = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("thongtin.txt", file_obj, "text/plain")},
            data={"context_type": "chat", "context_id": conv_id},
            headers=auth_headers_user_a
        )
        assert res_up.status_code == 201
        att_id = res_up.json()["id"]

        # 3. Stream chat with attachment
        res_stream = client.post(
            f"/api/v1/conversations/{conv_id}/messages/stream",
            json={
                "content": "Doc noi dung file thong tin giup toi",
                "model": "agent-simulator",
                "attachments": [att_id]
            },
            headers=auth_headers_user_a
        )
        assert res_stream.status_code == 200
        stream_text = res_stream.text
        assert "thongtin.txt" in stream_text

        # 4. Verify conversation messages include attachments on reload
        res_msgs = client.get(f"/api/v1/conversations/{conv_id}/messages", headers=auth_headers_user_a)
        assert res_msgs.status_code == 200
        msgs = res_msgs.json()["messages"]
        user_msgs = [m for m in msgs if m["role"] == "user"]
        assert len(user_msgs) > 0
        assert "attachments" in user_msgs[0]
        assert len(user_msgs[0]["attachments"]) == 1
        assert user_msgs[0]["attachments"][0]["id"] == att_id

    def test_08_skills_library_resource_attachment(self, client, auth_headers_user_a):
        # 1. Create a test skill
        skill_payload = {
            "name": "skill-with-resource",
            "description": "Kỹ năng kiểm thử đính kèm tài nguyên",
            "content_markdown": "# Skill Guide\nHuong dan kiem thu skill."
        }
        res_skill = client.post("/api/v1/skills", json=skill_payload, headers=auth_headers_user_a)
        assert res_skill.status_code == 201
        skill_id = res_skill.json()["id"]

        # 2. Upload resource to this skill
        res_file = io.BytesIO(b"config_key: 12345\nfeature_enabled: true")
        res_up = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("config.yaml", res_file, "text/yaml")},
            data={"context_type": "skill", "context_id": skill_id},
            headers=auth_headers_user_a
        )
        assert res_up.status_code == 201
        att_id = res_up.json()["id"]

        # 3. Query skill detail and verify attachment is listed
        res_detail = client.get(f"/api/v1/skills/{skill_id}", headers=auth_headers_user_a)
        assert res_detail.status_code == 200
        data = res_detail.json()
        assert "attachments" in data
        assert any(a["id"] == att_id for a in data["attachments"])

        # 4. Query skills/{id}/attachments endpoint
        res_atts = client.get(f"/api/v1/skills/{skill_id}/attachments", headers=auth_headers_user_a)
        assert res_atts.status_code == 200
        assert res_atts.json()["total"] >= 1

    def test_09_system_prompt_resource_attachment(self, client, auth_headers_user_a):
        # 1. Create a system prompt
        sp_payload = {
            "name": "Prompt With Attachment",
            "description": "Prompt có tài nguyên đính kèm",
            "content": "Bạn là chuyên gia thẩm định tài liệu kỹ thuật."
        }
        res_sp = client.post("/api/v1/system-prompts", json=sp_payload, headers=auth_headers_user_a)
        assert res_sp.status_code in (200, 201)
        sp_id = res_sp.json()["id"]


        # 2. Upload resource to this prompt
        res_file = io.BytesIO(b"Standard 001: Tat ca ham phai co type hints.")
        res_up = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("standard.txt", res_file, "text/plain")},
            data={"context_type": "prompt", "context_id": sp_id},
            headers=auth_headers_user_a
        )
        assert res_up.status_code == 201
        att_id = res_up.json()["id"]

        # 3. Query system prompt detail and verify attachment is listed
        res_detail = client.get(f"/api/v1/system-prompts/{sp_id}", headers=auth_headers_user_a)
        assert res_detail.status_code == 200
        data = res_detail.json()
        assert "attachments" in data
        assert any(a["id"] == att_id for a in data["attachments"])

        # 4. Query system-prompts/{id}/attachments endpoint
        res_atts = client.get(f"/api/v1/system-prompts/{sp_id}/attachments", headers=auth_headers_user_a)
        assert res_atts.status_code == 200
        assert res_atts.json()["total"] >= 1

import sys
import uuid
from pathlib import Path
import pytest

# Add ai-backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from starlette.testclient import TestClient
from src.main import app
from src.db import execute_commit, query_one, query_all
from src.core.security import create_access_token
from src.services.chat_turn_manager import (
    ProjectChatTurnManager,
    reconcile_startup_interrupted_turns
)

client = TestClient(app)

def create_test_user(user_id: str, username: str, email: str):
    execute_commit(
        """
        INSERT OR REPLACE INTO users (id, username, email, hashed_password, status)
        VALUES (?, ?, ?, 'mockhash', 'ACTIVE')
        """,
        (user_id, username, email)
    )

def create_test_project(project_id: str, user_id: str, name: str):
    execute_commit(
        """
        INSERT OR REPLACE INTO projects (id, user_id, name, description, status)
        VALUES (?, ?, ?, 'Test description', 'ACTIVE')
        """,
        (project_id, user_id, name)
    )

class TestProjectChatSync:
    @pytest.fixture(autouse=True)
    def setup_users_and_projects(self):
        self.user_a = "user_sync_a"
        self.user_b = "user_sync_b"
        create_test_user(self.user_a, "user_sync_a", "usera@test.com")
        create_test_user(self.user_b, "user_sync_b", "userb@test.com")

        self.token_a = create_access_token(self.user_a, "usera@test.com")
        self.token_b = create_access_token(self.user_b, "userb@test.com")

        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        self.proj_a = f"proj_{uuid.uuid4().hex[:8]}"
        self.proj_b = f"proj_{uuid.uuid4().hex[:8]}"
        create_test_project(self.proj_a, self.user_a, "Project Alpha")
        create_test_project(self.proj_b, self.user_b, "Project Beta")

    def test_idempotent_get_or_create_primary_conversation(self):
        """Kiểm tra gọi GET /projects/{project_id}/conversation nhiều lần trả về cùng 1 conversation."""
        res1 = client.get(f"/api/v1/projects/{self.proj_a}/conversation", headers=self.headers_a)
        assert res1.status_code == 200, res1.text
        conv1 = res1.json()["conversation"]
        assert conv1["project_id"] == self.proj_a
        assert conv1["user_id"] == self.user_a

        res2 = client.get(f"/api/v1/projects/{self.proj_a}/conversation", headers=self.headers_a)
        assert res2.status_code == 200
        conv2 = res2.json()["conversation"]
        assert conv1["id"] == conv2["id"]

    def test_anti_idor_conversation_access(self):
        """User B không thể truy cập hoặc can thiệp vào conversation của User A."""
        res1 = client.get(f"/api/v1/projects/{self.proj_a}/conversation", headers=self.headers_a)
        assert res1.status_code == 200
        conv_a_id = res1.json()["conversation"]["id"]

        # User B cố truy vấn messages của conversation User A -> 404
        res_b = client.get(f"/api/v1/conversations/{conv_a_id}/messages", headers=self.headers_b)
        assert res_b.status_code == 404

        # User B không thể truy cập conversation endpoint của Project A
        res_b_proj = client.get(f"/api/v1/projects/{self.proj_a}/conversation", headers=self.headers_b)
        assert res_b_proj.status_code == 404

        # User B cố gửi chat vào conversation của User A qua Project B -> 404 hoặc 400
        chat_payload = {"message": "Hacked message", "conversation_id": conv_a_id}
        res_b_chat = client.post(f"/api/v1/projects/{self.proj_b}/chat", json=chat_payload, headers=self.headers_b)
        assert res_b_chat.status_code in (400, 404)

    def test_startup_reconciliation_marks_interrupted(self):
        """Kiểm tra turn RUNNING hoặc QUEUED khi server restart được reconcile thành INTERRUPTED."""
        conv_id = f"conv_rec_{uuid.uuid4().hex[:8]}"
        execute_commit(
            """
            INSERT INTO conversations (id, user_id, project_id, title, created_at, updated_at)
            VALUES (?, ?, ?, 'Test Recon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (conv_id, self.user_a, self.proj_a)
        )
        msg_running_id = f"msg_run_{uuid.uuid4().hex[:8]}"
        msg_queued_id = f"msg_que_{uuid.uuid4().hex[:8]}"
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, status)
            VALUES (?, ?, 'assistant', 'Partial...', 'RUNNING')
            """,
            (msg_running_id, conv_id)
        )
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, status)
            VALUES (?, ?, 'assistant', '', 'QUEUED')
            """,
            (msg_queued_id, conv_id)
        )

        reconcile_startup_interrupted_turns()

        m1 = query_one("SELECT status, content FROM messages WHERE id = ?", (msg_running_id,))
        assert m1["status"] == "INTERRUPTED"
        assert "gián đoạn do hệ thống khởi động lại" in m1["content"]

        m2 = query_one("SELECT status, content FROM messages WHERE id = ?", (msg_queued_id,))
        assert m2["status"] == "INTERRUPTED"

    def test_cancel_project_chat_endpoint(self):
        """Kiểm tra API POST /projects/{project_id}/chat/cancel."""
        res = client.post(
            f"/api/v1/projects/{self.proj_a}/chat/cancel",
            json={"conversation_id": "nonexistent_conv"},
            headers=self.headers_a
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False

    def test_stream_reconnect_endpoint_when_no_turn(self):
        """Kiểm tra GET /projects/{project_id}/chat/stream khi không có active turn."""
        res_conv = client.get(f"/api/v1/projects/{self.proj_a}/conversation", headers=self.headers_a)
        conv_id = res_conv.json()["conversation"]["id"]

        res = client.get(
            f"/api/v1/projects/{self.proj_a}/chat/stream?conversation_id={conv_id}",
            headers=self.headers_a
        )
        # Vì chưa có tin nhắn nào xong và cũng không có turn -> 404
        assert res.status_code == 404

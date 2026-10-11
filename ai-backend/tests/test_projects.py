import unittest
import sys
import uuid
import json
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one

class TestProjectsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = str(uuid.uuid4())
        self.email = f"proj_tester_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)
        
        # User 2 for Anti-IDOR testing
        self.user2_id = str(uuid.uuid4())
        self.email2 = f"proj_tester2_{uuid.uuid4().hex[:8]}@example.com"
        
        # Insert test users
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Project Tester', ?, 'ACTIVE')",
            (self.user_id, self.email, self.hashed_pw)
        )
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Project Tester 2', ?, 'ACTIVE')",
            (self.user2_id, self.email2, self.hashed_pw)
        )
        
        self.token = create_access_token(self.user_id, self.email)
        self.token2 = create_access_token(self.user2_id, self.email2)
        
        self.cookies = {"access_token": self.token}
        self.cookies2 = {"access_token": self.token2}
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.headers2 = {"Authorization": f"Bearer {self.token2}"}

    def tearDown(self):
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id LIKE 'proj_%')")
        execute_commit("DELETE FROM conversations WHERE project_id LIKE 'proj_%'")
        execute_commit("DELETE FROM projects WHERE user_id IN (?, ?) OR name LIKE 'Project Khách%'", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_id, self.user2_id))

    def _create_valid_graph_payload(self, max_words=500, model_id="gemini-3.8-flash"):
        return {
            "viewport": {"x": 100, "y": 100, "zoom": 1},
            "nodes": [
                {
                    "id": "in_1",
                    "type": "web_input",
                    "position": {"x": 100, "y": 200},
                    "data": {"label": "Web Input", "config": {"max_words": max_words}}
                },
                {
                    "id": "m_1",
                    "type": "model",
                    "position": {"x": 400, "y": 200},
                    "data": {"label": "Model Node", "config": {"model_id": model_id, "temperature": 0.7, "max_tokens": 2048}}
                },
                {
                    "id": "out_1",
                    "type": "output",
                    "position": {"x": 700, "y": 200},
                    "data": {"label": "Output", "config": {"streaming": True}}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "in_1",
                    "target": "m_1",
                    "sourceHandle": "output_handle",
                    "targetHandle": "input_handle"
                },
                {
                    "id": "e2",
                    "source": "m_1",
                    "target": "out_1",
                    "sourceHandle": "output_handle",
                    "targetHandle": "input_handle"
                }
            ]
        }

    def test_create_project_success(self):
        """PRJ-TC-002: Tạo mới project thành công với trạng thái STOP."""
        res = self.client.post(
            "/api/v1/projects",
            json={"name": "Trợ Lý Kỹ Thuật", "description": "Mô tả test"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("proj_"))
        self.assertEqual(data["name"], "Trợ Lý Kỹ Thuật")
        self.assertEqual(data["status"], "STOP")
        self.assertFalse(data["is_valid"])

    def test_create_project_unauthenticated_guest(self):
        """PRJ-TC-002B: Gỡ xác thực: Khách vãng lai chưa đăng nhập vẫn tạo được project thành công."""
        res = self.client.post(
            "/api/v1/projects",
            json={"name": "Project Khách Vãng Lai", "description": "Tạo không cần token hay cookie"}
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("proj_"))
        self.assertEqual(data["name"], "Project Khách Vãng Lai")
        self.assertEqual(data["user_id"], "guest_user")
        self.assertEqual(data["status"], "STOP")

    def test_create_project_empty_name(self):
        """PRJ-TC-003: Từ chối tạo project khi tên rỗng."""
        res = self.client.post(
            "/api/v1/projects",
            json={"name": "   "},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(res.status_code, 422)

    def test_list_projects_and_quota(self):
        """PRJ-TC-001: Lấy danh sách project và thông tin quota."""
        # Tạo 2 projects
        self.client.post("/api/v1/projects", json={"name": "Proj 1"}, cookies=self.cookies, headers=self.headers)
        self.client.post("/api/v1/projects", json={"name": "Proj 2"}, cookies=self.cookies, headers=self.headers)

        res = self.client.get("/api/v1/projects", cookies=self.cookies, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["items"]), 2)
        self.assertIn("active_quota", data)
        self.assertEqual(data["active_quota"]["max_limit"], 3)
        self.assertEqual(data["active_quota"]["remaining_slots"], 3)

    def test_anti_idor_protection(self):
        """PRJ-TC-023: Chống truy cập trái phép qua IDOR."""
        # User 1 tạo project
        create_res = self.client.post("/api/v1/projects", json={"name": "Project Bí Mật"}, cookies=self.cookies, headers=self.headers)
        proj_id = create_res.json()["id"]

        # User 2 cố đọc project của User 1
        res = self.client.get(f"/api/v1/projects/{proj_id}", cookies=self.cookies2, headers=self.headers2)
        self.assertEqual(res.status_code, 404)

        # User 2 cố sửa project của User 1
        patch_res = self.client.patch(f"/api/v1/projects/{proj_id}", json={"name": "Hack Tên"}, cookies=self.cookies2, headers=self.headers2)
        self.assertEqual(patch_res.status_code, 404)

    def test_save_valid_graph(self):
        """PRJ-TC-005: Lưu cấu trúc graph hợp lệ 3 node tuyến tính."""
        c_res = self.client.post("/api/v1/projects", json={"name": "Graph Test"}, cookies=self.cookies, headers=self.headers)
        proj_id = c_res.json()["id"]

        graph_payload = self._create_valid_graph_payload()
        save_res = self.client.put(f"/api/v1/projects/{proj_id}/graph", json=graph_payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)
        data = save_res.json()
        self.assertTrue(data["is_valid"])

        # Đọc lại project xem graph đã được lưu chưa
        detail_res = self.client.get(f"/api/v1/projects/{proj_id}", cookies=self.cookies, headers=self.headers)
        self.assertTrue(detail_res.json()["is_valid"])
        self.assertEqual(detail_res.json()["node_count"], 3)

    def test_reject_invalid_graph_missing_nodes(self):
        """PRJ-TC-006: Từ chối graph thiếu node (chỉ có 2 node)."""
        c_res = self.client.post("/api/v1/projects", json={"name": "Missing Node Test"}, cookies=self.cookies, headers=self.headers)
        proj_id = c_res.json()["id"]

        invalid_payload = {
            "viewport": {},
            "nodes": [
                {"id": "in_1", "type": "web_input", "data": {}},
                {"id": "m_1", "type": "model", "data": {}}
            ],
            "edges": []
        }
        res = self.client.put(f"/api/v1/projects/{proj_id}/graph", json=invalid_payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(res.status_code, 422)

    def test_activate_and_quota_limit(self):
        """PRJ-TC-012 & PRJ-TC-014: Kích hoạt project và chặn khi hết Quota (MAX = 3)."""
        proj_ids = []
        for i in range(4):
            c_res = self.client.post("/api/v1/projects", json={"name": f"Project {i+1}"}, cookies=self.cookies, headers=self.headers)
            p_id = c_res.json()["id"]
            # Lưu graph hợp lệ cho từng project
            self.client.put(f"/api/v1/projects/{p_id}/graph", json=self._create_valid_graph_payload(), cookies=self.cookies, headers=self.headers)
            proj_ids.append(p_id)

        # Kích hoạt 3 projects đầu tiên (đạt quota tối đa 3)
        for i in range(3):
            act_res = self.client.post(f"/api/v1/projects/{proj_ids[i]}/activate", cookies=self.cookies, headers=self.headers)
            self.assertEqual(act_res.status_code, 200)
            self.assertEqual(act_res.json()["status"], "ACTIVE")

        # Cố kích hoạt project thứ 4 -> Phải trả về 409 Conflict
        act_res_4 = self.client.post(f"/api/v1/projects/{proj_ids[3]}/activate", cookies=self.cookies, headers=self.headers)
        self.assertEqual(act_res_4.status_code, 409)
        self.assertIn("QUOTA_EXCEEDED", str(act_res_4.json()))

        # Tạm dừng project 1
        stop_res = self.client.post(f"/api/v1/projects/{proj_ids[0]}/stop", cookies=self.cookies, headers=self.headers)
        self.assertEqual(stop_res.status_code, 200)

        # Giờ kích hoạt project 4 phải thành công vì đã giải phóng 1 slot
        act_res_4_again = self.client.post(f"/api/v1/projects/{proj_ids[3]}/activate", cookies=self.cookies, headers=self.headers)
        self.assertEqual(act_res_4_again.status_code, 200)

    def test_chat_within_and_exceeding_word_limit(self):
        """PRJ-TC-018 & PRJ-TC-019: Kiểm tra giới hạn số từ khi chat qua project."""
        c_res = self.client.post("/api/v1/projects", json={"name": "Chat Word Limit Bot"}, cookies=self.cookies, headers=self.headers)
        p_id = c_res.json()["id"]

        # Lưu graph với max_words = 10
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=self._create_valid_graph_payload(max_words=10), cookies=self.cookies, headers=self.headers)
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)

        # 1. Gửi tin nhắn hợp lệ (4 từ <= 10)
        chat_ok = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "Xin chào trợ lý"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_ok.status_code, 200)
        self.assertIn("text/event-stream", chat_ok.headers.get("content-type", ""))
        stream_text = chat_ok.text
        self.assertIn("event: chunk", stream_text)
        self.assertIn("event: done", stream_text)
        # Khẳng định không bị bọc kép giao thức SSE (Double SSE wrapping defect)
        self.assertNotIn('data: {"content": "event:', stream_text)
        self.assertNotIn('data: {"token": "event:', stream_text)

        # Kiểm tra nội dung message đã lưu trong DB là text thuần túy, không lẫn header SSE
        from src.db import query_all
        db_msgs = query_all("SELECT content FROM messages WHERE role = 'assistant' ORDER BY created_at DESC LIMIT 1")
        self.assertTrue(len(db_msgs) > 0)
        assistant_content = db_msgs[0]["content"]
        self.assertFalse(assistant_content.startswith("event:"))
        self.assertNotIn('data: {"token":', assistant_content)

        # 2. Gửi tin nhắn vượt quá số từ (15 từ > 10)
        chat_fail = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "Đây là một câu hỏi quá dài có nhiều hơn mười từ để kiểm tra giới hạn của hệ thống trợ lý"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_fail.status_code, 400)
        self.assertIn("WORD_LIMIT_EXCEEDED", str(chat_fail.json()))

if __name__ == "__main__":
    unittest.main()

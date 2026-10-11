import unittest
import sys
import uuid
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one

class TestSystemPromptsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_id = str(uuid.uuid4())
        self.email_a = f"prompt_user_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_id = str(uuid.uuid4())
        self.email_b = f"prompt_user_b_{uuid.uuid4().hex[:8]}@example.com"
        self.hashed_pw = hash_password("ValidSecret123!")

        # Create two test users
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Tester A', ?, 'ACTIVE')",
            (self.user_a_id, self.email_a, self.hashed_pw)
        )
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Tester B', ?, 'ACTIVE')",
            (self.user_b_id, self.email_b, self.hashed_pw)
        )

        self.token_a = create_access_token(self.user_a_id, self.email_a)
        self.token_b = create_access_token(self.user_b_id, self.email_b)

        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        execute_commit("DELETE FROM system_prompts WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_a_id, self.user_b_id))

    def test_01_create_prompt_success(self):
        payload = {
            "name": "Senior Python Architect",
            "description": "Chỉ dẫn viết code Python chuẩn PEP 8 và Clean Architecture",
            "content": "Bạn là Senior Python Architect với hơn 10 năm kinh nghiệm.\nHãy áp dụng Type Hinting đầy đủ."
        }
        res = self.client.post("/api/v1/system-prompts", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("sp_"))
        self.assertEqual(data["name"], "Senior Python Architect")
        self.assertEqual(data["user_id"], self.user_a_id)
        self.assertEqual(data["description"], payload["description"])
        self.assertEqual(data["content"], payload["content"])

    def test_02_create_prompt_conflict_name_409(self):
        payload = {
            "name": "Data Analyst Prompt",
            "description": "Phân tích số liệu",
            "content": "Bạn là chuyên gia phân tích dữ liệu chuyên nghiệp."
        }
        # First creation succeeds
        res1 = self.client.post("/api/v1/system-prompts", json=payload, headers=self.headers_a)
        self.assertEqual(res1.status_code, 201)

        # Second creation with identical name (even with different case) must fail with 409
        payload_dup = {
            "name": "data analyst prompt",
            "description": "Trùng tên nhưng viết thường",
            "content": "Nội dung khác nhưng trùng tên"
        }
        res2 = self.client.post("/api/v1/system-prompts", json=payload_dup, headers=self.headers_a)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("PROMPT_NAME_CONFLICT", str(res2.json()))

        # But another user (User B) CAN create prompt with the same name
        res_user_b = self.client.post("/api/v1/system-prompts", json=payload, headers=self.headers_b)
        self.assertEqual(res_user_b.status_code, 201)

    def test_03_validation_rules_422(self):
        # 1. Blank name
        res = self.client.post("/api/v1/system-prompts", json={"name": "   ", "content": "valid content"}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

        # 2. Blank content
        res = self.client.post("/api/v1/system-prompts", json={"name": "Valid Name", "content": "   "}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

        # 3. Name exceeds 100 characters
        res = self.client.post("/api/v1/system-prompts", json={"name": "A" * 101, "content": "valid content"}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

        # 4. Content exceeds 10,000 characters
        res = self.client.post("/api/v1/system-prompts", json={"name": "Valid Name", "content": "A" * 10001}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

    def test_04_list_prompts_and_filtering(self):
        # Create 2 prompts for User A
        self.client.post(
            "/api/v1/system-prompts",
            json={"name": "FastAPI Master", "description": "Backend API", "content": "Rule 1: Use async."},
            headers=self.headers_a
        )
        self.client.post(
            "/api/v1/system-prompts",
            json={"name": "React Specialist", "description": "Frontend UI", "content": "Rule 1: Use functional components."},
            headers=self.headers_a
        )

        # List all for User A
        res = self.client.get("/api/v1/system-prompts", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 2)
        # Check summary does not leak raw full content, but provides content_length
        self.assertIn("content_length", data["items"][0])
        self.assertNotIn("content", data["items"][0])

        # Filter by keyword 'FastAPI'
        res_filter = self.client.get("/api/v1/system-prompts?q=FastAPI", headers=self.headers_a)
        self.assertEqual(res_filter.status_code, 200)
        self.assertEqual(res_filter.json()["total"], 1)
        self.assertEqual(res_filter.json()["items"][0]["name"], "FastAPI Master")

        # Sort by name_asc
        res_sort = self.client.get("/api/v1/system-prompts?sort=name_asc", headers=self.headers_a)
        self.assertEqual(res_sort.status_code, 200)
        items = res_sort.json()["items"]
        self.assertEqual(items[0]["name"], "FastAPI Master")
        self.assertEqual(items[1]["name"], "React Specialist")

    def test_05_detail_and_anti_idor_protection(self):
        # User A creates a secret prompt
        create_res = self.client.post(
            "/api/v1/system-prompts",
            json={"name": "Secret Strategy Prompt", "content": "Top secret trading rules."},
            headers=self.headers_a
        )
        prompt_id = create_res.json()["id"]

        # User A can view the detail with full content
        res_a = self.client.get(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.json()["content"], "Top secret trading rules.")

        # User B attempts to access User A's prompt -> 404 Not Found (Anti-IDOR)
        res_b = self.client.get(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 404)
        self.assertIn("PROMPT_NOT_FOUND", str(res_b.json()))

    def test_06_update_prompt_and_conflict_check(self):
        create_res1 = self.client.post(
            "/api/v1/system-prompts",
            json={"name": "Prompt Alpha", "content": "Alpha content"},
            headers=self.headers_a
        )
        id_1 = create_res1.json()["id"]

        create_res2 = self.client.post(
            "/api/v1/system-prompts",
            json={"name": "Prompt Beta", "content": "Beta content"},
            headers=self.headers_a
        )
        id_2 = create_res2.json()["id"]

        # Update Alpha content and description -> SIK
        update_res = self.client.put(
            f"/api/v1/system-prompts/{id_1}",
            json={"name": "Prompt Alpha Updated", "description": "New desc", "content": "Alpha new content"},
            headers=self.headers_a
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["name"], "Prompt Alpha Updated")

        # Try to rename Alpha into Beta -> 409 Conflict
        conflict_res = self.client.put(
            f"/api/v1/system-prompts/{id_1}",
            json={"name": "Prompt Beta", "content": "Conflicting rename"},
            headers=self.headers_a
        )
        self.assertEqual(conflict_res.status_code, 409)

        # User B trying to update User A's prompt -> 404 Not Found
        res_idor = self.client.put(
            f"/api/v1/system-prompts/{id_1}",
            json={"name": "Hacked", "content": "Hacked"},
            headers=self.headers_b
        )
        self.assertEqual(res_idor.status_code, 404)

    def test_07_delete_prompt_and_anti_idor(self):
        create_res = self.client.post(
            "/api/v1/system-prompts",
            json={"name": "Temporary Prompt", "content": "To be deleted"},
            headers=self.headers_a
        )
        prompt_id = create_res.json()["id"]

        # User B trying to delete User A's prompt -> 404 Not Found
        res_b = self.client.delete(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 404)

        # User A deletes it successfully
        res_a = self.client.delete(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        self.assertTrue(res_a.json()["success"])

        # Fetching it now gives 404
        res_get = self.client.get(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_a)
        self.assertEqual(res_get.status_code, 404)

    def test_08_clone_prompt_auto_naming(self):
        create_res = self.client.post(
            "/api/v1/system-prompts",
            json={"name": "Design Pattern Specialist", "description": "GoF patterns", "content": "Singleton, Factory, Strategy."},
            headers=self.headers_a
        )
        prompt_id = create_res.json()["id"]

        # Clone 1
        clone1_res = self.client.post(f"/api/v1/system-prompts/{prompt_id}/clone", headers=self.headers_a)
        self.assertEqual(clone1_res.status_code, 201)
        self.assertEqual(clone1_res.json()["name"], "Design Pattern Specialist (Copy)")
        self.assertEqual(clone1_res.json()["content"], "Singleton, Factory, Strategy.")

        # Clone 2 (automatic avoidance of duplicate name)
        clone2_res = self.client.post(f"/api/v1/system-prompts/{prompt_id}/clone", headers=self.headers_a)
        self.assertEqual(clone2_res.status_code, 201)
        self.assertEqual(clone2_res.json()["name"], "Design Pattern Specialist (Copy 2)")

    def test_09_unicode_and_vietnamese_fidelity(self):
        complex_text = (
            "🎯 YÊU CẦU NGHIỆP VỤ & BẢO TOÀN UNICODE:\n"
            "- Tiếng Việt có dấu: Cần Thơ, Đà Nẵng, Quảng Ninh, Bắc Kạn.\n"
            "- Ký tự đặc biệt: <instruction type=\"strict\">, `code_snippet()`, {json: true}.\n"
            "- Biểu tượng Emoji: ✨ 🚀 🤖 🛡️."
        )
        res = self.client.post(
            "/api/v1/system-prompts",
            json={
                "name": "Chuyên Gia Tiếng Việt 🇻🇳",
                "description": "Kiểm tra độ bảo toàn dấu và ký tự đặc biệt",
                "content": complex_text
            },
            headers=self.headers_a
        )
        self.assertEqual(res.status_code, 201)
        prompt_id = res.json()["id"]

        detail_res = self.client.get(f"/api/v1/system-prompts/{prompt_id}", headers=self.headers_a)
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["content"], complex_text)
        self.assertEqual(detail_res.json()["name"], "Chuyên Gia Tiếng Việt 🇻🇳")

if __name__ == "__main__":
    unittest.main()

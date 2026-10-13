import unittest
import sys
import uuid
import io
import zipfile
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one
from src.core.skill_storage import delete_skill_filesystem

class TestSkillsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_id = str(uuid.uuid4())
        self.email_a = f"skill_user_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_id = str(uuid.uuid4())
        self.email_b = f"skill_user_b_{uuid.uuid4().hex[:8]}@example.com"
        self.hashed_pw = hash_password("ValidSecret123!")

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
        # Dọn dẹp database và filesystem
        rows = query_all("SELECT storage_path FROM skills WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id)) if "query_all" in globals() else []
        from src.db import query_all as q_all
        for r in q_all("SELECT storage_path FROM skills WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id)):
            delete_skill_filesystem(r["storage_path"])

        execute_commit("DELETE FROM skills WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_a_id, self.user_b_id))

    def test_01_create_valid_skill(self):
        payload = {
            "name": "pdf-processing",
            "description": "Extract text, fill forms, and merge PDF files. Use when handling PDF documents.",
            "license": "Apache-2.0",
            "compatibility": "Requires Python 3.14+",
            "allowed_tools": "Bash(python:*) Read",
            "metadata": {"author": "ai-chan-team", "version": "1.0.0"},
            "content_markdown": "# Hướng dẫn xử lý PDF\n\nBước 1: Trích xuất nội dung...\nBước 2: Chuẩn hóa...",
            "action": "ACTIVATE"
        }
        res = self.client.post("/api/v1/skills", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("skl_"))
        self.assertEqual(data["name"], "pdf-processing")
        self.assertEqual(data["status"], "VALID")
        self.assertTrue(data["is_valid"])
        self.assertTrue(Path(data["storage_path"]).exists())
        self.assertTrue((Path(data["storage_path"]) / "SKILL.md").exists())

    def test_02_create_skill_conflict_name_409(self):
        payload = {
            "name": "data-cleaning",
            "description": "Clean and format messy tabular data. Use when cleaning data.",
            "content_markdown": "# Data Cleaning",
            "action": "ACTIVATE"
        }
        res1 = self.client.post("/api/v1/skills", json=payload, headers=self.headers_a)
        self.assertEqual(res1.status_code, 201)

        # Trùng tên cho cùng User A phải trả về 409
        res2 = self.client.post("/api/v1/skills", json=payload, headers=self.headers_a)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("SKILL_NAME_CONFLICT", str(res2.json()))

        # User B tạo cùng tên thì được phép
        res_b = self.client.post("/api/v1/skills", json=payload, headers=self.headers_b)
        self.assertEqual(res_b.status_code, 201)

    def test_03_invalid_name_syntax_422(self):
        # 1. Chữ in hoa không hợp lệ theo chuẩn
        res1 = self.client.post(
            "/api/v1/skills",
            json={"name": "PDF-Processing", "description": "Desc with use when keyword", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        self.assertEqual(res1.status_code, 422)
        self.assertIn("ERR-004", str(res1.json()))

        # 2. Hai gạch nối liên tiếp không hợp lệ
        res2 = self.client.post(
            "/api/v1/skills",
            json={"name": "pdf--processing", "description": "Desc with use when keyword", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        self.assertEqual(res2.status_code, 422)
        self.assertIn("ERR-004", str(res2.json()))

        # 3. Bắt đầu bằng gạch nối
        res3 = self.client.post(
            "/api/v1/skills",
            json={"name": "-pdf", "description": "Desc with use when keyword", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        self.assertEqual(res3.status_code, 422)

    def test_04_save_draft_allows_incomplete(self):
        # Lưu nháp cho phép lưu ngay cả khi chưa kích hoạt
        payload = {
            "name": "draft-skill",
            "description": "Short draft",
            "content_markdown": "# Draft content",
            "action": "SAVE_DRAFT"
        }
        res = self.client.post("/api/v1/skills", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "DRAFT")

    def test_05_list_skills_and_search_filter(self):
        # Tạo 2 skills cho User A
        self.client.post(
            "/api/v1/skills",
            json={"name": "skill-alpha", "description": "Alpha processing. Use when running alpha tasks.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        self.client.post(
            "/api/v1/skills",
            json={"name": "skill-beta", "description": "Beta analysis. Use when analyzing beta metrics.", "action": "SAVE_DRAFT"},
            headers=self.headers_a
        )

        # Lấy danh sách đầy đủ
        res_all = self.client.get("/api/v1/skills", headers=self.headers_a)
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(res_all.json()["total"], 2)

        # Tìm kiếm theo từ khóa
        res_q = self.client.get("/api/v1/skills?q=alpha", headers=self.headers_a)
        self.assertEqual(res_q.status_code, 200)
        self.assertEqual(len(res_q.json()["items"]), 1)
        self.assertEqual(res_q.json()["items"][0]["name"], "skill-alpha")

        # Lọc theo trạng thái
        res_filter = self.client.get("/api/v1/skills?status=DRAFT", headers=self.headers_a)
        self.assertEqual(res_filter.status_code, 200)
        self.assertEqual(len(res_filter.json()["items"]), 1)
        self.assertEqual(res_filter.json()["items"][0]["name"], "skill-beta")

    def test_06_anti_idor_protection(self):
        # User A tạo 1 skill
        res_a = self.client.post(
            "/api/v1/skills",
            json={"name": "secret-skill", "description": "Secret stuff. Use when doing secrets.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        skill_id = res_a.json()["id"]

        # User B cố tình xem -> 404
        res_get_b = self.client.get(f"/api/v1/skills/{skill_id}", headers=self.headers_b)
        self.assertEqual(res_get_b.status_code, 404)

        # User B cố tình cập nhật -> 404
        res_put_b = self.client.put(
            f"/api/v1/skills/{skill_id}",
            json={"name": "secret-skill", "description": "Hacked desc", "action": "ACTIVATE"},
            headers=self.headers_b
        )
        self.assertEqual(res_put_b.status_code, 404)

        # User B cố tình xóa -> 404
        res_del_b = self.client.delete(f"/api/v1/skills/{skill_id}", headers=self.headers_b)
        self.assertEqual(res_del_b.status_code, 404)

    def test_07_update_skill_success(self):
        res_create = self.client.post(
            "/api/v1/skills",
            json={"name": "update-test", "description": "Original desc. Use when testing.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        skill_id = res_create.json()["id"]

        res_update = self.client.put(
            f"/api/v1/skills/{skill_id}",
            json={
                "name": "update-test",
                "description": "Updated description with new details. Use when testing updates.",
                "content_markdown": "# Updated Guide\n\nNew steps here...",
                "action": "ACTIVATE"
            },
            headers=self.headers_a
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["description"], "Updated description with new details. Use when testing updates.")

    def test_08_stateless_validate_endpoint(self):
        valid_md = "---\nname: code-review\ndescription: Automated code review assistant. Use when reviewing pull requests.\n---\n# Guide"
        res_valid = self.client.post("/api/v1/skills/validate", json={"raw_skill_md": valid_md})
        self.assertEqual(res_valid.status_code, 200)
        self.assertTrue(res_valid.json()["is_valid"])

        invalid_md = "---\nname: INVALID_NAME\ndescription: Short\n---\n# Guide"
        res_invalid = self.client.post("/api/v1/skills/validate", json={"raw_skill_md": invalid_md})
        self.assertEqual(res_invalid.status_code, 200)
        self.assertFalse(res_invalid.json()["is_valid"])
        self.assertIn("ERR-004", [e["code"] for e in res_invalid.json()["errors"]])

    def test_09_clone_skill(self):
        res_create = self.client.post(
            "/api/v1/skills",
            json={"name": "to-clone", "description": "Skill to clone. Use when cloning.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        skill_id = res_create.json()["id"]

        res_clone = self.client.post(f"/api/v1/skills/{skill_id}/clone", headers=self.headers_a)
        self.assertEqual(res_clone.status_code, 201)
        cloned_data = res_clone.json()
        self.assertEqual(cloned_data["name"], "to-clone-copy")
        self.assertTrue(Path(cloned_data["storage_path"]).exists())

    def test_10_export_skill_zip(self):
        res_create = self.client.post(
            "/api/v1/skills",
            json={"name": "export-skill", "description": "Skill for export. Use when testing export.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        skill_id = res_create.json()["id"]

        res_export = self.client.get(f"/api/v1/skills/{skill_id}/export", headers=self.headers_a)
        self.assertEqual(res_export.status_code, 200)
        self.assertEqual(res_export.headers["content-type"], "application/zip")

        # Xác thực nội dung ZIP
        zip_buf = io.BytesIO(res_export.content)
        with zipfile.ZipFile(zip_buf, "r") as zf:
            files_in_zip = zf.namelist()
            self.assertTrue(any(f.endswith("SKILL.md") for f in files_in_zip))

    def test_11_import_skill_zip_slip_blocked_400(self):
        # Tạo file ZIP độc hại chứa path traversal
        bad_zip_buffer = io.BytesIO()
        with zipfile.ZipFile(bad_zip_buffer, "w") as zf:
            zf.writestr("../../evil.txt", "malicious payload")
            zf.writestr("SKILL.md", "---\nname: evil\ndescription: Evil skill\n---\n# Evil")
        bad_zip_buffer.seek(0)

        res = self.client.post(
            "/api/v1/skills/import",
            files={"file": ("malicious.zip", bad_zip_buffer.getvalue(), "application/zip")},
            headers=self.headers_a
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Zip Slip", str(res.json()))

    def test_12_delete_skill_and_cleanup(self):
        res_create = self.client.post(
            "/api/v1/skills",
            json={"name": "delete-me", "description": "Temporary skill to delete. Use when testing delete.", "action": "ACTIVATE"},
            headers=self.headers_a
        )
        skill_id = res_create.json()["id"]
        storage_path = Path(res_create.json()["storage_path"])
        self.assertTrue(storage_path.exists())

        res_del = self.client.delete(f"/api/v1/skills/{skill_id}", headers=self.headers_a)
        self.assertEqual(res_del.status_code, 200)
        self.assertFalse(storage_path.exists())
        self.assertIsNone(query_one("SELECT id FROM skills WHERE id = ?", (skill_id,)))


if __name__ == "__main__":
    unittest.main()

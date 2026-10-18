import io
import sys
import uuid
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one
from src.core.skill_storage import delete_skill_filesystem


class TestTextFileImport(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_id = f"usr_a_{uuid.uuid4().hex[:8]}"
        self.email_a = f"import_user_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_id = f"usr_b_{uuid.uuid4().hex[:8]}"
        self.email_b = f"import_user_b_{uuid.uuid4().hex[:8]}@example.com"
        self.hashed_pw = hash_password("ValidSecret123!")

        # Create two test users
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Importer A', ?, 'ACTIVE')",
            (self.user_a_id, self.email_a, self.hashed_pw)
        )
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Importer B', ?, 'ACTIVE')",
            (self.user_b_id, self.email_b, self.hashed_pw)
        )

        self.token_a = create_access_token(self.user_a_id, self.email_a)
        self.token_b = create_access_token(self.user_b_id, self.email_b)

        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        # Dọn dẹp database
        execute_commit("DELETE FROM skills WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM rules WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM system_prompts WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_a_id, self.user_b_id))

    # ==========================================================================
    # 1. SKILLS TEXT IMPORT TESTS
    # ==========================================================================
    def test_01_skills_import_valid_skill_md_utf8_bom(self):
        """Kiểm tra nhập SKILL.md chứa UTF-8 BOM thành công với metadata chuẩn."""
        raw_content = b"\xef\xbb\xbf" + (
            "---\n"
            "name: git-commit-helper\n"
            "description: Hỗ trợ viết commit message theo chuẩn Conventional Commits\n"
            "license: MIT\n"
            "---\n\n"
            "# Git Commit Helper\n\n"
            "Tạo commit message theo mẫu: <type>(<scope>): <subject>\n"
        ).encode("utf-8")

        response = self.client.post(
            "/api/v1/skills/import-file",
            headers=self.headers_a,
            files={"file": ("SKILL.md", io.BytesIO(raw_content), "text/markdown")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "git-commit-helper")
        self.assertIn("Conventional Commits", data["description"])
        self.assertTrue(data["is_valid"])
        self.assertEqual(data["source_type"], "IMPORTED")

        # Kiểm tra tồn tại trong DB
        db_row = query_one("SELECT * FROM skills WHERE id = ?", (data["id"],))
        self.assertIsNotNone(db_row)
        self.assertEqual(db_row["user_id"], self.user_a_id)

    def test_02_skills_import_plain_txt_without_frontmatter(self):
        """Kiểm tra nhập file .txt thông thường không có frontmatter thành Skill."""
        raw_text = "Thực hiện phân tích cấu trúc mã nguồn và kiểm tra lỗ hổng bảo mật.".encode("utf-8")
        response = self.client.post(
            "/api/v1/skills/import",
            headers=self.headers_a,
            files={"file": ("code_security_scan.txt", io.BytesIO(raw_text), "text/plain")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        # Tên được tự động chuyển thành kebab-case
        self.assertEqual(data["name"], "code-security-scan")
        self.assertEqual(data["source_type"], "IMPORTED")

    def test_03_skills_import_text_api(self):
        """Kiểm tra API /skills/import-text với payload JSON sau preview."""
        payload = {
            "filename": "custom_agent.md",
            "content": "# Custom Agent\n\nThực thi tác vụ thông minh.",
            "name": "custom-agent-task",
            "description": "Mô tả đã được chỉnh sửa trong bước Preview"
        }
        response = self.client.post(
            "/api/v1/skills/import-text",
            headers=self.headers_a,
            json=payload
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "custom-agent-task")
        self.assertEqual(data["description"], "Mô tả đã được chỉnh sửa trong bước Preview")

    def test_04_skills_reject_disallowed_extension_and_binary(self):
        """Từ chối file sai định dạng hoặc chứa byte nhị phân null byte."""
        # 1. Sai extension
        res_ext = self.client.post(
            "/api/v1/skills/import-file",
            headers=self.headers_a,
            files={"file": ("malicious.exe", io.BytesIO(b"echo hello"), "application/octet-stream")}
        )
        self.assertEqual(res_ext.status_code, 400)
        self.assertIn("không được hỗ trợ", res_ext.text)

        # 2. Binary file trá hình extension .txt (chứa byte null)
        fake_binary = b"MZ\x00\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff"
        res_bin = self.client.post(
            "/api/v1/skills/import-file",
            headers=self.headers_a,
            files={"file": ("fake_binary.txt", io.BytesIO(fake_binary), "text/plain")}
        )
        self.assertEqual(res_bin.status_code, 400)
        self.assertIn("nhị phân", res_bin.text)

    def test_05_skills_import_conflict_duplicate_name(self):
        """Kiểm tra lỗi 409 Conflict khi import kỹ năng trùng tên."""
        content = "---\nname: duplicate-skill\ndescription: Test skill\n---\nBody".encode("utf-8")
        res1 = self.client.post(
            "/api/v1/skills/import-file",
            headers=self.headers_a,
            files={"file": ("SKILL.md", io.BytesIO(content), "text/markdown")}
        )
        self.assertEqual(res1.status_code, 201)

        # Import lần 2 trùng tên
        res2 = self.client.post(
            "/api/v1/skills/import-file",
            headers=self.headers_a,
            files={"file": ("SKILL.md", io.BytesIO(content), "text/markdown")}
        )
        self.assertEqual(res2.status_code, 409)

    # ==========================================================================
    # 2. RULES TEXT IMPORT TESTS
    # ==========================================================================
    def test_06_rules_import_from_file_and_text(self):
        """Kiểm tra nhập Rule từ file markdown và qua /rules/import-text."""
        rule_md = (
            "---\n"
            "name: Strict TypeScript Rule\n"
            "description: Yêu cầu strictly typed và không dùng any\n"
            "activation_mode: glob\n"
            "glob_patterns:\n"
            "  - 'src/**/*.ts'\n"
            "  - 'src/**/*.tsx'\n"
            "priority: 80\n"
            "---\n\n"
            "Tuyệt đối không sử dụng kiểu dữ liệu `any`. Luôn định nghĩa interface hoặc type cụ thể.\n"
        ).encode("utf-8")

        # 1. Nhập từ file multipart
        res = self.client.post(
            "/api/v1/rules/import-file",
            headers=self.headers_a,
            files={"file": ("typescript_rules.md", io.BytesIO(rule_md), "text/markdown")}
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["name"], "Strict TypeScript Rule")
        self.assertEqual(data["activation_mode"], "glob")
        self.assertEqual(data["glob_patterns"], ["src/**/*.ts", "src/**/*.tsx"])
        self.assertEqual(data["priority"], 80)
        self.assertEqual(data["scope"], "user")

        # 2. Nhập từ JSON text payload
        text_payload = {
            "filename": "python_standards.rst",
            "content": "Tuân thủ chuẩn PEP 8 và quy tắc đặt tên snake_case.",
            "name": "Python PEP8 Guidelines",
            "description": "Tiêu chuẩn format code Python",
            "activation_mode": "always_on",
            "priority": 70
        }
        res2 = self.client.post(
            "/api/v1/rules/import-text",
            headers=self.headers_a,
            json=text_payload
        )
        self.assertEqual(res2.status_code, 201)
        data2 = res2.json()
        self.assertEqual(data2["name"], "Python PEP8 Guidelines")
        self.assertEqual(data2["priority"], 70)

    def test_07_rules_reject_binary(self):
        """Kiểm tra từ chối nhập file nhị phân vào Rules Library."""
        fake_bin = b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00"
        res = self.client.post(
            "/api/v1/rules/import-file",
            headers=self.headers_a,
            files={"file": ("binary_rule.md", io.BytesIO(fake_bin), "text/markdown")}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("nhị phân", res.text)

    # ==========================================================================
    # 3. SYSTEM PROMPTS TEXT IMPORT TESTS
    # ==========================================================================
    def test_08_system_prompts_import_unicode_and_placeholders(self):
        """Kiểm tra nhập System Prompt bảo toàn Unicode, tiếng Việt, emoji và placeholder."""
        prompt_text = (
            "Bạn là trợ lý AI-Chan thông minh 🌟.\n"
            "Ngữ cảnh dự án: {project_context}\n"
            "Yêu cầu người dùng: {user_prompt}\n"
            "Hãy trả lời bằng tiếng Việt một cách tự nhiên và chính xác!\n"
        ).encode("utf-8")

        res = self.client.post(
            "/api/v1/system-prompts/import-file",
            headers=self.headers_a,
            files={"file": ("ai_chan_persona.txt", io.BytesIO(prompt_text), "text/plain")}
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["name"], "ai chan persona")
        self.assertIn("AI-Chan thông minh 🌟", data["content"])
        self.assertIn("{project_context}", data["content"])

        # Nhập lần 2 trùng tên -> 409
        res_dup = self.client.post(
            "/api/v1/system-prompts/import-file",
            headers=self.headers_a,
            files={"file": ("ai_chan_persona.txt", io.BytesIO(prompt_text), "text/plain")}
        )
        self.assertEqual(res_dup.status_code, 409)

    def test_09_system_prompts_import_text_api(self):
        """Kiểm tra nhập System Prompt qua /system-prompts/import-text."""
        payload = {
            "filename": "translator.yaml",
            "content": "---\nname: Technical Translator\ndescription: Dịch thuật kỹ thuật\n---\nBạn là chuyên gia dịch thuật.",
            "name": "Custom Technical Translator",
            "description": "Chuyên gia dịch thuật Anh - Việt"
        }
        res = self.client.post(
            "/api/v1/system-prompts/import-text",
            headers=self.headers_a,
            json=payload
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["name"], "Custom Technical Translator")
        self.assertEqual(data["description"], "Chuyên gia dịch thuật Anh - Việt")

    # ==========================================================================
    # 4. USER ISOLATION / ANTI-IDOR TESTS
    # ==========================================================================
    def test_10_user_isolation(self):
        """Kiểm tra tính năng cách ly người dùng (Anti-IDOR): User B không thấy và không sửa được item của User A."""
        # User A imports a rule
        rule_content = "Quy tắc bảo mật nội bộ của User A".encode("utf-8")
        res_rule = self.client.post(
            "/api/v1/rules/import-file",
            headers=self.headers_a,
            files={"file": ("internal_rule.txt", io.BytesIO(rule_content), "text/plain")}
        )
        self.assertEqual(res_rule.status_code, 201)
        rule_id = res_rule.json()["id"]

        # User B cannot get or delete this rule
        res_get_b = self.client.get(f"/api/v1/rules/{rule_id}", headers=self.headers_b)
        self.assertEqual(res_get_b.status_code, 404)

        res_del_b = self.client.delete(f"/api/v1/rules/{rule_id}", headers=self.headers_b)
        self.assertEqual(res_del_b.status_code, 404)

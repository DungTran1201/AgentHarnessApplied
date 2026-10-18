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

class TestRulesAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_id = f"usr_a_{uuid.uuid4().hex[:8]}"
        self.email_a = f"rule_user_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_id = f"usr_b_{uuid.uuid4().hex[:8]}"
        self.email_b = f"rule_user_b_{uuid.uuid4().hex[:8]}@example.com"
        self.hashed_pw = hash_password("ValidSecret123!")

        # Create two test users
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Rule Tester A', ?, 'ACTIVE')",
            (self.user_a_id, self.email_a, self.hashed_pw)
        )
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Rule Tester B', ?, 'ACTIVE')",
            (self.user_b_id, self.email_b, self.hashed_pw)
        )

        self.token_a = create_access_token(self.user_a_id, self.email_a)
        self.token_b = create_access_token(self.user_b_id, self.email_b)

        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        execute_commit("DELETE FROM project_rules WHERE rule_id IN (SELECT id FROM rules WHERE user_id IN (?, ?))", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM rules WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM projects WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_a_id, self.user_b_id))

    def test_01_list_rules_default(self):
        res = self.client.get("/api/v1/rules", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertGreaterEqual(data["total"], 3)  # At least 3 seeded system rules

    def test_02_create_rule_success(self):
        payload = {
            "name": "Frontend React Standards",
            "description": "Tiêu chuẩn components React và Zustand",
            "content": "# React Guidelines\n1. Use functional components.\n2. Do not mutate state directly.",
            "activation_mode": "glob",
            "glob_patterns": ["src/**/*.tsx", "src/components/**"],
            "tags": ["frontend", "react"],
            "priority": 75
        }
        res = self.client.post("/api/v1/rules", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["id"].startswith("rul_"))
        self.assertEqual(data["name"], payload["name"])
        self.assertEqual(data["user_id"], self.user_a_id)
        self.assertEqual(data["scope"], "user")
        self.assertEqual(data["activation_mode"], "glob")
        self.assertEqual(data["glob_patterns"], payload["glob_patterns"])
        self.assertEqual(data["priority"], 75)
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["version"], 1)
        self.assertTrue(data["is_editable"])

    def test_03_create_rule_duplicate_name_409(self):
        payload = {
            "name": "Unique Name Rule",
            "content": "Content rule 1"
        }
        res1 = self.client.post("/api/v1/rules", json=payload, headers=self.headers_a)
        self.assertEqual(res1.status_code, 201)

        # Same name for same user -> 409
        res2 = self.client.post("/api/v1/rules", json=payload, headers=self.headers_a)
        self.assertEqual(res2.status_code, 409)

        # Same name for different user -> 201 Allowed
        res3 = self.client.post("/api/v1/rules", json=payload, headers=self.headers_b)
        self.assertEqual(res3.status_code, 201)

    def test_04_create_rule_validation_errors(self):
        # Empty name
        res = self.client.post("/api/v1/rules", json={"name": "   ", "content": "Valid content"}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

        # Glob mode with empty glob_patterns
        res = self.client.post("/api/v1/rules", json={"name": "Glob Rule", "content": "Valid", "activation_mode": "glob", "glob_patterns": []}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

        # Glob mode with path traversal ..
        res = self.client.post("/api/v1/rules", json={"name": "Path Traversal", "content": "Valid", "activation_mode": "glob", "glob_patterns": ["../../etc/passwd"]}, headers=self.headers_a)
        self.assertEqual(res.status_code, 422)

    def test_05_anti_idor_read_and_update(self):
        # User B creates a rule
        payload = {"name": "Secret Rule User B", "content": "Confidential"}
        res = self.client.post("/api/v1/rules", json=payload, headers=self.headers_b)
        self.assertEqual(res.status_code, 201)
        rule_b_id = res.json()["id"]

        # User A attempts to GET rule B -> 404 (Anti-IDOR)
        res_get = self.client.get(f"/api/v1/rules/{rule_b_id}", headers=self.headers_a)
        self.assertEqual(res_get.status_code, 404)

        # User A attempts to PUT rule B -> 404
        update_payload = {"name": "Hacked", "content": "Hacked content", "version": 1}
        res_put = self.client.put(f"/api/v1/rules/{rule_b_id}", json=update_payload, headers=self.headers_a)
        self.assertEqual(res_put.status_code, 404)

        # User A attempts to DELETE rule B -> 404
        res_del = self.client.delete(f"/api/v1/rules/{rule_b_id}", headers=self.headers_a)
        self.assertEqual(res_del.status_code, 404)

    def test_06_system_rule_read_only_protection(self):
        # Get one system rule
        res_sys = self.client.get("/api/v1/rules/sys-rule-clean-code", headers=self.headers_a)
        self.assertEqual(res_sys.status_code, 200)
        data = res_sys.json()
        self.assertEqual(data["scope"], "system")
        self.assertFalse(data["is_editable"])

        # Attempt to PUT system rule -> 403 Forbidden
        update_payload = {"name": "Modified Clean Code", "content": "New content", "version": 1}
        res_put = self.client.put("/api/v1/rules/sys-rule-clean-code", json=update_payload, headers=self.headers_a)
        self.assertEqual(res_put.status_code, 403)

        # Attempt to DELETE system rule -> 403 Forbidden
        res_del = self.client.delete("/api/v1/rules/sys-rule-clean-code", headers=self.headers_a)
        self.assertEqual(res_del.status_code, 403)

    def test_07_update_rule_and_optimistic_concurrency(self):
        # Create rule
        create_res = self.client.post("/api/v1/rules", json={"name": "Concurrency Rule", "content": "Initial"}, headers=self.headers_a)
        rule_id = create_res.json()["id"]
        self.assertEqual(create_res.json()["version"], 1)

        # Update with version 1 -> success, becomes version 2
        update_payload = {"name": "Concurrency Rule v2", "content": "Updated", "version": 1}
        res_update = self.client.put(f"/api/v1/rules/{rule_id}", json=update_payload, headers=self.headers_a)
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["version"], 2)

        # Stale update with version 1 -> 409 Conflict
        res_conflict = self.client.put(f"/api/v1/rules/{rule_id}", json=update_payload, headers=self.headers_a)
        self.assertEqual(res_conflict.status_code, 409)

    def test_08_quick_status_toggle(self):
        create_res = self.client.post("/api/v1/rules", json={"name": "Toggle Rule", "content": "Content"}, headers=self.headers_a)
        rule_id = create_res.json()["id"]

        # Toggle to inactive
        res = self.client.patch(f"/api/v1/rules/{rule_id}/status", json={"status": "inactive"}, headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "inactive")

        # Toggle back to active
        res2 = self.client.patch(f"/api/v1/rules/{rule_id}/status", json={"status": "active"}, headers=self.headers_a)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["status"], "active")

    def test_09_clone_rule_success(self):
        # Clone system rule
        res_clone = self.client.post("/api/v1/rules/sys-rule-clean-code/clone", headers=self.headers_a)
        self.assertEqual(res_clone.status_code, 201)
        cloned = res_clone.json()
        self.assertIn("(Copy)", cloned["name"])
        self.assertEqual(cloned["user_id"], self.user_a_id)
        self.assertEqual(cloned["scope"], "user")
        self.assertTrue(cloned["is_editable"])

    def test_10_delete_rule_guard_and_force(self):
        # Create rule and project
        rule_res = self.client.post("/api/v1/rules", json={"name": "Bound Rule", "content": "Rule text"}, headers=self.headers_a)
        rule_id = rule_res.json()["id"]

        project_id = f"prj_{uuid.uuid4().hex[:12]}"
        execute_commit(
            "INSERT INTO projects (id, user_id, name, status) VALUES (?, ?, 'Project Bound', 'ACTIVE')",
            (project_id, self.user_a_id)
        )

        # Bind rule to project
        execute_commit(
            "INSERT INTO project_rules (id, project_id, rule_id, is_enabled) VALUES (?, ?, ?, 1)",
            (f"pr_{uuid.uuid4().hex[:8]}", project_id, rule_id)
        )

        # Attempt delete without force -> 400 Bad Request
        res_del_fail = self.client.delete(f"/api/v1/rules/{rule_id}?force=false", headers=self.headers_a)
        self.assertEqual(res_del_fail.status_code, 400)
        self.assertIn("RULE_IN_USE_BY_PROJECTS", str(res_del_fail.json()))

        # Delete with force=true -> 200 OK
        res_del_ok = self.client.delete(f"/api/v1/rules/{rule_id}?force=true", headers=self.headers_a)
        self.assertEqual(res_del_ok.status_code, 200)

        # Verify soft deleted
        rule_db = query_one("SELECT deleted_at, status FROM rules WHERE id = ?", (rule_id,))
        self.assertIsNotNone(rule_db["deleted_at"])
        self.assertEqual(rule_db["status"], "archived")

    def test_11_project_rules_binding_and_associated_projects(self):
        rule_res = self.client.post("/api/v1/rules", json={"name": "Project Binding Rule", "content": "Text"}, headers=self.headers_a)
        rule_id = rule_res.json()["id"]

        project_id = f"prj_{uuid.uuid4().hex[:12]}"
        execute_commit(
            "INSERT INTO projects (id, user_id, name, status) VALUES (?, ?, 'Project Test', 'ACTIVE')",
            (project_id, self.user_a_id)
        )

        # Bind rule to project via API
        bind_res = self.client.put(
            f"/api/v1/projects/{project_id}/rules",
            json={"rule_ids": [rule_id, "sys-rule-security-first"]},
            headers=self.headers_a
        )
        self.assertEqual(bind_res.status_code, 200)

        # Get bound rules
        get_bound = self.client.get(f"/api/v1/projects/{project_id}/rules", headers=self.headers_a)
        self.assertEqual(get_bound.status_code, 200)
        self.assertEqual(len(get_bound.json()), 2)

        # Get associated projects from rule endpoint
        assoc_res = self.client.get(f"/api/v1/rules/{rule_id}/projects", headers=self.headers_a)
        self.assertEqual(assoc_res.status_code, 200)
        self.assertEqual(len(assoc_res.json()), 1)
        self.assertEqual(assoc_res.json()[0]["id"], project_id)

    def test_12_search_filter_pagination(self):
        self.client.post("/api/v1/rules", json={"name": "Python PEP8", "content": "Code rule", "tags": ["python", "backend"]}, headers=self.headers_a)
        self.client.post("/api/v1/rules", json={"name": "JavaScript Standard", "content": "JS rule", "tags": ["js", "frontend"]}, headers=self.headers_a)

        # Search by tag
        res_search = self.client.get("/api/v1/rules?search=backend", headers=self.headers_a)
        self.assertEqual(res_search.status_code, 200)
        items = res_search.json()["items"]
        self.assertTrue(any("Python PEP8" in r["name"] for r in items))

        # Filter by scope=user
        res_scope = self.client.get("/api/v1/rules?scope=user", headers=self.headers_a)
        self.assertEqual(res_scope.status_code, 200)
        for r in res_scope.json()["items"]:
            self.assertEqual(r["scope"], "user")

if __name__ == "__main__":
    unittest.main()

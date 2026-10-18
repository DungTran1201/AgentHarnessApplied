import unittest
import sys
import uuid
import json
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one, query_all

class TestProjectModelRulesIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_a_id = f"usr_ra_{uuid.uuid4().hex[:8]}"
        self.email_a = f"rule_tester_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_id = f"usr_rb_{uuid.uuid4().hex[:8]}"
        self.email_b = f"rule_tester_b_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)

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
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id LIKE 'proj_%')")
        execute_commit("DELETE FROM conversations WHERE project_id LIKE 'proj_%'")
        execute_commit("DELETE FROM project_rules WHERE project_id LIKE 'proj_%' OR rule_id IN (SELECT id FROM rules WHERE user_id IN (?, ?))", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM rules WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM projects WHERE user_id IN (?, ?)", (self.user_a_id, self.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_a_id, self.user_b_id))

    def _create_rule(self, user_id: str, name: str, content: str, priority: int = 50, status: str = "active", scope: str = "user") -> str:
        rule_id = f"rul_{uuid.uuid4().hex[:12]}"
        execute_commit(
            """
            INSERT INTO rules (id, user_id, name, description, content, scope, activation_mode, glob_patterns, tags, priority, status, version)
            VALUES (?, ?, ?, 'Test rule description', ?, ?, 'always_on', '[]', '[]', ?, ?, 1)
            """,
            (rule_id, user_id, name, content, scope, priority, status)
        )
        return rule_id

    def _create_graph_with_rules(self, rule_tuples):
        """
        Creates a graph with 1 Model Node connected to multiple Rule Nodes (1:N).
        Direction: Rule Node -> Model Node
        rule_tuples: list of (node_id, rule_id, label)
        """
        nodes = [
            {
                "id": "in_1",
                "type": "web_input",
                "position": {"x": 100, "y": 200},
                "data": {"label": "Web Input", "config": {"max_words": 500}}
            },
            {
                "id": "mod_1",
                "type": "model",
                "position": {"x": 400, "y": 200},
                "data": {"label": "Model Node", "config": {"model_id": "gemini-3.8-flash", "temperature": 0.7, "max_tokens": 2048}}
            },
            {
                "id": "out_1",
                "type": "output",
                "position": {"x": 700, "y": 200},
                "data": {"label": "Output", "config": {"streaming": True}}
            }
        ]
        edges = [
            {"id": "e_in_mod", "source": "in_1", "target": "mod_1", "type": "default", "sourceHandle": "output_handle", "targetHandle": "input_handle"},
            {"id": "e_mod_out", "source": "mod_1", "target": "out_1", "type": "default", "sourceHandle": "output_handle", "targetHandle": "input_handle"}
        ]

        y_offset = 350
        for idx, (node_id, r_id, label) in enumerate(rule_tuples):
            nodes.append({
                "id": node_id,
                "type": "rule",
                "position": {"x": 400 + (idx * 160), "y": y_offset},
                "data": {
                    "label": label or f"Rule {r_id}",
                    "config": {
                        "rule_id": r_id
                    }
                }
            })
            # Rule -> Model edge (rule_binding)
            edges.append({
                "id": f"e_{node_id}_mod",
                "source": node_id,
                "target": "mod_1",
                "type": "rule_binding",
                "sourceHandle": "rule_out",
                "targetHandle": "rule_in"
            })

        return {
            "viewport": {"x": 0, "y": 0, "zoom": 1},
            "nodes": nodes,
            "edges": edges
        }

    def test_01_catalog_rules_active_listing(self):
        """Rules catalog API provides active rules for node catalog."""
        r1 = self._create_rule(self.user_a_id, "User Rule 1", "Content 1", 50, "active")
        r_archived = self._create_rule(self.user_a_id, "Archived Rule", "Content Archived", 50, "archived")

        res = self.client.get("/api/v1/rules?status=active&limit=100", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        item_ids = [it["id"] for it in items]
        self.assertIn(r1, item_ids)
        self.assertNotIn(r_archived, item_ids)

    def test_02_save_and_reload_graph_with_1_model_and_3_rules(self):
        """Model connects to 3 rules (1:N); graph saves and syncs to project_rules."""
        # 1. Create 3 rules with varying priorities
        r1 = self._create_rule(self.user_a_id, "Code Quality", "Must write clean code", 80)
        r2 = self._create_rule(self.user_a_id, "Security Guardrails", "Sanitize all inputs", 95)
        r3 = self._create_rule(self.user_a_id, "Vietnamese Tone", "Respond politely in Vietnamese", 60)

        # 2. Create project
        create_res = self.client.post("/api/v1/projects", json={"name": "Multi-Rule Project"}, headers=self.headers_a)
        self.assertEqual(create_res.status_code, 201)
        p_id = create_res.json()["id"]

        # 3. Save graph with 3 rule nodes connected to Model Node
        payload = self._create_graph_with_rules([
            ("r_node_1", r1, "Code Quality"),
            ("r_node_2", r2, "Security Guardrails"),
            ("r_node_3", r3, "Vietnamese Tone")
        ])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()["is_valid"])

        # 4. Verify project_rules table in SQLite was synced
        synced_rules = query_all("SELECT rule_id, is_enabled FROM project_rules WHERE project_id = ?", (p_id,))
        self.assertEqual(len(synced_rules), 3)
        synced_ids = {r["rule_id"] for r in synced_rules}
        self.assertEqual(synced_ids, {r1, r2, r3})

        # 5. Reload project detail and verify graph structure preserved
        detail_res = self.client.get(f"/api/v1/projects/{p_id}", headers=self.headers_a)
        self.assertEqual(detail_res.status_code, 200)
        g_data = detail_res.json()["graph_data"]
        rule_nodes = [n for n in g_data["nodes"] if n["type"] == "rule"]
        self.assertEqual(len(rule_nodes), 3)
        rule_edges = [e for e in g_data["edges"] if e.get("type") == "rule_binding"]
        self.assertEqual(len(rule_edges), 3)

    def test_03_validation_rejects_reverse_model_to_rule_edge(self):
        """Graph validation rejects invalid reverse Model -> Rule connection."""
        r1 = self._create_rule(self.user_a_id, "Code Standard", "Clean code", 50)
        create_res = self.client.post("/api/v1/projects", json={"name": "Reverse Rule Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_rules([("r_node_1", r1, "Code Standard")])
        # Invert edge: Model -> Rule
        for edge in payload["edges"]:
            if edge["type"] == "rule_binding":
                edge["source"] = "mod_1"
                edge["target"] = "r_node_1"

        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 422)
        err_msg = str(save_res.json().get("detail", {}))
        self.assertIn("Model cannot connect to Rule", err_msg)

    def test_04_validation_rejects_rule_to_rule_edge(self):
        """Graph validation rejects invalid Rule -> Rule connection."""
        r1 = self._create_rule(self.user_a_id, "Rule 1", "Content 1", 50)
        r2 = self._create_rule(self.user_a_id, "Rule 2", "Content 2", 50)
        create_res = self.client.post("/api/v1/projects", json={"name": "Rule to Rule Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_rules([
            ("r_node_1", r1, "Rule 1"),
            ("r_node_2", r2, "Rule 2")
        ])
        # Change second edge to connect Rule 1 -> Rule 2
        for edge in payload["edges"]:
            if edge["id"] == "e_r_node_2_mod":
                edge["source"] = "r_node_1"
                edge["target"] = "r_node_2"

        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 422)
        err_msg = str(save_res.json().get("detail", {}))
        self.assertIn("Rule cannot connect to another Rule", err_msg)

    def test_05_validation_rejects_duplicate_rule_binding_on_same_model(self):
        """Graph validation rejects duplicate rule_id bound multiple times to the same Model."""
        r1 = self._create_rule(self.user_a_id, "Duplicate Target Rule", "Content", 50)
        create_res = self.client.post("/api/v1/projects", json={"name": "Duplicate Rule Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        # Two distinct nodes referencing the same rule_id r1
        payload = self._create_graph_with_rules([
            ("r_node_1", r1, "Rule A"),
            ("r_node_2", r1, "Rule B")
        ])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 422)
        err_msg = str(save_res.json().get("detail", {}))
        self.assertIn("trùng lặp", err_msg)

    def test_06_validation_rejects_unconnected_rule_node(self):
        """Graph validation rejects Rule node that is placed on canvas but not connected to Model."""
        r1 = self._create_rule(self.user_a_id, "Unconnected Rule", "Content", 50)
        create_res = self.client.post("/api/v1/projects", json={"name": "Unconnected Rule Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_rules([("r_node_1", r1, "Unconnected Rule")])
        # Remove the edge for rule node
        payload["edges"] = [e for e in payload["edges"] if e.get("type") != "rule_binding"]

        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 422)
        err_msg = str(save_res.json().get("detail", {}))
        self.assertTrue("chưa được kết nối" in err_msg or "cạnh kết nối" in err_msg)

    def test_07_validation_rejects_foreign_user_rule_idor(self):
        """Anti-IDOR: User A cannot bind private rule created by User B."""
        r_b = self._create_rule(self.user_b_id, "User B Private Rule", "Content B", 50, "active", "user")
        create_res = self.client.post("/api/v1/projects", json={"name": "IDOR Rule Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_rules([("r_node_1", r_b, "Private Rule B")])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 422)
        err_msg = str(save_res.json().get("detail", {}))
        self.assertIn("không tồn tại", err_msg)

    def test_08_canvas_unbinding_removes_from_project_rules(self):
        """When rule node is removed from canvas, sync_project_rules unlinks it."""
        r1 = self._create_rule(self.user_a_id, "Rule 1", "Content 1", 50)
        r2 = self._create_rule(self.user_a_id, "Rule 2", "Content 2", 50)
        create_res = self.client.post("/api/v1/projects", json={"name": "Unlink Test Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        # 1. Save with 2 rules
        payload2 = self._create_graph_with_rules([
            ("r_node_1", r1, "Rule 1"),
            ("r_node_2", r2, "Rule 2")
        ])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload2, headers=self.headers_a)
        self.assertEqual(len(query_all("SELECT * FROM project_rules WHERE project_id = ?", (p_id,))), 2)

        # 2. Resave with only Rule 1
        payload1 = self._create_graph_with_rules([("r_node_1", r1, "Rule 1")])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload1, headers=self.headers_a)
        self.assertEqual(save_res.status_code, 200)

        # 3. Verify project_rules now only has Rule 1
        remaining = query_all("SELECT rule_id FROM project_rules WHERE project_id = ?", (p_id,))
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["rule_id"], r1)

    def test_09_runtime_chat_resolves_rules_with_deterministic_order(self):
        """Runtime chat resolves rules from graph sorted by priority DESC, name ASC, id ASC."""
        # Create 3 rules with different priorities
        r_mid = self._create_rule(self.user_a_id, "Alpha Medium Rule", "Alpha Content", 50)
        r_high = self._create_rule(self.user_a_id, "Zulu High Rule", "Zulu Content", 90)
        r_low = self._create_rule(self.user_a_id, "Beta Low Rule", "Beta Content", 10)

        create_res = self.client.post("/api/v1/projects", json={"name": "Runtime Rules Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]

        # Activate project directly
        execute_commit("UPDATE projects SET status = 'ACTIVE' WHERE id = ?", (p_id,))

        # Save graph with the 3 rules
        payload = self._create_graph_with_rules([
            ("r_node_1", r_mid, "Alpha Medium"),
            ("r_node_2", r_high, "Zulu High"),
            ("r_node_3", r_low, "Beta Low")
        ])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)

        # Mock ProjectChatTurnManager.start_turn and stream_turn to capture passed combined_instruction and connected_rules_info
        from src.services.chat_turn_manager import ProjectChatTurnManager
        captured_kwargs = {}

        original_start_turn = ProjectChatTurnManager.start_turn
        def mock_start_turn(**kwargs):
            nonlocal captured_kwargs
            captured_kwargs = kwargs
            turn_mock = MagicMock()
            turn_mock.turn_id = "turn_test_123"
            turn_mock.status = "COMPLETED"
            return turn_mock

        def mock_stream_turn(turn):
            yield f'event: start\ndata: {{"turn_id": "{turn.turn_id}", "status": "PROCESSING", "rules": {json.dumps(captured_kwargs.get("connected_rules_info", []))}}}\n\n'
            yield 'event: done\ndata: {"status": "COMPLETED"}\n\n'

        with patch.object(ProjectChatTurnManager, "start_turn", side_effect=mock_start_turn), \
             patch.object(ProjectChatTurnManager, "stream_turn", side_effect=mock_stream_turn):

            chat_res = self.client.post(
                f"/api/v1/projects/{p_id}/chat",
                json={"message": "Xin chao AI Chan"},
                headers=self.headers_a
            )
            self.assertEqual(chat_res.status_code, 200)

            # Check that rules were passed in deterministic priority order: Zulu High (90) -> Alpha Medium (50) -> Beta Low (10)
            rules_info = captured_kwargs.get("connected_rules_info", [])
            self.assertEqual(len(rules_info), 3)
            self.assertEqual(rules_info[0]["id"], r_high)
            self.assertEqual(rules_info[1]["id"], r_mid)
            self.assertEqual(rules_info[2]["id"], r_low)

            # Check combined instruction formatting
            combined_instr = captured_kwargs.get("combined_instruction", "")
            self.assertIn("--- ACTIVE ENGINEERING RULES ---", combined_instr)
            self.assertIn("### Rule: Zulu High Rule", combined_instr)
            self.assertIn("Zulu Content", combined_instr)
            self.assertIn("### Rule: Alpha Medium Rule", combined_instr)
            self.assertIn("### Rule: Beta Low Rule", combined_instr)

            # Verify order in text: Zulu High appears before Alpha Medium, which appears before Beta Low
            pos_high = combined_instr.find("Zulu High Rule")
            pos_mid = combined_instr.find("Alpha Medium Rule")
            pos_low = combined_instr.find("Beta Low Rule")
            self.assertTrue(pos_high < pos_mid < pos_low, "Rules must appear in descending priority order")

    def test_10_runtime_chat_fails_closed_when_rule_archived(self):
        """If a connected rule is archived or deleted after graph save, chat fails closed with 422."""
        r1 = self._create_rule(self.user_a_id, "Rule To Archive", "Some Content", 50, "active")
        create_res = self.client.post("/api/v1/projects", json={"name": "Fail Closed Project"}, headers=self.headers_a)
        p_id = create_res.json()["id"]
        execute_commit("UPDATE projects SET status = 'ACTIVE' WHERE id = ?", (p_id,))

        payload = self._create_graph_with_rules([("r_node_1", r1, "Rule To Archive")])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, headers=self.headers_a)

        # Now archive the rule
        execute_commit("UPDATE rules SET status = 'archived' WHERE id = ?", (r1,))

        chat_res = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "Hello test"},
            headers=self.headers_a
        )
        self.assertEqual(chat_res.status_code, 422)
        err = chat_res.json().get("detail", {})
        self.assertEqual(err.get("error_code"), "RULE_DISABLED")

if __name__ == "__main__":
    unittest.main()

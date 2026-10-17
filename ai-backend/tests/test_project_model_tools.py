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
from src.db import execute_commit, query_one, query_all

class TestProjectModelToolsIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = str(uuid.uuid4())
        self.email = f"tool_tester_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)

        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Tool Tester', ?, 'ACTIVE')",
            (self.user_id, self.email, self.hashed_pw)
        )

        self.token = create_access_token(self.user_id, self.email)
        self.cookies = {"access_token": self.token}
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id LIKE 'proj_%')")
        execute_commit("DELETE FROM conversations WHERE project_id LIKE 'proj_%'")
        execute_commit("DELETE FROM project_tool_bindings WHERE project_id LIKE 'proj_%'")
        execute_commit("DELETE FROM tool_executions WHERE project_id LIKE 'proj_%'")
        execute_commit("DELETE FROM projects WHERE user_id = ?", (self.user_id,))
        execute_commit("DELETE FROM users WHERE id = ?", (self.user_id,))

    def _create_graph_with_tools(self, tools_list):
        """Creates a graph with 1 Model Node connected to 0..N Tool Nodes."""
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
        for idx, (t_id, is_enabled, timeout_sec) in enumerate(tools_list):
            node_id = f"tool_node_{idx+1}"
            nodes.append({
                "id": node_id,
                "type": "tool",
                "position": {"x": 400 + (idx * 160), "y": y_offset},
                "data": {
                    "label": f"Tool {t_id}",
                    "config": {
                        "tool_id": t_id,
                        "is_enabled": is_enabled,
                        "custom_timeout_seconds": timeout_sec
                    }
                }
            })
            # Model -> Tool edge (1:N availability binding)
            edges.append({
                "id": f"e_mod_{node_id}",
                "source": "mod_1",
                "target": node_id,
                "type": "model_tool",
                "sourceHandle": "out",
                "targetHandle": "tool_in"
            })

        return {
            "viewport": {"x": 0, "y": 0, "zoom": 1},
            "nodes": nodes,
            "edges": edges
        }

    def test_catalog_returns_real_tools_from_registry(self):
        """Node Catalog API returns real registered tools with schema and status."""
        res = self.client.get("/api/v1/tools?limit=100", cookies=self.cookies, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 20)

        tool_ids = [t["id"] for t in data["items"]]
        self.assertIn("calculator", tool_ids)
        self.assertIn("convert_units", tool_ids)
        self.assertIn("date_time_info", tool_ids)

        calc_tool = next(t for t in data["items"] if t["id"] == "calculator")
        self.assertEqual(calc_tool["status"], "AVAILABLE")
        self.assertEqual(calc_tool["category"], "DATA")

    def test_save_and_reload_graph_with_1_model_and_3_tools(self):
        """Model connects to 3 tools; graph saves and project_tool_bindings syncs."""
        # 1. Create project
        create_res = self.client.post("/api/v1/projects", json={"name": "Multi-Tool Project"}, cookies=self.cookies, headers=self.headers)
        self.assertEqual(create_res.status_code, 201)
        p_id = create_res.json()["id"]

        # 2. Save graph with 3 tools: calculator, convert_units, date_time_info
        payload = self._create_graph_with_tools([
            ("calculator", True, 15),
            ("convert_units", True, 20),
            ("date_time_info", True, 10)
        ])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()["is_valid"])

        # 3. Verify SQLite project_tool_bindings has 3 rows
        bindings = query_all("SELECT tool_id, is_enabled, custom_timeout_seconds FROM project_tool_bindings WHERE project_id = ?", (p_id,))
        self.assertEqual(len(bindings), 3)
        b_map = {b["tool_id"]: b for b in bindings}
        self.assertIn("calculator", b_map)
        self.assertEqual(b_map["calculator"]["is_enabled"], 1)
        self.assertEqual(b_map["calculator"]["custom_timeout_seconds"], 15)
        self.assertIn("convert_units", b_map)
        self.assertIn("date_time_info", b_map)

        # 4. Reload project detail and verify graph structure preserved
        detail_res = self.client.get(f"/api/v1/projects/{p_id}", cookies=self.cookies, headers=self.headers)
        self.assertEqual(detail_res.status_code, 200)
        g_data = detail_res.json()["graph_data"]
        tool_nodes = [n for n in g_data["nodes"] if n["type"] == "tool"]
        self.assertEqual(len(tool_nodes), 3)
        tool_edges = [e for e in g_data["edges"] if e.get("type") == "model_tool"]
        self.assertEqual(len(tool_edges), 3)

    def test_validation_rejects_reverse_tool_to_model_edge(self):
        """Graph validation rejects reverse Tool -> Model connection."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Reverse Edge Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        # Build invalid graph where tool connects to model (source=tool_node, target=mod_1)
        payload = self._create_graph_with_tools([("calculator", True, 30)])
        # Invert edge
        for edge in payload["edges"]:
            if edge["type"] == "model_tool":
                edge["source"] = "tool_node_1"
                edge["target"] = "mod_1"

        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(save_res.status_code, 422)
        err_detail = save_res.json().get("detail", {})
        err_msg = str(err_detail)
        self.assertTrue(
            "không được phép" in err_msg or "đầu vào" in err_msg or "đầu ra" in err_msg or "hướng" in err_msg or "INVALID" in err_msg,
            f"Expected validation error on reverse edge, got: {err_msg}"
        )

    def test_validation_rejects_duplicate_tool_on_same_model(self):
        """Graph validation rejects duplicate tool types connected to same Model."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Duplicate Tool Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        # 2 tools with same tool_id 'calculator'
        payload = self._create_graph_with_tools([
            ("calculator", True, 30),
            ("calculator", True, 30)
        ])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(save_res.status_code, 422)
        err_detail = save_res.json().get("detail", {})
        self.assertIn("trùng lặp", str(err_detail))

    def test_unbinding_tool_when_removed_from_canvas(self):
        """When a tool is deleted from canvas and graph re-saved, its binding is removed."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Unbind Test Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        # 1. Save with 3 tools
        payload3 = self._create_graph_with_tools([
            ("calculator", True, 30),
            ("convert_units", True, 30),
            ("date_time_info", True, 30)
        ])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload3, cookies=self.cookies, headers=self.headers)
        b3 = query_all("SELECT tool_id FROM project_tool_bindings WHERE project_id = ?", (p_id,))
        self.assertEqual(len(b3), 3)

        # 2. Re-save with only 2 tools (remove date_time_info)
        payload2 = self._create_graph_with_tools([
            ("calculator", True, 30),
            ("convert_units", True, 30)
        ])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload2, cookies=self.cookies, headers=self.headers)
        b2 = query_all("SELECT tool_id FROM project_tool_bindings WHERE project_id = ?", (p_id,))
        self.assertEqual(len(b2), 2)
        remaining_tids = {b["tool_id"] for b in b2}
        self.assertNotIn("date_time_info", remaining_tids)
        self.assertIn("calculator", remaining_tids)
        self.assertIn("convert_units", remaining_tids)

    def test_project_chat_executes_calculator_on_math_prompt(self):
        """Chat prompt 'tính 25 * 4' triggers calculator tool and yields result 100."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Chat Calc Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_tools([("calculator", True, 10)])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)

        # Send math calculation message
        chat_res = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "tính 25 * 4"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_res.status_code, 200)
        stream_content = chat_res.text
        self.assertIn("event: start", stream_content)
        self.assertIn("calculator", stream_content)
        self.assertIn("100", stream_content)

        # Verify audit log recorded execution
        exec_records = query_all("SELECT * FROM tool_executions WHERE project_id = ? AND tool_id = 'calculator'", (p_id,))
        self.assertGreaterEqual(len(exec_records), 1)
        self.assertEqual(exec_records[0]["status"], "SUCCEEDED")

    def test_project_chat_does_not_execute_tools_for_general_conversation(self):
        """Conversational prompt 'Xin chào' does NOT execute any connected tools."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Chat No Tool Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_tools([
            ("calculator", True, 10),
            ("convert_units", True, 10)
        ])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)

        # Record count of executions prior to chat
        initial_execs = len(query_all("SELECT id FROM tool_executions WHERE project_id = ?", (p_id,)))

        # Send greeting message
        chat_res = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "Xin chào trợ lý, bạn có khỏe không?"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_res.status_code, 200)
        self.assertIn("event: chunk", chat_res.text)

        # Executions count must NOT increase
        after_execs = len(query_all("SELECT id FROM tool_executions WHERE project_id = ?", (p_id,)))
        self.assertEqual(initial_execs, after_execs, "System must NOT run tools automatically for general conversation!")

    def test_project_chat_reports_cleanly_when_tool_not_connected(self):
        """Prompting for calculation when Calculator is NOT connected executes 0 calculator calls."""
        create_res = self.client.post("/api/v1/projects", json={"name": "No Calc Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        # Only date_time_info connected (no calculator)
        payload = self._create_graph_with_tools([("date_time_info", True, 10)])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)

        chat_res = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "tính 50 * 2"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_res.status_code, 200)

        # Confirm 0 calculator executions occurred
        calc_execs = query_all("SELECT id FROM tool_executions WHERE project_id = ? AND tool_id = 'calculator'", (p_id,))
        self.assertEqual(len(calc_execs), 0, "Calculator must not be executed when not connected to Model")

    def test_project_chat_with_disabled_tool_raises_422_tool_disabled(self):
        """Chatting with a project whose connected tool is DISABLED raises HTTP 422 with TOOL_DISABLED."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Disabled Tool Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        payload = self._create_graph_with_tools([("calculator", True, 10)])
        self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)

        try:
            # Temporarily disable calculator in DB
            execute_commit("UPDATE tools SET status = 'DISABLED' WHERE id = 'calculator'")

            chat_res = self.client.post(
                f"/api/v1/projects/{p_id}/chat",
                json={"message": "tính 10 + 20"},
                cookies=self.cookies,
                headers=self.headers
            )
            self.assertEqual(chat_res.status_code, 422)
            data = chat_res.json()
            self.assertEqual(data.get("detail", {}).get("error_code"), "TOOL_DISABLED")
            self.assertIn("không khả dụng", data.get("detail", {}).get("message", ""))
        finally:
            # Restore calculator to AVAILABLE
            execute_commit("UPDATE tools SET status = 'AVAILABLE' WHERE id = 'calculator'")

    def test_backward_compatibility_graph_without_tools(self):
        """Legacy 3-node graph (Input -> Model -> Output) without tools continues to function perfectly."""
        create_res = self.client.post("/api/v1/projects", json={"name": "Legacy Project"}, cookies=self.cookies, headers=self.headers)
        p_id = create_res.json()["id"]

        # 0 tools
        payload = self._create_graph_with_tools([])
        save_res = self.client.put(f"/api/v1/projects/{p_id}/graph", json=payload, cookies=self.cookies, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()["is_valid"])

        # Activate and chat
        self.client.post(f"/api/v1/projects/{p_id}/activate", cookies=self.cookies, headers=self.headers)
        chat_res = self.client.post(
            f"/api/v1/projects/{p_id}/chat",
            json={"message": "Xin chào hệ thống"},
            cookies=self.cookies,
            headers=self.headers
        )
        self.assertEqual(chat_res.status_code, 200)
        self.assertIn("event: chunk", chat_res.text)
        self.assertIn("event: done", chat_res.text)


if __name__ == "__main__":
    unittest.main()

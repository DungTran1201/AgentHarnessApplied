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

class TestProjectBotSkillGraph(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = str(uuid.uuid4())
        self.email = f"graph_tester_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)
        
        # User 2 without Discord link
        self.user2_id = str(uuid.uuid4())
        self.email2 = f"graph_tester2_{uuid.uuid4().hex[:8]}@example.com"
        
        # Insert test user 1 (with discord_id)
        self.discord_id = f"disc_{uuid.uuid4().hex[:12]}"
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username) VALUES (?, ?, 'Graph Tester', ?, 'ACTIVE', ?, 'discord_tester')",
            (self.user_id, self.email, self.hashed_pw, self.discord_id)
        )
        
        # Insert test user 2 (without discord_id)
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Graph Tester 2', ?, 'ACTIVE')",
            (self.user2_id, self.email2, self.hashed_pw)
        )
        
        self.token = create_access_token(self.user_id, self.email)
        self.token2 = create_access_token(self.user2_id, self.email2)
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.headers2 = {"Authorization": f"Bearer {self.token2}"}
        
        # Create a bot config for user 1
        self.bot_id = str(uuid.uuid4())
        execute_commit(
            """INSERT INTO discord_bot_configs 
               (id, user_id, scope, guild_id, guild_name, trigger_mode, is_enabled, sync_to_web)
               VALUES (?, ?, 'GUILD', '987654321098765432', 'Test Server', 'MENTION', 1, 1)""",
            (self.bot_id, self.user_id)
        )
        
        # Create two test skills for user 1
        self.skill_id_1 = f"skl_{uuid.uuid4().hex[:12]}"
        self.skill_id_2 = f"skl_{uuid.uuid4().hex[:12]}"
        execute_commit(
            """INSERT INTO skills (id, user_id, name, description, status, source_type, storage_path, is_valid)
               VALUES (?, ?, 'Canvas Skill 1', 'First test skill for graph', 'VALID', 'USER_CREATED', 'canvas_skill_1', 1)""",
            (self.skill_id_1, self.user_id)
        )
        execute_commit(
            """INSERT INTO skills (id, user_id, name, description, status, source_type, storage_path, is_valid)
               VALUES (?, ?, 'Canvas Skill 2', 'Second test skill for graph', 'VALID', 'USER_CREATED', 'canvas_skill_2', 1)""",
            (self.skill_id_2, self.user_id)
        )
        
        # Create a test project for user 1
        self.project_id = f"proj_{uuid.uuid4().hex[:12]}"
        execute_commit(
            "INSERT INTO projects (id, user_id, name, description, status) VALUES (?, ?, 'Canvas Test Project', 'Graph test', 'STOP')",
            (self.project_id, self.user_id)
        )

    def tearDown(self):
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = ?)", (self.project_id,))
        execute_commit("DELETE FROM conversations WHERE project_id = ?", (self.project_id,))
        execute_commit("DELETE FROM projects WHERE id = ? OR user_id IN (?, ?)", (self.project_id, self.user_id, self.user2_id))
        execute_commit("DELETE FROM discord_bot_configs WHERE user_id IN (?, ?)", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM skills WHERE user_id IN (?, ?)", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_id, self.user2_id))

    def _build_graph(self, include_bot=False, bot_count=1, skill_ids=None, reverse_bot=False, reverse_skill=False, duplicate_skill_edge=False):
        nodes = [
            {"id": "in_1", "type": "web_input", "position": {"x": 100, "y": 200}, "data": {"label": "Web Input", "config": {"max_words": 500}}},
            {"id": "m_1", "type": "model", "position": {"x": 400, "y": 200}, "data": {"label": "Model Node", "config": {"model_id": "gemini-3.8-flash", "temperature": 0.7, "max_tokens": 2048}}},
            {"id": "out_1", "type": "output", "position": {"x": 700, "y": 200}, "data": {"label": "Output", "config": {"streaming": True}}}
        ]
        edges = [
            {"id": "e_in_m", "source": "in_1", "target": "m_1", "sourceHandle": "out", "targetHandle": "in", "type": "data_flow"},
            {"id": "e_m_out", "source": "m_1", "target": "out_1", "sourceHandle": "out", "targetHandle": "in", "type": "data_flow"}
        ]
        
        if include_bot:
            for b_idx in range(bot_count):
                b_node_id = f"bot_{b_idx + 1}"
                nodes.append({
                    "id": b_node_id,
                    "type": "bot",
                    "position": {"x": 400, "y": 350 + (b_idx * 100)},
                    "data": {"label": "Discord Bot", "config": {"bot_id": self.bot_id, "name": "Test Canvas Bot"}}
                })
                if reverse_bot:
                    edges.append({"id": f"e_rev_bot_{b_idx}", "source": b_node_id, "target": "m_1", "sourceHandle": "out", "targetHandle": "in", "type": "bot_binding"})
                else:
                    edges.append({"id": f"e_m_bot_{b_idx}", "source": "m_1", "target": b_node_id, "sourceHandle": "out", "targetHandle": "bot_in", "type": "bot_binding"})

        if skill_ids:
            for s_idx, s_id in enumerate(skill_ids):
                s_node_id = f"skill_{s_idx + 1}"
                nodes.append({
                    "id": s_node_id,
                    "type": "skill",
                    "position": {"x": 200 + (s_idx * 150), "y": 350},
                    "data": {"label": f"Skill {s_idx + 1}", "config": {"skill_id": s_id, "name": f"Skill {s_idx + 1}"}}
                })
                if reverse_skill:
                    edges.append({"id": f"e_rev_skill_{s_idx}", "source": s_node_id, "target": "m_1", "sourceHandle": "out", "targetHandle": "in", "type": "skill_binding"})
                else:
                    edges.append({"id": f"e_m_skill_{s_idx}", "source": "m_1", "target": s_node_id, "sourceHandle": "out", "targetHandle": "skill_in", "type": "skill_binding"})
                    if duplicate_skill_edge and s_idx == 0:
                        edges.append({"id": f"e_m_skill_{s_idx}_dup", "source": "m_1", "target": s_node_id, "sourceHandle": "out", "targetHandle": "skill_in", "type": "skill_binding"})

        return {"viewport": {"x": 0, "y": 0, "zoom": 1}, "nodes": nodes, "edges": edges}

    def test_available_bots_endpoint_access_control(self):
        # 1. User with Discord link can retrieve available bots
        res = self.client.get("/api/v1/bot/discord/available", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.bot_id)
        self.assertEqual(data[0]["platform"], "discord")
        
        # 2. User without Discord link gets 403 Forbidden
        res2 = self.client.get("/api/v1/bot/discord/available", headers=self.headers2)
        self.assertEqual(res2.status_code, 403)
        self.assertEqual(res2.json().get("detail"), "DISCORD_NOT_LINKED")

    def test_valid_graph_with_one_bot_and_multiple_skills(self):
        payload = self._build_graph(include_bot=True, bot_count=1, skill_ids=[self.skill_id_1, self.skill_id_2])
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("is_valid"))
        
        # Verify persistence and reload
        proj_res = self.client.get(f"/api/v1/projects/{self.project_id}", headers=self.headers)
        self.assertEqual(proj_res.status_code, 200)
        graph_data = proj_res.json()["graph_data"]
        self.assertEqual(len(graph_data["nodes"]), 6) # input, model, output, bot, 2 skills = 6
        self.assertEqual(len(graph_data["edges"]), 5) # in->m, m->out, m->bot, 2 skills => total 5 edges

    def test_multiple_bots_connected_to_model_rejected(self):
        # Model connects to 2 Bots => Must be rejected with 422
        payload = self._build_graph(include_bot=True, bot_count=2)
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        errors = res.json().get("detail", {}).get("errors", [])
        errors_str = " ".join(errors)
        self.assertIn("This model can be connected to only one bot. Remove the existing bot connection before selecting another.", errors_str)

    def test_duplicate_model_to_skill_edge_rejected(self):
        # Model connects to same Skill twice => Must be rejected with 422
        payload = self._build_graph(include_bot=True, bot_count=1, skill_ids=[self.skill_id_1], duplicate_skill_edge=True)
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        errors = res.json().get("detail", {}).get("errors", [])
        errors_str = " ".join(errors).lower()
        self.assertTrue("trùng lặp" in errors_str or "duplicate" in errors_str)

    def test_reverse_bot_connection_rejected(self):
        # Bot -> Model instead of Model -> Bot => Rejected with 422
        payload = self._build_graph(include_bot=True, bot_count=1, reverse_bot=True)
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        errors = res.json().get("detail", {}).get("errors", [])
        errors_str = " ".join(errors)
        self.assertIn("Invalid reverse connection: Bot cannot connect to Model", errors_str)

    def test_reverse_skill_connection_rejected(self):
        # Skill -> Model instead of Model -> Skill => Rejected with 422
        payload = self._build_graph(include_bot=False, skill_ids=[self.skill_id_1], reverse_skill=True)
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        errors = res.json().get("detail", {}).get("errors", [])
        errors_str = " ".join(errors)
        self.assertIn("Invalid reverse connection: Skill cannot connect to Model", errors_str)

    def test_unlinked_user_cannot_save_bot_graph(self):
        # User 2 (no Discord link) attempts to save graph with bot => 422 with Discord error
        proj2_id = f"proj_{uuid.uuid4().hex[:12]}"
        execute_commit("INSERT INTO projects (id, user_id, name, description, status) VALUES (?, ?, 'User 2 Proj', '', 'STOP')", (proj2_id, self.user2_id))
        try:
            payload = self._build_graph(include_bot=True, bot_count=1)
            res = self.client.put(f"/api/v1/projects/{proj2_id}/graph", json=payload, headers=self.headers2)
            self.assertEqual(res.status_code, 422)
            errors = res.json().get("detail", {}).get("errors", [])
            errors_str = " ".join(errors).lower()
            self.assertIn("discord", errors_str)
        finally:
            execute_commit("DELETE FROM projects WHERE id = ?", (proj2_id,))

    def test_nonexistent_skill_rejected(self):
        # Non-existent skill ID => 422
        fake_skill_id = f"skl_{uuid.uuid4().hex[:12]}"
        payload = self._build_graph(include_bot=False, skill_ids=[fake_skill_id])
        res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        errors = res.json().get("detail", {}).get("errors", [])
        errors_str = " ".join(errors).lower()
        self.assertIn("không tồn tại", errors_str)

    def test_chat_execution_resolves_bot_and_skills(self):
        # Save valid graph with bot and skills
        payload = self._build_graph(include_bot=True, bot_count=1, skill_ids=[self.skill_id_1, self.skill_id_2])
        save_res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)

        # Activate project
        act_res = self.client.post(f"/api/v1/projects/{self.project_id}/activate", headers=self.headers)
        self.assertEqual(act_res.status_code, 200)

        from unittest.mock import patch

        captured_kwargs = {}
        async def mock_astream_agent(*args, **kwargs):
            captured_kwargs.update(kwargs)
            yield {"status": "streaming", "token": "Hello from mock agent"}
            yield {"status": "done", "model": "gemini-3.8-flash"}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            chat_res = self.client.post(
                f"/api/v1/projects/{self.project_id}/chat",
                json={"message": "Hello graph runtime test"},
                headers=self.headers
            )
            self.assertEqual(chat_res.status_code, 200)
            self.assertIn("text/event-stream", chat_res.headers.get("content-type", ""))
            
            stream_text = chat_res.text
            self.assertIn("event: start", stream_text)
            self.assertIn("event: chunk", stream_text)
            
            # Extract start event data
            start_line = [l for l in stream_text.splitlines() if l.startswith("data: ")][0]
            start_payload = json.loads(start_line[6:])
            
            # Verify bot was resolved
            self.assertIsNotNone(start_payload.get("bot"))
            self.assertEqual(start_payload["bot"]["id"], self.bot_id)
            self.assertEqual(start_payload["bot"]["name"], "Test Server")
            
            # Verify skills were resolved
            skills = start_payload.get("skills")
            self.assertIsNotNone(skills)
            self.assertEqual(len(skills), 2)
            skill_ids = [s["id"] for s in skills]
            self.assertIn(self.skill_id_1, skill_ids)
            self.assertIn(self.skill_id_2, skill_ids)

            # Verify prompt context was augmented with active skill instructions
            sys_inst = captured_kwargs.get("system_instruction", "")
            self.assertIn("ACTIVE SKILLS INSTRUCTIONS", sys_inst)
            self.assertIn("Canvas Skill 1", sys_inst)
            self.assertIn("Canvas Skill 2", sys_inst)

    def test_health_endpoints_match_reference_schema(self):
        # 1. Root /health (called by reference Discord bot)
        res_root = self.client.get("/health")
        self.assertEqual(res_root.status_code, 200)
        data_root = res_root.json()
        self.assertIn(data_root.get("status"), ("ok", "healthy"))
        self.assertIsNotNone(data_root.get("version"))
        self.assertIsInstance(data_root.get("details"), dict)

        # 2. Sub-path /api/v1/health
        res_v1 = self.client.get("/api/v1/health")
        self.assertEqual(res_v1.status_code, 200)
        data_v1 = res_v1.json()
        self.assertIn(data_v1.get("status"), ("ok", "healthy"))
        self.assertIsInstance(data_v1.get("details"), dict)

    def test_discord_prompt_execution_through_project(self):
        # 1. Save valid graph with bot and 2 skills
        payload = self._build_graph(include_bot=True, bot_count=1, skill_ids=[self.skill_id_1, self.skill_id_2])
        save_res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)

        # 2. Activate project
        act_res = self.client.post(f"/api/v1/projects/{self.project_id}/activate", headers=self.headers)
        self.assertEqual(act_res.status_code, 200)

        from unittest.mock import patch

        captured_kwargs = {}
        async def mock_astream_agent(*args, **kwargs):
            captured_kwargs.update(kwargs)
            yield {"status": "streaming", "token": "Discord bot response text generated through project model"}
            yield {"status": "done", "model": "gemini-3.8-flash"}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            # Call POST /api/v1/prompt via Discord Bot PromptRequest format
            prompt_req = {
                "prompt": "What are your capabilities?",
                "model": "default",
                "metadata": {
                    "user_id": self.discord_id,
                    "channel_id": "112233445566778899"
                }
            }
            res = self.client.post("/api/v1/prompt", json=prompt_req, headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["model"], "gemini-3.8-flash")
            self.assertIn("Discord bot response text", data["response"])
            self.assertIsNotNone(data.get("usage"))
            self.assertGreater(data["usage"]["total_tokens"], 0)

            # Check that skills context was passed
            sys_inst = captured_kwargs.get("system_instruction", "")
            self.assertIn("ACTIVE SKILLS INSTRUCTIONS", sys_inst)
            self.assertIn("Canvas Skill 1", sys_inst)
            self.assertIn("Canvas Skill 2", sys_inst)

            # Check web conversation sync
            msg_rows = query_one(
                "SELECT count(*) as count FROM messages WHERE source = 'DISCORD'"
            )
            self.assertGreaterEqual(msg_rows["count"], 2)

    def test_discord_prompt_model_override_precedence(self):
        # Save & activate project with default model gemini-3.8-flash
        payload = self._build_graph(include_bot=True, bot_count=1)
        self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=payload, headers=self.headers)
        self.client.post(f"/api/v1/projects/{self.project_id}/activate", headers=self.headers)

        from unittest.mock import patch

        async def mock_astream_agent(*args, **kwargs):
            yield {"status": "streaming", "token": "Response from overridden model"}
            yield {"status": "done", "model": kwargs.get("model_override")}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            # 1. Non-existent / unauthorized model override => Rejected with 400
            bad_req = {
                "prompt": "Test bad override",
                "model": "non-existent-hack-model-v99",
                "metadata": {"user_id": self.discord_id}
            }
            bad_res = self.client.post("/api/v1/prompt", json=bad_req, headers=self.headers)
            self.assertEqual(bad_res.status_code, 400)
            self.assertIn("not active or authorized", bad_res.json().get("detail", ""))

            # 2. Valid active model override => Accepted and used
            valid_override_req = {
                "prompt": "Test valid override",
                "model": "gemini-3.5-flash",
                "metadata": {"user_id": self.discord_id}
            }
            good_res = self.client.post("/api/v1/prompt", json=valid_override_req, headers=self.headers)
            self.assertEqual(good_res.status_code, 200)
            self.assertEqual(good_res.json()["model"], "gemini-3.5-flash")

    def test_ambiguous_bot_route_rejected(self):
        # 1. Project 1 is ACTIVE with bot
        p1_graph = self._build_graph(include_bot=True, bot_count=1)
        self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=p1_graph, headers=self.headers)
        self.client.post(f"/api/v1/projects/{self.project_id}/activate", headers=self.headers)

        # 2. Create Project 2 and also activate with bot
        p2_id = f"proj2_{uuid.uuid4().hex[:10]}"
        execute_commit("INSERT INTO projects (id, user_id, name, description, status) VALUES (?, ?, 'Project 2', '', 'ACTIVE')", (p2_id, self.user_id))
        p2_graph = self._build_graph(include_bot=True, bot_count=1)
        self.client.put(f"/api/v1/projects/{p2_id}/graph", json=p2_graph, headers=self.headers)

        try:
            from unittest.mock import patch
            async def mock_astream_agent(*args, **kwargs):
                yield {"status": "streaming", "token": "Ambiguous mock"}
                yield {"status": "done", "model": "gemini-3.8-flash"}

            with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
                # 3. Call /api/v1/prompt with no explicit project_id route => Rejected with 400
                ambig_req = {
                    "prompt": "Route this prompt",
                    "metadata": {"user_id": self.discord_id}
                }
                res = self.client.post("/api/v1/prompt", json=ambig_req, headers=self.headers)
                self.assertEqual(res.status_code, 400)
                detail = res.json().get("detail", "")
                self.assertIn("The Discord bot cannot determine which model to execute. Configure an explicit route before running this workflow.", detail)

                # 4. Call /api/v1/prompt WITH explicit project_id => Disambiguated and succeeded
                explicit_req = {
                    "prompt": "Route this prompt explicitly",
                    "metadata": {
                        "user_id": self.discord_id,
                        "project_id": self.project_id
                    }
                }
                ok_res = self.client.post("/api/v1/prompt", json=explicit_req, headers=self.headers)
                self.assertEqual(ok_res.status_code, 200)
        finally:
            execute_commit("DELETE FROM projects WHERE id = ?", (p2_id,))

    def test_bot_binding_endpoint_resolves_project_and_model(self):
        # 1. Before saving graph with bot, binding endpoint reports not bound
        res = self.client.get("/api/v1/bot/discord/binding", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_bound"])
        self.assertIsNone(data["project"])
        self.assertIsNone(data["model"])

        # 2. Save graph with Model -> Bot node (using Discord client ID or bot_id)
        bot_graph = self._build_graph(include_bot=True, bot_count=1)
        # Verify save graph succeeds
        save_res = self.client.put(f"/api/v1/projects/{self.project_id}/graph", json=bot_graph, headers=self.headers)
        self.assertEqual(save_res.status_code, 200)

        # Activate project
        self.client.post(f"/api/v1/projects/{self.project_id}/activate", headers=self.headers)

        # 3. Call binding endpoint again -> should resolve project and model
        res2 = self.client.get("/api/v1/bot/discord/binding", headers=self.headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertTrue(data2["is_bound"])
        self.assertIsNotNone(data2["project"])
        self.assertEqual(data2["project"]["id"], self.project_id)
        self.assertEqual(data2["project"]["status"], "ACTIVE")
        self.assertIsNotNone(data2["model"])
        self.assertEqual(data2["model"]["id"], "gemini-3.8-flash")
        self.assertEqual(data2["bot"]["bot_id"], self.bot_id)

if __name__ == "__main__":
    unittest.main()



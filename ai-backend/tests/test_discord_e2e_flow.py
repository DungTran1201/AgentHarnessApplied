"""End-to-end tests for Discord message processing through AI-Chan project graphs and LLM models."""

import json
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one, query_all
from src.discord_bot.utils import split_discord_message


def test_split_discord_message_short_text():
    """Verify that short text (< max_chunk_size) is returned as a single chunk."""
    text = "Hello world! This is a short response."
    chunks = split_discord_message(text, max_chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_split_discord_message_preserves_code_fences():
    """Verify that splitting inside a markdown code block properly closes and reopens fences."""
    code_text = (
        "Here is some python code:\n"
        "```python\n"
        "def hello_world():\n"
        "    print('Line 1')\n"
        "    print('Line 2')\n"
        "    print('Line 3')\n"
        "```\n"
        "And some concluding text."
    )
    # Split with a small threshold to force splitting inside the code block
    chunks = split_discord_message(code_text, max_chunk_size=55)
    assert len(chunks) >= 2

    # Chunk 0 should close the code block if it split inside
    if "```python" in chunks[0] and "def hello_world():" in chunks[0]:
        assert chunks[0].endswith("```")
        # Chunk 1 should reopen the code block with python syntax
        assert chunks[1].startswith("```python")


class TestDiscordE2EFlow:
    """Test suite covering end-to-end Discord routing, active validation, multi-turn context, and isolation."""

    @classmethod
    def setup_class(cls):
        cls.client = TestClient(app)
        
        # User A
        cls.user_a_id = str(uuid.uuid4())
        cls.email_a = f"e2e_a_{uuid.uuid4().hex[:8]}@example.com"
        cls.discord_id_a = f"disc_a_{uuid.uuid4().hex[:12]}"
        cls.hashed_pw = hash_password("ValidPass123!")

        execute_commit(
            """INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
               VALUES (?, ?, 'E2E User A', ?, 'ACTIVE', ?, 'discord_user_a')""",
            (cls.user_a_id, cls.email_a, cls.hashed_pw, cls.discord_id_a),
        )
        cls.token_a = create_access_token(cls.user_a_id, cls.email_a)
        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}

        # User B
        cls.user_b_id = str(uuid.uuid4())
        cls.email_b = f"e2e_b_{uuid.uuid4().hex[:8]}@example.com"
        cls.discord_id_b = f"disc_b_{uuid.uuid4().hex[:12]}"

        execute_commit(
            """INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
               VALUES (?, ?, 'E2E User B', ?, 'ACTIVE', ?, 'discord_user_b')""",
            (cls.user_b_id, cls.email_b, cls.hashed_pw, cls.discord_id_b),
        )
        cls.token_b = create_access_token(cls.user_b_id, cls.email_b)
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

        # Bot A (User A)
        cls.bot_id_a = str(uuid.uuid4())
        cls.guild_id_a = "100000000000000001"
        execute_commit(
            """INSERT INTO discord_bot_configs (id, user_id, scope, guild_id, guild_name, trigger_mode, is_enabled, sync_to_web)
               VALUES (?, ?, 'GUILD', ?, 'Guild Server A', 'SLASH_COMMAND', 1, 1)""",
            (cls.bot_id_a, cls.user_a_id, cls.guild_id_a),
        )

        # Bot B (User B)
        cls.bot_id_b = str(uuid.uuid4())
        cls.guild_id_b = "200000000000000002"
        execute_commit(
            """INSERT INTO discord_bot_configs (id, user_id, scope, guild_id, guild_name, trigger_mode, is_enabled, sync_to_web)
               VALUES (?, ?, 'GUILD', ?, 'Guild Server B', 'SLASH_COMMAND', 1, 1)""",
            (cls.bot_id_b, cls.user_b_id, cls.guild_id_b),
        )

        # Create Project A (User A)
        cls.proj_id_a = f"proj_a_{uuid.uuid4().hex[:8]}"
        execute_commit(
            "INSERT INTO projects (id, user_id, name, description, status) VALUES (?, ?, 'Project Alpha', 'A', 'ACTIVE')",
            (cls.proj_id_a, cls.user_a_id),
        )
        graph_a = cls._build_graph(bot_id=cls.bot_id_a, model_id="gemini-3.8-flash")
        execute_commit("UPDATE projects SET graph_data = ? WHERE id = ?", (json.dumps(graph_a), cls.proj_id_a))

        # Create Project B (User B)
        cls.proj_id_b = f"proj_b_{uuid.uuid4().hex[:8]}"
        execute_commit(
            "INSERT INTO projects (id, user_id, name, description, status) VALUES (?, ?, 'Project Beta', 'B', 'ACTIVE')",
            (cls.proj_id_b, cls.user_b_id),
        )
        graph_b = cls._build_graph(bot_id=cls.bot_id_b, model_id="gemini-3.5-flash")
        execute_commit("UPDATE projects SET graph_data = ? WHERE id = ?", (json.dumps(graph_b), cls.proj_id_b))

    @classmethod
    def teardown_class(cls):
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id IN (?, ?))", (cls.proj_id_a, cls.proj_id_b))
        execute_commit("DELETE FROM conversations WHERE project_id IN (?, ?)", (cls.proj_id_a, cls.proj_id_b))
        execute_commit("DELETE FROM projects WHERE id IN (?, ?) OR user_id IN (?, ?)", (cls.proj_id_a, cls.proj_id_b, cls.user_a_id, cls.user_b_id))
        execute_commit("DELETE FROM discord_bot_configs WHERE user_id IN (?, ?)", (cls.user_a_id, cls.user_b_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (cls.user_a_id, cls.user_b_id))

    @staticmethod
    def _build_graph(bot_id: str, model_id: str) -> dict:
        return {
            "nodes": [
                {"id": "m_1", "type": "model", "position": {"x": 200, "y": 200}, "data": {"label": "Model", "config": {"model_id": model_id}}},
                {"id": "b_1", "type": "bot", "position": {"x": 400, "y": 200}, "data": {"label": "Bot", "config": {"bot_id": bot_id}}},
            ],
            "edges": [
                {"id": "e_mb", "source": "m_1", "target": "b_1"},
            ],
        }

    def test_routing_to_project_a(self):
        """Verify that an interaction for User A deterministically resolves Project A and Model A."""
        captured = {}

        async def mock_astream_agent(*args, **kwargs):
            captured.update(kwargs)
            yield {"status": "streaming", "token": "Response from Project Alpha"}
            yield {"status": "done", "model": kwargs.get("model_override")}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            req = {
                "prompt": "Hello Alpha bot",
                "metadata": {
                    "user_id": self.discord_id_a,
                    "guild_id": self.guild_id_a,
                },
            }
            res = self.client.post("/api/v1/prompt", json=req, headers=self.headers_a)
            assert res.status_code == 200
            data = res.json()
            assert data["model"] == "gemini-3.8-flash"
            assert "Response from Project Alpha" in data["response"]

    def test_routing_to_project_b(self):
        """Verify that an interaction for User B deterministically resolves Project B and Model B."""
        captured = {}

        async def mock_astream_agent(*args, **kwargs):
            captured.update(kwargs)
            yield {"status": "streaming", "token": "Response from Project Beta"}
            yield {"status": "done", "model": kwargs.get("model_override")}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            req = {
                "prompt": "Hello Beta bot",
                "metadata": {
                    "user_id": self.discord_id_b,
                    "guild_id": self.guild_id_b,
                },
            }
            res = self.client.post("/api/v1/prompt", json=req, headers=self.headers_b)
            assert res.status_code == 200
            data = res.json()
            assert data["model"] == "gemini-3.5-flash"
            assert "Response from Project Beta" in data["response"]

    def test_inactive_project_rejection(self):
        """Verify that an assigned project in STOP status is rejected with a clear error."""
        # Temporarily set Project Alpha to STOP
        execute_commit("UPDATE projects SET status = 'STOP' WHERE id = ?", (self.proj_id_a,))

        req = {
            "prompt": "Should fail because project is inactive",
            "metadata": {
                "user_id": self.discord_id_a,
                "project_id": self.proj_id_a,
            },
        }
        res = self.client.post("/api/v1/prompt", json=req, headers=self.headers_a)
        assert res.status_code == 400
        assert "currently inactive (STOP)" in res.json().get("detail", "")

        # Restore Project Alpha to ACTIVE
        execute_commit("UPDATE projects SET status = 'ACTIVE' WHERE id = ?", (self.proj_id_a,))

    def test_multiturn_conversational_history_loading(self):
        """Verify that multiple turns in the same conversation load prior turns into history."""
        captured_history = []

        async def mock_astream_agent(*args, **kwargs):
            captured_history.append(kwargs.get("history", []))
            yield {"status": "streaming", "token": f"Reply to: {kwargs.get('prompt')}"}
            yield {"status": "done", "model": kwargs.get("model_override")}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_astream_agent):
            # Turn 1
            req1 = {
                "prompt": "My favorite color is Blue.",
                "metadata": {"user_id": self.discord_id_a, "guild_id": self.guild_id_a},
            }
            res1 = self.client.post("/api/v1/prompt", json=req1, headers=self.headers_a)
            assert res1.status_code == 200

            # Turn 2
            req2 = {
                "prompt": "What is my favorite color?",
                "metadata": {"user_id": self.discord_id_a, "guild_id": self.guild_id_a},
            }
            res2 = self.client.post("/api/v1/prompt", json=req2, headers=self.headers_a)
            assert res2.status_code == 200

            # The second invocation of mock_astream_agent should have captured Turn 1 in its history
            assert len(captured_history) == 2
            turn2_history = captured_history[1]
            assert len(turn2_history) >= 2
            assert any("My favorite color is Blue." in m.get("content", "") for m in turn2_history)

    def test_nonexistent_project_rejected(self):
        """Verify that an explicit project_id that does not exist returns HTTP 404."""
        req = {
            "prompt": "Invalid project test",
            "metadata": {
                "user_id": self.discord_id_a,
                "project_id": "proj_non_existent_12345",
            },
        }
        res = self.client.post("/api/v1/prompt", json=req, headers=self.headers_a)
        assert res.status_code == 404
        assert "not found or not accessible" in res.json().get("detail", "")

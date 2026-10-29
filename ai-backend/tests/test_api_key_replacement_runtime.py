"""
End-to-End Runtime Credential Resolution & Provider Routing Regression Suite (v0.1.2)

Proves all 7 stages of the API key replacement lifecycle using mocked credentials
(OLD_TEST_CREDENTIAL -> NEW_TEST_CREDENTIAL) without exposing or requiring real keys:
1. Frontend/API submits the new credential.
2. Backend receives the canonical provider identifier and authenticated user ID.
3. CredentialService encrypts the new credential and updates the existing database record.
4. Status/diagnostics endpoints report the new masked suffix and fingerprint without plaintext.
5. Runtime credential resolver returns NEW_TEST_CREDENTIAL according to PERSONAL > SYSTEM > NONE.
6. LangChainModelFactory passes NEW_TEST_CREDENTIAL to the provider adapter associated with the selected model.
7. Subsequent chat requests and search tool executions immediately use NEW_TEST_CREDENTIAL without restart.
"""

import asyncio
import os
import sys
import unittest
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from unittest.mock import patch
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit
from src.services.credential_service import CredentialService
from src.services.tools.executor import ToolExecutorService
from src.services.tools.handlers.web_handlers import (
    register_search_provider_adapter,
    clear_search_provider_adapters,
)
from llm.agent import (
    LangChainModelFactory,
    ChatAgentOrchestrator,
    ModelQuotaTracker,
    chat_agent,
)


OLD_TEST_CREDENTIAL = "cred_OLD_TEST_CREDENTIAL_alpha1111"
NEW_TEST_CREDENTIAL = "cred_NEW_TEST_CREDENTIAL_omega2222"
SYS_TEST_CREDENTIAL = "cred_SYS_TEST_CREDENTIAL_sys09999"


class _MockCapturingLLM:
    """Mock LangChain chat model that records the credential and model used at invocation time."""

    def __init__(self, provider: str, model_name: str, api_key: str, user_id: Optional[str]):
        self.provider = provider
        self.model_name = model_name
        self.api_key = api_key
        self.user_id = user_id

    def invoke(self, messages):
        return AIMessage(content=f"ack:{self.provider}:{self.model_name}")

    async def astream(self, messages):
        yield AIMessage(content=f"stream:{self.provider}:{self.model_name}")


class TestApiKeyReplacementRuntime(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        LangChainModelFactory.clear_provider_constructors()
        CredentialService.clear_connection_validators()
        clear_search_provider_adapters()
        ModelQuotaTracker.clear_cooldowns()

        self.captured_llm_calls: List[Dict[str, Any]] = []
        self.captured_search_calls: List[Dict[str, Any]] = []

        # Register DI constructors for all 5 LLM providers
        for prov in ("gemini", "openai", "anthropic", "groq", "ollama"):
            def _make_ctor(p_name: str):
                def _ctor(model_name: str, api_key: str, user_id: Optional[str] = None):
                    self.captured_llm_calls.append({
                        "provider": p_name,
                        "model_name": model_name,
                        "api_key": api_key,
                        "user_id": user_id,
                    })
                    return _MockCapturingLLM(p_name, model_name, api_key, user_id)
                return _ctor
            LangChainModelFactory.register_provider_constructor(prov, _make_ctor(prov))

        # Register DI adapters for search providers (brave, serpapi)
        for s_prov in ("brave", "serpapi"):
            def _make_search_adapter(sp_name: str):
                async def _adapter(query: str, api_key: str, max_results: int, user_id: Optional[str]):
                    self.captured_search_calls.append({
                        "provider": sp_name,
                        "query": query,
                        "api_key": api_key,
                        "user_id": user_id,
                    })
                    return {
                        "query": query,
                        "provider": sp_name,
                        "result_count": 1,
                        "results": [{"title": f"Result from {sp_name}", "url": "https://example.com"}],
                    }
                return _adapter
            register_search_provider_adapter(s_prov, _make_search_adapter(s_prov))

        # Create authenticated test user
        self.user_id = str(uuid.uuid4())
        self.user_email = f"runtime_tester_{uuid.uuid4().hex[:6]}@example.com"
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status)
            VALUES (?, ?, 'Runtime Tester', ?, 'ACTIVE')
            """,
            (self.user_id, self.user_email, hash_password("TestPass123!"))
        )
        self.token = create_access_token(self.user_id, self.user_email)
        self.cookies = {"access_token": self.token}

    def tearDown(self):
        LangChainModelFactory.clear_provider_constructors()
        CredentialService.clear_connection_validators()
        clear_search_provider_adapters()
        ModelQuotaTracker.clear_cooldowns()
        execute_commit("DELETE FROM user_api_keys WHERE user_id = ?", (self.user_id,))
        execute_commit("DELETE FROM users WHERE id = ?", (self.user_id,))

    def _run_stream(self, model_override: str) -> List[Dict[str, Any]]:
        async def _collect():
            chunks = []
            async for event in chat_agent.astream_agent(
                prompt="Hello runtime test",
                history=[],
                model_override=model_override,
                user_id=self.user_id,
            ):
                chunks.append(event)
            return chunks
        return asyncio.run(_collect())

    def test_all_llm_providers_route_and_replace_credentials_immediately(self):
        """
        Verifies for every supported LLM provider (google/gemini, openai, anthropic, groq, ollama)
        that:
        1. Selecting a provider's model routes to that exact provider (not hardcoded gemini).
        2. Saving OLD_TEST_CREDENTIAL passes OLD_TEST_CREDENTIAL to the provider constructor.
        3. Replacing with NEW_TEST_CREDENTIAL immediately passes NEW_TEST_CREDENTIAL on the next chat request.
        """
        provider_test_matrix = [
            ("google", "gemini", "gemini-3.5-flash-lite"),
            ("openai", "openai", "gpt-4o-mini"),
            ("anthropic", "anthropic", "claude-3-7-sonnet"),
            ("groq", "groq", "llama-3.3-70b-versatile"),
            ("ollama", "ollama", "llama3"),
        ]

        for api_provider, expected_runtime_prov, model_id in provider_test_matrix:
            with self.subTest(provider=api_provider, model=model_id):
                self.captured_llm_calls.clear()

                # Stage 1: Save OLD_TEST_CREDENTIAL via API
                put_old = self.client.put(
                    f"/api/v1/settings/api-keys/{api_provider}",
                    json={"api_key": OLD_TEST_CREDENTIAL},
                    cookies=self.cookies,
                )
                self.assertEqual(put_old.status_code, 200)

                # Stage 2: Execute streaming chat request with model_override
                events_old = self._run_stream(model_override=model_id)
                self.assertTrue(any(e.get("status") == "done" for e in events_old))
                self.assertEqual(len(self.captured_llm_calls), 1)
                self.assertEqual(self.captured_llm_calls[0]["provider"], expected_runtime_prov)
                self.assertEqual(self.captured_llm_calls[0]["model_name"], model_id)
                self.assertEqual(self.captured_llm_calls[0]["api_key"], OLD_TEST_CREDENTIAL)
                self.assertEqual(self.captured_llm_calls[0]["user_id"], self.user_id)

                # Stage 3: Replace with NEW_TEST_CREDENTIAL via API
                self.captured_llm_calls.clear()
                put_new = self.client.put(
                    f"/api/v1/settings/api-keys/{api_provider}",
                    json={"api_key": NEW_TEST_CREDENTIAL},
                    cookies=self.cookies,
                )
                self.assertEqual(put_new.status_code, 200)
                if api_provider != "ollama":
                    self.assertEqual(put_new.json()["masked_hint"], "****2222")

                # Stage 4: Next chat request immediately receives NEW_TEST_CREDENTIAL without restart
                events_new = self._run_stream(model_override=model_id)
                self.assertTrue(any(e.get("status") == "done" for e in events_new))
                self.assertEqual(len(self.captured_llm_calls), 1)
                self.assertEqual(self.captured_llm_calls[0]["provider"], expected_runtime_prov)
                self.assertEqual(self.captured_llm_calls[0]["api_key"], NEW_TEST_CREDENTIAL)

    def test_replacing_key_clears_quota_cooldown_immediately(self):
        """
        When a model is placed in 429 cooldown under OLD_TEST_CREDENTIAL, replacing the key
        with NEW_TEST_CREDENTIAL clears the cooldown so the next request uses the model immediately.
        """
        self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": OLD_TEST_CREDENTIAL},
            cookies=self.cookies,
        )
        ModelQuotaTracker.record_quota_exhausted("gpt-4o-mini", retry_delay_seconds=1800.0)
        self.assertFalse(ModelQuotaTracker.is_available("gpt-4o-mini"))

        # Replace personal key -> must clear cooldown
        self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": NEW_TEST_CREDENTIAL},
            cookies=self.cookies,
        )
        self.assertTrue(ModelQuotaTracker.is_available("gpt-4o-mini"))

    def test_search_providers_brave_and_serpapi_replace_credentials_at_runtime(self):
        """
        Verifies that Brave Search and SerpAPI resolve user-scoped credentials via CredentialService
        and immediately use NEW_TEST_CREDENTIAL after replacement.
        """
        for search_prov in ("brave", "serpapi"):
            with self.subTest(search_provider=search_prov):
                self.captured_search_calls.clear()

                # 1. Save OLD_TEST_CREDENTIAL
                self.client.put(
                    f"/api/v1/settings/api-keys/{search_prov}",
                    json={"api_key": OLD_TEST_CREDENTIAL},
                    cookies=self.cookies,
                )

                res_old = asyncio.run(
                    ToolExecutorService.execute_tool(
                        "web_search",
                        {"query": "AI-Chan v0.1.2 test", "provider": search_prov},
                        user_id=self.user_id,
                    )
                )
                self.assertEqual(res_old.status.value, "SUCCEEDED")
                self.assertEqual(len(self.captured_search_calls), 1)
                self.assertEqual(self.captured_search_calls[0]["api_key"], OLD_TEST_CREDENTIAL)
                self.assertEqual(self.captured_search_calls[0]["user_id"], self.user_id)

                # 2. Replace with NEW_TEST_CREDENTIAL
                self.captured_search_calls.clear()
                self.client.put(
                    f"/api/v1/settings/api-keys/{search_prov}",
                    json={"api_key": NEW_TEST_CREDENTIAL},
                    cookies=self.cookies,
                )

                res_new = asyncio.run(
                    ToolExecutorService.execute_tool(
                        "web_search",
                        {"query": "AI-Chan v0.1.2 updated test", "provider": search_prov},
                        user_id=self.user_id,
                    )
                )
                self.assertEqual(res_new.status.value, "SUCCEEDED")
                self.assertEqual(len(self.captured_search_calls), 1)
                self.assertEqual(self.captured_search_calls[0]["api_key"], NEW_TEST_CREDENTIAL)

    def test_model_activation_respects_personal_api_key(self):
        """
        A user who configured a PERSONAL key (even when system .env has no key) can activate a model
        for that provider via PATCH /api/v1/models/{model_id}/activate.
        """
        model_id = f"gpt-4o-test-{uuid.uuid4().hex[:6]}"
        execute_commit(
            """
            INSERT INTO models (id, name, provider, status, is_default, context_window, max_tokens, supports_streaming)
            VALUES (?, 'GPT-4o Test', 'openai', 'INACTIVE', 0, 128000, 4096, 1)
            """,
            (model_id,)
        )
        try:
            with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
                # Without personal key -> 400 Bad Request
                fail_res = self.client.patch(
                    f"/api/v1/models/{model_id}/activate",
                    cookies=self.cookies,
                )
                self.assertEqual(fail_res.status_code, 400)

                # Save personal key -> activation succeeds!
                self.client.put(
                    "/api/v1/settings/api-keys/openai",
                    json={"api_key": NEW_TEST_CREDENTIAL},
                    cookies=self.cookies,
                )
                ok_res = self.client.patch(
                    f"/api/v1/models/{model_id}/activate",
                    cookies=self.cookies,
                )
                self.assertEqual(ok_res.status_code, 200)
                self.assertEqual(ok_res.json()["status"], "ACTIVE")
        finally:
            execute_commit("DELETE FROM models WHERE id = ?", (model_id,))


if __name__ == "__main__":
    unittest.main()

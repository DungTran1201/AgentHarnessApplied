# Changelog

All notable changes to **AI-Chan** are documented in this file.

## [v0.1.2] - 2026-10-29

### Fixed
- **Runtime LLM Provider Routing (`ai-backend/llm/agent.py`)**:
  - Fixed `ChatAgentOrchestrator.primary_node()` and `astream_agent()` so the selected model (`model_override` / `target_model`) is routed to its associated provider (`google`/`gemini`, `openai`, `anthropic`, `groq`, `ollama`) via `LangChainModelFactory.resolve_provider_for_model()` instead of being forced through a hardcoded `gemini` default.
  - Added full runtime adapter support in `LangChainModelFactory.create_model()` and `get_candidate_models()` for all 5 LLM providers (`gemini`/`google`, `openai`, `anthropic`, `groq`, `ollama`).
  - Added `user_id: Optional[str]` to `AgentChatState` so LangGraph state transitions preserve user identity for per-user credential resolution.
- **Immediate API Key Replacement & Quota Cooldown Reset (`ai-backend/src/services/credential_service.py`, `ai-backend/llm/agent.py`)**:
  - Saving or deleting a personal key or updating a system `.env` key now automatically clears `ModelQuotaTracker` 429 circuit-breaker cooldowns (`ModelQuotaTracker.clear_cooldowns()`), ensuring newly saved credentials take effect on the very next request without waiting for a 30-minute cooldown or restarting the server.
  - Updated `LLMManager` (`ai-backend/llm/client.py`) and `EnvKeyLoader` (`ai-backend/llm/agent.py`) to resolve keys dynamically through `CredentialService.get_effective_key(user_id, provider)` instead of caching startup environment variables.
- **Credential Precedence & Decryption Failure Safety (`ai-backend/src/services/credential_service.py`)**:
  - Enforced strict `PERSONAL > SYSTEM > NONE` precedence across all endpoints and runtime consumers.
  - Fixed `CredentialService.get_system_key()` to check `os.environ` before fallback attributes on `settings`.
  - Eliminated silent fallback to `SYSTEM` when an active `PERSONAL` key fails AES-256-GCM decryption (`decryption_error = True`), surfacing clear recovery instructions in `get_user_keys_status()`, `validate_connection()`, and `astream_agent()`.
  - Fixed `CredentialService.validate_connection()` so testing an unsaved `candidate_key` (`tested_source = "CANDIDATE"`) never overwrites the stored personal key's `validation_status` or `last_error_summary`.
  - Updated `CredentialService.update_system_env_variable()` to detect and warn when an active `PERSONAL` key overrides the updated system `.env` variable.
- **Model Management & Search Tool Credential Integration (`ai-backend/src/api/v1/models.py`, `ai-backend/src/services/tools/executor.py`, `ai-backend/src/services/tools/handlers/web_handlers.py`, `ai-backend/src/services/tools/registry.py`)**:
  - Fixed `PATCH /api/v1/models/{model_id}/activate`, `POST /api/v1/models`, and `PUT /api/v1/models/{model_id}` to pass the authenticated `user_id` when checking `has_api_key`.
  - Updated `ToolExecutorService.execute_tool()` and `handle_web_search()` to propagate `user_id` and execute authenticated searches against Brave Search (`brave`) and SerpAPI (`serpapi`) using the user's effective credential.
- **Settings UI & Same-Origin Reverse Proxy (`ai-frontend/src/components/settings/ApiKeysTab.tsx`, `ai-frontend/src/services/apiKeyService.ts`, `ai-frontend/src/app/api/[[...path]]/route.ts`)**:
  - Added Next.js dynamic route proxy (`/api/[[...path]]/route.ts`) and updated frontend services (`apiKeyService.ts`, `apiClient.ts`, `resourceService.ts`) to use same-origin `/api/v1`.
  - Updated `ApiKeysTab.tsx` to clearly distinguish adding a personal key, replacing an existing personal key, testing an unsaved candidate key (`Test khóa vừa nhập (chưa lưu)`), testing the saved active key (`Test khóa đang dùng`), updating system `.env` keys with personal-override warnings, and deleting personal overrides with confirmation.
  - Added `GET /api/v1/settings/api-keys/{provider}/diagnostics` endpoint and non-reversible 8-character SHA-256 `key_fingerprint` metadata display.

## [v0.1.1] - 2026-10-28

### Fixed
- Resolved Settings API Keys authentication/fetch loop and added persistent application `SECRET_KEY` initialization.

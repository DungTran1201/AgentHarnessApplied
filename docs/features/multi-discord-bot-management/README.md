# Multi-Discord Bot Management & Multi-Project Routing Specification

## 1. Overview & Objective

This feature upgrades AI-Chan's Discord integration from a single hardcoded `.env` token (`DISCORD_BOT_TOKEN`) into an enterprise-grade **Multi-Discord Bot Management Registry**. 

### Core Capabilities
1. **Dynamic Bot Registry:** Users can register and configure multiple Discord bots, each with a unique name, alias, and dedicated Discord Bot Token.
2. **Encrypted Token Protection:** Bot tokens are encrypted at rest using authenticated **AES-256-GCM** with 96-bit random nonces. Raw tokens are **never** returned in API responses, logs, or stored in frontend state.
3. **Multi-Bot Runtime Lifecycle Manager (`MultiBotManager`):** Manages concurrent, isolated `discord.py` client instances. A failure in Bot A (e.g., bad token or missing intents) does not crash Bot B or FastAPI.
4. **Strict 1:1 Project Routing:** Each Discord Bot is linked to at most one AI-Chan Project at a time. Prompts arriving from Bot A route exclusively to Project A's graph (model, rules, system prompt, and skills); Bot B routes to Project B.
5. **No Accidental Routing:** Unlinked bots safely reject messages with a clear prompt to link the bot in the UI; no ambiguous or default projects are selected.
6. **Backward Compatibility & Idempotent Migration:** Existing `.env` configurations are automatically and idempotently imported into the Bot Registry on startup without duplicating records.

---

## 2. Discord Developer Portal Setup Guide for a Second Bot

To create and link a second Discord Bot to an AI-Chan Project:

### Step 1: Create the Application in Discord Developer Portal
1. Navigate to [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, enter an application name (e.g., `AI-Chan Beta Bot`), and confirm.

### Step 2: Configure the Bot User & Privileged Intents
1. In the left navigation, select **Bot**.
2. Click **Reset Token** to generate a fresh Discord Bot Token. Copy this token immediately.
3. Scroll down to **Privileged Gateway Intents**:
   - Check **MESSAGE CONTENT INTENT** (Mandatory for reading prompts).
   - Check **SERVER MEMBERS INTENT** (Optional, recommended).
4. Click **Save Changes**.

### Step 3: Invite the Bot to Your Discord Server
1. In the left navigation, select **OAuth2** > **URL Generator**.
2. In **Scopes**, check `bot` and `applications.commands`.
3. In **Bot Permissions**, check:
   - `Send Messages`
   - `Embed Links`
   - `Read Message History`
   - `Use Slash Commands`
4. Copy the generated URL at the bottom and open it in a browser to authorize the bot into your Discord server.

### Step 4: Register & Link Bot in AI-Chan UI
1. Open AI-Chan and navigate to **Bot Management** (`/bot/discord`).
2. Click **Register New Bot**:
   - **Name:** Enter a display name (e.g., `Beta Bot`).
   - **Alias:** Enter a unique slug (e.g., `beta-bot`).
   - **Bot Token:** Paste the Discord Bot Token copied from Step 2.
   - **Assign to Project:** Select the destination AI-Chan Project.
3. Click **Register Bot**.
4. Click **Test** on the bot card to verify that Discord REST API recognizes the token.
5. Click **Connect** to start the Gateway connection.

---

## 3. Architecture & Data Model

### Database Schema (`discord_bot_configs`)
Table modified by migration `018_multi_discord_bot_management.sql`:
- `id` (VARCHAR 36, PK): Unique bot identifier.
- `user_id` (VARCHAR 36, FK): Owner user identifier.
- `name` (VARCHAR 100): Display name.
- `alias` (VARCHAR 100): Unique slug per user (`idx_discord_bot_configs_user_alias`).
- `token_ciphertext` (TEXT): Base64-encoded payload containing `[nonce (12B) + tag (16B) + ciphertext]`.
- `token_last4` (VARCHAR 10): Masked suffix (e.g., `****1234`) for UI identification.
- `status` (VARCHAR 30): `NOT_CONFIGURED`, `DISCONNECTED`, `CONNECTING`, `CONNECTED`, `DEGRADED`, `INVALID_CREDENTIALS`, `ERROR`.
- `project_id` (VARCHAR 36, FK): Unique 1:1 project relationship.
- `discord_application_id` / `client_id` (VARCHAR 50): Discord snowflake ID.
- `last_connected_at` (TIMESTAMP): Time of last successful Gateway handshake.
- `last_error_code` / `last_error_summary` (TEXT): Sanitized error diagnostics.

---

## 4. REST API Contracts

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/bots` | List all bots owned by user with safe metadata and status | Yes (BR-031) |
| `POST` | `/api/v1/bots` | Register new bot with encrypted token | Yes (BR-031) |
| `GET` | `/api/v1/bots/{id}` | Get bot details (never reveals token) | Yes (BR-031) |
| `PATCH` | `/api/v1/bots/{id}` | Update metadata or replace token | Yes (BR-031) |
| `DELETE` | `/api/v1/bots/{id}` | Terminate runtime and delete bot config | Yes (BR-031) |
| `POST` | `/api/v1/bots/{id}/test-connection` | Verify token against `/users/@me` without Gateway client | Yes (BR-031) |
| `POST` | `/api/v1/bots/{id}/connect` | Start isolated Gateway connection | Yes (BR-031) |
| `POST` | `/api/v1/bots/{id}/disconnect` | Disconnect Gateway connection | Yes (BR-031) |
| `POST` | `/api/v1/bots/{id}/reconnect` | Restart Gateway connection | Yes (BR-031) |
| `PUT` | `/api/v1/bots/{id}/project` | Link bot to Project (enforces 1:1 binding) | Yes (BR-031) |
| `PUT` | `/api/v1/projects/{id}/bot` | Link Project to Bot (enforces 1:1 binding) | Yes |

---

## 5. Security & Threat Model

- **Token Confidentiality:** Plaintext tokens are wiped from memory immediately after encryption. Responses return only `token_configured: bool` and `token_last4: string`.
- **Key Derivation:** Master key is derived using HKDF-SHA256 from `AI_CHAN_SECRET_ENCRYPTION_KEY` (or `SECRET_KEY`).
- **No Log Leaks:** Exception handlers explicitly sanitize error summaries and never print tokens even under debug level.
- **Routing Protection:** Every prompt payload sent to `/api/v1/prompt` includes `bot_config_id`. The backend checks the exact `project_id` in `discord_bot_configs`. Cross-project leakage is architecturally impossible.

---

## 6. Verification & Automated Test Suite

- **Unit & Integration Suite (`tests/test_multi_discord_bot_management.py`):**
  - `test_01_create_bot_success_and_token_protection`: PASSED
  - `test_02_create_bot_duplicate_alias_rejected`: PASSED
  - `test_03_update_bot_preserves_token_when_empty`: PASSED
  - `test_04_one_to_one_project_binding_invariant`: PASSED
  - `test_05_test_connection_mock_and_error`: PASSED
  - `test_06_message_routing_to_linked_project`: PASSED
  - `test_07_unlinked_bot_message_fails_safely_no_default_fallback`: PASSED
  - `test_08_runtime_isolation_and_lifecycle`: PASSED
  - `test_09_idempotent_legacy_env_import`: PASSED
- **Backend Full Regression:** 237 passed, 0 failed.
- **Frontend Full Regression:** 46 passed, 0 failed; TypeScript check `npx tsc --noEmit`: 0 errors.

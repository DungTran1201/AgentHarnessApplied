# Project Canvas Node Catalog Upgrade: Bots, Skills & Tools Integration

## 1. Executive Summary
This feature upgrades the AI-Chan Project Canvas Node Catalog and Graph Pipeline to dynamically expose authorized **Bots**, **Skills**, and **Tools** (from Tool Registry) to the project graph, while strictly enforcing graph connection constraints and execution semantics:
- **Model to Bot**: At most one Bot per Model (`0..1`). A second Bot connection attempt is rejected with the exact message: `"This model can be connected to only one bot. Remove the existing bot connection before selecting another."` (never silently replacing).
- **Model to Skills**: Multiple distinct Skills per Model (`0..N`). Duplicate edges to the same Skill are rejected.
- **Model to Tools (1:N)**: One Model can connect to **0..N Tools**. Each Tool Node instance belongs to at most one Model Node. Duplicate tool types connected to the same Model are strictly rejected.
- **Reverse Connections**: Connections from Bot/Skill/Tool to Model (`Bot -> Model`, `Skill -> Model`, `Tool -> Model`) are strictly rejected.
- **Resource Authorization**:
  - Bots require verified Discord linkage (fails closed with `DISCORD_NOT_LINKED` / 403).
  - Skills require valid ownership/guest status and `status == 'VALID'`.
  - Tools require existence in Tool Registry, `status == 'AVAILABLE'`, and active enablement in `project_tool_bindings`.
- **Runtime Resolution & Tool Calling**:
  - At project chat invocation, the project runtime deterministically resolves the connected Model's active Tools (`Model -> Tool`).
  - Active tool schemas are bound to the Model runtime.
  - The model selects zero, one, or multiple tools on demand. The system **never** executes all tools automatically on every message.
  - Invocations route through `ToolExecutorService` with policy gate checks, arguments validation, timeout limits, and audit logging into `tool_executions`.

---

## 2. Information Architecture & UI Design
- **Node Catalog Structure**:
  - `Input`: Standard Web Input node.
  - `Model`: LLM selector node with connected tools badge counter.
  - `Output`: Streaming output node.
  - `Prompts`: Saved system prompt templates.
  - `Bots`: Shows active Discord bot instance with status badge, trigger mode, and link to `/bot/discord`.
  - `Skills`: Shows available verified skills (`VALID`) with version badges, descriptions, and link to `/skills`.
  - `Tools` *(New Group 7)*: Collapsible accordion group fetching real tools from backend `GET /api/v1/tools?limit=100`. Supports unified catalog search, category filtering (`tool`), status badges (`AVAILABLE`, `DISABLED`), risk levels, and draggable/clickable instantiation onto the canvas.
- **Visual Design**: Dark minimalist aesthetics adhering to Linear/Vercel Geist tokens. Emerald accents for active items, subtle slate borders, and distinct color-coded graph badges (Indigo for Bot, Rose for Skills, Sky Blue `#0ea5e9` for Tools).

---

## 3. Graph Model & Topology
- **Node Types**:
  - `web_input`: Source node for user input.
  - `system_prompt`: Optional system instruction node.
  - `model`: Central inference coordinator.
  - `output`: Terminal output node.
  - `bot`: Terminal bot binding node (`bot_in` handle).
  - `skill`: Terminal skill binding node (`skill_in` handle).
  - `tool`: Terminal tool binding node (`tool_in` handle, data config holds `tool_id`, `is_enabled`, `custom_timeout_seconds`).
- **Edge Types**:
  - `data_flow`: `web_input` -> `model` and `model` -> `output`.
  - `system_instruction`: `system_prompt` -> `model`.
  - `bot_binding`: `model` -> `bot` (stroke: `#6366f1`, dashed).
  - `skill_binding`: `model` -> `skill` (stroke: `#f43f5e`, dashed).
  - `model_tool`: `model` -> `tool` (stroke: `#0ea5e9`, dashed, handle `out` -> `tool_in`).

---

## 4. Verification & Testing
- **Frontend Unit Tests** (`ai-frontend/src/tests/projectCanvasCatalog.test.ts`):
  - 15 automated test cases verifying single-bot constraint, multi-skill support, 1:N Model-to-Tools connection, duplicate tool rejection, reverse connection rejection, single-model ownership for tool instances, and stable resource ID mapping.
- **Backend Integration Tests** (`ai-backend/tests/test_project_model_tools.py`):
  - 10 automated test cases covering real tool catalog fetching, saving/reloading 1 Model connected to 3 Tools, automatic `project_tool_bindings` synchronization upon graph save/deletion, duplicate tool rejection (422), reverse tool-to-model edge rejection (422), project chat tool invocation (Calculator executes on math prompt and logs audit record), general conversation safety (zero tool executions on general greetings), disabled tool handling (422 `TOOL_DISABLED`), and 100% backward compatibility for graphs without tools.

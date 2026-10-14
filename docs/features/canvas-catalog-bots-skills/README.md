# Project Canvas Node Catalog Upgrade: Bots & Skills Integration

## 1. Executive Summary
This feature upgrades the AI-Chan Project Canvas Node Catalog and Graph Pipeline to dynamically expose authorized **Bots** and **Skills** to the project graph, while strictly enforcing graph connection constraints and execution semantics:
- **Model to Bot**: At most one Bot per Model (`0..1`). A second Bot connection attempt is rejected with the exact message: `"This model can be connected to only one bot. Remove the existing bot connection before selecting another."` (never silently replacing).
- **Model to Skills**: Multiple distinct Skills per Model (`0..N`). Duplicate edges to the same Skill are rejected.
- **Reverse Connections**: Connections from Bot/Skill to Model (`Bot -> Model`, `Skill -> Model`) are rejected.
- **Resource Authorization**:
  - Bots require verified Discord linkage (fails closed with `DISCORD_NOT_LINKED` / 403).
  - Skills require valid ownership/guest status and `status == 'VALID'`.
- **Runtime Resolution**: At chat execution time, the project runtime deterministically resolves the connected Bot instance and active Skills, injects skill rules and guidelines into prompt context, and emits resolved resource metadata in the SSE `start` event.

---

## 2. Information Architecture & UI Design
- **Node Catalog Structure**:
  - `Input`: Standard Web Input node.
  - `Model`: LLM selector node.
  - `Output`: Streaming output node.
  - `Prompts`: Saved system prompt templates.
  - `Bots` *(New)*: Shows active Discord bot instance with status badge, trigger mode, and link to `/bot/discord`.
  - `Skills` *(New)*: Shows available verified skills (`VALID`) with version badges, descriptions, and link to `/skills`.
- **Visual Design**: Dark minimalist aesthetics adhering to Linear/Vercel Geist tokens. Emerald accents for active items, subtle slate borders, and distinct color-coded graph badges (Indigo for Bot, Rose for Skills).

---

## 3. Graph Model & Topology
- **Node Types**:
  - `web_input`: Source node for user input.
  - `system_prompt`: Optional system instruction node.
  - `model`: Central inference coordinator.
  - `output`: Terminal output node.
  - `bot`: Terminal bot binding node (`bot_in` handle).
  - `skill`: Terminal skill binding node (`skill_in` handle).
- **Edge Types**:
  - `data_flow`: `web_input` -> `model` and `model` -> `output`.
  - `system_instruction`: `system_prompt` -> `model`.
  - `bot_binding`: `model` -> `bot` (stroke: `#6366f1`, dashed).
  - `skill_binding`: `model` -> `skill` (stroke: `#f43f5e`, dashed).

---

## 4. Verification & Testing
- **Frontend Unit Tests** (`ai-frontend/src/tests/projectCanvasCatalog.test.ts`):
  - 10 automated test cases verifying single-bot constraint, multi-skill support, duplicate edge rejection, reverse connection rejection, and stable resource ID mapping.
- **Backend Integration Tests** (`ai-backend/tests/test_project_bot_skill_graph.py`):
  - 9 automated test cases covering `/available` endpoint access control, valid graph saving, multiple bot rejection (422), duplicate skill edge rejection (422), reverse connection rejection (422), unlinked user guard (422), and chat execution resolution (SSE start event with resolved bot & skill metadata).

# API Contracts: Canvas Catalog Bots and Skills Integration

## 1. GET /api/v1/bot/discord/available
Retrieves authorized Discord bot instances available to the authenticated user for canvas integration.

- **Security**: Requires JWT access token or cookie. Enforces verified Discord account linking (`BR-031`).
- **Response 200 OK**:
  ```json
  [
    {
      "id": "b6a71e22-...",
      "name": "AI-Chan Community Bot",
      "platform": "discord",
      "is_enabled": true,
      "guild_id": "112233445566778899",
      "guild_name": "AI-Chan HQ",
      "trigger_mode": "MENTION",
      "status": "ACTIVE"
    }
  ]
  ```
- **Response 403 Forbidden**:
  ```json
  {
    "detail": "DISCORD_NOT_LINKED"
  }
  ```

---

## 2. PUT /api/v1/projects/{project_id}/graph
Validates and persists the project graph structure with bot and skill nodes.

- **Request Payload**:
  ```json
  {
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "nodes": [
      {
        "id": "in_1",
        "type": "web_input",
        "position": { "x": 100, "y": 200 },
        "data": { "label": "Web Input", "config": { "max_words": 500 } }
      },
      {
        "id": "m_1",
        "type": "model",
        "position": { "x": 400, "y": 200 },
        "data": { "label": "Gemini 3.8 Flash", "config": { "model_id": "gemini-3.8-flash" } }
      },
      {
        "id": "bot_1",
        "type": "bot",
        "position": { "x": 400, "y": 350 },
        "data": {
          "label": "AI-Chan Bot",
          "config": {
            "bot_id": "b6a71e22-...",
            "name": "AI-Chan Bot",
            "platform": "discord"
          }
        }
      },
      {
        "id": "skill_1",
        "type": "skill",
        "position": { "x": 200, "y": 350 },
        "data": {
          "label": "Web Search",
          "config": {
            "skill_id": "skl_123456789abc",
            "name": "Web Search",
            "version": "1.0.0"
          }
        }
      },
      {
        "id": "out_1",
        "type": "output",
        "position": { "x": 700, "y": 200 },
        "data": { "label": "Output", "config": { "streaming": true } }
      }
    ],
    "edges": [
      { "id": "e1", "source": "in_1", "target": "m_1", "type": "data_flow" },
      { "id": "e2", "source": "m_1", "target": "out_1", "type": "data_flow" },
      { "id": "e3", "source": "m_1", "target": "bot_1", "type": "bot_binding" },
      { "id": "e4", "source": "m_1", "target": "skill_1", "type": "skill_binding" }
    ]
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "project_id": "proj_123...",
    "is_valid": true,
    "message": "Đã lưu cấu trúc đồ thị thành công",
    "target_model_id": "gemini-3.8-flash",
    "max_words_limit": 500
  }
  ```
- **Response 422 Unprocessable Entity**:
  ```json
  {
    "detail": {
      "error_code": "INVALID_GRAPH_STRUCTURE",
      "message": "Cấu trúc đồ thị chưa hợp lệ",
      "errors": [
        "This model can be connected to only one bot. Remove the existing bot connection before selecting another."
      ]
    }
  }
  ```

---

## 3. POST /api/v1/projects/{project_id}/chat (SSE Stream)
Executes a chat session against an active project, streaming model tokens and emitting resolved metadata.

- **First Event (`event: start`) Payload**:
  ```json
  {
    "project_id": "proj_123...",
    "model": "gemini-3.8-flash",
    "conversation_id": "conv_456...",
    "bot": {
      "id": "b6a71e22-...",
      "name": "AI-Chan Bot",
      "platform": "discord",
      "is_enabled": true,
      "trigger_mode": "MENTION"
    },
    "skills": [
      {
        "id": "skl_123456789abc",
        "name": "Web Search",
        "status": "VALID"
      }
    ]
  }
  ```

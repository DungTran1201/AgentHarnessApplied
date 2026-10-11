# 08. ĐẶC TẢ HỢP ĐỒNG GIAO TIẾP API (API CONTRACT SPECIFICATIONS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-API-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Tổng Quan Các Điểm Cuối Tương Tác (API Inventory)

Phân hệ tích hợp sử dụng 4 API chính kết nối giữa Frontend Editor, Backend Engine và CSDL SQLite:

| Phương Thức | Đường Dẫn (Endpoint) | Trạng Thái Hợp Đồng | Trách Nhiệm Trong Phân Hệ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/system-prompts` | **EXISTING (Đã có)** | Nạp danh sách System Prompt để hiển thị động trên Node Catalog. |
| `GET` | `/api/v1/models` | **EXISTING (Đã có)** | Nạp danh sách mô hình LLM để hiển thị trên nhóm Model trong Catalog. |
| `PUT` | `/api/v1/projects/{id}/graph` | **PROPOSED UPGRADE** | Lưu cấu trúc đồ thị Canvas (bao gồm System Prompt Node) và thẩm định tính hợp lệ. |
| `POST` | `/api/v1/projects/{id}/chat` | **PROPOSED UPGRADE** | Thực thi chat SSE, phân giải nội dung prompt từ DB và truyền vào LLM Provider. |

---

## 2. Chi Tiết Hợp Đồng API Cần Nâng Cấp

### 2.1. API Lưu Cấu Trúc Đồ Thị Project (`PUT /api/v1/projects/{id}/graph`)

- **Phương thức & Đường dẫn:** `PUT /api/v1/projects/{id}/graph`
- **Mục đích:** Lưu trữ snapshot đồ thị các node, cạnh nối và vị trí viewport, đồng thời thẩm định tính hợp lệ nghiệp vụ.
- **Xác thực:** Bearer Token JWT hoặc nhận diện `guest_user`.
- **Headers:** `Content-Type: application/json`.

#### Request Body Schema:
```json
{
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  },
  "nodes": [
    {
      "id": "node_input_1",
      "type": "web_input",
      "position": { "x": 80, "y": 180 },
      "data": {
        "label": "Web Input",
        "config": { "max_words": 500 }
      }
    },
    {
      "id": "node_sp_1",
      "type": "system_prompt",
      "position": { "x": 420, "y": 340 },
      "data": {
        "label": "Chuyên Gia Python",
        "config": {
          "prompt_id": "sp_seed_python_expert",
          "prompt_name": "Chuyên Gia Python & Kiến Trúc Phần Mềm"
        }
      }
    },
    {
      "id": "node_model_1",
      "type": "model",
      "position": { "x": 420, "y": 180 },
      "data": {
        "label": "Model LLM",
        "config": {
          "model_id": "gemini-3.8-flash",
          "temperature": 0.7,
          "max_tokens": 2048
        }
      }
    },
    {
      "id": "node_output_1",
      "type": "output",
      "position": { "x": 760, "y": 180 },
      "data": {
        "label": "Web Output",
        "config": { "streaming": true }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_in_model",
      "source": "node_input_1",
      "target": "node_model_1",
      "sourceHandle": "data_out",
      "targetHandle": "data_in"
    },
    {
      "id": "edge_sp_model",
      "source": "node_sp_1",
      "target": "node_model_1",
      "sourceHandle": "instruction_out",
      "targetHandle": "instruction_in"
    },
    {
      "id": "edge_model_out",
      "source": "node_model_1",
      "target": "node_output_1",
      "sourceHandle": "response_out",
      "targetHandle": "response_in"
    }
  ]
}
```

#### Response Thành Công: `HTTP 200 OK`
```json
{
  "id": "proj_a1b2c3d4e5f6",
  "is_valid": true,
  "node_count": 4,
  "target_model_id": "gemini-3.8-flash",
  "max_words_limit": 500,
  "message": "Đã lưu cấu trúc đồ thị Project thành công.",
  "validation_details": {
    "has_system_prompt": true,
    "prompt_id": "sp_seed_python_expert",
    "prompt_name": "Chuyên Gia Python & Kiến Trúc Phần Mềm",
    "validation_errors": []
  }
}
```

#### Response Thất Bại:
- `HTTP 400 Bad Request` (Graph sai quy tắc kết nối):
  ```json
  {
    "detail": {
      "error_code": "INVALID_GRAPH_TOPOLOGY",
      "message": "Đồ thị không hợp lệ.",
      "errors": [
        "Phát hiện cạnh nối sai ngữ nghĩa từ System Prompt sang Output Node.",
        "Model Node chỉ được phép liên kết tối đa 1 System Prompt."
      ]
    }
  }
  ```
- `HTTP 422 Unprocessable Content` (Tham chiếu Prompt không tồn tại hoặc mất quyền):
  ```json
  {
    "detail": {
      "error_code": "PROMPT_REFERENCE_INVALID",
      "message": "System Prompt 'sp_invalid_id' không tồn tại trong thư viện của bạn."
    }
  }
  ```

---

### 2.2. API Thực Thi Chat Project (`POST /api/v1/projects/{id}/chat`)

- **Phương thức & Đường dẫn:** `POST /api/v1/projects/{id}/chat`
- **Mục đích:** Gửi tin nhắn câu hỏi vào Project đang `ACTIVE` và nhận phản hồi dòng chảy SSE có áp dụng System Prompt liên kết.
- **Xác thực:** Bearer Token JWT hoặc `guest_user`.
- **Headers:** `Content-Type: application/json`, `Accept: text/event-stream`.

#### Request Body Schema:
```json
{
  "message": "Hãy viết hàm Python tối ưu hóa thuật toán tính số Fibonacci.",
  "conversation_id": "conv_9a8b7c6d5e4f"
}
```

#### Cơ Chế Xử Lý Phía Server (Backend Processing Semantics):
1. Đọc đồ thị project từ CSDL.
2. Kiểm tra nếu có cạnh `source: node_sp` -> `target: node_model`:
   - Trích xuất `prompt_id` từ `node_sp.data.config.prompt_id`.
   - Thực thi câu lệnh SQL: `SELECT content FROM system_prompts WHERE id = ? AND user_id = ?`.
   - Nếu không tìm thấy -> Ngắt request và trả lỗi `422 PROMPT_UNAVAILABLE`.
   - Nếu tìm thấy -> Gán `system_instruction = prompt_content`.
3. Nếu không có cạnh `system_prompt` -> Gán `system_instruction = DEFAULT_AI_CHAN_INSTRUCTION`.
4. Gọi LangGraph / LangChain stream với:
   - `messages = [SystemMessage(content=system_instruction), ...history, HumanMessage(content=message)]`.

#### Luồng Phản Hồi SSE Thành Công: `HTTP 200 OK (text/event-stream)`
```http
event: start
data: {"project_id": "proj_a1b2c3d4", "model": "gemini-3.8-flash", "conversation_id": "conv_9a8b7c6d5e4f", "has_system_prompt": true}

event: chunk
data: {"token": "Dưới ", "content": "Dưới ", "status": "streaming"}

event: chunk
data: {"token": "đây ", "content": "đây ", "status": "streaming"}

event: chunk
data: {"token": "là ", "content": "là ", "status": "streaming"}

event: done
data: {"status": "done", "finish_reason": "stop", "message_id": "msg_f1e2d3c4", "model": "gemini-3.8-flash", "tokens_prompt": 12, "conversation_id": "conv_9a8b7c6d5e4f"}
```

#### Response Thất Bại Trước Khi Stream:
- `HTTP 409 Conflict` (Project chưa được kích hoạt):
  ```json
  {
    "detail": {
      "error_code": "PROJECT_NOT_ACTIVE",
      "message": "Project hiện đang ở trạng thái 'STOP'. Vui lòng kích hoạt project trước khi chat."
    }
  }
  ```
- `HTTP 422 Unprocessable Content` (Prompt tham chiếu đã bị xóa khỏi thư viện):
  ```json
  {
    "detail": {
      "error_code": "PROMPT_UNAVAILABLE",
      "message": "System Prompt liên kết trong Project đã bị xóa hoặc không còn khả dụng. Vui lòng mở Project Editor để chọn lại prompt."
    }
  }
  ```
- `HTTP 400 Bad Request` (Vượt giới hạn số từ):
  ```json
  {
    "detail": {
      "error_code": "WORD_LIMIT_EXCEEDED",
      "message": "Nội dung câu hỏi có 620 từ, vượt quá giới hạn tối đa 500 từ của Project này.",
      "actual_words": 620,
      "max_words_limit": 500
    }
  }
  ```

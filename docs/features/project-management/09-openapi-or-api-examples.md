# 09. MẪU DỮ LIỆU GIAO TIẾP VÀ VÍ DỤ TẢI TRỌNG API (API SCHEMAS & PAYLOAD EXAMPLES)
## Nhánh Tính Năng: Quản Lý Project (Project Management MVP)
### Hệ Thống: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-PRJ-09` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Lead Developer)` |
| **Vai Trò Phụ Trách** | Solution Architect & API Designer |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

> [!IMPORTANT]
> **Tuyên Bố Hợp Đồng Đề Xuất (PROPOSED CONTRACT NOTICE)**:
> Toàn bộ các ví dụ JSON Request, Response và Error Payload dưới đây là tài liệu đặc tả kỹ thuật đề xuất. Đội ngũ phát triển Frontend và Backend sẽ dựa vào tài liệu này để triển khai mã nguồn và thiết lập Mock Server / Contract Test.

---

## 1. Mẫu Chuẩn Định Dạng Lỗi Hệ Thống (Standard Error Payload Schema)

Mọi phản hồi lỗi từ các API Project đều tuân theo cấu trúc lỗi chuẩn hóa (Standard Error Response Format):

```json
{
  "error_code": "STRING_ERROR_IDENTIFIER",
  "message": "Thông báo lỗi bằng ngôn ngữ tự nhiên dành cho người dùng",
  "details": {
    "field": "Tên trường gặp lỗi nếu có",
    "reason": "Lý do kỹ thuật chi tiết"
  },
  "timestamp": "2026-10-11T15:45:00.123Z"
}
```

---

## 2. Chi Tiết Tải Trọng Các Endpoint (Endpoint Payload Examples)

### 2.1. `POST /api/v1/projects` - Tạo Project Mới

#### Request:
```http
POST /api/v1/projects HTTP/1.1
Host: localhost:8000
Content-Type: application/json
# Authorization: Bearer <tùy chọn nếu đã đăng nhập>

{
  "name": "Trợ Lý Nghiên Cứu Tài Liệu",
  "description": "Project hỗ trợ tóm tắt báo cáo khoa học và tài liệu kỹ thuật chuyên sâu"
}
```

#### Phản hồi thành công (201 Created):
```json
{
  "id": "proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "user_id": "usr_12345678-abcd-ef01-2345-6789abcdef01",
  "name": "Trợ Lý Nghiên Cứu Tài Liệu",
  "description": "Project hỗ trợ tóm tắt báo cáo khoa học và tài liệu kỹ thuật chuyên sâu",
  "status": "STOP",
  "is_valid": false,
  "node_count": 0,
  "created_at": "2026-10-11T15:45:00Z",
  "updated_at": "2026-10-11T15:45:00Z"
}
```

#### Phản hồi lỗi tên rỗng (422 Unprocessable Entity):
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": {
    "field": "name",
    "reason": "Tên project không được để trống hoặc chỉ chứa khoảng trắng"
  },
  "timestamp": "2026-10-11T15:45:01Z"
}
```

---

### 2.2. `GET /api/v1/projects` - Lấy Danh Sách Project Của Người Dùng

#### Request:
```http
GET /api/v1/projects?limit=10&offset=0 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Phản hồi thành công (200 OK):
```json
{
  "items": [
    {
      "id": "proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "name": "Trợ Lý Nghiên Cứu Tài Liệu",
      "description": "Project hỗ trợ tóm tắt báo cáo khoa học",
      "status": "ACTIVE",
      "is_valid": true,
      "target_model_id": "gemini-3.8-flash",
      "target_model_name": "Google Gemini 3.8 Flash",
      "max_words_limit": 1000,
      "node_count": 3,
      "updated_at": "2026-10-11T15:40:00Z"
    },
    {
      "id": "proj_11223344-5566-7788-99aa-bbccddeeff00",
      "name": "Bot Hỗ Trợ Code Python",
      "description": "Sinh mã nguồn tối ưu",
      "status": "STOP",
      "is_valid": true,
      "target_model_id": "gpt-4o-mini",
      "target_model_name": "OpenAI GPT-4o Mini",
      "max_words_limit": 500,
      "node_count": 3,
      "updated_at": "2026-10-11T14:20:00Z"
    }
  ],
  "total": 2,
  "active_quota": {
    "active_count": 1,
    "max_limit": 3,
    "remaining_slots": 2
  }
}
```

---

### 2.3. `PUT /api/v1/projects/{id}/graph` - Lưu Cấu Trúc Graph

#### Request:
```http
PUT /api/v1/projects/proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210/graph HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "viewport": { "x": 100.0, "y": 50.0, "zoom": 1.0 },
  "nodes": [
    {
      "id": "input_1",
      "type": "web_input",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "Web Input",
        "config": { "max_words": 500 }
      }
    },
    {
      "id": "model_1",
      "type": "model",
      "position": { "x": 450, "y": 150 },
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
      "id": "output_1",
      "type": "output",
      "position": { "x": 800, "y": 150 },
      "data": {
        "label": "Web Output",
        "config": { "streaming": true }
      }
    }
  ],
  "edges": [
    {
      "id": "e_in_model",
      "source": "input_1",
      "target": "model_1",
      "sourceHandle": "output_handle",
      "targetHandle": "input_handle"
    },
    {
      "id": "e_model_out",
      "source": "model_1",
      "target": "output_1",
      "sourceHandle": "output_handle",
      "targetHandle": "input_handle"
    }
  ]
}
```

#### Phản hồi thành công (200 OK):
```json
{
  "project_id": "proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "is_valid": true,
  "validation_details": {
    "node_count": 3,
    "edge_count": 2,
    "selected_model": "gemini-3.8-flash",
    "model_status": "ACTIVE",
    "has_api_key": true
  },
  "updated_at": "2026-10-11T15:46:00Z",
  "message": "Đã lưu cấu trúc graph thành công"
}
```

#### Phản hồi lỗi cấu trúc graph không hợp lệ (422 Unprocessable Entity):
```json
{
  "error_code": "INVALID_GRAPH_TOPOLOGY",
  "message": "Cấu trúc đồ thị không hợp lệ",
  "details": {
    "errors": [
      "Thiếu kết nối từ Model Node sang Output Node (cạnh thứ hai bị thiếu)",
      "Tham số max_words = 5000 vượt quá ngưỡng tối đa cho phép là 4000 từ"
    ]
  },
  "timestamp": "2026-10-11T15:46:05Z"
}
```

---

### 2.4. `POST /api/v1/projects/{id}/activate` - Kích Hoạt Project

#### Request:
```http
POST /api/v1/projects/proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210/activate HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Phản hồi thành công (200 OK):
```json
{
  "id": "proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "status": "ACTIVE",
  "active_quota": {
    "active_count": 3,
    "max_limit": 3,
    "remaining_slots": 0
  },
  "message": "Project đã được kích hoạt thành công"
}
```

#### Phản hồi lỗi vượt quá hạn ngạch (409 Conflict):
```json
{
  "error_code": "QUOTA_EXCEEDED",
  "message": "Không thể kích hoạt project: Bạn đã đạt giới hạn tối đa 3 project hoạt động đồng thời",
  "details": {
    "current_active": 3,
    "max_limit": 3,
    "suggested_action": "Vui lòng tạm dừng hoặc vô hiệu hóa một project khác trước khi kích hoạt project này"
  },
  "timestamp": "2026-10-11T15:46:30Z"
}
```

---

### 2.5. `POST /api/v1/projects/{id}/chat` - Thực Thi Chat Qua SSE Stream

#### Request:
```http
POST /api/v1/projects/proj_9f8e7d6c-5b4a-3210-fedc-ba9876543210/chat HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/event-stream
Content-Type: application/json

{
  "message": "Hãy phân tích ưu nhược điểm của kiến trúc Event-Driven Architecture",
  "conversation_id": "conv_aabb1122-3344-5566-7788-9900aabbccdd"
}
```

#### Phản hồi dòng chảy thành công (200 OK - `text/event-stream`):
```text
event: start
data: {"project_id": "proj_9f8e7d6c", "model": "gemini-3.8-flash", "conversation_id": "conv_aabb1122"}

event: message
data: {"content": "Chào bạn! Dưới đây là phân tích chi tiết về **Kiến trúc Hướng Sự Kiện (Event-Driven Architecture - EDA)**:\n\n"}

event: message
data: {"content": "### 1. Ưu Điểm Chính:\n- **Khả năng phân rã lỏng lẻo (Loose Coupling)**: Các dịch vụ không phụ thuộc trực tiếp vào nhau.\n- **Khả năng mở rộng cao (Scalability)**: Xử lý bất đồng bộ mượt mà.\n\n"}

event: message
data: {"content": "### 2. Nhược Điểm Cần Lưu Ý:\n- **Độ phức tạp gỡ lỗi (Debugging Complexity)**: Khó theo dõi luồng dữ liệu phân tán.\n- **Tính nhất quán cuối cùng (Eventual Consistency)**: Dữ liệu cần thời gian để đồng bộ hoàn toàn.\n"}

event: done
data: {"finish_reason": "stop", "prompt_words": 12, "completion_tokens": 154}
```

#### Phản hồi lỗi vượt quá số từ quy định (400 Bad Request):
```json
{
  "error_code": "WORD_LIMIT_EXCEEDED",
  "message": "Nội dung câu hỏi vượt quá giới hạn từ cho phép của Project",
  "details": {
    "actual_words": 650,
    "max_words_allowed": 500,
    "excess_words": 150
  },
  "timestamp": "2026-10-11T15:47:00Z"
}
```

#### Phản hồi lỗi Project đang bị dừng (409 Conflict):
```json
{
  "error_code": "PROJECT_NOT_ACTIVE",
  "message": "Không thể gửi tin nhắn vì Project này hiện đang tạm dừng (STOP) hoặc đã bị vô hiệu hóa (DEACTIVE)",
  "details": {
    "current_status": "STOP"
  },
  "timestamp": "2026-10-11T15:47:15Z"
}
```

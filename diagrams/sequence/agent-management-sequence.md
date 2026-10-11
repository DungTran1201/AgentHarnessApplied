# Sơ Đồ Tuần Tự: Quản Lý & Kích Hoạt Mô Hình Agent Đa Nhà Cung Cấp (Agent Model Management Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-005` |
| **Mã Kịch Bản** | `SEQ-005` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md) |
| **Mục Đích** | Biểu diễn luồng tương tác thực tế giữa Người dùng, Next.js Client, FastAPI Backend, Agent Model Manager, LangChain Adapter và các nhà cung cấp AI khi kiểm tra ping, kích hoạt mô hình (không xóa cứng) và thiết lập mô hình mặc định |

---

## 1. SEQ-005: Quy Trình Kiểm Tra Kết Nối, Kích Hoạt & Cấu Hình Mặc Định Model

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User / Admin
    participant UI as Next.js Client
    participant Router as Model Router (/api/v1/models)
    participant Mgr as AgentModelManager
    participant Env as EnvKeyLoader (.env)
    participant Adapter as LangChain Adapter
    participant Cloud as External AI Provider (Google/Anthropic/OpenAI)
    participant DB as SQLite / PostgreSQL

    Note over User, Cloud: GIAI ĐOẠN 1: KIỂM TRA KẾT NỐI (PING & HEALTH CHECK)
    User->>UI: Bấm "Kiểm tra kết nối" trên thẻ mô hình
    UI->>Router: POST /api/v1/models/{id}/test
    Router->>Mgr: test_model_connection(model_id)
    Mgr->>Env: get_config() kiểm tra khóa API
    alt Khóa API bị thiếu hoặc rỗng trong .env
        Env-->>Mgr: Key không tồn tại
        Mgr-->>Router: Lỗi: Thiếu khóa API nhà cung cấp
        Router-->>UI: HTTP 400 Bad Request ("Chưa cấu hình API Key trong file .env")
        UI->>User: Hiển thị cảnh báo màu vàng
    else Khóa API hợp lệ
        Mgr->>Adapter: Khởi tạo ChatModel (timeout=10s, max_tokens=5)
        Mgr->>Cloud: Gửi prompt test "ping"
        Cloud-->>Mgr: Phản hồi 200 OK + Output token
        Mgr->>Mgr: Đo thời gian Round-Trip Latency (ms)
        Mgr->>DB: UPDATE models SET latency_ms = :latency, last_checked_at = CURRENT_TIMESTAMP
        Mgr-->>Router: Kết quả kiểm tra (healthy=True, latency_ms)
        Router-->>UI: HTTP 200 OK
        UI->>User: Cập nhật huy hiệu "Khả dụng" (Xanh lá) kèm số ms độ trễ
    end

    Note over User, Cloud: GIAI ĐOẠN 2: KÍCH HOẠT MÔ HÌNH (ACTIVATE MODEL - BR-012, BR-014)
    User->>UI: Gạt công tắc "Kích hoạt" (Activate)
    UI->>Router: PATCH /api/v1/models/{id}/activate
    Router->>Mgr: activate_model(model_id)
    Mgr->>Env: Kiểm tra khóa API bắt buộc (BR-014)
    Mgr->>DB: UPDATE models SET status = 'ACTIVE' WHERE id = :id
    DB-->>Mgr: Cập nhật thành công
    Mgr-->>Router: Trả về thực thể AgentModel (status='ACTIVE')
    Router-->>UI: HTTP 200 OK
    UI->>UI: Đưa mô hình vào danh sách chọn lựa đàm thoại của phòng chat

    Note over User, Cloud: GIAI ĐOẠN 3: THIẾT LẬP MÔ HÌNH MẶC ĐỊNH (DEFAULT MODEL - BR-013)
    User->>UI: Bấm nút "Đặt làm mặc định"
    UI->>Router: PATCH /api/v1/models/default (payload: {model_id})
    Router->>Mgr: set_default_model(model_id)
    Mgr->>DB: Xác thực mô hình có status == 'ACTIVE' (BR-013)
    Mgr->>DB: UPDATE models SET is_default = (id == :model_id)
    DB-->>Mgr: Giao dịch cập nhật hoàn tất
    Mgr-->>Router: Phản hồi thành công
    Router-->>UI: HTTP 200 OK
    UI->>User: Hiển thị nhãn huy hiệu "MẶC ĐỊNH" trên thẻ model
```

---

## 2. Ghi Chú Ràng Buộc Kỹ Thuật
1. **Chính Sách Bất Biến Không Xóa Cứng (`BR-012`)**: Không tồn tại thao tác `DELETE /api/v1/models/{id}`. Toàn bộ chu trình loại bỏ khỏi giao diện được thực thi qua `PATCH /api/v1/models/{id}/deactivate` (Soft State Toggle).
2. **Bảo Vệ Mô Hình Mặc Định (`BR-013`)**: Nếu người dùng cố tình `deactivate` mô hình mang cờ `is_default = true`, hệ thống ném ngoại lệ `HTTP 400 Bad Request` yêu cầu chỉ định mô hình thay thế trước.

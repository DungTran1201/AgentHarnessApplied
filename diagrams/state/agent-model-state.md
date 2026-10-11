# Sơ Đồ Máy Trạng Thái: Vòng Đời Mô Hình Agent (Agent Model Lifecycle State Machine)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-STATE-004` |
| **Mã Trạng Thái** | `STATE-004` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/state-machines.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/09-behavior/state-machines.md), [docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md) |
| **Mục Đích** | Mô tả các trạng thái hữu hạn và các biến cố kích hoạt chuyển đổi trạng thái của thực thể AgentModel với quy tắc bất biến không xóa cứng (Soft State) |

---

## 1. STATE-004: Biểu Đồ Trạng Thái Mô Hình Agent

```mermaid
stateDiagram-v2
    [*] --> INACTIVE: Đăng ký cấu hình mô hình vào hệ thống

    INACTIVE --> TESTING: Người dùng nhấn "Kiểm tra kết nối" (POST /test)
    TESTING --> INACTIVE: Kiểm tra thất bại (Thiếu API Key hoặc lỗi mạng)
    TESTING --> ACTIVE: Kiểm tra thành công & Bấm Kích hoạt (BR-014)

    INACTIVE --> ACTIVE: PATCH /models/:id/activate (Khi có API Key hợp lệ trong .env)
    ACTIVE --> INACTIVE: PATCH /models/:id/deactivate (Chặn nếu là Default Model - BR-013)

    ACTIVE --> DEGRADED: Gặp lỗi 429 Quota Exceeded hoặc 5xx liên tiếp 3 lần (BR-015)
    DEGRADED --> ACTIVE: Health ping nền thành công trở lại
    DEGRADED --> INACTIVE: Quản trị viên chủ động tắt (Deactivate)

    note right of INACTIVE
        Không áp dụng thao tác xóa cứng (BR-012).
        Ẩn khỏi Dropdown chọn model khi chat.
        Giữ toàn vẹn lịch sử tin nhắn đã dùng model này.
    end note

    note right of ACTIVE
        Khả dụng trong phòng chat.
        Tham gia chuỗi điều phối LangGraph (ADR-005).
        Bắt buộc có ít nhất 1 model là is_default = true (BR-013).
    end note

    note right of DEGRADED
        Tạm thời bỏ qua khi định tuyến chính.
        Dự phòng thứ cấp trong chuỗi Failover.
    end note
```

---

## 2. Bảng Thuyết Minh Chuyển Đổi Trạng Thái

| Trạng Thái Nguồn | Biến Cố Kích Hoạt | Trạng Thái Đích | Điều Kiện Nghiệp Vụ / Hành Động Kèm Theo |
| :--- | :--- | :--- | :--- |
| `[*]` | Hệ thống khởi tạo | `INACTIVE` | Nạp metadata từ cấu hình danh mục; trạng thái ban đầu chưa kích hoạt nếu chưa cấu hình key. |
| `INACTIVE` | `POST /test` | `TESTING` | Gửi prompt test tối giản ("ping") tới nhà cung cấp và bấm giờ. |
| `TESTING` | Ping thất bại | `INACTIVE` | Cập nhật lỗi vào log; hiển thị cảnh báo cho người dùng. |
| `TESTING` | Ping thành công | `ACTIVE` | Cập nhật `latency_ms`, `last_checked_at` và kích hoạt model nếu người dùng xác nhận. |
| `INACTIVE` | `PATCH /activate` | `ACTIVE` | Bắt buộc kiểm tra API Key của nhà cung cấp đã có trong `.env` (`BR-014`). |
| `ACTIVE` | `PATCH /deactivate`| `INACTIVE` | Bắt buộc kiểm tra model không phải là mô hình mặc định (`is_default == false`) (`BR-013`). Tuyệt đối không xóa cứng (`BR-012`). |
| `ACTIVE` | 3 lỗi liên tiếp (429/5xx) | `DEGRADED` | Circuit Breaker chuyển trạng thái tạm thời để tránh làm nghẽn luồng người dùng (`BR-015`). |
| `DEGRADED` | Health check thành công | `ACTIVE` | Tự động khôi phục độ ưu tiên định tuyến chính. |

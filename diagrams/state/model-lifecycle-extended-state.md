# Sơ Đồ Máy Trạng Thái: Vòng Đời Mô Hình Agent Mở Rộng (Agent Model Extended Lifecycle State Machine)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-STATE-006` |
| **Mã Trạng Thái** | `STATE-004` (Phiên Bản Mở Rộng - Extended) |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md), [docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-035` - `FR-039`), [docs/02-requirements/business-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/business-rules.md) (`BR-022`, `BR-023`, `BR-024`) |
| **Mục Đích** | Mô tả đầy đủ các trạng thái hữu hạn và các biến cố kích hoạt chuyển đổi trạng thái của thực thể AgentModel bao gồm đăng ký động, kích hoạt, kiểm tra kết nối, suy giảm hiệu năng và lưu trữ mềm an toàn với chốt chặn bảo vệ mô hình mặc định |

---

## 1. Biểu Đồ Trạng Thái Mô Hình Agent Mở Rộng (STATE-004 Extended)

```mermaid
stateDiagram-v2
    [*] --> INACTIVE: Đăng ký mô hình mới qua POST /models (OP-022, BR-022, BR-024)

    INACTIVE --> TESTING: Người dùng nhấn "Kiểm tra kết nối" (POST /test - OP-012)
    TESTING --> INACTIVE: Ping thất bại (Thiếu API Key hoặc lỗi mạng)
    TESTING --> ACTIVE: Kiểm tra thành công & Bấm Kích hoạt (BR-014)

    INACTIVE --> ACTIVE: PATCH /models/:id/activate (Khi có API Key trong .env - OP-013)
    ACTIVE --> INACTIVE: PATCH /models/:id/deactivate (Chặn nếu là Default Model - BR-013, OP-014)

    ACTIVE --> DEGRADED: Lỗi 429 Quota Exceeded hoặc 5xx liên tiếp 3 lần (BR-015)
    DEGRADED --> ACTIVE: Health ping nền thành công trở lại
    DEGRADED --> INACTIVE: Quản trị viên chủ động tạm tắt (Deactivate)

    INACTIVE --> ARCHIVED: DELETE /models/:id (Xóa mềm - FR-039, OP-025, Điều kiện: is_default != true)
    ACTIVE --> ARCHIVED: Chặn nếu is_default == true; Chỉ cho phép khi không phải mặc định (BR-023)
    DEGRADED --> ARCHIVED: Chuyển vào lưu trữ khi mô hình bị ngừng cung cấp

    ARCHIVED --> INACTIVE: Khôi phục mô hình từ kho lưu trữ (Restore Model)

    note right of ARCHIVED
        Xóa mềm an toàn (BR-012, FR-039).
        Ẩn hoàn toàn khỏi danh mục chọn đàm thoại của Agent.
        Bảo toàn toàn vẹn khóa ngoại với messages và api_metric_logs.
        Nghiêm cấm xóa/lưu trữ nếu đang là Default Model (BR-023).
    end note

    note right of ACTIVE
        Khả dụng trong phòng chat.
        Tham gia chuỗi điều phối LangGraph (ADR-005).
        Ít nhất 1 mô hình duy trì is_default = true (BR-013, BR-023).
    end note

    note right of DEGRADED
        Tạm thời bỏ qua khi định tuyến chính.
        Dự phòng thứ cấp trong chuỗi Failover.
    end note
```

---

## 2. Bảng Thuyết Minh Chuyển Đổi Trạng Thái Mở Rộng

| Trạng Thái Nguồn | Biến Cố Kích Hoạt | Trạng Thái Đích | Điều Kiện Nghiệp Vụ & Hành Động Thực Thi |
| :--- | :--- | :--- | :--- |
| `[*]` | `POST /models` (`OP-022`) | `INACTIVE` | Kiểm tra tính duy nhất của ID (`BR-022`), thẩm định `context >= 1000` & `max_tokens >= 256` (`BR-024`). Khởi tạo trạng thái ban đầu. |
| `INACTIVE` | `POST /models/:id/test` (`OP-012`) | `TESTING` | Gửi prompt test tối giản ("ping") tới nhà cung cấp và đo độ trễ `latency_ms` (`FR-023`). |
| `TESTING` | Ping thất bại | `INACTIVE` | Ghi log lỗi; hiển thị thông báo lỗi cấu hình key cho người dùng. |
| `TESTING` | Ping thành công | `ACTIVE` | Cập nhật `latency_ms`, `last_checked_at` và kích hoạt mô hình (`BR-014`). |
| `INACTIVE` | `PATCH /models/:id/activate` (`OP-013`) | `ACTIVE` | Bắt buộc kiểm tra API Key của nhà cung cấp đã cấu hình trong `.env` (`BR-014`). |
| `ACTIVE` | `PATCH /models/:id/deactivate` (`OP-014`) | `INACTIVE` | Chặn đứng nếu mô hình đang mang cờ `is_default = true` (`BR-013`). |
| `ACTIVE` | Lỗi liên tiếp 3 lần | `DEGRADED` | Circuit Breaker tự động chuyển trạng thái nhằm tránh nghẽn luồng chat chính (`BR-015`). |
| `DEGRADED` | Health ping nền thành công | `ACTIVE` | Tự động phục hồi trạng thái hoạt động bình thường. |
| `INACTIVE` / `DEGRADED` | `DELETE /models/:id` (`OP-025`) | `ARCHIVED` | Xóa mềm: Cập nhật `status = ARCHIVED`, loại khỏi danh mục đàm thoại của Agent (`FR-039`). |
| `ACTIVE` | `DELETE /models/:id` (`OP-025`) | `ARCHIVED` | **Kiểm tra chốt chặn `BR-023`**: Từ chối ngay nếu `is_default == true`. Chỉ cho phép khi không phải mặc định. |
| `ARCHIVED` | Khôi phục mô hình | `INACTIVE` | Đưa mô hình trở lại danh mục cấu hình, chờ kích hoạt lại. |

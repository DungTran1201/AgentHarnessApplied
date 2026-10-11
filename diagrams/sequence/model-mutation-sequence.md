# Sơ Đồ Trình Tự: Quản Trị Đột Biến, Tìm Kiếm & Lưu Trữ Mô Hình (Model Management Sequence)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-008` |
| **Kịch Bản Tương Tác** | `SEQ-008: Agent Model Management - Registration, Configuration Mutation, Dynamic Filtering and Archival Guard` |
| **Nguồn Sự Thật Thượng Nguồn** | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml), [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) (`OP-022` - `OP-025`), [docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md) |
| **Mục Đích** | Mô tả chi tiết trình tự tương tác giữa Người dùng, Next.js UI, FastAPI Controller, Integrity Guard, SQLite Database và Agent Router trong toàn bộ các thao tác thêm, sửa, tìm kiếm, lọc và xóa mềm mô hình |

---

## 1. Biểu Đồ Trình Tự SEQ-008: Vòng Đời Đột Biến, Tìm Kiếm & Bảo Vệ Mô Hình Mặc Định

```mermaid
sequenceDiagram
    autonumber
    actor User as Quản Trị Viên / Người Dùng
    participant UI as Model Management UI (Next.js / SCR-004)
    participant API as Model Controller (FastAPI)
    participant Guard as Integrity & Validator Guard (CTRL-009)
    participant DB as SQLite Database (agent_models)
    participant Router as Agent Orchestrator (LangGraph Engine)

    %% GIAI ĐOẠN 1: ĐĂNG KÝ MÔ HÌNH MỚI
    Note over User, Router: Giai đoạn 1: Đăng Ký Mô Hình Mới (POST /models - OP-022)
    User->>UI: Điền form thêm model (id, name, provider, context_window, max_tokens)
    UI->>API: POST /api/v1/models (Cookie JWT)
    API->>Guard: validate_create_model(payload)
    Guard->>DB: SELECT COUNT(*) FROM agent_models WHERE id = :id
    DB-->>Guard: Trả về số lượng bản ghi

    alt Mã ID đã tồn tại (Trùng lặp)
        Guard-->>API: Conflict Error (BR-022)
        API-->>UI: HTTP 409 Conflict {"detail": "Mã định danh mô hình đã tồn tại"}
        UI-->>User: Hiển thị viền đỏ và thông báo lỗi trùng lặp trên Modal
    else Mã ID hợp lệ & kiểm tra tham số biên (BR-024)
        Guard->>Guard: Kiểm tra context >= 1000 & max_tokens >= 256
        alt Vi phạm biên tham số
            Guard-->>API: Validation Error (BR-024)
            API-->>UI: HTTP 422 Unprocessable Entity {"detail": "Tham số ngoài biên an toàn"}
        else Tham số hợp lệ
            Guard-->>API: Validation Passed
            API->>DB: INSERT INTO agent_models (id, name, provider, status='INACTIVE', ...)
            DB-->>API: Bản ghi được tạo thành công
            API->>Router: register_model_adapter(model_id, provider)
            API-->>UI: HTTP 201 Created (Kèm thông tin mô hình mới)
            UI-->>User: Đóng Modal & render thẻ mô hình mới trên danh mục
        end
    end

    %% GIAI ĐOẠN 2: CHỈNH SỬA CẤU HÌNH BẤT BIẾN
    Note over User, Router: Giai đoạn 2: Chỉnh Sửa Cấu Hình Mô Hình (PUT /models/:id - OP-023)
    User->>UI: Mở Drawer, sửa tên hiển thị hoặc context_window, bấm Lưu
    UI->>API: PUT /api/v1/models/{id} (Cookie JWT)
    API->>Guard: validate_update_model(id, payload)
    
    alt Payload cố ý thay đổi ID hoặc Provider
        Guard-->>API: Immutability Violation (BR-022)
        API-->>UI: HTTP 400 Bad Request {"detail": "ID và Provider là bất biến"}
        UI-->>User: Hiển thị Toast cảnh báo lỗi bất biến
    else Giữ nguyên ID/Provider & tham số hợp lệ (BR-024)
        Guard-->>API: Validation Passed
        API->>DB: UPDATE agent_models SET name, context_window, max_tokens WHERE id = :id
        DB-->>API: Cập nhật thành công
        API-->>UI: HTTP 200 OK (Kèm dữ liệu đã cập nhật)
        UI-->>User: Cập nhật thông số trực tiếp trên thẻ mô hình
    end

    %% GIAI ĐOẠN 3: TÌM KIẾM TOÀN VĂN / MỜ & BỘ LỌC ĐA TIÊU CHÍ
    Note over User, Router: Giai đoạn 3: Tìm Kiếm & Lọc Đa Tiêu Chí (GET /models/search - OP-024)
    User->>UI: Gõ từ khóa "flash" vào Search Bar & chọn Filter "Google"
    UI->>UI: Kích hoạt Debounce 300ms (UX-008)
    UI->>API: GET /api/v1/models/search?q=flash&provider=GOOGLE&status=ACTIVE&sort=latency_asc
    API->>DB: Query kết hợp sub-string LIKE & filter enum
    DB-->>API: Trả về tập danh sách mô hình phù hợp
    API->>API: Tính toán thời gian thực thi (Latency <= 200ms theo NFR-022)
    API-->>UI: HTTP 200 OK {total: 2, execution_time_ms: 14.5, items: [...]}
    UI-->>User: Render danh sách kết quả lọc tức thì kèm highlight từ khóa

    %% GIAI ĐOẠN 4: XÓA MỀM & BẢO VỆ MÔ HÌNH MẶC ĐỊNH
    Note over User, Router: Giai đoạn 4: Xóa Mềm & Chốt Chặn Mô Hình Mặc Định (DELETE /models/:id - OP-025)
    User->>UI: Nhấn biểu tượng thùng rác & xác nhận trong Dialog
    UI->>API: DELETE /api/v1/models/{id} (Cookie JWT)
    API->>DB: SELECT is_default FROM agent_models WHERE id = :id
    DB-->>API: Trả về trạng thái is_default

    alt Mô hình đang là Default Model (is_default == true)
        API-->>UI: HTTP 400 Bad Request (BR-023: "Không thể xóa hoặc lưu trữ mô hình mặc định")
        UI-->>User: Hiển thị cảnh báo đỏ, yêu cầu đổi Default Model trước
    else Mô hình thông thường (is_default == false)
        API->>DB: UPDATE agent_models SET status = 'ARCHIVED' WHERE id = :id (FR-039)
        DB-->>API: Đã chuyển sang ARCHIVED (Xóa mềm, bảo toàn FK)
        API->>Router: remove_model_from_chat_choices(model_id)
        Router-->>API: Đã loại bỏ khỏi danh mục đàm thoại
        API-->>UI: HTTP 200 OK {"status": "ARCHIVED", "message": "Đã chuyển vào lưu trữ an toàn"}
        UI-->>User: Ẩn thẻ mô hình khỏi bảng hoạt động
    end
```

---

## 2. Bảng Phân Tích Các Ranh Giới Kiểm Soát An Ninh & Toàn Vẹn

| Bước Trình Tự | Thao Tác Kiểm Soát | Mã Ràng Buộc | Hành Vi Xử Lý Khi Vi Phạm |
| :---: | :--- | :---: | :--- |
| **3** | Kiểm tra duy nhất toàn cục mã ID mô hình | `BR-022` | Trả về `HTTP 409 Conflict`, ngăn tạo bản ghi trùng lặp |
| **8** | Thẩm định ngưỡng an toàn `context_window` & `max_tokens` | `BR-024` | Trả về `HTTP 422 Unprocessable Entity`, bảo vệ runtime LLM |
| **14** | Chặn đứng hành vi thay đổi `id` hoặc `provider` | `BR-022` | Trả về `HTTP 400 Bad Request`, bảo vệ khóa ngoại bảng `messages` |
| **26** | Cam kết thời gian phản hồi truy vấn tìm kiếm/lọc $\le 200\text{ms}$ | `NFR-022` | Tối ưu hóa chỉ mục SQL và debounce client 300ms (`UX-008`) |
| **33** | Chốt chặn tuyệt đối không cho xóa hoặc lưu trữ mô hình mặc định | `BR-023` | Trả về `HTTP 400 Bad Request`, bảo vệ tính sẵn sàng đàm thoại |
| **36** | Xóa mềm (`status = ARCHIVED`) thay vì xóa cứng vật lý | `BR-012`, `FR-039` | Lưu giữ 100% dữ liệu lịch sử và đo lường liên kết |

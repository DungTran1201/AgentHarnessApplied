# Sơ Đồ Trình Tự: Thu Thập Telemetry & Phát Luồng Thời Gian Thực (Resource Telemetry Sequence)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-007` |
| **Kịch Bản Tương Tác** | `SEQ-007: Real-Time Resource Telemetry & SSE Streaming` |
| **Nguồn Sự Thật Thượng Nguồn** | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml), [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) (`OP-018` - `OP-021`), [docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md) |
| **Mục Đích** | Mô tả chi tiết trình tự thời gian giữa Trình duyệt Web, Telemetry Middleware, Quota Service, LLM Provider, SQLite Database và SSE Connection Manager |

---

## 1. Biểu Đồ Trình Tự SEQ-007: Thu Thập Telemetry & Đẩy Sự Kiện SSE Thời Gian Thực

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng (Client)
    participant UI as Dashboard / Chat UI (Next.js)
    participant MW as Telemetry Middleware (FastAPI)
    participant QS as Quota Service
    participant LLM as LLM Provider (Gemini / OpenAI)
    participant DB as SQLite Database
    participant SSE as SSE Connection Manager

    Note over UI, SSE: Giai đoạn 1: Thiết lập kênh truyền thời gian thực (SSE Stream)
    User->>UI: Truy cập màn hình /dashboard
    UI->>MW: GET /api/v1/resources/stream (Cookie JWT)
    MW->>MW: Xác thực token & kiểm tra quyền người dùng (SEC-009)
    MW->>SSE: Đăng ký client vào danh sách Active Connections (User Scoped)
    SSE-->>UI: HTTP 200 OK (Content-Type: text/event-stream)
    SSE-->>UI: event: initial_state (Dữ liệu thống kê tổng hợp ban đầu)

    Note over User, LLM: Giai đoạn 2: Tiếp nhận yêu cầu Chat & Thẩm định Quota
    User->>UI: Gửi câu hỏi chat mới
    UI->>MW: POST /api/v1/chat/completions
    MW->>MW: Ghi nhận thời điểm t0 (Start Timer)
    MW->>QS: check_quota(user_id, estimated_tokens=1000)
    QS->>DB: SELECT daily_token_limit, daily_tokens_used FROM user_quotas WHERE user_id = :uid
    DB-->>QS: Trả về quota hiện tại

    alt Hạn ngạch đã cạn kiệt (daily_tokens_used >= limit)
        QS-->>MW: QUOTA_EXCEEDED
        MW-->>UI: HTTP 429 Too Many Requests (Retry-After: 00:00 UTC)
        MW->>DB: INSERT INTO api_metric_logs (status_code=429, error='QUOTA_EXCEEDED')
        MW->>SSE: broadcast_event(user_id, 'quota_exceeded_alert')
        SSE-->>UI: event: quota_alert (Render cảnh báo đỏ trên Dashboard)
    else Hạn ngạch hợp lệ
        QS-->>MW: QUOTA_ALLOWED

        Note over MW, LLM: Giai đoạn 3: Gọi LLM Streaming & Đo đạc Latency / TTFT
        MW->>LLM: Gửi request streaming tới Gemini / OpenAI API
        LLM-->>MW: Token Chunk #1 (First chunk)
        MW->>MW: Ghi nhận TTFT = t_first - t0 (Time-to-First-Token)
        MW-->>UI: Stream chunk #1 tới Chat Box

        loop Nhận các Token Chunks tiếp theo
            LLM-->>MW: Token Chunk #N
            MW-->>UI: Stream chunk #N tới Chat Box
        end

        LLM-->>MW: Stream End (Usage Metadata: prompt=250, completion=450, total=700)
        MW->>MW: Ghi nhận t_end & tính latency_ms = t_end - t0

        Note over MW, SSE: Giai đoạn 4: Cập nhật nguyên tử CSDL & Đẩy sự kiện SSE
        MW->>QS: record_token_usage(user_id, tokens_used=700)
        QS->>DB: UPDATE user_quotas SET daily_tokens_used = daily_tokens_used + 700
        DB-->>QS: OK (New used = 68,200 / 100,000)

        MW->>DB: INSERT INTO api_metric_logs (latency_ms, ttft_ms, tokens, status=200)
        DB-->>MW: Bản ghi đã lưu an toàn

        MW->>SSE: notify_metric_update(user_id, metric_payload)
        SSE-->>UI: event: metric_update (Data: Latency, TTFT, Tokens, Quota %)

        Note over UI: Dashboard cập nhật live (NFR-021 < 1.0s)
        UI->>UI: Cập nhật Gauge Quota, vẽ điểm mới trên biểu đồ Latency & chèn dòng vào Request Feed
    end
```

---

## 2. Bảng Thuyết Minh Thông Điệp Trình Tự (Message Descriptions)

| Bước | Tên Thông Điệp / Tương Tác | Giao Thức / Phương Thức | Mục Đích Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| 2-5 | Khởi tạo SSE Stream | `GET /api/v1/resources/stream` | Thiết lập kết nối streaming HTTP kéo dài giữa Browser và Connection Manager với cơ chế tự động gửi lại (auto-reconnect). |
| 8-11 | Thẩm định Hạn ngạch Quota | Gọi hàm nội bộ & SQL Query | Kiểm tra nghiêm ngặt `BR-020` trước khi chi tiêu tài nguyên máy chủ hoặc phát sinh chi phí gọi dịch vụ LLM. |
| 16-18 | Đo Đạc TTFT | Streaming Chunks | Ghi nhận chính xác mili-giây nhận được token đầu tiên từ LLM để đánh giá hiệu năng mô hình (`FR-029`). |
| 23-25 | Cập Nhật Nguyên Tử & Ghi Log | SQL Transactions | Cập nhật số token đã sử dụng vào `user_quotas` và chèn bản ghi telemetry vào `api_metric_logs` theo `BR-019`. |
| 26-28 | Đẩy Sự Kiện Thời Gian Thực | SSE Event Push | Đẩy tức thì dữ liệu vừa phát sinh lên UI Dashboard trong vòng chưa đầy 1 giây theo `NFR-021`. |

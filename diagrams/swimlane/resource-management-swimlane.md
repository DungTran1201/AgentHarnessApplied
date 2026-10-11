# Sơ Đồ Swimlane: Quản Lý Tài Nguyên Đa Làn (Resource Management Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-006` |
| **Quy Trình Nghiệp Vụ** | `BP-RES-001 [PROC-015]` & `BP-RES-002 [PROC-016]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm và chuỗi tương tác phối hợp 5 làn (5-Lane): Client Dashboard -> Telemetry Middleware -> Quota Controller -> LLM Providers -> SQLite Database |

---

## 1. Biểu Đồ Swimlane Quy Trình Quản Lý Tài Nguyên & Telemetry Thời Gian Thực

```mermaid
flowchart TD
    subgraph LaneClient ["LÀN 1: CLIENT & DASHBOARD (Next.js Web / SCR-003)"]
        C_SendChat["1. Gửi request đàm thoại POST /api/v1/chat/completions"]
        C_OpenSSE["Mở kết nối GET /api/v1/resources/stream (EventSource)"]
        C_ReceiveWarning["Nhận cảnh báo 80% quota & render Amber Banner"]
        C_RenderDashboard["7. Nhận event metric_update & render biểu đồ, Gauge live"]
        C_Handle429["Hiển thị thông báo đỏ: Hết hạn ngạch token trong ngày"]
    end

    subgraph LaneMiddleware ["LÀN 2: TELEMETRY MIDDLEWARE (FastAPI / COMP-002)"]
        M_Intercept["2. Chặn request, ghi nhận thời điểm t0, trích xuất User ID"]
        M_RecordTTFT["4. Ghi nhận thời điểm chunk token đầu tiên: ttft_ms = t_first - t0"]
        M_Finalize["Tính latency_ms = t_end - t0, trích xuất token usage từ LLM"]
        M_PushSSE["6. Phát broadcast sự kiện SSE qua connection manager"]
    end

    subgraph LaneQuota ["LÀN 3: QUOTA CONTROLLER (FastAPI / COMP-002)"]
        Q_Validate["3. Thẩm định hạn ngạch: daily_tokens_used + est < daily_token_limit"]
        Q_Block["Từ chối gọi LLM, phát hành HTTP 429 Too Many Requests"]
        Q_Increment["5. Tính toán mức tiêu thụ mới & kiểm tra ngưỡng cảnh báo 80%"]
    end

    subgraph LaneLLM ["LÀN 4: NHÀ CUNG CẤP AI (Gemini / OpenAI API)"]
        L_StreamResponse["Truyền luồng phản hồi streaming (Chunks)"]
        L_ProvideUsage["Trả về usage metadata: prompt_tokens, completion_tokens"]
    end

    subgraph LaneDB ["LÀN 5: CƠ SỞ DỮ LIỆU (SQLite Database / COMP-003)"]
        DB_ReadQuota["SELECT daily_token_limit, daily_tokens_used FROM user_quotas"]
        DB_UpdateQuota["UPDATE user_quotas SET daily_tokens_used = daily_tokens_used + N"]
        DB_InsertMetric["INSERT INTO api_metric_logs (latency, ttft, tokens, status)"]
    end

    %% Luồng điều phối giữa các làn
    C_SendChat --> M_Intercept
    M_Intercept --> Q_Validate
    Q_Validate --> DB_ReadQuota
    DB_ReadQuota --> Q_Validate

    %% Phân nhánh Quota
    Q_Validate -- Vượt Quota --> Q_Block
    Q_Block --> C_Handle429

    Q_Validate -- Hợp Lệ --> L_StreamResponse
    L_StreamResponse --> M_RecordTTFT
    L_StreamResponse --> L_ProvideUsage
    L_ProvideUsage --> M_Finalize

    M_Finalize --> Q_Increment
    Q_Increment --> DB_UpdateQuota
    M_Finalize --> DB_InsertMetric

    DB_InsertMetric --> M_PushSSE
    C_OpenSSE -.-> M_PushSSE
    M_PushSSE --> C_RenderDashboard
    Q_Increment -- Đạt 80% --> C_ReceiveWarning
```

---

## 2. Bảng Phân Trách Nhiệm Theo Làn (RACI Matrix)

| Giai Đoạn Hoạt Động | Client Dashboard | Telemetry Middleware | Quota Controller | LLM Providers | SQLite Database |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Thẩm Định Quota Ban Đầu** | Informed (Nhận 429 nếu hết hạn ngạch) | Responsible (Chuyển tiếp) | Accountable (Kiểm tra điều kiện) | None | Consulted (Cung cấp số liệu) |
| **Đo Đạc Độ Trễ & TTFT** | Consulted | Accountable (Bấm giờ t0, t_first, t_end) | None | Responsible (Stream chunks) | None |
| **Cập Nhật Hạn Ngạch & Ghi Log** | None | Responsible (Chuẩn bị payload log) | Accountable (Cộng dồn token) | Consulted (Trả usage metadata) | Responsible (Lưu trữ atomic) |
| **Hiển Thị Thời Gian Thực** | Responsible (Render Dashboard UI) | Accountable (Đẩy SSE Stream) | None | None | Consulted (Cung cấp lịch sử) |

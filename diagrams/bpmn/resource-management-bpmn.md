# Sơ Đồ BPMN: Quy Trình Quản Lý Tài Nguyên & Kiểm Soát Quota (Resource Management BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-009` |
| **Quy Trình Nghiệp Vụ** | `BP-RES-001 [PROC-015]` & `BP-RES-002 [PROC-016]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-029` - `FR-034`), [docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md) |
| **Mục Đích** | Trực quan hóa toàn diện quy trình tiếp nhận yêu cầu API, thẩm định hạn ngạch Quota trước thực thi, đo đạc độ trễ/TTFT/token, ghi nhật ký telemetry nguyên tử và đẩy luồng SSE thời gian thực lên Dashboard |

---

## 1. Biểu Đồ BPMN Quy Trình Đo Đạc Telemetry & Quản Lý Quota (PROC-015 / PROC-016)

```mermaid
flowchart TD
    StartReq((Bắt Đầu: Yêu Cầu API Gọi Đến)) --> InitTimer[Telemetry Middleware: Bấm giờ t0, phân giải User ID & Endpoint]
    InitTimer --> CheckTarget{Endpoint yêu cầu có tiêu thụ Token LLM?}

    %% Nhánh không dùng LLM
    CheckTarget -- Không (Auth / Model Query) --> ExecNormal[Thực thi Handler chức năng thông thường]
    ExecNormal --> RecordNormal[Tính tổng Latency = t_end - t0]
    RecordNormal --> InsertLogNormal[Ghi bản ghi ApiMetricLog: token = 0]
    InsertLogNormal --> PushSSENormal[Broadcast sự kiện metric_update qua SSE stream]
    PushSSENormal --> EndNormal((Kết Thúc: Trả kết quả HTTP))

    %% Nhánh dùng LLM (Cần kiểm soát Quota)
    CheckTarget -- Có (Chat / Generation) --> CheckQuota{D-RES-01: daily_tokens_used + estimated < daily_token_limit?}

    %% Quota bị vượt ngưỡng
    CheckQuota -- Vượt ngưỡng (100%) --> BlockRequest[BR-020: Từ chối xử lý, chặn gọi API nhà cung cấp bên ngoài]
    BlockRequest --> Return429[Trả về HTTP 429 Too Many Requests kèm Retry-After]
    Return429 --> RecordThrottled[Ghi ApiMetricLog: status_code=429, error=DAILY_QUOTA_EXCEEDED]
    RecordThrottled --> PushSSEThrottled[Broadcast sự kiện cảnh báo qua SSE]
    PushSSEThrottled --> EndThrottled((Kết Thúc: Chặn Quota))

    %% Quota còn khả dụng
    CheckQuota -- Còn hạn ngạch (Hợp lệ) --> ForwardLLM[Chuyển tiếp yêu cầu tới LLM Provider: Gemini / OpenAI]
    ForwardLLM --> StreamTokens[Nhận luồng phản hồi streaming từ LLM]
    StreamTokens --> MarkTTFT[Ghi nhận TTFT = thời điểm chunk token đầu tiên - t0]
    MarkTTFT --> CompleteStream[Nhận toàn bộ stream & lấy token usage thực tế: Prompt + Completion]
    CompleteStream --> UpdateQuotaDB[Atomic UPDATE user_quotas: tăng daily_tokens_used]
    UpdateQuotaDB --> Check80Warning{D-RES-02: daily_tokens_used >= 80% limit?}

    %% Cảnh báo 80%
    Check80Warning -- Đạt >= 80% --> SetWarningFlag[Đánh dấu cờ warning_80 = true & phát alert banner]
    Check80Warning -- Dưới 80% --> KeepNormalQuota[Duy trì cờ warning bình thường]

    SetWarningFlag --> InsertMetricLog[BR-019: INSERT bản ghi ApiMetricLog hoàn chỉnh vào CSDL]
    KeepNormalQuota --> InsertMetricLog

    InsertMetricLog --> PushSSELive[FR-033, OP-019: Đẩy sự kiện metric_update real-time tới Dashboard]
    PushSSELive --> ClientDashboard[Dashboard Live Update: Gauge Quota, Charts Latency & Request Feed]
    ClientDashboard --> EndSuccess((Kết Thúc: Hoàn tất đàm thoại))
```

---

## 2. Bảng Cổng Điều Kiện & Điểm Quyết Định BPMN (Gateways)

| Cổng Quyết Định | Tên Cổng Nghiệp Vụ | Điều Kiện Thẩm Định | Nhánh Xử Lý Tiếp Theo |
| :--- | :--- | :--- | :--- |
| `CheckTarget` | Phân loại Endpoint Yêu Cầu | Endpoint thuộc nhóm gọi AI Chat/Completion hay dịch vụ thường | Nếu dịch vụ thường: bỏ qua bước kiểm tra Quota LLM; Nếu gọi LLM: bắt buộc thẩm định Quota. |
| `CheckQuota` | Kiểm Tra Hạn Ngạch Token (`D-RES-01`) | `daily_tokens_used + estimated < daily_token_limit` | Nếu FALSE: trả về `HTTP 429`, chặn gọi model; Nếu TRUE: cho phép gửi request tới LLM provider. |
| `Check80Warning` | Cảnh Báo Ngưỡng 80% (`D-RES-02`) | `daily_tokens_used >= 80% * daily_token_limit` | Nếu TRUE: đính kèm cảnh báo `warning_80` qua SSE để hiển thị banner màu cam; Nếu FALSE: tiếp tục bình thường. |

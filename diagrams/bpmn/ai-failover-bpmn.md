# Sơ Đồ BPMN: Quy Trình Tự Động Chuyển Đổi Dự Phòng Cổng AI (Multi-Provider Failover BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-004` |
| **Quy Trình Nghiệp Vụ** | `BP-AI-001 [PROC-009]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md), [docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-011`) |
| **Mục Đích** | Mô tả cơ chế xử lý ngoại lệ, điều phối tự động và chuyển đổi dự phòng trong suốt từ Google Gemini sang OpenAI |

---

## 1. Biểu Đồ BPMN Quy Trình Chuyển Đổi Dự Phòng AI (PROC-009)

```mermaid
flowchart TD
    StartGateway((Bắt Đầu: Khởi tạo LangGraph Agent)) --> LoadEnv[EnvKeyLoader: Tải khóa API từ .env GEMINI, OPENAI,...]
    LoadEnv --> PreparePayload[ContextNode: Đóng gói 20 tin nhắn ngữ cảnh trượt INV-04]
    PreparePayload --> CallPrimary[PrimaryModelNode: LangChain ChatGoogleGenerativeAI]

    CallPrimary --> CheckPrimaryStatus{LangGraph Conditional Edge: Kết quả từ Gemini?}

    CheckPrimaryStatus -- 200 OK Thành công --> StreamPrimary[StreamOutputNode: Truyền các token chunks về SSE Generator]
    StreamPrimary --> StreamSuccess((Kết Thúc: Hoàn thành qua Primary))

    CheckPrimaryStatus -- Gặp Lỗi 429 Quota / 5xx / Timeout 30s --> CatchGeminiErr[Bắt ngoại lệ & Ghi log Warning 'Gemini Failed']
    CatchGeminiErr --> CheckFallbackConfig{Kiểm tra khóa Fallback OPENAI_API_KEY trong .env?}

    CheckFallbackConfig -- Không có Key / Bị tắt --> ReturnOutage[Trả về SSE event: error 'Dịch vụ AI tạm thời gián đoạn']
    ReturnOutage --> EndOutageFail((Kết Thúc: Total Outage))

    CheckFallbackConfig -- Có sẵn Key (Yes) --> CallFallback[FallbackModelNode: LangChain ChatOpenAI]
    CallFallback --> CheckOpenAIStatus{LangGraph Conditional Edge: Kết quả từ OpenAI?}

    CheckOpenAIStatus -- 200 OK Thành công --> LogFailover[Ghi log Audit 'Transparent Failover to OpenAI Succeeded']
    LogFailover --> StreamFallback[StreamOutputNode: Chuyển tiếp luồng token từ OpenAI về SSE Generator]
    StreamFallback --> EndFailoverSuccess((Kết Thúc: Hoàn thành qua Fallback))

    CheckOpenAIStatus -- Lỗi tiếp (429 / 5xx) --> CatchOpenAIErr[Bắt ngoại lệ & Ghi log Error 'Both LLM Providers Failed']
    CatchOpenAIErr --> ReturnOutage

    style StartGateway fill:#dcfce7,stroke:#15803d
    style StreamSuccess fill:#dcfce7,stroke:#15803d
    style EndFailoverSuccess fill:#dbeafe,stroke:#1d4ed8
    style EndOutageFail fill:#fee2e2,stroke:#b91c1c
    style CheckPrimaryStatus fill:#fef3c7,stroke:#d97706
    style CheckFallbackConfig fill:#fef3c7,stroke:#d97706
    style CheckOpenAIStatus fill:#fef3c7,stroke:#d97706
```

---

## 2. Thuyết Minh Quy Tắc Chuyển Vùng Dự Phòng (ADR-003, ADR-005)

1. **Điều phối qua LangGraph StateGraph**: Toàn bộ luồng chuyển vùng dự phòng được quản lý bằng đồ thị trạng thái của LangGraph. State được bảo toàn nguyên vẹn khi chuyển từ nút `PrimaryModelNode` sang `FallbackModelNode`.
2. **Tải cấu hình từ `.env`**: Các model adapters của LangChain được nạp động dựa trên sự hiện diện của API key trong `.env` (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`).
3. **Tính trong suốt với người dùng (Transparency)**: Quá trình chuyển đổi diễn ra hoàn toàn ở tầng Backend. Giao diện người dùng vẫn tiếp tục nhận các token streaming bình thường mà không nhận thấy lỗi gián đoạn.
4. **Các điều kiện kích hoạt Failover**:
   - `HTTP 429 Too Many Requests`: Hạn ngạch (Quota) Google Gemini bị vượt ngưỡng.
   - `HTTP 500/502/503`: Máy chủ Google AI Studio gặp sự cố.
   - `TimeoutException`: Sau 30 giây không nhận được phản hồi từ Gemini.

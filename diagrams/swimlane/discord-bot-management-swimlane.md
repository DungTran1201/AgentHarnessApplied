# Sơ Đồ Swimlane: Quy Trình Đa Làn Quản Lý & Tương Tác Bot Discord (Discord Bot Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-010` |
| **Quy Trình Nghiệp Vụ** | `BP-BOT-001 [PROC-022]` & `BP-BOT-002 [PROC-023]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-044`..`047`), [docs/02-requirements/business-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/business-rules.md) (`BR-031`..`034`), [docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm đa làn (5-Lane): Người Dùng -> Next.js Frontend Console -> FastAPI Backend Service -> Discord API & LLM Providers -> SQLite Database |

---

## 1. Biểu Đồ Swimlane Quản Lý & Tương Tác Bot Discord

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-02: User Đã Liên Kết Discord)"]
        U_Nav["1. Truy cập trang /bot/discord (SCR-006)"]
        U_SelectGuild["5. Chọn máy chủ Discord trong Guild Grid (BR-034)"]
        U_FillForm["6. Chọn Active Model, nhập Persona Prompt, chỉnh Max Tokens"]
        U_ClickSave["7. Nhấn nút 'Lưu cấu hình'"]
        U_SendTest["14. Gõ câu hỏi & bấm 'Kiểm Tra Bot' (Test Dispatch - OP-034)"]
        U_ViewResponse["24. Xem câu trả lời AI & số token tiêu thụ trên Console (NFR-025)"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CONSOLE (Next.js - SCR-006, UX-011)"]
        F_CheckPrecondition["2. Kiểm tra cờ liên kết Discord (BR-031)"]
        F_FetchData["3. Gửi GET /bot/discord/guilds (OP-033) & GET /config (OP-031)"]
        F_RenderUI["4. Hiển thị Guild Grid, Form cấu hình & Thẻ Quota Gauge"]
        F_SubmitConfig["8. Gửi PUT /api/v1/bot/discord/config (OP-032)"]
        F_ToastSuccess["13. Hiển thị Toast thông báo lưu cấu hình thành công"]
        F_SubmitTest["15. Gửi POST /api/v1/bot/discord/test-dispatch (OP-034)"]
        F_DisplayResult["23. Cập nhật câu trả lời AI & tiến trình Quota Gauge"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND SERVICE (FastAPI - Controller & Orchestrator)"]
        B_VerifyLink["Thẩm định discord_id IS NOT NULL (BR-031)"]
        B_FilterGuilds["Lọc quyền bitwise 0x8 | 0x20 (BR-034)"]
        B_ValidateModel["9. Thẩm định model active (BR-033) & quyền Guild (BR-034)"]
        B_VerifyEd25519["16. Xác thực chữ ký số Ed25519 & Anti-Replay (SEC-013, CTRL-012)"]
        B_CheckQuota["17. Kiểm tra trần token user_quotas < total_limit (BR-032)"]
        B_DispatchLLM["19. Định tuyến tới active_model_id (Fallback default nếu lỗi - BR-033)"]
        B_DeductTokens["21. Trừ token nguyên tử & đồng bộ Web message (FR-047, BR-032)"]
    end

    subgraph LaneExtServices ["LÀN 4: DỊCH VỤ NGOÀI (Discord API & LLM Providers)"]
        EXT_DiscordGuilds["Discord API v10 trả về danh sách Guilds của User"]
        EXT_LLMGenerate["20. LLM Provider xử lý prompt & sinh kết quả đàm thoại"]
    end

    subgraph LaneDatabase ["LÀN 5: CƠ SỞ DỮ LIỆU (SQLite Database)"]
        DB_SaveConfig["10. UPSERT bản ghi vào discord_bot_configs"]
        DB_QueryQuota["18. Truy vấn hạn ngạch user_quotas"]
        DB_UpdateQuota["22. Cập nhật used_tokens trong user_quotas"]
        DB_SyncMsg["Lưu câu hỏi & trả lời vào messages (source='DISCORD')"]
        DB_LogMetric["Ghi nhật ký đo lường vào api_metric_logs"]
    end

    %% Tương tác qua lại giữa các làn
    U_Nav --> F_CheckPrecondition
    F_CheckPrecondition --> B_VerifyLink
    B_VerifyLink --> F_FetchData
    F_FetchData --> EXT_DiscordGuilds
    EXT_DiscordGuilds --> B_FilterGuilds
    B_FilterGuilds --> F_RenderUI
    F_RenderUI --> U_SelectGuild
    U_SelectGuild --> U_FillForm
    U_FillForm --> U_ClickSave
    U_ClickSave --> F_SubmitConfig
    F_SubmitConfig --> B_ValidateModel
    B_ValidateModel --> DB_SaveConfig
    DB_SaveConfig --> F_ToastSuccess
    F_ToastSuccess --> U_SendTest
    U_SendTest --> F_SubmitTest
    F_SubmitTest --> B_VerifyEd25519
    B_VerifyEd25519 --> B_CheckQuota
    B_CheckQuota --> DB_QueryQuota
    DB_QueryQuota --> B_DispatchLLM
    B_DispatchLLM --> EXT_LLMGenerate
    EXT_LLMGenerate --> B_DeductTokens
    B_DeductTokens --> DB_UpdateQuota
    DB_UpdateQuota --> DB_SyncMsg
    DB_SyncMsg --> DB_LogMetric
    DB_LogMetric --> F_DisplayResult
    F_DisplayResult --> U_ViewResponse
```

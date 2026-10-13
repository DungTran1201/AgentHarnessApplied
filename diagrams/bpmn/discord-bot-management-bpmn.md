# Sơ Đồ BPMN: Quy Trình Quản Lý Cấu Hình & Điều Phối Bot Discord (Discord Bot BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-013` |
| **Quy Trình Nghiệp Vụ** | `BP-BOT-001 [PROC-022]` & `BP-BOT-002 [PROC-023]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-044`..`047`), [docs/02-requirements/business-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/business-rules.md) (`BR-031`..`034`), [docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md) |
| **Mục Đích** | Trực quan hóa toàn diện quy trình cấu hình Discord bot, khám phá máy chủ, xác thực quyền quản trị Guild (`BR-034`), kiểm soát mô hình hoạt động (`BR-033`), kiểm tra chữ ký Ed25519 (`SEC-013`), trừ hạn ngạch dùng chung (`BR-032`) và đồng bộ hội thoại sang Web (`FR-047`) |

---

## 1. Biểu Đồ BPMN Quy Trình Cấu Hình & Điều Phối Bot Discord (PROC-022, PROC-023)

```mermaid
flowchart TD
    StartConfig((Bắt Đầu: Người dùng truy cập /bot/discord - SCR-006)) --> CheckLink{D-BOT-01: Tài khoản đã liên kết Discord discord_id IS NOT NULL? - BR-031}
    
    CheckLink -- Chưa liên kết (No) --> ShowLinkBanner[Hiển thị Banner yêu cầu kết nối Discord - UX-011]
    ShowLinkBanner --> RedirectLink[Điều hướng sang trang Cài đặt liên kết - SCR-005]
    RedirectLink --> EndNoLink((Kết Thúc: Chặn do chưa liên kết))

    CheckLink -- Đã liên kết (Yes) --> FetchGuilds[Client gọi GET /api/v1/bot/discord/guilds - OP-033 & GET /config - OP-031]
    FetchGuilds --> DiscordAPICall[Backend gọi Discord API /users/@me/guilds]
    DiscordAPICall --> FilterPerms[Backend lọc Guild theo quyền bitwise: 0x8 Administrator | 0x20 Manage Guild - BR-034]
    FilterPerms --> RenderConsole[Frontend hiển thị Guild Grid & Form cấu hình - UX-011]

    RenderConsole --> UserConfig[Người dùng chọn Guild, chọn Active Model, soạn Persona Prompt, chỉnh Max Tokens]
    UserConfig --> SubmitConfig[Client gửi PUT /api/v1/bot/discord/config - OP-032]

    SubmitConfig --> ValidateGuild{D-BOT-02: Guild thuộc danh sách người dùng có quyền quản trị? - BR-034}
    ValidateGuild -- Không có quyền (No) --> RejectGuild[Backend trả về HTTP 403 Forbidden - INSUFFICIENT_GUILD_PERMISSIONS]
    RejectGuild --> ShowGuildError[Giao diện hiển thị cảnh báo không có quyền quản trị máy chủ]
    ShowGuildError --> EndRejectGuild((Kết Thúc: Bị chặn bởi BR-034))

    ValidateGuild -- Hợp lệ (Yes) --> ValidateModel{D-BOT-03: Mô hình active_model_id có trạng thái ACTIVE? - BR-033}
    ValidateModel -- Không ACTIVE / Không tồn tại (No) --> RejectModel[Backend trả về HTTP 400 Bad Request - MODEL_NOT_ACTIVE]
    RejectModel --> ShowModelError[Giao diện báo lỗi yêu cầu chọn mô hình đang hoạt động]
    ShowModelError --> EndRejectModel((Kết Thúc: Bị chặn bởi BR-033))

    ValidateModel -- Hợp lệ (Yes) --> SaveConfig[Backend lưu bản ghi vào CSDL: discord_bot_configs]
    SaveConfig --> ConfigSuccess[Backend trả về HTTP 200 OK & Frontend hiển thị Toast thành công]
    ConfigSuccess --> WaitInteraction((Bot Sẵn Sàng: Lắng nghe tương tác))

    WaitInteraction --> ReceiveInteraction[Nhận lệnh tương tác từ Discord Gateway / Test Dispatch OP-034]
    ReceiveInteraction --> VerifySignature{D-BOT-04: Chữ ký Ed25519 hợp lệ & timestamp < 5m? - SEC-013}
    VerifySignature -- Sai chữ ký / Hết hạn (No) --> RejectSig[Backend trả về HTTP 401 Unauthorized]
    RejectSig --> EndSigFail((Kết Thúc: Từ chối do chữ ký sai))

    VerifySignature -- Hợp lệ (Yes) --> CheckQuota{D-BOT-05: Hạn ngạch token used_tokens < total_limit? - BR-032}
    CheckQuota -- Hết hạn ngạch (No) --> RejectQuota[Backend trả về HTTP 429 Too Many Requests]
    RejectQuota --> SendQuotaNotice[Gửi thông báo cạn kiệt Quota về Discord channel]
    SendQuotaNotice --> EndQuotaFail((Kết Thúc: Chặn do hết hạn ngạch))

    CheckQuota -- Còn hạn ngạch (Yes) --> SendAck[Backend gửi Ack Response trong <= 300ms - NFR-025]
    SendAck --> RouteLLM[Bộ điều phối LLM xử lý prompt bằng mô hình active_model_id]
    RouteLLM --> LLMFailCheck{Mô hình hoạt động bình thường?}
    LLMFailCheck -- Gặp sự cố (Error) --> FailoverDefault[Tự động Fallback sang mô hình mặc định is_default=1 - BR-033]
    LLMFailCheck -- Bình thường (OK) --> CollectResponse[Nhận câu trả lời hoàn chỉnh từ AI & đếm tokens]
    FailoverDefault --> CollectResponse

    CollectResponse --> DeductQuota[Giao dịch nguyên tử: Tăng used_tokens trong user_quotas & ghi api_metric_logs - BR-032]
    DeductQuota --> SyncWebMessages[Lưu bản ghi tin nhắn vào bảng messages với source='DISCORD' - FR-047]
    SyncWebMessages --> ReplyDiscord[Cập nhật câu trả lời hoàn chỉnh về Discord channel]
    ReplyDiscord --> EndDispatchSuccess((Kết Thúc: Tương tác thành công))
```

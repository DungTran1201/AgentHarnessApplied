# Sơ Đồ Tuần Tự: Quản Lý Cấu Hình & Điều Phối Bot Discord (Discord Bot Management Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-011` |
| **Mã Kịch Bản** | `SEQ-011` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) (`OP-031`..`034`), [docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md), [docs/04-use-cases/specifications/UC-BOT-001-discord-bot-configuration.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-BOT-001-discord-bot-configuration.md), [docs/02-requirements/business-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/business-rules.md) (`BR-031`..`034`) |
| **Mục Đích** | Mô tả chi tiết trình tự trao đổi thông điệp mạng giữa Người Dùng, Giao diện Next.js Console, FastAPI Backend Router, Security Guard, Discord API v10, LLM Orchestrator và SQLite Database |

---

## 1. SEQ-011: Trình Tự Khám Phá Máy Chủ, Lưu Cấu Hình & Điều Phối Bot Discord

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: Người Dùng (Đã liên kết Discord)
    participant UI as Next.js Console (SCR-006, UX-011)
    participant Router as FastAPI Bot Router (/api/v1/bot/discord)
    participant Sec as Security Guard (SEC-013, CTRL-012)
    participant DiscordAPI as Discord REST API v10
    participant LLM as LLM Orchestrator
    participant DB as SQLite DB (configs, quotas, messages)

    %% GIAI ĐOẠN 1: KHÁM PHÁ MÁY CHỦ & TẢI CẤU HÌNH
    Note over User, DB: GIAI ĐOẠN 1: KHÁM PHÁ MÁY CHỦ GUILD & TẢI CẤU HÌNH HIỆN HÀNH (OP-031, OP-033)
    User->>UI: Truy cập /bot/discord (SCR-006)
    UI->>Router: GET /api/v1/bot/discord/guilds (OP-033) & GET /config (OP-031)
    Router->>Sec: Kiểm tra tài khoản đã liên kết Discord (BR-031)
    alt Chưa liên kết Discord (discord_id IS NULL)
        Sec-->>Router: Từ chối: DISCORD_NOT_LINKED
        Router-->>UI: HTTP 403 Forbidden
        UI-->>User: Hiển thị Banner yêu cầu kết nối Discord (UX-011)
    else Đã liên kết Discord hợp lệ
        Sec-->>Router: Hợp lệ
        Router->>DiscordAPI: GET /users/@me/guilds (Bearer Bot/OAuth Token)
        DiscordAPI-->>Router: Danh sách tất cả Guilds tham gia
        Router->>Router: Lọc quyền bitwise: 0x8 Administrator | 0x20 Manage Guild (BR-034)
        Router->>DB: SELECT * FROM discord_bot_configs WHERE user_id = :user_id
        DB-->>Router: Bản ghi cấu hình hiện hành
        Router-->>UI: HTTP 200 OK ({guilds: [...], config: {...}})
        UI-->>User: Hiển thị Guild Card Grid & Form cấu hình (UX-011)
    end

    %% GIAI ĐOẠN 2: CẬP NHẬT CẤU HÌNH BOT
    Note over User, DB: GIAI ĐOẠN 2: CẬP NHẬT CẤU HÌNH BOT DISCORD (OP-032)
    User->>UI: Chọn Guild, chọn Model, nhập Persona Prompt & bấm "Lưu cấu hình"
    UI->>Router: PUT /api/v1/bot/discord/config (OP-032)<br/>Body: {guild_id, active_model_id, system_prompt, max_tokens, is_enabled}
    Router->>Router: Kiểm tra guild_id thuộc quyền quản trị (BR-034)
    Router->>DB: SELECT status FROM models WHERE id = :active_model_id
    DB-->>Router: Model Record (status)
    alt Mô hình không ở trạng thái ACTIVE (BR-033)
        Router-->>UI: HTTP 400 Bad Request ("Mô hình chỉ định không khả dụng")
        UI-->>User: Hiển thị cảnh báo đỏ yêu cầu chọn mô hình ACTIVE
    else Hợp lệ
        Router->>DB: UPSERT INTO discord_bot_configs (...)
        DB-->>Router: Cập nhật thành công
        Router-->>UI: HTTP 200 OK ({success: true, config: {...}})
        UI-->>User: Hiển thị Success Toast (Lưu cấu hình thành công)
    end

    %% GIAI ĐOẠN 3: ĐIỀU PHỐI TƯƠNG TÁC ĐÀM THOẠI & TRỪ HẠN NGẠCH
    Note over User, DB: GIAI ĐOẠN 3: ĐIỀU PHỐI TƯƠNG TÁC & TRỪ HẠN NGẠCH HỢP NHẤT (OP-034, BP-BOT-002)
    User->>UI: Nhập câu hỏi & bấm "Kiểm Tra Bot" (Test Dispatch - OP-034)
    UI->>Router: POST /api/v1/bot/discord/test-dispatch (OP-034)<br/>Body: {query_text: "..."}
    Router->>Sec: Xác thực Header / Chữ ký số Ed25519 (SEC-013, CTRL-012)
    alt Chữ ký sai hoặc timestamp quá 5 phút
        Sec-->>Router: Chữ ký không hợp lệ
        Router-->>UI: HTTP 401 Unauthorized
        UI-->>User: Hiển thị lỗi xác thực bảo mật
    else Xác thực chữ ký hợp lệ
        Sec-->>Router: Hợp lệ
        Router->>DB: SELECT * FROM user_quotas WHERE user_id = :user_id
        DB-->>Router: Quota Record (used_tokens, total_limit)
        alt Hết hạn ngạch (used_tokens >= total_limit) (BR-032)
            Router-->>UI: HTTP 429 Too Many Requests ("Hạn ngạch token đã hết")
            UI-->>User: Hiển thị cảnh báo Quota Throttled
        else Còn hạn ngạch khả dụng
            Router->>DB: Nạp active_model_id & system_prompt
            DB-->>Router: Cấu hình bot
            Router->>LLM: Gửi prompt xử lý (System Persona + User Query)
            alt Model active lỗi
                LLM-->>Router: Error / Timeout
                Router->>LLM: Fallback sang mô hình mặc định is_default=1 (BR-033, ADR-012)
                LLM-->>Router: Câu trả lời dự phòng + Token count
            else Thành công
                LLM-->>Router: Câu trả lời AI + Token count
            end
            Router->>DB: UPDATE user_quotas (Cộng dồn used_tokens nguyên tử) (BR-032)
            Router->>DB: INSERT INTO api_metric_logs (source='DISCORD_BOT')
            Router->>DB: INSERT INTO messages (source='DISCORD') (FR-047)
            Router-->>UI: HTTP 200 OK ({response_text: "...", latency_ms: ..., tokens: ...}) (NFR-025)
            UI-->>User: Kết xuất câu trả lời AI & cập nhật live thanh Quota Gauge
        end
    end
```

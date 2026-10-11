# Sơ Đồ Swimlane: Quy Trình Xác Thực Đa Làn Discord OAuth2 (Discord OAuth Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-005` |
| **Quy Trình Nghiệp Vụ** | `BP-AUTH-004 [PROC-014]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm và chuỗi điều phối 5 làn (5-Lane): Người dùng -> Next.js Frontend -> FastAPI Backend -> Discord OAuth2 API -> SQLite Database |

---

## 1. Biểu Đồ Swimlane Xác Thực & Đăng Ký Discord OAuth2

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-01 / ACT-02)"]
        U_Click["1. Nhấn nút 'Tiếp tục với Discord' trên Login / Register"]
        U_Authorize["4. Duyệt thông tin & bấm Authorize trên cổng Discord"]
        U_Workspace["12. Vào phòng chat /chat và bắt đầu tương tác trợ lý ảo"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CLIENT (Next.js Web)"]
        F_RequestLogin["2. Gửi request GET /api/v1/auth/discord/login"]
        F_RedirectConsent["3. Tiếp nhận HTTP 307 & chuyển hướng sang Discord URL"]
        F_HandleCallback["5. Trình duyệt nhận chuyển hướng Callback kèm code & state"]
        F_SendCallback["6. Gửi GET /api/v1/auth/discord/callback"]
        F_RenderApp["11. Tiếp nhận Cookie HttpOnly & điều hướng vào /chat"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API (FastAPI)"]
        B_GenState["Tạo chuỗi ngẫu nhiên ký HMAC-SHA256 & gán Cookie oauth_state"]
        B_VerifyState["7. Kiểm tra tính toàn vẹn chữ ký HMAC & TTL state <= 10 phút"]
        B_ExchangeToken["8. HTTPS POST /oauth2/token đổi code lấy Access Token"]
        B_FetchProfile["9. HTTPS GET /users/@me trích xuất ID, Email, Verified"]
        B_ProcessAccount["10. Kiểm tra Verified Email & phân nhánh tạo mới / liên kết CSDL"]
        B_IssueJWT["Phát hành JWT Cookie access_token HttpOnly 7 ngày & chuyển hướng"]
    end

    subgraph LaneDiscord ["LÀN 4: NHÀ CUNG CẤP DISCORD (Discord OAuth2 API)"]
        D_ConsentPrompt["Hiển thị màn hình chấp thuận ủy quyền scope identify, email"]
        D_IssueCode["Cấp Authorization Code qua Callback URL"]
        D_ReturnToken["Xác thực Client Secret & cấp Discord Access Token"]
        D_ReturnProfile["Trả về dữ liệu hồ sơ cá nhân người dùng"]
    end

    subgraph LaneDB ["LÀN 5: CƠ SỞ DỮ LIỆU (SQLite Database)"]
        DB_FindDiscord["Truy vấn người dùng theo discord_id"]
        DB_FindEmail["Truy vấn người dùng theo email (nếu chưa có discord_id)"]
        DB_UpdateLink["UPDATE users SET discord_id, discord_username (Auto-link)"]
        DB_InsertNew["INSERT users (email, full_name, discord_id, password=NULL)"]
    end

    %% Luồng điều phối qua các làn
    U_Click --> F_RequestLogin
    F_RequestLogin --> B_GenState
    B_GenState --> F_RedirectConsent
    F_RedirectConsent --> D_ConsentPrompt
    D_ConsentPrompt --> U_Authorize
    U_Authorize --> D_IssueCode
    D_IssueCode --> F_HandleCallback
    F_HandleCallback --> F_SendCallback
    F_SendCallback --> B_VerifyState
    B_VerifyState --> B_ExchangeToken
    B_ExchangeToken --> D_ReturnToken
    D_ReturnToken --> B_FetchProfile
    B_FetchProfile --> D_ReturnProfile
    D_ReturnProfile --> B_ProcessAccount
    B_ProcessAccount --> DB_FindDiscord
    DB_FindDiscord --> DB_FindEmail
    DB_FindEmail --> DB_UpdateLink
    DB_FindEmail --> DB_InsertNew
    DB_UpdateLink --> B_IssueJWT
    DB_InsertNew --> B_IssueJWT
    B_IssueJWT --> F_RenderApp
    F_RenderApp --> U_Workspace

    style U_Click fill:#e0e7ff,stroke:#4338ca
    style U_Authorize fill:#e0e7ff,stroke:#4338ca
    style U_Workspace fill:#dcfce7,stroke:#15803d
    style D_ConsentPrompt fill:#ede9fe,stroke:#6d28d9
    style D_IssueCode fill:#ede9fe,stroke:#6d28d9
    style D_ReturnToken fill:#ede9fe,stroke:#6d28d9
    style D_ReturnProfile fill:#ede9fe,stroke:#6d28d9
    style B_GenState fill:#fef3c7,stroke:#d97706
    style B_VerifyState fill:#fef3c7,stroke:#d97706
    style B_IssueJWT fill:#dcfce7,stroke:#15803d
```

---

## 2. Bảng Phân Định Ma Trận Trách Nhiệm RACI Theo Làn (RACI Matrix)

| Giai Đoạn Quy Trình | Làn Người Dùng | Làn Frontend | Làn Backend | Làn Discord API | Làn Cơ Sở Dữ Liệu |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Khởi tạo đăng nhập** | **A** (Kích hoạt) | **R** (Điều hướng) | **R** (Sinh State HMAC) | **I** (Chờ request) | **-** |
| **Ủy quyền & Cấp code** | **A** (Chấp thuận) | **I** (Nhận URL) | **-** | **R** (Cấp Auth Code) | **-** |
| **Bảo vệ chống CSRF** | **-** | **I** (Truyền state) | **A / R** (Xác minh ký số) | **-** | **-** |
| **Trao đổi Token & Profile** | **-** | **-** | **A / R** (Bảo vệ Client Secret) | **R** (Trả token & User) | **-** |
| **Phân nhánh tài khoản** | **-** | **-** | **A** (Thực thi BR-017, BR-018) | **-** | **R** (Lưu trữ DDL mới) |
| **Phát hành phiên & Vào App** | **I** (Sử dụng /chat) | **R** (Cập nhật Auth State) | **A / R** (Cấp Cookie JWT) | **-** | **-** |

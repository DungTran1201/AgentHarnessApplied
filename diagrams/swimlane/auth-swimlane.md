# Sơ Đồ Swimlane: Quy Trình Xác Thực & Quản Lý Phiên (Authentication Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-001` |
| **Quy Trình Nghiệp Vụ** | `BP-AUTH-001 [PROC-001]`, `BP-AUTH-002 [PROC-002]`, `BP-AUTH-003 [PROC-003]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md), [docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) |
| **Mục Đích** | Phân định trách nhiệm đa làn (Multi-Lane) giữa Người dùng, Giao diện Client, Ingress Gateway, Backend API và Cơ sở dữ liệu |

---

## 1. Biểu Đồ Swimlane Xác Thực Người Dùng

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-01 / ACT-02)"]
        U_RegInput["1. Điền Form đăng ký (Email, Mật khẩu)"]
        U_LoginInput["5. Nhập Email, Mật khẩu đăng nhập"]
        U_Workspace["8. Sử dụng Chat Workspace (/chat)"]
        U_LogoutClick["9. Bấm Đăng xuất từ Menu hồ sơ"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CLIENT (Next.js Web)"]
        F_ValidateReg["2. Validate form Client-side"]
        F_SubmitReg["Gửi POST /api/v1/auth/register"]
        F_RedirectLogin["4. Thông báo đăng ký thành công & sang /login"]
        F_SubmitLogin["6. Gửi POST /api/v1/auth/login"]
        F_SaveState["7. Cập nhật Auth State và chuyển sang /chat"]
        F_SubmitLogout["10. Gửi POST /api/v1/auth/logout"]
        F_ClearCache["12. Xóa trạng thái cache Client và về /login"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API (FastAPI)"]
        B_CheckEmail["3. Kiểm tra email & băm mật khẩu bcrypt"]
        B_VerifyAuth["Xác thực mật khẩu băm & tạo JWT Token 7 ngày"]
        B_SetCookie["Thiết lập Set-Cookie HttpOnly Secure SameSite=Lax"]
        B_RevokeCookie["11. Set-Cookie: access_token=; Max-Age=0"]
    end

    subgraph LaneDB ["LÀN 4: CƠ SỞ DỮ LIỆU (PostgreSQL 16)"]
        DB_InsertUser["Lưu bản ghi users mới (status = ACTIVE)"]
        DB_QueryUser["Truy vấn người dùng theo Email"]
    end

    %% Luồng Đăng ký
    U_RegInput --> F_ValidateReg
    F_ValidateReg --> F_SubmitReg
    F_SubmitReg --> B_CheckEmail
    B_CheckEmail --> DB_InsertUser
    DB_InsertUser --> F_RedirectLogin

    %% Luồng Đăng nhập
    F_RedirectLogin --> U_LoginInput
    U_LoginInput --> F_SubmitLogin
    F_SubmitLogin --> B_VerifyAuth
    B_VerifyAuth --> DB_QueryUser
    DB_QueryUser --> B_SetCookie
    B_SetCookie --> F_SaveState
    F_SaveState --> U_Workspace

    %% Luồng Đăng xuất
    U_Workspace --> U_LogoutClick
    U_LogoutClick --> F_SubmitLogout
    F_SubmitLogout --> B_RevokeCookie
    B_RevokeCookie --> F_ClearCache
    F_ClearCache --> U_LoginInput

    style LaneUser fill:#eff6ff,stroke:#2563eb
    style LaneFrontend fill:#f0fdf4,stroke:#16a34a
    style LaneBackend fill:#fefce8,stroke:#ca8a04
    style LaneDB fill:#fdf2f8,stroke:#db2777
```

---

## 2. Phân Định Trách Nhiệm Từng Làn (Lane Responsibility Matrix)

- **Làn Người dùng**: Cung cấp thông tin xác thực, kích hoạt các sự kiện tương tác.
- **Làn Frontend**: Kiểm tra form hợp lệ, duy trì trạng thái đăng nhập trong ứng dụng, điều hướng trang.
- **Làn Backend**: Thực hiện băm mật khẩu, sinh và giải mã JWT token, kiểm soát Cookie bảo mật.
- **Làn Cơ sở dữ liệu**: Đảm bảo tính toàn vẹn dữ liệu (duy nhất của email) và lưu trữ bền vững.

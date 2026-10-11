# Sơ Đồ BPMN: Quy Trình Đăng Nhập & Cấp Phiên (User Login BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-002` |
| **Quy Trình Nghiệp Vụ** | `BP-AUTH-002 [PROC-002]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-002`), [docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) |
| **Mục Đích** | Mô tả dòng xử lý xác thực thông tin đăng nhập, xác minh mật khẩu và thiết lập Cookie bảo mật phiên làm việc |

---

## 1. Biểu Đồ BPMN Quy Trình Đăng Nhập (PROC-002)

```mermaid
flowchart TD
    StartEvent((Bắt Đầu: Người dùng truy cập /login)) --> InputCreds[Nhập Email và Mật khẩu]
    InputCreds --> ClickLogin[Bấm nút Đăng nhập]
    ClickLogin --> SendLoginReq[Gửi POST /api/v1/auth/login]

    SendLoginReq --> RateCheck{SlowAPI: Kiểm tra Rate Limit đăng nhập?}
    RateCheck -- Vượt ngưỡng (Yes) --> Return429[Trả về HTTP 429: Quá nhiều yêu cầu thử lại]
    Return429 --> EndFail((Kết Thúc: Thất bại))

    RateCheck -- Hợp lệ (No) --> FindUser{D-AUTH-03A: Tìm thấy tài khoản theo Email?}
    
    FindUser -- Không tìm thấy (No) --> Return401[Trả về HTTP 401 Unauthorized: Sai email hoặc mật khẩu]
    Return401 --> ShowToastErr[Hiển thị Toast lỗi chung để chống lộ tài khoản]
    ShowToastErr --> InputCreds

    FindUser -- Tìm thấy (Yes) --> CheckStatus{D-AUTH-04: Tài khoản có trạng thái ACTIVE?}
    CheckStatus -- Bị khóa (No) --> Return403[Trả về HTTP 403 Forbidden: Tài khoản tạm khóa]
    Return403 --> EndFail

    CheckStatus -- ACTIVE (Yes) --> VerifyBcrypt{D-AUTH-03B: bcrypt.checkpw khớp mật khẩu?}
    VerifyBcrypt -- Không khớp (No) --> Return401
    
    VerifyBcrypt -- Khớp (Yes) --> SignJWT[Backend sinh JWT Token: exp=7 ngày, sub=user.id]
    SignJWT --> PackCookie[Đóng gói Set-Cookie: access_token=... HttpOnly, Secure, SameSite=Lax]
    PackCookie --> Return200[Trả về HTTP 200 OK kèm UserProfile cơ bản]
    Return200 --> SaveClientState[Client cập nhật trạng thái đã đăng nhập]
    SaveClientState --> RedirectChat[Chuyển hướng người dùng vào /chat Workspace]
    RedirectChat --> EndSuccess((Kết Thúc: Đăng nhập thành công))

    style StartEvent fill:#dcfce7,stroke:#15803d
    style EndSuccess fill:#dcfce7,stroke:#15803d
    style EndFail fill:#fee2e2,stroke:#b91c1c
    style RateCheck fill:#fef3c7,stroke:#d97706
    style FindUser fill:#fef3c7,stroke:#d97706
    style CheckStatus fill:#fef3c7,stroke:#d97706
    style VerifyBcrypt fill:#fef3c7,stroke:#d97706
```

---

## 2. Bảng Thuyết Minh Rẽ Nhánh Bảo Mật

- **Chống Dò Quét Tài Khoản (User Enumeration Defense)**: Dù không tìm thấy email hay sai mật khẩu, hệ thống đều trả về mã lỗi duy nhất `HTTP 401 Unauthorized` với thông điệp đồng nhất: `"Sai email hoặc mật khẩu"`.
- **Cơ chế thiết lập Cookie an toàn**: JWT token không bao giờ được gửi trong body JSON để tránh việc lưu trữ trong `localStorage`, ngăn chặn triệt để nguy cơ trích xuất token qua lỗ hổng XSS (`ADR-002`, `SEC-004`).

# SƠ ĐỒ QUY TRÌNH ĐĂNG NHẬP & CẤP PHIÊN (LOGIN FLOW)
## BP-AUTH-002 [PROC-002] — User Login & Session Establishment

---

## 1. Sơ Đồ Phân Làn Trách Nhiệm (Swimlane Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-01: Guest / User
    participant UI as ai-frontend (Next.js)
    participant Gateway as Ingress (Nginx)
    participant API as ai-backend (FastAPI)
    participant DB as PostgreSQL 16

    User->>UI: Nhập Email & Mật khẩu tại /login
    User->>UI: Bấm "Đăng nhập"
    
    UI->>Gateway: POST /api/v1/auth/login
    Gateway->>Gateway: Kiểm tra Rate Limit (10 req/s)
    Gateway->>API: Proxy tới Backend
    
    API->>API: Backend Rate Limit (60 req/min/IP)
    API->>DB: SELECT * FROM users WHERE email = :email
    DB-->>API: Trả về bản ghi User (kèm hashed_password, status)
    
    alt Không tìm thấy User HOẶC Mật khẩu không khớp
        API-->>Gateway: HTTP 401 Unauthorized ("Email hoặc mật khẩu không chính xác")
        Gateway-->>UI: HTTP 401 Unauthorized
        UI-->>User: Hiển thị lỗi xác thực
    else Thông tin hợp lệ
        alt Tài khoản bị khóa (status != ACTIVE)
            API-->>Gateway: HTTP 403 Forbidden ("Tài khoản đã bị tạm khóa")
            Gateway-->>UI: HTTP 403 Forbidden
            UI-->>User: Hiển thị thông báo tài khoản bị khóa
        else Tài khoản hợp lệ
            API->>API: Ký tạo JWT Token (exp = 7 ngày)
            API->>API: Thiết lập HttpOnly, Secure, SameSite=Lax Cookie (SEC-004)
            API-->>Gateway: HTTP 200 OK + Set-Cookie: access_token=... + Profile Data
            Gateway-->>UI: HTTP 200 OK + Set-Cookie
            UI->>UI: Cập nhật User State trong ứng dụng
            UI-->>User: Điều hướng vào không gian làm việc chính (/chat)
        end
    end
```

---

## 2. Sơ Đồ Luồng Logic Nghiệp Vụ (Flowchart)

```mermaid
flowchart TD
    Start([Bắt đầu: Gửi thông tin Login]) --> CheckLimiter{Kiểm tra Rate Limit?}
    
    CheckLimiter -- Vượt định mức --> Return429[HTTP 429: Too Many Requests] --> EndFail([Kết thúc lỗi])
    
    CheckLimiter -- Đạt --> QueryUser[(Tra cứu User theo Email)]
    
    QueryUser --> VerifyPass{Mật khẩu khớp bcrypt?}
    
    VerifyPass -- Không khớp --> Return401[HTTP 401: Sai email/mật khẩu] --> EndFail
    
    VerifyPass -- Khớp --> CheckStatus{Trạng thái ACTIVE?}
    
    CheckStatus -- Bị khóa --> Return403[HTTP 403: Tài khoản bị khóa] --> EndFail
    
    CheckStatus -- Hoạt động --> SignJWT[Tạo JWT Access Token 7 ngày]
    SignJWT --> PackCookie[Đóng gói HttpOnly Cookie]
    PackCookie --> Return200[HTTP 200 OK + Profile Data]
    Return200 --> RedirectChat[Chuyển hướng người dùng sang /chat] --> EndSuccess([Kết thúc thành công])

    style Start fill:#2b6cb0,stroke:#2c5282,color:#fff
    style EndSuccess fill:#2f855a,stroke:#276749,color:#fff
    style EndFail fill:#c53030,stroke:#9b2c2c,color:#fff
```

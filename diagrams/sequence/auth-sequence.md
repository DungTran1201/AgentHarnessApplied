# Sơ Đồ Tuần Tự: Xác Thực & Khởi Tạo Phiên (Authentication Sequence Diagrams)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-001` |
| **Mã Kịch Bản** | `SEQ-001`, `SEQ-002` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) |
| **Mục Đích** | Mô tả chi tiết trình tự trao đổi thông điệp mạng giữa Client, Ingress Nginx, Backend FastAPI và PostgreSQL trong quá trình đăng ký và đăng nhập |

---

## 1. SEQ-001: Trình Tự Đăng Ký Tài Khoản & Băm Mật Khẩu

```mermaid
sequenceDiagram
    autonumber
    actor Guest as ACT-01: Guest
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16

    Guest->>UI: Điền Form đăng ký (email, password, full_name)
    UI->>Nginx: POST /api/v1/auth/register
    Nginx->>Backend: Proxy request qua mạng nội bộ
    Backend->>Backend: Pydantic validate schema đầu vào
    Backend->>DB: SELECT id FROM users WHERE email = :email
    DB-->>Backend: None (Email chưa tồn tại)
    Backend->>Backend: bcrypt.hashpw(password, gensalt())
    Backend->>DB: INSERT INTO users (id, email, hashed_password, status='ACTIVE')
    DB-->>Backend: Bản ghi đã lưu thành công
    Backend-->>Nginx: HTTP 201 Created (UserProfile)
    Nginx-->>UI: HTTP 201 Created
    UI-->>Guest: Thông báo 'Đăng ký thành công!' & chuyển sang /login
```

---

## 2. SEQ-002: Trình Tự Đăng Nhập & Cấp Phát HttpOnly Cookie

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-01/02
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16

    User->>UI: Nhập Email & Mật khẩu -> Bấm 'Đăng nhập'
    UI->>Nginx: POST /api/v1/auth/login
    Nginx->>Backend: Proxy request qua mạng nội bộ
    Backend->>DB: SELECT * FROM users WHERE email = :email
    DB-->>Backend: Trả về User record (kèm hashed_password, status)
    Backend->>Backend: bcrypt.checkpw(password, hashed_password)
    Backend->>Backend: Ký tạo JWT token (exp = 7 ngày, sub = user.id)
    Backend-->>Nginx: HTTP 200 OK + Set-Cookie: access_token=... (HttpOnly, Secure, SameSite=Lax)
    Nginx-->>UI: HTTP 200 OK + Set-Cookie
    UI->>UI: Lưu profile và cập nhật Auth State
    UI-->>User: Điều hướng tự động vào giao diện /chat Workspace
```

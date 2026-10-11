# SƠ ĐỒ QUY TRÌNH ĐĂNG KÝ TÀI KHOẢN (REGISTRATION FLOW)
## BP-AUTH-001 [PROC-001] — User Registration

---

## 1. Sơ Đồ Phân Làn Trách Nhiệm (Swimlane Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Guest as ACT-01: Guest
    participant UI as ai-frontend (Next.js)
    participant Gateway as Ingress (Nginx)
    participant API as ai-backend (FastAPI)
    participant DB as PostgreSQL 16

    Guest->>UI: Truy cập /register & nhập thông tin (Email, Name, Pass)
    Guest->>UI: Nhấn "Đăng ký tài khoản"
    
    UI->>UI: Client Validation (email định dạng hợp lệ, pass >= 6 ký tự)
    
    alt Dữ liệu không hợp lệ tại Client
        UI-->>Guest: Báo lỗi trực tiếp trên giao diện
    else Dữ liệu hợp lệ
        UI->>Gateway: POST /api/v1/auth/register (JSON)
        Gateway->>Gateway: Kiểm tra Rate Limit (Tối đa 10 req/s)
        
        alt Vượt định mức Rate Limit
            Gateway-->>UI: HTTP 429 Too Many Requests
            UI-->>Guest: Báo lỗi "Bạn thao tác quá nhanh"
        else Trong định mức
            Gateway->>API: Proxy request tới Backend
            API->>API: Pydantic Validation schema
            API->>DB: SELECT id FROM users WHERE email = :email
            DB-->>API: Kết quả truy vấn
            
            alt Email đã tồn tại
                API-->>Gateway: HTTP 400 Bad Request ("Email đã tồn tại")
                Gateway-->>UI: HTTP 400 Bad Request
                UI-->>Guest: Hiển thị thông báo email đã được đăng ký
            else Email chưa tồn tại
                API->>API: Băm mật khẩu an toàn với bcrypt (SEC-002)
                API->>DB: INSERT INTO users (email, full_name, hashed_password, status)
                DB-->>API: Xác nhận bản ghi mới (id, email, full_name, ACTIVE)
                API-->>Gateway: HTTP 201 Created (User Data)
                Gateway-->>UI: HTTP 201 Created
                UI-->>Guest: Thông báo "Đăng ký thành công!" & chuyển sang /login
            end
        end
    end
```

---

## 2. Sơ Đồ Luồng Logic Nghiệp Vụ (BPMN / Flowchart)

```mermaid
flowchart TD
    Start([Bắt đầu: Khách bấm Đăng ký]) --> ValidateClient{Hợp lệ tại Client?}
    
    ValidateClient -- Không --> ShowClientError[Hiển thị lỗi form trên UI] --> EndFail([Kết thúc lỗi])
    
    ValidateClient -- Có --> CheckRateLimit{Kiểm tra Rate Limit?}
    
    CheckRateLimit -- Vượt mức --> Return429[Trả về HTTP 429] --> EndFail
    
    CheckRateLimit -- Đạt --> CheckEmail{Email đã tồn tại?}
    
    CheckEmail -- Có --> Return400[Trả về HTTP 400: Email trùng] --> EndFail
    
    CheckEmail -- Không --> HashPass[Băm mật khẩu bằng bcrypt]
    HashPass --> InsertDB[(Ghi bản ghi vào PostgreSQL)]
    InsertDB --> Return201[Trả về HTTP 201 Created]
    Return201 --> RedirectLogin[Chuyển hướng người dùng sang /login] --> EndSuccess([Kết thúc thành công])

    style Start fill:#2b6cb0,stroke:#2c5282,color:#fff
    style EndSuccess fill:#2f855a,stroke:#276749,color:#fff
    style EndFail fill:#c53030,stroke:#9b2c2c,color:#fff
```

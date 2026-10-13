# ĐẶC TẢ MÁY TRẠNG THÁI HÀNH VI (STATE MACHINES SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BEH-STATE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô hình hóa máy trạng thái hữu hạn cho các thực thể Hội thoại, Tin nhắn và Phiên làm việc |

---

## 1. STATE-001: Vòng Đời Trạng Thái Cuộc Trò Chuyện (Conversation Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> NEW: POST /conversations (Tiêu đề: "Cuộc trò chuyện mới")
    
    NEW --> ACTIVE: Gửi tin nhắn đầu tiên (Đổi tên tự động theo BR-004)
    
    state ACTIVE {
        IDLE: Sẵn sàng nhận câu hỏi mới
        PROCESSING: Đang stream phản hồi từ AI
        
        IDLE --> PROCESSING: Người dùng submit tin nhắn
        PROCESSING --> IDLE: AI hoàn tất stream hoặc gặp lỗi
    }

    NEW --> DELETED: DELETE /conversations/:id
    ACTIVE --> DELETED: DELETE /conversations/:id
    
    DELETED --> [*]: Dữ liệu bị xóa vĩnh viễn khỏi CSDL
```

---

## 2. STATE-002: Vòng Đời Tin Nhắn Đàm Thoại (Message Delivery Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Nhận prompt tại Controller

    PENDING --> STREAMING: Kết nối SSE mở & token đầu tiên nhận được
    PENDING --> FAILED: Cả 2 nhà cung cấp AI đều lỗi (Total Outage)

    STREAMING --> STREAMING: Nhận tiếp tục các chunk token
    STREAMING --> COMPLETED: Nhận event 'done' & lưu toàn bộ phản hồi vào CSDL
    STREAMING --> ABORTED: Người dùng ngắt kết nối / bấm Stop Generation

    COMPLETED --> [*]
    FAILED --> [*]
    ABORTED --> [*]
```

---

## 3. STATE-003: Vòng Đời Phiên Xác Thực Người Dùng (Session Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> UNAUTHENTICATED: Người dùng truy cập chưa có Cookie

    UNAUTHENTICATED --> AUTHENTICATED: Đăng nhập thành công -> Cấp HttpOnly Cookie 7 ngày
    
    AUTHENTICATED --> REVOKED: Người dùng bấm Đăng xuất (Set-Cookie Max-Age=0)
    AUTHENTICATED --> EXPIRED: Quá 7 ngày không làm việc (JWT Expired)

    REVOKED --> UNAUTHENTICATED
    EXPIRED --> UNAUTHENTICATED
```

---

## 4. STATE-004: Vòng Đời Trạng Thái Mô Hình Agent Mở Rộng (Agent Model Extended Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> INACTIVE: Đăng ký mô hình mới qua POST /models (OP-022, BR-022, BR-024)

    INACTIVE --> TESTING: Người dùng nhấn "Kiểm tra kết nối" (Ping)
    TESTING --> INACTIVE: Ping thất bại (Thiếu API Key hoặc lỗi kết nối)
    TESTING --> ACTIVE: Kiểm tra thành công & Bấm Kích hoạt (BR-014)

    INACTIVE --> ACTIVE: PATCH /models/:id/activate (Khi đã có API Key trong .env)
    ACTIVE --> INACTIVE: PATCH /models/:id/deactivate (Điều kiện: Không phải Default Model - BR-013)

    ACTIVE --> DEGRADED: Gặp lỗi 429 Quota Exceeded hoặc 5xx liên tiếp 3 lần (BR-015)
    DEGRADED --> ACTIVE: Health ping nền định kỳ thành công trở lại
    DEGRADED --> INACTIVE: Người dùng chủ động tạm tắt (Deactivate)

    INACTIVE --> ARCHIVED: DELETE /models/:id (Xóa mềm - FR-039, Điều kiện: is_default != true - BR-023)
    ACTIVE --> ARCHIVED: Chặn nếu is_default == true; Cho phép nếu không phải mặc định (BR-023)
    DEGRADED --> ARCHIVED: Chuyển vào lưu trữ khi mô hình bị ngừng cung cấp

    ARCHIVED --> INACTIVE: Khôi phục mô hình từ lưu trữ (Restore Model)

    note right of ARCHIVED
        Xóa mềm an toàn: không xóa cứng CSDL (BR-012).
        Loại khỏi danh mục chọn đàm thoại của Agent.
        Bảo toàn toàn vẹn khóa ngoại với messages và metrics.
        Nghiêm cấm xóa/lưu trữ nếu đang là Default Model (BR-023).
    end note

    note right of ACTIVE
        Sẵn sàng đàm thoại.
        Tham gia chuỗi điều phối LangGraph (ADR-005).
        Ít nhất 1 model duy trì is_default = true (BR-013, BR-023).
    end note
```

---

## 5. STATE-005: Vòng Đời Hạn Ngạch Quota Người Dùng (User Quota Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> NORMAL: Khởi tạo người dùng mới (daily_tokens_used = 0)

    state NORMAL {
        [*] --> COMFORTABLE: daily_tokens_used < 80% daily_token_limit
        COMFORTABLE --> WARNING_80: daily_tokens_used >= 80% (BR-020: Banner cảnh báo màu cam)
        WARNING_80 --> COMFORTABLE: Sang ngày mới UTC (Reset hạn ngạch tự động)
    }

    NORMAL --> EXHAUSTED: daily_tokens_used >= daily_token_limit (BR-020: Chặn HTTP 429)
    
    EXHAUSTED --> NORMAL: 00:00 UTC Tự động Reset daily_tokens_used = 0
    EXHAUSTED --> NORMAL: Quản trị viên cấp thêm quota (Admin Quota Top-up)

    note right of EXHAUSTED
        Mọi yêu cầu gọi LLM tiếp theo bị từ chối với HTTP 429 Too Many Requests
        Header Retry-After trả về thời gian chờ reset
    end note
```

---

## 6. STATE-006: Vòng Đời Liên Kết Danh Tính Discord (Discord Identity Association Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> UNLINKED: Người dùng đăng ký bằng Email / Mật khẩu (discord_id IS NULL)
    [*] --> LINKED_NO_PASSWORD: Người dùng đăng ký qua Discord OAuth2 (hashed_password IS NULL - BR-018)

    UNLINKED --> AUTHORIZING: Nhấn "Liên kết Discord" (GET /auth/discord/link, action=link - OP-026)
    
    AUTHORIZING --> LINKED_WITH_PASSWORD: Phê duyệt OAuth & Callback thành công (BR-025, OP-027)
    AUTHORIZING --> UNLINKED: Người dùng hủy cấp quyền HOẶC xung đột tài khoản khác (HTTP 409 - BR-025)

    state LINKED_NO_PASSWORD {
        [*] --> PASS_MISSING: discord_id hợp lệ, hashed_password NULL
        PASS_MISSING --> PASS_CONFIGURED: Thiết lập mật khẩu tại tab Bảo mật (PUT /users/me/password)
    }

    PASS_CONFIGURED --> LINKED_WITH_PASSWORD: Tài khoản có cả Discord và Mật khẩu

    state LINKED_WITH_PASSWORD {
        [*] --> IDLE_LINKED: Hoạt động bình thường
        IDLE_LINKED --> REAUTH_MODAL: Bấm "Hủy liên kết" (Mở modal xác thực mật khẩu - BR-027)
        REAUTH_MODAL --> IDLE_LINKED: Hủy modal / Nhập sai mật khẩu (HTTP 401)
    }

    LINKED_NO_PASSWORD --> UNLINK_BLOCKED: Cố tình gọi DELETE /users/me/discord
    note right of UNLINK_BLOCKED
        Chốt chặn chống khóa tài khoản (BR-026):
        Bị từ chối ngay với HTTP 400 Bad Request
        Bắt buộc thiết lập mật khẩu trước!
    end note
    UNLINK_BLOCKED --> LINKED_NO_PASSWORD: Đóng cảnh báo

    REAUTH_MODAL --> UNLINKED: Xác thực mật khẩu đúng -> DELETE /users/me/discord (OP-028, discord_id=NULL)

    note right of LINKED_WITH_PASSWORD
        Tài khoản an toàn: Đã có mật khẩu
        Cho phép hủy liên kết khi vượt qua Re-auth (BR-027)
    end note
```

---

## 7. STATE-007: Máy Trạng Thái Cấu Hình & Vận Hành Bot Discord (DIAG-STATE-009)

```mermaid
stateDiagram-v2
    [*] --> UNCONFIGURED: Tài khoản đã liên kết Discord (BR-031)

    UNCONFIGURED --> CONFIGURING: Truy cập /bot/discord & Chọn Guild (OP-033, BR-034)
    CONFIGURING --> ACTIVE_LISTENING: Lưu cấu hình thành công với is_enabled=true & Model ACTIVE (OP-032, BR-033)
    CONFIGURING --> UNCONFIGURED: Hủy bỏ thao tác cấu hình

    state ACTIVE_LISTENING {
        [*] --> READY_DISPATCH: Bot sẵn sàng lắng nghe & điều phối
        READY_DISPATCH --> PROCESSING_DISPATCH: Tiếp nhận tương tác (Ed25519 valid - SEC-013)
        PROCESSING_DISPATCH --> READY_DISPATCH: Phản hồi thành công (<= 300ms, trừ Quota & Sync Web) (FR-047, NFR-025)
    }

    ACTIVE_LISTENING --> PAUSED_DISABLED: Tắt bot qua form cấu hình (is_enabled = false - OP-032)
    PAUSED_DISABLED --> ACTIVE_LISTENING: Bật lại bot qua form cấu hình (is_enabled = true - OP-032)

    ACTIVE_LISTENING --> THROTTLED_QUOTA: Hạn ngạch chạm trần 100% (used_tokens >= total_limit - BR-032)
    note right of THROTTLED_QUOTA
        Bất biến Quota dùng chung (BR-032):
        Từ chối xử lý tương tác Discord với HTTP 429
        Tự động mở khóa khi reset hạn ngạch lúc 00:00 UTC
    end note
    THROTTLED_QUOTA --> ACTIVE_LISTENING: Reset hạn ngạch ngày mới (used_tokens = 0)

    ACTIVE_LISTENING --> FAILOVER_ROUTING: Model active gặp sự cố / Timeout
    note right of FAILOVER_ROUTING
        Cơ chế Failover (BR-033, ADR-012):
        Tự động chuyển tiếp prompt về model mặc định (is_default = 1)
    end note
    FAILOVER_ROUTING --> ACTIVE_LISTENING: Model active phục hồi HOẶC người dùng cập nhật model mới (OP-032)
```







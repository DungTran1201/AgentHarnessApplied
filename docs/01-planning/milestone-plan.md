# KẾ HOẠCH CÁC CỘT MỐC DỰ ÁN (MILESTONE PLAN)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `MLS-PLAN-001` |
| **Mục đích** | Thiết lập các cột mốc kiểm chứng được (Verifiable Milestones) phản ánh trạng thái tiến độ thực tế của hệ thống |
| **Nguyên tắc** | Một milestone chỉ được công nhận hoàn thành khi thỏa mãn đầy đủ các tiêu chí thoát (Exit Criteria) có bằng chứng |

---

## 1. Sơ Đồ Tiến Trình Các Cột Mốc (Milestones Roadmap)

```text
M01: Architecture & Design Ready
  │ (Hợp đồng API, DB Schema, SAD hoàn tất)
  ▼
M02: Identity & Security Core Ready
  │ (Đăng ký, Đăng nhập, JWT Middleware vận hành)
  ▼
M03: Conversation Management Ready
  │ (CRUD Conversation, Cách ly dữ liệu, Sidebar UI)
  ▼
M04: AI Chat & Failover Engine Ready (MVP Core)
  │ (Gửi nhận chat, Streaming, Markdown, Fallback Gemini -> OpenAI)
  ▼
M05: Production Release Candidate
    (Hardening, HTTPS TLS 1.3, Rate limit, Tải 100 users, Runbook)
```

---

## 2. Đặc Tả Chi Tiết Từng Cột Mốc (Milestone Specifications)

---

### M01: Kiến Trúc & Thiết Kế Hoàn Tất (Architecture & Design Baseline Ready)

- **Mã Cột Mốc**: `M01`
- **Mục Tiêu**: Hoàn tất toàn bộ tài liệu kỹ thuật nền tảng (SAD, OpenAPI 3.1, DB Design, Threat Model, Master Test Plan).
- **Các Năng Lực Bao Gồm**: `CAP-FOUNDATION`.
- **Sản Phẩm Bàn Giao (Deliverables)**:
  - `docs/07-architecture/system-architecture-document.md`
  - `docs/08-api/openapi.yaml`
  - `docs/05-domain/database-design.md`
  - `docs/10-security/threat-model.md`
  - `docs/11-testing/test-plan.md`
- **Tiêu Chí Chấp Nhận (Acceptance Criteria)**:
  - 100% các endpoint trong SRS đều có schema trong OpenAPI.
  - Sơ đồ quan hệ cơ sở dữ liệu đã chuẩn hóa, không có khóa ngoại mồ côi.
  - Bộ kiểm tra tự động `tools/validators/run_all.py` chạy thành công không có lỗi.
- **Tiêu Chí Thoát Mốc (Exit Criteria)**: Đạt **Quality Gate G2 (Design Ready)**; được phê duyệt bởi Solution Architect và Tech Lead.
- **Phụ Thuộc (Dependencies)**: Hoàn tất phê duyệt Giai đoạn Planning.

---

### M02: Phân Hệ Định Danh & Xác Thực Sẵn Sàng (Identity & Security Core Ready)

- **Mã Cột Mốc**: `M02`
- **Mục Tiêu**: Người dùng có thể đăng ký tài khoản mới, đăng nhập nhận JWT Token an toàn và truy cập các API được bảo vệ.
- **Các Năng Lực Bao Gồm**: `CAP-AUTH`, `CAP-SEC-PERF`.
- **Sản Phẩm Bàn Giao (Deliverables)**:
  - Mã nguồn Backend xác thực (`ai-backend/src/api/v1/auth.py`, `security.py`).
  - Giao diện người dùng Đăng ký & Đăng nhập (`ai-frontend/src/app/login/`, `register/`).
  - Bộ kiểm thử tự động `tests/test_auth.py`.
- **Tiêu Chí Chấp Nhận (Acceptance Criteria)**:
  - Thỏa mãn toàn diện tiêu chí nghiệm thu `AC-001`.
  - Mật khẩu băm an toàn trong PostgreSQL, không xuất hiện mật khẩu trần trong log.
- **Tiêu Chí Thoát Mốc (Exit Criteria)**: Toàn bộ test case xác thực chạy pass 100%; Middleware xác thực hoạt động ổn định trên Backend.
- **Phụ Thuộc (Dependencies)**: `M01`.

---

### M03: Quản Lý Phiên Hội Thoại Sẵn Sàng (Conversation Management Ready)

- **Mã Cột Mốc**: `M03`
- **Mục Tiêu**: Người dùng có thể tạo phiên chat mới, đổi tên, xem danh sách cuộc trò chuyện trên Sidebar và xóa cuộc trò chuyện.
- **Các Năng Lực Bao Gồm**: `CAP-CONV`.
- **Sản Phẩm Bàn Giao (Deliverables)**:
  - API CRUD Conversation tại Backend (`/api/v1/conversations`).
  - Component Sidebar trên Next.js kết nối trực tiếp với API.
  - Bộ kiểm thử an ninh phân quyền `tests/test_conversation_ownership.py`.
- **Tiêu Chí Chấp Nhận (Acceptance Criteria)**:
  - Thỏa mãn tiêu chí nghiệm thu `AC-002`.
  - Tuân thủ quy tắc cô lập dữ liệu `BR-002`: Tuyệt đối không cho phép truy cập chéo dữ liệu giữa các tài khoản.
- **Tiêu Chí Thoát Mốc (Exit Criteria)**: Thao tác mượt mà trên giao diện người dùng; 100% test case kiểm thử phân quyền vượt qua.
- **Phụ Thuộc (Dependencies)**: `M02`.

---

### M04: Trợ Lý Ảo Chatbot MVP Hoàn Chỉnh (AI Chat & Failover Engine Ready)

- **Mã Cột Mốc**: `M04`
- **Mục Tiêu**: Người dùng có thể đàm thoại liên tục với AI, nhận phản hồi streaming mượt mà, kết xuất Markdown/Code và tự động fallback sang OpenAI khi Gemini gặp sự cố.
- **Các Năng Lực Bao Gồm**: `CAP-CHAT-AI`.
- **Sản Phẩm Bàn Giao (Deliverables)**:
  - Pipeline lưu vết tin nhắn và API Streaming SSE `/api/v1/chat/stream`.
  - Module failover tự động trong `ai-backend/llm/client.py`.
  - Giao diện chat hoàn chỉnh với syntax highlighting trên Frontend.
  - Bộ kiểm thử giả lập lỗi nhà cung cấp `tests/test_llm_fallback.py`.
- **Tiêu Chí Chấp Nhận (Acceptance Criteria)**:
  - Thỏa mãn tiêu chí nghiệm thu `AC-003` và `AC-004`.
  - Độ trễ ký tự đầu tiên (TTFT) < 2.0s theo `NFR-PERF-02`.
- **Tiêu Chí Thoát Mốc (Exit Criteria)**: Người dùng thực hiện hội thoại thực tế trôi chảy; kiểm thử giả lập lỗi Gemini kích hoạt thành công OpenAI mà không làm đứt kết nối người dùng.
- **Phụ Thuộc (Dependencies)**: `M03`.

---

### M05: Sẵn Sàng Phát Hành Sản Phẩm (Production Release Candidate)

- **Mã Cột Mốc**: `M05`
- **Mục Tiêu**: Hệ thống được đóng gói an toàn trong cụm Docker Compose, kích hoạt HTTPS TLS 1.3, vượt qua kiểm thử tải 100 users, hoàn thiện tài liệu vận hành.
- **Các Năng Lực Bao Gồm**: `CAP-OPS`, `CAP-SEC-PERF`.
- **Sản Phẩm Bàn Giao (Deliverables)**:
  - Cấu hình hạ tầng `ai-infra/compose/docker-compose.prod.yml`.
  - Báo cáo kiểm toán an ninh `docs/10-security/security-audit-report.md`.
  - Báo cáo kiểm thử tải `docs/11-testing/load-test-results.md`.
  - Sổ tay vận hành `docs/12-operations/runbook.md` & `rollback-plan.md`.
- **Tiêu Chí Chấp Nhận (Acceptance Criteria)**:
  - Thỏa mãn tiêu chí nghiệm thu `AC-005`.
  - Chịu tải đồng thời 100 concurrent users với tỷ lệ lỗi < 1%.
  - 0 lỗ hổng an ninh nghiêm trọng; rate limiting hoạt động chuẩn xác ở cả 2 tầng.
- **Tiêu Chí Thoát Mốc (Exit Criteria)**: Đạt **Quality Gate G6 (Release Ready)**; được phê duyệt chính thức để đưa vào khai thác sản xuất.
- **Phụ Thuộc (Dependencies)**: `M04`.

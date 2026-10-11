# Chiến Lược Kiểm Thử Phần Mềm (Test Strategy)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `TST-STRAT-001` |
| **Giai đoạn** | **Phase 12 — Testing & Quality Engineering** |
| **Canonical Model** | `models/testing/testing.yaml` |
| **Phụ thuộc Thượng nguồn** | `02-requirements`, `06-architecture`, `08-api`, `10-security` |
| **Trạng thái** | **BASELINED** |

---

## 1. Mục Tiêu & Phạm Vi Kiểm Thử (Testing Objectives & Scope)

Chiến lược kiểm thử của hệ thống AI-Chan đảm bảo:
1. **Tính Đúng Đắn Về Nghiệp Vụ**: Đảm bảo tất cả các chức năng đăng ký, đăng nhập, quản lý hội thoại và trò chuyện hoạt động đúng đặc tả yêu cầu (`FR-001` - `FR-014`).
2. **Tính Ổn Định Của Dòng Chảy Thời Gian Thực**: Đảm bảo truyền luồng SSE mượt mà, không rò rỉ bộ nhớ, xử lý đúng ngắt kết nối mạng (`FR-013`).
3. **Khả Năng Chịu Lỗi Của Cổng AI**: Đảm bảo cơ chế tự động chuyển đổi dự phòng (Failover) từ Gemini sang OpenAI hoạt động thông suốt (`ADR-003`).
4. **An Ninh & Cách Ly Dữ Liệu**: Đảm bảo tuyệt đối không có lỗ hổng rò rỉ dữ liệu chéo người dùng (IDOR) và không bị tấn công XSS/CSRF (`SEC-001` - `SEC-005`).

---

## 2. Kim Tự Tháp Kiểm Thử (Testing Pyramid)

```
        / \
       /   \        E2E Testing (Playwright / Cypress)
      / E2E \       - Luồng trọn vẹn: Đăng ký -> Chat -> Nhận SSE -> Stop
     /-------\
    /         \     Integration Testing (pytest + httpx / TestClient)
   / Integrat. \    - API Endpoints, Database CRUD, Session Cookie, Failover
  /-------------\
 /               \  Unit Testing (pytest / vitest)
/   Unit Tests    \ - Value Objects, Hash Password, Token Parser, Sliding Window
-------------------
```

### 2.1. Kiểm Thử Đơn Vị (Unit Testing)
- **Công cụ**: `pytest` (Backend Python), `vitest` (Frontend Next.js).
- **Phạm vi**:
  - Backend: Băm mật khẩu bcrypt, tạo và giải mã JWT token, trích xuất ngữ cảnh trượt 20 tin nhắn gần nhất (`INV-04`), tính toán bộ đếm ký tự.
  - Frontend: Format thời gian, bộ lọc khử độc Markdown chống XSS (`SEC-003`), hook quản lý auto-scroll.
- **Tiêu chuẩn chất lượng**: Code Coverage đạt tối thiểu >= 80% logic nghiệp vụ cốt lõi.

### 2.2. Kiểm Thử Tích Hợp (Integration Testing)
- **Công cụ**: `pytest` kết hợp `httpx.AsyncClient` và Database PostgreSQL test container.
- **Phạm vi**:
  - Xác thực phiên làm việc: Kiểm tra Cookie HttpOnly, Secure, SameSite=Lax (`SEC-001`).
  - Kiểm tra cách ly dữ liệu: Đảm bảo User A không thể đọc/sửa/xóa conversation của User B (`SEC-002`, `CTRL-002`).
  - Mocking LLM Gateway: Sử dụng `respx` hoặc `unittest.mock` để mô phỏng phản hồi 200 chunked SSE, phản hồi 429 Rate Limit từ Gemini để kích hoạt Failover sang OpenAI.

### 2.3. Kiểm Thử Đầu-Cuối (End-to-End Testing)
- **Công cụ**: `Playwright`.
- **Phạm vi**:
  - Chạy trên trình duyệt headless Chromium/Firefox.
  - Kiểm tra luồng hoàn chỉnh: Tạo tài khoản -> Đăng nhập -> Gõ prompt -> Kiểm tra hiển thị từng chữ chạy mượt mà -> Nhấn Stop stream -> Đổi tên hội thoại -> Xóa hội thoại.

---

## 3. Quản Lý Dữ Liệu Kiểm Thử & Môi Trường (Test Data & Environment)

- **Môi Trường Kiểm Thử Tự Động (CI Environment)**:
  - Docker Compose chạy Postgres độc lập (`ai-chan-test-db`), database được làm sạch (Truncate tables) trước mỗi test suite.
  - Cấu hình Mock LLM Providers để tránh tiêu tốn chi phí và phụ thuộc vào kết nối mạng bên ngoài trong CI.
- **Môi Trường Staging**:
  - Sử dụng API Key thực tế với hạn ngạch thử nghiệm thấp (Testing Quota).

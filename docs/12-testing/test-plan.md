# Kế Hoạch Kiểm Thử Chi Tiết (Test Plan)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `TST-PLAN-001` |
| **Giai đoạn** | **Phase 12 — Testing & Quality Engineering** |
| **Canonical Model** | `models/testing/testing.yaml` |
| **Phụ thuộc Thượng nguồn** | `01-planning`, `02-requirements`, `08-api` |
| **Trạng thái** | **BASELINED** |

---

## 1. Tiêu Chí Vào & Tiêu Chí Ra (Entry & Exit Criteria)

### 1.1. Tiêu Chí Vào (Entry Criteria)
- Tất cả tài liệu yêu cầu (`02-requirements`), API contract (`08-api`), và bảo mật (`10-security`) đã được baseline.
- Môi trường thử nghiệm Docker Compose cục bộ hoạt động bình thường với đầy đủ 3 services: Frontend, Backend, Database.
- Database Test migrations thực thi không phát sinh lỗi schema.

### 1.2. Tiêu Chí Ra (Exit Criteria)
- 100% các Test Case mức độ nghiêm trọng `P0` (Critical) vượt qua (`PASSED`).
- Không còn bất kỳ lỗi bảo mật nghiêm trọng (P0/P1) về cách ly dữ liệu (`SEC-002`) hoặc XSS (`SEC-003`).
- Tỷ lệ vượt qua tổng thể của toàn bộ Test Suite đạt tối thiểu `>= 95%`.
- Toàn bộ kết quả kiểm thử được tự động ghi nhận vào báo cáo CI.

---

## 2. Kế Hoạch Phân Bổ Các Giai Đoạn Kiểm Thử (Test Execution Phases)

| Giai Đoạn Kiểm Thử | Mục Tiêu Chính | Bộ Test Case Liên Quan | Công Cụ & Môi Trường |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Smoke & Sanity Test** | Kiểm tra khởi động service, kết nối DB, kiểm tra healthcheck `/api/v1/health`. | `TC-001`, `TC-003`, `TC-007` | Pytest / Docker Local |
| **Giai đoạn 2: API & Integration Test** | Kiểm thử toàn bộ hợp đồng API, mã phản hồi HTTP, xác thực Cookie, phân trang cursor. | `TC-001` đến `TC-010` | Pytest + AsyncClient |
| **Giai đoạn 3: Security & Isolation Test** | Kiểm tra bảo mật chống IDOR, CSRF, Rate Limiting, XSS Sanitization. | `TC-011`, `TC-014`, `TC-015` | Pytest Security Suite |
| **Giai đoạn 4: Real-Time Stream & Failover**| Kiểm tra truyền luồng SSE, ngắt luồng Client Abort, và Failover Gemini -> OpenAI. | `TC-012`, `TC-013` | Pytest SSE Client + Mock |
| **Giai đoạn 5: UI & E2E Acceptance Test** | Kiểm tra trải nghiệm người dùng, bố cục responsive, auto-scroll trên trình duyệt. | `TC-001` - `TC-015` E2E | Playwright Headless |

---

## 3. Quản Lý Rủi Ro Kiểm Thử (Testing Risks & Mitigation)

1. **Rủi ro cạn kiệt Quota API AI bên thứ ba trong quá trình test**:
   - *Biện pháp*: 100% kiểm thử tự động CI phải sử dụng Mock LLM Gateway. Chỉ thực hiện kiểm thử E2E trên Staging với các kịch bản quan trọng.
2. **Rủi ro rò rỉ dữ liệu giữa các lần chạy test**:
   - *Biện pháp*: Mỗi hàm test hoặc test class sử dụng database transaction rollback hoặc truncate table độc lập.

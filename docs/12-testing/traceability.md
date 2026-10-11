# Ma Trận Truy Vết Kiểm Thử (Testing Traceability Matrix)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `TST-TRC-001` |
| **Giai đoạn** | **Phase 12 — Testing & Quality Engineering** |
| **Trạng thái** | **BASELINED** |

---

## 1. Ma Trận Ánh Xạ Ca Kiểm Thử (TC) với Yêu Cầu Chức Năng, Tiêu Chí Nghiệm Thu & Kiểm Soát An Ninh

| Mã Ca Kiểm Thử | Tên Ca Kiểm Thử | Yêu Cầu FRS / NFR | Tiêu Chí Nghiệm Thu | Use Cases | API Contract / Control | Loại Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-001` | Đăng ký tài khoản thành công | `FR-001` | `AC-001` | `UC-001` | `API-001` | Integration |
| `TC-002` | Đăng ký thất bại khi trùng email | `FR-001` | `AC-001` | `UC-001` | `API-001` | Integration |
| `TC-003` | Đăng nhập thành công và cấp HttpOnly Cookie | `FR-002` | `AC-002` | `UC-002` | `API-002`, `CTRL-001` | Integration |
| `TC-004` | Đăng nhập thất bại sai thông tin | `FR-002` | `AC-002` | `UC-002` | `API-002` | Integration |
| `TC-005` | Đăng xuất và thu hồi Cookie JWT | `FR-003` | `AC-002` | `UC-003` | `API-003`, `CTRL-001` | Integration |
| `TC-006` | Lấy profile người dùng hiện hành | `FR-004` | `AC-002` | `UC-003` | `API-004` | Integration |
| `TC-007` | Tạo cuộc trò chuyện mới | `FR-005` | `AC-003` | `UC-004` | `API-005` | Integration |
| `TC-008` | Lấy danh sách cuộc trò chuyện phân trang | `FR-006` | `AC-003` | `UC-004` | `API-006` | Integration |
| `TC-009` | Đổi tên cuộc trò chuyện | `FR-005` | `AC-003` | `UC-005` | `API-007` | Integration |
| `TC-010` | Xóa cuộc trò chuyện và cascade message | `FR-006` | `AC-003` | `UC-006` | `API-008` | Integration |
| `TC-011` | Ngăn chặn truy cập trái phép chéo tài khoản | `SEC-002` | `AC-003` | `UC-004`, `UC-006` | `CTRL-002` | Security |
| `TC-012` | Gửi prompt và nhận stream SSE | `FR-013` | `AC-004` | `UC-007` | `API-009` | E2E |
| `TC-013` | Tự động Failover LLM từ Gemini sang OpenAI | `FR-011` | `AC-004` | `UC-007` | `ADR-003` | Integration |
| `TC-014` | Giới hạn tần suất gọi 30 req/phút | `NFR-005` | `AC-004` | `UC-007` | `CTRL-004` | Security |
| `TC-015` | Khử độc HTML chống tấn công XSS | `SEC-003` | `AC-004` | `UC-007` | `CTRL-003`, `UX-004` | E2E |

---

## 2. Đánh Giá Độ Bao Phủ Kiểm Thử (Coverage Assessment)

- **Độ bao phủ yêu cầu cốt lõi**: Đạt 100% đối với toàn bộ các yêu cầu mức `MUST` (`FR-001` đến `FR-014`).
- **Độ bao phủ tiêu chí nghiệm thu**: 100% các tiêu chí từ `AC-001` đến `AC-005` đều có ít nhất 1 ca kiểm thử tương ứng.
- **Độ bao phủ an ninh**: Tất cả các kiểm soát phòng vệ từ `CTRL-001` đến `CTRL-004` và các mối đe dọa trọng yếu (`THR-001` đến `THR-004`) đều có kịch bản kiểm thử tự động.

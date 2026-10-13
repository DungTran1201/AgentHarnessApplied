# MA TRẬN TRUY VẾT YÊU CẦU & KẾ HOẠCH TRIỂN KHAI (REQUIREMENT TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `RTM-001` |
| **Tài liệu nguồn** | [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md), [work-breakdown-structure.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/work-breakdown-structure.md) |
| **Nguyên tắc cốt lõi** | **100% Bao phủ yêu cầu — Không có requirement nào bị bỏ sót (No Orphan Requirements)** |

---

## 1. Bảng Truy Vết Yêu Cầu Chức Năng (Functional Requirements - FR)

| Mã Yêu Cầu (FR) | Tên Yêu Cầu Chức Năng | Năng Lực (Capability) | Gói Công Việc (Work Package) | Phase Thực Hiện | Sản Phẩm Chuyển Giao (Artifact) | Tiêu Chí Nghiệm Thu (AC) | Phương Pháp Kiểm Chứng |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **FR-001** | Đăng Ký Tài Khoản | `CAP-AUTH` | `WP-AUTH-01`, `WP-AUTH-02`, `WP-AUTH-04` | **P02** | `ai-backend/src/api/v1/auth.py`, `RegisterPage.tsx` | `AC-001` | Test đăng ký email mới, kiểm tra hash mật khẩu trong DB |
| **FR-002** | Đăng Nhập Hệ Thống | `CAP-AUTH` | `WP-AUTH-02`, `WP-AUTH-03`, `WP-AUTH-04` | **P02** | `auth.py`, `LoginPage.tsx`, JWT Token Handler | `AC-001` | Test đăng nhập đúng cấp JWT, đăng nhập sai trả 401 |
| **FR-003** | Đăng Xuất Hệ Thống | `CAP-AUTH` | `WP-AUTH-02`, `WP-AUTH-04` | **P02** | `auth.py`, Session Clear Logic | `AC-001` | Test thu hồi token/cookie, chuyển hướng về trang Login |
| **FR-004** | Khởi Tạo Cuộc Trò Chuyện | `CAP-CONV` | `WP-CONV-01`, `WP-CONV-03` | **P03** | `conversations.py`, `Sidebar.tsx` | `AC-002` | Bấm New Chat -> Tạo bản ghi mới gắn `user_id` hiện tại |
| **FR-005** | Xem Danh Sách Lịch Sử | `CAP-CONV` | `WP-CONV-01`, `WP-CONV-03` | **P03** | `GET /conversations`, Sidebar list | `AC-002` | Load danh sách sắp xếp theo `updated_at DESC` |
| **FR-006** | Đổi Tên Cuộc Trò Chuyện | `CAP-CONV` | `WP-CONV-01`, `WP-CONV-02` | **P03** | `PATCH /conversations/{id}`, Auto-title logic | `AC-002` | Test đổi tên thủ công và tự động lấy 30 ký tự đầu |
| **FR-007** | Xóa Cuộc Trò Chuyện | `CAP-CONV` | `WP-CONV-01`, `WP-CONV-03` | **P03** | `DELETE /conversations/{id}` | `AC-002` | Test xóa hội thoại, dữ liệu ẩn khỏi danh sách và DB |
| **FR-008** | Gửi Tin Nhắn Văn Bản | `CAP-CHAT-AI` | `WP-CHAT-01`, `WP-CHAT-04` | **P04** | `messages.py`, Chat Input Box | `AC-003` | Kiểm tra giới hạn 4000 ký tự, lưu bản ghi role: user |
| **FR-009** | Nhận Phản Hồi Từ AI | `CAP-CHAT-AI` | `WP-CHAT-01`, `WP-CHAT-02`, `WP-CHAT-04` | **P04** | `LLMManager`, Streaming SSE endpoint | `AC-003` | Test nhận dữ liệu stream, render Markdown & Syntax highlight |
| **FR-010** | Tùy Chọn Mô Hình AI | `CAP-CHAT-AI` | `WP-CHAT-01`, `WP-CHAT-04` | **P04** | Model selector dropdown | `AC-003` | Test chọn model gửi đúng tham số provider/model |
| **FR-011** | Tự Động Failover Dự Phòng| `CAP-CHAT-AI` | `WP-CHAT-03` | **P04** | Fallback router trong `LLMManager` | `AC-004` | Giả lập ngắt Gemini -> Tự động chuyển gọi OpenAI thành công |

---

## 2. Bảng Truy Vết Quy Tắc Nghiệp Vụ (Business Rules - BR)

| Mã Quy Tắc (BR) | Tên Quy Tắc Nghiệp Vụ | Gói Công Việc Chịu Trách Nhiệm (WP) | Cơ Chế Kiểm Soát Kỹ Thuật | Phương Pháp Kiểm Chứng |
| :--- | :--- | :--- | :--- | :--- |
| **BR-001** | Bắt Buộc Xác Thực Để Lưu Phiên | `WP-AUTH-03`, `WP-CONV-01` | FastAPI Dependency `get_current_user` chặn các request nặc danh. | Gọi `POST /conversations` không có token -> Nhận HTTP 401. |
| **BR-002** | Phân Quyền & Cách Ly Cuộc Trò Chuyện | `WP-CONV-04` | Truy vấn cơ sở dữ liệu luôn kèm điều kiện `WHERE user_id = current_user.id`. | User A truy cập ID hội thoại của User B -> Nhận HTTP 403 Forbidden. |
| **BR-003** | Giới Hạn Chiều Dài Tin Nhắn | `WP-CHAT-01` | Pydantic Schema kiểm tra `max_length=4000` và client-side validation. | Gửi chuỗi 4001 ký tự -> Bị chặn ngay tại Client và Backend (HTTP 422). |
| **BR-004** | Quy Ước Đặt Tiêu Đề Tự Động | `WP-CONV-02` | Logic cắt chuỗi 30 ký tự của tin nhắn đầu tiên khi tiêu đề còn mặc định. | Gửi tin nhắn mở đầu -> Tiêu đề cuộc trò chuyện tự động cập nhật. |
| **BR-005** | Thứ Tự Điều Phối Ưu Tiên AI | `WP-CHAT-03` | `LLMManager` cấu hình Gemini làm default, OpenAI làm fallback secondary. | Kiểm tra log giao tiếp luôn ưu tiên gọi Gemini trước. |
| **BR-006** | Xử Lý Khi Vượt Rate Limit | `WP-SEC-04` | `limit_req` tại Nginx (10r/s) và `app_rate_limiter` tại FastAPI (60r/min). | Bắn request liên tục vượt ngưỡng -> Trả HTTP 429 Too Many Requests. |

---

## 3. Bảng Truy Vết Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

| Nhóm NFR | Mã NFR | Nội Dung Yêu Cầu | Gói Công Việc (WP) | Phase | Phương Pháp Kiểm Chứng |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Hiệu Năng** | `NFR-PERF-01` | Tải trang FCP < 1.5 giây | `WP-CHAT-04` | **P04** | Đo lường bằng Lighthouse và Chrome DevTools |
| | `NFR-PERF-02` | Độ trễ ký tự đầu tiên (TTFT) < 2.0s | `WP-CHAT-02` | **P04** | Đo thời gian từ lúc bấm gửi đến khi chunk đầu tiên xuất hiện |
| | `NFR-PERF-03` | Chịu tải đồng thời 100 concurrent users | `WP-SEC-03` | **P05** | Chạy kịch bản kiểm thử tải Locust/k6 |
| **An Ninh** | `NFR-SEC-01` | Bắt buộc HTTPS TLS 1.3 | `WP-OPS-02` | **P06** | Kiểm tra cổng 80 chuyển hướng 301 sang 443; SSL Labs Test |
| | `NFR-SEC-02` | Bảo vệ khóa API (Không lộ ra ngoài) | `WP-SEC-01` | **P05** | Quét tự động GitLeaks; kiểm tra gói tin network trình duyệt |
| | `NFR-SEC-03` | Băm mật khẩu bằng Argon2id/Bcrypt | `WP-AUTH-01` | **P02** | Kiểm tra trường `password_hash` trong database |
| | `NFR-SEC-04` | Rate Limiting 2 tầng phòng thủ | `WP-SEC-04` | **P05** | Kịch bản bắn request kiểm tra trả về HTTP 429 |
| | `NFR-SEC-05` | Khử khuẩn hiển thị chống XSS | `WP-SEC-02` | **P05** | Thử nghiệm tiêm mã độc qua câu trả lời của AI |
| **Độ Tin Cậy** | `NFR-REL-01` | Độ sẵn sàng 99.5% uptime | `WP-OPS-04` | **P06** | Giám sát trạng thái cụm container |
| | `NFR-REL-02` | Tự phục hồi container khi crash | `WP-OPS-01` | **P06** | Giết tiến trình container -> Docker tự restart lại trong 10s |
| | `NFR-REL-03` | Cô lập lỗi nhà cung cấp AI ngoài | `WP-CHAT-03` | **P04** | Giả lập lỗi API ngoài -> Backend không bị dừng đột ngột |
| **Mở Rộng** | `NFR-SCA-01` | Backend FastAPI Stateless | `WP-ARCH-01` | **P01** | Kiểm tra không lưu trạng thái phiên trong bộ nhớ tiến trình |
| | `NFR-SCA-02` | Phân tách dịch vụ Database & Cache | `WP-OPS-01` | **P06** | Docker network phân tách biệt lập |
| **Bảo Trì** | `NFR-MNT-01` | Kiến trúc module hóa chuẩn 3 tầng | `WP-ARCH-01` | **P01** | Code review ranh giới phụ thuộc giữa các thư mục |
| | `NFR-MNT-02` | Tài liệu hóa hợp đồng OpenAPI | `WP-ARCH-03` | **P01** | Truy cập `/docs` và `/redoc` hiển thị đầy đủ schema |
| **Trải Nghiệm** | `NFR-USB-01` | Giao diện Responsive mọi kích thước | `WP-CHAT-04` | **P04** | Kiểm tra hiển thị từ Mobile 360px đến Desktop 1080p |
| | `NFR-USB-02` | Hiển thị trạng thái Loading rõ ràng | `WP-CHAT-04` | **P04** | Kiểm tra biểu tượng xoay/gõ chữ khi đang chờ kết quả |
| **Riêng Tư** | `NFR-PRV-01` | Cô lập dữ liệu cá nhân tuyệt đối | `WP-CONV-04` | **P03** | Kiểm thử tấn công IDOR |
| | `NFR-PRV-02` | Hỗ trợ xóa vĩnh viễn cuộc trò chuyện | `WP-CONV-01` | **P03** | Gọi API xóa -> Kiểm tra dữ liệu không còn hiển thị |
| **Quan Sát** | `NFR-OBS-01` | Ghi log chuẩn hóa, lọc bỏ secret | `WP-OPS-03` | **P06** | Kiểm tra stdout không chứa mật khẩu hay auth headers |

---

## 4. Báo Cáo Rà Soát Yêu Cầu Mồ Côi (Orphan Requirement Check)

- **Số lượng Functional Requirements trong SRS**: 11 (`FR-001` -> `FR-011`).
- **Số lượng FR đã được map vào WBS & Phase**: 11/11 (Tỷ lệ bao phủ: **100%**).
- **Số lượng Non-Functional Requirements trong SRS**: 17 tiêu chuẩn.
- **Số lượng NFR đã được map vào WBS & Phase**: 17/17 (Tỷ lệ bao phủ: **100%**).
- **Số lượng Business Rules trong SRS**: 6 (`BR-001` -> `BR-006`).
- **Số lượng BR đã được map vào cơ chế kỹ thuật**: 6/6 (Tỷ lệ bao phủ: **100%**).
- **Kết Luận Thẩm Định**: **KHÔNG CÓ YÊU CẦU NÀO BỊ BỎ SÓT (0 ORPHAN REQUIREMENTS)**. Toàn bộ yêu cầu đều có Work Package cụ thể và phương pháp kiểm chứng rõ ràng.

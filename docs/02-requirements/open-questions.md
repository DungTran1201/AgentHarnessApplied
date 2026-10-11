# SỔ THEO DÕI VẤN ĐỀ CẦN LÀM RÕ & MÂU THUẪN YÊU CẦU (OPEN QUESTIONS & CONFLICTS REGISTER)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `OQ-REG-002` |
| **Trạng thái Baseline** | **BASELINED** |
| **Phân loại vấn đề** | `[OPEN QUESTION]` \| `[TBD]` \| `[CONFLICT]` \| `[DECISION]` |
| **Mục đích** | Ghi nhận tập trung các nội dung chưa đủ thông tin, các mâu thuẫn tài liệu đã phát hiện và phương án xử lý |

---

## 1. Danh Mục Các Mâu Thuẫn & Trùng Lặp Tài Liệu Đã Phát Hiện ([CONFLICT])

---

### CNF-001: Trùng Lặp & Phân Rã Thư Mục Yêu Cầu Giữa `docs/01-requirements/` và `docs/02-requirements/`
- **Mã Mâu Thuẫn**: `CNF-001`
- **Mô Tả Hiện Tượng**:
  - Trong repository ban đầu tồn tại file `docs/01-requirements/SRS.md` và `docs/SRS.md`.
  - Tuy nhiên, theo quy chuẩn vòng đời tài liệu chính thức tại [.agents/config/document-map.yaml](file:///c:/Users/PC/Project/ai-chan/.agents/config/document-map.yaml):
    - `01-planning/` là không gian dành cho Kế hoạch (Planning).
    - `02-requirements/` là không gian chuẩn dành cho Đặc tả Yêu cầu (Requirements).
- **Phân Loại**: `[CONFLICT]` (Mâu thuẫn quy ước vị trí tài liệu).
- **Quyết Định Xử Lý (Resolution Decision)**:
  - **Xác lập Nguồn sự thật**: Thư mục `docs/02-requirements/` là **AUTHORITATIVE REQUIREMENTS SPACE duy nhất** của toàn bộ dự án kể từ thời điểm này.
  - File `docs/01-requirements/SRS.md` và `docs/SRS.md` được đánh dấu là bản phác thảo tiền đề (Historical Initial Draft) và không được cập nhật thêm nữa để tránh sai lệch phiên bản.
  - Mọi phase tiếp theo (03-use-cases, 04-business-process, 07-architecture, 08-api) bắt buộc phải lấy đầu vào trực tiếp từ `docs/02-requirements/`.
- **Trạng Thái**: `DECIDED`.

---

## 2. Danh Mục Các Câu Hỏi Mở & Điểm Chờ Làm Rõ ([OPEN QUESTION] & [TBD])

---

### OQ-001: Chính Sách Tương Tác Của Khách Vãng Lai (Guest User Trial Policy)
- **Mã Câu Hỏi**: `OQ-001`
- **Nội Dung Vấn Đề**: Người dùng chưa đăng nhập (Guest) có được phép trò chuyện thử nghiệm với AI hay bắt buộc 100% phải Đăng ký/Đăng nhập mới được nhìn thấy giao diện chat?
- **Tác Động Đến Thiết Kế**:
  - Nếu cho phép chat thử: Cần cơ chế lưu phiên tạm thời trên trình duyệt (Session Storage), cấp phát hạn ngạch chat ẩn danh (ví dụ: tối đa 3 câu) và popup gợi ý đăng ký.
  - Nếu bắt buộc đăng nhập: Điều hướng ngay lập tức về trang `/login`, đơn giản hóa logic Backend.
- **Đề Xuất Của Requirements Engineer**:
  - *Phương án tối ưu trải nghiệm*: Cho phép Guest chat thử tối đa 3 câu hỏi (lưu tạm trong session trình duyệt, không lưu DB). Sau câu thứ 3, hiển thị modal thông báo: *"Bạn đã sử dụng hết lượt chat thử nghiệm. Vui lòng đăng ký tài khoản miễn phí để tiếp tục và lưu trữ lịch sử cuộc trò chuyện."*
- **Trạng Thái Hiện Tại**: `[OPEN QUESTION]` (Chờ Product Owner xác nhận trước khi thiết kế UI chi tiết tại Phase 03/04).

---

### OQ-002: Thời Hạn Lưu Trữ Lịch Sử Cuộc Trò Chuyện (Conversation Retention Policy)
- **Mã Câu Hỏi**: `OQ-002`
- **Nội Dung Vấn Đề**: Dữ liệu cuộc trò chuyện của người dùng được lưu trữ vô thời hạn cho tới khi người dùng chủ động xóa, hay hệ thống sẽ tự động dọn dẹp (Archive/Delete) các cuộc trò chuyện cũ không hoạt động sau 90 hoặc 180 ngày?
- **Tác Động Đến Thiết Kế**: Ảnh hưởng đến dung lượng lưu trữ của cơ sở dữ liệu PostgreSQL và chính sách quyền riêng tư dữ liệu.
- **Đề Xuất Của Requirements Engineer**:
  - Trong giai đoạn MVP v1.0, áp dụng chính sách lưu trữ vĩnh viễn cho đến khi người dùng tự tay xóa (`FR-007`).
  - Giai đoạn v2.0 sẽ bổ sung tính năng người dùng tự cài đặt thời gian tự động xóa nếu có nhu cầu bảo mật cá nhân cao.
- **Trạng Thái Hiện Tại**: `[DECIDED]` (Chốt theo Baseline MVP v1.0).

---

### OQ-003: Tính Năng Xuất Lịch Sử Cuộc Trò Chuyện (Export Chat to PDF/Markdown)
- **Mã Câu Hỏi**: `OQ-003`
- **Nội Dung Vấn Đề**: Có cần cung cấp nút bấm cho phép người dùng xuất (Export) nội dung cuộc trò chuyện thành tệp PDF hoặc Markdown trong giai đoạn đầu không?
- **Tác Động Đến Thiết Kế**: Tăng khối lượng công việc phát triển Frontend và thư viện xuất tệp.
- **Đề Xuất Của Requirements Engineer**: Đưa vào danh mục `Future Scope` sau khi các tính năng cốt lõi (Chat, Streaming, Failover) đã vận hành ổn định.
- **Trạng Thái Hiện Tại**: `[DECIDED]` (Đã phân loại Future Scope).

---

### OQ-004: Xác Định Model Cụ Thể Cho Luồng Fallback (Default AI Model Selection)
- **Mã Câu Hỏi**: `OQ-004`
- **Nội Dung Vấn Đề**: Lựa chọn cụ thể model nào của Gemini và OpenAI để cân bằng tối ưu giữa chi phí token và tốc độ phản hồi?
- **Tác Động Đến Thiết Kế**: Cấu hình biến môi trường `DEFAULT_LLM_PROVIDER` và tên model trong `llm/client.py`.
- **Đề Xuất Của Requirements Engineer**:
  - Primary Model: **Gemini 1.5 Flash** (Tốc độ phản hồi cực nhanh, chi phí thấp, ngữ cảnh rộng).
  - Fallback Model: **GPT-4o-mini** (Chi phí hợp lý, độ ổn định cao, sẵn sàng thay thế tức thì khi Gemini quá tải).
- **Trạng Thái Hiện Tại**: `[DECIDED]` (Đã chốt cấu hình kỹ thuật).

---

## 3. Quy Trình Giải Quyết Điểm Chờ Làm Rõ Trước Khi Thiết Kế Hệ Thống

1. Câu hỏi `OQ-001` (Chính sách Guest chat thử) sẽ được đưa vào thảo luận tại buổi duyệt cổng **Quality Gate G2 (Design Ready)** với Product Owner.
2. Mọi quyết định chốt sẽ được cập nhật trực tiếp vào file này với trạng thái `[DECIDED]`, ghi rõ ngày phê duyệt và cập nhật ma trận truy vết tương ứng.

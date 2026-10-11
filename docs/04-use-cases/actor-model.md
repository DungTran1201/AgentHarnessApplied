# MÔ HÌNH TÁC NHÂN CA SỬ DỤNG (ACTOR MODEL)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-ACTOR-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân loại và định nghĩa chi tiết vai trò, trách nhiệm, mục tiêu và phạm vi tương tác của các Tác nhân con người (Primary Actors) và Hệ thống dịch vụ bên ngoài (External Actors) trong hệ thống Ca sử dụng |

---

## 1. Phân Loại Tác Nhân Trong Hệ Thống (Actor Classification)

Hệ thống phân định rạch ròi thành hai nhóm tác nhân:
1. **Tác nhân chính (Primary Actors - Con người)**: Người trực tiếp khởi xướng và hưởng lợi từ các ca sử dụng.
2. **Tác nhân hỗ trợ bên ngoài (External Supporting Actors - Dịch vụ đám mây)**: Hệ thống bên thứ ba tham gia cung cấp năng lực tính toán AI.

> [!WARNING]
> **Nguyên Tắc Trừu Tượng Hóa Tác Nhân**:
> - Cơ sở dữ liệu PostgreSQL, Bộ đệm Redis, Nginx Gateway, và Backend FastAPI **không phải là Actor** trong mô hình Ca sử dụng. Chúng là các thành phần hiện thực hóa kỹ thuật bên trong ranh giới hệ thống.
> - Các phần tử giao diện như "Nút bấm", "Thanh nhập liệu" **không phải là Actor**.

---

## 2. Chi Tiết Các Tác Nhân Chính (Primary Human Actors)

---

### 2.1 ACT-01: Khách Vãng Lai (Guest / Unauthenticated User)
- **Mã Tác Nhân**: `ACT-01`.
- **Tên Tác Nhân**: Khách vãng lai (Guest).
- **Mô Tả Vai Trò**: Người dùng truy cập website qua trình duyệt nhưng chưa đăng nhập hoặc chưa có tài khoản trong hệ thống.
- **Mục Tiêu Nghiệp Vụ (Actor Goals)**:
  - Đăng ký một tài khoản mới để trở thành thành viên (`UC-AUTH-001`).
  - Đăng nhập vào hệ thống bằng thông tin tài khoản đã có (`UC-AUTH-002`).
- **Trách Nhiệm & Ràng Buộc**:
  - Cung cấp thông tin đăng ký hợp lệ (Email đúng định dạng, mật khẩu tối thiểu 6 ký tự).
  - Bị giới hạn quyền truy cập: Không được phép tạo hội thoại, gửi câu hỏi hoặc truy xuất dữ liệu cá nhân (`BR-001`).
- **Ca Sử Dụng Liên Quan Trực Tiếp**:
  - `UC-AUTH-001 [UC-001]` (Đăng Ký Tài Khoản Mới).
  - `UC-AUTH-002 [UC-002]` (Đăng Nhập Hệ Thống).

---

### 2.2 ACT-02: Người Dùng Đã Xác Thực (Registered & Authenticated User)
- **Mã Tác Nhân**: `ACT-02`.
- **Tên Tác Nhân**: Người dùng đã xác thực (User).
- **Mô Tả Vai Trò**: Người dùng đã đăng nhập thành công vào hệ thống và đang sở hữu mã phiên JWT còn hiệu lực trong Cookie trình duyệt.
- **Mục Tiêu Nghiệp Vụ (Actor Goals)**:
  - Duy trì phiên làm việc an toàn và đăng xuất khi cần (`UC-AUTH-003`).
  - Tạo lập và quản lý các phiên đàm thoại độc lập (`UC-CONV-001`, `UC-CONV-003`, `UC-CONV-004`).
  - Xem lại lịch sử các cuộc trò chuyện trước đây (`UC-CONV-002`).
  - Gửi câu hỏi, yêu cầu và nhận câu trả lời dạng luồng trực tiếp từ Trợ lý ảo AI (`UC-CHAT-001`).
  - Tùy chọn mô hình AI thích hợp cho tác vụ cần giải quyết (`UC-CHAT-002`).
- **Trách Nhiệm & Ràng Buộc**:
  - Tuân thủ quy định độ dài tin nhắn (1 đến 4,000 ký tự - `BR-003`).
  - Chỉ được xem và thao tác trên các cuộc trò chuyện do chính mình tạo ra (`BR-002`).
  - Tuân thủ chính sách giới hạn tần suất gửi tin nhắn (`BR-006`).
- **Ca Sử Dụng Liên Quan Trực Tiếp**:
  - `UC-AUTH-002 [UC-002]` (Đăng Nhập Hệ Thống).
  - `UC-AUTH-003 [UC-003]` (Đăng Xuất Khỏi Hệ Thống).
  - `UC-CONV-001 [UC-004]` (Khởi Tạo Cuộc Trò Chuyện).
  - `UC-CONV-002 [UC-005]` (Xem Lịch Sử Hội Thoại).
  - `UC-CONV-003 [UC-006]` (Đổi Tên Cuộc Trò Chuyện).
  - `UC-CONV-004 [UC-007]` (Xóa Cuộc Trò Chuyện).
  - `UC-CHAT-001 [UC-008]` (Gửi Tin Nhắn & Tương Tác AI).
  - `UC-CHAT-002 [UC-009]` (Lựa Chọn Mô Hình AI).

---

## 3. Tác Nhân Hệ Thống Dịch Vụ Bên Ngoài (External Supporting Actors)

---

### 3.1 EXT-AI: Dịch Vụ AI Đám Mây (External AI Cloud Providers)
- **Mã Tác Nhân**: `EXT-AI`.
- **Tên Tác Nhân**: Dịch vụ Trí tuệ Nhân tạo Đám mây (Google Gemini API & OpenAI API).
- **Mô Tả Vai Trò**: Hệ thống điện toán đám mây bên thứ ba tiếp nhận prompt và lịch sử đàm thoại từ hệ thống `ai-chan` để tính toán suy luận và trả về chuỗi văn bản phản hồi.
- **Phương Thức Tương Tác**: Giao thức HTTPS REST/Streaming API thông qua mạng Internet.
- **Ràng Buộc Vận Hành**:
  - `Google Gemini API`: Là nhà cung cấp chính được ưu tiên gọi trước (`BR-005`).
  - `OpenAI API`: Là nhà cung cấp dự phòng tự động chuyển vùng khi Gemini quá tải hoặc lỗi (`BR-005`).
- **Ca Sử Dụng Tham Gia**:
  - `UC-CHAT-001 [UC-008]` (Hỗ trợ sinh phản hồi đàm thoại).

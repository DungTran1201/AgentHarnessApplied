# DANH MỤC QUY TRÌNH NGHIỆP VỤ HỆ THỐNG (BUSINESS PROCESS CATALOG)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-CATALOG-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Quy ước mã định danh** | `BP-XXX-### [PROC-###]` |
| **Mục đích** | Chuẩn hóa danh mục toàn bộ các quy trình nghiệp vụ hệ thống, cung cấp đặc tả đầu vào chính thức cho Giai đoạn Ca Sử Dụng (Phase 04 Use Cases) và Phân Tích Hệ Thống (Phase 05 System Analysis) |

---

## 1. Bảng Tổng Hợp Danh Mục Quy Trình Nghiệp Vụ

| Process ID | Trace ID | Tên Quy Trình Nghiệp Vụ | Phân Loại | Tác Nhân Chính | Độ Ưu Tiên | Độ Phức Tạp | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BP-AUTH-001** | `PROC-001` | Đăng Ký Tài Khoản Người Dùng Mới | Phụ Trợ (Supporting) | `ACT-01` (Guest) | `MUST` | Medium | `BASELINED` |
| **BP-AUTH-002** | `PROC-002` | Đăng Nhập & Cấp Phát Phiên Làm Việc | Phụ Trợ (Supporting) | `ACT-01` (Guest) / `ACT-02` (User) | `MUST` | Medium | `BASELINED` |
| **BP-AUTH-003** | `PROC-003` | Đăng Xuất & Hủy Bỏ Phiên Làm Việc | Phụ Trợ (Supporting) | `ACT-02` (User) | `MUST` | Low | `BASELINED` |
| **BP-CONV-001** | `PROC-004` | Khởi Tạo Cuộc Trò Chuyện Mới | Cốt Lõi (Core) | `ACT-02` (User) | `MUST` | Low | `BASELINED` |
| **BP-CONV-002** | `PROC-005` | Truy Xuất Danh Sách & Lịch Sử Cuộc Trò Chuyện | Phụ Trợ (Supporting) | `ACT-02` (User) | `MUST` | Medium | `BASELINED` |
| **BP-CONV-003** | `PROC-006` | Đổi Tên Cuộc Trò Chuyện (Tự Động / Thủ Công) | Phụ Trợ (Supporting) | `ACT-02` (User) / System | `SHOULD` | Low | `BASELINED` |
| **BP-CONV-004** | `PROC-007` | Xóa Cuộc Trò Chuyện & Dữ Liệu Liên Quan | Phụ Trợ (Supporting) | `ACT-02` (User) | `MUST` | Low | `BASELINED` |
| **BP-CHAT-001** | `PROC-008` | Gửi Tin Nhắn & Tương Tác Đàm Thoại | Cốt Lõi (Core) | `ACT-02` (User) | `MUST` | High | `BASELINED` |
| **BP-AI-001** | `PROC-009` | Điều Phối AI & Tự Động Chuyển Vùng Dự Phòng | Tích Hợp (Integration) | System (LLM Orchestrator) | `MUST` | High | `BASELINED` |
| **BP-SEC-001** | `PROC-010` | Kiểm Soát Tần Suất Yêu Cầu 2 Tầng | An Ninh (Security) | System (Nginx & FastAPI) | `MUST` | Medium | `BASELINED` |
| **BP-USER-001** | `PROC-011` | Quản Lý & Cập Nhật Hồ Sơ Người Dùng | Phụ Trợ (Supporting) | `ACT-02` (User) | `MUST` | Medium | `BASELINED` |
| **BP-USER-002** | `PROC-012` | Thay Đổi Thông Tin Nhạy Cảm (Email/Mật khẩu) | An Ninh (Security) | `ACT-02` (User) | `MUST` | High | `BASELINED` |
| **BP-AGENT-001** | `PROC-013` | Quản Lý Vòng Đời & Kích Hoạt Mô Hình Agent | Quản Trị / Tích Hợp | `ACT-02` (User) / Admin | `MUST` | Medium | `BASELINED` |
| **BP-AUTH-004** | `PROC-014` | Xác Thực & Đăng Ký Tài Khoản Qua Discord OAuth2 | Cốt Lõi (Core) | `ACT-01` / `ACT-02` | `MUST` | High | `BASELINED` |
| **BP-RES-001** | `PROC-015` | Thu Thập & Đo Lường Tài Nguyên Telemetry Tự Động | Giám Sát (Observability) | System / Middleware | `MUST` | Medium | `BASELINED` |
| **BP-RES-002** | `PROC-016` | Phát Luồng Giám Sát Thời Gian Thực & Kiểm Soát Quota | Giám Sát & Điều Tiết | `ACT-02` (User) / Admin | `MUST` | High | `BASELINED` |
| **BP-MOD-001** | `PROC-017` | Đăng Ký & Hiệu Chỉnh Cấu Hình Mô Hình Agent | Quản Trị / Cấu Hình | `ACT-02` (User) / Admin | `MUST` | High | `BASELINED` |
| **BP-MOD-002** | `PROC-018` | Tìm Kiếm, Sàng Lọc Đa Tiêu Chí & Lưu Trữ Mềm Mô Hình | Quản Trị / Khai Thác | `ACT-02` (User) / Admin | `MUST` | Medium | `BASELINED` |
| **BP-USER-003** | `PROC-019` | Liên Kết Tài Khoản Người Dùng Với Discord | Quản Trị Định Danh | `ACT-02` (User) | `MUST` | Medium | `BASELINED` |
| **BP-USER-004** | `PROC-020` | Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn | An Ninh Định Danh | `ACT-02` (User) | `MUST` | Medium | `BASELINED` |
| **BP-BOT-001** | `PROC-022` | Quản Lý Cấu Hình & Khám Phá Máy Chủ Discord Bot | Quản Trị / Tích Hợp | `ACT-02` (User) | `MUST` | High | `BASELINED` |
| **BP-BOT-002** | `PROC-023` | Điều Phối Tương Tác Bot Discord & Trừ Hạn Ngạch Hợp Nhất | Cốt Lõi / Vận Hành | `ACT-02` (User) / System | `MUST` | High | `BASELINED` |

---

## 2. Đặc Tả Chi Tiết Từng Quy Trình Nghiệp Vụ

---

### BP-AUTH-001 [PROC-001]: Đăng Ký Tài Khoản Người Dùng Mới
- **Mã Quy Trình**: `BP-AUTH-001` (Trace ID: `PROC-001`).
- **Tên Quy Trình**: Đăng Ký Tài Khoản Người Dùng Mới (User Registration).
- **Phân Loại**: Supporting Process (Quy trình phụ trợ danh tính).
- **Mục Đích Nghiệp Vụ**: Cung cấp cơ chế mở tài khoản mới cho người dùng chưa có tài khoản trong hệ thống để tham gia sử dụng các dịch vụ trợ lý ảo.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01` (Nền tảng trợ lý tương tác tự nhiên), `BO-04` (Bảo vệ dữ liệu người dùng).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "Đăng ký" trên biểu mẫu Đăng ký (`/register`).
- **Tác Nhân Chính (Primary Actor)**: `ACT-01` (Khách vãng lai / Guest).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Giao diện Web (`ai-frontend`), Dịch vụ API Backend (`ai-backend`), Cơ sở dữ liệu PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Khách vãng lai truy cập vào ứng dụng qua giao thức an toàn HTTPS.
  - Người dùng chưa đăng nhập vào hệ thống.
- **Đầu Vào (Inputs)**:
  - Họ và tên (`full_name`).
  - Địa chỉ thư điện tử (`email`).
  - Mật khẩu đăng ký (`password`).
- **Đầu Ra (Outputs)**:
  - Bản ghi tài khoản người dùng mới trong cơ sở dữ liệu (`status = ACTIVE`).
  - Thông báo đăng ký thành công trên giao diện và điều hướng tự động sang trang Đăng nhập.
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Tài khoản được lưu trữ an toàn với mật khẩu băm chuẩn bcrypt (`SEC-002`).
  - Email là duy nhất, không thể tạo tài khoản thứ hai có cùng email.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-001`, `NFR-001`, `NFR-005`, `NFR-012`, `SEC-001`, `SEC-002`, `AC-001`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001` (Yêu cầu tài khoản để lưu trữ hội thoại), `BR-006` (Giới hạn tần suất gọi API).
- **Phụ Thuộc Nghiệp Vụ**:
  - Không phụ thuộc quy trình nào khác.
  - Là tiền đề bắt buộc cho `BP-AUTH-002 [PROC-002]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium` (cần kiểm tra định dạng email, xác thực độ mạnh mật khẩu và xử lý trùng lặp dữ liệu).
- **Trạng Thái**: `BASELINED`.

---

### BP-AUTH-002 [PROC-002]: Đăng Nhập & Cấp Phát Phiên Làm Việc
- **Mã Quy Trình**: `BP-AUTH-002` (Trace ID: `PROC-002`).
- **Tên Quy Trình**: Đăng Nhập & Cấp Phát Phiên Làm Việc (User Login & Session Establishment).
- **Phân Loại**: Supporting Process (Quy trình xác thực & thiết lập phiên).
- **Mục Đích Nghiệp Vụ**: Xác thực danh tính của người dùng thông qua thông tin đăng nhập và cấp phát mã phiên truy cập an toàn.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01`, `BO-04`.
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhập thông tin và nhấn nút "Đăng nhập" trên trang `/login`.
- **Tác Nhân Chính (Primary Actor)**: `ACT-01` (Khách vãng lai) chuyển đổi thành `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Tài khoản đã được đăng ký thành công trong hệ thống.
  - Trạng thái tài khoản đang hoạt động (`status = ACTIVE`).
- **Đầu Vào (Inputs)**:
  - Địa chỉ thư điện tử (`email`).
  - Mật khẩu đăng nhập (`password`).
- **Đầu Ra (Outputs)**:
  - Mã thông báo JWT Access Token được thiết lập an toàn trong `HttpOnly`, `SameSite=Lax`, `Secure` Cookie (`SEC-004`).
  - Thông tin người dùng cơ bản (`id`, `email`, `full_name`) được trả về cho Frontend hiển thị.
  - Điều hướng người dùng vào giao diện làm việc chính (`/chat`).
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Phiên làm việc được kích hoạt có hiệu lực trong 7 ngày (`NFR-006`).
  - Các yêu cầu tiếp theo của người dùng được xác thực tự động thông qua Cookie.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-002`, `NFR-002`, `NFR-006`, `SEC-002`, `SEC-004`, `AC-002`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`, `BR-006`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-AUTH-001 [PROC-001]`. Là tiền đề bắt buộc cho toàn bộ các quy trình trong `Domain_Conv` và `Domain_Chat`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium` (băm đối chiếu mật khẩu, tạo JWT, cấu hình Cookie an toàn chống XSS/CSRF).
- **Trạng Thái**: `BASELINED`.

---

### BP-AUTH-003 [PROC-003]: Đăng Xuất & Hủy Bỏ Phiên Làm Việc
- **Mã Quy Trình**: `BP-AUTH-003` (Trace ID: `PROC-003`).
- **Tên Quy Trình**: Đăng Xuất & Hủy Bỏ Phiên Làm Việc (User Logout & Session Revocation).
- **Phân Loại**: Supporting Process (Quy trình thu hồi phiên).
- **Mục Đích Nghiệp Vụ**: Hủy bỏ trạng thái xác thực trên trình duyệt của người dùng nhằm bảo đảm an toàn dữ liệu cá nhân khi kết thúc phiên làm việc.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-04` (Bảo mật tài khoản người dùng).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "Đăng xuất" trên thanh điều hướng hoặc menu người dùng.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang trong trạng thái đăng nhập hợp lệ.
- **Đầu Vào (Inputs)**: Yêu cầu đăng xuất (`POST /api/v1/auth/logout`) kèm Cookie phiên hiện tại.
- **Đầu Ra (Outputs)**:
  - Cookie `access_token` được ghi đè với `Max-Age=0` (xóa bỏ khỏi trình duyệt).
  - Trạng thái đăng nhập trong ứng dụng Client bị giải phóng.
  - Người dùng được chuyển hướng về trang Đăng nhập (`/login`).
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Người dùng quay về trạng thái `ACT-01` (Guest). Mọi yêu cầu bảo mật tiếp theo sẽ bị từ chối với lỗi `HTTP 401`.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-003`, `SEC-004`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-AUTH-002 [PROC-002]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Low`.
- **Trạng Thái**: `BASELINED`.

---

### BP-CONV-001 [PROC-004]: Khởi Tạo Cuộc Trò Chuyện Mới
- **Mã Quy Trình**: `BP-CONV-001` (Trace ID: `PROC-004`).
- **Tên Quy Trình**: Khởi Tạo Cuộc Trò Chuyện Mới (Create New Conversation).
- **Phân Loại**: Core Process (Quy trình cốt lõi tạo không gian làm việc).
- **Mục Đích Nghiệp Vụ**: Tạo lập một phiên ngữ cảnh hội thoại độc lập cho người dùng để bắt đầu chủ đề tương tác mới với trợ lý ảo.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01`, `BO-03` (Trải nghiệm giao diện mượt mà).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "+ Đoạn chat mới" trên thanh Sidebar.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã xác thực thành công (`BP-AUTH-002`).
- **Đầu Vào (Inputs)**: Yêu cầu tạo mới (`POST /api/v1/conversations`) với tiêu đề mặc định hoặc rỗng.
- **Đầu Ra (Outputs)**:
  - Bản ghi cuộc trò chuyện mới trong CSDL với `title = "Cuộc trò chuyện mới"` gắn liền với `user_id`.
  - Mã định danh hội thoại duy nhất (`conversation_id`).
  - Giao diện khung chat được làm mới và Sidebar cập nhật phiên trò chuyện mới ở vị trí trên cùng.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Cuộc trò chuyện ở trạng thái sẵn sàng tiếp nhận tin nhắn đầu tiên.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-004`, `BR-001`, `BR-002`, `NFR-004`, `AC-003`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`, `BR-002` (Cách ly quyền sở hữu), `BR-004` (Đặt tiêu đề mặc định).
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-AUTH-002 [PROC-002]`. Là tiền đề trực tiếp của `BP-CHAT-001 [PROC-008]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Low`.
- **Trạng Thái**: `BASELINED`.

---

### BP-CONV-002 [PROC-005]: Truy Xuất Danh Sách & Lịch Sử Cuộc Trò Chuyện
- **Mã Quy Trình**: `BP-CONV-002` (Trace ID: `PROC-005`).
- **Tên Quy Trình**: Truy Xuất Danh Sách & Lịch Sử Cuộc Trò Chuyện (List Conversations & History).
- **Phân Loại**: Supporting Process (Quy trình hiển thị dữ liệu lịch sử).
- **Mục Đích Nghiệp Vụ**: Tải toàn bộ danh sách các cuộc trò chuyện của người dùng và nạp chi tiết các tin nhắn trong một cuộc trò chuyện được chọn.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01`, `BO-03`.
- **Sự Kiện Kích Hoạt (Trigger)**:
  - Khi người dùng truy cập trang `/chat`.
  - Hoặc khi người dùng nhấn chọn một cuộc trò chuyện cụ thể trên Sidebar.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Đầu Vào (Inputs)**: Token xác thực Cookie, `conversation_id` (khi nạp chi tiết tin nhắn).
- **Đầu Ra (Outputs)**:
  - Danh sách tóm tắt các cuộc trò chuyện sắp xếp giảm dần theo thời gian tạo (`updated_at` / `created_at`).
  - Danh sách tin nhắn (nội dung, người gửi: `user`/`assistant`, thời gian) của cuộc trò chuyện được chọn.
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Chỉ dữ liệu thuộc sở hữu của người dùng hiện tại được tải lên màn hình (`BR-002`).
  - Không có dữ liệu của người dùng khác bị rò rỉ.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-005`, `FR-012`, `NFR-004`, `NFR-018`, `BR-002`, `AC-003`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`, `BR-002`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-AUTH-002 [PROC-002]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium` (truy vấn lọc theo `user_id`, sắp xếp dữ liệu, render danh sách tin nhắn mượt mà).
- **Trạng Thái**: `BASELINED`.

---

### BP-CONV-003 [PROC-006]: Đổi Tên Cuộc Trò Chuyện (Tự Động / Thủ Công)
- **Mã Quy Trình**: `BP-CONV-003` (Trace ID: `PROC-006`).
- **Tên Quy Trình**: Đổi Tên Cuộc Trò Chuyện (Rename Conversation - Auto / Manual).
- **Phân Loại**: Supporting Process (Quy trình quản lý nhãn hội thoại).
- **Mục Đích Nghiệp Vụ**: Cập nhật tiêu đề hiển thị của cuộc trò chuyện nhằm phản ánh nội dung trao đổi, hỗ trợ tìm kiếm và quản lý phiên thuận tiện.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-03` (Tối ưu hóa trải nghiệm tương tác).
- **Sự Kiện Kích Hoạt (Trigger)**:
  - *Nhánh Tự Động (Auto)*: Tin nhắn đầu tiên của người dùng gửi thành công và tiêu đề hiện tại là tiêu đề mặc định.
  - *Nhánh Thủ Công (Manual)*: Người dùng nhấn biểu tượng "Sửa tên" trên Sidebar và nhập tên mới.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng) hoặc Tiến trình Hệ thống (`ai-backend`).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**: Cuộc trò chuyện tồn tại và thuộc sở hữu của người dùng.
- **Đầu Vào (Inputs)**:
  - *Tự động*: Chuỗi ký tự tin nhắn đầu tiên (trích xuất tối đa 30 ký tự đầu).
  - *Thủ công*: Chuỗi tiêu đề mới người dùng nhập (1 - 255 ký tự).
- **Đầu Ra (Outputs)**: Bản ghi `conversations.title` được cập nhật trong CSDL và phản ánh ngay lên Sidebar.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Tiêu đề mới được lưu trữ bền vững.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-006`, `BR-004`, `BR-002`, `AC-003`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-002`, `BR-004`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-CONV-001 [PROC-004]`.
- **Độ Ưu Tiên**: `SHOULD`.
- **Độ Phức Tạp**: `Low`.
- **Trạng Thái**: `BASELINED`.

---

### BP-CONV-004 [PROC-007]: Xóa Cuộc Trò Chuyện & Dữ Liệu Liên Quan
- **Mã Quy Trình**: `BP-CONV-004` (Trace ID: `PROC-007`).
- **Tên Quy Trình**: Xóa Cuộc Trò Chuyện (Delete Conversation).
- **Phân Loại**: Supporting Process (Quy trình dọn dẹp dữ liệu).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng chủ động loại bỏ các cuộc trò chuyện không còn nhu cầu lưu giữ.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-04` (Quyền riêng tư dữ liệu cá nhân).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn biểu tượng "Xóa" cạnh cuộc trò chuyện trên Sidebar và xác nhận.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, PostgreSQL.
- **Điều Kiện Tiên Quyết (Preconditions)**: Cuộc trò chuyện tồn tại và thuộc sở hữu của người dùng hiện tại.
- **Đầu Vào (Inputs)**: Yêu cầu xóa (`DELETE /api/v1/conversations/{id}`).
- **Đầu Ra (Outputs)**: Cuộc trò chuyện và các tin nhắn liên quan được xóa bỏ; danh mục Sidebar được cập nhật tức thì; khung chat chuyển về trạng thái trống hoặc nạp cuộc trò chuyện gần nhất.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Người dùng không thể truy cập lại cuộc trò chuyện này nữa.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-007`, `BR-002`, `NFR-018`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`, `BR-002`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-CONV-001 [PROC-004]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Low`.
- **Trạng Thái**: `BASELINED`.

---

### BP-CHAT-001 [PROC-008]: Gửi Tin Nhắn & Tương Tác Đàm Thoại
- **Mã Quy Trình**: `BP-CHAT-001` (Trace ID: `PROC-008`).
- **Tên Quy Trình**: Gửi Tin Nhắn & Tương Tác Đàm Thoại (Send Message & Chat Interaction).
- **Phân Loại**: Core Business Process (Quy trình nghiệp vụ cốt lõi).
- **Mục Đích Nghiệp Vụ**: Tiếp nhận câu hỏi/yêu cầu bằng ngôn ngữ tự nhiên từ người dùng, lưu trữ tin nhắn người dùng, gọi dịch vụ AI và trả về kết quả dạng luồng dữ liệu thời gian thực (Streaming SSE) với khả năng hiển thị định dạng Markdown và mã nguồn.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01`, `BO-02` (Độ ổn định cao), `BO-03` (Giao diện trực quan, mượt mà).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng gõ nội dung vào ô nhập liệu và nhấn phím Enter hoặc nút "Gửi".
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Người dùng đã xác thực).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, Ingress Gateway, `ai-backend`, PostgreSQL, `BP-AI-001 [PROC-009]`.
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Người dùng đã đăng nhập hợp lệ (`BP-AUTH-002`).
  - Đang mở một cuộc trò chuyện hợp lệ (`BP-CONV-001` hoặc `BP-CONV-002`).
  - Chưa vượt hạn mức tần suất gửi tin nhắn (`BP-SEC-001`).
- **Đầu Vào (Inputs)**:
  - Nội dung tin nhắn văn bản (`content`: 1 - 4,000 ký tự).
  - Mã định danh cuộc trò chuyện (`conversation_id`).
  - Tùy chọn mô hình nếu người dùng chỉ định (`model_override`, mặc định theo hệ thống).
- **Đầu Ra (Outputs)**:
  - Tin nhắn người dùng được lưu trong CSDL (`role = user`).
  - Luồng phản hồi Server-Sent Events (SSE) hiển thị từng ký tự (token) trên khung chat (`NFR-003`).
  - Toàn bộ nội dung trả lời của AI được lưu trong CSDL (`role = assistant`).
  - Giao diện render Markdown có syntax highlighting (`FR-013`).
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Trạng thái hội thoại cập nhật tin nhắn mới nhất.
  - Tiêu đề hội thoại được cập nhật tự động nếu đây là tin nhắn đầu tiên (`BR-004`).
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-008`, `FR-009`, `FR-012`, `FR-013`, `NFR-003`, `NFR-004`, `AC-004`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-001`, `BR-002`, `BR-003` (Độ dài tin nhắn <= 4000 ký tự), `BR-004`, `BR-005`, `BR-006`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào `BP-CONV-001`, `BP-AUTH-002`, `BP-SEC-001`. Gọi trực tiếp `BP-AI-001 [PROC-009]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High` (xử lý bất đồng bộ, stream SSE, quản lý trạng thái kết nối mạng, xử lý gián đoạn).
- **Trạng Thái**: `BASELINED`.

---

### BP-AI-001 [PROC-009]: Điều Phối AI & Tự Động Chuyển Vùng Dự Phòng
- **Mã Quy Trình**: `BP-AI-001` (Trace ID: `PROC-009`).
- **Tên Quy Trình**: Điều Phối AI & Tự Động Chuyển Vùng Dự Phòng (LLM Orchestration & Failover).
- **Phân Loại**: External Integration Process (Quy trình tích hợp đám mây & tự phục hồi).
- **Mục Đích Nghiệp Vụ**: Đóng gói prompt và lịch sử hội thoại, điều hướng yêu cầu tới mô hình AI chính (Google Gemini API). Nếu nhà cung cấp chính gặp sự cố (429, 5xx, timeout 30s), tự động bắt lỗi và chuyển tiếp yêu cầu sang nhà cung cấp phụ (OpenAI API) mà không làm gián đoạn trải nghiệm người dùng.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-02` (Sẵn sàng cao, giảm thiểu downtime), `BO-01`.
- **Sự Kiện Kích Hoạt (Trigger)**: Được gọi bởi `BP-CHAT-001 [PROC-008]` khi tin nhắn người dùng hợp lệ.
- **Tác Nhân Chính (Primary Actor)**: Tiến trình Hệ thống (`LLMManager` trong `ai-backend`).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Google Gemini API, OpenAI API.
- **Điều Kiện Tiên Quyết (Preconditions)**: Các biến môi trường API Key (`GEMINI_API_KEY`, `OPENAI_API_KEY`) được cấu hình hợp lệ trên máy chủ.
- **Đầu Vào (Inputs)**: Lịch sử tin nhắn ngữ cảnh (`context messages`), câu hỏi mới nhất của người dùng, cấu hình timeout (30s).
- **Đầu Ra (Outputs)**: Luồng token bất đồng bộ (`Async Generator`) trả về cho tiến trình SSE của `BP-CHAT-001`.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Dữ liệu phản hồi hoàn chỉnh được thu thập đầy đủ; nhật ký điều phối ghi nhận nhà cung cấp nào đã phản hồi thành công.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-010`, `FR-011`, `FR-014`, `NFR-008`, `NFR-009`, `AC-004`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-005` (Thứ tự ưu tiên Gemini trước, OpenAI dự phòng).
- **Phụ Thuộc Nghiệp Vụ**: Được gọi bởi `BP-CHAT-001 [PROC-008]`. Phụ thuộc vào dịch vụ Internet công cộng bên ngoài.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High` (xử lý lỗi mạng phân tán, chuyển vùng trong suốt, retry logic).
- **Trạng Thái**: `BASELINED`.

---

### BP-SEC-001 [PROC-010]: Kiểm Soát Tần Suất Yêu Cầu 2 Tầng
- **Mã Quy Trình**: `BP-SEC-001` (Trace ID: `PROC-010`).
- **Tên Quy Trình**: Kiểm Soát Tần Suất Yêu Cầu 2 Tầng (Dual-Tier Rate Limiting Defense).
- **Phân Loại**: Security Control Process (Quy trình phòng thủ an ninh hệ thống).
- **Mục Đích Nghiệp Vụ**: Kiểm soát tốc độ và số lượng yêu cầu gửi tới hệ thống nhằm triệt tiêu các hành vi tấn công từ chối dịch vụ (DoS/DDoS), spam API và vét cạn tài nguyên mô hình AI.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-02` (Bảo vệ tính sẵn sàng của hạ tầng), `BO-04` (Bảo vệ tài nguyên hệ thống).
- **Sự Kiện Kích Hoạt (Trigger)**: Bất kỳ yêu cầu HTTP nào từ máy khách gửi tới hệ thống AI-Chan.
- **Tác Nhân Chính (Primary Actor)**: Ingress Nginx Gateway (`ai-infra`) và Bộ lọc Middleware FastAPI (`ai-backend`).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Bộ đếm bộ nhớ đệm / In-memory sliding window rate limiter.
- **Điều Kiện Tiên Quyết (Preconditions)**: Các ngưỡng kiểm soát tần suất đã được định nghĩa trong cấu hình hệ thống.
- **Đầu Vào (Inputs)**: Địa chỉ IP máy khách (`Client IP`), Đường dẫn API (`Request Path`), Thời điểm gửi (`Timestamp`).
- **Đầu Ra (Outputs)**:
  - *Nếu trong định mức*: Yêu cầu được chuyển tiếp tiếp tục xử lý bình thường.
  - *Nếu vượt định mức*: Phản hồi từ chối ngay lập tức với mã trạng thái `HTTP 429 Too Many Requests` và tiêu đề `Retry-After`.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Hệ thống duy trì được tải ổn định, không bị nghẽn tài nguyên CPU hoặc cạn kiệt ngân sách API.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `NFR-007`, `SEC-005`, `AC-005`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-006` (Chặn đứng mọi request vượt ngưỡng).
- **Phụ Thuộc Nghiệp Vụ**: Là lớp lá chắn bảo vệ bao bọc toàn bộ các quy trình nghiệp vụ khác.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-USER-001 [PROC-011]: Quản Lý & Cập Nhật Hồ Sơ Người Dùng
- **Mã Quy Trình**: `BP-USER-001` (Trace ID: `PROC-011`).
- **Tên Quy Trình**: Quản Lý & Cập Nhật Hồ Sơ Người Dùng (User Profile & Preferences Management).
- **Phân Loại**: Supporting Process (Quy trình quản lý hồ sơ).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng xem thông tin tài khoản, chỉnh sửa họ tên, username, bio, phone, avatar và tùy biến giao diện/ngôn ngữ.
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng truy cập trang Cài đặt / Hồ sơ và bấm lưu thông tin hoặc đổi tùy chọn.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, Database SQLite.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập với JWT Cookie hợp lệ (`ACTIVE`).
- **Đầu Vào (Inputs)**: `full_name`, `username`, `bio`, `phone_number`, `avatar_url`, `theme_preference`, `language_preference`.
- **Đầu Ra (Outputs)**: Bản ghi `users` được cập nhật, dữ liệu hiển thị đồng bộ trên giao diện.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Thông tin hồ sơ mới có hiệu lực ngay lập tức, `updated_at` được cập nhật.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-015`, `FR-016`, `FR-017`, `FR-020`, `AC-007-A`, `AC-007-B`, `AC-007-C`, `AC-007-F`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-007` (Định dạng & duy nhất username), `BR-011` (Tiêu chuẩn avatar).
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-USER-002 [PROC-012]: Thay Đổi Thông Tin Nhạy Cảm (Email / Mật Khẩu)
- **Mã Quy Trình**: `BP-USER-002` (Trace ID: `PROC-012`).
- **Tên Quy Trình**: Thay Đổi Thông Tin Nhạy Cảm (Sensitive Security Attributes Modification).
- **Phân Loại**: Security Process (Quy trình an ninh tài khoản).
- **Mục Đích Nghiệp Vụ**: Thực hiện thay đổi địa chỉ email hoặc mật khẩu đăng nhập với cơ chế bảo vệ tái xác thực mật khẩu hiện tại (Re-authentication) và thu hồi phiên cũ.
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng gửi yêu cầu đổi Email hoặc đổi Mật khẩu tại tab Bảo mật.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend`, Database SQLite.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang đăng nhập và nhớ mật khẩu hiện tại.
- **Đầu Vào (Inputs)**: `current_password`, (`new_email` HOẶC `new_password`).
- **Đầu Ra (Outputs)**: Email mới hoặc Hash mật khẩu mới được lưu, token mới được cấp phát, log kiểm toán được ghi.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Tài khoản sử dụng thông tin định danh mới, các phiên đăng nhập cũ bị thu hồi.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-018`, `FR-019`, `AC-007-D`, `AC-007-E`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-008` (Bắt buộc xác thực mật khẩu cũ), `BR-009` (Độ phức tạp mật khẩu), `BR-010` (Duy nhất email), `SEC-006`, `SEC-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High`.
- **Trạng Thái**: `BASELINED`.

---

### BP-AGENT-001 [PROC-013]: Quản Lý Vòng Đời & Kích Hoạt Mô Hình Agent Đa Nhà Cung Cấp
- **Mã Quy Trình**: `BP-AGENT-001` (Trace ID: `PROC-013`).
- **Tên Quy Trình**: Quản Lý Vòng Đời & Kích Hoạt Mô Hình Agent Đa Nhà Cung Cấp (Multi-Provider Agent Model Management & Activation).
- **Phân Loại**: Management & Integration Process (Quy trình quản trị và tích hợp AI).
- **Mục Đích Nghiệp Vụ**: Duy trì danh mục mô hình tập trung từ các nhà cung cấp bên ngoài (Google, Anthropic, OpenAI, Groq, Ollama), thực hiện kiểm tra kết nối (Ping/Health Check), kích hoạt (`activate`), hủy kích hoạt (`deactivate`) an toàn mà không xóa cứng dữ liệu (`BR-012`), và duy trì ít nhất một mô hình mặc định hoạt động (`BR-013`).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng hoặc quản trị viên truy cập trang Cài đặt Model, nhấn kiểm tra kết nối, bật/tắt công tắc kích hoạt hoặc đặt làm mặc định.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User / Admin).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-frontend`, `ai-backend` (`AgentModelManager`), `ai-backend/llm` (`LangChainModelFactory`), Các nhà cung cấp AI ngoài (`.env`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập; hệ thống đã cấu hình file `.env`.
- **Đầu Vào (Inputs)**: `model_id`, hành động (`test`, `activate`, `deactivate`, `set_default`).
- **Đầu Ra (Outputs)**: Trạng thái mới của model (`ACTIVE`/`INACTIVE`), kết quả ping (`latency_ms`), thông báo thành công hoặc lỗi từ chối nghiệp vụ.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Danh sách model hoạt động được cập nhật đồng bộ cho giao diện chọn model trong phòng chat và bộ điều phối LangGraph.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-021`, `FR-022`, `FR-023`, `FR-024`, `FR-025`, `FR-026`, `AC-008-A..F`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-012` (Cấm xóa cứng), `BR-013` (Bất biến mô hình mặc định), `BR-014` (Kiểm tra khóa trước khi kích hoạt), `BR-015` (Tự động hạ cấp), `ADR-005`, `ADR-006`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-AUTH-004 [PROC-014]: Xác Thực & Đăng Ký Tài Khoản Qua Discord OAuth2
- **Mã Quy Trình**: `BP-AUTH-004` (Trace ID: `PROC-014`).
- **Tên Quy Trình**: Xác Thực & Đăng Ký Tài Khoản Qua Discord OAuth2 (Discord OAuth2 Authentication & Account Provisioning).
- **Phân Loại**: Core Process (Quy trình xác thực & mở rộng tài khoản bên thứ ba).
- **Mục Đích Nghiệp Vụ**: Cung cấp kênh đăng ký và đăng nhập nhanh không cần mật khẩu thông qua tài khoản Discord, tự động liên kết tài khoản đã tồn tại nếu email đã xác minh, và thiết lập phiên làm việc JWT an toàn.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-03` (Trải nghiệm người dùng thuận tiện, giảm tỷ lệ bỏ rơi khi đăng ký), `BO-04` (Bảo mật tài khoản).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "Tiếp tục với Discord" trên màn hình Đăng nhập hoặc Đăng ký.
- **Tác Nhân Chính (Primary Actor)**: `ACT-01` (Guest User), `ACT-02` (Registered User).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), Máy chủ ứng dụng (`ai-backend`), Nhà cung cấp định danh (`Discord OAuth2 Provider`), Cơ sở dữ liệu SQLite.
- **Điều Kiện Tiên Quyết (Preconditions)**: Hệ thống đã cấu hình `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`; người dùng sở hữu tài khoản Discord đang hoạt động.
- **Đầu Vào (Inputs)**: Yêu cầu khởi tạo đăng nhập OAuth2 (`GET /auth/discord/login`), mã xác nhận Discord (`code`), mã bảo vệ (`state`).
- **Đầu Ra (Outputs)**:
  - Bản ghi tài khoản người dùng được tạo mới hoặc cập nhật liên kết `discord_id`.
  - Cookie HttpOnly chứa JWT Token có hiệu lực 7 ngày.
  - Chuyển hướng người dùng về giao diện `/chat`.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Người dùng đăng nhập thành công vào hệ thống với đầy đủ quyền hạn của tài khoản thông thường.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-027`, `FR-028`, `SEC-004`, `SEC-008`, `AC-009-A`, `AC-009-B`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-016` (Bảo vệ CSRF bằng State), `BR-017` (Tự động liên kết qua Verified Email), `BR-018` (Mật khẩu rỗng cho OAuth), `ADR-007`.
- **Phụ Thuộc Nghiệp Vụ**: Phụ thuộc vào cấu hình biến môi trường Discord API; tương thích với cấu trúc phiên làm việc của `BP-AUTH-002 [PROC-002]`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High` (Xử lý chuỗi ủy quyền OAuth2, chữ ký HMAC, trao đổi token liên mạng và liên kết dữ liệu an toàn).
- **Trạng Thái**: `BASELINED`.

---

### BP-RES-001 [PROC-015]: Thu Thập & Đo Lường Tài Nguyên Telemetry Tự Động
- **Mã Quy Trình**: `BP-RES-001` (Trace ID: `PROC-015`).
- **Tên Quy Trình**: Thu Thập & Đo Lường Tài Nguyên Telemetry Tự Động (Automated Telemetry Collection & Latency Measurement).
- **Phân Loại**: Observability Process (Quy trình giám sát hiệu năng hệ thống).
- **Mục Đích Nghiệp Vụ**: Đo lường độ trễ toàn trình (`latency_ms`), độ trễ Time-to-First-Token (`ttft_ms`), số lượng token và mã trạng thái HTTP một cách tự động, minh bạch và có tính nguyên tử (`BR-019`).
- **Sự Kiện Kích Hoạt (Trigger)**: Bất kỳ yêu cầu HTTP hoặc đàm thoại SSE nào được gửi tới máy chủ FastAPI.
- **Tác Nhân Chính (Primary Actor)**: `System` / `FastAPI Telemetry Middleware`.
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: `ai-backend` (Middleware & Streaming Hook), `ai-backend/llm` (Token Calculator), CSDL SQLite (`api_metric_logs`, `user_quotas`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Backend đang chạy và tiếp nhận lưu lượng mạng.
- **Đầu Vào (Inputs)**: Yêu cầu HTTP, metadata token từ LLM provider, thời điểm bắt đầu `t_start`.
- **Đầu Ra (Outputs)**: Bản ghi đo lường được thêm mới vào `api_metric_logs`, cập nhật số token tích lũy trong `user_quotas`, đẩy sự kiện vào Telemetry Ring Buffer.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Số liệu tài nguyên được lưu vết đầy đủ và sẵn sàng cho việc phân tích, phát sóng thời gian thực.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-029`, `FR-030`, `FR-031`, `NFR-020`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-019` (Bất biến toàn vẹn telemetry), `ADR-008`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-RES-002 [PROC-016]: Phát Luồng Giám Sát Thời Gian Thực & Kiểm Soát Quota
- **Mã Quy Trình**: `BP-RES-002` (Trace ID: `PROC-016`).
- **Tên Quy Trình**: Phát Luồng Giám Sát Thời Gian Thực & Kiểm Soát Quota (Real-Time Telemetry Streaming & Quota Guard).
- **Phân Loại**: Monitoring & Throttling Process (Quy trình giám sát trực quan & kiểm soát hạn ngạch).
- **Mục Đích Nghiệp Vụ**: Cung cấp kênh truyền dữ liệu Server-Sent Events (SSE) liên tục cập nhật chỉ số đo lường cho màn hình Dashboard tại `/dashboard`, đồng thời phát hiện và chặn các hành vi tiêu dùng vượt quá hạn ngạch quota cá nhân (`BR-020`).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng truy cập màn hình `/dashboard` hoặc gửi prompt khi đã chạm ngưỡng hạn ngạch.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User) / `System Admin`.
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), `ai-backend` (SSE Event Broadcaster, Quota Evaluator), Telemetry Ring Buffer bus.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã xác thực JWT Cookie.
- **Đầu Vào (Inputs)**: Kết nối SSE tới `GET /api/v1/resources/stream` (`OP-019`), yêu cầu tóm tắt `GET /api/v1/resources/summary` (`OP-018`).
- **Đầu Ra (Outputs)**: Luồng dữ liệu sự kiện SSE `metric_tick` cập nhật mỗi giây, phản hồi HTTP 429 khi hết hạn ngạch token, biểu đồ thời gian thực hiển thị trên UI.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Giao diện Dashboard được đồng bộ thời gian thực; tài khoản vượt quota bị chặn an toàn.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-032`, `FR-033`, `FR-034`, `NFR-021`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-020` (Cảnh báo 80%, chặn 100%), `BR-021` (Cô lập phân quyền dữ liệu), `CTRL-008`, `SEC-009`, `ADR-008`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High`.
- **Trạng Thái**: `BASELINED`.

---

### BP-MOD-001 [PROC-017]: Đăng Ký & Hiệu Chỉnh Cấu Hình Mô Hình Agent
- **Mã Quy Trình**: `BP-MOD-001` (Trace ID: `PROC-017`).
- **Tên Quy Trình**: Đăng Ký & Hiệu Chỉnh Cấu Hình Mô Hình Agent (Model Catalog Registration & Mutation Lifecycle).
- **Phân Loại**: Supporting & Configuration Process (Quy trình quản trị danh mục mô hình).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng và quản trị viên khai báo thêm các mô hình AI mới hoặc điều chỉnh các tham số kỹ thuật (Context window, Max tokens, Streaming) của mô hình hiện hành với các chốt chặn thẩm định biên an toàn và bất biến định danh.
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng gửi yêu cầu thêm mô hình mới (`POST /models`) hoặc chỉnh sửa thông tin mô hình (`PUT /models/{id}`).
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User / Admin).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), `ai-backend` (Model Management Controller, Validator), CSDL SQLite (`agent_models`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập với phiên làm việc hợp lệ.
- **Đầu Vào (Inputs)**: Cấu hình mô hình (`id`, `name`, `provider`, `context_window`, `max_tokens`, `supports_streaming`).
- **Đầu Ra (Outputs)**: Bản ghi `AgentModel` được tạo mới hoặc cập nhật trong CSDL, trả về mã trạng thái HTTP 201 hoặc 200, giao diện danh mục hiển thị dữ liệu mới.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Cấu hình mô hình mới sẵn sàng hoạt động trong hệ thống mà không làm ảnh hưởng đến tính toàn vẹn dữ liệu.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-035`, `FR-036`, `SEC-010`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-022` (Bất biến & duy nhất ID/Provider), `BR-024` (Biên an toàn tham số), `CTRL-009`, `ADR-009`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-MOD-002 [PROC-018]: Tìm Kiếm, Sàng Lọc Đa Tiêu Chí & Lưu Trữ Mềm Mô Hình
- **Mã Quy Trình**: `BP-MOD-002` (Trace ID: `PROC-018`).
- **Tên Quy Trình**: Tìm Kiếm, Sàng Lọc Đa Tiêu Chí & Lưu Trữ Mềm Mô Hình (Model Multi-Criteria Search, Filtering & Soft Archival).
- **Phân Loại**: Supporting & Operational Process (Quy trình khai thác danh mục & vòng đời mô hình).
- **Mục Đích Nghiệp Vụ**: Cung cấp công cụ tìm kiếm toàn văn/mờ tức thì, bộ lọc kết hợp đa thuộc tính cho danh mục mô hình với hiệu năng cao (< 200ms), đồng thời hỗ trợ chuyển trạng thái mô hình sang `ARCHIVED` có chốt chặn bảo vệ mô hình mặc định.
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng gõ từ khóa tìm kiếm, thay đổi bộ lọc trên giao diện `/models`, hoặc bấm lệnh xóa/lưu trữ mô hình.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User / Admin).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), `ai-backend` (Query Engine, Router Synchronization), CSDL SQLite (`agent_models`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Danh mục mô hình tồn tại trong hệ thống.
- **Đầu Vào (Inputs)**: Từ khóa `q`, các bộ lọc (`provider`, `status`, `has_api_key`, `is_default`, `sort`), hoặc yêu cầu xóa `DELETE /models/{id}`.
- **Đầu Ra (Outputs)**: Danh sách mô hình thỏa mãn điều kiện lọc với độ trễ $\le 200\text{ms}$, hoặc bản ghi mô hình được cập nhật trạng thái `ARCHIVED`.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Kết quả lọc được kết xuất trực quan; mô hình lưu trữ bị loại bỏ khỏi danh mục chọn đàm thoại của Agent nhưng lịch sử hội thoại vẫn được bảo toàn.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-037`, `FR-038`, `FR-039`, `NFR-022`, `UX-008`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-023` (Cấm lưu trữ mô hình mặc định), `CTRL-009`, `ADR-009`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-USER-003 [PROC-019]: Liên Kết Tài Khoản Người Dùng Với Discord
- **Mã Quy Trình**: `BP-USER-003` (Trace ID: `PROC-019`).
- **Tên Quy Trình**: Liên Kết Tài Khoản Người Dùng Với Discord (Authenticated Discord Account Linking).
- **Phân Loại**: Supporting Process (Quy trình quản lý liên kết định danh).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng đã xác thực kết nối tài khoản Discord cá nhân với tài khoản website hiện hữu để đồng bộ hóa thông tin và mở khóa đăng nhập nhanh một chạm, đồng thời bảo đảm tính duy nhất không xung đột tài khoản (`BR-025`).
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-03` (Trải nghiệm người dùng tiện lợi), `BO-04` (Bảo mật tài khoản).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "Liên kết Discord" tại tab Kết nối của trang Cài đặt (`/settings?tab=connections`).
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), `ai-backend` (Auth Controller), Discord OAuth2 Authorization Server, Database SQLite (`users`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang đăng nhập với phiên JWT hợp lệ; tài khoản chưa liên kết Discord.
- **Đầu Vào (Inputs)**: Yêu cầu khởi tạo `GET /api/v1/auth/discord/link` (`OP-026`), mã ủy quyền OAuth callback `GET /api/v1/auth/discord/callback?code=...&state=...` (`OP-027`).
- **Đầu Ra (Outputs)**: Bản ghi người dùng được cập nhật `discord_id` và `discord_username`; giao diện hiển thị trạng thái đã liên kết kèm tên người dùng Discord.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Người dùng có thể đăng nhập bằng Discord; tài khoản Discord được bảo vệ không thể liên kết sang tài khoản khác.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-040`, `FR-042`, `NFR-023`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-016` (Chống CSRF state), `BR-025` (Bất biến ánh xạ 1-1 duy nhất), `SEC-011`, `CTRL-010`, `ADR-010`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-USER-004 [PROC-020]: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn
- **Mã Quy Trình**: `BP-USER-004` (Trace ID: `PROC-020`).
- **Tên Quy Trình**: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn (Safe Discord Account Unlinking with Lockout Guard).
- **Phân Loại**: Supporting Process (Quy trình an ninh quản lý định danh).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng gỡ bỏ liên kết Discord khỏi tài khoản cá nhân một cách an toàn, với chốt chặn bắt buộc phải có mật khẩu đăng nhập trước khi gỡ (`BR-026`) và tái xác thực mật khẩu hiện tại (`BR-027`), triệt tiêu 100% rủi ro mất quyền truy cập tài khoản.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-04` (Bảo mật tài khoản người dùng, chống mất quyền truy cập).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng nhấn nút "Hủy liên kết" tại thẻ Discord trên trang Cài đặt và nhập mật khẩu xác nhận.
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), `ai-backend` (User Controller, Password Verifier), Database SQLite (`users`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang đăng nhập; tài khoản đang có liên kết Discord (`discord_id IS NOT NULL`).
- **Đầu Vào (Inputs)**: Yêu cầu `DELETE /api/v1/users/me/discord` (`OP-028`) kèm mật khẩu xác nhận trong payload `{"password": "..."}`.
- **Đầu Ra (Outputs)**: Bản ghi người dùng được cập nhật `discord_id = NULL`, `discord_username = NULL`; phản hồi HTTP 200 OK.
- **Điều Kiện Sau Thực Hiện (Postconditions)**: Tài khoản Discord được giải phóng an toàn; người dùng vẫn duy trì quyền đăng nhập bằng email và mật khẩu bình thường.
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-041`, `FR-042`, `NFR-023`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-026` (Chốt chặn có mật khẩu), `BR-027` (Tái xác thực mật khẩu), `SEC-006`, `SEC-011`, `CTRL-010`, `ADR-010`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `Medium`.
- **Trạng Thái**: `BASELINED`.

---

### BP-BOT-001 [PROC-022]: Quản Lý Cấu Hình & Khám Phá Máy Chủ Discord Bot
- **Mã Quy Trình**: `BP-BOT-001` (Trace ID: `PROC-022`).
- **Tên Quy Trình**: Quản Lý Cấu Hình & Khám Phá Máy Chủ Discord Bot (Discord Bot Configuration Management & Guild Discovery).
- **Phân Loại**: Supporting & Integration Process (Quy trình quản trị cấu hình & tích hợp bot).
- **Mục Đích Nghiệp Vụ**: Cho phép người dùng đã liên kết hoặc đăng nhập bằng tài khoản Discord khám phá các Guild (Discord server) mà họ có quyền quản trị (`BR-034`), chọn server kích hoạt bot, điều chỉnh mô hình AI định tuyến hoạt động (`BR-033`), tùy biến persona system prompt, thiết lập kênh chat chỉ định, và kiểm soát trần hạn mức token tối đa.
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-02` (Mở rộng khả năng phục vụ AI đa nền tảng), `BO-03` (Trải nghiệm người dùng thông suốt Discord - Web), `BO-04` (Bảo vệ kiểm soát tài nguyên).
- **Sự Kiện Kích Hoạt (Trigger)**: Người dùng điều hướng vào trang Quản lý Bot Discord (`/bot/discord` - `SCR-006`) hoặc thay đổi form cấu hình bot và nhấn "Lưu cấu hình".
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (Registered User đã liên kết Discord).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Trình duyệt Web (`ai-frontend`), Dịch vụ API Backend (`ai-backend`), Discord REST API v10, CSDL SQLite (`discord_bot_configs`, `agent_models`).
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Người dùng có phiên JWT hợp lệ.
  - Tài khoản người dùng đã liên kết định danh Discord (`discord_id IS NOT NULL` - `BR-031`).
  - Người dùng nắm giữ quyền `ADMINISTRATOR` (0x8) hoặc `MANAGE_GUILD` (0x20) tại Discord Guild mục tiêu (`BR-034`).
- **Đầu Vào (Inputs)**:
  - Yêu cầu truy vấn danh sách Guild: `GET /api/v1/bot/discord/guilds` (`OP-033`).
  - Yêu cầu lấy cấu hình hiện hành: `GET /api/v1/bot/discord/config` (`OP-031`).
  - Yêu cầu cập nhật cấu hình: `PUT /api/v1/bot/discord/config` (`OP-032`) kèm body JSON:
    - `guild_id` (string, tùy chọn): ID của Discord server áp dụng.
    - `channel_id` (string, tùy chọn): ID kênh chat giới hạn.
    - `active_model_id` (string): Mã mô hình AI xử lý tương tác.
    - `system_prompt` (string): Persona prompt tùy biến.
    - `max_tokens_per_response` (integer): Trần token tối đa cho mỗi phản hồi (50 - 4000).
    - `is_enabled` (boolean): Trạng thái kích hoạt bot.
- **Đầu Ra (Outputs)**:
  - Danh sách Guild hợp lệ kèm cờ quyền quản trị và trạng thái bot hiện diện.
  - Bản ghi `DiscordBotConfig` đã được lưu trữ an toàn trong DB.
  - Phản hồi HTTP 200 OK trả về cấu hình chi tiết đã cập nhật.
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Cấu hình bot có hiệu lực tức thời cho mọi yêu cầu tương tác tiếp theo từ Discord.
  - Mô hình chỉ định phải ở trạng thái `ACTIVE` (`BR-033`).
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-044`, `FR-045`, `FR-046`, `NFR-025`, `UX-011`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-031` (Tiền điều kiện liên kết), `BR-033` (Định tuyến model active), `BR-034` (Thẩm quyền quản trị Guild), `SEC-013`, `CTRL-012`, `ADR-012`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High`.
- **Trạng Thái**: `BASELINED`.

---

### BP-BOT-002 [PROC-023]: Điều Phối Tương Tác Bot Discord & Trừ Hạn Ngạch Hợp Nhất
- **Mã Quy Trình**: `BP-BOT-002` (Trace ID: `PROC-023`).
- **Tên Quy Trình**: Điều Phối Tương Tác Bot Discord & Trừ Hạn Ngạch Hợp Nhất (Discord Bot Interaction Dispatch & Shared Quota Accounting).
- **Phân Loại**: Core & Operational Process (Quy trình vận hành & điều phối tương tác thời gian thực).
- **Mục Đích Nghiệp Vụ**: Tiếp nhận yêu cầu tương tác từ Discord, xác thực chữ ký số Ed25519 (`SEC-013`), nạp cấu hình bot của người dùng, kiểm tra trần hạn ngạch token dùng chung với Web (`BR-032`), định tuyến prompt tới mô hình AI đang kích hoạt (`BR-033`), thực thi gọi LLM, trừ quota nguyên tử và đồng bộ hội thoại vào lịch sử Web (`FR-047`).
- **Mục Tiêu Kinh Doanh Hỗ Trợ**: `BO-01` (Tương tác đàm thoại tự nhiên), `BO-02` (Hỗ trợ mô hình thông minh đa nguồn), `BO-04` (Kiểm soát hạn ngạch và an toàn vận hành).
- **Sự Kiện Kích Hoạt (Trigger)**: Discord Gateway webhook gửi Interaction payload (`APPLICATION_COMMAND` hoặc `MESSAGE`) hoặc người dùng gọi kiểm thử dispatch `POST /api/v1/bot/discord/test-dispatch` (`OP-034`).
- **Tác Nhân Chính (Primary Actor)**: `ACT-02` (User trên Discord) / System (Interaction Dispatcher).
- **Tác Nhân Hỗ Trợ / Hệ Thống Tham Gia**: Discord Interaction Endpoint, `ai-backend` (Security Middleware, Bot Service, LLM Orchestrator), LLM Providers (OpenAI, Gemini, Ollama, DeepSeek), Database SQLite (`user_quotas`, `messages`, `api_metric_logs`).
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Cấu hình Bot của người dùng đang ở trạng thái kích hoạt (`is_enabled = true`).
  - Người dùng còn hạn ngạch token khả dụng trong ngày (`used_tokens < total_limit` - `BR-032`).
- **Đầu Vào (Inputs)**:
  - Header bảo mật: `X-Signature-Ed25519`, `X-Signature-Timestamp` (`SEC-013`).
  - Payload tương tác: `channel_id`, `guild_id`, `discord_user_id`, `query_text`, hoặc request `OP-034`.
- **Đầu Ra (Outputs)**:
  - Phản hồi Discord Interaction trong thời hạn $\le 300\text{ms}$ (Ack defer hoặc phản hồi tức thời - `NFR-025`).
  - Nội dung câu trả lời hoàn chỉnh từ AI được gửi về Discord channel.
  - Bản ghi câu hỏi và câu trả lời được lưu đồng bộ vào bảng `messages` (gắn cờ `source = DISCORD`) cho phiên chat tương ứng trên Web (`FR-047`).
  - Cập nhật số token tiêu thụ vào `user_quotas` và ghi log vào `api_metric_logs`.
- **Điều Kiện Sau Thực Hiện (Postconditions)**:
  - Hạn ngạch hợp nhất giữa Web và Discord phản ánh chính xác lượng token tiêu thụ.
  - Người dùng có thể xem lại lịch sử trò chuyện Discord trên giao diện Web (`FR-047`).
- **Yêu Cầu Nghiệp Vụ Liên Quan**: `FR-046`, `FR-047`, `NFR-025`, `OP-034`, `UC-033`, `UC-034`.
- **Độ Ưu Tiên**: `MUST`.
- **Độ Phức Tạp**: `High`.
- **Trạng Thái**: `BASELINED`.











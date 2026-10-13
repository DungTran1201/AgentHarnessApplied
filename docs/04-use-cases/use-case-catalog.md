# DANH MỤC CA SỬ DỤNG HỆ THỐNG (USE CASE CATALOG)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-CATALOG-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Quy ước mã định danh** | `UC-XXX-### [UC-###]` |
| **Mục đích** | Bảng danh mục chuẩn hóa 9 Ca sử dụng của hệ thống, làm nền tảng cho việc đặc tả chi tiết và làm cơ sở kiểm chứng chất lượng |

---

## 1. Bảng Tổng Hợp Danh Mục Ca Sử Dụng (Use Case Catalog Table)

| Mã Use Case | Trace ID | Tên Ca Sử Dụng (Actor Goal) | Tác Nhân Chính | Độ Ưu Tiên | Năng Lực Liên Quan | Yêu Cầu Đáp Ứng | Quy Trình Tương Ứng | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`UC-AUTH-001`** | `UC-001` | Đăng Ký Tài Khoản Mới | `ACT-01` (Guest) | `MUST` | `CAP-AUTH-01` | `FR-001`, `SEC-002` | `BP-AUTH-001 [PROC-001]` | `BASELINED` |
| **`UC-AUTH-002`** | `UC-002` | Đăng Nhập Hệ Thống | `ACT-01` / `ACT-02` | `MUST` | `CAP-AUTH-02` | `FR-002`, `SEC-004` | `BP-AUTH-002 [PROC-002]` | `BASELINED` |
| **`UC-AUTH-003`** | `UC-003` | Đăng Xuất Khỏi Hệ Thống | `ACT-02` (User) | `MUST` | `CAP-AUTH-03` | `FR-003`, `SEC-004` | `BP-AUTH-003 [PROC-003]` | `BASELINED` |
| **`UC-CONV-001`** | `UC-004` | Khởi Tạo Cuộc Trò Chuyện | `ACT-02` (User) | `MUST` | `CAP-CONV-01` | `FR-004`, `BR-001` | `BP-CONV-001 [PROC-004]` | `BASELINED` |
| **`UC-CONV-002`** | `UC-005` | Xem Lịch Sử Hội Thoại | `ACT-02` (User) | `MUST` | `CAP-CONV-02` | `FR-005`, `FR-012`, `BR-002` | `BP-CONV-002 [PROC-005]` | `BASELINED` |
| **`UC-CONV-003`** | `UC-006` | Đổi Tên Cuộc Trò Chuyện | `ACT-02` (User) | `SHOULD` | `CAP-CONV-03` | `FR-006`, `BR-004` | `BP-CONV-003 [PROC-006]` | `BASELINED` |
| **`UC-CONV-004`** | `UC-007` | Xóa Cuộc Trò Chuyện | `ACT-02` (User) | `MUST` | `CAP-CONV-04` | `FR-007`, `BR-002` | `BP-CONV-004 [PROC-007]` | `BASELINED` |
| **`UC-CHAT-001`** | `UC-008` | Gửi Tin Nhắn & Tương Tác AI | `ACT-02` (User) | `MUST` | `CAP-CHAT-01..04` | `FR-008..013`, `BR-003..005`| `BP-CHAT-001 [PROC-008]` | `BASELINED` |
| **`UC-CHAT-002`** | `UC-009` | Lựa Chọn Mô Hình AI | `ACT-02` (User) | `SHOULD` | `CAP-AI-03` | `FR-014`, `BR-005` | `BP-AI-001 [PROC-009]` | `BASELINED` |
| **`UC-USER-001`** | `UC-010` | Xem Thông Tin Hồ Sơ & Thống Kê | `ACT-02` (User) | `MUST` | `CAP-USER-01` | `FR-015` | `BP-USER-001 [PROC-010]` | `BASELINED` |
| **`UC-USER-002`** | `UC-011` | Cập Nhật Hồ Sơ Cá Nhân | `ACT-02` (User) | `MUST` | `CAP-USER-02` | `FR-016`, `BR-007` | `BP-USER-001 [PROC-010]` | `BASELINED` |
| **`UC-USER-003`** | `UC-012` | Cập Nhật Ảnh Đại Diện | `ACT-02` (User) | `SHOULD` | `CAP-USER-03` | `FR-017`, `BR-011` | `BP-USER-001 [PROC-010]` | `BASELINED` |
| **`UC-USER-004`** | `UC-013` | Thay Đổi Địa Chỉ Email | `ACT-02` (User) | `MUST` | `CAP-USER-04` | `FR-018`, `BR-008`, `BR-010` | `BP-USER-002 [PROC-011]` | `BASELINED` |
| **`UC-USER-005`** | `UC-014` | Thay Đổi Mật Khẩu Đăng Nhập | `ACT-02` (User) | `MUST` | `CAP-USER-05` | `FR-019`, `BR-008`, `BR-009` | `BP-USER-002 [PROC-011]` | `BASELINED` |
| **`UC-USER-006`** | `UC-015` | Tùy Chọn Giao Diện & Ngôn Ngữ | `ACT-02` (User) | `SHOULD` | `CAP-USER-06` | `FR-020` | `BP-USER-001 [PROC-010]` | `BASELINED` |
| **`UC-AGENT-001`** | `UC-016` | Tra Cứu Danh Mục & Trạng Thái Mô Hình Agent | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-021` | `BP-AGENT-001 [PROC-013]` | `BASELINED` |
| **`UC-AGENT-002`** | `UC-017` | Xem Chi Tiết Cấu Hình & Chỉ Số Model | `ACT-02` (User) | `MUST` | `CAP-AGENT-MGMT` | `FR-022` | `BP-AGENT-001 [PROC-013]` | `BASELINED` |
| **`UC-AGENT-003`** | `UC-018` | Kiểm Tra Kết Nối Mô Hình Agent (Ping/Test) | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-023`, `BR-014` | `BP-AGENT-001 [PROC-013]` | `BASELINED` |
| **`UC-AGENT-004`** | `UC-019` | Kích Hoạt / Hủy Kích Hoạt Mô Hình Agent | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-024`, `FR-025`, `BR-012`, `BR-013` | `BP-AGENT-001 [PROC-013]` | `BASELINED` |
| **`UC-AGENT-005`** | `UC-020` | Thiết Lập Mô Hình Mặc Định & Thứ Tự Định Tuyến | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-026`, `BR-013` | `BP-AGENT-001 [PROC-013]` | `BASELINED` |
| **`UC-AUTH-004`** | `UC-021` | Đăng Ký Tài Khoản Qua Discord | `ACT-01` (Guest) | `MUST` | `CAP-AUTH` | `FR-027`, `SEC-008` | `BP-AUTH-004 [PROC-014]` | `BASELINED` |
| **`UC-AUTH-005`** | `UC-022` | Đăng Nhập & Liên Kết Bằng Discord | `ACT-01` / `ACT-02` | `MUST` | `CAP-AUTH` | `FR-028`, `SEC-008` | `BP-AUTH-004 [PROC-014]` | `BASELINED` |
| **`UC-RES-001`** | `UC-023` | Xem Dashboard Giám Sát Tài Nguyên Thời Gian Thực | `ACT-02` / Admin | `MUST` | `CAP-RES-MGMT` | `FR-029`, `FR-031`, `FR-033`, `FR-034` | `BP-RES-002 [PROC-016]` | `BASELINED` |
| **`UC-RES-002`** | `UC-024` | Tra Cứu Thống Kê Sử Dụng Token & Độ Trễ Theo Khoảng Thời Gian | `ACT-02` / Admin | `MUST` | `CAP-RES-MGMT` | `FR-029`, `FR-030`, `FR-031` | `BP-RES-001 [PROC-015]` | `BASELINED` |
| **`UC-RES-003`** | `UC-025` | Kiểm Tra Hạn Ngạch & Cảnh Báo Quota Người Dùng | `ACT-02` (User) | `MUST` | `CAP-RES-MGMT` | `FR-032`, `BR-020` | `BP-RES-002 [PROC-016]` | `BASELINED` |
| **`UC-USER-007`** | `UC-029` | Liên Kết Tài Khoản Đang Đăng Nhập Với Discord | `ACT-02` (User) | `MUST` | `CAP-USER-MGMT` | `FR-040`, `FR-042`, `BR-025` | `BP-USER-003 [PROC-019]` | `BASELINED` |
| **`UC-USER-008`** | `UC-030` | Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn Khóa Tài Khoản | `ACT-02` (User) | `MUST` | `CAP-USER-MGMT` | `FR-041`, `BR-026`, `BR-027` | `BP-USER-004 [PROC-020]` | `BASELINED` |
| **`UC-MOD-001`** | `UC-026` | Đăng Ký & Bổ Sung Mô Hình Agent Mới | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-035`, `BR-022`, `BR-024` | `BP-MOD-001 [PROC-017]` | `BASELINED` |
| **`UC-MOD-002`** | `UC-027` | Chỉnh Sửa Cấu Hình & Lưu Trữ Mềm Mô Hình | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-036`, `FR-039`, `BR-023` | `BP-MOD-001 [PROC-017]` | `BASELINED` |
| **`UC-MOD-003`** | `UC-028` | Tìm Kiếm Tức Thì & Sàng Lọc Đa Tiêu Chí Mô Hình | `ACT-02` / Admin | `MUST` | `CAP-AGENT-MGMT` | `FR-037`, `FR-038`, `NFR-022` | `BP-MOD-002 [PROC-018]` | `BASELINED` |
| **`UC-BOT-001`** | `UC-032` | Cấu Hình & Khám Phá Máy Chủ Discord Bot | `ACT-02` (User) | `MUST` | `CAP-BOT-MGMT` | `FR-044`, `FR-045`, `BR-031`, `BR-034` | `BP-BOT-001 [PROC-022]` | `BASELINED` |
| **`UC-BOT-002`** | `UC-033` | Điều Phối Đàm Thoại & Trừ Quota Bot Discord | `ACT-02` (Discord) | `MUST` | `CAP-BOT-MGMT` | `FR-046`, `BR-032`, `BR-033`, `NFR-025` | `BP-BOT-002 [PROC-023]` | `BASELINED` |
| **`UC-BOT-003`** | `UC-034` | Đồng Bộ Lịch Sử Trò Chuyện Discord - Web | `ACT-02` (User) | `SHOULD` | `CAP-BOT-MGMT` | `FR-047`, `BR-032` | `BP-BOT-002 [PROC-023]` | `BASELINED` |

---

## 2. Tóm Tắt Mục Tiêu & Sự Kiện Kích Hoạt (Goal & Trigger Summary)

### 2.1 UC-AUTH-001 [UC-001]: Đăng Ký Tài Khoản Mới
- **Mục Tiêu Của Actor**: Mở tài khoản hợp lệ trong hệ thống để được cấp quyền lưu trữ và đàm thoại lâu dài với trợ lý ảo.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Đăng ký" trên trang `/register`.
- **Phụ Thuộc**: Tiền đề để thực hiện `UC-AUTH-002`.

### 2.2 UC-AUTH-002 [UC-002]: Đăng Nhập Hệ Thống
- **Mục Tiêu Của Actor**: Xác thực danh tính cá nhân và nhận phiên làm việc bảo mật (JWT Cookie) để truy cập không gian chat.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Đăng nhập" trên trang `/login`.
- **Phụ Thuộc**: Tiền đề bắt buộc cho mọi Use Case trong phân hệ Hội thoại và Chat.

### 2.3 UC-AUTH-003 [UC-003]: Đăng Xuất Khỏi Hệ Thống
- **Mục Tiêu Của Actor**: Kết thúc phiên làm việc hiện tại, xóa Cookie phiên để bảo vệ dữ liệu cá nhân trên thiết bị dùng chung.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Đăng xuất" tại menu hồ sơ.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AUTH-002`.

### 2.4 UC-CONV-001 [UC-004]: Khởi Tạo Cuộc Trò Chuyện
- **Mục Tiêu Của Actor**: Tạo một không gian hội thoại mới, độc lập để bắt đầu trao đổi về một chủ đề mới.
- **Sự Kiện Kích Hoạt**: Người dùng bấm nút "+ Đoạn chat mới" trên thanh Sidebar.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AUTH-002`.

### 2.5 UC-CONV-002 [UC-005]: Xem Lịch Sử Hội Thoại
- **Mục Tiêu Của Actor**: Xem lại danh mục các cuộc trò chuyện trước đây và đọc lại toàn bộ nội dung tin nhắn của một cuộc trò chuyện đã chọn.
- **Sự Kiện Kích Hoạt**: Người dùng truy cập trang `/chat` hoặc bấm vào một mục hội thoại trên Sidebar.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AUTH-002`, `UC-CONV-001`.

### 2.6 UC-CONV-003 [UC-006]: Đổi Tên Cuộc Trò Chuyện
- **Mục Tiêu Của Actor**: Đặt lại tiêu đề gợi nhớ cho cuộc trò chuyện (hoặc để hệ thống tự động trích xuất tiêu đề từ câu hỏi đầu tiên).
- **Sự Kiện Kích Hoạt**: Người dùng bấm nút "Sửa tên" trên Sidebar, hoặc kích hoạt tự động sau khi gửi tin nhắn đầu tiên.
- **Phụ Thuộc**: Phụ thuộc vào `UC-CONV-001`.

### 2.7 UC-CONV-004 [UC-007]: Xóa Cuộc Trò Chuyện
- **Mục Tiêu Của Actor**: Xóa bỏ vĩnh viễn cuộc trò chuyện không còn giá trị khỏi hệ thống để giữ Sidebar gọn gàng và bảo mật riêng tư.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn biểu tượng "Xóa" cạnh cuộc trò chuyện và xác nhận trong hộp thoại.
- **Phụ Thuộc**: Phụ thuộc vào `UC-CONV-001`.

### 2.8 UC-CHAT-001 [UC-008]: Gửi Tin Nhắn & Tương Tác AI
- **Mục Tiêu Của Actor**: Đặt câu hỏi hoặc yêu cầu cho Trợ lý ảo AI và nhận câu trả lời dạng luồng thời gian thực hiển thị đẹp mắt.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn Enter hoặc bấm nút Gửi trên khung chat.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AUTH-002`, `UC-CONV-001`. Gọi dịch vụ AI ngoài.

### 2.9 UC-CHAT-002 [UC-009]: Lựa Chọn Mô Hình AI
- **Mục Tiêu Của Actor**: Chỉ định mô hình trí tuệ nhân tạo cụ thể (Gemini 1.5 Flash, Gemini 1.5 Pro, hoặc OpenAI) phù hợp với độ phức tạp của câu hỏi.
- **Sự Kiện Kích Hoạt**: Người dùng chọn mô hình từ danh sách thả xuống trên giao diện chat.
- **Phụ Thuộc**: Là quan hệ mở rộng (`<<extend>>`) cho `UC-CHAT-001`.

### 2.10 UC-AGENT-001 [UC-016]: Tra Cứu Danh Mục & Trạng Thái Mô Hình Agent
- **Mục Tiêu Của Actor**: Nắm bắt danh mục các mô hình được tích hợp từ các nhà cung cấp bên ngoài (Google, Anthropic, OpenAI, Groq, Ollama), trạng thái kích hoạt và nguồn API key.
- **Sự Kiện Kích Hoạt**: Người dùng truy cập trang Quản lý Agent Model (`/models`).
- **Phụ Thuộc**: Phụ thuộc vào `UC-AUTH-002`.

### 2.11 UC-AGENT-002 [UC-017]: Xem Chi Tiết Cấu Hình & Chỉ Số Model
- **Mục Tiêu Của Actor**: Kiểm tra các thông số kỹ thuật (Context window, token limits, latency, hỗ trợ stream) để chọn mô hình phù hợp với tác vụ.
- **Sự Kiện Kích Hoạt**: Người dùng bấm xem thông tin chi tiết một thẻ mô hình.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AGENT-001 [UC-016]`.

### 2.12 UC-AGENT-003 [UC-018]: Kiểm Tra Kết Nối Mô Hình Agent (Ping / Test Model)
- **Mục Tiêu Của Actor**: Xác thực tính hợp lệ của API Key cấu hình trong `.env` và đo thời gian trễ thực tế đến máy chủ nhà cung cấp.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Kiểm tra kết nối" trên thẻ mô hình.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AGENT-001 [UC-016]`, `BR-014`.

### 2.13 UC-AGENT-004 [UC-019]: Kích Hoạt / Hủy Kích Hoạt Mô Hình Agent
- **Mục Tiêu Của Actor**: Bật hoặc tắt trạng thái hoạt động của mô hình mà không làm mất lịch sử dữ liệu (áp dụng Soft Toggle theo `BR-012`, không xóa cứng).
- **Sự Kiện Kích Hoạt**: Người dùng gạt công tắc Activate/Deactivate trên thẻ mô hình.
- **Phụ Thuộc**: Phụ thuộc vào `BR-012`, `BR-013`, `BR-014`.

### 2.14 UC-AGENT-005 [UC-020]: Thiết Lập Mô Hình Mặc Định & Thứ Tự Định Tuyến
- **Mục Tiêu Của Actor**: Chọn mô hình ACTIVE được ưa thích làm mô hình mặc định cho các phiên chat mới và thiết lập ưu tiên failover.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Đặt làm mặc định" trên thẻ mô hình đang ACTIVE.
- **Phụ Thuộc**: Phụ thuộc vào `UC-AGENT-004 [UC-019]`, `BR-013`.

### 2.15 UC-AUTH-004 [UC-021]: Đăng Ký Tài Khoản Qua Discord
- **Mục Tiêu Của Actor**: Đăng ký tài khoản người dùng mới trên hệ thống chỉ với một thao tác xác thực qua tài khoản Discord cá nhân mà không cần tạo mật khẩu riêng.
- **Sự Kiện Kích Hoạt**: Khách truy cập bấm nút "Tiếp tục với Discord" trên trang `/register`.
- **Phụ Thuộc**: Phụ thuộc vào `BR-016`, `BR-017`, `BR-018`, `SEC-008`, `BP-AUTH-004 [PROC-014]`.

### 2.16 UC-AUTH-005 [UC-022]: Đăng Nhập & Liên Kết Bằng Discord
- **Mục Tiêu Của Actor**: Đăng nhập nhanh vào tài khoản đã liên kết Discord hoặc tự động liên kết tài khoản email sẵn có với Discord khi email đã được xác minh.
- **Sự Kiện Kích Hoạt**: Người dùng bấm nút "Tiếp tục với Discord" trên trang `/login`.
- **Phụ Thuộc**: Phụ thuộc vào `BR-016`, `BR-017`, `SEC-008`, `BP-AUTH-004 [PROC-014]`.

### 2.17 UC-RES-001 [UC-023]: Xem Dashboard Giám Sát Tài Nguyên Thời Gian Thực
- **Mục Tiêu Của Actor**: Theo dõi trực quan sức khỏe hệ thống, độ trễ phản hồi (P95 latency, TTFT), lưu lượng request và mức tiêu thụ token thông qua luồng SSE thời gian thực.
- **Sự Kiện Kích Hoạt**: Người dùng hoặc Quản trị viên truy cập màn hình `/dashboard`.
- **Phụ Thuộc**: Phụ thuộc vào `FR-029`, `FR-031`, `FR-033`, `FR-034`, `BR-021`, `SEC-009`, `BP-RES-002 [PROC-016]`.

### 2.18 UC-RES-002 [UC-024]: Tra Cứu Thống Kê Sử Dụng Token & Độ Trễ Theo Khoảng Thời Gian
- **Mục Tiêu Của Actor**: Lọc và phân tích lịch sử tiêu thụ tài nguyên theo các mốc thời gian (1 giờ, 24 giờ, 7 ngày, 30 ngày) và phân tích tương quan giữa các mô hình AI.
- **Sự Kiện Kích Hoạt**: Người dùng chọn bộ lọc thời gian hoặc mô hình trên giao diện Dashboard.
- **Phụ Thuộc**: Phụ thuộc vào `FR-029`, `FR-030`, `FR-031`, `BR-019`, `BP-RES-001 [PROC-015]`.

### 2.19 UC-RES-003 [UC-025]: Kiểm Tra Hạn Ngạch & Cảnh Báo Quota Người Dùng
- **Mục Tiêu Của Actor**: Nắm bắt chính xác số lượng token còn lại trong ngày, trạng thái hạn ngạch (Bình thường, Cảnh báo 80%, hay Đã chạm ngưỡng) để chủ động điều chỉnh cường độ sử dụng.
- **Sự Kiện Kích Hoạt**: Người dùng quan sát thẻ Quota Gauge trên Dashboard hoặc nhận thông báo cảnh báo khi đạt ngưỡng 80%.
- **Phụ Thuộc**: Phụ thuộc vào `FR-032`, `BR-020`, `CTRL-008`, `SEC-009`, `BP-RES-002 [PROC-016]`.

### 2.20 UC-MOD-001 [UC-026]: Đăng Ký & Bổ Sung Mô Hình Agent Mới
- **Mục Tiêu Của Actor**: Khai báo và bổ sung một mô hình AI mới vào danh mục hệ thống với các tham số giới hạn an toàn.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Thêm mô hình mới" trên thanh công cụ trang `/models`.
- **Phụ Thuộc**: Phụ thuộc vào `FR-035`, `BR-022`, `BR-024`, `SEC-010`, `BP-MOD-001 [PROC-017]`.

### 2.21 UC-MOD-002 [UC-027]: Chỉnh Sửa Cấu Hình & Lưu Trữ Mềm Mô Hình
- **Mục Tiêu Của Actor**: Tinh chỉnh các tham số kỹ thuật của mô hình (Context window, Max tokens, Streaming) hoặc chuyển mô hình không còn sử dụng vào trạng thái lưu trữ an toàn (`ARCHIVED`) có bảo vệ mô hình mặc định.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn biểu tượng "Chỉnh sửa" hoặc "Xóa / Lưu trữ" trên thẻ mô hình.
- **Phụ Thuộc**: Phụ thuộc vào `FR-036`, `FR-039`, `BR-022`, `BR-023`, `BR-024`, `SEC-010`, `BP-MOD-001 [PROC-017]`, `BP-MOD-002 [PROC-018]`.

### 2.22 UC-MOD-003 [UC-028]: Tìm Kiếm Tức Thì & Sàng Lọc Đa Tiêu Chí Mô Hình
- **Mục Tiêu Của Actor**: Định vị nhanh chóng mô hình mong muốn theo tên hoặc ID, kết hợp lọc theo nhà cung cấp, trạng thái kích hoạt, tình trạng khóa API và sắp xếp theo độ trễ với phản hồi dưới 200ms.
- **Sự Kiện Kích Hoạt**: Người dùng gõ từ khóa vào ô tìm kiếm hoặc click chọn các filter tags trên giao diện `/models`.
- **Phụ Thuộc**: Phụ thuộc vào `FR-037`, `FR-038`, `NFR-022`, `UX-008`, `BP-MOD-002 [PROC-018]`.

### 2.23 UC-USER-007 [UC-029]: Liên Kết Tài Khoản Đang Đăng Nhập Với Discord
- **Mục Tiêu Của Actor**: Kết nối tài khoản Discord cá nhân với tài khoản website đang đăng nhập để bật tính năng đăng nhập nhanh một chạm và đồng bộ định danh mạng xã hội.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Liên kết Discord" tại trang `/settings?tab=connections`.
- **Phụ Thuộc**: Phụ thuộc vào `FR-040`, `FR-042`, `BR-016`, `BR-025`, `SEC-011`, `BP-USER-003 [PROC-019]`.

### 2.24 UC-USER-008 [UC-030]: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn Khóa Tài Khoản
- **Mục Tiêu Của Actor**: Gỡ bỏ liên kết Discord khỏi tài khoản cá nhân an toàn sau khi xác thực mật khẩu, với chốt chặn ngăn chặn tuyệt đối tình trạng mất quyền truy cập tài khoản.
- **Sự Kiện Kích Hoạt**: Người dùng nhấn nút "Hủy liên kết" trên thẻ Discord tại `/settings?tab=connections` và xác thực mật khẩu.
- **Phụ Thuộc**: Phụ thuộc vào `FR-041`, `FR-042`, `BR-026`, `BR-027`, `SEC-011`, `CTRL-010`, `BP-USER-004 [PROC-020]`.

---

### 2.25 UC-BOT-001 [UC-032]: Cấu Hình & Khám Phá Máy Chủ Discord Bot
- **Mục Tiêu Của Actor**: Khám phá các server Discord mà người dùng sở hữu quyền quản trị (`BR-034`), chọn server/kênh kích hoạt bot, cấu hình mô hình LLM xử lý (`BR-033`), tùy chỉnh persona prompt và trần token tối đa cho bot.
- **Sự Kiện Kích Hoạt**: Người dùng truy cập trang Quản lý Bot Discord (`/bot/discord` - `SCR-006`), chọn Guild từ danh sách hoặc cập nhật form và nhấn "Lưu cấu hình".
- **Phụ Thuộc**: Phụ thuộc vào `FR-044`, `FR-045`, `BR-031`, `BR-033`, `BR-034`, `SEC-013`, `CTRL-012`, `UX-011`, `OP-031`, `OP-032`, `OP-033`, `BP-BOT-001 [PROC-022]`, `ADR-012`.

---

### 2.26 UC-BOT-002 [UC-033]: Điều Phối Đàm Thoại & Trừ Quota Bot Discord
- **Mục Tiêu Của Actor**: Nhận phản hồi đàm thoại thông minh từ AI trực tiếp trên máy chủ Discord của người dùng với chính sách trừ hạn ngạch dùng chung nguyên tử với Web (`BR-032`) và cơ chế phòng vệ chống nghẽn / quá tải.
- **Sự Kiện Kích Hoạt**: Người dùng trên máy chủ Discord gửi tin nhắn mention hoặc slash command, hoặc gọi endpoint kiểm thử `POST /api/v1/bot/discord/test-dispatch` (`OP-034`).
- **Phụ Thuộc**: Phụ thuộc vào `FR-046`, `BR-032`, `BR-033`, `NFR-025`, `SEC-013`, `CTRL-012`, `OP-034`, `BP-BOT-002 [PROC-023]`, `ADR-012`.

---

### 2.27 UC-BOT-003 [UC-034]: Đồng Bộ Lịch Sử Trò Chuyện Discord - Web
- **Mục Tiêu Của Actor**: Xem lại toàn bộ câu hỏi và câu trả lời tương tác qua bot Discord ngay trên giao diện Web Chat của tài khoản cá nhân, đảm bảo tính liên tục của ngữ cảnh đàm thoại.
- **Sự Kiện Kích Hoạt**: Sau khi một lượt tương tác đàm thoại qua Discord Bot được điều phối thành công, hệ thống tự động ghi nhận hội thoại vào danh sách tin nhắn Web (`source = DISCORD`).
- **Phụ Thuộc**: Phụ thuộc vào `FR-047`, `BR-032`, `BP-BOT-002 [PROC-023]`, `ADR-012`.








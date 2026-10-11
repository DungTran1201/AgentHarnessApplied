# Đặc Tả Tương Tác Giao Diện Chi Tiết (UI Interaction Specifications)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `UX-SPEC-001` |
| **Giai đoạn** | **Phase 11 — User Experience & Interface Design** |
| **Canonical Model** | `models/ux/ux.yaml` |
| **Phụ thuộc Thượng nguồn** | `FR-007` - `FR-014`, `NFR-001` - `NFR-019`, `SEC-003` |
| **Trạng thái** | **BASELINED** |

---

## 1. Yêu Cầu Tương Tác UX-001: Bố Cục Thích Ứng Đa Thiết Bị (Responsive Layout)

- **Nguyên Tắc**: Mobile-First, mượt mà trên dải kích thước màn hình từ 360px đến 1920px.
- **Hành Vi Chi Tiết**:
  - Khi chiều rộng viewport `< 768px` (Mobile):
    - Sidebar ẩn hoàn toàn khỏi viewport mặc định (`transform: translateX(-100%)`).
    - Biểu tượng Hamburger Menu xuất hiện ở góc trên bên trái thanh tiêu đề. Khi bấm, Sidebar trượt ra dạng Overlay Drawer với nền mờ (Backdrop Blur `rgba(0,0,0,0.5)`).
    - Nhấn ra ngoài vùng Sidebar hoặc chọn một cuộc trò chuyện sẽ tự động đóng Drawer.
  - Khi chiều rộng viewport `>= 768px` (Tablet/Desktop):
    - Sidebar hiển thị cố định bên trái (chiều rộng 260px - 280px).
    - Có nút thu gọn (Collapse) để ẩn thanh điều hướng, giúp mở rộng không gian đọc tối đa.

---

## 2. Yêu Cầu Tương Tác UX-002: Optimistic UI & Cơ Chế Tự Động Cuộn (Auto-Scroll)

- **Hiển Thị Tức Thì (Optimistic UI)**:
  - Ngay khi người dùng nhấn `Enter` hoặc click `[Gửi]`, tin nhắn của người dùng được render lập tức vào danh sách tin nhắn với trạng thái `PENDING_STREAM`.
  - Khung Textarea được xóa trắng ngay lập tức để người dùng cảm thấy hệ thống phản hồi không có độ trễ mạng.
- **Cơ Chế Tự Động Cuộn Thông Minh (Smart Auto-Scroll)**:
  - Khi các token SSE từ AI bắt đầu đổ về, container tin nhắn tự động cuộn xuống dưới cùng (`behavior: smooth`, `scrollTop = scrollHeight`).
  - **Phát hiện cuộn ngược (Scroll-Up Detach)**: Nếu người dùng chủ động lăn chuột hoặc vuốt lên để đọc lại tin nhắn cũ phía trên:
    - Hệ thống ngay lập tức tạm ngắt chế độ Auto-scroll để không cản trở việc đọc của người dùng.
    - Hiển thị một nút nổi nhỏ ở góc dưới màn hình: `[↓ Cuộn xuống tin nhắn mới nhất]`.
    - Khi người dùng bấm vào nút này hoặc tự cuộn lại sát đáy màn hình, chế độ Auto-scroll tự động kích hoạt trở lại.

---

## 3. Yêu Cầu Tương Tác UX-003: Phản Hồi Trực Quan Dòng Chảy & Nút Dừng Sinh (Streaming & Stop Control)

- **Hiệu Ứng Con Trỏ Nhấp Nháy (Typing Cursor)**:
  - Trong lúc nhận từng chunk SSE, một ký hiệu con trỏ thẳng đứng `▍` nhấp nháy liên tục ở cuối từ vựng vừa sinh (CSS animation `blink 1s step-end infinite`).
  - Khi sự kiện `event: done` đến hoặc luồng kết thúc, con trỏ nhấp nháy biến mất.
- **Nút Dừng Phản Hồi (Stop Generation)**:
  - Vị trí: Thay thế vị trí nút Gửi hoặc hiển thị nổi phía trên ô nhập liệu (`[■ Dừng phản hồi]`).
  - Tương tác: Khi bấm nút này:
    - Client gọi phương thức `controller.abort()` trên `ReadableStream` / `fetch`.
    - Trạng thái tin nhắn chuyển từ `STREAMING` sang `STOPPED`.
    - Giữ nguyên toàn bộ nội dung đã sinh ra cho tới thời điểm ngắt kết nối.
    - Chuyển giao diện trở về trạng thái sẵn sàng nhập câu hỏi tiếp theo.

---

## 4. Yêu Cầu Tương Tác UX-004: Định Dạng Markdown & Khối Mã Nguồn (Code Highlighting & Copy)

- **Bộ Phân Tích Markdown Đảm Bảo An Toàn**:
  - Hỗ trợ đầy đủ định dạng: Tiêu đề (`#`, `##`), danh sách có thứ tự / không thứ tự, bảng biểu (Tables), in đậm, in nghiêng, trích dẫn.
  - Xử lý mã nguồn HTML: Triệt tiêu hoàn toàn mã độc XSS (`SEC-003`) bằng cách sanitize toàn bộ thẻ script, iframe, onload, javascript: urls.
- **Khối Mã Nguồn (Code Blocks)**:
  - Tự động nhận diện ngôn ngữ lập trình (Python, JavaScript, TypeScript, SQL, Bash, JSON, C++, Go...).
  - Highlight cú pháp với bảng màu tối dịu mắt (Dark theme syntax).
  - Thanh tiêu đề của khối mã hiển thị:
    - Tên ngôn ngữ lập trình ở góc trái (VD: `python`, `json`).
    - Nút `[Copy Code]` (Sao chép) ở góc phải.
  - Khi bấm `[Copy Code]`:
    - Sao chép toàn bộ mã nguồn thô vào Clipboard (`navigator.clipboard.writeText`).
    - Nút chuyển trạng thái thành `[✓ Đã sao chép]` trong 2 giây rồi hoàn nguyên.

---

## 5. Yêu Cầu Tương Tác UX-005: Khung Soạn Thảo & Kiểm Soát Ngữ Cảnh (Composer & Bounds)

- **Hành Vi Bàn Phím (Keyboard Shortcuts)**:
  - Nhấn `Enter`: Gửi tin nhắn (nếu không rỗng và không đang sinh phản hồi).
  - Nhấn `Shift + Enter`: Xuống dòng mà không gửi tin nhắn.
- **Độ Co Giãn Khung Nhập (Auto-expanding Textarea)**:
  - Chiều cao ban đầu: 48px (1 dòng văn bản).
  - Chiều cao tự động tăng theo độ dài nội dung, đạt tối đa 180px (khoảng 6 dòng). Sau giới hạn này, xuất hiện thanh cuộn đứng bên trong Textarea.
- **Bộ Đếm Ký Tự & Cảnh Báo Ngưỡng (Boundary Indicator)**:
  - Hiển thị số lượng ký tự: `${currentLength} / 4000`.
  - Khi `currentLength >= 3800`: Bộ đếm chuyển sang màu cam (Cảnh báo sắp chạm ngưỡng).
  - Khi `currentLength >= 4000`: Bộ đếm chuyển sang màu đỏ và ngăn chặn nhập thêm ký tự.
- **Thẻ Gợi Ý Bắt Đầu (Prompt Suggestion Chips)**:
  - Hiển thị 4 thẻ câu hỏi mẫu khi cuộc trò chuyện ở trạng thái Empty State (`SCR-002-A`).
  - Khi click vào bất kỳ thẻ gợi ý nào, nội dung lập tức được điền vào ô Textarea và tự động kích hoạt gửi tin nhắn.

---

## 6. Yêu Cầu Tương Tác UX-006: Giao Diện Hồ Sơ & Cài Đặt Tài Khoản (Account & Settings Canvas)

- **Cấu Trúc Điều Hướng Tab (Settings Tab Navigation)**:
  - Trang Cài đặt (`/settings` hoặc Modal Settings) được phân chia rõ ràng thành 3 phân vùng Tab:
    1. **Tab 1: Thông tin hồ sơ (Profile)**:
       - Phần trên: Avatar lớn kèm nút "Thay đổi ảnh", hỗ trợ xem trước hình ảnh thời gian thực (Live Preview).
       - Thẻ thống kê nhanh: Thẻ hiển thị số cuộc trò chuyện, số tin nhắn đã gửi và ngày gia nhập hệ thống.
       - Các trường Form: Họ và tên (`full_name`), Tên đăng nhập (`username` - kiểm tra regex inline theo `BR-007`), Tiểu sử (`bio` - đếm ký tự `0/500`), Số điện thoại.
       - Nút hành động: `[Lưu thông tin hồ sơ]`.
    2. **Tab 2: Bảo mật & Đăng nhập (Security)**:
       - **Khung Đổi Email**: Ô nhập Email mới, ô nhập Mật khẩu hiện tại, nút `[Xác nhận đổi Email]`.
       - **Khung Đổi Mật Khẩu**: Ô nhập Mật khẩu hiện tại, Mật khẩu mới (kèm thanh đo độ mạnh mật khẩu Password Strength Bar: Yếu - Trung bình - Mạnh), Ô Xác nhận mật khẩu mới, nút `[Cập nhật mật khẩu]`.
    3. **Tab 3: Tùy chọn giao diện (Preferences)**:
       - Chọn Chủ đề (Theme Mode): 3 thẻ trực quan đại diện cho Dark Mode (Tối), Light Mode (Sáng), và System (Theo hệ thống). Nhấp chọn áp dụng ngay lập tức mà không cần reload trang.
       - Chọn Ngôn ngữ (Language): Menu dropdown chọn Tiếng Việt (`vi`) hoặc English (`en`).

---

## 7. Yêu Cầu Tương Tác: Nút Xác Thực Mạng Xã Hội Discord (Discord OAuth Button & Feedback)

- **Vị Trí & Bố Cục**:
  - Xuất hiện trên màn hình Đăng ký (`/register`) và màn hình Đăng nhập (`/login`) bên dưới đường phân cách `"Hoặc tiếp tục với"`.
  - Đáp ứng chuẩn bố cục co giãn theo `UX-001`.
- **Nhận Diện Thương Hiệu & Trạng Thái Tương Tác**:
  - Màu nền: Chuẩn thương hiệu Discord Blurple (`#5865F2`), văn bản màu trắng `#FFFFFF`, phông chữ `Inter / Outfit` bán đậm (Semi-bold).
  - Biểu tượng: Icon chính thức của Discord ở bên trái nhãn văn bản.
  - Văn bản:
    - Tại `/login`: `"Tiếp tục với Discord"`.
    - Tại `/register`: `"Đăng ký nhanh với Discord"`.
  - Hiệu ứng Hover: Đổi màu nền sang `#4752C4`, hiệu ứng phóng to nhẹ `scale(1.02)`, đổ bóng `box-shadow: 0 4px 14px rgba(88, 101, 242, 0.4)`.
  - Hiệu ứng Click: Vô hiệu hóa nút tạm thời, hiển thị spinner xoay tròn và thực hiện chuyển hướng tới `/api/v1/auth/discord/login` (`OP-016`).
- **Xử Lý Phản Hồi Khi Chuyển Hướng Trở Lại (Error Handling & Toast Notification)**:
  - Khi callback trả về tham số lỗi (ví dụ `?error=oauth_cancelled` hoặc `?error=invalid_state`):
    - Giao diện tự động xóa query param trên URL (`window.history.replaceState`) để giữ sạch URL.
    - Hiển thị Toast / Alert Banner thông báo lỗi tương ứng:
      - `oauth_cancelled`: "Bạn đã hủy quá trình đăng nhập Discord."
      - `invalid_state`: "Yêu cầu xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
      - `unverified_email`: "Tài khoản Discord của bạn chưa xác thực email. Vui lòng xác thực trước khi tiếp tục."

---

## 8. Yêu Cầu Tương Tác UX-007: Giao Diện Dashboard Quản Lý Tài Nguyên Thời Gian Thực (Resource Telemetry & Quota Dashboard — SCR-003)

- **Bố Cục Trang Dashboard (`/dashboard`)**:
  - **Khối Tiêu Đề (Header Stats Bar)**:
    - Hiển thị nhãn trạng thái kết nối thời gian thực: Điểm chấm tròn xanh lá nhấp nháy `● LIVE SSE CONNECTED` kèm hiệu ứng ping (`animation: pulse 2s infinite`). Khi mất kết nối hoặc đang tái kết nối, chuyển sang màu vàng `● RECONNECTING...` hoặc đỏ `● DISCONNECTED`.
    - Nút chọn khung thời gian lọc (Time-Range Selector): `[1 Giờ]`, `[24 Giờ]`, `[7 Ngày]`, `[30 Ngày]`.
  - **Thẻ Chỉ Số Chính (Key Metrics KPI Cards)**:
    - 4 thẻ KPI bố trí dạng lưới co giãn (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`):
      1. **Độ Trễ Trung Bình (Avg Latency)**: Hiển thị giá trị millisecond (ms) kèm chỉ số % tăng/giảm so với chu kỳ trước.
      2. **Thời Gian Đến Token Đầu Tiên (Avg TTFT)**: Hiển thị tốc độ khởi động phản hồi LLM tính bằng ms.
      3. **Tổng Số Token Đã Dùng**: Tổng số `prompt_tokens` + `completion_tokens` trong ngày.
      4. **Tổng Số Yêu Cầu API (Total Requests)**: Tổng số lượt gọi API kèm phân tách tỷ lệ mã lỗi (`2xx / 4xx / 5xx`).
  - **Đồng Hồ Hạn Ngạch Token (Token Quota Gauge & Banner Alert — `BR-020`)**:
    - Đồng hồ bán nguyệt (Semi-circular Gauge) hoặc thanh tiến trình động (Progress Bar) thể hiện trực quan tỷ lệ `%` token đã sử dụng trên hạn ngạch được cấp (`daily_tokens_used / daily_token_limit`).
    - **Cảnh báo mức 80%**: Khi tỷ lệ sử dụng đạt `>= 80%`, viền thanh tiến trình chuyển sang màu cam hổ phách (`#F59E0B`) và một banner thông báo nổi xuất hiện ở đỉnh trang: *"Cảnh báo: Bạn đã sử dụng hơn 80% hạn ngạch token trong ngày!"*.
    - **Cảnh báo chạm ngưỡng 100%**: Khi tỷ lệ đạt `100%`, đồng hồ đổi màu đỏ rực (`#EF4444`) và hiển thị trạng thái *"Đã hết hạn ngạch ngày hôm nay. Các yêu cầu mới sẽ bị chặn (HTTP 429) cho đến chu kỳ kế tiếp!"*.
  - **Biểu Đồ Xu Hướng Thời Gian Thực (Live Time-series Charts)**:
    - **Biểu đồ đường Độ trễ (Latency & TTFT Trend)**: Cập nhật mỗi giây từ luồng SSE, hiển thị 30 điểm đo đạc gần nhất dưới dạng sóng mượt mà.
    - **Biểu đồ cột Phân bố Token & Model (Token Distribution by Provider)**: So sánh lượng token tiêu thụ giữa các mô hình (Gemini vs OpenAI).
  - **Bảng Theo Dõi Yêu Cầu API Tức Thì (Live Request Feed — `FR-031`)**:
    - Danh sách bảng cuộn hiển thị các bản ghi API mới nhất: `Thời điểm`, `Endpoint`, `Method`, `HTTP Status` (thẻ Badge màu xanh/vàng/đỏ), `Latency`, `Tokens`.
    - Khi có bản ghi mới đẩy qua SSE, hàng mới trượt vào từ trên cùng với hiệu ứng highlight nền xanh nhạt (`fade-in animation`).

---

## 8. Giao Diện Quản Lý Danh Mục Mô Hình Mở Rộng (Model Management & Filtering Canvas — UX-008)

- **Mã Yêu Cầu UX**: `UX-008`
- **Mã Màn Hình**: `SCR-004` (Tuyến đường `/models` hoặc `/admin/models`)
- **Luồng Tương Tác**: `FLOW-MODEL-MANAGE`
- **Mục Tiêu Trải Nghiệm**: Trải nghiệm khám phá, tìm kiếm và quản trị danh mục mô hình mượt mà, phản hồi tức thì với độ trễ thấp (< 200ms theo `NFR-022`), các modal thẩm định trực quan giúp ngăn ngừa hoàn toàn các thao tác nhầm lẫn vi phạm nghiệp vụ.
- **Thành Phần Giao Diện Chi Tiết**:
  - **Thanh Công Cụ Tìm Kiếm & Hành Động (Search & Action Bar)**:
    - Ô tìm kiếm nổi bật với biểu tượng kính lúp, hỗ trợ phím tắt `Ctrl + K` / `Cmd + K` để focus nhanh.
    - Cơ chế **Debounce 300ms**: Tự động kích hoạt truy vấn `GET /api/v1/models/search?q={query}` sau khi người dùng ngừng gõ 300ms, không yêu cầu bấm Enter. Có nút `x` xóa trắng từ khóa ngay lập tức.
    - Nút bấm chính nổi bật: `[+ Thêm Mô Hình Mới]` mở hộp thoại đăng ký.
  - **Thanh Bộ Lọc Đa Thuộc Tính & Sắp Xếp (Multi-Facet Filter Strip)**:
    - **Dải Filter Pills (Nhà cung cấp)**: Các nút bấm dạng viên thuốc (`All`, `Google`, `Anthropic`, `OpenAI`, `Groq`, `Ollama`) kèm logo biểu trưng và số lượng mô hình tương ứng.
    - **Lọc Trạng Thái**: Dropdown chọn trạng thái (`Tất cả`, `Đang hoạt động - ACTIVE`, `Tạm dừng - INACTIVE`, `Đã lưu trữ - ARCHIVED`).
    - **Toggle Có Sẵn Khóa API**: Công tắc trượt "Chỉ hiển thị mô hình có khóa API hợp lệ trong `.env`".
    - **Menu Sắp Xếp (Sort Dropdown)**: Tùy chọn sắp xếp theo `Độ trễ thấp nhất` (Fastest), `Context Window lớn nhất` (Largest Context), hoặc `Tên A-Z`.
  - **Lưới Thẻ Mô Hình Tương Tác (Model Card Grid)**:
    - Hiển thị theo lưới co giãn 3 cột trên Desktop, 1 cột trên Mobile.
    - Mỗi thẻ bao gồm:
      - Tên hiển thị to, rõ ràng kèm mã ID nhỏ hơn bên dưới (ví dụ `gemini-3.8-flash`).
      - Huy hiệu trạng thái: Xanh lá (`ACTIVE`), Xám (`INACTIVE`), Cam (`DEGRADED`), Tím nhạt (`ARCHIVED`).
      - Huy hiệu Ngôi sao Vàng: `MẶC ĐỊNH` cho mô hình mang cờ `is_default = 1`.
      - Các thông số kỹ thuật dạng chip: Cửa sổ ngữ cảnh (ví dụ `1M Context`), Giới hạn Output (`8K Max Tokens`), Độ trễ ping (ví dụ `280ms`).
      - Hàng nút hành động nhanh: Nút "Kiểm tra kết nối" (Ping test), Công tắc Bật/Tắt kích hoạt, Nút "Chỉnh sửa" (mở drawer), và Nút "Lưu trữ / Xóa" (icon thùng rác).
  - **Modal Thêm Mô Hình Mới (Add Model Dialog — `FR-035`)**:
    - Form nhập liệu gồm: Mã ID, Tên hiển thị, Nhà cung cấp, Context Window, Max Tokens, Switch Hỗ trợ streaming.
    - **Real-time Input Validation (`BR-024`)**: Hiển thị viền đỏ và thông báo lỗi trực tiếp dưới ô nhập khi `context_window < 1000` hoặc `max_tokens < 256`. Nút Lưu bị vô hiệu hóa cho đến khi toàn bộ trường hợp lệ.
  - **Drawer Chỉnh Sửa Cấu Hình Mô Hình (Edit Configuration Drawer — `FR-036`)**:
    - Trượt vào từ cạnh phải màn hình mượt mà.
    - Các trường `Mã ID` và `Nhà cung cấp` hiển thị ở trạng thái khóa mờ (`read-only / disabled`) kèm tooltip: *"Mã định danh và nhà cung cấp là thuộc tính bất biến theo BR-022"*.
    - Cho phép sửa đổi tên hiển thị, context window, max tokens và trạng thái streaming.
  - **Modal Xác Nhận Lưu Trữ / Xóa Mềm (Soft Archival Guard Modal — `FR-039`)**:
    - Cảnh báo rõ ràng: *"Chuyển mô hình vào kho lưu trữ (ARCHIVED). Mô hình sẽ không thể dùng để đàm thoại nhưng toàn bộ lịch sử trò chuyện cũ vẫn được bảo toàn nguyên vẹn."*
    - **Chốt Chặn Mô Hình Mặc Định (`BR-023`)**: Nếu mô hình đang là mô hình mặc định (`is_default == true`), Modal hiển thị biểu tượng cảnh báo màu đỏ, nút "Xác nhận lưu trữ" bị khóa hoàn toàn kèm thông báo: *"Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước."*

---

## 9. UX-009: Trải Nghiệm Quản Lý Tài Khoản Liên Kết & Chốt Chặn Hủy Liên Kết An Toàn (Connected Accounts Canvas & Lockout Guard UX)

- **Mã Yêu Cầu UX**: `UX-009`
- **Màn Hình Áp Dụng**: `SCR-005` (`/settings?tab=connections`)
- **Truy Vết Yêu Cầu**: `FR-040`, `FR-041`, `FR-042`, `BR-025`, `BR-026`, `BR-027`, `SEC-011`, `CTRL-010`.
- **Thành Phần & Đặc Tả Tương Tác**:
  - **Thẻ Kết Nối Discord (Discord Connection Card)**:
    - Logo nhận diện thương hiệu Discord chính thức (#5865F2 Blurple).
    - **Trạng Thái "Chưa Liên Kết"**:
      - Badge xám: `Chưa liên kết`.
      - Đoạn giới thiệu: *"Liên kết tài khoản Discord để cho phép đăng nhập nhanh một chạm và đồng bộ danh tính cá nhân."*
      - Nút hành động nổi bật: `Liên kết với Discord` (Màu xanh Blurple, icon Discord). Bấm vào chuyển hướng tức thì sang cổng ủy quyền OAuth2.
    - **Trạng Thái "Đã Liên Kết"**:
      - Badge xanh lá: `Đã kết nối`.
      - Hiển thị avatar người dùng Discord, tên người dùng (`discord_username`) và mã định danh (`discord_id`).
      - Nút hành động: `Hủy liên kết` (Màu đỏ viền outline hoặc ghost red button).
  - **Banner Cảnh Báo Tài Khoản Chưa Có Mật Khẩu (`BR-026`)**:
    - Nếu tài khoản ban đầu đăng ký qua Discord và chưa có mật khẩu (`has_password == false`):
      - Hiển thị Alert Banner màu vàng hổ phách (Amber alert):
        > [!WARNING]
        > **Chốt chặn an toàn**: Tài khoản của bạn hiện chưa có mật khẩu đăng nhập. Bạn không thể hủy liên kết Discord cho đến khi thiết lập mật khẩu tại tab Bảo mật để tránh bị khóa tài khoản vĩnh viễn.
      - Nút "Hủy liên kết" bị làm mờ (disabled) với thuộc tính `aria-disabled="true"` và tooltip giải thích nguyên nhân.
  - **Modal Tái Xác Thực Mật Khẩu Khi Hủy Liên Kết (Re-authentication Unlink Modal — `BR-027`)**:
    - Tiêu đề: *"Xác Nhận Hủy Liên Kết Discord"*
    - Nội dung cảnh báo: *"Sau khi hủy liên kết, bạn sẽ không thể đăng nhập bằng tài khoản Discord này trừ khi liên kết lại. Vui lòng nhập mật khẩu tài khoản của bạn để tiếp tục."*
    - Ô nhập mật khẩu có nút ẩn/hiện mật khẩu (eye toggle icon).
    - Trạng thái loading spinner trên nút "Xác nhận hủy liên kết" khi đang xử lý API.
    - Hiển thị thông báo lỗi màu đỏ ngay dưới ô nhập nếu mật khẩu sai (`HTTP 401`).
    - Sau khi thành công: Hiển thị Success Toast màu xanh lá, tự động đóng modal và cập nhật trạng thái thẻ sang "Chưa liên kết".

---

## 10. UX-011: Trải Nghiệm Bảng Điều Khiển Quản Lý Bot Discord & Lựa Chọn Máy Chủ Thời Gian Thực (Discord Bot Management Console & Real-time Guild Selector UI)

- **Mã Yêu Cầu UX**: `UX-011`
- **Màn Hình Áp Dụng**: `SCR-006` (`/bot/discord`)
- **Truy Vết Yêu Cầu**: `FR-044`, `FR-045`, `FR-046`, `BR-031`, `BR-032`, `BR-033`, `BR-034`, `SEC-013`, `CTRL-012`, `NFR-025`, `ADR-012`.
- **Thành Phần & Đặc Tả Tương Tác**:
  - **Banner Tiền Điều Kiện Liên Kết Discord (`BR-031`)**:
    - Nếu tài khoản người dùng chưa liên kết Discord (`discord_id IS NULL`):
      - Giao diện ẩn form cấu hình và hiển thị Banner màu tím Discord Blurple (`#5865F2`):
        > [!IMPORTANT]
        > **Yêu cầu liên kết tài khoản**: Tính năng Quản lý Bot Discord chỉ khả dụng cho người dùng đã liên kết tài khoản Discord. Vui lòng kết nối tài khoản để khám phá máy chủ và cấu hình bot.
      - Nút kêu gọi hành động (CTA): `[Đi Đến Cài Đặt Liên Kết Discord]` chuyển hướng trực tiếp đến `/settings?tab=connections` (`SCR-005`).
  - **Lưới Thẻ Máy Chủ Discord (Guild Card Grid — `FR-044`, `BR-034`)**:
    - Hiển thị danh sách các máy chủ Discord mà người dùng tham gia và nắm quyền quản trị (`ADMINISTRATOR` 0x8 hoặc `MANAGE_GUILD` 0x20).
    - Mỗi thẻ Guild hiển thị:
      - Avatar biểu trưng của Server (hoặc icon ký tự viết tắt nếu không có ảnh).
      - Tên máy chủ và ID máy chủ Discord.
      - Huy hiệu vai trò: `Quản trị viên` (Admin) hoặc `Quản lý Server` (Manager).
      - Trạng thái Bot: Huy hiệu xanh lá `Bot đã hiện diện` hoặc nút bấm `+ Mời Bot vào Server` (mở link Discord OAuth Bot Invite với quyền cần thiết).
    - Thẻ Guild đang được chọn nổi bật với viền sáng màu tím Blurple (`ring-2 ring-[#5865F2]`) và icon tích xanh.
  - **Form Cấu Hình Bot Toàn Diện (Bot Configuration Form — `FR-045`, `FR-046`)**:
    - **Dropdown Lựa Chọn Mô Hình AI (`active_model_id`)**:
      - Chỉ hiển thị các mô hình đang ở trạng thái `ACTIVE` (`BR-033`).
      - Mô hình mặc định hệ thống hiển thị biểu tượng ngôi sao vàng (`is_default = 1`).
      - Các mô hình `INACTIVE` hoặc `ARCHIVED` bị ẩn khỏi dropdown để ngăn ngừa lỗi điều phối.
    - **Khung Soạn Thảo Persona System Prompt (`system_prompt`)**:
      - Vùng nhập Textarea có hỗ trợ đếm số ký tự (tối đa 2,000 ký tự).
      - Thanh công cụ mẫu persona nhanh: Các nút chọn sẵn phong cách như `Trợ lý Thân thiện`, `Lập trình viên Senior`, `Mascot Anime`, click vào tự điền prompt mẫu phù hợp.
    - **Thanh Trượt Hạn Mức Token Phản Hồi (`max_tokens_per_response`)**:
      - Thanh kéo Slider từ 50 đến 4,000 tokens (bước nhảy 50), hiển thị giá trị số trực tiếp bên cạnh.
    - **Công Tắc Bật / Tắt Bot (`is_enabled`)**:
      - Switch toggle trực quan: Bật (Xanh lá - "Bot đang hoạt động"), Tắt (Xám - "Bot tạm ngưng").
  - **Thẻ Giám Sát Hạn Ngạch Thời Gian Thực (Live Shared Quota Gauge — `BR-032`)**:
    - Hiển thị thanh tiến trình mức tiêu thụ token hôm nay dùng chung giữa Web và Discord.
    - Phân chia 3 dải màu cảnh báo trực quan:
      - Xanh lục: Tiêu thụ < 80% (Bình thường).
      - Vàng hổ phách: Tiêu thụ 80% - 99% (Cảnh báo sắp hết hạn ngạch).
      - Đỏ rực: 100% (Đã chạm ngưỡng hạn ngạch hằng ngày, bot tạm khóa phản hồi).
  - **Khung Kiểm Thử Tương Tác Tức Thì (Instant Test Dispatch Console — `OP-034`)**:
    - Cho phép người dùng nhập câu hỏi thử nghiệm và nhấn nút `[Kiểm Tra Bot]`.
    - Giao diện gửi request `OP-034` và hiển thị kết quả phản hồi của AI cùng số token tiêu thụ và độ trễ phản hồi ($\le 300\text{ms}$ theo `NFR-025`) ngay trong trang quản lý.











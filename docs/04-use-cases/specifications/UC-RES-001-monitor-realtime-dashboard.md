# UC-RES-001 [UC-023] — Xem Dashboard Giám Sát Tài Nguyên Thời Gian Thực (Monitor Real-Time Resource Dashboard)

---

## 1. Overview
Ca sử dụng này cho phép Người dùng đã đăng nhập hoặc Quản trị viên hệ thống truy cập vào màn hình Bảng điều khiển tài nguyên (`/dashboard`) để theo dõi các chỉ số vận hành thời gian thực bao gồm: Độ trễ phản hồi (P95 Latency, Time-to-First-Token TTFT), số lượng token tiêu thụ, lưu lượng yêu cầu (Requests count & RPM), tỷ lệ mã trạng thái HTTP và đồng hồ đo hạn ngạch quota cá nhân thông qua luồng Server-Sent Events (SSE).

---

## 2. Goal
Cung cấp cái nhìn trực quan, tức thì và minh bạch về hiệu năng hệ thống, mức độ tiêu thụ token và trạng thái quota còn lại trong ngày, giúp người dùng chủ động điều chỉnh mức độ sử dụng và quản trị viên phát hiện sớm các bất thường về độ trễ hoặc lỗi máy chủ.

---

## 3. Scope
Hệ thống AI-Chan (Phân hệ Quản lý Tài nguyên & Giám sát — `CAP-RES-MGMT`).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã xác thực) / System Admin`.

---

## 5. Supporting Actors
- `ai-frontend`: Ứng dụng Next.js kết xuất các biểu đồ Sparkline, Gauge, Bar chart và bảng nhật ký luồng yêu cầu thời gian thực.
- `ai-backend`: Dịch vụ FastAPI cung cấp API tóm tắt `GET /api/v1/resources/summary` (`OP-018`) và luồng SSE `GET /api/v1/resources/stream` (`OP-019`).
- `Telemetry Ring Buffer`: Hàng đợi bộ nhớ đệm phát sóng sự kiện metric tick theo chu kỳ 1 giây.
- `Database SQLite`: Lưu trữ bảng `api_metric_logs` và `user_quotas`.

---

## 6. Trigger
Người dùng bấm vào liên kết "Dashboard" trên thanh điều hướng hoặc truy cập trực tiếp đường dẫn `/dashboard`.

---

## 7. Preconditions
- Người dùng đã đăng nhập vào hệ thống và sở hữu Cookie JWT HttpOnly hợp lệ (`SEC-004`).
- Trình duyệt hỗ trợ API chuẩn `EventSource` (Server-Sent Events).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Giao diện Dashboard hiển thị đầy đủ 4 thẻ thống kê số liệu tổng quan của 24 giờ gần nhất.
- Kênh SSE được thiết lập thành công, trạng thái kết nối hiển thị "Live / Trực tiếp" màu xanh lá cây.
- Biểu đồ độ trễ và số lượng token được cập nhật nhịp nhàng mỗi giây mà không cần tải lại trang (`NFR-021`).
- Người dùng chỉ thấy dữ liệu tài nguyên thuộc quyền sở hữu của chính mình (`BR-021`).

### 8.2 Failure Postconditions
- Nếu kết nối SSE bị gián đoạn, giao diện hiển thị thông báo "Đang kết nối lại..." và tự động thử lại sau 3 giây.
- Nếu phiên đăng nhập hết hạn, hệ thống điều hướng người dùng về trang `/login`.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng điều hướng tới trang `/dashboard`.
2. Frontend gọi API `GET /api/v1/resources/summary` để nạp dữ liệu thống kê tổng hợp lịch sử (`OP-018`).
3. Backend kiểm tra xác thực JWT, truy vấn bảng `api_metric_logs` và `user_quotas` (lọc theo `current_user.id` nếu không phải Admin theo `BR-021`) và trả về dữ liệu tổng hợp:
   - Độ trễ trung bình, P95 latency, TTFT trung bình.
   - Tổng số token đã tiêu thụ hôm nay, hạn mức hằng ngày (`daily_token_limit`) và số token còn lại.
   - Tổng số API requests, tỷ lệ lỗi và phân bố HTTP 2xx, 4xx, 5xx.
4. Frontend kết xuất các thẻ chỉ số và đồng hồ Gauge Hạn ngạch Quota tương ứng (`UX-007`).
5. Frontend khởi tạo kết nối Server-Sent Events tới `GET /api/v1/resources/stream` (`OP-019`).
6. Backend thiết lập luồng SSE, đăng ký client vào danh sách lắng nghe sự kiện từ In-Memory Ring Buffer.
7. Khi có yêu cầu đàm thoại mới hoàn tất hoặc mỗi chu kỳ 1 giây, Backend phát sự kiện `event: metric_tick` chứa dữ liệu nhịp đập mới nhất.
8. Frontend tiếp nhận sự kiện, tự động đẩy điểm dữ liệu mới vào biểu đồ Sparkline độ trễ và thêm dòng mới vào bảng Live Request Feed.
9. Người dùng quan sát sự biến thiên của các chỉ số tài nguyên một cách trực quan, mượt mà.

---

## 10. Extensions / Alternate Flows (Luồng Mở Rộng & Ngoại Lệ)

- **Alt-01: Người dùng đạt ngưỡng cảnh báo hạn ngạch 80% (`BR-020`)**:
  - Tại bước 3 hoặc bước 8, nếu `daily_tokens_used / daily_token_limit >= 0.8`:
  - Đồng hồ Quota Gauge trên Dashboard chuyển sang màu vàng cam.
  - Hiển thị banner cảnh báo: "Bạn đã sử dụng hơn 80% hạn ngạch token hôm nay. Vui lòng cân nhắc trước khi gửi thêm prompt lớn."
- **Alt-02: Người dùng hết hạn ngạch 100% (`BR-020`, `CTRL-008`)**:
  - Tại bước 3 hoặc bước 8, nếu `daily_tokens_used >= daily_token_limit`:
  - Đồng hồ Quota Gauge chuyển sang màu đỏ rực (100% Full).
  - Trạng thái hiển thị `EXCEEDED_THROTTLED`.
  - Mọi yêu cầu gửi tin nhắn tại phòng chat bị chặn với mã `HTTP 429 Too Many Requests`.
- **Alt-03: Mất kết nối mạng hoặc server khởi động lại**:
  - Đối tượng `EventSource` tại client phát hiện mất kết nối.
  - Badge trạng thái chuyển sang màu xám "Đang kết nối lại...".
  - Client tự động thử lại kết nối sau khoảng thời gian tăng dần (exponential backoff).
  - Khi server phục hồi, luồng SSE tự động nối lại thành công.

---

## 11. Traceability
- **Yêu Cầu Nghiệp Vụ Đáp Ứng**: `FR-029`, `FR-031`, `FR-033`, `FR-034`, `NFR-020`, `NFR-021`.
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-019`, `BR-020`, `BR-021`.
- **Biện Pháp Bảo Mật**: `SEC-009`, `CTRL-008`.
- **Quy Trình Nghiệp Vụ**: `BP-RES-002 [PROC-016]`.
- **Thao Tác API**: `OP-018`, `OP-019`.
- **Đặc Tả UX**: `UX-007`.
- **Ca Kiểm Thử**: `TC-024`, `TC-025`.

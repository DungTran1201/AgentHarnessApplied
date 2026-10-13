# ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `NFR-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Quy ước mã định danh** | `NFR-001` đến `NFR-022` |
| **Nguyên tắc cốt lõi** | Toàn bộ yêu cầu phi chức năng phải có chỉ số định lượng cụ thể, có thể đo lường và kiểm chứng bằng công cụ |

---

## 1. Nhóm Yêu Cầu Về Hiệu Năng (Performance Requirements)

---

### NFR-001: Thời Gian Tải Giao Diện Ban Đầu (Initial Page Load Latency)
- **Mã Yêu Cầu**: `NFR-001`
- **Tên Yêu Cầu**: Thời Gian Tải Giao Diện Ban Đầu (Initial Page Load Latency).
- **Phân Loại**: Performance.
- **Chỉ Số Định Lượng (Target Metric)**: First Contentful Paint (FCP) < 1.5 giây; Largest Contentful Paint (LCP) < 2.5 giây trên kết nối mạng băng thông rộng tiêu chuẩn.
- **Mô Tả**: Giao diện website Next.js phải tải nhanh, tối ưu dung lượng tệp tĩnh JavaScript/CSS để người dùng có thể tương tác ngay lập tức.
- **Phương Pháp Kiểm Chứng**: Đo lường tự động bằng Google Lighthouse và Chrome DevTools Performance Audit.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-002: Độ Trễ Ký Tự Đầu Tiên (Time To First Token - TTFT)
- **Mã Yêu Cầu**: `NFR-002`
- **Tên Yêu Cầu**: Độ Trễ Ký Tự Đầu Tiên (Time To First Token - TTFT).
- **Phân Loại**: Performance.
- **Chỉ Số Định Lượng (Target Metric)**: TTFT < 2.0 giây trong điều kiện máy chủ AI không bị nghẽn mạng toàn cầu.
- **Mô Tả**: Khi người dùng gửi câu hỏi ở chế độ Streaming, từ/ký tự phản hồi đầu tiên từ AI phải bắt đầu hiển thị trên màn hình người dùng trong vòng 2.0 giây để tạo cảm giác phản hồi tức thì.
- **Phương Pháp Kiểm Chứng**: Ghi nhận timestamp từ sự kiện bấm nút Gửi đến khi chunk SSE đầu tiên kích hoạt render trên DOM.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-003: Sức Chịu Tải Người Dùng Đồng Thời (Concurrent User Capacity)
- **Mã Yêu Cầu**: `NFR-003`
- **Tên Yêu Cầu**: Sức Chịu Tải Người Dùng Đồng Thời (Concurrent User Capacity).
- **Phân Loại**: Performance & Capacity.
- **Chỉ Số Định Lượng (Target Metric)**: Tối thiểu 100 người dùng hoạt động đồng thời (concurrent active users) với tỷ lệ lỗi HTTP 5xx < 1%.
- **Mô Tả**: Cụm máy chủ Nginx và FastAPI phải xử lý trơn tru tải đồng thời của 100 người dùng đang duyệt chat, gửi câu hỏi và xem lịch sử mà không bị sập dịch vụ.
- **Phương Pháp Kiểm Chứng**: Kịch bản kiểm thử tải mô phỏng bằng công cụ Locust hoặc k6 chạy liên tục trong 15 phút.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

## 2. Nhóm Yêu Cầu Về An Ninh & Bảo Mật (Security Requirements)

---

### NFR-004: Mã Hóa Truyền Tải Toàn Diện (Transmission Encryption)
- **Mã Yêu Cầu**: `NFR-004`
- **Tên Yêu Cầu**: Mã Hóa Truyền Tải Toàn Diện (Transmission Encryption).
- **Phân Loại**: Security.
- **Chỉ Số Định Lượng (Target Metric)**: 100% lưu lượng mạng Internet sử dụng giao thức HTTPS với chuẩn bảo mật TLS 1.3; cổng 80 tự động chuyển hướng mã 301 sang cổng 443.
- **Mô Tả**: Bảo vệ dữ liệu người dùng và nội dung trò chuyện trước các cuộc tấn công nghe lén trên đường truyền (Man-in-the-Middle).
- **Phương Pháp Kiểm Chứng**: Kiểm tra chứng chỉ SSL/TLS bằng công cụ `testssl.sh` hoặc Qualys SSL Labs đạt điểm A+.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-005: Bảo Vệ Bí Mật Khóa API (Zero Client Secret Exposure)
- **Mã Yêu Cầu**: `NFR-005`
- **Tên Yêu Cầu**: Bảo Vệ Bí Mật Khóa API (Zero Client Secret Exposure).
- **Phân Loại**: Security.
- **Chỉ Số Định Lượng (Target Metric)**: 0 khóa API hoặc secret bị lộ ra ngoài máy chủ Backend (`CST-01`).
- **Mô Tả**: Các khóa `GEMINI_API_KEY` và `OPENAI_API_KEY` chỉ được đọc từ biến môi trường máy chủ Backend. Tuyệt đối không bao giờ trả về qua response body, response header, file tĩnh JavaScript của Client, hoặc commit vào Git.
- **Phương Pháp Kiểm Chứng**: Quét tự động bằng GitLeaks/TruffleHog và phân tích các gói tin HTTP trong tab Network của trình duyệt.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-006: Bảo Vệ Mật Khẩu Người Dùng (Password Storage Hardening)
- **Mã Yêu Cầu**: `NFR-006`
- **Tên Yêu Cầu**: Bảo Vệ Mật Khẩu Người Dùng (Password Storage Hardening).
- **Phân Loại**: Security.
- **Chỉ Số Định Lượng (Target Metric)**: 100% mật khẩu được băm bằng thuật toán Argon2id hoặc Bcrypt với cost factor tiêu chuẩn (work factor >= 12) kèm muối ngẫu nhiên (salt).
- **Mô Tả**: Cơ sở dữ liệu không bao giờ lưu mật khẩu ở dạng văn bản thuần (plain-text).
- **Phương Pháp Kiểm Chứng**: Kiểm tra bảng `users` trong cơ sở dữ liệu PostgreSQL đảm bảo trường `password_hash` chứa chuỗi băm chuẩn.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-007: Giới Hạn Tần Suất 2 Tầng Phòng Thủ (Dual-Tier Rate Limiting)
- **Mã Yêu Cầu**: `NFR-007`
- **Tên Yêu Cầu**: Giới Hạn Tần Suất 2 Tầng Phòng Thủ (Dual-Tier Rate Limiting).
- **Phân Loại**: Security & Anti-Abuse.
- **Chỉ Số Định Lượng (Target Metric)**: Tầng 1 (Nginx Ingress) giới hạn 10 r/s cho `/api/` và tối đa 20 kết nối đồng thời/IP; Tầng 2 (FastAPI Core) giới hạn 60 r/phút/IP.
- **Mô Tả**: Ngăn chặn tấn công từ chối dịch vụ (DoS), vét cạn tài nguyên và spam tin nhắn tự động.
- **Phương Pháp Kiểm Chứng**: Kịch bản kiểm thử tự động gửi 70 request/phút -> Kiểm chứng nhận mã lỗi `HTTP 429 Too Many Requests`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-008: Khử Khuẩn Hiển Thị Chống XSS (Output Sanitization & XSS Defense)
- **Mã Yêu Cầu**: `NFR-008`
- **Tên Yêu Cầu**: Khử Khuẩn Hiển Thị Chống XSS (Output Sanitization & XSS Defense).
- **Phân Loại**: Security.
- **Chỉ Số Định Lượng (Target Metric)**: 100% mã HTML độc hại (`<script>`, `<iframe>`, `onerror=`) bị loại bỏ trước khi render ra màn hình.
- **Mô Tả**: Câu trả lời do AI sinh ra có thể vô tình hoặc cố ý chứa mã khai thác trình duyệt; giao diện phải khử khuẩn an toàn trước khi đưa vào DOM.
- **Phương Pháp Kiểm Chứng**: Thử nghiệm gửi prompt yêu cầu AI in ra các thẻ script độc hại -> Kiểm tra giao diện không kích hoạt popup cảnh báo.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

## 3. Nhóm Yêu Cầu Về Độ Tin Cậy & Tính Sẵn Sàng (Reliability & Availability)

---

### NFR-009: Độ Sẵn Sàng Dịch Vụ (High Availability)
- **Mã Yêu Cầu**: `NFR-009`
- **Tên Yêu Cầu**: Độ Sẵn Sàng Dịch Vụ (High Availability).
- **Phân Loại**: Reliability.
- **Chỉ Số Định Lượng (Target Metric)**: Tỷ lệ sẵn sàng tối thiểu 99.5% thời gian hoạt động hàng tháng (tương đương thời gian gián đoạn tối đa < 3.6 giờ/tháng).
- **Mô Tả**: Dịch vụ website chatbot phải duy trì trạng thái hoạt động liên tục 24/7 phục vụ người dùng.
- **Phương Pháp Kiểm Chứng**: Giám sát định kỳ thông qua hệ thống Uptime Kuma hoặc Blackbox Exporter gọi vào `/api/v1/health`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-010: Tự Động Phục Hồi Khi Gặp Sự Cố (Automatic Service Recovery)
- **Mã Yêu Cầu**: `NFR-010`
- **Tên Yêu Cầu**: Tự Động Phục Hồi Khi Gặp Sự Cố (Automatic Service Recovery).
- **Phân Loại**: Reliability.
- **Chỉ Số Định Lượng (Target Metric)**: Container bị crash phải tự khởi động lại trong vòng tối đa 10 giây.
- **Mô Tả**: Toàn bộ các dịch vụ trong Docker Compose được cấu hình chính sách `restart: unless-stopped`.
- **Phương Pháp Kiểm Chứng**: Sử dụng lệnh `docker kill` dừng tiến trình container -> Docker daemon tự động khởi động lại container ngay lập tức.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-011: Cô Lập Lỗi Nhà Cung Cấp AI Ngoài (External Provider Fault Isolation)
- **Mã Yêu Cầu**: `NFR-011`
- **Tên Yêu Cầu**: Cô Lập Lỗi Nhà Cung Cấp AI Ngoài (External Provider Fault Isolation).
- **Phân Loại**: Reliability.
- **Chỉ Số Định Lượng (Target Metric)**: 0 sự cố sập máy chủ do lỗi mạng hoặc timeout từ phía AI Provider.
- **Mô Tả**: Mọi cuộc gọi mạng ra ngoài phải được bao bọc trong khối xử lý ngoại lệ có timeout chặt chẽ (tối đa 30s) và kích hoạt fallback tự động.
- **Phương Pháp Kiểm Chứng**: Chặn kết nối Internet ra ngoài của container -> Backend vẫn trả về mã lỗi thân thiện 503 mà không bị dừng tiến trình.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

## 4. Nhóm Yêu Cầu Về Khả Năng Mở Rộng & Kiến Trúc (Scalability & Maintainability)

---

### NFR-012: Kiến Trúc Ứng Dụng Phi Trạng Thái (Stateless Application Architecture)
- **Mã Yêu Cầu**: `NFR-012`
- **Tên Yêu Cầu**: Kiến Trúc Ứng Dụng Phi Trạng Thái (Stateless Application Architecture).
- **Phân Loại**: Scalability.
- **Mô Tả**: Tầng Backend FastAPI không lưu trữ phiên làm việc trong biến nhớ cục bộ; trạng thái được xác thực qua JWT hoặc Redis tập trung, cho phép nhân bản nhiều container Backend đứng sau Nginx load balancer.
- **Phương Pháp Kiểm Chứng**: Thử nghiệm chạy 2 container backend phía sau Nginx upstream -> Request của cùng 1 user được phân luồng luân phiên vẫn xác thực bình thường.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-013: Phân Tách Lưu Trữ Quan Hệ & Bộ Đệm (Data Persistence & Cache Separation)
- **Mã Yêu Cầu**: `NFR-013`
- **Tên Yêu Cầu**: Phân Tách Lưu Trữ Quan Hệ & Bộ Đệm (Data Persistence & Cache Separation).
- **Phân Loại**: Scalability & Architecture.
- **Mô Tả**: Cơ sở dữ liệu PostgreSQL 16 (lưu trữ lâu dài) và Redis 7 (bộ đệm lưu tạm thời) được cô lập thành các service riêng biệt có volume lưu trữ độc lập.
- **Phương Pháp Kiểm Chứng**: Kiểm tra cấu hình `docker-compose.yml` có 2 khối service và 2 volume riêng biệt.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-014: Phân Tách Module 3 Tầng Chuẩn Hóa (Modular 3-Tier Layering)
- **Mã Yêu Cầu**: `NFR-014`
- **Tên Yêu Cầu**: Phân Tách Module 3 Tầng Chuẩn Hóa (Modular 3-Tier Layering).
- **Phân Loại**: Maintainability.
- **Mô Tả**: Mã nguồn tuân thủ nghiêm ngặt ranh giới 3 thư mục: `ai-frontend` (Presentation), `ai-backend` (Business Logic & AI Engine), `ai-infra` (Infrastructure & Ingress Proxy).
- **Phương Pháp Kiểm Chứng**: Rà soát cấu trúc thư mục không có sự phụ thuộc chéo vi phạm ranh giới.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-015: Hợp Đồng Giao Tiếp API Chuẩn Máy Đọc (Machine-Readable API Contract)
- **Mã Yêu Cầu**: `NFR-015`
- **Tên Yêu Cầu**: Hợp Đồng Giao Tiếp API Chuẩn Máy Đọc (Machine-Readable API Contract).
- **Phân Loại**: Maintainability.
- **Chỉ Số Định Lượng (Target Metric)**: 100% các endpoint được đặc tả đầy đủ trong file OpenAPI 3.1 YAML.
- **Mô Tả**: Tài liệu tương tác Swagger UI tự động hiển thị tại `/docs` và ReDoc tại `/redoc`.
- **Phương Pháp Kiểm Chứng**: Kiểm tra tính hợp lệ của file `openapi.yaml` bằng công cụ OpenAPI Validator.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

## 5. Nhóm Yêu Cầu Về Trải Nghiệm & Quyền Riêng Tư (Usability & Privacy)

---

### NFR-016: Thiết Kế Tương Thích Đa Màn Hình (Responsive UI Design)
- **Mã Yêu Cầu**: `NFR-016`
- **Tên Yêu Cầu**: Thiết Kế Tương Thích Đa Màn Hình (Responsive UI Design).
- **Phân Loại**: Usability.
- **Chỉ Số Định Lượng (Target Metric)**: Giao diện hiển thị chuẩn xác không bị vỡ layout trên dải kích thước màn hình từ 360px (Mobile) đến 1920px (Desktop Full HD).
- **Mô Tả**: Trên màn hình nhỏ, Sidebar tự động thu gọn thành menu trượt (Drawer); ô nhập chat luôn cố định ở chân màn hình.
- **Phương Pháp Kiểm Chứng**: Kiểm tra giao diện trên nhiều kích thước thiết bị bằng công cụ Device Emulation.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-017: Trực Quan Hóa Trạng Thái Chờ Phản Hồi (Visual Loading States)
- **Mã Yêu Cầu**: `NFR-017`
- **Tên Yêu Cầu**: Trực Quan Hóa Trạng Thái Chờ Phản Hồi (Visual Loading States).
- **Phân Loại**: Usability.
- **Mô Tả**: Trong thời gian chờ AI phản hồi, giao diện hiển thị biểu tượng hoạt họa đang xử lý (Typing dots animation), nút gửi chuyển sang trạng thái vô hiệu hóa để tránh người dùng bấm liên tục nhiều lần.
- **Phương Pháp Kiểm Chứng**: Quan sát giao diện khi gửi câu hỏi phức tạp.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-018: Bảo Vệ Quyền Riêng Tư & Hỗ Trợ Xóa Dữ Liệu (User Data Privacy & Erasure)
- **Mã Yêu Cầu**: `NFR-018`
- **Tên Yêu Cầu**: Bảo Vệ Quyền Riêng Tư & Hỗ Trợ Xóa Dữ Liệu (User Data Privacy & Erasure).
- **Phân Loại**: Privacy.
- **Mô Tả**: Người dùng có toàn quyền xóa cuộc trò chuyện của mình; khi thực hiện xóa, toàn bộ dữ liệu nội dung tin nhắn tương ứng không còn hiển thị và không thể phục hồi bởi người dùng.
- **Phương Pháp Kiểm Chứng**: Thực hiện thao tác xóa cuộc trò chuyện và kiểm tra lại API lấy danh sách tin nhắn.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-019: Nhật Ký Có Cấu Trúc & Ẩn Danh Dữ Liệu Nhạy Cảm (Structured Redacted Telemetry)
- **Mã Yêu Cầu**: `NFR-019`
- **Tên Yêu Cầu**: Nhật Ký Có Cấu Trúc & Ẩn Danh Dữ Liệu Nhạy Cảm (Structured Redacted Telemetry).
- **Phân Loại**: Observability & Security.
- **Mô Tả**: Nhật ký hệ thống được ghi nhận dưới định dạng JSON bao gồm timestamp, mã phiên, độ trễ và mã trạng thái HTTP. Tuyệt đối không bao giờ ghi nhận mật khẩu, Authorization header hay toàn văn nội dung nhạy cảm của người dùng vào file log (`SEC-006`).
- **Phương Pháp Kiểm Chứng**: Rà soát file log của container sau khi thực hiện đăng nhập và trò chuyện.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-020: Hiệu Năng Thu Thập Telemetry (Metrics Middleware Overhead)
- **Mã Yêu Cầu**: `NFR-020`
- **Tên Yêu Cầu**: Hiệu Năng Thu Thập Telemetry (Metrics Middleware Overhead).
- **Phân Loại**: Performance.
- **Chỉ Số Định Lượng (Target Metric)**: Độ trễ bổ sung (Overhead latency) của tầng Middleware đo lường và ghi log tài nguyên không vượt quá **5 ms** trên mỗi yêu cầu API.
- **Mô Tả**: Việc thu thập số liệu và cập nhật hạn ngạch không được làm nghẽn luồng xử lý chính hoặc làm suy giảm tốc độ streaming câu trả lời của AI.
- **Phương Pháp Kiểm Chứng**: Thực hiện benchmark tải so sánh độ trễ API khi bật và tắt Telemetry Middleware.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-021: Độ Trễ Cập Nhật Dashboard Thời Gian Thực (Real-Time Dashboard Streaming Latency)
- **Mã Yêu Cầu**: `NFR-021`
- **Tên Yêu Cầu**: Độ Trễ Cập Nhật Dashboard Thời Gian Thực (Real-Time Dashboard Streaming Latency).
- **Phân Loại**: Responsiveness & Usability.
- **Chỉ Số Định Lượng (Target Metric)**: Độ trễ từ khi một yêu cầu hoàn tất hoặc một token chunk được sinh ra đến khi xuất hiện trên biểu đồ thời gian thực của Dashboard không vượt quá **1.0 giây** (`delay <= 1000ms`).
- **Mô Tả**: Kênh SSE phát sự kiện định kỳ 1 giây/lần mang lại cảm giác thời gian thực sống động cho người dùng theo dõi dashboard.
- **Phương Pháp Kiểm Chứng**: Gửi request đàm thoại và kiểm tra thời điểm xuất hiện của metric tick tương ứng trên màn hình Dashboard qua Developer Tools EventStream.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-022: Hiệu Năng Truy Vấn Tìm Kiếm & Lọc Mô Hình (Model Search & Filter Latency)
- **Mã Yêu Cầu**: `NFR-022`
- **Tên Yêu Cầu**: Hiệu Năng Truy Vấn Tìm Kiếm & Lọc Mô Hình (Model Search & Filter Latency).
- **Phân Loại**: Performance & Responsiveness.
- **Chỉ Số Định Lượng (Target Metric)**: Toàn bộ quá trình tìm kiếm toàn văn/mờ và sàng lọc đa tiêu chí qua endpoint `GET /api/v1/models/search` phải hoàn tất với thời gian phản hồi máy chủ $\le 200\text{ms}$ (`latency <= 200ms`) trên tập dữ liệu danh mục mô hình quy mô lên đến 500 bản ghi.
- **Mô Tả**: Phục vụ trải nghiệm tìm kiếm tức thì không giật lag khi người dùng gõ từ khóa hoặc bật tắt các bộ lọc trên giao diện.
- **Phương Pháp Kiểm Chứng**: Đo lường thời gian phản hồi bằng Postman / curl và kiểm tra thông số mạng trong Chrome DevTools Network Tab khi thực thi truy vấn tìm kiếm với chuỗi ngẫu nhiên.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-023: Thời Gian Phản Hồi Thao Tác Liên Kết & Hủy Liên Kết Danh Tính (Account Linking Response Latency)
- **Mã Yêu Cầu**: `NFR-023`
- **Tên Yêu Cầu**: Thời Gian Phản Hồi Thao Tác Liên Kết & Hủy Liên Kết Danh Tính (Account Linking Response Latency).
- **Phân Loại**: Performance & Responsiveness.
- **Chỉ Số Định Lượng (Target Metric)**: Toàn bộ các thao tác kiểm tra trạng thái liên kết (`GET /api/v1/users/me/connections`), khởi tạo liên kết (`GET /api/v1/auth/discord/link`) và thực thi hủy liên kết (`DELETE /api/v1/users/me/discord`) phải hoàn tất với thời gian phản hồi máy chủ $\le 500\text{ms}$ (`latency <= 500ms`).
- **Mô Tả**: Bảo đảm trải nghiệm người dùng mượt mà, tức thì tại trang Cài đặt tài khoản mà không gây độ trễ gây khó chịu cho người dùng.
- **Phương Pháp Kiểm Chứng**: Đo lường thời gian phản hồi bằng công cụ kiểm thử tự động API và quan sát thời gian request trong DevTools Network tab.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-024: Thời Gian Phản Hồi Thao Tác Gỡ / Xóa Vĩnh Viễn Mô Hình (Model Permanent Removal Response Latency)
- **Mã Yêu Cầu**: `NFR-024`
- **Tên Yêu Cầu**: Thời Gian Phản Hồi Thao Tác Gỡ / Xóa Vĩnh Viễn Mô Hình (Model Permanent Removal Response Latency).
- **Phân Loại**: Performance & Responsiveness.
- **Chỉ Số Định Lượng (Target Metric)**: Toàn bộ quá trình kiểm tra tiền điều kiện, xác thực định danh và thực thi xóa bản ghi mô hình qua endpoint `DELETE /api/v1/models/{model_id}/permanent` phải hoàn tất với thời gian phản hồi máy chủ $\le 300\text{ms}$ (`latency <= 300ms`).
- **Mô Tả**: Đảm bảo phản hồi nhanh chóng, dứt khoát trên giao diện danh mục mô hình, cập nhật UI và đóng modal xác nhận xóa tức thì mà không gây đơ lag.
- **Phương Pháp Kiểm Chứng**: Thực thi kiểm thử tự động API bằng pytest / curl và đo lường thời gian phản hồi máy chủ.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### NFR-025: Thời Gian Phản Hồi Thao Tác Cấu Hình Bot Discord (Discord Bot Configuration Response Latency)
- **Mã Yêu Cầu**: `NFR-025`
- **Tên Yêu Cầu**: Thời Gian Phản Hồi Thao Tác Cấu Hình Bot Discord (Discord Bot Configuration Response Latency).
- **Phân Loại**: Performance & Responsiveness.
- **Chỉ Số Định Lượng (Target Metric)**: Toàn bộ các thao tác truy vấn cấu hình bot (`GET /api/v1/bot/discord/config`), cập nhật thông số (`PUT /api/v1/bot/discord/config`) và lấy danh sách máy chủ (`GET /api/v1/bot/discord/guilds`) phải hoàn tất với thời gian phản hồi máy chủ nội bộ $\le 300\text{ms}$ (P95) trong điều kiện tải bình thường.
- **Mô Tả**: Bảo đảm trải nghiệm mượt mà, phản hồi ngay lập tức cho người dùng khi tùy biến Bot Discord tại giao diện Cài đặt web.
- **Phương Pháp Kiểm Chứng**: Thực thi kiểm thử hiệu năng tự động API và đo lường Round-Trip Time bằng TestClient.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.






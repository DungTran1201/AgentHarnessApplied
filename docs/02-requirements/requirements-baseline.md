# ĐẶC TẢ YÊU CẦU CỐT LÕI (REQUIREMENTS BASELINE)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Yêu Cầu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `REQ-BASE-001` |
| **Phiên bản Baseline** | v1.0.0-BASELINED |
| **Trạng thái phê duyệt** | **BASELINED** (Đã qua thẩm định tính nhất quán và kiểm toán truy vết) |
| **Hệ thống Priority** | Chuẩn hóa duy nhất: **`MUST`**, **`SHOULD`**, **`COULD`**, **`WONT`** (MoSCoW) |
| **Mô hình trạng thái** | `DRAFT` \| `REVIEW` \| `BASELINED` \| `CHANGED` \| `DEPRECATED` \| `BLOCKED` |
| **Quy định ràng buộc** | **GIAI ĐOẠN REQUIREMENTS ENGINEERING — KHÔNG VIẾT CODE** |

---

## 1. Phạm Vi Hệ Thống (System Scope)

### 1.1 In Scope (Thuộc phạm vi Baseline v1.0)
- **Xác thực & Quản lý người dùng**: Đăng ký tài khoản (Email/Password), Đăng nhập, Duy trì phiên làm việc qua JWT/Cookie an toàn, Đăng xuất.
- **Quản lý phiên hội thoại (Conversations)**: Tạo cuộc trò chuyện mới, xem danh sách lịch sử theo thứ tự cập nhật, đổi tên (thủ công & tự động), xóa cuộc trò chuyện.
- **Tương tác đàm thoại AI**: Gửi tin nhắn văn bản, nhận câu trả lời dạng Streaming (Server-Sent Events) hoặc đồng bộ, kết xuất Markdown hoàn chỉnh và làm nổi bật khối mã nguồn (Syntax highlighting).
- **Điều phối đa nhà cung cấp AI & Tự động Failover**: Kết nối Google Gemini API (mặc định), tự động chuyển vùng dự phòng sang OpenAI API khi Gemini gặp lỗi (mã 429, 503, timeout).
- **Phòng thủ an ninh & Giới hạn lưu lượng**: Cơ chế phòng thủ 2 lớp (Rate Limiting 10 r/s tại Ingress Nginx và 60 r/phút/IP tại Backend FastAPI), cô lập dữ liệu người dùng (`WHERE user_id = current_user.id`), bảo vệ tuyệt đối API Key.

### 1.2 Out of Scope (Không thuộc phạm vi dự án hiện tại)
- Tích hợp cổng thanh toán trực tuyến (Payment/Subscription Billing).
- Ứng dụng di động bản địa (Native iOS/Android Apps).
- Tự huấn luyện (Fine-tuning) mô hình AI riêng trên máy chủ cục bộ.
- Đàm thoại âm thanh/giọng nói thời gian thực (Speech-to-Speech).

### 1.3 Future Scope (Phạm vi mở rộng tương lai)
- Tải lên tệp tài liệu (PDF, Word) để AI phân tích ngữ cảnh (RAG Document Processing).
- Cổng quản trị hệ thống tập trung (Admin Dashboard) quản lý danh mục prompt và người dùng.
- Đăng nhập qua mạng xã hội (OAuth2 Social Login: Google, GitHub, Discord).
- Xuất bản hoặc chia sẻ cuộc trò chuyện công khai qua đường dẫn permalink.

---

## 2. Các Tác Nhân Hệ Thống (System Actors)

| Mã Tác Nhân | Tên Tác Nhân | Loại | Quyền Hạn & Tương Tác Nghiệp Vụ |
| :---: | :--- | :---: | :--- |
| **ACT-01** | **Guest** (Khách vãng lai) | Human | Người dùng chưa đăng nhập; truy cập xem Landing page, form đăng nhập và form đăng ký. |
| **ACT-02** | **Registered User** (Người dùng chính thức) | Human | Người dùng đã xác thực; có toàn quyền tạo, xem, đổi tên, xóa cuộc trò chuyện và gửi tin nhắn đàm thoại với AI. |
| **ACT-03** | **External AI Provider** | System | Các dịch vụ AI đám mây bên thứ ba (Google Gemini API, OpenAI API) tiếp nhận prompt và sinh câu trả lời. |
| **ACT-04** | **System Background Scheduler** | System | Tiến trình ngầm định kỳ quét dọn token hết hạn và dọn dẹp các phiên làm việc tạm thời. |

---

## 3. Mục Tiêu Nghiệp Vụ (Business Goals)

- **BO-01 (Trải Nghiệm Tương Tác Vượt Trội)**: Cung cấp giao diện đàm thoại web trực quan, thời gian hiển thị ký tự đầu tiên (TTFT) < 2.0 giây, hỗ trợ hiển thị Markdown và code đẹp mắt.
- **BO-02 (Sẵn Sàng Dịch Vụ & Tối Ưu Chi Phí)**: Tận dụng chi phí tối ưu của Google Gemini, đồng thời duy trì độ sẵn sàng cao thông qua cơ chế tự động chuyển vùng dự phòng sang OpenAI.
- **BO-03 (Bảo Toàn Ngữ Cảnh Hội Thoại)**: Cho phép người dùng tổ chức công việc theo từng phiên chat độc lập, truy cứu lại lịch sử trao đổi bất kỳ lúc nào.
- **BO-04 (An Toàn Dữ Liệu & Kiểm Soát Lạm Dụng)**: Ngăn ngừa rò rỉ khóa API, chống tấn công tiêm nhiễm prompt injection, bảo vệ quyền riêng tư và giới hạn lưu lượng chống cạn kiệt tài nguyên.

---

## 4. Danh Mục Năng Lực Cốt Lõi (Capabilities)

```text
AI-CHAN CAPABILITIES
├── CAP-FOUNDATION: Kiến trúc 3 tầng, Chuẩn kết nối CSDL, Hợp đồng OpenAPI
├── CAP-AUTH: Đăng ký, Đăng nhập, Đăng xuất, Quản lý Token & Session
├── CAP-CONV: Quản lý vòng đời cuộc trò chuyện, Danh sách lịch sử, Cách ly dữ liệu
├── CAP-CHAT-AI: Tiếp nhận tin nhắn, Điều phối LLM, Streaming SSE, Tự động Failover
├── CAP-SEC-PERF: Rate limiting 2 tầng, Khử khuẩn XSS, Kiểm soát Prompt Injection
└── CAP-OPS: Hạ tầng Docker Compose Ingress HTTPS TLS 1.3, Logging, Sổ tay vận hành
```

---

## 5. Danh Mục Yêu Cầu Chức Năng Đã Chuẩn Hóa (Functional Requirements)

| Mã Yêu Cầu | Tên Yêu Cầu Chức Năng | Năng Lực | Độ Ưu Tiên | Trạng Thái | Mô Tả Tóm Tắt |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **FR-001** | User Registration | `CAP-AUTH` | **MUST** | `BASELINED` | Đăng ký tài khoản bằng email hợp lệ và mật khẩu băm an toàn. |
| **FR-002** | User Login | `CAP-AUTH` | **MUST** | `BASELINED` | Xác thực người dùng, cấp phát JWT token an toàn. |
| **FR-003** | User Logout | `CAP-AUTH` | **MUST** | `BASELINED` | Thu hồi token/session, đưa người dùng về trạng thái Guest. |
| **FR-004** | Create Conversation | `CAP-CONV` | **MUST** | `BASELINED` | Tạo phiên hội thoại mới gắn với `user_id` hiện tại. |
| **FR-005** | List Conversation History | `CAP-CONV` | **MUST** | `BASELINED` | Hiển thị danh sách cuộc trò chuyện trên Sidebar theo `updated_at DESC`. |
| **FR-006** | Rename Conversation | `CAP-CONV` | **SHOULD** | `BASELINED` | Đổi tên cuộc trò chuyện thủ công hoặc tự động trích xuất 30 ký tự đầu. |
| **FR-007** | Delete Conversation | `CAP-CONV` | **MUST** | `BASELINED` | Xóa cuộc trò chuyện và toàn bộ tin nhắn liên quan (Soft Delete). |
| **FR-008** | Send Message & Input Validation | `CAP-CHAT-AI` | **MUST** | `BASELINED` | Kiểm tra giới hạn 4,000 ký tự, lưu bản ghi tin nhắn người dùng. |
| **FR-009** | Receive AI Response | `CAP-CHAT-AI` | **MUST** | `BASELINED` | Tiếp nhận câu trả lời AI, kết xuất Markdown và làm nổi bật khối mã nguồn. |
| **FR-010** | Select AI Model/Provider | `CAP-CHAT-AI` | **SHOULD** | `BASELINED` | Cho phép người dùng tùy chọn mô hình AI (Gemini Flash/Pro, GPT-4o). |
| **FR-011** | Multi-Provider Failover | `CAP-CHAT-AI` | **MUST** | `BASELINED` | Tự động chuyển gọi sang OpenAI khi Gemini gặp lỗi 429/5xx/timeout. |
| **FR-012** | Conversation Data Isolation | `CAP-CONV` | **MUST** | `BASELINED` | Chống IDOR: Nghiêm cấm truy cập chéo cuộc trò chuyện của người khác (HTTP 403). |
| **FR-013** | Streaming Response Delivery | `CAP-CHAT-AI` | **MUST** | `BASELINED` | Truyền luồng dữ liệu chunk-by-chunk qua ReadableStream/SSE để giảm TTFT. |
| **FR-014** | Message Token Accounting | `CAP-CHAT-AI` | **MUST** | `BASELINED` | Ghi nhận số lượng token tiêu thụ trên mỗi lượt sinh câu trả lời. |

---

## 6. Danh Mục Yêu Cầu Phi Chức Năng Đã Chuẩn Hóa (Non-Functional Requirements)

- **NFR-001 (Thời gian tải giao diện)**: Tải trang FCP < 1.5 giây trên kết nối mạng băng thông rộng.
- **NFR-002 (Độ trễ ký tự đầu tiên - TTFT)**: Dữ liệu stream từ AI bắt đầu hiển thị trên màn hình trong vòng 2.0 giây.
- **NFR-003 (Sức chịu tải đồng thời)**: Hệ thống chịu tải tối thiểu 100 người dùng hoạt động đồng thời (concurrent active users).
- **NFR-004 (Mã hóa đường truyền)**: 100% lưu lượng mạng đi qua Nginx Ingress sử dụng giao thức HTTPS với chuẩn bảo mật TLS 1.3.
- **NFR-005 (Bảo vệ bí mật khóa API)**: Tuyệt đối không bao giờ trả API Key về phía Client; cô lập gọi API tại Backend.
- **NFR-006 (Bảo vệ mật khẩu người dùng)**: Mật khẩu bắt buộc được băm một chiều bằng Argon2id hoặc Bcrypt kèm muối ngẫu nhiên.
- **NFR-007 (Rate Limiting 2 tầng)**: Tầng Ingress Nginx giới hạn 10 r/s; tầng Backend FastAPI giới hạn 60 r/phút/IP.
- **NFR-008 (Khử khuẩn hiển thị chống XSS)**: Toàn bộ câu trả lời AI được lọc bỏ mã độc HTML/JavaScript trước khi đưa vào DOM.
- **NFR-009 (Độ sẵn sàng dịch vụ)**: Tỷ lệ uptime hàng tháng đạt tối thiểu 99.5%.
- **NFR-010 (Tự phục hồi dịch vụ)**: Container Docker bị crash tự khởi động lại trong vòng 10 giây (`restart: unless-stopped`).
- **NFR-011 (Cô lập lỗi AI bên ngoài)**: Lỗi từ nhà cung cấp AI bên thứ ba không được phép làm sập tiến trình máy chủ.
- **NFR-012 (Kiến trúc Stateless)**: Tầng ứng dụng Backend không lưu trạng thái phiên trong bộ nhớ tiến trình, sẵn sàng mở rộng ngang.
- **NFR-013 (Phân tách lưu trữ & Cache)**: PostgreSQL và Redis vận hành biệt lập trong mạng nội bộ container.
- **NFR-014 (Cấu trúc Module 3 tầng)**: Phân tách rõ ràng giữa Frontend (Next.js), Backend (FastAPI) và Ingress (Nginx).
- **NFR-015 (Hợp đồng API chuẩn máy đọc)**: Biên soạn đầy đủ đặc tả OpenAPI 3.1 cho 100% endpoints.
- **NFR-016 (Thiết kế tương thích đa thiết bị)**: Giao diện hiển thị chuẩn từ Mobile (360px) đến Desktop (1920x1080).
- **NFR-017 (Trực quan hóa trạng thái chờ)**: Hiển thị hiệu ứng gõ phím / loading rõ ràng trong thời gian đợi AI phản hồi.
- **NFR-018 (Quyền riêng tư dữ liệu)**: Hỗ trợ xóa vĩnh viễn dữ liệu cuộc trò chuyện khi người dùng yêu cầu.
- **NFR-019 (Nhật ký có cấu trúc & ẩn danh)**: Ghi log JSON có mã vết giao dịch, tự động lọc bỏ mật khẩu và token xác thực.

---

## 7. Quy Tắc Nghiệp Vụ Chuẩn Hóa (Business Rules)

- **BR-001 (Bắt buộc xác thực để lưu phiên)**: Chỉ người dùng đã đăng nhập hợp lệ (Registered User) mới được tạo và lưu trữ cuộc trò chuyện trên hệ thống.
- **BR-002 (Cách ly quyền sở hữu cuộc trò chuyện)**: Mỗi cuộc trò chuyện gắn với duy nhất một `user_id`. Truy cập trái phép bị từ chối ngay lập tức với mã HTTP 403 Forbidden.
- **BR-003 (Giới hạn chiều dài tin nhắn)**: Tin nhắn gửi lên không được rỗng và không vượt quá 4,000 ký tự.
- **BR-004 (Tự động gán tiêu đề cuộc trò chuyện)**: Tiêu đề mặc định là "Cuộc trò chuyện mới"; sau tin nhắn đầu tiên, hệ thống tự động gán 30 ký tự đầu làm tiêu đề hiển thị.
- **BR-005 (Thứ tự ưu tiên nhà cung cấp AI)**: Thứ tự gọi mặc định: Google Gemini -> Fallback OpenAI.
- **BR-006 (Thực thi khi vượt Rate Limit)**: Vượt quá tần suất quy định bị từ chối ngay với mã HTTP 429 Too Many Requests.

---

## 8. Danh Mục Yêu Cầu An Ninh Cốt Lõi (Security Requirements)

- **SEC-001 (Cô Lập Bí Mật Khóa API)**: Toàn bộ khóa bí mật kết nối tới Google Gemini và OpenAI API được cô lập 100% tại Backend, cấm client truy cập trực tiếp (`NFR-005`, `CST-01`).
- **SEC-002 (Phòng Thủ Tiêm Nhiễm Prompt Injection)**: Tách biệt cấu trúc giữa System Instruction và User Prompt; dữ liệu đầu vào người dùng được truyền qua trường nội dung riêng biệt, không nối chuỗi thô.
- **SEC-003 (Khử Khuẩn Hiển Thị Chống XSS)**: Bộ render Markdown phía Frontend bắt buộc phải lọc bỏ các thẻ `<script>`, `onerror`, `javascript:` độc hại (`NFR-008`).
- **SEC-004 (Bảo Vệ Phiên Làm Việc JWT)**: Token JWT được lưu trong Cookie bảo mật với các cờ `HttpOnly; Secure; SameSite=Strict` (`FR-002`).
- **SEC-005 (Kiểm Soát Tần Suất 2 Tầng)**: Phòng thủ DoS đa tầng với 10 r/s tại Nginx Ingress và 60 r/phút/IP tại FastAPI (`NFR-007`, `BR-006`).
- **SEC-006 (Ẩn Danh Dữ Liệu Nhạy Cảm Trong Log)**: Không ghi nhận mật khẩu, auth token, hoặc toàn văn dữ liệu cá nhân vào log hệ thống (`NFR-019`).

---

## 9. Các Ràng Buộc Kỹ Thuật (Constraints)

- **CST-01 (Bảo Mật Tuyệt Đối Khóa API)**: Không bao giờ trả API Key về trình duyệt hoặc lưu trong source code tĩnh.
- **CST-02 (Ranh Giới Cổng Mạng)**: Chỉ mở cổng 80 (chuyển hướng) và 443 (HTTPS) ra ngoài Internet; đóng kín toàn bộ các cổng 5432, 6379, 8000 trong mạng nội bộ Docker.
- **CST-03 (Quy Định Không Coding Trong Phase Này)**: Tuyệt đối không viết code trong phase Requirements Engineering.

---

## 10. Bộ Tiêu Chí Nghiệm Thu Cấp Cao (Acceptance Criteria Summary)

- **AC-001 (Nghiệm thu Xác thực)**: Đăng ký email mới thành công; mật khẩu được băm an toàn trong DB; đăng nhập đúng cấp JWT; đăng nhập sai báo lỗi rõ ràng.
- **AC-002 (Nghiệm thu Quản lý Hội thoại)**: Tạo mới cuộc trò chuyện xuất hiện trên Sidebar; hiển thị đúng danh sách theo thời gian; xóa cuộc trò chuyện ẩn dữ liệu thành công; ngăn chặn truy cập trái phép chéo tài khoản.
- **AC-003 (Nghiệm thu Đàm thoại AI)**: Người dùng gửi câu hỏi nhận được câu trả lời dạng Markdown/Code syntax; hỗ trợ streaming mượt mà với TTFT < 2.0s.
- **AC-004 (Nghiệm thu Failover Tự Động)**: Giả lập lỗi Gemini API -> Hệ thống tự động chuyển vùng gọi OpenAI thành công mà không làm đứt đoạn phiên đàm thoại của người dùng.
- **AC-005 (Nghiệm thu An Ninh & Tải)**: Chịu tải đồng thời 100 users ổn định; gửi request dồn dập bị chặn với HTTP 429; quét mã không phát hiện secret bị lộ.

---

## 11. Trạng Thái Baseline & Cam Kết Phê Duyệt

Toàn bộ các yêu cầu trong tài liệu này được xác lập trạng thái:
> **BASELINE STATUS: `BASELINED` (APPROVED FOR DOWNSTREAM PHASES)**
> 
> Bộ yêu cầu này chính thức đóng vai trò là hợp đồng đầu vào (Input Contract) không thể thay đổi tùy tiện cho:
> 1. Phân tích Quy trình Nghiệp vụ (Phase 03: `docs/04-business-process/`)
> 2. Đặc tả Ca Sử Dụng (Phase 03: `docs/03-use-cases/`)
> 3. Thiết kế Kiến trúc Hệ thống (Phase 01: `docs/07-architecture/`)
> 4. Đặc tả Hợp đồng API (Phase 01: `docs/08-api/`)

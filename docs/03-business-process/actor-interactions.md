# MÔ HÌNH TÁC NHÂN & LÀN TƯƠNG TÁC (ACTOR INTERACTIONS & LANES)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-ACTOR-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Định nghĩa chi tiết ranh giới vai trò và hành vi của các Tác nhân con người (Business Actors), Thành phần hệ thống nội bộ (System Actors) và Dịch vụ bên ngoài (External Services) trong toàn bộ các quy trình nghiệp vụ |

---

## 1. Danh Mục Các Bên Tham Gia Quy Trình (Participant Catalog)

Hệ thống phân định nghiêm ngặt thành **3 nhóm chủ thể**:

### 1.1 Tác Nhân Nghiệp Vụ Con Người (Business Actors)

| Mã Tác Nhân | Tên Tác Nhân | Vai Trò & Quyền Hạn | Phạm Vi Quy Trình Tham Gia |
| :--- | :--- | :--- | :--- |
| **`ACT-01`** | **Khách Vãng Lai (Guest / Unauthenticated User)** | Người dùng duyệt web chưa đăng nhập hoặc chưa đăng ký tài khoản. Chỉ có quyền truy cập các trang công khai (`/login`, `/register`). Bị chặn toàn bộ các chức năng tạo hội thoại, gửi tin nhắn hoặc truy xuất lịch sử (`BR-001`). | `BP-AUTH-001 [PROC-001]`, `BP-AUTH-002 [PROC-002]` |
| **`ACT-02`** | **Người Dùng Đã Xác Thực (Registered & Authenticated User)** | Người dùng đã đăng ký thành công, sở hữu mã thông báo JWT hợp lệ trong Cookie. Có toàn quyền quản lý tài khoản cá nhân, tạo và quản lý các cuộc trò chuyện của chính mình, gửi câu hỏi và nhận câu trả lời từ AI (`BR-002`). | `BP-AUTH-003 [PROC-003]`, `BP-CONV-001 [PROC-004]`, `BP-CONV-002 [PROC-005]`, `BP-CONV-003 [PROC-006]`, `BP-CONV-004 [PROC-007]`, `BP-CHAT-001 [PROC-008]` |

> [!NOTE]
> Vai trò **Quản trị viên (Admin)** hiện chưa nằm trong phạm vi phát triển của phiên bản MVP này (đã được ghi nhận trong `docs/02-requirements/open-questions.md`).

---

### 1.2 Thành Phần Hệ Thống Nội Bộ (System Actors / Internal Components)

*Các thành phần kỹ thuật phối hợp để thực thi các bước quy trình:*

| Thành Phần | Công Nghệ Đại Diện | Trách Nhiệm Vận Hành Trong Quy Trình |
| :--- | :--- | :--- |
| **`Frontend Client`** | `ai-frontend` (Next.js 14 App Router, React) | Tiếp nhận thao tác chuột/phím của người dùng; kiểm tra dữ liệu phía máy khách (Client-side validation); gửi request HTTP/SSE; render giao diện đàm thoại, streaming token, định dạng Markdown và syntax highlighting. |
| **`Ingress Gateway`** | `ai-infra` (Nginx Reverse Proxy) | Tiếp nhận kết nối HTTPS ban đầu; thực thi chứng chỉ SSL/TLS; bảo vệ hệ thống bằng tầng Rate Limit thô số 1 (Tối đa 10 req/s mỗi IP); điều hướng tải về Backend và Frontend. |
| **`Backend API Core`** | `ai-backend` (FastAPI, Python 3.11) | Trung tâm xử lý nghiệp vụ; kiểm tra tính xác thực của JWT Cookie; thực thi phân quyền và cách ly dữ liệu (`BR-002`); xác thực dữ liệu đầu vào với Pydantic (`BR-003`); mã hóa mật khẩu; quản lý transaction dữ liệu. |
| **`LLM Orchestrator`** | `ai-backend` (`LLMManager` module) | Điều phối luồng gọi AI; đóng gói prompt và lịch sử hội thoại; quản lý timeout 30s; bắt ngoại lệ từ nhà cung cấp chính; thực hiện chuyển vùng dự phòng (Failover) sang nhà cung cấp phụ (`BR-005`). |
| **`Database Storage`** | PostgreSQL 16 Server | Lưu trữ bền vững dữ liệu tài khoản (`users`), phiên hội thoại (`conversations`) và tin nhắn đàm thoại (`messages`). |
| **`Rate Limiter Store`** | Memory / Redis Token Bucket | Lưu trữ bộ đếm trượt và trạng thái giới hạn tần suất yêu cầu thời gian thực (`BP-SEC-001`). |

---

### 1.3 Dịch Vụ Đám Mây Bên Ngoài (External AI Cloud Services)

*Hệ thống bên thứ ba cung cấp năng lực trí tuệ nhân tạo:*

| Dịch Vụ | Vai Trò Trong Hệ Thống | Cơ Chế Giao Tiếp | Ràng Buộc Vận Hành |
| :--- | :--- | :--- | :--- |
| **`Google Gemini API`** | **Nhà Cung Cấp Chính (Primary LLM Provider)** | HTTPS Streaming API (Google GenAI SDK) | Được gọi ưu tiên đầu tiên (`BR-005`). Nếu phản hồi mã lỗi 429, 5xx hoặc quá 30 giây -> Chuyển luồng. |
| **`OpenAI API`** | **Nhà Cung Cấp Dự Phòng (Fallback LLM Provider)** | HTTPS Streaming API (OpenAI Python SDK) | Chỉ được kích hoạt khi Gemini gặp sự cố, hoặc khi người dùng chỉ định rõ ràng mô hình OpenAI (`FR-010`). |

---

## 2. Ma Trận Phân Định Làn Trách Nhiệm (Swimlane Responsibility Matrix)

Bảng đối chiếu trách nhiệm từng làn trong các quy trình nghiệp vụ trọng yếu:

| Quy Trình Nghiệp Vụ | Làn 1: Người Dùng (Actor) | Làn 2: Frontend (UI) | Làn 3: Ingress / Gateway | Làn 4: Backend API | Làn 5: Cơ Sở Dữ Liệu | Làn 6: Dịch Vụ AI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`BP-AUTH-001` (Đăng ký)** | Nhập form, bấm Gửi | Validate form client | Proxy request, Rate limit | Hash mật khẩu bcrypt, tạo user | INSERT users | Không tham gia |
| **`BP-AUTH-002` (Đăng nhập)** | Nhập email & pass | Gửi credentials | Proxy request, Rate limit | Kiểm tra mật khẩu, ký JWT Cookie | SELECT users | Không tham gia |
| **`BP-AUTH-003` (Đăng xuất)** | Bấm Đăng xuất | Xóa state local | Proxy request | Set-Cookie Max-Age=0 | Không tham gia | Không tham gia |
| **`BP-CONV-001` (Tạo chat)** | Bấm Đoạn chat mới | Gửi POST /conversations | Proxy request | Verify user_id, tạo entity | INSERT conversations | Không tham gia |
| **`BP-CONV-002` (Lịch sử)** | Chọn conversation | Hiển thị list & messages | Proxy request | Verify user_id, nạp messages | SELECT conns/msgs | Không tham gia |
| **`BP-CONV-003` (Đổi tên)** | Nhập tên hoặc gửi chat | Hiển thị tên mới | Proxy request | Update title (auto/manual) | UPDATE conversations | Không tham gia |
| **`BP-CONV-004` (Xóa chat)** | Bấm Xóa, xác nhận | Gửi DELETE, clear UI | Proxy request | Verify ownership, xóa dữ liệu | DELETE conv & msgs | Không tham gia |
| **`BP-CHAT-001` (Gửi tin nhắn)** | Gõ tin nhắn, bấm Gửi | Render user msg, mở SSE | Proxy SSE, Rate limit | Validate BR-003, nạp ngữ cảnh | INSERT user message | Không trực tiếp |
| **`BP-AI-001` (Điều phối AI)** | Quan sát luồng trả lời | Nhận chunk SSE, render Markdown | Proxy stream chunk | LLMManager điều phối, bắt failover | INSERT bot message | Xử lý inference (Gemini / OpenAI) |
| **`BP-SEC-001` (Chống lạm dụng)**| Gửi request | Nhận 429 nếu vi phạm | Chặn 10 r/s (Layer 1) | Chặn 60 r/min (Layer 2) | Không tham gia | Không tham gia |

---

## 3. Quy Tắc Ranh Giới Tác Nhân Nghiệp Vụ (Actor Boundary Principles)

1. **Ranh Giới An Ninh Nghiệp Vụ (Trust Boundary)**:
   - Toàn bộ dữ liệu phát sinh từ `ACT-01` và `ACT-02` đều nằm bên ngoài ranh giới tin cậy (Untrusted Zone).
   - Frontend không được phép tin tưởng tuyệt đối vào người dùng; Backend không được phép tin tưởng tuyệt đối vào Frontend. Toàn bộ các quy tắc nghiệp vụ (`BR-001` đến `BR-006`) bắt buộc phải được thẩm tra lại tại tầng Backend.
2. **Nguyên Tắc Cách Ly Dữ Liệu (`BR-002`)**:
   - `ACT-02` tuyệt đối không thể tác động tới tài nguyên của một `ACT-02` khác. Ranh giới này được kiểm soát nghiêm ngặt bằng cặp khóa logic `(resource_id, current_user_id)` tại mọi truy vấn dữ liệu.
3. **Phân Định Giữa System Actor Và Business Actor**:
   - Cơ sở dữ liệu và Ingress Gateway là các thành phần thực thi kỹ thuật, **không phải là Business Actor**. Chúng chỉ đóng vai trò các điểm xử lý trung gian hoặc kho lưu trữ trong các sơ đồ luồng nghiệp vụ.

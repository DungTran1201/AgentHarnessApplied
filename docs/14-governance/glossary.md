# Thuật Ngữ Hệ Thống & Ngôn Ngữ Phổ Quát (Ubiquitous Language & Glossary)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `GOV-GLOS-001` |
| **Giai đoạn** | **Phase 14 — Governance & Lifecycle Management** |
| **Trạng thái** | **BASELINED** |

---

## 1. Bảng Thuật Ngữ Nghiệp Vụ Cốt Lõi (Domain & Ubiquitous Language)

| Thuật Ngữ (Term) | Định Nghĩa Chuẩn | Ngữ Cảnh Bounded Context |
| :--- | :--- | :--- |
| **AI Assistant (AI-Chan)** | Trợ lý ảo thông minh tương tác bằng ngôn ngữ tự nhiên thông qua giao diện web, có khả năng giải đáp, lập trình, viết văn bản. | Core Chat Context |
| **User (Người dùng)** | Cá nhân đã đăng ký tài khoản hợp lệ trong hệ thống bằng địa chỉ email duy nhất và mật khẩu bảo mật. | Identity & Auth Context |
| **Guest (Khách vãng lai)** | Người dùng chưa thực hiện xác thực, chỉ có quyền truy cập vào các trang công khai (`/login`, `/register`). | Identity Context |
| **Conversation (Cuộc trò chuyện)** | Một chuỗi phiên hội thoại logic giữa một Người dùng cụ thể và AI Assistant, có tiêu đề và lịch sử tin nhắn liên tục. | Conversation Context |
| **Message (Tin nhắn)** | Một lượt trao đổi trong cuộc trò chuyện, có thể do Người dùng gửi (`USER`) hoặc do AI Assistant phản hồi (`ASSISTANT`). | Chat Context |
| **Prompt** | Nội dung câu hỏi, yêu cầu hoặc chỉ thị bằng văn bản do người dùng nhập vào ô soạn thảo để gửi cho AI. | Chat Context |
| **Token Chunk** | Một phân đoạn từ vựng nhỏ được sinh ra liên tục theo thời gian thực từ mô hình ngôn ngữ lớn (LLM). | Real-Time Streaming |
| **Sliding Context Window** | Ngữ cảnh trượt tối đa 20 tin nhắn gần nhất (`INV-04`) được gửi kèm prompt để AI nắm bắt ngữ cảnh hội thoại. | Chat / LLM Gateway |
| **Multi-Provider Failover** | Cơ chế tự động chuyển hướng gọi API từ nhà cung cấp chính (Gemini) sang nhà cung cấp dự phòng (OpenAI) khi gặp lỗi quota hoặc 5xx. | LLM Gateway Context |

---

## 2. Bảng Viết Tắt Kỹ Thuật (Technical Abbreviations)

| Từ Viết Tắt | Ý Nghĩa Đầy Đủ | Ghi Chú Kỹ Thuật |
| :--- | :--- | :--- |
| **SSE** | Server-Sent Events | Giao thức truyền luồng một chiều từ máy chủ về máy khách qua kết nối HTTP chuẩn. |
| **JWT** | JSON Web Token | Chuỗi token mã hóa chứa thông tin nhận dạng phiên làm việc người dùng. |
| **HttpOnly Cookie** | HTTP-Only Secure Cookie | Cờ trình duyệt ngăn chặn JavaScript truy cập vào Cookie nhằm chống XSS. |
| **IDOR** | Insecure Direct Object References | Lỗ hổng cho phép người dùng truy cập trái phép đối tượng của người dùng khác qua ID. |
| **XSS** | Cross-Site Scripting | Lỗ hổng chèn mã độc JavaScript vào giao diện web của nạn nhân. |
| **CSRF** | Cross-Site Request Forgery | Tấn công mạo danh người dùng gửi request trái phép (phòng thủ bằng `SameSite=Lax`). |
| **LLM** | Large Language Model | Mô hình ngôn ngữ lớn xử lý và sinh ngôn ngữ tự nhiên (Google Gemini, OpenAI GPT). |
| **RPO / RTO** | Recovery Point Objective / Recovery Time Objective | Mục tiêu điểm phục hồi dữ liệu (24h) và thời gian phục hồi dịch vụ (30 phút). |

---

## 3. Danh Mục Tiền Tố Mã Định Danh Bất Biến (Stable ID Prefix Register)

Hệ thống sử dụng các tiền tố sau trong toàn bộ vòng đời tài liệu:
- `FR`: Functional Requirement
- `NFR`: Non-Functional Requirement
- `BR`: Business Rule
- `SEC`: Security Requirement
- `UX`: User Experience Requirement
- `UC`: Use Case
- `PROC`: Business Process
- `DOM`: Domain Entity / Invariant
- `ARCH`: Architecture Component
- `API`: API Contract Endpoint
- `SEQ`: Sequence Diagram Scenario
- `STATE`: State Machine Specification
- `THR`: Threat Model STRIDE
- `CTRL`: Security Defense Control
- `TC`: Test Case
- `ADR`: Architecture Decision Record
- `DEP`: Deployment Topology Specification

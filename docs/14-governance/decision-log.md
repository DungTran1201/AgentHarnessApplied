# Nhật Ký Quyết Định Nhẹ (Project Decision Log)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

Tệp tài liệu này ghi nhận các quyết định kỹ thuật và quản trị mang tính chất vận hành nhẹ trong quá trình thực thi tài liệu hóa.
Các quyết định cấu trúc/kiến trúc/bảo mật lớn thuộc về thư mục [docs/06-architecture/ADR/](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/).

---

## Danh Sách Các Quyết Định Đã Thống Nhất

| Mã Quyết Định | Ngày Ghi Nhận | Tiêu Đề Quyết Định | Nội Dung Chi Tiết & Lý Do | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| `DEC-001` | 2026-10-07 | Chuẩn hóa cấu trúc thư mục Pipeline 00 → 14 | Chuẩn hóa danh mục 15 giai đoạn duy nhất không trùng lặp, cập nhật `document-map.yaml` khớp 100% với cây thư mục thực tế. | **APPROVED** |
| `DEC-002` | 2026-10-07 | Ngữ cảnh trượt tối đa 20 tin nhắn (`INV-04`) | Giới hạn 20 tin nhắn gần nhất khi truyền vào context LLM nhằm tối ưu chi phí token và tốc độ phản hồi mà vẫn duy trì mạch hội thoại tự nhiên. | **APPROVED** |
| `DEC-003` | 2026-10-07 | Giới hạn ký tự tin nhắn đầu vào 4000 ký tự | Thiết lập chặn cứng 4000 ký tự ở cả Client (`UX-005`) và Server API (`API-009`) để chống tràn bộ nhớ và lạm dụng API. | **APPROVED** |
| `DEC-004` | 2026-10-07 | Tách biệt tuyệt đối giữa Documentation và Coding | Giữ trạng thái Coding là `NOT STARTED` trong suốt toàn bộ Documentation Pipeline để đảm bảo baseline hoàn thiện và được phê duyệt trước. | **APPROVED** |
| `DEC-005` | 2026-10-07 | Hoàn thành và Xác minh MVP Demo Website (`FEAT-001`) | Triển khai website demo hoàn chỉnh gồm FastAPI backend, SQLite database, và Next.js frontend với luồng SSE streaming, HttpOnly auth cookie, và xác minh 100% test cases đạt chuẩn. | **APPROVED** |
| `DEC-006` | 2026-10-08 | Thiết kế mở rộng phân hệ Quản lý tài khoản người dùng (`FEAT-002`) | Đặc tả kiến trúc, yêu cầu FR-015..020, quy tắc BR-007..011, 6 Use Case chi tiết (loại trừ chức năng hủy/vô hiệu hóa tài khoản), mở rộng cấu trúc bảng users, cơ chế Re-authentication (SEC-006) và luân chuyển khóa (SEC-007), không triển khai code trước khi duyệt thiết kế. | **APPROVED** |
| `DEC-007` | 2026-10-08 | Hoàn tất triển khai Backend & Frontend Quản lý tài khoản (`FEAT-002`) | Áp dụng database migration mở rộng bảng users, triển khai router users.py với đầy đủ 6 endpoints, trang cài đặt /settings 3 tab trên Next.js, vượt qua 100% automated unit tests và xác thực trực tiếp trên môi trường demo. | **APPROVED** |
| `DEC-008` | 2026-10-08 | Tích hợp điều phối Agent bằng LangChain & LangGraph (`CR-002`, `ADR-005`) | Chuẩn hóa tầng AI Orchestration bằng LangGraph StateGraph, tích hợp EnvKeyLoader để nạp API key động từ .env, hỗ trợ chuyển vùng dự phòng (Failover) an toàn và quản lý ngữ cảnh đàm thoại. | **APPROVED** |
| `DEC-009` | 2026-10-08 | Quản lý Agent Model đa nhà cung cấp & Cấm xóa cứng (`CR-003`, `ADR-006`) | Xây dựng phân hệ quản lý danh mục mô hình (Google Gemini, OpenAI GPT, Anthropic Claude, Groq LLaMA, Ollama), áp dụng quy tắc Soft Toggle (ACTIVE/INACTIVE, BR-012), bất biến mô hình mặc định (BR-013) và kiểm tra kết nối API key trước khi kích hoạt (BR-014). | **APPROVED** |
| `DEC-010` | 2026-10-09 | Thiết kế & Đặc tả Đăng ký / Đăng nhập bằng Discord OAuth2 (`FEAT-003`, `ADR-007`) | Đặc tả toàn diện yêu cầu chức năng FR-027/FR-028, quy tắc BR-016/BR-017/BR-018, bảo vệ an ninh SEC-008, mở rộng DDL users (discord_id, discord_username) và hệ thống biểu đồ BPMN/Sequence/Swimlane. Tuân thủ tuyệt đối quy định không can thiệp mã nguồn ứng dụng (NO CODING). | **APPROVED** |
| `DEC-011` | 2026-10-10 | Thiết kế & Đặc tả Phân hệ Quản lý Tài nguyên & Dashboard Thời gian thực (`CR-005`, `ADR-008`) | Thiết lập kiến trúc đo lường độ trễ (Latency, TTFT), số lượng token, hạn ngạch (User Quota) và lưu lượng API. Triển khai cơ chế SSE Streaming cho màn hình Dashboard thời gian thực, tích hợp bộ kiểm soát hạn ngạch và cô lập dữ liệu theo phân quyền (SEC-009, CTRL-008). Tuân thủ nguyên tắc chỉ xây dựng tài liệu và biểu đồ (NO CODING). | **APPROVED** |
| `DEC-012` | 2026-10-10 | Thiết kế & Đặc tả Mở rộng Quản lý Mô hình: Thêm, Chỉnh sửa, Tìm kiếm, Bộ lọc & Lưu trữ (`CR-006`, `ADR-009`) | Mở rộng danh mục mô hình: Đăng ký mới (FR-035), chỉnh sửa cấu hình (FR-036), tìm kiếm toàn văn & mờ (FR-037), bộ lọc đa tiêu chí (FR-038), và xóa mềm/lưu trữ có bảo vệ mô hình mặc định (FR-039, BR-023). Bổ sung quy tắc bất biến ID/Provider (BR-022) và kiểm tra tham số biên (BR-024). Tuân thủ nguyên tắc chỉ xây dựng tài liệu và biểu đồ (NO CODING). | **APPROVED** |
| `DEC-013` | 2026-10-10 | Thiết kế & Đặc tả Mở rộng Quản lý Tài khoản: Liên kết & Hủy liên kết tài khoản website với Discord (`CR-007`, `ADR-010`) | Đặc tả mở rộng liên kết tài khoản Discord cho người dùng đã đăng nhập (FR-040), hủy liên kết Discord (FR-041), hiển thị trạng thái kết nối mạng xã hội (FR-042). Thiết lập quy tắc bất biến duy nhất 1-1 (BR-025), chốt chặn chống mất quyền truy cập tài khoản khi hủy liên kết (BR-026) và tái xác thực mật khẩu bắt buộc (BR-027, SEC-011, CTRL-010). Tuân thủ nguyên tắc chỉ xây dựng tài liệu và biểu đồ (NO CODING). | **APPROVED** |
| `DEC-015` | 2026-10-10 | Thiết kế & Đặc tả Phân hệ Quản lý Bot Discord Cho Người Dùng Đã Liên Kết Discord (`CR-009`, `ADR-012`) | Đặc tả toàn diện tính năng quản lý bot Discord: Khám phá Guild có quyền quản trị (`FR-044`, `BR-034`, `OP-033`), định tuyến mô hình hoạt động & persona prompt (`FR-045`, `BR-033`, `OP-031`, `OP-032`), dùng chung hạn ngạch token Web & Discord (`FR-046`, `BR-032`, `OP-034`), xác thực chữ ký số Ed25519 (`SEC-013`, `CTRL-012`), đồng bộ lịch sử hội thoại sang Web (`FR-047`), bảng điều khiển Console (`UX-011`, `SCR-006`), và hệ thống biểu đồ kỹ thuật BPMN/Swimlane/Sequence/State. Tuân thủ tuyệt đối nguyên tắc không can thiệp mã nguồn ứng dụng (NO CODING). | **APPROVED** |








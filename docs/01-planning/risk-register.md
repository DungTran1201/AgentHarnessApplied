# SỔ BỘ QUẢN TRỊ RỦI RO DỰ ÁN (PROJECT RISK REGISTER)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `RSK-REG-001` |
| **Thang đo mức độ** | Thấp (`LOW`), Trung bình (`MEDIUM`), Cao (`HIGH`), Nghiêm trọng (`CRITICAL`) |
| **Trọng tâm đặc thù** | Quản trị rủi ro AI Chatbot: Chi phí token, Quota, Prompt Injection, Độ trễ, Bảo mật khóa API, Ảo giác AI và Khả năng chịu tải |

---

## 1. Bảng Tổng Hợp Rủi Ro Kỹ Thuật, AI & Vận Hành (Risk Register Matrix)

| Mã Rủi Ro | Phân Loại Rủi Ro | Mô Tả Nguy Cơ & Tác Động | Xác Suất | Mức Độ Ảnh Hưởng | Cấp Độ Rủi Ro (Level) | Phase Ảnh Hưởng | Biện Pháp Phòng Ngừa (Mitigation Strategy) | Kế Hoạch Ứng Phó (Contingency Plan) | Vai Trò Chịu Trách Nhiệm |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| **RSK-AI-01** | AI External | **Gián đoạn kết nối / Hết hạn mức Quota của nhà cung cấp chính**: Gemini API bị lỗi 429 hoặc sập dịch vụ làm gián đoạn chatbot. | Medium | Critical | **HIGH** | P04 | Triển khai kiến trúc đa nhà cung cấp; cài đặt cơ chế tự động Failover sang OpenAI trong `LLMManager`. | Chuyển toàn bộ lưu lượng sang OpenAI; nếu cả 2 lỗi thì hiển thị thông báo "Hệ thống AI đang bảo trì" thân thiện. | Solution Architect / Backend Dev |
| **RSK-AI-02** | Tài Chính | **Bùng nổ chi phí tiêu thụ Token (Token Cost Explosion)**: Người dùng hoặc bot gửi liên tục các prompt dài gây cạn kiệt tài khoản API. | High | High | **HIGH** | P04, P05 | Giới hạn độ dài tin nhắn tối đa 4,000 ký tự (`BR-003`); áp dụng Rate Limiting 60 req/phút/IP; cắt tỉa ngữ cảnh cũ. | Đặt ngưỡng cảnh báo ngân sách (Budget Alert) trên Google Cloud / OpenAI; tự động khóa API tạm thời nếu chi phí vượt trần. | Product Owner / Tech Lead |
| **RSK-AI-03** | Hiệu Năng | **Độ trễ phản hồi quá lâu (High Latency / Slow Response)**: Mô hình AI sinh câu trả lời mất 10-20 giây khiến người dùng tưởng hệ thống bị treo. | High | Medium | **HIGH** | P04 | Bắt buộc sử dụng Streaming chunk-by-chunk qua Server-Sent Events (SSE) để Time-To-First-Token < 2.0 giây. | Hiển thị animation gõ phím tức thì; thiết lập timeout 30 giây để tự động chuyển sang mô hình phản hồi nhanh hơn. | Frontend Dev / Backend Dev |
| **RSK-AI-04** | An Ninh AI | **Tấn công tiêm nhiễm câu lệnh (Prompt Injection)**: Kẻ xấu nhập prompt lừa AI tiết lộ system prompt hoặc tạo nội dung độc hại. | Medium | High | **HIGH** | P04, P05 | Phân tách rạch ròi giữa System Instruction và User Input; không nối chuỗi thô prompt vào chỉ thị điều khiển. | Kiểm duyệt câu trả lời bằng bộ lọc từ khóa/nội dung trước khi gửi về client; cập nhật prompt phòng thủ. | Security Reviewer / AI Engineer |
| **RSK-AI-05** | Nghiệp Vụ | **Ảo giác của mô hình AI (AI Hallucination & Accuracy)**: AI đưa ra câu trả lời sai sự thật nhưng với giọng điệu tự tin. | High | Low | **MEDIUM** | P04 | Bổ sung System Prompt hướng dẫn AI chỉ trả lời trong phạm vi và thừa nhận khi không biết; thêm Disclaimer trên UI. | Cung cấp nút đánh giá (Like/Dislike) hoặc báo cáo câu trả lời sai để đội ngũ cải thiện prompt. | Product Owner / BA |
| **RSK-SEC-01** | An Ninh Cốt Lõi | **Lộ lọt khóa bí mật API (API Key Exposure)**: Khóa `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` bị lọt ra trình duyệt hoặc commit vào Git. | Low | Critical | **CRITICAL** | Toàn bộ | Cô lập tuyệt đối cuộc gọi AI tại Backend; cấm Client gọi trực tiếp; áp dụng hook `sensitive-file-guard.py` và GitLeaks. | Lập tức thu hồi (Revoke) khóa trên console nhà cung cấp; sinh khóa mới và cập nhật biến môi trường trên server. | Security Officer / DevOps |
| **RSK-SEC-02** | An Ninh Web | **Mã độc XSS từ câu trả lời của AI**: AI sinh ra mã HTML/JS độc hại (`<script>`, `onload=`) và trình duyệt thực thi do render Markdown lỗi. | Medium | High | **HIGH** | P04, P05 | Khử khuẩn bắt buộc toàn bộ Markdown bằng DOMPurify / sanitize library trước khi render ra DOM trên React. | Vô hiệu hóa tính năng render raw HTML; chỉ cho phép định dạng văn bản Markdown chuẩn. | Frontend Lead |
| **RSK-SEC-03** | An Ninh Dữ Liệu | **Rò rỉ dữ liệu chéo giữa các tài khoản (IDOR Vulnerability)**: Người dùng A sửa đổi ID trong URL để đọc trộm cuộc trò chuyện của Người dùng B. | Medium | Critical | **HIGH** | P03 | Mọi câu lệnh truy vấn cơ sở dữ liệu đều bắt buộc kèm điều kiện `WHERE user_id = current_user.id`. | Viết bộ unit test an ninh tự động quét toàn bộ endpoint xem có bị hở quyền truy cập không trước khi release. | Backend Lead / QA Lead |
| **RSK-SEC-04** | Hạ Tầng | **Tấn công từ chối dịch vụ (DDoS / Resource Exhaustion)**: Kẻ tấn công mở hàng nghìn kết nối làm cạn kiệt CPU/RAM máy chủ Backend. | Medium | High | **HIGH** | P05, P06 | Cấu hình Nginx Ingress giới hạn tối đa 20 kết nối đồng thời/IP; giới hạn 10 r/s cho API và 30 r/s cho giao diện tĩnh. | Chặn trực tiếp địa chỉ IP độc hại tại tường lửa hệ điều hành (iptables/fail2ban) hoặc Cloudflare Ingress. | DevOps Lead |
| **RSK-OPS-01** | Vận Hành | **Tràn bộ nhớ do lịch sử hội thoại quá lớn (Context Window Bloat)**: Cuộc trò chuyện tích lũy hàng trăm tin nhắn làm quá tải bộ nhớ và vượt context window. | High | Medium | **HIGH** | P04 | Triển khai chiến lược trượt ngữ cảnh (Sliding Context Window): Chỉ gửi 10-20 tin nhắn gần nhất tới AI; phân trang lịch sử tại UI. | Tự động tóm tắt ngữ cảnh cũ (Summarization) hoặc cảnh báo người dùng mở cuộc trò chuyện mới khi quá dài. | Backend Dev |
| **RSK-OPS-02** | Dữ Liệu | **Mất mát dữ liệu cuộc trò chuyện do lỗi container database**: Container PostgreSQL bị crash hoặc mất volume lưu trữ. | Low | Critical | **HIGH** | P06 | Sử dụng Docker Named Volume bền vững (`postgres_data`); cấu hình kịch bản tự động sao lưu định kỳ (pg_dump daily). | Khôi phục cơ sở dữ liệu từ bản sao lưu gần nhất theo quy trình được chỉ định trong Runbook. | DevOps Engineer |

---

## 2. Kế Hoạch Giám Sát & Cập Nhật Rủi Ro Định Kỳ

1. **Rà soát định kỳ**: Sổ bộ rủi ro được cập nhật tại mỗi cột mốc Quality Gate (từ G1 đến G6).
2. **Kích hoạt cảnh báo**: Bất kỳ khi nào xuất hiện sự cố bảo mật lộ secret hoặc cạn kiệt ngân sách token, dự án lập tức dừng các công việc phát triển tính năng mới để tập trung khắc phục rủi ro.
3. **Quyền sở hữu**: Mọi rủi ro đều có một vai trò cụ thể chịu trách nhiệm giám sát và thực thi biện pháp phòng ngừa.

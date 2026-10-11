# THƯ MỤC SƠ ĐỒ QUY TRÌNH NGHIỆP VỤ TRỰC QUAN (BUSINESS PROCESS DIAGRAMS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Giới Thiệu Thư Mục Sơ Đồ

Thư mục `docs/03-business-process/diagrams/` chứa các sơ đồ trực quan hóa (Visual Diagrams) bằng cú pháp Mermaid cho các quy trình nghiệp vụ trọng tâm của hệ thống **AI-Chan Assistant**.

> [!IMPORTANT]
> **Nguyên Tắc Cốt Lõi**: Theo quy định chung của dự án, sơ đồ trực quan **không bao giờ là nguồn sự thật duy nhất** (Diagram is NOT the single source of truth). Nguồn sự thật canonical nằm tại [models/process/](file:///c:/Users/PC/Project/ai-chan/models/process/) và các tài liệu đặc tả chi tiết tại [docs/03-business-process/](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/). Các sơ đồ trong thư mục này đóng vai trò là các góc nhìn trực quan (Visual Views) hỗ trợ giao tiếp và kiểm tra luồng logic.

---

## 2. Danh Mục Các Sơ Đồ Quy Trình

| Tên File Sơ Đồ | Quy Trình Nghiệp Vụ | Dạng Sơ Đồ | Trọng Tâm Trực Quan |
| :--- | :--- | :--- | :--- |
| **[registration-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/registration-flow.md)** | `BP-AUTH-001 [PROC-001]` | Swimlane & Flowchart | Luồng đăng ký tài khoản, kiểm tra trùng lặp email và mã hóa băm mật khẩu bcrypt |
| **[login-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/login-flow.md)** | `BP-AUTH-002 [PROC-002]` | Swimlane & BPMN | Luồng xác thực đăng nhập, phát hành JWT và đóng gói vào HttpOnly Secure Cookie |
| **[logout-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/logout-flow.md)** | `BP-AUTH-003 [PROC-003]` | Flowchart | Luồng thu hồi Cookie phiên và dọn dẹp trạng thái trên Client |
| **[conversation-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/conversation-flow.md)** | `BP-CONV-001..004 [PROC-004..007]` | Flowchart & State | Vòng đời tạo mới, nạp lịch sử, đổi tên tự động và xóa cuộc trò chuyện |
| **[chat-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/chat-flow.md)** | `BP-CHAT-001 [PROC-008]` | Swimlane Sequence | Luồng gửi tin nhắn, mở kết nối Server-Sent Events (SSE) và render Markdown |
| **[ai-interaction-flow.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/ai-interaction-flow.md)** | `BP-AI-001 [PROC-009]` | BPMN / Branching | Cơ chế điều phối LLM, bắt lỗi và tự động kích hoạt Failover từ Gemini sang OpenAI |

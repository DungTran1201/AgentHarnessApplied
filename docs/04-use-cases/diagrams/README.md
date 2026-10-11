# THƯ MỤC SƠ ĐỒ CA SỬ DỤNG TRỰC QUAN (USE CASE DIAGRAMS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Giới Thiệu Thư Mục Sơ Đồ Ca Sử Dụng

Thư mục `docs/04-use-cases/diagrams/` lưu trữ các sơ đồ trực quan hóa (UML Use Case Diagrams / Mermaid Diagrams) cho toàn bộ hệ thống Ca sử dụng của **AI-Chan Assistant**.

> [!IMPORTANT]
> **Nguyên Tắc**: Sơ đồ trực quan đóng vai trò là các góc nhìn minh họa (Visual Views), không phải là nguồn sự thật duy nhất. Chi tiết nghiệp vụ chính thức được chuẩn hóa tại [use-case-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-catalog.md) và các tài liệu trong [specifications/](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/).

---

## 2. Danh Mục Các Sơ Đồ Ca Sử Dụng

| Tên File | Phân Hệ Mô Tả | Trọng Tâm Trực Quan |
| :--- | :--- | :--- |
| **[use-case-overview.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/diagrams/use-case-overview.md)** | Toàn bộ hệ thống | Bức tranh tổng quan toàn bộ 9 Ca sử dụng và mối liên kết với các Actor |
| **[authentication.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/diagrams/authentication.md)** | Phân hệ Xác thực | Ca sử dụng Đăng ký (`UC-AUTH-001`), Đăng nhập (`UC-AUTH-002`), Đăng xuất (`UC-AUTH-003`) |
| **[conversation.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/diagrams/conversation.md)** | Phân hệ Quản lý Hội thoại | Vòng đời cuộc trò chuyện: Tạo mới, Xem lịch sử, Đổi tên, Xóa cuộc trò chuyện |
| **[chat.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/diagrams/chat.md)** | Phân hệ Đàm thoại & AI | Luồng gửi tin nhắn (`UC-CHAT-001`), quan hệ `<<include>>` đổi tên và `<<extend>>` chọn model |

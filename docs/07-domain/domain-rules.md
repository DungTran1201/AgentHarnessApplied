# BẤT BIẾN NGHIỆP VỤ MIỀN (DOMAIN INVARIANTS & RULES)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOM-RULE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả các bất biến miền (Domain Invariants) — những điều kiện logic bắt buộc luôn luôn đúng trong mọi trạng thái của hệ thống |

---

## 1. Danh Mục Các Bất Biến Miền (Domain Invariants Catalog)

---

### INV-01: Bất Biến Cách Ly Sở Hữu Dữ Liệu (Ownership Invariant - BR-002)
- **Phát biểu**: Một đối tượng `Conversation` và toàn bộ các thực thể `Message` con của nó phải luôn luôn thuộc về duy nhất một đối tượng `User` hợp lệ.
- **Biểu thức logic**:
  $$\forall m \in \text{Conversation.messages}, \quad m.\text{conversation\_id} = \text{Conversation.id}$$
  $$\forall c \in \text{Conversations}, \quad c.\text{user\_id} = \text{User.id}$$
- **Cơ chế bảo toàn**: Mọi thao tác đọc, cập nhật hoặc xóa đều phải kiểm tra ràng buộc `c.user_id == current_user_id`. Nghiêm cấm gán lại quyền sở hữu cuộc trò chuyện cho tài khoản khác.

---

### INV-02: Bất Biến Giới Hạn Chiều Dài Tin Nhắn (Message Length Invariant - BR-003)
- **Phát biểu**: Một thực thể `Message` có `role = 'user'` không bao giờ được phép chứa chuỗi văn bản rỗng hoặc có độ dài vượt quá 4,000 ký tự.
- **Biểu thức logic**:
  $$1 \le \text{length}(\text{trim}(m.\text{content})) \le 4000$$
- **Cơ chế bảo toàn**: Được đóng gói trực tiếp vào hàm khởi tạo của Value Object `MessageContent`. Nếu vi phạm, nâng ngoại lệ nghiệp vụ ngay lập tức.

---

### INV-03: Bất Biến Đặt Tiêu Đề Hội Thoại Tự Động (Auto-Title Invariant - BR-004)
- **Phát biểu**: Khi một cuộc trò chuyện đang mang tiêu đề mặc định `"Cuộc trò chuyện mới"` tiếp nhận tin nhắn người dùng đầu tiên, tiêu đề của nó phải được cập nhật thành tối đa 30 ký tự đầu tiên của tin nhắn đó.
- **Biểu thức logic**:
  $$\text{if } c.\text{title} = \text{"Cuộc trò chuyện mới"} \implies c.\text{title} = \text{substring}(m_1.\text{content}, 1, 30)$$
- **Cơ chế bảo toàn**: Phương thức `auto_derive_title()` trên thực thể `Conversation`.

---

### INV-04: Bất Biến Bảo Mật Mật Khẩu (Password Hash Invariant - SEC-002)
- **Phát biểu**: Mật khẩu người dùng không bao giờ được phép tồn tại ở dạng văn bản thô (Plain-text) bên trong miền nghiệp vụ hay tầng lưu trữ.
- **Cơ chế bảo toàn**: Thuộc tính `hashed_password` bắt buộc phải là một instance của Value Object `HashedPassword` (đã qua thuật toán bcrypt).

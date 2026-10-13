# PHÂN TÍCH QUAN HỆ CA SỬ DỤNG (USE CASE RELATIONSHIPS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-REL-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân tích và giải trình chi tiết các mối quan hệ cấu trúc giữa các Ca sử dụng (`<<include>>`, `<<extend>>`, `Generalization`), tuân thủ nguyên tắc mô hình hóa chuẩn xác và chống lạm dụng quan hệ kỹ thuật |

---

## 1. Sơ Đồ Quan Hệ Ca Sử Dụng (Relationships Diagram)

```mermaid
flowchart TD
    subgraph UC_Chat_Domain ["Phân Hệ Đàm Thoại & Hội Thoại"]
        UC_SEND["UC-CHAT-001 [UC-008]<br/>Gửi Tin Nhắn & Tương Tác AI"]
        UC_MODEL["UC-CHAT-002 [UC-009]<br/>Lựa Chọn Mô Hình AI"]
        UC_RENAME["UC-CONV-003 [UC-006]<br/>Đổi Tên Cuộc Trò Chuyện"]
        UC_CREATE["UC-CONV-001 [UC-004]<br/>Khởi Tạo Cuộc Trò Chuyện"]
        UC_VIEW["UC-CONV-002 [UC-005]<br/>Xem Lịch Sử Hội Thoại"]
    end

    %% Extend Relationship
    UC_MODEL -.->|<<extend>><br/>Điểm mở rộng: Trước khi bấm gửi| UC_SEND
    
    %% Include Relationship
    UC_SEND -.->|<<include>><br/>Điều kiện: Tin nhắn đầu tiên (BR-004)| UC_RENAME

    %% Flow Precedence
    UC_CREATE ==>|Cung cấp ngữ cảnh conversation_id| UC_SEND
    UC_VIEW ==>|Tải lại phiên đàm thoại cũ| UC_SEND

    style UC_SEND fill:#dd6b20,stroke:#c05621,color:#fff
    style UC_MODEL fill:#edf2f7,stroke:#cbd5e0
    style UC_RENAME fill:#edf2f7,stroke:#cbd5e0
    style UC_CREATE fill:#38a169,stroke:#2f855a,color:#fff
    style UC_VIEW fill:#38a169,stroke:#2f855a,color:#fff
```

---

## 2. Chi Tiết Các Mối Quan Hệ Cấu Trúc

### 2.1 Quan Hệ Mở Rộng (`<<extend>>`)
- **Cặp Quan Hệ**: `UC-CHAT-002 [UC-009]` (Lựa Chọn Mô Hình AI) `<<extend>>` `UC-CHAT-001 [UC-008]` (Gửi Tin Nhắn & Tương Tác AI).
- **Điểm Mở Rộng (Extension Point)**: `BeforeMessageSubmission` (Trước khi bấm gửi tin nhắn trên giao diện khung chat).
- **Điều Kiện Kích Hoạt**: Người dùng mong muốn sử dụng một mô hình chuyên biệt (ví dụ: Google Gemini 1.5 Pro hoặc OpenAI) thay vì mô hình mặc định do hệ thống tự điều phối (`BR-005`).
- **Cơ Sở Logic (Rationale)**:
  - Hành vi chọn model không phải là bắt buộc đối với mọi lượt chat. Trong phần lớn các phiên, người dùng chỉ nhập câu hỏi và gửi trực tiếp.
  - Do đó, việc chọn model là một hành vi mở rộng có điều kiện, phù hợp hoàn hảo với định nghĩa của quan hệ `<<extend>>`.

---

### 2.2 Quan Hệ Bao Hàm (`<<include>>`)
- **Cặp Quan Hệ**: `UC-CHAT-001 [UC-008]` (Gửi Tin Nhắn) `<<include>>` `UC-CONV-003 [UC-006]` (Đổi Tên Cuộc Trò Chuyện).
- **Điều Kiện Bao Hàm**: Khi tin nhắn của người dùng là tin nhắn đầu tiên trong cuộc trò chuyện và tiêu đề hiện tại vẫn là tiêu đề mặc định (`"Cuộc trò chuyện mới"` theo `BR-004`).
- **Cơ Sở Logic (Rationale)**:
  - Hệ thống tự động thực thi quy trình đổi tên trích xuất 30 ký tự đầu của prompt làm tiêu đề mới (`BR-004`).
  - Hành vi này tái sử dụng logic cập nhật tiêu đề của `UC-CONV-003`, bảo đảm tính đồng nhất của dữ liệu.

---

## 3. Nguyên Tắc Chống Lạm Dụng Quan Hệ Kỹ Thuật (Anti-Overmodeling Principles)

Trong quá trình thiết kế, các quan hệ sau đây **bị bác bỏ dứt khoát** để bảo đảm tính chuẩn tắc của mô hình nghiệp vụ:

| Đề Xuất Quan Hệ Bị Bác Bỏ | Lý Do Bác Bỏ (Rejection Rationale) | Định Vị Đúng Trong Mô Hình |
| :--- | :--- | :--- |
| `UC-CHAT-001` `<<include>>` `Validate Message Length` | Kiểm tra độ dài văn bản (<= 4,000 ký tự - `BR-003`) là một bước kiểm tra nghiệp vụ nội bộ (Internal Step / Business Rule), không phải một mục tiêu độc lập của người dùng. | Bước 5 trong Main Success Scenario của `UC-CHAT-001`. |
| `UC-AUTH-002` `<<include>>` `Hash / Verify Password` | Băm và đối chiếu mật khẩu là thuật toán kỹ thuật tại Backend (`SEC-002`), không có giá trị nghiệp vụ độc lập đối với Actor. | Chi tiết triển khai kỹ thuật tại Phase 06. |
| `UC-CHAT-001` `<<extend>>` `Handle AI Failover` | Cơ chế chuyển vùng từ Gemini sang OpenAI (`BR-005`) là hành vi tự phục hồi ngầm (System Self-healing / Exception Flow), hoàn toàn trong suốt với người dùng. | Luồng ngoại lệ `EXC-AI-01 / EXC-AI-02` trong `UC-CHAT-001`. |
| `UC-AUTH-001` `<<include>>` `Check Email Duplicate` | Tra cứu trùng email là logic kiểm tra điều kiện dữ liệu (Decision Point). | Rẽ nhánh Alternative Flow `A1` của `UC-AUTH-001`. |

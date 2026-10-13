# 10. ĐÁNH GIÁ AN TOÀN & BẢO MẬT (APPLICATION SECURITY & RISK REVIEW)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-SEC-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Ranh Giới Tin Cậy & Mô Hình Đe Dọa (Trust Boundaries & Threat Model)

Hệ thống thiết lập 4 vùng ranh giới tin cậy (Trust Boundaries - TB):

```
[ UNTRUSTED ZONE ]                       [ SECURE INTERNAL BACKEND ]                   [ EXTERNAL PROVIDER ]
 ┌───────────────────────┐   TB-1         ┌───────────────────────────────┐   TB-3      ┌─────────────────────┐
 │ Client Browser (User) │ ════════════►  │ FastAPI Application Engine    │ ══════════► │ LLM Provider API    │
 │ - Next.js UI          │  (HTTP / JWT)  │ - Graph Validator             │ (HTTPS + Key│ - Google Gemini     │
 │ - Canvas Graph State  │                │ - Runtime Prompt Resolver     │  Server-side│ - OpenAI / Claude   │
 └───────────────────────┘                └──────────────┬────────────────┘             └─────────────────────┘
                                                         │ TB-2 (Internal Query)
                                                         ▼
                                          ┌───────────────────────────────┐
                                          │ SQLite Database (app.db)      │
                                          │ - system_prompts (Confidential│
                                          │ - projects (Encrypted/Param)  │
                                          └───────────────────────────────┘
```

1. **Ranh giới TB-1 (Client ↔ Backend):** Toàn bộ dữ liệu từ trình duyệt (tọa độ canvas, node JSON, edges, câu hỏi chat) đều thuộc vùng **KHÔNG TIN CẬY (UNTRUSTED)**. Backend bắt buộc phải thẩm định lại toàn bộ tính hợp lệ và quyền sở hữu.
2. **Ranh giới TB-2 (Backend ↔ SQLite CSDL):** Truy vấn nội bộ an toàn. Cưỡng chế câu lệnh tham số hóa (`?`) chống SQL Injection.
3. **Ranh giới TB-3 (Backend ↔ External LLM Provider):** Kết nối mã hóa HTTPS ra bên ngoài. API Key được giữ bí mật tuyệt đối trên server, không bao giờ lộ ra client.

---

## 2. Ma Trận Đánh Giá Rủi Ro & Biện Pháp Kiểm Soát (STRIDE & OWASP LLM)

| Mã Rủi Ro | Phân Loại Rủi Ro | Mô Tả Mối Đe Dọa Kỹ Thuật | Tác Động Tiềm Tàng | Biện Pháp Kiểm Soát Thiết Kế (Mitigation Controls) |
| :--- | :--- | :--- | :--- | :--- |
| **`RISK-SPN-01`** | **Tampering / IDOR** | Kẻ tấn công cố tình sửa payload `PUT /projects/{id}/graph`, chèn `prompt_id` thuộc về người dùng khác. | Truy cập và sử dụng trái phép System Prompt độc quyền của nạn nhân. | **Anti-IDOR Query Check:** Khi lưu graph và khi chat, Backend kiểm tra: `WHERE id = :prompt_id AND (user_id = :uid OR user_id = 'guest_user')`. Nếu vi phạm lập tức từ chối và trả lỗi 422/404. |
| **`RISK-SPN-02`** | **OWASP LLM01: Prompt Injection** | Người dùng chat gửi câu hỏi chứa chỉ dẫn phá hoại: *"Bỏ qua mọi luật trước đó..."* nhằm chiếm quyền điều khiển bot. | Mô hình bị chuyển hướng hành vi, vi phạm nguyên tắc bảo mật. | **Cơ chế phân tách Role tuyệt đối:** Chỉ dẫn hệ thống được nạp riêng vào `SystemMessage`. Câu hỏi của user bị đóng khung trong `HumanMessage`. Không ghép chuỗi thô. |
| **`RISK-SPN-03`** | **OWASP LLM02: Information Disclosure** | Server ghi log toàn bộ nội dung System Prompt hoặc câu hỏi nhạy cảm vào log file máy chủ. | Rò rỉ bí mật kinh doanh, prompt độc quyền hoặc thông tin riêng tư của người dùng vào log server. | **Privacy Logging Policy:** Nhật ký server chỉ ghi nhận `prompt_id`, `name`, `content_length` (số ký tự). Tuyệt đối cấm `logger.info(prompt.content)`. |
| **`RISK-SPN-04`** | **Denial of Service (DoS): Context Overflow** | Người dùng liên kết một System Prompt dài (10.000 ký tự) kết hợp câu hỏi lớn làm tràn `context_window` của LLM. | Provider từ chối request, phát sinh chi phí token cao hoặc crash luồng xử lý. | **Giới hạn kép:** Web Input giới hạn max 4.000 từ. System Prompt tối đa 10.000 ký tự. Runtime kiểm tra tổng dung lượng trước khi gửi sang adapter. |
| **`RISK-SPN-05`** | **XSS Injection** | Prompt chứa các đoạn mã độc `<script>` hoặc HTML nguy hiểm được render lên canvas hoặc thanh catalog. | Tấn công Cross-Site Scripting (XSS) trên trình duyệt người dùng. | **Safe React Text Rendering:** Không sử dụng `dangerouslySetInnerHTML`. Mọi chuỗi tên, mô tả và nội dung prompt đều được React escape tự động thành văn bản thuần. |
| **`RISK-SPN-06`** | **Silent Behavior Degradation** | Prompt liên kết bị xóa, runtime tự động âm thầm chat bằng prompt rỗng hoặc fallback bí mật. | Người dùng nhận câu trả lời không đúng chuẩn nghiệp vụ mà không hề hay biết sự cố. | **Fail-Closed Policy (DEC-SPN-04):** Chặn đứng request chat, trả mã lỗi HTTP `422 PROMPT_UNAVAILABLE` với thông báo cụ thể yêu cầu chọn lại prompt. |

---

## 3. Rà Soát Quyền Hạn & Chính Sách Khách Vãng Lai (Guest Policy)

- **Người dùng đăng nhập:** Toàn quyền truy cập và liên kết các System Prompt thuộc quyền sở hữu của `user_id` trong JWT token.
- **Khách vãng lai (`guest_user`):**
  - Được phép sử dụng các System Prompt mẫu mặc định của hệ thống (`sp_seed_python_expert`, `sp_seed_business_analyst`).
  - Được phép tạo prompt mới gắn với `user_id = 'guest_user'`.
  - Không được phép xem hoặc liên kết prompt của các tài khoản người dùng đăng nhập khác.

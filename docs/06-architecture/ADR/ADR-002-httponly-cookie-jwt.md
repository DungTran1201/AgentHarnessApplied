# ADR-002 — Cơ Chế Quản Lý Phiên Bằng HttpOnly Secure Cookie Cho JWT

Status: APPROVED

## Context
Xác thực phiên làm việc trong các ứng dụng Web thường đối mặt với nguy cơ đánh cắp token qua lỗ hổng Cross-Site Scripting (XSS) nếu token được lưu trữ tại `localStorage` hoặc `sessionStorage` của trình duyệt.

## Decision
Lưu trữ JWT Access Token trong Cookie có cấu hình nghiêm ngặt:
- `HttpOnly = True`: Mã JavaScript trên trình duyệt không thể đọc được giá trị Cookie.
- `Secure = True`: Chỉ truyền qua giao thức an toàn HTTPS (ngoại trừ môi trường dev localhost).
- `SameSite = Lax`: Chống tấn công Cross-Site Request Forgery (CSRF).
- `Max-Age = 604800` (7 ngày hiệu lực theo `NFR-006`).

## Alternatives
1. *Authorization: Bearer <Token> lưu trong localStorage*: Dễ bị script độc hại đánh cắp toàn bộ quyền truy cập tài khoản khi gặp lỗi XSS.
2. *Stateful Session trong CSDL / Redis*: Tốn chi phí tra cứu CSDL tại mỗi request; tăng tải hệ thống không cần thiết ở giai đoạn MVP.

## Rationale
- HttpOnly Cookie triệt tiêu nguy cơ đánh cắp token qua XSS (`SEC-004`).
- JWT mang thông tin định danh `user_id` giúp Backend giải mã không trạng thái (stateless) cực kỳ nhanh chóng.

## Consequences
- Cần cấu hình CORS chính xác với `allow_credentials = True` giữa Nginx, Frontend và Backend.
- Trình duyệt tự động đính kèm Cookie trong các cuộc gọi API và luồng SSE.

## Risks / Follow-up
- Thu hồi phiên trước thời hạn 7 ngày trên mọi thiết bị sẽ đòi hỏi blacklist Redis trong các phiên bản mở rộng sau.

## Related Requirements
`FR-002`, `FR-003`, `SEC-004`, `NFR-006`, `BR-001`.

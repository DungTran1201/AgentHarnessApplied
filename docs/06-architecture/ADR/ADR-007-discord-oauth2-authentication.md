# ADR-007 — Kiến Trúc Xác Thực & Tích Hợp Discord OAuth2 (Discord OAuth2 Authentication Architecture)

Status: APPROVED

## Context
Nhánh quản lý tài khoản người dùng hiện tại hỗ trợ đăng ký và đăng nhập bằng email và mật khẩu truyền thống. Nhằm nâng cao tỷ lệ chuyển đổi, giảm ma sát khi đăng ký tài khoản mới và phục vụ cộng đồng người dùng công nghệ, hệ thống cần bổ sung phương thức xác thực bằng tài khoản Discord. Thách thức đặt ra là phải đảm bảo tuyệt đối an toàn thông tin, chống tấn công Login CSRF, chống chiếm đoạt tài khoản (Account Takeover) khi tài khoản Discord chưa xác minh email, và giữ sự nhất quán hoàn hảo với hạ tầng phiên làm việc HttpOnly JWT Cookie hiện có (`ADR-002`).

## Decision
Áp dụng mô hình **Authorization Code Grant Flow (RFC 6749)** trực tiếp giữa Backend và máy chủ xác thực Discord:
1. **Khởi tạo ủy quyền (`GET /auth/discord/login`)**: Backend sinh mã `state` mật mã ngẫu nhiên được ký HMAC-SHA256 với secret của hệ thống kèm timestamp hết hạn trong 10 phút, lưu trữ tạm vào cookie bảo vệ (`BR-016`, `SEC-008`). Trình duyệt được chuyển hướng đến cổng xác thực Discord với quyền hạn tối thiểu: `scope=identify email`.
2. **Tiếp nhận phản hồi (`GET /auth/discord/callback`)**:
   - Backend thẩm định tính hợp lệ và thời hạn của tham số `state` (`BR-016`).
   - Backend thực hiện trao đổi authorization `code` lấy `access_token` trực tiếp với Discord API qua kênh máy chủ nội bộ (Server-to-Server HTTPS POST). Client không bao giờ nhìn thấy `client_secret` hay Discord access token.
3. **Liên kết định danh & Cấp phát tài khoản**:
   - Lấy thông tin hồ sơ người dùng từ Discord `@me`.
   - Nếu `discord_id` đã tồn tại trong CSDL: Tiến hành đăng nhập trực tiếp.
   - Nếu `discord_id` chưa tồn tại nhưng `email` trùng khớp: Chỉ thực hiện tự động liên kết tài khoản (`auto-link`) nếu `verified == true` từ Discord (`BR-017`).
   - Nếu tài khoản chưa từng tồn tại: Tạo mới bản ghi `User` với `hashed_password = NULL` (`BR-018`).
4. **Phát hành phiên làm việc**:
   - Backend tạo JWT Token chuẩn của hệ thống và ghi vào HttpOnly Secure Cookie với cờ `SameSite=Lax`, duy trì tính nhất quán 100% với phiên bản hiện tại (`ADR-002`, `SEC-004`).

## Alternatives
1. *Implicit Grant Flow (Client-side token extraction)*: Trình duyệt trực tiếp nhận token từ Discord và gửi về Backend. Phương án này đã bị cấm trong khuyến nghị OAuth 2.1 do tiềm ẩn nguy cơ rò rỉ token trên URL và script trình duyệt.
2. *Sử dụng thư viện trung gian NextAuth.js tại Frontend*: Đòi hỏi thiết lập layer server Node.js quản lý phiên song song, dẫn đến phân mảnh kiến trúc xác thực giữa FastAPI và Next.js.
3. *Buộc người dùng nhập mật khẩu sau khi kết nối Discord*: Làm mất đi ưu điểm đăng nhập 1 chạm của mạng xã hội, gây giảm trải nghiệm người dùng.

## Rationale
- Luồng Authorization Code đảm bảo `DISCORD_CLIENT_SECRET` hoàn toàn được cô lập ở Backend (`SEC-001`, `SEC-008`).
- Chữ ký HMAC trên tham số `state` loại bỏ hoàn toàn lỗ hổng Cross-Site Request Forgery mà không cần cơ chế session lưu trữ trạng thái cồng kềnh phía server.
- Sử dụng chung JWT Cookie đảm bảo toàn bộ các API trò chuyện (`/conversations`, `/chat`, `/models`) hoạt động bình thường mà không cần sửa đổi bất kỳ logic xác thực nào ở tầng downstream.

## Consequences
- Hệ thống cần cấu hình 3 biến môi trường mới: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`.
- Cấu trúc bảng `users` được mở rộng thêm 2 cột: `discord_id VARCHAR(50) UNIQUE` và `discord_username VARCHAR(100)`. Cột `hashed_password` được cho phép giá trị `NULL`.
- Backend cần kiểm tra `hashed_password IS NOT NULL` khi người dùng đăng nhập bằng form thường (`BR-018`).

## Risks / Follow-up
- Máy chủ Discord gặp sự cố gián đoạn hoặc quá tải có thể làm chậm quá trình callback (cần cấu hình timeout 10s cho các request HTTP gọi sang Discord API).
- Cần có cơ chế cho phép người dùng gỡ liên kết hoặc thiết lập mật khẩu bổ sung trong các phiên bản tương lai.

## Related Requirements
`FR-027`, `FR-028`, `BR-016`, `BR-017`, `BR-018`, `SEC-004`, `SEC-008`, `COMP-002`, `ADR-002`.

# Kế Hoạch Thiết Kế & Đặc Tả Kỹ Thuật (Design & Modeling Plan)
## Mã Công Việc: FEAT-002-user-profile-management

---

## 1. Mục Tiêu & Phạm Vi Công Việc (Scope & Objectives)
- **Nghiệp vụ cốt lõi**:
  1. Xem hồ sơ cá nhân & số liệu thống kê (Tin nhắn đã gửi, số đoạn chat, ngày tham gia).
  2. Cập nhật thông tin định danh: Họ và tên (`full_name`), Tên đăng nhập (`username`), Tiểu sử (`bio`), Số điện thoại (`phone_number`).
  3. Cập nhật ảnh đại diện (`avatar_url`).
  4. Thay đổi địa chỉ Email an toàn (`email`) với yêu cầu xác nhận mật khẩu hiện tại.
  5. Thay đổi Mật khẩu người dùng với cơ chế xác thực mật khẩu cũ, kiểm tra độ mạnh, băm bcrypt và thu hồi phiên cũ.
  6. Tùy biến trải nghiệm người dùng (`theme_preference`: DARK/LIGHT/SYSTEM, `language_preference`: vi/en).
- **Phạm vi loại trừ (Exclusions)**:
  - KHÔNG hỗ trợ người dùng tự vô hiệu hóa/xóa tài khoản (bảo toàn toàn vẹn dữ liệu).
  - KHÔNG tích hợp đăng nhập/liên kết tài khoản bên thứ 3 (Google/GitHub OAuth).
  - KHÔNG tích hợp cổng thanh toán hay gói đăng ký thành viên trả phí (Billing/Subscription).
- **Ràng buộc cứng (Hard Rule)**:
  - **CHỈ THỰC HIỆN ĐẶC TẢ TÀI LIỆU VÀ BIỂU ĐỒ (NO CODING)**.

---

## 2. Danh Mục Tài Liệu Cần Cập Nhật (`docs/`)
1. **Requirements (`docs/02-requirements/`)**:
   - `functional-requirements.md`: Thêm `FR-015` -> `FR-020`.
   - `business-rules.md`: Thêm `BR-007` -> `BR-011`.
   - `acceptance-criteria.md`: Thêm `AC-007-A` -> `AC-007-F`.
   - `requirement-traceability.md`: Bổ sung ma trận truy vết cho `FR-015` -> `FR-020`.
2. **Business Process (`docs/03-business-process/`)**:
   - `business-process-catalog.md`: Bổ sung `BP-USER-001` -> `BP-USER-002`.
3. **Use Cases (`docs/04-use-cases/`)**:
   - `use-case-catalog.md`: Thêm `UC-010` -> `UC-015`.
   - Thư mục `specifications/`: Tạo 6 file đặc tả ca sử dụng chi tiết (`UC-USER-001` -> `UC-USER-006`).
4. **Data & Domain Architecture (`docs/07-domain/` & `ai-backend/database/`)**:
   - `entities.md`: Mở rộng thực thể `User` với các trường mới: `username`, `avatar_url`, `bio`, `phone_number`, `theme_preference`, `language_preference`, `last_login_at`, `password_changed_at`.
   - Cập nhật DDL thiết kế trong `ai-backend/database/schema.sql` (bản thiết kế chuẩn).
5. **API Contract (`docs/08-api/`)**:
   - `api-specifications.md` & `openapi.yaml`: Thêm các endpoint nhóm `/api/v1/users/me/*`.
6. **Security & Control (`docs/10-security/`)**:
   - Bổ sung `SEC-006` (Xác thực lại danh tính cho tác vụ nhạy cảm), `SEC-007` (Chính sách luân chuyển mật khẩu & thu hồi JWT).
7. **UX & Interaction (`docs/11-ux/`)**:
   - Bổ sung đặc tả giao diện Trang Cài Đặt Tài Khoản (`/settings` hoặc `/profile`) với các tab: Hồ sơ, Bảo mật, Tùy chọn.

---

## 3. Danh Mục Biểu Đồ Cần Xây Dựng (`diagrams/`)
1. **BPMN**:
   - `diagrams/bpmn/user-profile-bpmn.md`: Quy trình nghiệp vụ cập nhật hồ sơ & tùy chọn giao diện.
   - `diagrams/bpmn/change-security-bpmn.md`: Quy trình nghiệp vụ đổi email và đổi mật khẩu kèm xác thực lại mật khẩu hiện tại.
2. **Swimlane**:
   - `diagrams/swimlane/user-management-swimlane.md`: Biểu đồ bơi đa làn Actor -> Web Client -> Gateway/Auth Service -> Database.
3. **Sequence**:
   - `diagrams/sequence/change-password-sequence.md`: Biểu đồ tuần tự đổi mật khẩu an toàn.
   - `diagrams/sequence/change-email-sequence.md`: Biểu đồ tuần tự đổi email an toàn.
   - `diagrams/sequence/update-profile-sequence.md`: Biểu đồ tuần tự cập nhật hồ sơ cá nhân.
4. **State**:
   - `diagrams/state/user-account-state.md`: Vòng đời trạng thái tài khoản người dùng (`ACTIVE`, `INACTIVE`, `SUSPENDED`).

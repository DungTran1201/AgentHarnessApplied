# Verification Plan — FEAT-004

## Acceptance Criteria
- [ ] Giao diện thể hiện rõ phong cách Anime Minimalism kết hợp Technical AI Workspace.
- [ ] Bảng màu chuẩn hóa: Background `#0E0F1B`, Surface `#171821`, Elevated Surface `#1F1B2B`, Primary `#A78BFA`.
- [ ] Chuyển đổi giữa Workspace Mode và Companion Mode hoạt động mượt mà, không làm mất cuộc trò chuyện, tin nhắn hoặc nội dung nhập.
- [ ] Mô hình 3D VRM được render thực sự với Three.js và `@pixiv/three-vrm`, có cử động thở nhẹ, chớp mắt tự nhiên.
- [ ] Animation phản hồi đúng trạng thái của AI: `thinking` khi đang chờ suy luận, `speaking` (cử động môi/khẩu hình) khi streaming token, `idle` khi kết thúc.
- [ ] Có trạng thái loading và fallback trực quan nếu WebGL hoặc file VRM gặp lỗi.
- [ ] Các chức năng hội thoại hiện có (tạo mới, đổi tên, xóa, streaming SSE, dừng stream, chọn model, chọn project) hoạt động chính xác.
- [ ] Bố cục đáp ứng tốt ở các kích thước desktop tiêu chuẩn.

## Test Levels
1. **Static Analysis & Type Safety**:
   - `npx tsc --noEmit` đạt 0 lỗi type error.
2. **Build Verification**:
   - `npm run build` biên dịch thành công production bundle không cảnh báo lỗi.
3. **Backend Regression Testing**:
   - Chạy 87 bài test backend đảm bảo không gây ảnh hưởng đến API logic.
4. **Interactive Verification**:
   - Kiểm tra trực quan qua browser subagent hoặc screenshot session.

## Negative / Error Cases
- Mô hình VRM không tồn tại hoặc lỗi mạng: Hiển thị placeholder/fallback banner mà không làm đơ giao diện chat.
- Người dùng chuyển mode liên tục: Không kích hoạt nhiều WebGL canvas hoặc tạo memory leak.

## Security Checks
- Không chứa API key hoặc thông tin nhạy cảm hardcode trong client code.
- File VRM chỉ tải từ nguồn nội bộ đáng tin cậy (`/models/ai-chan.vrm`) hoặc file cục bộ do người dùng chủ động chọn.

## Regression Scope
- Toàn bộ luồng đăng nhập, danh sách cuộc trò chuyện, streaming tin nhắn, quản lý model và prompt.

## Documentation / Model Synchronization
- Đồng bộ `models/requirements/requirements.yaml` (bổ sung FR-048 đến FR-053).
- Đồng bộ `docs/02-requirements/functional-requirements.md` và `docs/02-requirements/requirement-traceability.md`.
- Đồng bộ `docs/11-ux/vrm-companion-experience.md` và `diagrams/state/vrm-avatar-state.md`.

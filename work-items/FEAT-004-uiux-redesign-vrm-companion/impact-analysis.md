# Impact Analysis — FEAT-004

| Artifact | Impact | Reason | Action |
|---|---|---|---|
| Requirement | UPDATE | Thêm yêu cầu FR-048 đến FR-053 cho Dual-mode và VRM Companion | Cập nhật `functional-requirements.md` và `requirements.yaml` |
| Process | NONE | Luồng trao đổi tin nhắn và sinh phản hồi SSE không thay đổi nghiệp vụ | Giữ nguyên |
| Domain | NONE | Không thay đổi cấu trúc bảng CSDL hoặc entities backend | Giữ nguyên |
| Architecture | UPDATE | Bổ sung module 3D WebGL VRM Renderer và Dual-mode UI View State | Cập nhật kiến trúc client trong docs |
| API | NONE | Sử dụng lại toàn bộ API v1 hiện có (`/conversations`, `/models`, `/stream`) | Giữ nguyên |
| Sequence | NONE | Trình tự gọi API streaming SSE giữ nguyên | Giữ nguyên |
| State | UPDATE | Thêm máy trạng thái Animation của avatar 3D (`STATE-003`) | Tạo diagram `vrm-avatar-state.md` |
| Security | NONE | Không thay đổi cơ chế xác thực hoặc ủy quyền | Giữ nguyên |
| Test | UPDATE | Thêm kế hoạch kiểm thử frontend và tương thích 3D | Tạo `verification-plan.md` |
| Operations | NONE | Không thay đổi cấu hình hạ tầng deploy | Giữ nguyên |
| UX | UPDATE | Thay đổi toàn bộ design system, layout desktop, và tương tác VRM | Tạo `vrm-companion-experience.md` |

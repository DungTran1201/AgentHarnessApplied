# Impact Analysis — FEAT-005

| Artifact | Impact | Reason | Action |
|---|---|---|---|
| Requirement | UPDATE | Bổ sung FR-054 (Intelligent Idle Engine), FR-055 (Contextual Gesture Choreography), FR-056 (Non-Repetitive Variation Engine) | Cập nhật `functional-requirements.md` và `requirements.yaml` |
| Process | NONE | Luồng gọi API SSE chat không thay đổi giao thức | Giữ nguyên |
| Domain | NONE | Không thay đổi cơ sở dữ liệu backend | Giữ nguyên |
| Architecture | UPDATE | Bổ sung ADR-013 kiến trúc hệ thống hoạt họa hành vi VRM đa phân lớp | Tạo `ADR-013-vrm-behavioral-animation-system.md` |
| API | NONE | Backend API giữ nguyên | Giữ nguyên |
| Sequence | NONE | Trình tự gọi HTTP/SSE không đổi | Giữ nguyên |
| State | UPDATE | Cập nhật chi tiết máy trạng thái `STATE-003` và các kênh hoạt họa | Cập nhật `diagrams/state/vrm-avatar-state.md` |
| Security | NONE | Không có rủi ro bảo mật mới; không log dữ liệu nhạy cảm | Giữ nguyên |
| Test | UPDATE | Thêm bộ kiểm thử hành vi `vrmBehavior.test.ts` | Tạo file test và chạy qua node |
| Operations | NONE | Hạ tầng deploy không đổi | Giữ nguyên |
| UX | UPDATE | Cập nhật đặc tả trải nghiệm cử chỉ và hoạt họa | Cập nhật `docs/11-ux/vrm-companion-experience.md` |

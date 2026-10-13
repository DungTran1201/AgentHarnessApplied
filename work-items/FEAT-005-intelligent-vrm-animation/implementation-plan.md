# Implementation Plan — FEAT-005

> This file is a project work-item wrapper. The primary Antigravity planning artifact is created with `/plan`.

## Goal
Xây dựng hệ thống điều khiển hoạt họa và hành vi thông minh (Intelligent Behavioral Animation System) cho VRM 3D AI-Chan:
- Idle cử động tự nhiên liên tục (thở đa xương, chớp mắt ngẫu nhiên, vi chuyển động đầu/cổ, biến thiên điểm nhìn LookAt, chuyển trọng tâm cơ thể và các biến thể idle ngẫu nhiên có cooldown).
- Phân tích Intent của phản hồi AI (chào hỏi, giải thích, xác nhận, câu hỏi, ăn mừng, xin lỗi, vỗ về, cảnh báo, lỗi, trung tính) để biên đạo cử chỉ và nét mặt tương ứng.
- Động cơ biến thiên (Variation Engine) loại trừ lặp lại bằng lịch sử gần, cooldown và phạt lặp.
- Kiến trúc hòa trộn kênh phân lớp (Multi-channel Layer Blending) đảm bảo chuyển động mượt mà và không xung đột xương.

## Modules & Architecture
1. `behaviorTypes.ts`: Định nghĩa kiểu dữ liệu `CharacterIntent`, `CharacterAction`, `CharacterBehaviorPlan`, `VRMCapabilities`, `AnimationChannel`.
2. `vrmRuntimeAdapter.ts`: Adapter an toàn bọc lấy Three.js và VRM model, trích xuất danh sách xương khả dụng, hỗ trợ điều khiển xương và biểu cảm an toàn không ném exception.
3. `variationEngine.ts`: Quản lý lịch sử cử chỉ đã dùng gần đây, áp dụng cooldown, tính điểm phạt lặp lại và thuật toán chọn lọc có trọng số (hỗ trợ deterministic random seed để kiểm thử).
4. `idleBehaviorEngine.ts`: Động cơ cử động nhàn rỗi liên tục (thở lồng ngực/vai/hông, chớp mắt chu kỳ ngẫu nhiên, vi chuyển động đầu/cổ, trọng tâm chân và 5 hành động idle ngẫu nhiên: nghiêng đầu tò mò, gật nhẹ, nhìn quanh, thở sâu, chuyển thế).
5. `responseBehaviorPlanner.ts`: Bộ lập kế hoạch hành vi chuyển đổi văn bản câu trả lời thành Intent và danh mục cử chỉ hợp lệ, an toàn và chống injection.
6. `animationController.ts`: Bộ điều khiển phân kênh hòa trộn (Layer 0 Idle, Layer 1 Head/Gaze, Layer 2 Gestures, Layer 3 Expressions), fade-in và fade-out mượt mà, phục hồi tư thế nghỉ tự nhiên.
7. `vrmController.ts`: Nhạc trưởng tích hợp toàn bộ hệ sinh thái trên, giữ API tương thích với `VRMViewer.tsx` và cung cấp diagnostic object cho nhà phát triển.
8. `chat/page.tsx`: Cập nhật cầu nối gửi nội dung phản hồi cuối (`accumulatedText`) vào Planner khi hoàn tất sinh token để kích hoạt cử chỉ kết luận.

## Dependency Order
1. Tạo `behaviorTypes.ts`.
2. Xây dựng `vrmRuntimeAdapter.ts`.
3. Xây dựng `variationEngine.ts`.
4. Xây dựng `responseBehaviorPlanner.ts`.
5. Xây dựng `idleBehaviorEngine.ts`.
6. Xây dựng `animationController.ts`.
7. Cập nhật `vrmController.ts` và `VRMViewer.tsx`.
8. Tích hợp trong `chat/page.tsx`.
9. Viết bộ kiểm thử unit/integration và kiểm chứng.
10. Cập nhật tài liệu kỹ thuật, canonical models và state diagrams.

## Tests
- `npm run test` (hoặc `node --test`): Kiểm thử unit cho Intent classifier, Variation Engine, Cooldowns, Repeat penalties, Blending weights, Stale turn rejection.
- TypeScript: `npx tsc --noEmit` đạt 0 lỗi.
- Production build: `npm run build` đạt 0 lỗi.
- Backend regression test: 87/87 tests pass.
- Project validators: `python tools/validators/run_all.py` pass.

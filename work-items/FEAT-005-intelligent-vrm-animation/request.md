# Change Request — FEAT-005: AI-Chan VRM Companion Intelligent Animation

## User Request
Xây dựng hệ thống điều khiển hành vi và cử chỉ thông minh (Intelligent Behavioral Animation System) cho nhân vật VRM 3D AI-Chan:
1. Giải quyết hiện tượng nhân vật đứng im bất động sau khi nạp (idle đông cứng).
2. Xây dựng cử động Idle tự nhiên, phong phú (thở đa xương, chớp mắt ngẫu nhiên có biên độ, vi chuyển động đầu/cổ, biến thiên điểm nhìn LookAt, chuyển trọng tâm cơ thể và các biến thể idle ngẫu nhiên có cooldown).
3. Biên đạo cử chỉ theo ngữ cảnh phản hồi của AI (Contextual Response Choreography) phân tích theo Intent (chào hỏi, giải thích, xác nhận, câu hỏi, ăn mừng, xin lỗi, vỗ về, cảnh báo, lỗi, trung tính).
4. Ngăn chặn lặp lại cử chỉ (Non-Repetitive Animation Selection) với lịch sử hành động gần, cooldown, phạt lặp lại (repeat penalties) và lựa chọn có trọng số (weighted selection).
5. Phân tầng ưu tiên và hòa trộn hoạt họa (Multi-channel Animation Priority & Blending) giữ cho chuyển động mượt mà, không giật cục, không đè xương xung đột và phục hồi tự nhiên về tư thế nghỉ.

## Desired Outcome
- Nhân vật VRM sống động liên tục, phản ứng thông minh với câu trả lời của AI.
- Không phát sinh giật lag, không xung đột xương và dọn dẹp tài nguyên GPU sạch sẽ.
- Có bộ kiểm thử unit/integration tự động kiểm chứng thuật toán chọn cử chỉ và quy tắc chuyển trạng thái.

## Change Type
- Feature (3D Web Animation Architecture & Behavioral Engineering)

## Risk Tier
- R2 (Thay đổi engine hoạt họa 3D, bổ sung máy trạng thái và bộ xử lý hành vi)

## Scope
- Xây dựng module: `behaviorTypes.ts`, `vrmRuntimeAdapter.ts`, `variationEngine.ts`, `idleBehaviorEngine.ts`, `responseBehaviorPlanner.ts`, `animationController.ts`.
- Nâng cấp `vrmController.ts` và `VRMViewer.tsx`.
- Kết nối sự kiện vòng đời hội thoại từ `chat/page.tsx` sang `VRMController`.
- Viết bộ kiểm thử unit/integration.
- Cập nhật tài liệu kỹ thuật, requirements model và state diagram.

## Non-Goals
- Nhúng các tệp hoạt họa bên ngoài (BVH/FBX) có bản quyền không rõ ràng; ưu tiên hệ thống Humanoid Procedural Animation chuẩn toán học góc Euler/Quaternion kết hợp Blendshapes.
- Gọi thêm API LLM chỉ để phân loại cảm xúc (dùng bộ phân loại cục bộ tức thì deterministic, độ trễ 0ms, chi phí token 0).

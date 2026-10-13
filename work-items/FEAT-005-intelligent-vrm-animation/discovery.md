# Discovery — FEAT-005

## FACTS
1. Mô hình hiện tại `ai-frontend/public/models/ai-chan.vrm` là chuẩn VRM 0.x (VRoid format) với 54 xương Humanoid đầy đủ (`spine`, `chest`, `neck`, `head`, `shoulders`, `upperArms`, `lowerArms`, `hands`, ngón tay, chân) và 14 blendshapes cơ bản (`Neutral`, `A`, `I`, `U`, `E`, `O`, `Blink`, `Blink_L`, `Blink_R`, `Angry`, `Fun`, `Joy`, `Sorrow`, `Surprised`).
2. Tệp VRM không chứa animation clips dựng sẵn (`animations: 0`). Do đó, hoạt họa dựa trên động học xương Procedural Humanoid kết hợp quản lý biểu cảm Blendshape của `@pixiv/three-vrm`.
3. Vòng đời hội thoại hiện tại trong `chat/page.tsx` bao gồm:
   - Request bắt đầu (`setAvatarState('thinking')`).
   - SSE chunks truyền về (`setAvatarState('speaking')`).
   - Hoàn thành nhận token (`event: done` -> `setAvatarState('success')` -> timeout về `'idle'`).
   - Báo lỗi (`event: error` -> `setAvatarState('error')` -> timeout về `'idle'`).
   - Dừng khẩn cấp (`handleStopGeneration` -> `abortController.abort()` -> `setAvatarState('idle')`).
4. Trước đây, `vrmController.ts` chỉ có một nhịp thở đơn trục trên xương `chest` và chớp mắt đơn giản, chưa có cơ chế điều phối cử chỉ cơ thể, phản ứng theo intent văn bản hay chống lặp lại.

## ASSUMPTIONS
1. Người dùng mong muốn nhân vật có các chuyển động sống động tự nhiên liên tục (idle micro-movements, head tilts, occasional look around, weight shift).
2. Khi câu trả lời AI hoàn thành hoặc bắt đầu, nhân vật cần thực hiện cử chỉ phù hợp ngữ nghĩa (chào hỏi vẫy tay nhẹ, giải thích đưa tay mở, gật đầu khẳng định, vui mừng cười tươi, cúi đầu tạ lỗi).
3. Người dùng không muốn thấy một cử chỉ lặp lại liên tục sau mỗi câu trả lời.

## OPEN QUESTIONS
- Không có câu hỏi chặn. Hệ thống hoàn toàn có thể chạy cục bộ độc lập với độ phản hồi tức thời.

## CONSTRAINTS
- Tuân thủ quy tắc lazy senior dev (Ponytail): Không cài đặt thư viện thừa; sử dụng toán học Euler/Quaternion với lerp của Three.js có sẵn.
- Tránh gọi thêm API LLM để phân loại intent; sử dụng deterministic regex/keyword parser siêu tốc độ với fallback an toàn về `neutral`.
- Tách biệt các kênh chuyển động (Layers/Channels): Channel 0 (Idle base), Channel 1 (Head/Gaze), Channel 2 (Arm/Body Gestures), Channel 3 (Facial Blendshapes/Lip-sync).
- Hỗ trợ `prefers-reduced-motion` và dọn dẹp WebGL an toàn.

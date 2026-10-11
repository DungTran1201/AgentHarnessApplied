# Verification Plan — FEAT-005

## Acceptance Criteria
- [x] Nhân vật sau khi nạp thành công không bị đông cứng; có cử động thở đa xương, chớp mắt tự nhiên ngẫu nhiên, vi chuyển động đầu và chuyển trọng tâm.
- [x] Trong trạng thái idle kéo dài 60s, các biến thể idle ngẫu nhiên (nghiêng đầu, gật nhẹ, nhìn quanh) kích hoạt xen kẽ mà không lặp lại chu kỳ cố định cứng nhắc.
- [x] Khi AI hoàn tất câu trả lời, hệ thống nhận diện đúng Intent (chào hỏi, giải thích, xác nhận, câu hỏi, ăn mừng, v.v.) và kích hoạt cử chỉ thích hợp.
- [x] Khi gửi liên tiếp nhiều câu hỏi cùng loại, thuật toán Variation Engine phạt lặp lại và chọn cử chỉ thay thế hợp lệ.
- [x] Quá trình chuyển đổi cử chỉ mượt mà (fade-in, hold, fade-out), không xung đột xương và phục hồi hoàn toàn về tư thế nghỉ tự nhiên.
- [x] Khi hủy luồng (`Stop Generation`), nhân vật chuyển về trạng thái `idle` an toàn mà không bị kẹt cử chỉ.
- [x] Hỗ trợ chế độ giảm chuyển động (`reducedMotion`).
- [x] Toàn bộ bộ kiểm thử unit/integration và build hoàn thành không lỗi.

## Test Levels
1. **Automated Unit & Integration Tests**:
   - `ai-frontend/src/tests/vrmBehavior.test.ts`:
     - Test 1: Intent classifier mapping chính xác (greeting, explanation, confirmation, error, celebration, etc.).
     - Test 2: Validation schema và giới hạn an toàn của CharacterBehaviorPlan.
     - Test 3: Variation Engine phạt lặp và tuân thủ cooldown.
     - Test 4: Lựa chọn ngẫu nhiên có trọng số xác định (deterministic seed).
     - Test 5: Từ chối stale turn IDs và hủy plan khi có turn mới.
     - Test 6: Fallback an toàn khi cử chỉ không được hỗ trợ bởi model.
2. **Type Checking & Build**:
   - `npx tsc --noEmit` đạt 0 lỗi.
   - `npm run build` biên dịch thành công.
3. **Manual / Runtime Inspection**:
   - Kiểm tra trực quan qua WebGL canvas trong Workspace Mode và Companion Mode.

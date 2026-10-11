# Bản Ghi Quyết Định Kiến Trúc (Architectural Decision Record)
## ADR-013: Hệ Thống Hoạt Họa Hành Vi Thông Minh, Nghỉ Tự Nhiên, Cử Chỉ Ngữ Cảnh & Động Cơ Chống Lặp Cho Trợ Lý 3D VRM

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Quyết Định** | `ADR-013` |
| **Tiêu Đề** | Intelligent VRM Behavioral Animation, Idle Engine, Contextual Gestures & Variation Selection Architecture |
| **Trạng Thái** | **APPROVED** |
| **Ngày Phê Duyệt** | 2026-10-11 |
| **Tác Giả** | Senior Frontend Engineer, 3D Runtime Engineer & Software Architect |
| **Phạm Vi Kỹ Thuật** | 3D WebGL Runtime, Three.js VRM Humanoid Math, Multi-channel Bone Blending, Deterministic Intent Parsing, Anti-repetition Variation Engine |
| **Truy Vết Yêu Cầu** | `FR-054`, `FR-055`, `FR-056`, `BR-035`, `UX-012`, `TC-044`, `CR-010` |

---

## 1. Ngữ Cảnh & Vấn Đề Đặt Ra (Context & Problem Statement)

Ứng dụng AI-Chan đã tích hợp mô hình 3D VRM (`ai-chan.vrm`) thông qua Three.js và `@pixiv/three-vrm`. Tuy nhiên, nhân vật gặp phải 5 vấn đề trải nghiệm người dùng:
1. **Bất động khi rảnh rỗi (Motionless Idle)**: Sau khi nạp mô hình, nhân vật gần như đứng yên như tượng gỗ, thiếu sức sống tự nhiên.
2. **Không có hành vi nghỉ tự nhiên (Lack of Natural Idle Behaviors)**: Thiếu nhịp thở sinh học, chớp mắt đơn điệu, đầu bất động, và tư thế tay bị cứng.
3. **Phản hồi vô cảm (Lack of Contextual Response Choreography)**: Khi AI hoàn tất câu trả lời (giải thích, xin lỗi, chúc mừng, cảnh báo), nhân vật không thể hiện cử chỉ hay biểu cảm ngữ cảnh tương ứng.
4. **Cử chỉ lặp lại đơn điệu (Repetitive Response Animation)**: Nếu dùng thuật toán ngẫu nhiên đơn giản, các cử chỉ bị lặp lại liên tục gây cảm giác giả tạo.
5. **Xung đột khớp xương & ngắt quãng luồng hội thoại (Bone Conflicts & Flow Interruptions)**: Việc can thiệp trực tiếp vào Transform xương mà không phân lớp (channel separation) hoặc kích hoạt cử chỉ lớn trên từng token streaming gây giật khung hình và lỗi pose.

---

## 2. Các Quyết Định Kiến Trúc Then Chốt (Key Architectural Decisions)

### 2.1 Kiến Trúc Phân Lớp Kênh Hoạt Họa Độc Lập (Multi-Channel Layer Separation - `BR-035`)

Hệ thống thiết kế 4 phân lớp hoạt họa composable độc lập, ngăn chặn hoàn toàn việc các chuyển động đè chồng lên cùng một nhóm xương:

```
+-------------------------------------------------------------------+
| Layer 3: Biểu Cảm Khuôn Mặt (Blendshapes: Happy, Relaxed, Speech)   |
+-------------------------------------------------------------------+
| Layer 2: Cử Chỉ Ngữ Cảnh Tạm Thời (Upper Arm, Lower Arm, Hand)     |
+-------------------------------------------------------------------+
| Layer 1: Hướng Đầu & Ánh Mắt (LookAt + Neck/Head Micro-Tilts)     |
+-------------------------------------------------------------------+
| Layer 0: Hoạt Họa Nghỉ Cơ Bản (Breathing, Sway, Resting Arm Pose)  |
+-------------------------------------------------------------------+
```

- **Layer 0 (Base Idle)**: Do `IdleBehaviorEngine` quản lý. Chu kỳ thở đa khớp trên `chest`, `spine`, `shoulders` (3.7s/chu kỳ), đu đưa trọng tâm (`hips`), và tư thế tay nghỉ tự nhiên (`leftUpperArm.z = -1.22`, `rightUpperArm.z = 1.22`).
- **Layer 1 (Head & Gaze)**: Kết hợp LookAt theo vị trí camera với vi dao động góc ngẫu nhiên (yaw, pitch, roll < 0.08 rad) và gaze drift hình nón (30% trôi nhẹ, 70% quay về camera).
- **Layer 2 (Contextual Gestures)**: Do `AnimationController` điều phối. Chỉ can thiệp vào các khớp xương được chỉ định (tay hoặc cổ) với phong bì trọng số: Blend-in (300ms) -> Hold -> Blend-out (400ms) trả về tư thế nghỉ. Khi Layer 2 chiếm quyền điều khiển cánh tay, Layer 0 tự động nhường quyền không ghi đè lên xương tay.
- **Layer 3 (Facial Expressions)**: Quản lý blendshape additive: biểu cảm cảm xúc cơ bản của trạng thái (`happy`, `relaxed`, `neutral`), chớp mắt ngẫu nhiên (chu kỳ 2.8 - 5.5s), và khẩu hình môi (`aa`, `ih`) khi `speaking`.

### 2.2 Bộ Phân Loại Ý Định Cục Bộ Zero-Cost, Zero-Latency (`ResponseBehaviorPlanner`)

Thay vì gọi thêm một LLM API tốn chi phí và tăng độ trễ (latency penalty 500-1500ms), hệ thống hiện thực bộ phân loại nội tại cục bộ (`classifyIntent`):
- Hỗ trợ đa ngôn ngữ (Tiếng Việt và Tiếng Anh).
- Ánh xạ văn bản phản hồi thành 10 phạm trù ngữ nghĩa: `greeting`, `explanation`, `confirmation`, `question`, `celebration`, `apology`, `comfort`, `warning`, `error`, `neutral`.
- Mỗi ý định liên kết với danh mục hành động cử chỉ ứng viên (`INTENT_ACTION_CATALOG`), cảm xúc khuôn mặt và hướng ánh mắt.

### 2.3 Động Cơ Biến Thiên Chống Lặp (`VariationEngine`)

Để loại bỏ hoàn toàn tính lặp lại đơn điệu:
1. **Lịch sử hành động gần nhất (History Window)**: Lưu vết tối đa 5 hành động vừa kích hoạt.
2. **Hệ số phạt lặp (Repeat Penalty)**: Hành động vừa thực hiện ở lượt trước lập tức bị chiết khấu trọng số xuống `0.15x`; các hành động khác trong cửa sổ lịch sử nhận hệ số `0.3x`.
3. **Hồi chiêu theo hành động (Per-action Cooldown)**: Thời gian hồi chiêu mặc định 8.000ms. Trong thời gian hồi chiêu, hành động bị giảm trọng số xuống `0.05x`.
4. **Kiểm tra năng lực mô hình (Capability Verification)**: Sàng lọc trước danh sách xương (`availableBones`) và biểu cảm (`availableExpressions`) trước khi đưa vào tập ứng viên.
5. **Lấy mẫu theo trọng số & Hỗ trợ PRNG Seed**: Sử dụng thuật toán Mulberry32 PRNG khi cấu hình seed kiểm thử, đảm bảo kết quả unit test tái lập 100%.

### 2.4 Chính Sách Kích Hoạt Vòng Đời Đàm Thoại (Lifecycle Trigger Policy)

- **Khi bắt đầu request**: Avatar chuyển sang `thinking` (nghiêng đầu nhẹ, biểu cảm suy tư).
- **Khi nhận SSE stream tokens**: Avatar chuyển sang `speaking` (miệng mở đóng `aa`/`ih` theo tần số điều hòa tự nhiên). Tuyệt đối **không** kích hoạt cử chỉ tay lớn trên từng token để tránh giật hình.
- **Khi nhận `event: done` hoặc kết thúc stream**: Kích hoạt `handleAIResponseComplete(turnId, accumulatedText)` một lần duy nhất. Kế hoạch hành vi được thực thi mượt mà và kết thúc bằng trạng thái `success`, sau đó êm dịu trở về `idle`.
- **Khi người dùng dừng sinh hoặc lỗi**: Kích hoạt `handleStopGeneration()` hoặc chuyển `error`, hủy bỏ kế hoạch đang chạy và êm ái trở về trạng thái nghỉ.

### 2.5 Hỗ Trợ Trợ Năng Giảm Chuyển Động (Reduced-Motion Accessibility)

Hệ thống tự động lắng nghe media query `prefers-reduced-motion: reduce`:
- Khi kích hoạt, cường độ hoạt họa nghỉ (`idleIntensity`) tự động giảm xuống 30%.
- Tắt toàn bộ cử chỉ tay biên độ lớn, chỉ giữ lại các phản hồi tinh tế như gật đầu nhẹ (`small_nod`) hoặc biểu cảm nhẹ nhàng.

---

## 3. Hệ Quả & Đánh Giá (Consequences & Trade-offs)

### Điểm Tích Cực (Positive)
- **Zero Extra API Call**: Không phát sinh chi phí hay độ trễ LLM cho việc phân tích cử chỉ.
- **Hoạt họa tự nhiên liên tục**: Loại bỏ hoàn toàn cảm giác tượng sáp bất động của avatar VRM.
- **Khả năng tương thích asset**: Hoạt động hoàn hảo trên các tệp VRM tiêu chuẩn (vốn có 0 baked animation clips) nhờ toán học xương người Three.js Euler/Quaternion.
- **Bảo toàn hiệu năng WebGL**: Tận dụng trực tiếp vòng lặp Render `requestAnimationFrame`, không tạo timer JavaScript độc lập tần số cao, tránh re-render React thừa.

### Điểm Lưu Ý & Hạn Chế (Trade-offs & Mitigations)
- **Mô hình phụ thuộc vào Humanoid Rig chuẩn**: Nếu tệp VRM thiếu xương cánh tay hoặc biểu cảm, `VRMRuntimeAdapter` sẽ phát hiện và `VariationEngine` tự động fallback về cử chỉ đầu hoặc tư thế trung tính an toàn.

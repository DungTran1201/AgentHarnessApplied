# Biểu Đồ Trạng Thái Hoạt Họa 3D VRM Avatar (STATE-003)

## 1. Định Danh & Mô Tả
- **Mã Trạng Thái**: `STATE-003`
- **Tên Phân Hệ**: VRM Companion Animation & Behavioral Choreography Lifecycle
- **Yêu Cầu Truy Vết**: `FR-049`, `FR-050`, `FR-053`, `FR-054`, `FR-055`, `FR-056`, `BR-035`

---

## 2. Biểu Đồ Trạng Thái (Mermaid State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Loading: Nạp mô hình /models/ai-chan.vrm
    Loading --> Idle: WebGL & VRM nạp thành công

    state Idle {
        [*] --> BaseBreathing: Chu kỳ thở đa khớp (chest, spine, shoulders)
        BaseBreathing --> RandomBlinking: Hẹn giờ ngẫu nhiên (2.8s - 5.5s)
        RandomBlinking --> BaseBreathing: Chớp mắt hoàn thành (150ms)
        BaseBreathing --> IdleVariation: Cooldown biến thiên idle hết hạn
        IdleVariation --> BaseBreathing: Hoàn tất nghiêng đầu/hít sâu/chuyển trọng tâm
    }

    Idle --> Listening: Người dùng focus vào ô nhập tin nhắn
    Listening --> Thinking: Người dùng gửi Prompt (Enter/Send)
    
    state Thinking {
        [*] --> UpwardGaze: Đầu hơi nghiêng và nhìn hướng lên
        UpwardGaze --> ContemplativePose: Blendshape relaxed (0.5)
    }

    Thinking --> Speaking: Nhận token stream SSE đầu tiên
    
    state Speaking {
        [*] --> SpeechCadence: Dao động khẩu hình môi (aa, ih)
        SpeechCadence --> SubtleSmile: Mỉm cười tích cực nhẹ (happy: 0.3)
    }

    Speaking --> ContextualResponse: Nhận tín hiệu kết thúc luồng (event: done)
    
    state ContextualResponse {
        [*] --> IntentClassification: Phân loại ý định cục bộ (greeting, explanation, ...)
        IntentClassification --> VariationFilter: Sàng lọc cooldown, lịch sử & trọng số
        VariationFilter --> GestureExecution: Blend-in (300ms) -> Hold -> Blend-out (400ms)
        GestureExecution --> NaturalRestPose: Trả về tư thế tay nghỉ tự nhiên
    }

    ContextualResponse --> Success: Hoàn tất cử chỉ phản hồi ngữ cảnh
    Success --> Idle: Hết thời gian giữ trạng thái thành công (2.5s)

    Thinking --> Error: Lỗi kết nối / Quota limit / Network drop
    Speaking --> Error: Lỗi stream gián đoạn giữa chừng
    Error --> Idle: Hết thời gian hiển thị cảnh báo (3.0s)

    Thinking --> Cancelled: Người dùng bấm 'Dừng sinh' (Stop Generation)
    Speaking --> Cancelled: Người dùng hủy request
    Cancelled --> Idle: Hồi phục về trạng thái nghỉ an toàn (1.5s)
```

---

## 3. Bảng Chuyển Trạng Thái (State Transition Table)

| Trạng Thái Hiện Tại | Sự Kiện Kích Hoạt | Trạng Thái Đích | Hành Vi Mô Hình 3D (Blendshapes, Bones & Choreography) |
| :--- | :--- | :--- | :--- |
| `loading` | Nạp file `.vrm` qua WebGL | `idle` | Khởi tạo Humanoid rig, áp dụng Resting Arm Pose (`z = ±1.22`). |
| `idle` | Chu kỳ thời gian rảnh | `idle` | Thở đa khớp (`chest`, `spine`), chớp mắt ngẫu nhiên (`blink`), biến thiên idle (`curious_tilt`, `deep_breath`). |
| `idle` | Người dùng focus soạn thảo | `listening` | Đầu và ánh mắt hướng về phía camera (`lookAt`), biểu cảm chú ý nhẹ (`neutral`: 0.6, `relaxed`: 0.35). |
| `listening` | Nhấn gửi prompt | `thinking` | Chuyển điểm nhìn lên trên, đầu hơi nghiêng (`head.z += 0.06`), biểu cảm thư thái (`relaxed`: 0.5). |
| `thinking` | Nhận token stream SSE | `speaking` | Khẩu hình môi mở/đóng liên tục (`aa`, `ih`), nụ cười nhẹ (`happy`: 0.3). Không kích hoạt cử chỉ tay lớn. |
| `speaking` | Nhận `event: done` | `success` | Phân loại ý định, chọn cử chỉ không lặp, blend-in cử chỉ (300ms), giữ, blend-out (400ms) trả về Resting Pose. |
| `thinking`/`speaking` | Người dùng nhấn Dừng | `cancelled` | Hủy cử chỉ đang diễn ra ngay lập tức, trả về biểu cảm trung tính (`neutral`: 0.9), phục hồi idle sau 1.5s. |
| `thinking`/`speaking` | Lỗi API / Network | `error` | Biểu cảm lo âu/bất ngờ (`sad`: 0.6, `surprised`: 0.3), đầu hơi cúi, duy trì 3.0s trước khi về idle. |
| `success`/`error`/`cancelled` | Timeout hoàn tất | `idle` | Trở về tư thế nghỉ tự nhiên và biểu cảm trung tính (`neutral`: 0.8). |

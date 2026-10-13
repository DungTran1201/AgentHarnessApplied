# Lưu Đồ Thuật Toán Lựa Chọn Hành Động & Chống Lặp Cử Chỉ VRM

## 1. Định Danh & Mô Tả
- **Mã Sơ Đồ**: `DIAG-ACT-VAR-001`
- **Tên Phân Hệ**: VRM Non-Repetitive Action Variation Engine
- **Yêu Cầu Truy Vết**: `FR-055`, `FR-056`, `ADR-013`

---

## 2. Lưu Đồ Lựa Chọn Hành Động (Mermaid Flowchart)

```mermaid
flowchart TD
    Start([Nhận Phản Hồi Hoàn Tất Từ AI]) --> Classify[Phân Loại Ý Định Cục Bộ: classifyIntent]
    Classify --> GetCandidates[Truy Xuất Tập Ứng Viên Từ INTENT_ACTION_CATALOG]

    GetCandidates --> CapCheck{Mô Hình Có Đủ Xương & Biểu Cảm Yêu Cầu?}
    CapCheck -- Không --> FilterOut[Loại Bỏ Ứng Viên Không Tương Thích]
    CapCheck -- Có --> CheckEligiblePool

    FilterOut --> CheckEligiblePool{Tập Ứng Viên Còn Lại > 0?}
    CheckEligiblePool -- Không --> FallbackNeutral[Fallback Về Ứng Viên Mặc Định An Toàn]
    CheckEligiblePool -- Còn 1 --> SelectSingle[Chọn Trực Tiếp Ứng Viên Duy Nhất]
    CheckEligiblePool -- > 1 --> WeightLoop[Tính Trọng Số Hiệu Dụng: calculateEffectiveWeight]

    WeightLoop --> CooldownCheck{Hành Động Có Đang Trong Cooldown 8s?}
    CooldownCheck -- Có --> ApplyCooldownDiscount[Nhân Hệ Số Phạt Cooldown: 0.05x]
    CooldownCheck -- Không --> HistoryCheck

    ApplyCooldownDiscount --> HistoryCheck{Hành Động Có Trong Lịch Sử 5 Lần Gần Nhất?}
    HistoryCheck -- Là Hành Động Vừa Chạy Lần Trước --> ImmediatePenalty[Nhân Hệ Số Phạt Lặp Liền Kề: 0.15x]
    HistoryCheck -- Xuất Hiện Ở Các Lần Khác --> WindowPenalty[Nhân Hệ Số Phạt Cửa Sổ: 0.3x]
    HistoryCheck -- Chưa Từng Chạy Gần Đây --> KeepWeight[Giữ Nguyên Trọng Số Cơ Bản]

    ImmediatePenalty --> AggregateWeights[Tổng Hợp Trọng Số Vào weightedPool]
    WindowPenalty --> AggregateWeights
    KeepWeight --> AggregateWeights

    AggregateWeights --> SeededPRNG[Lấy Mẫu Ngẫu Nhiên Theo Trọng Số: Mulberry32 / Math.random]
    SeededPRNG --> SelectAction[Chọn Hành Động Có Trọng Số Thỏa Mãn]

    SelectAction --> RecordHistory[Ghi Nhận Vào Lịch Sử & Kích Hoạt Cooldown 8s]
    FallbackNeutral --> RecordHistory
    SelectSingle --> RecordHistory

    RecordHistory --> BuildPlan[Tạo CharacterBehaviorPlan Kèm Cảm Xúc & Ánh Mắt]
    BuildPlan --> ExecuteAnim[AnimationController: Blend-In 300ms -> Hold -> Blend-Out 400ms]
    ExecuteAnim --> End([Kết Thúc & Trả Về Tư Thế Nghỉ])
```

---

## 3. Quy Tắc & Tham Số Cốt Lõi (Core Parameters)

| Tham Số | Giá Trị Mặc Định | Mục Đích |
| :--- | :--- | :--- |
| `historySize` | 5 | Kích thước bộ đệm lịch sử theo dõi các cử chỉ vừa kích hoạt. |
| `repeatCooldownMs` | 8.000 ms | Thời gian hồi chiêu tối thiểu trước khi một hành động được coi là sẵn sàng 100%. |
| `repeatPenaltyFactor` | 0.30 | Hệ số chiết khấu trọng số khi hành động nằm trong cửa sổ lịch sử. |
| `immediatePredecessorFactor`| 0.15 | Hệ số chiết khấu bổ sung cho hành động vừa thực thi ở ngay lượt trước. |
| `cooldownPenaltyFactor` | 0.05 | Hệ số ép giảm trọng số nếu hành động vẫn đang trong thời gian hồi chiêu. |
| `blendInMs` | 300 ms | Thời gian làm mềm mở đầu cử chỉ (smooth sine easing). |
| `blendOutMs` | 400 ms | Thời gian làm mềm kết thúc cử chỉ trả về tư thế nghỉ tự nhiên. |

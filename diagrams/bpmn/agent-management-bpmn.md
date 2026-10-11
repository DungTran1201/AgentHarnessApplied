# Sơ Đồ BPMN: Quy Trình Quản Lý Vòng Đời & Kích Hoạt Mô Hình Agent (Agent Model Management BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-007` |
| **Quy Trình Nghiệp Vụ** | `BP-AGENT-001 [PROC-013]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-021`..`FR-026`), [docs/02-requirements/business-rules.md](file:///c:/Users/sv/Desktop/ai-chan/ai-chan/docs/02-requirements/business-rules.md) (`BR-012`..`BR-015`) |
| **Mục Đích** | Mô tả quy trình xử lý đa nhánh nghiệp vụ: Kiểm tra kết nối (Ping), Kích hoạt (Activate), Hủy kích hoạt an toàn không xóa cứng (Deactivate - Soft Toggle) và Thiết lập mô hình mặc định (Set Default) |

---

## 1. Biểu Đồ BPMN Quy Trình Quản Lý Vòng Đời Agent Model (PROC-013)

```mermaid
flowchart TD
    Start((Bắt Đầu: Người dùng truy cập Quản lý Model)) --> ActionBranch{Người dùng chọn thao tác?}

    %% Nhánh 1: Kiểm Tra Kết Nối (Ping)
    ActionBranch -- Kiểm tra kết nối (Ping) --> CheckEnvKey{Kiểm tra API Key trong .env?}
    CheckEnvKey -- Thiếu Key trong .env --> ErrMissingKey[Báo lỗi 400: Chưa cấu hình API Key trong file .env]
    ErrMissingKey --> EndFail((Kết thúc: Thất bại))

    CheckEnvKey -- Có Key hợp lệ --> SendPing[Gửi prompt kiểm tra nhẹ tới nhà cung cấp qua LangChain]
    SendPing --> CheckPingResult{Kết nối thành công?}
    CheckPingResult -- Thất bại (Lỗi 401/429/Timeout) --> ShowPingFail[Hiển thị trạng thái lỗi kết nối & log chi tiết]
    ShowPingFail --> EndFail
    CheckPingResult -- Thành công (200 OK) --> SaveLatency[Đo Round-Trip latency_ms & cập nhật last_checked_at]
    SaveLatency --> ShowPingSuccess[Hiển thị độ trễ & huy hiệu Xanh lá]
    ShowPingSuccess --> EndSuccess((Kết thúc: Thành công))

    %% Nhánh 2: Kích Hoạt (Activate)
    ActionBranch -- Bật Kích hoạt (Activate) --> CheckActiveKey{Kiểm tra khóa API hợp lệ? BR-014}
    CheckActiveKey -- Chưa có Key --> RejectActivate[Từ chối: Không thể kích hoạt khi chưa có API Key]
    RejectActivate --> EndFail
    CheckActiveKey -- Đã có Key hợp lệ --> SetStatusActive[Cập nhật status = 'ACTIVE' trong CSDL]
    SetStatusActive --> AddToChatDropdown[Bổ sung model vào Dropdown lựa chọn phòng chat]
    AddToChatDropdown --> EndSuccess

    %% Nhánh 3: Hủy Kích Hoạt (Deactivate - Soft Toggle, BR-012, BR-013)
    ActionBranch -- Tắt Kích hoạt (Deactivate) --> CheckIsDefault{Model có đang là Mặc định is_default? BR-013}
    CheckIsDefault -- Đang là Default Model (Yes) --> RejectDeactivate[Báo lỗi 400: Không thể hủy kích hoạt model mặc định]
    RejectDeactivate --> EndFail
    CheckIsDefault -- Không phải Default (No) --> SetStatusInactive[Cập nhật status = 'INACTIVE' - Không xóa CSDL BR-012]
    SetStatusInactive --> RemoveFromChatDropdown[Ẩn model khỏi Dropdown phòng chat; giữ toàn vẹn lịch sử]
    RemoveFromChatDropdown --> EndSuccess

    %% Nhánh 4: Đặt Làm Mặc Định (Set Default)
    ActionBranch -- Đặt làm Mặc định (Set Default) --> CheckModelActive{Model có đang ACTIVE không?}
    CheckModelActive -- Đang INACTIVE --> RejectDefault[Báo lỗi 400: Chỉ model ACTIVE mới được đặt làm mặc định]
    RejectDefault --> EndFail
    CheckModelActive -- Đang ACTIVE --> UpdateDefaultFlags[Transaction CSDL: is_default = false cho model cũ, is_default = true cho model mới]
    UpdateDefaultFlags --> ShowDefaultBadge[Cập nhật huy hiệu MẶC ĐỊNH trên giao diện]
    ShowDefaultBadge --> EndSuccess

    style Start fill:#eff6ff,stroke:#2563eb
    style EndSuccess fill:#dcfce7,stroke:#15803d
    style EndFail fill:#fee2e2,stroke:#dc2626
```

---

## 2. Bảng Ràng Buộc Nghiệp Vụ Tương Ứng

| Cổng Quyết Định (Gateway) | Ràng Buộc Nghiệp Vụ | Mã Lỗi / Kết Quả |
| :--- | :--- | :--- |
| `CheckActiveKey` | `BR-014`: Bắt buộc có API Key trong `.env` trước khi kích hoạt | `HTTP 400 Bad Request` nếu thiếu |
| `CheckIsDefault` | `BR-013`: Bất biến duy trì mô hình mặc định hoạt động | `HTTP 400 Bad Request` nếu cố tình tắt model mặc định |
| `SetStatusInactive` | `BR-012`: Tuyệt đối không xóa cứng thực thể | Soft toggle `status = INACTIVE` |
| `CheckModelActive` | `BR-013`: Mô hình mặc định phải luôn ở trạng thái `ACTIVE` | `HTTP 400 Bad Request` nếu model chưa kích hoạt |

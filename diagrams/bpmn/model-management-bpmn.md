# Sơ Đồ BPMN: Quy Trình Quản Lý, Tìm Kiếm & Vòng Đời Mô Hình Mở Rộng (Model Management BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-010` |
| **Quy Trình Nghiệp Vụ** | `BP-MOD-001 [PROC-017]` & `BP-MOD-002 [PROC-018]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-035` - `FR-039`), [docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md) |
| **Mục Đích** | Trực quan hóa toàn diện quy trình tiếp nhận yêu cầu đăng ký mô hình mới, thẩm định biên tham số, chỉnh sửa cấu hình bất biến, tìm kiếm toàn văn/mờ, lọc đa tiêu chí và xóa mềm lưu trữ an toàn có bảo vệ mô hình mặc định |

---

## 1. Biểu Đồ BPMN Quy Trình Quản Trị & Vòng Đời Mô Hình (PROC-017 / PROC-018)

```mermaid
flowchart TD
    StartAction((Bắt Đầu: Hành Động Người Dùng Trên /models)) --> RouteAction{Loại Yêu Cầu Là Gì?}

    %% ================= NHÁNH 1: THÊM MÔ HÌNH MỚI (FR-035 / OP-022) =================
    RouteAction -- Thêm Mô Hình Mới (POST /models) --> CheckUnique{D-MOD-01: Mã ID đã tồn tại trong CSDL?}
    CheckUnique -- Đã Tồn Tại --> RejectConflict[BR-022: Từ chối với HTTP 409 Conflict]
    RejectConflict --> EndConflict((Kết Thúc: Trùng Mã ID))

    CheckUnique -- Chưa Tồn Tại --> CheckParamBoundNew{D-MOD-02: context >= 1000 & max_tokens >= 256?}
    CheckParamBoundNew -- Sai Quy Cách --> RejectInvalidNew[BR-024: Từ chối với HTTP 422 Unprocessable Entity]
    RejectInvalidNew --> EndInvalidNew((Kết Thúc: Lỗi Tham Số))

    CheckParamBoundNew -- Hợp Lệ --> InsertModel[Thêm bản ghi mới vào agent_models với status=INACTIVE]
    InsertModel --> EmitCreatedEvent[Phát ModelRegisteredEvent]
    EmitCreatedEvent --> Return201[Trả về HTTP 201 Created kèm dữ liệu mô hình]
    Return201 --> EndCreated((Kết Thúc: Đăng Ký Thành Công))

    %% ================= NHÁNH 2: CHỈNH SỬA CẤU HÌNH (FR-036 / OP-023) =================
    RouteAction -- Chỉnh Sửa Cấu Hình (PUT /models/:id) --> CheckExistEdit{Mô hình có tồn tại trong CSDL?}
    CheckExistEdit -- Không Tồn Tại --> Return404Edit[Trả về HTTP 404 Not Found]
    Return404Edit --> End404Edit((Kết Thúc: Không Tìm Thấy))

    CheckExistEdit -- Tồn Tại --> CheckImmutability{D-MOD-03: Payload có cố ý thay đổi ID hoặc Provider?}
    CheckImmutability -- Có Thay Đổi --> RejectImmutable[BR-022: Từ chối với HTTP 400 Bad Request]
    RejectImmutable --> EndImmutable((Kết Thúc: Vi Phạm Bất Biến))

    CheckImmutability -- Giữ Nguyên ID/Provider --> CheckParamBoundEdit{BR-024: context >= 1000 & max_tokens >= 256?}
    CheckParamBoundEdit -- Sai Quy Cách --> RejectInvalidEdit[Trả về HTTP 422 Unprocessable Entity]
    RejectInvalidEdit --> EndInvalidEdit((Kết Thúc: Lỗi Tham Số))

    CheckParamBoundEdit -- Hợp Lệ --> UpdateModelDB[Cập nhật name, context_window, max_tokens, streaming]
    UpdateModelDB --> Return200Edit[Trả về HTTP 200 OK kèm thông tin đã cập nhật]
    Return200Edit --> EndEditSuccess((Kết Thúc: Cập Nhật Thành Công))

    %% ================= NHÁNH 3: TÌM KIẾM & BỘ LỌC (FR-037, FR-038 / OP-024) =================
    RouteAction -- Tìm Kiếm & Lọc (GET /models/search) --> ParseFilters[Trích xuất query params: q, provider, status, has_api_key, sort]
    ParseFilters --> MatchFuzzy[So khớp chuỗi con & tìm kiếm mờ trên trường name và id]
    MatchFuzzy --> ApplyFacets[Áp dụng bộ lọc vị từ AND theo provider, status, has_api_key]
    ApplyFacets --> SortResults[Sắp xếp theo độ trễ latency hoặc context_window]
    SortResults --> VerifyPerf{NFR-022: Thời gian xử lý <= 200ms?}
    VerifyPerf -- Đạt Chuẩn --> Return200Search[Trả về danh sách kết quả HTTP 200 OK]
    Return200Search --> EndSearchSuccess((Kết Thúc: Trả Danh Sách Lọc))

    %% ================= NHÁNH 4: XÓA MỀM & LƯU TRỮ (FR-039 / OP-025) =================
    RouteAction -- Xóa / Lưu Trữ (DELETE /models/:id) --> CheckExistDel{Mô hình có tồn tại trong CSDL?}
    CheckExistDel -- Không Tồn Tại --> Return404Del[Trả về HTTP 404 Not Found]
    Return404Del --> End404Del((Kết Thúc: Không Tìm Thấy))

    CheckExistDel -- Tồn Tại --> CheckDefaultGuard{D-MOD-04: Mô hình đang mang cờ is_default = 1?}
    CheckDefaultGuard -- Đang Là Mặc Định --> RejectDefaultDel[BR-023: Chặn đứng với HTTP 400 Bad Request: Cấm xóa mô hình mặc định]
    RejectDefaultDel --> EndDefaultBlocked((Kết Thúc: Chặn Bảo Vệ Mặc Định))

    CheckDefaultGuard -- Không Phải Mặc Định --> SetArchivedStatus[BR-012, FR-039: UPDATE status = ARCHIVED - Xóa Mềm An Toàn]
    SetArchivedStatus --> SyncChatRouter[Đồng bộ loại mô hình khỏi danh mục chọn đàm thoại của Agent]
    SyncChatRouter --> Return200Del[Trả về HTTP 200 OK: Đã chuyển mô hình vào lưu trữ]
    Return200Del --> EndArchivedSuccess((Kết Thúc: Lưu Trữ Thành Công))
```

---

## 2. Bảng Phân Tích Cổng Rẽ Nhánh Nghiệp Vụ (Decision Gateways)

| Cổng Quyết Định | Điều Kiện Kiểm Tra | Nhánh Đúng (True) | Nhánh Sai (False) | Quy Tắc Thực Thi |
| :--- | :--- | :--- | :--- | :--- |
| **`D-MOD-01`** | `agent_models.id` đã tồn tại? | Từ chối với HTTP 409 Conflict | Tiếp tục bước kiểm tra tham số | `BR-022` |
| **`D-MOD-02`** | `context >= 1000 & max_tokens >= 256`? | Tiến hành INSERT CSDL | Từ chối với HTTP 422 Unprocessable | `BR-024` |
| **`D-MOD-03`** | Payload cố ý sửa `id` hoặc `provider`? | Từ chối với HTTP 400 Bad Request | Cho phép cập nhật các trường khác | `BR-022` |
| **`D-MOD-04`** | `model.is_default == true`? | Từ chối với HTTP 400 Bad Request | Cho phép cập nhật `status = ARCHIVED` | `BR-023` |

# Sơ Đồ Swimlane: Quản Lý Mô Hình Đa Làn (Model Management Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-007` |
| **Quy Trình Nghiệp Vụ** | `BP-MOD-001 [PROC-017]` & `BP-MOD-002 [PROC-018]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm và chuỗi tương tác phối hợp 5 làn (5-Lane): User & Next.js UI -> API Gateway & Router -> Validation & Integrity Engine -> Agent Router -> SQLite Database |

---

## 1. Biểu Đồ Swimlane Quy Trình Quản Lý & Vòng Đời Mô Hình Mở Rộng

```mermaid
flowchart TD
    subgraph LaneUI ["LÀN 1: USER & NEXT.JS UI (SCR-004 / UX-008)"]
        U1["Mở Modal: Nhập ID, Tên, Provider, Context, Max Tokens"]
        U2["Chỉnh sửa cấu hình trong Drawer (Khóa ô ID & Provider)"]
        U3["Gõ từ khóa vào Search Bar (Debounced 300ms) & Chọn Filter"]
        U4["Bấm Xóa/Lưu trữ trên thẻ mô hình & Mở Dialog xác nhận"]
        U_Render["Hiển thị thẻ mô hình mới / cập nhật danh sách lọc"]
        U_Alert["Hiển thị thông báo lỗi / cảnh báo đỏ"]
    end

    subgraph LaneAPI ["LÀN 2: API GATEWAY & ROUTER (FastAPI / OP-022..OP-025)"]
        A_Post["POST /api/v1/models (Đăng ký mô hình)"]
        A_Put["PUT /api/v1/models/:id (Cập nhật cấu hình)"]
        A_Search["GET /api/v1/models/search (Tìm kiếm & Lọc)"]
        A_Delete["DELETE /api/v1/models/:id (Xóa mềm / Lưu trữ)"]
        A_Res201["Trả HTTP 201 Created"]
        A_Res200["Trả HTTP 200 OK"]
        A_ResErr["Trả HTTP 400 / 409 / 422 Error"]
    end

    subgraph LaneEngine ["LÀN 3: VALIDATION & INTEGRITY GUARD (CTRL-009 / SEC-010)"]
        V_Unique["Kiểm tra ID duy nhất toàn cục (BR-022)"]
        V_Bounds["Thẩm định biên: context >= 1000 & max_tokens >= 256 (BR-024)"]
        V_Immut["Kiểm tra bất biến: Cấm đổi id & provider (BR-022)"]
        V_Filter["Thực thi logic Sub-string & Multi-facet AND Filter (NFR-022)"]
        V_Default["Chốt chặn: Kiểm tra model.is_default == true? (BR-023)"]
    end

    subgraph LaneRouter ["LÀN 4: AGENT ROUTER (LangChain / LangGraph Engine)"]
        R_SyncAdd["Đăng ký adapter mô hình mới vào catalog khả dụng"]
        R_SyncDel["Loại bỏ mô hình ARCHIVED khỏi danh mục chọn đàm thoại"]
    end

    subgraph LaneDB ["LÀN 5: CƠ SỞ DỮ LIỆU (SQLite agent_models / COMP-003)"]
        DB_CheckID["SELECT COUNT(*) FROM agent_models WHERE id = :id"]
        DB_Insert["INSERT INTO agent_models (id, name, provider, status, context, tokens)"]
        DB_Update["UPDATE agent_models SET name, context, tokens WHERE id = :id"]
        DB_Query["SELECT * FROM agent_models WHERE name LIKE :q ..."]
        DB_Archive["UPDATE agent_models SET status = 'ARCHIVED' WHERE id = :id"]
    end

    %% Luồng 1: Đăng ký mô hình mới
    U1 --> A_Post
    A_Post --> V_Unique
    V_Unique --> DB_CheckID
    DB_CheckID --> V_Unique
    V_Unique -- Đã tồn tại --> A_ResErr
    V_Unique -- Chưa có --> V_Bounds
    V_Bounds -- Lỗi biên --> A_ResErr
    V_Bounds -- Hợp lệ --> DB_Insert
    DB_Insert --> R_SyncAdd
    R_SyncAdd --> A_Res201
    A_Res201 --> U_Render

    %% Luồng 2: Chỉnh sửa cấu hình
    U2 --> A_Put
    A_Put --> V_Immut
    V_Immut -- Sửa ID/Provider --> A_ResErr
    V_Immut -- Bất biến --> V_Bounds
    V_Bounds --> DB_Update
    DB_Update --> A_Res200
    A_Res200 --> U_Render

    %% Luồng 3: Tìm kiếm & Lọc
    U3 --> A_Search
    A_Search --> V_Filter
    V_Filter --> DB_Query
    DB_Query --> A_Res200
    A_Res200 --> U_Render

    %% Luồng 4: Xóa mềm / Lưu trữ có bảo vệ
    U4 --> A_Delete
    A_Delete --> V_Default
    V_Default -- is_default == true --> A_ResErr
    A_ResErr --> U_Alert
    V_Default -- is_default == false --> DB_Archive
    DB_Archive --> R_SyncDel
    R_SyncDel --> A_Res200
    A_Res200 --> U_Render
```

---

## 2. Ma Trận Phân Định Trách Nhiệm Giữa Các Làn (RACI Matrix)

| Hành Động Nghiệp Vụ | Làn 1: UI | Làn 2: API Gateway | Làn 3: Integrity Engine | Làn 4: Agent Router | Làn 5: SQLite Database |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Đăng ký mô hình mới (`OP-022`)** | Responsible | Accountable | Consulted (`BR-022`, `BR-024`) | Informed | Responsible |
| **Hiệu chỉnh cấu hình (`OP-023`)** | Responsible | Accountable | Consulted (`BR-022`, `BR-024`) | Informed | Responsible |
| **Tìm kiếm & Lọc nhanh (`OP-024`)** | Responsible | Accountable | Consulted (`NFR-022`) | Informed | Responsible |
| **Lưu trữ mềm mô hình (`OP-025`)** | Responsible | Accountable | Consulted (`BR-023`) | Responsible | Responsible |

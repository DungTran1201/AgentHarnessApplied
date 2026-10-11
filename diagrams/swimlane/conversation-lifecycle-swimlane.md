# Sơ Đồ Swimlane: Vòng Đời Quản Lý Cuộc Trò Chuyện (Conversation Lifecycle Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-003` |
| **Quy Trình Nghiệp Vụ** | `BP-CONV-001..004 [PROC-004..007]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-005`, `FR-006`) |
| **Mục Đích** | Thể hiện sự phối hợp đa làn khi Tạo mới, Tải danh sách, Đổi tên tiêu đề và Xóa cuộc trò chuyện kèm cơ chế chống IDOR |

---

## 1. Biểu Đồ Swimlane Vòng Đời Cuộc Trò Chuyện

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-02)"]
        U_NewChat["1. Bấm '+ Cuộc trò chuyện mới'"]
        U_Rename["4. Nhấp sửa tiêu đề cuộc trò chuyện"]
        U_Delete["7. Bấm biểu tượng Thùng rác & xác nhận Modal"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND SIDEBAR (Next.js)"]
        F_SendCreate["2. Gửi POST /api/v1/conversations"]
        F_UpdateSidebar["Cập nhật thread mới lên đầu Sidebar"]
        F_SendRename["5. Gửi PATCH /api/v1/conversations/:id"]
        F_UpdateTitle["Cập nhật hiển thị tiêu đề mới"]
        F_SendDelete["8. Gửi DELETE /api/v1/conversations/:id"]
        F_RemoveThread["Loại bỏ thread khỏi Sidebar, chuyển về /chat rỗng"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API (FastAPI)"]
        B_AuthAndCreate["3. Gán user_id từ JWT & tạo record hội thoại"]
        B_CheckOwnerRename["6. Kiểm tra quyền sở hữu (Anti-IDOR) & cập nhật title"]
        B_CheckOwnerDelete["9. Kiểm tra quyền sở hữu (Anti-IDOR) & xóa hội thoại"]
    end

    subgraph LaneDB ["LÀN 4: CƠ SỞ DỮ LIỆU (PostgreSQL)"]
        DB_InsertConv["INSERT INTO conversations"]
        DB_UpdateConv["UPDATE conversations SET title = :new_title"]
        DB_CascadeDelete["DELETE FROM conversations (CASCADE messages)"]
    end

    %% Luồng Tạo mới
    U_NewChat --> F_SendCreate
    F_SendCreate --> B_AuthAndCreate
    B_AuthAndCreate --> DB_InsertConv
    DB_InsertConv --> F_UpdateSidebar

    %% Luồng Đổi tên
    U_Rename --> F_SendRename
    F_SendRename --> B_CheckOwnerRename
    B_CheckOwnerRename --> DB_UpdateConv
    DB_UpdateConv --> F_UpdateTitle

    %% Luồng Xóa
    U_Delete --> F_SendDelete
    F_SendDelete --> B_CheckOwnerDelete
    B_CheckOwnerDelete --> DB_CascadeDelete
    DB_CascadeDelete --> F_RemoveThread

    style LaneUser fill:#eff6ff,stroke:#2563eb
    style LaneFrontend fill:#f0fdf4,stroke:#16a34a
    style LaneBackend fill:#fefce8,stroke:#ca8a04
    style LaneDB fill:#fdf2f8,stroke:#db2777
```

---

## 2. Thuyết Minh Kiểm Soát Cách Ly Dữ Liệu (Anti-IDOR Policy)

- Tại mọi thao tác truy vấn, đổi tên (`PATCH`) hoặc xóa (`DELETE`), Backend luôn truy vấn với điều kiện kép:
  `WHERE id = :conversation_id AND user_id = :jwt_user_id`.
- Nếu không tìm thấy, hệ thống trả về mã lỗi `HTTP 404 Not Found` thay vì `403 Forbidden` để ngăn chặn kẻ tấn công suy đoán hoặc dò quét sự tồn tại của các ID hội thoại thuộc người dùng khác (`SEC-002`, `CTRL-002`).

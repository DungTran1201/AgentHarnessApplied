# KẾ HOẠCH TRIỂN KHAI KỸ THUẬT (IMPLEMENTATION PLAN)
## Lộ Trình Hiện Thực Hóa Kiến Trúc Chống Gián Đoạn Hội Thoại
### Mã Tài Liệu: `IMP-STREAM-RESILIENCE` | Phân Hệ: `ARCH-STREAM-RESILIENCE`

---

## 1. Phân Kỳ Triển Khai (Phased Roadmap)

```
+---------------------------------------------------------------------------------------------------+
| LỘ TRÌNH TRIỂN KHAI 4 BƯỚC (PHASED EXECUTION)                                                     |
+---------------------------------------------------------------------------------------------------+
|  Giai Đoạn 1: CSDL & Migration (Bổ sung cột status vào bảng messages)                            |
|        │                                                                                          |
|        ▼                                                                                          |
|  Giai Đoạn 2: Backend Refactor (Detached Asynchronous Task & Queue Dispatcher)                   |
|        │                                                                                          |
|        ▼                                                                                          |
|  Giai Đoạn 3: Frontend Refactor (Global Multi-Session Stream Store & Re-attachment)               |
|        │                                                                                          |
|        ▼                                                                                          |
|  Giai Đoạn 4: Kiểm Thử Toàn Diện & Đánh Giá Tiêu Chuẩn Nghiệm Thu                                 |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Chi Tiết Từng Giai Đoạn

### Giai Đoạn 1: Nâng Cấp Schema CSDL SQLite
1. Tạo migration script: `database/migrations/016_message_status_tracking.sql`
   ```sql
   -- Thêm cột status vào bảng messages nếu chưa tồn tại
   ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'COMPLETED';
   CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
   ```
2. Cập nhật `apply_migrations.py` để áp dụng tự động cho cả môi trường phát triển và môi trường test.

---

### Giai Đoạn 2: Tái Cấu Trúc Backend (`chat.py` & `projects.py`)
1. **Định nghĩa Task Registry:**
   Tạo module `src/core/stream_manager.py` quản lý các background tasks và queue:
   - `active_inference_tasks: Dict[str, asyncio.Task]`
   - `active_stream_queues: Dict[str, asyncio.Queue]`
2. **Triển khai hàm `run_detached_inference_worker`:**
   - Đọc các token từ `chat_agent.astream_agent()`.
   - Tích lũy vào mảng `accumulated_chunks`.
   - Đẩy vào `asyncio.Queue` cho SSE client.
   - Trong khối `finally`: Luôn thực thi `UPDATE messages SET content = ?, status = 'COMPLETED' WHERE id = ?`.
3. **Cập nhật `stream_message_endpoint`:**
   - Trả về `StreamingResponse` đọc từ `asyncio.Queue`.
   - Bắt `asyncio.CancelledError` khi client đóng kết nối socket: log debug và thoát nhẹ nhàng, **tuyệt đối không cancel background task**.
4. **Endpoint dừng chủ động `POST /api/v1/conversations/{id}/messages/stop`:**
   - Hủy task trong registry một cách có chủ đích khi người dùng bấm Stop.

---

### Giai Đoạn 3: Tái Cấu Trúc Frontend (`streamStore.ts` & `ChatPage.tsx`)
1. **Tạo Global Store `ai-frontend/src/context/StreamContext.tsx` hoặc `streamStore.ts`:**
   - Duy trì `sessions: Record<string, StreamSession>`.
   - `startStreaming(convId, prompt, ...)`: khởi tạo kết nối SSE ngầm.
   - `stopStreaming(convId)`: gọi endpoint stop trên backend và abort controller.
2. **Cập nhật `ChatPage.tsx`:**
   - Thay vì lưu `messages` đơn thuần ở local state, component đồng bộ với `streamStore`:
     - Nếu `activeConvId` đang có active stream trong store: hòa trộn token đang sinh vào danh sách hiển thị.
     - Nếu không có stream: chỉ hiển thị tin nhắn nạp từ DB.
   - Khi người dùng bấm sang chat khác (`conv_B`), luồng fetch SSE của `conv_A` **không bị ngắt**, tiếp tục cập nhật vào `streamStore.sessions['conv_A']`.
3. **Cập nhật `FloatingProjectChat.tsx`:**
   - Áp dụng cơ chế tương tự cho việc chạy pipeline trên Canvas.

---

### Giai Đoạn 4: Bộ Tiêu Chí Kiểm Thử (Verification Scenarios)

| Mã Kịch Bản | Thao Tác Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- |
| **`TC-RES-001`** | Bấm sang chat khác trong khi AI đang trả lời | Màn hình chuyển sang chat mới; Task trên Backend tiếp tục chạy đến khi hoàn thành; CSDL lưu đầy đủ câu trả lời. |
| **`TC-RES-002`** | Quay lại cuộc trò chuyện cũ sau khi AI đã sinh xong | Toàn bộ câu trả lời hiển thị đầy đủ 100%, không bị cắt ngang hay mất chữ. |
| **`TC-RES-003`** | Quay lại cuộc trò chuyện cũ trong khi AI vẫn đang sinh dở | Giao diện tự động hiển thị đoạn văn bản đã tích lũy và tiếp tục gõ chữ theo thời gian thực (smooth typing). |
| **`TC-RES-004`** | Người dùng bấm nút "Stop" chủ động | Mô hình AI dừng ngay lập tức; Backend cập nhật `status = 'ABORTED'`; lưu lại đoạn văn bản đã sinh đến thời điểm bấm Stop. |
| **`TC-RES-005`** | Người dùng đóng hẳn tab trình duyệt trong lúc đang suy luận | Backend vẫn lưu câu trả lời vào CSDL; khi mở lại tab trình duyệt và vào lại chat, câu trả lời vẫn tồn tại. |

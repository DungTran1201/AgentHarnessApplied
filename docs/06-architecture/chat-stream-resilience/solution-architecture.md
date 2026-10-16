# THIẾT KẾ GIẢI PHÁP KIẾN TRÚC (SOLUTION ARCHITECTURE DESIGN)
## Duy Trì Tiến Trình Suy Luận Ngầm & Tái Kết Nối Đa Phiên Hội Thoại
### Mã Tài Liệu: `SAD-STREAM-RESILIENCE` | Phân Hệ: `ARCH-STREAM-RESILIENCE`

---

## 1. Quyết Định Kiến Trúc Cốt Lõi (Architectural Decision Records)

### 1.1 ADR-017: Tách Rời Tiến Trình Suy Luận Khỏi Vòng Đời Kết Nối HTTP (Detached Async Inference)
- **Bối cảnh**: Starlette `StreamingResponse` hủy generator khi client đóng socket, dẫn đến việc mất toàn bộ kết quả suy luận của LLM nếu người dùng đổi tab hoặc chuyển conversation.
- **Quyết định**: Tách quy trình thành 2 thành phần bất đối xứng:
  1. **Inference & Persistence Worker (`Background Task`)**: Chạy độc lập qua `asyncio.create_task()`. Tiến trình này chịu trách nhiệm gọi AI Provider, tích lũy token và **đảm bảo 100% commit kết quả vào SQLite DB** trong khối `try...finally`.
  2. **SSE Streaming Dispatcher (`Client Consumer`)**: Đọc các token từ một hàng đợi bất đồng bộ (`asyncio.Queue`) và truyền về cho client. Nếu client ngắt kết nối, chỉ có Dispatcher kết thúc; Background Task vẫn tiếp tục chạy trọn vẹn trong nền.
- **Hệ quả**: Triệt tiêu hoàn toàn rủi ro mất dữ liệu câu trả lời khi người dùng điều hướng trên ứng dụng.

### 1.2 ADR-018: Quản Lý Đa Luồng Hội Thoại Toàn Cục Tại Frontend (Global Stream Session Map)
- **Bối cảnh**: Trạng thái streaming hiện tại lưu trong local state của `ChatPage`, dẫn đến việc bị xóa sạch khi `activeConvId` thay đổi.
- **Quyết định**: Chuyển quyền sở hữu active stream lên Global Store (Zustand hoặc AppContext). Quản lý danh sách các stream đang hoạt động dưới dạng từ điển ánh xạ:
  `Record<conversationId, StreamSessionState>`.
- **Hệ quả**: Việc người dùng bấm chuyển giữa các cuộc trò chuyện chỉ thay đổi "Viewport hiển thị". Các stream của các cuộc trò chuyện khác tiếp tục nhận dữ liệu và cập nhật ngầm. Khi người dùng quay lại cuộc trò chuyện cũ, giao diện tự động sync tức thì mà không cần nạp lại từ đầu.

---

## 2. Mô Hình Phân Tầng Giải Pháp (Multi-Tier Solution Design)

```
+-----------------------------------------------------------------------------------------------+
| 1. FRONTEND: GLOBAL MULTI-SESSION STREAM STORE (Next.js / Zustand / AppContext)               |
|                                                                                               |
|   +---------------------------------------------------------------------------------------+   |
|   | Global Stream Session Map: Record<conversation_id, StreamSession>                    |   |
|   |   - conv_01: { assistantMsgId: "msg_1", text: "Xin chào...", isStreaming: true }     |   |
|   |   - conv_02: { assistantMsgId: "msg_2", text: "Phân tích...", isStreaming: false }   |   |
|   +---------------------------------------------------------------------------------------+   |
|            ^                                                        ^                         |
|            | Select active conversation (conv_01)                   | Background socket listener
|   +--------v-------------+                                          |                         |
|   | Active Viewport      |                                          |                         |
|   | (ChatWorkspace.tsx)  |                                          |                         |
|   +----------------------+                                          |                         |
+---------------------------------------------------------------------|-------------------------+
                                                                      | SSE EventStream
+---------------------------------------------------------------------v-------------------------+
| 2. BACKEND API: SSE GATEWAY & DISPATCHER (FastAPI / Starlette)                                |
|   - Endpoint: POST /api/v1/conversations/{id}/messages/stream                                 |
|   - Client Connected: Đọc chunks từ asyncio.Queue và yield về SSE                             |
|   - Client Disconnected: Bắt CancelledError -> Dọn dẹp Dispatcher (KHÔNG HỦY INFERENCE TASK) |
+---------------------------------------------------------------------^-------------------------+
                                                                      |
                                            Token Queue (asyncio.Queue)|
                                                                      |
+---------------------------------------------------------------------v-------------------------+
| 3. CORE SERVICE: DETACHED INFERENCE ENGINE (asyncio.create_task)                              |
|   - Chạy độc lập với vòng đời HTTP Request                                                    |
|   - Gọi chat_agent.astream_agent()                                                            |
|   - Đẩy token vào asyncio.Queue cho client đang nghe (nếu có)                                 |
|   - Tích lũy chuỗi văn bản hoàn chỉnh trong bộ đệm task                                      |
|   - KHỐI FINALLY BẢO ĐẢM: INSERT / UPDATE vào CSDL SQLite bảng messages                       |
|   - Cập nhật Quota tiêu thụ & ghi log Metric an toàn                                          |
+---------------------------------------------------------------------^-------------------------+
                                                                      |
+---------------------------------------------------------------------v-------------------------+
| 4. PERSISTENCE LAYER: RESILIENT MESSAGE LIFECYCLE (SQLite)                                    |
|   - Bảng messages hỗ trợ trạng thái: status ('STREAMING', 'COMPLETED', 'ABORTED', 'ERROR')     |
|   - Khởi tạo placeholder ngay khi bắt đầu: INSERT INTO messages (status = 'STREAMING')         |
|   - Hoàn tất suy luận: UPDATE messages SET content = ?, status = 'COMPLETED'                  |
+-----------------------------------------------------------------------------------------------+
```

---

## 3. Thiết Kế Chi Tiết Phía Backend (Backend Engine Design)

### 3.1 Vòng Đời Tin Nhắn Assistant & Trạng Thái Mới (Message Lifecycle State Machine)

Bảng `messages` được thiết kế có cột `status` để theo dõi chính xác tiến trình:
- **`STREAMING`**: Tin nhắn đang được mô hình AI sinh trong nền.
- **`COMPLETED`**: Mô hình đã hoàn tất việc sinh câu trả lời và đã lưu toàn bộ nội dung.
- **`ABORTED`**: Người dùng chủ động bấm nút "Stop" trên giao diện.
- **`ERROR`**: Gặp lỗi mạng từ AI Provider (Quota, Rate limit, API Key).

### 3.2 Cấu Trúc Detached Task & Quản Lý Hàng Đợi (Token Fan-Out Queue)

```python
import asyncio
from typing import Dict

# Quản lý hàng đợi stream đang chạy theo conversation_id
active_inference_queues: Dict[str, asyncio.Queue] = {}

async def run_detached_inference_task(
    conversation_id: str,
    assistant_msg_id: str,
    prompt: str,
    history: list,
    model_id: str,
    user_id: str,
    queue: asyncio.Queue
):
    """Tiến trình suy luận độc lập, không phụ thuộc vào kết nối HTTP client."""
    accumulated_chunks = []
    final_model = model_id
    start_time = time.perf_counter()

    try:
        from llm.agent import chat_agent
        async for event in chat_agent.astream_agent(
            prompt=prompt,
            history=history,
            model_override=model_id
        ):
            if event.get("status") == "streaming":
                token = event.get("token", "")
                accumulated_chunks.append(token)
                # Đẩy vào queue cho client đang nghe (nếu client ngắt kết nối thì queue tự discard)
                await queue.put({"type": "chunk", "token": token})
            elif event.get("status") == "done":
                final_model = event.get("model", final_model)
            elif event.get("status") == "error":
                await queue.put({"type": "error", "message": event.get("message")})
                return

    except asyncio.CancelledError:
        # Xảy ra khi người dùng chủ động bấm nút Stop
        full_text = "".join(accumulated_chunks).strip()
        execute_commit(
            "UPDATE messages SET content = ?, status = 'ABORTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (full_text, assistant_msg_id)
        )
        raise

    except Exception as exc:
        execute_commit(
            "UPDATE messages SET status = 'ERROR', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (assistant_msg_id,)
        )
    finally:
        # BẢO ĐẢM COMMIT DỮ LIỆU: Luôn lưu toàn bộ nội dung đã sinh được vào CSDL
        full_text = "".join(accumulated_chunks).strip()
        execute_commit(
            """
            UPDATE messages 
            SET content = ?, model_used = ?, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND status != 'ABORTED'
            """,
            (full_text, final_model, assistant_msg_id)
        )
        
        # Báo hiệu kết thúc cho Consumer
        await queue.put({"type": "done", "message_id": assistant_msg_id, "model": final_model})
        # Dọn dẹp queue khỏi registry
        active_inference_queues.pop(conversation_id, None)
```

### 3.3 Consumer Generator Trong Endpoint SSE

```python
@chat_router.post("/conversations/{conversation_id}/messages/stream")
async def stream_message_endpoint(...):
    # 1. Ghi nhận tin nhắn User
    user_msg_id = str(uuid.uuid4())
    execute_commit("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)", ...)

    # 2. Tạo trước bản ghi Assistant với trạng thái STREAMING
    assistant_msg_id = str(uuid.uuid4())
    execute_commit(
        "INSERT INTO messages (id, conversation_id, role, content, status, model_used) VALUES (?, ?, 'assistant', '', 'STREAMING', ?)",
        (assistant_msg_id, conversation_id, selected_model)
    )

    # 3. Tạo hàng đợi và khởi chạy Detached Task
    queue = asyncio.Queue()
    active_inference_queues[conversation_id] = queue

    inference_task = asyncio.create_task(
        run_detached_inference_task(
            conversation_id=conversation_id,
            assistant_msg_id=assistant_msg_id,
            prompt=effective_prompt,
            history=context_msgs,
            model_id=selected_model,
            user_id=user_id,
            queue=queue
        )
    )

    # 4. Generator tiêu thụ queue trả về client
    async def sse_consumer():
        try:
            while True:
                item = await queue.get()
                if item["type"] == "chunk":
                    yield f"event: chunk\ndata: {json.dumps({'token': item['token'], 'status': 'streaming'})}\n\n"
                elif item["type"] == "done":
                    yield f"event: done\ndata: {json.dumps({'status': 'done', 'message_id': item['message_id']})}\n\n"
                    break
                elif item["type"] == "error":
                    yield f"event: error\ndata: {json.dumps({'status': 'error', 'message': item['message']})}\n\n"
                    break
        except asyncio.CancelledError:
            # Client disconnected (chuyển chat, đóng tab)
            # LƯU Ý: KHÔNG hủy inference_task! Để nó tiếp tục chạy ngầm trong backend!
            pass

    return StreamingResponse(sse_consumer(), media_type="text/event-stream")
```

---

## 4. Thiết Kế Chi Tiết Phía Frontend (Frontend Store Design)

### 4.1 Quản Lý Trạng Thái Toàn Cục (Global Stream Store Pattern)

Thay vì để `const [messages, setMessages] = useState<Message[]>` trong `ChatPage.tsx`:
- Tạo `streamStore.ts` hoặc tích hợp vào `AppContext.tsx`.
- Cấu trúc `StreamSession`:
```typescript
interface StreamSession {
  conversationId: string;
  assistantMsgId: string;
  accumulatedContent: string;
  isStreaming: boolean;
  abortController: AbortController | null;
}

interface StreamStoreState {
  sessions: Record<string, StreamSession>;
  startSession: (convId: string, assistantId: string, controller: AbortController) => void;
  appendChunk: (convId: string, token: string) => void;
  completeSession: (convId: string) => void;
  abortSession: (convId: string) => void;
}
```

### 4.2 Hành Vi Khi Người Dùng Chuyển Chat

1. Người dùng đang ở `conv_A`, gửi prompt:
   - `streamStore.startSession('conv_A', ...)` bắt đầu lắng nghe SSE.
   - Khi token về: `streamStore.appendChunk('conv_A', token)` cập nhật trực tiếp vào session store.
2. Người dùng bấm sang `conv_B`:
   - `activeConvId` đổi thành `'conv_B'`.
   - Kết nối SSE của `conv_A` **vẫn tiếp tục đọc luồng ngầm** qua `ReadableStream` đã khởi tạo từ trước (không gọi abort).
   - Component chuyển sang hiển thị tin nhắn của `conv_B`.
3. Người dùng bấm quay lại `conv_A`:
   - Component nạp tin nhắn từ API: bản ghi Assistant đã có nội dung đầy đủ (nếu đã xong) hoặc kết hợp với `streamStore.sessions['conv_A'].accumulatedContent` (nếu đang sinh dở).
   - Giao diện mượt mà tuyệt đối, người dùng thấy ngay câu trả lời hoàn chỉnh mà không hề bị mất dữ liệu.

---

## 5. Xử Lý Nút "Stop Generation" Chủ Động

Để đảm bảo người dùng vẫn có toàn quyền dừng mô hình khi không muốn tiếp tục:
- Cung cấp endpoint: `POST /api/v1/conversations/{conversation_id}/messages/stop`.
- Backend tìm `inference_task` tương ứng trong registry và gọi `inference_task.cancel()`.
- Task bắt `asyncio.CancelledError`, lưu lại đoạn văn bản đã sinh được đến thời điểm bấm nút, đánh dấu `status = 'ABORTED'`.
- Phân biệt rạch ròi:
  - **Client Disconnect thụ động (chuyển chat, đóng tab)**: `inference_task` **TIẾP TỤC CHẠY** và lưu hoàn tất.
  - **User Click Stop chủ động**: `inference_task` **HỦY NGAY LẬP TỨC** và lưu phần đã sinh.

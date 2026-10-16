# PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)
## Hiện Tượng: Gián Đoạn & Mất Dữ Liệu Suy Luận Khi Chuyển Conversation
### Mã Tài Liệu: `RCA-STREAM-INTERRUPT` | Phân Hệ: `ARCH-STREAM-RESILIENCE`

---

## 1. Tóm Tắt Hiện Tượng (Issue Summary)

| Thuộc Tính | Chi Tiết Ghi Nhận |
| :--- | :--- |
| **Mô tả người dùng** | Khi đang gửi câu hỏi cho model trong một cuộc trò chuyện, nếu người dùng bấm sang một cuộc trò chuyện khác trên thanh điều hướng bên trái hoặc chuyển trang, mô hình AI lập tức dừng suy luận. Khi người dùng bấm quay lại cuộc trò chuyện ban đầu, câu trả lời bị biến mất hoàn toàn. |
| **Tần suất xuất hiện** | **100% (Deterministic)** — Xảy ra ở mọi cuộc trò chuyện cả trên Main Chat Page (`/chat`) và Floating Project Chat (`/projects/[id]/editor`). |
| **Mức độ nghiêm trọng** | **P0 (Critical Data Loss & UX Blocker)** — Gây lãng phí token LLM, mất dữ liệu phản hồi của người dùng và phá vỡ tính liên tục của trải nghiệm AI. |

---

## 2. Kịch Bản Tái Hiện Chi Tiết (Reproduction Steps)

1. Người dùng mở trang `/chat`, chọn mô hình `gemini-3.8-flash` hoặc `gpt-4o-mini`.
2. Người dùng nhập một câu hỏi phức tạp yêu cầu suy luận dài: *"Hãy phân tích kiến trúc Microservices và viết mã nguồn triển khai chi tiết..."*.
3. Người dùng bấm Gửi. AI-Chan bắt đầu sinh phản hồi, từng chữ (tokens) xuất hiện trên màn hình.
4. Trong khi mô hình đang sinh câu trả lời ở giây thứ 3, người dùng nhấp chuột vào một cuộc trò chuyện khác trong danh sách Sidebar (`handleSelectConversation`).
5. **Hiện tượng quan sát được:**
   - Màn hình chat lập tức chuyển sang cuộc trò chuyện mới được chọn.
   - Khi người dùng nhấp quay lại cuộc trò chuyện cũ: Tin nhắn người dùng vẫn có trong danh sách, nhưng **hoàn toàn không có phản hồi nào của AI**, hoặc tin nhắn assistant biến mất hoàn toàn không để lại dấu vết.

---

## 3. Bằng Chứng Dấu Vết Mã Nguồn (Codebase Evidence & Trace)

Qua quá trình rà soát chi tiết mã nguồn giữa Frontend và Backend, đội ngũ Kiến trúc sư xác định hai nguyên nhân gốc rễ liên kết trực tiếp với nhau:

### 3.1 Nguyên Nhân Phía Frontend: Trạng Thái Stream Bị Gắn Cứng Vào Local View Component

Vị trí tệp: [`ai-frontend/src/app/(app)/chat/page.tsx`](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/(app)/chat/page.tsx)

#### A. Xóa sạch state khi `activeConvId` thay đổi
Tại dòng 58 – 74:
```typescript
// ── Load messages when activeConvId changes ───────────────────────
useEffect(() => {
  if (!activeConvId) {
    setMessages([]);
    return;
  }
  (async () => {
    try {
      const res = await fetch(`/api/v1/conversations/${activeConvId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []); // <--- GHI ĐÈ HOÀN TOÀN STATE
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  })();
}, [activeConvId]);
```
- Khi người dùng bấm sang chat khác, `activeConvId` thay đổi. Hook `useEffect` này kích hoạt ngay lập tức và nạp danh sách tin nhắn của cuộc trò chuyện mới.
- Toàn bộ mảng `messages` của component (nơi đang chứa `userMsg` và `assistantMsgPlaceholder` đang streaming) bị xóa sạch và thay thế bằng dữ liệu mới.

#### B. Mất điểm neo cập nhật token (Silent Token Drop)
Tại dòng 225 – 238 trong hàm `handleSendMessage`:
```typescript
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.token) {
        accumulatedText += data.token;
        // <--- LỖI TẠI ĐÂY: m.id === assistantPlaceholderId không còn tồn tại trong messages mới!
        setMessages(prev => prev.map(m =>
          m.id === assistantPlaceholderId
            ? { ...m, content: accumulatedText }
            : m
        ));
      }
    }
  }
}
```
- Khi `activeConvId` đã đổi, biến `prev` trong `setMessages` trỏ tới tin nhắn của **cuộc trò chuyện mới**.
- Phép so sánh `m.id === assistantPlaceholderId` luôn trả về `false`, khiến toàn bộ token nhận về từ server sau thời điểm click bị bỏ qua một cách âm thầm (Silent Drop).

#### C. Trình duyệt đóng kết nối TCP Socket
- Khi người dùng chuyển route (ví dụ từ `/chat` sang `/projects` hoặc `/models`), component `ChatPage` bị unmount khỏi DOM.
- Trình duyệt tự động đóng luồng `ReadableStream` và hủy kết nối HTTP SSE với Backend.

---

### 3.2 Nguyên Nhân Phía Backend: Generator Bị Hủy & Hoãn Lưu Trữ CSDL Đến Cuối Cùng

Vị trí tệp: [`ai-backend/src/api/v1/chat.py`](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/chat.py) và [`ai-backend/src/api/v1/projects.py`](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/projects.py)

#### A. Luồng suy luận LLM bị trói chặt vào SSE Generator Socket
Tại dòng 218 – 240 của `chat.py`:
```python
async def sse_event_generator():
    try:
        from llm.agent import chat_agent
        async for event in chat_agent.astream_agent(
            prompt=prompt_text,
            history=context_msgs,
            model_override=selected_model
        ):
            if event.get("status") == "streaming":
                token_str = event.get("token", "")
                accumulated_response.append(token_str)
                yield f"event: chunk\ndata: {data_payload}\n\n"
```
- Trong kiến trúc của Starlette / FastAPI, khi trả về `StreamingResponse(sse_event_generator())`, tiến trình `sse_event_generator` chỉ tiếp tục chạy nếu socket kết nối với client còn mở.
- Khi người dùng đổi chat ở Frontend, trình duyệt đóng kết nối socket HTTP hoặc gửi tín hiệu reset TCP.
- Bộ máy máy chủ Uvicorn / Starlette phát hiện `client disconnected` (sự kiện `http.disconnect`) và phát sinh biệt lệ `asyncio.CancelledError` ngay tại lệnh `yield`.

#### B. Thao tác Lưu CSDL bị đặt sau vòng lặp generator
Tại dòng 241 – 249 của `chat.py`:
```python
        # <--- CHỈ ĐƯỢC CHẠY KHI VÒNG LẶP GENERATOR KẾT THÚC BÌNH THƯỜNG!
        # Lưu toàn bộ câu trả lời hoàn chỉnh vào CSDL
        final_text = "".join(accumulated_response).strip()
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, model_used)
            VALUES (?, ?, 'assistant', ?, ?)
            """,
            (assistant_msg_id, conversation_id, final_text, final_model_used)
        )
```
- Vì biệt lệ `CancelledError` xảy ra ngay trong khi đang `yield` giữa chừng, luồng thực thi bị ngắt tức thì.
- Đoạn mã `execute_commit("INSERT INTO messages...")` **hoàn toàn không bao giờ được chạm tới**!
- Bản ghi phản hồi của Assistant không hề được ghi vào bảng `messages` trong CSDL SQLite.
- Do đó, khi người dùng quay lại cuộc trò chuyện, truy vấn `SELECT * FROM messages WHERE conversation_id = ?` chỉ trả về tin nhắn của người dùng mà không có bất kỳ tin nhắn phản hồi nào từ Assistant.

---

## 4. Bảng Ma Trận Tác Động & Hậu Quả

| Thành Phần | Trạng Thái Lỗi (Fault State) | Hậu Quả Thực Tế |
| :--- | :--- | :--- |
| **Dữ Liệu Người Dùng** | Tin nhắn Assistant bị mất 100% | Người dùng mất nội dung câu trả lời, buộc phải gõ lại prompt từ đầu. |
| **Chi Phí API & Quota** | LLM Provider (Google / OpenAI) đã tiêu tốn token nhưng không lưu lại kết quả | Người dùng bị trừ hạn ngạch (hoặc phát sinh chi phí API) mà không nhận được giá trị. |
| **Hệ Thống Đồ Thị Project** | `chat_through_project` bị hủy tương tự tại dòng 1015 của `projects.py` | Kiểm thử canvas bị đứt quãng, không đánh giá được kết quả pipeline đồ thị khi chuyển cửa sổ. |
| **UX & Niềm Tin Người Dùng** | Hệ thống tạo cảm giác mong manh, thiếu ổn định | Người dùng có cảm giác "phải ngồi canh" màn hình chat cho đến khi mô hình gõ xong chữ cuối cùng. |

---

## 5. Kết Luận Nguyên Nhân Gốc Rễ

> **KẾT LUẬN KIẾN TRÚC:**
> Hiện tượng gián đoạn suy luận không phải do lỗi của mô hình AI, mà xuất phát từ **sự phụ thuộc chặt chẽ (tight-coupling) giữa kết nối mạng HTTP tạm thời của Client với Tiến trình sinh suy luận và Lưu trữ dữ liệu lâu dài của Backend**.
> 
> Để khắc phục triệt để, kiến trúc bắt buộc phải chuyển đổi sang mô hình:
> 1. **Backend**: Tách rời tiến trình suy luận thành **Background Detached Task (`asyncio.create_task`)** có vòng đời độc lập với socket client, đảm bảo luôn lưu kết quả vào DB dù client có ngắt kết nối.
> 2. **Frontend**: Chuyển quản lý active streams sang **Global Stream Store** theo cấu trúc `Record<conversation_id, StreamSession>` để việc chuyển đổi giao diện chỉ là thay đổi viewport hiển thị mà không hủy luồng stream ngầm.

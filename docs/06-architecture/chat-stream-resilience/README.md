# KIẾN TRÚC DUY TRÌ TIẾN TRÌNH SUY LUẬN & CHỐNG GIÁN ĐOẠN HỘI THOẠI
## (CHAT STREAM RESILIENCE & BACKGROUND INFERENCE PERSISTENCE)
### Mã Kiến Trúc: `ARCH-STREAM-RESILIENCE` | Trạng Thái: `APPROVED-ARCHITECTURE` | Phiên Bản: `1.0.0`

---

## 1. Giới Thiệu & Tuyên Bố Bài Toán (Problem Statement)

Trong hệ thống AI-Chan, người dùng gặp phải hiện tượng nghiêm trọng trong trải nghiệm sử dụng:
> *"Khi người dùng tạo một cuộc hội thoại mới và gửi prompt tới mô hình AI, nhưng vô tình bấm chuyển sang một cuộc trò chuyện khác (hoặc chuyển trang), quy trình suy luận của cuộc hội thoại đang chạy lập tức bị dừng lại. Chỉ cần thoát khỏi màn hình chat đó thì mô hình sẽ ngừng suy luận, và khi quay trở lại thì toàn bộ câu trả lời bị biến mất hoặc không được lưu trữ."*

Hồ sơ kiến trúc này cung cấp phân tích toàn diện từ chuyên gia **Senior BA + System Architect + Solution Architect**:
1. **Phân tích nguyên nhân gốc rễ (Root Cause Analysis)** từ mã nguồn thực tế ở cả hai đầu Frontend (Next.js) và Backend (FastAPI + Starlette SSE).
2. **Thiết kế kiến trúc giải pháp chuẩn công nghiệp (Solution Architecture)** dựa trên mô hình **Detached Asynchronous Task** và **Global Multi-Session Stream Store**.
3. **Biểu đồ trực quan hóa (Diagrams)** so sánh luồng lỗi hiện tại (*As-Is*) và luồng kiến trúc khắc phục triệt để (*To-Be*).
4. **Kế hoạch triển khai kỹ thuật (Implementation Roadmap)** từng bước cho lập trình viên fullstack.

---

## 2. Mục Tiêu Thiết Kế (Architectural Goals)

| Mã Mục Tiêu | Tên Mục Tiêu | Tiêu Chí Đo Lường Cụ Thể |
| :--- | :--- | :--- |
| **`GOAL-RES-01`** | **Bảo Toàn Tiến Trình Suy Luận (Zero-Loss Inference)** | Khi client ngắt kết nối (chuyển tab, chuyển chat, refresh trang), tiến trình sinh của LLM trên Backend **không bị hủy** mà vẫn tiếp tục chạy độc lập trong nền và tự động lưu kết quả vào CSDL SQLite. |
| **`GOAL-RES-02`** | **Tự Do Điều Hướng (Non-Blocking Navigation)** | Người dùng có thể thoải mái chuyển đổi giữa các conversation, mở Canvas Project Editor, hoặc cấu hình Settings trong khi một hoặc nhiều model AI đang đồng thời suy luận ở các hội thoại khác nhau. |
| **`GOAL-RES-03`** | **Tự Động Tái Đồng Bộ (Seamless Catch-Up / Re-hydration)** | Khi người dùng quay trở lại conversation đang sinh dở, giao diện tức thì hiển thị nội dung đã tích lũy và tiếp tục stream các token mới nhất mà không cần tải lại toàn bộ trang. |
| **`GOAL-RES-04`** | **Kiểm Soát Hạn Ngạch & Chi Phí (Deterministic Quota Accounting)** | Dù người dùng thoát giữa chừng, lượng token LLM thực tế đã sinh ra vẫn được tính toán và trừ vào hạn ngạch chính xác, không gây thất thoát hoặc tính trùng lặp. |
| **`GOAL-RES-05`** | **Nút Dừng Chủ Động (Explicit User Cancellation)** | Mô hình chỉ ngừng suy luận khi người dùng bấm nút **Stop** một cách có chủ đích (gửi tín hiệu hủy tường minh lên Backend). |

---

## 3. Bản Đồ Tài Liệu Trong Phân Hệ

```
docs/architecture/chat-stream-resilience/
├── README.md                  # Tổng quan kiến trúc & tuyên bố bài toán (Tài liệu này)
├── root-cause-analysis.md     # Phân tích nguyên nhân gốc rễ (Evidence-based Trace)
├── solution-architecture.md   # Thiết kế giải pháp phân tầng (Backend & Frontend Decoupling)
├── diagrams.md                # Biểu đồ Sequence As-Is vs To-Be & State Machine
└── implementation-plan.md     # Lộ trình triển khai chi tiết từng bước & Test Plan
```

---

## 4. Tóm Tắt Giải Pháp Kiến Trúc (Architecture Executive Summary)

```
+-------------------------------------------------------------------------------------------------------+
| KIẾN TRÚC HIỆN TẠI (AS-IS FLUID-COUPLED) - GÂY LỖI DỪNG SUY LUẬN                                      |
+-------------------------------------------------------------------------------------------------------+
|  User Clicks Conv B  -->  Frontend React State Wiped  -->  HTTP SSE Socket Dropped                    |
|                                                                     |                                 |
|                                                                     v (Client Disconnect)             |
|                                                     FastAPI Cancels SSE Generator                     |
|                                                     --> LLM Stream Aborted Mid-Flight                 |
|                                                     --> DB INSERT IS NEVER REACHED (Data Lost!)       |
+-------------------------------------------------------------------------------------------------------+

                                                    |
                                    RE-ARCHITECTED INTO (TO-BE)
                                                    v

+-------------------------------------------------------------------------------------------------------+
| KIẾN TRÚC MỚI (TO-BE DECOUPLED ASYNC INFERENCE & RE-ATTACHMENT) - HOÀN TOÀN BẢO TOÀN DỮ LIỆU         |
+-------------------------------------------------------------------------------------------------------+
|  1. BACKEND DETACHED TASK (ADR-017):                                                                  |
|     FastAPI spawn asyncio.create_task() độc lập khỏi kết nối HTTP SSE của client.                     |
|     -> Client disconnect KHÔNG làm dừng Task. Task chạy ngầm đến khi xong và luôn commit vào DB.      |
|                                                                                                       |
|  2. FRONTEND GLOBAL MULTI-SESSION STORE (ADR-018):                                                    |
|     Toàn bộ luồng stream được quản lý tại Global Zustand Store (Session Map theo conversation_id).   |
|     -> Chuyển đổi chat chỉ thay đổi "Active Viewport", luồng stream của chat cũ vẫn nhận dữ liệu ngầm.|
|     -> Quay lại chat cũ: Dữ liệu hiển thị tức thì, tiếp tục cập nhật thời gian thực.                  |
+-------------------------------------------------------------------------------------------------------+
```

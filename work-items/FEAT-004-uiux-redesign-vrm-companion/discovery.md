# Discovery — FEAT-004

## FACTS
1. Codebase frontend sử dụng Next.js 15.5 App Router, React 19, TypeScript 5.6 và Zustand 5.0.
2. Chưa có thư viện 3D nào được cài đặt trước đó; chúng ta đã cài đặt thành công `three` (0.170+) và `@pixiv/three-vrm` (2.1+).
3. Backend sử dụng FastAPI với các API v1: `/api/v1/auth`, `/api/v1/conversations`, `/api/v1/models`, `/api/v1/prompts`, `/api/v1/projects`, `/api/v1/users`.
4. Trang `/chat` chứa toàn bộ logic xử lý hội thoại, streaming SSE qua `/api/v1/conversations/{id}/messages/stream`, quản lý danh sách thread, và đổi tên/xóa thread.
5. Mô hình VRM sample thật `ai-chan.vrm` (12 MB) đã được tải vào thư mục `ai-frontend/public/models/ai-chan.vrm`.
6. Toàn bộ 87 bài test backend đang pass 100%.

## ASSUMPTIONS
1. Người dùng chạy ứng dụng trên trình duyệt hỗ trợ WebGL 2.0 (Chrome, Edge, Firefox, Safari hiện đại).
2. Khi WebGL không khả dụng hoặc file VRM bị lỗi, hệ thống cần có cơ chế graceful fallback hiển thị artwork và thông báo trạng thái thay vì gây crash.

## OPEN QUESTIONS
- Không có câu hỏi chặn (blocker). Thiết kế concept trực quan đã được cung cấp chi tiết qua hình ảnh đính kèm.

## CURRENT STATE
- Giao diện cũ của `/chat` và `/` mang phong cách dark palette cơ bản với màu tím/xanh indigo, chưa có nhận diện Anime Minimalism đặc trưng, chưa có nhân vật 3D VRM, và chưa có chế độ Companion Mode.

## EXTERNAL SYSTEMS
- WebGL Context của trình duyệt.
- Multi-provider LLM (Gemini, OpenAI qua backend AI Gateway).

## CONSTRAINTS
- Tuân thủ quy tắc lazy senior dev (Ponytail): Tái sử dụng tối đa logic hội thoại, streaming và API client hiện có, không viết lại code thừa.
- Đảm bảo việc chuyển đổi giữa Workspace Mode và Companion Mode giữ nguyên trạng thái hội thoại, nội dung nhập dở dang và model đang chọn.
- Xử lý dọn dẹp WebGL (`dispose()`) khi unmount để tránh rò rỉ tài nguyên GPU.

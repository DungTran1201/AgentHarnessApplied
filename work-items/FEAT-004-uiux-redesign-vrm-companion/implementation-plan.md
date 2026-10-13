# Implementation Plan — FEAT-004

> This file is a project work-item wrapper. The primary Antigravity planning artifact is created with `/plan`.

## Goal
Tái thiết kế toàn diện UI/UX của AI-Chan theo phong cách Anime Minimalism × Technical AI Workspace, tích hợp mô hình 3D VRM tương tác thời gian thực, hỗ trợ chế độ kép Workspace Mode và Companion Mode mà không làm mất trạng thái hội thoại.

## Approved Design
- Hệ màu chuẩn: Background `#0E0F1B`, Surface `#171821`, Elevated Surface `#1F1B2B`, Primary `#A78BFA`, Secondary `#8B5CF6`, Accent `#C4B5FD`.
- Header tinh gọn: logo AI-Chan, pill switch Workspace/Companion Mode, theme toggle, avatar và window controls.
- Sidebar bên trái: nút "+ New Chat", tìm kiếm, điều hướng chính, danh sách Recent Chats phân nhóm Pinned / Today, và thẻ quote AI-Chan dễ thương.
- Central Workspace: Welcome view với 4 action cards khởi đầu, thread chat phân tách rõ ràng user/assistant, markdown + code copy, generating status card và Message Composer cố định đáy màn hình.
- Integrated VRM: Three.js WebGL canvas kết hợp `@pixiv/three-vrm` tải mô hình `ai-chan.vrm`, đồng bộ trạng thái AI (`idle`, `thinking`, `speaking`, `success`, `error`), panel AI-Chan Status hiển thị model, temperature, token sparkline và quick tools.
- Companion Mode: Sân khấu 3D toàn cảnh làm trung tâm, floating chat panel, camera controls và biểu cảm tương tác.

## Files / Components
1. `ai-frontend/src/app/globals.css`: Cập nhật bảng màu, design tokens, animations, scrollbar và typography.
2. `ai-frontend/src/components/vrm/VRMViewer.tsx`: WebGL 3D Canvas, OrbitControls, ánh sáng lavender/navy, quản lý vòng đời VRM.
3. `ai-frontend/src/components/vrm/vrmController.ts`: Animation state machine điều khiển thở, chớp mắt, khẩu hình nói (lip-sync), biểu cảm (`idle`, `thinking`, `speaking`, `success`, `error`).
4. `ai-frontend/src/components/chat/DesktopHeader.tsx`: Header ứng dụng desktop với switcher Workspace/Companion.
5. `ai-frontend/src/components/chat/Sidebar.tsx`: Sidebar điều hướng, New chat, danh sách cuộc trò chuyện Pinned/Today, thẻ quote.
6. `ai-frontend/src/components/chat/AIChanStatusPanel.tsx`: Panel trạng thái kỹ thuật của AI-Chan, telemetry token sparkline, quick tools.
7. `ai-frontend/src/components/chat/MessageComposer.tsx`: Khung soạn thảo tin nhắn bo tròn tinh tế, chọn model, lavender glow khi focus.
8. `ai-frontend/src/components/chat/CompanionStage.tsx`: Giao diện Companion Mode 3D toàn cảnh với điều khiển camera và floating chat.
9. `ai-frontend/src/app/chat/page.tsx`: Tích hợp các component thành trải nghiệm Hybrid Workspace / Companion hoàn chỉnh với zero-loss state persistence.
10. `ai-frontend/src/app/page.tsx`: Cung cấp đường dẫn vào Workspace ngay từ root với trải nghiệm đồng nhất.

## Dependency Order
1. Cập nhật `globals.css` (design tokens).
2. Xây dựng core 3D module `vrmController.ts` và `VRMViewer.tsx`.
3. Xây dựng các UI components con (`DesktopHeader`, `Sidebar`, `AIChanStatusPanel`, `MessageComposer`).
4. Tích hợp trải nghiệm Workspace & Companion trong `chat/page.tsx`.
5. Cập nhật root page `page.tsx` và đồng bộ tài liệu kiến trúc.

## Tests
- TypeScript type checking: `npx tsc --noEmit`.
- Next.js production build: `npm run build`.
- Backend regression test: `pytest` (87 tests).
- Project documentation and model validation: `python tools/validators/run_all.py`.

## Rollback
- Giữ bản lưu của file cũ hoặc revert qua git nếu phát sinh lỗi nghiêm trọng.

## Approval
- Approved theo quy trình R2 và yêu cầu trực tiếp từ người dùng.

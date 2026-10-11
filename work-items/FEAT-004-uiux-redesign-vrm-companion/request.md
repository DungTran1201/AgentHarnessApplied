# Change Request — FEAT-004

## User Request
Nâng cấp giao diện toàn diện cho hệ thống trợ lý ảo AI-Chan theo phong cách Anime Minimalism kết hợp Technical AI Workspace và 3D VRM Companion dựa trên concept đã duyệt:
- Chuyển đổi linh hoạt giữa Workspace Mode (tập trung công việc) và Companion Mode (tương tác trực quan 3D).
- Tích hợp mô hình 3D VRM thực thụ với Three.js và `@pixiv/three-vrm` (idle breathing, blinking, speaking lip-sync, expression triggers).
- Chuẩn hóa hệ thống Design Tokens và bảng màu Anime Minimalism (Background `#0E0F1B`, Surface `#171821`, Elevated `#1F1B2B`, Primary `#A78BFA`, Secondary `#8B5CF6`).
- Bố cục desktop cao cấp với Sidebar, Central Chat Workspace, Message Composer, và AI-Chan Status Panel.
- Bảo toàn 100% chức năng hiện có: authentication, conversations CRUD, SSE streaming chat, project workflows, model selector, prompt library, settings.

## Desired Outcome
- Ứng dụng desktop AI-Chan hiện đại, thẩm mỹ anime tinh tế và trải nghiệm AI chuyên nghiệp.
- Nhân vật 3D VRM hoạt động mượt mà, phản hồi đồng bộ với trạng thái hội thoại và suy luận AI.
- Không phát sinh lỗi regression trên backend và frontend.

## Change Type
- Feature (UI/UX Redesign & 3D Web Integration)

## Risk Tier
- R2 (Thay đổi kiến trúc UI/UX, thêm engine 3D WebGL, cấu trúc layout mới)

## Scope
- Chuẩn hóa CSS design tokens trong `ai-frontend/src/app/globals.css`.
- Xây dựng component 3D VRM Viewer độc lập, an toàn, hỗ trợ dọn dẹp WebGL (`VRMViewer.tsx`, `vrmController.ts`).
- Tạo layout Desktop chuẩn concept gồm Header, Sidebar đa năng, Workspace & Composer, AI-Chan Status Panel.
- Triển khai chế độ Companion Mode 3D toàn cảnh với floating chat và camera controls.
- Cập nhật tài liệu kỹ thuật, requirements model và state diagram.

## Non-Goals
- Thay đổi schema CSDL backend hoặc các API REST endpoints.
- Loại bỏ các trang nghiệp vụ đã có (`/settings`, `/projects`, `/prompts`, `/login`, `/register`).
- Xây dựng thế giới game 3D thế giới mở (chỉ tập trung stage 3D companion tinh tế).

# 02. KIỂM KÊ CHỨC NĂNG & MA TRẬN RANH GIỚI (FEATURE INVENTORY & BOUNDARY MATRIX)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-INV-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Phân Loại Tình Trạng Tính Năng (Classification Matrix)

Hệ thống phân định rõ 4 nhóm tính năng để đảm bảo tính minh bạch giữa hiện trạng thực tế và đặc tả đề xuất mới:

| Mã Tính Năng | Tên Tính Năng | Phân Loại | Bằng Chứng / Mô Tả Hiện Trạng | Mục Tiêu Nâng Cấp Trong MVP |
| :--- | :--- | :--- | :--- | :--- |
| `FEAT-PE-001` | Tạo & Quản lý Project | **FACT** | Bảng `projects`, trang `/projects`, API CRUD trong `projects.py`. | Giữ nguyên, không làm thay đổi vòng đời và bảng CSDL. |
| `FEAT-PE-002` | Project Canvas Editor Cơ Bản | **FACT** | Trang `/projects/[id]/editor/page.tsx`, kéo thả 3 node cơ bản. | Giữ cơ chế kéo thả, cập nhật palette và validation engine. |
| `FEAT-PE-003` | Quản lý Thư Viện System Prompt | **FACT** | Bảng `system_prompts`, trang `/prompts`, API `/api/v1/system-prompts`. | Cung cấp danh sách System Prompt khả dụng cho Project Editor nạp vào catalog. |
| `FEAT-PE-004` | Node Catalog 4 Nhóm Accordion | **PROPOSED** | Hiện tại sidebar chỉ là danh sách phẳng hardcode 3 node (`web_input`, `model`, `output`). | Tách thành 4 nhóm có thể thu gọn/mở rộng: `Input`, `System Prompt`, `Model`, `Output`. |
| `FEAT-PE-005` | Tìm Kiếm & Lọc Node Catalog | **PROPOSED** | Hiện chưa có thanh tìm kiếm hoặc bộ lọc trong sidebar editor. | Thanh search theo tên/mô tả + bộ lọc nhóm (Filter pills/dropdown). |
| `FEAT-PE-006` | Nạp Động Danh Sách System Prompt Vào Catalog | **PROPOSED** | Hiện chưa có kết nối giữa Project Editor và `/api/v1/system-prompts`. | Nạp danh sách prompt của user, hiển thị dưới nhóm `System Prompt`. |
| `FEAT-PE-007` | System Prompt Node Trên Canvas | **PROPOSED** | Hiện `GraphNode.type` chỉ có `web_input`, `model`, `output`. | Bổ sung node type `system_prompt`, lưu tham chiếu `prompt_id`. |
| `FEAT-PE-008` | Cạnh Nối Hướng Dẫn `System Prompt → Model` | **PROPOSED** | Hiện chỉ có kết nối `web_input → model` và `model → output`. | Cho phép tạo cạnh từ cổng ra của System Prompt Node vào cổng chỉ dẫn của Model Node. |
| `FEAT-PE-009` | Graph Validation Hỗ Trợ System Prompt | **CHANGE** | Backend và Frontend hiện bắt cứng `len(nodes) == 3 && len(edges) == 2`. | Cho phép graph 3 node (không prompt) hoặc 4 node (có prompt nối vào Model). Chặn cạnh sai ngữ nghĩa. |
| `FEAT-PE-010` | Phân Giải Prompt & Nạp Vào Chat Request | **PROPOSED** | Hiện `chat_through_project` chỉ lấy `target_model_id` và gọi LLM với prompt mặc định. | Backend trích xuất `prompt_id` từ graph, truy vấn DB lấy nội dung prompt, truyền vào `system_instruction` của LLM request. |
| `FEAT-PE-011` | Tương Thích Ngược Project Cũ | **CHANGE** | Các project cũ chỉ có 3 node `web_input → model → output`. | Bảo toàn 100% khả năng lưu, mở và chat của project cũ mà không bắt buộc có System Prompt. |

---

## 2. Các Tính Năng Ngoài Phạm Vi (Out-Of-Scope For MVP)

Các tính năng sau đây được **xác định rõ ràng là nằm ngoài phạm vi MVP** nhằm giữ cho thiết kế tinh gọn, tránh phình to kiến trúc:

| Mã OOS | Tính Năng Loại Trừ | Lý Do Loại Trừ Khỏi MVP | Định Hướng Giai Đoạn Sau (Future Considerations) |
| :--- | :--- | :--- | :--- |
| `OOS-01` | Skills, Tools, Function Calling, MCP Nodes | Kiến trúc hiện tại là LLM Chat Harness; chưa có agentic tool execution framework hoàn chỉnh. | Xem xét khi phát triển phân hệ Multi-tool Agent. |
| `OOS-02` | RAG, Vector Search, Web Browsing Nodes | Đòi hỏi hạ tầng Vector Database, Embedding Pipeline và Web Scraping phức tạp. | Xem xét trong Phase 2 RAG Knowledge Integration. |
| `OOS-03` | Điều Kiện (Router/Condition), Rẽ Nhánh, Vòng Lặp | Graph engine hiện tại là Directed Acyclic Graph (DAG) có hướng đơn giản; không hỗ trợ luồng logic phức tạp. | Nâng cấp khi xây dựng Workflow Engine hoàn chỉnh. |
| `OOS-04` | Multi-Agent Orchestration & Subflows | Vượt quá phạm vi một Project đơn lẻ. | Phát triển phân hệ Orchestration độc lập. |
| `OOS-05` | Nối Nhiều System Prompt Vào Cùng Một Model (Multi-Prompt Merge) | Gây phức tạp về thứ tự ưu tiên, xung đột chỉ dẫn và token limits. | Baseline MVP: Tối đa 1 System Prompt Node nối vào 1 Model Node (`0..1`). |
| `OOS-06` | Prompt Marketplace & Đánh Giá Tự Động A/B Testing | Không thuộc yêu cầu vận hành cốt lõi của Project Editor. | Bổ sung sau khi có cộng đồng người dùng lớn. |
| `OOS-07` | Real-time Collaboration (CRDTs / WebSocket Canvas) | Single-user editing hiện tại là đủ; tránh phát sinh chi phí hạ tầng. | Tích hợp sau qua WebSocket/Yjs. |

---

## 3. Ma Trận Tác Nhân (Actor Matrix)

| Tác Nhân (Actor) | Vai Trò & Thẩm Quyền Trong Phân Hệ | Điểm Tương Tác Chính |
| :--- | :--- | :--- |
| **Người Dùng Đăng Nhập (Authenticated User)** | Chủ sở hữu Project và Thư viện Prompt cá nhân. Có toàn quyền tạo, cấu hình, liên kết prompt và chat với Project của mình. | Giao diện Project Editor, Thư viện Prompt, Web Chat. |
| **Khách Vãng Lai (Guest User)** | Sử dụng tài khoản `guest_user` mặc định để trải nghiệm Project Editor và chat thử nghiệm mà không cần đăng nhập. | Giao diện Project Editor, Web Chat. |
| **AI Model Provider (Gemini / OpenAI / Claude / Groq)** | Hệ thống ngoại vi nhận request từ Backend AI-Chan, xử lý suy luận LLM dựa trên `system_instruction` và `user_message`. | REST / SSE API của Provider. |
| **System Runtime & Validation Engine** | Tầng xử lý logic backend: thẩm định graph, xác thực quyền truy cập, phân giải nội dung prompt và stream phản hồi SSE. | FastAPI Controllers, SQLite DB. |

---

## 4. Ma Trận Phụ Thuộc Kỹ Thuật (Dependency Matrix)

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  Thư Viện System Prompt         │       │  Danh Mục Model Registry         │
│  - GET /api/v1/system-prompts   │       │  - GET /api/v1/models            │
│  - DB: system_prompts           │       │  - DB: models                    │
└────────────────┬────────────────┘       └────────────────┬─────────────────┘
                 │ (Cung cấp Prompt items)                 │ (Cung cấp Model items)
                 ▼                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Project Editor (Canvas & Catalog)                       │
│  - 4 Nhóm Accordion: Input | System Prompt | Model | Output               │
│  - Toolbar: Search & Category Filter                                       │
│  - Typed Edges: Input->Model, SystemPrompt->Model, Model->Output           │
│  - PUT /api/v1/projects/{id}/graph (Lưu cấu trúc JSON Graph)               │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ (Graph Data đã được validate)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Chat Execution Runtime (Backend)                        │
│  - POST /api/v1/projects/{id}/chat                                         │
│  - Phân giải Prompt Reference từ DB system_prompts                         │
│  - LangChain / LangGraph Adapter: SystemMessage + HumanMessage             │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ (SSE Stream)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       AI Model Provider (LLM API)                          │
└────────────────────────────────────────────────────────────────────────────┘
```

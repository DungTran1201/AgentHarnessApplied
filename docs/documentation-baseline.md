# Bản Khóa Hồ Sơ Kỹ Thuật Dự Án (Documentation Baseline)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Baseline | Chi Tiết |
| :--- | :--- |
| **Dự Án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã Baseline** | `BASELINE-V1.0-COMPLETE` |
| **Ngày Khóa Baseline** | 2026-10-07 |
| **Trạng Thái Quản Trị** | **`LOCKED & APPROVED`** |
| **Vai Trò Chịu Trách Nhiệm** | Documentation Orchestrator, Senior BA, Solution Architect, QA Documentation Lead |
| **Trạng Thái Lập Trình (Coding)**| **`NOT STARTED`** |

---

## 1. Tuyên Bố Phạm Vi Hệ Thống (Scope & Boundaries)

### 1.1. Phạm Vi Triển Khai Trong Baseline (In-Scope MVP)
1. **Xác thực & Phiên làm việc**:
   - Đăng ký tài khoản người dùng bằng Email và Mật khẩu bảo mật (`FR-001`, `UC-001`).
   - Đăng nhập xác thực và cấp phát HttpOnly Cookie chứa JWT token (`FR-002`, `UC-002`, `ADR-002`).
   - Đăng xuất an toàn và thu hồi phiên làm việc (`FR-003`, `UC-003`).
   - Xem thông tin tài khoản hiện hành (`FR-004`).
2. **Quản trị Cuộc trò chuyện (Conversation Threads)**:
   - Tạo mới cuộc trò chuyện với tiêu đề tự động hoặc tùy chỉnh (`FR-005`, `UC-004`).
   - Hiển thị danh sách lịch sử hội thoại có phân trang cursor (`FR-006`, `UC-004`).
   - Đổi tên tiêu đề cuộc trò chuyện (`FR-005`, `UC-005`).
   - Xóa cuộc trò chuyện và tự động dọn sạch tin nhắn liên kết (`FR-006`, `UC-006`).
3. **Trò chuyện Trợ lý Ảo Thời Gian Thực (Streaming Chat)**:
   - Gửi tin nhắn câu hỏi (Prompt) với giới hạn tối đa 4000 ký tự (`FR-007`, `FR-014`).
   - Truyền luồng câu trả lời thời gian thực qua Server-Sent Events (SSE) (`FR-013`, `ADR-004`).
   - Hiển thị bong bóng tin nhắn tức thì (Optimistic UI) và tự động cuộn thông minh (`UX-002`).
   - Hỗ trợ nút dừng sinh phản hồi (Stop Generation) (`UX-003`).
   - Render định dạng Markdown phong phú, cú pháp mã nguồn đa ngôn ngữ và nút sao chép mã (`UX-004`).
4. **Khả Năng Chịu Lỗi Cổng AI (Multi-Provider LLM Gateway)**:
   - Nhà cung cấp chính: Google Gemini 2.5 Flash (`PRIMARY`).
   - Nhà cung cấp dự phòng: OpenAI GPT-4o-mini (`FALLBACK`).
   - Tự động chuyển đổi dự phòng (Failover) khi gặp lỗi Quota/5xx (`FR-011`, `ADR-003`).
   - Duy trì ngữ cảnh trượt tối đa 20 tin nhắn gần nhất (`INV-04`).
5. **Hạ Tầng & Vận Hành Khép Kín**:
   - Đóng gói Docker Compose 5 dịch vụ: Nginx Ingress Gateway, Next.js Frontend, FastAPI Backend, PostgreSQL 16, Redis 7 (`DEP-001`).

### 1.2. Ngoài Phạm Vi Baseline (Out-of-Scope)
- Đăng nhập qua mạng xã hội (OAuth2 Google/GitHub).
- Cổng quản trị phân quyền đa cấp (Admin RBAC Dashboard).
- Tải lên tệp đính kèm đa phương tiện (File / Image upload).
- Trò chuyện thoại trực tiếp (Voice Chat / STT / TTS).

---

## 2. Chuỗi Truy Vết Kỹ Thuật Hoàn Chỉnh (End-to-End Traceability Chain)

Baseline thiết lập chuỗi truy vết 2 chiều bền vững và khép kín:

```
Business Goal
    ↓
Capability Model (CAP-AUTH, CAP-CONV, CAP-CHAT, CAP-AI, CAP-SEC)
    ↓
Requirements Baseline (FR-001..014, NFR-001..019, BR-001..006, SEC-001..005)
    ↓
Acceptance Criteria (AC-001..005)
    ↓
Business Process Models (PROC-001..010, BPMN, Swimlane)
    ↓
Use Case Specifications (UC-001..009)
    ↓
System Analysis & Context Boundaries
    ↓
Software Architecture (SAD C4, ADR-001..004)
    ↓
Domain Model & Business Invariants (DOM-001..004, INV-01..04)
    ↓
API Contracts & Integration Specs (API-001..008, OpenAPI 3.1.0)
    ↓
Behavioral Modeling (SEQ-001..004, STATE-001..003)
    ↓
Security Specifications & STRIDE Threat Model (THR-001..006, CTRL-001..006)
    ↓
User Experience & Interaction Specifications (UX-001..005)
    ↓
Test Strategy, Test Plan & Test Cases (TC-001..015)
    ↓
Deployment, Runbook, Monitoring & Self-Healing (DEP-001..002)
    ↓
Documentation Governance & Lifecycle Control (GOV-POL-001, DoD)
```

---

## 3. Tổng Hợp Các Quyết Định Kiến Trúc Đã Khóa (Accepted ADRs)

1. **[ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md)**: **FastAPI + Next.js + PostgreSQL** được phê duyệt là bộ khung công nghệ nền tảng.
2. **[ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md)**: Xác thực phiên làm việc độc quyền bằng **HttpOnly Cookie** chống hoàn toàn nguy cơ rò rỉ JWT qua XSS.
3. **[ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md)**: Cổng AI đa nhà cung cấp với **Google Gemini làm Primary** và **OpenAI GPT-4o-mini làm Fallback**.
4. **[ADR-004](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md)**: Giao thức truyền luồng thời gian thực chuẩn hóa bằng **Server-Sent Events (SSE)** qua HTTP POST.

---

## 4. Danh Mục Bàn Giao Của 15 Giai Đoạn (00 → 14)

| Giai Đoạn | Thư Mục Hồ Sơ | Mô Hình Canonical (`models/`) | Trạng Thái Bàn Giao |
| :--- | :--- | :--- | :--- |
| **Phase 00: Discovery** | `docs/00-discovery/` | `N/A` | **`APPROVED`** |
| **Phase 01: Planning** | `docs/01-planning/` | `N/A` | **`APPROVED`** |
| **Phase 02: Requirements** | `docs/02-requirements/` | `models/requirements/` | **`APPROVED`** |
| **Phase 03: Business Process** | `docs/03-business-process/` | `models/process/` | **`APPROVED`** |
| **Phase 04: Use Cases** | `docs/04-use-cases/` | `models/context/` | **`APPROVED`** |
| **Phase 05: System Analysis** | `docs/05-system-analysis/` | `models/context/` | **`APPROVED`** |
| **Phase 06: Architecture** | `docs/06-architecture/` | `models/architecture/` | **`APPROVED`** |
| **Phase 07: Domain** | `docs/07-domain/` | `models/domain/` | **`APPROVED`** |
| **Phase 08: API** | `docs/08-api/` | `models/api/api.yaml` | **`APPROVED`** |
| **Phase 09: Behavior** | `docs/09-behavior/` | `models/interaction/` | **`APPROVED`** |
| **Phase 10: Security** | `docs/10-security/` | `models/security/` | **`APPROVED`** |
| **Phase 11: UX** | `docs/11-ux/` | `models/ux/ux.yaml` | **`APPROVED`** |
| **Phase 12: Testing** | `docs/12-testing/` | `models/testing/testing.yaml` | **`APPROVED`** |
| **Phase 13: Operations** | `docs/13-operations/` | `models/deployment/deployment.yaml` | **`APPROVED`** |
| **Phase 14: Governance** | `docs/14-governance/` | `N/A` | **`APPROVED`** |

---

## 5. Bảng Phân Loại Minh Chứng & Giả Định (Fact / Assumption Register)

- **FACT**:
  - Hạ tầng Docker Compose có sẵn tại `ai-infra/compose/docker-compose.yml` gồm 5 container (`nginx-gateway`, `ai-frontend`, `ai-backend`, `postgres`, `redis`).
  - Giao thức truyền stream là Server-Sent Events (SSE).
  - Khóa phiên lưu trong HttpOnly Cookie để phòng vệ XSS.
- **ASSUMPTION**:
  - Hạn ngạch API của Google Gemini và OpenAI đủ để phục vụ lưu lượng người dùng giai đoạn thử nghiệm ban đầu.
  - Người dùng truy cập qua các trình duyệt hiện đại (Chrome, Edge, Firefox, Safari) hỗ trợ Fetch ReadableStream.
- **DECISION**:
  - Ngữ cảnh trượt tối đa 20 tin nhắn gần nhất (`INV-04`).
  - Giới hạn độ dài câu hỏi 4000 ký tự.
  - Phân trang hội thoại dùng cursor pagination.
- **OPEN QUESTION**:
  - Kế hoạch mở rộng sang cơ chế tìm kiếm ngữ nghĩa nâng cao (RAG / Vector Database) trong các phiên bản tiếp theo.

---

## 6. Trạng Thái Cổng Kiểm Soát Toàn Diện (Final Gate Sign-off)

- **Kiểm tra tự động (`run_all.py`)**: 0 lỗi cú pháp, 0 lỗi mô hình, 0 phát hiện truy vết mồ côi.
- **Definition of Done**: 100% tiêu chí đã được đáp ứng trọn vẹn.
- **Trạng thái sẵn sàng triển khai**: **`APPROVED FOR IMPLEMENTATION PLANNING`**.
- **Trạng thái lập trình (Coding Status)**: **`NOT STARTED`**.

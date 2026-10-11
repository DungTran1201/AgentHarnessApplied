# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-002: Nâng Cấp Kiến Trúc Chat Agent Với LangChain, LangGraph & Tải Khóa Động Từ .env

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-002` |
| **Loại Thay Đổi** | `refactor` / `architecture_enhancement` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc & kế hoạch) |
| **Ngày Đăng Ký** | 2026-10-08 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Sẵn sàng cho việc lập kế hoạch `/plan`)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU & SƠ ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)
- **Bối cảnh**: Hệ thống hiện tại sử dụng module tùy biến `LLMManager` trực tiếp bọc Google GenAI SDK và OpenAI SDK. Khi mở rộng sang nhiều nhà cung cấp (`Gemini`, `OpenAI`, `Anthropic`, `Groq`, `Ollama`), logic xử lý bắt lỗi và chuyển vùng thủ công gặp nhiều hạn chế về kiểm soát trạng thái đàm thoại và khả năng tích hợp công cụ (Tools) sau này.
- **Mục tiêu**: Chuẩn hóa tầng AI Orchestrator bằng hai framework **LangChain** và **LangGraph**:
  1. Tải adapter nhà cung cấp động dựa trên sự hiện diện của API Key trong file `.env`.
  2. Quản lý luồng xử lý và chuyển vùng dự phòng (Failover) bằng đồ thị trạng thái **StateGraph** của LangGraph.

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **EXTEND**: Thêm năng lực LangGraph StateGraph cho `COMP-003` và đăng ký `ADR-005`. |
| **Canonical Models** | `models/interaction/interactions.yaml` | `DIRECT` | **UPDATE**: Cập nhật tác nhân `SEQ-003` và `SEQ-004` sang LangGraph Agent Engine. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **UPDATE**: Cập nhật `FR-011` và `CAP-AI` thể hiện cơ chế điều phối LangGraph và tải key từ `.env`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/ADR-005-langchain-langgraph-agent.md` | `DIRECT` | **ADD**: Tạo mới bản ghi quyết định kiến trúc `ADR-005`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật bảng tổng hợp ADRs hệ thống. |
| **Phase 06: Architecture**| `docs/06-architecture/sad.md` | `DIRECT` | **UPDATE**: Cập nhật C4 Component View Level 3 và Tech Stack Rationale. |
| **Phase 09: Behavior** | `docs/09-behavior/sequence-diagrams.md` | `DIRECT` | **UPDATE**: Cập nhật kịch bản `SEQ-003` và `SEQ-004` với LangGraph StateGraph. |
| **Phase 14: Governance**| `docs/14-governance/adr-index.md` | `DIRECT` | **UPDATE**: Cập nhật mục lục ADRs. |
| **Diagrams (Component)** | `diagrams/component/component-architecture.md` | `DIRECT` | **UPDATE**: Cập nhật C4 Level 3 Component Mermaid với LangGraph StateGraph & EnvKeyLoader. |
| **Diagrams (Sequence)** | `diagrams/sequence/chat-stream-sequence.md` | `DIRECT` | **UPDATE**: Cập nhật luồng truyền nhận token qua LangGraph Agent. |
| **Diagrams (Sequence)** | `diagrams/sequence/failover-sequence.md` | `DIRECT` | **UPDATE**: Cập nhật luồng chuyển vùng dự phòng bằng Conditional Edge của LangGraph. |
| **Diagrams (BPMN)** | `diagrams/bpmn/ai-failover-bpmn.md` | `DIRECT` | **UPDATE**: Cập nhật sơ đồ BPMN `PROC-009` với StateGraph nodes và kiểm tra key `.env`. |

---

## 3. Ràng Buộc Kỹ Thuật Đã Tuân Thủ Nghiêm Ngặt (Hard Rules Adherence)
- [x] **NO CODING / NO SOURCE CODE CHANGES**: Tuyệt đối không thay đổi mã nguồn trong `ai-backend`, `ai-frontend`, `ai-infra`.
- [x] **NO REQUIREMENT INVENTION**: Kế thừa toàn bộ `FR-008..014`, `BR-005`, chỉ nâng cấp kiến trúc điều phối bên dưới.
- [x] **NO SILENT CONFLICT RESOLUTION / NO SILENT BEHAVIOR INVENTION**: Các trạng thái Node trong StateGraph phản ánh đúng quy tắc chuyển vùng của `BR-005` và `ADR-003`.
- [x] **NO DESTRUCTIVE DIAGRAM DELETION**: Không xóa tệp diagram nào; cập nhật tại chỗ (in-place update).
- [x] **NO DUPLICATE CANONICAL DIAGRAMS**: Giữ nguyên danh mục định danh sơ đồ chuẩn (`DIAG-COMP-001`, `DIAG-SEQ-002`, `DIAG-SEQ-003`, `DIAG-BPMN-004`).
- [x] **DOCUMENTATION IS THE SOURCE OF TRUTH**: Cập nhật canonical model YAML và docs trước, diagrams là hình chiếu phái sinh.

---

## 4. Kế Hoạch Tiếp Theo (Next Steps)
Khi người dùng chuyển sang giai đoạn Coding (Implementation Phase):
1. Chạy `/plan` để lập kế hoạch chi tiết cài đặt dependencies (`langchain`, `langgraph`, `langchain-google-genai`, `langchain-openai`).
2. Tái cấu trúc module `ai-backend/llm` sang StateGraph.
3. Chạy lại bộ test `test_api.py` và kiểm thử tích hợp.

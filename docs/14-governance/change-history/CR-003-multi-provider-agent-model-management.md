# CHANGE REQUEST CR-003: QUẢN LÝ AGENT & MÔ HÌNH ĐA NHÀ CUNG CẤP (MULTI-PROVIDER AGENT & MODEL MANAGEMENT)

---

| Thuộc Tính | Chi Tiết |
| :--- | :--- |
| **Mã Đề Xuất (CR ID)** | `CR-003` |
| **Tiêu Đề** | Xây dựng và đặc tả toàn diện phân hệ quản lý Agent & Mô hình từ nhiều nhà cung cấp (Google, Anthropic, OpenAI, Groq, Ollama) với cơ chế kích hoạt/hủy kích hoạt |
| **Ngày Tạo** | 2026-10-08 |
| **Tác Giả** | Antigravity AI Assistant |
| **Trạng Thái** | **APPROVED / BASELINED** |
| **Phân Loại Thay Đổi** | `feature` (Scope: requirements, architecture, domain, api, behavior, diagrams) |
| **Mức Độ Rủi Ro** | `R2` (Plan Review & Model Verification Required) |
| **Tài Liệu Căn Cứ** | `ADR-003`, `ADR-005`, `CR-002`, `AGENTS.md` |

---

## 1. Lý Do & Động Lực Thay Đổi (Motivation & Context)
Sau khi hoàn thiện kiến trúc điều phối Agent qua LangChain & LangGraph (`ADR-005`, `CR-002`), hệ thống có khả năng kết nối linh hoạt tới nhiều nhà cung cấp mô hình AI (Google Gemini, Anthropic Claude, OpenAI, Groq, Ollama). 

Tuy nhiên, người dùng và quản trị viên cần một giao diện chuẩn hóa và tập hợp API để:
1. Tra cứu danh mục các Agent/Mô hình hiện có trong hệ thống cùng các chỉ số năng lực (context window, latency, token limits).
2. Kiểm tra trực tiếp trạng thái kết nối (Health Check / Ping) tới API của từng nhà cung cấp từ khóa cấu hình trong `.env`.
3. Kích hoạt (`activate`) hoặc hủy kích hoạt (`deactivate`) các mô hình mà **không áp dụng cơ chế xóa cứng (Hard Deletion)**, bảo đảm tính toàn vẹn dữ liệu cho lịch sử các tin nhắn đã sinh (`model_used`) và cho phép tái kích hoạt tức thì khi cần.
4. Thiết lập mô hình mặc định và cấu hình thứ tự ưu tiên trong chuỗi chuyển vùng dự phòng (Failover Precedence).

---

## 2. Ràng Buộc Bắt Buộc (Hard Rules & Constraints)
- **Chính sách không xóa cứng**: Không hỗ trợ thao tác DELETE/Remove trên Agent Model. Thay vào đó, toàn bộ vòng đời được quản trị qua chuyển trạng thái `ACTIVE` <-> `INACTIVE` (`BR-012`).
- **Bất biến mô hình mặc định**: Hệ thống luôn phải duy trì tối thiểu 1 mô hình ở trạng thái `ACTIVE` làm mô hình mặc định (`BR-013`).
- **Kiểm tra thông tin xác thực trước khi kích hoạt**: Một mô hình chỉ có thể chuyển sang trạng thái `ACTIVE` nếu API Key tương ứng của nhà cung cấp đã được cấu hình trong `.env` và vượt qua bước kiểm tra kết nối (`BR-014`).
- **Tách biệt dữ liệu & tài liệu**: `models/` là nguồn sự thật chuẩn máy (canonical models); `docs/` là tài liệu chuẩn người đọc; `diagrams/` là các hình chiếu diễn giải sinh xuất.

---

## 3. Danh Mục Mã Định Danh Mới (Identifier Register)

| Loại Định Danh | Mã ID | Tên / Diễn Giải |
| :--- | :--- | :--- |
| **Functional Req** | `FR-021` | Danh Mục & Tra Cứu Agent Model Đa Nhà Cung Cấp |
| **Functional Req** | `FR-022` | Xem Chi Tiết Cấu Hình & Chỉ Số Năng Lực Model |
| **Functional Req** | `FR-023` | Kiểm Tra Kết Nối & Đo Độ Trễ Model (Ping / Health Check) |
| **Functional Req** | `FR-024` | Kích Hoạt Mô Hình Agent (Activate Model) |
| **Functional Req** | `FR-025` | Hủy Kích Hoạt Mô Hình Agent (Deactivate Model - Soft State) |
| **Functional Req** | `FR-026` | Thiết Lập Mô Hình Mặc Định & Ưu Tiên Định Tuyến |
| **Business Rule** | `BR-012` | Cấm Xóa Cứng Mô Hình - Quản Trị Bằng Trạng Thái (Soft Toggle) |
| **Business Rule** | `BR-013` | Bất Biến Mô Hình Mặc Định Hoạt Động (Default Model Invariant) |
| **Business Rule** | `BR-014` | Xác Thực Khóa Nhà Cung Cấp Khi Kích Hoạt |
| **Business Rule** | `BR-015` | Tự Động Hạ Cấp Trạng Thái Khi Lỗi Hạn Ngạch Kéo Dài |
| **Business Process**| `PROC-013` | Quản Lý Vòng Đời & Kích Hoạt Mô Hình Agent Đa Nhà Cung Cấp |
| **Use Case** | `UC-016` | Tra Cứu Danh Mục & Trạng Thái Mô Hình Agent |
| **Use Case** | `UC-017` | Xem Chi Tiết Cấu Hình & Chỉ Số Model |
| **Use Case** | `UC-018` | Kiểm Tra Kết Nối Mô Hình Agent (Ping / Test Model) |
| **Use Case** | `UC-019` | Kích Hoạt / Hủy Kích Hoạt Mô Hình Agent |
| **Use Case** | `UC-020` | Thiết Lập Mô Hình Mặc Định & Thứ Tự Định Tuyến |
| **ADR** | `ADR-006` | Kiến Trúc Quản Lý Vòng Đời & Danh Mục Mô Hình Agent Đa Nhà Cung Cấp |
| **API Operations** | `OP-010..015` | `/api/v1/models`, `/test`, `/activate`, `/deactivate`, `/default` |
| **Interaction** | `SEQ-005` | Kiểm Tra Kết Nối, Kích Hoạt & Định Tuyến Agent Model |
| **State Machine** | `STATE-004` | Vòng Đời Trạng Thái Mô Hình Agent (`INACTIVE`, `TESTING`, `ACTIVE`, `DEGRADED`) |

---

## 4. Kế Hoạch Đồng Bộ Hóa Tài Liệu (Documentation Synchronization Plan)
1. Thêm `ADR-006` vào `docs/06-architecture/ADR/` và cập nhật chỉ mục.
2. Cập nhật `models/requirements/requirements.yaml`, `models/domain/domain.yaml`, `models/api/api.yaml`, `models/interaction/interactions.yaml`, `models/architecture/architecture.yaml`.
3. Bổ sung `FR-021` đến `FR-026` vào `docs/02-requirements/functional-requirements.md`.
4. Bổ sung `BR-012` đến `BR-015` vào `docs/02-requirements/business-rules.md`.
5. Bổ sung `PROC-013` vào `docs/03-business-process/business-process-catalog.md`.
6. Bổ sung `UC-016` đến `UC-020` vào `docs/04-use-cases/use-case-catalog.md`.
7. Cập nhật `docs/06-architecture/sad.md` và `docs/07-domain/domain-model.md`.
8. Cập nhật `docs/08-api/api-specifications.md` và `docs/08-api/openapi.yaml`.
9. Cập nhật `docs/09-behavior/sequence-diagrams.md` và `docs/09-behavior/state-machines.md`.
10. Tạo các biểu đồ dẫn xuất: `diagrams/sequence/agent-management-sequence.md`, `diagrams/state/agent-model-state.md`, `diagrams/bpmn/agent-management-bpmn.md`, cập nhật `diagrams/component/component-architecture.md`.
11. Chạy bộ kiểm định `tools/validators/run_all.py` đạt 0 lỗi.

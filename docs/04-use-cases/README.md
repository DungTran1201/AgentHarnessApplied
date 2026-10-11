# KHÔNG GIAN PHÂN TÍCH CA SỬ DỤNG (USE CASE ANALYSIS SPACE)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Của Giai Đoạn (Phase Objective)
Thư mục `docs/04-use-cases/` là không gian tài liệu phân tích Ca sử dụng (**Use Case Analysis Space**) chính thức của dự án **AI-Chan Assistant**.

Giai đoạn Use Case Analysis giữ vai trò là cầu nối tương tác hành vi giữa Quy trình nghiệp vụ (Business Process) và Phân tích hệ thống (System Analysis):
```text
docs/02-requirements/ (Requirements Baseline: FR, NFR, BR, SEC, AC)
          │
          ▼
docs/03-business-process/ (Quy trình nghiệp vụ, Luồng Swimlane, BPMN)
          │
          ▼
docs/04-use-cases/ (Mô hình Ca Sử Dụng & Đặc tả Actor-Goal: Main, Alt, Exc) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/05-system-analysis/ (Khả năng hệ thống, Ranh giới phân tích, Trạng thái logic)
          │
          ▼
docs/06-architecture/ (Kiến trúc giải pháp, Cấu trúc thành phần & Triển khai)
```

### Nhiệm Vụ Trọng Tâm Của Phase Này:
1. **Chuyển hóa Quy trình thành Ca sử dụng hướng Mục tiêu (Actor-Goal Focus)**: Xác định rõ từng Actor muốn đạt được giá trị gì khi tương tác với hệ thống, thay vì chỉ liệt kê các hàm kỹ thuật hay API.
2. **Đặc tả kịch bản tương tác chuẩn hóa (Use Case Specifications)**: Mô tả chi tiết Điều kiện tiên quyết (Preconditions), Điều kiện thành công/thất bại (Postconditions), Kịch bản thành công chính (Main Success Scenario), Các luồng rẽ nhánh (Alternative Flows) và Luồng xử lý sự cố (Exception Flows).
3. **Ánh xạ Quy tắc nghiệp vụ & Tiêu chí chấp nhận**: Đảm bảo mọi ca sử dụng tuân thủ nghiêm ngặt các quy tắc `BR-001` đến `BR-006` và kiểm chứng được thông qua các kịch bản Given-When-Then (`AC-001` đến `AC-005`).
4. **Tuyệt đối KHÔNG Coding (Strict No-Coding Rule)**: Không thiết kế class, không thiết kế API endpoint, không thiết kế database schema, không sinh mã nguồn.

---

## 2. Nguồn Sự Thật & Trật Tự Ưu Tiên (Source of Truth Hierarchy)

1. **Nguồn Đầu Vào Chính (Primary Input)**: [docs/03-business-process/](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/) (Danh mục quy trình `BP-AUTH-001..BP-SEC-001`, luồng swimlane, BPMN và ma trận tác nhân).
2. **Nguồn Đầu Vào Thứ Cấp (Secondary Input)**: [docs/02-requirements/](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/) (Requirements Baseline, FRs, NFRs, BRs, ACs).
3. **Nguồn Tham Chiếu Bổ Sung**: [docs/01-planning/](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/) (Kế hoạch WBS, Capability Dependencies) và [docs/00-discovery/](file:///c:/Users/PC/Project/ai-chan/docs/00-discovery/).
4. **Quy tắc giải quyết mâu thuẫn**: Nếu có mâu thuẫn giữa cách hiểu Use Case và Requirements Baseline, `docs/02-requirements/` là nguồn thẩm quyền tối cao. Toàn bộ mâu thuẫn phải được ghi nhận dưới dạng `[CONFLICT]` tại [open-questions.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/open-questions.md).

---

## 3. Cấu Trúc Tài Liệu Trong Thư Mục (Document Inventory)

| Tên File | Vai Trò & Nội Dung Trọng Tâm |
| :--- | :--- |
| **[use-case-model.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-model.md)** | **Mô Hình Ca Sử Dụng Tổng Thể**: Ranh giới hệ thống, danh sách Actor, mục tiêu chính và quan hệ giữa các Use Case. |
| **[use-case-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-catalog.md)** | **Danh Mục Ca Sử Dụng**: Bảng tổng hợp các Use Case từ `UC-AUTH-001 [UC-001]` đến `UC-CHAT-002 [UC-009]`. |
| **[actor-model.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/actor-model.md)** | **Mô Hình Tác Nhân Đầy Đủ**: Định nghĩa `ACT-01` (Guest), `ACT-02` (User), và các External Actors (AI Providers). |
| **[use-case-matrix.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-matrix.md)** | **Ma Trận Phủ Sóng Tác Nhân**: Bảng đối chiếu Actor -> Use Case -> Goal -> Priority -> Process. |
| **[use-case-relationships.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-relationships.md)** | **Phân Tích Quan Hệ `<<include>>` và `<<extend>>`**: Giải trình cơ sở logic của các quan hệ phụ thuộc giữa các ca sử dụng. |
| **[use-case-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/use-case-traceability.md)** | **Ma Trận Truy Vết Hoàn Chỉnh**: Liên kết: Yêu cầu (`FR-###`) -> Quy trình (`BP-###`/`PROC-###`) -> Use Case (`UC-###`) -> Kịch bản AC. |
| **[acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)** | **Tiêu Chí Chấp Nhận Chi Tiết Cho Từng Use Case**: Đặc tả chuẩn Given-When-Then cho từng ca sử dụng. |
| **[business-rules-mapping.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/business-rules-mapping.md)** | **Ánh Xạ Quy Tắc Nghiệp Vụ Vào Ca Sử Dụng**: Bảng đối chiếu `BR-001` đến `BR-006` được thực thi tại các bước của Use Case nào. |
| **[gap-analysis.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/gap-analysis.md)** | **Phân Tích Lỗ Hổng Ca Sử Dụng**: Rà soát các mục tiêu tiềm năng bị khuyết thiếu so với quy trình và đề xuất giải pháp. |
| **[assumptions.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/assumptions.md)** | **Danh Mục Giả Định Tương Tác**: Ghi nhận các tiền đề về mặt trải nghiệm người dùng và môi trường vận hành. |
| **[open-questions.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/open-questions.md)** | **Sổ Theo Dõi Vấn Đề Chờ Làm Rõ**: Ghi nhận các câu hỏi nghiệp vụ và mâu thuẫn tài liệu chưa được phê duyệt. |
| **[specifications/](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/)** | **Thư Mục Đặc Tả Chi Tiết Ca Sử Dụng**: Chứa 9 tài liệu đặc tả đầy đủ cho từng Use Case độc lập. |
| **[diagrams/](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/diagrams/)** | **Thư Mục Sơ Đồ Ca Sử Dụng (Mermaid)**: Tổng quan và sơ đồ chi tiết theo từng phân hệ. |

---

## 4. Quy Ước Đặt Tên & Mã Định Danh (Conventions)

- **Định dạng mã Ca sử dụng**: Sử dụng mã kép chuẩn hóa: `UC-[DOMAIN]-[NUMBER] [UC-###]`:
  - Ví dụ: `UC-AUTH-001 [UC-001]`, `UC-CHAT-001 [UC-008]`.
  - Giúp bảo đảm tính ổn định khi kiểm tra bằng công cụ tự động (`tools/validators/validate_traceability.py`).
- **Nguyên tắc đặt tên**: Theo cấu trúc **Động từ + Cụm danh từ mục tiêu** (Verb + Goal-oriented Noun Phrase):
  - Chuẩn: *Đăng ký tài khoản*, *Xác thực đăng nhập*, *Gửi tin nhắn đàm thoại*.
  - Nghiêm cấm: *Nhấn nút gửi*, *Gọi API Gemini*, *Tạo bảng CSDL*.
- **Cấp độ mô hình hóa**: Tập trung tại cấp độ **User-Goal Level** (Mục tiêu của người dùng), không phân rã thành các subfunction kỹ thuật vụn vặt.

---

## 5. Hợp Đồng Chuyển Giao Dành Cho Giai Đoạn Kế Tiếp (Phase 05 System Analysis)

Giai đoạn **Phase 05 — System Analysis** sẽ sử dụng các đầu ra của Phase 04 làm căn cứ trực tiếp:
1. **Thiết lập System Capabilities**: Kế thừa toàn bộ danh mục Use Case để ánh xạ thành năng lực hệ thống logic.
2. **Mô hình hóa Trạng thái & Tương tác**: Sử dụng Main/Alternative/Exception flows trong các file [specifications/](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/) để xây dựng Sequence Diagrams và State Transition Machines.
3. **Thiết kế Domain Entity Boundaries**: Sử dụng Preconditions, Inputs, Outputs và Postconditions làm căn cứ xác định các đối tượng thực thể trong Domain Model.

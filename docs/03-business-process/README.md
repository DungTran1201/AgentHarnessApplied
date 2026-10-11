# KHÔNG GIAN PHÂN TÍCH QUY TRÌNH NGHIỆP VỤ (BUSINESS PROCESS ANALYSIS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Của Giai Đoạn (Phase Objective)
Thư mục `docs/03-business-process/` là không gian tài liệu phân tích quy trình nghiệp vụ (**Business Process Analysis Space**) chính thức của dự án **AI-Chan Assistant**.

Giai đoạn Business Process Analysis đóng vai trò là tầng chuyển tiếp logic sống còn trong pipeline phát triển:
```text
docs/02-requirements/ (Requirements Baseline: FR, NFR, BR, SEC, AC)
          │
          ▼
docs/03-business-process/ (Quy trình nghiệp vụ, Luồng tương tác, Swimlane, BPMN)  ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/04-use-cases/ (Đặc tả Ca Sử Dụng chi tiết: Actor-Goal Flows, Pre/Post-conditions)
          │
          ▼
docs/05-system-analysis/ & docs/06-architecture/ (Phân tích hệ thống & Thiết kế kiến trúc)
```

### Nhiệm Vụ Trọng Tâm Của Phase Này:
1. **Chuyển hóa Yêu cầu thành Luồng Vận hành**: Trả lời rõ ràng: Ai thực hiện? Trigger từ đâu? Trình tự diễn ra qua các tầng (Frontend -> Backend -> Database -> AI Provider) như thế nào? Điểm rẽ nhánh quyết định ở đâu? Khi nào thành công? Khi nào thất bại?
2. **Bảo đảm tính toàn vẹn (Completeness)**: Không chỉ vẽ luồng lý tưởng (Happy Path); bắt buộc phải mô tả đầy đủ Alternative Flows, Exception Flows, Decision Points, và Business Rules Mapping.
3. **Phát hiện lỗ hổng sớm (Gap Analysis)**: Tìm kiếm các khoảng trống yêu cầu, mâu thuẫn hoặc thiếu sót logic trước khi chuyển sang giai đoạn Use Case và Kiến trúc.
4. **Tuyệt đối KHÔNG Coding (Strict No-Coding Rule)**: Không viết mã nguồn, không thiết kế class, không tạo API implementation, không tạo DDL cơ sở dữ liệu.

---

## 2. Nguồn Sự Thật & Trật Tự Ưu Tiên (Source of Truth Hierarchy)

1. **Nguồn Đầu Vào Chính (Primary Input)**: [docs/02-requirements/](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/) (Requirements Baseline, FRs, NFRs, BRs, ACs đã được phê duyệt ở Phase 02).
2. **Nguồn Đầu Vào Thứ Cấp (Secondary Input)**: [docs/01-planning/](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/) (Kế hoạch phát triển, WBS, Capability Dependencies, Build Order).
3. **Nguồn Tham Chiếu Bổ Sung**: [docs/00-discovery/](file:///c:/Users/PC/Project/ai-chan/docs/00-discovery/) (Khảo sát cơ sở dữ liệu hiện hữu) và cấu trúc kiến trúc 3 tầng thực tế.
4. **Quy tắc giải quyết mâu thuẫn**: Nếu phát hiện mâu thuẫn giữa tài liệu cũ và `docs/02-requirements/`, nguồn `docs/02-requirements/` là tối thượng. Toàn bộ mâu thuẫn phải được ghi nhận dưới dạng `[CONFLICT]` tại [open-questions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/open-questions.md).

---

## 3. Cấu Trúc Tài Liệu Trong Thư Mục (Document Inventory)

| Tên File | Vai Trò & Nội Dung Trọng Tâm |
| :--- | :--- |
| **[process-model.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-model.md)** | **Mô Hình Khái Niệm Quy Trình Tổng Thể**: Bức tranh tổng quan các nhóm quy trình lõi, quy trình phụ trợ, ranh giới hệ thống và các đối tượng tham gia. |
| **[business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md)** | **Danh Mục Quy Trình Nghiệp Vụ (Catalog)**: Bảng đặc tả chuẩn hóa từng quy trình từ `BP-AUTH-001` đến `BP-SEC-001` kèm mã truy vết `PROC-001..010`. |
| **[process-hierarchy.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-hierarchy.md)** | **Cơ Cấu Phân Cấp Quy Trình**: Sơ đồ cây phân rã từ Domain -> Lĩnh vực nghiệp vụ -> Quy trình cấp 1, cấp 2. |
| **[actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md)** | **Mô Hình Tác Nhân & Làn Tương Tác (Lanes)**: Định nghĩa rõ ranh giới giữa Business Actor, System Components và External AI Services. |
| **[process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md)** | **Đặc Tả Luồng Chi Tiết Từng Quy Trình**: Trình tự từng bước: Main Flow, Alternative Flows, Decision Points và Final States. |
| **[process-dependencies.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-dependencies.md)** | **Quan Hệ Phụ Thuộc Quy Trình**: Sơ đồ Mermaid chỉ rõ quy trình nào là điều kiện tiên quyết (Prerequisite) của quy trình nào. |
| **[process-states.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-states.md)** | **Vòng Đời Trạng Thái Nghiệp Vụ (Lifecycle States)**: Mô hình hóa trạng thái của Account, Conversation, Message và AI Request. |
| **[business-rules-mapping.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-rules-mapping.md)** | **Ánh Xạ Quy Tắc Nghiệp Vụ Vào Quy Trình**: Bảng đối chiếu các quy tắc `BR-001` đến `BR-006` được thực thi tại các bước quy trình nào. |
| **[process-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-traceability.md)** | **Ma Trận Truy Vết Quy Trình**: Liên kết chặt chẽ: Requirement (`FR-###`) -> Capability -> Business Process (`BP-###`/`PROC-###`) -> Acceptance Criteria. |
| **[exception-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/exception-flows.md)** | **Phân Tích Xử Lý Ngoại Lệ & Sự Cố**: Đặc tả cách ứng phó khi AI timeout, cạn kiệt quota, rò rỉ IDOR, vi phạm rate limit. |
| **[gap-analysis.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/gap-analysis.md)** | **Phân Tích Lỗ Hổng & Điểm Khuyết**: Phát hiện các điểm thiếu sót logic nghiệp vụ giữa Requirements và Vận hành thực tế. |
| **[assumptions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/assumptions.md)** | **Danh Mục Giả Định Quy Trình**: Ghi nhận các tiền đề vận hành nghiệp vụ. |
| **[open-questions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/open-questions.md)** | **Sổ Theo Dõi Vấn Đề Chờ Làm Rõ & Mâu Thuẫn**: Nơi lưu giữ các câu hỏi nghiệp vụ và mâu thuẫn tài liệu cần giải quyết. |
| **[diagrams/](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/diagrams/)** | **Thư Mục Sơ Đồ Trực Quan**: Tập hợp các sơ đồ Swimlane và BPMN logic bằng Mermaid cho từng quy trình trọng điểm. |

---

## 4. Hướng Dẫn Sử Dụng Dành Cho Giai Đoạn Kế Tiếp (Phase 04 Use Cases)

Kỹ sư hoặc Agent thực hiện giai đoạn **Phase 04 — Use Case Analysis** sẽ sử dụng các đầu ra của thư mục này như sau:
1. **Chuyển đổi Quy trình thành Ca sử dụng**: Mỗi Business Process trong `business-process-catalog.md` sẽ là căn cứ trực tiếp để xây dựng Use Case tương ứng (`BP-AUTH-001` -> `UC-AUTH-01`, `BP-CHAT-001` -> `UC-CHAT-01`...).
2. **Kế thừa các Luồng nhánh & Ngoại lệ**: Sử dụng `process-flows.md` và `exception-flows.md` để viết chi tiết các kịch bản phụ (Extension/Alternative Paths) và kịch bản ngoại lệ của Use Case Specification mà không cần phải đoán mò.
3. **Kế thừa Điều kiện Ràng buộc**: Sử dụng `business-rules-mapping.md` để điền chính xác trường Special Requirements và Business Rules trong Use Case Spec.

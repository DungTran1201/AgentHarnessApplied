# 10. CÂU HỎI MỞ & ĐÁNH GIÁ SẴN SÀNG TRIỂN KHAI (OPEN QUESTIONS & IMPLEMENTATION READINESS)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-10` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner & Architecture Board)` |
| **Vai Trò Phụ Trách** | Solution Architect & Lead BA |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Bảng Đăng Ký Các Vấn Đề Còn Mở & Quyết Định Cần Xác Nhận (Open Questions Register)

Dưới đây là các câu hỏi thiết kế cần sự phê duyệt chính thức từ Product Owner trước khi bước vào giai đoạn viết mã sản phẩm (Implementation Phase). Mỗi câu hỏi đều đi kèm đề xuất mặc định của nhóm kiến trúc để không làm gián đoạn tiến độ:

| Câu Hỏi ID | Nội Dung Vấn Đề Cần Quyết Định | Các Phương Án Xem Xét | Đề Xuất Mặc Định (Default Recommendation) | Mức Độ Tác Động (Impact Level) | Trạng Thái Phê Duyệt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OQ-SPM-01** | **Vị trí hiển thị trên giao diện người dùng:** Nên đặt phân hệ System Prompt thành một trang riêng `/prompts` hay tích hợp thành một Tab bên trong `/settings`? | **A**: Trang độc lập `/prompts` (như `/projects`).<br>**B**: Một tab mới trong `/settings`. | **Chọn Option A: Trang độc lập `/prompts`**<br>Lý do: Không gian viết prompt dài cần diện tích màn hình lớn, tạo sự tương xứng về cấp độ tài nguyên cấu hình với Projects. | **Trung bình** (Ảnh hưởng cấu trúc điều hướng) | `Proposed / Needs PO Approval` |
| **OQ-SPM-02** | **Giới hạn số lượng System Prompt tối đa trên mỗi người dùng:** Có nên áp đặt hạn ngạch (Quota limit, ví dụ: tối đa 50 prompts/user) hay không giới hạn? | **A**: Giới hạn tối đa 50 prompts/user.<br>**B**: Giới hạn tối đa 100 prompts/user.<br>**C**: Không giới hạn trong MVP. | **Chọn Option B: Giới hạn tối đa 100 prompts/user**<br>Lý do: Đủ lớn cho nhu cầu sử dụng cá nhân, đồng thời ngăn chặn việc tạo tài nguyên vô hạn làm phình to CSDL SQLite. | **Thấp** (Ràng buộc nghiệp vụ) | `Proposed / Needs PO Approval` |
| **OQ-SPM-03** | **Cơ chế nạp dữ liệu mẫu (Seed Data) cho người dùng mới:** Có nên tự động gieo sẵn 2-3 System Prompt mẫu kinh điển khi người dùng mới khởi tạo tài khoản? | **A**: Tự động gieo sẵn 2 mẫu (Python Expert, Business Analyst).<br>**B**: Để danh sách trống rỗng hoàn toàn. | **Chọn Option A: Tự động gieo sẵn 2 mẫu**<br>Lý do: Giúp người dùng mới hiểu ngay công dụng của System Prompt mà không cần tự nghĩ ra nội dung mẫu ban đầu. | **Thấp** (Trải nghiệm người dùng) | `Proposed / Needs PO Approval` |
| **OQ-SPM-04** | **Tính năng Nhân bản System Prompt (Clone / Duplicate):** Có đưa tính năng Nhân bản prompt vào phạm vi triển khai ngay trong MVP hay dời sang v1.1? | **A**: Triển khai ngay trong MVP (Should Have).<br>**B**: Dời sang v1.1. | **Chọn Option A: Đưa vào MVP nếu còn thời gian**<br>Lý do: Nghiệp vụ nhân bản cực kỳ đơn giản (chỉ là 1 câu lệnh INSERT SELECT), mang lại giá trị cao cho người dùng muốn chỉnh sửa biến thể prompt. | **Thấp** (Phạm vi công việc) | `Proposed / Needs PO Approval` |

---

## 2. Tiêu Chuẩn Sẵn Sàng Triển Khai (Definition of Ready - DoR)

Trước khi chuyển giao bộ tài liệu này cho đội ngũ Lập trình viên (Developers) để bắt đầu viết code sản phẩm, toàn bộ các tiêu chí sau phải đạt trạng thái **`PASSED`**:

- [x] **DoR-01 (Scope & Boundary Defined):** Ranh giới phân hệ rõ ràng, tách biệt hoàn toàn việc lưu trữ tài nguyên Prompt với Canvas Project Builder và Chat Runtime.
- [x] **DoR-02 (Stable Identifiers):** Toàn bộ các yêu cầu, tính năng, use case, quy tắc nghiệp vụ, rủi ro và test case đều có mã định danh ổn định (`SPM-F-xxx`, `SPM-FR-xxx`, `SPM-BR-xxx`, `SPM-TC-xxx`).
- [x] **DoR-03 (Acceptance Criteria Testable):** Mọi yêu cầu đều có tiêu chí nghiệm thu cụ thể, có thể kiểm thử tự động, không có câu chữ mơ hồ chung chung.
- [x] **DoR-04 (Security & Access Controls Confirmed):** Cưỡng chế Anti-IDOR ở tầng Backend, kiểm soát Safe Rendering chống Stored XSS, chính sách Redaction không ghi log nội dung nhạy cảm.
- [x] **DoR-05 (Data Schema & API Contract Frozen):** Bản DDL Migration CSDL SQLite và Pydantic/TypeScript contract được định nghĩa chi tiết, có kiểu dữ liệu, ràng buộc độ dài và mã lỗi chuẩn.
- [x] **DoR-06 (Diagrams Validated):** Toàn bộ 12 biểu đồ Mermaid có cú pháp hợp lệ, đồng bộ tên thực thể và thông điệp với tài liệu đặc tả.
- [x] **DoR-07 (Zero Code Impact In Discovery):** Không có dòng mã nguồn sản phẩm hay migration CSDL nào bị can thiệp trái phép trong giai đoạn khảo sát và đặc tả.

---

## 3. Tiêu Chuẩn Hoàn Thành Giai Đoạn Tài Liệu (Definition of Done - DoD for Documentation)

Bộ hồ sơ tài liệu đặc tả được xác nhận hoàn thành đầy đủ khi đáp ứng 100% các điều kiện:

- [x] Khảo sát codebase hiện trạng đầy đủ, lập bảng Gap Analysis chi tiết và xác thực bằng chứng trong repository.
- [x] Phân loại rõ ràng giữa Bằng chứng thực tế (FACT), Giả định (ASSUMPTION), Quyết định (DECISION) và Câu hỏi mở (OPEN QUESTION).
- [x] Bộ 11 tài liệu đặc tả chuyên sâu được hoàn thiện đầy đủ tại thư mục `docs/features/system-prompt-management/`.
- [x] Ma trận truy vết xuyên suốt (Traceability Matrix) kết nối 1-1 giữa Requirements -> Use Cases -> UI -> API -> Data -> Diagrams -> Test Cases.
- [x] Không còn mâu thuẫn giữa các tài liệu về chính sách xóa (Hard Delete), quy tắc tính duy nhất (Unique per user), hoặc dung lượng giới hạn (10.000 ký tự).
- [x] Tài liệu cập nhật lên canonical model layer (`models/`) để bảo toàn nguồn sự thật duy nhất cho các Agent trong hệ thống.

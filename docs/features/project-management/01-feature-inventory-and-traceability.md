# 01. BẢNG KIỂM KÊ TÍNH NĂNG VÀ MA TRẬN TRUY VẾT (FEATURE INVENTORY & TRACEABILITY)
## Nhánh Tính Năng: Quản Lý Project (Project Management MVP)
### Hệ Thống: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-PRJ-01` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst & QA Engineer |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Danh Mục Chủ Thể & Phân Quyền (Actors & Role-Based Permissions)

| Mã Actor | Tên Chủ Thể | Định Danh Vai Trò | Quyền Hạn Trong Phân Hệ Project |
| :--- | :--- | :--- | :--- |
| **ACT-01** | **Khách Vãng Lai (Guest)** | Người dùng chưa đăng nhập | Có quyền xem danh sách và tạo mới project trải nghiệm Visual Workflow Canvas mà không cần đăng nhập tài khoản trước (Guest mode). |
| **ACT-02** | **Người Dùng Đã Đăng Ký (Registered User)** | Người dùng sở hữu tài khoản hợp lệ | Có toàn quyền CRUD đối với các Project do chính mình tạo ra (`Ownership Invariant`). Xem danh sách project của mình, kéo-thả cấu hình graph, quản lý trạng thái (`active`, `stop`, `deactive`), chọn project active từ Trang Chủ để trò chuyện. |
| **ACT-03** | **Quản Trị Viên (Admin)** | Người dùng có quyền quản trị hệ thống | Kế thừa toàn bộ quyền của Registered User; có thêm quyền quản lý danh mục Model Catalog (`/api/v1/models`), cấu hình hạn ngạch hệ thống `MAX_ACTIVE_PROJECTS`, theo dõi telemetry tài nguyên. |
| **ACT-04** | **Hệ Thống (System / Scheduler)** | Tiến trình tự động nền | Thực thi kiểm tra tính hợp lệ của graph, kiểm tra trạng thái hoạt động của Model Provider, thực thi giới hạn hạn ngạch khi có request đồng thời, giải phóng tài nguyên. |

---

## 2. Bảng Kiểm Kê Tính Năng Chi Tiết (Feature Inventory)

### Nhóm A: Quản Lý Thông Tin Project (Project Information Management)
| Mã Tính Năng | Tên Tính Năng | Mức Độ Ưu Tiên | Actor | Mô Tả Tóm Tắt |
| :--- | :--- | :--- | :--- | :--- |
| **PRJ-F-001** | Xem danh sách Project của người dùng | **MUST-HAVE** | Guest & Registered User | Hiển thị danh sách toàn bộ các project thuộc quyền sở hữu của người dùng hiện tại (hoặc tài khoản khách mặc định), bao gồm Tên, Mô tả, Trạng thái (`active`, `stop`, `deactive`), Số lượng node, Thời gian cập nhật gần nhất. |
| **PRJ-F-002** | Tạo mới Project cơ bản | **MUST-HAVE** | Guest & Registered User | Mở modal/form tạo project, nhập Tên (bắt buộc, 1-100 ký tự) và Mô tả (tùy chọn, tối đa 500 ký tự). **Không yêu cầu xác thực tài khoản** khi tạo mới. Khởi tạo project ở trạng thái `stop` với canvas trống hoặc mẫu mặc định. |
| **PRJ-F-003** | Xem chi tiết và Tải cấu hình Project | **MUST-HAVE** | Registered User | Truy cập vào màn hình chi tiết/editor của project, tải toàn bộ metadata và cấu trúc graph đã lưu để hiển thị lên canvas. |
| **PRJ-F-004** | Cập nhật thông tin Project (Tên & Mô tả) | **MUST-HAVE** | Registered User | Cho phép người dùng đổi tên hoặc mô tả của project trong màn hình editor hoặc danh sách. |
| **PRJ-F-005** | Lưu cấu trúc Graph và Cấu hình Node | **MUST-HAVE** | Registered User | Lưu toàn bộ tọa độ node, liên kết edge và cấu hình chi tiết của từng node vào cơ sở dữ liệu. Tự động kích hoạt kiểm tra tính hợp lệ (Validation). |
| **PRJ-F-006** | Xóa Project (Soft Delete) | **SHOULD-HAVE** | Registered User | Cho phép người dùng chuyển project vào trạng thái `DELETED`. Tự động giải phóng slot quota nếu project đang ở trạng thái `active`. |

### Nhóm B: Visual Project Builder (Node-Based Canvas Editor)
| Mã Tính Năng | Tên Tính Năng | Mức Độ Ưu Tiên | Actor | Mô Tả Tóm Tắt |
| :--- | :--- | :--- | :--- | :--- |
| **PRJ-F-007** | Hiển thị Canvas và Thanh Công Cụ Node Palette | **MUST-HAVE** | Registered User | Màn hình canvas trực quan hỗ trợ Pan, Zoom, Reset View, Lưới nền (Grid), và thanh công cụ bên trái chứa 3 loại node khả dụng (`Web Input`, `Model`, `Output`). |
| **PRJ-F-008** | Kéo-Thả Node vào Canvas (Drag & Drop) | **MUST-HAVE** | Registered User | Kéo thẻ node từ danh sách bên trái thả vào vùng canvas. Giới hạn mỗi loại node chỉ được xuất hiện tối đa 1 lần trong canvas MVP. |
| **PRJ-F-009** | Chọn Node và Mở Bảng Cấu Hình (Config Drawer) | **MUST-HAVE** | Registered User | Khi click chọn một node trên canvas, hiển thị Drawer/Panel bên phải chứa các trường cấu hình đặc thù của loại node đó. |
| **PRJ-F-010** | Cấu hình Web Input Node (`max_words`) | **MUST-HAVE** | Registered User | Cấu hình số từ tối đa (`max_words`, mặc định 500 từ, giới hạn từ 10 đến 4000 từ) mà người dùng được phép nhập từ giao diện chat. |
| **PRJ-F-011** | Cấu hình Model Node (Chọn Model & Tham số) | **MUST-HAVE** | Registered User | Chọn Model từ danh sách các mô hình đang `ACTIVE` trong Model Catalog; cấu hình tham số `temperature` (0.0 - 2.0), `max_tokens` (256 - giới hạn model). Hiển thị cảnh báo nếu model thiếu API key. |
| **PRJ-F-012** | Cấu hình Output Node | **MUST-HAVE** | Registered User | Cấu hình tiêu đề phản hồi, định dạng hiển thị markdown, chế độ streaming hiển thị. |
| **PRJ-F-013** | Tạo và Xóa Kết Nối (Edges / Handles) | **MUST-HAVE** | Registered User | Kéo dây kết nối từ cổng xuất (`source`) sang cổng nhập (`target`). Chỉ cho phép nối theo chiều: `Web Input → Model` và `Model → Output`. Cho phép click vào cạnh để xóa kết nối. |
| **PRJ-F-014** | Kiểm tra tính hợp lệ của Graph tại Client (Pre-Validation) | **MUST-HAVE** | Registered User | Kiểm tra trực quan ngay trên UI: Đủ 3 node, kết nối đúng thứ tự, tham số đã điền đầy đủ. Hiển thị badge trạng thái hợp lệ/lỗi trên thanh tiêu đề editor. |
| **PRJ-F-015** | Cảnh báo thoát khi có thay đổi chưa lưu (Unsaved Changes Guard) | **SHOULD-HAVE** | Registered User | Khi người dùng cố rời khỏi trang editor trong lúc canvas có thay đổi chưa lưu, hiển thị hộp thoại xác nhận hủy bỏ hoặc tiếp tục lưu. |

### Nhóm C: Quản Lý Trạng Thái & Hạn Ngạch (State & Quota Management)
| Mã Tính Năng | Tên Tính Năng | Mức Độ Ưu Tiên | Actor | Mô Tả Tóm Tắt |
| :--- | :--- | :--- | :--- | :--- |
| **PRJ-F-016** | Kích hoạt Project (`stop` / `deactive` → `active`) | **MUST-HAVE** | Registered User | Chuyển trạng thái project sang `active`. Hệ thống kiểm tra graph hợp lệ và kiểm tra số lượng project đang active có nhỏ hơn `MAX_ACTIVE_PROJECTS`. |
| **PRJ-F-017** | Tạm dừng Project (`active` → `stop`) | **MUST-HAVE** | Registered User | Chuyển trạng thái project về `stop`. Project tạm thời không nhận chat mới từ Trang Chủ và giải phóng 1 slot trong hạn ngạch active quota. |
| **PRJ-F-018** | Vô hiệu hóa Project (`active` / `stop` → `deactive`) | **MUST-HAVE** | Registered User | Vô hiệu hóa rõ ràng project, ngăn chặn việc sử dụng ngẫu nhiên. Cần thao tác kích hoạt lại có chủ đích để sử dụng tiếp. |
| **PRJ-F-019** | Kiểm soát Hạn Ngạch và Ngăn Chặn Race Condition | **MUST-HAVE** | System / Backend | Đảm bảo tính nhất quán dữ liệu khi có nhiều request kích hoạt đồng thời (Concurrency Safety) bằng cơ chế Transaction / Atomic Conditional Update. |
| **PRJ-F-020** | Hiển thị Thông tin Quota trên Giao diện | **SHOULD-HAVE** | Registered User | Hiển thị số lượng slot active đang dùng (ví dụ: `2/3 Projects Active`) kèm thanh tiến trình trực quan trên giao diện danh sách project. |

### Nhóm D: Sử Dụng Project Từ Trang Chủ (Home Chat Integration)
| Mã Tính Năng | Tên Tính Năng | Mức Độ Ưu Tiên | Actor | Mô Tả Tóm Tắt |
| :--- | :--- | :--- | :--- | :--- |
| **PRJ-F-021** | Danh sách chọn Project khả dụng trên Trang Chủ | **MUST-HAVE** | Registered User | Trang Chủ hiển thị menu dropdown / carousel cho phép người dùng chọn nhanh một trong các Project đang ở trạng thái `active`. Các project `stop` hoặc `deactive` bị ẩn hoàn toàn. |
| **PRJ-F-022** | Thực thi luồng Chat qua Graph của Project | **MUST-HAVE** | Registered User | Khi người dùng gửi tin nhắn, hệ thống kiểm tra số từ theo `Web Input Node`, gọi LLM theo cấu hình `Model Node`, và định dạng kết quả phản hồi qua `Output Node` bằng Server-Sent Events (SSE). |
| **PRJ-F-023** | Xử lý lỗi ngoại lệ trong quá trình Chat qua Project | **MUST-HAVE** | Registered User | Xử lý các tình huống: tin nhắn vượt quá `max_words`, Model bị vô hiệu hóa sau khi project đã active, Provider gặp lỗi rate limit/timeout/thiếu key. |

---

## 3. Ma Trận Phân Bổ Phạm Vi (Scope Matrix: Must vs Should vs Out-of-Scope)

| Nhóm Phạm Vi | Danh Sách Mã Tính Năng | Trọng Tâm Triển Khai Trong MVP |
| :--- | :--- | :--- |
| **MUST-HAVE (Bắt Buộc Có Trong MVP)** | `PRJ-F-001`, `PRJ-F-002`, `PRJ-F-003`, `PRJ-F-004`, `PRJ-F-005`, `PRJ-F-007`, `PRJ-F-008`, `PRJ-F-009`, `PRJ-F-010`, `PRJ-F-011`, `PRJ-F-012`, `PRJ-F-013`, `PRJ-F-014`, `PRJ-F-016`, `PRJ-F-017`, `PRJ-F-018`, `PRJ-F-019`, `PRJ-F-021`, `PRJ-F-022`, `PRJ-F-023` | Toàn bộ luồng cốt lõi từ tạo project, kéo 3 node, validate, lưu, quản lý 3 trạng thái, quota an toàn, và chọn chat từ trang chủ. |
| **SHOULD-HAVE (Khuyến Nghị Cho MVP)** | `PRJ-F-006` (Soft delete), `PRJ-F-015` (Unsaved changes guard), `PRJ-F-020` (Quota indicator UI) | Tối ưu trải nghiệm lập trình viên và người dùng cuối, ngăn ngừa mất dữ liệu vô ý. |
| **OUT-OF-SCOPE (Không Thuộc MVP)** | Node rẽ nhánh (Router, Condition), Loop, Prompt Template Node riêng, Memory Node riêng, Skills/Tools/MCP Node, Web search/browsing, RAG/Vector DB, Export/Import file JSON, Marketplace chia sẻ project. | Dành cho các phiên bản tiếp theo (Phase 2 & Phase 3). |

---

## 4. Ma Trận Truy Vết Toàn Diện (End-to-End Traceability Matrix)

| Feature ID | Functional Req (FR) | Use Case (UC) | Business Rule (BR) | API Endpoint | UI Component | Sơ Đồ Minh Họa | Test Case (TC) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PRJ-F-001** | `PRJ-FR-001` | `PRJ-UC-001` | `PRJ-BR-001` | `GET /api/v1/projects` | `ProjectListPage`, `ProjectCard` | `PRJ-DIAG-UC-001` | `PRJ-TC-001` |
| **PRJ-F-002** | `PRJ-FR-002` | `PRJ-UC-002` | `PRJ-BR-002`, `PRJ-BR-003` | `POST /api/v1/projects` | `CreateProjectModal` | `PRJ-DIAG-SEQ-001` | `PRJ-TC-002`, `PRJ-TC-003` |
| **PRJ-F-003** | `PRJ-FR-003` | `PRJ-UC-003` | `PRJ-BR-001` | `GET /api/v1/projects/{id}` | `ProjectEditorPage` | `PRJ-DIAG-SEQ-001` | `PRJ-TC-004` |
| **PRJ-F-004** | `PRJ-FR-004` | `PRJ-UC-003` | `PRJ-BR-002` | `PATCH /api/v1/projects/{id}` | `ProjectHeaderBar` | `PRJ-DIAG-SEQ-001` | `PRJ-TC-005` |
| **PRJ-F-005** | `PRJ-FR-005` | `PRJ-UC-004` | `PRJ-BR-004`, `PRJ-BR-005`, `PRJ-BR-006` | `PUT /api/v1/projects/{id}/graph` | `SaveGraphButton`, `CanvasArea` | `PRJ-DIAG-SEQ-001`, `PRJ-DIAG-FLOW-001` | `PRJ-TC-006`, `PRJ-TC-007` |
| **PRJ-F-006** | `PRJ-FR-006` | `PRJ-UC-005` | `PRJ-BR-007` | `DELETE /api/v1/projects/{id}` | `DeleteProjectModal` | `PRJ-DIAG-STATE-001` | `PRJ-TC-008` |
| **PRJ-F-007** | `PRJ-FR-007` | `PRJ-UC-004` | `PRJ-BR-004` | N/A (Frontend Canvas) | `ProjectCanvas`, `NodeSidebar` | `PRJ-DIAG-WF-001` | `PRJ-TC-009` |
| **PRJ-F-008** | `PRJ-FR-008` | `PRJ-UC-004` | `PRJ-BR-004` | N/A (Frontend Canvas) | `CanvasDropZone` | `PRJ-DIAG-WF-001` | `PRJ-TC-010` |
| **PRJ-F-009** | `PRJ-FR-009` | `PRJ-UC-004` | N/A | N/A (Client State) | `NodeConfigDrawer` | `PRJ-DIAG-WF-001` | `PRJ-TC-011` |
| **PRJ-F-010** | `PRJ-FR-010` | `PRJ-UC-004` | `PRJ-BR-008` | `PUT /api/v1/projects/{id}/graph` | `WebInputConfigPanel` | `PRJ-DIAG-WF-001` | `PRJ-TC-012` |
| **PRJ-F-011** | `PRJ-FR-011` | `PRJ-UC-004` | `PRJ-BR-009`, `PRJ-BR-010` | `GET /api/v1/models` | `ModelConfigPanel`, `ModelSelector` | `PRJ-DIAG-WF-001` | `PRJ-TC-013`, `PRJ-TC-014` |
| **PRJ-F-012** | `PRJ-FR-012` | `PRJ-UC-004` | N/A | `PUT /api/v1/projects/{id}/graph` | `OutputConfigPanel` | `PRJ-DIAG-WF-001` | `PRJ-TC-015` |
| **PRJ-F-013** | `PRJ-FR-013` | `PRJ-UC-004` | `PRJ-BR-004`, `PRJ-BR-005` | N/A (Client Connection) | `CustomEdge`, `ConnectionLine` | `PRJ-DIAG-WF-001` | `PRJ-TC-016` |
| **PRJ-F-014** | `PRJ-FR-014` | `PRJ-UC-004` | `PRJ-BR-004`, `PRJ-BR-005`, `PRJ-BR-006` | `POST /api/v1/projects/{id}/validate` | `ValidationBadge`, `ErrorBanner` | `PRJ-DIAG-FLOW-001` | `PRJ-TC-017` |
| **PRJ-F-015** | `PRJ-FR-015` | `PRJ-UC-004` | N/A | N/A (Client History) | `UnsavedChangesModal` | N/A | `PRJ-TC-018` |
| **PRJ-F-016** | `PRJ-FR-016` | `PRJ-UC-006` | `PRJ-BR-011`, `PRJ-BR-012`, `PRJ-BR-013` | `POST /api/v1/projects/{id}/activate` | `StatusToggleSwitch` | `PRJ-DIAG-SEQ-002`, `PRJ-DIAG-STATE-001` | `PRJ-TC-019`, `PRJ-TC-020` |
| **PRJ-F-017** | `PRJ-FR-017` | `PRJ-UC-007` | `PRJ-BR-011`, `PRJ-BR-014` | `POST /api/v1/projects/{id}/stop` | `StatusToggleSwitch` | `PRJ-DIAG-STATE-001` | `PRJ-TC-021` |
| **PRJ-F-018** | `PRJ-FR-018` | `PRJ-UC-008` | `PRJ-BR-011`, `PRJ-BR-014` | `POST /api/v1/projects/{id}/deactivate`| `StatusToggleSwitch` | `PRJ-DIAG-STATE-001` | `PRJ-TC-022` |
| **PRJ-F-019** | `PRJ-FR-019` | `PRJ-UC-006` | `PRJ-BR-012`, `PRJ-BR-013` | `POST /api/v1/projects/{id}/activate` | Backend Transaction | `PRJ-DIAG-SEQ-002` | `PRJ-TC-023` |
| **PRJ-F-020** | `PRJ-FR-020` | `PRJ-UC-001` | `PRJ-BR-012` | `GET /api/v1/projects/quota` | `QuotaUsageBadge` | N/A | `PRJ-TC-024` |
| **PRJ-F-021** | `PRJ-FR-021` | `PRJ-UC-009` | `PRJ-BR-015` | `GET /api/v1/projects/active` | `HomeProjectSelector` | `PRJ-DIAG-SWIM-001` | `PRJ-TC-025` |
| **PRJ-F-022** | `PRJ-FR-022` | `PRJ-UC-009` | `PRJ-BR-008`, `PRJ-BR-015` | `POST /api/v1/projects/{id}/chat` | `ChatInputBox`, `ChatMessageView` | `PRJ-DIAG-SEQ-003`, `PRJ-DIAG-SWIM-001` | `PRJ-TC-026` |
| **PRJ-F-023** | `PRJ-FR-023` | `PRJ-UC-009` | `PRJ-BR-008`, `PRJ-BR-010` | `POST /api/v1/projects/{id}/chat` | `ChatErrorToast` | `PRJ-DIAG-SEQ-003` | `PRJ-TC-027`, `PRJ-TC-028` |

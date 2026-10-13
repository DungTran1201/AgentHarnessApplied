# PHÂN TÍCH PHỤ THUỘC GIỮA CÁC YÊU CẦU (REQUIREMENT DEPENDENCY ANALYSIS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `REQ-DEP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Chỉ rõ thứ tự phụ thuộc nhân quả và điều kiện tiên quyết giữa các Functional Requirements (FR), ngăn ngừa việc triển khai tính năng khi yêu cầu nền móng chưa sẵn sàng |

---

## 1. Sơ Đồ Phụ Thuộc Giữa Các Yêu Cầu Chức Năng (Requirement Flow Graph)

```mermaid
graph TD
    classDef auth fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef conv fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    classDef chat fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef ext fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    %% Authentication Cluster
    FR001["FR-001: User Registration"]:::auth
    FR002["FR-002: User Login & Session"]:::auth
    FR003["FR-003: User Logout"]:::auth

    %% Conversation Cluster
    FR004["FR-004: Create Conversation"]:::conv
    FR005["FR-005: List Conversation History"]:::conv
    FR006["FR-006: Rename Conversation"]:::conv
    FR007["FR-007: Delete Conversation"]:::conv
    FR012["FR-012: Data Isolation & IDOR Defense"]:::conv

    %% Chat & AI Cluster
    FR008["FR-008: Send Message & Validation"]:::chat
    FR009["FR-009: Receive AI Response & Markdown"]:::chat
    FR013["FR-013: Streaming Response Delivery"]:::chat
    FR014["FR-014: Message Token Accounting"]:::chat
    FR011["FR-011: Multi-Provider Failover"]:::chat
    FR010["FR-010: Select AI Model/Provider"]:::chat

    %% External
    EXT_AI["ACT-03: External AI Providers<br/>(Gemini / OpenAI API)"]:::ext

    %% Dependency Connections
    FR001 -->|Hard Dependency: Cần tài khoản để đăng nhập| FR002
    FR002 -->|Hard Dependency: Cần phiên đăng nhập để đăng xuất| FR003
    FR002 -->|Hard Dependency: BR-001 Bắt buộc xác thực để lưu phiên| FR004
    
    FR004 -->|Hard Dependency: Cần tạo phiên để xuất hiện trong lịch sử| FR005
    FR004 -->|Soft Dependency: Đổi tên trên phiên đã có| FR006
    FR004 -->|Hard Dependency: Cần phiên để thực hiện xóa| FR007
    FR004 -->|Hard Dependency: Cần conversation_id để gửi tin nhắn| FR008
    FR004 -.->|Security Guard: Kiểm tra quyền sở hữu BR-002| FR012

    FR008 -->|Hard Dependency: Cần prompt để AI sinh câu trả lời| FR009
    FR009 -->|Technical Dependency: Luồng truyền dữ liệu SSE| FR013
    FR009 -->|Technical Dependency: Trích xuất token usage sau khi sinh| FR014
    FR009 -->|Resilience Dependency: Chuyển vùng khi Gemini gặp sự cố| FR011
    FR008 -.->|Optional Dependency: Áp dụng model người dùng chọn| FR010

    EXT_AI ==> FR009
    EXT_AI ==> FR011
```

---

## 2. Bảng Phân Loại Chi Tiết Các Mối Quan Hệ Phụ Thuộc

| Yêu Cầu Đích (Target FR) | Yêu Cầu Tiên Quyết (Prerequisite FR) | Phân Loại Phụ Thuộc | Lý Do & Ràng Buộc Kỹ Thuật | Tác Động Nếu Bị Nghẽn |
| :--- | :--- | :---: | :--- | :--- |
| **FR-002** (Đăng nhập) | **FR-001** (Đăng ký) | **Hard Dependency** | Không thể xác thực nếu bảng người dùng chưa có tài khoản. | Không thể tạo phiên làm việc cho người dùng mới. |
| **FR-003** (Đăng xuất) | **FR-002** (Đăng nhập) | **Hard Dependency** | Chỉ có thể thu hồi phiên khi phiên làm việc đã được cấp phát. | Không phát sinh thao tác đăng xuất. |
| **FR-004** (Tạo Conversation) | **FR-002** (Đăng nhập) | **Hard Dependency** | Theo quy tắc `BR-001`, một cuộc trò chuyện bắt buộc phải gắn với một `user_id` đã xác thực. | Khách vãng lai không thể tạo và lưu cuộc trò chuyện trên hệ thống. |
| **FR-005** (Lịch sử Conversation)| **FR-004** (Tạo Conversation) | **Hard Dependency** | Danh sách lịch sử chỉ có dữ liệu khi đã có các cuộc trò chuyện được khởi tạo. | Danh sách Sidebar trống hoàn toàn. |
| **FR-006** (Đổi tên Conversation)| **FR-004** (Tạo Conversation) | **Soft Dependency** | Phải có đối tượng cuộc trò chuyện thì mới có thể cập nhật trường `title`. | Tiêu đề giữ nguyên mặc định là "Cuộc trò chuyện mới". |
| **FR-007** (Xóa Conversation) | **FR-004** (Tạo Conversation) | **Hard Dependency** | Chỉ có thể xóa một bản ghi khi bản ghi đó đã tồn tại trong cơ sở dữ liệu. | Không phát sinh thao tác xóa. |
| **FR-012** (Cách ly dữ liệu IDOR)| **FR-004**, **FR-002** | **Technical Security** | Bắt buộc kiểm tra `conversation.user_id == current_user.id` trước mọi thao tác. | Nguy cơ rò rỉ dữ liệu nhạy cảm chéo giữa các người dùng. |
| **FR-008** (Gửi tin nhắn) | **FR-004** (Tạo Conversation) | **Hard Dependency** | Mọi tin nhắn bắt buộc phải có khóa ngoại `conversation_id`. | Không thể lưu tin nhắn vào cơ sở dữ liệu. |
| **FR-009** (Nhận phản hồi AI) | **FR-008** (Gửi tin nhắn) | **Hard Dependency** | Mô hình AI cần nội dung prompt và ngữ cảnh của tin nhắn người dùng để sinh câu trả lời. | Trợ lý ảo không có đầu vào để xử lý. |
| **FR-013** (Streaming SSE) | **FR-009** (Nhận phản hồi AI) | **Technical Dependency**| Tầng giao tiếp mạng cần hỗ trợ giao thức truyền luồng Server-Sent Events / ReadableStream. | Giao diện phải chờ toàn bộ văn bản sinh xong mới hiển thị tĩnh. |
| **FR-014** (Đo lường Token) | **FR-009** (Nhận phản hồi AI) | **Technical Dependency**| Chỉ có thể ghi nhận số lượng token khi nhà cung cấp AI trả về siêu dữ liệu `usage_metadata`. | Không đo lường được chi phí của từng tin nhắn. |
| **FR-011** (Failover Dự phòng) | **FR-009**, External APIs | **External Resilience** | Khi Gemini trả về lỗi mã 429 hoặc timeout, khối failover cần kích hoạt gọi sang OpenAI. | Gián đoạn phản hồi nếu Gemini bị sập dịch vụ. |
| **FR-010** (Chọn Model) | **FR-008** (Gửi tin nhắn) | **Optional Dependency** | Nếu người dùng không chọn, hệ thống tự động gán model mặc định (Gemini Flash). | Tin nhắn luôn được xử lý bởi model mặc định. |

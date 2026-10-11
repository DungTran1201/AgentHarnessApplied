# ADR-009 — Kiến Trúc Mở Rộng Quản Lý Mô Hình, Thẩm Định Đột Biến, Tìm Kiếm & Bộ Lọc Đa Tiêu Chí (Extensible Agent Model Management, Mutation Validation, Fuzzy Search & Multi-Attribute Filtering Architecture)

Status: APPROVED

## Context
Trong phiên bản trước (`CR-003`, `ADR-006`), hệ thống AI-Chan đã thiết lập danh mục mô hình đa nhà cung cấp cơ bản được nạp tĩnh và hỗ trợ chuyển đổi trạng thái bật/tắt (`ACTIVE` / `INACTIVE`). Tuy nhiên, khi nhu cầu thử nghiệm và tích hợp các mô hình AI mới gia tăng nhanh chóng (Google Gemini, OpenAI, Claude, Groq, Ollama và các Custom API endpoints), hệ thống đối mặt với các thách thức:
1. **Thiếu khả năng mở rộng danh mục động**: Người dùng và quản trị viên không thể bổ sung thêm mô hình AI mới hoặc điều chỉnh tham số độ dài ngữ cảnh (`context_window`) và giới hạn token (`max_tokens`) trực tiếp từ giao diện.
2. **Khó khăn trong việc định vị mô hình**: Khi danh mục mô hình lên đến hàng chục phiên bản khác nhau, việc duyệt thủ công gây tốn thời gian; người dùng cần công cụ tìm kiếm tức thì và bộ lọc phân loại linh hoạt theo nhà cung cấp, trạng thái kích hoạt, tình trạng khóa API và mô hình mặc định.
3. **Rủi ro phá vỡ tính toàn vẹn hệ thống**: Nếu một mô hình đang được cấu hình làm mặc định bị xóa hoặc lưu trữ bất cẩn, toàn bộ luồng chat fallback và định tuyến mặc định sẽ bị đứt gãy. Đồng thời, việc xóa vật lý (hard delete) sẽ phá vỡ ràng buộc khóa ngoại với lịch sử tin nhắn (`messages`) và bản ghi đo lường (`api_metric_logs`).

## Decision
Hệ thống phê duyệt và áp dụng kiến trúc **Quản Lý Vòng Đời Mô Hình Mở Rộng, Thẩm Định Đột Biến Biên, Tìm Kiếm Lọc Đa Chiều và Lưu Trữ Mềm Có Bảo Vệ**:

1. **Tầng Đăng Ký & Hiệu Chỉnh Cấu Hình Mô Hình (Registration & Mutation Engine)**:
   - **Đăng ký mô hình mới (`POST /models`, `OP-022`, `FR-035`)**: Tiếp nhận cấu hình mô hình gồm `id`, `name`, `provider`, `context_window`, `max_tokens`, `supports_streaming`. Kiểm tra tính duy nhất toàn cục của mã định danh `id` (`BR-022`). Nếu trùng lặp, từ chối với mã HTTP `409 Conflict`.
   - **Thẩm định biên tham số (`BR-024`)**: Chặn cứng kiểm tra giới hạn an toàn: `context_window >= 1000` và `max_tokens >= 256`. Ngăn chặn việc cấu hình tham số âm hoặc quá nhỏ làm tê liệt trình sinh chuỗi của LLM.
   - **Hiệu chỉnh an toàn (`PUT /models/{id}`, `OP-023`, `FR-036`)**: Cho phép cập nhật tên hiển thị, các giới hạn tokens và cờ streaming. Áp dụng quy tắc bất biến (`BR-022`): tuyệt đối không cho phép thay đổi `id` và `provider` của mô hình đã tồn tại; nếu phát hiện payload cố ý thay đổi, từ chối với mã HTTP `400 Bad Request`.
   - **Phân quyền và bảo vệ an ninh (`SEC-010`, `CTRL-009`)**: Chỉ những yêu cầu đã xác thực có thẩm quyền mới được phép thực hiện mutation cấu hình mô hình nhằm ngăn chặn các hành vi giả mạo hoặc phá hoại dịch vụ.

2. **Tầng Tìm Kiếm Toàn Văn / Mờ & Bộ Lọc Đa Tiêu Chí (Search & Multi-Facet Filter Engine)**:
   - **Endpoint truy vấn chuyên dụng (`GET /models/search`, `OP-024`, `FR-037`, `FR-038`)**: Hỗ trợ các tham số truy vấn linh hoạt:
     - `q`: Từ khóa tìm kiếm toàn văn và tìm kiếm mờ (sub-string/token matching) so khớp đồng thời trên `name` và `id`.
     - `provider`: Sàng lọc theo nhà cung cấp (`GOOGLE`, `ANTHROPIC`, `OPENAI`, `GROQ`, `OLLAMA`).
     - `status`: Lọc theo trạng thái hoạt động (`ACTIVE`, `INACTIVE`, `DEGRADED`, `ARCHIVED`).
     - `has_api_key`: Lọc theo tình trạng sẵn sàng của khóa API từ biến môi trường máy chủ.
     - `is_default`: Lọc riêng mô hình đang được gán làm mặc định.
     - `sort`: Sắp xếp theo các tiêu chí: `latency_asc`, `context_desc`, `name_asc`, `created_desc`.
   - **Cam kết hiệu năng (`NFR-022`)**: Tối ưu hóa truy vấn bộ nhớ và chỉ mục cơ sở dữ liệu để toàn bộ thao tác tìm kiếm và lọc trả về kết quả trong thời gian $\le 200\text{ms}$.
   - **Trải nghiệm Client Debounce (`UX-008`)**: Trên giao diện Next.js, ô tìm kiếm được tích hợp bộ đệm thời gian debounce 300ms, giúp người dùng cảm nhận kết quả tức thì mà không gửi request dồn dập về máy chủ.

3. **Tầng Lưu Trữ Mềm & Chốt Chặn Mô Hình Mặc Định (Soft Archival & Default Protection Guard)**:
   - **Xóa mềm / Chuyển trạng thái lưu trữ (`DELETE /models/{id}`, `OP-025`, `FR-039`)**: Không bao giờ thực hiện xóa vật lý dòng dữ liệu khỏi bảng `agent_models`. Hệ thống cập nhật trường `status` sang `ARCHIVED`.
   - **Chốt chặn bất biến mô hình mặc định (`BR-023`)**: Trước khi thực hiện chuyển trạng thái sang `ARCHIVED`, hệ thống kiểm tra cờ `is_default`. Nếu mô hình đang là mô hình mặc định (`is_default = 1`), hệ thống từ chối yêu cầu ngay lập tức với mã HTTP `400 Bad Request` kèm thông báo: *"Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Hãy chỉ định một mô hình khác làm mặc định trước."*

4. **Tầng Đồng Bộ Bộ Định Tuyến Đàm Thoại (Router State Synchronization)**:
   - Khi mô hình chuyển sang trạng thái `ARCHIVED` hoặc `INACTIVE`, bộ nạp danh mục đàm thoại của LangChain / LangGraph sẽ tự động loại bỏ mô hình này khỏi danh sách cho phép chọn ở thanh soạn thảo của người dùng chat, bảo đảm 100% không xảy ra lỗi gọi API mô hình không khả dụng.

## Alternatives
1. *Xóa vật lý (Hard DELETE FROM agent_models)*: Phá vỡ tính toàn vẹn dữ liệu (Foreign Key Violation) với các tin nhắn cũ trong bảng `messages` và các bản ghi đo lường `api_metric_logs`. Do đó, xóa mềm (`status = ARCHIVED`) là giải pháp bắt buộc.
2. *Lọc hoàn toàn ở Client-side*: Tải toàn bộ danh mục mô hình về trình duyệt rồi lọc bằng JavaScript. Giải pháp này đơn giản khi số lượng mô hình ít, nhưng khi mở rộng ra hàng trăm mô hình hoặc khi cần bảo vệ thông tin kiểm tra khóa API thì lọc tại Server là an toàn và mở rộng tốt hơn.
3. *Sử dụng Elasticsearch / Meilisearch*: Tạo thêm phụ thuộc phức tạp vào hạ tầng tìm kiếm bên ngoài, không cần thiết cho quy mô danh mục mô hình vài trăm đối tượng.

## Rationale
- Đảm bảo tính mở rộng cao: Cho phép người dùng và hệ thống bổ sung mô hình linh hoạt mà không cần khởi động lại dịch vụ hoặc viết thêm code.
- Bảo vệ an toàn tuyệt đối tính toàn vẹn của hệ thống đàm thoại thông qua quy tắc bất biến ID và bảo vệ mô hình mặc định.
- Tối ưu hóa trải nghiệm người dùng với khả năng tìm kiếm và lọc tức thì.

## Consequences
- Bổ sung giá trị `ARCHIVED` vào tập trạng thái cho phép của thực thể `AgentModel` trong cơ sở dữ liệu và mô hình miền.
- Bổ sung 4 endpoints API mới (`OP-022` .. `OP-025`) vào bộ điều khiển quản lý mô hình `models.py`.
- Mở rộng giao diện quản lý mô hình `/models` với các thành phần tìm kiếm, bộ lọc lọc đa thuộc tính, hộp thoại thêm mô hình và sửa tham số.

## Related Requirements
`FR-035`, `FR-036`, `FR-037`, `FR-038`, `FR-039`, `NFR-022`, `BR-022`, `BR-023`, `BR-024`, `SEC-010`, `CTRL-009`, `UX-008`, `COMP-002`, `ADR-006`.

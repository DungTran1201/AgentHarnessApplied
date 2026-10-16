# 03 - Danh mục Toàn diện 32 Công cụ Ứng viên (Tool Catalog Specification)

## 1. Giới thiệu Danh mục

Danh mục dưới đây đặc tả chi tiết **32 công cụ ứng viên (Tool Candidates)** có giá trị sử dụng cao, được thiết kế chuyên biệt cho hệ sinh thái AI-Chan. Mỗi công cụ được định nghĩa với:
- **Định danh ổn định (Stable ID):** Tên định danh chuẩn cho việc gọi hàm của LLM (Snake_case, không đổi).
- **Phân loại (Category):** Thuộc 1 trong 4 nhóm nghiệp vụ.
- **Input & Output JSON Schema:** Ràng buộc tham số chặt chẽ theo đặc tả JSON Schema draft-07 / OpenAPI 3.1.
- **Rủi ro & Quyền hạn (Risk & Permission):** `LOW`, `MEDIUM`, hoặc `HIGH`.
- **Thư viện phụ thuộc (Dependencies):** Thư viện Python yêu cầu.
- **Điều kiện đạt trạng thái `AVAILABLE`:** Tiêu chí cần và đủ để tool sẵn sàng chạy.
- **Giới hạn an toàn (Limits & Safety Constraints):** Timeout, kích thước tối đa, giới hạn ngữ cảnh.
- **Ý tưởng kiểm thử (Test Ideas / Scenarios):** Các ca kiểm thử biên và tiêu cực.
- **Trạng thái Triển khai:** `SPECIFIED (MVP)`, `OPTIONAL_DEPENDENCY`, hoặc `EXTERNAL_CONFIGURATION_REQUIRED`.

---

## 2. Nhóm A: Web and Retrieval Tools (6 Tools)

### Tool 01: `web_search`
- **Tên hiển thị:** Tìm kiếm Web Trực tuyến (Web Search)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Thực hiện tìm kiếm thông tin trên internet thông qua search provider adapter (Google Custom Search, Serper, Tavily hoặc DuckDuckGo), trả về danh sách liên kết, tiêu đề và trích đoạn tóm tắt.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Chuỗi từ khóa tìm kiếm cần tra cứu", "minLength": 2, "maxLength": 300 },
      "num_results": { "type": "integer", "description": "Số lượng kết quả cần lấy (mặc định 5, tối đa 10)", "default": 5, "minimum": 1, "maximum": 10 }
    },
    "required": ["query"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "total_results": { "type": "integer" },
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "url": { "type": "string" },
            "snippet": { "type": "string" }
          },
          "required": ["title", "url", "snippet"]
        }
      }
    },
    "required": ["query", "results"]
  }
  ```
- **Quyền & Rủi ro:** Quyền truy cập mạng internet ngoại vi | Mức rủi ro: `MEDIUM`.
- **Phụ thuộc:** `httpx`, `duckduckgo-search` (nếu dùng free adapter) hoặc Search API Key.
- **Điều kiện `AVAILABLE`:** Đã cấu hình search adapter hợp lệ và đã lưu API key (nếu adapter yêu cầu).
- **Giới hạn:** Timeout 10 giây; tối đa 10 kết quả; trích đoạn mỗi kết quả tối đa 300 ký tự. Tuyệt đối không giả lập kết quả nếu search API trả về lỗi.
- **Test Ideas:** Tìm từ khóa hợp lệ; tìm chuỗi rỗng; tìm ký tự đặc biệt XSS; ngắt mạng giả lập để kiểm tra lỗi; kiểm tra rate limit.
- **Trạng thái:** `EXTERNAL_CONFIGURATION_REQUIRED`.

---

### Tool 02: `fetch_webpage`
- **Tên hiển thị:** Tải Nội dung Trang Web (Fetch Webpage)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Tải nội dung thô (HTML/Text) từ một URL công khai với cơ chế phòng thủ SSRF nhiều tầng.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "url": { "type": "string", "format": "uri", "description": "Địa chỉ URL công khai cần tải (chỉ chấp nhận http hoặc https)" }
    },
    "required": ["url"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "url": { "type": "string" },
      "status_code": { "type": "integer" },
      "content_type": { "type": "string" },
      "content_length": { "type": "integer" },
      "html_content": { "type": "string" }
    },
    "required": ["url", "status_code", "html_content"]
  }
  ```
- **Quyền & Rủi ro:** Gọi outbound HTTP request | Mức rủi ro: `HIGH` (Nguy cơ SSRF).
- **Phụ thuộc:** `httpx`.
- **Điều kiện `AVAILABLE`:** Môi trường có internet outbound và thư viện `httpx`.
- **Giới hạn:**
  - **Lá chắn SSRF:** Chặn toàn bộ IP nội bộ (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`).
  - Chặn các schema nguy hiểm (`file://`, `gopher://`, `ftp://`).
  - Dung lượng tải tối đa 2 MB; timeout 8 giây; tối đa 3 lần redirect và xác thực lại IP sau mỗi redirect.
- **Test Ideas:** Nhập URL hợp lệ `https://example.com`; nhập `http://localhost:8000/api/v1/auth`; nhập `http://169.254.169.254/latest/meta-data`; nhập URL chứa non-HTTP schema.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 03: `extract_web_content`
- **Tên hiển thị:** Bóc tách Nội dung Bài viết Web (Extract Web Content)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Loại bỏ các thẻ script, style, nav, footer, quảng cáo từ mã HTML để trích xuất văn bản bài viết cốt lõi và tiêu đề.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "html": { "type": "string", "description": "Chuỗi mã nguồn HTML cần trích xuất nội dung", "maxLength": 2000000 }
    },
    "required": ["html"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "clean_text": { "type": "string" },
      "word_count": { "type": "integer" }
    },
    "required": ["clean_text", "word_count"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý văn bản thuần túy (In-memory) | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `beautifulsoup4` (hoặc parser regex tích hợp nếu không có thư viện).
- **Điều kiện `AVAILABLE`:** Có sẵn module bóc tách HTML.
- **Giới hạn:** Kích thước chuỗi HTML tối đa 2 MB; văn bản trích xuất tối đa 10.000 ký tự (context budget).
- **Test Ideas:** HTML bài báo có nhiều script; HTML rỗng; HTML chứa thẻ không đóng; HTML chứa ký tự Unicode phức tạp.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 04: `extract_web_metadata`
- **Tên hiển thị:** Trích xuất Siêu dữ liệu Trang Web (Extract Web Metadata)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Đọc các thẻ meta chuẩn HTML và OpenGraph (`og:title`, `og:description`, `og:image`, `canonical`, `keywords`).
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "html": { "type": "string", "description": "Chuỗi HTML để trích xuất thẻ metadata", "maxLength": 1000000 }
    },
    "required": ["html"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "canonical_url": { "type": "string" },
      "open_graph": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    }
  }
  ```
- **Quyền & Rủi ro:** Xử lý văn bản | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `beautifulsoup4` hoặc `html.parser` (stdlib).
- **Điều kiện `AVAILABLE`:** Có sẵn stdlib parser.
- **Giới hạn:** Kích thước HTML tối đa 1 MB; timeout 3 giây.
- **Test Ideas:** HTML có đầy đủ OG tags; HTML thiếu thẻ title; HTML chứa meta tag trùng lặp.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 05: `parse_sitemap`
- **Tên hiển thị:** Phân tích Sitemap XML (Parse Sitemap)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Phân tích cú pháp tệp XML `sitemap.xml` để lấy danh sách các URL được phép thu thập.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "sitemap_xml": { "type": "string", "description": "Chuỗi nội dung XML của tệp sitemap", "maxLength": 1000000 },
      "max_urls": { "type": "integer", "description": "Số lượng URL tối đa cần lấy (mặc định 50, tối đa 200)", "default": 50, "maximum": 200 }
    },
    "required": ["sitemap_xml"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "total_found": { "type": "integer" },
      "urls": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "loc": { "type": "string" },
            "lastmod": { "type": "string" },
            "priority": { "type": "string" }
          },
          "required": ["loc"]
        }
      }
    },
    "required": ["total_found", "urls"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý XML | Mức rủi ro: `LOW` (Phòng thủ XML Entity Bomb / XXE).
- **Phụ thuộc:** `xml.etree.ElementTree` (stdlib với `defusedxml` nếu có).
- **Điều kiện `AVAILABLE`:** Có sẵn XML parser an toàn.
- **Giới hạn:** Tối đa 200 URLs; chặn triệt để nạp DTD ngoài (Disallow external DTDs / XXE protection).
- **Test Ideas:** Sitemap XML chuẩn; Sitemap chứa sitemap index; XML chứa entity injection (XXE test).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 06: `search_project_documents`
- **Tên hiển thị:** Tìm kiếm Tài liệu Nội bộ Project (Search Project Documents)
- **Nhóm:** `Web & Retrieval`
- **Mục tiêu:** Tìm kiếm từ khóa hoặc đoạn văn bản trong các tệp đính kèm (`attachments`) thuộc quyền sở hữu của Project hiện tại.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "project_id": { "type": "string", "description": "ID định danh của Project hiện tại" },
      "query": { "type": "string", "description": "Từ khóa hoặc cụm từ cần tìm", "minLength": 2 }
    },
    "required": ["project_id", "query"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "matches_count": { "type": "integer" },
      "matches": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attachment_id": { "type": "string" },
            "filename": { "type": "string" },
            "snippet": { "type": "string" },
            "score": { "type": "number" }
          },
          "required": ["attachment_id", "filename", "snippet"]
        }
      }
    },
    "required": ["matches_count", "matches"]
  }
  ```
- **Quyền & Rủi ro:** Đọc CSDL đính kèm của Project | Mức rủi ro: `LOW` (Kiểm tra Anti-IDOR).
- **Phụ thuộc:** Cơ sở dữ liệu SQLite và bảng `attachments`.
- **Điều kiện `AVAILABLE`:** Bảng `attachments` sẵn sàng và Project tồn tại.
- **Giới hạn:** Chỉ tìm trong các tài liệu thuộc Project và User hiện tại; trả về tối đa 5 đoạn trích phù hợp nhất.
- **Test Ideas:** Tìm trong Project có 2 tệp text; tìm từ khóa không tồn tại; thử IDOR sang Project của người dùng khác.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

## 3. Nhóm B: File and Document Tools (12 Tools)

### Tool 07: `read_text_file`
- **Tên hiển thị:** Đọc Tệp Văn bản Cục bộ (Read Text File)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Đọc nội dung của tệp văn bản (`.txt`, `.md`, `.json`, `.csv`, `.py`) trong kho tệp đính kèm được cấp quyền.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "Định danh tệp đính kèm cần đọc (bắt đầu bằng att_...)" },
      "max_lines": { "type": "integer", "description": "Số dòng tối đa cần đọc (mặc định 200, tối đa 1000)", "default": 200, "maximum": 1000 }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string" },
      "filename": { "type": "string" },
      "total_lines": { "type": "integer" },
      "lines_read": { "type": "integer" },
      "content": { "type": "string" }
    },
    "required": ["attachment_id", "filename", "content"]
  }
  ```
- **Quyền & Rủi ro:** Đọc filesystem được bảo vệ | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `attachment_storage.py` hiện hữu.
- **Điều kiện `AVAILABLE`:** Hệ thống đính kèm hoạt động và tệp có trạng thái `READY`.
- **Giới hạn:** Chặn tuyệt đối đọc đường dẫn tùy ý (chỉ nhận `attachment_id`, không nhận file path từ client); giới hạn tối đa 10.000 ký tự.
- **Test Ideas:** Đọc tệp text tiếng Việt UTF-8; đọc tệp rỗng; truyền attachment_id của người dùng khác (kiểm tra Anti-IDOR).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 08: `extract_pdf_text`
- **Tên hiển thị:** Trích xuất Văn bản từ PDF (Extract PDF Text)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Đọc các trang của tệp PDF đính kèm và trích xuất nội dung văn bản có cấu trúc trang rõ ràng.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp PDF đính kèm" },
      "start_page": { "type": "integer", "description": "Trang bắt đầu (đánh số từ 1)", "default": 1, "minimum": 1 },
      "max_pages": { "type": "integer", "description": "Số trang tối đa cần trích xuất (mặc định 5, tối đa 20)", "default": 5, "maximum": 20 }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string" },
      "total_pages": { "type": "integer" },
      "pages_extracted": { "type": "integer" },
      "text": { "type": "string" }
    },
    "required": ["attachment_id", "total_pages", "text"]
  }
  ```
- **Quyền & Rủi ro:** Đọc và parse tệp nhị phân | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `pypdf` (đã có trong môi trường).
- **Điều kiện `AVAILABLE`:** Tệp đính kèm có MIME `application/pdf`.
- **Giới hạn:** Tối đa 20 trang / lượt gọi; không tự động chạy OCR nếu PDF là ảnh scan thuần (trả thông báo "Trang PDF chỉ chứa ảnh, cần kích hoạt OCR").
- **Test Ideas:** PDF hợp lệ 3 trang; PDF có mật khẩu bảo vệ (kiểm tra báo lỗi chuẩn); PDF hỏng.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 09: `extract_docx_text`
- **Tên hiển thị:** Trích xuất Văn bản Microsoft Word (Extract DOCX Text)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Đọc các đoạn văn (paragraphs), tiêu đề (headings) và bảng biểu từ tệp Word `.docx`.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp DOCX đính kèm" }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string" },
      "paragraphs_count": { "type": "integer" },
      "content": { "type": "string" }
    },
    "required": ["attachment_id", "content"]
  }
  ```
- **Quyền & Rủi ro:** Đọc tệp nhị phân | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `python-docx`.
- **Điều kiện `AVAILABLE`:** Đã cài đặt `python-docx` trong môi trường.
- **Giới hạn:** Tối đa 10.000 ký tự trả về; bỏ qua macro `.docm` (chống thực thi mã nhúng).
- **Test Ideas:** DOCX chuẩn có headings; DOCX chứa macro VBA (chỉ đọc text, không chạy script).
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 10: `extract_xlsx_data`
- **Tên hiển thị:** Đọc Dữ liệu Bảng tính Excel (Extract XLSX Data)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Liệt kê tên các sheet và đọc dữ liệu dạng bảng từ một sheet được chỉ định trong tệp Excel `.xlsx`.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp XLSX đính kèm" },
      "sheet_name": { "type": "string", "description": "Tên sheet cần đọc (nếu bỏ trống sẽ đọc sheet đầu tiên)" },
      "max_rows": { "type": "integer", "description": "Số dòng dữ liệu tối đa cần lấy (mặc định 50, tối đa 200)", "default": 50, "maximum": 200 }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "sheet_name": { "type": "string" },
      "available_sheets": { "type": "array", "items": { "type": "string" } },
      "headers": { "type": "array", "items": { "type": "string" } },
      "rows": { "type": "array", "items": { "type": "array", "items": {} } },
      "total_rows_read": { "type": "integer" }
    },
    "required": ["sheet_name", "headers", "rows"]
  }
  ```
- **Quyền & Rủi ro:** Đọc file bảng tính | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `openpyxl`.
- **Điều kiện `AVAILABLE`:** Đã cài đặt `openpyxl`.
- **Giới hạn:** Tối đa 200 dòng và 30 cột / lần đọc; chế độ `read_only=True` để tiết kiệm RAM.
- **Test Ideas:** Đọc sheet mặc định; đọc sheet chỉ định; sheet rỗng; file có 10.000 dòng (kiểm tra cắt tỉa row limit).
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 11: `parse_csv`
- **Tên hiển thị:** Phân tích Cấu trúc Tệp CSV (Parse CSV)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Đọc tệp CSV, phát hiện ký tự phân tách (comma, semicolon, tab), suy luận kiểu dữ liệu từng cột và trả về xem trước dữ liệu.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp CSV đính kèm" },
      "delimiter": { "type": "string", "description": "Ký tự phân cách (mặc định tự động phát hiện)", "default": "," },
      "max_rows": { "type": "integer", "description": "Số dòng xem trước (mặc định 20, tối đa 100)", "default": 20, "maximum": 100 }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "filename": { "type": "string" },
      "detected_delimiter": { "type": "string" },
      "total_columns": { "type": "integer" },
      "columns": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "inferred_type": { "type": "string", "enum": ["integer", "float", "boolean", "date", "string"] }
          },
          "required": ["name", "inferred_type"]
        }
      },
      "sample_rows": { "type": "array", "items": { "type": "object" } }
    },
    "required": ["columns", "sample_rows"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý dữ liệu bảng | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Module `csv` (Python stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng (built-in stdlib).
- **Giới hạn:** Tối đa 100 dòng xem trước; xử lý an toàn lỗi encoding (UTF-8, Latin-1 fallback).
- **Test Ideas:** CSV dấu phẩy; CSV dấu chấm phẩy; CSV chứa dấu ngoặc kép bọc chuỗi; CSV lỗi dòng.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 12: `filter_csv_rows`
- **Tên hiển thị:** Lọc Dòng Dữ liệu CSV (Filter CSV Rows)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Lọc các dòng trong CSV thỏa mãn điều kiện logic an toàn (chặn tuyệt đối việc dùng `eval()`).
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp CSV đính kèm" },
      "column": { "type": "string", "description": "Tên cột cần áp dụng bộ lọc" },
      "operator": { "type": "string", "enum": ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "startswith"], "description": "Toán tử so sánh" },
      "value": { "description": "Giá trị cần so sánh (chuỗi hoặc số)" },
      "limit": { "type": "integer", "description": "Số lượng dòng tối đa cần lấy", "default": 50, "maximum": 100 }
    },
    "required": ["attachment_id", "column", "operator", "value"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "matched_rows_count": { "type": "integer" },
      "rows": { "type": "array", "items": { "type": "object" } }
    },
    "required": ["matched_rows_count", "rows"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý dữ liệu | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `csv` (stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Sử dụng toán tử so sánh tường minh bằng code Python chuẩn; tuyệt đối không dùng `eval()` hoặc `exec()`; giới hạn tối đa 100 dòng kết quả.
- **Test Ideas:** Lọc cột số `price > 100`; lọc chuỗi `status eq ACTIVE`; lọc cột không tồn tại (báo lỗi cụ thể).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 13: `summarize_csv_statistics`
- **Tên hiển thị:** Thống kê Mô tả Tệp CSV (Summarize CSV Statistics)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Tính toán thống kê cơ bản cho các cột số: Count, Missing/Null count, Min, Max, Mean, Median.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp CSV đính kèm" },
      "columns": { "type": "array", "items": { "type": "string" }, "description": "Danh sách cột cần thống kê (nếu bỏ trống sẽ tính tất cả cột số)" }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "total_records": { "type": "integer" },
      "numeric_summary": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "count": { "type": "integer" },
            "missing": { "type": "integer" },
            "min": { "type": "number" },
            "max": { "type": "number" },
            "mean": { "type": "number" },
            "median": { "type": "number" }
          }
        }
      }
    },
    "required": ["total_records", "numeric_summary"]
  }
  ```
- **Quyền & Rủi ro:** Tính toán in-memory | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Module `statistics` & `csv` (Python stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Quét tối đa 50.000 dòng để tránh nghẽn CPU; bỏ qua các giá trị không hợp lệ có ghi chú.
- **Test Ideas:** CSV chứa cột số và chuỗi; CSV có dữ liệu rỗng (null values); CSV toàn chuỗi.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 14: `convert_csv_to_json`
- **Tên hiển thị:** Chuyển đổi CSV sang JSON (Convert CSV to JSON)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Chuyển đổi định dạng tệp CSV thành mảng JSON đối tượng có cấu trúc.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp CSV đính kèm" },
      "max_rows": { "type": "integer", "description": "Số dòng tối đa cần chuyển đổi (mặc định 100, tối đa 500)", "default": 100, "maximum": 500 }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "count": { "type": "integer" },
      "json_data": { "type": "array", "items": { "type": "object" } }
    },
    "required": ["count", "json_data"]
  }
  ```
- **Quyền & Rủi ro:** Chuyển đổi dữ liệu | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `csv`, `json` (stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Tối đa 500 records; payload đầu ra tối đa 500 KB.
- **Test Ideas:** CSV 10 dòng; CSV có header trùng tên; CSV có ký tự đặc biệt.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 15: `parse_json_file`
- **Tên hiển thị:** Đọc và Xác thực Tệp JSON (Parse JSON File)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Đọc tệp `.json` đính kèm, kiểm tra tính hợp lệ cú pháp, trả về cấu trúc và xem trước dữ liệu an toàn.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp JSON đính kèm" },
      "json_path": { "type": "string", "description": "Khóa truy xuất dữ liệu con (ví dụ: 'users.0.email')", "default": "" }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "is_valid": { "type": "boolean" },
      "data_type": { "type": "string", "enum": ["object", "array", "scalar"] },
      "data": {}
    },
    "required": ["is_valid", "data"]
  }
  ```
- **Quyền & Rủi ro:** Đọc file dữ liệu | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `json` (stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Kích thước tệp JSON tối đa 5 MB; payload trả về tối đa 100 KB.
- **Test Ideas:** JSON hợp lệ; JSON bị thiếu dấu ngoặc; JSON dạng mảng lớn; JSON lồng nhau nhiều cấp.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 16: `extract_markdown_sections`
- **Tên hiển thị:** Tách Mục Văn bản Markdown (Extract Markdown Sections)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Phân tích cú pháp tệp Markdown, tách cấu trúc theo Heading (#, ##, ###) để lấy chính xác phần tài liệu cần thiết.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp Markdown đính kèm" },
      "heading_title": { "type": "string", "description": "Tiêu đề mục cần trích xuất (nếu bỏ trống sẽ trả về mục lục TOC)" }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "toc": { "type": "array", "items": { "type": "string" } },
      "matched_heading": { "type": "string" },
      "section_content": { "type": "string" }
    },
    "required": ["toc"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý chuỗi | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Python stdlib (`re`).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Tối đa 8.000 ký tự trả về.
- **Test Ideas:** Markdown có 5 mục H2; tìm heading không tồn tại; Markdown không có heading nào.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 17: `detect_file_metadata`
- **Tên hiển thị:** Nhận diện Siêu dữ liệu Tệp (Detect File Metadata)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Kiểm tra kích thước, băm SHA-256, phần mở rộng và chữ ký magic bytes nhị phân thực tế của tệp mà không thực thi tệp.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "attachment_id": { "type": "string", "description": "ID tệp đính kèm cần kiểm tra" }
    },
    "required": ["attachment_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "filename": { "type": "string" },
      "file_size": { "type": "integer" },
      "sha256": { "type": "string" },
      "sniffed_mime": { "type": "string" },
      "is_executable": { "type": "boolean" }
    },
    "required": ["filename", "file_size", "sha256", "sniffed_mime", "is_executable"]
  }
  ```
- **Quyền & Rủi ro:** Đọc header tệp | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `filetype`, `hashlib` (đã có trong hệ thống).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Chỉ đọc 2KB đầu tệp để sniff magic bytes; tính SHA-256 theo stream 64KB.
- **Test Ideas:** Tệp PNG đổi tên thành `.txt`; tệp rỗng; tệp ZIP.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 18: `chunk_document`
- **Tên hiển thị:** Phân đoạn Tài liệu cho Vector Search (Chunk Document)
- **Nhóm:** `File & Document`
- **Mục tiêu:** Chia văn bản dài thành các đoạn nhỏ (chunks) có độ chồng lấn (overlap) và đánh chỉ mục vị trí phục vụ cho bài toán RAG.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "text": { "type": "string", "description": "Văn bản đầu vào cần phân đoạn", "minLength": 100 },
      "chunk_size": { "type": "integer", "description": "Kích thước tối đa mỗi chunk (ký tự)", "default": 800, "maximum": 2000 },
      "chunk_overlap": { "type": "integer", "description": "Độ dài ký tự chồng lấn giữa 2 chunks liên tiếp", "default": 100, "maximum": 500 }
    },
    "required": ["text"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "total_chunks": { "type": "integer" },
      "chunks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "chunk_index": { "type": "integer" },
            "text": { "type": "string" },
            "character_count": { "type": "integer" }
          },
          "required": ["chunk_index", "text"]
        }
      }
    },
    "required": ["total_chunks", "chunks"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý chuỗi in-memory | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `langchain_core` RecursiveCharacterTextSplitter hoặc regex splitter tích hợp.
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Tối đa 50 chunks / lần gọi; văn bản đầu vào tối đa 50.000 ký tự.
- **Test Ideas:** Văn bản 2.000 ký tự với chunk_size=500, overlap=50; văn bản ngắn hơn chunk_size.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

## 4. Nhóm C: Local Knowledge Base / FAISS Tools (6 Tools)

### Tool 19: `create_faiss_index`
- **Tên hiển thị:** Khởi tạo Chỉ mục Vector FAISS (Create FAISS Index)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Tạo một vector index rỗng hoặc nạp ban đầu từ danh sách tài liệu với mô hình embedding và số chiều xác định.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$", "description": "Tên định danh index vector duy nhất" },
      "embedding_provider": { "type": "string", "enum": ["google", "openai", "local_fastembed"], "description": "Nhà cung cấp embedding" },
      "dimension": { "type": "integer", "description": "Số chiều vector (768 với Google, 1536 với OpenAI)", "enum": [384, 768, 1536] },
      "metric": { "type": "string", "enum": ["cosine", "l2"], "default": "cosine" }
    },
    "required": ["index_name", "embedding_provider", "dimension"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_id": { "type": "string" },
      "index_name": { "type": "string" },
      "dimension": { "type": "integer" },
      "status": { "type": "string", "enum": ["CREATED", "READY"] }
    },
    "required": ["index_id", "index_name", "status"]
  }
  ```
- **Quyền & Rủi ro:** Tạo tệp trên đĩa lưu trữ an toàn | Mức rủi ro: `MEDIUM`.
- **Phụ thuộc:** `faiss-cpu`, embedding provider API key.
- **Điều kiện `AVAILABLE`:** Gói `faiss-cpu` đã cài đặt và cấu hình embedding provider hợp lệ.
- **Giới hạn:** Chỉ tạo trong thư mục `data/storage/faiss/{user_id}/`; cấm tạo tên index trùng lặp.
- **Test Ideas:** Tạo index 768d với Google; tạo index 1536d với OpenAI; cố tình truyền dimension không khớp.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 20: `add_documents_to_faiss`
- **Tên hiển thị:** Nạp Tài liệu vào FAISS Index (Add Documents to FAISS)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Sinh vector embeddings từ các đoạn văn bản và nạp vào index FAISS đã tồn tại, đồng thời lưu metadata vào SQLite.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "description": "Tên index vector cần nạp thêm" },
      "documents": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "doc_id": { "type": "string" },
            "text": { "type": "string", "minLength": 10 },
            "metadata": { "type": "object" }
          },
          "required": ["doc_id", "text"]
        },
        "maxItems": 50
      }
    },
    "required": ["index_name", "documents"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string" },
      "added_count": { "type": "integer" },
      "total_vectors": { "type": "integer" }
    },
    "required": ["index_name", "added_count", "total_vectors"]
  }
  ```
- **Quyền & Rủi ro:** Gọi API embedding và ghi đĩa index | Mức rủi ro: `MEDIUM`.
- **Phụ thuộc:** `faiss-cpu`, embedding model.
- **Điều kiện `AVAILABLE`:** Index đích tồn tại và thuộc quyền sở hữu của user.
- **Giới hạn:** Tối đa 50 documents / mẻ; kiểm tra tính tương thích số chiều vector trước khi `index.add()`.
- **Test Ideas:** Nạp 10 docs hợp lệ; nạp tài liệu trùng `doc_id`; nạp khi embedding model hết quota.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 21: `search_faiss_index`
- **Tên hiển thị:** Tìm kiếm Ngữ nghĩa FAISS (Search FAISS Index)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Chuyển câu hỏi thành vector embedding, tìm top-K vector tương đồng nhất trong index FAISS cục bộ và trả về các đoạn trích liên quan.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "description": "Tên index FAISS cần tìm" },
      "query": { "type": "string", "description": "Nội dung câu hỏi hoặc khái niệm cần tra cứu", "minLength": 2 },
      "top_k": { "type": "integer", "description": "Số lượng kết quả cần lấy (mặc định 4, tối đa 10)", "default": 4, "maximum": 10 },
      "score_threshold": { "type": "number", "description": "Ngưỡng độ tương đồng tối thiểu (0.0 đến 1.0)", "default": 0.5 }
    },
    "required": ["index_name", "query"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "hits_count": { "type": "integer" },
      "hits": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "doc_id": { "type": "string" },
            "text": { "type": "string" },
            "score": { "type": "number" },
            "metadata": { "type": "object" }
          },
          "required": ["doc_id", "text", "score"]
        }
      }
    },
    "required": ["query", "hits_count", "hits"]
  }
  ```
- **Quyền & Rủi ro:** Đọc index và gọi embedding model | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `faiss-cpu`, embedding provider.
- **Điều kiện `AVAILABLE`:** Index đã được nạp ít nhất 1 vector.
- **Giới hạn:** Tối đa top 10; timeout tìm kiếm 5 giây; tổng ký tự trả về không quá 8.000 ký tự.
- **Test Ideas:** Tìm từ khóa liên quan nghĩa; tìm khái niệm không có trong kho; tìm trên index rỗng.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 22: `get_faiss_document`
- **Tên hiển thị:** Lấy Chi tiết Đoạn trích FAISS (Get FAISS Document)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Truy xuất nguyên văn nội dung và metadata đầy đủ của một tài liệu trong index dựa trên `doc_id`.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "description": "Tên index chứa tài liệu" },
      "doc_id": { "type": "string", "description": "ID định danh của tài liệu cần lấy" }
    },
    "required": ["index_name", "doc_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "doc_id": { "type": "string" },
      "index_name": { "type": "string" },
      "text": { "type": "string" },
      "metadata": { "type": "object" }
    },
    "required": ["doc_id", "text"]
  }
  ```
- **Quyền & Rủi ro:** Đọc metadata store | Mức rủi ro: `LOW`.
- **Phụ thuộc:** SQLite metadata table.
- **Điều kiện `AVAILABLE`:** Index tồn tại.
- **Giới hạn:** Trả về lỗi `DOCUMENT_NOT_FOUND` nếu `doc_id` không tồn tại.
- **Test Ideas:** Truy vấn doc_id hợp lệ; truy vấn doc_id không tồn tại.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 23: `delete_faiss_document`
- **Tên hiển thị:** Xóa Tài liệu khỏi FAISS Index (Delete FAISS Document)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Xóa vector của tài liệu khỏi index FAISS và xóa metadata tương ứng trong CSDL.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "description": "Tên index" },
      "doc_id": { "type": "string", "description": "ID tài liệu cần xóa" }
    },
    "required": ["index_name", "doc_id"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string" },
      "doc_id": { "type": "string" },
      "status": { "type": "string", "enum": ["DELETED", "NOT_FOUND"] },
      "remaining_vectors": { "type": "integer" }
    },
    "required": ["index_name", "doc_id", "status"]
  }
  ```
- **Quyền & Rủi ro:** Thao tác xóa dữ liệu (Phá hủy) | Mức rủi ro: `MEDIUM`.
- **Phụ thuộc:** `faiss-cpu`, SQLite metadata table.
- **Điều kiện `AVAILABLE`:** Người dùng là chủ sở hữu index.
- **Giới hạn:** Sử dụng `remove_ids` của FAISS hoặc đánh dấu tombstone và kích hoạt compact khi cần.
- **Test Ideas:** Xóa tài liệu thành công; xóa tài liệu của người khác (Anti-IDOR); xóa tài liệu không tồn tại.
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

### Tool 24: `rebuild_faiss_index`
- **Tên hiển thị:** Tái tạo Chỉ mục FAISS từ Nguồn (Rebuild FAISS Index)
- **Nhóm:** `Local FAISS Knowledge Base`
- **Mục tiêu:** Xóa chỉ mục cũ và xây dựng lại từ đầu toàn bộ vector từ các tệp nguồn gốc đã lưu, giải quyết bài toán đồng bộ và nâng cấp model embedding.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string", "description": "Tên index cần xây dựng lại" }
    },
    "required": ["index_name"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "index_name": { "type": "string" },
      "status": { "type": "string", "enum": ["REBUILT_SUCCESS", "FAILED"] },
      "total_reindexed": { "type": "integer" },
      "elapsed_time_ms": { "type": "number" }
    },
    "required": ["index_name", "status", "total_reindexed"]
  }
  ```
- **Quyền & Rủi ro:** Thao tác tái tạo toàn bộ (Tốn tài nguyên tính toán) | Mức rủi ro: `MEDIUM`.
- **Phụ thuộc:** `faiss-cpu`, embedding provider, tệp nguồn gốc trong `attachments`.
- **Điều kiện `AVAILABLE`:** Tệp nguồn gốc vẫn còn tồn tại đầy đủ.
- **Giới hạn:** Chạy bất đồng bộ trong background task nếu số lượng vector vượt quá 500; lock index tạm thời ở chế độ `READ_ONLY` trong khi rebuild.
- **Test Ideas:** Rebuild index có 100 tài liệu; rebuild khi mất một tệp nguồn (xử lý gracefully).
- **Trạng thái:** `OPTIONAL_DEPENDENCY`.

---

## 5. Nhóm D: Data Validation and Utilities (8 Tools)

### Tool 25: `calculator`
- **Tên hiển thị:** Máy tính Số học An toàn (Calculator)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Thực hiện các phép tính số học toán học chính xác (cộng, trừ, nhân, chia, lũy thừa, căn bậc hai, lượng giác) mà không dùng `eval()`.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "expression": { "type": "string", "description": "Biểu thức toán học cần tính (ví dụ: '125 * (45 + 18) / 3')", "maxLength": 100 }
    },
    "required": ["expression"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "expression": { "type": "string" },
      "result": { "type": "number" },
      "formatted": { "type": "string" }
    },
    "required": ["expression", "result"]
  }
  ```
- **Quyền & Rủi ro:** Tính toán in-memory | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Thư viện parser toán học an toàn (dùng `ast.parse` hoặc thư viện `simpleeval` / `math`).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng (built-in).
- **Giới hạn:** **Cấm tuyệt đối gọi `eval()` hay `exec()`**; chặn các hàm hệ thống; chặn phép lũy thừa quá lớn gây treo CPU (ví dụ `9999 ** 9999`).
- **Test Ideas:** Tính biểu thức phức tạp `(10 + 5) * 4 - 2^3`; chia cho 0 (báo lỗi `DIVISION_BY_ZERO`); biểu thức chứa lệnh độc hại `__import__('os')` (chặn ngay lập tức).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 26: `date_time_info`
- **Tên hiển thị:** Thông tin Thời gian Hiện tại (Date & Time Info)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Cung cấp thông tin ngày, giờ, thứ, tuần và timezone hiện tại theo thời gian thực của máy chủ hoặc theo múi giờ người dùng yêu cầu.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "timezone": { "type": "string", "description": "Tên múi giờ chuẩn IANA (ví dụ: 'Asia/Ho_Chi_Minh', 'UTC')", "default": "Asia/Ho_Chi_Minh" }
    }
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "iso_timestamp": { "type": "string" },
      "date": { "type": "string" },
      "time": { "type": "string" },
      "day_of_week": { "type": "string" },
      "timezone": { "type": "string" },
      "utc_offset": { "type": "string" }
    },
    "required": ["iso_timestamp", "date", "time", "timezone"]
  }
  ```
- **Quyền & Rủi ro:** Đọc đồng hồ hệ thống | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `datetime`, `zoneinfo` (Python stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Xử lý fallback về UTC nếu múi giờ người dùng nhập không hợp lệ.
- **Test Ideas:** Lấy giờ Việt Nam `Asia/Ho_Chi_Minh`; lấy giờ UTC; truyền múi giờ sai `Invalid/Zone`.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 27: `convert_units`
- **Tên hiển thị:** Chuyển đổi Đơn vị Đo lường (Convert Units)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Chuyển đổi chính xác giữa các đơn vị độ dài, khối lượng, nhiệt độ, diện tích và dung lượng số theo công thức chuẩn.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "value": { "type": "number", "description": "Giá trị số cần chuyển đổi" },
      "from_unit": { "type": "string", "description": "Đơn vị gốc (ví dụ: 'km', 'celsius', 'kg', 'mb')" },
      "to_unit": { "type": "string", "description": "Đơn vị đích (ví dụ: 'miles', 'fahrenheit', 'lbs', 'gb')" }
    },
    "required": ["value", "from_unit", "to_unit"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "from_value": { "type": "number" },
      "from_unit": { "type": "string" },
      "to_value": { "type": "number" },
      "to_unit": { "type": "string" },
      "formula_used": { "type": "string" }
    },
    "required": ["from_value", "to_value", "to_unit"]
  }
  ```
- **Quyền & Rủi ro:** Tính toán in-memory | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Bảng hệ số chuyển đổi cố định đã xác minh trong code.
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Chặn chuyển đổi giữa 2 nhóm không tương thích (ví dụ từ `kg` sang `km`).
- **Test Ideas:** Đổi 100 Celsius sang Fahrenheit; đổi 5 km sang miles; đổi 1024 MB sang GB; đổi km sang kg (báo lỗi không tương thích).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 28: `validate_json_schema`
- **Tên hiển thị:** Xác thực Dữ liệu JSON với Schema (Validate JSON Schema)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Kiểm tra xem một đối tượng JSON có thỏa mãn các quy tắc và cấu trúc của một JSON Schema định nghĩa trước hay không.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "data": { "description": "Dữ liệu JSON cần kiểm tra (Object hoặc Array)" },
      "schema": { "type": "object", "description": "Định nghĩa JSON Schema chuẩn để đối chiếu" }
    },
    "required": ["data", "schema"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "is_valid": { "type": "boolean" },
      "errors_count": { "type": "integer" },
      "errors": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "path": { "type": "string" },
            "message": { "type": "string" }
          }
        }
      }
    },
    "required": ["is_valid", "errors_count"]
  }
  ```
- **Quyền & Rủi ro:** Kiểm tra schema | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `jsonschema` (hoặc pydantic validator).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Kích thước schema tối đa 500 KB; chặn đệ quy vô hạn trong schema definition.
- **Test Ideas:** Dữ liệu hợp lệ 100%; thiếu trường bắt buộc `required`; sai kiểu dữ liệu (`integer` thay vì `string`).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 29: `transform_json`
- **Tên hiển thị:** Ánh xạ và Chuyển đổi Cấu trúc JSON (Transform JSON)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Trích xuất, đổi tên trường, và tái cấu trúc đối tượng JSON theo một sơ đồ ánh xạ (mapping dictionary) tường minh, không dùng script ngoài.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "input_data": { "type": "object", "description": "Đối tượng JSON đầu vào" },
      "field_mapping": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "description": "Bản đồ ánh xạ { 'tên_mới': 'đường_dẫn_cũ' }, ví dụ: { 'user_email': 'contact.email' }"
      }
    },
    "required": ["input_data", "field_mapping"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "transformed_data": { "type": "object" }
    },
    "required": ["transformed_data"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý chuỗi và object | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Python stdlib.
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Cấm hoàn toàn code eval; chỉ hỗ trợ dot-notation path traversing an toàn.
- **Test Ideas:** Đổi tên trường đơn giản; lấy trường lồng nhau `a.b.c`; trường cũ không tồn tại (gán null).
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 30: `validate_email_format`
- **Tên hiển thị:** Kiểm tra Cú pháp Email (Validate Email Format)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Kiểm tra tính hợp lệ về cú pháp, domain format và chuẩn RFC 5322 của địa chỉ email (chỉ kiểm tra cú pháp, không khẳng định hộp thư có tồn tại trên mail server).
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "email": { "type": "string", "description": "Địa chỉ email cần kiểm tra", "maxLength": 254 }
    },
    "required": ["email"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "email": { "type": "string" },
      "is_valid_format": { "type": "boolean" },
      "domain": { "type": "string" },
      "reason": { "type": "string" }
    },
    "required": ["email", "is_valid_format"]
  }
  ```
- **Quyền & Rủi ro:** Kiểm tra chuỗi | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `re` (stdlib) hoặc `email_validator` nếu có.
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Không gửi ping SMTP ra ngoài (tránh bị liệt vào blacklist thư rác); regex được tối ưu chống ReDoS.
- **Test Ideas:** Email hợp lệ `user@example.com`; thiếu `@`; có ký tự cấm; email có độ dài vượt quá 254 ký tự.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 31: `text_diff`
- **Tên hiển thị:** So sánh Chênh lệch Văn bản (Text Diff)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** So sánh sự khác biệt giữa hai đoạn văn bản hoặc mã nguồn, trả về dạng unified diff và thống kê số dòng thêm/xóa/sửa.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "original_text": { "type": "string", "description": "Văn bản gốc ban đầu", "maxLength": 50000 },
      "modified_text": { "type": "string", "description": "Văn bản sau khi chỉnh sửa", "maxLength": 50000 }
    },
    "required": ["original_text", "modified_text"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "has_changes": { "type": "boolean" },
      "added_lines": { "type": "integer" },
      "deleted_lines": { "type": "integer" },
      "unified_diff": { "type": "string" }
    },
    "required": ["has_changes", "added_lines", "deleted_lines", "unified_diff"]
  }
  ```
- **Quyền & Rủi ro:** So sánh chuỗi | Mức rủi ro: `LOW`.
- **Phụ thuộc:** Module `difflib` (Python stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Tối đa 50.000 ký tự mỗi văn bản; diff trả về tối đa 5.000 ký tự.
- **Test Ideas:** Hai văn bản giống hệt nhau; văn bản thêm 2 dòng; văn bản đổi 1 từ; văn bản một bên rỗng.
- **Trạng thái:** `SPECIFIED (MVP)`.

---

### Tool 32: `regex_extract`
- **Tên hiển thị:** Trích xuất Dữ liệu bằng Biểu thức Chính quy (Regex Extract)
- **Nhóm:** `Data Validation & Utilities`
- **Mục tiêu:** Trích xuất các chuỗi con khớp với mẫu Regex (ví dụ số điện thoại, mã đơn hàng, ngày tháng) có cơ chế timeout chống ReDoS.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "text": { "type": "string", "description": "Văn bản nguồn cần quét", "maxLength": 50000 },
      "pattern": { "type": "string", "description": "Mẫu Regular Expression cần tìm", "maxLength": 200 },
      "max_matches": { "type": "integer", "description": "Số lượng kết quả tối đa cần lấy", "default": 20, "maximum": 50 }
    },
    "required": ["text", "pattern"]
  }
  ```
- **Output Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "pattern": { "type": "string" },
      "matches_count": { "type": "integer" },
      "matches": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["pattern", "matches_count", "matches"]
  }
  ```
- **Quyền & Rủi ro:** Xử lý biểu thức chính quy | Mức rủi ro: `LOW`.
- **Phụ thuộc:** `re` (stdlib).
- **Điều kiện `AVAILABLE`:** Luôn khả dụng.
- **Giới hạn:** Giới hạn thời gian chạy regex tối đa 2 giây; nếu mẫu gây suy thoái hàm mũ (Catastrophic Backtracking), ngắt ngay và báo lỗi `REGEX_TIMEOUT_REDOS`.
- **Test Ideas:** Trích xuất mã bưu chính `\d{5}`; trích xuất URL; thử nghiệm mẫu regex gây ReDoS `(a+)+$` với chuỗi `aaaaaaaaaaaaaaaaaaaaX`.
- **Trạng thái:** `SPECIFIED (MVP)`.

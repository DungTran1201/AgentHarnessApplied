"""
Initial Seed Catalog of 32 Builtin Tools
Matches docs/features/tool-management/03-tool-catalog.md with exact JSON Schemas.
"""

from typing import List, Dict, Any

BUILTIN_TOOL_CATALOG: List[Dict[str, Any]] = [
    # ==============================================================================
    # A. WEB & RETRIEVAL TOOLS (6 TOOLS)
    # ==============================================================================
    {
        "id": "web_search",
        "name": "Tìm Kiếm Web Đa Nguồn",
        "description": "Tìm kiếm thông tin trên Internet thông qua adapter nhà cung cấp tìm kiếm (DuckDuckGo, Brave, Google).",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "MEDIUM",
        "source_type": "BUILTIN",
        "status": "NEEDS_CONFIGURATION",
        "timeout_seconds": 15,
        "max_payload_bytes": 1048576,
        "requires_network": True,
        "requires_filesystem": False,
        "tags": ["web", "search", "google", "brave", "duckduckgo"],
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Từ khóa hoặc câu truy vấn tìm kiếm"},
                "provider": {"type": "string", "enum": ["duckduckgo", "brave", "google"], "default": "duckduckgo"},
                "max_results": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5}
            },
            "required": ["query"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "provider": {"type": "string"},
                "result_count": {"type": "integer"},
                "results": {"type": "array", "items": {"type": "object"}}
            }
        },
        "configuration_schema": {
            "type": "object",
            "properties": {
                "api_key": {"type": "string", "description": "API Key cho Brave hoặc Google Search"},
                "provider": {"type": "string", "enum": ["duckduckgo", "brave", "google"], "default": "duckduckgo"}
            }
        }
    },
    {
        "id": "fetch_webpage",
        "name": "Tải Nội Dung Trang Web (SSRF Protected)",
        "description": "Tải nội dung HTML của một URL công khai với cơ chế phòng thủ SSRF 3 tầng, kiểm tra redirect và giới hạn dung lượng.",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "MEDIUM",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 15,
        "max_payload_bytes": 5242880,
        "requires_network": True,
        "requires_filesystem": False,
        "tags": ["web", "http", "fetch", "html", "ssrf-safe"],
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Địa chỉ URL công khai (bắt đầu bằng http:// hoặc https://)"},
                "timeout": {"type": "number", "minimum": 1, "maximum": 30, "default": 15.0}
            },
            "required": ["url"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "status_code": {"type": "integer"},
                "content_type": {"type": "string"},
                "content_length_bytes": {"type": "integer"},
                "html": {"type": "string"}
            }
        }
    },
    {
        "id": "extract_web_content",
        "name": "Trích Xuất Văn Bản Trang Web",
        "description": "Loại bỏ mã script, style, header, footer và trích xuất nội dung văn bản chính từ HTML.",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 5242880,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["web", "html", "content", "extractor", "text"],
        "input_schema": {
            "type": "object",
            "properties": {
                "html_content": {"type": "string", "description": "Nội dung chuỗi HTML cần trích xuất"},
                "max_chars": {"type": "integer", "minimum": 100, "maximum": 100000, "default": 20000}
            },
            "required": ["html_content"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "char_count": {"type": "integer"},
                "is_truncated": {"type": "boolean"}
            }
        }
    },
    {
        "id": "extract_web_metadata",
        "name": "Lấy Metadata Trang Web (OpenGraph & Meta)",
        "description": "Trích xuất tiêu đề, mô tả, thẻ meta OpenGraph và canonical URL từ chuỗi HTML.",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 2097152,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["web", "metadata", "opengraph", "seo"],
        "input_schema": {
            "type": "object",
            "properties": {
                "html_content": {"type": "string", "description": "Chuỗi HTML cần trích xuất metadata"}
            },
            "required": ["html_content"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "canonical_url": {"type": "string"},
                "og_image": {"type": "string"},
                "og_site_name": {"type": "string"}
            }
        }
    },
    {
        "id": "parse_sitemap",
        "name": "Phân Tích Sitemap XML",
        "description": "Đọc và phân tích tệp sitemap.xml hợp lệ để trích xuất danh sách các URL có giới hạn.",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "MEDIUM",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 15,
        "max_payload_bytes": 5242880,
        "requires_network": True,
        "requires_filesystem": False,
        "tags": ["web", "sitemap", "xml", "crawler"],
        "input_schema": {
            "type": "object",
            "properties": {
                "sitemap_url": {"type": "string", "description": "Đường dẫn URL của tệp sitemap.xml"},
                "max_urls": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
            },
            "required": ["sitemap_url"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "sitemap_url": {"type": "string"},
                "total_urls_found": {"type": "integer"},
                "urls": {"type": "array", "items": {"type": "string"}}
            }
        }
    },
    {
        "id": "search_project_documents",
        "name": "Tìm Kiếm Tài Liệu Đồ Án",
        "description": "Tìm kiếm nội dung tài liệu và file đính kèm trong phạm vi đồ án hiện tại được cấp quyền.",
        "category": "WEB",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 2097152,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["search", "documents", "project", "attachments"],
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Định danh đồ án cần tìm kiếm"},
                "query": {"type": "string", "description": "Từ khóa tìm kiếm trong tài liệu"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10}
            },
            "required": ["project_id", "query"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "query": {"type": "string"},
                "count": {"type": "integer"},
                "documents": {"type": "array", "items": {"type": "object"}}
            }
        }
    },

    # ==============================================================================
    # B. FILE & DOCUMENT TOOLS (12 TOOLS)
    # ==============================================================================
    {
        "id": "read_text_file",
        "name": "Đọc Tệp Tin Văn Bản Sandbox",
        "description": "Đọc nội dung tệp văn bản trong vùng lưu trữ an toàn (Storage Sandbox) với giới hạn dòng và dung lượng.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["file", "read", "text", "sandbox"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp tin trong thư mục lưu trữ được phép"},
                "start_line": {"type": "integer", "minimum": 1, "default": 1},
                "max_lines": {"type": "integer", "minimum": 1, "maximum": 5000, "default": 1000}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "start_line": {"type": "integer"},
                "lines_read": {"type": "integer"},
                "content": {"type": "string"},
                "file_size_bytes": {"type": "integer"}
            }
        }
    },
    {
        "id": "extract_pdf_text",
        "name": "Trích Xuất Văn Bản Từ PDF",
        "description": "Trích xuất văn bản có cấu trúc từ tệp PDF bằng thư viện pypdf an toàn.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 20,
        "max_payload_bytes": 20971520,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["pdf", "extract", "document", "pypdf"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp PDF trong kho lưu trữ"},
                "max_pages": {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "total_pages": {"type": "integer"},
                "pages_extracted": {"type": "integer"},
                "text": {"type": "string"},
                "pages": {"type": "array"}
            }
        }
    },
    {
        "id": "extract_docx_text",
        "name": "Trích Xuất Văn Bản Từ Word DOCX",
        "description": "Đọc các đoạn văn bản và tiêu đề từ tài liệu Word (.docx). Phụ thuộc tùy chọn python-docx.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 15,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["docx", "word", "document", "extract"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp DOCX trong kho lưu trữ"}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "paragraph_count": {"type": "integer"},
                "text": {"type": "string"}
            }
        }
    },
    {
        "id": "extract_xlsx_data",
        "name": "Đọc Dữ Liệu Bảng Tính Excel XLSX",
        "description": "Đọc danh sách các sheet và dữ liệu bảng tính Excel. Phụ thuộc tùy chọn openpyxl.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 20,
        "max_payload_bytes": 20971520,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["excel", "xlsx", "spreadsheet", "table"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp XLSX trong kho lưu trữ"},
                "max_rows": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "sheets": {"type": "array", "items": {"type": "string"}},
                "data": {"type": "object"}
            }
        }
    },
    {
        "id": "parse_csv",
        "name": "Phân Tích Cấu Trúc CSV",
        "description": "Đọc tiêu đề cột, suy luận kiểu dữ liệu và xem trước các dòng trong tệp CSV.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["csv", "table", "data", "schema"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp CSV trong kho lưu trữ"},
                "delimiter": {"type": "string", "default": ","},
                "max_rows": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "columns": {"type": "array", "items": {"type": "string"}},
                "column_types": {"type": "object"},
                "total_columns": {"type": "integer"},
                "preview_rows": {"type": "array"}
            }
        }
    },
    {
        "id": "filter_csv_rows",
        "name": "Lọc Dòng CSV Khai Báo An Toàn",
        "description": "Lọc các dòng trong CSV bằng toán tử so sánh khai báo an toàn (không dùng eval).",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 15,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["csv", "filter", "safe", "no-eval"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp CSV"},
                "column": {"type": "string", "description": "Tên cột cần lọc"},
                "operator": {"type": "string", "enum": ["==", "!=", ">", "<", ">=", "<=", "contains", "startswith", "endswith"]},
                "value": {"description": "Giá trị đối chiếu (số hoặc chuỗi)"},
                "max_rows": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
            },
            "required": ["file_path", "column", "operator", "value"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "filter_column": {"type": "string"},
                "operator": {"type": "string"},
                "match_count": {"type": "integer"},
                "matched_rows": {"type": "array"}
            }
        }
    },
    {
        "id": "summarize_csv_statistics",
        "name": "Thống Kê Mô Tả Dữ Liệu CSV",
        "description": "Tính toán các chỉ số thống kê mô tả (count, missing, min, max, mean, median) cho các cột số.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 15,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["csv", "statistics", "analytics", "summary"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp CSV"},
                "columns": {"type": "array", "items": {"type": "string"}, "description": "Danh sách cột số (để trống để tính toàn bộ)"}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "total_rows": {"type": "integer"},
                "statistics": {"type": "object"}
            }
        }
    },
    {
        "id": "convert_csv_to_json",
        "name": "Chuyển Đổi CSV Sang JSON",
        "description": "Chuyển đổi các dòng CSV thành danh sách bản ghi đối tượng JSON có giới hạn số dòng.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 15,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["csv", "json", "convert", "transform"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp CSV"},
                "max_rows": {"type": "integer", "minimum": 1, "maximum": 2000, "default": 500}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "row_count": {"type": "integer"},
                "data": {"type": "array", "items": {"type": "object"}}
            }
        }
    },
    {
        "id": "parse_json_file",
        "name": "Đọc & Phân Tích Tệp Tin JSON",
        "description": "Đọc và xác thực cú pháp tệp JSON trong vùng sandbox với giới hạn dung lượng nghiêm ngặt.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 5242880,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["json", "file", "parse", "validator"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp JSON"}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "data_type": {"type": "string"},
                "item_count": {"type": "integer"},
                "content": {}
            }
        }
    },
    {
        "id": "extract_markdown_sections",
        "name": "Tách Đề Mục Tệp Markdown",
        "description": "Phân tích cấu trúc tiêu đề (#, ##, ###) và chia tài liệu Markdown thành các phần có cấu trúc.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 5242880,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["markdown", "sections", "outline", "parser"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp Markdown (.md)"}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "section_count": {"type": "integer"},
                "sections": {"type": "array", "items": {"type": "object"}}
            }
        }
    },
    {
        "id": "detect_file_metadata",
        "name": "Nhận Diện Metadata & Magic Bytes",
        "description": "Kiểm tra magic bytes, kích thước, đuôi mở rộng và tính toán mã băm SHA-256 của tệp tin.",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 52428800,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["metadata", "mime", "magic-bytes", "sha256", "security"],
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Đường dẫn tệp tin cần kiểm tra"}
            },
            "required": ["file_path"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "file_name": {"type": "string"},
                "extension": {"type": "string"},
                "size_bytes": {"type": "integer"},
                "checksum_sha256": {"type": "string"},
                "mime_type": {"type": "string"}
            }
        }
    },
    {
        "id": "chunk_document",
        "name": "Phân Đoạn Văn Bản (Document Chunking)",
        "description": "Chia nhỏ văn bản thành các đoạn (chunks) có kích thước cố định và phần đệm trượt (overlap).",
        "category": "FILE",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 5242880,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["nlp", "chunking", "splitter", "embedding-prep"],
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Nội dung văn bản cần chia đoạn"},
                "chunk_size": {"type": "integer", "minimum": 100, "maximum": 5000, "default": 1000},
                "chunk_overlap": {"type": "integer", "minimum": 0, "maximum": 1000, "default": 200}
            },
            "required": ["text"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "total_chunks": {"type": "integer"},
                "chunk_size": {"type": "integer"},
                "chunk_overlap": {"type": "integer"},
                "chunks": {"type": "array", "items": {"type": "object"}}
            }
        }
    },

    # ==============================================================================
    # C. LOCAL FAISS KNOWLEDGE BASE TOOLS (6 TOOLS)
    # ==============================================================================
    {
        "id": "create_faiss_index",
        "name": "Khởi Tạo Vector Store FAISS",
        "description": "Tạo một không gian vector FAISS cục bộ mới với số chiều xác định và kho lưu trữ metadata SQLite đi kèm.",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "MEDIUM",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 20,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "vector", "index", "semantic-search"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh duy nhất của vector index"},
                "dimension": {"type": "integer", "enum": [384, 768, 1536, 3072], "default": 768},
                "metric": {"type": "string", "enum": ["L2", "IP"], "default": "L2"}
            },
            "required": ["index_id"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "dimension": {"type": "integer"},
                "metric": {"type": "string"},
                "status": {"type": "string"}
            }
        }
    },
    {
        "id": "add_documents_to_faiss",
        "name": "Nạp Tài Liệu Vào FAISS Index",
        "description": "Thêm các vector nhúng và tài liệu văn bản đi kèm vào FAISS và cơ sở dữ liệu metadata.",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "MEDIUM",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 30,
        "max_payload_bytes": 10485760,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "documents", "embedding", "ingest"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh index"},
                "documents": {"type": "array", "items": {"type": "object"}, "description": "Danh sách các đoạn văn bản"},
                "embeddings": {"type": "array", "items": {"type": "array", "items": {"type": "number"}}, "description": "Danh sách vector tương ứng"}
            },
            "required": ["index_id", "documents", "embeddings"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "added_count": {"type": "integer"},
                "total_vectors": {"type": "integer"}
            }
        }
    },
    {
        "id": "search_faiss_index",
        "name": "Tìm Kiếm Ngữ Nghĩa FAISS",
        "description": "Tìm kiếm k lân cận gần nhất (k-NN) từ vector truy vấn trong vector index.",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 15,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "search", "k-nn", "semantic-retrieval"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh index"},
                "query_vector": {"type": "array", "items": {"type": "number"}, "description": "Vector truy vấn"},
                "top_k": {"type": "integer", "minimum": 1, "maximum": 50, "default": 5}
            },
            "required": ["index_id", "query_vector"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "matches_count": {"type": "integer"},
                "matches": {"type": "array", "items": {"type": "object"}}
            }
        }
    },
    {
        "id": "get_faiss_document",
        "name": "Truy Vấn Đoạn Trích FAISS",
        "description": "Lấy nội dung văn bản gốc và metadata của một tài liệu trong vector store bằng ID nội bộ.",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "document", "retrieval", "metadata"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh index"},
                "document_id": {"type": "string", "description": "Định danh tài liệu cần lấy"}
            },
            "required": ["index_id", "document_id"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "document_id": {"type": "string"},
                "content": {"type": "string"},
                "metadata": {"type": "string"}
            }
        }
    },
    {
        "id": "delete_faiss_document",
        "name": "Xóa Tài Liệu Khỏi Vector Store",
        "description": "Xóa thông tin tài liệu khỏi metadata store của FAISS (thao tác có tác động dữ liệu).",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "HIGH",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 15,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "delete", "destructive"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh index"},
                "document_id": {"type": "string", "description": "Định danh tài liệu cần xóa"}
            },
            "required": ["index_id", "document_id"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "document_id": {"type": "string"},
                "status": {"type": "string"}
            }
        }
    },
    {
        "id": "rebuild_faiss_index",
        "name": "Tái Xây Dựng Vector Index Từ Gốc",
        "description": "Tái tạo lại file nhị phân FAISS từ nguồn dữ liệu gốc trong SQLite metadata.",
        "category": "FAISS",
        "version": "1.0.0",
        "risk_level": "HIGH",
        "source_type": "BUILTIN",
        "status": "DEPENDENCY_MISSING",
        "timeout_seconds": 60,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": True,
        "tags": ["faiss", "rebuild", "restore"],
        "input_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string", "description": "Định danh index cần tái thiết lập"}
            },
            "required": ["index_id"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "index_id": {"type": "string"},
                "status": {"type": "string"},
                "document_count": {"type": "integer"}
            }
        }
    },

    # ==============================================================================
    # D. DATA VALIDATION & UTILITIES (8 TOOLS)
    # ==============================================================================
    {
        "id": "calculator",
        "name": "Máy Tính Số Học An Toàn (AST)",
        "description": "Tính toán biểu thức số học bằng bộ duyệt cây cú pháp trừu tượng AST chuẩn của Python, tuyệt đối không dùng eval().",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 10240,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["math", "calculator", "ast", "safe", "no-eval"],
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Biểu thức số học (ví dụ: '(15 * 4) + 100 / 5 - 2^3')"}
            },
            "required": ["expression"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "expression": {"type": "string"},
                "result": {"type": "number"},
                "is_integer": {"type": "boolean"}
            }
        }
    },
    {
        "id": "date_time_info",
        "name": "Thời Gian & Múi Giờ Hiện Tại",
        "description": "Lấy thông tin ngày, giờ, thứ và múi giờ hiện tại từ runtime server theo chuẩn múi giờ IANA.",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 10240,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["time", "date", "timezone", "calendar"],
        "input_schema": {
            "type": "object",
            "properties": {
                "timezone_name": {"type": "string", "default": "UTC", "description": "Tên múi giờ IANA (ví dụ: 'Asia/Ho_Chi_Minh', 'UTC')"},
                "format_str": {"type": "string", "description": "Chuỗi định dạng strftime tùy chọn"}
            }
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "iso": {"type": "string"},
                "timestamp": {"type": "integer"},
                "timezone": {"type": "string"},
                "formatted": {"type": "string"},
                "day_of_week": {"type": "string"}
            }
        }
    },
    {
        "id": "convert_units",
        "name": "Chuyển Đổi Đơn Vị Đo Lường",
        "description": "Chuyển đổi giữa các đơn vị đo lường: chiều dài, khối lượng, nhiệt độ và dung lượng số.",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 10240,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["units", "converter", "measurement"],
        "input_schema": {
            "type": "object",
            "properties": {
                "value": {"type": "number", "description": "Giá trị số cần chuyển đổi"},
                "from_unit": {"type": "string", "description": "Đơn vị gốc (ví dụ: 'km', 'kg', 'f', 'gb')"},
                "to_unit": {"type": "string", "description": "Đơn vị đích (ví dụ: 'm', 'lb', 'c', 'mb')"},
                "unit_type": {"type": "string", "enum": ["length", "mass", "temperature", "digital_storage"], "default": "length"}
            },
            "required": ["value", "from_unit", "to_unit"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "value": {"type": "number"},
                "from_unit": {"type": "string"},
                "to_unit": {"type": "string"},
                "result": {"type": "number"},
                "unit_type": {"type": "string"}
            }
        }
    },
    {
        "id": "validate_json_schema",
        "name": "Xác Thực Cú Pháp JSON Schema",
        "description": "Kiểm tra tính hợp lệ của dữ liệu JSON so với định nghĩa JSON Schema (Draft 7).",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["json", "schema", "validation"],
        "input_schema": {
            "type": "object",
            "properties": {
                "data": {"description": "Dữ liệu JSON cần kiểm tra"},
                "schema": {"type": "object", "description": "Schema định nghĩa quy tắc xác thực"}
            },
            "required": ["data", "schema"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "is_valid": {"type": "boolean"},
                "error_count": {"type": "integer"},
                "errors": {"type": "array", "items": {"type": "string"}}
            }
        }
    },
    {
        "id": "transform_json",
        "name": "Chuyển Đổi Cấu Trúc JSON Khai Báo",
        "description": "Lọc các trường dữ liệu và đổi tên thuộc tính trong đối tượng JSON mà không chạy mã tùy ý.",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["json", "transform", "mapping", "projection"],
        "input_schema": {
            "type": "object",
            "properties": {
                "data": {"type": "object", "description": "Đối tượng JSON nguồn"},
                "field_mapping": {"type": "object", "description": "Bảng ánh xạ đổi tên trường: { 'old_key': 'new_key' }"},
                "select_fields": {"type": "array", "items": {"type": "string"}, "description": "Danh sách các trường cần lấy"}
            },
            "required": ["data"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "transformed_data": {"type": "object"},
                "field_count": {"type": "integer"}
            }
        }
    },
    {
        "id": "validate_email_format",
        "name": "Xác Thực Định Dạng Email",
        "description": "Kiểm tra tính hợp lệ về mặt cú pháp của địa chỉ email theo chuẩn RFC 5322 (không kiểm tra tồn tại mailbox).",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 10240,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["email", "validator", "syntax", "rfc5322"],
        "input_schema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "Địa chỉ email cần kiểm tra"}
            },
            "required": ["email"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "email": {"type": "string"},
                "is_valid": {"type": "boolean"},
                "user_part": {"type": "string"},
                "domain_part": {"type": "string"}
            }
        }
    },
    {
        "id": "text_diff",
        "name": "So Sánh Văn Bản (Unified Diff)",
        "description": "So sánh hai chuỗi văn bản, hiển thị chi tiết các dòng thêm/xóa/sửa và thống kê số lượng thay đổi.",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 10,
        "max_payload_bytes": 2097152,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["diff", "compare", "text", "git-like"],
        "input_schema": {
            "type": "object",
            "properties": {
                "text_a": {"type": "string", "description": "Văn bản gốc"},
                "text_b": {"type": "string", "description": "Văn bản đã chỉnh sửa"},
                "context_lines": {"type": "integer", "minimum": 0, "maximum": 10, "default": 3}
            },
            "required": ["text_a", "text_b"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "diff_text": {"type": "string"},
                "additions": {"type": "integer"},
                "deletions": {"type": "integer"},
                "is_identical": {"type": "boolean"}
            }
        }
    },
    {
        "id": "regex_extract",
        "name": "Trích Xuất Chuỗi Bằng Regex An Toàn",
        "description": "Trích xuất các chuỗi con khớp biểu thức chính quy với giới hạn kích thước và số kết quả nhằm chống ReDoS.",
        "category": "DATA",
        "version": "1.0.0",
        "risk_level": "LOW",
        "source_type": "BUILTIN",
        "status": "AVAILABLE",
        "timeout_seconds": 5,
        "max_payload_bytes": 1048576,
        "requires_network": False,
        "requires_filesystem": False,
        "tags": ["regex", "extract", "pattern", "redos-safe"],
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Biểu thức chính quy regex (tối đa 200 ký tự)"},
                "text": {"type": "string", "description": "Chuỗi văn bản cần trích xuất"},
                "max_matches": {"type": "integer", "minimum": 1, "maximum": 200, "default": 100}
            },
            "required": ["pattern", "text"]
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string"},
                "match_count": {"type": "integer"},
                "matches": {"type": "array", "items": {"type": "object"}}
            }
        }
    }
]

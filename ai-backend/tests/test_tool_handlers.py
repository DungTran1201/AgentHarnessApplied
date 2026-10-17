"""
Functional Tests for All 23 Executable Tool Handlers + Optional Dependency Checks
"""

import json
import os
import sys
import tempfile
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.services.tools.sandbox import DEFAULT_ALLOWED_DIRS, StorageSandbox
from src.services.tools.handlers.data_handlers import (
    handle_calculator,
    handle_date_time_info,
    handle_convert_units,
    handle_validate_json_schema,
    handle_transform_json,
    handle_validate_email_format,
    handle_text_diff,
    handle_regex_extract,
)
from src.services.tools.handlers.file_handlers import (
    handle_read_text_file,
    handle_parse_csv,
    handle_filter_csv_rows,
    handle_summarize_csv_statistics,
    handle_convert_csv_to_json,
    handle_parse_json_file,
    handle_extract_markdown_sections,
    handle_detect_file_metadata,
    handle_chunk_document,
    handle_extract_pdf_text,
    handle_extract_docx_text,
    handle_extract_xlsx_data,
)
from src.services.tools.handlers.web_handlers import (
    handle_extract_web_content,
    handle_extract_web_metadata,
    handle_parse_sitemap,
    handle_search_project_documents,
)
from src.services.tools.handlers.faiss_handlers import (
    handle_get_faiss_document,
    handle_create_faiss_index,
    _init_metadata_db,
    _get_metadata_db_path,
)
from src.db import execute_commit


@pytest.fixture(scope="module")
def sandbox_files():
    """Sets up temporary test files in the authorized uploads sandbox directory."""
    upload_dir = DEFAULT_ALLOWED_DIRS[0]
    upload_dir.mkdir(parents=True, exist_ok=True)

    text_file = upload_dir / "test_sample.txt"
    text_file.write_text("Dòng 1: Xin chào AI-Chan\nDòng 2: Antigravity Agent\nDòng 3: Kết thúc\n", encoding="utf-8")

    csv_file = upload_dir / "test_sample.csv"
    csv_file.write_text("id,name,age,score\n1,Alice,20,85.5\n2,Bob,17,90.0\n3,Charlie,25,78.0\n", encoding="utf-8")

    json_file = upload_dir / "test_sample.json"
    json_file.write_text(json.dumps({"app": "AI-Chan", "version": "1.0", "active": True}), encoding="utf-8")

    md_file = upload_dir / "test_sample.md"
    md_file.write_text("# Tiêu Đề 1\nNội dung phần 1\n## Tiêu Đề 1.1\nNội dung chi tiết 1.1\n# Tiêu Đề 2\nNội dung phần 2\n", encoding="utf-8")

    # Generate a lightweight minimal 1-page valid PDF file using pypdf
    pdf_file = upload_dir / "test_sample.pdf"
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    with open(pdf_file, "wb") as f:
        writer.write(f)

    yield {
        "text": str(text_file),
        "csv": str(csv_file),
        "json": str(json_file),
        "md": str(md_file),
        "pdf": str(pdf_file)
    }

    # Cleanup
    for p in (text_file, csv_file, json_file, md_file, pdf_file):
        try:
            p.unlink()
        except Exception:
            pass


class TestDataToolHandlers:
    def test_01_calculator(self):
        """Tool 1: calculator với AST safe math."""
        res = handle_calculator("(10 * 5) + 20 / 4 - 2^3")
        assert res["result"] == 47.0

        with pytest.raises(ZeroDivisionError):
            handle_calculator("10 / 0")

    def test_02_date_time_info(self):
        """Tool 2: date_time_info với múi giờ."""
        res_utc = handle_date_time_info("UTC")
        assert res_utc["timezone"] == "UTC"
        assert res_utc["year"] >= 2026

        res_vn = handle_date_time_info("Asia/Ho_Chi_Minh")
        assert res_vn["timezone"] in ("Asia/Ho_Chi_Minh", "UTC")

    def test_03_convert_units(self):
        """Tool 3: convert_units chiều dài, khối lượng, nhiệt độ, dung lượng."""
        # Chiều dài
        assert handle_convert_units(1000, "m", "km", "length")["result"] == 1.0
        # Nhiệt độ
        assert handle_convert_units(0, "c", "f", "temperature")["result"] == 32.0
        # Khối lượng
        assert handle_convert_units(1, "kg", "g", "mass")["result"] == 1000.0
        # Dung lượng số
        assert handle_convert_units(1024, "mb", "gb", "digital_storage")["result"] == 1.0

    def test_04_validate_json_schema(self):
        """Tool 4: validate_json_schema kiểm tra dữ liệu theo schema."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}, "age": {"type": "integer"}},
            "required": ["name", "age"]
        }
        valid_res = handle_validate_json_schema({"name": "AI-Chan", "age": 2}, schema)
        assert valid_res["is_valid"] is True

        invalid_res = handle_validate_json_schema({"name": "AI-Chan"}, schema)
        assert invalid_res["is_valid"] is False

    def test_05_transform_json(self):
        """Tool 5: transform_json lọc và đổi tên trường."""
        data = {"user_id": "u1", "full_name": "Antigravity", "secret": "hide_me"}
        res = handle_transform_json(
            data=data,
            field_mapping={"full_name": "name"},
            select_fields=["user_id", "full_name"]
        )
        assert res["transformed_data"] == {"user_id": "u1", "name": "Antigravity"}
        assert "secret" not in res["transformed_data"]

    def test_06_validate_email_format(self):
        """Tool 6: validate_email_format kiểm tra cú pháp email."""
        assert handle_validate_email_format("support@ai-chan.vn")["is_valid"] is True
        assert handle_validate_email_format("invalid-email-format")["is_valid"] is False

    def test_07_text_diff(self):
        """Tool 7: text_diff so sánh hai văn bản."""
        text_a = "Dòng 1\nDòng 2\nDòng 3\n"
        text_b = "Dòng 1\nDòng 2 sửa\nDòng 3\nDòng 4 thêm\n"
        res = handle_text_diff(text_a, text_b)
        assert res["is_identical"] is False
        assert res["additions"] > 0
        assert res["deletions"] > 0

    def test_08_regex_extract(self):
        """Tool 8: regex_extract trích xuất theo mẫu."""
        text = "Liên hệ qua email hotro@ai-chan.vn hoặc admin@ai-chan.com."
        res = handle_regex_extract(r"[\w\.-]+@[\w\.-]+", text)
        assert res["match_count"] == 2
        assert res["matches"][0]["match"] == "hotro@ai-chan.vn"


class TestFileToolHandlers:
    def test_09_read_text_file(self, sandbox_files):
        """Tool 9: read_text_file đọc file text an toàn."""
        res = handle_read_text_file(sandbox_files["text"], max_lines=2)
        assert res["lines_read"] == 2
        assert "Dòng 1" in res["content"]

    def test_10_parse_csv(self, sandbox_files):
        """Tool 10: parse_csv đọc header và kiểu dữ liệu."""
        res = handle_parse_csv(sandbox_files["csv"])
        assert res["columns"] == ["id", "name", "age", "score"]
        assert res["column_types"]["age"] in ("integer", "float")
        assert res["preview_count"] == 3

    def test_11_filter_csv_rows(self, sandbox_files):
        """Tool 11: filter_csv_rows lọc dòng không dùng eval."""
        res = handle_filter_csv_rows(sandbox_files["csv"], column="age", operator=">=", value=18)
        assert res["match_count"] == 2  # Alice (20) & Charlie (25)

    def test_12_summarize_csv_statistics(self, sandbox_files):
        """Tool 12: summarize_csv_statistics thống kê min/max/mean/median."""
        res = handle_summarize_csv_statistics(sandbox_files["csv"], columns=["age", "score"])
        assert res["statistics"]["age"]["min"] == 17
        assert res["statistics"]["age"]["max"] == 25
        assert res["statistics"]["age"]["count"] == 3

    def test_13_convert_csv_to_json(self, sandbox_files):
        """Tool 13: convert_csv_to_json chuyển đổi sang JSON."""
        res = handle_convert_csv_to_json(sandbox_files["csv"])
        assert res["row_count"] == 3
        assert res["data"][0]["name"] == "Alice"

    def test_14_parse_json_file(self, sandbox_files):
        """Tool 14: parse_json_file đọc và parse file JSON."""
        res = handle_parse_json_file(sandbox_files["json"])
        assert res["content"]["app"] == "AI-Chan"

    def test_15_extract_markdown_sections(self, sandbox_files):
        """Tool 15: extract_markdown_sections tách heading."""
        res = handle_extract_markdown_sections(sandbox_files["md"])
        assert res["section_count"] == 3
        assert res["sections"][0]["title"] == "Tiêu Đề 1"

    def test_16_detect_file_metadata(self, sandbox_files):
        """Tool 16: detect_file_metadata kiểm tra kích thước, sha256."""
        res = handle_detect_file_metadata(sandbox_files["csv"])
        assert res["extension"] == ".csv"
        assert res["size_bytes"] > 0
        assert len(res["checksum_sha256"]) == 64

    def test_17_chunk_document(self):
        """Tool 17: chunk_document chia văn bản."""
        text = "A" * 2500
        res = handle_chunk_document(text, chunk_size=1000, chunk_overlap=200)
        assert res["total_chunks"] >= 3

    def test_18_extract_pdf_text(self, sandbox_files):
        """Tool 18: extract_pdf_text trích text từ PDF."""
        res = handle_extract_pdf_text(sandbox_files["pdf"])
        assert res["total_pages"] >= 1


class TestWebAndFAISSToolHandlers:
    def test_19_extract_web_content(self):
        """Tool 19: extract_web_content làm sạch HTML."""
        sample_html = "<html><head><script>alert(1)</script><style>body{color:red}</style></head><body><h1>Tiêu Đề</h1><p>Nội dung chính.</p></body></html>"
        res = handle_extract_web_content(sample_html)
        assert "alert(1)" not in res["text"]
        assert "Tiêu Đề" in res["text"]
        assert "Nội dung chính" in res["text"]

    def test_20_extract_web_metadata(self):
        """Tool 20: extract_web_metadata lấy OpenGraph & title."""
        sample_html = """
        <html>
            <head>
                <title>AI-Chan Homepage</title>
                <meta name="description" content="Trợ lý ảo thông minh">
                <meta property="og:title" content="AI-Chan Assistant">
                <link rel="canonical" href="https://ai-chan.vn/">
            </head>
        </html>
        """
        res = handle_extract_web_metadata(sample_html)
        assert res["title"] == "AI-Chan Homepage"
        assert res["description"] == "Trợ lý ảo thông minh"
        assert res["canonical_url"] == "https://ai-chan.vn/"

    @pytest.mark.asyncio
    async def test_21_parse_sitemap(self, monkeypatch):
        """Tool 21: parse_sitemap trích xuất URLs từ XML."""
        xml_content = b"""<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url><loc>https://example.com/page1</loc></url>
            <url><loc>https://example.com/page2</loc></url>
        </urlset>"""

        class MockResponse:
            content = xml_content

        from src.services.tools.ssrf_guard import SSRFGuardEngine
        async def mock_safe_fetch(url, timeout=15.0):
            return MockResponse()
        monkeypatch.setattr(SSRFGuardEngine, "safe_fetch", mock_safe_fetch)

        res = await handle_parse_sitemap("https://example.com/sitemap.xml")
        assert res["total_urls_found"] == 2
        assert "https://example.com/page1" in res["urls"]

    def test_22_search_project_documents(self):
        """Tool 22: search_project_documents tìm tài liệu theo project."""
        project_id = "prj_test_doc_search"
        att_id = "att_test_search_01"
        execute_commit("INSERT OR IGNORE INTO projects (id, user_id, name) VALUES (?, 'guest_user', 'Test Doc Project')", (project_id,))
        execute_commit(
            """
            INSERT OR REPLACE INTO attachments (id, user_id, project_id, filename, file_size, mime_type, category, storage_path, checksum_sha256, extracted_text)
            VALUES (?, 'guest_user', ?, 'bao_cao_tai_chinh.txt', 1024, 'text/plain', 'document', 'uploads/test.txt', 'dummy_hash', 'Báo cáo doanh thu quý 3 năm 2026 đạt kỷ lục.')
            """,
            (att_id, project_id)
        )

        res = handle_search_project_documents(project_id, "doanh thu")
        assert res["count"] >= 1
        assert res["documents"][0]["filename"] == "bao_cao_tai_chinh.txt"

    def test_23_get_faiss_document(self):
        """Tool 23: get_faiss_document đọc từ metadata SQLite."""
        index_id = "idx_test_snippet_01"
        db_path = _get_metadata_db_path(index_id)
        _init_metadata_db(db_path)

        import sqlite3
        with sqlite3.connect(str(db_path)) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO documents (doc_id, vector_id, content, metadata) VALUES ('doc_42', 0, 'Đoạn trích kiến thức FAISS', '{\"author\": \"AI-Chan\"}')"
            )
            conn.commit()

        res = handle_get_faiss_document(index_id, "doc_42")
        assert res["document_id"] == "doc_42"
        assert res["content"] == "Đoạn trích kiến thức FAISS"

    def test_24_optional_dependencies_graceful_missing_status(self):
        """Kiểm tra các optional dependencies báo lỗi DEPENDENCY_MISSING rõ ràng."""
        # DOCX check
        with pytest.raises(ImportError) as exc_docx:
            handle_extract_docx_text("sample.docx")
        assert "DEPENDENCY_MISSING" in str(exc_docx.value)

        # XLSX check
        with pytest.raises(ImportError) as exc_xlsx:
            handle_extract_xlsx_data("sample.xlsx")
        assert "DEPENDENCY_MISSING" in str(exc_xlsx.value)

        # FAISS check (nếu faiss chưa cài đặt)
        with pytest.raises(ImportError) as exc_faiss:
            handle_create_faiss_index("idx_faiss_test")
        assert "DEPENDENCY_MISSING" in str(exc_faiss.value)

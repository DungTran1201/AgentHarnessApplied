"""
File and Document Tool Handlers
All file access passes through StorageSandbox to prevent path traversal and symlink escapes.
"""

import csv
import hashlib
import json
import os
import re
import statistics
from pathlib import Path
from typing import Dict, Any, List, Optional

from src.services.tools.sandbox import StorageSandbox


# ==============================================================================
# 1. READ TEXT FILE
# ==============================================================================

def handle_read_text_file(
    file_path: str,
    max_lines: int = 1000,
    start_line: int = 1,
    encoding: str = "utf-8"
) -> Dict[str, Any]:
    """Reads lines from a text file within sandbox boundary."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    try:
        with open(safe_path, "r", encoding=encoding, errors="replace") as f:
            lines = []
            current_line_no = 0
            for idx, line in enumerate(f, start=1):
                if idx < start_line:
                    continue
                lines.append(line)
                current_line_no += 1
                if current_line_no >= max_lines:
                    break

        return {
            "file_name": safe_path.name,
            "start_line": start_line,
            "lines_read": len(lines),
            "content": "".join(lines),
            "file_size_bytes": safe_path.stat().st_size
        }
    except Exception as e:
        raise RuntimeError(f"Failed to read text file: {e}") from e


# ==============================================================================
# 2. PARSE CSV
# ==============================================================================

def handle_parse_csv(
    file_path: str,
    delimiter: str = ",",
    max_rows: int = 100,
    encoding: str = "utf-8"
) -> Dict[str, Any]:
    """Parses CSV header, preview rows, and infers column data types."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    with open(safe_path, "r", encoding=encoding, errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        try:
            header = next(reader)
        except StopIteration:
            return {"file_name": safe_path.name, "columns": [], "rows": [], "total_rows_previewed": 0}

        rows = []
        for idx, row in enumerate(reader):
            if idx >= max_rows:
                break
            rows.append(row)

    # Infer column types
    inferred_types = {}
    for col_idx, col_name in enumerate(header):
        has_int, has_float, has_str = False, False, False
        for row in rows:
            if col_idx < len(row):
                val = row[col_idx].strip()
                if not val:
                    continue
                try:
                    int(val)
                    has_int = True
                except ValueError:
                    try:
                        float(val)
                        has_float = True
                    except ValueError:
                        has_str = True
        if has_str:
            inferred_types[col_name] = "string"
        elif has_float:
            inferred_types[col_name] = "float"
        elif has_int:
            inferred_types[col_name] = "integer"
        else:
            inferred_types[col_name] = "string"

    return {
        "file_name": safe_path.name,
        "columns": header,
        "column_types": inferred_types,
        "total_columns": len(header),
        "preview_rows": rows,
        "preview_count": len(rows)
    }


# ==============================================================================
# 3. FILTER CSV ROWS (DECLARATIVE PREDICATES WITHOUT EVAL)
# ==============================================================================

def handle_filter_csv_rows(
    file_path: str,
    column: str,
    operator: str,
    value: Any,
    delimiter: str = ",",
    max_rows: int = 100,
    encoding: str = "utf-8"
) -> Dict[str, Any]:
    """Filters CSV rows by evaluating safe comparison operators without eval()."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)
    op = operator.strip().lower()

    valid_ops = {"==", "!=", ">", "<", ">=", "<=", "contains", "startswith", "endswith"}
    if op not in valid_ops:
        raise ValueError(f"Unsupported operator '{operator}'. Allowed: {list(valid_ops)}")

    with open(safe_path, "r", encoding=encoding, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        if not reader.fieldnames or column not in reader.fieldnames:
            raise ValueError(f"Column '{column}' not found in CSV headers: {reader.fieldnames}")

        matched_rows = []
        for row in reader:
            cell_val = row.get(column, "")
            # Try numeric comparison if value is numeric
            is_match = False
            try:
                target_num = float(value)
                cell_num = float(cell_val)
                if op == "==": is_match = (cell_num == target_num)
                elif op == "!=": is_match = (cell_num != target_num)
                elif op == ">": is_match = (cell_num > target_num)
                elif op == "<": is_match = (cell_num < target_num)
                elif op == ">=": is_match = (cell_num >= target_num)
                elif op == "<=": is_match = (cell_num <= target_num)
            except (ValueError, TypeError):
                # Fallback to string comparison
                cell_str = str(cell_val)
                target_str = str(value)
                if op == "==": is_match = (cell_str == target_str)
                elif op == "!=": is_match = (cell_str != target_str)
                elif op == ">": is_match = (cell_str > target_str)
                elif op == "<": is_match = (cell_str < target_str)
                elif op == ">=": is_match = (cell_str >= target_str)
                elif op == "<=": is_match = (cell_str <= target_str)
                elif op == "contains": is_match = (target_str.lower() in cell_str.lower())
                elif op == "startswith": is_match = cell_str.startswith(target_str)
                elif op == "endswith": is_match = cell_str.endswith(target_str)

            if is_match:
                matched_rows.append(row)
                if len(matched_rows) >= max_rows:
                    break

    return {
        "file_name": safe_path.name,
        "filter_column": column,
        "operator": op,
        "target_value": value,
        "match_count": len(matched_rows),
        "matched_rows": matched_rows
    }


# ==============================================================================
# 4. SUMMARIZE CSV STATISTICS
# ==============================================================================

def handle_summarize_csv_statistics(
    file_path: str,
    columns: Optional[List[str]] = None,
    delimiter: str = ",",
    encoding: str = "utf-8"
) -> Dict[str, Any]:
    """Calculates count, missing values, min, max, mean, median for numeric columns."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    with open(safe_path, "r", encoding=encoding, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        if not reader.fieldnames:
            return {"file_name": safe_path.name, "statistics": {}}

        target_cols = columns if columns else reader.fieldnames
        column_data: Dict[str, List[float]] = {col: [] for col in target_cols if col in reader.fieldnames}
        missing_counts = {col: 0 for col in column_data}
        total_rows = 0

        for row in reader:
            total_rows += 1
            for col in column_data:
                val = row.get(col, "").strip()
                if not val:
                    missing_counts[col] += 1
                    continue
                try:
                    column_data[col].append(float(val))
                except ValueError:
                    missing_counts[col] += 1

    stats = {}
    for col, values in column_data.items():
        if values:
            stats[col] = {
                "count": len(values),
                "missing": missing_counts[col],
                "min": min(values),
                "max": max(values),
                "mean": round(statistics.mean(values), 4),
                "median": round(statistics.median(values), 4),
            }
        else:
            stats[col] = {
                "count": 0,
                "missing": missing_counts[col],
                "note": "Non-numeric or empty column"
            }

    return {
        "file_name": safe_path.name,
        "total_rows": total_rows,
        "statistics": stats
    }


# ==============================================================================
# 5. CONVERT CSV TO JSON
# ==============================================================================

def handle_convert_csv_to_json(
    file_path: str,
    delimiter: str = ",",
    max_rows: int = 500,
    encoding: str = "utf-8"
) -> Dict[str, Any]:
    """Converts CSV file rows into a JSON records array."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    records = []
    with open(safe_path, "r", encoding=encoding, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        for idx, row in enumerate(reader):
            if idx >= max_rows:
                break
            records.append(dict(row))

    return {
        "file_name": safe_path.name,
        "row_count": len(records),
        "data": records
    }


# ==============================================================================
# 6. PARSE JSON FILE
# ==============================================================================

def handle_parse_json_file(file_path: str, max_bytes: int = 5242880) -> Dict[str, Any]:
    """Parses and validates JSON file within size bounds."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    size = safe_path.stat().st_size
    if size > max_bytes:
        raise ValueError(f"JSON file size ({size} bytes) exceeds maximum limit ({max_bytes} bytes).")

    with open(safe_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON syntax in file '{safe_path.name}': {e}") from e

    data_type = type(data).__name__
    item_count = len(data) if isinstance(data, (list, dict)) else 1

    return {
        "file_name": safe_path.name,
        "data_type": data_type,
        "item_count": item_count,
        "content": data
    }


# ==============================================================================
# 7. EXTRACT MARKDOWN SECTIONS
# ==============================================================================

_HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def handle_extract_markdown_sections(file_path: str) -> Dict[str, Any]:
    """Extracts headings and sections from a Markdown document."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    sections = []
    matches = list(_HEADING_REGEX.finditer(content))

    for idx, match in enumerate(matches):
        level = len(match.group(1))
        title = match.group(2).strip()
        start_pos = match.end()
        end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(content)
        body = content[start_pos:end_pos].strip()

        sections.append({
            "section_index": idx + 1,
            "level": level,
            "title": title,
            "content": body[:2000]  # snippet
        })

    return {
        "file_name": safe_path.name,
        "section_count": len(sections),
        "sections": sections
    }


# ==============================================================================
# 8. DETECT FILE METADATA & MAGIC BYTES
# ==============================================================================

def handle_detect_file_metadata(file_path: str) -> Dict[str, Any]:
    """Detects MIME type, magic bytes, SHA-256 hash, and size without executing the file."""
    safe_path = StorageSandbox.resolve_safe_path(file_path)

    stat = safe_path.stat()
    sha256 = hashlib.sha256()

    with open(safe_path, "rb") as f:
        head = f.read(2048)
        sha256.update(head)
        while chunk := f.read(65536):
            sha256.update(chunk)

    detected_mime = "application/octet-stream"
    try:
        import filetype
        kind = filetype.guess(head)
        if kind:
            detected_mime = kind.mime
    except ImportError:
        pass

    # Fallback to extension if MIME is generic
    ext = safe_path.suffix.lower()

    return {
        "file_name": safe_path.name,
        "extension": ext,
        "size_bytes": stat.st_size,
        "checksum_sha256": sha256.hexdigest(),
        "mime_type": detected_mime
    }


# ==============================================================================
# 9. CHUNK DOCUMENT
# ==============================================================================

def handle_chunk_document(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> Dict[str, Any]:
    """Splits text into chunks with sliding overlap for search indexing."""
    if not text or not isinstance(text, str):
        return {"total_chunks": 0, "chunks": []}

    c_size = max(100, min(10000, chunk_size))
    c_overlap = max(0, min(c_size - 50, chunk_overlap))

    chunks = []
    start = 0
    idx = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + c_size, text_len)
        chunk_str = text[start:end]
        chunks.append({
            "chunk_index": idx,
            "start_char": start,
            "end_char": end,
            "text": chunk_str
        })
        idx += 1
        if end >= text_len:
            break
        start += (c_size - c_overlap)

    return {
        "total_chunks": len(chunks),
        "chunk_size": c_size,
        "chunk_overlap": c_overlap,
        "chunks": chunks
    }


# ==============================================================================
# 10. EXTRACT PDF TEXT (USES PYPDF)
# ==============================================================================

def handle_extract_pdf_text(file_path: str, max_pages: int = 50) -> Dict[str, Any]:
    """Extracts text content from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError as e:
        raise ImportError("DEPENDENCY_MISSING: 'pypdf' package is not installed. Run `pip install pypdf`.") from e

    safe_path = StorageSandbox.resolve_safe_path(file_path)

    try:
        reader = PdfReader(str(safe_path))
        num_pages = len(reader.pages)
        pages_to_extract = min(num_pages, max(1, max_pages))

        extracted_pages = []
        full_text = []

        for p_idx in range(pages_to_extract):
            page = reader.pages[p_idx]
            page_text = page.extract_text() or ""
            extracted_pages.append({
                "page_number": p_idx + 1,
                "text": page_text
            })
            full_text.append(page_text)

        return {
            "file_name": safe_path.name,
            "total_pages": num_pages,
            "pages_extracted": pages_to_extract,
            "text": "\n\n".join(full_text),
            "pages": extracted_pages
        }
    except Exception as e:
        raise RuntimeError(f"Failed to extract PDF text from '{safe_path.name}': {e}") from e


# ==============================================================================
# 11 & 12. OPTIONAL DEPENDENCY HANDLERS (DOCX, XLSX)
# ==============================================================================

def handle_extract_docx_text(file_path: str) -> Dict[str, Any]:
    """Extracts text and headings from Word DOCX file (optional dependency)."""
    try:
        import docx
    except ImportError as e:
        raise ImportError("DEPENDENCY_MISSING: 'python-docx' is required. Run `pip install python-docx`.") from e

    safe_path = StorageSandbox.resolve_safe_path(file_path)
    doc = docx.Document(str(safe_path))
    paragraphs = [p.text for p in doc.paragraphs if p.text]
    return {
        "file_name": safe_path.name,
        "paragraph_count": len(paragraphs),
        "text": "\n".join(paragraphs)
    }


def handle_extract_xlsx_data(file_path: str, max_rows: int = 100) -> Dict[str, Any]:
    """Reads worksheets and tables from Excel XLSX file (optional dependency)."""
    try:
        import openpyxl
    except ImportError as e:
        raise ImportError("DEPENDENCY_MISSING: 'openpyxl' is required. Run `pip install openpyxl`.") from e

    safe_path = StorageSandbox.resolve_safe_path(file_path)
    wb = openpyxl.load_workbook(str(safe_path), read_only=True)
    sheets_data = {}
    for sheet_name in wb.sheetnames[:5]:
        sheet = wb[sheet_name]
        rows = []
        for r_idx, row in enumerate(sheet.iter_rows(values_only=True)):
            if r_idx >= max_rows:
                break
            rows.append(list(row))
        sheets_data[sheet_name] = rows

    return {
        "file_name": safe_path.name,
        "sheets": wb.sheetnames,
        "data": sheets_data
    }

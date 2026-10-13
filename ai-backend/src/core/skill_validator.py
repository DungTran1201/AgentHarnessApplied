import re
import yaml
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

NAME_REGEX = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

class ValidationErrorItem(BaseModel):
    code: str
    field: str
    message: str
    severity: str = "ERROR"
    remediation: str

class ValidationWarningItem(BaseModel):
    code: str
    field: str
    message: str
    severity: str = "WARNING"
    remediation: str

class SkillValidationReport(BaseModel):
    is_valid: bool
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    body: str = ""
    errors: List[ValidationErrorItem] = Field(default_factory=list)
    warnings: List[ValidationWarningItem] = Field(default_factory=list)

def split_frontmatter_and_body(content: str) -> tuple[Optional[str], str]:
    """
    Tách nội dung tệp SKILL.md thành frontmatter (YAML) và Markdown body.
    Frontmatter bắt đầu bằng '---' ở đầu và kết thúc bằng '---'.
    """
    if not content:
        return None, ""
    
    # Chuẩn hóa line endings thành \n
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")
    
    if not lines or lines[0].strip() != "---":
        return None, normalized

    closing_index = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            closing_index = i
            break

    if closing_index == -1:
        return None, normalized

    frontmatter_text = "\n".join(lines[1:closing_index])
    body_text = "\n".join(lines[closing_index + 1:])
    return frontmatter_text, body_text

def validate_skill_content(
    content: str,
    parent_folder_name: Optional[str] = None,
    existing_files: Optional[List[str]] = None
) -> SkillValidationReport:
    """
    Thực hiện kiểm tra tính hợp lệ của tệp SKILL.md theo Agent Skills Specification:
    - Bắt buộc: name, description.
    - Cú pháp name: 1-64 ký tự, a-z, 0-9, dấu gạch nối, khớp tên thư mục cha.
    - Mô tả: 1-1024 ký tự, không rỗng.
    - Khả năng tương thích: tối đa 500 ký tự nếu có.
    """
    errors: List[ValidationErrorItem] = []
    warnings: List[ValidationWarningItem] = []
    metadata: Dict[str, Any] = {}
    body = ""

    if not content or not content.strip():
        errors.append(ValidationErrorItem(
            code="ERR-001",
            field="content",
            message="Tệp bắt buộc SKILL.md không tồn tại hoặc nội dung rỗng.",
            remediation="Tạo tệp SKILL.md có YAML frontmatter và hướng dẫn Markdown."
        ))
        return SkillValidationReport(is_valid=False, status="INVALID", errors=errors, warnings=warnings)

    frontmatter_text, body = split_frontmatter_and_body(content)

    if frontmatter_text is None:
        errors.append(ValidationErrorItem(
            code="ERR-002",
            field="frontmatter",
            message="Không tìm thấy YAML frontmatter hợp lệ bắt đầu và đóng bằng cặp '---'.",
            remediation="Bổ sung '---' ở đầu tệp và '---' ở cuối khối frontmatter."
        ))
        return SkillValidationReport(is_valid=False, status="INVALID", errors=errors, warnings=warnings, body=body)

    try:
        parsed_yaml = yaml.safe_load(frontmatter_text)
        if not isinstance(parsed_yaml, dict):
            errors.append(ValidationErrorItem(
                code="ERR-002",
                field="frontmatter",
                message="Frontmatter phải là một từ điển (mapping key-value) hợp lệ.",
                remediation="Cấu trúc lại frontmatter dạng cặp key: value."
            ))
            parsed_yaml = {}
        metadata = parsed_yaml or {}
    except yaml.YAMLError as e:
        errors.append(ValidationErrorItem(
            code="ERR-002",
            field="frontmatter",
            message=f"Lỗi cú pháp YAML: {str(e)}",
            remediation="Kiểm tra thụt lề và dấu hai chấm của các trường YAML."
        ))
        return SkillValidationReport(is_valid=False, status="INVALID", errors=errors, warnings=warnings, body=body)

    # 1. Kiểm tra trường 'name'
    if "name" not in metadata or metadata["name"] is None:
        errors.append(ValidationErrorItem(
            code="ERR-003",
            field="name",
            message="Thiếu trường bắt buộc 'name' trong YAML frontmatter.",
            remediation="Thêm trường 'name: your-skill-name'."
        ))
    else:
        name_val = str(metadata["name"]).strip()
        if not name_val:
            errors.append(ValidationErrorItem(
                code="ERR-003",
                field="name",
                message="Trường 'name' không được để trống.",
                remediation="Đặt tên kỹ năng theo quy chuẩn (ví dụ: pdf-processing)."
            ))
        elif len(name_val) > 64:
            errors.append(ValidationErrorItem(
                code="ERR-004",
                field="name",
                message=f"Tên kỹ năng '{name_val}' vượt quá giới hạn 64 ký tự (hiện có: {len(name_val)} ký tự).",
                remediation="Rút ngắn tên kỹ năng xuống tối đa 64 ký tự."
            ))
        elif not NAME_REGEX.match(name_val):
            errors.append(ValidationErrorItem(
                code="ERR-004",
                field="name",
                message=f"Tên kỹ năng '{name_val}' không hợp lệ: Chỉ cho phép chữ thường (a-z), chữ số (0-9) và dấu gạch nối (-). Không được có dấu gạch nối liên tiếp hoặc ở đầu/cuối.",
                remediation="Đổi tên chỉ chứa chữ thường, số và dấu gạch nối đơn (ví dụ: data-analysis)."
            ))
        elif parent_folder_name and name_val != parent_folder_name:
            errors.append(ValidationErrorItem(
                code="ERR-005",
                field="name",
                message=f"Tên kỹ năng '{name_val}' không khớp với tên thư mục chứa '{parent_folder_name}'.",
                remediation=f"Đổi trường name thành '{parent_folder_name}' hoặc đổi tên thư mục cha."
            ))

    # 2. Kiểm tra trường 'description'
    if "description" not in metadata or metadata["description"] is None:
        errors.append(ValidationErrorItem(
            code="ERR-006",
            field="description",
            message="Thiếu trường bắt buộc 'description' trong YAML frontmatter.",
            remediation="Bổ sung trường 'description' mô tả chức năng và ngữ cảnh sử dụng."
        ))
    else:
        desc_val = str(metadata["description"]).strip()
        if not desc_val:
            errors.append(ValidationErrorItem(
                code="ERR-006",
                field="description",
                message="Trường 'description' không được để trống.",
                remediation="Điền mô tả chi tiết chức năng kỹ năng."
            ))
        elif len(desc_val) > 1024:
            errors.append(ValidationErrorItem(
                code="ERR-007",
                field="description",
                message=f"Mô tả vượt quá độ dài tối đa 1024 ký tự (hiện có: {len(desc_val)} ký tự).",
                remediation="Rút ngắn mô tả xuống dưới 1024 ký tự."
            ))
        else:
            if len(desc_val) < 20 or ("use when" not in desc_val.lower() and "khi" not in desc_val.lower()):
                warnings.append(ValidationWarningItem(
                    code="WARN-002",
                    field="description",
                    message="Mô tả kỹ năng còn ngắn hoặc chưa nêu rõ ngữ cảnh kích hoạt ('Use when...').",
                    remediation="Khuyến nghị bổ sung ngữ cảnh: 'Use when handling PDF documents or extracting forms.'"
                ))

    # 3. Kiểm tra trường 'compatibility'
    if "compatibility" in metadata and metadata["compatibility"] is not None:
        compat_val = str(metadata["compatibility"]).strip()
        if len(compat_val) > 500:
            errors.append(ValidationErrorItem(
                code="ERR-008",
                field="compatibility",
                message=f"Trường 'compatibility' vượt quá 500 ký tự (hiện có: {len(compat_val)} ký tự).",
                remediation="Rút gọn yêu cầu môi trường xuống dưới 500 ký tự."
            ))

    # 4. Kiểm tra thân bài Markdown
    body_lines = [line for line in body.split("\n") if line.strip()]
    if len(body_lines) > 500:
        warnings.append(ValidationWarningItem(
            code="WARN-001",
            field="body",
            message=f"Thân bài hướng dẫn dài hơn 500 dòng ({len(body_lines)} dòng).",
            remediation="Khuyến nghị tách các bảng tra cứu chi tiết sang thư mục references/ để tối ưu token."
        ))

    # 5. Kiểm tra tệp trong scripts nếu có danh sách tệp
    if existing_files:
        has_scripts = any(f.startswith("scripts/") for f in existing_files)
        if has_scripts:
            warnings.append(ValidationWarningItem(
                code="WARN-004",
                field="scripts",
                message="Phát hiện tệp trong thư mục scripts/. Lưu ý: tệp script chỉ được đọc tham khảo, không tự động thực thi.",
                remediation="Đảm bảo các script có tài liệu hướng dẫn và tuân thủ ranh giới an toàn."
            ))

    is_valid = len(errors) == 0
    status = "VALID" if is_valid else "INVALID"

    return SkillValidationReport(
        is_valid=is_valid,
        status=status,
        metadata=metadata,
        body=body,
        errors=errors,
        warnings=warnings
    )

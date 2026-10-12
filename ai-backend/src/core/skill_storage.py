import os
import shutil
import zipfile
import io
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

BASE_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "storage" / "skills"
TEMP_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "storage" / "temp"

# Giới hạn an toàn
MAX_ZIP_SIZE = 10 * 1024 * 1024         # 10 MB tệp ZIP tải lên
MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024  # 50 MB sau khi giải nén (Chống Zip Bomb)
MAX_FILE_COUNT = 100                     # Tối đa 100 tệp trong một gói

def ensure_storage_dirs():
    BASE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def sanitize_path(base_dir: Path, relative_path: str) -> Path:
    """
    Ngăn chặn Path Traversal và bảo đảm đường dẫn nằm trọn trong base_dir.
    """
    clean_rel = relative_path.lstrip("/\\")
    resolved = (base_dir / clean_rel).resolve()
    base_resolved = base_dir.resolve()
    
    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        raise ValueError(f"Phát hiện đường dẫn không an toàn hoặc vượt ra ngoài thư mục lưu trữ: {relative_path}")
        
    return resolved

def get_skill_dir(user_id: str, skill_name: str) -> Path:
    ensure_storage_dirs()
    user_dir = BASE_STORAGE_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return sanitize_path(user_dir, skill_name)

def create_skill_filesystem(user_id: str, skill_name: str, raw_content: str) -> Path:
    """
    Khởi tạo thư mục kỹ năng và ghi tệp SKILL.md.
    """
    skill_dir = get_skill_dir(user_id, skill_name)
    skill_dir.mkdir(parents=True, exist_ok=True)
    
    # Tạo sẵn các thư mục con quy ước nếu chưa có
    (skill_dir / "references").mkdir(exist_ok=True)
    (skill_dir / "assets").mkdir(exist_ok=True)
    
    skill_md_path = skill_dir / "SKILL.md"
    skill_md_path.write_text(raw_content, encoding="utf-8")
    return skill_dir

def read_skill_md_content(storage_path: str) -> str:
    path = Path(storage_path) / "SKILL.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

def write_skill_md_content(storage_path: str, content: str) -> None:
    path = Path(storage_path) / "SKILL.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def list_skill_files(storage_path: str) -> List[Dict[str, Any]]:
    base_path = Path(storage_path)
    if not base_path.exists():
        return []

    file_list: List[Dict[str, Any]] = []
    for root, _, files in os.walk(base_path):
        for file_name in files:
            full_path = Path(root) / file_name
            rel_path = full_path.relative_to(base_path).as_posix()
            
            # Phân loại danh mục
            if rel_path == "SKILL.md":
                cat = "ROOT_DOC"
            elif rel_path.startswith("scripts/"):
                cat = "SCRIPT"
            elif rel_path.startswith("references/"):
                cat = "REFERENCE"
            elif rel_path.startswith("assets/"):
                cat = "ASSET"
            else:
                cat = "REFERENCE"

            try:
                stat = full_path.stat()
                file_list.append({
                    "path": rel_path,
                    "category": cat,
                    "size_bytes": stat.st_size,
                    "updated_at": stat.st_mtime
                })
            except OSError:
                continue

    return sorted(file_list, key=lambda x: (0 if x["path"] == "SKILL.md" else 1, x["path"]))

def delete_skill_filesystem(storage_path: str) -> None:
    path = Path(storage_path)
    if path.exists() and path.is_dir():
        shutil.rmtree(path, ignore_errors=True)

def export_skill_to_zip(storage_path: str, skill_name: str) -> bytes:
    """
    Đóng gói toàn bộ thư mục kỹ năng thành tệp ZIP chuẩn.
    """
    path = Path(storage_path)
    if not path.exists():
        raise FileNotFoundError(f"Thư mục kỹ năng không tồn tại: {storage_path}")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(path):
            for file_name in files:
                file_path = Path(root) / file_name
                arc_name = file_path.relative_to(path).as_posix()
                # Bao gồm thư mục gốc của skill trong ZIP
                full_arc_name = f"{skill_name}/{arc_name}"
                zf.write(file_path, arcname=full_arc_name)

    buffer.seek(0)
    return buffer.getvalue()

def inspect_and_extract_zip(
    zip_bytes: bytes,
    user_id: str
) -> Tuple[str, str, Path]:
    """
    Kiểm tra bảo mật và giải nén an toàn:
    1. Kiểm tra Zip Slip (đường dẫn chứa ../ hoặc tuyệt đối).
    2. Kiểm tra Zip Bomb (giới hạn dung lượng và số lượng tệp).
    3. Trả về: (skill_name, raw_skill_md, final_dest_dir).
    """
    ensure_storage_dirs()
    if len(zip_bytes) > MAX_ZIP_SIZE:
        raise ValueError(f"Dung lượng tệp ZIP vượt quá giới hạn tối đa {MAX_ZIP_SIZE // (1024 * 1024)} MB.")

    zip_buffer = io.BytesIO(zip_bytes)
    if not zipfile.is_zipfile(zip_buffer):
        raise ValueError("Tệp tải lên không phải là định dạng ZIP hợp lệ.")

    temp_id = hashlib.md5(zip_bytes[:1024] + str(os.urandom(16)).encode()).hexdigest()
    temp_extract_dir = TEMP_STORAGE_DIR / f"import_{temp_id}"
    temp_extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        total_extracted_size = 0
        file_count = 0

        with zipfile.ZipFile(zip_buffer, "r") as zf:
            infolist = zf.infolist()
            if len(infolist) > MAX_FILE_COUNT:
                raise ValueError(f"Số lượng tệp trong gói nén vượt quá giới hạn ({len(infolist)} > {MAX_FILE_COUNT}).")

            for info in infolist:
                file_count += 1
                total_extracted_size += info.file_size
                if total_extracted_size > MAX_UNCOMPRESSED_SIZE:
                    raise ValueError("Phát hiện nguy cơ Zip Bomb: Dung lượng sau giải nén vượt quá 50 MB.")

                filename = info.filename
                # Ngăn chặn Zip Slip
                if filename.startswith("/") or filename.startswith("\\") or ".." in filename.split("/"):
                    raise ValueError(f"Phát hiện đường dẫn tệp nguy hiểm (Zip Slip): '{filename}'")

                # Bỏ qua các tệp ẩn MacOS/Windows rác
                if "__MACOSX" in filename or ".DS_Store" in filename:
                    continue

                target_file = sanitize_path(temp_extract_dir, filename)
                if info.is_dir():
                    target_file.mkdir(parents=True, exist_ok=True)
                else:
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src, open(target_file, "wb") as dst:
                        shutil.copyfileobj(src, dst)

        # Tìm kiếm tệp SKILL.md trong thư mục tạm
        skill_md_candidates = list(temp_extract_dir.glob("**/SKILL.md"))
        if not skill_md_candidates:
            raise ValueError("Gói kỹ năng không hợp lệ: Thiếu tệp bắt buộc SKILL.md.")

        # Lấy tệp SKILL.md cấp cao nhất
        skill_md_file = min(skill_md_candidates, key=lambda p: len(p.parts))
        package_root = skill_md_file.parent
        raw_skill_md = skill_md_file.read_text(encoding="utf-8")

        # Xác định tên skill từ thư mục hoặc frontmatter
        skill_folder_name = package_root.name
        if skill_folder_name == temp_extract_dir.name:
            skill_folder_name = "imported-skill"

        # Di chuyển vào kho lưu trữ chính thức của user
        final_dir = get_skill_dir(user_id, skill_folder_name)
        if final_dir.exists():
            shutil.rmtree(final_dir, ignore_errors=True)

        shutil.move(str(package_root), str(final_dir))
        return skill_folder_name, raw_skill_md, final_dir

    finally:
        # Dọn dẹp thư mục tạm
        if temp_extract_dir.exists():
            shutil.rmtree(temp_extract_dir, ignore_errors=True)

def add_additional_resource(storage_path: str, relative_path: str, file_bytes: bytes) -> None:
    base = Path(storage_path)
    clean_rel = relative_path.replace("\\", "/").strip("/")
    
    # Chỉ cho phép tải lên vào references/ hoặc assets/
    if not (clean_rel.startswith("references/") or clean_rel.startswith("assets/")):
        raise ValueError("Tài nguyên bổ trợ chỉ được phép đặt trong thư mục references/ hoặc assets/.")

    target = sanitize_path(base, clean_rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(file_bytes)

def remove_additional_resource(storage_path: str, relative_path: str) -> None:
    base = Path(storage_path)
    clean_rel = relative_path.replace("\\", "/").strip("/")
    if clean_rel == "SKILL.md":
        raise ValueError("Không thể xóa tệp bắt buộc SKILL.md.")
        
    target = sanitize_path(base, clean_rel)
    if target.exists() and target.is_file():
        target.unlink()

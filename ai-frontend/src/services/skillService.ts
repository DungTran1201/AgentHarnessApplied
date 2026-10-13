import {
  SkillSummary,
  SkillDetail,
  SkillListResponse,
  SkillCreateRequest,
  SkillUpdateRequest,
  SkillValidationReport,
  FileTreeItem,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

function getAuthHeaders(includeContentType = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ai_chan_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export class SkillService {
  /**
   * Lấy danh sách kỹ năng thuộc quyền sở hữu của người dùng.
   */
  static async getSkills(
    query?: string,
    status: string = 'ALL',
    source: string = 'ALL',
    sort: string = 'updated_desc'
  ): Promise<SkillListResponse> {
    const params = new URLSearchParams({ status, source, sort });
    if (query && query.trim()) {
      params.append('q', query.trim());
    }

    const res = await fetch(`${BASE_URL}/skills?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể tải danh sách kỹ năng');
    }

    return res.json();
  }

  /**
   * Lấy chi tiết một kỹ năng (metadata, raw SKILL.md, cây tệp, validation report).
   */
  static async getSkill(id: string): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không tìm thấy kỹ năng hoặc bạn không có quyền truy cập');
    }

    return res.json();
  }

  /**
   * Tạo mới kỹ năng từ template.
   */
  static async createSkill(data: SkillCreateRequest): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể tạo kỹ năng');
    }

    return res.json();
  }

  /**
   * Cập nhật kỹ năng (hỗ trợ Lưu nháp hoặc Lưu & Kích hoạt).
   */
  static async updateSkill(id: string, data: SkillUpdateRequest): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể cập nhật kỹ năng');
    }

    return res.json();
  }

  /**
   * Xóa một kỹ năng.
   */
  static async deleteSkill(id: string): Promise<{ success: boolean; message: string; deleted_id: string }> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể xóa kỹ năng');
    }

    return res.json();
  }

  /**
   * Nhân bản kỹ năng.
   */
  static async cloneSkill(id: string): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể nhân bản kỹ năng');
    }

    return res.json();
  }

  /**
   * Kiểm tra định dạng không trạng thái (Validate stateless).
   */
  static async validateSkill(rawSkillMd: string, parentFolderName?: string): Promise<SkillValidationReport> {
    const res = await fetch(`${BASE_URL}/skills/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        raw_skill_md: rawSkillMd,
        parent_folder_name: parentFolderName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Lỗi kiểm tra định dạng kỹ năng');
    }

    return res.json();
  }

  /**
   * Nhập gói kỹ năng từ tệp .zip.
   */
  static async importSkill(file: File): Promise<SkillDetail> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/skills/import`, {
      method: 'POST',
      headers: getAuthHeaders(false), // để trình duyệt tự set multipart boundary
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể nhập gói kỹ năng');
    }

    return res.json();
  }

  /**
   * Đường dẫn tải xuống tệp .zip của một kỹ năng.
   */
  static getExportUrl(id: string): string {
    return `${BASE_URL}/skills/${encodeURIComponent(id)}/export`;
  }

  /**
   * Tải xuống trực tiếp tệp zip của kỹ năng.
   */
  static async exportSkillZip(id: string, name: string): Promise<void> {
    const url = this.getExportUrl(id);
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      throw new Error('Không thể tải xuống gói ZIP kỹ năng');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Tải lên tệp tài nguyên bổ trợ.
   */
  static async addResource(id: string, file: File, folder: 'references' | 'assets'): Promise<{ success: boolean; file_tree: FileTreeItem[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}/resources?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể thêm tệp tài nguyên');
    }

    return res.json();
  }

  /**
   * Xóa tệp tài nguyên bổ trợ.
   */
  static async deleteResource(id: string, relativePath: string): Promise<{ success: boolean; file_tree: FileTreeItem[] }> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}/resources?relative_path=${encodeURIComponent(relativePath)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể xóa tệp tài nguyên');
    }

    return res.json();
  }
}

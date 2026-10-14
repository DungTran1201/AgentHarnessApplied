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
   * Fetch list of skills owned by the current user.
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
      throw new Error(msg || 'Failed to fetch skills.');
    }

    return res.json();
  }

  /**
   * Fetch details for a specific skill (metadata, raw SKILL.md, file tree, validation report).
   */
  static async getSkill(id: string): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Skill not found or access denied.');
    }

    return res.json();
  }

  /**
   * Create a new skill from template.
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
      throw new Error(msg || 'Failed to create skill.');
    }

    return res.json();
  }

  /**
   * Update skill (supports draft or save & activate).
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
      throw new Error(msg || 'Failed to update skill.');
    }

    return res.json();
  }

  /**
   * Delete a skill.
   */
  static async deleteSkill(id: string): Promise<{ success: boolean; message: string; deleted_id: string }> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to delete skill.');
    }

    return res.json();
  }

  /**
   * Duplicate/clone a skill.
   */
  static async cloneSkill(id: string): Promise<SkillDetail> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to duplicate skill.');
    }

    return res.json();
  }

  /**
   * Statelessly validate skill format.
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
      throw new Error(msg || 'Skill format validation failed.');
    }

    return res.json();
  }

  /**
   * Import a skill package from a .zip file.
   */
  static async importSkill(file: File): Promise<SkillDetail> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/skills/import`, {
      method: 'POST',
      headers: getAuthHeaders(false), // let browser set multipart boundary
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to import skill package.');
    }

    return res.json();
  }

  /**
   * Get download URL for a skill .zip archive.
   */
  static getExportUrl(id: string): string {
    return `${BASE_URL}/skills/${encodeURIComponent(id)}/export`;
  }

  /**
   * Directly download the skill .zip archive.
   */
  static async exportSkillZip(id: string, name: string): Promise<void> {
    const url = this.getExportUrl(id);
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      throw new Error('Failed to download skill ZIP package.');
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
   * Upload an auxiliary resource file.
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
      throw new Error(msg || 'Failed to add resource file.');
    }

    return res.json();
  }

  /**
   * Delete an auxiliary resource file.
   */
  static async deleteResource(id: string, relativePath: string): Promise<{ success: boolean; file_tree: FileTreeItem[] }> {
    const res = await fetch(`${BASE_URL}/skills/${encodeURIComponent(id)}/resources?relative_path=${encodeURIComponent(relativePath)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to delete resource file.');
    }

    return res.json();
  }
}

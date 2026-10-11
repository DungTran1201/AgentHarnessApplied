import {
  SystemPromptSummary,
  SystemPromptDetail,
  SystemPromptListResponse,
  SystemPromptCreateRequest,
  SystemPromptUpdateRequest,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ai_chan_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export class SystemPromptService {
  /**
   * Lấy danh sách System Prompt của người dùng hiện tại (hoặc guest_user).
   * Chỉ trả về metadata và content_length.
   */
  static async getPrompts(query?: string, sort: string = 'updated_desc'): Promise<SystemPromptListResponse> {
    const params = new URLSearchParams({ sort });
    if (query && query.trim()) {
      params.append('q', query.trim());
    }

    const res = await fetch(`${BASE_URL}/system-prompts?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể tải danh sách System Prompt');
    }

    return res.json();
  }

  /**
   * Lấy thông tin chi tiết một System Prompt (bao gồm full content).
   */
  static async getPrompt(id: string): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không tìm thấy System Prompt hoặc không có quyền truy cập');
    }

    return res.json();
  }

  /**
   * Tạo mới một System Prompt.
   */
  static async createPrompt(data: SystemPromptCreateRequest): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể tạo System Prompt');
    }

    return res.json();
  }

  /**
   * Cập nhật thông tin một System Prompt.
   */
  static async updatePrompt(id: string, data: SystemPromptUpdateRequest): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể cập nhật System Prompt');
    }

    return res.json();
  }

  /**
   * Xóa một System Prompt khỏi cơ sở dữ liệu.
   */
  static async deletePrompt(id: string): Promise<{ success: boolean; message: string; deleted_id: string }> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể xóa System Prompt');
    }

    return res.json();
  }

  /**
   * Nhân bản một System Prompt có sẵn.
   */
  static async clonePrompt(id: string): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Không thể nhân bản System Prompt');
    }

    return res.json();
  }
}

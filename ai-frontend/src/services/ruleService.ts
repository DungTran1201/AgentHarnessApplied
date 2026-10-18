import {
  Rule,
  RuleCreatePayload,
  RuleUpdatePayload,
  PaginatedRuleResponse,
  RuleAssociatedProject
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

export interface GetRulesFilterParams {
  search?: string;
  scope?: string;
  activation_mode?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}

export class RuleService {
  /**
   * Lấy danh sách rules có phân trang, lọc và tìm kiếm.
   */
  static async getRules(filters: GetRulesFilterParams = {}): Promise<PaginatedRuleResponse> {
    const params = new URLSearchParams();
    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    if (filters.scope) {
      params.append('scope', filters.scope);
    }
    if (filters.activation_mode) {
      params.append('activation_mode', filters.activation_mode);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const res = await fetch(`${BASE_URL}/rules?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to fetch rules.');
    }

    return res.json();
  }

  /**
   * Lấy chi tiết một Rule theo ID.
   */
  static async getRule(id: string): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to fetch rule detail.');
    }

    return res.json();
  }

  /**
   * Tạo mới một Rule.
   */
  static async createRule(payload: RuleCreatePayload): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to create rule.');
    }

    return res.json();
  }

  /**
   * Cập nhật một Rule đã có (Optimistic Concurrency Control).
   */
  static async updateRule(id: string, payload: RuleUpdatePayload): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      const errorObj = new Error(msg || 'Failed to update rule.');
      (errorObj as any).status = res.status;
      (errorObj as any).detail = err.detail;
      throw errorObj;
    }

    return res.json();
  }

  /**
   * Bật hoặc tắt nhanh trạng thái active/inactive của Rule.
   */
  static async updateRuleStatus(id: string, status: 'active' | 'inactive'): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to update rule status.');
    }

    return res.json();
  }

  /**
   * Nhân bản một Rule thành Rule mới trong thư viện cá nhân.
   */
  static async cloneRule(id: string): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to clone rule.');
    }

    return res.json();
  }

  /**
   * Xóa mềm Rule. Nếu force = false và Rule đang được sử dụng, backend trả về 400 kèm danh sách dự án.
   */
  static async deleteRule(id: string, force: boolean = false): Promise<{ message: string; detached_projects_count?: number }> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}?force=${force}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const errorObj = new Error(
        typeof err.detail === 'object' ? err.detail.message : (err.detail || 'Failed to delete rule.')
      );
      (errorObj as any).status = res.status;
      (errorObj as any).detail = err.detail;
      throw errorObj;
    }

    return res.json();
  }

  /**
   * Lấy danh sách các dự án đang sử dụng Rule này.
   */
  static async getRuleProjects(id: string): Promise<RuleAssociatedProject[]> {
    const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(id)}/projects`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to fetch associated projects.');
    }

    return res.json();
  }

  static async getRuleAssociatedProjects(id: string): Promise<RuleAssociatedProject[]> {
    return this.getRuleProjects(id);
  }

  /**
   * Import rule from text payload after preview confirmation.
   */
  static async importRuleText(payload: {
    filename: string;
    content: string;
    name?: string;
    description?: string;
    activation_mode?: string;
    glob_patterns?: string[];
    tags?: string[];
    priority?: number;
  }): Promise<Rule> {
    const res = await fetch(`${BASE_URL}/rules/import-text`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to import rule.');
    }

    return res.json();
  }
}

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
   * Fetch system prompts for the current user (or guest_user).
   * Returns metadata and content_length.
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
      throw new Error(msg || 'Failed to fetch system prompts.');
    }

    return res.json();
  }

  /**
   * Fetch detailed system prompt information (including full content).
   */
  static async getPrompt(id: string): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'System prompt not found or access denied.');
    }

    return res.json();
  }

  /**
   * Create a new system prompt.
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
      throw new Error(msg || 'Failed to create system prompt.');
    }

    return res.json();
  }

  /**
   * Update an existing system prompt.
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
      throw new Error(msg || 'Failed to update system prompt.');
    }

    return res.json();
  }

  /**
   * Delete a system prompt from the database.
   */
  static async deletePrompt(id: string): Promise<{ success: boolean; message: string; deleted_id: string }> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to delete system prompt.');
    }

    return res.json();
  }

  /**
   * Duplicate/clone an existing system prompt.
   */
  static async clonePrompt(id: string): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to duplicate system prompt.');
    }

    return res.json();
  }

  /**
   * Import system prompt from text payload after preview confirmation.
   */
  static async importPromptText(payload: {
    filename: string;
    content: string;
    name?: string;
    description?: string;
  }): Promise<SystemPromptDetail> {
    const res = await fetch(`${BASE_URL}/system-prompts/import-text`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'object' ? err.detail.message : (err.detail || err.message);
      throw new Error(msg || 'Failed to import system prompt.');
    }

    return res.json();
  }
}

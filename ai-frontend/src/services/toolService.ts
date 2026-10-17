/**
 * Tool Management API Client Service
 * Connects frontend UI to backend /api/v1/tools and /api/v1/projects/{id}/tools
 */

import {
  ToolSummary,
  ToolDetail,
  ToolListResponse,
  ToolConfiguration,
  SaveToolConfigRequest,
  ToolTestResponse,
  ToolExecutionsResponse,
  ProjectToolBinding,
  ToolStatus,
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

export class ToolService {
  /**
   * Fetch paginated list of tools with category, status, and search filters.
   */
  static async getTools(params?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ToolListResponse> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') {
      query.append('category', params.category);
    }
    if (params?.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    if (params?.page) {
      query.append('page', params.page.toString());
    }
    if (params?.limit) {
      query.append('limit', params.limit.toString());
    }

    const res = await fetch(`${BASE_URL}/tools?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch tools.');
    }

    return res.json();
  }

  /**
   * Fetch full details, metadata, and schemas for a specific tool.
   */
  static async getTool(id: string): Promise<ToolDetail> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Tool '${id}' not found.`);
    }

    return res.json();
  }

  /**
   * Update the status of a tool (e.g. AVAILABLE, DISABLED).
   */
  static async updateToolStatus(id: string, status: ToolStatus): Promise<{ id: string; status: ToolStatus }> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to update tool status.');
    }

    return res.json();
  }

  /**
   * Fetch current configuration for a tool (credentials masked with Asterisks).
   */
  static async getToolConfig(id: string): Promise<ToolConfiguration> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/config`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch tool configuration.');
    }

    return res.json();
  }

  /**
   * Save settings and new credentials for a tool.
   */
  static async saveToolConfig(id: string, config: SaveToolConfigRequest): Promise<ToolConfiguration> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to save tool configuration.');
    }

    return res.json();
  }

  /**
   * Run health check / test connection for a tool without side effects.
   */
  static async testTool(id: string, parameters: Record<string, any> = {}): Promise<ToolTestResponse> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ parameters }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Tool test failed.');
    }

    return res.json();
  }

  /**
   * Execute tool with explicit arguments (subject to policy and quota gate).
   */
  static async executeTool(
    id: string,
    args: Record<string, any>,
    projectId?: string
  ): Promise<{ status: string; result?: any; error?: string; execution_time_ms: number }> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        arguments: args,
        project_id: projectId || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Tool execution failed.');
    }

    return res.json();
  }

  /**
   * Fetch recent execution records and logs for a tool.
   */
  static async getToolExecutions(id: string, limit = 20): Promise<ToolExecutionsResponse> {
    const res = await fetch(`${BASE_URL}/tools/${encodeURIComponent(id)}/executions?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch execution history.');
    }

    return res.json();
  }

  /**
   * Fetch all category descriptors with human-readable labels.
   */
  static async getCategories(): Promise<{ categories: { key: string; label: string; count?: number }[] }> {
    const res = await fetch(`${BASE_URL}/tools/categories`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch categories.');
    }

    return res.json();
  }

  /**
   * Project bindings: List tools enabled in a project.
   */
  static async getProjectToolBindings(projectId: string): Promise<ProjectToolBinding[]> {
    const res = await fetch(`${BASE_URL}/projects/${encodeURIComponent(projectId)}/tools`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to fetch project tool bindings.');
    }

    return res.json();
  }

  /**
   * Project bindings: Bind a tool to a project.
   */
  static async bindToolToProject(
    projectId: string,
    toolId: string,
    isEnabled = true,
    customTimeoutSeconds?: number
  ): Promise<ProjectToolBinding> {
    const res = await fetch(`${BASE_URL}/projects/${encodeURIComponent(projectId)}/tools`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        tool_id: toolId,
        is_enabled: isEnabled,
        custom_timeout_seconds: customTimeoutSeconds || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to bind tool to project.');
    }

    return res.json();
  }

  /**
   * Project bindings: Unbind a tool from a project.
   */
  static async unbindToolFromProject(projectId: string, toolId: string): Promise<void> {
    const res = await fetch(
      `${BASE_URL}/projects/${encodeURIComponent(projectId)}/tools/${encodeURIComponent(toolId)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to unbind tool from project.');
    }
  }
}

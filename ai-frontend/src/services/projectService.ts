import { Project, ProjectListResponse, ProjectQuotaInfo, GraphData } from '@/types';

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

export class ProjectService {
  static async getProjects(status?: string, limit: number = 50, offset: number = 0): Promise<ProjectListResponse> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (status) params.append('status', status);

    const res = await fetch(`${BASE_URL}/projects?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to fetch projects.');
    }

    return res.json();
  }

  static async getProject(id: string): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Project not found.');
    }

    return res.json();
  }

  static async createProject(data: { name: string; description?: string }): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to create project.');
    }

    return res.json();
  }

  static async updateProject(id: string, data: { name?: string; description?: string }): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to update project.');
    }

    return res.json();
  }

  static async saveGraph(id: string, graphData: GraphData): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}/graph`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(graphData),
    });

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    if (!res.ok) {
      const msg = typeof data.detail === 'object' && data.detail.errors
        ? data.detail.errors.join('\n')
        : (data.detail || data.message || 'Failed to save graph.');
      throw new Error(msg);
    }

    return data;
  }

  static async activateProject(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}/activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    if (!res.ok) {
      const msg = typeof data.detail === 'object' && data.detail.message
        ? data.detail.message
        : (data.detail || data.message || 'Failed to activate project.');
      throw new Error(msg);
    }

    return data;
  }

  static async stopProject(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to stop project.');
    }

    return res.json();
  }

  static async deactivateProject(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to deactivate project.');
    }

    return res.json();
  }

  static async deleteProject(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to delete project.');
    }

    return res.json();
  }

  static async getActiveProjects(): Promise<Project[]> {
    const res = await fetch(`${BASE_URL}/projects/active`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  }

  static async getQuota(): Promise<ProjectQuotaInfo> {
    const res = await fetch(`${BASE_URL}/projects/quota`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return { active_count: 0, max_limit: 3, remaining_slots: 3 };
    }

    return res.json();
  }

  static async streamProjectChat(
    id: string,
    message: string,
    conversationId: string | null,
    onChunk: (chunk: string) => void,
    onDone: (data?: any) => void,
    onError: (err: any) => void,
    signal?: AbortSignal,
    attachments?: string[]
  ): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/projects/${id}/chat`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({ message, conversation_id: conversationId, attachments }),
        signal,
      });


      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = typeof errJson.detail === 'object' && errJson.detail.message
          ? errJson.detail.message
          : (errJson.detail || errJson.message || 'Failed to send message.');
        throw new Error(msg);
      }

      if (!res.body) {
        throw new Error('ReadableStream is not supported.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split(/\r?\n/);
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'error' || data.status === 'error') {
              onError(new Error(data.message || 'AI streaming error occurred.'));
              return;
            }

            const rawToken = data.token ?? data.content;
            if (rawToken) {
              let cleanToken = rawToken;
              // Guard against SSE prefix in token stream
              if (typeof cleanToken === 'string' && (cleanToken.startsWith('event:') || cleanToken.startsWith('data:'))) {
                const subMatch = cleanToken.match(/data:\s*({.*})/);
                if (subMatch) {
                  try {
                    const subParsed = JSON.parse(subMatch[1]);
                    cleanToken = subParsed.token || subParsed.content || '';
                  } catch {}
                }
              }
              if (cleanToken) {
                onChunk(cleanToken);
              }
            }

            if (eventType === 'done' || data.status === 'done' || data.finish_reason) {
              onDone(data);
            }
          } catch {
            // Ignore JSON parse errors for non-payload lines
          }
        }
      }
      onDone();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      onError(err);
    }
  }
}

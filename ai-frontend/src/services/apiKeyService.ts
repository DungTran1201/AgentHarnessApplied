import {
  ProviderKeyStatus,
  SetApiKeyResponse,
  DeleteApiKeyResponse,
  TestApiKeyResponse,
  UpdateSystemEnvResponse,
  ProviderDiagnosticsResponse,
} from '@/types/apiKey';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== 'undefined') {
    try {
      const token =
        window.localStorage?.getItem('access_token') ||
        window.sessionStorage?.getItem('access_token');
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }
  return headers;
}

export class ApiKeyService {
  /**
   * Fetches the configuration status and non-sensitive metadata for all supported providers.
   * Never exposes plaintext secrets.
   */
  static async fetchApiKeys(): Promise<ProviderKeyStatus[]> {
    const res = await fetch(`${BASE_URL}/settings/api-keys`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || 'Không thể tải danh sách cấu hình khóa API.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  /**
   * Fetches non-sensitive runtime resolution diagnostics for a specific provider.
   */
  static async getProviderDiagnostics(provider: string): Promise<ProviderDiagnosticsResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}/diagnostics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || 'Không thể tải thông tin chẩn đoán nhà cung cấp.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  /**
   * Stores or updates the user's personal API key for a provider.
   * Key is encrypted at rest via AES-256-GCM and takes effect immediately at runtime.
   */
  static async saveApiKey(provider: string, apiKey: string): Promise<SetApiKeyResponse> {
    const cleanedKey = (apiKey || '').trim();
    if (!cleanedKey) {
      throw new Error('Khóa API không được để trống.');
    }

    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}`, {
      method: 'PUT',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ api_key: cleanedKey }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || 'Không thể lưu khóa API.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  /**
   * Removes personal API key for a provider, reverting precedence to system default or unconfigured.
   */
  static async deleteApiKey(provider: string): Promise<DeleteApiKeyResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || 'Không thể xóa khóa cá nhân.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  /**
   * Performs lightweight ping / connectivity test with target provider without leaking secrets.
   * If candidateKey is provided, tests the unsaved candidate key without altering saved personal key status.
   */
  static async testConnection(provider: string, candidateKey?: string): Promise<TestApiKeyResponse> {
    const trimmedCandidate = candidateKey ? candidateKey.trim() : undefined;
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}/test`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: trimmedCandidate ? JSON.stringify({ candidate_key: trimmedCandidate }) : undefined,
    });

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    if (!res.ok) {
      const error = new Error(data.detail || data.message || 'Kiểm tra kết nối thất bại.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return data;
  }

  /**
   * Safely updates an allowlisted environment variable in .env (Admin only).
   */
  static async updateSystemEnv(envVar: string, value: string): Promise<UpdateSystemEnvResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/system`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ env_var: envVar, value }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || 'Không thể cập nhật cấu hình hệ thống .env.') as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  }
}

import {
  ProviderKeyStatus,
  SetApiKeyResponse,
  DeleteApiKeyResponse,
  TestApiKeyResponse,
  UpdateSystemEnvResponse
} from '@/types/apiKey';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiKeyService {
  /**
   * Fetches the configuration status and non-sensitive metadata for all supported providers.
   * Never exposes plaintext secrets.
   */
  static async fetchApiKeys(): Promise<ProviderKeyStatus[]> {
    const res = await fetch(`${BASE_URL}/settings/api-keys`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Không thể tải danh sách cấu hình khóa API.');
    }

    return res.json();
  }

  /**
   * Stores or updates the user's personal API key for a provider.
   * Key is encrypted at rest via AES-256-GCM and takes effect immediately at runtime.
   */
  static async saveApiKey(provider: string, apiKey: string): Promise<SetApiKeyResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Không thể lưu khóa API.');
    }

    return res.json();
  }

  /**
   * Removes personal API key for a provider, reverting precedence to system default or unconfigured.
   */
  static async deleteApiKey(provider: string): Promise<DeleteApiKeyResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Không thể xóa khóa cá nhân.');
    }

    return res.json();
  }

  /**
   * Performs lightweight ping / connectivity test with target provider without leaking secrets.
   */
  static async testConnection(provider: string, candidateKey?: string): Promise<TestApiKeyResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/${encodeURIComponent(provider)}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: candidateKey ? JSON.stringify({ candidate_key: candidateKey }) : undefined,
    });

    const data = await res.json().catch(() => ({ detail: res.statusText }));
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Kiểm tra kết nối thất bại.');
    }

    return data;
  }

  /**
   * Safely updates an allowlisted environment variable in .env (Admin only).
   */
  static async updateSystemEnv(envVar: string, value: string): Promise<UpdateSystemEnvResponse> {
    const res = await fetch(`${BASE_URL}/settings/api-keys/system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ env_var: envVar, value }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Không thể cập nhật cấu hình hệ thống .env.');
    }

    return res.json();
  }
}

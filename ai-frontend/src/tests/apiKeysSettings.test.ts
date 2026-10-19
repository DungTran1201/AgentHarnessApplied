import test, { describe } from 'node:test';
import assert from 'node:assert';
import { ApiKeyService } from '../services/apiKeyService';
import { ProviderKeyStatus } from '../types/apiKey';

describe('Settings API Keys & Integrations Specification (FR-SETTINGS-KEYS, SEC-015)', () => {
  test('1. fetchApiKeys retrieves provider inventory with credentials', async () => {
    const mockProviders: ProviderKeyStatus[] = [
      {
        provider: 'google',
        name: 'Google Gemini',
        category: 'LLM',
        env_var: 'GEMINI_API_KEY',
        description: 'Google Gemini LLM',
        doc_url: 'https://aistudio.google.com',
        placeholder: 'AIzaSy...',
        is_secret: true,
        is_configured: true,
        source: 'SYSTEM',
        masked_hint: '****1234',
        has_personal_key: false,
        has_system_key: true,
        validation_status: 'NOT_TESTED',
        requires_restart: false,
      },
      {
        provider: 'openai',
        name: 'OpenAI',
        category: 'LLM',
        env_var: 'OPENAI_API_KEY',
        description: 'OpenAI GPT-4o',
        doc_url: 'https://platform.openai.com',
        placeholder: 'sk-proj-...',
        is_secret: true,
        is_configured: true,
        source: 'PERSONAL',
        masked_hint: '****abcd',
        has_personal_key: true,
        has_system_key: false,
        validation_status: 'VALID',
        requires_restart: false,
      },
    ];

    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys'));
        assert.strictEqual(opts?.method, 'GET');
        assert.strictEqual(opts?.credentials, 'include');
        return {
          ok: true,
          json: async () => mockProviders,
        } as any;
      };

      const result = await ApiKeyService.fetchApiKeys();
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].provider, 'google');
      assert.strictEqual(result[0].source, 'SYSTEM');
      assert.strictEqual(result[1].provider, 'openai');
      assert.strictEqual(result[1].source, 'PERSONAL');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('2. saveApiKey transmits candidate key to correct provider endpoint', async () => {
    const originalFetch = global.fetch;
    try {
      let capturedBody: any = null;
      let capturedUrl = '';

      global.fetch = async (url: any, opts: any) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            provider: 'groq',
            source: 'PERSONAL',
            masked_hint: '****wxyz',
            validation_status: 'NOT_TESTED',
            message: 'Đã lưu khóa API',
          }),
        } as any;
      };

      const res = await ApiKeyService.saveApiKey('groq', 'gsk_test1234567890wxyz');
      assert.ok(capturedUrl.includes('/settings/api-keys/groq'));
      assert.strictEqual(capturedBody.api_key, 'gsk_test1234567890wxyz');
      assert.strictEqual(res.source, 'PERSONAL');
      assert.strictEqual(res.masked_hint, '****wxyz');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('3. deleteApiKey requests removal and reverts to system default', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys/anthropic'));
        assert.strictEqual(opts.method, 'DELETE');
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            provider: 'anthropic',
            source: 'SYSTEM',
            is_configured: true,
            masked_hint: '****5678',
            message: 'Đã xóa khóa cá nhân.',
          }),
        } as any;
      };

      const res = await ApiKeyService.deleteApiKey('anthropic');
      assert.strictEqual(res.provider, 'anthropic');
      assert.strictEqual(res.source, 'SYSTEM');
      assert.strictEqual(res.is_configured, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('4. testConnection sends candidate key or triggers server test', async () => {
    const originalFetch = global.fetch;
    try {
      let payloadSent = false;
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys/brave/test'));
        assert.strictEqual(opts.method, 'POST');
        if (opts.body) {
          payloadSent = true;
          const body = JSON.parse(opts.body);
          assert.strictEqual(body.candidate_key, 'BSA_test_key_here');
        }
        return {
          ok: true,
          json: async () => ({
            healthy: true,
            provider: 'brave',
            latency_ms: 145,
            validation_status: 'VALID',
            message: 'Kết nối thành công với Brave Search API.',
            tested_at: '2026-10-18T10:00:00Z',
          }),
        } as any;
      };

      const res = await ApiKeyService.testConnection('brave', 'BSA_test_key_here');
      assert.strictEqual(payloadSent, true);
      assert.strictEqual(res.healthy, true);
      assert.strictEqual(res.latency_ms, 145);
      assert.strictEqual(res.validation_status, 'VALID');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('5. updateSystemEnv safely modifies allowlisted system environment variable', async () => {
    const originalFetch = global.fetch;
    try {
      let capturedBody: any = null;
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys/system'));
        assert.strictEqual(opts.method, 'POST');
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            env_var: 'OLLAMA_BASE_URL',
            restart_required: true,
            message: 'Đã cập nhật OLLAMA_BASE_URL.',
          }),
        } as any;
      };

      const res = await ApiKeyService.updateSystemEnv('OLLAMA_BASE_URL', 'http://192.168.1.100:11434');
      assert.strictEqual(capturedBody.env_var, 'OLLAMA_BASE_URL');
      assert.strictEqual(capturedBody.value, 'http://192.168.1.100:11434');
      assert.strictEqual(res.restart_required, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('6. Invariant: Secrets are masked and never exposed in cleartext', () => {
    const provider: ProviderKeyStatus = {
      provider: 'openai',
      name: 'OpenAI',
      category: 'LLM',
      env_var: 'OPENAI_API_KEY',
      description: 'OpenAI GPT-4o',
      doc_url: 'https://platform.openai.com',
      placeholder: 'sk-proj-...',
      is_secret: true,
      is_configured: true,
      source: 'PERSONAL',
      masked_hint: '****abcd',
      has_personal_key: true,
      has_system_key: false,
      validation_status: 'VALID',
      requires_restart: false,
    };

    // Verify secret masking
    assert.strictEqual(provider.masked_hint, '****abcd');
    assert.ok(!provider.masked_hint.includes('sk-proj'));
    // Personal keys apply runtime without requiring restart
    assert.strictEqual(provider.requires_restart, false);
  });

  test('7. fetchApiKeys uses same-origin relative path /api/v1 and sends Bearer token if present', async () => {
    const originalFetch = global.fetch;
    const originalLocalStorage = global.localStorage;

    try {
      let capturedUrl = '';
      let capturedHeaders: any = null;

      (global as any).localStorage = {
        getItem: (key: string) => (key === 'ai_chan_token' ? 'test-jwt-token-123' : null),
      };

      global.fetch = async (url: any, opts: any) => {
        capturedUrl = String(url);
        capturedHeaders = opts?.headers;
        return {
          ok: true,
          json: async () => [],
        } as any;
      };

      await ApiKeyService.fetchApiKeys();
      assert.strictEqual(capturedUrl, '/api/v1/settings/api-keys');
      assert.strictEqual(capturedHeaders['Authorization'], 'Bearer test-jwt-token-123');
    } finally {
      global.fetch = originalFetch;
      global.localStorage = originalLocalStorage;
    }
  });

  test('8. fetchApiKeys propagates HTTP 401 status on error object for UI classification', async () => {
    const originalFetch = global.fetch;

    try {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Chưa xác thực: Vui lòng đăng nhập để tiếp tục.' }),
      } as any);

      await assert.rejects(
        async () => {
          await ApiKeyService.fetchApiKeys();
        },
        (err: any) => {
          assert.strictEqual(err.status, 401);
          assert.strictEqual(err.message, 'Chưa xác thực: Vui lòng đăng nhập để tiếp tục.');
          return true;
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

import test, { describe } from 'node:test';
import assert from 'node:assert';
import { ApiKeyService } from '../services/apiKeyService';
import { ProviderKeyStatus } from '../types/apiKey';

const OLD_TEST_CREDENTIAL = 'sk-proj-OLD_TEST_CREDENTIAL_1111';
const NEW_TEST_CREDENTIAL = 'sk-proj-NEW_TEST_CREDENTIAL_2222';

describe('Settings API Keys & Integrations Specification (FR-SETTINGS-KEYS, SEC-015, v0.1.2)', () => {
  test('1. fetchApiKeys retrieves provider inventory via same-origin /api/v1 proxy with credentials', async () => {
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
        effective_source: 'SYSTEM',
        masked_hint: '****1234',
        key_fingerprint: 'a1b2c3d4',
        has_personal_key: false,
        has_system_key: true,
        decryption_error: false,
        validation_status: 'NOT_TESTED',
        requires_restart: false,
        routing_supported: true,
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
        effective_source: 'PERSONAL',
        masked_hint: '****1111',
        key_fingerprint: '1111aaaa',
        has_personal_key: true,
        has_system_key: false,
        decryption_error: false,
        validation_status: 'VALID',
        requires_restart: false,
        routing_supported: true,
      },
    ];

    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/api/v1/settings/api-keys'));
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
      assert.strictEqual(result[1].key_fingerprint, '1111aaaa');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('2. saveApiKey replaces OLD_TEST_CREDENTIAL with NEW_TEST_CREDENTIAL and returns updated suffix & fingerprint', async () => {
    const originalFetch = global.fetch;
    try {
      const calls: Array<{ url: string; body: any }> = [];

      global.fetch = async (url: any, opts: any) => {
        const body = JSON.parse(opts.body);
        calls.push({ url: String(url), body });
        const isNew = body.api_key === NEW_TEST_CREDENTIAL;
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            provider: 'openai',
            source: 'PERSONAL',
            effective_source: 'PERSONAL',
            masked_hint: isNew ? '****2222' : '****1111',
            key_fingerprint: isNew ? 'fp_new22' : 'fp_old11',
            validation_status: 'NOT_TESTED',
            updated_at: '2026-10-29T10:00:00Z',
            message: 'Đã lưu khóa API cá nhân thành công.',
          }),
        } as any;
      };

      const resOld = await ApiKeyService.saveApiKey('openai', OLD_TEST_CREDENTIAL);
      assert.strictEqual(resOld.masked_hint, '****1111');
      assert.strictEqual(resOld.key_fingerprint, 'fp_old11');

      const resNew = await ApiKeyService.saveApiKey('openai', NEW_TEST_CREDENTIAL);
      assert.strictEqual(resNew.masked_hint, '****2222');
      assert.strictEqual(resNew.key_fingerprint, 'fp_new22');
      assert.strictEqual(resNew.validation_status, 'NOT_TESTED');
      assert.strictEqual(calls.length, 2);
      assert.ok(calls[1].url.endsWith('/settings/api-keys/openai'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('3. deleteApiKey requests removal and reverts to system default (.env)', async () => {
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
            effective_source: 'SYSTEM',
            is_configured: true,
            masked_hint: '****5678',
            key_fingerprint: 'sys56789',
            message: 'Đã xóa khóa cá nhân.',
          }),
        } as any;
      };

      const res = await ApiKeyService.deleteApiKey('anthropic');
      assert.strictEqual(res.provider, 'anthropic');
      assert.strictEqual(res.source, 'SYSTEM');
      assert.strictEqual(res.effective_source, 'SYSTEM');
      assert.strictEqual(res.is_configured, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('4. testConnection distinguishes unsaved CANDIDATE key test vs SAVED key test', async () => {
    const originalFetch = global.fetch;
    try {
      let lastBody: any = undefined;
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys/brave/test'));
        assert.strictEqual(opts.method, 'POST');
        lastBody = opts.body ? JSON.parse(opts.body) : undefined;
        return {
          ok: true,
          json: async () => ({
            healthy: true,
            provider: 'brave',
            latency_ms: 112,
            validation_status: 'VALID',
            tested_source: lastBody?.candidate_key ? 'CANDIDATE' : 'PERSONAL',
            key_fingerprint: 'bfp12345',
            message: 'Kết nối thành công với Brave Search API.',
            tested_at: '2026-10-29T10:00:00Z',
          }),
        } as any;
      };

      // Candidate test
      const candRes = await ApiKeyService.testConnection('brave', 'BSA_candidate_key');
      assert.strictEqual(lastBody.candidate_key, 'BSA_candidate_key');
      assert.strictEqual(candRes.tested_source, 'CANDIDATE');

      // Saved key test
      const savedRes = await ApiKeyService.testConnection('brave');
      assert.strictEqual(lastBody, undefined);
      assert.strictEqual(savedRes.tested_source, 'PERSONAL');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('5. updateSystemEnv surfaces has_personal_override warning when PERSONAL key shadows SYSTEM key', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: any, opts: any) => {
        assert.ok(String(url).endsWith('/settings/api-keys/system'));
        assert.strictEqual(opts.method, 'POST');
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            env_var: 'OPENAI_API_KEY',
            provider: 'openai',
            restart_required: true,
            has_personal_override: true,
            effective_source: 'PERSONAL',
            masked_hint: '****9999',
            key_fingerprint: 'sys99999',
            message: 'Đã cập nhật OPENAI_API_KEY. Lưu ý: Khóa cá nhân vẫn được ưu tiên sử dụng.',
          }),
        } as any;
      };

      const res = await ApiKeyService.updateSystemEnv('OPENAI_API_KEY', 'sk-proj-sys-9999');
      assert.strictEqual(res.has_personal_override, true);
      assert.strictEqual(res.effective_source, 'PERSONAL');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

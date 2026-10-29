import test, { describe } from 'node:test';
import assert from 'node:assert';
import { ApiKeyService } from '../services/apiKeyService';

describe('Same-Origin API Proxy & Error Propagation Contract (v0.1.2)', () => {
  test('1. ApiKeyService defaults to relative /api/v1 same-origin base URL', async () => {
    const originalFetch = global.fetch;
    try {
      let requestedUrl = '';
      global.fetch = async (url: any) => {
        requestedUrl = String(url);
        return {
          ok: true,
          json: async () => [],
        } as any;
      };

      await ApiKeyService.fetchApiKeys();
      assert.strictEqual(requestedUrl, '/api/v1/settings/api-keys');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('2. ApiKeyService attaches HTTP status code on failed requests', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ detail: 'Phiên đăng nhập đã hết hạn.' }),
        } as any);

      await assert.rejects(
        async () => {
          await ApiKeyService.fetchApiKeys();
        },
        (err: any) => {
          assert.strictEqual(err.status, 401);
          assert.strictEqual(err.message, 'Phiên đăng nhập đã hết hạn.');
          return true;
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

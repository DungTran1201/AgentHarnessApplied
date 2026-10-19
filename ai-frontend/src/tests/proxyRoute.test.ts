import test, { describe } from 'node:test';
import assert from 'node:assert';
import { GET, POST, PUT, DELETE } from '../app/api/[[...path]]/route';

describe('Runtime Reverse Proxy Specification (Phase 2 & Phase 4)', () => {
  test('1. Proxy forwards GET request to dynamic INTERNAL_BACKEND_URL with headers', async () => {
    const originalFetch = global.fetch;
    const originalEnv = process.env.INTERNAL_BACKEND_URL;

    try {
      process.env.INTERNAL_BACKEND_URL = 'http://127.0.0.1:8042/api/';
      let capturedUrl = '';
      let capturedMethod = '';
      let capturedHeaders: any = null;

      global.fetch = async (url: any, opts: any) => {
        capturedUrl = String(url);
        capturedMethod = opts?.method;
        capturedHeaders = opts?.headers;
        return new Response(JSON.stringify([{ provider: 'gemini', configured: true }]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'access_token=jwt_sample; Path=/; HttpOnly',
          },
        });
      };

      const req = {
        method: 'GET',
        nextUrl: new URL('http://127.0.0.1:3000/api/v1/settings/api-keys?format=json'),
        headers: new Headers({
          cookie: 'access_token=jwt_sample',
          authorization: 'Bearer token123',
        }),
      } as any;

      const res = await GET(req, { params: Promise.resolve({ path: ['v1', 'settings', 'api-keys'] }) });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(capturedUrl, 'http://127.0.0.1:8042/api/v1/settings/api-keys?format=json');
      assert.strictEqual(capturedMethod, 'GET');
      assert.strictEqual(capturedHeaders.get('cookie'), 'access_token=jwt_sample');
      assert.strictEqual(capturedHeaders.get('authorization'), 'Bearer token123');

      // Verify Set-Cookie is forwarded
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie?.includes('access_token=jwt_sample'));
    } finally {
      global.fetch = originalFetch;
      process.env.INTERNAL_BACKEND_URL = originalEnv;
    }
  });

  test('2. Proxy forwards POST request with body and content-type', async () => {
    const originalFetch = global.fetch;
    const originalEnv = process.env.INTERNAL_BACKEND_URL;

    try {
      process.env.INTERNAL_BACKEND_URL = 'http://127.0.0.1:8055/api/';
      let capturedUrl = '';
      let capturedBody: any = null;

      global.fetch = async (url: any, opts: any) => {
        capturedUrl = String(url);
        capturedBody = opts?.body;
        return new Response(JSON.stringify({ status: 'saved' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };

      const req = {
        method: 'POST',
        nextUrl: new URL('http://127.0.0.1:3000/api/v1/settings/api-keys/openai/test'),
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: JSON.stringify({ candidate_key: 'sk-test' }),
      } as any;

      const res = await POST(req, { params: Promise.resolve({ path: ['v1', 'settings', 'api-keys', 'openai', 'test'] }) });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(capturedUrl, 'http://127.0.0.1:8055/api/v1/settings/api-keys/openai/test');
      assert.strictEqual(capturedBody, JSON.stringify({ candidate_key: 'sk-test' }));
    } finally {
      global.fetch = originalFetch;
      process.env.INTERNAL_BACKEND_URL = originalEnv;
    }
  });

  test('3. Proxy safely handles backend connection refusal with HTTP 502', async () => {
    const originalFetch = global.fetch;
    const originalEnv = process.env.INTERNAL_BACKEND_URL;

    try {
      process.env.INTERNAL_BACKEND_URL = 'http://127.0.0.1:9999/api/';

      global.fetch = async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:9999');
      };

      const req = {
        method: 'GET',
        nextUrl: new URL('http://127.0.0.1:3000/api/v1/health'),
        headers: new Headers(),
      } as any;

      const res = await GET(req, { params: Promise.resolve({ path: ['v1', 'health'] }) });

      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.ok(data.detail.includes('Không thể kết nối đến máy chủ backend AI-Chan'));
      assert.strictEqual(data.target, 'http://127.0.0.1:9999');
    } finally {
      global.fetch = originalFetch;
      process.env.INTERNAL_BACKEND_URL = originalEnv;
    }
  });

  test('4. Proxy rejects non-loopback target destinations with HTTP 403 (open-proxy prevention)', async () => {
    const originalEnv = process.env.INTERNAL_BACKEND_URL;

    try {
      process.env.INTERNAL_BACKEND_URL = 'https://malicious-external-site.com/api/';

      const req = {
        method: 'GET',
        nextUrl: new URL('http://127.0.0.1:3000/api/v1/steal'),
        headers: new Headers(),
      } as any;

      const res = await GET(req, { params: Promise.resolve({ path: ['v1', 'steal'] }) });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.detail.includes('loopback'));
    } finally {
      process.env.INTERNAL_BACKEND_URL = originalEnv;
    }
  });
});

import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectService } from '../services/projectService';

describe('Project Chat Sync & Persistence Specification', () => {
  beforeEach(() => {
    // Reset global fetch mock if needed
  });

  it('1. getOrCreateProjectConversation queries the correct backend idempotent endpoint', async () => {
    let requestedUrl = '';
    let requestedMethod = '';

    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = input.toString();
      requestedMethod = init?.method || 'GET';
      return {
        ok: true,
        json: async () => ({
          conversation: {
            id: 'conv_proj_test_123',
            project_id: 'proj_alpha',
            user_id: 'user_1',
            title: 'Project Chat - Alpha',
          },
        }),
      } as any;
    }) as any;

    try {
      const conv = await ProjectService.getOrCreateProjectConversation('proj_alpha');
      assert.equal(requestedUrl.includes('/projects/proj_alpha/conversation'), true);
      assert.equal(requestedMethod, 'GET');
      assert.equal(conv.id, 'conv_proj_test_123');
      assert.equal(conv.project_id, 'proj_alpha');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('2. getProjectMessages retrieves paginated messages with limit and offset', async () => {
    let requestedUrl = '';

    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = input.toString();
      return {
        ok: true,
        json: async () => ({
          messages: [
            { id: 'm1', role: 'user', content: 'Hello', status: 'COMPLETED' },
            { id: 'm2', role: 'assistant', content: 'World', status: 'COMPLETED' },
          ],
        }),
      } as any;
    }) as any;

    try {
      const msgs = await ProjectService.getProjectMessages('conv_proj_test_123', 50, 10);
      assert.equal(requestedUrl.includes('/conversations/conv_proj_test_123/messages?limit=50&offset=10'), true);
      assert.equal(msgs.length, 2);
      assert.equal(msgs[0].content, 'Hello');
      assert.equal(msgs[1].content, 'World');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('3. cancelProjectChat posts cancellation request with conversation_id to backend', async () => {
    let requestedUrl = '';
    let requestedBody = '';

    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = input.toString();
      requestedBody = init?.body ? String(init.body) : '';
      return {
        ok: true,
        json: async () => ({
          success: true,
          message: 'Đã hủy lượt sinh thành công.',
        }),
      } as any;
    }) as any;

    try {
      const result = await ProjectService.cancelProjectChat('proj_alpha', 'conv_proj_test_123');
      assert.equal(requestedUrl.includes('/projects/proj_alpha/chat/cancel'), true);
      const parsed = JSON.parse(requestedBody);
      assert.equal(parsed.conversation_id, 'conv_proj_test_123');
      assert.equal(result, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('4. reconnectProjectChat connects to stream replay endpoint with after_seq', async () => {
    let requestedUrl = '';

    const originalFetch = global.fetch;
    // Create a mock stream that delivers SSE events
    const ssePayload = [
      'event: chunk\n',
      'data: {"token": "Reconnected chunk", "seq": 5}\n\n',
      'event: done\n',
      'data: {"status": "done", "finish_reason": "stop"}\n\n',
    ].join('');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      },
    });

    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = input.toString();
      return {
        ok: true,
        body: stream,
      } as any;
    }) as any;

    try {
      const receivedChunks: string[] = [];
      let isDoneCalled = false;

      await ProjectService.reconnectProjectChat(
        'proj_alpha',
        'conv_proj_test_123',
        4,
        (chunk) => receivedChunks.push(chunk),
        () => { isDoneCalled = true; },
        () => {}
      );

      assert.equal(requestedUrl.includes('/projects/proj_alpha/chat/stream?conversation_id=conv_proj_test_123&after_seq=4'), true);
      assert.equal(receivedChunks.join(''), 'Reconnected chunk');
      assert.equal(isDoneCalled, true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

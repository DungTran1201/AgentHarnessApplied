import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, navIsActive } from '../components/chat/Sidebar';

// Local path traversal check mirroring host Runner validation logic
function isPathTraversalSafe(targetPath: string): { valid: boolean; error?: string } {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.trim().length === 0) {
    return { valid: false, error: 'Path cannot be empty' };
  }
  const normalized = targetPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      return { valid: false, error: 'Path traversal detected: ".." is forbidden' };
    }
  }
  return { valid: true };
}

// Runner heartbeat staleness evaluation (threshold: 90s)
function evaluateRunnerStatus(lastHeartbeatAt: string | null, isRevoked: boolean): 'online' | 'stale' | 'offline' | 'revoked' {
  if (isRevoked) return 'revoked';
  if (!lastHeartbeatAt) return 'offline';
  const lastTime = new Date(lastHeartbeatAt).getTime();
  const now = Date.now();
  const diffSec = (now - lastTime) / 1000;
  if (diffSec <= 90) return 'online';
  if (diffSec <= 300) return 'stale';
  return 'offline';
}

test('Development Workspace & Runner UI Invariants', async (t) => {
  await t.test('1. Sidebar Navigation integration for Workspaces', () => {
    const workspaceItem = NAV_ITEMS.find(item => item.key === 'workspaces');
    assert.ok(workspaceItem, 'Workspaces nav item must exist in sidebar');
    assert.equal(workspaceItem.label, 'Workspaces');
    assert.equal(workspaceItem.icon, 'workspace');
    assert.equal(workspaceItem.href, '/workspaces');

    // Route matching
    assert.equal(navIsActive('/workspaces', '/workspaces'), true);
    assert.equal(navIsActive('/workspaces/ws_123', '/workspaces'), true);
    assert.equal(navIsActive('/chat', '/workspaces'), false);
    assert.equal(navIsActive('/projects', '/workspaces'), false);
  });

  await t.test('2. Path validation: Safe local paths allowed, traversal rejected', () => {
    assert.equal(isPathTraversalSafe('c:\\Users\\PC\\Project\\ai-chan').valid, true);
    assert.equal(isPathTraversalSafe('/home/user/workspace').valid, true);
    assert.equal(isPathTraversalSafe('').valid, false);
    assert.equal(isPathTraversalSafe('c:\\Users\\PC\\Project\\..\\secret').valid, false);
    assert.equal(isPathTraversalSafe('/var/app/../../etc/passwd').valid, false);
  });

  await t.test('3. Runner status evaluation: online, stale, offline, revoked', () => {
    const nowIso = new Date().toISOString();
    const staleIso = new Date(Date.now() - 120 * 1000).toISOString();
    const deadIso = new Date(Date.now() - 600 * 1000).toISOString();

    assert.equal(evaluateRunnerStatus(nowIso, false), 'online');
    assert.equal(evaluateRunnerStatus(staleIso, false), 'stale');
    assert.equal(evaluateRunnerStatus(deadIso, false), 'offline');
    assert.equal(evaluateRunnerStatus(null, false), 'offline');
    assert.equal(evaluateRunnerStatus(nowIso, true), 'revoked');
  });

  await t.test('4. Workspace list payload parsing (items vs workspaces)', () => {
    function parseWorkspaceList(data: any): any[] {
      return data?.items || data?.workspaces || (Array.isArray(data) ? data : []);
    }

    const payloadWithItems = { total: 1, items: [{ id: 'ws_1', name: 'Repo A' }] };
    const payloadWithWorkspaces = { total: 1, workspaces: [{ id: 'ws_1', name: 'Repo A' }] };
    const payloadRawArray = [{ id: 'ws_1', name: 'Repo A' }];

    assert.equal(parseWorkspaceList(payloadWithItems).length, 1);
    assert.equal(parseWorkspaceList(payloadWithWorkspaces).length, 1);
    assert.equal(parseWorkspaceList(payloadRawArray).length, 1);
    assert.equal(parseWorkspaceList({}).length, 0);
  });
});

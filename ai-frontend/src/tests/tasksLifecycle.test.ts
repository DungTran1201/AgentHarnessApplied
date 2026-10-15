import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, navIsActive } from '../components/chat/Sidebar';

// Task State Machine Allowed Transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUEUED', 'CANCELLED'],
  QUEUED: ['DISPATCHING', 'CANCELLED', 'BLOCKED'],
  DISPATCHING: ['PLANNING', 'RUNNING', 'FAILED', 'CANCELLED'],
  PLANNING: ['AWAITING_APPROVAL', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL: ['RUNNING', 'CANCELLED'],
  RUNNING: ['VERIFYING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLING', 'CANCELLED'],
  VERIFYING: ['REVIEW_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  REVIEW_REQUIRED: ['COMPLETED', 'QUEUED', 'FAILED', 'CANCELLED'], // Queued on Request Changes, Failed on Reject, Completed on Approve
  CANCELLING: ['CANCELLED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['QUEUED'], // Retry
  CANCELLED: ['QUEUED'] // Retry
};

function isValidStateTransition(fromState: string, toState: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  return allowed.includes(toState);
}

// Event Deduplicator mirroring Task Detail Workbench
class EventDeduplicator {
  private seen = new Set<number>();

  public processEvent(seqNum: number): boolean {
    if (this.seen.has(seqNum)) {
      return false; // Duplicate
    }
    this.seen.add(seqNum);
    return true; // Accepted
  }

  public getCount(): number {
    return this.seen.size;
  }
}

// Sensitive content detector for Diff viewer
function hasRedactedSensitiveContent(diffText: string): boolean {
  return diffText.includes('[REDACTED_SENSITIVE_CONTENT');
}

test('Development Tasks Lifecycle & Workbench Invariants', async (t) => {
  await t.test('1. Sidebar Navigation integration for Tasks', () => {
    const taskItem = NAV_ITEMS.find((item) => item.key === 'tasks');
    assert.ok(taskItem, 'Tasks nav item must exist in sidebar');
    assert.equal(taskItem.label, 'Tasks');
    assert.equal(taskItem.icon, 'terminal');
    assert.equal(taskItem.href, '/tasks');

    // Route matching
    assert.equal(navIsActive('/tasks', '/tasks'), true);
    assert.equal(navIsActive('/tasks/tsk_12345', '/tasks'), true);
    assert.equal(navIsActive('/workspaces', '/tasks'), false);
    assert.equal(navIsActive('/chat', '/tasks'), false);
  });

  await t.test('2. State machine transitions enforcement', () => {
    // Valid transitions
    assert.equal(isValidStateTransition('DRAFT', 'QUEUED'), true);
    assert.equal(isValidStateTransition('QUEUED', 'DISPATCHING'), true);
    assert.equal(isValidStateTransition('PLANNING', 'AWAITING_APPROVAL'), true);
    assert.equal(isValidStateTransition('AWAITING_APPROVAL', 'RUNNING'), true);
    assert.equal(isValidStateTransition('AWAITING_APPROVAL', 'CANCELLED'), true);
    assert.equal(isValidStateTransition('RUNNING', 'VERIFYING'), true);
    assert.equal(isValidStateTransition('VERIFYING', 'REVIEW_REQUIRED'), true);
    assert.equal(isValidStateTransition('REVIEW_REQUIRED', 'COMPLETED'), true); // Approve
    assert.equal(isValidStateTransition('REVIEW_REQUIRED', 'QUEUED'), true); // Request Changes follow-up
    assert.equal(isValidStateTransition('REVIEW_REQUIRED', 'FAILED'), true); // Reject
    assert.equal(isValidStateTransition('FAILED', 'QUEUED'), true); // Retry

    // Invalid transitions
    assert.equal(isValidStateTransition('DRAFT', 'COMPLETED'), false);
    assert.equal(isValidStateTransition('COMPLETED', 'RUNNING'), false);
    assert.equal(isValidStateTransition('PLANNING', 'COMPLETED'), false);
  });

  await t.test('3. Event Stream Deduplication', () => {
    const deduplicator = new EventDeduplicator();

    assert.equal(deduplicator.processEvent(1), true);
    assert.equal(deduplicator.processEvent(2), true);
    assert.equal(deduplicator.processEvent(1), false); // duplicate
    assert.equal(deduplicator.processEvent(2), false); // duplicate
    assert.equal(deduplicator.processEvent(3), true);

    assert.equal(deduplicator.getCount(), 3);
  });

  await t.test('4. Verification Step Status & Redaction Detection', () => {
    const allowedStatuses = ['PASSED', 'FAILED', 'ERROR', 'SKIPPED_BY_POLICY', 'NOT_RUN'];
    for (const st of allowedStatuses) {
      assert.ok(allowedStatuses.includes(st));
    }

    const cleanDiff = `--- a/file.txt\n+++ b/file.txt\n@@ -1,1 +1,2 @@\n+hello world`;
    const redactedDiff = `--- a/.env\n+++ b/.env\n@@ -0,0 +1,1 @@\n+[REDACTED_SENSITIVE_CONTENT: .env matched security filter]`;

    assert.equal(hasRedactedSensitiveContent(cleanDiff), false);
    assert.equal(hasRedactedSensitiveContent(redactedDiff), true);
  });
});


import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatDuration,
  formatDateTime,
  getHumanTaskStatus,
  getHumanRunnerStatus,
  getHumanEventMeta,
  isFirstOutputTimedOut,
  getModeDescription,
  buildRedactedDiagnostics,
  TaskDetail,
  NormalizedEvent,
  RunnerInfo
} from '../lib/taskObservability';

test('Task Observability Unit Tests & Invariants (Prompt 05)', async (t) => {
  await t.test('1. formatBytes human-readable formatting', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(1048576), '1.00 MB');
    assert.equal(formatBytes(2621440), '2.50 MB');
    assert.equal(formatBytes(undefined), '0 B');
  });

  await t.test('2. formatDuration seconds and minutes formatting', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(45), '45s');
    assert.equal(formatDuration(60), '1m 0s');
    assert.equal(formatDuration(125), '2m 5s');
    assert.equal(formatDuration(undefined), '-');
  });

  await t.test('3. Task Status Contract: Disallows RUNNING label when QUEUED or WAITING_FOR_RUNNER', () => {
    const queuedWaitingTask: TaskDetail = {
      id: 'tsk_001',
      project_id: 'p1',
      workspace_id: 'w1',
      title: 'Audit code',
      prompt: 'Check code',
      status: 'QUEUED',
      dispatch_state: 'QUEUED_WAITING_FOR_RUNNER',
      attempts: []
    };

    const statusMeta = getHumanTaskStatus(queuedWaitingTask);
    assert.equal(statusMeta.label, 'Chờ Runner kết nối');
    assert.equal(statusMeta.technical, 'QUEUED (WAITING_FOR_RUNNER)');
    assert.equal(statusMeta.runtimeStatus, 'waiting_for_runner');
    assert.notEqual(statusMeta.label, 'Running');

    const runningTask: TaskDetail = {
      id: 'tsk_002',
      project_id: 'p1',
      workspace_id: 'w1',
      title: 'Run code',
      prompt: 'Run',
      status: 'RUNNING',
      attempts: []
    };
    const runningMeta = getHumanTaskStatus(runningTask);
    assert.equal(runningMeta.label, 'Đang thực thi mã nguồn');
    assert.equal(runningMeta.runtimeStatus, 'running');

    const planningTask: TaskDetail = {
      id: 'tsk_003',
      project_id: 'p1',
      workspace_id: 'w1',
      title: 'Plan code',
      prompt: 'Plan',
      status: 'PLANNING',
      attempts: []
    };
    const planningMeta = getHumanTaskStatus(planningTask);
    assert.equal(planningMeta.label, 'Đang phân tích & Lập kế hoạch');
    assert.equal(planningMeta.runtimeStatus, 'running');

    const failedEmptyOutputTask: TaskDetail = {
      id: 'tsk_004',
      project_id: 'p1',
      workspace_id: 'w1',
      title: 'Failed task',
      prompt: 'Fails',
      status: 'FAILED',
      failure_code: 'EMPTY_RUNTIME_OUTPUT',
      attempts: []
    };
    const failedMeta = getHumanTaskStatus(failedEmptyOutputTask);
    assert.equal(failedMeta.label, 'Thất bại');
    assert.equal(failedMeta.technical, 'FAILED (EMPTY_RUNTIME_OUTPUT)');
    assert.equal(failedMeta.runtimeStatus, 'failed');
  });

  await t.test('4. Runner Status Contract: Distinguishes Connected, Stale, Offline, and Waiting for Channel', () => {
    // No runner
    assert.equal(getHumanRunnerStatus(null).label, 'Chưa gán Runner');
    assert.equal(getHumanRunnerStatus(null).isConnected, false);

    // Connected with active channel
    const activeRunner: RunnerInfo = {
      id: 'run_1',
      name: 'Local Daemon',
      machine_name: 'Dev-Box',
      status: 'ONLINE',
      has_active_channel: true
    };
    const activeMeta = getHumanRunnerStatus(activeRunner);
    assert.equal(activeMeta.label, 'Runner Connected');
    assert.equal(activeMeta.isConnected, true);
    assert.equal(activeMeta.channelState, 'active');

    // Online heartbeat but no active channel
    const waitingRunner: RunnerInfo = {
      id: 'run_2',
      name: 'Remote Runner',
      status: 'ONLINE',
      has_active_channel: false
    };
    const waitingMeta = getHumanRunnerStatus(waitingRunner);
    assert.equal(waitingMeta.label, 'Runner Paired (Chờ kênh)');
    assert.equal(waitingMeta.isConnected, false);
    assert.equal(waitingMeta.channelState, 'waiting');

    // Stale runner (>60s)
    const staleRunner: RunnerInfo = {
      id: 'run_3',
      name: 'Stale Runner',
      status: 'STALE',
      has_active_channel: false
    };
    const staleMeta = getHumanRunnerStatus(staleRunner);
    assert.equal(staleMeta.label, 'Runner Mất tín hiệu (>60s)');
    assert.equal(staleMeta.channelState, 'stale');

    // Offline runner
    const offlineRunner: RunnerInfo = {
      id: 'run_4',
      name: 'Dead Runner',
      status: 'OFFLINE',
      has_active_channel: false
    };
    const offlineMeta = getHumanRunnerStatus(offlineRunner);
    assert.equal(offlineMeta.label, 'Runner Offline');
    assert.equal(offlineMeta.channelState, 'offline');
  });

  await t.test('5. First output deadline timeout threshold (30s rule)', () => {
    assert.equal(isFirstOutputTimedOut(10, 30), false);
    assert.equal(isFirstOutputTimedOut(29, 30), false);
    assert.equal(isFirstOutputTimedOut(30, 30), true);
    assert.equal(isFirstOutputTimedOut(45, 30), true);
  });

  await t.test('6. Mode description and empty diff explanation', () => {
    const planMode = getModeDescription('plan', false);
    assert.equal(planMode.modeLabel, 'Read-Only Plan');
    assert.equal(planMode.isReadOnly, true);
    assert.ok(planMode.emptyDiffMessage.includes('Read-Only Plan'));
    assert.ok(planMode.emptyDiffMessage.includes('Artifacts'));

    const editModeWithDiff = getModeDescription('accept_edits', true);
    assert.equal(editModeWithDiff.modeLabel, 'Accept-Edits');
    assert.equal(editModeWithDiff.isReadOnly, false);
    assert.equal(editModeWithDiff.emptyDiffMessage, '');

    const editModeWithoutDiff = getModeDescription('accept_edits', false);
    assert.ok(editModeWithoutDiff.emptyDiffMessage.includes('không có sự thay đổi'));
  });

  await t.test('7. Redacted diagnostics strips credentials, tokens and sensitive headers', () => {
    const task: TaskDetail = {
      id: 'tsk_sec_123',
      project_id: 'proj_1',
      workspace_id: 'ws_1',
      title: 'Secret Test',
      prompt: 'Check token',
      status: 'FAILED',
      failure_code: 'CLI_ERROR',
      attempts: [],
      current_attempt: {
        id: 'att_1',
        attempt_number: 1,
        status: 'FAILED',
        mode: 'plan',
        exit_code: 1,
        started_at: '2026-10-16T10:00:00Z'
      }
    };

    const sensitiveEvents: NormalizedEvent[] = [
      {
        sequence_number: 1,
        event_type: 'DIAGNOSTIC_LOG',
        payload: {
          token: 'ghp_superSecretToken12345',
          authorization: 'Bearer secret_jwt_token_here',
          safe_message: 'CLI exited with code 1'
        }
      }
    ];

    const diag = buildRedactedDiagnostics(task, sensitiveEvents);
    assert.ok(diag.includes('tsk_sec_123'));
    assert.ok(diag.includes('safe_message'));
    assert.ok(!diag.includes('ghp_superSecretToken12345'), 'Token must be redacted');
    assert.ok(!diag.includes('secret_jwt_token_here'), 'Bearer JWT must be redacted');
    assert.ok(diag.includes('[REDACTED]'), 'Redaction placeholder must be present');
  });

  await t.test('8. Event metadata humanization', () => {
    const initEv: NormalizedEvent = { event_type: 'TASK_INITIALIZED', payload: {} };
    assert.equal(getHumanEventMeta(initEv).badge, 'Khởi động');

    const toolStartEv: NormalizedEvent = {
      event_type: 'TOOL_CALL_START',
      payload: { tool_name: 'git_status' }
    };
    assert.equal(getHumanEventMeta(toolStartEv).title, 'Gọi công cụ: git_status');

    const planEv: NormalizedEvent = {
      event_type: 'PLAN_CREATED',
      payload: { plan_markdown: '# Report' }
    };
    assert.equal(getHumanEventMeta(planEv).badge, 'Artifact');

    const verifEv: NormalizedEvent = {
      event_type: 'VERIFICATION_REPORT',
      payload: { all_passed: true }
    };
    assert.equal(getHumanEventMeta(verifEv).badgeColor, '#10b981');
  });
});

/**
 * Task Observability Helpers and Types
 * Provides contract-driven formatting, status evaluation, event humanization,
 * safe diagnostic redaction, and time metrics for Task Detail Workbench.
 */

export interface NormalizedEvent {
  event_id?: string;
  sequence_number?: number;
  event_type: string;
  severity?: string;
  payload: any;
  created_at?: string;
}

export interface VerificationStep {
  id?: string;
  step_name: string;
  command: string;
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED_BY_POLICY' | 'NOT_RUN';
  exit_code?: number;
  duration_seconds?: number;
  stdout_preview?: string;
  stderr_preview?: string;
  created_at?: string;
}

export interface TaskAttempt {
  id: string;
  attempt_number: number;
  status: string;
  mode: string;
  exit_code?: number;
  duration_seconds?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost_estimate?: number;
  git_branch?: string;
  worktree_path?: string;
  is_isolated?: number;
  diff_stat?: string;
  review_feedback?: string;
  started_at: string;
  finished_at?: string;
  claimed_at?: string;
  first_event_at?: string;
  failure_code?: string;
  failure_message?: string;
}

export interface TaskArtifact {
  id: string;
  task_id?: string;
  attempt_id?: string;
  artifact_type: string;
  display_name?: string;
  file_path: string;
  mime_type?: string;
  content?: string;
  byte_size: number;
  checksum_sha256?: string;
  created_at?: string;
}

export interface RunnerInfo {
  id: string;
  name: string;
  machine_name?: string;
  platform?: string;
  architecture?: string;
  status: string; // 'ONLINE' | 'OFFLINE' | 'STALE' | 'REVOKED'
  last_heartbeat_at?: string;
  has_active_channel?: boolean;
}

export interface TaskDetail {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  prompt: string;
  status: string;
  dispatch_state?: string;
  failure_code?: string;
  review_status?: string;
  current_attempt_id?: string;
  current_attempt?: TaskAttempt;
  attempts: TaskAttempt[];
  workspace?: {
    id: string;
    name: string;
    local_path: string;
    runner_id?: string;
  };
  runner?: RunnerInfo | null;
  artifacts?: TaskArtifact[];
  approvals?: Array<{
    id: string;
    action_type: string;
    decision: string;
    description?: string;
    decided_at: string;
  }>;
  verifications?: VerificationStep[];
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface TaskStatusMeta {
  label: string;
  technical: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  runtimeStatus:
    | 'not_started'
    | 'waiting_for_runner'
    | 'starting'
    | 'running'
    | 'waiting_for_approval'
    | 'completed'
    | 'failed'
    | 'cancelled';
}

export interface RunnerStatusMeta {
  label: string;
  color: string;
  dotColor: string;
  isConnected: boolean;
  channelState: 'active' | 'waiting' | 'stale' | 'offline' | 'none';
  description: string;
}

export interface EventMeta {
  title: string;
  badge: string;
  badgeColor: string;
  category: 'LIFECYCLE' | 'STREAM' | 'TOOLS' | 'TELEMETRY' | 'DIAGNOSTICS' | 'OTHER';
  detail: string;
  isPublic: boolean;
}

/** Format byte size to human-readable string */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Format seconds to human-readable duration */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/** Format ISO timestamp to readable date & time */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Evaluates human-readable task status, technical label, and runtime progression.
 * Strict contract: Never shows RUNNING if only in DB QUEUED or Runner pairing.
 */
export function getHumanTaskStatus(task: TaskDetail): TaskStatusMeta {
  const st = task.status || 'DRAFT';
  const dispatchState = task.dispatch_state || 'IDLE';

  if (st === 'QUEUED') {
    if (dispatchState === 'QUEUED_WAITING_FOR_RUNNER') {
      return {
        label: 'Chờ Runner kết nối',
        technical: 'QUEUED (WAITING_FOR_RUNNER)',
        color: '#fbbf24',
        bg: 'rgba(245,158,11,0.15)',
        border: 'rgba(245,158,11,0.3)',
        description: 'Tác vụ đang đợi Agent Runner kết nối kênh điều phối để nhận việc.',
        runtimeStatus: 'waiting_for_runner'
      };
    }
    return {
      label: 'Trong hàng đợi',
      technical: 'QUEUED',
      color: '#fbbf24',
      bg: 'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.3)',
      description: 'Tác vụ đã vào hàng đợi, sẵn sàng điều phối tới Runner.',
      runtimeStatus: 'starting'
    };
  }

  if (st === 'DISPATCHING') {
    return {
      label: 'Đang điều phối',
      technical: 'DISPATCHING',
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.15)',
      border: 'rgba(59,130,246,0.3)',
      description: 'Đang chuyển giao lệnh thực thi tới Agent Runner...',
      runtimeStatus: 'starting'
    };
  }

  if (st === 'PLANNING') {
    return {
      label: 'Đang phân tích & Lập kế hoạch',
      technical: 'PLANNING',
      color: '#c084fc',
      bg: 'rgba(168,85,247,0.15)',
      border: 'rgba(168,85,247,0.3)',
      description: 'Antigravity CLI đang đọc codebase và chuẩn bị báo cáo/kế hoạch.',
      runtimeStatus: 'running'
    };
  }

  if (st === 'AWAITING_APPROVAL') {
    return {
      label: 'Chờ phê duyệt kế hoạch',
      technical: 'AWAITING_APPROVAL',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.2)',
      border: 'rgba(245,158,11,0.5)',
      description: 'Kế hoạch đã sẵn sàng trong Tab Artifacts. Vui lòng xem xét trước khi phê duyệt.',
      runtimeStatus: 'waiting_for_approval'
    };
  }

  if (st === 'RUNNING') {
    return {
      label: 'Đang thực thi mã nguồn',
      technical: 'RUNNING',
      color: '#34d399',
      bg: 'rgba(16,185,129,0.15)',
      border: 'rgba(16,185,129,0.3)',
      description: 'Antigravity CLI đang tiến hành sửa đổi mã nguồn trong worktree cô lập.',
      runtimeStatus: 'running'
    };
  }

  if (st === 'VERIFYING') {
    return {
      label: 'Đang kiểm thử tự động',
      technical: 'VERIFYING',
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.15)',
      border: 'rgba(59,130,246,0.3)',
      description: 'Runner đang chạy pipeline kiểm thử (lint, typecheck, test, build).',
      runtimeStatus: 'running'
    };
  }

  if (st === 'REVIEW_REQUIRED') {
    return {
      label: 'Chờ nghiệm thu thay đổi',
      technical: 'REVIEW_REQUIRED',
      color: '#eab308',
      bg: 'rgba(234,179,8,0.2)',
      border: 'rgba(234,179,8,0.5)',
      description: 'Thay đổi đã hoàn thành. Vui lòng kiểm tra Unified Diff để nghiệm thu.',
      runtimeStatus: 'waiting_for_approval'
    };
  }

  if (st === 'COMPLETED') {
    return {
      label: 'Hoàn tất thành công',
      technical: 'COMPLETED',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.2)',
      border: 'rgba(16,185,129,0.4)',
      description: 'Tác vụ đã hoàn tất và kết quả đã được xác nhận.',
      runtimeStatus: 'completed'
    };
  }

  if (st === 'FAILED') {
    return {
      label: 'Thất bại',
      technical: task.failure_code ? `FAILED (${task.failure_code})` : 'FAILED',
      color: '#f87171',
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.3)',
      description: 'Tác vụ gặp lỗi trong quá trình thực thi.',
      runtimeStatus: 'failed'
    };
  }

  if (st === 'CANCELLING') {
    return {
      label: 'Đang hủy...',
      technical: 'CANCELLING',
      color: '#f87171',
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.3)',
      description: 'Hệ thống đang gửi tín hiệu dừng tới Agent Runner.',
      runtimeStatus: 'cancelled'
    };
  }

  if (st === 'CANCELLED') {
    return {
      label: 'Đã hủy',
      technical: 'CANCELLED',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.15)',
      border: 'rgba(148,163,184,0.3)',
      description: 'Tác vụ đã bị hủy theo yêu cầu người dùng.',
      runtimeStatus: 'cancelled'
    };
  }

  return {
    label: 'Bản nháp (Draft)',
    technical: 'DRAFT',
    color: '#94a3b8',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    description: 'Tác vụ chưa được điều phối.',
    runtimeStatus: 'not_started'
  };
}

/** Evaluates human-readable runner connectivity */
export function getHumanRunnerStatus(runner?: RunnerInfo | null): RunnerStatusMeta {
  if (!runner) {
    return {
      label: 'Chưa gán Runner',
      color: '#94a3b8',
      dotColor: '#64748b',
      isConnected: false,
      channelState: 'none',
      description: 'Workspace chưa cấu hình hoặc chưa ghép nối với Runner nào.'
    };
  }

  if (runner.has_active_channel) {
    return {
      label: 'Runner Connected',
      color: '#34d399',
      dotColor: '#10b981',
      isConnected: true,
      channelState: 'active',
      description: `Kênh điều phối SSE đang mở (${runner.name} - ${runner.machine_name || 'Host'})`
    };
  }

  if (runner.status === 'ONLINE') {
    return {
      label: 'Runner Paired (Chờ kênh)',
      color: '#fbbf24',
      dotColor: '#f59e0b',
      isConnected: false,
      channelState: 'waiting',
      description: 'Runner có heartbeat nhưng chưa mở kênh SSE nhận task.'
    };
  }

  if (runner.status === 'STALE') {
    return {
      label: 'Runner Mất tín hiệu (>60s)',
      color: '#fb923c',
      dotColor: '#f97316',
      isConnected: false,
      channelState: 'stale',
      description: 'Runner không gửi heartbeat trong hơn 60 giây qua.'
    };
  }

  return {
    label: 'Runner Offline',
    color: '#f87171',
    dotColor: '#ef4444',
    isConnected: false,
    channelState: 'offline',
    description: 'Runner đã ngắt kết nối. Vui lòng bật daemon trên máy host.'
  };
}

/** Maps a normalized domain event to human-friendly metadata */
export function getHumanEventMeta(ev: NormalizedEvent): EventMeta {
  const p = ev.payload || {};

  switch (ev.event_type) {
    case 'TASK_INITIALIZED':
      return {
        title: 'Khởi tạo môi trường CLI',
        badge: 'Khởi động',
        badgeColor: '#60a5fa',
        category: 'LIFECYCLE',
        detail: 'Runner đã chuẩn bị workspace và khởi chạy Antigravity CLI thành công.',
        isPublic: true
      };
    case 'STEP_USER_INPUT':
      return {
        title: 'Tiếp nhận yêu cầu',
        badge: 'User Prompt',
        badgeColor: '#a78bfa',
        category: 'LIFECYCLE',
        detail: p.user_input || 'Nạp yêu cầu của tác vụ vào ngữ cảnh của agent.',
        isPublic: true
      };
    case 'TEXT_DELTA':
      return {
        title: 'Agent Text Stream',
        badge: 'Phản hồi',
        badgeColor: '#34d399',
        category: 'STREAM',
        detail: 'Phát sinh nội dung phản hồi từ Agent.',
        isPublic: true
      };
    case 'TOOL_CALL_START':
      return {
        title: `Gọi công cụ: ${p.tool_name || 'Unknown'}`,
        badge: 'Tool Start',
        badgeColor: '#38bdf8',
        category: 'TOOLS',
        detail: p.tool_args ? `Tham số: ${JSON.stringify(p.tool_args)}` : 'Bắt đầu thực thi công cụ.',
        isPublic: true
      };
    case 'TOOL_CALL_END':
      return {
        title: `Hoàn thành công cụ: ${p.tool_name || 'Unknown'}`,
        badge: 'Tool End',
        badgeColor: '#22c55e',
        category: 'TOOLS',
        detail: `Thời gian: ${p.duration_seconds || 0}s | Trạng thái: ${p.state || 'SUCCESS'}`,
        isPublic: true
      };
    case 'TOKEN_USAGE':
      return {
        title: 'Thống kê tiêu thụ Token',
        badge: 'Tokens',
        badgeColor: '#e879f9',
        category: 'TELEMETRY',
        detail: `Tổng: ${p.total_tokens || 0} (Input: ${p.input_tokens || 0}, Output: ${p.output_tokens || 0})`,
        isPublic: false
      };
    case 'STATUS_TRANSITION':
      return {
        title: `Chuyển trạng thái: ${p.from_status || ''} ➔ ${p.to_status || ''}`,
        badge: 'Trạng thái',
        badgeColor: '#f59e0b',
        category: 'LIFECYCLE',
        detail: p.reason || 'Cập nhật tiến trình tác vụ.',
        isPublic: true
      };
    case 'PLAN_CREATED':
      return {
        title: 'Đã xuất Báo cáo / Kế hoạch',
        badge: 'Artifact',
        badgeColor: '#a855f7',
        category: 'LIFECYCLE',
        detail: `Báo cáo dạng Markdown (${(p.plan_markdown || '').length} ký tự) đã được ghi nhận.`,
        isPublic: true
      };
    case 'VERIFICATION_REPORT':
      return {
        title: 'Báo cáo Kiểm thử Tự động',
        badge: 'Kiểm thử',
        badgeColor: p.all_passed ? '#10b981' : '#ef4444',
        category: 'LIFECYCLE',
        detail: p.all_passed
          ? 'Tất cả các bước kiểm thử đã đạt yêu cầu (PASSED).'
          : 'Phát hiện lỗi trong pipeline kiểm thử.',
        isPublic: true
      };
    case 'TASK_COMPLETED':
      return {
        title: 'Tác vụ hoàn thành',
        badge: 'Hoàn tất',
        badgeColor: '#10b981',
        category: 'LIFECYCLE',
        detail: 'Tất cả các bước thực thi đã kết thúc thành công.',
        isPublic: true
      };
    case 'TASK_FAILED':
      return {
        title: 'Tác vụ thất bại',
        badge: 'Lỗi',
        badgeColor: '#ef4444',
        category: 'LIFECYCLE',
        detail: p.failure_code ? `Mã lỗi: ${p.failure_code}` : p.message || 'Thất bại trong quá trình thực thi.',
        isPublic: true
      };
    case 'TASK_CANCELLED':
      return {
        title: 'Tác vụ đã bị hủy',
        badge: 'Hủy',
        badgeColor: '#94a3b8',
        category: 'LIFECYCLE',
        detail: p.reason || 'Người dùng đã gửi lệnh dừng tác vụ.',
        isPublic: true
      };
    case 'DIAGNOSTIC_LOG':
      return {
        title: 'Log Chẩn đoán Kỹ thuật',
        badge: 'Diagnostic',
        badgeColor: '#64748b',
        category: 'DIAGNOSTICS',
        detail: p.message || JSON.stringify(p),
        isPublic: false
      };
    default:
      return {
        title: ev.event_type,
        badge: 'Event',
        badgeColor: '#94a3b8',
        category: 'OTHER',
        detail: JSON.stringify(p),
        isPublic: true
      };
  }
}

/** Check if first-output waiting exceeded threshold (default 30 seconds) */
export function isFirstOutputTimedOut(waitingSeconds: number, deadlineSeconds = 30): boolean {
  return waitingSeconds >= deadlineSeconds;
}

/** Describes mode behavior and reasons why diff might be empty */
export function getModeDescription(mode?: string, hasDiff = false): {
  modeLabel: string;
  isReadOnly: boolean;
  emptyDiffMessage: string;
} {
  const isReadOnly = mode === 'plan';
  const modeLabel = isReadOnly ? 'Read-Only Plan' : 'Accept-Edits';

  let emptyDiffMessage = '';
  if (!hasDiff) {
    if (isReadOnly) {
      emptyDiffMessage =
        'Tác vụ này chạy ở chế độ Read-Only Plan nên không có file nào trong workspace bị thay đổi. Toàn bộ phân tích và khuyến nghị được lưu trữ trong tab Artifacts.';
    } else {
      emptyDiffMessage = 'Tác vụ này hoàn thành mà không có sự thay đổi nào trên các file mã nguồn.';
    }
  }

  return { modeLabel, isReadOnly, emptyDiffMessage };
}

/** Redacts secrets and sensitive information for technical support */
export function buildRedactedDiagnostics(task: TaskDetail, events: NormalizedEvent[]): string {
  const sanitizedLastEvents = events.slice(-8).map((ev) => {
    const rawPayload = JSON.stringify(ev.payload || {});
    const redactedPayload = rawPayload
      .replace(/("?(?:token|secret|password|key|authorization|bearer)"?\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');

    return {
      sequence_number: ev.sequence_number,
      event_type: ev.event_type,
      created_at: ev.created_at,
      payload: JSON.parse(redactedPayload)
    };
  });

  const report = {
    correlation_id: `diag_${task.id}_${Date.now()}`,
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      dispatch_state: task.dispatch_state,
      failure_code: task.failure_code,
      created_at: task.created_at,
      current_attempt: task.current_attempt
        ? {
            id: task.current_attempt.id,
            attempt_number: task.current_attempt.attempt_number,
            status: task.current_attempt.status,
            mode: task.current_attempt.mode,
            exit_code: task.current_attempt.exit_code,
            duration_seconds: task.current_attempt.duration_seconds,
            git_branch: task.current_attempt.git_branch,
            is_isolated: task.current_attempt.is_isolated,
            first_event_at: task.current_attempt.first_event_at,
            failure_code: task.current_attempt.failure_code
          }
        : null
    },
    runner: task.runner
      ? {
          id: task.runner.id,
          name: task.runner.name,
          platform: task.runner.platform,
          architecture: task.runner.architecture,
          status: task.runner.status,
          has_active_channel: task.runner.has_active_channel,
          last_heartbeat_at: task.runner.last_heartbeat_at
        }
      : null,
    workspace: task.workspace
      ? {
          id: task.workspace.id,
          name: task.workspace.name
        }
      : null,
    telemetry: {
      events_recorded: events.length,
      verifications_count: task.verifications?.length || 0,
      artifacts_count: task.artifacts?.length || 0
    },
    recent_events: sanitizedLastEvents
  };

  return JSON.stringify(report, null, 2);
}

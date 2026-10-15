'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/ui/Icon';

interface NormalizedEvent {
  event_id?: string;
  sequence_number?: number;
  event_type: string;
  severity?: string;
  payload: any;
  created_at?: string;
}

interface VerificationStep {
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

interface TaskAttempt {
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
}

interface TaskDetail {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  prompt: string;
  status: string;
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
  artifacts: Array<{
    id: string;
    artifact_type: string;
    file_path: string;
    content?: string;
    byte_size: number;
  }>;
  approvals: Array<{
    id: string;
    action_type: string;
    decision: string;
    description?: string;
    decided_at: string;
  }>;
  verifications?: VerificationStep[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: 'rgba(255,255,255,0.05)', text: '#94a3b8', border: 'rgba(255,255,255,0.1)' },
  QUEUED: { label: 'Queued', bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  DISPATCHING: { label: 'Dispatching', bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  PLANNING: { label: 'Planning', bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', bg: 'rgba(245,158,11,0.2)', text: '#f59e0b', border: 'rgba(245,158,11,0.5)' },
  RUNNING: { label: 'Running', bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  VERIFYING: { label: 'Verifying', bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  REVIEW_REQUIRED: { label: 'Review Required', bg: 'rgba(234,179,8,0.2)', text: '#eab308', border: 'rgba(234,179,8,0.5)' },
  COMPLETED: { label: 'Completed', bg: 'rgba(16,185,129,0.2)', text: '#10b981', border: 'rgba(16,185,129,0.4)' },
  FAILED: { label: 'Failed', bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  CANCELLING: { label: 'Cancelling...', bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  CANCELLED: { label: 'Cancelled', bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
};

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ai_chan_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'diff' | 'verifications' | 'artifacts'>('timeline');
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [diffContent, setDiffContent] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Người dùng hủy từ web UI.');
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangesFeedback, setRequestChangesFeedback] = useState('');
  const [selectedVerifStep, setSelectedVerifStep] = useState<VerificationStep | null>(null);

  const streamTextRef = useRef<string>('');
  const [liveStreamText, setLiveStreamText] = useState<string>('');
  const seenSequences = useRef<Set<number>>(new Set());
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchTaskDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDiff = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/diff`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDiffContent(data.diff || '');
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    fetchTaskDetail();
    fetchDiff();
  }, [fetchTaskDetail, fetchDiff]);

  // Setup Server-Sent Events (SSE) listener with replay
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    const connectSSE = () => {
      // Find maximum seen sequence number for replay offset
      let maxSeq = 0;
      seenSequences.current.forEach((seq) => {
        if (seq > maxSeq) maxSeq = seq;
      });

      const sseUrl = `/api/v1/orchestrator/tasks/${id}/events?since_seq=${maxSeq}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const parsed = JSON.parse(e.data);
          handleIncomingEvent('message', parsed, e.lastEventId);
        } catch {
          // ignore
        }
      };

      const eventNames = [
        'TASK_INITIALIZED',
        'TEXT_DELTA',
        'TOOL_CALL_START',
        'TOOL_CALL_END',
        'TOKEN_USAGE',
        'STATUS_TRANSITION',
        'DIAGNOSTIC_LOG',
        'VERIFICATION_REPORT',
        'TASK_COMPLETED',
        'TASK_FAILED',
        'TASK_CANCELLED',
        'TASK_TERMINATED'
      ];

      eventNames.forEach((evName) => {
        eventSource?.addEventListener(evName, (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(e.data);
            handleIncomingEvent(evName, parsed, e.lastEventId);
          } catch {
            // ignore
          }
        });
      });

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          // Reconnect after brief pause
          setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      };
    };

    const handleIncomingEvent = (evType: string, payload: any, eventId?: string) => {
      let seqNum = payload?.sequence_number;
      if (eventId && eventId.startsWith('evt_')) {
        const s = parseInt(eventId.replace('evt_', ''), 10);
        if (!isNaN(s)) seqNum = s;
      }

      if (seqNum !== undefined && seqNum !== null) {
        if (seenSequences.current.has(seqNum)) return; // duplicate check
        seenSequences.current.add(seqNum);
      }

      const newEvt: NormalizedEvent = {
        event_id: eventId || `evt_${Date.now()}`,
        sequence_number: seqNum,
        event_type: evType,
        payload
      };

      setEvents((prev) => [...prev, newEvt]);

      // If text delta, append to streaming markdown output
      if (evType === 'TEXT_DELTA' && payload?.text_delta) {
        streamTextRef.current += payload.text_delta;
        setLiveStreamText(streamTextRef.current);
      }

      // If status transition, verification report or termination, refresh task details & diff
      if (['STATUS_TRANSITION', 'TASK_COMPLETED', 'TASK_FAILED', 'TASK_TERMINATED', 'VERIFICATION_REPORT'].includes(evType)) {
        fetchTaskDetail();
        fetchDiff();
      }

      // Auto-scroll to bottom of output
      if (terminalEndRef.current) {
        terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [id, fetchTaskDetail, fetchDiff]);

  // Actions
  const handleDispatch = async (mode: string = 'plan') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/dispatch?mode=${mode}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchTaskDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    setActionLoading(true);
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/cancel`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setShowCancelModal(false);
        await fetchTaskDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproval = async (decision: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/approval`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          reason: decision === 'APPROVED' ? 'Người dùng phê duyệt kế hoạch.' : 'Người dùng từ chối kế hoạch.'
        })
      });
      if (res.ok) {
        await fetchTaskDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', feedback?: string) => {
    setActionLoading(true);
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/review`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          feedback: feedback || (decision === 'APPROVE' ? 'Approved by reviewer.' : 'Rejected by reviewer.')
        })
      });
      if (res.ok) {
        setShowRequestChangesModal(false);
        setRequestChangesFeedback('');
        await fetchTaskDetail();
        await fetchDiff();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
        Đang tải thông tin chi tiết tác vụ...
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#f87171' }}>
        Không tìm thấy tác vụ hoặc bạn không có quyền truy cập.
      </div>
    );
  }

  const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.DRAFT;
  const currentAtt = task.current_attempt;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#f1f5f9' }}>
      {/* Top Breadcrumb & Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
          <Link href="/tasks" style={{ color: '#94a3b8', textDecoration: 'none' }}>Tasks</Link>
          <span>/</span>
          <span style={{ color: '#f8fafc', fontWeight: 500 }}>{task.id}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['DRAFT', 'FAILED', 'CANCELLED'].includes(task.status) && (
            <button
              onClick={() => handleDispatch('plan')}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Icon name="play" size={14} />
              <span>{task.status === 'DRAFT' ? 'Dispatch Turn' : 'Retry Task'}</span>
            </button>
          )}

          {['RUNNING', 'PLANNING', 'QUEUED', 'AWAITING_APPROVAL', 'DISPATCHING'].includes(task.status) && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Icon name="stop" size={14} />
              <span>Cancel Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Task Summary Banner */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '20px 24px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  background: st.bg,
                  color: st.text,
                  border: `1px solid ${st.border}`
                }}
              >
                {st.label}
              </span>

              {currentAtt?.mode && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Mode: {currentAtt.mode === 'plan' ? 'Read-Only Plan' : 'Accept-Edits'}
                </span>
              )}

              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Attempt #{currentAtt?.attempt_number || 1}
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px', color: '#f8fafc' }}>
              {task.title}
            </h1>

            <div style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {task.prompt}
            </div>
          </div>

          {/* Quick Metrics */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '220px',
              background: 'rgba(15,23,42,0.6)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontSize: '12px'
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Workspace: </span>
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>{task.workspace?.name || 'N/A'}</span>
            </div>
            {currentAtt?.git_branch && (
              <div>
                <span style={{ color: '#64748b' }}>Branch: </span>
                <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{currentAtt.git_branch}</span>
              </div>
            )}
            <div>
              <span style={{ color: '#64748b' }}>Runtime: </span>
              <span style={{ color: '#f8fafc' }}>Antigravity CLI (agy)</span>
            </div>
            {currentAtt?.duration_seconds && (
              <div>
                <span style={{ color: '#64748b' }}>Thời gian: </span>
                <span style={{ color: '#f8fafc' }}>{currentAtt.duration_seconds}s</span>
              </div>
            )}
            {currentAtt?.tokens_in !== undefined && currentAtt?.tokens_in !== null && (
              <div>
                <span style={{ color: '#64748b' }}>Token Usage: </span>
                <span style={{ color: '#34d399' }}>
                  {(currentAtt.tokens_in || 0) + (currentAtt.tokens_out || 0)} tokens
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Human In The Loop Decision Bars */}
        {task.status === 'AWAITING_APPROVAL' && (
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '14px' }}>
                Kế hoạch thực thi đã sẵn sàng (Human-in-the-Loop)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Agent đã đọc cấu trúc code và xuất kế hoạch. Vui lòng xem xét trước khi cho phép ghi đè file.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleApproval('REJECTED')}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Reject Plan
              </button>

              <button
                onClick={() => handleApproval('APPROVED')}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Approve & Execute Edits &rarr;
              </button>
            </div>
          </div>
        )}

        {task.status === 'REVIEW_REQUIRED' && (
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '8px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#60a5fa', fontSize: '14px' }}>
                Thay đổi hoàn thành — Cần kiểm tra Unified Diff
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Các file đã được cập nhật thành công. Vui lòng xem xét các thay đổi bên dưới trước khi nghiệm thu.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleReview('REJECT')}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reject
              </button>

              <button
                onClick={() => setShowRequestChangesModal(true)}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(245,158,11,0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Request Changes...
              </button>

              <button
                onClick={() => handleReview('APPROVE')}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Approve & Accept Changes &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'timeline' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'timeline' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="terminal" size={16} />
          <span>Output & Timeline ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'diff' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'diff' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="git" size={16} />
          <span>Unified Diff {diffContent ? '(Active)' : ''}</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'verifications' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'verifications' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="check" size={16} />
          <span>Verification Pipeline ({task.verifications?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('artifacts')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'artifacts' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'artifacts' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="doc" size={16} />
          <span>Artifacts ({task.artifacts?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Live Output & Timeline */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left Column: Markdown / Agent Text Output */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '480px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              Agent Text Stream (Antigravity Output)
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                maxHeight: '600px'
              }}
            >
              {liveStreamText ? (
                liveStreamText
              ) : (
                <span style={{ color: '#475569' }}>
                  {['RUNNING', 'PLANNING'].includes(task.status)
                    ? 'Đang chờ luồng đầu ra từ Agent Runner...'
                    : 'Chưa có dữ liệu stream.'}
                </span>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Right Column: Events & Tool Invocations */}
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '660px',
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              Normalized Domain Events ({events.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Chưa có sự kiện nào được ghi nhận.
                </div>
              ) : (
                events.map((ev, idx) => {
                  let badgeColor = '#94a3b8';
                  if (ev.event_type.includes('COMPLETED')) badgeColor = '#34d399';
                  if (ev.event_type.includes('FAILED')) badgeColor = '#f87171';
                  if (ev.event_type.includes('TOOL')) badgeColor = '#60a5fa';
                  if (ev.event_type.includes('APPROVAL')) badgeColor = '#fbbf24';

                  return (
                    <div
                      key={ev.event_id || idx}
                      style={{
                        background: 'rgba(15,23,42,0.6)',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: badgeColor }}>
                          {ev.event_type}
                        </span>
                        {ev.sequence_number && (
                          <span style={{ color: '#64748b' }}>#{ev.sequence_number}</span>
                        )}
                      </div>

                      {ev.payload && (
                        <div style={{ fontFamily: 'monospace', color: '#cbd5e1', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {ev.event_type === 'TOOL_CALL_START' && (
                            <div>Tool: <span style={{ color: '#60a5fa' }}>{ev.payload.tool_name}</span></div>
                          )}
                          {ev.event_type === 'TOOL_CALL_END' && (
                            <div>Duration: {ev.payload.duration_seconds}s | Status: {ev.payload.state}</div>
                          )}
                          {ev.event_type === 'TOKEN_USAGE' && (
                            <div>Tokens: {ev.payload.total_tokens} (In: {ev.payload.input_tokens}, Out: {ev.payload.output_tokens})</div>
                          )}
                          {['DIAGNOSTIC_LOG', 'STATUS_TRANSITION'].includes(ev.event_type) && (
                            <div>{JSON.stringify(ev.payload)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Unified Diff Viewer */}
      {activeTab === 'diff' && (
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '20px',
            minHeight: '400px'
          }}
        >
          {/* Worktree & Branch Info Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.2)' }}>
                Branch: {currentAtt?.git_branch || `ai-chan/task-${task.id.slice(0, 8)}`}
              </span>
              <span style={{ color: currentAtt?.is_isolated ? '#34d399' : '#94a3b8', background: currentAtt?.is_isolated ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {currentAtt?.is_isolated ? '✓ Git Worktree Isolated' : 'Direct Workspace'}
              </span>
            </div>
            {currentAtt?.diff_stat && (
              <span style={{ fontFamily: 'monospace', color: '#cbd5e1', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: '4px' }}>
                {currentAtt.diff_stat.split('\n')[0]}
              </span>
            )}
          </div>

          {/* Sensitive File Masking Security Notice */}
          {diffContent.includes('[REDACTED_SENSITIVE_CONTENT') && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 16px',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '6px',
                color: '#fbbf24',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="shield" size={16} />
              <span>
                <strong>Bảo mật Diff:</strong> Các file chứa credential nhạy cảm (.env, khóa bí mật, chứng chỉ) đã được tự động ẩn khỏi diff để đảm bảo an toàn.
              </span>
            </div>
          )}

          {diffContent ? (
            <div style={{ fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto' }}>
              {diffContent.split('\n').map((line, idx) => {
                let bg = 'transparent';
                let textCol = '#cbd5e1';

                if (line.startsWith('+') && !line.startsWith('+++')) {
                  bg = 'rgba(16,185,129,0.15)';
                  textCol = '#34d399';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  bg = 'rgba(239,68,68,0.15)';
                  textCol = '#f87171';
                } else if (line.startsWith('@@')) {
                  bg = 'rgba(59,130,246,0.1)';
                  textCol = '#60a5fa';
                }

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: bg,
                      color: textCol,
                      padding: '2px 8px',
                      borderRadius: '2px',
                      whiteSpace: 'pre'
                    }}
                  >
                    {line || ' '}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
              Chưa có thay đổi nào được ghi nhận cho attempt này.
            </div>
          )}
        </div>
      )}

      {/* Tab: Verification Pipeline */}
      {activeTab === 'verifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                  Verification Pipeline (Automated Quality & Policy Gates)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Các bước kiểm thử tự động (Lint, Type-Check, Test Suite, Build) thực thi trong môi trường cô lập trước khi review.
                </p>
              </div>

              {task.verifications && task.verifications.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {task.verifications.every((v) => v.status === 'PASSED') ? (
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      ✓ All Tests Passed
                    </span>
                  ) : task.verifications.some((v) => ['FAILED', 'ERROR'].includes(v.status)) ? (
                    <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      ⚠ Verification Failures Detected
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      Policy Partial / Skipped
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Grid of Steps */}
            {(!task.verifications || task.verifications.length === 0) ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                {task.status === 'VERIFYING'
                  ? 'Đang thực thi các bước kiểm thử trong Runner...'
                  : 'Chưa có báo cáo kiểm thử nào cho attempt này.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {task.verifications.map((step, idx) => {
                  let badgeBg = 'rgba(148,163,184,0.1)';
                  let badgeText = '#94a3b8';
                  let badgeBorder = 'rgba(148,163,184,0.2)';

                  if (step.status === 'PASSED') {
                    badgeBg = 'rgba(16,185,129,0.15)';
                    badgeText = '#34d399';
                    badgeBorder = 'rgba(16,185,129,0.3)';
                  } else if (step.status === 'FAILED' || step.status === 'ERROR') {
                    badgeBg = 'rgba(239,68,68,0.15)';
                    badgeText = '#f87171';
                    badgeBorder = 'rgba(239,68,68,0.3)';
                  } else if (step.status === 'SKIPPED_BY_POLICY') {
                    badgeBg = 'rgba(245,158,11,0.15)';
                    badgeText = '#fbbf24';
                    badgeBorder = 'rgba(245,158,11,0.3)';
                  }

                  return (
                    <div
                      key={step.id || idx}
                      onClick={() => setSelectedVerifStep(step)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase' }}>
                          {step.step_name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: badgeBg,
                            color: badgeText,
                            border: `1px solid ${badgeBorder}`
                          }}
                        >
                          {step.status}
                        </span>
                      </div>

                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#60a5fa', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        $ {step.command || '(none)'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                        <span>Thời gian: {step.duration_seconds || 0}s</span>
                        <span>Exit code: {step.exit_code ?? '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected step details modal / preview */}
          {selectedVerifStep && (
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                  Chi tiết bước: {selectedVerifStep.step_name.toUpperCase()} ($ {selectedVerifStep.command})
                </span>
                <button
                  onClick={() => setSelectedVerifStep(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              {selectedVerifStep.stdout_preview && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Standard Output:</div>
                  <pre style={{ margin: 0, padding: '10px', background: '#020617', borderRadius: '6px', fontSize: '12px', color: '#e2e8f0', maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedVerifStep.stdout_preview}
                  </pre>
                </div>
              )}

              {selectedVerifStep.stderr_preview && (
                <div>
                  <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>Standard Error:</div>
                  <pre style={{ margin: 0, padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '12px', color: '#fca5a5', maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedVerifStep.stderr_preview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Artifacts */}
      {activeTab === 'artifacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {task.artifacts && task.artifacts.length > 0 ? (
            task.artifacts.map((art) => (
              <div
                key={art.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                    {art.file_path}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Type: {art.artifact_type} | Size: {art.byte_size} bytes
                  </div>
                </div>

                {art.content && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(art.content || '');
                      alert('Đã sao chép nội dung artifact!');
                    }}
                    style={{
                      padding: '6px 14px',
                      background: '#334155',
                      color: '#f8fafc',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Copy Content
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Không có artifacts nào cho task này.
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              color: '#f8fafc'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 10px', color: '#f87171' }}>
              Xác nhận hủy tác vụ
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
              Hệ thống sẽ gửi tín hiệu hủy (SIGTERM / process tree kill) tới Agent Runner để dọn dẹp tiến trình.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Lý do hủy:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Bỏ qua
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  background: '#dc2626',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(245,158,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24'
                }}
              >
                <Icon name="edit" size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Yêu cầu chỉnh sửa (Request Changes)
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Cung cấp phản hồi chi tiết cho Agent. Phản hồi này sẽ được lưu vào lịch sử review và chuyển tiếp tới lượt chạy tiếp theo (follow-up attempt) để Agent tiếp tục chỉnh sửa trên worktree.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                Feedback / Hướng dẫn chỉnh sửa:
              </label>
              <textarea
                value={requestChangesFeedback}
                onChange={(e) => setRequestChangesFeedback(e.target.value)}
                placeholder="Ví dụ: Cần bổ sung test case cho giá trị rỗng, hoặc hàm validation trong auth.py chưa xử lý exception timeout..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowRequestChangesModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleReview('REQUEST_CHANGES', requestChangesFeedback)}
                disabled={actionLoading || !requestChangesFeedback.trim()}
                style={{
                  padding: '8px 18px',
                  background: requestChangesFeedback.trim() ? '#d97706' : '#64748b',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: requestChangesFeedback.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px'
                }}
              >
                {actionLoading ? 'Đang gửi...' : 'Gửi yêu cầu & Tạo attempt mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

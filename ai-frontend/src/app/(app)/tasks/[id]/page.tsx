'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import SafeMarkdown from '@/components/ui/SafeMarkdown';
import {
  TaskDetail,
  TaskAttempt,
  TaskArtifact,
  NormalizedEvent,
  VerificationStep,
  formatBytes,
  formatDuration,
  formatDateTime,
  getHumanTaskStatus,
  getHumanRunnerStatus,
  getHumanEventMeta,
  isFirstOutputTimedOut,
  getModeDescription,
  buildRedactedDiagnostics
} from '@/lib/taskObservability';

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
  const [retryArtifactLoading, setRetryArtifactLoading] = useState(false);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Người dùng hủy từ web UI.');
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangesFeedback, setRequestChangesFeedback] = useState('');
  const [selectedVerifStep, setSelectedVerifStep] = useState<VerificationStep | null>(null);
  const [previewArtifact, setPreviewArtifact] = useState<TaskArtifact | null>(null);

  // Artifacts list
  const [artifactsList, setArtifactsList] = useState<TaskArtifact[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);

  // Stream & Telemetry
  const streamTextRef = useRef<string>('');
  const [liveStreamText, setLiveStreamText] = useState<string>('');
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'TOOLS' | 'LIFECYCLE'>('ALL');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [streamWaitingSeconds, setStreamWaitingSeconds] = useState<number>(0);
  const [sseConnected, setSseConnected] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const seenSequences = useRef<Set<number>>(new Set());
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Fetch task detail
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

  // Fetch diff
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

  // Fetch real artifacts
  const fetchArtifacts = useCallback(async () => {
    if (!id) return;
    setArtifactsLoading(true);
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/artifacts`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setArtifactsList(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setArtifactsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTaskDetail();
    fetchDiff();
    fetchArtifacts();
  }, [fetchTaskDetail, fetchDiff, fetchArtifacts]);

  // First output elapsed timer
  useEffect(() => {
    if (!task) return;
    const isRunningWithoutOutput =
      ['PLANNING', 'RUNNING', 'DISPATCHING'].includes(task.status) && !liveStreamText;

    if (!isRunningWithoutOutput) {
      setStreamWaitingSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setStreamWaitingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [task?.status, liveStreamText]);

  // Setup Server-Sent Events (SSE) listener with replay
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    const connectSSE = () => {
      let maxSeq = 0;
      seenSequences.current.forEach((seq) => {
        if (seq > maxSeq) maxSeq = seq;
      });

      const sseUrl = `/api/v1/orchestrator/tasks/${id}/events?since_seq=${maxSeq}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        if (isMounted) setSseConnected(true);
      };

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
        'STEP_USER_INPUT',
        'TEXT_DELTA',
        'TOOL_CALL_START',
        'TOOL_CALL_END',
        'TOKEN_USAGE',
        'STATUS_TRANSITION',
        'DIAGNOSTIC_LOG',
        'PLAN_CREATED',
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
        if (isMounted) setSseConnected(false);
        if (eventSource?.readyState === EventSource.CLOSED) {
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
        event_id: eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sequence_number: seqNum,
        event_type: evType,
        payload,
        created_at: new Date().toISOString()
      };

      setEvents((prev) => [...prev, newEvt]);

      // If text delta, append to streaming output
      if (evType === 'TEXT_DELTA' && payload?.text_delta) {
        streamTextRef.current += payload.text_delta;
        setLiveStreamText(streamTextRef.current);
      }

      // If status transition or terminal state, refresh details, diff and artifacts
      if (
        [
          'STATUS_TRANSITION',
          'TASK_COMPLETED',
          'TASK_FAILED',
          'TASK_TERMINATED',
          'PLAN_CREATED',
          'VERIFICATION_REPORT'
        ].includes(evType)
      ) {
        fetchTaskDetail();
        fetchDiff();
        fetchArtifacts();
      }

      if (autoScroll && terminalEndRef.current) {
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
  }, [id, fetchTaskDetail, fetchDiff, fetchArtifacts, autoScroll]);

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
        showToast(`Tác vụ đã được chuyển giao thành công (${mode === 'plan' ? 'Read-Only Plan' : 'Accept-Edits'}).`, 'success');
        await fetchTaskDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Không thể điều phối tác vụ. Vui lòng kiểm tra Runner.', 'error');
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
        showToast('Đã gửi lệnh hủy tác vụ tới Agent Runner.', 'info');
        await fetchTaskDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Không thể hủy tác vụ.', 'error');
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
        showToast(
          decision === 'APPROVED' ? 'Đã phê duyệt kế hoạch. Đang tiến hành thực thi mã nguồn...' : 'Đã từ chối kế hoạch.',
          'success'
        );
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
        showToast(
          decision === 'APPROVE'
            ? 'Đã nghiệm thu và chấp thuận các thay đổi!'
            : decision === 'REQUEST_CHANGES'
            ? 'Đã gửi yêu cầu chỉnh sửa và tạo attempt mới.'
            : 'Đã từ chối thay đổi.',
          'success'
        );
        await fetchTaskDetail();
        await fetchDiff();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryArtifacts = async () => {
    setRetryArtifactLoading(true);
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/artifacts/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Phục hồi Artifacts thành công!', 'success');
        await fetchTaskDetail();
        await fetchArtifacts();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Không thể phục hồi artifacts.', 'error');
      }
    } finally {
      setRetryArtifactLoading(false);
    }
  };

  const handleCopyDiagnostics = () => {
    if (!task) return;
    const diag = buildRedactedDiagnostics(task, events);
    navigator.clipboard.writeText(diag);
    showToast('Đã sao chép báo cáo chẩn đoán (đã bảo mật / redact) vào clipboard!', 'success');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`, 'success');
  };

  const handleOpenArtifactPreview = async (art: TaskArtifact) => {
    if (art.content) {
      setPreviewArtifact(art);
      return;
    }
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${id}/artifacts/${art.id}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const detail = await res.json();
        setPreviewArtifact(detail);
      } else {
        setPreviewArtifact(art);
      }
    } catch {
      setPreviewArtifact(art);
    }
  };

  const handleDownloadArtifact = (art: TaskArtifact) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai_chan_token') : null;
    const downloadUrl = `/api/v1/orchestrator/tasks/${id}/artifacts/${art.id}/download${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ marginBottom: '12px' }}>
          <Icon name="terminal" size={28} style={{ color: '#3b82f6' }} />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Đang tải thông tin chi tiết tác vụ...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#f87171' }}>
        <Icon name="alert" size={32} style={{ marginBottom: '12px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Không tìm thấy tác vụ</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
          Tác vụ không tồn tại hoặc bạn không có quyền truy cập vào workspace này.
        </p>
      </div>
    );
  }

  const currentAtt = task.current_attempt;
  const statusMeta = getHumanTaskStatus(task);
  const runnerMeta = getHumanRunnerStatus(task.runner);
  const modeInfo = getModeDescription(currentAtt?.mode, !!diffContent);
  const isTimedOut = isFirstOutputTimedOut(streamWaitingSeconds, 30);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (!showTechDetails && ['DIAGNOSTIC_LOG', 'TOKEN_USAGE'].includes(ev.event_type)) {
      return false;
    }
    if (eventFilter === 'TOOLS') {
      return ev.event_type.startsWith('TOOL_');
    }
    if (eventFilter === 'LIFECYCLE') {
      return !ev.event_type.startsWith('TOOL_') && ev.event_type !== 'TEXT_DELTA';
    }
    return true;
  });

  const toolEventsCount = events.filter((e) => e.event_type.startsWith('TOOL_')).length;
  const lifecycleEventsCount = events.filter((e) => !e.event_type.startsWith('TOOL_') && e.event_type !== 'TEXT_DELTA').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#f1f5f9' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
          <Link href="/tasks" style={{ color: '#94a3b8', textDecoration: 'none' }}>Tasks</Link>
          <span>/</span>
          <span style={{ color: '#f8fafc', fontWeight: 600, fontFamily: 'monospace' }}>{task.id}</span>
          <button
            onClick={() => handleCopyText(task.id, 'Task ID')}
            title="Sao chép Task ID"
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
          >
            <Icon name="copy" size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Retry / Dispatch Button */}
          {['DRAFT', 'FAILED', 'CANCELLED'].includes(task.status) && (
            <button
              onClick={() => handleDispatch(currentAtt?.mode || 'plan')}
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
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Icon name="play" size={14} />
              <span>{task.status === 'DRAFT' ? 'Bắt đầu (Dispatch Turn)' : 'Thử lại (Retry Task)'}</span>
            </button>
          )}

          {/* Cancel Button */}
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
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Icon name="stop" size={14} />
              <span>Hủy Tác Vụ</span>
            </button>
          )}

          {/* View Diff Shortcut */}
          <button
            onClick={() => setActiveTab('diff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Icon name="git" size={14} />
            <span>Xem Diff {diffContent ? '(Active)' : ''}</span>
          </button>

          {/* View Artifacts Shortcut */}
          <button
            onClick={() => setActiveTab('artifacts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Icon name="doc" size={14} />
            <span>Artifacts ({artifactsList.length || task.artifacts?.length || 0})</span>
          </button>

          {/* Redacted Diagnostics Button */}
          <button
            onClick={handleCopyDiagnostics}
            title="Sao chép toàn bộ thông tin chẩn đoán kỹ thuật (đã bảo mật)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Icon name="shield" size={14} />
            <span>Copy Diagnostics</span>
          </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1fr)', gap: '24px' }}>
          <div>
            {/* Status & Mode badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background: statusMeta.bg,
                  color: statusMeta.color,
                  border: `1px solid ${statusMeta.border}`,
                  letterSpacing: '0.02em'
                }}
              >
                {statusMeta.label}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                Status: {statusMeta.technical}
              </span>

              <span
                style={{
                  fontSize: '12px',
                  color: modeInfo.isReadOnly ? '#a855f7' : '#38bdf8',
                  background: modeInfo.isReadOnly ? 'rgba(168,85,247,0.12)' : 'rgba(56,189,248,0.12)',
                  border: `1px solid ${modeInfo.isReadOnly ? 'rgba(168,85,247,0.3)' : 'rgba(56,189,248,0.3)'}`,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                {modeInfo.modeLabel}
              </span>

              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Lượt chạy #{currentAtt?.attempt_number || 1}
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 10px', color: '#f8fafc', lineHeight: 1.4 }}>
              {task.title}
            </h1>

            {/* Prompt Preview */}
            <div
              style={{
                fontSize: '13px',
                color: '#cbd5e1',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid #334155',
                padding: '12px 16px',
                borderRadius: '8px',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                Yêu cầu của bạn:
              </div>
              <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}>
                {task.prompt}
              </div>
            </div>
          </div>

          {/* Quick Context & Runtime Telemetry Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'rgba(15,23,42,0.7)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontSize: '12px'
            }}
          >
            {/* Runner Health */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Runner Status:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: runnerMeta.dotColor,
                    display: 'inline-block'
                  }}
                />
                <span style={{ color: runnerMeta.color, fontWeight: 600 }}>{runnerMeta.label}</span>
              </div>
            </div>

            {/* Workspace & Path */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Workspace:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{task.workspace?.name || 'Chưa liên kết'}</span>
              </div>
              {task.workspace?.local_path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#94a3b8',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '220px'
                    }}
                    title={task.workspace.local_path}
                  >
                    {task.workspace.local_path}
                  </span>
                  <button
                    onClick={() => handleCopyText(task.workspace!.local_path, 'Đường dẫn Workspace')}
                    title="Sao chép đường dẫn thư mục"
                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '2px' }}
                  >
                    <Icon name="copy" size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Branch */}
            {currentAtt?.git_branch && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Branch:</span>
                <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{currentAtt.git_branch}</span>
              </div>
            )}

            {/* Runtime */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>Runtime Adapter:</span>
              <span style={{ color: '#f8fafc' }}>Antigravity CLI (agy)</span>
            </div>

            {/* Timestamps */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tạo lúc:</span>
                <span style={{ color: '#cbd5e1' }}>{formatDateTime(task.created_at)}</span>
              </div>
              {currentAtt?.started_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bắt đầu:</span>
                  <span style={{ color: '#cbd5e1' }}>{formatDateTime(currentAtt.started_at)}</span>
                </div>
              )}
              {currentAtt?.first_event_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Output đầu tiên:</span>
                  <span style={{ color: '#34d399' }}>{formatDateTime(currentAtt.first_event_at)}</span>
                </div>
              )}
              {currentAtt?.duration_seconds !== undefined && currentAtt?.duration_seconds !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Thời lượng:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatDuration(currentAtt.duration_seconds)}</span>
                </div>
              )}
              {currentAtt?.tokens_in !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tokens:</span>
                  <span style={{ color: '#38bdf8' }}>
                    {(currentAtt.tokens_in || 0) + (currentAtt.tokens_out || 0)} tokens
                  </span>
                </div>
              )}
            </div>
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
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '14px' }}>
                Kế hoạch thực thi đã sẵn sàng (Human-in-the-Loop Gate)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Agent đã phân tích codebase và xuất bản kế hoạch. Bạn có thể xem xét kế hoạch trong tab Artifacts trước khi phê duyệt.
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
                Từ chối kế hoạch
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
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Phê duyệt & Cho phép sửa code &rarr;
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
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#60a5fa', fontSize: '14px' }}>
                Thay đổi hoàn thành — Cần nghiệm thu Unified Diff
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Các file đã được cập nhật trên git worktree. Vui lòng kiểm tra tab Unified Diff trước khi chấp thuận.
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
                Từ chối
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
                Yêu cầu chỉnh sửa...
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
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Chấp thuận & Merge Changes &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error & Guidance Banner (Section E) */}
      {(task.status === 'FAILED' ||
        task.dispatch_state === 'QUEUED_WAITING_FOR_RUNNER' ||
        task.failure_code) && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <div style={{ color: '#f87171', marginTop: '2px' }}>
            <Icon name="alert" size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#f87171', fontSize: '14px', marginBottom: '4px' }}>
              {task.dispatch_state === 'QUEUED_WAITING_FOR_RUNNER'
                ? 'Agent Runner chưa kết nối kênh điều phối'
                : task.failure_code === 'EMPTY_RUNTIME_OUTPUT'
                ? 'Runtime CLI kết thúc mà không phát sinh phản hồi (Empty Output)'
                : task.failure_code === 'ARTIFACT_STORAGE_ERROR'
                ? 'Sự cố lưu trữ Artifact kết quả'
                : `Sự cố thực thi tác vụ: ${task.failure_code || 'FAILED'}`}
            </div>

            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
              {task.dispatch_state === 'QUEUED_WAITING_FOR_RUNNER' ? (
                <span>
                  Tác vụ đã được tạo nhưng Runner chưa mở kênh nhận task. Vui lòng kiểm tra và bật Agent Runner trên máy của bạn (chạy <code>python -m runner start</code>) hoặc đảm bảo kết nối mạng giữa Runner và Orchestrator không bị chặn.
                </span>
              ) : task.failure_code === 'EMPTY_RUNTIME_OUTPUT' ? (
                <span>
                  Tiến trình Antigravity CLI đã kết thúc nhưng không có output nào được ghi nhận. Điều này thường xảy ra khi CLI bị lỗi cấu hình, chưa đăng nhập GCP/ADC, hoặc workspace không cấp quyền đọc cho tiến trình.
                </span>
              ) : task.failure_code === 'ARTIFACT_STORAGE_ERROR' ? (
                <span>
                  Tác vụ đã hoàn tất nhưng gặp lỗi khi lưu file artifact vào cơ sở dữ liệu. Bạn có thể nhấn nút <strong>Thử lưu lại Artifact</strong> để hệ thống tự động trích xuất lại từ event stream mà không cần chạy lại tác vụ.
                </span>
              ) : (
                <span>
                  Tác vụ gặp lỗi trong quá trình thực thi. Bạn có thể sao chép thông tin chẩn đoán kỹ thuật để gửi cho đội hỗ trợ hoặc nhấn &quot;Thử lại tác vụ&quot;.
                </span>
              )}
            </div>

            {/* Actions for recovery */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
              {task.failure_code === 'ARTIFACT_STORAGE_ERROR' && (
                <button
                  onClick={handleRetryArtifacts}
                  disabled={retryArtifactLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="refresh" size={13} />
                  <span>{retryArtifactLoading ? 'Đang thử lại...' : 'Thử lưu lại Artifact'}</span>
                </button>
              )}

              <button
                onClick={handleCopyDiagnostics}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Icon name="copy" size={13} />
                <span>Sao chép chẩn đoán (Redacted)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'timeline' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'timeline' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 600,
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
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'diff' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'diff' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 600,
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
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'verifications' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'verifications' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 600,
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
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'artifacts' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'artifacts' ? '#60a5fa' : '#94a3b8',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="doc" size={16} />
          <span>Artifacts ({artifactsList.length || task.artifacts?.length || 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OUTPUT & TIMELINE (Section B & C) */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: '20px' }}>
          {/* Left Column: Markdown / Agent Text Output */}
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '520px'
            }}
          >
            {/* Output header bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '10px',
                borderBottom: '1px solid #1e293b',
                marginBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Agent Response Stream (Antigravity Output)
                </span>
                {!sseConnected && (
                  <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    Mất kết nối SSE
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  <span>Tự cuộn</span>
                </label>

                {liveStreamText && (
                  <button
                    onClick={() => handleCopyText(liveStreamText, 'nội dung phản hồi')}
                    title="Sao chép toàn bộ nội dung stream"
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Icon name="copy" size={12} />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>

            {/* Output content area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '620px',
                paddingRight: '6px'
              }}
            >
              {liveStreamText ? (
                <SafeMarkdown content={liveStreamText} />
              ) : ['RUNNING', 'PLANNING', 'DISPATCHING'].includes(task.status) ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  {!isTimedOut ? (
                    <div>
                      <div style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                        Đang chờ phản hồi đầu tiên từ Antigravity CLI... ({streamWaitingSeconds}s)
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>
                        Agent Runner đã nhận task và đang khởi động tiến trình headless...
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600, marginBottom: '6px' }}>
                        <Icon name="alert" size={16} />
                        <span>Thời gian chờ phản hồi đầu tiên vượt quá 30 giây ({streamWaitingSeconds}s)</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        Tiến trình CLI đang mất nhiều thời gian hơn dự kiến để sinh token đầu tiên. Điều này thường do CLI đang phân tích một repository lớn hoặc Runner đang tải thêm công cụ.
                      </p>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        • Nếu Runner bị treo, bạn có thể kiểm tra terminal trên máy host hoặc nhấn <strong>Hủy Tác Vụ</strong>.<br />
                        • Bạn cũng có thể bật <strong>Thông tin kỹ thuật</strong> bên phải để xem log tiến trình.
                      </div>
                    </div>
                  )}
                </div>
              ) : task.failure_code === 'EMPTY_RUNTIME_OUTPUT' ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#f87171' }}>
                  <Icon name="alert" size={24} style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Tác vụ kết thúc không có phản hồi văn bản</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Runtime Antigravity CLI đã thoát nhưng không trả về bất kỳ text stream nào.
                  </div>
                </div>
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  Chưa có dữ liệu stream nào được ghi nhận.
                </div>
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
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '700px'
            }}
          >
            {/* Timeline Filter and Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setEventFilter('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: eventFilter === 'ALL' ? '#2563eb' : '#334155',
                    color: eventFilter === 'ALL' ? '#fff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Tất cả ({events.length})
                </button>
                <button
                  onClick={() => setEventFilter('TOOLS')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: eventFilter === 'TOOLS' ? '#2563eb' : '#334155',
                    color: eventFilter === 'TOOLS' ? '#fff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Công cụ ({toolEventsCount})
                </button>
                <button
                  onClick={() => setEventFilter('LIFECYCLE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: eventFilter === 'LIFECYCLE' ? '#2563eb' : '#334155',
                    color: eventFilter === 'LIFECYCLE' ? '#fff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Trạng thái ({lifecycleEventsCount})
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showTechDetails}
                  onChange={(e) => setShowTechDetails(e.target.checked)}
                />
                <span>Thông tin kỹ thuật</span>
              </label>
            </div>

            {/* Events list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
                  Chưa có sự kiện nào trong bộ lọc này.
                </div>
              ) : (
                filteredEvents.map((ev, idx) => {
                  const meta = getHumanEventMeta(ev);
                  const isExpanded = ev.event_id ? expandedEvents.has(ev.event_id) : false;

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.06)',
                              color: meta.badgeColor,
                              border: `1px solid ${meta.badgeColor}40`
                            }}
                          >
                            {meta.badge}
                          </span>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {meta.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                          {ev.sequence_number && <span>#{ev.sequence_number}</span>}
                          {ev.created_at && (
                            <span>{new Date(ev.created_at).toLocaleTimeString('vi-VN')}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.4, margin: '4px 0' }}>
                        {meta.detail}
                      </div>

                      {/* Expandable Technical Details Button */}
                      {ev.payload && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            onClick={() => {
                              if (!ev.event_id) return;
                              const next = new Set(expandedEvents);
                              if (next.has(ev.event_id)) next.delete(ev.event_id);
                              else next.add(ev.event_id);
                              setExpandedEvents(next);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#60a5fa',
                              fontSize: '11px',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={12} />
                            <span>{isExpanded ? 'Ẩn chi tiết kỹ thuật' : 'Xem payload kỹ thuật'}</span>
                          </button>

                          {isExpanded && (
                            <pre
                              style={{
                                margin: '6px 0 0',
                                padding: '8px',
                                background: '#020617',
                                border: '1px solid #1e293b',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#94a3b8',
                                overflowX: 'auto',
                                maxHeight: '160px',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
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

      {/* ========================================================================= */}
      {/* TAB 2: UNIFIED DIFF VIEWER (Section D) */}
      {/* ========================================================================= */}
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

          {/* Diff Content vs Empty Mode Explanation */}
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
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(15,23,42,0.4)',
                borderRadius: '8px',
                border: '1px dashed #334155'
              }}
            >
              <Icon name={modeInfo.isReadOnly ? 'doc' : 'git'} size={32} style={{ color: '#64748b', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                {modeInfo.isReadOnly ? 'Chế độ Read-Only Plan' : 'Không có thay đổi mã nguồn'}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '540px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                {modeInfo.emptyDiffMessage}
              </p>
              {modeInfo.isReadOnly && (
                <button
                  onClick={() => setActiveTab('artifacts')}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Mở Báo Cáo Kế Hoạch trong tab Artifacts &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VERIFICATION PIPELINE (Section D) */}
      {/* ========================================================================= */}
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
                  Verification Pipeline (Quality & Policy Gates)
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
            {!task.verifications || task.verifications.length === 0 ? (
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

          {/* Selected step details inspector */}
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

      {/* ========================================================================= */}
      {/* TAB 4: ARTIFACTS (Section D) */}
      {/* ========================================================================= */}
      {activeTab === 'artifacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                Deliverables & Artifacts ({artifactsList.length})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Các báo cáo, kế hoạch phân tích và tệp đầu ra được lưu trữ chính thức từ các lượt chạy của tác vụ.
              </p>
            </div>

            <button
              onClick={fetchArtifacts}
              disabled={artifactsLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Icon name="refresh" size={13} />
              <span>{artifactsLoading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>

          {artifactsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {artifactsList.map((art) => (
                <div
                  key={art.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(59,130,246,0.15)',
                        color: '#60a5fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon name="doc" size={18} />
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{art.display_name || art.file_path}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#94a3b8'
                          }}
                        >
                          {art.artifact_type}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span>Kích cỡ: {formatBytes(art.byte_size)}</span>
                        <span>Ngày tạo: {formatDateTime(art.created_at)}</span>
                        {art.checksum_sha256 && (
                          <span style={{ fontFamily: 'monospace' }}>SHA: {art.checksum_sha256.slice(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleOpenArtifactPreview(art)}
                      style={{
                        padding: '6px 14px',
                        background: '#334155',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="terminal" size={13} />
                      <span>Xem trực tiếp</span>
                    </button>

                    <button
                      onClick={() => handleDownloadArtifact(art)}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="external" size={13} />
                      <span>Tải xuống</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(15,23,42,0.4)',
                borderRadius: '8px',
                border: '1px dashed #334155',
                color: '#64748b'
              }}
            >
              <Icon name="doc" size={32} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Chưa có artifact nào cho task này
              </div>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Khi Agent tạo báo cáo kế hoạch hoặc review, các tệp phân tích sẽ tự động xuất hiện tại đây.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ARTIFACT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewArtifact && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="doc" size={18} style={{ color: '#3b82f6' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                    {previewArtifact.display_name || previewArtifact.file_path}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {previewArtifact.artifact_type} • {formatBytes(previewArtifact.byte_size)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {previewArtifact.content && (
                  <button
                    onClick={() => handleCopyText(previewArtifact.content!, 'nội dung artifact')}
                    style={{
                      padding: '6px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Icon name="copy" size={12} />
                    <span>Copy</span>
                  </button>
                )}

                <button
                  onClick={() => handleDownloadArtifact(previewArtifact)}
                  style={{
                    padding: '6px 12px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Tải xuống
                </button>

                <button
                  onClick={() => setPreviewArtifact(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px 8px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {previewArtifact.content ? (
                <SafeMarkdown content={previewArtifact.content} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Nội dung tệp nhị phân hoặc không thể hiển thị trực tiếp. Vui lòng tải xuống tệp để xem.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL MODAL */}
      {/* ========================================================================= */}
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
              Hệ thống sẽ gửi tín hiệu hủy (SIGTERM / process tree kill) tới Agent Runner để dọn dẹp tiến trình Antigravity CLI.
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
                  fontWeight: 600,
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

      {/* ========================================================================= */}
      {/* REQUEST CHANGES MODAL */}
      {/* ========================================================================= */}
      {showRequestChangesModal && (
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
              Cung cấp phản hồi chi tiết cho Agent. Phản hồi này sẽ được chuyển tiếp tới lượt chạy tiếp theo (follow-up attempt) để Agent tiếp tục chỉnh sửa trên worktree.
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
                  fontWeight: 600,
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

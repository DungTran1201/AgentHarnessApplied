'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';

interface Workspace {
  id: string;
  name: string;
  local_path: string;
  runner_id?: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
}

interface TaskAttempt {
  id: string;
  attempt_number: number;
  status: string;
  mode: string;
  duration_seconds?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost_estimate?: number;
  git_branch?: string;
}

interface DevTask {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  prompt: string;
  status: string;
  current_attempt_id?: string;
  current_attempt?: TaskAttempt;
  created_at: string;
  updated_at: string;
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formWorkspaceId, setFormWorkspaceId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formMode, setFormMode] = useState<'plan' | 'accept-edits'>('plan');
  const [formAutoDispatch, setFormAutoDispatch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      let url = '/api/v1/orchestrator/tasks?limit=50';
      if (filterWorkspace) url += `&workspace_id=${encodeURIComponent(filterWorkspace)}`;
      if (filterStatus) url += `&status=${encodeURIComponent(filterStatus)}`;

      const res = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // keep previous state on network glitch
    }
  }, [filterWorkspace, filterStatus]);

  const fetchMetadata = async () => {
    try {
      const [wsRes, prjRes] = await Promise.all([
        fetch('/api/v1/orchestrator/workspaces', { headers: getAuthHeaders(), credentials: 'include' }),
        fetch('/api/v1/projects', { headers: getAuthHeaders(), credentials: 'include' })
      ]);

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const wsList: Workspace[] = wsData.items || wsData.workspaces || (Array.isArray(wsData) ? wsData : []);
        setWorkspaces(wsList);
        if (wsList.length > 0 && !formWorkspaceId) {
          setFormWorkspaceId(wsList[0].id);
        }
      }

      if (prjRes.ok) {
        const prjData = await prjRes.json();
        const prjList: Project[] = Array.isArray(prjData)
          ? prjData
          : (prjData.items || prjData.projects || []);
        setProjects(prjList);
        if (prjList.length > 0) {
          setFormProjectId((prev) => (prev && prjList.some((p) => p.id === prev) ? prev : prjList[0].id));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 4000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrompt.trim() || !formWorkspaceId) {
      setFormError('Vui lòng điền đầy đủ Tiêu đề, Workspace và Nội dung công việc.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const selectedProj = formProjectId || (projects.length > 0 ? projects[0].id : undefined);

      const res = await fetch('/api/v1/orchestrator/tasks', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify({
          project_id: selectedProj,
          workspace_id: formWorkspaceId,
          title: formTitle.trim(),
          prompt: formPrompt.trim(),
          runtime: 'antigravity',
          mode: formMode,
          auto_dispatch: formAutoDispatch
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể tạo task.');
      }

      const created = await res.json();
      setShowCreateModal(false);
      setFormTitle('');
      setFormPrompt('');
      await fetchTasks();
      // Redirect to newly created task
      window.location.href = `/tasks/${created.id}`;
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối tới máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (taskId: string, mode: string = 'plan') => {
    try {
      const res = await fetch(`/api/v1/orchestrator/tasks/${taskId}/dispatch?mode=${mode}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch {
      // ignore
    }
  };

  const handleCancel = async (taskId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy thực thi tác vụ này?')) return;
    try {
      await fetch(`/api/v1/orchestrator/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason: 'Người dùng nhấn nút hủy trên giao diện.' })
      });
      await fetchTasks();
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', color: '#60a5fa' }}>
              <Icon name="terminal" size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Development Tasks</h1>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                Điều phối các tác vụ lập trình tự động với Antigravity CLI trên Workspaces cục bộ.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            fetchMetadata();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#2563eb')}
        >
          <Icon name="plus" size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filterWorkspace}
          onChange={(e) => setFilterWorkspace(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            fontSize: '13px'
          }}
        >
          <option value="">Tất cả Workspaces</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name} ({ws.local_path})</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            fontSize: '13px'
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Draft</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="AWAITING_APPROVAL">Awaiting Approval</option>
          <option value="REVIEW_REQUIRED">Review Required</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Tasks Table / Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Đang tải danh sách tác vụ...</div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px dashed #334155'
          }}
        >
          <Icon name="terminal" size={36} style={{ color: '#64748b', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 6px' }}>Chưa có tác vụ nào</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
            Khởi tạo tác vụ đầu tiên để giao việc cho Antigravity CLI thực thi trên Workspace của bạn.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Create First Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => {
            const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.DRAFT;
            const ws = workspaces.find((w) => w.id === task.workspace_id);
            const att = task.current_attempt;

            return (
              <div
                key={task.id}
                style={{
                  background: '#1e293b',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: st.bg,
                        color: st.text,
                        border: `1px solid ${st.border}`
                      }}
                    >
                      {st.label}
                    </span>

                    {att?.mode && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {att.mode === 'plan' ? 'Read-Only Plan' : 'Accept-Edits'}
                      </span>
                    )}

                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(task.created_at).toLocaleString()}
                    </span>
                  </div>

                  <Link
                    href={`/tasks/${task.id}`}
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#f8fafc',
                      textDecoration: 'none'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#60a5fa')}
                    onMouseOut={(e) => (e.currentTarget.style.color = '#f8fafc')}
                  >
                    {task.title}
                  </Link>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    {ws && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="workspace" size={14} />
                        <span>{ws.name}</span>
                      </span>
                    )}

                    {att?.git_branch && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="git" size={14} />
                        <span>{att.git_branch}</span>
                      </span>
                    )}

                    {att?.duration_seconds && (
                      <span>Thời gian: {att.duration_seconds}s</span>
                    )}

                    {att?.tokens_in !== undefined && att?.tokens_in !== null && (
                      <span>Tokens: {(att.tokens_in || 0) + (att.tokens_out || 0)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task.status === 'DRAFT' && (
                    <button
                      onClick={() => handleDispatch(task.id, 'plan')}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Dispatch
                    </button>
                  )}

                  {['RUNNING', 'PLANNING', 'QUEUED', 'AWAITING_APPROVAL'].includes(task.status) && (
                    <button
                      onClick={() => handleCancel(task.id)}
                      style={{
                        padding: '6px 14px',
                        background: 'rgba(239,68,68,0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Hủy
                    </button>
                  )}

                  {['FAILED', 'CANCELLED'].includes(task.status) && (
                    <button
                      onClick={() => handleDispatch(task.id, 'plan')}
                      style={{
                        padding: '6px 12px',
                        background: '#334155',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Retry
                    </button>
                  )}

                  <Link
                    href={`/tasks/${task.id}`}
                    style={{
                      padding: '6px 14px',
                      background: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    Chi tiết &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tạo Task Mới */}
      {showCreateModal && (
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
              width: '100%',
              maxWidth: '650px',
              padding: '28px',
              color: '#f8fafc',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="terminal" size={20} style={{ color: '#60a5fa' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Create Development Task</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px'
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTask}>
              {/* Project & Workspace Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Project <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  >
                    {projects.length === 0 ? (
                      <option value="">-- Chưa có Project nào --</option>
                    ) : (
                      projects.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.status ? `(${p.status})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {projects.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
                      ⚠️ Chưa có Project. Bạn có thể vào mục{' '}
                      <Link href="/projects" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                        Projects
                      </Link>{' '}
                      để quản lý.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Workspace <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={formWorkspaceId}
                    onChange={(e) => setFormWorkspaceId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.local_path}) {!w.runner_id ? '— ⚠️ Chưa có Runner' : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selectedWs = workspaces.find((w) => w.id === formWorkspaceId);
                    if (selectedWs && !selectedWs.runner_id) {
                      return (
                        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
                          ⚠️ Workspace này chưa được gán Runner. Bạn hãy gán Runner trong trang Workspaces trước khi dispatch task.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Tiêu đề Task <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cập nhật thời hạn hết hạn JWT token trong auth.py"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Mode Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Chế độ thực thi (Execution Mode)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    onClick={() => setFormMode('plan')}
                    style={{
                      padding: '12px',
                      border: `1px solid ${formMode === 'plan' ? '#3b82f6' : '#334155'}`,
                      background: formMode === 'plan' ? 'rgba(59,130,246,0.1)' : '#1e293b',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: formMode === 'plan' ? '#60a5fa' : '#f8fafc' }}>
                      Plan Only (An toàn - Đọc)
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Agent chỉ đọc code và lập kế hoạch chi tiết; cần bạn phê duyệt trước khi sửa file.
                    </div>
                  </div>

                  <div
                    onClick={() => setFormMode('accept-edits')}
                    style={{
                      padding: '12px',
                      border: `1px solid ${formMode === 'accept-edits' ? '#3b82f6' : '#334155'}`,
                      background: formMode === 'accept-edits' ? 'rgba(59,130,246,0.1)' : '#1e293b',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: formMode === 'accept-edits' ? '#60a5fa' : '#f8fafc' }}>
                      Accept-Edits (Tự động sửa)
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Agent tự động thực hiện thay đổi và xuất file patch/diff để bạn kiểm tra cuối cùng.
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Nội dung yêu cầu lập trình (Prompt) <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder="Mô tả cụ thể file cần đọc, sự thay đổi cần thực hiện, kiểm tra cần chạy..."
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Auto Dispatch Toggle */}
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="auto_dispatch"
                  checked={formAutoDispatch}
                  onChange={(e) => setFormAutoDispatch(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="auto_dispatch" style={{ fontSize: '13px', color: '#94a3b8', cursor: 'pointer' }}>
                  Tự động đưa vào hàng đợi thực thi ngay sau khi tạo (Dispatch immediately)
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    background: isSubmitting ? '#475569' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    fontSize: '13px'
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

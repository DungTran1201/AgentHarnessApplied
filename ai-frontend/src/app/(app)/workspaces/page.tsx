'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/Icon';

interface Runner {
  id: string;
  name: string;
  machine_name: string;
  platform: string;
  architecture: string;
  status: 'ONLINE' | 'OFFLINE' | 'REVOKED';
  capabilities: Record<string, any>;
  system_info: Record<string, any>;
  last_heartbeat_at?: string;
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  local_path: string;
  git_remote_url?: string;
  default_branch: string;
  status: 'READY' | 'PENDING_VALIDATION' | 'NON_GIT_READY' | 'UNAVAILABLE' | 'DISABLED';
  is_git_repo: number | boolean;
  last_commit_hash?: string;
  runner_id?: string;
  runner_name?: string;
  runner_status?: string;
  last_validated_at?: string;
  created_at: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);

  // New Workspace Form
  const [wsName, setWsName] = useState('');
  const [wsLocalPath, setWsLocalPath] = useState('');
  const [wsRunnerId, setWsRunnerId] = useState('');
  const [wsGitRemote, setWsGitRemote] = useState('');
  const [wsBranch, setWsBranch] = useState('main');
  const [creatingWs, setCreatingWs] = useState(false);

  // Pairing State
  const [pairingData, setPairingData] = useState<{ token: string; command: string; expiresAt: string } | null>(null);
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState(900);
  const [pairingComplete, setPairingComplete] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Action states
  const [validatingWsId, setValidatingWsId] = useState<string | null>(null);
  const [copiedPathWsId, setCopiedPathWsId] = useState<string | null>(null);
  const [openingIdeWsId, setOpeningIdeWsId] = useState<string | null>(null);

  // ── Fetch Data ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [resWs, resRunners] = await Promise.all([
        fetch('/api/v1/orchestrator/workspaces'),
        fetch('/api/v1/orchestrator/runners'),
      ]);

      if (resWs.ok) {
        const dataWs = await resWs.json();
        setWorkspaces(dataWs.items || []);
      }
      if (resRunners.ok) {
        const dataRunners = await resRunners.json();
        setRunners(dataRunners.items || []);
      }
    } catch (err: any) {
      setErrorBanner('Không thể tải dữ liệu Orchestrator: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-select first online runner (excluding REVOKED) when runners are loaded
  useEffect(() => {
    const validRunners = runners.filter((r) => r.status !== 'REVOKED');
    if (validRunners.length > 0 && !wsRunnerId) {
      const onlineRunner = validRunners.find((r) => r.status === 'ONLINE') || validRunners[0];
      if (onlineRunner) {
        setWsRunnerId(onlineRunner.id);
      }
    }
  }, [runners, wsRunnerId]);

  // ── Pairing Token Generator ──────────────────────────────────────────
  const handleOpenPairModal = async () => {
    setShowPairModal(true);
    setPairingComplete(false);
    setPairingData(null);
    setPairingSecondsLeft(900);

    try {
      const res = await fetch('/api/v1/orchestrator/runners/pairing-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Dev Workstation' }),
      });
      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        const cmd = `python -m runner pair --server ${origin} --token ${data.pairing_token}`;
        setPairingData({
          token: data.pairing_token,
          command: cmd,
          expiresAt: data.expires_at,
        });
      } else {
        setErrorBanner('Không thể sinh Pairing Token.');
      }
    } catch {
      setErrorBanner('Lỗi kết nối khi sinh Pairing Token.');
    }
  };

  // Pairing TTL countdown & auto-detect runner completion
  useEffect(() => {
    if (!showPairModal || !pairingData || pairingComplete) return;

    const timer = setInterval(() => {
      setPairingSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll runners list every 3s to detect if paired
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/orchestrator/runners');
        if (res.ok) {
          const d = await res.json();
          const items: Runner[] = d.items || [];
          setRunners(items);
          // If we see any newly online runner
          const hasOnline = items.some((r) => r.status === 'ONLINE');
          if (hasOnline) {
            setPairingComplete(true);
            setSuccessBanner('Ghép nối Runner thành công!');
          }
        }
      } catch {}
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollTimer);
    };
  }, [showPairModal, pairingData, pairingComplete]);

  // ── Create Workspace ─────────────────────────────────────────────────
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !wsLocalPath.trim()) return;

    setCreatingWs(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/v1/orchestrator/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wsName.trim(),
          local_path: wsLocalPath.trim(),
          runner_id: wsRunnerId || null,
          git_remote_url: wsGitRemote.trim() || null,
          default_branch: wsBranch.trim() || 'main',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Tạo workspace thất bại.');
      }

      setSuccessBanner('Tạo Workspace thành công. Đang chờ Runner xác thực đường dẫn...');
      setShowNewWsModal(false);
      setWsName('');
      setWsLocalPath('');
      setWsGitRemote('');
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setCreatingWs(false);
    }
  };

  // ── Assign Runner to Workspace ──────────────────────────────────────
  const handleAssignRunner = async (wsId: string, runnerId: string) => {
    if (!runnerId) return;
    try {
      setErrorBanner(null);
      const res = await fetch(`/api/v1/orchestrator/workspaces/${wsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_id: runnerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Gán runner thất bại.');
      }
      setSuccessBanner('Đã gán Runner cho Workspace và kích hoạt kiểm tra!');
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  // ── Trigger Re-validation ───────────────────────────────────────────
  const handleValidateWorkspace = async (wsId: string) => {
    setValidatingWsId(wsId);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/v1/orchestrator/workspaces/${wsId}/validate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể yêu cầu kiểm tra.');
      }
      setSuccessBanner('Đã gửi yêu cầu kiểm tra tới Runner.');
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setValidatingWsId(null);
    }
  };

  // ── Open in IDE & Copy Path ─────────────────────────────────────────
  const handleCopyPath = (wsId: string, path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPathWsId(wsId);
    setTimeout(() => setCopiedPathWsId(null), 2000);
  };

  const handleOpenInIDE = async (wsId: string) => {
    setOpeningIdeWsId(wsId);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/v1/orchestrator/workspaces/${wsId}/open-ide`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể mở thư mục trên máy trạm.');
      }
      const data = await res.json();
      setSuccessBanner(data.message || 'Đã kích hoạt mở thư mục dự án trên IDE / File Explorer.');
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setOpeningIdeWsId(null);
    }
  };

  // ── Toggle Disable / Delete ─────────────────────────────────────────
  const handleToggleDisable = async (wsId: string) => {
    try {
      await fetch(`/api/v1/orchestrator/workspaces/${wsId}/disable`, { method: 'POST' });
      await loadData();
    } catch (err: any) {
      setErrorBanner('Lỗi khi cập nhật trạng thái workspace.');
    }
  };

  const handleDeleteWorkspace = async (wsId: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Workspace "${name}"? Thao tác này không xóa file trên máy của bạn.`)) return;
    try {
      const res = await fetch(`/api/v1/orchestrator/workspaces/${wsId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessBanner('Đã xóa Workspace.');
        await loadData();
      } else {
        const err = await res.json();
        setErrorBanner(err.detail || 'Xóa workspace thất bại.');
      }
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  const handleDeleteRunner = async (runnerId: string, runnerName: string) => {
    if (!confirm(`Xóa hoàn toàn Runner "${runnerName}"? Thao tác này sẽ gỡ bỏ runner khỏi hệ thống.`)) return;
    try {
      const res = await fetch(`/api/v1/orchestrator/runners/${runnerId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessBanner(`Đã xóa vĩnh viễn Runner "${runnerName}".`);
        await loadData();
      } else {
        const err = await res.json();
        setErrorBanner(err.detail || 'Xóa runner thất bại.');
      }
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  const handlePurgeRevokedRunners = async () => {
    try {
      const res = await fetch('/api/v1/orchestrator/runners/purge-revoked', { method: 'POST' });
      if (res.ok) {
        setSuccessBanner('Đã dọn dẹp sạch các Runner đã thu hồi.');
        await loadData();
      }
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  // Format countdown
  const countdownFormatted = useMemo(() => {
    const mins = Math.floor(pairingSecondsLeft / 60);
    const secs = pairingSecondsLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [pairingSecondsLeft]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* ── Banners ── */}
      {errorBanner && (
        <div style={{ background: '#ef444420', border: '1px solid #ef444450', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fca5a5' }}>
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {successBanner && (
        <div style={{ background: '#10b98120', border: '1px solid #10b98150', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6ee7b7' }}>
          <span>{successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Development Workspaces
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý repository mã nguồn và liên kết với các Agent Runner trên máy phát triển
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleOpenPairModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="cpu" size={14} />
            Pair New Runner
          </button>
          <button
            onClick={() => setShowNewWsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--accent-primary, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={14} />
            New Workspace
          </button>
        </div>
      </div>

      {/* ── Runner Fleet Overview Card ── */}
      <div
        style={{
          background: 'var(--bg-surface, #121520)',
          border: '1px solid var(--border-subtle, #1e2433)',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Active Agent Runners ({runners.length})</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>— Outbound connection daemons</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Online: {runners.filter((r) => r.status === 'ONLINE').length} | Offline: {runners.filter((r) => r.status === 'OFFLINE').length}
            </span>
            {runners.some((r) => r.status === 'REVOKED') && (
              <button
                onClick={handlePurgeRevokedRunners}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Dọn dẹp đã thu hồi ({runners.filter((r) => r.status === 'REVOKED').length})
              </button>
            )}
          </div>
        </div>

        {runners.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Chưa có Agent Runner nào được ghép nối. Bấm <b>"Pair New Runner"</b> để kết nối máy của bạn.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {runners.map((r) => {
              const isOnline = r.status === 'ONLINE';
              const isRevoked = r.status === 'REVOKED';
              const dotColor = isOnline ? '#10b981' : isRevoked ? '#ef4444' : '#f59e0b';
              const hasAgy = r.capabilities?.antigravity?.available;
              const hasGit = r.capabilities?.git?.available;

              return (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${dotColor}20`,
                          color: dotColor,
                          fontWeight: 500,
                        }}
                      >
                        {r.status}
                      </span>
                      <button
                        onClick={() => handleDeleteRunner(r.id, r.name)}
                        title={isRevoked ? "Xóa vĩnh viễn khỏi danh sách" : "Xóa quyền Runner này"}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isRevoked ? '#ef4444' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Host: {r.machine_name} ({r.platform})</span>
                    <span>Arch: {r.architecture}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: hasAgy ? '#6366f120' : '#33415530',
                        color: hasAgy ? '#a5b4fc' : '#64748b',
                      }}
                    >
                      Antigravity CLI {hasAgy ? '✓' : '✗'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: hasGit ? '#10b98120' : '#33415530',
                        color: hasGit ? '#6ee7b7' : '#64748b',
                      }}
                    >
                      Git {hasGit ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Workspace List ── */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
        Workspaces ({workspaces.length})
      </h2>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách workspace...</div>
      ) : workspaces.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
          }}
        >
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <Icon name="workspace" size={36} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>Chưa có Workspace nào</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Tạo một Development Workspace để liên kết repository mã nguồn trên máy của bạn với AI-Chan Orchestrator.
          </p>
          <button
            onClick={() => setShowNewWsModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--accent-primary, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Create Your First Workspace
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {workspaces.map((ws) => {
            const isReady = ws.status === 'READY';
            const isPending = ws.status === 'PENDING_VALIDATION';
            const isUnavailable = ws.status === 'UNAVAILABLE';
            const isDisabled = ws.status === 'DISABLED';
            const isNonGit = ws.status === 'NON_GIT_READY';

            const badgeBg = isReady ? '#10b98120' : isPending ? '#f59e0b20' : isNonGit ? '#06b6d420' : isDisabled ? '#64748b20' : '#ef444420';
            const badgeColor = isReady ? '#10b981' : isPending ? '#f59e0b' : isNonGit ? '#06b6d4' : isDisabled ? '#94a3b8' : '#ef4444';

            return (
              <div
                key={ws.id}
                style={{
                  background: 'var(--bg-surface, #121520)',
                  border: '1px solid var(--border-subtle, #1e2433)',
                  borderRadius: '10px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name={ws.is_git_repo ? 'git' : 'workspace'} size={18} style={{ color: 'var(--accent-primary, #6366f1)' }} />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{ws.name}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: badgeBg,
                      color: badgeColor,
                      fontWeight: 600,
                    }}
                  >
                    {ws.status}
                  </span>
                </div>

                {/* Local Path & Explorer / IDE Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--bg-primary, #0a0b10)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#94a3b8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={ws.local_path}
                  >
                    {ws.local_path}
                  </div>
                  <button
                    onClick={() => handleCopyPath(ws.id, ws.local_path)}
                    title="Copy local absolute path"
                    style={{
                      background: 'var(--bg-primary, #0a0b10)',
                      border: '1px solid var(--border-subtle, #1e2433)',
                      color: copiedPathWsId === ws.id ? '#10b981' : 'var(--text-muted)',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon name={copiedPathWsId === ws.id ? 'check' : 'copy'} size={12} />
                    <span>{copiedPathWsId === ws.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleOpenInIDE(ws.id)}
                    disabled={openingIdeWsId === ws.id}
                    title="Open workspace folder in Antigravity IDE / File Explorer"
                    style={{
                      background: 'var(--bg-primary, #0a0b10)',
                      border: '1px solid var(--border-subtle, #1e2433)',
                      color: 'var(--accent-primary, #6366f1)',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      cursor: openingIdeWsId === ws.id ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon name="external" size={12} />
                    <span>{openingIdeWsId === ws.id ? 'Opening...' : 'Open IDE'}</span>
                  </button>
                </div>

                {/* Runner & Git Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>Runner:</span>
                      {runners.length > 0 ? (
                        <select
                          value={ws.runner_id || ''}
                          onChange={(e) => handleAssignRunner(ws.id, e.target.value)}
                          title="Chọn hoặc thay đổi Agent Runner liên kết"
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: ws.runner_id ? 'var(--bg-primary, #0a0b10)' : 'rgba(245,158,11,0.2)',
                            border: `1px solid ${ws.runner_id ? 'var(--border-subtle, #1e2433)' : 'rgba(245,158,11,0.6)'}`,
                            color: ws.runner_id ? 'var(--text-primary, #f1f5f9)' : '#fbbf24',
                            fontSize: '11px',
                            cursor: 'pointer',
                            outline: 'none',
                            fontWeight: ws.runner_id ? 400 : 600,
                          }}
                        >
                          <option value="">-- ⚠️ Chưa gán Runner (Bấm để gán) --</option>
                          {runners.filter((r) => r.status !== 'REVOKED').map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.status})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 500 }}>Chưa có Runner online</span>
                      )}
                    </div>
                    <span>Branch: <b>{ws.default_branch || 'main'}</b></span>
                  </div>
                  {ws.last_commit_hash && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Last Commit:</span>
                      <span style={{ fontFamily: 'monospace' }}>{ws.last_commit_hash.slice(0, 7)}</span>
                    </div>
                  )}
                  {ws.git_remote_url && (
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Remote: {ws.git_remote_url}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle, #1e2433)',
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}
                >
                  <button
                    onClick={() => handleValidateWorkspace(ws.id)}
                    disabled={validatingWsId === ws.id || !ws.runner_id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      cursor: validatingWsId === ws.id || !ws.runner_id ? 'not-allowed' : 'pointer',
                      opacity: validatingWsId === ws.id || !ws.runner_id ? 0.5 : 1,
                    }}
                  >
                    <Icon name="refresh" size={12} />
                    {validatingWsId === ws.id ? 'Rechecking...' : 'Validate'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleDisable(ws.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '5px',
                        background: 'none',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {isDisabled ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '5px',
                        background: 'none',
                        border: '1px solid #ef444430',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      title="Delete Workspace"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: New Workspace Modal ── */}
      {showNewWsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface, #121520)',
              border: '1px solid var(--border-subtle, #1e2433)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Thêm Development Workspace</h3>
              <button onClick={() => setShowNewWsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>Tên Workspace *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ai-chan-core"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>Chọn Agent Runner *</label>
                <select
                  value={wsRunnerId}
                  onChange={(e) => setWsRunnerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Không gán trước --</option>
                  {runners.filter((r) => r.status !== 'REVOKED').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.machine_name} - {r.status})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Runner sẽ dùng quyền cục bộ để kiểm tra đường dẫn thư mục và Git branch.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>Đường dẫn cục bộ (trên máy Runner) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C:\Users\PC\Project\ai-chan"
                  value={wsLocalPath}
                  onChange={(e) => setWsLocalPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>Git Remote URL (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/DungTran1201/ai-chan.git"
                  value={wsGitRemote}
                  onChange={(e) => setWsGitRemote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewWsModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingWs}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary, #6366f1)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: creatingWs ? 'not-allowed' : 'pointer',
                    opacity: creatingWs ? 0.7 : 1,
                  }}
                >
                  {creatingWs ? 'Đang tạo...' : 'Tạo & Xác thực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Pair Runner Modal ── */}
      {showPairModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface, #121520)',
              border: '1px solid var(--border-subtle, #1e2433)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '560px',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="cpu" size={18} style={{ color: 'var(--accent-primary, #6366f1)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Pair New Agent Runner</h3>
              </div>
              <button onClick={() => setShowPairModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Chạy lệnh sau trên terminal của máy bạn (Windows PowerShell hoặc Terminal) để bắt tay ghép nối Runner:
            </p>

            {pairingComplete ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#10b98115', border: '1px solid #10b98140', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
                <h4 style={{ margin: '0 0 4px 0', color: '#10b981', fontSize: '16px' }}>Ghép nối Runner thành công!</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Runner đã được kích hoạt và xuất hiện trong danh sách Active Runners.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background: 'var(--bg-primary, #0a0b10)',
                    border: '1px solid var(--border-subtle, #1e2433)',
                    borderRadius: '8px',
                    padding: '14px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    lineHeight: 1.6,
                    wordBreak: 'break-all',
                    position: 'relative',
                    marginBottom: '12px',
                  }}
                >
                  {pairingData ? pairingData.command : 'Đang sinh pairing token...'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <button
                    onClick={() => {
                      if (pairingData) {
                        navigator.clipboard.writeText(pairingData.command);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '5px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name={copiedToken ? 'check' : 'copy'} size={13} />
                    {copiedToken ? 'Đã sao chép!' : 'Sao chép lệnh'}
                  </button>

                  <span style={{ fontSize: '12px', color: pairingSecondsLeft < 120 ? '#ef4444' : 'var(--text-muted)' }}>
                    Mã hết hạn sau: <b>{countdownFormatted}</b>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s infinite' }} />
                  Đang lắng nghe kết nối từ máy của bạn...
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setShowPairModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

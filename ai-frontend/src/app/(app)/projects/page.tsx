'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Project, ProjectQuotaInfo, ProjectStatus } from '@/types';
import { ProjectService } from '@/services/projectService';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quota, setQuota] = useState<ProjectQuotaInfo>({ active_count: 0, max_limit: 3, remaining_slots: 3 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ProjectService.getProjects(statusFilter === 'ALL' ? undefined : statusFilter);
      setProjects(res.items);
      setQuota(res.active_quota);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Tên project không được để trống');
      return;
    }
    try {
      setCreating(true);
      setCreateError('');
      const newProj = await ProjectService.createProject({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      setShowCreateModal(false);
      setCreateName('');
      setCreateDesc('');
      showToast('success', `Đã tạo project "${newProj.name}" thành công!`);
      // Điều hướng ngay tới Editor
      router.push(`/projects/${newProj.id}/editor`);
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi khi tạo project');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (proj: Project, targetStatus: ProjectStatus) => {
    try {
      if (targetStatus === 'ACTIVE') {
        await ProjectService.activateProject(proj.id);
        showToast('success', `Đã kích hoạt project "${proj.name}"!`);
      } else if (targetStatus === 'STOP') {
        await ProjectService.stopProject(proj.id);
        showToast('success', `Đã tạm dừng project "${proj.name}"!`);
      } else if (targetStatus === 'DEACTIVE') {
        await ProjectService.deactivateProject(proj.id);
        showToast('success', `Đã vô hiệu hóa project "${proj.name}"!`);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Thao tác trạng thái thất bại');
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await ProjectService.deleteProject(projectToDelete.id);
      showToast('success', `Đã xóa project "${projectToDelete.name}" thành công.`);
      setProjectToDelete(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Xóa project thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const percentUsed = Math.min(100, Math.round((quota.active_count / quota.max_limit) * 100));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: 'var(--accent-glow)'
            }}>
              ✨
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI-Chan
            </span>
          </Link>
          <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>/</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>Quản Lý Project</span>
        </div>

        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Trang Chủ
          </Link>
          <Link href="/chat" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Chat
          </Link>
          <Link href="/projects" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, borderBottom: '2px solid #a855f7', paddingBottom: '4px' }}>
            Projects
          </Link>
          <Link href="/prompts" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            System Prompts
          </Link>
          <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Cài Đặt
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Top Action & Quota Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
              Quản Lý Dự Án AI (Projects)
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
              Xây dựng, cấu hình các luồng AI node-based và chọn trợ lý hoạt động từ Trang Chủ.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'var(--accent-gradient)',
              color: '#fff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--accent-glow)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <span>+</span> Tạo Project Mới
          </button>
        </div>

        {/* Quota Progress Bar */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.75rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                Hạn Ngạch Project Đang Hoạt Động (Active Quota):
              </span>
              <span style={{
                background: quota.remaining_slots > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: quota.remaining_slots > 0 ? '#4ade80' : '#f87171',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700
              }}>
                {quota.active_count} / {quota.max_limit} Slots Đang Dùng
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Còn lại {quota.remaining_slots} slot trống
            </span>
          </div>

          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${percentUsed}%`,
              background: percentUsed >= 100 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'var(--accent-gradient)',
              transition: 'width 0.4s ease',
              borderRadius: '4px'
            }} />
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'ACTIVE', label: '🟢 Đang Hoạt Động' },
            { id: 'STOP', label: '🟡 Tạm Dừng' },
            { id: 'DEACTIVE', label: '⚪ Vô Hiệu Hóa' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: statusFilter === f.id ? 'var(--accent-color, #a855f7)' : 'var(--border-subtle)',
                background: statusFilter === f.id ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-card)',
                color: statusFilter === f.id ? '#fff' : 'var(--text-secondary)',
                fontWeight: statusFilter === f.id ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            Đang tải danh sách project...
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Chưa có Project nào {statusFilter !== 'ALL' ? 'ở trạng thái này' : ''}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              Hãy tạo project đầu tiên để bắt đầu thiết kế luồng xử lý AI trực quan trên Canvas kéo-thả!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'var(--accent-gradient)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Tạo Project Ngay
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem'
          }}>
            {projects.map((proj) => {
              const isActive = proj.status === 'ACTIVE';
              const isStop = proj.status === 'STOP';
              const isDeactive = proj.status === 'DEACTIVE';

              return (
                <div
                  key={proj.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? '0 0 20px rgba(34, 197, 94, 0.1)' : 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Status Badge & Validity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isActive ? 'rgba(34, 197, 94, 0.2)' : isStop ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: isActive ? '#4ade80' : isStop ? '#fbbf24' : '#94a3b8',
                        border: `1px solid ${isActive ? '#22c55e' : isStop ? '#f59e0b' : '#64748b'}`
                      }}>
                        {proj.status}
                      </span>

                      <span style={{
                        fontSize: '0.8rem',
                        color: proj.is_valid ? '#4ade80' : '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {proj.is_valid ? '✓ Graph Hợp Lệ' : '⚠ Chưa Hợp Lệ'}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem 0' }}>
                      {proj.name}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      lineHeight: '1.4',
                      margin: '0 0 1.25rem 0',
                      minHeight: '2.8rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {proj.description || 'Chưa có mô tả cho project này.'}
                    </p>

                    {/* Node Info Meta */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🧠 Model:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{proj.target_model_id || 'Chưa chọn'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>📥 Giới hạn từ:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Tối đa {proj.max_words_limit} từ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🧩 Số Node:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{proj.node_count} / 3 node</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <Link
                      href={`/projects/${proj.id}/editor`}
                      style={{
                        flex: 1,
                        background: 'var(--accent-gradient)',
                        color: '#fff',
                        textDecoration: 'none',
                        textAlign: 'center',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      Mở Editor ✎
                    </Link>

                    {isActive ? (
                      <button
                        onClick={() => handleToggleStatus(proj, 'STOP')}
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid #f59e0b',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Dừng
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(proj, 'ACTIVE')}
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          border: '1px solid #22c55e',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Bật
                      </button>
                    )}

                    <button
                      onClick={() => setProjectToDelete(proj)}
                      style={{
                        background: 'transparent',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                      title="Xóa project"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 1rem 0', fontWeight: 700 }}>
              Tạo Project Mới
            </h2>
            <form onSubmit={handleCreate}>
              {createError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {createError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tên Project <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trợ Lý Viết Mã Nguồn Python..."
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Mô Tả Mục Đích (Tùy chọn)
                </label>
                <textarea
                  placeholder="Mô tả ngắn gọn về vai trò và nhiệm vụ của project..."
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 22px',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: creating ? 0.7 : 1
                  }}
                >
                  {creating ? 'Đang tạo...' : 'Tạo & Mở Canvas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {projectToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            width: '100%',
            maxWidth: '440px'
          }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 0.75rem 0', fontWeight: 700 }}>
              Xác Nhận Xóa Project?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
              Bạn có chắc chắn muốn xóa project <strong style={{ color: '#fff' }}>"{projectToDelete.name}"</strong>? Nếu project đang active, 1 slot quota sẽ được hoàn trả ngay lập tức.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '8px 18px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {deleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Project, ProjectQuotaInfo, ProjectStatus } from '@/types';
import { ProjectService } from '@/services/projectService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import { formatErrorMessage } from '@/lib/errors';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quota, setQuota] = useState<ProjectQuotaInfo>({ active_count: 0, max_limit: 3, remaining_slots: 3 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ProjectService.getProjects(statusFilter === 'ALL' ? undefined : statusFilter);
      setProjects(res.items || []);
      if (res.active_quota) {
        setQuota(res.active_quota);
      }
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to load projects list'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Project name is required');
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
      showToast('success', `Project "${newProj.name}" created successfully`);
      router.push(`/projects/${newProj.id}/editor`);
    } catch (err: any) {
      setCreateError(formatErrorMessage(err, 'Failed to create project'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (proj: Project, targetStatus: ProjectStatus) => {
    try {
      if (targetStatus === 'ACTIVE') {
        await ProjectService.activateProject(proj.id);
        showToast('success', `Project "${proj.name}" activated`);
      } else if (targetStatus === 'STOP') {
        await ProjectService.stopProject(proj.id);
        showToast('success', `Project "${proj.name}" stopped`);
      } else if (targetStatus === 'DEACTIVE') {
        await ProjectService.deactivateProject(proj.id);
        showToast('success', `Project "${proj.name}" deactivated`);
      }
      loadData();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to update project status'));
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await ProjectService.deleteProject(projectToDelete.id);
      showToast('success', `Project "${projectToDelete.name}" deleted`);
      setProjectToDelete(null);
      loadData();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to delete project'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });

  const percentUsed = Math.min(100, Math.round((quota.active_count / quota.max_limit) * 100));

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        {/* Page Header */}
        <PageHeader
          title="Projects"
          description="Build, configure, and orchestrate visual AI agent pipelines."
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
          >
            <Icon name="plus" size={14} />
            <span>New Project</span>
          </button>
        </PageHeader>

        {/* Compact Quota Bar */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Active Quota:
            </span>
            <span
              className={`badge ${quota.remaining_slots > 0 ? 'badge-active' : 'badge-danger'}`}
            >
              {quota.active_count} / {quota.max_limit} active
            </span>
            <div
              style={{
                flex: 1,
                maxWidth: '180px',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${percentUsed}%`,
                  backgroundColor: percentUsed >= 100 ? 'var(--danger)' : 'var(--accent)',
                  transition: 'width 0.3s ease',
                  borderRadius: 'var(--radius-full)',
                }}
              />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {quota.remaining_slots} {quota.remaining_slots === 1 ? 'slot' : 'slots'} available
          </span>
        </div>

        {/* Controls Bar: Filters & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Status Filters */}
          <div className="segmented-control" role="tablist" aria-label="Filter projects by status">
            {[
              { id: 'ALL', label: 'All Projects' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'STOP', label: 'Stopped' },
              { id: 'DEACTIVE', label: 'Inactive' },
            ].map(f => (
              <button
                key={f.id}
                role="tab"
                aria-selected={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`segmented-item ${statusFilter === f.id ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <Icon name="search" size={14} />
            </span>
            <input
              type="search"
              className="input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8125rem' }}
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Projects Grid / List */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <Icon name="projects" size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {searchQuery ? 'No matching projects found' : 'No projects yet'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              {searchQuery
                ? `No projects match "${searchQuery}". Clear search or adjust status filter.`
                : 'Create your first project to start designing visual AI pipelines on the node canvas.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setCreateError('');
                  setShowCreateModal(true);
                }}
              >
                <Icon name="plus" size={14} />
                <span>New Project</span>
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredProjects.map(proj => {
              const isActive = proj.status === 'ACTIVE';
              const isStop = proj.status === 'STOP';

              return (
                <div
                  key={proj.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: isActive ? 'var(--accent-border)' : 'var(--border-subtle)',
                    padding: '1.25rem',
                  }}
                >
                  <div>
                    {/* Top row: Status Badge & Validity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span
                        className={`badge ${
                          isActive
                            ? 'badge-active'
                            : isStop
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}
                      >
                        {proj.status === 'ACTIVE'
                          ? 'Active'
                          : proj.status === 'STOP'
                          ? 'Stopped'
                          : 'Inactive'}
                      </span>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: proj.is_valid ? 'var(--success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 500,
                        }}
                      >
                        <Icon name={proj.is_valid ? 'check' : 'alert'} size={12} />
                        <span>{proj.is_valid ? 'Valid graph' : 'Incomplete'}</span>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 0.35rem 0',
                        wordBreak: 'break-word',
                      }}
                    >
                      {proj.name}
                    </h3>
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        margin: '0 0 1rem 0',
                        minHeight: '2.4rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {proj.description || 'No description provided.'}
                    </p>

                    {/* Meta summary */}
                    <div
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Target model:</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {proj.target_model_id || 'Not configured'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Word limit:</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {proj.max_words_limit ? `${proj.max_words_limit} words` : 'Default'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nodes:</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {proj.node_count} / 3 nodes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.875rem',
                    }}
                  >
                    <Link
                      href={`/projects/${proj.id}/editor`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <Icon name="edit" size={13} />
                      <span>Open Editor</span>
                    </Link>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(proj, 'STOP')}
                        className="btn btn-secondary btn-sm"
                        title="Stop project"
                        aria-label="Stop project"
                      >
                        <Icon name="pause" size={13} />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(proj, 'ACTIVE')}
                        className="btn btn-secondary btn-sm"
                        title="Activate project"
                        aria-label="Activate project"
                      >
                        <Icon name="play" size={13} />
                        <span>Activate</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setProjectToDelete(proj)}
                      className="btn-icon"
                      title="Delete project"
                      aria-label="Delete project"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !creating) setShowCreateModal(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Create Project
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {createError && (
                <div
                  style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid rgba(240, 113, 120, 0.4)',
                    color: 'var(--danger)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                    marginBottom: '1rem',
                  }}
                >
                  {createError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="projectNameInput"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                >
                  Project Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="projectNameInput"
                  type="text"
                  className="input"
                  placeholder="e.g. Code Review Assistant"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="projectDescInput"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                >
                  Description (optional)
                </label>
                <textarea
                  id="projectDescInput"
                  className="textarea"
                  placeholder="Briefly describe the purpose of this project..."
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create & Open Canvas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Project */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Delete Project"
        message={
          projectToDelete ? (
            <>
              Are you sure you want to delete <strong>&ldquo;{projectToDelete.name}&rdquo;</strong>? This action cannot be undone. If active, one quota slot will be returned immediately.
            </>
          ) : ''
        }
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}

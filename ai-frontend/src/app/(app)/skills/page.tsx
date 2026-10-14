'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SkillSummary } from '@/types';
import { SkillService } from '@/services/skillService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import { formatErrorMessage } from '@/lib/errors';

export default function SkillsListPage() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('updated_desc');

  // Modals & Feedback
  const [skillToDelete, setSkillToDelete] = useState<SkillSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await SkillService.getSkills(debouncedQuery, statusFilter, sourceFilter, sortOption);
      setSkills(res.items || []);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Failed to load agent skills'));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, statusFilter, sourceFilter, sortOption]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleClone = async (skill: SkillSummary) => {
    try {
      setCloningId(skill.id);
      const cloned = await SkillService.cloneSkill(skill.id);
      showToast('success', `Cloned skill: "${cloned.name}"`);
      loadSkills();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to clone skill'));
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return;
    try {
      setIsDeleting(true);
      await SkillService.deleteSkill(skillToDelete.id);
      showToast('success', `Deleted skill "${skillToDelete.name}"`);
      setSkillToDelete(null);
      loadSkills();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to delete skill'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select a .zip package file.');
      return;
    }
    try {
      setIsImporting(true);
      setImportError(null);
      const imported = await SkillService.importSkill(importFile);
      showToast('success', `Imported skill "${imported.name}" successfully`);
      setShowImportModal(false);
      setImportFile(null);
      loadSkills();
    } catch (err: any) {
      setImportError(formatErrorMessage(err, 'Failed to import skill package. Make sure it contains a valid SKILL.md.'));
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const validCount = skills.filter(s => s.status === 'VALID').length;
  const draftCount = skills.filter(s => s.status === 'DRAFT').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        {/* Page Header */}
        <PageHeader
          title="Agent Skills"
          description="Modular SKILL.md instruction packages extending agent capabilities and reusable tools."
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setImportError(null);
              setImportFile(null);
              setShowImportModal(true);
            }}
          >
            <Icon name="doc" size={14} />
            <span>Import Package (.zip)</span>
          </button>
          <Link href="/skills/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Icon name="plus" size={14} />
            <span>New Skill</span>
          </Link>
        </PageHeader>

        {/* Stats summary bar */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Skills:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {skills.length}
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Validated:</span>
              <span className="badge badge-active">{validCount} valid</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drafts:</span>
              <span className="badge badge-warning">{draftCount} draft</span>
            </div>
          </div>
        </div>

        {/* Controls: Filters, Search, Sort */}
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
          <div className="segmented-control" role="tablist" aria-label="Filter skills by status">
            {[
              { id: 'ALL', label: 'All Skills' },
              { id: 'VALID', label: 'Validated' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'INVALID', label: 'Invalid' },
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
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
                placeholder="Search skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort */}
            <select
              className="select"
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
            >
              <option value="updated_desc">Recently Updated</option>
              <option value="name_asc">Name (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '0.875rem 1rem',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(240, 113, 120, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
            }}
          >
            <div>{error}</div>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={loadSkills}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading skills...
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && skills.length === 0 && !debouncedQuery && statusFilter === 'ALL' && (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <Icon name="skills" size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No agent skills yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Skills expand agent capabilities using standardized instruction packages and reusable reference resources.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/skills/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <Icon name="plus" size={14} />
                <span>Create First Skill</span>
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowImportModal(true)}
              >
                Import Package (.zip)
              </button>
            </div>
          </div>
        )}

        {/* No Search Results */}
        {!loading && !error && skills.length === 0 && (debouncedQuery || statusFilter !== 'ALL') && (
          <div
            className="card"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <Icon name="search" size={28} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No matching skills found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              No skills match &ldquo;{debouncedQuery}&rdquo; under the current filter.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Skill Card Grid */}
        {!loading && !error && skills.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {skills.map(skill => {
              const isValid = skill.status === 'VALID';
              const isDraft = skill.status === 'DRAFT';

              return (
                <div
                  key={skill.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                  }}
                >
                  <div>
                    {/* Header: Name and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Link
                        href={`/skills/${skill.id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          fontFamily: 'var(--font-mono)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {skill.name}
                      </Link>

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span
                          className={`badge ${
                            isValid
                              ? 'badge-active'
                              : isDraft
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {isValid ? 'Valid' : isDraft ? 'Draft' : 'Invalid'}
                        </span>
                        {skill.source_type === 'IMPORTED' && (
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.625rem' }}
                          >
                            ZIP
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.4rem',
                      }}
                    >
                      {skill.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Footer */}
                  <div>
                    <div
                      style={{
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '0.625rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>{skill.file_count} {skill.file_count === 1 ? 'file' : 'files'}</span>
                      <span>Updated {formatDate(skill.updated_at)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <Link
                        href={`/skills/${skill.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, textDecoration: 'none' }}
                      >
                        <Icon name="edit" size={13} />
                        <span>Edit</span>
                      </Link>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleClone(skill)}
                        disabled={cloningId === skill.id}
                        title="Clone skill"
                      >
                        <Icon name="doc" size={13} />
                        <span>Clone</span>
                      </button>

                      <a
                        href={SkillService.getExportUrl(skill.id)}
                        download
                        className="btn btn-secondary btn-sm"
                        title="Export as .zip package"
                        style={{ textDecoration: 'none' }}
                      >
                        <Icon name="external" size={13} />
                      </a>

                      <button
                        type="button"
                        onClick={() => setSkillToDelete(skill)}
                        className="btn-icon"
                        title="Delete skill"
                        aria-label="Delete skill"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
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
            if (e.target === e.currentTarget && !isImporting) setShowImportModal(false);
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
                Import Skill Package
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowImportModal(false)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit}>
              {importError && (
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
                  {importError}
                </div>
              )}

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Select a zip package containing a standard <code style={{ fontFamily: 'var(--font-mono)' }}>SKILL.md</code> definition file and optional scripts or references.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="file"
                  accept=".zip"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="input"
                  style={{ padding: '0.45rem', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isImporting || !importFile}
                >
                  {isImporting ? 'Importing...' : 'Upload & Validate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(skillToDelete)}
        title="Delete Agent Skill"
        message={
          skillToDelete ? (
            <>
              Are you sure you want to permanently delete <strong>&ldquo;{skillToDelete.name}&rdquo;</strong>? All associated files in its package directory will be deleted.
            </>
          ) : ''
        }
        confirmLabel="Delete Skill"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSkillToDelete(null)}
      />
    </div>
  );
}

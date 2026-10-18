'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SystemPromptSummary } from '@/types';
import { SystemPromptService } from '@/services/systemPromptService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import TextFileImportModal from '@/components/common/TextFileImportModal';
import { formatErrorMessage } from '@/lib/errors';

export default function SystemPromptsListPage() {
  const [prompts, setPrompts] = useState<SystemPromptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortOption, setSortOption] = useState('updated_desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Modals & Feedback
  const [promptToDelete, setPromptToDelete] = useState<SystemPromptSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await SystemPromptService.getPrompts(debouncedQuery, sortOption);
      setPrompts(res.items || []);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Failed to load system prompts'));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sortOption]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleCopyContent = async (prompt: SystemPromptSummary) => {
    try {
      const detail = await SystemPromptService.getPrompt(prompt.id);
      await navigator.clipboard.writeText(detail.content);
      setCopiedId(prompt.id);
      showToast('success', `Copied content of "${prompt.name}" to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to copy prompt content'));
    }
  };

  const handleClone = async (prompt: SystemPromptSummary) => {
    try {
      setCloningId(prompt.id);
      const cloned = await SystemPromptService.clonePrompt(prompt.id);
      showToast('success', `Cloned prompt: "${cloned.name}"`);
      loadPrompts();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to clone system prompt'));
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!promptToDelete) return;
    try {
      setIsDeleting(true);
      await SystemPromptService.deletePrompt(promptToDelete.id);
      showToast('success', `Deleted "${promptToDelete.name}" permanently`);
      setPromptToDelete(null);
      loadPrompts();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to delete system prompt'));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sortOption]);

  const paginatedPrompts = prompts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        {/* Page Header */}
        <PageHeader
          title="System Prompts"
          description="Create, manage, and reuse system instructions across AI models and project workflows."
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowTextImportModal(true)}
          >
            <Icon name="upload" size={14} />
            <span>Import from file</span>
          </button>
          <Link href="/prompts/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Icon name="plus" size={14} />
            <span>New System Prompt</span>
          </Link>
        </PageHeader>

        {/* Toolbar: Search, Sort, Stats */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.875rem',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
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
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right controls: Sort, Refresh, Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="sortSelect" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Sort:
              </label>
              <select
                id="sortSelect"
                className="select"
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="length_desc">Longest Content</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadPrompts}
              title="Refresh prompt list"
              aria-label="Refresh prompt list"
            >
              <Icon name="refresh" size={13} />
              <span>Refresh</span>
            </button>

            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                paddingLeft: '6px',
                borderLeft: '1px solid var(--border-subtle)',
              }}
            >
              {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
            </span>
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
              onClick={loadPrompts}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading system prompts...
          </div>
        )}

        {/* Empty State */}
        {!loading && prompts.length === 0 && !debouncedQuery && (
          <div
            className="card"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <Icon name="prompts" size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No system prompts yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Create your first system prompt to customize AI personality and instructions. You can copy, reuse, or attach prompts to workflow projects.
            </p>
            <Link href="/prompts/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Icon name="plus" size={14} />
              <span>Create First Prompt</span>
            </Link>
          </div>
        )}

        {/* No Search Results */}
        {!loading && prompts.length === 0 && debouncedQuery && (
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
              No matching system prompts
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              No prompts match &ldquo;{debouncedQuery}&rdquo;. Try another keyword.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Prompts Cards Grid */}
        {!loading && prompts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {paginatedPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                }}
              >
                <div>
                  {/* Top row: Name & Length badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {prompt.name}
                    </h3>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {prompt.content_length.toLocaleString()} chars
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      color: prompt.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      fontStyle: prompt.description ? 'normal' : 'italic',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.4rem',
                    }}
                  >
                    {prompt.description || 'No description provided.'}
                  </p>
                </div>

                {/* Footer: timestamp + actions */}
                <div>
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.625rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Updated {formatDate(prompt.updated_at)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {/* Copy Content */}
                    <button
                      type="button"
                      onClick={() => handleCopyContent(prompt)}
                      className={`btn btn-sm ${copiedId === prompt.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      title="Copy full prompt instructions to clipboard"
                    >
                      <Icon name={copiedId === prompt.id ? 'check' : 'copy'} size={13} />
                      <span>{copiedId === prompt.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    {/* Clone */}
                    <button
                      type="button"
                      onClick={() => handleClone(prompt)}
                      disabled={cloningId === prompt.id}
                      className="btn btn-secondary btn-sm"
                      title="Duplicate this prompt"
                    >
                      <Icon name="doc" size={13} />
                      <span>Clone</span>
                    </button>

                    {/* Edit */}
                    <Link
                      href={`/prompts/${prompt.id}/edit`}
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none' }}
                      title="Edit prompt instructions"
                    >
                      <Icon name="edit" size={13} />
                      <span>Edit</span>
                    </Link>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setPromptToDelete(prompt)}
                      className="btn-icon"
                      title="Delete prompt"
                      aria-label="Delete prompt"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && prompts.length > pageSize && (
          <Pagination
            currentPage={page}
            totalItems={prompts.length}
            pageSize={pageSize}
            onPageChange={setPage}
            pageSizeOptions={[6, 12, 24]}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel="prompts"
          />
        )}
      </div>

      {/* Text File Import Modal */}
      <TextFileImportModal
        isOpen={showTextImportModal}
        target="prompts"
        existingNames={prompts.map(p => p.name)}
        onClose={() => setShowTextImportModal(false)}
        onSuccess={(imported) => {
          showToast('success', `Đã nhập thành công System Prompt "${imported.name}"`);
          loadPrompts();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(promptToDelete)}
        title="Delete System Prompt"
        message={
          promptToDelete ? (
            <>
              Are you sure you want to permanently delete <strong>&ldquo;{promptToDelete.name}&rdquo;</strong>? This action cannot be undone.
            </>
          ) : ''
        }
        confirmLabel="Delete Prompt"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPromptToDelete(null)}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SystemPromptService } from '@/services/systemPromptService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatErrorMessage } from '@/lib/errors';
import { LibraryAssetManager } from '@/components/ui/AttachmentUploader';
import { AttachmentItem } from '@/services/attachmentService';

export default function EditSystemPromptPage() {
  const router = useRouter();
  const params = useParams();
  const promptId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [initialData, setInitialData] = useState<{ name: string; description: string; content: string }>({
    name: '',
    description: '',
    content: '',
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form dirty check
  const isDirty =
    name !== initialData.name ||
    description !== initialData.description ||
    content !== initialData.content;

  useEffect(() => {
    if (!promptId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await SystemPromptService.getPrompt(promptId);
        const init = {
          name: data.name,
          description: data.description || '',
          content: data.content,
        };
        setInitialData(init);
        setName(init.name);
        setDescription(init.description);
        setContent(init.content);
        setAttachments(data.attachments || []);
      } catch (err: any) {
        setLoadError(formatErrorMessage(err, 'System prompt not found or access denied.'));
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [promptId]);

  const handleCancel = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push('/prompts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a name for the system prompt.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('System prompt name must not exceed 100 characters.');
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setErrorMsg('Please enter prompt instruction content.');
      return;
    }
    if (content.length > 10000) {
      setErrorMsg('System prompt content must not exceed 10,000 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await SystemPromptService.updatePrompt(promptId, {
        name: trimmedName,
        description: description.trim() || null,
        content: content,
      });

      router.push('/prompts');
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Failed to update system prompt. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container" style={{ maxWidth: '840px' }}>
        {/* Page Header */}
        <PageHeader
          title="Edit System Prompt"
          description="Update prompt name, description, or refine AI instructions and behavior constraints."
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
          >
            <Icon name="chevronLeft" size={13} />
            <span>Back to Prompts</span>
          </button>
        </PageHeader>

        {/* Loading State */}
        {loading && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading system prompt...
          </div>
        )}

        {/* Load Error State */}
        {!loading && loadError && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: 'var(--danger)' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <Icon name="alert" size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
              Could not load system prompt
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {loadError}
            </p>
            <Link href="/prompts" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Return to System Prompts
            </Link>
          </div>
        )}

        {/* Edit Form */}
        {!loading && !loadError && (
          <>
            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(240, 113, 120, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8125rem',
                }}
              >
                <Icon name="alert" size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem' }}>
              {/* Field: Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="prompt-name" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Prompt Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: name.length > 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {name.length} / 100
                  </span>
                </div>
                <input
                  id="prompt-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Senior Software Architect Assistant"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              {/* Field: Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="prompt-desc" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: description.length > 500 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {description.length} / 500
                  </span>
                </div>
                <textarea
                  id="prompt-desc"
                  rows={2}
                  className="textarea"
                  placeholder="Brief summary of when and how this prompt should be used..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Field: Content */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="prompt-content" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Prompt Content <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: content.length > 10000 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                    {content.length.toLocaleString()} / 10,000 characters
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  Supports Markdown formatting, code snippets, multi-line instructions, and role definitions.
                </p>
                <textarea
                  id="prompt-content"
                  rows={14}
                  className="textarea"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 1.6 }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  maxLength={10000}
                  required
                />
              </div>

              {/* Supporting Library Assets */}
              <div style={{ marginBottom: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <LibraryAssetManager
                  contextType="system_prompt"
                  contextId={promptId}
                  initialAttachments={attachments}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !name.trim() || !content.trim() || !isDirty}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Exit confirmation dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved changes in this prompt. If you leave this page, your changes will be lost."
        confirmLabel="Discard & Leave"
        cancelLabel="Continue Editing"
        isDestructive={true}
        onConfirm={() => router.push('/prompts')}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}

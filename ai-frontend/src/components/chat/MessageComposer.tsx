'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentModel, Project } from '@/types';
import {
  AttachmentButton,
  ComposerAttachmentChips,
  StagedFile
} from '@/components/ui/AttachmentUploader';
import { AttachmentService } from '@/services/attachmentService';

interface MessageComposerProps {
  inputPrompt: string;
  onInputChange: (val: string) => void;
  onSend: (customPrompt?: string, attachmentIds?: string[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  activeModels?: AgentModel[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  activeProjects?: Project[];
  selectedProjectId?: string;
  onSelectProject?: (projId: string) => void;
  placeholder?: string;
}

export default function MessageComposer({
  inputPrompt,
  onInputChange,
  onSend,
  onStop,
  isStreaming = false,
  activeModels = [],
  selectedModelId = 'gemini-3.8-flash',
  onSelectModel,
  activeProjects = [],
  selectedProjectId = '',
  onSelectProject,
  placeholder = 'Message AI-Chan…',
}: MessageComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputPrompt]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUploadFiles = async (files: File[]) => {
    const BLOCKED_EXTS = ['.exe', '.bat', '.ps1', '.sh', '.cmd', '.dll', '.com'];
    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

    for (const f of files) {
      const lowerName = f.name.toLowerCase();
      const isBlocked = BLOCKED_EXTS.some(ext => lowerName.endsWith(ext));
      if (isBlocked) {
        alert(`Tệp '${f.name}' bị chặn vì lý do bảo mật an toàn.`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        alert(`Tệp '${f.name}' vượt quá dung lượng tối đa cho phép (20 MB).`);
        continue;
      }
      if (f.size === 0) {
        alert(`Tệp '${f.name}' rỗng (0 bytes).`);
        continue;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newStaged: StagedFile = {
        id: tempId,
        file: f,
        name: f.name,
        size: f.size,
        mime: f.type || 'application/octet-stream',
        status: 'UPLOADING',
        progress: 0,
      };

      setStagedFiles(prev => [...prev, newStaged]);

      try {
        const att = await AttachmentService.uploadAttachment(
          f,
          selectedProjectId ? 'project_chat' : 'chat',
          selectedProjectId || undefined,
          (percent) => {
            setStagedFiles(prev =>
              prev.map(item => (item.id === tempId ? { ...item, progress: percent } : item))
            );
          }
        );
        setStagedFiles(prev =>
          prev.map(item =>
            item.id === tempId
              ? {
                  ...item,
                  id: att.id,
                  status: 'READY',
                  progress: 100,
                }
              : item
          )
        );
      } catch (err: any) {
        setStagedFiles(prev =>
          prev.map(item =>
            item.id === tempId
              ? {
                  ...item,
                  status: 'FAILED',
                  error: err.message || 'Lỗi tải tệp',
                }
              : item
          )
        );
      }
    }
  };

  const handleRemoveStagedFile = (idx: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRetryStagedFile = (idx: number) => {
    const item = stagedFiles[idx];
    if (item.file) {
      handleRemoveStagedFile(idx);
      handleUploadFiles([item.file]);
    }
  };

  const handleSendMessageWithAttachments = () => {
    const isUploadingAny = stagedFiles.some(f => f.status === 'UPLOADING');
    if (isUploadingAny) {
      alert('Vui lòng đợi tệp hoàn tất tải lên.');
      return;
    }
    const readyIds = stagedFiles.filter(f => f.status === 'READY' && f.id).map(f => f.id!);
    onSend(undefined, readyIds.length > 0 ? readyIds : undefined);
    setStagedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const hasReady = stagedFiles.some(f => f.status === 'READY');
      if (!isStreaming && (inputPrompt.trim() || hasReady)) {
        handleSendMessageWithAttachments();
      }
    }
  };

  const currentModel = activeModels.find(m => m.id === selectedModelId) || {
    id: selectedModelId,
    name: selectedModelId.includes('gemini') ? 'Gemini 2.5 Flash' : selectedModelId,
  };

  const currentProject = activeProjects.find(p => p.id === selectedProjectId);
  const hasInput = inputPrompt.trim().length > 0 || stagedFiles.some(f => f.status === 'READY');

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        padding: '0 0 1.25rem',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        ref={dropdownRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(Array.from(e.dataTransfer.files));
          }
        }}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: isDragOver
            ? '1px dashed var(--accent)'
            : isFocused
            ? '1px solid var(--border-strong)'
            : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '10px 14px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          transition: 'border-color var(--transition-fast)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}
      >
        {/* Active project badge */}
        {currentProject && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-hover)',
              fontSize: '0.74rem',
              alignSelf: 'flex-start',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Workflow: {currentProject.name}</span>
            <button
              type="button"
              onClick={() => onSelectProject?.('')}
              aria-label="Remove workflow"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 0 0 2px',
                display: 'flex',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Attached files preview chips */}
        <ComposerAttachmentChips
          files={stagedFiles}
          onRemove={handleRemoveStagedFile}
          onRetry={handleRetryStagedFile}
        />


        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputPrompt}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          aria-label="Message input"
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: 1.55,
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            minHeight: '44px',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        />

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '4px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: project selector & attachments */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AttachmentButton onFilesSelected={handleUploadFiles} disabled={isStreaming} />
            {activeProjects.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => { setShowProjectDropdown(v => !v); setShowModelDropdown(false); }}
                  aria-label="Select project workflow"
                  style={toolbarBtnStyle}
                  title="Project Workflow"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </button>
                {showProjectDropdown && (
                  <Dropdown top style={{ width: '200px' }}>
                    <DropdownLabel>Project Workflow</DropdownLabel>
                    <DropdownItem
                      selected={!selectedProjectId}
                      onClick={() => { onSelectProject?.(''); setShowProjectDropdown(false); }}
                    >
                      None (standard chat)
                    </DropdownItem>
                    {activeProjects.map(p => (
                      <DropdownItem
                        key={p.id}
                        selected={selectedProjectId === p.id}
                        onClick={() => { onSelectProject?.(p.id); setShowProjectDropdown(false); }}
                      >
                        {p.name}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                )}
              </div>
            )}
          </div>

          {/* Right: model selector + send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Model selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowModelDropdown(v => !v); setShowProjectDropdown(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                  {currentModel.name || selectedModelId}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showModelDropdown && (
                <Dropdown top style={{ width: '220px' }}>
                  <DropdownLabel>Select Model</DropdownLabel>
                  {activeModels.length > 0 ? (
                    activeModels.map(m => (
                      <DropdownItem
                        key={m.id}
                        selected={selectedModelId === m.id}
                        onClick={() => { onSelectModel?.(m.id); setShowModelDropdown(false); }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span>{m.name}</span>
                          {m.provider && <span style={{ fontSize: '0.7rem', color: 'var(--text-disabled)' }}>{m.provider}</span>}
                        </div>
                      </DropdownItem>
                    ))
                  ) : (
                    <>
                      <DropdownItem selected={selectedModelId === 'gemini-3.8-flash'} onClick={() => { onSelectModel?.('gemini-3.8-flash'); setShowModelDropdown(false); }}>
                        Gemini 2.5 Flash
                      </DropdownItem>
                      <DropdownItem selected={selectedModelId === 'gpt-4o-mini'} onClick={() => { onSelectModel?.('gpt-4o-mini'); setShowModelDropdown(false); }}>
                        GPT-4o mini
                      </DropdownItem>
                    </>
                  )}
                </Dropdown>
              )}
            </div>

            {/* Send / Stop */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generation"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendMessageWithAttachments}
                disabled={!hasInput}
                aria-label="Send message"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: hasInput ? 'var(--text-primary)' : 'var(--bg-elevated)',
                  border: hasInput ? 'none' : '1px solid var(--border-subtle)',
                  color: hasInput ? 'var(--bg-base)' : 'var(--text-disabled)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: hasInput ? 'pointer' : 'default',
                  transition: 'background var(--transition-fast), color var(--transition-fast)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-disabled)', marginTop: '6px' }}>
        AI-Chan can make mistakes. Press <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '0 3px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>Shift+Enter</kbd> for a new line.
      </p>
    </div>
  );
}

// ── Shared dropdown primitives ────────────────────────────────────────
function Dropdown({ children, top, style }: { children: React.ReactNode; top?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        ...(top ? { bottom: '100%', marginBottom: '6px' } : { top: '100%', marginTop: '6px' }),
        right: 0,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        padding: '4px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '5px 8px', fontSize: '0.68rem', color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </div>
  );
}

function DropdownItem({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="option"
      aria-selected={selected}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 8px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        backgroundColor: selected ? 'var(--bg-selected)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.8rem',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {children}
      {selected && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      )}
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  border: '1px solid transparent',
  color: 'var(--text-disabled)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color var(--transition-fast), border-color var(--transition-fast)',
};

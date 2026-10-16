'use client';

import React, { useRef, useState } from 'react';
import { AttachmentItem, AttachmentService } from '@/services/attachmentService';

// Format bytes into readable string (KB, MB)
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Icon helper by MIME/category
export function getFileCategoryIcon(category?: string, mimeType?: string) {
  if (category === 'image' || mimeType?.startsWith('image/')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (category === 'code' || mimeType?.includes('json') || mimeType?.includes('javascript') || mimeType?.includes('python')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (mimeType?.includes('pdf')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

/**
 * 1. Chip hiển thị danh sách file đang đính kèm trong Message Composer
 */
export interface StagedFile {
  id?: string;
  file?: File;
  name: string;
  size: number;
  mime: string;
  status: 'UPLOADING' | 'READY' | 'FAILED';
  progress?: number;
  error?: string;
  attachment?: AttachmentItem;
}

interface ComposerAttachmentChipsProps {
  files: StagedFile[];
  onRemove: (index: number) => void;
  onRetry?: (index: number) => void;
}

export function ComposerAttachmentChips({ files, onRemove, onRetry }: ComposerAttachmentChipsProps) {
  if (!files || files.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '4px 0 6px',
        width: '100%',
      }}
      aria-label="Attached files preview"
    >
      {files.map((f, idx) => {
        const isImage = f.mime.startsWith('image/');
        return (
          <div
            key={f.id || `${f.name}-${idx}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              background: f.status === 'FAILED' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-subtle)',
              border: f.status === 'FAILED' ? '1px solid var(--danger)' : '1px solid var(--border-default)',
              fontSize: '0.78rem',
              color: 'var(--text-primary)',
              maxWidth: '260px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ color: f.status === 'FAILED' ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }}>
              {getFileCategoryIcon(undefined, f.mime)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={f.name}
              >
                {f.name}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {f.status === 'UPLOADING' ? `Đang tải: ${f.progress || 0}%` : formatBytes(f.size)}
              </span>
            </div>

            {f.status === 'UPLOADING' && (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid var(--accent)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }}
              />
            )}

            {f.status === 'FAILED' && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(idx)}
                title={f.error || 'Thử lại'}
                aria-label={`Thử lại tải tệp ${f.name}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemove(idx)}
              aria-label={`Xóa tệp ${f.name}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 2. Nút chọn file đính kèm với input ẩn và drag-and-drop
 */
interface AttachmentButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function AttachmentButton({ onFilesSelected, disabled = false, maxFiles = 5 }: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files).slice(0, maxFiles);
      onFilesSelected(selected);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,.pdf,.txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css,.yaml,.yml"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Đính kèm tệp từ máy tính"
        title="Đính kèm tệp (Ảnh, PDF, Tài liệu, Code)"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background var(--transition-fast), color var(--transition-fast)',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </>
  );
}

/**
 * 3. Hiển thị danh sách tệp đính kèm trong bóng tin nhắn (Message Bubbles)
 */
interface MessageAttachmentsProps {
  attachments?: AttachmentItem[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
      }}
      aria-label="Tệp đính kèm tin nhắn"
    >
      {attachments.map(att => {
        const isImage = att.mime_type.startsWith('image/');
        const viewUrl = att.view_url || AttachmentService.getViewUrl(att.id);
        const downloadUrl = att.download_url || AttachmentService.getDownloadUrl(att.id);

        if (isImage) {
          return (
            <div
              key={att.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                maxWidth: '220px',
              }}
            >
              <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', overflow: 'hidden' }}>
                <img
                  src={viewUrl}
                  alt={att.filename}
                  style={{
                    width: '100%',
                    maxHeight: '140px',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                />
              </a>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  fontSize: '0.74rem',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-secondary)',
                  }}
                  title={att.filename}
                >
                  {att.filename}
                </span>
                <a
                  href={downloadUrl}
                  download={att.filename}
                  title="Tải ảnh về máy"
                  style={{
                    color: 'var(--accent)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
          );
        }

        return (
          <div
            key={att.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              fontSize: '0.8rem',
              maxWidth: '260px',
            }}
          >
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
              {getFileCategoryIcon(att.category, att.mime_type)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}
                title={att.filename}
              >
                {att.filename}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {formatBytes(att.file_size)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Xem tệp trực tiếp"
                aria-label={`Xem tệp ${att.filename}`}
                style={{
                  color: 'var(--text-secondary)',
                  padding: '3px',
                  display: 'flex',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </a>
              <a
                href={downloadUrl}
                download={att.filename}
                title="Tải tệp xuống"
                aria-label={`Tải xuống tệp ${att.filename}`}
                style={{
                  color: 'var(--accent)',
                  padding: '3px',
                  display: 'flex',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 4. Quản lý tài nguyên thư viện (Library Asset Manager) cho Skills và System Prompts
 */
interface LibraryAssetManagerProps {
  contextType: 'skill' | 'system_prompt';
  contextId: string;
  initialAttachments?: AttachmentItem[];
  onAttachmentChanged?: () => void;
  readonly?: boolean;
}

export function LibraryAssetManager({
  contextType,
  contextId,
  initialAttachments = [],
  onAttachmentChanged,
  readonly = false,
}: LibraryAssetManagerProps) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadAttachments = async () => {
    try {
      const items = await AttachmentService.getAttachments(
        contextType === 'skill' ? { skill_id: contextId } : { prompt_id: contextId }
      );
      setAttachments(items);
      onAttachmentChanged?.();
    } catch (err: any) {
      console.error('Không thể nạp danh sách tài nguyên:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = '';

    setIsUploading(true);
    setUploadError(null);

    try {
      await AttachmentService.uploadAttachment(file, contextType, contextId);
      await reloadAttachments();
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi khi tải tài nguyên lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attId: string, attName: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài nguyên '${attName}' khỏi thư viện?`)) return;
    try {
      await AttachmentService.deleteAttachment(attId);
      await reloadAttachments();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa tài nguyên.');
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginTop: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Tài nguyên hỗ trợ (Library Assets)
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Lưu trữ tài liệu tham khảo, schema, cấu hình đính kèm cho {contextType === 'skill' ? 'Skill' : 'System Prompt'}.
          </p>
        </div>
        {!readonly && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                opacity: isUploading ? 0.6 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{isUploading ? 'Đang tải lên…' : 'Tải tài nguyên lên'}</span>
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.8rem',
          }}
        >
          {uploadError}
        </div>
      )}

      {attachments.length === 0 ? (
        <div
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Chưa có tài nguyên nào được đính kèm. Nhấp vào &quot;Tải tài nguyên lên&quot; để thêm tệp.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {attachments.map(att => (
            <div
              key={att.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
                  {getFileCategoryIcon(att.category, att.mime_type)}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={att.filename}
                  >
                    {att.filename}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatBytes(att.file_size)} • {att.mime_type} • {att.created_at ? new Date(att.created_at).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <a
                  href={AttachmentService.getViewUrl(att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  Xem
                </a>
                <a
                  href={AttachmentService.getDownloadUrl(att.id)}
                  download={att.filename}
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  Tải xuống
                </a>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id, att.filename)}
                    aria-label={`Xóa tài nguyên ${att.filename}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

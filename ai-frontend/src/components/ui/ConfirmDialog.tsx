import React from 'react';
import Icon from './Icon';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          borderColor: isDestructive ? 'rgba(240, 113, 120, 0.3)' : 'var(--border-default)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
          {isDestructive ? (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="alert" size={16} />
            </div>
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="info" size={16} />
            </div>
          )}
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
          {message}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDestructive ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

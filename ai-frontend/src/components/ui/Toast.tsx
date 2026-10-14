import React from 'react';
import Icon from './Icon';

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose?: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '0.625rem 1rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-elevated)',
        border: `1px solid ${
          isSuccess
            ? 'var(--accent-border)'
            : isError
            ? 'rgba(240, 113, 120, 0.4)'
            : 'var(--border-default)'
        }`,
        color: 'var(--text-primary)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        maxWidth: '420px',
      }}
    >
      <span
        style={{
          color: isSuccess ? 'var(--accent)' : isError ? 'var(--danger)' : 'var(--text-secondary)',
          display: 'flex',
        }}
      >
        <Icon name={isSuccess ? 'check' : isError ? 'alert' : 'info'} size={15} />
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="btn-icon"
          style={{ padding: '2px', marginLeft: '4px' }}
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </div>
  );
}

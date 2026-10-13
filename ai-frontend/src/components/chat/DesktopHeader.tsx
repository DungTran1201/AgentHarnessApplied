'use client';

import React from 'react';
import Link from 'next/link';

interface DesktopHeaderProps {
  currentUser?: { username?: string; email?: string; avatar_url?: string } | null;
  onLogout?: () => void;
  // legacy compat
  mode?: string;
  onModeChange?: (mode: any) => void;
}

export default function DesktopHeader({ currentUser, onLogout }: DesktopHeaderProps) {
  const initials = currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : 'AI';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        height: '52px',
        backgroundColor: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/chat" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div
            style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.8 5.2L13.4 5.8L10.2 8.8L11 13.4L7 11.2L3 13.4L3.8 8.8L0.6 5.8L5.2 5.2L7 1Z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            AI-Chan
          </span>
        </Link>
        <span style={{
          fontSize: '0.65rem', fontWeight: 500, padding: '1px 6px',
          borderRadius: 'var(--radius-xs)', background: 'var(--bg-elevated)',
          color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
        }}>
          beta
        </span>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

        {/* Avatar → /settings?tab=profile */}
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link
              href="/settings?tab=profile"
              aria-label="User account settings"
              title="Account settings"
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: currentUser.avatar_url ? 'transparent' : 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                flexShrink: 0, overflow: 'hidden', textDecoration: 'none',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,133,243,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {currentUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username || 'User avatar'}
                  width={32} height={32}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : initials}
            </Link>

            {/* Sign out */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

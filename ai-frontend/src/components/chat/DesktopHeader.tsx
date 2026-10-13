'use client';

import React from 'react';
import Link from 'next/link';

interface DesktopHeaderProps {
  mode: 'workspace' | 'companion';
  onModeChange: (mode: 'workspace' | 'companion') => void;
  currentUser?: { username?: string; email?: string } | null;
  onLogout?: () => void;
}

export default function DesktopHeader({
  mode,
  onModeChange,
  currentUser,
  onLogout,
}: DesktopHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        height: '54px',
        backgroundColor: '#0E0F1B',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      {/* 1. Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.05rem',
            boxShadow: 'var(--accent-glow-sm)',
            flexShrink: 0,
          }}
        >
          ✨
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #E0D7FE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI-Chan
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'rgba(167, 139, 250, 0.18)',
                color: 'var(--accent)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
              }}
            >
              VRM v3
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.1 }}>
            Your AI companion & workspace
          </span>
        </div>
      </div>

      {/* 2. Center Mode Switcher Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#171821',
            borderRadius: 'var(--radius-full)',
            padding: '3px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange('workspace')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: mode === 'workspace' ? 600 : 500,
              color: mode === 'workspace' ? '#FFFFFF' : 'var(--text-secondary)',
              background:
                mode === 'workspace'
                  ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.35) 0%, rgba(139, 92, 246, 0.25) 100%)'
                  : 'transparent',
              boxShadow: mode === 'workspace' ? '0 0 12px rgba(167, 139, 250, 0.2)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>✦</span>
            <span>Workspace Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('companion')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: mode === 'companion' ? 600 : 500,
              color: mode === 'companion' ? '#FFFFFF' : 'var(--text-secondary)',
              background:
                mode === 'companion'
                  ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.4) 0%, rgba(139, 92, 246, 0.3) 100%)'
                  : 'transparent',
              boxShadow: mode === 'companion' ? '0 0 14px rgba(167, 139, 250, 0.3)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>◉</span>
            <span>Companion Mode</span>
          </button>
        </div>

        {/* Dynamic hint message */}
        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          className="desktop-header-hint"
        >
          <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>🟣</span>
          {mode === 'workspace'
            ? 'Switch to Companion Mode to chat with AI-Chan in a more immersive way!'
            : 'Immersive 3D Companion Active — Rotate & interact freely!'}
        </span>
      </div>

      {/* 3. Right Action Icons & Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Notification Bell */}
        <button
          type="button"
          title="Thông báo"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--transition-fast)',
          }}
        >
          🔔
        </button>

        {/* Theme indicator */}
        <button
          type="button"
          title="Giao diện Tối (Anime Dark Mode)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🌙
        </button>

        {/* User Avatar with Profile popover */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              border: '2px solid rgba(167, 139, 250, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: 'var(--accent-glow-sm)',
            }}
            title={currentUser ? `Đang đăng nhập: ${currentUser.username || currentUser.email}` : 'Tài khoản'}
          >
            {currentUser?.username ? currentUser.username.slice(0, 1).toUpperCase() : 'AI'}
          </div>
        </div>

        {/* Desktop window controls simulator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '0.5rem',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            title="Thu nhỏ"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            title="Phóng to"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            title="Đóng"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.35)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </header>
  );
}

'use client';

import React, { useState } from 'react';

interface AIChanStatusPanelProps {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  tokensUsed?: string;
  isOnline?: boolean;
  onQuickToolClick?: (toolType: 'code' | 'image' | 'file' | 'web') => void;
  style?: React.CSSProperties;
}

export default function AIChanStatusPanel({
  modelName = 'GPT-4o',
  temperature = 0.7,
  maxTokens = 4096,
  tokensUsed = '1.2K / 8K',
  isOnline = true,
  onQuickToolClick,
  style,
}: AIChanStatusPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 25,
          ...style,
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, rgba(31, 27, 43, 0.95) 0%, rgba(23, 24, 33, 0.95) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Mở bảng trạng thái AI-Chan"
        >
          <span style={{ color: 'var(--accent)' }}>✨</span>
          <span>AI-Chan Status</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '280px',
        backgroundColor: 'rgba(23, 24, 33, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(167, 139, 250, 0.22)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 25,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>✨</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
            AI-Chan Status
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Online badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--success)',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
            Online
          </span>

          {/* Collapse button */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
            title="Thu gọn panel"
          >
            <span>+ Thu gọn</span>
          </button>
        </div>
      </div>

      {/* Metrics List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(14, 15, 27, 0.65)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(167, 139, 250, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Model</span>
          <span style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{modelName}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Temperature</span>
          <span style={{ color: '#FFFFFF', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{temperature}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Max Tokens</span>
          <span style={{ color: '#FFFFFF', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{maxTokens}</span>
        </div>

        {/* Tokens used with Sparkline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tokens used</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {tokensUsed}
            </span>
          </div>

          {/* Micro Sparkline Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginTop: '2px',
            }}
          >
            <div
              style={{
                width: '32%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                borderRadius: '9999px',
                boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Quick Tools
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {[
            { key: 'code', label: 'Code', icon: '</>' },
            { key: 'image', label: 'Image', icon: '🖼' },
            { key: 'file', label: 'File', icon: '📄' },
            { key: 'web', label: 'Web', icon: '🌐' },
          ].map(tool => (
            <button
              key={tool.key}
              type="button"
              onClick={() => onQuickToolClick?.(tool.key as any)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 4px',
                background: 'rgba(31, 27, 43, 0.8)',
                border: '1px solid rgba(167, 139, 250, 0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'var(--accent-glow-sm)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={`Sử dụng công cụ ${tool.label}`}
            >
              <span style={{ fontSize: '0.85rem' }}>{tool.icon}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(167, 139, 250, 0.12)',
          fontSize: '0.72rem',
          color: 'var(--accent)',
          fontWeight: 500,
        }}
      >
        <span>✨ AI-Chan Always by your side 💜</span>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';

function renderInline(text: string): React.ReactNode[] {
  // Regex parsing for bold **text**, inline code `code`, link [text](url)
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          style={{
            background: 'var(--bg-elevated)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.85em',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{token.slice(2, -2)}</strong>;
    }
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = linkMatch[2];
      // Only allow http, https or relative links
      const safeHref = /^https?:\/\//i.test(href) || href.startsWith('/') ? href : '#';
      return (
        <a
          key={i}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return token;
  });
}

export default function SafeMarkdownViewer({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content || !content.trim()) {
    return (
      <div style={{ color: 'var(--text-disabled)', fontStyle: 'italic', padding: '1rem 0' }}>
        Chưa có nội dung để hiển thị xem trước.
      </div>
    );
  }

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-body" style={{ lineHeight: 1.6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : 'code';
          const codeBody = language === lines[0] ? lines.slice(1).join('\n') : lines.join('\n');
          return (
            <div
              key={index}
              style={{
                margin: '1rem 0',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                overflow: 'hidden',
                background: 'var(--bg-surface)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)'
                }}
              >
                <span>{language.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => copyCode(codeBody, index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedIndex === index ? 'var(--success)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  {copiedIndex === index ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
              <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split('\n\n');
        return (
          <React.Fragment key={index}>
            {paragraphs.map((para, pIdx) => {
              const trimmed = para.trim();
              if (!trimmed) return null;

              // Headers
              if (trimmed.startsWith('# ')) {
                return (
                  <h1 key={pIdx} style={{ fontSize: '1.4rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    {renderInline(trimmed.slice(2))}
                  </h1>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={pIdx} style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0.9rem 0 0.4rem', color: 'var(--text-primary)' }}>
                    {renderInline(trimmed.slice(3))}
                  </h2>
                );
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={pIdx} style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0.8rem 0 0.3rem', color: 'var(--text-primary)' }}>
                    {renderInline(trimmed.slice(4))}
                  </h3>
                );
              }

              // Bullet lists
              if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const items = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
                return (
                  <ul key={pIdx} style={{ paddingLeft: '1.4rem', margin: '0.5rem 0' }}>
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ marginBottom: '0.25rem' }}>
                        {renderInline(item.replace(/^[-*]\s+/, ''))}
                      </li>
                    ))}
                  </ul>
                );
              }

              // Numbered lists
              if (/^\d+\.\s/.test(trimmed)) {
                const items = trimmed.split('\n').filter(l => /^\d+\.\s/.test(l.trim()));
                return (
                  <ol key={pIdx} style={{ paddingLeft: '1.4rem', margin: '0.5rem 0' }}>
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ marginBottom: '0.25rem' }}>
                        {renderInline(item.replace(/^\d+\.\s+/, ''))}
                      </li>
                    ))}
                  </ol>
                );
              }

              // Regular paragraph
              return (
                <p key={pIdx} style={{ margin: '0.5rem 0' }}>
                  {renderInline(trimmed)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

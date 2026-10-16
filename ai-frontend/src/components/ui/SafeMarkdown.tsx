'use client';

import React from 'react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Safely renders Markdown without dangerous HTML execution.
 * Handles headings, bold, italic, inline code, code blocks, blockquotes, and lists.
 */
export default function SafeMarkdown({ content, className, style }: SafeMarkdownProps) {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockLines.length > 0 || inCodeBlock) {
      elements.push(
        <div
          key={key}
          style={{
            margin: '12px 0',
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            overflow: 'hidden'
          }}
        >
          {codeBlockLang && (
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#64748b',
                background: '#0f172a',
                padding: '4px 10px',
                borderBottom: '1px solid #1e293b',
                textTransform: 'uppercase'
              }}
            >
              {codeBlockLang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: '12px 14px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#38bdf8',
              overflowX: 'auto',
              whiteSpace: 'pre'
            }}
          >
            {codeBlockLines.join('\n')}
          </pre>
        </div>
      );
      codeBlockLines = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Regex for bold `**text**`, inline code `` `code` ``, and italic `*text*`
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check code
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            style={{
              background: 'rgba(51, 65, 85, 0.5)',
              color: '#f43f5e',
              padding: '2px 5px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.9em'
            }}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Check bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={`b-${keyIdx++}`} style={{ color: '#f8fafc', fontWeight: 600 }}>
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Check italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(
          <em key={`i-${keyIdx++}`} style={{ fontStyle: 'italic', color: '#cbd5e1' }}>
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Normal text until next special char
      const nextSpecial = remaining.search(/[`*]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Unmatched special char, output literal
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block start or end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock(`cb-${i}`);
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} style={{ fontSize: '18px', fontWeight: 700, margin: '14px 0 8px', color: '#f8fafc' }}>
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 6px', color: '#f1f5f9' }}>
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ fontSize: '14px', fontWeight: 600, margin: '10px 0 4px', color: '#e2e8f0' }}>
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          style={{
            margin: '8px 0',
            paddingLeft: '12px',
            borderLeft: '3px solid #3b82f6',
            color: '#94a3b8',
            fontSize: '13px'
          }}
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered list item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} style={{ display: 'flex', gap: '8px', margin: '3px 0 3px 12px', fontSize: '13px', lineHeight: 1.5 }}>
          <span style={{ color: '#60a5fa' }}>•</span>
          <div>{renderInline(line.trim().slice(2))}</div>
        </div>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', fontSize: '13px', lineHeight: 1.6, color: '#e2e8f0' }}>
        {renderInline(line)}
      </p>
    );
  }

  if (inCodeBlock) {
    flushCodeBlock('cb-last');
  }

  return (
    <div className={className} style={{ ...style, wordBreak: 'break-word' }}>
      {elements}
    </div>
  );
}

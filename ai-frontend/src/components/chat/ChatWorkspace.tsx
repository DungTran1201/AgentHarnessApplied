'use client';

import React, { useState } from 'react';

import { AttachmentItem } from '@/services/attachmentService';
import { MessageAttachments } from '@/components/ui/AttachmentUploader';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  created_at?: string;
  isStreaming?: boolean;
  attachments?: AttachmentItem[];
}

interface ChatWorkspaceProps {
  messages: Message[];
  isStreaming: boolean;
  onSelectPrompt: (promptText: string) => void;
  onStop?: () => void;
  activeConvTitle?: string;
  currentUser?: { username?: string } | null;
  chatScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  showScrollBottom: boolean;
  scrollToBottom: () => void;
}

// ── Markdown & Code Block renderer ──────────────────────────────────
function FormattedMessage({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-body">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : 'code';
          const codeBody = language === lines[0] ? lines.slice(1).join('\n') : lines.join('\n');
          return (
            <div key={index} className="code-block-wrapper">
              <div className="code-header">
                <span>{language.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeBody, index)}
                  aria-label={copiedIndex === index ? 'Copied' : 'Copy code'}
                >
                  {copiedIndex === index ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="code-content"><code>{codeBody}</code></pre>
            </div>
          );
        }

        const paragraphs = part.split('\n\n');
        return (
          <React.Fragment key={index}>
            {paragraphs.map((para, pIdx) => {
              if (!para.trim()) return null;
              if (para.includes('\n- ') || para.startsWith('- ')) {
                const items = para.split('\n').filter(l => l.trim().startsWith('- '));
                return (
                  <ul key={pIdx}>
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx}>{renderInline(item.replace(/^- /, ''))}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={pIdx}>{renderInline(para)}</p>;
            })}
          </React.Fragment>
        );
      })}
      {isStreaming && <span className="cursor-blink" aria-hidden="true" />}
    </div>
  );
}

function renderInline(text: string) {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return <strong key={bIdx}>{bPart.slice(2, -2)}</strong>;
    }
    const codeParts = bPart.split(/(`.*?`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith('`') && cPart.endsWith('`')) {
        return <code key={cIdx}>{cPart.slice(1, -1)}</code>;
      }
      return cPart;
    });
  });
}

// ── Starter prompt cards ─────────────────────────────────────────────
const STARTER_CARDS = [
  {
    title: 'Write code',
    desc: 'Generate, debug, or explain',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    prompt: 'Help me write a high-performance data processing function in TypeScript.',
  },
  {
    title: 'Analyze data',
    desc: 'Understand & visualize',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    prompt: 'Analyze and summarize the following dataset for me.',
  },
  {
    title: 'Draft content',
    desc: 'Blog, email, documentation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    prompt: 'Write a concise technical blog post about modern state management in React.',
  },
  {
    title: 'Learn & research',
    desc: 'Explain concepts in depth',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    prompt: 'Explain transformer attention mechanisms in simple terms.',
  },
];

// ── AI avatar mark ───────────────────────────────────────────────────
function AvatarMark({ size = 22 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '6px',
        background: 'var(--accent-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 14 14" fill="none">
        <path d="M7 1L8.8 5.2L13.4 5.8L10.2 8.8L11 13.4L7 11.2L3 13.4L3.8 8.8L0.6 5.8L5.2 5.2L7 1Z" fill="white" fillOpacity="0.95"/>
      </svg>
    </div>
  );
}

export default function ChatWorkspace({
  messages,
  isStreaming,
  onSelectPrompt,
  onStop,
  activeConvTitle,
  currentUser,
  chatScrollContainerRef,
  messagesEndRef,
  onScroll,
  showScrollBottom,
  scrollToBottom,
}: ChatWorkspaceProps) {
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable message thread */}
      <div
        ref={chatScrollContainerRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 1.5rem 0.5rem',
        }}
      >
        {/* Content column — keeps messages within a readable max-width */}
        <div
          style={{
            maxWidth: '760px',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            paddingBottom: '1rem',
          }}
        >
        {/* Empty state: welcome + starter cards */}
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '2rem 0',
            }}
          >
            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                textWrap: 'balance',
              } as React.CSSProperties}
            >
              Good {getGreeting()},{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {currentUser?.username || 'there'}
              </span>
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '2rem' }}>
              What would you like to work on today?
            </p>

            {/* 2 × 2 card grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                width: '100%',
              }}
            >
              {STARTER_CARDS.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt(card.prompt)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    textAlign: 'left',
                    transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {card.title}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message thread
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const timeStr = msg.created_at
              ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(msg.created_at))
              : '';

            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  // User: push to right edge of content column; assistant: stays left
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                  alignSelf: 'stretch',
                }}
              >
                {/* Assistant header */}
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                    <AvatarMark size={22} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      AI-Chan
                    </span>
                    {timeStr && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeStr}</span>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div
                  style={{
                    background: isUser
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                    border: isUser
                      ? '1px solid var(--border-default)'
                      : 'none',
                    borderRadius: isUser ? 'var(--radius-lg)' : '0',
                    padding: isUser ? '10px 14px' : '0',
                    color: 'var(--text-primary)',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  {isUser ? (
                    <>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <MessageAttachments attachments={msg.attachments} />
                        </div>
                      )}
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>
                        {msg.content}
                      </div>
                    </>
                  ) : (
                    <>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <MessageAttachments attachments={msg.attachments} />
                        </div>
                      )}
                      <FormattedMessage content={msg.content} isStreaming={msg.isStreaming} />

                      {/* Generating indicator */}
                      {msg.isStreaming && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span aria-hidden="true">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                              </svg>
                            </span>
                            Generating…
                          </span>
                          {onStop && (
                            <button
                              type="button"
                              onClick={onStop}
                              aria-label="Stop generation"
                              style={{
                                background: 'var(--danger-bg)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: 'var(--danger)',
                                borderRadius: 'var(--radius-xs)',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              Stop
                            </button>
                          )}
                        </div>
                      )}

                      {/* Assistant actions */}
                      {!msg.isStreaming && msg.content && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '8px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            aria-label={copiedMsgId === msg.id ? 'Copied' : 'Copy message'}
                            style={actionBtnStyle}
                          >
                            {copiedMsgId === msg.id ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            )}
                          </button>
                          <button type="button" aria-label="Thumbs up" style={actionBtnStyle}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                          </button>
                          <button type="button" aria-label="Thumbs down" style={actionBtnStyle}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* User timestamp */}
                {isUser && timeStr && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-disabled)', marginTop: '3px', marginRight: '2px' }}>
                    {timeStr}
                  </span>
                )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div> {/* end content column */}
      </div>

      {/* Scroll to bottom */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            transition: 'color var(--transition-fast)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-disabled)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: 'var(--radius-xs)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color var(--transition-fast)',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

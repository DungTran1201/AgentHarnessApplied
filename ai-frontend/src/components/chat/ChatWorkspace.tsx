'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  created_at?: string;
  isStreaming?: boolean;
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

// Markdown & Code Block Formatter Component
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
                  aria-label="Sao chép mã nguồn"
                >
                  {copiedIndex === index ? '✓ Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <pre className="code-content">
                <code>{codeBody}</code>
              </pre>
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
                      <li key={itemIdx}>
                        {renderInlineFormatting(item.replace(/^- /, ''))}
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p key={pIdx}>
                  {renderInlineFormatting(para)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
      {isStreaming && <span className="cursor-blink" aria-hidden="true" />}
    </div>
  );
}

function renderInlineFormatting(text: string) {
  // Bold **bold**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return <strong key={bIdx}>{bPart.slice(2, -2)}</strong>;
    }
    // Inline code `code`
    const codeParts = bPart.split(/(`.*?`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith('`') && cPart.endsWith('`')) {
        return <code key={cIdx}>{cPart.slice(1, -1)}</code>;
      }
      return cPart;
    });
  });
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

  const starterCards = [
    {
      title: 'Viết code',
      desc: 'Generate, debug, explain',
      icon: '🪄',
      prompt: 'Hãy giúp tôi viết một hàm phân tích dữ liệu hiệu năng cao với TypeScript và tối ưu hóa bộ nhớ.',
    },
    {
      title: 'Phân tích dữ liệu',
      desc: 'Tìm hiểu, trực quan hóa',
      icon: '📊',
      prompt: 'Hãy phân tích phong cách và bố cục giao diện của dự án ml-tools giúp tôi nhé.',
    },
    {
      title: 'Tạo nội dung',
      desc: 'Blog, email, social media',
      icon: '📝',
      prompt: 'Hãy viết một bài giới thiệu tính năng AI-Chan VRM Companion theo phong cách công nghệ Nhật Bản hiện đại.',
    },
    {
      title: 'Học & nghiên cứu',
      desc: 'Tìm hiểu tài liệu, giải thích khái niệm',
      icon: '🎓',
      prompt: 'Giải thích nguyên lý hoạt động của blendshape và bone rigging trong chuẩn mô hình VRM 3D.',
    },
  ];

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
      {/* Scrollable Message Thread */}
      <div
        ref={chatScrollContainerRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Welcome Greeting & Starter Cards when thread is empty */}
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              maxWidth: '720px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '2rem 1rem',
            }}
          >
            {/* Sparkle Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  boxShadow: 'var(--accent-glow)',
                }}
              >
                ✨
              </div>
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
              >
                Good evening, {currentUser?.username || 'Dũng'}! ✨
              </h2>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem' }}>
              AI-Chan is here to help you turn your ideas into reality. What would you like to work on today?
            </p>

            {/* 4 Action Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                width: '100%',
              }}
            >
              {starterCards.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectPrompt(card.prompt)}
                  style={{
                    backgroundColor: 'rgba(23, 24, 33, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.backgroundColor = 'rgba(31, 27, 43, 0.9)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.backgroundColor = 'rgba(23, 24, 33, 0.8)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(167, 139, 250, 0.12)',
                      border: '1px solid rgba(167, 139, 250, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '2px' }}>
                      {card.title}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {card.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Active Message Stream Thread */
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const timeStr = msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Vừa xong';

            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                  maxWidth: '820px',
                  margin: isUser ? '0 0 0 auto' : '0 auto 0 0',
                }}
              >
                {/* Message Header (Avatar + Name for Assistant) */}
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        boxShadow: 'var(--accent-glow-sm)',
                      }}
                    >
                      🌸
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>
                      AI-Chan
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--success)',
                        background: 'rgba(34, 197, 94, 0.15)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      ✔
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      {timeStr}
                    </span>
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  style={{
                    backgroundColor: isUser
                      ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                      : 'rgba(23, 24, 33, 0.95)',
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35) 0%, rgba(124, 58, 237, 0.45) 100%)'
                      : 'rgba(23, 24, 33, 0.95)',
                    border: isUser
                      ? '1px solid rgba(167, 139, 250, 0.4)'
                      : '1px solid var(--border-subtle)',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    padding: '14px 18px',
                    color: '#F3F1FF',
                    maxWidth: '100%',
                    boxShadow: isUser
                      ? '0 4px 16px rgba(124, 58, 237, 0.2)'
                      : '0 4px 20px rgba(0, 0, 0, 0.35)',
                    wordBreak: 'break-word',
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.94rem' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      <FormattedMessage content={msg.content} isStreaming={msg.isStreaming} />

                      {/* Tool / Generating Status Card during streaming analysis */}
                      {msg.isStreaming && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: 'rgba(14, 15, 27, 0.75)',
                            border: '1px solid rgba(167, 139, 250, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>⚡</span>
                              <span>Đang suy luận phản hồi...</span>
                            </span>
                            {onStop && (
                              <button
                                type="button"
                                onClick={onStop}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                }}
                              >
                                ⏹ Stop
                              </button>
                            )}
                          </div>
                          {/* Animated progress line */}
                          <div
                            style={{
                              width: '100%',
                              height: '3px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: '60%',
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                                borderRadius: '9999px',
                                animation: 'progressFlow 1.5s ease-in-out infinite',
                              }}
                            />
                            <style jsx>{`
                              @keyframes progressFlow {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(200%); }
                              }
                            `}</style>
                          </div>
                        </div>
                      )}

                      {/* Message Actions Footer for Assistant */}
                      {!msg.isStreaming && msg.content && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px solid rgba(167, 139, 250, 0.1)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Sao chép nội dung"
                          >
                            <span>📋</span>
                            <span>{copiedMsgId === msg.id ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>

                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}
                            title="Thích câu trả lời"
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}
                            title="Chưa hài lòng"
                          >
                            👎
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* User message timestamp */}
                {isUser && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', marginRight: '4px' }}>
                    {timeStr}
                  </span>
                )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '24px',
            backgroundColor: '#1F1B2B',
            border: '1px solid var(--primary)',
            color: '#FFFFFF',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow-sm)',
            zIndex: 30,
            transition: 'all var(--transition-fast)',
          }}
          title="Cuộn xuống tin nhắn mới nhất"
        >
          ↓
        </button>
      )}
    </div>
  );
}

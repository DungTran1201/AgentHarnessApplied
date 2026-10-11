'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentModel, Project } from '@/types';

interface MessageComposerProps {
  inputPrompt: string;
  onInputChange: (val: string) => void;
  onSend: (customPrompt?: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  activeModels?: AgentModel[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  activeProjects?: Project[];
  selectedProjectId?: string;
  onSelectProject?: (projId: string) => void;
  placeholder?: string;
}

export default function MessageComposer({
  inputPrompt,
  onInputChange,
  onSend,
  onStop,
  isStreaming = false,
  activeModels = [],
  selectedModelId = 'gemini-3.8-flash',
  onSelectModel,
  activeProjects = [],
  selectedProjectId = '',
  onSelectProject,
  placeholder = 'Message AI-Chan...',
}: MessageComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputPrompt]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && inputPrompt.trim()) {
        onSend();
      }
    }
  };

  const currentModel = activeModels.find(m => m.id === selectedModelId) || {
    id: selectedModelId,
    name: selectedModelId.includes('gemini') ? 'Gemini 2.5 Flash' : selectedModelId.toUpperCase(),
  };

  const currentProject = activeProjects.find(p => p.id === selectedProjectId);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        padding: '0 1rem 1rem',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        ref={dropdownRef}
        style={{
          backgroundColor: '#171821',
          border: isFocused ? '1px solid var(--border-focus)' : '1px solid var(--border-default)',
          boxShadow: isFocused ? 'var(--accent-glow)' : '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'all var(--transition-fast)',
        }}
      >
        {/* Active Project Banner if selected */}
        {currentProject && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#c7d2fe',
              fontSize: '0.75rem',
              alignSelf: 'flex-start',
            }}
          >
            <span>🧩 Workflow: {currentProject.name}</span>
            <button
              type="button"
              onClick={() => onSelectProject?.('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#c7d2fe',
                cursor: 'pointer',
                fontSize: '0.75rem',
                marginLeft: '4px',
              }}
              title="Bỏ chọn workflow"
            >
              ✕
            </button>
          </div>
        )}

        {/* Multiline Textarea */}
        <textarea
          ref={textareaRef}
          value={inputPrompt}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.94rem',
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            minHeight: '44px',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        />

        {/* Action Toolbar Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '4px',
            borderTop: '1px solid rgba(167, 139, 250, 0.08)',
          }}
        >
          {/* Left Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              title="Công cụ bổ sung"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(167, 139, 250, 0.15)',
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              +
            </button>
            <button
              type="button"
              title="Đính kèm tệp"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(167, 139, 250, 0.15)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              📎
            </button>
            <button
              type="button"
              title="Tải ảnh lên"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(167, 139, 250, 0.15)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              🖼
            </button>
          </div>

          {/* Right Selector and Send Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Model Selector Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(31, 27, 43, 0.9)',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span>✨</span>
                <span>{currentModel.name || selectedModelId}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>▼</span>
              </button>

              {/* Model Dropdown Menu */}
              {showModelDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    width: '240px',
                    backgroundColor: '#171821',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                    padding: '6px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Chọn Mô Hình AI
                  </div>
                  {activeModels.length > 0 ? (
                    activeModels.map(m => (
                      <div
                        key={m.id}
                        onClick={() => {
                          onSelectModel?.(m.id);
                          setShowModelDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          backgroundColor: selectedModelId === m.id ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
                          color: selectedModelId === m.id ? '#FFFFFF' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: selectedModelId === m.id ? 600 : 400 }}>{m.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.provider}</span>
                        </div>
                        {selectedModelId === m.id && <span style={{ color: 'var(--primary)' }}>✓</span>}
                      </div>
                    ))
                  ) : (
                    <>
                      <div
                        onClick={() => {
                          onSelectModel?.('gemini-3.8-flash');
                          setShowModelDropdown(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          backgroundColor: selectedModelId === 'gemini-3.8-flash' ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
                          fontSize: '0.8rem',
                          color: '#FFFFFF',
                        }}
                      >
                        Gemini 2.5 Flash (Default)
                      </div>
                      <div
                        onClick={() => {
                          onSelectModel?.('gpt-4o-mini');
                          setShowModelDropdown(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          backgroundColor: selectedModelId === 'gpt-4o-mini' ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
                          fontSize: '0.8rem',
                          color: '#FFFFFF',
                        }}
                      >
                        OpenAI GPT-4o-mini
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.6)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)',
                }}
                title="Dừng sinh phản hồi"
              >
                ⏹
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSend()}
                disabled={!inputPrompt.trim()}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: inputPrompt.trim() ? 'var(--accent-gradient)' : 'rgba(167, 139, 250, 0.2)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputPrompt.trim() ? 'pointer' : 'default',
                  fontSize: '0.95rem',
                  boxShadow: inputPrompt.trim() ? 'var(--accent-glow-sm)' : 'none',
                  transition: 'all var(--transition-fast)',
                  opacity: inputPrompt.trim() ? 1 : 0.5,
                }}
                title="Gửi tin nhắn (Enter)"
              >
                ➔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

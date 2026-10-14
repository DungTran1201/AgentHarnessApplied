'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, GraphNode, GraphEdge, Message } from '@/types';
import { ProjectService } from '@/services/projectService';
import Icon from '@/components/ui/Icon';

interface FloatingProjectChatProps {
  project: Project | null;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  isGraphValid?: boolean;
  onActivateProject?: () => Promise<void>;
  canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const STORAGE_KEY_OPACITY = 'ai_chan_project_chat_opacity';
const STORAGE_KEY_OPEN = 'ai_chan_project_chat_open';

export default function FloatingProjectChat({
  project,
  nodes = [],
  edges = [],
  isGraphValid = true,
  onActivateProject,
  canvasContainerRef,
}: FloatingProjectChatProps) {
  // ── Open / Close State ───────────────────────────────────────────
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY_OPEN) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleOpen = (openState: boolean) => {
    setIsOpen(openState);
    try {
      localStorage.setItem(STORAGE_KEY_OPEN, String(openState));
    } catch {}
  };

  // ── Opacity State (45% - 95%, default 84%) ────────────────────────
  const [panelOpacity, setPanelOpacity] = useState<number>(() => {
    if (typeof window === 'undefined') return 84;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OPACITY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 45 && val <= 95) return val;
      }
    } catch {}
    return 84;
  });

  const handleOpacityChange = (val: number) => {
    const clamped = Math.max(45, Math.min(95, val));
    setPanelOpacity(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_OPACITY, String(clamped));
    } catch {}
  };

  // ── Dimensions & Resize State ────────────────────────────────────
  const [width, setWidth] = useState<number>(380);
  const [height, setHeight] = useState<number>(460);
  const [savedExpandedWidth, setSavedExpandedWidth] = useState<number>(380);
  const [savedExpandedHeight, setSavedExpandedHeight] = useState<number>(460);

  // Responsive boundary tracking
  const [maxBounds, setMaxBounds] = useState<{ width: number; height: number }>({
    width: 600,
    height: 700,
  });

  const updateBounds = useCallback(() => {
    if (canvasContainerRef?.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const availableW = Math.max(280, rect.width - 32);
      const availableH = Math.max(240, rect.height - 32);
      setMaxBounds({ width: availableW, height: availableH });

      setWidth(prev => Math.min(prev, availableW));
      setHeight(prev => Math.min(prev, availableH));
    }
  }, [canvasContainerRef]);

  useEffect(() => {
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [updateBounds]);

  // ── Drag Resizing Logic ──────────────────────────────────────────
  const isDraggingHRef = useRef(false);
  const isDraggingVRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 380,
    startH: 460,
  });

  const handlePointerDownH = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingHRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingHRef.current) return;
      // Anchored to right: dragging left (negative delta) increases width!
      const deltaX = dragStartRef.current.startX - moveEvent.clientX;
      const targetW = dragStartRef.current.startW + deltaX;
      const clampedW = Math.max(280, Math.min(maxBounds.width, targetW));
      setWidth(clampedW);
      if (clampedW > 330) {
        setSavedExpandedWidth(clampedW);
      }
    };

    const handlePointerUp = () => {
      isDraggingHRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownV = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingVRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingVRef.current) return;
      // Anchored to bottom: dragging upward (negative delta) increases height!
      const deltaY = dragStartRef.current.startY - moveEvent.clientY;
      const targetH = dragStartRef.current.startH + deltaY;
      const clampedH = Math.max(240, Math.min(maxBounds.height, targetH));
      setHeight(clampedH);
      if (clampedH > 290) {
        setSavedExpandedHeight(clampedH);
      }
    };

    const handlePointerUp = () => {
      isDraggingVRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // ── Arrow Quick Dimension Toggles ────────────────────────────────
  const isWidthCompact = width <= 310;
  const toggleWidthCompact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWidthCompact) {
      // Restore expanded
      const restoreW = Math.min(maxBounds.width, Math.max(380, savedExpandedWidth));
      setWidth(restoreW);
    } else {
      // Save current and collapse to compact
      setSavedExpandedWidth(width);
      setWidth(290);
    }
  };

  const isHeightCompact = height <= 270;
  const toggleHeightCompact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHeightCompact) {
      // Restore expanded
      const restoreH = Math.min(maxBounds.height, Math.max(460, savedExpandedHeight));
      setHeight(restoreH);
    } else {
      // Save current and collapse to compact
      setSavedExpandedHeight(height);
      setHeight(250);
    }
  };

  // ── Conversation & Messaging State ───────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Word limit calculation
  const maxWordsLimit: number =
    project?.max_words_limit ||
    (nodes.find(n => n.type === 'web_input')?.data?.config as any)?.max_words ||
    500;

  const currentWordCount = inputPrompt.trim().length > 0
    ? inputPrompt.trim().split(/\s+/).length
    : 0;

  const isWordLimitExceeded = currentWordCount > maxWordsLimit;

  // ── Sending Message ──────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isStreaming || !project) return;

    if (isWordLimitExceeded) {
      setErrorBanner(`Word count (${currentWordCount}) exceeds project limit (${maxWordsLimit} words).`);
      return;
    }

    setErrorBanner(null);
    const userText = inputPrompt.trim();
    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `assistant_${Date.now()}`;

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      status: 'completed',
    };

    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setInputPrompt('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulatedText = '';

    try {
      await ProjectService.streamProjectChat(
        project.id,
        userText,
        conversationId,
        (chunk: string) => {
          accumulatedText += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedText, status: 'streaming' }
                : m
            )
          );
        },
        (doneData?: any) => {
          if (doneData?.conversation_id && !conversationId) {
            setConversationId(doneData.conversation_id);
          }
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, status: 'completed' }
                : m
            )
          );
        },
        (err: any) => {
          if (err?.name === 'AbortError') return;
          const errMsg = err?.message || 'Chat error occurred.';
          accumulatedText = `⚠️ **Workflow Error:** ${errMsg}`;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedText, status: 'error' }
                : m
            )
          );
        },
        controller.signal
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const errMsg = err?.message || 'Connection error';
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: `⚠️ **Connection Error:** ${errMsg}`, status: 'error' }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Render Closed State: Floating Launcher ───────────────────────
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          handleToggleOpen(true);
        }}
        onMouseDown={e => e.stopPropagation()}
        title="Open Project Chat"
        aria-label="Open Project Chat"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: 'rgba(15, 15, 18, 0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(24, 24, 28, 0.95)';
          e.currentTarget.style.borderColor = 'rgba(62, 207, 142, 0.4)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(62, 207, 142, 0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'rgba(15, 15, 18, 0.88)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'rgba(62, 207, 142, 0.15)',
            color: 'var(--accent)',
          }}
        >
          <Icon name="chat" size={14} />
        </span>
        <span>Project Chat</span>
        {project && (
          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: '4px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {project.name}
          </span>
        )}
      </button>
    );
  }

  // ── Render Open State: Floating Chat Window ──────────────────────
  const isProjectActive = project?.status === 'ACTIVE';

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: `calc(100% - 32px)`,
        maxHeight: `calc(100% - 32px)`,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        // Background-only transparency: allows graph to be visible behind while foreground stays crisp
        backgroundColor: `rgba(15, 15, 18, ${panelOpacity / 100})`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
        userSelect: 'text',
      }}
    >
      {/* ── Left Edge Drag Handle (Horizontal Resize) ── */}
      <div
        onPointerDown={handlePointerDownH}
        title="Drag horizontally to resize width"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '7px',
          cursor: 'ew-resize',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(62, 207, 142, 0.25)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* ── Top Edge Drag Handle (Vertical Resize) ── */}
      <div
        onPointerDown={handlePointerDownV}
        title="Drag vertically to resize height"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: '7px',
          cursor: 'ns-resize',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(62, 207, 142, 0.25)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* ── Floating Left Edge Arrow Control (Quick Compact / Expand Width) ── */}
      <button
        type="button"
        onClick={toggleWidthCompact}
        title={isWidthCompact ? 'Expand width' : 'Compact width'}
        aria-label={isWidthCompact ? 'Expand width' : 'Compact width'}
        style={{
          position: 'absolute',
          left: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 65,
          width: '18px',
          height: '28px',
          background: 'rgba(25, 25, 30, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--accent)';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.background = 'rgba(30, 30, 38, 0.95)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.background = 'rgba(25, 25, 30, 0.85)';
        }}
      >
        <Icon name={isWidthCompact ? 'chevronLeft' : 'chevronRight'} size={12} />
      </button>

      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 8px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {/* Left: Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isProjectActive ? 'var(--accent)' : '#f59e0b',
              boxShadow: isProjectActive ? '0 0 6px rgba(62, 207, 142, 0.6)' : 'none',
              flexShrink: 0,
            }}
            title={isProjectActive ? 'Project is ACTIVE' : `Project is ${project?.status || 'PAUSED'}`}
          />
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
            Project Chat
          </span>
          {project && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
              }}
              title={project.name}
            >
              {project.name}
            </span>
          )}
        </div>

        {/* Right: Opacity Slider, Quick Toggles & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Transparency Slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
            title="Panel opacity (background transparency)"
          >
            <label
              htmlFor="chat-panel-opacity"
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                userSelect: 'none',
                cursor: 'pointer',
              }}
            >
              Opacity
            </label>
            <input
              id="chat-panel-opacity"
              type="range"
              min="45"
              max="95"
              step="1"
              value={panelOpacity}
              onChange={e => handleOpacityChange(parseInt(e.target.value, 10))}
              aria-label="Panel opacity"
              style={{
                width: '48px',
                height: '4px',
                accentColor: 'var(--accent)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'right' }}>
              {panelOpacity}%
            </span>
          </div>

          {/* Vertical Toggle (Height) */}
          <button
            type="button"
            onClick={toggleHeightCompact}
            title={isHeightCompact ? 'Expand height' : 'Compact height'}
            aria-label={isHeightCompact ? 'Expand height' : 'Compact height'}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <Icon name={isHeightCompact ? 'chevronUp' : 'chevronDown'} size={12} />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleToggleOpen(false);
            }}
            title="Close Project Chat"
            aria-label="Close Project Chat"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.borderColor = 'var(--danger)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </header>

      {/* ── Status Notice Banner (if not active or graph invalid) ── */}
      {(!isProjectActive || !isGraphValid) && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: '0.72rem',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: !isGraphValid
              ? 'rgba(240, 113, 120, 0.12)'
              : 'rgba(245, 158, 11, 0.12)',
            borderBottom: `1px solid ${!isGraphValid ? 'rgba(240, 113, 120, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            color: !isGraphValid ? 'var(--danger)' : '#fbbf24',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="alert" size={12} />
            <span>
              {!isGraphValid
                ? 'Pipeline has incomplete connections. Save graph before chatting.'
                : `Project is currently ${project?.status || 'STOPPED'}.`}
            </span>
          </div>
          {onActivateProject && !isProjectActive && isGraphValid && (
            <button
              type="button"
              onClick={onActivateProject}
              className="btn btn-secondary"
              style={{
                padding: '2px 8px',
                fontSize: '0.65rem',
                height: 'auto',
                marginLeft: '8px',
              }}
            >
              Activate Now
            </button>
          )}
        </div>
      )}

      {errorBanner && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: '0.72rem',
            background: 'rgba(240, 113, 120, 0.15)',
            borderBottom: '1px solid rgba(240, 113, 120, 0.3)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Scrollable Chat Messages Thread ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              padding: '20px 10px',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                color: 'var(--accent)',
              }}
            >
              <Icon name="chat" size={18} />
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Interactive Project Chat
            </p>
            <p style={{ margin: 0, fontSize: '0.72rem', maxWidth: '240px', lineHeight: '1.4' }}>
              Test your configured graph pipeline in real-time. Word limits and linked system prompts are automatically applied.
            </p>
          </div>
        ) : (
          messages.map(m => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    backgroundColor: isUser ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.05)',
                    border: isUser
                      ? '1px solid rgba(62, 207, 142, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.content ? (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          animation: 'pulse 1s infinite',
                        }}
                      />
                      Thinking...
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    padding: '0 2px',
                  }}
                >
                  {isUser ? 'You' : project?.name || 'Assistant'}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Composer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '8px 10px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            background: 'var(--bg-surface)',
            border: isWordLimitExceeded
              ? '1px solid var(--danger)'
              : '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '6px 8px',
          }}
        >
          <textarea
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isProjectActive
                ? 'Project must be ACTIVE to chat...'
                : 'Send message to project pipeline... (Enter to send)'
            }
            rows={1}
            disabled={!isProjectActive && !messages.length}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              maxHeight: '80px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopStreaming}
              title="Stop generation"
              style={{
                background: 'rgba(240, 113, 120, 0.15)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '28px',
              }}
            >
              <Icon name="stop" size={11} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputPrompt.trim() || isWordLimitExceeded}
              title="Send message (Enter)"
              style={{
                background: inputPrompt.trim() && !isWordLimitExceeded
                  ? 'var(--accent)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: inputPrompt.trim() && !isWordLimitExceeded
                  ? '#000'
                  : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                cursor: inputPrompt.trim() && !isWordLimitExceeded ? 'pointer' : 'not-allowed',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '28px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Send</span>
              <Icon name="chevronRight" size={12} />
            </button>
          )}
        </div>

        {/* Word count & limit indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '4px',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            padding: '0 2px',
          }}
        >
          <span>Shift+Enter for new line</span>
          <span style={{ color: isWordLimitExceeded ? 'var(--danger)' : 'var(--text-muted)' }}>
            {currentWordCount} / {maxWordsLimit} words
          </span>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import VRMViewer from '../vrm/VRMViewer';
import { VRMController, AvatarState } from '../vrm/vrmController';
import { Message } from './ChatWorkspace';
import MessageComposer from './MessageComposer';
import { AgentModel, Project } from '@/types';

interface CompanionStageProps {
  messages: Message[];
  inputPrompt: string;
  onInputChange: (val: string) => void;
  onSend: (customPrompt?: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  avatarState: AvatarState;
  onReturnToWorkspace: () => void;
  activeModels?: AgentModel[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  activeProjects?: Project[];
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;
  activeConvTitle?: string;
  onControllerReady?: (ctrl: VRMController) => void;
}

export default function CompanionStage({
  messages,
  inputPrompt,
  onInputChange,
  onSend,
  onStop,
  isStreaming,
  avatarState,
  onReturnToWorkspace,
  activeModels = [],
  selectedModelId = 'gemini-3.8-flash',
  onSelectModel,
  activeProjects = [],
  selectedProjectId = '',
  onSelectProject,
  activeConvTitle,
  onControllerReady,
}: CompanionStageProps) {
  const [showChatPanel, setShowChatPanel] = useState(true);
  const controllerRef = useRef<VRMController | null>(null);

  const handleControllerReady = (ctrl: VRMController) => {
    controllerRef.current = ctrl;
    if (onControllerReady) {
      onControllerReady(ctrl);
    }
  };

  const handleExpression = (expr: string) => {
    controllerRef.current?.triggerExpression(expr, 1.0, 2.5);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 54px)',
        overflow: 'hidden',
        background: '#0E0F1B',
      }}
    >
      {/* Background Anime Ambient Texture & Lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 65% 45%, rgba(139, 92, 246, 0.15) 0%, rgba(14, 15, 27, 0.8) 60%), url(/assets/ai-chan-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
          filter: 'blur(3px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3D WebGL VRM Canvas (Center Stage) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
        }}
      >
        <VRMViewer
          modelUrl="/models/ai-chan.vrm"
          avatarState={avatarState}
          companionMode={true}
          onControllerReady={handleControllerReady}
        />
      </div>

      {/* Top 3D Control Bar & Return to Workspace */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 15,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Return button & chat toggle */}
        <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={onReturnToWorkspace}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(23, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(167, 139, 250, 0.35)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>✦</span>
            <span>Về Workspace Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChatPanel(!showChatPanel)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(23, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {showChatPanel ? '👁 Ẩn hội thoại' : '💬 Hiện hội thoại'}
          </button>
        </div>

        {/* Right: Camera Presets & Expression Triggers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(23, 24, 33, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px' }}>
            Biểu cảm:
          </span>
          <button
            type="button"
            onClick={() => handleExpression('happy')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            title="Biểu cảm vui vẻ"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => handleExpression('relaxed')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            title="Biểu cảm dịu dàng"
          >
            🌸
          </button>
          <button
            type="button"
            onClick={() => handleExpression('surprised')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            title="Biểu cảm bất ngờ"
          >
            ✨
          </button>
          <button
            type="button"
            onClick={() => handleExpression('blink')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            title="Nháy mắt"
          >
            😉
          </button>
        </div>
      </div>

      {/* Floating Left Chat Panel (when enabled) */}
      {showChatPanel && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '24px',
            bottom: '100px',
            width: '380px',
            background: 'rgba(23, 24, 33, 0.82)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(167, 139, 250, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>💬</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                {activeConvTitle || 'Hội thoại AI-Chan'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowChatPanel(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>

          {/* Messages List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '1rem' }}>
                <span>✨ Chào bạn! Hãy gửi tin nhắn cho AI-Chan nhé.</span>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                        background: isUser
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.45) 0%, rgba(124, 58, 237, 0.55) 100%)'
                          : 'rgba(31, 27, 43, 0.9)',
                        border: isUser ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid var(--border-subtle)',
                        color: '#FFFFFF',
                        fontSize: '0.86rem',
                        lineHeight: 1.5,
                        maxWidth: '90%',
                      }}
                    >
                      {m.content || (m.isStreaming ? 'AI-Chan đang suy nghĩ... ✨' : '')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Message Composer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
        }}
      >
        <MessageComposer
          inputPrompt={inputPrompt}
          onInputChange={onInputChange}
          onSend={onSend}
          onStop={onStop}
          isStreaming={isStreaming}
          activeModels={activeModels}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          activeProjects={activeProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          placeholder="Trò chuyện với AI-Chan trong không gian 3D..."
        />
      </div>
    </div>
  );
}

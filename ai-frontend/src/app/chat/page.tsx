'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AgentModel, Project } from '@/types';
import { ProjectService } from '@/services/projectService';
import DesktopHeader from '@/components/chat/DesktopHeader';
import Sidebar, { Conversation } from '@/components/chat/Sidebar';
import ChatWorkspace, { Message } from '@/components/chat/ChatWorkspace';
import MessageComposer from '@/components/chat/MessageComposer';
import AIChanStatusPanel from '@/components/chat/AIChanStatusPanel';
import CompanionStage from '@/components/chat/CompanionStage';
import VRMViewer from '@/components/vrm/VRMViewer';
import { AvatarState, VRMController } from '@/components/vrm/vrmController';

export default function ChatWorkspacePage() {
  const router = useRouter();

  // Mode: Workspace Mode (default) or Companion Mode
  const [viewMode, setViewMode] = useState<'workspace' | 'companion'>('workspace');

  // VRM Avatar State Machine
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const vrmControllerRef = useRef<VRMController | null>(null);

  // Conversations & Messages State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'models' | 'prompts' | 'knowledge' | 'settings'>('home');

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Active Models & Model Selector state
  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');

  // Active Projects state
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Kiểm tra xác thực người dùng
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
        fetchConversations();
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

  // Load Active Models
  useEffect(() => {
    const fetchActiveModels = async () => {
      try {
        const res = await fetch('/api/v1/models?status=ACTIVE');
        if (res.ok) {
          const data: AgentModel[] = await res.json();
          setActiveModels(data);
          const defModel = data.find(m => m.is_default);
          if (defModel) {
            setSelectedModelId(defModel.id);
          } else if (data.length > 0) {
            setSelectedModelId(data[0].id);
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchActiveModels();
  }, []);

  // Load Active Projects
  useEffect(() => {
    const fetchActiveProjects = async () => {
      try {
        const projects = await ProjectService.getActiveProjects();
        setActiveProjects(projects);
      } catch {
        // Fallback
      }
    };
    fetchActiveProjects();
  }, []);

  // 2. Tải danh sách cuộc trò chuyện
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/v1/conversations/');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch {
      // Ignored
    }
  };

  // 3. Tải tin nhắn của thread đang chọn
  const loadConversationMessages = async (convId: string) => {
    setActiveConvId(convId);
    setActiveTab('chat');
    try {
      const res = await fetch(`/api/v1/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Lỗi tải messages:', err);
    }
  };

  // 4. Tạo cuộc trò chuyện mới
  const handleCreateNewConversation = async () => {
    try {
      const res = await fetch('/api/v1/conversations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Cuộc trò chuyện mới' }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations(prev => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        setActiveTab('chat');
        setMessages([]);
      }
    } catch (err) {
      console.error('Lỗi tạo conversation:', err);
    }
  };

  // 5. Đổi tên cuộc trò chuyện
  const handleRename = async (convId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/v1/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error('Lỗi đổi tên:', err);
    }
  };

  // 6. Xóa cuộc trò chuyện
  const handleDelete = async (conv: Conversation) => {
    if (!confirm(`Bạn có chắc muốn xóa cuộc trò chuyện "${conv.title}"?`)) return;
    try {
      const res = await fetch(`/api/v1/conversations/${conv.id}`, {
        method: 'DELETE',
      });
      if (res.status === 204 || res.ok) {
        setConversations(prev => prev.filter(c => c.id !== conv.id));
        if (activeConvId === conv.id) {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Lỗi xóa conversation:', err);
    }
  };

  // 7. Đăng xuất
  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      localStorage.removeItem('ai_chan_user');
      localStorage.removeItem('ai_chan_token');
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  // 8. Tự động cuộn xuống dưới
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, isStreaming, showScrollBottom]);

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isAtBottom);
  };

  // 9. Dừng sinh phản hồi (Stop Generation)
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      vrmControllerRef.current?.handleStopGeneration();
      setAvatarState('idle');
    }
  };

  // 10. Gửi tin nhắn và tiếp nhận phản hồi streaming SSE với Avatar Synchronization
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isStreaming) return;

    let targetConvId = activeConvId;

    if (!targetConvId) {
      try {
        const createRes = await fetch('/api/v1/conversations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Cuộc trò chuyện mới' }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          targetConvId = createData.conversation.id;
          setActiveConvId(targetConvId);
          setConversations(prev => [createData.conversation, ...prev]);
        }
      } catch (err) {
        console.error('Lỗi tự tạo cuộc trò chuyện:', err);
        return;
      }
    }

    setActiveTab('chat');

    // Optimistic UI
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    const assistantPlaceholderId = `assistant-${Date.now()}`;
    const assistantMsgPlaceholder: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      model: selectedModelId,
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsgPlaceholder]);
    setInputPrompt('');
    setIsStreaming(true);

    // AI Avatar Synchronization: thinking -> speaking
    setAvatarState('thinking');

    // Nếu người dùng đang chọn Project Workflow
    if (selectedProjectId) {
      const activeProj = activeProjects.find(p => p.id === selectedProjectId);
      if (activeProj) {
        const maxWords =
          activeProj.max_words_limit ||
          (activeProj.graph_data?.nodes.find(n => n.type === 'web_input')?.data?.config as any)?.max_words_limit;
        if (maxWords && typeof maxWords === 'number') {
          const wordCount = textToSend.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount > maxWords) {
            alert(`⚠️ Số lượng từ (${wordCount}) vượt quá giới hạn cấu hình của Project (${maxWords} từ).`);
            setMessages(prev => prev.filter(m => m.id !== assistantPlaceholderId && m.id !== userMsg.id));
            setIsStreaming(false);
            setAvatarState('idle');
            return;
          }
        }
      }

      let accumulatedText = '';
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await ProjectService.streamProjectChat(
          selectedProjectId,
          textToSend.trim(),
          targetConvId,
          (chunk: string) => {
            accumulatedText += chunk;
            setAvatarState('speaking');
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
              )
            );
          },
          (doneData?: any) => {
            if (doneData?.conversation_id && !activeConvId) {
              setActiveConvId(doneData.conversation_id);
            }
          },
          (err: any) => {
            if (err?.name === 'AbortError') return;
            const errMsg = err?.message || 'Đã xảy ra lỗi khi xử lý luồng Project.';
            accumulatedText = `⚠️ **Lỗi Workflow:** ${errMsg}`;
            setAvatarState('error');
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
              )
            );
          },
          controller.signal
        );
        if (accumulatedText) {
          vrmControllerRef.current?.handleAIResponseComplete(targetConvId || 'project', accumulatedText);
        }
        setAvatarState('success');
        setTimeout(() => setAvatarState('idle'), 2500);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setAvatarState('error');
          setTimeout(() => setAvatarState('idle'), 3000);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantPlaceholderId
                ? { ...m, content: m.content || `⚠️ Lỗi kết nối luồng Project: ${err.message}` }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantPlaceholderId
              ? { ...m, isStreaming: false, content: m.content || 'Không nhận được phản hồi từ workflow.' }
              : m
          )
        );
        fetchConversations();
      }
      return;
    }

    // Standard Chat Streaming
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/v1/conversations/${targetConvId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToSend.trim(),
          model: selectedModelId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errData = await response.json().catch(() => null);
          const msg = errData?.detail?.message || 'Hạn ngạch token trong ngày đã hết.';
          throw new Error(`🚨 ${msg}`);
        }
        throw new Error('Lỗi kết nối tới luồng AI.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.includes('event: chunk')) {
              const dataMatch = line.match(/data:\s*(.*)/);
              if (dataMatch) {
                try {
                  const chunkObj = JSON.parse(dataMatch[1]);
                  if (chunkObj.token) {
                    accumulatedText += chunkObj.token;
                    setAvatarState('speaking');
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
                      )
                    );
                  }
                } catch {}
              }
            } else if (line.includes('event: error')) {
              const dataMatch = line.match(/data:\s*(.*)/);
              if (dataMatch) {
                try {
                  const errorObj = JSON.parse(dataMatch[1]);
                  const errorMessage = errorObj.message || 'Đã xảy ra lỗi khi xử lý phản hồi.';
                  accumulatedText = `⚠️ **Lỗi:** ${errorMessage}`;
                  setAvatarState('error');
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
                    )
                  );
                } catch {}
              }
            } else if (line.includes('event: done')) {
              // Hoàn tất luồng
            }
          }
        }
      }

      if (accumulatedText) {
        vrmControllerRef.current?.handleAIResponseComplete(targetConvId || 'chat', accumulatedText);
      }
      setAvatarState('success');
      setTimeout(() => setAvatarState('idle'), 2500);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream đã được dừng bởi người dùng.');
      } else {
        setAvatarState('error');
        setTimeout(() => setAvatarState('idle'), 3000);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantPlaceholderId
              ? { ...m, content: m.content || `⚠️ Lỗi kết nối: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantPlaceholderId
            ? { ...m, isStreaming: false, content: m.content || 'Không có phản hồi.' }
            : m
        )
      );
      fetchConversations();
    }
  };

  // Quick tool clicks from status panel
  const handleQuickToolClick = (toolType: 'code' | 'image' | 'file' | 'web') => {
    switch (toolType) {
      case 'code':
        setInputPrompt('Hãy viết mã nguồn phân tích: ');
        break;
      case 'image':
        setInputPrompt('Mô tả ý tưởng hình ảnh anime: ');
        break;
      case 'file':
        setInputPrompt('Hãy tóm tắt và đánh giá tệp tài liệu: ');
        break;
      case 'web':
        setInputPrompt('Tìm kiếm và tổng hợp thông tin về: ');
        break;
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0E0F1B',
      }}
    >
      {/* 1. Global Desktop Header */}
      <DesktopHeader
        mode={viewMode}
        onModeChange={newMode => setViewMode(newMode)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Body View (Workspace Mode vs Companion Mode) */}
      {viewMode === 'companion' ? (
        /* Companion Mode: Fullscreen 3D Immersion */
        <CompanionStage
          messages={messages}
          inputPrompt={inputPrompt}
          onInputChange={setInputPrompt}
          onSend={handleSendMessage}
          onStop={handleStopGeneration}
          isStreaming={isStreaming}
          avatarState={avatarState}
          onReturnToWorkspace={() => setViewMode('workspace')}
          activeModels={activeModels}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          activeProjects={activeProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          activeConvTitle={activeConv?.title}
          onControllerReady={ctrl => {
            vrmControllerRef.current = ctrl;
          }}
        />
      ) : (
        /* Workspace Mode: Productivity Layout with Integrated VRM Area */
        <div
          style={{
            display: 'flex',
            flex: 1,
            height: 'calc(100vh - 54px)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Left Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={tab => {
              setActiveTab(tab);
              if (tab === 'home') {
                setActiveConvId(null);
                setMessages([]);
              }
            }}
            conversations={conversations}
            activeConvId={activeConvId}
            onSelectConversation={loadConversationMessages}
            onNewChat={handleCreateNewConversation}
            onRenameConversation={handleRename}
            onDeleteConversation={handleDelete}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Central Chat Workspace */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#0E0F1B',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Thread Area */}
            <ChatWorkspace
              messages={messages}
              isStreaming={isStreaming}
              onSelectPrompt={p => {
                setInputPrompt(p);
                handleSendMessage(p);
              }}
              onStop={handleStopGeneration}
              activeConvTitle={activeConv?.title}
              currentUser={currentUser}
              chatScrollContainerRef={chatScrollContainerRef}
              messagesEndRef={messagesEndRef}
              onScroll={handleScroll}
              showScrollBottom={showScrollBottom}
              scrollToBottom={() => scrollToBottom(true)}
            />

            {/* Bottom Message Composer */}
            <MessageComposer
              inputPrompt={inputPrompt}
              onInputChange={setInputPrompt}
              onSend={handleSendMessage}
              onStop={handleStopGeneration}
              isStreaming={isStreaming}
              activeModels={activeModels}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              activeProjects={activeProjects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              placeholder="Message AI-Chan..."
            />
          </main>

          {/* Right Side: Integrated VRM 3D Area & Ambient Background */}
          <div
            className="vrm-companion-sidebar"
            style={{
              width: '420px',
              minWidth: '360px',
              height: '100%',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0E0F1B',
              borderLeft: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            {/* Ambient Background with subtle illustration blend */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle at 60% 40%, rgba(139, 92, 246, 0.18) 0%, rgba(14, 15, 27, 0.95) 75%), url(/assets/ai-chan-bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center right',
                opacity: 0.55,
                filter: 'blur(2px)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            {/* Cute Speech Bubble Float */}
            <div
              style={{
                position: 'absolute',
                top: '28px',
                left: '24px',
                zIndex: 15,
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(23, 24, 33, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                boxShadow: 'var(--accent-glow-sm)',
                fontSize: '0.82rem',
                color: 'var(--accent)',
                fontWeight: 600,
                pointerEvents: 'none',
                animation: 'floatSoft 3.5s ease-in-out infinite',
              }}
            >
              Anything you want to know? 💜
            </div>

            {/* 3D VRM Canvas */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
              }}
            >
              <VRMViewer
                modelUrl="/models/ai-chan.vrm"
                avatarState={avatarState}
                companionMode={false}
                onControllerReady={ctrl => {
                  vrmControllerRef.current = ctrl;
                }}
              />
            </div>

            {/* Floating AI-Chan Status Panel (bottom right dock) */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                zIndex: 20,
              }}
            >
              <AIChanStatusPanel
                modelName={activeModels.find(m => m.id === selectedModelId)?.name || 'GPT-4o'}
                temperature={0.7}
                maxTokens={4096}
                tokensUsed="1.2K / 8K"
                onQuickToolClick={handleQuickToolClick}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

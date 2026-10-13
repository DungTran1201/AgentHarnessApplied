'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AgentModel, Project } from '@/types';
import { ProjectService } from '@/services/projectService';
import DesktopHeader from '@/components/chat/DesktopHeader';
import Sidebar, { Conversation } from '@/components/chat/Sidebar';
import ChatWorkspace, { Message } from '@/components/chat/ChatWorkspace';
import MessageComposer from '@/components/chat/MessageComposer';

export default function ChatWorkspacePage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'models' | 'prompts' | 'knowledge' | 'settings'>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Auth check ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        setCurrentUser(data.user);
        fetchConversations();
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

  // ── Load active models ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/models?status=ACTIVE');
        if (!res.ok) return;
        const data: AgentModel[] = await res.json();
        setActiveModels(data);
        const def = data.find(m => m.is_default);
        setSelectedModelId((def ?? data[0])?.id ?? 'gemini-3.8-flash');
      } catch { /* fallback */ }
    })();
  }, []);

  // ── Load active projects ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setActiveProjects(await ProjectService.getActiveProjects());
      } catch { /* fallback */ }
    })();
  }, []);

  // ── Conversations ──────────────────────────────────────────────────
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/v1/conversations/');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch { /* ignored */ }
  };

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
      console.error('Failed to load messages:', err);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      const res = await fetch('/api/v1/conversations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
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
      console.error('Failed to create conversation:', err);
    }
  };

  const handleRename = async (convId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/v1/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async (conv: Conversation) => {
    if (!confirm(`Delete conversation "${conv.title}"?`)) return;
    try {
      const res = await fetch(`/api/v1/conversations/${conv.id}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        setConversations(prev => prev.filter(c => c.id !== conv.id));
        if (activeConvId === conv.id) {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      localStorage.removeItem('ai_chan_user');
      localStorage.removeItem('ai_chan_token');
    } finally {
      router.push('/login');
    }
  };

  // ── Scroll ─────────────────────────────────────────────────────────
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (!showScrollBottom) scrollToBottom();
  }, [messages, isStreaming, showScrollBottom]);

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 120);
  };

  // ── Stop ───────────────────────────────────────────────────────────
  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  // ── Send message ───────────────────────────────────────────────────
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isStreaming) return;

    let targetConvId = activeConvId;

    if (!targetConvId) {
      try {
        const createRes = await fetch('/api/v1/conversations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Conversation' }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          targetConvId = createData.conversation.id;
          setActiveConvId(targetConvId);
          setConversations(prev => [createData.conversation, ...prev]);
        }
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    setActiveTab('chat');

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

    // ── Project Workflow ──────────────────────────────────────────────
    if (selectedProjectId) {
      const activeProj = activeProjects.find(p => p.id === selectedProjectId);
      if (activeProj) {
        const maxWords = activeProj.max_words_limit ||
          (activeProj.graph_data?.nodes.find(n => n.type === 'web_input')?.data?.config as any)?.max_words_limit;
        if (maxWords && typeof maxWords === 'number') {
          const wordCount = textToSend.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount > maxWords) {
            alert(`Word count (${wordCount}) exceeds project limit (${maxWords}).`);
            setMessages(prev => prev.filter(m => m.id !== assistantPlaceholderId && m.id !== userMsg.id));
            setIsStreaming(false);
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
            setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m));
          },
          (doneData?: any) => {
            if (doneData?.conversation_id && !activeConvId) setActiveConvId(doneData.conversation_id);
          },
          (err: any) => {
            if (err?.name === 'AbortError') return;
            accumulatedText = `⚠️ **Workflow error:** ${err?.message || 'Unknown error'}`;
            setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m));
          },
          controller.signal
        );
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setMessages(prev => prev.map(m =>
            m.id === assistantPlaceholderId
              ? { ...m, content: m.content || `⚠️ Connection error: ${err.message}` }
              : m
          ));
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        setMessages(prev => prev.map(m =>
          m.id === assistantPlaceholderId
            ? { ...m, isStreaming: false, content: m.content || 'No response received.' }
            : m
        ));
        fetchConversations();
      }
      return;
    }

    // ── Standard streaming ─────────────────────────────────────────────
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/v1/conversations/${targetConvId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend.trim(), model: selectedModelId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errData = await response.json().catch(() => null);
          throw new Error(`🚨 ${errData?.detail?.message || 'Daily token quota exceeded.'}`);
        }
        throw new Error('Failed to connect to AI stream.');
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
                    setMessages(prev => prev.map(m =>
                      m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
                    ));
                  }
                } catch { /* parse error */ }
              }
            } else if (line.includes('event: error')) {
              const dataMatch = line.match(/data:\s*(.*)/);
              if (dataMatch) {
                try {
                  const errorObj = JSON.parse(dataMatch[1]);
                  accumulatedText = `⚠️ **Error:** ${errorObj.message || 'Unknown error'}`;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
                  ));
                } catch { /* parse error */ }
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantPlaceholderId
            ? { ...m, content: m.content || `⚠️ Connection error: ${err.message}` }
            : m
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages(prev => prev.map(m =>
        m.id === assistantPlaceholderId
          ? { ...m, isStreaming: false, content: m.content || 'No response received.' }
          : m
      ));
      fetchConversations();
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
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <DesktopHeader
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
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
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        />

        {/* Main chat area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
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
            placeholder="Message AI-Chan…"
          />
        </main>
      </div>
    </div>
  );
}

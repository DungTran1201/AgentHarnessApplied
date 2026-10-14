'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentModel, Project } from '@/types';
import { ProjectService } from '@/services/projectService';
import { useApp } from '@/context/AppContext';
import ChatWorkspace, { Message } from '@/components/chat/ChatWorkspace';
import MessageComposer from '@/components/chat/MessageComposer';

export default function ChatPage() {
  const {
    currentUser,
    conversations,
    activeConvId,
    setActiveConvId,
    fetchConversations,
    createConversation,
  } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Load models ───────────────────────────────────────────────────
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

  // ── Load projects ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setActiveProjects(await ProjectService.getActiveProjects());
      } catch { /* fallback */ }
    })();
  }, []);

  // ── Load messages when activeConvId changes ───────────────────────
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/v1/conversations/${activeConvId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    })();
  }, [activeConvId]);

  // ── Scroll ────────────────────────────────────────────────────────
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

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  // ── Send ──────────────────────────────────────────────────────────
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isStreaming) return;

    let targetConvId = activeConvId;

    if (!targetConvId) {
      targetConvId = await createConversation();
      if (!targetConvId) return;
    }

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

    // ── Project Workflow ─────────────────────────────────────────────
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

    // ── Standard streaming ───────────────────────────────────────────
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
              const m = line.match(/data:\s*(.*)/);
              if (m) {
                try {
                  const obj = JSON.parse(m[1]);
                  if (obj.token) {
                    accumulatedText += obj.token;
                    setMessages(prev => prev.map(msg =>
                      msg.id === assistantPlaceholderId ? { ...msg, content: accumulatedText } : msg
                    ));
                  }
                } catch { /* parse error */ }
              }
            } else if (line.includes('event: error')) {
              const m = line.match(/data:\s*(.*)/);
              if (m) {
                try {
                  const obj = JSON.parse(m[1]);
                  accumulatedText = `⚠️ **Error:** ${obj.message || 'Unknown error'}`;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantPlaceholderId ? { ...msg, content: accumulatedText } : msg
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
    <>
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
      <div style={{ padding: '0 1.5rem', flexShrink: 0 }}>
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
      </div>
    </>
  );
}

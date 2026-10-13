'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DesktopHeader from '@/components/chat/DesktopHeader';
import Sidebar, { Conversation } from '@/components/chat/Sidebar';

// ── Auth + Conversation Context ────────────────────────────────────────
interface AppContextValue {
  currentUser: any;
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  createConversation: () => Promise<string | null>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (conv: Conversation) => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  handleLogout: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue>({
  currentUser: null,
  conversations: [],
  activeConvId: null,
  setActiveConvId: () => {},
  fetchConversations: async () => {},
  createConversation: async () => null,
  renameConversation: async () => {},
  deleteConversation: async () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  handleLogout: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

// ── Shell ──────────────────────────────────────────────────────────────
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ── Auth check ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        setCurrentUser(data.user);
        setAuthChecked(true);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  // ── Conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/conversations/');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch { /* ignored */ }
  }, [router]);

  useEffect(() => {
    if (authChecked) fetchConversations();
  }, [authChecked, fetchConversations]);

  const createConversation = useCallback(async (): Promise<string | null> => {
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
        return newConv.id;
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
    return null;
  }, []);

  const renameConversation = useCallback(async (convId: string, newTitle: string) => {
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
  }, []);

  const deleteConversation = useCallback(async (conv: Conversation) => {
    if (!confirm(`Delete conversation "${conv.title}"?`)) return;
    try {
      const res = await fetch(`/api/v1/conversations/${conv.id}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        setConversations(prev => prev.filter(c => c.id !== conv.id));
        if (activeConvId === conv.id) setActiveConvId(null);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [activeConvId]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      localStorage.removeItem('ai_chan_user');
      localStorage.removeItem('ai_chan_token');
    } finally {
      router.push('/login');
    }
  }, [router]);

  // Handle new chat from sidebar
  const handleNewChat = useCallback(async () => {
    const id = await createConversation();
    if (id) {
      setActiveConvId(id);
      router.push('/chat');
    }
  }, [createConversation, router]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((convId: string) => {
    setActiveConvId(convId);
    if (pathname !== '/chat') router.push('/chat');
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-base)', color: 'var(--text-muted)', fontSize: '0.85rem',
      }}>
        Loading…
      </div>
    );
  }

  const ctx: AppContextValue = {
    currentUser,
    conversations,
    activeConvId,
    setActiveConvId,
    fetchConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    sidebarCollapsed,
    setSidebarCollapsed,
    handleLogout,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        {/* Global header */}
        <DesktopHeader
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Body: sidebar + main */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <Sidebar
            conversations={conversations}
            activeConvId={activeConvId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onRenameConversation={renameConversation}
            onDeleteConversation={deleteConversation}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          />

          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

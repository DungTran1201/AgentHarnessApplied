'use client';

import { createContext, useContext } from 'react';
import { Conversation } from '@/components/chat/Sidebar';

export interface AppContextValue {
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

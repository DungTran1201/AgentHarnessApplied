'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  is_pinned?: boolean;
}

interface SidebarProps {
  activeTab: 'home' | 'chat' | 'models' | 'prompts' | 'knowledge' | 'settings';
  onTabChange: (tab: 'home' | 'chat' | 'models' | 'prompts' | 'knowledge' | 'settings') => void;
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (conv: Conversation) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  conversations,
  activeConvId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    // Default initial pinned sample IDs for authentic feel
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Filter conversations
  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Separate pinned and unpinned
  const pinnedList = useMemo(() => {
    return filteredConvs.filter(c => pinnedIds.includes(c.id));
  }, [filteredConvs, pinnedIds]);

  const regularList = useMemo(() => {
    return filteredConvs.filter(c => !pinnedIds.includes(c.id));
  }, [filteredConvs, pinnedIds]);

  // Navigation Items definition
  const navItems = [
    { key: 'home', label: 'Home', icon: '🏠', href: null },
    { key: 'chat', label: 'Chat', icon: '💬', href: null },
    { key: 'models', label: 'Model Explorer', icon: '🧩', href: '/dashboard' },
    { key: 'prompts', label: 'Prompt Library', icon: '📜', href: '/prompts' },
    { key: 'knowledge', label: 'Knowledge Base', icon: '📚', href: '/projects' },
    { key: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ] as const;

  return (
    <aside
      style={{
        width: collapsed ? '68px' : '280px',
        minWidth: collapsed ? '68px' : '280px',
        backgroundColor: '#0E0F1B',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 54px)',
        transition: 'width var(--transition-normal), min-width var(--transition-normal)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
        userSelect: 'none',
      }}
    >
      {/* 1. Header action: + New Chat */}
      <div style={{ padding: collapsed ? '12px 10px' : '16px 14px 10px' }}>
        <button
          type="button"
          onClick={onNewChat}
          style={{
            width: '100%',
            height: '42px',
            background: 'var(--accent-gradient)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            padding: collapsed ? '0' : '0 16px',
            boxShadow: 'var(--accent-glow-sm)',
            transition: 'all var(--transition-fast)',
          }}
          title="Bắt đầu cuộc trò chuyện mới"
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* 2. Search input (hidden when collapsed) */}
      {!collapsed && (
        <div style={{ padding: '0 14px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#171821',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Navigation Links */}
      <nav style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {navItems.map(item => {
          const isActive = activeTab === item.key;
          const content = (
            <div
              onClick={() => onTabChange(item.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(167, 139, 250, 0.16)' : 'transparent',
                border: isActive ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          );

          return item.href ? (
            <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>
              {content}
            </Link>
          ) : (
            <React.Fragment key={item.key}>{content}</React.Fragment>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 14px 12px' }} />

      {/* 4. Recent Chats Section (with scroll) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {!collapsed && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 6px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Chats
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {conversations.length}
            </span>
          </div>
        )}

        {/* Pinned Section */}
        {pinnedList.length > 0 && !collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem' }}>📌</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>Pinned</span>
            </div>
            {pinnedList.map(conv => renderConvItem(conv, true))}
          </div>
        )}

        {/* Regular list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {!collapsed && (
            <div style={{ padding: '0 6px', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {pinnedList.length > 0 ? 'Today & Earlier' : 'All Conversations'}
            </div>
          )}
          {regularList.length === 0 && !collapsed ? (
            <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
            </div>
          ) : (
            regularList.map(conv => renderConvItem(conv, false))
          )}
        </div>
      </div>

      {/* 5. Bottom Cute AI-Chan Quote Card (shown when expanded) */}
      {!collapsed ? (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(23, 24, 33, 0.6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(31, 27, 43, 0.9) 0%, rgba(23, 24, 33, 0.9) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
                border: '2px solid rgba(196, 181, 253, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.4)',
              }}
            >
              🌸
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#F3F1FF', fontWeight: 500, lineHeight: 1.3 }}>
                "Cố lên nhé! Bạn làm được mà! 💜"
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, marginTop: '2px' }}>
                - AI-Chan
              </span>
            </div>
          </div>

          {/* Collapse sidebar button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
              title="Thu gọn thanh điều hướng"
            >
              ◀ Thu gọn
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            title="Mở rộng thanh điều hướng"
          >
            ▶
          </button>
        </div>
      )}
    </aside>
  );

  function renderConvItem(conv: Conversation, isPinned: boolean) {
    const isSelected = activeConvId === conv.id;
    const isEditing = editingId === conv.id;

    if (collapsed) {
      return (
        <div
          key={conv.id}
          onClick={() => onSelectConversation(conv.id)}
          style={{
            width: '38px',
            height: '38px',
            margin: '0 auto',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: isSelected ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
            border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
          }}
          title={conv.title}
        >
          📄
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className="conv-item-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'rgba(167, 139, 250, 0.14)' : 'transparent',
          border: isSelected ? '1px solid rgba(167, 139, 250, 0.28)' : '1px solid transparent',
          transition: 'all var(--transition-fast)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>📄</span>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => handleSaveRename(conv.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename(conv.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              style={{
                width: '100%',
                background: '#171821',
                border: '1px solid var(--primary)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                borderRadius: '4px',
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: '0.8rem',
                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {conv.title}
            </span>
          )}
        </div>

        {/* Action icons on row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
          <button
            type="button"
            onClick={e => togglePin(conv.id, e)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: isPinned ? 'var(--accent)' : 'var(--text-muted)',
              opacity: isPinned ? 1 : 0.6,
              padding: '2px',
            }}
            title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
          >
            📌
          </button>
          <button
            type="button"
            onClick={e => handleStartRename(conv, e)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              padding: '2px',
            }}
            title="Đổi tên"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDeleteConversation(conv);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              padding: '2px',
            }}
            title="Xóa cuộc trò chuyện"
          >
            🗑
          </button>
        </div>
      </div>
    );
  }
}

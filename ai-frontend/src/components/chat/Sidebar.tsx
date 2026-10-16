'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  is_pinned?: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (conv: Conversation) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isDiscordLinked?: boolean;
  // Legacy compat – no longer needed but kept so old consumers don't break
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

import Icon, { IconName } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

// ── Nav items – driven by pathname ─────────────────────────────────────
export const NAV_ITEMS: { key: string; label: string; icon: IconName; href: string }[] = [
  { key: 'chat',        label: 'Chat',            icon: 'chat',      href: '/chat' },
  { key: 'projects',    label: 'Projects',        icon: 'projects',  href: '/projects' },
  { key: 'bot',         label: 'Bot',             icon: 'bot',       href: '/bot/discord' },
  { key: 'prompts',     label: 'System Prompts',  icon: 'prompts',   href: '/prompts' },
  { key: 'skills',      label: 'Skills',          icon: 'skills',    href: '/skills' },
  { key: 'dashboard',   label: 'Dashboard',       icon: 'dashboard', href: '/dashboard' },
  { key: 'settings',    label: 'Settings',        icon: 'settings',  href: '/settings' },
];


export function navIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href.startsWith('/bot') && (pathname === '/bot' || pathname.startsWith('/bot/'))) return true;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar({
  conversations,
  activeConvId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  collapsed,
  onToggleCollapse,
  isDiscordLinked: propDiscordLinked,
}: SidebarProps) {
  const pathname = usePathname();
  const appContext = useApp();
  const isDiscordLinked = propDiscordLinked !== undefined ? propDiscordLinked : appContext?.isDiscordLinked ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) onRenameConversation(id, editTitle.trim());
    setEditingId(null);
  };

  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const pinnedList  = useMemo(() => filteredConvs.filter(c => pinnedIds.includes(c.id)), [filteredConvs, pinnedIds]);
  const regularList = useMemo(() => filteredConvs.filter(c => !pinnedIds.includes(c.id)), [filteredConvs, pinnedIds]);

  const w = collapsed ? '56px' : '256px';
  const isChat = pathname === '/chat' || pathname.startsWith('/chat/');

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: w,
        minWidth: w,
        backgroundColor: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width var(--transition-normal), min-width var(--transition-normal)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* New Chat */}
      <div style={{ padding: collapsed ? '10px 8px' : '12px 10px 8px' }}>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          style={{
            width: '100%', height: '34px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '7px', padding: collapsed ? '0' : '0 10px',
            transition: 'background var(--transition-fast), color var(--transition-fast)',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <Icon name="plus" size={14} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Search (chat route only) */}
      {!collapsed && isChat && (
        <div style={{ padding: '0 10px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '5px 10px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }} aria-hidden="true">
              <Icon name="search" size={13} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats…"
              autoComplete="off"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', lineHeight: 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary nav */}
      <nav aria-label="Primary" style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {NAV_ITEMS.map(item => {
          const isBot = item.key === 'bot';
          const isLocked = isBot && !isDiscordLinked;
          const isActive = navIsActive(pathname, item.href);
          const href = isLocked ? '/settings?tab=connections' : item.href;
          const tooltip = isLocked
            ? (collapsed ? 'Bot (Locked: Connect Discord account)' : 'Connect your Discord account to unlock Bot Management')
            : (collapsed ? item.label : undefined);
          const ariaLabel = isLocked
            ? 'Bot (Locked: Connect your Discord account to unlock Bot Management)'
            : item.label;

          return (
            <Link
              key={item.key}
              href={href}
              aria-current={isActive && !isLocked ? 'page' : undefined}
              aria-label={ariaLabel}
              title={tooltip}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: collapsed ? '8px 0' : '7px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: isActive && !isLocked ? 600 : 400,
                  color: isLocked
                    ? 'var(--text-disabled)'
                    : (isActive ? 'var(--text-primary)' : 'var(--text-muted)'),
                  backgroundColor: isActive && !isLocked ? 'var(--bg-selected)' : 'transparent',
                  transition: 'color var(--transition-fast), background var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  if (isLocked) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  } else if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (isLocked) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-disabled)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  } else if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={15} />
                  {isLocked && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -3,
                        right: -4,
                        backgroundColor: 'var(--bg-base)',
                        borderRadius: '50%',
                        padding: '1px',
                        display: 'flex',
                        color: 'var(--text-disabled)',
                      }}
                      aria-hidden="true"
                    >
                      <Icon name="lock" size={9} />
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {isLocked && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginLeft: '6px',
                          color: 'var(--text-disabled)',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        <Icon name="lock" size={11} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '2px 10px 8px' }} />

      {/* Conversation history (chat route only) */}
      {isChat && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chats</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>{conversations.length}</span>
            </div>
          )}

          {pinnedList.length > 0 && !collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-disabled)', display: 'flex' }} aria-hidden="true"><Icon name="pin" size={11} /></span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pinned</span>
              </div>
              {pinnedList.map(conv => renderConvItem(conv, true))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {!collapsed && pinnedList.length > 0 && (
              <div style={{ padding: '0 4px', marginBottom: '2px', fontSize: '0.68rem', color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent</div>
            )}
            {regularList.length === 0 && !collapsed && (
              <div style={{ padding: '12px 6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-disabled)' }}>
                {searchQuery ? 'No chats found' : 'No conversations yet'}
              </div>
            )}
            {regularList.map(conv => renderConvItem(conv, false))}
          </div>
        </div>
      )}

      {/* Spacer when not in chat (no conversation list) */}
      {!isChat && <div style={{ flex: 1 }} />}

      {/* Collapse toggle */}
      <div style={{ padding: '8px 8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer',
            padding: '4px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
        </button>
      </div>
    </aside>
  );

  function renderConvItem(conv: Conversation, isPinned: boolean) {
    const isSelected = activeConvId === conv.id;
    const isEditing  = editingId === conv.id;

    if (collapsed) {
      return (
        <button
          key={conv.id}
          type="button"
          onClick={() => onSelectConversation(conv.id)}
          title={conv.title}
          aria-label={conv.title}
          style={{
            width: '36px', height: '32px', margin: '0 auto',
            borderRadius: 'var(--radius-sm)',
            border: isSelected ? '1px solid var(--border-default)' : '1px solid transparent',
            background: isSelected ? 'var(--bg-selected)' : 'transparent',
            color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="doc" size={14} />
        </button>
      );
    }

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') onSelectConversation(conv.id); }}
        aria-current={isSelected ? 'true' : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
          border: '1px solid transparent',
          transition: 'background var(--transition-fast)', outline: 'none', minWidth: 0,
        }}
        onMouseEnter={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          const actions = (e.currentTarget as HTMLElement).querySelector('.conv-actions') as HTMLElement;
          if (actions) actions.style.opacity = '1';
        }}
        onMouseLeave={e => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          const actions = (e.currentTarget as HTMLElement).querySelector('.conv-actions') as HTMLElement;
          if (actions) actions.style.opacity = '0';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <span style={{ color: isSelected ? 'var(--text-secondary)' : 'var(--text-disabled)', flexShrink: 0, display: 'flex' }} aria-hidden="true">
            <Icon name="doc" size={13} />
          </span>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => handleSaveRename(conv.id)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(conv.id); if (e.key === 'Escape') setEditingId(null); }}
              style={{
                width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-focus)',
                color: 'var(--text-primary)', fontSize: '0.78rem', borderRadius: 'var(--radius-xs)',
                padding: '2px 5px', outline: 'none', fontFamily: 'var(--font-sans)',
              }}
            />
          ) : (
            <span style={{
              fontSize: '0.79rem',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isSelected ? 500 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {conv.title}
            </span>
          )}
        </div>

        <div className="conv-actions" style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, marginLeft: '4px', opacity: 0, transition: 'opacity var(--transition-fast)' }}>
          <button type="button" onClick={e => togglePin(conv.id, e)} aria-label={isPinned ? 'Unpin' : 'Pin'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isPinned ? 'var(--accent)' : 'var(--text-disabled)', padding: '3px', borderRadius: 'var(--radius-xs)', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.color = isPinned ? 'var(--accent)' : 'var(--text-disabled)'; }}>
            <Icon name="pin" size={12} />
          </button>
          <button type="button" onClick={e => handleStartRename(conv, e)} aria-label="Rename"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: '3px', borderRadius: 'var(--radius-xs)', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }}>
            <Icon name="edit" size={12} />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onDeleteConversation(conv); }} aria-label="Delete"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: '3px', borderRadius: 'var(--radius-xs)', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }}>
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>
    );
  }
}

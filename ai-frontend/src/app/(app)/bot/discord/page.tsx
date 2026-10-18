'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DiscordBotConfig,
  DiscordGuildItem,
  DiscordBotTestDispatchResponse,
  AgentModel,
  UserQuotaStatus,
  ManagedBotItem,
  BotProjectBinding,
  BotEntity,
  CreateBotData,
  UpdateBotData,
  TestBotConnectionResponse,
  Project,
} from '@/types';
import Icon from '@/components/ui/Icon';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { BotService } from '@/services/botService';
import { ProjectService } from '@/services/projectService';
import { getErrorMessage } from '@/lib/errors';

export default function DiscordBotManagementPage() {
  const router = useRouter();

  // Authentication & Connection State
  const [loading, setLoading] = useState(true);
  const [isDiscordLinked, setIsDiscordLinked] = useState<boolean | null>(null);
  const [discordUser, setDiscordUser] = useState<{ id: string | null; username: string | null; avatar: string | null }>({
    id: null,
    username: null,
    avatar: null,
  });

  // Active Tab: 'registry' | 'pipeline' | 'test' | 'guilds'
  const [activeTab, setActiveTab] = useState<'registry' | 'pipeline' | 'test' | 'guilds'>('registry');

  // Multi-Bot Registry State
  const [bots, setBots] = useState<BotEntity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [botSearch, setBotSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateBotData>({
    name: '',
    alias: '',
    token: '',
    project_id: null,
    trigger_mode: 'MENTION',
    custom_prefix: '!ai',
    system_prompt: 'You are AI-Chan, a helpful and witty Discord AI assistant.',
    max_tokens_per_response: 1000,
  });
  const [showCreateToken, setShowCreateToken] = useState(false);

  const [editingBot, setEditingBot] = useState<BotEntity | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateBotData>({});
  const [showEditToken, setShowEditToken] = useState(false);

  const [linkingBot, setLinkingBot] = useState<BotEntity | null>(null);
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState<string>('');

  const [deletingBot, setDeletingBot] = useState<BotEntity | null>(null);

  const [testResultModal, setTestResultModal] = useState<{
    botName: string;
    result: TestBotConnectionResponse;
  } | null>(null);

  // Legacy & Auxiliary State
  const [config, setConfig] = useState<DiscordBotConfig | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuildItem[]>([]);
  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [quota, setQuota] = useState<UserQuotaStatus | null>(null);
  const [binding, setBinding] = useState<BotProjectBinding | null>(null);
  const [loadingBinding, setLoadingBinding] = useState<boolean>(true);

  // Server List Pagination & Search State
  const [serverSearch, setServerSearch] = useState<string>('');
  const [serverPage, setServerPage] = useState<number>(1);
  const serverPageSize = 5;

  // Test Dispatch Console State
  const [testQuery, setTestQuery] = useState<string>('Hello AI-Chan! Can you introduce yourself?');
  const [dispatching, setDispatching] = useState(false);
  const [testSimResult, setTestSimResult] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const connRes = await fetch('/api/v1/users/me/connections');
      if (connRes.status === 401) {
        router.push('/login');
        return;
      }
      if (!connRes.ok) {
        setIsDiscordLinked(false);
        setLoading(false);
        return;
      }
      const connData = await connRes.json();
      const discordDetails = connData?.connections?.discord;
      const linked = Boolean(discordDetails?.connected && discordDetails?.discord_id);
      setIsDiscordLinked(linked);

      if (!linked) {
        setLoading(false);
        return;
      }

      setDiscordUser({
        id: discordDetails.discord_id,
        username: discordDetails.discord_username,
        avatar: discordDetails.avatar_url,
      });

      // Parallel fetch for bots, projects, guilds, models, and binding
      const [botsData, projectsData, guildsRes, modelsRes, quotaRes, bindRes] = await Promise.all([
        BotService.getBots().catch(() => []),
        ProjectService.getProjects('ACTIVE', 100, 0).catch(() => ({ items: [], total: 0, active_quota: {} as any })),
        fetch('/api/v1/bot/discord/guilds', { credentials: 'include' }).catch(() => null),
        fetch('/api/v1/models?status=ACTIVE', { credentials: 'include' }).catch(() => null),
        fetch('/api/v1/resources/quota', { credentials: 'include' }).catch(() => null),
        BotService.getBotProjectBinding().catch(() => null),
      ]);

      setBots(botsData);
      setProjects(projectsData?.items || []);
      setBinding(bindRes);

      if (guildsRes && guildsRes.ok) {
        const gList: DiscordGuildItem[] = await guildsRes.json();
        setGuilds(gList);
      }

      if (modelsRes && modelsRes.ok) {
        const mList: AgentModel[] = await modelsRes.json();
        setActiveModels(mList);
      }

      if (quotaRes && quotaRes.ok) {
        const qData: UserQuotaStatus = await quotaRes.json();
        setQuota(qData);
      }
    } catch (err: any) {
      setIsDiscordLinked(false);
      showToast('error', getErrorMessage(err, 'Failed to load Discord bot management data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered bots list
  const filteredBots = useMemo(() => {
    return bots.filter(b => {
      const matchSearch =
        b.name.toLowerCase().includes(botSearch.toLowerCase()) ||
        b.alias.toLowerCase().includes(botSearch.toLowerCase()) ||
        (b.project_name && b.project_name.toLowerCase().includes(botSearch.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bots, botSearch, statusFilter]);

  // Handle Create Bot
  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name.trim() || !createFormData.alias.trim() || !createFormData.token.trim()) {
      showToast('error', 'Please fill in Name, Alias, and Bot Token.');
      return;
    }

    setActionLoadingId('create');
    try {
      const newBot = await BotService.createBot(createFormData);
      showToast('success', `Discord Bot '${newBot.name}' created successfully!`);
      setIsCreateModalOpen(false);
      setCreateFormData({
        name: '',
        alias: '',
        token: '',
        project_id: null,
        trigger_mode: 'MENTION',
        custom_prefix: '!ai',
        system_prompt: 'You are AI-Chan, a helpful and witty Discord AI assistant.',
        max_tokens_per_response: 1000,
      });
      setShowCreateToken(false);
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to create bot.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Edit Bot
  const handleOpenEdit = (bot: BotEntity) => {
    setEditingBot(bot);
    setEditFormData({
      name: bot.name,
      alias: bot.alias,
      token: '', // Empty means preserve existing token
      project_id: bot.project_id,
      trigger_mode: (bot.trigger_mode as any) || 'MENTION',
      custom_prefix: bot.custom_prefix,
      system_prompt: bot.system_prompt,
      max_tokens_per_response: bot.max_tokens_per_response,
      is_enabled: bot.is_enabled,
    });
    setShowEditToken(false);
  };

  const handleUpdateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;

    setActionLoadingId(`edit-${editingBot.id}`);
    try {
      const payload: UpdateBotData = { ...editFormData };
      if (!payload.token || !payload.token.trim()) {
        delete payload.token; // Do not send empty token
      }
      await BotService.updateBot(editingBot.id, payload);
      showToast('success', `Updated Bot '${editingBot.name}' successfully!`);
      setEditingBot(null);
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to update bot configuration.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Bot
  const handleDeleteBotConfirm = async () => {
    if (!deletingBot) return;
    setActionLoadingId(`delete-${deletingBot.id}`);
    try {
      await BotService.deleteBot(deletingBot.id);
      showToast('success', `Deleted Bot '${deletingBot.name}' successfully.`);
      setDeletingBot(null);
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to delete bot.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async (bot: BotEntity) => {
    setActionLoadingId(`test-${bot.id}`);
    try {
      const res = await BotService.testConnection(bot.id);
      setTestResultModal({
        botName: bot.name,
        result: res,
      });
      if (res.success) {
        showToast('success', `Connection test passed for ${bot.name}!`);
      } else {
        showToast('error', `Connection test failed: ${res.message}`);
      }
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to test bot credentials.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Connect / Disconnect / Reconnect
  const handleToggleConnection = async (bot: BotEntity) => {
    setActionLoadingId(`toggle-${bot.id}`);
    try {
      if (bot.status === 'CONNECTED' || bot.status === 'CONNECTING') {
        const res = await BotService.disconnectBot(bot.id);
        showToast('info', res.message || `Disconnected ${bot.name}.`);
      } else {
        const res = await BotService.connectBot(bot.id);
        showToast('success', res.message || `Connecting ${bot.name}...`);
      }
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Connection toggle failed.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReconnect = async (bot: BotEntity) => {
    setActionLoadingId(`reconnect-${bot.id}`);
    try {
      const res = await BotService.reconnectBot(bot.id);
      showToast('success', res.message || `Reconnecting ${bot.name}...`);
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Reconnect failed.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Link Project
  const handleOpenLinkModal = (bot: BotEntity) => {
    setLinkingBot(bot);
    setSelectedProjectIdToLink(bot.project_id || '');
  };

  const handleSaveProjectLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingBot) return;

    setActionLoadingId(`link-${linkingBot.id}`);
    try {
      const pId = selectedProjectIdToLink ? selectedProjectIdToLink : null;
      await BotService.linkProject(linkingBot.id, pId);
      showToast('success', pId ? `Linked ${linkingBot.name} to project!` : `Unlinked project from ${linkingBot.name}.`);
      setLinkingBot(null);
      await fetchData();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to link project.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(52, 211, 153, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px #34d399' }}></span>
            Online & Ready
          </span>
        );
      case 'CONNECTING':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(251, 191, 36, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <Icon name="refresh" size={12} className="spin" />
            Connecting...
          </span>
        );
      case 'INVALID_CREDENTIALS':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <Icon name="alert" size={12} />
            Invalid Token
          </span>
        );
      case 'DEGRADED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(249, 115, 22, 0.15)',
            color: '#f97316',
            border: '1px solid rgba(249, 115, 22, 0.3)',
          }}>
            <Icon name="alert" size={12} />
            Degraded Gateway
          </span>
        );
      case 'ERROR':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.3)',
          }}>
            <Icon name="close" size={12} />
            Runtime Error
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(148, 163, 184, 0.12)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.25)',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
            Disconnected
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <Icon name="refresh" size={32} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading Bot Registry & Runtimes...</h3>
        <p style={{ color: 'var(--text-muted)' }}>Verifying credentials and synchronizing Discord session status...</p>
      </div>
    );
  }

  // Not Linked Gate Screen (BR-031 / TC-040)
  if (isDiscordLinked === false) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <PageHeader
          title="Discord Bot Management"
          description="Enterprise Multi-Bot Registry & Runtime Orchestration"
        />
        <div className="card" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(88, 101, 242, 0.1)',
            color: '#5865F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Icon name="bot" size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Discord Account Link Required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            To manage Discord Bots and route prompts to your AI-Chan Projects, your account must be securely linked with Discord.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/settings" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="link" size={16} /> Link Discord in Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          background: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#991b1b' : '#1e3a8a',
          color: '#ffffff',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Icon name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert' : 'info'} size={18} />
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Discord Bot Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Multi-Bot Registry: Run multiple Discord bots independently, protect tokens with AES-256-GCM, and route prompts to dedicated AI-Chan Projects (1:1).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => fetchData()}
            className="btn btn-secondary"
            title="Refresh All"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="refresh" size={16} /> Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="plus" size={16} /> Register New Bot
          </button>
        </div>
      </div>

      {/* Discord User Badge */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Icon name="bot" size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Connected Operator</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{discordUser.username || 'Discord User'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Registered Bots: </span>
            <strong style={{ color: 'var(--color-primary)' }}>{bots.length}</strong>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Active Projects: </span>
            <strong style={{ color: '#34d399' }}>{projects.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-default)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('registry')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'registry' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'registry' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="bot" size={16} /> Bot Registry ({bots.length})
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'pipeline' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'pipeline' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="git" size={16} /> Project Pipeline Binding
        </button>
        <button
          onClick={() => setActiveTab('test')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'test' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'test' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="terminal" size={16} /> Test Dispatch Console
        </button>
        <button
          onClick={() => setActiveTab('guilds')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'guilds' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'guilds' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="cpu" size={16} /> Discord Servers ({guilds.length})
        </button>
      </div>

      {/* TAB 1: BOT REGISTRY & RUNTIMES */}
      {activeTab === 'registry' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search bot by name, alias, or linked project..."
                value={botSearch}
                onChange={e => setBotSearch(e.target.value)}
                className="input"
                style={{ width: '100%', maxWidth: '400px' }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input"
                style={{ width: '180px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="CONNECTED">Online / Connected</option>
                <option value="CONNECTING">Connecting</option>
                <option value="DISCONNECTED">Disconnected</option>
                <option value="INVALID_CREDENTIALS">Invalid Credentials</option>
                <option value="ERROR">Error</option>
              </select>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredBots.length} of {bots.length} bot(s)
            </span>
          </div>

          {/* Bots Grid */}
          {filteredBots.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-card)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Icon name="bot" size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {botSearch || statusFilter !== 'ALL' ? 'No bots match your filter.' : 'No Discord Bots Registered Yet'}
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Register your first Discord Bot to connect it with an AI-Chan Project graph and start chatting directly from Discord.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name="plus" size={16} /> Register Bot
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {filteredBots.map(bot => {
                const isLoadingAction = actionLoadingId?.includes(bot.id);
                return (
                  <div
                    key={bot.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: bot.status === 'CONNECTED' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--border-default)',
                      background: 'var(--bg-surface)',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top row: Avatar + Name + Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: '#5865F2',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                          }}>
                            {bot.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{bot.name}</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{bot.alias}</span>
                          </div>
                        </div>
                        {renderStatusBadge(bot.status)}
                      </div>

                      {/* Error Banner if error occurred */}
                      {bot.last_error_summary && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#f87171',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <Icon name="alert" size={14} />
                          <span>{bot.last_error_summary}</span>
                        </div>
                      )}

                      {/* Bot Info Meta */}
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Credential:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {bot.token_last4 ? `••••${bot.token_last4}` : bot.token_configured ? '••••••••' : 'Not Configured'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Linked Project:</span>
                          {bot.project_id ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}>
                              {bot.project_name || bot.project_id}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                              Unlinked (No Project)
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Trigger Mode:</span>
                          <span style={{ fontWeight: 500 }}>{bot.trigger_mode} {bot.trigger_mode === 'PREFIX' && `(${bot.custom_prefix})`}</span>
                        </div>
                        {bot.last_connected_at && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Last Connected:</span>
                            <span>{new Date(bot.last_connected_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleToggleConnection(bot)}
                          disabled={isLoadingAction}
                          className={bot.status === 'CONNECTED' ? 'btn btn-secondary' : 'btn btn-primary'}
                          style={{ flex: 1, fontSize: '0.85rem', padding: '6px 12px' }}
                        >
                          {bot.status === 'CONNECTED' ? (
                            <><Icon name="stop" size={14} /> Disconnect</>
                          ) : (
                            <><Icon name="play" size={14} /> Connect</>
                          )}
                        </button>
                        <button
                          onClick={() => handleTestConnection(bot)}
                          disabled={isLoadingAction}
                          className="btn btn-secondary"
                          title="Test Token with Discord API"
                          style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                        >
                          <Icon name="check" size={14} /> Test
                        </button>
                        <button
                          onClick={() => handleReconnect(bot)}
                          disabled={isLoadingAction}
                          className="btn btn-secondary"
                          title="Reconnect Gateway"
                          style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                        >
                          <Icon name="refresh" size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenLinkModal(bot)}
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: '0.8rem', padding: '6px 8px' }}
                        >
                          <Icon name="link" size={12} /> {bot.project_id ? 'Switch Project' : 'Link Project'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bot)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          title="Edit Bot Settings"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingBot(bot)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 10px', color: '#f87171' }}
                          title="Delete Bot"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROJECT PIPELINE BINDING */}
      {activeTab === 'pipeline' && (
        <div>
          {binding ? (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Active Project Graph Pipeline</h3>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: binding.is_active ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: binding.is_active ? '#34d399' : '#ef4444',
                }}>
                  {binding.is_active ? 'Pipeline Active' : 'Project Stopped'}
                </span>
              </div>

              {binding.project ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bound Project</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{binding.project.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {binding.project.id}</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected AI Model</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{binding.model?.name || 'No Model Node'}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Provider: {binding.model?.provider || 'Unknown'}</span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>System Prompt</span>
                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{binding.system_prompt?.name || 'Default Prompt'}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skills Attached: {binding.skills.length}</span>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No project currently bound to the default bot graph.</p>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link href="/projects" className="btn btn-secondary">
                  Open Project Canvas
                </Link>
              </div>
            </div>
          ) : (
            <p>Loading pipeline binding...</p>
          )}
        </div>
      )}

      {/* TAB 3: TEST DISPATCH CONSOLE */}
      {activeTab === 'test' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Discord Dispatch Simulator</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Simulate a message arriving from Discord to verify prompt execution through the linked Project graph.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Select Discord Bot:
            </label>
            <select
              className="input"
              style={{ width: '100%', maxWidth: '400px' }}
              onChange={e => {
                const b = bots.find(x => x.id === e.target.value);
                // Can bind or select bot for testing
              }}
            >
              {bots.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} (@{b.alias}) — {b.project_name ? `Linked to ${b.project_name}` : 'Unlinked'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Test Query:
            </label>
            <textarea
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              className="input"
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <button
            onClick={async () => {
              setDispatching(true);
              try {
                const res = await fetch('/api/v1/prompt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    prompt: testQuery,
                    model: 'default',
                    metadata: {
                      user_id: discordUser.id || 'test_user',
                      channel_id: 'test_channel_123',
                      interaction_id: `sim_${Date.now()}`,
                      bot_config_id: bots[0]?.id,
                    },
                  }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.detail || 'Dispatch failed.');
                }
                const data = await res.json();
                setTestSimResult(data.response || 'Prompt executed successfully.');
                showToast('success', 'Prompt executed successfully!');
              } catch (err: any) {
                showToast('error', getErrorMessage(err, 'Dispatch test failed.'));
              } finally {
                setDispatching(false);
              }
            }}
            disabled={dispatching}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {dispatching ? <Icon name="refresh" size={16} className="spin" /> : <Icon name="play" size={16} />}
            Simulate Prompt
          </button>

          {testSimResult && (
            <div style={{ marginTop: '1.5rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Execution Result</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {testSimResult}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DISCORD SERVERS */}
      {activeTab === 'guilds' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Authorized Discord Servers</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Servers where your Discord user account has Manage Server permissions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {guilds.map(guild => (
              <div key={guild.id} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
                  {guild.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{guild.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {guild.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE BOT MODAL */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && actionLoadingId !== 'create') {
              setIsCreateModalOpen(false);
            }
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>Register New Discord Bot</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Credentials are encrypted using AES-256-GCM before storage. Tokens are never returned in plain text.
            </p>

            <form onSubmit={handleCreateBot}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Bot Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dororo Production Bot"
                  value={createFormData.name}
                  onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Unique Alias / Slug * (alphanumeric, dashes, underscores)
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_\-]+$"
                  placeholder="e.g., dororo-prod"
                  value={createFormData.alias}
                  onChange={e => setCreateFormData({ ...createFormData, alias: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Discord Bot Token * (From Discord Developer Portal)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreateToken ? 'text' : 'password'}
                    required
                    placeholder="Paste your Discord Bot Token here"
                    value={createFormData.token}
                    onChange={e => setCreateFormData({ ...createFormData, token: e.target.value })}
                    className="input"
                    style={{ width: '100%', paddingRight: '40px', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateToken(!showCreateToken)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{showCreateToken ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Initial Project Link (Optional, 1:1)
                </label>
                <select
                  value={createFormData.project_id || ''}
                  onChange={e => setCreateFormData({ ...createFormData, project_id: e.target.value || null })}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">No Project (Unlinked)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Trigger Mode
                  </label>
                  <select
                    value={createFormData.trigger_mode}
                    onChange={e => setCreateFormData({ ...createFormData, trigger_mode: e.target.value as any })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="MENTION">Mention (@Bot)</option>
                    <option value="PREFIX">Custom Prefix</option>
                    <option value="SLASH_COMMAND">Slash Commands (/ask)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Prefix (if Prefix Mode)
                  </label>
                  <input
                    type="text"
                    disabled={createFormData.trigger_mode !== 'PREFIX'}
                    value={createFormData.custom_prefix}
                    onChange={e => setCreateFormData({ ...createFormData, custom_prefix: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={actionLoadingId === 'create'}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === 'create'}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {actionLoadingId === 'create' ? <Icon name="refresh" size={16} className="spin" /> : <Icon name="check" size={16} />}
                  Register Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOT MODAL */}
      {editingBot && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !actionLoadingId) {
              setEditingBot(null);
            }
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>Edit Bot: {editingBot.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Modify bot metadata. Leave the token input empty to preserve your current encrypted credential.
            </p>

            <form onSubmit={handleUpdateBot}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Bot Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Alias / Slug
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_\-]+$"
                  value={editFormData.alias || ''}
                  onChange={e => setEditFormData({ ...editFormData, alias: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Replace Token (Optional — Leave blank to keep existing token)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditToken ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing token"
                    value={editFormData.token || ''}
                    onChange={e => setEditFormData({ ...editFormData, token: e.target.value })}
                    className="input"
                    style={{ width: '100%', paddingRight: '40px', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditToken(!showEditToken)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{showEditToken ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  System Prompt
                </label>
                <textarea
                  rows={2}
                  value={editFormData.system_prompt || ''}
                  onChange={e => setEditFormData({ ...editFormData, system_prompt: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  disabled={Boolean(actionLoadingId)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoadingId)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {actionLoadingId ? <Icon name="refresh" size={16} className="spin" /> : <Icon name="check" size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK PROJECT MODAL (1:1 Binding) */}
      {linkingBot && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !actionLoadingId) {
              setLinkingBot(null);
            }
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Link Bot to Project</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Assign <strong>{linkingBot.name}</strong> to a specific AI-Chan Project. Strict 1:1 rule: assigning a project that is already linked to another bot will reassign it here.
            </p>

            <form onSubmit={handleSaveProjectLink}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Target Project:
                </label>
                <select
                  value={selectedProjectIdToLink}
                  onChange={e => setSelectedProjectIdToLink(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">None (Unlink project from this bot)</option>
                  {projects.map(p => {
                    const alreadyBoundBot = bots.find(b => b.project_id === p.id && b.id !== linkingBot.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {alreadyBoundBot ? `[Currently on: ${alreadyBoundBot.name}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedProjectIdToLink && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  marginBottom: '1.5rem',
                  color: 'var(--text-secondary)',
                }}>
                  <Icon name="info" size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Prompts sent to this Discord Bot will be routed exclusively to this Project&apos;s graph pipeline.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setLinkingBot(null)}
                  disabled={Boolean(actionLoadingId)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoadingId)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {actionLoadingId ? <Icon name="refresh" size={16} className="spin" /> : <Icon name="check" size={16} />}
                  Confirm Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST CONNECTION MODAL */}
      {testResultModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setTestResultModal(null)}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: testResultModal.result.success ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: testResultModal.result.success ? '#34d399' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Icon name={testResultModal.result.success ? 'check' : 'alert'} size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {testResultModal.result.success ? 'Token Verification Passed!' : 'Token Verification Failed'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {testResultModal.result.message}
            </p>

            {testResultModal.result.bot_username && (
              <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bot Username:</span>
                  <strong>{testResultModal.result.bot_username}</strong>
                </div>
                {testResultModal.result.bot_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Application ID:</span>
                    <span style={{ fontFamily: 'monospace' }}>{testResultModal.result.bot_id}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setTestResultModal(null)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingBot)}
        title="Delete Discord Bot"
        message={
          <div>
            Are you sure you want to delete <strong>{deletingBot?.name}</strong>?
            <br />
            This will terminate its active Discord Gateway connection and remove all associated configuration.
          </div>
        }
        confirmLabel="Delete Bot"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={Boolean(actionLoadingId)}
        onConfirm={handleDeleteBotConfirm}
        onCancel={() => setDeletingBot(null)}
      />
    </div>
  );
}

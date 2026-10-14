'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DiscordBotConfig,
  DiscordGuildItem,
  DiscordBotTestDispatchResponse,
  AgentModel,
  UserQuotaStatus,
  ManagedBotItem,
  BotProjectBinding
} from '@/types';
import Icon from '@/components/ui/Icon';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { getErrorMessage } from '@/lib/errors';

export default function DiscordBotManagementPage() {
  const router = useRouter();

  // Authentication & Connection State
  const [loading, setLoading] = useState(true);
  const [isDiscordLinked, setIsDiscordLinked] = useState<boolean | null>(null);
  const [discordUser, setDiscordUser] = useState<{ id: string | null; username: string | null; avatar: string | null }>({
    id: null,
    username: null,
    avatar: null
  });

  // Bot Entity & Configuration State
  const [managedBots, setManagedBots] = useState<ManagedBotItem[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [config, setConfig] = useState<DiscordBotConfig | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuildItem[]>([]);
  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [quota, setQuota] = useState<UserQuotaStatus | null>(null);

  // Form Mutation State
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [selectedGuildName, setSelectedGuildName] = useState<string>('');
  const [activeModelId, setActiveModelId] = useState<string>('gemini-3.8-flash');
  const [triggerMode, setTriggerMode] = useState<'MENTION' | 'PREFIX' | 'SLASH_COMMAND'>('MENTION');
  const [customPrefix, setCustomPrefix] = useState<string>('!ai');
  const [systemPrompt, setSystemPrompt] = useState<string>('You are AI-Chan, a helpful and witty Discord AI assistant.');
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [syncToWeb, setSyncToWeb] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Active Project Graph Binding
  const [binding, setBinding] = useState<BotProjectBinding | null>(null);
  const [loadingBinding, setLoadingBinding] = useState<boolean>(true);

  // Server List Pagination & Search State
  const [serverSearch, setServerSearch] = useState<string>('');
  const [serverPage, setServerPage] = useState<number>(1);
  const serverPageSize = 5;

  // Test Dispatch Console State
  const [testQuery, setTestQuery] = useState<string>('Hello AI-Chan! Can you introduce yourself?');
  const [dispatching, setDispatching] = useState(false);
  const [testResult, setTestResult] = useState<DiscordBotTestDispatchResponse | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial user and connection data
  const fetchInitialData = async () => {
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
        avatar: discordDetails.avatar_url
      });

      const [cfgRes, guildsRes, modelsRes, quotaRes, botsRes, bindRes] = await Promise.all([
        fetch('/api/v1/bot/discord/config', { credentials: 'include' }),
        fetch('/api/v1/bot/discord/guilds', { credentials: 'include' }),
        fetch('/api/v1/models?status=ACTIVE', { credentials: 'include' }),
        fetch('/api/v1/resources/quota', { credentials: 'include' }),
        fetch('/api/v1/bot/discord/bots', { credentials: 'include' }),
        fetch('/api/v1/bot/discord/binding', { credentials: 'include' })
      ]);

      if (bindRes.ok) {
        const bData: BotProjectBinding = await bindRes.json();
        setBinding(bData);
      }

      if (cfgRes.ok) {
        const cfgData: DiscordBotConfig = await cfgRes.json();
        setConfig(cfgData);
        setSelectedGuildId(cfgData.guild_id || '');
        setSelectedGuildName(cfgData.guild_name || '');
        if (cfgData.active_model_id) setActiveModelId(cfgData.active_model_id);
        if (cfgData.trigger_mode) setTriggerMode(cfgData.trigger_mode);
        if (cfgData.custom_prefix) setCustomPrefix(cfgData.custom_prefix);
        if (cfgData.system_prompt) setSystemPrompt(cfgData.system_prompt);
        if (cfgData.max_tokens_per_response) setMaxTokens(cfgData.max_tokens_per_response);
        setIsEnabled(cfgData.is_enabled !== undefined ? cfgData.is_enabled : true);
        setSyncToWeb(cfgData.sync_to_web !== undefined ? cfgData.sync_to_web : true);
      }

      if (botsRes.ok) {
        const bList: ManagedBotItem[] = await botsRes.json();
        setManagedBots(bList);
        if (bList.length > 0) {
          setSelectedBotId(bList[0].id);
        }
      } else {
        const fallbackBot: ManagedBotItem = {
          id: 'bot_dororo',
          name: 'Dororo (AI-Chan Discord Bot)',
          bot_username: 'Dororo',
          bot_id: '1548888415951519744',
          platform: 'discord',
          status: 'ONLINE',
          is_enabled: true,
          guild_name: 'AI-Chan Official Community',
          connected_guilds: ['AI-Chan Official Community'],
          active_model_id: 'gemini-3.8-flash',
          trigger_mode: 'MENTION'
        };
        setManagedBots([fallbackBot]);
        setSelectedBotId(fallbackBot.id);
      }

      if (guildsRes.ok) {
        const gList: DiscordGuildItem[] = await guildsRes.json();
        setGuilds(gList);
        if (!selectedGuildId && gList.length > 0) {
          const defaultAdminGuild = gList.find(g => g.has_admin_rights) || gList[0];
          setSelectedGuildId(defaultAdminGuild.id);
          setSelectedGuildName(defaultAdminGuild.name);
        }
      }

      if (modelsRes.ok) {
        const mList: AgentModel[] = await modelsRes.json();
        setActiveModels(mList);
      }

      if (quotaRes.ok) {
        const qData: UserQuotaStatus = await quotaRes.json();
        setQuota(qData);
      }
    } catch (err: any) {
      setIsDiscordLinked(false);
      showToast('error', getErrorMessage(err, 'Failed to load Discord bot configuration.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchBinding = async () => {
    try {
      setLoadingBinding(true);
      const res = await fetch('/api/v1/bot/discord/binding', { credentials: 'include' });
      if (res.ok) {
        const bData: BotProjectBinding = await res.json();
        setBinding(bData);
      }
    } catch {
      // ignore
    } finally {
      setLoadingBinding(false);
    }
  };

  const handleActivateProject = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${projId}/activate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to activate project');
      }
      showToast('success', 'Project activated! Bot is now online and ready on Discord.');
      await Promise.all([fetchBinding(), fetchInitialData()]);
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to activate project.'));
    }
  };

  // Save Bot Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId) {
      showToast('error', 'Please select a Discord server to apply settings.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<DiscordBotConfig> = {
        guild_id: selectedGuildId,
        guild_name: selectedGuildName,
        trigger_mode: triggerMode,
        custom_prefix: triggerMode === 'PREFIX' ? customPrefix : undefined,
        is_enabled: isEnabled,
        sync_to_web: syncToWeb
      };

      const res = await fetch('/api/v1/bot/discord/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save Discord bot configuration.');
      }

      const updated: DiscordBotConfig = await res.json();
      setConfig(updated);
      showToast('success', 'Discord bot settings saved successfully.');
      fetchBinding();
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Could not save configuration.'));
    } finally {
      setSaving(false);
    }
  };

  // Test Dispatch
  const handleTestDispatch = async () => {
    if (!testQuery.trim()) {
      showToast('error', 'Please enter a test query.');
      return;
    }
    if (!selectedGuildId) {
      showToast('error', 'Please select a Discord server.');
      return;
    }

    setDispatching(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/bot/discord/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          guild_id: selectedGuildId,
          guild_name: selectedGuildName,
          model_id: binding?.model?.id || undefined,
          system_prompt: systemPrompt,
          sync_to_web: syncToWeb
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Test dispatch request failed.');
      }

      const data: DiscordBotTestDispatchResponse = await res.json();
      setTestResult(data);

      if (data.remaining_quota) {
        setQuota(prev => ({
          user_id: prev?.user_id || '',
          daily_token_limit: data.remaining_quota.daily_token_limit,
          daily_tokens_used: data.remaining_quota.daily_tokens_used,
          percent_used: data.remaining_quota.percent_used,
          warning_80: data.remaining_quota.percent_used >= 80,
          reset_at: data.remaining_quota.reset_at
        }));
      }
      showToast('success', 'Bot responded and synced quota successfully.');
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Test dispatch failed.'));
    } finally {
      setDispatching(false);
    }
  };

  const applyPersonaPreset = (promptText: string) => {
    setSystemPrompt(promptText);
    showToast('info', 'Applied suggested persona preset.');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading Discord bot settings...
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? 'var(--danger-bg)' : 'var(--bg-surface)',
          color: toast.type === 'error' ? 'var(--danger)' : '#f8fafc',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? 'var(--danger-border)' : 'var(--border-subtle)'}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem'
        }}>
          <Icon name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert' : 'chat'} size={14} />
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Discord Bot Integration"
        description="Route AI models, customize persona instructions, and synchronize token quota for Discord servers."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/chat" className="btn btn-secondary">
              <Icon name="chat" size={14} />
              Web Chat
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              <Icon name="dashboard" size={14} />
              Telemetry
            </Link>
          </div>
        }
      />

      {/* Unlinked Discord Guard */}
      {!isDiscordLinked && (
        <div className="card" style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          maxWidth: 620,
          margin: '2rem auto'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(88, 101, 242, 0.15)',
            color: '#5865F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            border: '1px solid rgba(88, 101, 242, 0.3)'
          }}>
            <Icon name="lock" size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Discord Account Connection Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            To manage server permissions, route AI models, and enforce token quotas for Discord bots, connect your Discord account in Settings.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link href="/settings?tab=connections" className="btn btn-primary">
              Connect Discord in Settings
            </Link>
          </div>
        </div>
      )}

      {/* Linked Discord Console */}
      {isDiscordLinked && (
        <div>
          {/* Top Status & Unified Quota Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Identity Card */}
            <div className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(88, 101, 242, 0.2)',
                  border: '1px solid rgba(88, 101, 242, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: '#fff',
                  overflow: 'hidden'
                }}>
                  {discordUser.avatar ? (
                    <img src={discordUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    discordUser.username ? discordUser.username.slice(0, 2).toUpperCase() : 'DC'
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {discordUser.username || 'Discord User'}
                    </span>
                    <span className="badge badge-success">
                      Connected
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    ID: {discordUser.id}
                  </div>
                </div>
              </div>

              {/* Master Bot Toggle */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Bot Status</div>
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`btn ${isEnabled ? 'btn-secondary' : 'btn-danger'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isEnabled ? 'var(--accent)' : 'var(--danger)',
                    display: 'inline-block'
                  }} />
                  {isEnabled ? 'Active' : 'Paused'}
                </button>
              </div>
            </div>

            {/* Unified Quota Gauge */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Shared Token Quota
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: (quota?.percent_used || 0) >= 100 ? 'var(--danger)' : (quota?.percent_used || 0) >= 80 ? '#f59e0b' : 'var(--accent)'
                }}>
                  {quota?.daily_tokens_used?.toLocaleString() || 0} / {quota?.daily_token_limit?.toLocaleString() || 100000} ({quota?.percent_used || 0}%)
                </span>
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, quota?.percent_used || 0)}%`,
                  background: (quota?.percent_used || 0) >= 100
                    ? 'var(--danger)'
                    : (quota?.percent_used || 0) >= 80
                    ? '#f59e0b'
                    : 'var(--accent)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Web + Discord shared token pool</span>
                <span>Resets at 00:00 UTC</span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
            {/* Left Column: Bots, Servers & Test Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Managed AI Bots Section (Danh Sách Bot Khả Dụng) */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="bot" size={16} style={{ color: '#818cf8' }} />
                      Managed AI Bots (Danh Sách Bot)
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Thực thể Bot AI khả dụng kết nối vào Model trong Project Graph của AI-Chan.
                    </p>
                  </div>
                  <span className="badge badge-neutral">
                    {managedBots.length || 1} bot
                  </span>
                </div>

                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', paddingRight: '4px' }}>
                  {(managedBots.length > 0 ? managedBots : [
                    {
                      id: config?.id || 'bot_dororo',
                      name: 'Dororo (AI-Chan Discord Bot)',
                      bot_username: 'Dororo',
                      bot_id: '1548888415951519744',
                      platform: 'discord',
                      status: isEnabled ? 'ONLINE' : 'PAUSED',
                      is_enabled: isEnabled,
                      guild_name: selectedGuildName || 'AI-Chan Official Community',
                      connected_guilds: ['AI-Chan Official Community'],
                      active_model_id: activeModelId,
                      trigger_mode: triggerMode
                    }
                  ]).map((bot) => {
                    const isSelected = selectedBotId === bot.id || managedBots.length <= 1;
                    return (
                      <div
                        key={bot.id}
                        onClick={() => setSelectedBotId(bot.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-subtle)',
                          border: `1.5px solid ${isSelected ? '#6366f1' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '1.1rem',
                              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                            }}>
                              🤖
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {bot.name}
                                <span className={`badge ${bot.status === 'ONLINE' || isEnabled ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                                  {bot.status === 'ONLINE' || isEnabled ? 'Online & Ready' : 'Paused'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                App ID: {bot.bot_id || '1548888415951519744'} • Gateway Active
                              </div>
                            </div>
                          </div>

                          <div>
                            {isSelected ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Selected</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select</span>
                            )}
                          </div>
                        </div>

                        {/* Bot Capabilities & Route Info */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-surface)',
                          padding: '6px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--border-subtle)',
                          flexWrap: 'wrap'
                        }}>
                          <span>Project: <strong style={{ color: binding?.is_bound ? 'var(--accent)' : '#f59e0b' }}>{binding?.project?.name || bot.bound_project_name || 'Not Bound'}</strong> {binding?.project && <span className={`badge ${binding.is_active ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>{binding.project.status}</span>}</span>
                          <span>•</span>
                          <span>Model: <strong style={{ color: 'var(--text-primary)' }}>{binding?.model?.name || bot.active_model_id || 'No Model'}</strong></span>
                          <span>•</span>
                          <span>Triggers: <strong style={{ color: '#818cf8' }}>@{bot.bot_username || 'Dororo'}, /ask</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  💡 <strong>Kiến trúc hệ thống:</strong> Trong AI-Chan, <strong>Bot</strong> là thực thể độc lập nhận diện các lệnh từ người dùng. Node <strong>Model LLM</strong> trên canvas kết nối trực tiếp đến Bot (thay vì nối đến Server), cho phép Bot xử lý thông điệp gửi từ bất kỳ Server nào hay Direct Message (DM) và kích hoạt mô hình.
                </div>
              </div>

              {/* 2. Connected Discord Servers Section */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Connected Discord Servers for Dororo
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Máy chủ Discord mà Bot đang tham gia hoặc bạn có quyền Administrator / Manage Server.
                    </p>
                  </div>
                  <span className="badge badge-neutral">
                    {guilds.length} servers
                  </span>
                </div>

                {/* Filter Servers Search */}
                {guilds.length > 3 && (
                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Search servers..."
                      className="input"
                      value={serverSearch}
                      onChange={e => {
                        setServerSearch(e.target.value);
                        setServerPage(1);
                      }}
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    />
                  </div>
                )}

                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', paddingRight: '4px' }}>
                  {(() => {
                    const filteredGuilds = guilds.filter(g =>
                      !serverSearch.trim() || g.name.toLowerCase().includes(serverSearch.toLowerCase().trim())
                    );
                    const paginatedGuilds = filteredGuilds.slice((serverPage - 1) * serverPageSize, serverPage * serverPageSize);

                    if (paginatedGuilds.length === 0) {
                      return (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          No servers match your search.
                        </div>
                      );
                    }

                    return paginatedGuilds.map((g) => {
                      const isSelected = selectedGuildId === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            if (g.has_admin_rights) {
                              setSelectedGuildId(g.id);
                              setSelectedGuildName(g.name);
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(88, 101, 242, 0.12)' : 'var(--bg-subtle)',
                            border: `1px solid ${isSelected ? '#5865F2' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: g.has_admin_rights ? 'pointer' : 'not-allowed',
                            opacity: g.has_admin_rights ? 1 : 0.55
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#2f3136',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              color: '#fff',
                              fontSize: '0.8rem',
                              overflow: 'hidden'
                            }}>
                              {g.icon ? (
                                <img src={g.icon} alt={g.name} style={{ width: '100%', height: '100%' }} />
                              ) : (
                                g.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                {g.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  color: g.has_admin_rights ? 'var(--accent)' : 'var(--danger)'
                                }}>
                                  {g.has_admin_rights ? 'Admin Access' : 'Insufficient Rights'}
                                </span>
                                {g.has_bot && (
                                  <span style={{ fontSize: '0.7rem', color: '#5865F2' }}>
                                    • Bot Installed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isSelected ? (
                              <span className="badge badge-success">Selected</span>
                            ) : g.has_admin_rights ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Locked</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Pagination Controls for Servers */}
                {guilds.length > serverPageSize && (
                  <Pagination
                    compact
                    currentPage={serverPage}
                    totalItems={guilds.filter(g => !serverSearch.trim() || g.name.toLowerCase().includes(serverSearch.toLowerCase().trim())).length}
                    pageSize={serverPageSize}
                    onPageChange={setServerPage}
                    itemLabel="servers"
                  />
                )}
              </div>

              {/* Instant Test Dispatch Console */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon name="chat" size={16} style={{ color: '#5865F2' }} />
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Test Dispatch Console
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Simulate a Discord prompt dispatch to inspect model routing and token usage.
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <textarea
                    rows={3}
                    className="input"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Enter a prompt to simulate Discord bot response..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      onClick={() => setTestQuery('Explain microservice architecture in 2 sentences.')}
                    >
                      Microservices query
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      onClick={() => setTestQuery('Write a witty welcome message for a new Discord member.')}
                    >
                      Welcome message
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTestDispatch}
                    disabled={dispatching || !isEnabled}
                  >
                    <Icon name="chat" size={14} />
                    {dispatching ? 'Dispatching...' : 'Send Test'}
                  </button>
                </div>

                {/* Dispatch Result */}
                {testResult && (
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    marginTop: 8
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: '#5865F2', fontWeight: 600 }}>
                        {testResult.model_name} ({testResult.provider})
                      </span>
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>{testResult.latency_ms}ms</span>
                        <span>{testResult.tokens_used.total_tokens} tokens</span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      padding: '8px',
                      borderRadius: 4,
                      background: 'var(--bg-surface)'
                    }}>
                      {testResult.reply}
                    </div>

                    {testResult.web_synced && (
                      <div style={{
                        marginTop: 6,
                        fontSize: '0.72rem',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Icon name="check" size={12} />
                        <span>Synced to Web Chat: <em>Discord Bot: {selectedGuildName || 'Discord Session'}</em></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Active Project Graph Binding & Bot Gateway Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Project Graph & Model Resolution Card */}
              <div className="card" style={{ border: binding?.is_bound ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon name="projects" size={15} />
                      </span>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Project Graph & Model Resolution
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      Xác định Project và Model LLM đang được liên kết với Bot qua Project Graph.
                    </p>
                  </div>

                  {binding?.is_bound && (
                    <span className={`badge ${binding.is_active ? 'badge-success' : 'badge-warning'}`}>
                      {binding.is_active ? 'Graph Active' : 'Graph Paused'}
                    </span>
                  )}
                </div>

                {binding?.is_bound && binding.project ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Bound Project Summary Card */}
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Active Project Pipeline
                        </span>
                        <Link
                          href={`/projects/${binding.project.id}/editor`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none', padding: '3px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icon name="edit" size={12} />
                          <span>Open in Graph Editor →</span>
                        </Link>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {binding.project.name}
                        </span>
                        <span className={`badge ${binding.project.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {binding.project.status === 'ACTIVE' ? 'ACTIVE (Running)' : `${binding.project.status} (Paused)`}
                        </span>
                      </div>
                      {binding.project.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {binding.project.description}
                        </p>
                      )}

                      {/* Visual Flow Representation */}
                      <div style={{
                        marginTop: 10,
                        padding: '8px 10px',
                        borderRadius: 4,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ color: '#5865F2', fontWeight: 600 }}>Discord</span>
                        <span>→</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Project: {binding.project.name}</span>
                        <span>→</span>
                        <span style={{ color: '#a855f7', fontWeight: 600 }}>Model: {binding.model?.name || 'LLM'}</span>
                        <span>→</span>
                        <span style={{ color: '#5865F2', fontWeight: 600 }}>Discord Response</span>
                      </div>
                    </div>

                    {/* Calling Model Card */}
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Connected AI Model
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                          Governed by Graph
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#a855f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon name="settings" size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {binding.model?.name || 'Default LLM'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{binding.model?.provider?.toUpperCase() || 'AI'}]</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {binding.model?.id} • Temp: {binding.model?.temperature ?? 0.7} • Max tokens: {binding.model?.max_tokens ?? 2048}
                          </div>
                        </div>
                      </div>

                      {/* Associated System Prompt & Skills */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 4,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border-subtle)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>System Prompt:</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {binding.system_prompt ? `📝 ${binding.system_prompt.name}` : 'Default AI-Chan persona'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>Connected Skills:</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {binding.skills && binding.skills.length > 0 ? (
                              <span style={{ color: 'var(--accent)' }}>⚡ {binding.skills.length} skills connected</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No skills attached</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inactive Warning Alert & Quick Activation */}
                    {!binding.is_active && (
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="alert" size={14} />
                          <span>Project đang tạm dừng (STOP). Bot sẽ không phản hồi trên Discord đến khi kích hoạt.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleActivateProject(binding.project!.id)}
                          className="btn btn-primary btn-sm"
                          style={{ whiteSpace: 'nowrap', padding: '4px 10px', fontSize: '0.72rem' }}
                        >
                          Activate Project
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Case: Not bound to any project */
                  <div style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px'
                    }}>
                      <Icon name="alert" size={22} />
                    </div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Chưa Có Project Nào Kết Nối Với Bot
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 14px', lineHeight: 1.5 }}>
                      Trong kiến trúc AI-Chan, mô hình AI (Model LLM) được cấu hình và kết nối trực tiếp với Bot thông qua <strong>Project Graph</strong> thay vì chọn thủ công trong trang Bot.
                    </p>

                    <div style={{
                      textAlign: 'left',
                      background: 'var(--bg-surface)',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: 14
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>👉 Các bước kết nối nhanh:</div>
                      <div>1. Mở trang <strong>Projects</strong> và chọn một dự án (hoặc tạo mới).</div>
                      <div>2. Tại thanh công cụ bên trái, mở mục <strong>Bots</strong> và thêm <strong>Dororo (Discord Bot)</strong> lên canvas.</div>
                      <div>3. Kéo đường nối từ cổng xuất của <strong>Model LLM</strong> vào <strong>Dororo</strong>.</div>
                      <div>4. Bấm <strong>Save Graph</strong> và chuyển trạng thái sang <strong>ACTIVE</strong>.</div>
                    </div>

                    <Link href="/projects" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="projects" size={14} />
                      <span>Đi Đến Danh Sách Projects</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Bot Gateway & Interaction Settings Card */}
              <div className="card">
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Bot Gateway & Trigger Settings
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Cấu hình phương thức kích hoạt lệnh và đồng bộ dữ liệu Discord.
                  </p>
                </div>

                <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Trigger Mode */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Trigger Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {(['MENTION', 'PREFIX', 'SLASH_COMMAND'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTriggerMode(mode)}
                          className={`btn ${triggerMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '8px 6px', fontSize: '0.75rem' }}
                        >
                          {mode === 'MENTION' ? '@AI-Chan' : mode === 'PREFIX' ? 'Custom Prefix' : '/chat'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Prefix */}
                  {triggerMode === 'PREFIX' && (
                    <div>
                      <label htmlFor="input-custom-prefix" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Command Prefix
                      </label>
                      <input
                        type="text"
                        id="input-custom-prefix"
                        maxLength={10}
                        className="input"
                        value={customPrefix}
                        onChange={(e) => setCustomPrefix(e.target.value)}
                        placeholder="!ai"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  )}

                  {/* Sync to Web Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Sync Conversation to Web Chat
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Automatically save Discord conversations in Web Chat with a Discord badge
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="checkbox-sync-to-web"
                      checked={syncToWeb}
                      onChange={(e) => setSyncToWeb(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ marginTop: 4 }}
                  >
                    <Icon name="check" size={14} />
                    {saving ? 'Saving...' : 'Save Bot Gateway Settings'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

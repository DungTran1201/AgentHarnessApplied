'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DiscordBotConfig,
  DiscordGuildItem,
  DiscordBotTestDispatchResponse,
  AgentModel,
  UserQuotaStatus
} from '@/types';
import Icon from '@/components/ui/Icon';
import PageHeader from '@/components/ui/PageHeader';
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

  // Bot Configuration State
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

      const [cfgRes, guildsRes, modelsRes, quotaRes] = await Promise.all([
        fetch('/api/v1/bot/discord/config'),
        fetch('/api/v1/bot/discord/guilds'),
        fetch('/api/v1/models?status=ACTIVE'),
        fetch('/api/v1/resources/quota')
      ]);

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
      showToast('error', getErrorMessage(err, 'Failed to load Discord bot configuration.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

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
        active_model_id: activeModelId,
        trigger_mode: triggerMode,
        custom_prefix: triggerMode === 'PREFIX' ? customPrefix : undefined,
        system_prompt: systemPrompt,
        max_tokens_per_response: maxTokens,
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
      showToast('success', 'Discord bot configuration saved successfully.');
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
          model_id: activeModelId,
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
            <Icon name="chat" size={24} />
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
            {/* Left Column: Servers & Test Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Guilds Discovery */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Managed Discord Servers
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Only servers where you have Administrator or Manage Server permissions can host the bot.
                    </p>
                  </div>
                  <span className="badge badge-neutral">
                    {guilds.length} servers
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {guilds.map((g) => {
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
                  })}
                </div>
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

            {/* Right Column: Configuration Form */}
            <div className="card">
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Persona & Routing Configuration
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Customize bot behavior for: <strong>{selectedGuildName || 'None selected'}</strong>
                </p>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Model Routing */}
                <div>
                  <label htmlFor="select-model-routing" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Routing AI Model
                  </label>
                  <select
                    id="select-model-routing"
                    className="input"
                    value={activeModelId}
                    onChange={(e) => setActiveModelId(e.target.value)}
                  >
                    {activeModels.map((m) => (
                      <option key={m.id} value={m.id} style={{ background: '#111827', color: '#fff' }}>
                        {m.name} [{m.provider.toUpperCase()}] {m.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Trigger Mode */}
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

                {/* 3. Custom Prefix */}
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

                {/* 4. Persona System Prompt */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label htmlFor="input-persona-prompt" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Persona System Prompt
                    </label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {systemPrompt.length}/2000 chars
                    </span>
                  </div>

                  {/* Preset Persona Buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      onClick={() => applyPersonaPreset('You are AI-Chan, a helpful, polite, and witty Discord assistant with deep software engineering expertise.')}
                    >
                      Witty Engineer
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      onClick={() => applyPersonaPreset('You are an energetic, welcoming Discord community moderator who answers concisely and encourages collaboration.')}
                    >
                      Active Moderator
                    </button>
                  </div>

                  <textarea
                    id="input-persona-prompt"
                    rows={4}
                    maxLength={2000}
                    className="input"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter instructions defining bot personality and boundaries..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* 5. Max Tokens */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label htmlFor="slider-max-tokens" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Max Response Tokens
                    </label>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {maxTokens} tokens
                    </span>
                  </div>
                  <input
                    type="range"
                    id="slider-max-tokens"
                    min={50}
                    max={4000}
                    step={50}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>50 (concise)</span>
                    <span>4000 (detailed)</span>
                  </div>
                </div>

                {/* 6. Sync to Web Toggle */}
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
                  style={{ marginTop: 6 }}
                >
                  <Icon name="check" size={14} />
                  {saving ? 'Saving...' : 'Save Discord Bot Configuration'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

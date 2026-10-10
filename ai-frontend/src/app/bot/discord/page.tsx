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
  const [testQuery, setTestQuery] = useState<string>('Chào bot AI-Chan! Bạn có thể giới thiệu về mình không?');
  const [dispatching, setDispatching] = useState(false);
  const [testResult, setTestResult] = useState<DiscordBotTestDispatchResponse | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Tải thông tin người dùng và trạng thái liên kết Discord
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Kiểm tra liên kết Discord
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

      // Song song nạp cấu hình bot, danh sách guild, danh mục mô hình và quota
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
        setIsEnabled(Boolean(cfgData.is_enabled));
        setSyncToWeb(Boolean(cfgData.sync_to_web));
      }

      if (guildsRes.ok) {
        const guildsData: DiscordGuildItem[] = await guildsRes.json();
        setGuilds(guildsData);
        if (!selectedGuildId && guildsData.length > 0) {
          const defaultGuild = guildsData.find(g => g.has_admin_rights) || guildsData[0];
          setSelectedGuildId(defaultGuild.id);
          setSelectedGuildName(defaultGuild.name);
        }
      }

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const items = Array.isArray(modelsData) ? modelsData : (modelsData.items || []);
        setActiveModels(items);
      }

      if (quotaRes.ok) {
        const quotaData: UserQuotaStatus = await quotaRes.json();
        setQuota(quotaData);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu cấu hình Discord Bot:', err);
      showToast('error', 'Không thể kết nối đến máy chủ. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. Lưu cấu hình Bot (OP-032)
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        guild_id: selectedGuildId || null,
        guild_name: selectedGuildName || null,
        active_model_id: activeModelId,
        trigger_mode: triggerMode,
        custom_prefix: customPrefix.trim() || '!ai',
        system_prompt: systemPrompt.trim(),
        max_tokens_per_response: Number(maxTokens),
        is_enabled: isEnabled,
        sync_to_web: syncToWeb
      };

      const res = await fetch('/api/v1/bot/discord/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Không thể lưu cấu hình bot.');
      }

      setConfig(data);
      showToast('success', '✓ Đã cập nhật cấu hình Discord Bot thành công!');
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Gửi lệnh kiểm thử tương tác tức thời (OP-034)
  const handleTestDispatch = async () => {
    if (!testQuery.trim()) {
      showToast('error', 'Vui lòng nhập nội dung câu hỏi thử nghiệm.');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch('/api/v1/bot/discord/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery.trim(),
          model_id: activeModelId
        })
      });

      const data: DiscordBotTestDispatchResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as any).detail || 'Kiểm thử tương tác thất bại.');
      }

      setTestResult(data);
      if (data.remaining_quota) {
        setQuota({
          user_id: discordUser.id || '',
          daily_token_limit: data.remaining_quota.daily_token_limit,
          daily_tokens_used: data.remaining_quota.daily_tokens_used,
          percent_used: data.remaining_quota.percent_used,
          warning_80: data.remaining_quota.percent_used >= 80,
          reset_at: data.remaining_quota.reset_at
        });
      }
      showToast('success', '✓ Bot đã phản hồi thành công và đồng bộ quota!');
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi kiểm thử tương tác.');
    } finally {
      setDispatching(false);
    }
  };

  // Nạp Persona mẫu
  const applyPersonaPreset = (promptText: string) => {
    setSystemPrompt(promptText);
    showToast('info', 'Đã áp dụng mẫu nhân cách gợi ý.');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            border: '3px solid rgba(88, 101, 242, 0.25)',
            borderTopColor: '#5865F2',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Đang nạp bảng điều khiển Discord Bot...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: 1240, margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : '#1e1b4b',
          color: '#f8fafc',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#6366f1'}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 500,
          fontSize: '0.9rem'
        }}>
          {toast.message}
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Trang chủ</Link>
        <span>/</span>
        <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Cài đặt</Link>
        <span>/</span>
        <span style={{ color: '#5865F2', fontWeight: 600 }}>Quản Lý Discord Bot</span>
      </nav>

      {/* Header Bar */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(88, 101, 242, 0.4)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div>
              <h1 id="page-heading" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Quản Lý Discord Bot (CR-009)
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 2 }}>
                Định tuyến mô hình AI, cấu hình nhân cách và đồng bộ hạn ngạch token cho máy chủ Discord
              </p>
            </div>
          </div>
        </div>

        {/* Global Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/bot/discord/pipeline"
            id="btn-goto-pipeline"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              color: '#c084fc',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)'
            }}
          >
            ⚡ Visual Pipeline Canvas (n8n)
          </Link>
          <Link
            href="/chat"
            id="btn-goto-chat"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            💬 Xem Web Chat
          </Link>
          <Link
            href="/dashboard"
            id="btn-goto-telemetry"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            📊 Đo Lường Telemetry
          </Link>
        </div>
      </header>

      {/* TRƯỜNG HỢP: CHƯA LIÊN KẾT DISCORD (BR-031, TC-040) */}
      {!isDiscordLinked && (
        <section id="unlinked-discord-guard" style={{
          padding: '40px 32px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.12) 0%, rgba(17, 24, 39, 0.8) 100%)',
          border: '1px solid rgba(88, 101, 242, 0.35)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          textAlign: 'center',
          maxWidth: 680,
          margin: '40px auto'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#5865F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 30px rgba(88, 101, 242, 0.6)'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12, color: '#f8fafc' }}>
            Yêu Cầu Liên Kết Tài Khoản Discord (BR-031)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 28 }}>
            Để quản lý quyền máy chủ, phân bổ hạn ngạch token và định tuyến mô hình AI cho Bot Discord, bạn cần hoàn tất liên kết tài khoản Discord của mình với AI-Chan.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <Link
              href="/settings?tab=connections"
              id="btn-link-discord-now"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                background: '#5865F2',
                color: 'white',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(88, 101, 242, 0.4)',
                fontSize: '0.92rem'
              }}
            >
              🔗 Đi đến Cài đặt để liên kết Discord
            </Link>
          </div>
        </section>
      )}

      {/* TRƯỜNG HỢP: ĐÃ LIÊN KẾT DISCORD - TOÀN BỘ GIAO DIỆN CONSOLE */}
      {isDiscordLinked && (
        <div>
          {/* Visual Pipeline Showcase Banner (CR-010) */}
          <div
            id="banner-visual-pipeline"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 24,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    Visual Pipeline Canvas & Dynamic Model Binding (CR-010)
                  </h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(168, 85, 247, 0.25)',
                      color: '#d8b4fe',
                      fontWeight: 600,
                      border: '1px solid rgba(168, 85, 247, 0.4)'
                    }}
                  >
                    MỚI (n8n-style)
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                  Kéo thả khối, tạo đường nối Bezier, kiểm soát 3 trạng thái Running (Xanh) - Pause (Vàng) - Stop (Xám) và chỉ định mô hình AI độc lập cho Bot Discord.
                </p>
              </div>
            </div>

            <Link
              href="/bot/discord/pipeline"
              id="btn-open-visual-canvas"
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.86rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.35)',
                whiteSpace: 'nowrap'
              }}
            >
              Mở Trình Biên Tập Pipeline →
            </Link>
          </div>

          {/* Top Status & Unified Quota Bar */}
          <section id="bot-status-quota-bar" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {/* Identity Card */}
            <div style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5865F2, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: 'white'
                }}>
                  {discordUser.avatar ? (
                    <img src={discordUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    discordUser.username ? discordUser.username.slice(0, 2).toUpperCase() : 'DC'
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {discordUser.username || 'Discord User'}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      ĐÃ LIÊN KẾT
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    ID: {discordUser.id}
                  </div>
                </div>
              </div>

              {/* Master Enabled Switch */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Trạng thái Bot</div>
                <button
                  type="button"
                  id="toggle-master-bot"
                  onClick={() => setIsEnabled(!isEnabled)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isEnabled ? '#10b981' : '#ef4444',
                    border: `1px solid ${isEnabled ? '#10b981' : '#ef4444'}`,
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isEnabled ? '#10b981' : '#ef4444',
                    display: 'inline-block'
                  }} />
                  {isEnabled ? 'Đang Kích Hoạt' : 'Tạm Dừng'}
                </button>
              </div>
            </div>

            {/* Unified Quota Gauge (BR-032) */}
            <div style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Hạn Ngạch Token Dùng Chung (BR-032)
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: (quota?.percent_used || 0) >= 100 ? '#ef4444' : (quota?.percent_used || 0) >= 80 ? '#f59e0b' : '#10b981'
                }}>
                  {quota?.daily_tokens_used?.toLocaleString() || 0} / {quota?.daily_token_limit?.toLocaleString() || 100000} tokens ({quota?.percent_used || 0}%)
                </span>
              </div>
              <div style={{
                height: 8,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, quota?.percent_used || 0)}%`,
                  background: (quota?.percent_used || 0) >= 100
                    ? '#ef4444'
                    : (quota?.percent_used || 0) >= 80
                    ? '#f59e0b'
                    : 'linear-gradient(90deg, #10b981, #5865F2)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Web + Discord cùng chia sẻ một quỹ token</span>
                <span>Reset lúc 00:00 UTC</span>
              </div>
            </div>
          </section>

          {/* Main 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
            {/* CỘT TRÁI: KHÁM PHÁ GUILDS & THỬ NGHIỆM DISPATCH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Guilds Discovery (OP-033, BR-034) */}
              <section id="guild-discovery-panel" style={{
                padding: '22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Máy Chủ Discord Quản Trị (BR-034)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Chỉ các máy chủ bạn nắm quyền Administrator hoặc Manage Guild mới được phép cài đặt bot
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#5865F2', fontWeight: 600 }}>
                    {guilds.length} máy chủ
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {guilds.map((g) => {
                    const isSelected = selectedGuildId === g.id;
                    return (
                      <div
                        key={g.id}
                        id={`guild-card-${g.id}`}
                        onClick={() => {
                          if (g.has_admin_rights) {
                            setSelectedGuildId(g.id);
                            setSelectedGuildName(g.name);
                          }
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'rgba(88, 101, 242, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isSelected ? '#5865F2' : 'var(--border-subtle)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: g.has_admin_rights ? 'pointer' : 'not-allowed',
                          opacity: g.has_admin_rights ? 1 : 0.6,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: '#2f3136',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '0.9rem',
                            overflow: 'hidden'
                          }}>
                            {g.icon ? (
                              <img src={g.icon} alt={g.name} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              g.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {g.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: g.has_admin_rights ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: g.has_admin_rights ? '#10b981' : '#ef4444',
                                fontWeight: 500
                              }}>
                                {g.has_admin_rights ? '✓ Quản trị viên' : '✕ Thiếu quyền'}
                              </span>
                              {g.has_bot && (
                                <span style={{ fontSize: '0.7rem', color: '#5865F2', fontWeight: 500 }}>
                                  • Đã cài Bot
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <span style={{ fontSize: '0.8rem', color: '#5865F2', fontWeight: 700 }}>
                              ● Đang chọn
                            </span>
                          ) : g.has_admin_rights ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Chọn máy chủ
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Không khả dụng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Instant Test Dispatch Console (OP-034) */}
              <section id="test-dispatch-console" style={{
                padding: '22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                    fontWeight: 700
                  }}>
                    ⚡
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Thử Nghiệm Phản Hồi Trực Tiếp (OP-034)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Mô phỏng gửi prompt từ Discord để kiểm tra định tuyến mô hình và trừ quota
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <textarea
                    id="input-test-query"
                    rows={3}
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Nhập câu lệnh hoặc câu hỏi để thử nghiệm phản hồi của bot..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setTestQuery('Giải thích kiến trúc Microservices trong 2 câu.')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      💡 Hỏi Microservices
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestQuery('Viết một câu chào thật ngầu cho thành viên mới Discord.')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      👋 Mẫu chào mừng
                    </button>
                  </div>

                  <button
                    type="button"
                    id="btn-dispatch-test"
                    onClick={handleTestDispatch}
                    disabled={dispatching || !isEnabled}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: isEnabled ? '#5865F2' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: isEnabled && !dispatching ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: isEnabled ? '0 4px 12px rgba(88, 101, 242, 0.3)' : 'none'
                    }}
                  >
                    {dispatching ? 'Đang điều phối...' : '🚀 Gửi Lệnh Thử'}
                  </button>
                </div>

                {/* Kết quả kiểm thử */}
                {testResult && (
                  <div id="test-dispatch-result" style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(88, 101, 242, 0.3)',
                    marginTop: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.78rem', color: '#5865F2', fontWeight: 600 }}>
                        {testResult.model_name} ({testResult.provider})
                      </span>
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>⏱ {testResult.latency_ms}ms</span>
                        <span>📊 {testResult.tokens_used.total_tokens} tokens</span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      padding: '10px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.03)'
                    }}>
                      {testResult.reply}
                    </div>

                    {testResult.web_synced && (
                      <div style={{
                        marginTop: 8,
                        fontSize: '0.75rem',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        ✓ Đã tự động đồng bộ vào Web Chat: <em>Discord Bot: {selectedGuildName || 'Hội thoại Discord'}</em> (FR-047)
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* CỘT PHẢI: FORM CẤU HÌNH NHÂN CÁCH & ĐỊNH TUYẾN MÔ HÌNH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <section id="bot-config-form-panel" style={{
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ marginBottom: 18 }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Cấu Hình Nhân Cách & Định Tuyến (OP-032)
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Tùy biến hành vi phản hồi của bot cho máy chủ: <strong>{selectedGuildName || 'Chưa chọn'}</strong>
                  </p>
                </div>

                <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* 1. Chọn Mô hình AI Định tuyến (BR-033) */}
                  <div>
                    <label htmlFor="select-model-routing" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Mô hình AI Định Tuyến (BR-033)
                    </label>
                    <select
                      id="select-model-routing"
                      value={activeModelId}
                      onChange={(e) => setActiveModelId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    >
                      {activeModels.map((m) => (
                        <option key={m.id} value={m.id} style={{ background: '#111827', color: '#fff' }}>
                          {m.name} [{m.provider.toUpperCase()}] {m.is_default ? '★ Mặc định' : ''}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Nếu mô hình gặp sự cố, hệ thống sẽ tự động failover về mô hình mặc định.
                    </span>
                  </div>

                  {/* 2. Chế độ kích hoạt (Trigger Mode) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Chế Độ Kích Hoạt Bot (Trigger Mode)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {(['MENTION', 'PREFIX', 'SLASH_COMMAND'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          id={`btn-mode-${mode.toLowerCase()}`}
                          onClick={() => setTriggerMode(mode)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: triggerMode === mode ? 'rgba(88, 101, 242, 0.2)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${triggerMode === mode ? '#5865F2' : 'var(--border-subtle)'}`,
                            color: triggerMode === mode ? '#fff' : 'var(--text-secondary)',
                            fontWeight: triggerMode === mode ? 600 : 400,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {mode === 'MENTION' ? '@AI-Chan' : mode === 'PREFIX' ? 'Tiền Tố Lệnh' : '/chat'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Tiền tố tùy chỉnh (Custom Prefix) */}
                  {triggerMode === 'PREFIX' && (
                    <div>
                      <label htmlFor="input-custom-prefix" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Tiền Tố Lệnh Kích Hoạt (Custom Prefix)
                      </label>
                      <input
                        type="text"
                        id="input-custom-prefix"
                        maxLength={10}
                        value={customPrefix}
                        onChange={(e) => setCustomPrefix(e.target.value)}
                        placeholder="!ai"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* 4. Persona System Prompt */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label htmlFor="input-persona-prompt" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Định Hình Nhân Cách (Persona System Prompt)
                      </label>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {systemPrompt.length}/2000 ký tự
                      </span>
                    </div>

                    {/* Preset Persona Buttons */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => applyPersonaPreset('You are AI-Chan, a helpful, polite and witty Discord assistant with deep engineering knowledge.')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(88, 101, 242, 0.1)',
                          color: '#5865F2',
                          border: '1px solid rgba(88, 101, 242, 0.25)',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✨ Kỹ Sư Hóm Hỉnh
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPersonaPreset('You are an energetic, fun Discord community moderator who speaks concisely with emojis and encourages members.')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        🎉 Quản Trò Năng Động
                      </button>
                    </div>

                    <textarea
                      id="input-persona-prompt"
                      rows={4}
                      maxLength={2000}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Nhập câu lệnh định hình phong cách nói chuyện của Bot..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* 5. Max Tokens Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label htmlFor="slider-max-tokens" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Giới Hạn Token Tối Đa Mỗi Phản Hồi
                      </label>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5865F2', fontFamily: 'var(--font-mono)' }}>
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
                      style={{ width: '100%', accentColor: '#5865F2', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>50 (ngắn gọn)</span>
                      <span>4000 (chi tiết)</span>
                    </div>
                  </div>

                  {/* 6. Sync to Web Toggle (FR-047) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Đồng Bộ Hội Thoại Vào Web Chat (FR-047)
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Tự động lưu lịch sử trao đổi từ Discord vào giao diện Web với huy hiệu Discord
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="checkbox-sync-to-web"
                      checked={syncToWeb}
                      onChange={(e) => setSyncToWeb(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#5865F2', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    type="submit"
                    id="btn-save-bot-config"
                    disabled={saving}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 6px 20px rgba(88, 101, 242, 0.4)',
                      marginTop: 8
                    }}
                  >
                    {saving ? 'Đang lưu cấu hình...' : '💾 Lưu Cấu Hình Bot Discord'}
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

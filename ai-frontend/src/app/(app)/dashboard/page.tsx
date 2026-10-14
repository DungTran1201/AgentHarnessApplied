'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ResourceService } from '@/services/resourceService';
import { ResourceSummary, ApiMetricLogItem, SSEMetricEvent } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';

type TimeRange = '1h' | '24h' | '7d' | '30d';

export default function ResourceDashboardPage() {
  const [range, setRange] = useState<TimeRange>('24h');
  const [summary, setSummary] = useState<ResourceSummary | null>(null);
  const [history, setHistory] = useState<ApiMetricLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const loadData = async (selectedRange: TimeRange) => {
    try {
      const [sumData, histData] = await Promise.all([
        ResourceService.getSummary(selectedRange),
        ResourceService.getHistory(30),
      ]);
      setSummary(sumData);
      setHistory(histData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(range);
  }, [range]);

  // Real-time SSE stream
  useEffect(() => {
    setSseStatus('reconnecting');
    const unsubscribe = ResourceService.subscribeStream({
      onOpen: () => {
        setSseStatus('connected');
      },
      onInitialState: data => {
        setSummary(data);
      },
      onMetricUpdate: (event: SSEMetricEvent) => {
        setHistory(prev => [event.metric, ...prev.slice(0, 49)]);
        setHighlightId(event.metric.id);
        setTimeout(() => setHighlightId(null), 2500);

        setSummary(prev => {
          if (!prev) return prev;
          const newTotalReqs = prev.total_requests + 1;
          const newTotalTokens = prev.total_tokens + event.metric.total_tokens;
          const newAvgLatency =
            Math.round(((prev.avg_latency_ms * prev.total_requests + event.metric.latency_ms) / newTotalReqs) * 10) /
            10;

          const updatedTrend = [
            ...prev.recent_trend.slice(-29),
            {
              time: event.metric.created_at.split(' ')[1] || 'Now',
              latency_ms: event.metric.latency_ms,
              ttft_ms: event.metric.ttft_ms || 0,
              tokens: event.metric.total_tokens,
            },
          ];

          return {
            ...prev,
            total_requests: newTotalReqs,
            total_tokens: newTotalTokens,
            avg_latency_ms: newAvgLatency,
            recent_trend: updatedTrend,
            quota_status: {
              ...prev.quota_status,
              daily_tokens_used: event.quota.daily_tokens_used,
              percent_used: event.quota.percent_used,
              warning_80: event.quota.warning_80,
            },
          };
        });
      },
      onQuotaAlert: () => {
        ResourceService.getQuota()
          .then(q => {
            setSummary(prev => (prev ? { ...prev, quota_status: q } : prev));
          })
          .catch(() => {});
      },
      onError: () => {
        setSseStatus('reconnecting');
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const quota = summary?.quota_status;
  const percentUsed = quota?.percent_used || 0;
  const isWarning80 = percentUsed >= 80 && percentUsed < 100;
  const isExhausted = percentUsed >= 100;

  const gaugeColor = isExhausted ? 'var(--danger)' : isWarning80 ? 'var(--warning)' : 'var(--accent)';

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container">
        {/* Page Header */}
        <PageHeader
          title="Telemetry & Analytics"
          description="Real-time system telemetry, latency tracking, token usage, and API quota monitoring."
        >
          {/* SSE Live status indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background:
                sseStatus === 'connected'
                  ? 'var(--success-bg)'
                  : sseStatus === 'reconnecting'
                  ? 'var(--warning-bg)'
                  : 'var(--danger-bg)',
              border: `1px solid ${
                sseStatus === 'connected'
                  ? 'var(--accent-border)'
                  : sseStatus === 'reconnecting'
                  ? 'rgba(240, 189, 79, 0.3)'
                  : 'rgba(240, 113, 120, 0.3)'
              }`,
              fontSize: '0.6875rem',
              fontWeight: 600,
              color:
                sseStatus === 'connected'
                  ? 'var(--success)'
                  : sseStatus === 'reconnecting'
                  ? 'var(--warning)'
                  : 'var(--danger)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background:
                  sseStatus === 'connected'
                    ? 'var(--success)'
                    : sseStatus === 'reconnecting'
                    ? 'var(--warning)'
                    : 'var(--danger)',
                display: 'inline-block',
              }}
            />
            <span>{sseStatus === 'connected' ? 'LIVE STREAM' : sseStatus === 'reconnecting' ? 'CONNECTING...' : 'DISCONNECTED'}</span>
          </div>

          {/* Time range selector */}
          <div className="segmented-control">
            {(['1h', '24h', '7d', '30d'] as TimeRange[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`segmented-item ${range === r ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                {r === '1h' ? '1 Hour' : r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(range)}
            title="Refresh telemetry metrics"
            aria-label="Refresh telemetry metrics"
          >
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </button>
        </PageHeader>

        {/* Quota Exhaustion Alert */}
        {isExhausted && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(240, 113, 120, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--danger)', display: 'flex' }}>
                <Icon name="alert" size={20} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--danger)' }}>
                  DAILY TOKEN QUOTA EXCEEDED (100% UTILIZED)
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  You have used all {quota?.daily_tokens_used.toLocaleString()} / {quota?.daily_token_limit.toLocaleString()} tokens. New chat requests will be throttled (HTTP 429). Quota resets at 00:00 UTC ({quota?.reset_at}).
                </div>
              </div>
            </div>
            <span className="badge badge-danger">Throttled (HTTP 429)</span>
          </div>
        )}

        {isWarning80 && !isExhausted && (
          <div
            style={{
              background: 'var(--warning-bg)',
              border: '1px solid rgba(240, 189, 79, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.875rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--warning)', display: 'flex' }}>
              <Icon name="alert" size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--warning)' }}>
                Warning: Over 80% of daily token quota consumed
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Currently used {quota?.daily_tokens_used.toLocaleString()} / {quota?.daily_token_limit.toLocaleString()} tokens ({percentUsed}%). Monitor usage to avoid service disruption.
              </div>
            </div>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* KPI 1: Latency */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Response Latency
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {summary ? summary.avg_latency_ms.toLocaleString() : '0'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>ms</span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span
                style={{
                  color:
                    (summary?.avg_latency_ms || 0) < 500
                      ? 'var(--success)'
                      : (summary?.avg_latency_ms || 0) < 1500
                      ? 'var(--warning)'
                      : 'var(--danger)',
                  fontWeight: 600,
                }}
              >
                {(summary?.avg_latency_ms || 0) < 500 ? 'Optimal' : (summary?.avg_latency_ms || 0) < 1500 ? 'Standard' : 'Elevated'}
              </span>
              <span> &bull; window {range}</span>
            </div>
          </div>

          {/* KPI 2: TTFT */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Time to First Token (TTFT)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {summary ? summary.avg_ttft_ms.toLocaleString() : '0'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>ms</span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              LLM stream initial token generation
            </div>
          </div>

          {/* KPI 3: Total Tokens */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Tokens Consumed
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {summary ? summary.total_tokens.toLocaleString() : '0'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>tokens</span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Prompt: {summary?.prompt_tokens.toLocaleString() || '0'} | Completion: {summary?.completion_tokens.toLocaleString() || '0'}
            </div>
          </div>

          {/* KPI 4: Total Requests */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total API Requests
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {summary ? summary.total_requests.toLocaleString() : '0'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>calls</span>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '6px', fontSize: '0.7rem' }}>
              <span className="badge badge-active">2xx: {summary?.status_counts['2xx'] || 0}</span>
              <span className="badge badge-warning">4xx: {summary?.status_counts['4xx'] || 0}</span>
              <span className="badge badge-danger">5xx: {summary?.status_counts['5xx'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Quota Gauge & Model Distribution */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Quota Gauge */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Daily Token Quota
              </h2>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: gaugeColor }}>
                {percentUsed}% used
              </span>
            </div>

            <div
              style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: gaugeColor,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Used: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{quota?.daily_tokens_used.toLocaleString()}</strong> tokens
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Limit: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{quota?.daily_token_limit.toLocaleString()}</strong> tokens
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Daily reset (00:00 UTC):</span>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{quota?.reset_at || 'Automatic daily'}</span>
            </div>
          </div>

          {/* Token Distribution by Provider */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              Token Distribution by Provider
            </h2>

            {summary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { name: 'Google Gemini', key: 'google', color: '#3ecf8e' },
                  { name: 'OpenAI GPT', key: 'openai', color: '#86a9c9' },
                  { name: 'Anthropic Claude', key: 'anthropic', color: '#f0bd4f' },
                  { name: 'Other / Local', key: 'other', color: '#89898f' },
                ].map(item => {
                  const val = summary.tokens_by_provider[item.key as keyof typeof summary.tokens_by_provider] || 0;
                  const pct = summary.total_tokens > 0 ? Math.round((val / summary.total_tokens) * 100) : 0;
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {val.toLocaleString()} tokens ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '3px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Latency & TTFT SVG Chart */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Latency & TTFT Trend (Last 30 Events)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Real-time SSE event graph showing request latency and first token generation time.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '3px', background: 'var(--accent)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Latency (ms)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '3px', background: 'var(--info)', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>TTFT (ms)</span>
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '180px', position: 'relative' }}>
            {summary && summary.recent_trend.length > 1 ? (
              (() => {
                const points = summary.recent_trend;
                const maxVal = Math.max(...points.map(p => Math.max(p.latency_ms, p.ttft_ms)), 100);
                const width = 1000;
                const height = 160;
                const padding = 20;

                const getX = (idx: number) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
                const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                const latencyD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.latency_ms)}`).join(' ');
                const ttftD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.ttft_ms)}`).join(' ');

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="rgba(255,255,255,0.06)" />
                    <line x1={padding} y1={getY(maxVal / 2)} x2={width - padding} y2={getY(maxVal / 2)} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <line x1={padding} y1={getY(maxVal)} x2={width - padding} y2={getY(maxVal)} stroke="rgba(255,255,255,0.06)" />

                    <path d={latencyD} fill="none" stroke="var(--accent)" strokeWidth="2" />
                    <path d={ttftD} fill="none" stroke="var(--info)" strokeWidth="2" strokeDasharray="3 3" />

                    {points.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={getX(idx)}
                        cy={getY(p.latency_ms)}
                        r="3"
                        fill="var(--accent)"
                      />
                    ))}
                  </svg>
                );
              })()
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Waiting for API activity to draw telemetry trend graph...
              </div>
            )}
          </div>
        </div>

        {/* Live API Request Feed Table */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Live API Request Feed
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Real-time telemetry log for recent API calls (automatically refreshed via SSE)
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {history.length} {history.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Time</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Method</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Endpoint</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Latency</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>TTFT</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Tokens</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Model / Provider</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const isHighlighted = item.id === highlightId;
                  const is2xx = item.status_code >= 200 && item.status_code < 300;
                  const is4xx = item.status_code >= 400 && item.status_code < 500;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: isHighlighted ? 'var(--accent-subtle)' : 'transparent',
                        transition: 'background-color 0.4s ease',
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {item.created_at.split(' ')[1] || item.created_at}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          className="badge"
                          style={{
                            background: item.method === 'POST' ? 'rgba(62, 207, 142, 0.1)' : 'rgba(134, 169, 201, 0.1)',
                            color: item.method === 'POST' ? 'var(--accent)' : 'var(--info)',
                          }}
                        >
                          {item.method}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {item.endpoint}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          className={`badge ${is2xx ? 'badge-active' : is4xx ? 'badge-warning' : 'badge-danger'}`}
                        >
                          {item.status_code}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {item.latency_ms} ms
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.ttft_ms ? `${item.ttft_ms} ms` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>
                        {item.total_tokens > 0 ? item.total_tokens.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {item.model_name ? `${item.model_name} (${item.provider})` : '—'}
                      </td>
                    </tr>
                  );
                })}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No telemetry logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

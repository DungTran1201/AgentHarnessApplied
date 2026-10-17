'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ToolDetail,
  ToolConfiguration,
  ToolExecutionRecord,
  ToolStatus,
  ToolRiskLevel,
  ToolTestResponse,
} from '@/types';
import { ToolService } from '@/services/toolService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import { formatErrorMessage } from '@/lib/errors';

export default function ToolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toolId = params?.id as string;

  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [config, setConfig] = useState<ToolConfiguration | null>(null);
  const [executions, setExecutions] = useState<ToolExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'overview' | 'configuration' | 'test' | 'audit'
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'test' | 'audit'>('overview');

  // Configuration Form State
  const [settingsJson, setSettingsJson] = useState<string>('{}');
  const [newCredentials, setNewCredentials] = useState<Record<string, string>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Test Runner State
  const [testParamsJson, setTestParamsJson] = useState<string>('{}');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ToolTestResponse | null>(null);

  // Status Toggle
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadToolData = useCallback(async () => {
    if (!toolId) return;
    try {
      setLoading(true);
      setError(null);

      const [detailData, configData, execData] = await Promise.all([
        ToolService.getTool(toolId),
        ToolService.getToolConfig(toolId).catch(() => null),
        ToolService.getToolExecutions(toolId, 15).catch(() => ({ executions: [] })),
      ]);

      setTool(detailData);
      setConfig(configData);
      setExecutions(execData.executions || []);

      if (configData) {
        setSettingsJson(JSON.stringify(configData.settings || {}, null, 2));
      }

      // Initialize sensible test parameters
      if (detailData.id === 'calculator') {
        setTestParamsJson(JSON.stringify({ expression: '(25 * 4) + 10' }, null, 2));
      } else if (detailData.id === 'date_time_info') {
        setTestParamsJson(JSON.stringify({ timezone_name: 'UTC' }, null, 2));
      } else if (detailData.id === 'convert_units') {
        setTestParamsJson(JSON.stringify({ value: 100, from_unit: 'c', to_unit: 'f', unit_type: 'temperature' }, null, 2));
      } else if (detailData.id === 'validate_email_format') {
        setTestParamsJson(JSON.stringify({ email: 'hello@ai-chan.local' }, null, 2));
      } else if (detailData.id === 'regex_extract') {
        setTestParamsJson(JSON.stringify({ text: 'User ID is 12345', pattern: '\\d+' }, null, 2));
      } else {
        setTestParamsJson('{}');
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, `Failed to load tool '${toolId}'`));
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    loadToolData();
  }, [loadToolData]);

  // Handle Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool) return;
    try {
      setIsSavingConfig(true);
      let parsedSettings = {};
      try {
        parsedSettings = JSON.parse(settingsJson);
      } catch (jsonErr: any) {
        throw new Error(`Invalid JSON syntax in settings: ${jsonErr.message}`);
      }

      // Filter out empty credentials
      const credsToSend: Record<string, string> = {};
      for (const [k, v] of Object.entries(newCredentials)) {
        if (v && v.trim()) {
          credsToSend[k] = v.trim();
        }
      }

      const updated = await ToolService.saveToolConfig(tool.id, {
        settings: parsedSettings,
        credentials: credsToSend,
        is_enabled: tool.status !== 'DISABLED',
      });

      setConfig(updated);
      setNewCredentials({});
      showToast('success', 'Tool configuration and encrypted secrets saved successfully.');
      loadToolData();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to save configuration'));
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Run Test Connection
  const handleRunTest = async () => {
    if (!tool) return;
    try {
      setIsTesting(true);
      setTestResult(null);

      let parsedParams = {};
      try {
        parsedParams = JSON.parse(testParamsJson);
      } catch (jsonErr: any) {
        throw new Error(`Invalid JSON in test parameters: ${jsonErr.message}`);
      }

      const res = await ToolService.testTool(tool.id, parsedParams);
      setTestResult(res);
      showToast(res.status === 'SUCCESS' ? 'success' : 'error', `Health check returned: ${res.status}`);
      // Refresh execution history
      const execData = await ToolService.getToolExecutions(tool.id, 15).catch(() => ({ executions: [] }));
      setExecutions(execData.executions || []);
    } catch (err: any) {
      setTestResult({
        tool_id: tool.id,
        status: 'ERROR',
        message: formatErrorMessage(err, 'Test invocation failed'),
        execution_time_ms: 0,
      });
      showToast('error', formatErrorMessage(err, 'Test invocation failed'));
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Toggle Tool Status
  const handleToggleStatus = async () => {
    if (!tool) return;
    const newStatus: ToolStatus = tool.status === 'DISABLED' ? 'AVAILABLE' : 'DISABLED';
    try {
      setIsTogglingStatus(true);
      await ToolService.updateToolStatus(tool.id, newStatus);
      showToast('success', `Tool '${tool.name}' is now ${newStatus}`);
      loadToolData();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Failed to update tool status'));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Status Badge Rendering
  const renderStatusBadge = (status: ToolStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
            AVAILABLE
          </span>
        );
      case 'NEEDS_CONFIGURATION':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Icon name="key" size={11} />
            NEEDS CONFIGURATION
          </span>
        );
      case 'DEPENDENCY_MISSING':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <Icon name="alert" size={11} />
            DEPENDENCY MISSING
          </span>
        );
      case 'DISABLED':
        return (
          <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            DISABLED
          </span>
        );
      case 'ERROR':
        return (
          <span
            className="badge"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            ERROR
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Risk Badge Rendering
  const renderRiskBadge = (risk: ToolRiskLevel) => {
    const colors: Record<ToolRiskLevel, { bg: string; color: string }> = {
      LOW: { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' },
      MEDIUM: { bg: 'rgba(234, 179, 8, 0.1)', color: '#facc15' },
      HIGH: { bg: 'rgba(249, 115, 22, 0.12)', color: '#fb923c' },
      CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    };
    const c = colors[risk] || colors.LOW;
    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: c.bg,
          color: c.color,
          letterSpacing: '0.04em',
        }}
      >
        {risk} RISK
      </span>
    );
  };

  if (loading) {
    return (
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Icon name="refresh" size={28} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading tool details and configurations...</p>
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="page-container">
          <div
            className="card"
            style={{
              padding: '3rem',
              textAlign: 'center',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <Icon name="alert" size={36} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>
              Tool Not Found or Inaccessible
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Unable to retrieve tool definition.'}</p>
            <Link href="/tools" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Icon name="chevronLeft" size={14} />
              <span>Back to Tool Library</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            href="/tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
            }}
            className="hover-underline"
          >
            <Icon name="chevronLeft" size={12} />
            <span>Tool Library</span>
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {tool.id}
          </span>
        </div>

        {/* Header */}
        <PageHeader title={tool.name} description={tool.description}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
            >
              {tool.status === 'DISABLED' ? 'Enable Tool' : 'Disable Tool'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveTab('test')}
            >
              <Icon name="play" size={14} />
              <span>Test Connection</span>
            </button>
          </div>
        </PageHeader>

        {/* Metadata Top Bar */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
              {renderStatusBadge(tool.status)}
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category:</span>
              <span className="badge">{tool.category}</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk:</span>
              {renderRiskBadge(tool.risk_level)}
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Version:</span>
              <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>v{tool.version}</span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Timeout: {tool.timeout_seconds}s | Retries: {tool.max_retries} | Concurrency: {tool.concurrency_limit}
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="segmented-control"
          style={{ marginBottom: '1.5rem' }}
          role="tablist"
        >
          {[
            { id: 'overview', label: 'Overview & Schemas', icon: 'doc' },
            { id: 'configuration', label: 'Settings & Secrets', icon: 'key' },
            { id: 'test', label: 'Test & Health Check', icon: 'play' },
            { id: 'audit', label: `Execution History (${executions.length})`, icon: 'terminal' },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`segmented-control-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon name={tab.icon as any} size={13} style={{ marginRight: '6px' }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & SCHEMAS */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status Reason Notice if not available */}
            {tool.status !== 'AVAILABLE' && tool.status_reason && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#facc15',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Icon name="alert" size={18} />
                <span><strong>Runtime Status Notice:</strong> {tool.status_reason}</span>
              </div>
            )}

            {/* Schemas Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {/* Input Schema */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Input Parameters Schema
                  </h3>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>JSON Schema</span>
                </div>
                <pre
                  className="custom-scrollbar"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.875rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(tool.input_schema, null, 2)}
                </pre>
              </div>

              {/* Output Schema */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Output Schema Contract
                  </h3>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>JSON Schema</span>
                </div>
                <pre
                  className="custom-scrollbar"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.875rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(tool.output_schema, null, 2)}
                </pre>
              </div>
            </div>

            {/* Specifications & Dependencies */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Technical Capabilities & Security Boundaries
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Side Effects / Mutation</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: tool.side_effects ? '#fb923c' : 'var(--text-primary)' }}>
                    {tool.side_effects ? 'Yes (Creates / Updates State)' : 'No (Read-Only / Pure Math)'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Required Packages</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {tool.required_dependencies && tool.required_dependencies.length > 0
                      ? tool.required_dependencies.join(', ')
                      : 'None (Built-in standard library)'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Configuration Keys</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {tool.required_config_keys && tool.required_config_keys.length > 0
                      ? tool.required_config_keys.join(', ')
                      : 'None (Zero config required)'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Permissions</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {tool.permissions_required && tool.permissions_required.length > 0
                      ? tool.permissions_required.join(', ')
                      : 'Standard Execution'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURATION & SECRETS */}
        {activeTab === 'configuration' && (
          <form onSubmit={handleSaveConfig} className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Tool Instance Configuration
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Configure operational parameters, API endpoints, and encrypted access credentials.
            </p>

            {/* Secret Credentials Section */}
            {tool.required_config_keys && tool.required_config_keys.length > 0 ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Secret Credentials (Encrypted at Rest with AES-256 PBKDF2)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tool.required_config_keys.map(keyName => {
                    const maskedVal = config?.credentials_masked?.[keyName];
                    return (
                      <div key={keyName}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                          {keyName} {maskedVal && <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>(Configured: {maskedVal})</span>}
                        </label>
                        <input
                          type="password"
                          className="input"
                          placeholder={maskedVal ? 'Enter new secret to replace...' : `Enter ${keyName}...`}
                          value={newCredentials[keyName] || ''}
                          onChange={e =>
                            setNewCredentials(prev => ({
                              ...prev,
                              [keyName]: e.target.value,
                            }))
                          }
                          autoComplete="off"
                        />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                          Secrets are never sent back to the browser in plain text.
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '0.875rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  marginBottom: '1.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                This tool does not require external credentials or API keys.
              </div>
            )}

            {/* Custom Settings (JSON) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Additional Settings (JSON format)
              </label>
              <textarea
                className="input textarea custom-scrollbar"
                rows={6}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', width: '100%' }}
                value={settingsJson}
                onChange={e => setSettingsJson(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingConfig}
              >
                {isSavingConfig ? (
                  <>
                    <Icon name="refresh" size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={14} />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: TEST & HEALTH CHECK */}
        {activeTab === 'test' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Interactive Health Check & Diagnostics
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Invokes the tool handler via the Policy Gate without external side-effects to verify schema conformance and connectivity.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Test Parameters (JSON)
              </label>
              <textarea
                className="input textarea custom-scrollbar"
                rows={5}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', width: '100%' }}
                value={testParamsJson}
                onChange={e => setTestParamsJson(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Icon name="refresh" size={14} className="animate-spin" />
                    <span>Executing Health Check...</span>
                  </>
                ) : (
                  <>
                    <Icon name="play" size={14} />
                    <span>Run Health Check</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '6px',
                  backgroundColor:
                    testResult.status === 'SUCCESS'
                      ? 'rgba(34, 197, 94, 0.08)'
                      : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${
                    testResult.status === 'SUCCESS'
                      ? 'rgba(34, 197, 94, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: testResult.status === 'SUCCESS' ? '#4ade80' : '#ef4444',
                    }}
                  >
                    Status: {testResult.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Latency: {testResult.execution_time_ms} ms
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {testResult.message}
                </div>
                {testResult.details && (
                  <pre
                    className="custom-scrollbar"
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      fontSize: '0.75rem',
                      background: 'var(--bg-secondary)',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Recent Execution Audit History
            </h3>

            {executions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No execution records found for this tool yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Execution Time</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Timestamp</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Error / Result Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map(rec => (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                rec.status === 'SUCCEEDED'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : rec.status === 'BLOCKED'
                                  ? 'rgba(234, 179, 8, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                rec.status === 'SUCCEEDED'
                                  ? '#4ade80'
                                  : rec.status === 'BLOCKED'
                                  ? '#facc15'
                                  : '#ef4444',
                            }}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {rec.execution_time_ms} ms
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(rec.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {rec.error_message || 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

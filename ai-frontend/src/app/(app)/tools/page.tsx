'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ToolSummary, ToolStatus, ToolCategory, ToolRiskLevel } from '@/types';
import { ToolService } from '@/services/toolService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { formatErrorMessage } from '@/lib/errors';

export default function ToolLibraryPage() {
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Feedback & Quick Test Modal
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testModalTool, setTestModalTool] = useState<ToolSummary | null>(null);
  const [testInputJson, setTestInputJson] = useState<string>('{}');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, categoryFilter, statusFilter]);

  // Fetch tools from real backend
  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ToolService.getTools({
        search: debouncedQuery,
        category: categoryFilter,
        status: statusFilter,
        page,
        limit: pageSize,
      });
      setTools(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Failed to load tools catalog'));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, categoryFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // Toggle tool status between AVAILABLE and DISABLED
  const handleToggleStatus = async (tool: ToolSummary) => {
    const newStatus: ToolStatus = tool.status === 'DISABLED' ? 'AVAILABLE' : 'DISABLED';
    try {
      setTogglingId(tool.id);
      await ToolService.updateToolStatus(tool.id, newStatus);
      showToast('success', `Tool '${tool.name}' is now ${newStatus}`);
      await loadTools();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, `Failed to update status for ${tool.name}`));
    } finally {
      setTogglingId(null);
    }
  };

  // Open Quick Test Modal
  const handleOpenTestModal = (tool: ToolSummary) => {
    setTestModalTool(tool);
    setTestResult(null);
    // Provide sensible default inputs based on tool
    if (tool.id === 'calculator') {
      setTestInputJson(JSON.stringify({ expression: '(15 * 4) + 10' }, null, 2));
    } else if (tool.id === 'date_time_info') {
      setTestInputJson(JSON.stringify({ timezone_name: 'UTC' }, null, 2));
    } else if (tool.id === 'convert_units') {
      setTestInputJson(JSON.stringify({ value: 1000, from_unit: 'm', to_unit: 'km', unit_type: 'length' }, null, 2));
    } else if (tool.id === 'validate_email_format') {
      setTestInputJson(JSON.stringify({ email: 'developer@example.com' }, null, 2));
    } else {
      setTestInputJson('{}');
    }
  };

  // Run Quick Test
  const handleRunTest = async () => {
    if (!testModalTool) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(testInputJson);
      } catch (jsonErr: any) {
        throw new Error(`Invalid JSON syntax in test parameters: ${jsonErr.message}`);
      }

      const res = await ToolService.testTool(testModalTool.id, parsedParams);
      setTestResult(res);
      showToast(res.status === 'SUCCESS' ? 'success' : 'error', `Test completed with status: ${res.status}`);
      // Refresh list to update any status changes
      loadTools();
    } catch (err: any) {
      setTestResult({
        status: 'ERROR',
        message: formatErrorMessage(err, 'Test execution failed'),
        execution_time_ms: 0,
      });
      showToast('error', formatErrorMessage(err, 'Health check failed'));
    } finally {
      setIsTesting(false);
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
            NEEDS CONFIG
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
            MISSING DEP
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

  // Risk Level Badge
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
          fontSize: '0.65rem',
          fontWeight: 600,
          padding: '2px 6px',
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

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        {/* Header */}
        <PageHeader
          title="Tool Library"
          description="Centralized catalog of executable tools, capability checks, security boundaries, and project integrations."
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadTools()}
            title="Refresh tool statuses"
          >
            <Icon name="refresh" size={14} />
            <span>Sync Catalog</span>
          </button>
        </PageHeader>

        {/* Stats Summary Bar */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tools:</span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {totalCount}
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready:</span>
              <span className="badge badge-active">
                {tools.filter(t => t.status === 'AVAILABLE').length} Available
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Config Required:</span>
              <span className="badge badge-warning">
                {tools.filter(t => t.status === 'NEEDS_CONFIGURATION').length} Keys
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optional Packages:</span>
              <span
                className="badge"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}
              >
                {tools.filter(t => t.status === 'DEPENDENCY_MISSING').length} Missing
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Tabs */}
          <div className="segmented-control" role="tablist" aria-label="Filter tools by category">
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'FILE_DOCUMENT', label: 'File & Docs' },
              { id: 'DATA', label: 'Data & Math' },
              { id: 'WEB', label: 'Web & Search' },
              { id: 'FAISS', label: 'FAISS Vector' },
              { id: 'UTILITY', label: 'Utility' },
            ].map(cat => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={categoryFilter === cat.id}
                className={`segmented-item ${categoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <Icon name="search" size={14} />
              </span>
              <input
                type="search"
                className="input"
                style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8125rem' }}
                placeholder="Search tools, tags, IDs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>

            <select
              className="select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="NEEDS_CONFIGURATION">Needs Config</option>
              <option value="DEPENDENCY_MISSING">Missing Dependency</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Icon name="refresh" size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading tool definitions and runtime states...</p>
          </div>
        ) : error ? (
          <div
            className="card"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <Icon name="alert" size={32} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ef4444' }}>
              Catalog Synchronization Error
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={loadTools}>
              <Icon name="refresh" size={14} />
              <span>Retry</span>
            </button>
          </div>
        ) : tools.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Icon name="tools" size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              No tools matched your criteria
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Try adjusting your search query, switching categories, or clearing active status filters.
            </p>
            {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tool Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {tools.map(tool => (
                <div
                  key={tool.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <Link
                            href={`/tools/${tool.id}`}
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                            className="hover-underline"
                          >
                            {tool.name}
                          </Link>
                          {tool.is_builtin && (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              BUILT-IN
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {tool.id}
                        </div>
                      </div>

                      {renderStatusBadge(tool.status)}
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '2.5rem',
                      }}
                    >
                      {tool.description}
                    </p>

                    {/* Badges / Requirements */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {renderRiskBadge(tool.risk_level)}
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        v{tool.version}
                      </span>
                      {tool.required_dependencies && tool.required_dependencies.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            color: '#c084fc',
                          }}
                          title={`Requires: ${tool.required_dependencies.join(', ')}`}
                        >
                          📦 {tool.required_dependencies.length} dep
                        </span>
                      )}
                      {tool.required_config_keys && tool.required_config_keys.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: '#facc15',
                          }}
                          title={`Required keys: ${tool.required_config_keys.join(', ')}`}
                        >
                          🔑 {tool.required_config_keys.length} key
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Health Check Button */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', height: '28px' }}
                        onClick={() => handleOpenTestModal(tool)}
                        title="Run health check / test invocation"
                      >
                        <Icon name="play" size={11} />
                        <span>Test</span>
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', height: '28px' }}
                        disabled={togglingId === tool.id}
                        onClick={() => handleToggleStatus(tool)}
                        title={tool.status === 'DISABLED' ? 'Enable Tool' : 'Disable Tool'}
                      >
                        {tool.status === 'DISABLED' ? 'Enable' : 'Disable'}
                      </button>
                    </div>

                    {/* Configure Link */}
                    <Link
                      href={`/tools/${tool.id}`}
                      className="btn btn-primary"
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        height: '28px',
                        textDecoration: 'none',
                      }}
                    >
                      <span>Configure</span>
                      <Icon name="chevronRight" size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > pageSize && (
              <Pagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={setPage}
                onPageSizeChange={s => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Quick Test Modal */}
      {testModalTool && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '1.5rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Test Execution: {testModalTool.name}
                </h3>
                <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {testModalTool.id} ({testModalTool.category})
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setTestModalTool(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Supply test parameters as JSON to run a verified health check through the Policy Gate:
            </p>

            <textarea
              className="input textarea custom-scrollbar"
              rows={5}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                width: '100%',
                marginBottom: '1rem',
              }}
              value={testInputJson}
              onChange={e => setTestInputJson(e.target.value)}
              placeholder="e.g. { &quot;expression&quot;: &quot;10 * 5&quot; }"
            />

            {/* Test Result Display */}
            {testResult && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-mono)',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: testResult.status === 'SUCCESS' ? '#4ade80' : '#ef4444' }}>
                    Status: {testResult.status}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{testResult.execution_time_ms} ms</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {testResult.message}
                </div>
                {testResult.details && (
                  <pre
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      fontSize: '0.75rem',
                      background: 'var(--bg-secondary)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTestModalTool(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Icon name="refresh" size={14} className="animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Icon name="play" size={14} />
                    <span>Run Health Check</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

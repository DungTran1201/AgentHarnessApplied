'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Rule, RuleSummary, ActivationMode, RuleScope, RuleStatus } from '@/types';
import { RuleService } from '@/services/ruleService';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast, { ToastMessage } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import TextFileImportModal from '@/components/common/TextFileImportModal';
import { formatErrorMessage } from '@/lib/errors';

export default function RulesListPage() {
  const router = useRouter();
  const [rules, setRules] = useState<RuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'user' | 'system'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Feedback
  const [ruleToDelete, setRuleToDelete] = useState<RuleSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [deleteWarningText, setDeleteWarningText] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await RuleService.getRules({
        search: debouncedQuery,
        scope: scopeFilter,
        activation_mode: modeFilter !== 'all' ? modeFilter : undefined,
        status: statusFilter,
        page,
        limit: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      setRules(res.items || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Không thể tải danh sách quy tắc.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, scopeFilter, modeFilter, statusFilter, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggleStatus = async (rule: RuleSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rule.is_editable) return;
    const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
    try {
      setTogglingId(rule.id);
      await RuleService.updateRuleStatus(rule.id, nextStatus);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: nextStatus } : r));
      showToast('success', `Đã chuyển "${rule.name}" sang trạng thái ${nextStatus === 'active' ? 'Hoạt động' : 'Tạm ngưng'}`);
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Lỗi cập nhật trạng thái quy tắc.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleClone = async (rule: RuleSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setCloningId(rule.id);
      const cloned = await RuleService.cloneRule(rule.id);
      showToast('success', `Đã nhân bản: "${cloned.name}"`);
      loadRules();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Lỗi nhân bản quy tắc.'));
    } finally {
      setCloningId(null);
    }
  };

  const handleOpenDelete = async (rule: RuleSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rule.is_editable) return;
    setRuleToDelete(rule);
    if (rule.associated_projects_count > 0) {
      setDeleteWarningText(
        `Quy tắc này đang được áp dụng trong ${rule.associated_projects_count} dự án. Việc xóa sẽ tự động gỡ liên kết quy tắc khỏi các dự án đó.`
      );
    } else {
      setDeleteWarningText(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
      setIsDeleting(true);
      await RuleService.deleteRule(ruleToDelete.id, true);
      showToast('success', `Đã xóa quy tắc "${ruleToDelete.name}" thành công.`);
      setRuleToDelete(null);
      loadRules();
    } catch (err: any) {
      showToast('error', formatErrorMessage(err, 'Không thể xóa quy tắc.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getScopeBadge = (scope: RuleScope) => {
    if (scope === 'system') {
      return (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Icon name="shield" size={10} />
          System
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 'var(--radius-xs)',
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <Icon name="user" size={10} />
        User
      </span>
    );
  };

  const getModeBadge = (mode: ActivationMode) => {
    const config: Record<ActivationMode, { label: string; color: string; bg: string }> = {
      always_on: { label: 'Always On', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
      model_decision: { label: 'Model Decision', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      glob: { label: 'Glob Pattern', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
      manual: { label: 'Manual', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
    };
    const c = config[mode] || config.always_on;
    return (
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 500,
          padding: '2px 6px',
          borderRadius: 'var(--radius-xs)',
          background: c.bg,
          color: c.color,
          border: `1px solid ${c.color}33`
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <PageHeader
          title="Rules Library"
          description="Quản lý các quy tắc, tiêu chuẩn kiến trúc, ràng buộc an ninh và chỉ dẫn hành vi dài hạn cho Trợ lý ảo AI-Chan."
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTextImportModal(true)}
          >
            <Icon name="upload" size={14} />
            <span>Nhập Từ Tệp</span>
          </button>
          <Link href="/rules/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            <Icon name="plus" size={14} />
            <span>Tạo Quy Tắc Mới</span>
          </Link>
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng số Quy Tắc:</span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {totalItems}
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đang hoạt động:</span>
              <span className="badge badge-active">
                {rules.filter(r => r.status === 'active').length} active
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hệ thống:</span>
              <span
                className="badge"
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}
              >
                {rules.filter(r => r.scope === 'system').length} system
              </span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cá nhân:</span>
              <span
                className="badge"
                style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}
              >
                {rules.filter(r => r.scope === 'user').length} user
              </span>
            </div>
          </div>
        </div>

        {/* Controls Bar: Filters & Search */}
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
          {/* Scope Segmented Control */}
          <div className="segmented-control" role="tablist" aria-label="Lọc quy tắc theo phạm vi">
            {[
              { id: 'all', label: 'Tất cả Scope' },
              { id: 'system', label: 'Hệ thống (System)' },
              { id: 'user', label: 'Cá nhân (User)' },
            ].map(f => (
              <button
                key={f.id}
                role="tab"
                aria-selected={scopeFilter === f.id}
                onClick={() => { setScopeFilter(f.id as any); setPage(1); }}
                className={`segmented-item ${scopeFilter === f.id ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search, Triggers, Status, View mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
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
                placeholder="Tìm kiếm theo tên, mô tả hoặc tag..."
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

            {/* Triggers Filter */}
            <select
              value={modeFilter}
              onChange={e => { setModeFilter(e.target.value); setPage(1); }}
              className="select"
              style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
              aria-label="Lọc theo cơ chế kích hoạt"
            >
              <option value="all">Tất cả Triggers</option>
              <option value="always_on">Always On</option>
              <option value="model_decision">Model Decision</option>
              <option value="glob">Glob Pattern</option>
              <option value="manual">Manual</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="select"
              style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.8125rem', width: 'auto' }}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ngưng</option>
            </select>

            {/* View Mode Toggle */}
            <div className="segmented-control" role="group" aria-label="Chế độ hiển thị">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`segmented-item ${viewMode === 'grid' ? 'active' : ''}`}
                title="Dạng lưới thẻ"
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`segmented-item ${viewMode === 'table' ? 'active' : ''}`}
                title="Dạng bảng dữ liệu"
              >
                Bảng
              </button>
            </div>
          </div>
        </div>

        {/* State 1: Error */}
        {error && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid rgba(240, 113, 120, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadRules}>
              Thử Lại
            </button>
          </div>
        )}

        {/* State 2: Loading Skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div
                key={n}
                style={{
                  height: '180px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }}
              />
            ))}
          </div>
        )}

        {/* State 3: Empty State (No rules at all in user library) */}
        {!loading && !error && rules.length === 0 && !debouncedQuery && scopeFilter === 'all' && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <Icon name="rules" size={48} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Thư viện quy tắc đang trống
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Bạn chưa tạo quy tắc nào. Hãy khởi tạo quy chuẩn coding, phong cách trả lời hoặc chính sách an ninh đầu tiên!
            </p>
            <Link href="/rules/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              <Icon name="plus" size={14} />
              <span>Tạo Quy Tắc Đầu Tiên</span>
            </Link>
          </div>
        )}

        {/* State 4: No Results State (Search/filter matches 0) */}
        {!loading && !error && rules.length === 0 && (debouncedQuery || scopeFilter !== 'all' || modeFilter !== 'all') && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Không tìm thấy quy tắc nào khớp với điều kiện tìm kiếm và bộ lọc hiện tại.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setScopeFilter('all');
                setModeFilter('all');
                setStatusFilter('active');
              }}
            >
              Xóa Bộ Lọc
            </button>
          </div>
        )}

        {/* State 5: Populated Grid View */}
        {!loading && !error && rules.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {rules.map(rule => (
              <div
                key={rule.id}
                onClick={() => router.push(`/rules/${rule.id}`)}
                role="button"
                tabIndex={0}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  {/* Top badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {getScopeBadge(rule.scope)}
                      {getModeBadge(rule.activation_mode)}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-disabled)' }}>
                      P: {rule.priority}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {rule.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      height: '2.8em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      marginBottom: '10px'
                    }}
                  >
                    {rule.description || 'Không có mô tả.'}
                  </p>

                  {/* Tags */}
                  {rule.tags && rule.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {rule.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                      {rule.tags.length > 3 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-disabled)' }}>
                          +{rule.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata and Actions */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Status switch */}
                    <button
                      type="button"
                      disabled={!rule.is_editable || togglingId === rule.id}
                      onClick={e => handleToggleStatus(rule, e)}
                      title={rule.is_editable ? `Chuyển sang ${rule.status === 'active' ? 'Inactive' : 'Active'}` : 'System Rule (Không thể tắt)'}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: rule.is_editable ? 'pointer' : 'not-allowed',
                        background: rule.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: rule.status === 'active' ? '#10b981' : '#94a3b8'
                      }}
                    >
                      {rule.status === 'active' ? '● Hoạt động' : '○ Tạm ngưng'}
                    </button>
                    {rule.associated_projects_count > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {rule.associated_projects_count} dự án
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={e => handleClone(rule, e)}
                      disabled={cloningId === rule.id}
                      className="btn-icon"
                      title="Nhân bản quy tắc"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Icon name="copy" size={14} />
                    </button>
                    {rule.is_editable && (
                      <button
                        type="button"
                        onClick={e => handleOpenDelete(rule, e)}
                        className="btn-icon"
                        title="Xóa quy tắc"
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State 5: Populated Table View */}
        {!loading && !error && rules.length > 0 && viewMode === 'table' && (
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Tên Quy Tắc</th>
                  <th style={{ padding: '10px 14px' }}>Scope</th>
                  <th style={{ padding: '10px 14px' }}>Kích Hoạt</th>
                  <th style={{ padding: '10px 14px' }}>Ưu Tiên</th>
                  <th style={{ padding: '10px 14px' }}>Dự Án</th>
                  <th style={{ padding: '10px 14px' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr
                    key={rule.id}
                    onClick={() => router.push(`/rules/${rule.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{rule.name}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rule.description || 'Không có mô tả'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{getScopeBadge(rule.scope)}</td>
                    <td style={{ padding: '10px 14px' }}>{getModeBadge(rule.activation_mode)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{rule.priority}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{rule.associated_projects_count}</td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={!rule.is_editable}
                        onClick={e => handleToggleStatus(rule, e)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          border: 'none',
                          cursor: rule.is_editable ? 'pointer' : 'default',
                          background: rule.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                          color: rule.status === 'active' ? '#10b981' : '#94a3b8'
                        }}
                      >
                        {rule.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={e => handleClone(rule, e)}
                        title="Nhân bản"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Icon name="copy" size={14} />
                      </button>
                      {rule.is_editable && (
                        <button
                          type="button"
                          onClick={e => handleOpenDelete(rule, e)}
                          title="Xóa"
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', marginLeft: '6px' }}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Text File Import Modal */}
        <TextFileImportModal
          isOpen={showTextImportModal}
          target="rules"
          existingNames={rules.map(r => r.name)}
          onClose={() => setShowTextImportModal(false)}
          onSuccess={(imported) => {
            showToast('success', `Đã nhập thành công quy tắc "${imported.name}"`);
            loadRules();
          }}
        />

        {/* Confirm Delete Modal */}
        {ruleToDelete && (
          <ConfirmDialog
            isOpen={Boolean(ruleToDelete)}
            title={`Xác nhận xóa "${ruleToDelete.name}"?`}
            message={
              deleteWarningText ||
              'Bạn có chắc chắn muốn xóa quy tắc này? Quy tắc sẽ được chuyển sang trạng thái lưu trữ và ẩn khỏi thư viện.'
            }
            confirmLabel={isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
            cancelLabel="Hủy Bỏ"
            isDestructive={true}
            isLoading={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setRuleToDelete(null)}
          />
        )}

        {/* Toast */}
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

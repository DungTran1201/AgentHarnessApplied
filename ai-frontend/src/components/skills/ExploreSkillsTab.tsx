'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import SafeMarkdownViewer from '@/components/rules/SafeMarkdownViewer';
import Pagination from '@/components/ui/Pagination';
import {
  ExternalCatalogProvider,
  ExternalSkillSummary,
  ExternalSkillDetail,
  ExternalSkillCategory,
  ExternalSkillConflictDetail,
} from '@/types';
import { SkillService } from '@/services/skillService';
import { formatErrorMessage } from '@/lib/errors';

interface ExploreSkillsTabProps {
  onImportSuccess: (skillId: string, skillName: string) => void;
  onOpenLocalSkill: (skillId: string) => void;
}

export default function ExploreSkillsTab({
  onImportSuccess,
  onOpenLocalSkill,
}: ExploreSkillsTabProps) {
  // Provider info & sync state
  const [provider, setProvider] = useState<ExternalCatalogProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);

  // Catalog items & categories
  const [skills, setSkills] = useState<ExternalSkillSummary[]>([]);
  const [categories, setCategories] = useState<ExternalSkillCategory[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail & Preview Modal state
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [skillDetail, setSkillDetail] = useState<ExternalSkillDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'preview' | 'raw' | 'security'>('preview');

  // Import & Conflict state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [conflictDetail, setConflictDetail] = useState<ExternalSkillConflictDetail | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [customImportName, setCustomImportName] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load providers info
  const loadProviderInfo = useCallback(async () => {
    try {
      if (typeof SkillService?.getExternalProviders !== 'function') return;
      const providers = await SkillService.getExternalProviders();
      if (providers && providers.length > 0) {
        setProvider(providers[0]);
      }
    } catch {
      // Best-effort
    }
  }, []);

  useEffect(() => {
    loadProviderInfo();
  }, [loadProviderInfo]);

  // Load catalog items
  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (typeof SkillService?.searchExternalSkills !== 'function') {
        throw new Error('Phiên bản giao diện đang được đồng bộ. Vui lòng tải lại trang (Ctrl + F5).');
      }
      const res = await SkillService.searchExternalSkills({
        q: debouncedQuery,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        risk: selectedRisk === 'ALL' ? undefined : selectedRisk,
        page,
        limit: pageSize,
      });

      setSkills(res.items || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.total_pages || 1);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Không thể tải danh mục kỹ năng bên ngoài.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedCategory, selectedRisk, page, pageSize]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Manual refresh / sync catalog
  const handleRefreshCatalog = async () => {
    try {
      setIsRefreshing(true);
      setRefreshMessage(null);
      if (typeof SkillService?.refreshExternalCatalog !== 'function') {
        setRefreshMessage({
          type: 'error',
          text: 'Phiên bản giao diện đang được đồng bộ. Vui lòng nhấn Ctrl + F5 để làm mới trang trình duyệt.',
        });
        return;
      }
      const res = await SkillService.refreshExternalCatalog();
      await loadProviderInfo();
      await loadCatalog();
      setRefreshMessage({
        type: 'success',
        text: `Đã làm mới thành công Awesome Skills catalog (${(res.total_skills || 0).toLocaleString()} kỹ năng).`,
      });
      setTimeout(() => setRefreshMessage(null), 5000);
    } catch (err: any) {
      setRefreshMessage({
        type: 'error',
        text: formatErrorMessage(err, 'Không thể đồng bộ danh mục từ GitHub.'),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Skill Detail Modal
  const handleOpenDetail = async (skillId: string) => {
    setActiveSkillId(skillId);
    setSkillDetail(null);
    setDetailTab('preview');
    try {
      setLoadingDetail(true);
      if (typeof SkillService?.getExternalSkillDetail !== 'function') {
        throw new Error('Phiên bản giao diện đang được đồng bộ. Vui lòng tải lại trang (Ctrl + F5).');
      }
      const detail = await SkillService.getExternalSkillDetail(skillId);
      setSkillDetail(detail);
      setCustomImportName(detail.name || skillId);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Không thể tải chi tiết kỹ năng.'));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Trigger Import Dialog
  const handleStartImport = () => {
    setConflictDetail(null);
    setImportStatusMessage(null);
    setShowConfirmModal(true);
  };

  // Perform Import with selected conflict action
  const handleExecuteImport = async (conflictAction?: 'RENAME' | 'REPLACE' | 'SKIP') => {
    if (!skillDetail) return;
    try {
      setIsImporting(true);
      setImportStatusMessage(null);

      const res = await SkillService.importExternalSkill(skillDetail.source_skill_id, {
        conflict_action: conflictAction,
        target_name: customImportName.trim() || undefined,
      });

      setShowConfirmModal(false);
      setActiveSkillId(null);
      setSkillDetail(null);

      if (res.imported && res.skill_id) {
        onImportSuccess(res.skill_id, res.name || skillDetail.name);
      }
    } catch (err: any) {
      if (err.conflict) {
        // Backend returned 409 conflict with options
        setConflictDetail(err.conflict);
      } else {
        setImportStatusMessage(err.message || 'Lỗi khi nhập kỹ năng.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Provider & Repository Banner */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sparkles" size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {provider?.name || 'Awesome Skills Catalog'}
              </h3>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                {totalCount > 0 ? `${totalCount.toLocaleString()} Skills` : 'Catalog kết nối'}
              </span>
              {provider?.is_stale && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  Bản lưu đệm (Stale)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.8rem' }}>
              <a
                href={provider?.canonical_url || 'https://github.com/sickn33/agentic-awesome-skills'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                <Icon name="external" size={12} />
                <span>sickn33/agentic-awesome-skills</span>
              </a>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-muted)' }}>License: CC BY 4.0 / MIT</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleRefreshCatalog}
          disabled={isRefreshing}
          style={{ gap: '6px' }}
        >
          <Icon name="refresh" size={14} className={isRefreshing ? 'spin-animation' : ''} />
          <span>{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới Catalog'}</span>
        </button>
      </div>

      {/* Refresh Status Feedback Banner */}
      {refreshMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              refreshMessage.type === 'success'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              refreshMessage.type === 'success'
                ? 'rgba(34, 197, 94, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            color: refreshMessage.type === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon
              name={refreshMessage.type === 'success' ? 'check' : 'alert'}
              size={16}
            />
            <span>{refreshMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* 2. Search & Filters Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '460px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="input"
              placeholder="Tìm kiếm kỹ năng theo tên, mô tả, từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          {/* Risk Level Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mức rủi ro:</span>
            <select
              className="select"
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setPage(1);
              }}
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: '140px' }}
            >
              <option value="ALL">Tất cả rủi ro</option>
              <option value="safe">An toàn (Safe)</option>
              <option value="standard">Tiêu chuẩn (Standard)</option>
              <option value="sensitive">Nhạy cảm (Sensitive)</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        {categories.length > 0 && (
          <div
            className="custom-scrollbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setPage(1);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: selectedCategory === 'ALL' ? 'var(--accent, #6366f1)' : 'var(--bg-elevated)',
                borderColor: selectedCategory === 'ALL' ? 'var(--accent, #6366f1)' : 'var(--border-subtle)',
                color: selectedCategory === 'ALL' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Tất cả ({totalCount})
            </button>
            {categories.slice(0, 16).map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setPage(1);
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '1px solid',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  background: selectedCategory === cat.name ? 'var(--accent, #6366f1)' : 'var(--bg-elevated)',
                  borderColor: selectedCategory === cat.name ? 'var(--accent, #6366f1)' : 'var(--border-subtle)',
                  color: selectedCategory === cat.name ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {cat.name} <span style={{ opacity: 0.7 }}>({cat.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Catalog Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Icon name="refresh" size={24} className="spin-animation" />
          </div>
          <span>Đang tải danh sách kỹ năng từ Awesome Skills catalog...</span>
        </div>
      ) : error ? (
        <div
          className="card"
          style={{
            padding: '2rem',
            textAlign: 'center',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.05)',
          }}
        >
          <Icon name="alert" size={32} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444' }}>Không thể tải Catalog</h4>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setError(null);
              loadCatalog();
            }}
          >
            Thử lại
          </button>
        </div>
      ) : skills.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name="search" size={32} style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Không tìm thấy kỹ năng</h4>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Không có kết quả nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {skills.map((skill) => {
            const isSafe = (skill.risk || 'safe').toLowerCase() === 'safe';
            return (
              <div
                key={skill.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md, 10px)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  background: 'var(--bg-surface)',
                }}
              >
                <div>
                  {/* Category & Risk Badges */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--accent, #6366f1)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {skill.category || 'general'}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        background: isSafe ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: isSafe ? '#22c55e' : '#f59e0b',
                      }}
                    >
                      {skill.risk || 'safe'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {skill.name}
                  </h4>

                  {/* Description */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '3.6em',
                    }}
                  >
                    {skill.description || 'Không có mô tả chi tiết cho kỹ năng này.'}
                  </p>
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    marginTop: '1.25rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {skill.date_added ? `Added: ${skill.date_added}` : 'Awesome Skills'}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenDetail(skill.id)}
                    style={{ fontSize: '0.8rem', padding: '4px 10px', height: 'auto', gap: '4px' }}
                  >
                    <Icon name="doc" size={13} />
                    <span>Xem & Nhập</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            currentPage={page}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            itemLabel="skills"
          />
        </div>
      )}

      {/* 5. Detail & Preview Modal */}
      {activeSkillId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveSkillId(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '820px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg, 12px)',
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-elevated)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {skillDetail?.name || activeSkillId}
                  </h3>
                  {skillDetail?.category && (
                    <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                      {skillDetail.category}
                    </span>
                  )}
                  {skillDetail?.is_imported && (
                    <span className="badge badge-success" style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                      ✓ Đã có trong My Skills
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {skillDetail?.source_path || `skills/${activeSkillId}`}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setActiveSkillId(null)}
                style={{ padding: '6px', color: 'var(--text-muted)' }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '0 1.5rem',
                background: 'var(--bg-surface)',
                gap: '1rem',
              }}
            >
              {[
                { id: 'preview', label: 'Xem trước hướng dẫn (SKILL.md)' },
                { id: 'raw', label: 'Văn bản thô (Raw Markdown)' },
                { id: 'security', label: 'Bảo mật & Giấy phép' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailTab(tab.id as any)}
                  style={{
                    padding: '0.75rem 0.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${detailTab === tab.id ? 'var(--accent, #6366f1)' : 'transparent'}`,
                    color: detailTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Icon name="refresh" size={24} className="spin-animation" style={{ marginBottom: '0.5rem' }} />
                  <div>Đang tải nội dung SKILL.md từ nguồn ngoài...</div>
                </div>
              ) : !skillDetail ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
                  Không thể tải chi tiết kỹ năng.
                </div>
              ) : detailTab === 'preview' ? (
                <div>
                  {/* Security Alert if not safe */}
                  {skillDetail.security_assessment.risk_level !== 'SAFE' && (
                    <div
                      style={{
                        padding: '0.875rem 1rem',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        marginBottom: '1.25rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '4px' }}>
                        Cảnh báo an toàn nội dung
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                        {skillDetail.security_assessment.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {skillDetail.description}
                    </p>
                  </div>

                  <SafeMarkdownViewer content={skillDetail.markdown_body || skillDetail.raw_content} />
                </div>
              ) : detailTab === 'raw' ? (
                <pre
                  style={{
                    margin: 0,
                    padding: '1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {skillDetail.raw_content}
                </pre>
              ) : (
                /* Security & Provenance tab */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Security assessment */}
                  <div
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Icon
                        name={skillDetail.security_assessment.risk_level === 'SAFE' ? 'check' : 'alert'}
                        size={18}
                        style={{
                          color:
                            skillDetail.security_assessment.risk_level === 'SAFE'
                              ? '#22c55e'
                              : '#f59e0b',
                        }}
                      />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Đánh giá an toàn nội dung:{' '}
                        <span
                          style={{
                            color:
                              skillDetail.security_assessment.risk_level === 'SAFE'
                                ? '#22c55e'
                                : '#f59e0b',
                          }}
                        >
                          {skillDetail.security_assessment.risk_level}
                        </span>
                      </h4>
                    </div>
                    {skillDetail.security_assessment.warnings.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Không phát hiện thẻ script độc hại, lệnh thực thi từ xa hoặc chỉ dẫn prompt injection nguy hiểm.
                      </p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {skillDetail.security_assessment.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Provenance Details */}
                  <div
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Nguồn cấp (Repository)
                      </span>
                      <a
                        href={skillDetail.source_repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent, #6366f1)', textDecoration: 'none' }}
                      >
                        {skillDetail.source_repository_url}
                      </a>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Đường dẫn tệp nguồn
                      </span>
                      <code style={{ fontFamily: 'var(--font-mono)' }}>{skillDetail.source_path}/SKILL.md</code>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Mã băm nội dung SHA-256
                      </span>
                      <code style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        {skillDetail.source_content_hash}
                      </code>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Giấy phép & Ghi nhận tác giả
                      </span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {skillDetail.source_license}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {skillDetail.attribution}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-elevated)',
              }}
            >
              <div>
                {skillDetail?.is_imported && skillDetail.local_skill_id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setActiveSkillId(null);
                      onOpenLocalSkill(skillDetail.local_skill_id!);
                    }}
                    style={{ fontSize: '0.85rem', gap: '6px' }}
                  >
                    <Icon name="edit" size={14} />
                    <span>Mở trong My Skills</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveSkillId(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartImport}
                  disabled={!skillDetail || loadingDetail}
                  style={{ gap: '6px' }}
                >
                  <Icon name="upload" size={14} />
                  <span>{skillDetail?.is_imported ? 'Cập nhật / Nhập lại' : 'Nhập vào My Skills'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Import Confirmation & Duplicate Conflict Modal */}
      {showConfirmModal && skillDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {conflictDetail ? (
              /* Conflict Resolution View */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="alert" size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      Phát hiện kỹ năng đã tồn tại
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {conflictDetail.conflict_type === 'DUPLICATE_SOURCE'
                        ? 'Cùng nguồn gốc Awesome Skills'
                        : 'Trùng tên kỹ năng nội bộ'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.875rem 1rem',
                    background: conflictDetail.is_locally_modified
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'var(--bg-elevated)',
                    border: `1px solid ${
                      conflictDetail.is_locally_modified
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'var(--border-subtle)'
                    }`,
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    {conflictDetail.message}
                  </p>
                  {conflictDetail.is_locally_modified && (
                    <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.8rem' }}>
                      Cảnh báo: Bạn đã chỉnh sửa tệp nội bộ này. Nếu chọn ghi đè (REPLACE), những sửa đổi trước đây sẽ bị thay thế bằng nội dung gốc từ Awesome Skills.
                    </strong>
                  )}
                </div>

                {importStatusMessage && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {importStatusMessage}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleExecuteImport('RENAME')}
                    disabled={isImporting}
                    style={{ justifyContent: 'center' }}
                  >
                    {isImporting ? 'Đang xử lý...' : 'Tạo bản sao mới (Đổi tên tự động)'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleExecuteImport('REPLACE')}
                    disabled={isImporting}
                    style={{
                      justifyContent: 'center',
                      borderColor: conflictDetail.is_locally_modified ? 'rgba(239, 68, 68, 0.5)' : undefined,
                      color: conflictDetail.is_locally_modified ? '#ef4444' : undefined,
                    }}
                  >
                    Ghi đè nội dung local (REPLACE)
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isImporting}
                    style={{ justifyContent: 'center' }}
                  >
                    Bỏ qua (Hủy)
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Import Confirmation View */
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Xác nhận nhập Kỹ năng vào AI-Chan
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Kỹ năng được nhập từ kho lưu trữ cộng đồng ngoài (Awesome Skills). Vui lòng xem kỹ trước khi sử dụng.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Tên kỹ năng lưu trong thư viện:
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={customImportName}
                    onChange={(e) => setCustomImportName(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <strong>Bản quyền:</strong> {skillDetail.source_license}
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    <strong>Nguồn:</strong> {skillDetail.source_repository_url}
                  </div>
                </div>

                {importStatusMessage && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {importStatusMessage}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isImporting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleExecuteImport()}
                    disabled={isImporting || !customImportName.trim()}
                  >
                    {isImporting ? 'Đang nhập...' : 'Xác nhận nhập'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

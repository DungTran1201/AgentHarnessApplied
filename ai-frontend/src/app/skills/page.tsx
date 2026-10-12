'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SkillSummary, SkillStatus } from '@/types';
import { SkillService } from '@/services/skillService';

export default function SkillsListPage() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('updated_desc');

  // Modals & Actions
  const [skillToDelete, setSkillToDelete] = useState<SkillSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await SkillService.getSkills(debouncedQuery, statusFilter, sourceFilter, sortOption);
      setSkills(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách kỹ năng');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, statusFilter, sourceFilter, sortOption]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleDelete = async () => {
    if (!skillToDelete) return;
    try {
      setIsDeleting(true);
      await SkillService.deleteSkill(skillToDelete.id);
      showToast(`Đã xóa vĩnh viễn kỹ năng '${skillToDelete.name}'!`);
      setSkillToDelete(null);
      loadSkills();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa kỹ năng', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = async (skill: SkillSummary) => {
    try {
      setCloningId(skill.id);
      const cloned = await SkillService.cloneSkill(skill.id);
      showToast(`Đã nhân bản thành công: '${cloned.name}'!`);
      loadSkills();
    } catch (err: any) {
      showToast(err.message || 'Không thể nhân bản kỹ năng', 'error');
    } finally {
      setCloningId(null);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Vui lòng chọn tệp .zip để nhập', 'error');
      return;
    }

    try {
      setIsImporting(true);
      const imported = await SkillService.importSkill(importFile);
      showToast(`Nhập thành công gói kỹ năng: '${imported.name}'!`);
      setShowImportModal(false);
      setImportFile(null);
      loadSkills();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi nhập gói kỹ năng', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const validCount = skills.filter((s) => s.status === 'VALID').length;
  const draftCount = skills.filter((s) => s.status === 'DRAFT').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.9rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              ✨
            </div>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI-Chan
            </span>
          </Link>
        </div>

        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Trang chủ
          </Link>
          <Link href="/chat" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Chat
          </Link>
          <Link href="/projects" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Projects
          </Link>
          <Link href="/prompts" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            System Prompts
          </Link>
          <Link
            href="/skills"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderBottom: '2px solid #a855f7',
              paddingBottom: '4px',
            }}
          >
            Kỹ năng (Skills)
          </Link>
          <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Cài đặt
          </Link>
        </nav>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📦</span>
            <span>Nhập gói (.zip)</span>
          </button>
          <Link
            href="/skills/new"
            style={{
              background: 'var(--accent-gradient)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--accent-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span>
            <span>Tạo Skill Mới</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Title & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span>🧩</span>
              <span>Thư Viện Kỹ Năng Agent (Skills Library)</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Quản lý các tập chỉ dẫn và tài nguyên chuẩn hóa theo đặc tả Agent Skills (SKILL.md), mở rộng năng lực Agent tái sử dụng.
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Tổng số Skill</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{skills.length}</span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Đạt chuẩn</span>
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{validCount}</span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>Bản nháp</span>
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem' }}>{draftCount}</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm kỹ năng theo tên hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px 8px 36px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'VALID', label: 'Đạt chuẩn' },
              { id: 'DRAFT', label: 'Bản nháp' },
              { id: 'INVALID', label: 'Lỗi' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setStatusFilter(p.id)}
                style={{
                  background: statusFilter === p.id ? 'var(--accent-gradient)' : 'var(--bg-primary)',
                  color: statusFilter === p.id ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="updated_desc">Mới cập nhật nhất</option>
              <option value="name_asc">Tên A-Z</option>
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>⚠️ {error}</span>
            <button
              onClick={loadSkills}
              style={{
                background: 'transparent',
                border: '1px solid #f87171',
                color: '#f87171',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Skeleton Loading State */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  border: '1px solid var(--border-subtle)',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  opacity: 0.6,
                }}
              >
                <div style={{ height: '20px', width: '60%', background: 'var(--border-subtle)', borderRadius: '4px' }} />
                <div style={{ height: '14px', width: '90%', background: 'var(--border-subtle)', borderRadius: '4px' }} />
                <div style={{ height: '14px', width: '75%', background: 'var(--border-subtle)', borderRadius: '4px' }} />
                <div style={{ marginTop: 'auto', height: '12px', width: '40%', background: 'var(--border-subtle)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State: Chưa có kỹ năng nào */}
        {!loading && !error && skills.length === 0 && !debouncedQuery && statusFilter === 'ALL' && (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-subtle)',
              maxWidth: '600px',
              margin: '2rem auto',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧩</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Bạn chưa có kỹ năng Agent nào
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Kỹ năng (Skill) giúp mở rộng năng lực của Agent bằng các hướng dẫn chuyên sâu và tài liệu tái sử dụng theo chuẩn Agent Skills.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link
                href="/skills/new"
                style={{
                  background: 'var(--accent-gradient)',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                + Tạo Skill đầu tiên
              </Link>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Nhập gói mẫu (.zip)
              </button>
            </div>
          </div>
        )}

        {/* No Search Results */}
        {!loading && !error && skills.length === 0 && (debouncedQuery || statusFilter !== 'ALL') && (
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Không tìm thấy kỹ năng phù hợp
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Không có kỹ năng nào khớp với từ khóa &quot;{debouncedQuery}&quot; hoặc bộ lọc đã chọn.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Skill Card Grid */}
        {!loading && !error && skills.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {skills.map((skill) => {
              const isValid = skill.status === 'VALID';
              const isDraft = skill.status === 'DRAFT';
              const statusBg = isValid ? 'rgba(16, 185, 129, 0.15)' : isDraft ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
              const statusColor = isValid ? '#10b981' : isDraft ? '#f59e0b' : '#ef4444';
              const statusLabel = isValid ? 'Đạt chuẩn' : isDraft ? 'Bản nháp' : 'Lỗi chuẩn';

              return (
                <div
                  key={skill.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📁</span>
                      <Link
                        href={`/skills/${skill.id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {skill.name}
                      </Link>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span
                        style={{
                          background: statusBg,
                          color: statusColor,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: `1px solid ${statusColor}33`,
                        }}
                      >
                        {statusLabel}
                      </span>
                      {skill.source_type === 'IMPORTED' && (
                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                          }}
                        >
                          ZIP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {skill.description}
                  </p>

                  {/* Card Meta Footer */}
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span>📄 {skill.file_count} tệp</span>
                      <span>•</span>
                      <span>{formatDate(skill.updated_at)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Clone */}
                      <button
                        title="Nhân bản kỹ năng"
                        disabled={cloningId === skill.id}
                        onClick={() => handleClone(skill)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        {cloningId === skill.id ? '⏳' : '📑'}
                      </button>

                      {/* Export */}
                      <a
                        href={SkillService.getExportUrl(skill.id)}
                        download
                        title="Xuất gói .zip"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '0.9rem',
                          textDecoration: 'none',
                        }}
                      >
                        ⬇️
                      </a>

                      {/* Edit link */}
                      <Link
                        href={`/skills/${skill.id}`}
                        title="Xem & Chỉnh sửa"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '0.9rem',
                          textDecoration: 'none',
                        }}
                      >
                        ✏️
                      </Link>

                      {/* Delete */}
                      <button
                        title="Xóa kỹ năng"
                        onClick={() => setSkillToDelete(skill)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {skillToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác nhận xóa kỹ năng?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Hành động này sẽ xóa vĩnh viễn kỹ năng <strong style={{ color: '#fff' }}>{skillToDelete.name}</strong> cùng toàn bộ các tệp tài nguyên trên hệ thống tệp lưu trữ. Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                disabled={isDeleting}
                onClick={() => setSkillToDelete(null)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Hủy
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Nhập Gói Kỹ Năng (.zip)
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-primary)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                  {importFile ? importFile.name : 'Nhấp để chọn tệp .zip'}
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  Giới hạn tối đa 10 MB. Gói nén phải chứa tệp SKILL.md tại thư mục gốc.
                </p>
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setShowImportModal(false)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  style={{
                    background: 'var(--accent-gradient)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    opacity: isImporting || !importFile ? 0.6 : 1,
                  }}
                >
                  {isImporting ? 'Đang thẩm định & Nhập...' : 'Bắt đầu nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

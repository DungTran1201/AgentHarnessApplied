'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SystemPromptSummary } from '@/types';
import { SystemPromptService } from '@/services/systemPromptService';

export default function SystemPromptsListPage() {
  const [prompts, setPrompts] = useState<SystemPromptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortOption, setSortOption] = useState('updated_desc');

  // Modal & Toast States
  const [promptToDelete, setPromptToDelete] = useState<SystemPromptSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await SystemPromptService.getPrompts(debouncedQuery, sortOption);
      setPrompts(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách System Prompt');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sortOption]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleCopyContent = async (prompt: SystemPromptSummary) => {
    try {
      const detail = await SystemPromptService.getPrompt(prompt.id);
      await navigator.clipboard.writeText(detail.content);
      setCopiedId(prompt.id);
      showToast(`Đã sao chép nội dung '${prompt.name}' vào clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      showToast(err.message || 'Không thể sao chép nội dung', 'error');
    }
  };

  const handleClone = async (prompt: SystemPromptSummary) => {
    try {
      setCloningId(prompt.id);
      const cloned = await SystemPromptService.clonePrompt(prompt.id);
      showToast(`Đã nhân bản thành công: '${cloned.name}'`);
      loadPrompts();
    } catch (err: any) {
      showToast(err.message || 'Không thể nhân bản System Prompt', 'error');
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!promptToDelete) return;
    try {
      setIsDeleting(true);
      await SystemPromptService.deletePrompt(promptToDelete.id);
      showToast(`Đã xóa vĩnh viễn '${promptToDelete.name}'`);
      setPromptToDelete(null);
      loadPrompts();
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa System Prompt', 'error');
    } finally {
      setIsDeleting(false);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: 'var(--accent-glow)'
            }}>
              ✨
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
          <Link href="/prompts" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, borderBottom: '2px solid #a855f7', paddingBottom: '4px' }}>
            System Prompts
          </Link>
          <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Cài đặt
          </Link>
        </nav>

        <div>
          <Link href="/prompts/new" style={{
            background: 'var(--accent-gradient)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--accent-glow)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>➕</span>
            <span>Tạo Prompt Mới</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Title & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📜</span>
              <span>Thư Viện System Prompt</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Quản lý các mẫu chỉ dẫn hệ thống cá nhân hóa độc lập, sẵn sàng tái sử dụng.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tổng số prompt:</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{prompts.length}</span>
          </div>
        </div>

        {/* Toolbar: Search & Sort */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mô tả prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 38px 10px 38px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sắp xếp:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                padding: '9px 14px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="updated_desc">Mới cập nhật nhất</option>
              <option value="name_asc">Tên (A → Z)</option>
              <option value="length_desc">Nội dung dài nhất</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadPrompts}
            style={{
              padding: '9px 14px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span>
            <span>Làm mới</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            padding: '1.25rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Lỗi tải dữ liệu:</strong> {error}
            </div>
            <button
              onClick={loadPrompts}
              style={{
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 0.6
              }}>
                <div>
                  <div style={{ width: '60%', height: '22px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ width: '90%', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '40%', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <div style={{ width: '30%', height: '16px', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
                  <div style={{ width: '30%', height: '28px', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State (When no prompts created yet) */}
        {!loading && prompts.length === 0 && !debouncedQuery && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '2rem auto'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📜</div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Chưa có System Prompt nào
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
              Hãy tạo prompt đầu tiên để cá nhân hóa chỉ dẫn hoạt động của các mô hình AI. Bạn có thể sao chép, chỉnh sửa hoặc nhân bản bất cứ lúc nào.
            </p>
            <Link href="/prompts/new" style={{
              background: 'var(--accent-gradient)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--accent-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>➕</span>
              <span>Tạo System Prompt Đầu Tiên</span>
            </Link>
          </div>
        )}

        {/* No Search Results State */}
        {!loading && prompts.length === 0 && debouncedQuery && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '2rem auto'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Không tìm thấy kết quả phù hợp
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Không có System Prompt nào khớp với từ khóa &ldquo;{debouncedQuery}&rdquo;.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        )}

        {/* Prompts Cards Grid */}
        {!loading && prompts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Card Header: Title & Character Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '0.75rem' }}>
                    <h3 style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {prompt.name}
                    </h3>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-full)',
                      whiteSpace: 'nowrap'
                    }}>
                      {prompt.content_length.toLocaleString('vi-VN')} ký tự
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{
                    color: prompt.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    marginBottom: '1.25rem',
                    fontStyle: prompt.description ? 'normal' : 'italic',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {prompt.description || 'Chưa có mô tả'}
                  </p>
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.875rem',
                    marginTop: '0.5rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span>Cập nhật: {formatDate(prompt.updated_at)}</span>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyContent(prompt)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        background: copiedId === prompt.id ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)',
                        border: '1px solid',
                        borderColor: copiedId === prompt.id ? 'var(--success)' : 'var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: copiedId === prompt.id ? 'var(--success)' : 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Sao chép toàn bộ nội dung prompt vào clipboard"
                    >
                      <span>{copiedId === prompt.id ? '✓' : '📋'}</span>
                      <span>{copiedId === prompt.id ? 'Đã chép' : 'Sao chép'}</span>
                    </button>

                    {/* Clone Button */}
                    <button
                      type="button"
                      onClick={() => handleClone(prompt)}
                      disabled={cloningId === prompt.id}
                      style={{
                        padding: '7px 12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: cloningId === prompt.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Tạo bản sao mới từ prompt này"
                    >
                      <span>{cloningId === prompt.id ? '⏳' : '📑'}</span>
                      <span>Nhân bản</span>
                    </button>

                    {/* Edit Button */}
                    <Link
                      href={`/prompts/${prompt.id}/edit`}
                      style={{
                        padding: '7px 12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Chỉnh sửa tên, mô tả hoặc nội dung prompt"
                    >
                      <span>✏️</span>
                      <span>Sửa</span>
                    </Link>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setPromptToDelete(prompt)}
                      style={{
                        padding: '7px 10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--danger)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Xóa vĩnh viễn prompt này"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {promptToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.8rem', color: 'var(--danger)' }}>⚠️</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Xác nhận xóa System Prompt
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa vĩnh viễn System Prompt sau không?
            </p>

            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              borderLeft: '3px solid var(--danger)'
            }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                {promptToDelete.name}
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {promptToDelete.content_length.toLocaleString('vi-VN')} ký tự
              </span>
            </div>

            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '1.75rem', fontWeight: 500 }}>
              Hành động này là vĩnh viễn và không thể hoàn tác.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPromptToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: '9px 18px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  padding: '9px 20px',
                  background: 'var(--danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SystemPromptService } from '@/services/systemPromptService';

export default function EditSystemPromptPage() {
  const router = useRouter();
  const params = useParams();
  const promptId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [initialData, setInitialData] = useState<{ name: string; description: string; content: string }>({
    name: '',
    description: '',
    content: '',
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form dirty check: any difference from initial values
  const isDirty =
    name !== initialData.name ||
    description !== initialData.description ||
    content !== initialData.content;

  useEffect(() => {
    if (!promptId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await SystemPromptService.getPrompt(promptId);
        const init = {
          name: data.name,
          description: data.description || '',
          content: data.content,
        };
        setInitialData(init);
        setName(init.name);
        setDescription(init.description);
        setContent(init.content);
      } catch (err: any) {
        setLoadError(err.message || 'Không tìm thấy System Prompt hoặc bạn không có quyền truy cập.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [promptId]);

  const handleCancel = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push('/prompts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên cho System Prompt.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Tên System Prompt không được vượt quá 100 ký tự.');
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setErrorMsg('Vui lòng nhập nội dung chỉ dẫn cho System Prompt.');
      return;
    }
    if (content.length > 10000) {
      setErrorMsg('Nội dung System Prompt không được vượt quá 10.000 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      await SystemPromptService.updatePrompt(promptId, {
        name: trimmedName,
        description: description.trim() || null,
        content: content,
      });

      router.push('/prompts');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật System Prompt. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
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
          <Link href="/prompts" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <Link href="/prompts" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            System Prompts
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            Chỉnh sửa
          </span>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          ← Quay lại thư viện
        </button>
      </header>

      {/* Main Content Form */}
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✏️</span>
            <span>Chỉnh Sửa System Prompt</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Cập nhật tên, mô tả hoặc tinh chỉnh nội dung chỉ dẫn hoạt động của prompt.
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2.5rem',
            opacity: 0.6
          }}>
            <div style={{ width: '40%', height: '24px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '20px' }} />
            <div style={{ width: '100%', height: '42px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '24px' }} />
            <div style={{ width: '30%', height: '20px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '14px' }} />
            <div style={{ width: '100%', height: '260px', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
          </div>
        )}

        {/* Load Error State */}
        {!loading && loadError && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem' }}>
              Không thể tải System Prompt
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {loadError}
            </p>
            <Link href="/prompts" style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '9px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              display: 'inline-block'
            }}>
              Quay lại danh sách System Prompt
            </Link>
          </div>
        )}

        {/* Edit Form */}
        {!loading && !loadError && (
          <>
            {errorMsg && (
              <div style={{
                padding: '1rem 1.25rem',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem'
              }}>
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Field: Name */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label htmlFor="prompt-name" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    Tên System Prompt <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: name.length > 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {name.length} / 100
                  </span>
                </div>
                <input
                  id="prompt-name"
                  type="text"
                  placeholder="Ví dụ: Chuyên Gia Python & Clean Architecture..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Field: Description */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label htmlFor="prompt-desc" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    Mô tả mục đích sử dụng <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: description.length > 500 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {description.length} / 500
                  </span>
                </div>
                <textarea
                  id="prompt-desc"
                  rows={2}
                  placeholder="Tóm tắt ngắn gọn ngữ cảnh hoặc trường hợp phù hợp để dùng prompt này..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Field: Content */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label htmlFor="prompt-content" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    Nội dung System Prompt <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: content.length > 10000 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                    {content.length.toLocaleString('vi-VN')} / 10.000 ký tự
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  Hỗ trợ đầy đủ Unicode, tiếng Việt, thụt đầu dòng (indentation), Markdown và emoji.
                </p>
                <textarea
                  id="prompt-content"
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={10000}
                  required
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
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
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !content.trim()}
                  style={{
                    padding: '10px 26px',
                    background: isSubmitting || !name.trim() || !content.trim() ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    cursor: isSubmitting || !name.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: isSubmitting || !name.trim() || !content.trim() ? 'none' : 'var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{isSubmitting ? '⏳' : '💾'}</span>
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      {/* Dirty Form Exit Confirmation Modal */}
      {showExitConfirm && (
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
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Hủy thay đổi chưa lưu?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              Bạn có các thay đổi chưa được cập nhật. Nếu rời khỏi trang này, mọi thay đổi bạn vừa chỉnh sửa sẽ bị mất.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '9px 18px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => router.push('/prompts')}
                style={{
                  padding: '9px 18px',
                  background: 'var(--danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Hủy bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

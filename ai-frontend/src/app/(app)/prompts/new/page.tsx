'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SystemPromptService } from '@/services/systemPromptService';

export default function CreateSystemPromptPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form dirty check: any input entered
  const isDirty = name.trim().length > 0 || description.trim().length > 0 || content.trim().length > 0;

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

    // Validation
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
      await SystemPromptService.createPrompt({
        name: trimmedName,
        description: description.trim() || null,
        content: content,
      });

      router.push('/prompts');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo System Prompt. Vui lòng thử lại.');
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
            Tạo mới
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
            <span>➕</span>
            <span>Tạo Mới System Prompt</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Thiết lập chỉ dẫn hệ thống độc lập để định hình phong cách, vai trò hoặc quy tắc xử lý cho AI.
          </p>
        </div>

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
              placeholder={`Bạn là chuyên gia Senior Software Engineer. Khi phản hồi người dùng:\n1. Giải thích súc tích, đi thẳng vào bản chất kỹ thuật.\n2. Viết mã nguồn sạch, tối ưu thời gian thực thi.\n3. Luôn sử dụng Type Hinting và kiểm tra biên dữ liệu đầu vào.`}
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
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu System Prompt'}</span>
            </button>
          </div>
        </form>
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
              Bạn có dữ liệu prompt chưa được lưu. Nếu rời khỏi trang này, mọi thay đổi bạn vừa nhập sẽ bị mất.
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

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RuleService } from '@/services/ruleService';
import { ActivationMode } from '@/types/rule';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SafeMarkdownViewer from '@/components/rules/SafeMarkdownViewer';
import { formatErrorMessage } from '@/lib/errors';

export default function CreateRulePage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<number>(50);
  const [activationMode, setActivationMode] = useState<ActivationMode>('always_on');
  const [globPatternsInput, setGlobPatternsInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // UI states
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Dirty state tracking
  const isDirty = Boolean(
    name.trim() ||
    description.trim() ||
    content.trim() ||
    tags.length > 0 ||
    globPatternsInput.trim() ||
    priority !== 50 ||
    activationMode !== 'always_on'
  );

  const handleCancel = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push('/rules');
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (trimmed && !tags.includes(trimmed)) {
      if (tags.length >= 10) {
        setErrorMsg('Tối đa 10 tags trên mỗi quy tắc.');
        return;
      }
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Tên quy tắc không được để trống.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Tên quy tắc không được vượt quá 100 ký tự.');
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setErrorMsg('Nội dung quy tắc không được để trống.');
      return;
    }
    if (content.length > 10000) {
      setErrorMsg('Nội dung quy tắc không được vượt quá 10,000 ký tự.');
      return;
    }

    // Process glob patterns if in glob mode
    let patterns: string[] = [];
    if (activationMode === 'glob') {
      patterns = globPatternsInput
        .split(/[,\n]/)
        .map(p => p.trim())
        .filter(Boolean);

      if (patterns.length === 0) {
        setErrorMsg('Vui lòng chỉ định ít nhất một glob pattern cho chế độ File Pattern / Glob.');
        return;
      }

      // Security check: reject path traversal
      for (const p of patterns) {
        if (p.includes('..') || p.startsWith('/') || p.startsWith('\\')) {
          setErrorMsg(`Pattern "${p}" không hợp lệ: Không được chứa ký tự điều hướng (..) hoặc đường dẫn tuyệt đối.`);
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      await RuleService.createRule({
        name: trimmedName,
        description: description.trim() || null,
        content: content,
        priority: Number(priority),
        activation_mode: activationMode,
        glob_patterns: patterns,
        tags: tags,
      });

      router.push('/rules');
    } catch (err: any) {
      setErrorMsg(formatErrorMessage(err, 'Không thể tạo quy tắc. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container" style={{ maxWidth: '960px' }}>
        <PageHeader
          title="Tạo Quy Tắc Mới"
          description="Thiết lập các tiêu chuẩn code, kiến trúc, và quy ước kỹ thuật để AI tuân thủ."
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
          >
            <Icon name="chevronLeft" size={13} />
            <span>Thư Viện Rules</span>
          </button>
        </PageHeader>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(240, 113, 120, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8125rem',
            }}
          >
            <Icon name="alert" size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem' }}>
          {/* Rule Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="rule-name" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                Tên Quy Tắc <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: name.length > 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {name.length} / 100
              </span>
            </div>
            <input
              id="rule-name"
              type="text"
              className="input"
              placeholder="Ví dụ: TypeScript Strict Mode & Không dùng any"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="rule-desc" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                Mô Tả Tóm Tắt <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: description.length > 500 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {description.length} / 500
              </span>
            </div>
            <textarea
              id="rule-desc"
              rows={2}
              className="textarea"
              placeholder="Tóm tắt ngắn gọn mục tiêu của quy tắc và hoàn cảnh áp dụng..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Config Grid: Activation, Priority */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            {/* Activation Mode */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Chế Độ Kích Hoạt
              </label>
              <select
                className="input"
                style={{ fontSize: '0.8125rem' }}
                value={activationMode}
                onChange={e => setActivationMode(e.target.value as ActivationMode)}
              >
                <option value="always_on">Luôn Áp Dụng (Always On)</option>
                <option value="glob">Khớp Theo File Pattern (Glob)</option>
                <option value="model_decision">Mô Hình Tự Quyết Định (Model Decision)</option>
                <option value="manual">Thủ Công (Manual)</option>
              </select>
            </div>

            {/* Priority Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Độ Ưu Tiên (Priority)
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {priority} / 100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* Conditional: Glob Patterns */}
          {activationMode === 'glob' && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem', background: 'rgba(92, 207, 230, 0.05)', border: '1px solid rgba(92, 207, 230, 0.2)', borderRadius: 'var(--radius-sm)' }}>
              <label htmlFor="glob-patterns" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                File Match Patterns <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                Nhập các mẫu đường dẫn phân tách bằng dấu phẩy hoặc dòng mới (ví dụ: <code>*.ts, src/**/*.tsx, models/*.py</code>). Không cho phép chứa <code>..</code>.
              </p>
              <input
                id="glob-patterns"
                type="text"
                className="input"
                placeholder="*.ts, src/**/*.tsx"
                value={globPatternsInput}
                onChange={e => setGlobPatternsInput(e.target.value)}
              />
            </div>
          )}

          {/* Tags */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Tags Phân Loại <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn, tối đa 10 tags)</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="input"
                style={{ maxWidth: '240px' }}
                placeholder="Thêm tag (ví dụ: security)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Thêm Tag
              </button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Editor with Tab switcher (Write vs Safe Preview) */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  Nội Dung Quy Tắc (Markdown) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('write')}
                    style={{
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '3px',
                      border: 'none',
                      background: activeTab === 'write' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'write' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: activeTab === 'write' ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    Soạn Thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    style={{
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '3px',
                      border: 'none',
                      background: activeTab === 'preview' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: activeTab === 'preview' ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    Xem Trước An Toàn
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: content.length > 10000 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                {content.length.toLocaleString()} / 10,000 ký tự
              </span>
            </div>

            {activeTab === 'write' ? (
              <textarea
                rows={14}
                className="textarea"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 1.6 }}
                placeholder={`# Quy Tắc: TypeScript Strict\n\n## Hướng Dẫn\n- Không dùng 'any'; hãy dùng 'unknown' kèm type narrowing.\n- Luôn khai báo kiểu dữ liệu trả về cho hàm.\n\n\`\`\`typescript\nfunction parseUser(input: unknown): User {\n  // ...\n}\n\`\`\``}
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={10000}
                required
              />
            ) : (
              <div
                style={{
                  minHeight: '280px',
                  maxHeight: '480px',
                  overflowY: 'auto',
                  padding: '1rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {content.trim() ? (
                  <SafeMarkdownViewer content={content} />
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                    Chưa có nội dung để xem trước. Vui lòng nhập chỉ dẫn ở tab Soạn Thảo.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !name.trim() || !content.trim()}
            >
              {isSubmitting ? 'Đang Tạo...' : 'Tạo Quy Tắc'}
            </button>
          </div>
        </form>
      </div>

      {/* Discard confirmation dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Hủy bỏ thay đổi chưa lưu?"
        message="Bạn có thay đổi chưa lưu trong quy tắc này. Nếu rời khỏi trang, tiến trình của bạn sẽ bị mất."
        confirmLabel="Rời Đi"
        cancelLabel="Tiếp Tục Soạn"
        isDestructive={true}
        onConfirm={() => router.push('/rules')}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}

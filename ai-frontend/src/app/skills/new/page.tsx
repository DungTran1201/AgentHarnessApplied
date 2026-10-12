'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SkillService } from '@/services/skillService';
import { SkillValidationReport, ValidationErrorItem, ValidationWarningItem } from '@/types';

const DEFAULT_TEMPLATE = {
  name: 'code-review-assistant',
  description: 'Chuyên gia rà soát mã nguồn tự động, phát hiện lỗ hổng bảo mật OWASP và đề xuất tái cấu trúc theo Clean Architecture.',
  license: 'MIT',
  compatibility: 'Python 3.10+, Node.js 18+',
  instructions: `# Code Review Assistant

## Giới thiệu
Kỹ năng này hướng dẫn Agent phân tích mã nguồn một cách có hệ thống, tập trung vào:
1. Tính đúng đắn của logic nghiệp vụ.
2. An toàn bảo mật (kiểm tra SQL Injection, XSS, Path Traversal).
3. Hiệu năng và chuẩn phong cách mã nguồn.

## Quy trình đánh giá
- **Bước 1:** Đọc hiểu ngữ cảnh và yêu cầu bài toán.
- **Bước 2:** Xác định các điểm biên (edge cases) và kiểm thử đầu vào.
- **Bước 3:** Đề xuất mã nguồn cải tiến bằng khối code Markdown rõ ràng.

## Ví dụ đầu ra
\`\`\`python
# Khối mã mẫu minh họa sau khi tối ưu
def process_data(items: list[str]) -> list[str]:
    return [item.strip() for item in items if item]
\`\`\`
`
};

export default function CreateSkillPage() {
  const router = useRouter();

  // Mode: 'visual' | 'raw' | 'preview'
  const [activeTab, setActiveTab] = useState<'visual' | 'raw' | 'preview'>('visual');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [instructions, setInstructions] = useState('');
  const [rawContent, setRawContent] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<SkillValidationReport | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Sinh nội dung raw SKILL.md từ visual fields
  const buildRawFromFields = useCallback((
    n: string,
    d: string,
    l: string,
    c: string,
    inst: string
  ) => {
    let frontmatter = `---\nname: ${n || 'untitled'}\ndescription: ${d || ''}\n`;
    if (l.trim()) frontmatter += `license: ${l.trim()}\n`;
    if (c.trim()) frontmatter += `compatibility: ${c.trim()}\n`;
    frontmatter += `---\n\n`;
    return frontmatter + (inst || '');
  }, []);

  // Trigger server-side validation
  const triggerValidation = useCallback(async (rawSkillMd: string) => {
    if (!rawSkillMd.trim()) {
      setValidationResult(null);
      return;
    }
    setIsValidating(true);
    try {
      const res = await SkillService.validateSkill(rawSkillMd);
      setValidationResult(res);
    } catch {
      // Ignored during debounce
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Nạp template mẫu chuẩn
  const loadTemplate = () => {
    setName(DEFAULT_TEMPLATE.name);
    setDescription(DEFAULT_TEMPLATE.description);
    setLicense(DEFAULT_TEMPLATE.license);
    setCompatibility(DEFAULT_TEMPLATE.compatibility);
    setInstructions(DEFAULT_TEMPLATE.instructions);
    const raw = buildRawFromFields(
      DEFAULT_TEMPLATE.name,
      DEFAULT_TEMPLATE.description,
      DEFAULT_TEMPLATE.license,
      DEFAULT_TEMPLATE.compatibility,
      DEFAULT_TEMPLATE.instructions
    );
    setRawContent(raw);
    triggerValidation(raw);
  };

  // Debounced auto-validate khi fields thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = buildRawFromFields(name, description, license, compatibility, instructions);
      triggerValidation(raw);
    }, 600);
    return () => clearTimeout(timer);
  }, [name, description, license, compatibility, instructions, buildRawFromFields, triggerValidation]);

  // Cập nhật Raw content khi chuyển sang tab Raw
  const handleSwitchTab = (tab: 'visual' | 'raw' | 'preview') => {
    if (tab === 'raw' && activeTab === 'visual') {
      setRawContent(buildRawFromFields(name, description, license, compatibility, instructions));
    }
    setActiveTab(tab);
  };

  // Đồng bộ từ Raw sang Visual fields
  const syncFromRaw = (rawText: string) => {
    setRawContent(rawText);
    const match = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (match) {
      const yamlPart = match[1];
      const bodyPart = match[2];
      setInstructions(bodyPart);

      const nMatch = yamlPart.match(/^name:\s*(.+)$/m);
      if (nMatch) setName(nMatch[1].trim());

      const dMatch = yamlPart.match(/^description:\s*(.+)$/m);
      if (dMatch) setDescription(dMatch[1].trim());

      const lMatch = yamlPart.match(/^license:\s*(.+)$/m);
      if (lMatch) setLicense(lMatch[1].trim());

      const cMatch = yamlPart.match(/^compatibility:\s*(.+)$/m);
      if (cMatch) setCompatibility(cMatch[1].trim());
    } else {
      setInstructions(rawText);
    }
  };

  const isDirty = name.trim().length > 0 || description.trim().length > 0 || instructions.trim().length > 0;

  const handleCancel = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push('/skills');
    }
  };

  const handleSubmit = async (action: 'SAVE_DRAFT' | 'ACTIVATE') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên (name) cho Kỹ năng.');
      return;
    }

    if (action === 'ACTIVATE') {
      if (!description.trim()) {
        setErrorMsg('Kích hoạt kỹ năng yêu cầu trường Mô tả (description) không được để trống.');
        return;
      }
      if (validationResult && !validationResult.is_valid) {
        setErrorMsg(`Không thể kích hoạt vì còn ${validationResult.errors.length} lỗi không tuân thủ đặc tả Agent Skills.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await SkillService.createSkill({
        name: trimmedName,
        description: description.trim(),
        license: license.trim() || undefined,
        compatibility: compatibility.trim() || undefined,
        content_markdown: instructions,
        action: action,
      });

      setSuccessMsg(
        action === 'ACTIVATE'
          ? 'Đã tạo và kích hoạt Kỹ năng thành công!'
          : 'Đã lưu bản nháp Kỹ năng thành công!'
      );

      setTimeout(() => {
        router.push(`/skills/${res.id}`);
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo Kỹ năng. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
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
          <Link href="/skills" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              🧩
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI-Chan
            </span>
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <Link href="/skills" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Kỹ năng Agent
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            Tạo mới
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadTemplate}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--accent)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📝</span>
            <span>Nạp template mẫu</span>
          </button>

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
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Title & Description */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>➕</span>
            <span>Tạo Mới Kỹ Năng Agent (Skill)</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Thiết lập gói kỹ năng chuyên biệt định dạng <code style={{ color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>SKILL.md</code> theo chuẩn quốc tế Agent Skills.
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Grid: Form & Inspector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1.75rem', alignItems: 'start' }}>
          {/* Left Column: Form & Tabs */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Tab Header */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                type="button"
                onClick={() => handleSwitchTab('visual')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === 'visual' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'visual' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'visual' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: activeTab === 'visual' ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📋</span>
                <span>Soạn thảo trực quan</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('raw')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === 'raw' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'raw' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'raw' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: activeTab === 'raw' ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📄</span>
                <span>Mã nguồn SKILL.md</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('preview')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === 'preview' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'preview' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'preview' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: activeTab === 'preview' ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>👁️</span>
                <span>Xem trước</span>
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ padding: '2rem' }}>
              {activeTab === 'visual' && (
                <div>
                  {/* Name */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="skill-name" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Tên kỹ năng (name) <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.8rem', color: name.length > 64 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {name.length} / 64
                      </span>
                    </div>
                    <input
                      id="skill-name"
                      type="text"
                      placeholder="ví-dụ: code-review-assistant (chữ thường, số, dấu gạch ngang)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={64}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none'
                      }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                      Định danh độc nhất theo chuẩn Agent Skills: chỉ gồm <code style={{ color: 'var(--accent)' }}>a-z</code>, <code style={{ color: 'var(--accent)' }}>0-9</code> và dấu <code style={{ color: 'var(--accent)' }}>-</code>. Không bắt đầu hoặc kết thúc bằng dấu gạch ngang.
                    </p>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="skill-desc" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Mô tả tóm tắt (description) <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.8rem', color: description.length > 1024 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {description.length} / 1024
                      </span>
                    </div>
                    <textarea
                      id="skill-desc"
                      rows={3}
                      placeholder="Mô tả cụ thể khả năng của kỹ năng để Agent nhận diện khi nào nên sử dụng..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1024}
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

                  {/* 2-Columns: License & Compatibility */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label htmlFor="skill-license" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Giấy phép (license) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
                      </label>
                      <input
                        id="skill-license"
                        type="text"
                        placeholder="MIT, Apache-2.0, Proprietary..."
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="skill-compat" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Tương thích (compatibility) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
                      </label>
                      <input
                        id="skill-compat"
                        type="text"
                        placeholder="Python 3.10+, Docker, Node.js..."
                        value={compatibility}
                        onChange={(e) => setCompatibility(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Instructions Markdown */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="skill-instructions" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Nội dung hướng dẫn chi tiết (instructions Markdown)
                      </label>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {instructions.length.toLocaleString('vi-VN')} ký tự
                      </span>
                    </div>
                    <textarea
                      id="skill-instructions"
                      rows={14}
                      placeholder="# Tiêu đề hướng dẫn kỹ năng&#10;&#10;## Mục tiêu&#10;- Hướng dẫn Agent xử lý...&#10;&#10;## Các bước thực hiện&#10;1. ..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
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
                </div>
              )}

              {activeTab === 'raw' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label htmlFor="skill-raw" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      Mã nguồn tệp SKILL.md thô
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tự động phân tách Frontmatter & Body
                    </span>
                  </div>
                  <textarea
                    id="skill-raw"
                    rows={20}
                    value={rawContent}
                    onChange={(e) => syncFromRaw(e.target.value)}
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
              )}

              {activeTab === 'preview' && (
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  minHeight: '400px'
                }}>
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.5rem',
                    borderLeft: '3px solid var(--accent)'
                  }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {name || 'untitled'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {description || 'Chưa có mô tả.'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {license && <span>📜 Giấy phép: {license}</span>}
                      {compatibility && <span>⚙️ Môi trường: {compatibility}</span>}
                    </div>
                  </div>

                  <div style={{
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    lineHeight: '1.6'
                  }}>
                    {instructions || '(Chưa có nội dung hướng dẫn)'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('SAVE_DRAFT')}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>💾</span>
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('ACTIVATE')}
                  disabled={isSubmitting || (validationResult !== null && !validationResult.is_valid)}
                  style={{
                    padding: '10px 24px',
                    background: (validationResult !== null && !validationResult.is_valid) ? 'rgba(59, 130, 246, 0.3)' : 'var(--accent-gradient)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: (validationResult !== null && !validationResult.is_valid) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    boxShadow: 'var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🚀</span>
                  <span>{isSubmitting ? 'Đang xử lý...' : 'Lưu & Kích hoạt'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Validation Inspector Panel */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔍</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Thanh Tra Xác Thực
                </h3>
              </div>
              {isValidating && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Đang quét...</span>
              )}
            </div>

            {/* Validation Status Indicator */}
            {validationResult ? (
              <div>
                {validationResult.is_valid ? (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#6ee7b7',
                    fontSize: '0.85rem'
                  }}>
                    <span>✅</span>
                    <span>Tuân thủ 100% đặc tả Agent Skills! Sẵn sàng kích hoạt.</span>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fca5a5',
                    fontSize: '0.85rem'
                  }}>
                    <span>❌</span>
                    <span>Phát hiện {validationResult.errors.length} lỗi vi phạm đặc tả.</span>
                  </div>
                )}

                {/* Errors List */}
                {validationResult.errors.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                      Lỗi Bắt Buộc ({validationResult.errors.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {validationResult.errors.map((err: ValidationErrorItem, idx: number) => (
                        <div key={idx} style={{
                          padding: '10px',
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 700, color: '#f87171' }}>{err.code}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Trường: {err.field}</span>
                          </div>
                          <div style={{ color: 'var(--text-primary)' }}>{err.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings List */}
                {validationResult.warnings.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                      Khuyến Nghị Cải Thiện ({validationResult.warnings.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {validationResult.warnings.map((warn: ValidationWarningItem, idx: number) => (
                        <div key={idx} style={{
                          padding: '10px',
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 700, color: '#fbbf24' }}>{warn.code}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Trường: {warn.field}</span>
                          </div>
                          <div style={{ color: 'var(--text-primary)' }}>{warn.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem' }}>
                <p>Nhập thông tin kỹ năng để kiểm tra tính tuân thủ với chuẩn quốc tế Agent Skills.</p>
              </div>
            )}

            {/* Spec Rules Cheat Sheet */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Ràng buộc đặc tả Agent Skills:
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                <li>Tên kỹ năng tối đa 64 ký tự (chữ thường, số, gạch ngang).</li>
                <li>Mô tả tóm tắt không quá 1024 ký tự.</li>
                <li>Tệp SKILL.md bắt buộc có YAML frontmatter hợp lệ.</li>
                <li>Thư mục <code>scripts/</code> chỉ lưu trữ, không chạy tự động.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Rời khỏi trang tạo kỹ năng?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Bạn có các thay đổi chưa được lưu. Nếu rời đi lúc này, mọi dữ liệu vừa nhập sẽ bị mất.
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
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => router.push('/skills')}
                style={{
                  padding: '9px 18px',
                  background: 'var(--danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                Rời đi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

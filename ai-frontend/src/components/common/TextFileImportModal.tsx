'use client';

import React, { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import SafeMarkdownViewer from '@/components/rules/SafeMarkdownViewer';
import {
  ALLOWED_TEXT_EXTENSIONS,
  readAndValidateTextFile,
  extractItemMetadata,
  ParsedItemMetadata,
  toKebabCase,
} from '@/lib/textImportParser';
import { SkillService } from '@/services/skillService';
import { RuleService } from '@/services/ruleService';
import { SystemPromptService } from '@/services/systemPromptService';
import { formatErrorMessage } from '@/lib/errors';

export interface TextFileImportModalProps {
  isOpen: boolean;
  target: 'skills' | 'rules' | 'prompts';
  existingNames?: string[];
  onClose: () => void;
  onSuccess: (importedItem: any) => void;
}

export default function TextFileImportModal({
  isOpen,
  target,
  existingNames = [],
  onClose,
  onSuccess,
}: TextFileImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed metadata state
  const [metadata, setMetadata] = useState<ParsedItemMetadata | null>(null);

  // Form edit fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [previewTab, setPreviewTab] = useState<'formatted' | 'raw'>('formatted');

  // Specific to Rules
  const [activationMode, setActivationMode] = useState<'always_on' | 'model_decision' | 'glob' | 'manual'>('always_on');
  const [globPatternsText, setGlobPatternsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [priority, setPriority] = useState<number>(50);

  // Specific to Skills
  const [skillAction, setSkillAction] = useState<'ACTIVATE' | 'SAVE_DRAFT'>('ACTIVATE');
  const [showAdvancedSkill, setShowAdvancedSkill] = useState(false);
  const [license, setLicense] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [allowedTools, setAllowedTools] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setMetadata(null);
      setError(null);
      setName('');
      setDescription('');
      setDragOver(false);
      setIsReading(false);
      setIsImporting(false);
      setShowAdvancedSkill(false);
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isImporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImporting, onClose]);

  if (!isOpen) return null;

  const targetTitles = {
    skills: {
      modalTitle: 'Nhập Agent Skill từ tệp',
      itemType: 'Skill',
      hint: 'Hỗ trợ tệp SKILL.md với YAML frontmatter hoặc bất kỳ tệp tài liệu văn bản (.md, .txt, .json...).',
    },
    rules: {
      modalTitle: 'Nhập Rule từ tệp văn bản',
      itemType: 'Rule',
      hint: 'Hỗ trợ tệp Markdown (.md), văn bản (.txt, .rst) hoặc cấu hình (.yaml, .json).',
    },
    prompts: {
      modalTitle: 'Nhập System Prompt từ tệp',
      itemType: 'System Prompt',
      hint: 'Hỗ trợ tệp văn bản hoặc Markdown. Bảo toàn Unicode tiếng Việt, emoji và placeholder như {input}.',
    },
  };

  const currentConfig = targetTitles[target];

  // Process chosen file
  const handleFileProcess = async (file: File) => {
    try {
      setIsReading(true);
      setError(null);
      const readResult = await readAndValidateTextFile(file);
      const parsed = extractItemMetadata(target, readResult.filename, readResult.content, readResult.sizeBytes);

      setMetadata(parsed);
      setName(parsed.name);
      setDescription(parsed.description);

      if (target === 'rules') {
        setActivationMode(parsed.activation_mode || 'always_on');
        setGlobPatternsText(parsed.glob_patterns?.join(', ') || '');
        setTagsText(parsed.tags?.join(', ') || 'imported');
        setPriority(parsed.priority !== undefined ? parsed.priority : 50);
      } else if (target === 'skills') {
        setLicense(parsed.license || '');
        setCompatibility(parsed.compatibility || '');
        setAllowedTools(parsed.allowed_tools || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi đọc tệp.');
    } finally {
      setIsReading(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  // Check collision with existing items
  const normalizedCurrentName = name.trim().toLowerCase();
  const isDuplicate = existingNames.some(n => n.trim().toLowerCase() === normalizedCurrentName);

  // Submit Handler
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadata || isImporting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Tên mục không được để trống.');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      let createdItem: any = null;

      if (target === 'skills') {
        const skillName = toKebabCase(trimmedName);
        createdItem = await SkillService.importSkillText({
          filename: metadata.filename,
          content: metadata.content,
          name: skillName,
          description: description.trim(),
          action: skillAction,
          license: license.trim() || undefined,
          compatibility: compatibility.trim() || undefined,
          allowed_tools: allowedTools.trim() || undefined,
          metadata: metadata.metadata,
        });
      } else if (target === 'rules') {
        const globs = globPatternsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const tags = tagsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        createdItem = await RuleService.importRuleText({
          filename: metadata.filename,
          content: metadata.content,
          name: trimmedName,
          description: description.trim() || undefined,
          activation_mode: activationMode,
          glob_patterns: globs,
          tags: tags.length > 0 ? tags : ['imported'],
          priority: Number(priority) || 50,
        });
      } else {
        // Prompts
        createdItem = await SystemPromptService.importPromptText({
          filename: metadata.filename,
          content: metadata.content,
          name: trimmedName,
          description: description.trim() || undefined,
        });
      }

      onSuccess(createdItem);
      onClose();
    } catch (err: any) {
      setError(formatErrorMessage(err, `Không thể nhập ${currentConfig.itemType}.`));
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: metadata ? '760px' : '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          padding: 0,
          overflow: 'hidden',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="doc" size={16} />
            </div>
            <div>
              <h2
                id="import-modal-title"
                style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
              >
                {currentConfig.modalTitle}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                {currentConfig.hint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Đóng cửa sổ"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="custom-scrollbar"
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Error Alert */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Icon name="alert" size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontWeight: 600 }}>Lỗi nhập tệp:</strong> {error}
              </div>
            </div>
          )}

          {/* STEP 1: Select / Drop file */}
          {!metadata ? (
            <div>
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
                  background: dragOver ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: isReading ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TEXT_EXTENSIONS.join(',')}
                  onChange={onFileInputChange}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  <Icon name="upload" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isReading ? 'Đang đọc và phân tích tệp tin...' : 'Kéo thả tệp văn bản vào đây, hoặc nhấn để duyệt file'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Định dạng hỗ trợ: {ALLOWED_TEXT_EXTENSIONS.join(', ')} • Tối đa 5 MB
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={isReading}
                  style={{ marginTop: '6px' }}
                >
                  <Icon name="doc" size={13} />
                  <span>Chọn tệp từ máy tính</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview & Confirm Metadata */
            <form onSubmit={handleImportSubmit}>
              {/* File details bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="doc" size={16} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {metadata.filename}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Định dạng: <span className="badge badge-secondary">{metadata.extension}</span> • Dung lượng:{' '}
                      {formatFileSize(metadata.sizeBytes)} • {metadata.hasFrontmatter ? 'Có YAML Frontmatter' : 'Văn bản thuần'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMetadata(null);
                    setError(null);
                  }}
                  disabled={isImporting}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Icon name="refresh" size={12} />
                  <span>Đổi tệp khác</span>
                </button>
              </div>

              {/* Collision warning banner */}
              {isDuplicate && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(234, 179, 8, 0.12)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    color: '#eab308',
                    fontSize: '0.8125rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name="alert" size={15} />
                  <span>
                    Tên <strong>&quot;{name.trim()}&quot;</strong> đã tồn tại trong thư viện của bạn. Bạn nên chỉnh sửa tên bên dưới để tránh lỗi trùng lặp khi nhập.
                  </span>
                </div>
              )}

              {/* Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Title / Name */}
                <div>
                  <label
                    htmlFor="import-item-name"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Tên {currentConfig.itemType} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="import-item-name"
                    type="text"
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder={`Tên gợi nhớ cho ${currentConfig.itemType}`}
                    style={{ width: '100%' }}
                  />
                  {target === 'skills' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Định dạng chuẩn Skill: chữ thường, số, dấu gạch nối (sẽ tự động chuẩn hóa sang kebab-case khi lưu: &quot;
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{toKebabCase(name)}</span>&quot;).
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="import-item-desc"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Mô tả tóm tắt
                  </label>
                  <textarea
                    id="import-item-desc"
                    className="input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    maxLength={target === 'skills' ? 1024 : 500}
                    placeholder={`Mục đích và phạm vi sử dụng của ${currentConfig.itemType}`}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Library-Specific Extra Controls */}
                {target === 'rules' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      background: 'var(--bg-elevated)',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Activation Mode
                      </label>
                      <select
                        className="input"
                        value={activationMode}
                        onChange={e => setActivationMode(e.target.value as any)}
                        style={{ width: '100%', height: '34px', fontSize: '0.8125rem' }}
                      >
                        <option value="always_on">Always On (Mặc định)</option>
                        <option value="model_decision">Model Decision</option>
                        <option value="glob">Glob Pattern</option>
                        <option value="manual">Manual Trigger</option>
                      </select>
                    </div>

                    {activationMode === 'glob' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                          Glob Patterns (cách nhau bởi dấu phẩy)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={globPatternsText}
                          onChange={e => setGlobPatternsText(e.target.value)}
                          placeholder="*.ts, src/**/*.py"
                          style={{ width: '100%', height: '34px', fontSize: '0.8125rem' }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Mức ưu tiên (0 - 100)
                      </label>
                      <input
                        type="number"
                        className="input"
                        min={0}
                        max={100}
                        value={priority}
                        onChange={e => setPriority(Number(e.target.value))}
                        style={{ width: '100%', height: '34px', fontSize: '0.8125rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Tags
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={tagsText}
                        onChange={e => setTagsText(e.target.value)}
                        placeholder="architecture, security, coding"
                        style={{ width: '100%', height: '34px', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>
                )}

                {target === 'skills' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Trạng thái kích hoạt:
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="skillAction"
                          checked={skillAction === 'ACTIVATE'}
                          onChange={() => setSkillAction('ACTIVATE')}
                        />
                        <span>Kích hoạt ngay (Activate)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="skillAction"
                          checked={skillAction === 'SAVE_DRAFT'}
                          onChange={() => setSkillAction('SAVE_DRAFT')}
                        />
                        <span>Lưu bản nháp (Draft)</span>
                      </label>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowAdvancedSkill(!showAdvancedSkill)}
                        style={{ padding: '4px 0', fontSize: '0.75rem', color: 'var(--accent)' }}
                      >
                        <Icon name={showAdvancedSkill ? 'chevronDown' : 'chevronRight'} size={12} />
                        <span>{showAdvancedSkill ? 'Ẩn thông tin mở rộng' : 'Xem thông tin mở rộng (License, Tools)'}</span>
                      </button>

                      {showAdvancedSkill && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '10px',
                            padding: '10px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                              License
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={license}
                              onChange={e => setLicense(e.target.value)}
                              placeholder="MIT, Apache-2.0..."
                              style={{ width: '100%', height: '32px', fontSize: '0.8125rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                              Compatibility
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={compatibility}
                              onChange={e => setCompatibility(e.target.value)}
                              placeholder="python >= 3.10"
                              style={{ width: '100%', height: '32px', fontSize: '0.8125rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                              Allowed Tools
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={allowedTools}
                              onChange={e => setAllowedTools(e.target.value)}
                              placeholder="bash, git, curl"
                              style={{ width: '100%', height: '32px', fontSize: '0.8125rem' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Safe Content Preview Area */}
              <div style={{ marginTop: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Xem trước nội dung văn bản
                  </label>
                  <div className="segmented-control" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === 'formatted'}
                      className={`segmented-control-item ${previewTab === 'formatted' ? 'active' : ''}`}
                      onClick={() => setPreviewTab('formatted')}
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                    >
                      Định dạng xem trước
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === 'raw'}
                      className={`segmented-control-item ${previewTab === 'raw' ? 'active' : ''}`}
                      onClick={() => setPreviewTab('raw')}
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                    >
                      Văn bản gốc ({metadata.content.length} ký tự)
                    </button>
                  </div>
                </div>

                <div
                  className="custom-scrollbar"
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    padding: '12px',
                    fontSize: '0.8125rem',
                  }}
                >
                  {previewTab === 'formatted' ? (
                    <SafeMarkdownViewer content={metadata.body || metadata.content} />
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {metadata.content}
                    </pre>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ℹ️ Xem trước an toàn: Toàn bộ nội dung gốc UTF-8 và ký tự ngắt dòng sẽ được lưu trữ chính xác 100% vào cơ sở dữ liệu.
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isImporting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isImporting || !name.trim()}
                >
                  {isImporting ? (
                    <>
                      <Icon name="refresh" size={14} className="spin" />
                      <span>Đang nhập dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="upload" size={14} />
                      <span>Xác nhận nhập vào {currentConfig.itemType}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

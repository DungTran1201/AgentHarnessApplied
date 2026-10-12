'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SkillService } from '@/services/skillService';
import {
  SkillDetail,
  SkillValidationReport,
  ValidationErrorItem,
  ValidationWarningItem,
  FileTreeItem
} from '@/types';

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const skillId = resolvedParams.id;

  // Data state
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  // Mode: 'visual' | 'raw' | 'preview' | 'files'
  const [activeTab, setActiveTab] = useState<'visual' | 'raw' | 'preview' | 'files'>('visual');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [instructions, setInstructions] = useState('');
  const [rawContent, setRawContent] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<SkillValidationReport | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Resource Upload State
  const [newFileName, setNewFileName] = useState('guide.md');
  const [newFileFolder, setNewFileFolder] = useState<'references' | 'assets'>('references');
  const [newFileContent, setNewFileContent] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Sinh raw content từ fields
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

  // Fetch skill detail
  const loadSkill = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SkillService.getSkill(skillId);
      setSkill(data);
      setName(data.name);
      setDescription(data.description || '');
      setLicense(data.license || '');
      setCompatibility(data.compatibility || '');

      // Trích xuất instructions từ raw_skill_md nếu có
      let bodyText = data.raw_skill_md;
      const match = data.raw_skill_md?.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (match) {
        bodyText = match[2];
      }
      setInstructions(bodyText || '');
      setRawContent(data.raw_skill_md);

      // Trigger initial validation
      try {
        const val = await SkillService.validateSkill(data.raw_skill_md);
        setValidationResult(val);
      } catch {
        // Ignored
      }
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        setNotFound(true);
      } else if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        setIsForbidden(true);
      } else {
        setErrorMsg(err.message || 'Không thể tải thông tin Kỹ năng.');
      }
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    loadSkill();
  }, [loadSkill]);

  // Validation trigger
  const triggerValidation = useCallback(async (rawSkillMd: string) => {
    if (!rawSkillMd.trim()) return;
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

  // Debounced auto-validate
  useEffect(() => {
    if (!skill) return;
    const timer = setTimeout(() => {
      const raw = buildRawFromFields(name, description, license, compatibility, instructions);
      triggerValidation(raw);
    }, 600);
    return () => clearTimeout(timer);
  }, [name, description, license, compatibility, instructions, skill, buildRawFromFields, triggerValidation]);

  // Switch tabs
  const handleSwitchTab = (tab: 'visual' | 'raw' | 'preview' | 'files') => {
    if (tab === 'raw' && activeTab === 'visual') {
      setRawContent(buildRawFromFields(name, description, license, compatibility, instructions));
    }
    setActiveTab(tab);
  };

  // Sync from Raw to Fields
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

  // Save changes
  const handleSave = async (action: 'SAVE_DRAFT' | 'ACTIVATE') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên cho Kỹ năng.');
      return;
    }

    if (action === 'ACTIVATE') {
      if (!description.trim()) {
        setErrorMsg('Kích hoạt kỹ năng yêu cầu trường Mô tả không được để trống.');
        return;
      }
      if (validationResult && !validationResult.is_valid) {
        setErrorMsg(`Không thể kích hoạt vì còn ${validationResult.errors.length} lỗi không tuân thủ đặc tả.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const raw = buildRawFromFields(trimmedName, description.trim(), license, compatibility, instructions);
      const updated = await SkillService.updateSkill(skillId, {
        name: trimmedName,
        description: description.trim(),
        license: license.trim() || undefined,
        compatibility: compatibility.trim() || undefined,
        content_markdown: instructions,
        raw_skill_md: raw,
        action: action,
        expected_updated_at: skill?.updated_at,
      });

      setSkill(updated);
      setSuccessMsg(
        action === 'ACTIVATE'
          ? 'Đã lưu và kích hoạt Kỹ năng thành công!'
          : 'Đã cập nhật bản nháp Kỹ năng!'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu Kỹ năng. Vui lòng kiểm tra lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export ZIP
  const handleExport = async () => {
    if (!skill) return;
    try {
      setIsExporting(true);
      await SkillService.exportSkillZip(skill.id, skill.name);
      setSuccessMsg(`Đã tải xuống gói ${skill.name}.zip thành công!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xuất tệp ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  // Clone Skill
  const handleClone = async () => {
    if (!skill) return;
    try {
      setIsCloning(true);
      const cloned = await SkillService.cloneSkill(skill.id);
      setSuccessMsg(`Đã nhân bản thành công: ${cloned.name}`);
      setTimeout(() => {
        router.push(`/skills/${cloned.id}`);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể nhân bản kỹ năng.');
    } finally {
      setIsCloning(false);
    }
  };

  // Delete Skill
  const handleDeleteConfirm = async () => {
    if (!skill) return;
    try {
      setIsDeleting(true);
      await SkillService.deleteSkill(skill.id);
      setShowDeleteModal(false);
      router.push('/skills');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa kỹ năng.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Resource File
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileContent.trim()) {
      setErrorMsg('Vui lòng nhập tên tệp và nội dung tệp.');
      return;
    }

    try {
      setIsAddingFile(true);
      setErrorMsg(null);
      const blob = new Blob([newFileContent], { type: 'text/markdown' });
      const file = new File([blob], newFileName.trim(), { type: 'text/markdown' });

      await SkillService.addResource(skillId, file, newFileFolder);
      setSuccessMsg(`Đã thêm tệp ${newFileFolder}/${newFileName} thành công!`);
      setNewFileName('');
      setNewFileContent('');
      await loadSkill();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể thêm tệp tài nguyên.');
    } finally {
      setIsAddingFile(false);
    }
  };

  // Delete Resource File
  const handleDeleteResource = async (filePath: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${filePath}" không?`)) return;
    try {
      setErrorMsg(null);
      await SkillService.deleteResource(skillId, filePath);
      setSuccessMsg(`Đã xóa tệp ${filePath} thành công!`);
      await loadSkill();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa tệp.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <header style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10, 15, 29, 0.85)' }}>
          <div style={{ width: '200px', height: '28px', background: 'var(--bg-tertiary)', borderRadius: '6px' }} />
        </header>
        <main style={{ padding: '3rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          <div style={{ height: '40px', width: '300px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '2rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '2rem' }}>
            <div style={{ height: '500px', background: 'var(--bg-secondary)', borderRadius: '12px' }} />
            <div style={{ height: '350px', background: 'var(--bg-secondary)', borderRadius: '12px' }} />
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔍</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Không tìm thấy Kỹ năng
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px' }}>
          Kỹ năng này không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link href="/skills" style={{
          padding: '10px 22px',
          background: 'var(--accent-gradient)',
          borderRadius: 'var(--radius-sm)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600
        }}>
          ← Quay lại Thư viện
        </Link>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
          Truy cập bị từ chối (403 Forbidden)
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px' }}>
          Kỹ năng này thuộc sở hữu của người dùng khác và được bảo vệ bởi cơ chế Anti-IDOR.
        </p>
        <Link href="/skills" style={{
          padding: '10px 22px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          fontWeight: 600
        }}>
          ← Quay lại Thư viện
        </Link>
      </div>
    );
  }

  if (!skill) return null;

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
            {skill.name}
          </span>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📦</span>
            <span>{isExporting ? 'Đang nén...' : 'Xuất (.zip)'}</span>
          </button>

          <button
            type="button"
            onClick={handleClone}
            disabled={isCloning}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📑</span>
            <span>{isCloning ? 'Đang sao chép...' : 'Nhân bản'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🗑️</span>
            <span>Xóa</span>
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          <Link
            href="/skills"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              textDecoration: 'none',
              padding: '6px 12px'
            }}
          >
            ← Thư viện
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Title Bar with Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {skill.name}
              </h1>

              {/* Status Badge */}
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '12px',
                background: skill.status === 'VALID' ? 'rgba(16, 185, 129, 0.15)' : skill.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: skill.status === 'VALID' ? '#34d399' : skill.status === 'DRAFT' ? '#fbbf24' : '#f87171',
                border: `1px solid ${skill.status === 'VALID' ? '#10b981' : skill.status === 'DRAFT' ? '#f59e0b' : '#ef4444'}`
              }}>
                {skill.status === 'VALID' ? 'Đã Kích Hoạt' : skill.status === 'DRAFT' ? 'Bản Nháp' : 'Không Hợp Lệ'}
              </span>

              {/* Source Badge */}
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '3px 9px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}>
                {skill.source_type === 'IMPORTED' ? 'Nhập từ ZIP' : 'Tự Tạo'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                📁 {skill.file_tree ? skill.file_tree.length : 1} tệp
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Cập nhật lần cuối: {new Date(skill.updated_at).toLocaleString('vi-VN')}
            </p>
          </div>
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

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1.75rem', alignItems: 'start' }}>
          {/* Left Column: Tabs & Editors */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Tab Headers */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                type="button"
                onClick={() => handleSwitchTab('visual')}
                style={{
                  padding: '12px 18px',
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
                  padding: '12px 18px',
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
                  padding: '12px 18px',
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

              <button
                type="button"
                onClick={() => handleSwitchTab('files')}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: activeTab === 'files' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'files' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'files' ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: activeTab === 'files' ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📁</span>
                <span>Tài nguyên ({skill.file_tree ? skill.file_tree.length : 1})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ padding: '2rem' }}>
              {activeTab === 'visual' && (
                <div>
                  {/* Name */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="edit-skill-name" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Tên kỹ năng (name) <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.8rem', color: name.length > 64 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {name.length} / 64
                      </span>
                    </div>
                    <input
                      id="edit-skill-name"
                      type="text"
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
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="edit-skill-desc" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Mô tả tóm tắt (description) <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.8rem', color: description.length > 1024 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {description.length} / 1024
                      </span>
                    </div>
                    <textarea
                      id="edit-skill-desc"
                      rows={3}
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

                  {/* License & Compatibility */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label htmlFor="edit-skill-license" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Giấy phép (license)
                      </label>
                      <input
                        id="edit-skill-license"
                        type="text"
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
                      <label htmlFor="edit-skill-compat" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Tương thích (compatibility)
                      </label>
                      <input
                        id="edit-skill-compat"
                        type="text"
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

                  {/* Instructions */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="edit-skill-inst" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Nội dung hướng dẫn chi tiết (instructions Markdown)
                      </label>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {instructions.length.toLocaleString('vi-VN')} ký tự
                      </span>
                    </div>
                    <textarea
                      id="edit-skill-inst"
                      rows={14}
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
                    <label htmlFor="edit-skill-raw" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      Mã nguồn tệp SKILL.md thô
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tự động phân tách Frontmatter & Body
                    </span>
                  </div>
                  <textarea
                    id="edit-skill-raw"
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

              {activeTab === 'files' && (
                <div>
                  {/* Safety Warning Notice */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>⚠️</span>
                    <div style={{ fontSize: '0.85rem', color: '#fbbf24', lineHeight: '1.5' }}>
                      <strong>Lưu ý an toàn:</strong> Tệp mã nguồn trong thư mục <code>scripts/</code> chỉ được lưu trữ và nạp làm tài liệu tham khảo cho Agent trong phiên bản hiện tại. Hệ thống <strong>không tự động thực thi</strong> các script này trên máy chủ.
                    </div>
                  </div>

                  {/* Files List Table */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      Danh mục tệp tin trong gói ({skill.file_tree ? skill.file_tree.length : 1})
                    </h4>
                    <div style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: 'var(--bg-tertiary)'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 100px 100px',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}>
                        <div>Đường dẫn tệp</div>
                        <div>Kích thước</div>
                        <div style={{ textAlign: 'right' }}>Thao tác</div>
                      </div>

                      {/* Main SKILL.md */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 100px 100px',
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 600 }}>
                          <span>📄</span>
                          <span>SKILL.md (Tệp gốc bắt buộc)</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {(skill.raw_skill_md ? skill.raw_skill_md.length : 0).toLocaleString()} B
                        </div>
                        <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Cố định
                        </div>
                      </div>

                      {/* Additional Resource Files */}
                      {skill.file_tree && skill.file_tree.filter((f: FileTreeItem) => f.path !== 'SKILL.md').map((f: FileTreeItem, idx: number) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 100px 100px',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            <span>{f.path.startsWith('scripts/') ? '⚙️' : f.path.startsWith('references/') ? '📚' : '📎'}</span>
                            <span>{f.path}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {f.size_bytes ? `${f.size_bytes.toLocaleString()} B` : '-'}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteResource(f.path)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f87171',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                padding: '2px 6px'
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Resource Form */}
                  <div style={{
                    padding: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      Thêm tệp tài nguyên mới (.md, .txt, .json)
                    </h4>
                    <form onSubmit={handleAddResource}>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label htmlFor="resource-folder" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                            Thư mục đích
                          </label>
                          <select
                            id="resource-folder"
                            value={newFileFolder}
                            onChange={(e) => setNewFileFolder(e.target.value as 'references' | 'assets')}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          >
                            <option value="references">references/</option>
                            <option value="assets">assets/</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="resource-filename" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                            Tên tệp (Ví dụ: guide.md hoặc config.json)
                          </label>
                          <input
                            id="resource-filename"
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="guide.md"
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontFamily: 'var(--font-mono)',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="resource-content" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                          Nội dung tệp văn bản
                        </label>
                        <textarea
                          id="resource-content"
                          rows={6}
                          value={newFileContent}
                          onChange={(e) => setNewFileContent(e.target.value)}
                          placeholder="# Nội dung tài liệu tham khảo..."
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontFamily: 'var(--font-mono)',
                            outline: 'none',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingFile}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid var(--accent)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--accent)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {isAddingFile ? 'Đang lưu tệp...' : '+ Lưu tệp tài nguyên'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSave('SAVE_DRAFT')}
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
                  onClick={() => handleSave('ACTIVATE')}
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

            {/* Validation Result Indicator */}
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
            ) : null}

            {/* Spec Rules */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Đặc tả kỹ thuật chuẩn:
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                <li>Tên kỹ năng phải khớp với tên thư mục.</li>
                <li>Mô tả giúp Agent tự động phát hiện ngữ cảnh phù hợp.</li>
                <li>Có thể tải lên tài liệu tham khảo vào <code>references/</code>.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>Xác nhận xóa Kỹ năng?</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa kỹ năng <strong style={{ color: 'var(--text-primary)' }}>{skill.name}</strong> không? Hành động này sẽ xóa vĩnh viễn tệp <code style={{ color: 'var(--accent)' }}>SKILL.md</code> cùng toàn bộ tài nguyên liên quan trong storage và không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
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
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
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
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

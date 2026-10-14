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
import Icon from '@/components/ui/Icon';
import PageHeader from '@/components/ui/PageHeader';
import { getErrorMessage } from '@/lib/errors';

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

  // Build raw content from visual fields
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

      // Extract instructions body from raw_skill_md if available
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
        setErrorMsg(getErrorMessage(err, 'Failed to load skill details.'));
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
      // Ignored
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Debounced auto-validate
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const raw = buildRawFromFields(name, description, license, compatibility, instructions);
      triggerValidation(raw);
    }, 600);
    return () => clearTimeout(timer);
  }, [name, description, license, compatibility, instructions, buildRawFromFields, triggerValidation, loading]);

  const handleSwitchTab = (tab: 'visual' | 'raw' | 'preview' | 'files') => {
    if (tab === 'raw' && activeTab === 'visual') {
      setRawContent(buildRawFromFields(name, description, license, compatibility, instructions));
    }
    setActiveTab(tab);
  };

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

  const handleSave = async (action: 'SAVE_DRAFT' | 'ACTIVATE') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Skill name cannot be empty.');
      return;
    }

    if (action === 'ACTIVATE') {
      if (!description.trim()) {
        setErrorMsg('Activating a skill requires a non-empty description.');
        return;
      }
      if (validationResult && !validationResult.is_valid) {
        setErrorMsg(`Cannot activate skill: ${validationResult.errors.length} specification violation(s) remain.`);
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
          ? 'Skill saved and activated successfully.'
          : 'Skill draft updated successfully.'
      );
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to update skill.'));
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
      setSuccessMsg(`Downloaded ${skill.name}.zip package.`);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to export ZIP package.'));
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
      setSuccessMsg(`Cloned skill as: ${cloned.name}`);
      setTimeout(() => {
        router.push(`/skills/${cloned.id}`);
      }, 700);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to clone skill.'));
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
      setErrorMsg(getErrorMessage(err, 'Failed to delete skill.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Resource File
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileContent.trim()) {
      setErrorMsg('Please specify both a file name and content.');
      return;
    }

    try {
      setIsAddingFile(true);
      setErrorMsg(null);
      const blob = new Blob([newFileContent], { type: 'text/markdown' });
      const file = new File([blob], newFileName.trim(), { type: 'text/markdown' });

      await SkillService.addResource(skillId, file, newFileFolder);
      setSuccessMsg(`Added file: ${newFileFolder}/${newFileName}`);
      setNewFileName('');
      setNewFileContent('');
      await loadSkill();
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to add resource file.'));
    } finally {
      setIsAddingFile(false);
    }
  };

  // Delete Resource File
  const handleDeleteResource = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete file "${filePath}"?`)) return;
    try {
      setErrorMsg(null);
      await SkillService.deleteResource(skillId, filePath);
      setSuccessMsg(`Deleted file: ${filePath}`);
      await loadSkill();
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to delete file.'));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ height: '36px', width: '220px', background: 'var(--bg-subtle)', borderRadius: '6px', marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.25rem' }}>
          <div style={{ height: '420px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }} />
          <div style={{ height: '320px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Icon name="search" size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Skill Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '380px', fontSize: '0.85rem' }}>
          This skill does not exist or you do not have permission to view it.
        </p>
        <Link href="/skills" className="btn btn-primary">
          Back to Skills
        </Link>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Icon name="alert" size={36} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
          Access Denied (403 Forbidden)
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '380px', fontSize: '0.85rem' }}>
          This skill belongs to another tenant or account and is protected by authorization controls.
        </p>
        <Link href="/skills" className="btn btn-secondary">
          Back to Skills
        </Link>
      </div>
    );
  }

  if (!skill) return null;

  return (
    <div className="page-container">
      {/* Page Header */}
      <PageHeader
        title={skill.name}
        description={`Last updated ${new Date(skill.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Status Badge */}
            <span className={`badge ${skill.status === 'VALID' ? 'badge-success' : skill.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`}>
              {skill.status === 'VALID' ? 'Active' : skill.status === 'DRAFT' ? 'Draft' : 'Invalid'}
            </span>

            {/* Source Badge */}
            <span className="badge badge-neutral">
              {skill.source_type === 'IMPORTED' ? 'Imported ZIP' : 'Custom'}
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Icon name="doc" size={14} />
              {isExporting ? 'Exporting...' : 'Export ZIP'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClone}
              disabled={isCloning}
            >
              <Icon name="copy" size={14} />
              {isCloning ? 'Cloning...' : 'Duplicate'}
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Icon name="trash" size={14} />
              Delete
            </button>

            <Link href="/skills" className="btn btn-secondary">
              Back to Skills
            </Link>
          </div>
        }
      />

      {/* Alerts */}
      {errorMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          <Icon name="alert" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(62, 207, 142, 0.1)',
          border: '1px solid rgba(62, 207, 142, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          <Icon name="check" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Tabs & Editors */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)'
          }}>
            <button
              type="button"
              onClick={() => handleSwitchTab('visual')}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: activeTab === 'visual' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'visual' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'visual' ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: activeTab === 'visual' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon name="edit" size={14} />
              Visual Editor
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('raw')}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: activeTab === 'raw' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'raw' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'raw' ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: activeTab === 'raw' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon name="doc" size={14} />
              SKILL.md Raw
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('preview')}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: activeTab === 'preview' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'preview' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'preview' ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: activeTab === 'preview' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon name="search" size={14} />
              Preview
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('files')}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: activeTab === 'files' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'files' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'files' ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: activeTab === 'files' ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon name="projects" size={14} />
              Resources ({skill.file_tree ? skill.file_tree.length : 1})
            </button>
          </div>

          {/* Tab Body */}
          <div style={{ padding: '1.25rem' }}>
            {activeTab === 'visual' && (
              <div>
                {/* Name */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="edit-skill-name" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Skill Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: name.length > 64 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {name.length} / 64
                    </span>
                  </div>
                  <input
                    id="edit-skill-name"
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={64}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="edit-skill-desc" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Description <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: description.length > 1024 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {description.length} / 1024
                    </span>
                  </div>
                  <textarea
                    id="edit-skill-desc"
                    rows={3}
                    className="input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1024}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* License & Compatibility */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label htmlFor="edit-skill-license" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      License <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="edit-skill-license"
                      type="text"
                      className="input"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-skill-compat" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Compatibility <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="edit-skill-compat"
                      type="text"
                      className="input"
                      value={compatibility}
                      onChange={(e) => setCompatibility(e.target.value)}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="edit-skill-inst" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Instructions (Markdown)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {instructions.length.toLocaleString('en-US')} characters
                    </span>
                  </div>
                  <textarea
                    id="edit-skill-inst"
                    rows={12}
                    className="input"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label htmlFor="edit-skill-raw" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Raw SKILL.md Source
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Frontmatter & Body synced automatically
                  </span>
                </div>
                <textarea
                  id="edit-skill-raw"
                  rows={18}
                  className="input"
                  value={rawContent}
                  onChange={(e) => syncFromRaw(e.target.value)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            {activeTab === 'preview' && (
              <div style={{
                background: 'var(--bg-subtle)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                minHeight: '350px'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  borderLeft: '3px solid var(--accent)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {name || 'untitled'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {license && <span>License: {license}</span>}
                    {compatibility && <span>Environment: {compatibility}</span>}
                  </div>
                </div>

                <div style={{
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  lineHeight: '1.6'
                }}>
                  {instructions || '(No instruction body content)'}
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div>
                {/* Security Warning Notice */}
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <Icon name="alert" size={16} style={{ color: '#f59e0b', marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', lineHeight: '1.5' }}>
                    <strong>Security Note:</strong> Scripts stored in <code>scripts/</code> are retained as reference documentation. The runtime does not automatically execute unvetted host scripts.
                  </div>
                </div>

                {/* Files List Table */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Package Files ({skill.file_tree ? skill.file_tree.length : 1})
                  </h4>
                  <div style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--bg-subtle)'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 100px 90px',
                      padding: '8px 12px',
                      background: 'var(--bg-surface)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}>
                      <div>File Path</div>
                      <div>Size</div>
                      <div style={{ textAlign: 'right' }}>Action</div>
                    </div>

                    {/* Main SKILL.md */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 100px 90px',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 600 }}>
                        <Icon name="doc" size={14} />
                        <span>SKILL.md (Required Root)</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {(skill.raw_skill_md ? skill.raw_skill_md.length : 0).toLocaleString()} B
                      </div>
                      <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        System
                      </div>
                    </div>

                    {/* Additional Resource Files */}
                    {skill.file_tree && skill.file_tree.filter((f: FileTreeItem) => f.path !== 'SKILL.md').map((f: FileTreeItem, idx: number) => (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 100px 90px',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          <Icon name="doc" size={14} />
                          <span>{f.path}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {f.size_bytes ? `${f.size_bytes.toLocaleString()} B` : '-'}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(f.path)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: '2px 6px'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Resource Form */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Add Resource File (.md, .txt, .json)
                  </h4>
                  <form onSubmit={handleAddResource}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label htmlFor="resource-folder" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Folder
                        </label>
                        <select
                          id="resource-folder"
                          className="input"
                          value={newFileFolder}
                          onChange={(e) => setNewFileFolder(e.target.value as 'references' | 'assets')}
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <option value="references">references/</option>
                          <option value="assets">assets/</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="resource-filename" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          File Name
                        </label>
                        <input
                          id="resource-filename"
                          type="text"
                          className="input"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="guide.md"
                          required
                          style={{ padding: '6px 10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label htmlFor="resource-content" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        File Content
                      </label>
                      <textarea
                        id="resource-content"
                        rows={5}
                        className="input"
                        value={newFileContent}
                        onChange={(e) => setNewFileContent(e.target.value)}
                        placeholder="# Resource contents..."
                        required
                        style={{
                          padding: '8px 10px',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={isAddingFile}
                    >
                      <Icon name="plus" size={14} />
                      {isAddingFile ? 'Saving file...' : 'Save Resource'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSave('SAVE_DRAFT')}
                disabled={isSubmitting}
              >
                <Icon name="check" size={14} />
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSave('ACTIVATE')}
                disabled={isSubmitting || (validationResult !== null && !validationResult.is_valid)}
              >
                <Icon name="plus" size={14} />
                {isSubmitting ? 'Processing...' : 'Save & Activate'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Specification Inspector */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="search" size={15} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Specification Inspector
              </h3>
            </div>
            {isValidating && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scanning...</span>
            )}
          </div>

          {/* Validation Status Indicator */}
          {validationResult ? (
            <div>
              {validationResult.is_valid ? (
                <div style={{
                  padding: '10px',
                  background: 'rgba(62, 207, 142, 0.1)',
                  border: '1px solid rgba(62, 207, 142, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent)',
                  fontSize: '0.8rem'
                }}>
                  <Icon name="check" size={14} />
                  <span>Compliant with Agent Skills spec. Ready for activation.</span>
                </div>
              ) : (
                <div style={{
                  padding: '10px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--danger)',
                  fontSize: '0.8rem'
                }}>
                  <Icon name="alert" size={14} />
                  <span>Found {validationResult.errors.length} specification violation(s).</span>
                </div>
              )}

              {/* Errors List */}
              {validationResult.errors.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    Mandatory Errors ({validationResult.errors.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {validationResult.errors.map((err: ValidationErrorItem, idx: number) => (
                      <div key={idx} style={{
                        padding: '8px',
                        background: 'var(--danger-bg)',
                        border: '1px solid var(--danger-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{err.code}</span>
                          <span style={{ color: 'var(--text-muted)' }}>Field: {err.field}</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>{err.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings List */}
              {validationResult.warnings.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    Recommendations ({validationResult.warnings.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {validationResult.warnings.map((warn: ValidationWarningItem, idx: number) => (
                      <div key={idx} style={{
                        padding: '8px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#f59e0b' }}>{warn.code}</span>
                          <span style={{ color: 'var(--text-muted)' }}>Field: {warn.field}</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>{warn.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Rules Cheat Sheet */}
          <div style={{
            marginTop: '1.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: '1.5'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Specification Constraints:
            </div>
            <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
              <li>Skill name matches the package folder name.</li>
              <li>Description enables context discovery for agents.</li>
              <li>Upload reference documentation into <code>references/</code>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="alert" size={16} />
              Delete Skill?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Are you sure you want to delete skill <strong style={{ color: 'var(--text-primary)' }}>{skill.name}</strong>? This will permanently delete <code style={{ color: 'var(--accent)' }}>SKILL.md</code> and all associated resources from storage. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

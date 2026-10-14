'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SkillService } from '@/services/skillService';
import { SkillValidationReport, ValidationErrorItem, ValidationWarningItem } from '@/types';
import Icon from '@/components/ui/Icon';
import PageHeader from '@/components/ui/PageHeader';
import { getErrorMessage } from '@/lib/errors';

const DEFAULT_TEMPLATE = {
  name: 'code-review-assistant',
  description: 'Automated code review specialist that inspects pull requests, identifies OWASP security vulnerabilities, and recommends clean architecture refactorings.',
  license: 'MIT',
  compatibility: 'Python 3.10+, Node.js 18+',
  instructions: `# Code Review Assistant

## Overview
This skill instructs the agent to systematically analyze codebases with a focus on:
1. Business logic correctness and boundary safety.
2. Security best practices (mitigating SQL Injection, XSS, Path Traversal, and SSRF).
3. Performance efficiency and idiomatic code style.

## Review Workflow
- **Step 1:** Analyze context and problem requirements.
- **Step 2:** Identify edge cases, missing test coverage, and unhandled errors.
- **Step 3:** Provide concrete code improvements inside concise Markdown code blocks.

## Output Example
\`\`\`python
def process_data(items: list[str]) -> list[str]:
    """Clean and filter non-empty string tokens."""
    return [item.strip() for item in items if item.strip()]
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

  // Build raw SKILL.md from visual fields
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

  // Server-side validation
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

  // Load sample template
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

  // Debounced auto-validate
  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = buildRawFromFields(name, description, license, compatibility, instructions);
      triggerValidation(raw);
    }, 600);
    return () => clearTimeout(timer);
  }, [name, description, license, compatibility, instructions, buildRawFromFields, triggerValidation]);

  // Tab switch handler
  const handleSwitchTab = (tab: 'visual' | 'raw' | 'preview') => {
    if (tab === 'raw' && activeTab === 'visual') {
      setRawContent(buildRawFromFields(name, description, license, compatibility, instructions));
    }
    setActiveTab(tab);
  };

  // Sync from raw text to visual fields
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
      setErrorMsg('Please provide a skill name.');
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
          ? 'Skill created and activated successfully.'
          : 'Skill draft saved successfully.'
      );

      setTimeout(() => {
        router.push(`/skills/${res.id}`);
      }, 700);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, 'Failed to create skill. Please verify input data.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="page-container">
      {/* Page Header */}
      <PageHeader
        title="New Agent Skill"
        description="Configure a modular agent capability conforming to the standard Agent Skills specification (SKILL.md)."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadTemplate}
            >
              <Icon name="doc" size={14} />
              Load Template
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              Back to Skills
            </button>
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

      {/* 2-Column Layout: Form & Inspector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Form & Tabs */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Tab Header */}
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
          </div>

          {/* Tab Body */}
          <div style={{ padding: '1.25rem' }}>
            {activeTab === 'visual' && (
              <div>
                {/* Name */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="skill-name" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Skill Name <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: name.length > 64 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {name.length} / 64
                    </span>
                  </div>
                  <input
                    id="skill-name"
                    type="text"
                    className="input"
                    placeholder="e.g. code-review-assistant (lowercase, numbers, hyphens)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={64}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Standard identifier: alphanumeric lowercase characters and hyphens (<code style={{ color: 'var(--accent)' }}>a-z, 0-9, -</code>). Cannot start or end with a hyphen.
                  </p>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="skill-desc" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Description <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: description.length > 1024 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {description.length} / 1024
                    </span>
                  </div>
                  <textarea
                    id="skill-desc"
                    rows={3}
                    className="input"
                    placeholder="Briefly describe what this skill does so agents know when to invoke it..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1024}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* 2-Columns: License & Compatibility */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label htmlFor="skill-license" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      License <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="skill-license"
                      type="text"
                      className="input"
                      placeholder="MIT, Apache-2.0, Proprietary..."
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="skill-compat" style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Compatibility <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="skill-compat"
                      type="text"
                      className="input"
                      placeholder="Python 3.10+, Docker, Node.js..."
                      value={compatibility}
                      onChange={(e) => setCompatibility(e.target.value)}
                    />
                  </div>
                </div>

                {/* Instructions Markdown */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="skill-instructions" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Instructions (Markdown)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {instructions.length.toLocaleString('en-US')} characters
                    </span>
                  </div>
                  <textarea
                    id="skill-instructions"
                    rows={12}
                    className="input"
                    placeholder="# Skill Instructions&#10;&#10;## Objective&#10;- Guide the agent on how to...&#10;&#10;## Execution Steps&#10;1. ..."
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
                  <label htmlFor="skill-raw" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Raw SKILL.md Source
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Frontmatter & Body synced automatically
                  </span>
                </div>
                <textarea
                  id="skill-raw"
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
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSubmit('SAVE_DRAFT')}
                disabled={isSubmitting}
              >
                <Icon name="check" size={14} />
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSubmit('ACTIVATE')}
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
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <p>Fill out the skill fields to inspect conformance with the Agent Skills standard.</p>
            </div>
          )}

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
              Agent Skills Constraints:
            </div>
            <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
              <li>Name max 64 chars (lowercase, digits, hyphens).</li>
              <li>Description max 1024 characters.</li>
              <li>SKILL.md requires valid YAML frontmatter.</li>
              <li>Scripts are archival and run in sandboxed contexts.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Discard unsaved changes?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              You have unsaved changes in this skill. If you leave now, all input will be lost.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExitConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => router.push('/skills')}
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

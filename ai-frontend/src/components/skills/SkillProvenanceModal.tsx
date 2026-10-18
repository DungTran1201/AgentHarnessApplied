'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import { SkillProvenance } from '@/types';
import { SkillService } from '@/services/skillService';

interface SkillProvenanceModalProps {
  skillId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SkillProvenanceModal({
  skillId,
  isOpen,
  onClose,
}: SkillProvenanceModalProps) {
  const [provenance, setProvenance] = useState<SkillProvenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (!isOpen || !skillId) return;

    let mounted = true;
    const fetchProvenance = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await SkillService.getSkillProvenance(skillId);
        if (mounted) {
          setProvenance(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Không thể tải thông tin nguồn gốc kỹ năng.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProvenance();
    return () => {
      mounted = false;
    };
  }, [isOpen, skillId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="link" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Nguồn Gốc Kỹ Năng (Provenance)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {provenance?.name || 'Chi tiết truy xuất nguồn và bản quyền'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: '6px', color: 'var(--text-muted)' }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="custom-scrollbar" style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Đang truy xuất thông tin nguồn gốc...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          ) : !provenance?.is_imported ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <Icon name="doc" size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Kỹ năng tự tạo nội bộ</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Kỹ năng này được tạo trực tiếp bởi bạn trong hệ thống AI-Chan, không thông qua catalog bên ngoài.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Status Banner */}
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '8px',
                  background: provenance.is_locally_modified
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${
                    provenance.is_locally_modified
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(34, 197, 94, 0.3)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Icon
                  name={provenance.is_locally_modified ? 'alert' : 'check'}
                  size={18}
                  style={{
                    color: provenance.is_locally_modified ? '#f59e0b' : '#22c55e',
                  }}
                />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong
                    style={{
                      display: 'block',
                      color: provenance.is_locally_modified ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {provenance.is_locally_modified
                      ? 'Đã được chỉnh sửa thủ công tại AI-Chan'
                      : 'Bảo toàn nguyên bản từ kho lưu trữ nguồn'}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {provenance.is_locally_modified
                      ? 'Nội dung SKILL.md cục bộ có khác biệt so với bản gốc đã nhập.'
                      : 'Nội dung SKILL.md khớp hoàn toàn mã băm SHA-256 của phiên bản nguồn.'}
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Nhà cung cấp nguồn
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {provenance.source_provider} (Agentic Awesome Skills)
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Phiên bản / Nhánh
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {provenance.source_version || 'main'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Ngày nhập vào AI-Chan
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {formatDate(provenance.imported_at)}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Cập nhật nguồn lần cuối
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {formatDate(provenance.source_updated_at)}
                  </span>
                </div>
              </div>

              {/* Repository link */}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Kho lưu trữ nguồn (Canonical Repo)
                </span>
                <a
                  href={provenance.source_repository_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--accent, #6366f1)',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                  }}
                >
                  <Icon name="external" size={14} />
                  <span>{provenance.source_repository_url}</span>
                </a>
              </div>

              {/* Path in repo */}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Đường dẫn trong Repo
                </span>
                <code
                  style={{
                    display: 'block',
                    padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {provenance.source_path || provenance.source_skill_id}
                </code>
              </div>

              {/* Content Hash SHA-256 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Mã băm SHA-256 nguyên bản
                  </span>
                  {provenance.source_content_hash && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => copyToClipboard(provenance.source_content_hash!)}
                      style={{ fontSize: '0.75rem', padding: '2px 6px', height: 'auto', gap: '4px' }}
                    >
                      <Icon name={copiedHash ? 'check' : 'copy'} size={12} />
                      <span>{copiedHash ? 'Đã chép' : 'Chép hash'}</span>
                    </button>
                  )}
                </div>
                <code
                  style={{
                    display: 'block',
                    padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    wordBreak: 'break-all',
                  }}
                >
                  {provenance.source_content_hash || 'Chưa xác định'}
                </code>
              </div>

              {/* License & Attribution */}
              <div
                style={{
                  padding: '0.875rem 1rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                    {provenance.source_license || 'CC-BY-4.0'}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Giấy phép & Ghi nhận tác giả
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {provenance.attribution ||
                    'Nội dung từ Awesome Skills được phân phối theo giấy phép cộng đồng CC BY 4.0 và mã nguồn MIT.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

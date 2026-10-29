'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProviderKeyStatus } from '@/types/apiKey';
import { ApiKeyService } from '@/services/apiKeyService';
import Icon from '@/components/ui/Icon';

interface ApiKeysTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
  userEmail?: string;
}

export default function ApiKeysTab({ showToast, userEmail }: ApiKeysTabProps) {
  const [keys, setKeys] = useState<ProviderKeyStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'LLM' | 'SEARCH'>('ALL');

  // Keep latest showToast in a ref so loadKeys never re-triggers on parent toast state updates
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Input states per provider for editing/entering keys
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<Record<string, boolean>>({});

  // Action loading states per provider
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);

  // Last action feedback banner per provider (distinguishes saved vs tested vs candidate test)
  const [providerFeedback, setProviderFeedback] = useState<
    Record<string, { type: 'info' | 'success' | 'warning' | 'error'; text: string }>
  >({});

  // Deletion confirmation modal
  const [confirmDeleteProvider, setConfirmDeleteProvider] = useState<ProviderKeyStatus | null>(null);

  // Admin section state
  const [showAdminSection, setShowAdminSection] = useState<boolean>(false);
  const [adminEnvVar, setAdminEnvVar] = useState<string>('GEMINI_API_KEY');
  const [adminEnvVal, setAdminEnvVal] = useState<string>('');
  const [savingAdminEnv, setSavingAdminEnv] = useState<boolean>(false);
  const [adminUpdateNotice, setAdminUpdateNotice] = useState<{
    type: 'info' | 'warning';
    text: string;
  } | null>(null);

  const isAdmin = Boolean(
    userEmail && (userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase().includes('demo'))
  );

  const loadKeys = useCallback(async (): Promise<ProviderKeyStatus[]> => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await ApiKeyService.fetchApiKeys();
      setKeys(data);
      return data;
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải danh sách API Keys.';
      setLoadError(msg);
      showToastRef.current('error', msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleInputChange = (provider: string, value: string) => {
    setInputValues(prev => ({ ...prev, [provider]: value }));
  };

  const toggleShowPassword = (provider: string) => {
    setShowPassword(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleStartEdit = (provider: string) => {
    setEditingProvider(prev => ({ ...prev, [provider]: true }));
    setInputValues(prev => ({ ...prev, [provider]: '' }));
    setShowPassword(prev => ({ ...prev, [provider]: false }));
  };

  const handleCancelEdit = (provider: string) => {
    setEditingProvider(prev => ({ ...prev, [provider]: false }));
    setInputValues(prev => ({ ...prev, [provider]: '' }));
    setShowPassword(prev => ({ ...prev, [provider]: false }));
  };

  const handleSaveKey = async (item: ProviderKeyStatus) => {
    const rawValue = (inputValues[item.provider] || '').trim();
    if (!rawValue) {
      showToastRef.current('error', 'Vui lòng nhập khóa API trước khi lưu.');
      return;
    }

    const isReplacing = item.has_personal_key;
    setSavingProvider(item.provider);
    try {
      const res = await ApiKeyService.saveApiKey(item.provider, rawValue);
      // Clear plaintext secret from UI input immediately after persistence succeeds
      setEditingProvider(prev => ({ ...prev, [item.provider]: false }));
      setInputValues(prev => ({ ...prev, [item.provider]: '' }));
      setShowPassword(prev => ({ ...prev, [item.provider]: false }));

      // Re-fetch authoritative status from backend before confirming
      const updatedList = await loadKeys();
      const refreshed = updatedList.find(k => k.provider === item.provider);
      const hintDisplay = refreshed?.masked_hint || res.masked_hint;
      const fpDisplay = refreshed?.key_fingerprint || res.key_fingerprint;

      const actionLabel = isReplacing ? 'Đã thay thế khóa cá nhân' : 'Đã thêm khóa cá nhân';
      setProviderFeedback(prev => ({
        ...prev,
        [item.provider]: {
          type: 'info',
          text: `${actionLabel} (${hintDisplay}${fpDisplay ? `, mã định danh #${fpDisplay}` : ''}). Khóa đã có hiệu lực ở runtime — hãy nhấn "Test khóa đang dùng" để xác thực kết nối với nhà cung cấp.`,
        },
      }));

      showToastRef.current(
        'success',
        res.message || `${actionLabel} cho ${item.name} thành công.`
      );
    } catch (err: any) {
      const errMsg = err?.message || 'Lỗi khi lưu khóa API.';
      setProviderFeedback(prev => ({
        ...prev,
        [item.provider]: {
          type: 'error',
          text: `Lưu khóa thất bại: ${errMsg}`,
        },
      }));
      showToastRef.current('error', errMsg);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestConnection = async (item: ProviderKeyStatus, mode: 'CANDIDATE' | 'SAVED') => {
    const candidate = mode === 'CANDIDATE' ? (inputValues[item.provider] || '').trim() : undefined;
    if (mode === 'CANDIDATE' && !candidate) {
      showToastRef.current('error', 'Vui lòng nhập khóa ứng viên cần kiểm tra thử.');
      return;
    }

    setTestingProvider(item.provider);
    try {
      const res = await ApiKeyService.testConnection(item.provider, candidate);
      if (res.healthy) {
        const prefix =
          mode === 'CANDIDATE'
            ? 'Khóa vừa nhập (chưa lưu) hợp lệ'
            : `Khóa đang dùng (${res.tested_source === 'SYSTEM' ? 'SYSTEM .env' : 'PERSONAL'}) hoạt động tốt`;
        setProviderFeedback(prev => ({
          ...prev,
          [item.provider]: {
            type: 'success',
            text: `${prefix}: ${res.message}${mode === 'CANDIDATE' ? ' — Nhấn "Lưu khóa" để áp dụng khóa này.' : ''}`,
          },
        }));
        showToastRef.current('success', `${res.message} (Độ trễ: ${res.latency_ms}ms)`);
      } else {
        setProviderFeedback(prev => ({
          ...prev,
          [item.provider]: {
            type: 'error',
            text: res.message || 'Kiểm tra kết nối thất bại.',
          },
        }));
        showToastRef.current('error', res.message || 'Kiểm tra kết nối thất bại.');
      }
      if (mode === 'SAVED') {
        await loadKeys();
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Lỗi kiểm tra kết nối.';
      setProviderFeedback(prev => ({
        ...prev,
        [item.provider]: {
          type: 'error',
          text: errMsg,
        },
      }));
      showToastRef.current('error', errMsg);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteProvider) return;
    const provider = confirmDeleteProvider.provider;
    const providerName = confirmDeleteProvider.name;
    setDeletingProvider(provider);
    try {
      const res = await ApiKeyService.deleteApiKey(provider);
      setConfirmDeleteProvider(null);
      handleCancelEdit(provider);
      await loadKeys();

      setProviderFeedback(prev => ({
        ...prev,
        [provider]: {
          type: 'info',
          text:
            res.source === 'SYSTEM'
              ? `Đã xóa khóa cá nhân của ${providerName}. Hệ thống đã khôi phục về khóa mặc định server (.env: ${res.masked_hint}).`
              : `Đã xóa khóa cá nhân của ${providerName}. Nhà cung cấp hiện ở trạng thái chưa cấu hình (NONE).`,
        },
      }));
      showToastRef.current('success', res.message || `Đã xóa khóa cá nhân cho ${providerName}.`);
    } catch (err: any) {
      showToastRef.current('error', err?.message || 'Lỗi khi xóa khóa cá nhân.');
    } finally {
      setDeletingProvider(null);
    }
  };

  const handleSaveSystemEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEnvVal.trim()) {
      showToastRef.current('error', 'Vui lòng nhập giá trị biến môi trường.');
      return;
    }
    setSavingAdminEnv(true);
    setAdminUpdateNotice(null);
    try {
      const res = await ApiKeyService.updateSystemEnv(adminEnvVar, adminEnvVal.trim());
      setAdminEnvVal('');
      await loadKeys();
      setAdminUpdateNotice({
        type: res.has_personal_override ? 'warning' : 'info',
        text: res.message,
      });
      showToastRef.current('success', res.message);
    } catch (err: any) {
      showToastRef.current('error', err?.message || 'Lỗi khi cập nhật biến hệ thống.');
    } finally {
      setSavingAdminEnv(false);
    }
  };

  const filteredKeys = keys.filter(k => {
    if (activeCategory === 'ALL') return true;
    return k.category === activeCategory;
  });

  // Check if selected admin env var is currently overridden by a personal key
  const selectedAdminProvider = keys.find(k => k.env_var === adminEnvVar);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Precedence Contract Notice */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="key" size={20} style={{ color: 'var(--accent)' }} />
              <span>Quản lý API Keys & Tích Hợp Dịch Vụ</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '760px', lineHeight: 1.5 }}>
              Cấu hình khóa API cho các nhà cung cấp mô hình AI (LLM) và công cụ tìm kiếm (Search). Khóa cá nhân được mã hóa
              <strong> AES-256-GCM</strong> và áp dụng theo thứ tự ưu tiên nghiêm ngặt:
              <code style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                PERSONAL (Khóa cá nhân) &gt; SYSTEM (.env) &gt; NONE
              </code>
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadKeys()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
          >
            <Icon name="refresh" size={14} className={loading ? 'spin' : ''} />
            <span>Làm mới trạng thái</span>
          </button>
        </div>

        {/* Security & Runtime Precedence Notice */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          <Icon name="shield" size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Nguyên tắc bảo mật & Thực thi Runtime: </strong>
            Khóa cá nhân sau khi lưu có hiệu lực ngay lập tức cho các lượt hội thoại tiếp theo mà không cần khởi động lại ứng dụng. Hệ thống không bao giờ trả lại khóa dạng plaintext sau khi lưu (chỉ hiển thị 4 ký tự cuối và dấu vân tay rút gọn).
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${activeCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveCategory('ALL')}
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
        >
          Tất cả ({keys.length})
        </button>
        <button
          type="button"
          className={`btn ${activeCategory === 'LLM' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveCategory('LLM')}
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
        >
          Mô hình AI (LLMs)
        </button>
        <button
          type="button"
          className={`btn ${activeCategory === 'SEARCH' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveCategory('SEARCH')}
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
        >
          Tìm kiếm Web (Search Tools)
        </button>
      </div>

      {/* Provider List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Icon name="refresh" size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <div>Đang nạp danh mục cấu hình API keys...</div>
        </div>
      ) : loadError && keys.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
          <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>
            Không thể tải danh sách cấu hình API Keys
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {loadError}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => loadKeys()}>
            Thử tải lại
          </button>
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có nhà cung cấp nào trong danh mục này.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredKeys.map(item => {
            const isEditing = Boolean(editingProvider[item.provider]);
            const isSaving = savingProvider === item.provider;
            const isTesting = testingProvider === item.provider;
            const isDeleting = deletingProvider === item.provider;
            const currentInput = inputValues[item.provider] || '';
            const hasCandidateInput = Boolean(currentInput.trim());
            const isPasswordVisible = Boolean(showPassword[item.provider]);
            const feedback = providerFeedback[item.provider];

            // Source Badge (PERSONAL > SYSTEM > NONE)
            let sourceBadge = null;
            if (item.source === 'PERSONAL') {
              sourceBadge = (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="user" size={11} />
                  <span>Đang dùng: Khóa cá nhân (PERSONAL)</span>
                </span>
              );
            } else if (item.source === 'SYSTEM') {
              sourceBadge = (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="workspace" size={11} />
                  <span>Đang dùng: Mặc định hệ thống (.env)</span>
                </span>
              );
            } else {
              sourceBadge = (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(156, 163, 175, 0.15)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontWeight: 500
                }}>
                  Chưa cấu hình (NONE)
                </span>
              );
            }

            // Validation Badge
            let valBadge = null;
            if (item.decryption_error) {
              valBadge = (
                <span style={{
                  fontSize: '0.72rem',
                  color: '#ef4444',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="alert" size={12} />
                  <span>Lỗi giải mã khóa cá nhân — Cần lưu lại</span>
                </span>
              );
            } else if (item.validation_status === 'VALID') {
              valBadge = (
                <span style={{
                  fontSize: '0.72rem',
                  color: '#10b981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="check" size={12} />
                  <span>Đã xác thực kết nối</span>
                </span>
              );
            } else if (item.validation_status === 'INVALID' || item.validation_status === 'ERROR') {
              valBadge = (
                <span style={{
                  fontSize: '0.72rem',
                  color: '#ef4444',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="alert" size={12} />
                  <span>Kết nối lỗi hoặc khóa không hợp lệ</span>
                </span>
              );
            } else if (item.is_configured) {
              valBadge = (
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>Chưa kiểm tra kết nối</span>
                </span>
              );
            }

            return (
              <div
                key={item.provider}
                id={`provider-card-${item.provider}`}
                className="card"
                style={{
                  padding: '1.25rem',
                  background: 'var(--bg-card)',
                  border: item.decryption_error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border)',
                  transition: 'border-color 0.2s ease',
                  borderRadius: '10px'
                }}
              >
                {/* Top Row: Provider Info & Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {item.name}
                      </h3>
                      {sourceBadge}
                      {valBadge}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
                      {item.description}
                    </p>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Biến hệ thống: <code style={{ color: 'var(--accent)', background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '4px' }}>{item.env_var}</code></span>
                      {item.has_personal_key && item.has_system_key && (
                        <span style={{ color: '#8b5cf6' }}>
                          • Khóa cá nhân đang ghi đè khóa hệ thống (.env)
                        </span>
                      )}
                      {item.doc_url && (
                        <a
                          href={item.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          <span>Lấy khóa API</span>
                          <Icon name="external" size={11} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Header: Distinct buttons for Testing Saved Key vs Deleting Personal Override */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {item.is_configured && !hasCandidateInput && (
                      <button
                        type="button"
                        id={`btn-test-${item.provider}`}
                        className="btn btn-secondary"
                        onClick={() => handleTestConnection(item, 'SAVED')}
                        disabled={isTesting}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title="Kiểm tra kết nối bằng khóa đang có hiệu lực đã lưu"
                      >
                        <Icon name="refresh" size={12} className={isTesting ? 'spin' : ''} />
                        <span>{isTesting ? 'Đang kiểm tra...' : 'Test khóa đang dùng'}</span>
                      </button>
                    )}

                    {item.has_personal_key && !isEditing && (
                      <button
                        type="button"
                        id={`btn-delete-${item.provider}`}
                        className="btn btn-secondary"
                        onClick={() => setConfirmDeleteProvider(item)}
                        disabled={isDeleting}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Xóa khóa cá nhân và hoàn tác về mặc định server (.env)"
                      >
                        <Icon name="trash" size={12} />
                        <span>{item.has_system_key ? 'Xóa khóa riêng (về .env)' : 'Xóa khóa cá nhân'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Configuration Row */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  {!isEditing && (item.is_configured || item.has_personal_key) ? (
                    /* Display Masked State */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <Icon name="lock" size={16} style={{ color: 'var(--text-muted)' }} />
                        <span
                          id={`masked-hint-${item.provider}`}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            background: 'var(--bg-secondary)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            letterSpacing: '1px'
                          }}
                        >
                          {item.masked_hint || '••••••••••••••••'}
                        </span>
                        {item.key_fingerprint && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            SHA256 #{item.key_fingerprint}
                          </span>
                        )}
                        {item.updated_at && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Cập nhật: {new Date(item.updated_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`btn-edit-${item.provider}`}
                        className="btn btn-secondary"
                        onClick={() => handleStartEdit(item.provider)}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Icon name="edit" size={12} />
                        <span>
                          {item.has_personal_key
                            ? 'Thay thế khóa cá nhân'
                            : 'Ghi đè bằng khóa cá nhân'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* Input Form for Entering / Replacing Personal Key */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                          <input
                            type={isPasswordVisible || !item.is_secret ? 'text' : 'password'}
                            id={`input-key-${item.provider}`}
                            value={currentInput}
                            onChange={(e) => handleInputChange(item.provider, e.target.value)}
                            placeholder={
                              item.has_personal_key
                                ? `Nhập khóa mới để thay thế (${item.masked_hint})...`
                                : item.placeholder || `Nhập khóa API cho ${item.name}...`
                            }
                            style={{
                              width: '100%',
                              padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                              fontSize: '0.85rem',
                              fontFamily: 'monospace',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          {item.is_secret && (
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(item.provider)}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title={isPasswordVisible ? 'Ẩn khóa' : 'Hiện khóa'}
                            >
                              <Icon name={isPasswordVisible ? 'close' : 'sparkles'} size={14} />
                            </button>
                          )}
                        </div>

                        {hasCandidateInput && (
                          <button
                            type="button"
                            id={`btn-test-candidate-${item.provider}`}
                            className="btn btn-secondary"
                            onClick={() => handleTestConnection(item, 'CANDIDATE')}
                            disabled={isTesting || isSaving}
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            title="Kiểm tra thử khóa vừa nhập trước khi lưu vào CSDL"
                          >
                            <Icon name="refresh" size={12} className={isTesting ? 'spin' : ''} />
                            <span>{isTesting ? 'Đang thử...' : 'Test khóa vừa nhập (chưa lưu)'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          id={`btn-save-${item.provider}`}
                          className="btn btn-primary"
                          onClick={() => handleSaveKey(item)}
                          disabled={isSaving || !hasCandidateInput}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Icon name="check" size={13} />
                          <span>
                            {isSaving
                              ? 'Đang mã hóa & lưu...'
                              : item.has_personal_key
                              ? 'Lưu khóa thay thế'
                              : 'Lưu khóa cá nhân'}
                          </span>
                        </button>

                        {(item.is_configured || item.has_personal_key || isEditing) && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleCancelEdit(item.provider)}
                            disabled={isSaving}
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                          >
                            Hủy
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {item.has_personal_key
                          ? `Thao tác này sẽ ghi đè khóa cá nhân hiện tại (${item.masked_hint}) của bạn và áp dụng ngay cho yêu cầu tiếp theo.`
                          : 'Khóa cá nhân sẽ được mã hóa AES-256-GCM và ưu tiên sử dụng thay cho khóa hệ thống (.env).'}
                      </div>
                    </div>
                  )}

                  {/* Action / Status Feedback Banner */}
                  {feedback && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        background:
                          feedback.type === 'success'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : feedback.type === 'error'
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(59, 130, 246, 0.08)',
                        border:
                          feedback.type === 'success'
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : feedback.type === 'error'
                            ? '1px solid rgba(239, 68, 68, 0.25)'
                            : '1px solid rgba(59, 130, 246, 0.25)',
                        fontSize: '0.76rem',
                        color:
                          feedback.type === 'success'
                            ? '#10b981'
                            : feedback.type === 'error'
                            ? '#ef4444'
                            : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <span>{feedback.text}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setProviderFeedback(prev => {
                            const copy = { ...prev };
                            delete copy[item.provider];
                            return copy;
                          })
                        }
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Last Error Message or Decryption Recovery Display */}
                  {item.last_error_summary && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Icon name="alert" size={13} style={{ flexShrink: 0 }} />
                      <span>{item.last_error_summary}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin System Configuration Section (Optional/Local Admin only) */}
      {isAdmin && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem', border: '1px dashed var(--border)', background: 'var(--bg-secondary)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowAdminSection(!showAdminSection)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="shield" size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cấu hình Biến Môi Trường Toàn Cục (.env) — Dành cho Quản Trị Viên
              </span>
            </div>
            <Icon name={showAdminSection ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: 'var(--text-muted)' }} />
          </div>

          {showAdminSection && (
            <form onSubmit={handleSaveSystemEnv} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Cập nhật biến toàn cục trong file <code>.env</code> của máy chủ thông qua cơ chế ghi nguyên tử (Atomic write) có tạo bản sao lưu <code>.env.bak</code>. Lưu ý: Khóa hệ thống có độ ưu tiên thấp hơn Khóa cá nhân (<code>PERSONAL &gt; SYSTEM</code>).
              </p>

              {selectedAdminProvider?.has_personal_key && (
                <div style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '0.78rem'
                }}>
                  <strong>Cảnh báo độ ưu tiên:</strong> Tài khoản của bạn hiện đang bật <strong>Khóa cá nhân ({selectedAdminProvider.masked_hint})</strong> cho <strong>{selectedAdminProvider.name}</strong>. Việc cập nhật <code>{adminEnvVar}</code> sẽ thay đổi khóa hệ thống nhưng tài khoản của bạn vẫn sẽ dùng Khóa cá nhân cho đến khi bạn xóa khóa cá nhân đó.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={adminEnvVar}
                  onChange={(e) => setAdminEnvVar(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="GEMINI_API_KEY">GEMINI_API_KEY</option>
                  <option value="OPENAI_API_KEY">OPENAI_API_KEY</option>
                  <option value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY</option>
                  <option value="GROQ_API_KEY">GROQ_API_KEY</option>
                  <option value="OLLAMA_BASE_URL">OLLAMA_BASE_URL</option>
                  <option value="BRAVE_SEARCH_API_KEY">BRAVE_SEARCH_API_KEY</option>
                  <option value="SERPAPI_API_KEY">SERPAPI_API_KEY</option>
                </select>

                <input
                  type="password"
                  value={adminEnvVal}
                  onChange={(e) => setAdminEnvVal(e.target.value)}
                  placeholder="Nhập giá trị mới cho .env..."
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace'
                  }}
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={savingAdminEnv || !adminEnvVal.trim()}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  {savingAdminEnv ? 'Đang ghi file...' : 'Cập nhật .env hệ thống'}
                </button>
              </div>

              {adminUpdateNotice && (
                <div style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  background: adminUpdateNotice.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.1)',
                  border: adminUpdateNotice.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)',
                  color: adminUpdateNotice.type === 'warning' ? '#fbbf24' : 'var(--text-primary)',
                  fontSize: '0.78rem'
                }}>
                  {adminUpdateNotice.text}
                </div>
              )}

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Lưu ý: Biến môi trường trong tiến trình hiện tại được đồng bộ ngay lập tức; tuy nhiên nếu có tiến trình phụ độc lập, hãy khởi động lại ứng dụng để áp dụng toàn diện.
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteProvider && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác nhận xóa khóa cá nhân ({confirmDeleteProvider.name})?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa khóa API cá nhân (<code>{confirmDeleteProvider.masked_hint}</code>) của nhà cung cấp <strong>{confirmDeleteProvider.name}</strong>?
              {confirmDeleteProvider.has_system_key
                ? ' Sau khi xóa, hệ thống sẽ tự động hoàn tác về sử dụng cấu hình mặc định từ máy chủ (.env).'
                : ' Sau khi xóa, nhà cung cấp này sẽ chuyển về trạng thái chưa cấu hình (NONE) cho đến khi bạn thêm khóa mới.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteProvider(null)}
                disabled={Boolean(deletingProvider)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id={`btn-confirm-delete-${confirmDeleteProvider.provider}`}
                className="btn btn-primary"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingProvider)}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                {deletingProvider ? 'Đang xóa...' : 'Xác nhận xóa khóa cá nhân'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

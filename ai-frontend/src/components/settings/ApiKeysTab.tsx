'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ProviderKeyStatus, ApiKeyCategory } from '@/types/apiKey';
import { ApiKeyService } from '@/services/apiKeyService';
import Icon from '@/components/ui/Icon';

interface ApiKeysTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
  userEmail?: string;
}

export default function ApiKeysTab({ showToast, userEmail }: ApiKeysTabProps) {
  const [keys, setKeys] = useState<ProviderKeyStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    type: 'auth' | 'forbidden' | 'network' | 'server';
    message: string;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'LLM' | 'SEARCH'>('ALL');

  const inFlightRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Input states per provider for editing/entering keys
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<Record<string, boolean>>({});

  // Action loading states per provider
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);

  // Deletion confirmation modal
  const [confirmDeleteProvider, setConfirmDeleteProvider] = useState<ProviderKeyStatus | null>(null);

  // Admin section state
  const [showAdminSection, setShowAdminSection] = useState<boolean>(false);
  const [adminEnvVar, setAdminEnvVar] = useState<string>('GEMINI_API_KEY');
  const [adminEnvVal, setAdminEnvVal] = useState<string>('');
  const [savingAdminEnv, setSavingAdminEnv] = useState<boolean>(false);

  const isAdmin = Boolean(
    userEmail && (userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase().includes('demo'))
  );

  const loadKeys = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await ApiKeyService.fetchApiKeys();
      if (isMountedRef.current) {
        setKeys(data);
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const status = err.status;
      if (status === 401) {
        setError({
          type: 'auth',
          message: err.message || 'Chưa xác thực: Vui lòng đăng nhập lại để xem và quản lý danh sách API Keys.'
        });
      } else if (status === 403) {
        setError({
          type: 'forbidden',
          message: err.message || 'Bạn không có quyền truy cập hoặc cấu hình danh mục API Keys này.'
        });
      } else if (status >= 500) {
        setError({
          type: 'server',
          message: err.message || 'Máy chủ AI-Chan gặp sự cố nội bộ. Vui lòng kiểm tra nhật ký backend.'
        });
      } else {
        setError({
          type: 'network',
          message: 'Không thể kết nối đến máy chủ AI-Chan backend (Failed to fetch). Vui lòng đảm bảo tiến trình backend đang hoạt động.'
        });
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadKeys();
    return () => {
      isMountedRef.current = false;
    };
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
  };

  const handleCancelEdit = (provider: string) => {
    setEditingProvider(prev => ({ ...prev, [provider]: false }));
    setInputValues(prev => ({ ...prev, [provider]: '' }));
    setShowPassword(prev => ({ ...prev, [provider]: false }));
  };

  const handleSaveKey = async (item: ProviderKeyStatus) => {
    const rawValue = (inputValues[item.provider] || '').trim();
    if (!rawValue) {
      showToast('error', 'Vui lòng nhập khóa API trước khi lưu.');
      return;
    }

    setSavingProvider(item.provider);
    try {
      const res = await ApiKeyService.saveApiKey(item.provider, rawValue);
      showToast('success', res.message || `Đã lưu khóa API cho ${item.name}.`);
      setEditingProvider(prev => ({ ...prev, [item.provider]: false }));
      setInputValues(prev => ({ ...prev, [item.provider]: '' }));
      setShowPassword(prev => ({ ...prev, [item.provider]: false }));
      await loadKeys();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu khóa API.');
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestConnection = async (item: ProviderKeyStatus) => {
    const candidate = (inputValues[item.provider] || '').trim();
    setTestingProvider(item.provider);
    try {
      const res = await ApiKeyService.testConnection(item.provider, candidate || undefined);
      if (res.healthy) {
        showToast('success', `${res.message} (Độ trễ: ${res.latency_ms}ms)`);
      } else {
        showToast('error', res.message || 'Kiểm tra kết nối thất bại.');
      }
      await loadKeys();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi kiểm tra kết nối.');
    } finally {
      setTestingProvider(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteProvider) return;
    const provider = confirmDeleteProvider.provider;
    setDeletingProvider(provider);
    try {
      const res = await ApiKeyService.deleteApiKey(provider);
      showToast('success', res.message || `Đã xóa khóa cá nhân.`);
      setConfirmDeleteProvider(null);
      handleCancelEdit(provider);
      await loadKeys();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi xóa khóa cá nhân.');
    } finally {
      setDeletingProvider(null);
    }
  };

  const handleSaveSystemEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEnvVal.trim()) {
      showToast('error', 'Vui lòng nhập giá trị biến môi trường.');
      return;
    }
    setSavingAdminEnv(true);
    try {
      const res = await ApiKeyService.updateSystemEnv(adminEnvVar, adminEnvVal.trim());
      showToast('success', res.message);
      setAdminEnvVal('');
      await loadKeys();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi cập nhật biến hệ thống.');
    } finally {
      setSavingAdminEnv(false);
    }
  };

  const filteredKeys = keys.filter(k => {
    if (activeCategory === 'ALL') return true;
    return k.category === activeCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Policy Notice */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="key" size={20} style={{ color: 'var(--accent)' }} />
              <span>Quản lý API Keys & Tích Hợp Dịch Vụ</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '750px', lineHeight: 1.5 }}>
              Cấu hình khóa API cho các nhà cung cấp mô hình AI và công cụ tìm kiếm. Khóa cá nhân của bạn được mã hóa an toàn bằng 
              <strong> AES-256-GCM</strong> tại tầng cơ sở dữ liệu, có quyền ưu tiên cao hơn cấu hình mặc định server và có hiệu lực ngay tức thì ở runtime.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadKeys}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
          >
            <Icon name="refresh" size={14} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Security Alert Notice */}
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
            <strong style={{ color: 'var(--text-primary)' }}>Nguyên tắc bảo mật: </strong>
            Hệ thống không bao giờ trả về khóa API dạng plaintext về trình duyệt sau khi đã lưu. Chỉ trạng thái cấu hình và ký tự gợi ý đã che giấu được hiển thị.
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
          Tìm kiếm & Dịch vụ ngoài
        </button>
      </div>

      {/* Provider List / Error / Loading States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Icon name="refresh" size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <div>Đang nạp danh mục cấu hình API keys...</div>
        </div>
      ) : error ? (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            background: error.type === 'auth' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: error.type === 'auth' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon
              name={error.type === 'auth' ? 'shield' : 'alert'}
              size={22}
              style={{ color: error.type === 'auth' ? '#f59e0b' : '#ef4444' }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {error.type === 'auth'
                ? 'Yêu cầu đăng nhập xác thực'
                : error.type === 'network'
                ? 'Lỗi kết nối máy chủ backend'
                : 'Lỗi nạp cấu hình API Keys'}
            </h3>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {error.message}
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '0.25rem' }}>
            {error.type === 'auth' ? (
              <Link
                href="/login"
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', textDecoration: 'none' }}
              >
                Đăng nhập lại
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadKeys}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name="refresh" size={14} />
                <span>Thử lại kết nối</span>
              </button>
            )}
          </div>
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
            const isPasswordVisible = Boolean(showPassword[item.provider]);

            // Status badges
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
                  <span>Khóa cá nhân</span>
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
                  <span>Mặc định hệ thống (.env)</span>
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
                  Chưa cấu hình
                </span>
              );
            }

            // Validation Badge
            let valBadge = null;
            if (item.validation_status === 'VALID') {
              valBadge = (
                <span style={{
                  fontSize: '0.72rem',
                  color: '#10b981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon name="check" size={12} />
                  <span>Đã kiểm tra kết nối</span>
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
            }

            return (
              <div
                key={item.provider}
                id={`provider-card-${item.provider}`}
                className="card"
                style={{
                  padding: '1.25rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  transition: 'border-color 0.2s ease',
                  borderRadius: '10px'
                }}
              >
                {/* Top Row: Provider Info & Status */}
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
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '12px' }}>
                      <span>Biến tương ứng: <code style={{ color: 'var(--accent)', background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '4px' }}>{item.env_var}</code></span>
                      {item.doc_url && (
                        <a
                          href={item.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          <span>Lấy khóa</span>
                          <Icon name="external" size={11} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      id={`btn-test-${item.provider}`}
                      className="btn btn-secondary"
                      onClick={() => handleTestConnection(item)}
                      disabled={isTesting || (!item.is_configured && !currentInput)}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="Kiểm tra kết nối thực tế tới API nhà cung cấp"
                    >
                      <Icon name="refresh" size={12} className={isTesting ? 'spin' : ''} />
                      <span>{isTesting ? 'Đang kiểm tra...' : 'Test kết nối'}</span>
                    </button>

                    {item.has_personal_key && !isEditing && (
                      <button
                        type="button"
                        id={`btn-delete-${item.provider}`}
                        className="btn btn-secondary"
                        onClick={() => setConfirmDeleteProvider(item)}
                        disabled={isDeleting}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Xóa khóa cá nhân và hoàn tác về mặc định server"
                      >
                        <Icon name="trash" size={12} />
                        <span>Xóa khóa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Configuration Row */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  {!isEditing && item.is_configured ? (
                    /* Display Masked State */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon name="lock" size={16} style={{ color: 'var(--text-muted)' }} />
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                          background: 'var(--bg-secondary)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          letterSpacing: '1px'
                        }}>
                          {item.masked_hint || '••••••••••••••••'}
                        </span>
                        {item.updated_at && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Cập nhật: {new Date(item.updated_at).toLocaleDateString()}
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
                        <span>{item.has_personal_key ? 'Đổi khóa' : 'Ghi đè bằng khóa cá nhân'}</span>
                      </button>
                    </div>
                  ) : (
                    /* Input Form for Entering/Updating Key */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type={isPasswordVisible || !item.is_secret ? 'text' : 'password'}
                            id={`input-key-${item.provider}`}
                            value={currentInput}
                            onChange={(e) => handleInputChange(item.provider, e.target.value)}
                            placeholder={item.placeholder || `Nhập khóa API cho ${item.name}...`}
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

                        <button
                          type="button"
                          id={`btn-save-${item.provider}`}
                          className="btn btn-primary"
                          onClick={() => handleSaveKey(item)}
                          disabled={isSaving || !currentInput.trim()}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Icon name="check" size={13} />
                          <span>{isSaving ? 'Đang lưu...' : 'Lưu khóa'}</span>
                        </button>

                        {(item.is_configured || isEditing) && (
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
                        Khóa sẽ được mã hóa AES-256-GCM và áp dụng tức thì cho tài khoản của bạn (không làm ảnh hưởng người dùng khác).
                      </div>
                    </div>
                  )}

                  {/* Last Error Message Display if any */}
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
                Cập nhật biến toàn cục trong file <code>.env</code> của hệ thống máy chủ thông qua ghi file nguyên tử (Atomic write) và tự động tạo backup. Thay đổi này làm giá trị mặc định cho toàn bộ người dùng chưa cài đặt khóa cá nhân.
              </p>

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
                />

                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={savingAdminEnv || !adminEnvVal.trim()}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  {savingAdminEnv ? 'Đang ghi file...' : 'Cập nhật .env'}
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Lưu ý: Thay đổi file <code>.env</code> sẽ yêu cầu khởi động lại tiến trình backend/demo để áp dụng đầy đủ.
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
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác nhận xóa khóa cá nhân?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa khóa cá nhân của nhà cung cấp <strong>{confirmDeleteProvider.name}</strong>?
              {confirmDeleteProvider.has_system_key
                ? ' Hệ thống sẽ tự động hoàn tác về sử dụng cấu hình mặc định từ máy chủ.'
                : ' Bạn sẽ không thể sử dụng các mô hình của nhà cung cấp này cho đến khi cấu hình lại khóa.'}
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
                className="btn btn-primary"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingProvider)}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                {deletingProvider ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import Icon from './Icon';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  compact?: boolean;
  itemLabel?: string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  compact = false,
  itemLabel = 'items',
  className = ''
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'ellipsis', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (compact) {
    return (
      <div
        className={`pagination-container ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '0.75rem',
          fontSize: '0.75rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>
          {startItem}–{endItem} of {totalItems} {itemLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="pagination-btn"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            style={{ minWidth: 26, height: 26, padding: '0 4px' }}
          >
            ‹
          </button>
          <span style={{ color: 'var(--text-secondary)', padding: '0 4px', fontWeight: 500 }}>
            {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            style={{ minWidth: 26, height: 26, padding: '0 4px' }}
          >
            ›
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pagination-container ${className}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="pagination-info">
          Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}–{endItem}</strong> of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemLabel}
        </span>

        {pageSizeOptions && onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="input"
              style={{
                width: 'auto',
                padding: '2px 6px',
                fontSize: '0.75rem',
                height: '28px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt} style={{ background: '#111827', color: '#fff' }}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                …
              </span>
            );
          }
          const pageNum = p as number;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              className={`pagination-btn ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          className="pagination-btn"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

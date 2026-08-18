import React from 'react'
import ChannelCard from '../ChannelCard/ChannelCard'

export default function ChannelGrid({
  channels = [],
  isLoading = false,
  error = null,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  emptyMessage = 'No channels found matching your search or filters.',
  onClearFilters,
}) {
  if (isLoading) {
    return (
      <div className="channel-grid">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="channel-card skeleton" style={{ height: '180px' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">⚠️</span>
        <h3>Failed to load channels</h3>
        <p className="text-muted">{error.message || 'An error occurred while fetching the channels.'}</p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">📡</span>
        <h3>No Channels Found</h3>
        <p className="text-muted">{emptyMessage}</p>
        {onClearFilters && (
          <button className="btn btn-primary btn-sm" onClick={onClearFilters}>
            Clear All Filters
          </button>
        )}
      </div>
    )
  }

  // Generate page numbers to show (max 5 surrounding numbers)
  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div>
      <div className="channel-grid">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Previous Page"
          >
            ← Prev
          </button>

          {page > 3 && (
            <>
              <button className="pagination-btn" onClick={() => onPageChange(1)}>
                1
              </button>
              {page > 4 && <span className="text-muted">...</span>}
            </>
          )}

          {getPageNumbers().map((p) => (
            <button
              key={p}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}

          {page < totalPages - 2 && (
            <>
              {page < totalPages - 3 && <span className="text-muted">...</span>}
              <button className="pagination-btn" onClick={() => onPageChange(totalPages)}>
                {totalPages}
              </button>
            </>
          )}

          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Next Page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

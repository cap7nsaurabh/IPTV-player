import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import './SyncStatus.css'

export default function SyncStatus() {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: api.sync.status,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 3000 : 30000),
  })

  const triggerMutation = useMutation({
    mutationFn: api.sync.trigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['filters'] })
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
    },
  })

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const isRunning = data?.status === 'running' || triggerMutation.isPending
  const isDone = data?.status === 'done'
  const isError = data?.status === 'error'

  const formatTime = (ts) => {
    if (!ts) return 'Never'
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString()
  }

  return (
    <div className="sync-status-wrapper" ref={popoverRef}>
      <button
        className={`sync-pill ${isRunning ? 'sync-pill--running' : isDone ? 'sync-pill--done' : 'sync-pill--idle'}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Click for catalog sync status"
        aria-expanded={open}
      >
        {isRunning ? (
          <>
            <span className="spinner spinner-sm" />
            <span className="sync-pill-text">Syncing...</span>
          </>
        ) : isDone ? (
          <>
            <span className="status-dot online" />
            <span className="sync-pill-text">Synced</span>
          </>
        ) : (
          <>
            <span className="status-dot unknown" />
            <span className="sync-pill-text">Ready</span>
          </>
        )}
      </button>

      {open && (
        <div className="sync-popover">
          <div className="sync-popover__header">
            <h4>Catalog Sync</h4>
            <span className={`badge ${isDone ? 'badge-accent' : ''}`}>
              {isRunning ? 'In Progress' : isDone ? 'Up to Date' : 'Not Synced'}
            </span>
          </div>

          <div className="sync-popover__body">
            <div className="sync-stat-row">
              <span className="text-muted">Channels:</span>
              <strong>{data?.channels_synced?.toLocaleString() || '0'}</strong>
            </div>
            <div className="sync-stat-row">
              <span className="text-muted">Streams:</span>
              <strong>{data?.streams_synced?.toLocaleString() || '0'}</strong>
            </div>
            <div className="sync-stat-row">
              <span className="text-muted">Last Updated:</span>
              <span className="text-xs">{formatTime(data?.finished_at || data?.started_at)}</span>
            </div>
            {data?.error && (
              <div className="sync-error-msg">
                {data.error}
              </div>
            )}
          </div>

          <div className="sync-popover__footer">
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
              disabled={isRunning}
              onClick={() => triggerMutation.mutate()}
            >
              {isRunning ? (
                <>
                  <span className="spinner spinner-sm" />
                  Syncing Catalog...
                </>
              ) : (
                '🔄 Sync Catalog Now'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStats } from '../hooks/useChannels'
import { api } from '../api/client'

export default function Settings() {
  const queryClient = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useStats()
  const [epgRegion, setEpgRegion] = useState('IN1')
  const [epgSyncMsg, setEpgSyncMsg] = useState('')

  const { data: history } = useQuery({
    queryKey: ['sync-history'],
    queryFn: () => api.sync.history(5),
    refetchInterval: 10000,
  })

  const syncMutation = useMutation({
    mutationFn: api.sync.trigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sync-history'] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  const handleEpgSync = async () => {
    setEpgSyncMsg('Starting EPG sync...')
    try {
      await api.epg.sync(epgRegion)
      setEpgSyncMsg(`EPG sync triggered for region ${epgRegion}. Processing in background.`)
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
    } catch (err) {
      setEpgSyncMsg(`EPG sync failed: ${err.message}`)
    }
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString()
  }

  return (
    <div className="container page-wrapper">
      <div className="settings-page">
        <div>
          <h2>System Settings & Diagnostics</h2>
          <p className="text-muted text-sm">
            Monitor SQLite database status, manage iptv-org upstream sync, and trigger EPG guides.
          </p>
        </div>

        {/* STATS OVERVIEW */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.activeChannels || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Active Channels</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.streams || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Stream Feeds</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.countries || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Countries Represented</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.cachedLogos || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Logos Cached</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.favorites || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Favorites Saved</span>
          </div>
        </section>

        {/* CATALOG SYNC MANAGEMENT */}
        <section className="settings-card">
          <div className="section-title-row">
            <div>
              <h3>Catalog Synchronization</h3>
              <p className="text-muted text-sm">
                Pull latest channel definitions and active stream links from iptv-org/api.
              </p>
            </div>

            <button
              className="btn btn-primary btn-sm"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? (
                <>
                  <span className="spinner spinner-sm" />
                  Triggering Sync...
                </>
              ) : (
                '🔄 Sync Full Catalog Now'
              )}
            </button>
          </div>

          {/* SYNC LOGS TABLE */}
          {history && history.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Recent Sync Logs
              </h4>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Finished</th>
                    <th>Channels</th>
                    <th>Streams</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log.id}>
                      <td>{formatTimestamp(log.started_at)}</td>
                      <td>{formatTimestamp(log.finished_at)}</td>
                      <td>{log.channels_synced?.toLocaleString() || 0}</td>
                      <td>{log.streams_synced?.toLocaleString() || 0}</td>
                      <td>
                        <span className={`badge ${log.status === 'done' ? 'badge-accent' : ''}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* EPG SYNC */}
        <section className="settings-card">
          <div className="section-title-row">
            <div>
              <h3>EPG Schedule Ingestion</h3>
              <p className="text-muted text-sm">
                Fetch and decompress XMLTV Electronic Program Guide data from epgshare01.online.
              </p>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '180px' }}
              value={epgRegion}
              onChange={(e) => setEpgRegion(e.target.value)}
            >
              <option value="IN1">India (IN1)</option>
              <option value="US1">United States (US1)</option>
              <option value="UK1">United Kingdom (UK1)</option>
              <option value="CA1">Canada (CA1)</option>
              <option value="AU1">Australia (AU1)</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={handleEpgSync}>
              📥 Ingest XMLTV EPG
            </button>
          </div>

          {epgSyncMsg && (
            <p className="text-sm" style={{ color: '#60a5fa' }}>
              {epgSyncMsg}
            </p>
          )}
        </section>

        {/* EXPORT & EXTERNAL RESOURCES */}
        <section className="settings-card">
          <h3>Playlists & External Resources</h3>
          <div className="flex gap-3 flex-wrap">
            <a
              href={api.export.m3uUrl(false)}
              download="iptv_full_playlist.m3u"
              className="btn btn-secondary btn-sm"
            >
              📥 Export All Channels M3U
            </a>

            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              ⭐ iptv-org GitHub Repository ↗
            </a>

            <a
              href="https://iptv-org.github.io/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              📖 iptv-org API Feeds ↗
            </a>
          </div>
        </section>

        {/* DISCLAIMER */}
        <section style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <p className="text-muted text-xs">
            <strong>Disclaimer:</strong> This IPTV Browser application does not host, store, or transmit any video streams. All stream URLs and program metadata are publicly indexed from the open-source iptv-org repository under free-to-air distribution. Please respect copyright laws and terms of service of respective broadcasters.
          </p>
        </section>
      </div>
    </div>
  )
}

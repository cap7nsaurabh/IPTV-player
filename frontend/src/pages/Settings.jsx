import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStats } from '../hooks/useChannels'
import { api } from '../api/client'

export default function Settings() {
  const queryClient = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useStats()
  const [epgRegion, setEpgRegion] = useState('IN1')
  const [epgSyncMsg, setEpgSyncMsg] = useState('')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDirectModal, setShowDirectModal] = useState(false)

  // Add source form state
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceAutoSync, setNewSourceAutoSync] = useState(true)
  const [formError, setFormError] = useState('')

  // Direct import state
  const [directName, setDirectName] = useState('')
  const [directContent, setDirectContent] = useState('')
  const [directStatus, setDirectStatus] = useState('')

  // Syncing source tracking
  const [syncingSourceId, setSyncingSourceId] = useState(null)

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Queries
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: api.sources.list,
    refetchInterval: 10000,
  })

  const { data: history } = useQuery({
    queryKey: ['sync-history'],
    queryFn: () => api.sync.history(6),
    refetchInterval: 10000,
  })

  // Invalidate all related queries
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sources'] })
    queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
    queryClient.invalidateQueries({ queryKey: ['sync-history'] })
    queryClient.invalidateQueries({ queryKey: ['channels'] })
    queryClient.invalidateQueries({ queryKey: ['filters'] })
  }

  // Mutations
  const syncAllMutation = useMutation({
    mutationFn: () => api.sources.syncAll(true),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const syncSingleMutation = useMutation({
    mutationFn: (id) => {
      setSyncingSourceId(id)
      return api.sources.sync(id, true)
    },
    onSettled: () => {
      setSyncingSourceId(null)
      invalidateAll()
    },
  })

  const toggleSourceMutation = useMutation({
    mutationFn: ({ id, enabled }) => api.sources.update(id, { enabled }),
    onSuccess: () => invalidateAll(),
  })

  const deleteSourceMutation = useMutation({
    mutationFn: (id) => api.sources.delete(id, true),
    onSuccess: () => invalidateAll(),
  })

  const addSourceMutation = useMutation({
    mutationFn: (data) => api.sources.add(data),
    onSuccess: (newSource) => {
      setShowAddModal(false)
      setNewSourceName('')
      setNewSourceUrl('')
      setFormError('')
      invalidateAll()
      // Auto-trigger initial sync for the newly added source
      if (newSource?.id) {
        syncSingleMutation.mutate(newSource.id)
      }
    },
    onError: (err) => {
      setFormError(err.message)
    },
  })

  const directImportMutation = useMutation({
    mutationFn: (data) => api.sources.importDirect(data),
    onSuccess: (res) => {
      setDirectStatus(`Imported ${res.channelsSynced?.toLocaleString() || 0} channels successfully!`)
      setTimeout(() => {
        setShowDirectModal(false)
        setDirectName('')
        setDirectContent('')
        setDirectStatus('')
        invalidateAll()
      }, 1500)
    },
    onError: (err) => {
      setDirectStatus(`Error: ${err.message}`)
    },
  })

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (!newSourceName.trim()) {
      setFormError('Source name is required')
      return
    }
    if (!newSourceUrl.trim() || (!newSourceUrl.startsWith('http://') && !newSourceUrl.startsWith('https://'))) {
      setFormError('A valid HTTP/HTTPS M3U URL is required')
      return
    }
    addSourceMutation.mutate({
      name: newSourceName.trim(),
      url: newSourceUrl.trim(),
      type: 'm3u',
      enabled: 1,
      auto_sync: newSourceAutoSync ? 1 : 0,
    })
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!directName) {
      setDirectName(file.name.replace(/\.[^/.]+$/, ''))
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setDirectContent(event.target?.result || '')
    }
    reader.readAsText(file)
  }

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
    if (!ts) return 'Never'
    const d = new Date(ts)
    return d.toLocaleString()
  }

  return (
    <div className="container page-wrapper">
      <div className="settings-page">
        <div>
          <h2>System Settings & Catalogs</h2>
          <p className="text-muted text-sm">
            Manage upstream catalog feeds, import custom M3U playlists, monitor database state, and configure EPG data.
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
              {sourcesLoading ? '...' : (sources?.length || 0)}
            </span>
            <span className="stat-card-label">Active Sources</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.countries || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Countries Represented</span>
          </div>

          <div className="stat-card">
            <span className="stat-card-value">
              {statsLoading ? '...' : (stats?.favorites || 0).toLocaleString()}
            </span>
            <span className="stat-card-label">Favorites Saved</span>
          </div>
        </section>

        {/* CATALOG & PLAYLIST SOURCES MANAGEMENT */}
        <section className="settings-card">
          <div className="section-title-row flex-wrap gap-3">
            <div>
              <h3>Catalog & Playlist Sources</h3>
              <p className="text-muted text-sm">
                Connect official registries, Romaxa55 World IPTV, or add custom M3U playlists to expand your channel library.
              </p>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDirectModal(true)}
              >
                📄 Direct Ingest / File
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFormError('')
                  setShowAddModal(true)
                }}
              >
                ➕ Add Custom M3U URL
              </button>

              <button
                className="btn btn-primary btn-sm"
                disabled={syncAllMutation.isPending || syncSingleMutation.isPending}
                onClick={() => syncAllMutation.mutate()}
              >
                {syncAllMutation.isPending ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Syncing All Sources...
                  </>
                ) : (
                  '🔄 Sync All Sources'
                )}
              </button>
            </div>
          </div>

          {/* SOURCES GRID */}
          <div className="sources-grid">
            {sources && sources.map((src) => {
              const isSyncing = syncingSourceId === src.id
              const isBuiltIn = src.id === 'iptv-org' || src.id === 'world-ip-tv'
              const icon = src.id === 'world-ip-tv' ? '🌍' : src.id === 'iptv-org' ? '🌐' : '📺'

              return (
                <div key={src.id} className={`source-card ${!src.enabled ? 'disabled' : ''}`}>
                  <div className="source-card-header">
                    <div>
                      <div className="source-card-title">
                        <span>{icon}</span>
                        <span>{src.name}</span>
                      </div>
                      <div className="source-card-url" title={src.url}>
                        {src.url.length > 50 ? `${src.url.substring(0, 48)}...` : src.url}
                      </div>
                    </div>

                    <label className="toggle-switch" title={src.enabled ? 'Enabled' : 'Disabled'}>
                      <input
                        type="checkbox"
                        checked={src.enabled}
                        onChange={(e) =>
                          toggleSourceMutation.mutate({ id: src.id, enabled: e.target.checked })
                        }
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="source-card-stats">
                    <div className="source-card-stat">
                      <span className="source-card-stat-label">Channels</span>
                      <span className="source-card-stat-val">
                        {(src.live_channels || src.channel_count || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="source-card-stat">
                      <span className="source-card-stat-label">Streams</span>
                      <span className="source-card-stat-val">
                        {(src.live_streams || src.stream_count || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="source-card-stat" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <span className="source-card-stat-label">Last Synced</span>
                      <span className="source-card-stat-val text-xs text-muted">
                        {formatTimestamp(src.last_synced)}
                      </span>
                    </div>
                  </div>

                  <div className="source-card-actions">
                    <div className="flex gap-2">
                      <span className="badge text-xs">
                        {src.type.toUpperCase()}
                      </span>
                      {src.auto_sync && (
                        <span className="badge badge-accent text-xs">
                          Auto-Sync
                        </span>
                      )}
                    </div>

                    {confirmDeleteId === src.id ? (
                      <div className="flex gap-2 items-center">
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          disabled={deleteSourceMutation.isPending}
                          onClick={() => {
                            deleteSourceMutation.mutate(src.id)
                            setConfirmDeleteId(null)
                          }}
                        >
                          {deleteSourceMutation.isPending ? 'Removing...' : '⚠️ Confirm Remove'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!isBuiltIn && (
                          <button
                            className="btn btn-ghost btn-sm btn-danger"
                            title="Remove source and its streams"
                            onClick={() => setConfirmDeleteId(src.id)}
                          >
                            🗑️ Remove
                          </button>
                        )}

                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isSyncing || syncAllMutation.isPending || !src.enabled}
                          onClick={() => syncSingleMutation.mutate(src.id)}
                        >
                          {isSyncing ? (
                            <>
                              <span className="spinner spinner-sm" />
                              Syncing...
                            </>
                          ) : (
                            '🔄 Sync'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* SYNC LOGS TABLE */}
          {history && history.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Recent Synchronization Logs
              </h4>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Source</th>
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
                      <td>
                        <span className="font-mono text-xs text-muted">
                          {log.source_id || 'all'}
                        </span>
                      </td>
                      <td>{formatTimestamp(log.started_at)}</td>
                      <td>{formatTimestamp(log.finished_at)}</td>
                      <td>{log.channels_synced?.toLocaleString() || 0}</td>
                      <td>{log.streams_synced?.toLocaleString() || 0}</td>
                      <td>
                        <span className={`badge ${log.status === 'done' ? 'badge-accent' : log.status === 'error' ? 'badge-stream-none' : ''}`}>
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
              href="https://github.com/Romaxa55/world_ip_tv"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              🌍 World IPTV (Romaxa55) GitHub ↗
            </a>

            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              ⭐ iptv-org GitHub ↗
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
            <strong>Disclaimer:</strong> This IPTV Browser application does not host, store, or transmit any video streams. All stream URLs and program metadata are aggregated from open-source repositories and user-configured M3U sources under free-to-air distribution. Please respect copyright laws and terms of service of respective broadcasters.
          </p>
        </section>
      </div>

      {/* ADD CUSTOM M3U URL MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Custom M3U Source</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Playlist / Source Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. My Sports Channels, Pluto TV M3U"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">M3U / M3U8 Playlist URL</label>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://example.com/playlist.m3u"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center justify-between" style={{ marginTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Enable Auto-Sync</div>
                    <div className="text-muted text-xs">Automatically refresh during periodic scheduler runs</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={newSourceAutoSync}
                      onChange={(e) => setNewSourceAutoSync(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {formError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                    {formError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={addSourceMutation.isPending}
                >
                  {addSourceMutation.isPending ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Adding Source...
                    </>
                  ) : (
                    'Add & Ingest M3U'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT INGEST / FILE UPLOAD MODAL */}
      {showDirectModal && (
        <div className="modal-backdrop" onClick={() => setShowDirectModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Direct M3U Ingest / File Upload</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDirectModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Source / Playlist Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Uploaded Local Playlist"
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Upload M3U File</label>
                <input
                  type="file"
                  accept=".m3u,.m3u8,text/plain"
                  className="input-field"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Or Paste M3U Content Directly</label>
                <textarea
                  className="form-textarea"
                  placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id=&quot;...&quot;,Channel Name&#10;https://stream-url.m3u8"
                  value={directContent}
                  onChange={(e) => setDirectContent(e.target.value)}
                />
              </div>

              {directStatus && (
                <div style={{ color: directStatus.startsWith('Error') ? '#ef4444' : '#60a5fa', fontSize: '13px' }}>
                  {directStatus}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDirectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!directContent.trim() || directImportMutation.isPending}
                onClick={() =>
                  directImportMutation.mutate({
                    name: directName.trim() || 'Direct Import',
                    content: directContent,
                  })
                }
              >
                {directImportMutation.isPending ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Ingesting...
                  </>
                ) : (
                  'Import Playlist'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


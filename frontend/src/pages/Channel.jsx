import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useChannel, useEPG } from '../hooks/useChannels'
import { useFavorites } from '../hooks/useFavorites'
import { api } from '../api/client'
import VideoPlayer from '../components/VideoPlayer/VideoPlayer'

export default function Channel() {
  const { id } = useParams()
  const { data: channel, isLoading, error } = useChannel(id)
  const { data: epgData } = useEPG(id)
  const { toggleFavorite, isFavorite } = useFavorites()

  const [selectedStreamIndex, setSelectedStreamIndex] = useState(0)
  const [streamHealth, setStreamHealth] = useState({})
  const [probingHealth, setProbingHealth] = useState(false)
  const [imgError, setImgError] = useState(false)

  const isFav = channel?.isFavorite || isFavorite(id)
  const streams = channel?.streams || []
  const activeStream = streams[selectedStreamIndex] || streams[0] || null

  // Save to recently watched in localStorage
  useEffect(() => {
    if (channel) {
      try {
        const stored = localStorage.getItem('iptv_recent_channels')
        let recents = stored ? JSON.parse(stored) : []
        recents = recents.filter((c) => c.id !== channel.id)
        recents.unshift({
          id: channel.id,
          name: channel.name,
          logo: channel.logo,
          country: channel.country,
          categories: channel.categories,
        })
        localStorage.setItem('iptv_recent_channels', JSON.stringify(recents.slice(0, 12)))
      } catch (e) {
        console.warn('Failed to save recent channel:', e)
      }
    }
  }, [channel])

  const handleHealthCheck = async () => {
    if (!id || probingHealth) return
    setProbingHealth(true)
    try {
      const results = await api.health.check(id)
      const healthMap = {}
      results.forEach((r) => {
        healthMap[r.url] = r.status
      })
      setStreamHealth(healthMap)
    } catch (err) {
      console.error('Health check failed:', err)
    } finally {
      setProbingHealth(false)
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) {
    return (
      <div className="container page-wrapper">
        <div className="skeleton" style={{ height: '80px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '480px', borderRadius: '16px' }} />
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div className="container page-wrapper">
        <div className="empty-state">
          <span className="empty-state-icon">📺</span>
          <h3>Channel Not Found</h3>
          <p className="text-muted">The requested channel could not be found or may have closed.</p>
          <Link to="/browse" className="btn btn-primary">
            Browse Channels
          </Link>
        </div>
      </div>
    )
  }

  const logoSrc = imgError || !channel.logo
    ? `/api/proxy/logo/${encodeURIComponent(channel.id)}`
    : channel.logo

  const now = Date.now()

  return (
    <div className="container page-wrapper">
      <div className="channel-page">
        {/* CHANNEL HEADER */}
        <div className="channel-header">
          <div className="channel-identity">
            <img
              src={logoSrc}
              alt={channel.name}
              className="channel-header-logo"
              onError={() => setImgError(true)}
            />
            <div className="channel-title-meta">
              <h1>{channel.name}</h1>
              <div className="channel-tags">
                {channel.country && (
                  <span className="badge">
                    🌐 {channel.country}
                  </span>
                )}
                {channel.network && (
                  <span className="badge">
                    🏢 {channel.network}
                  </span>
                )}
                {(channel.categories || []).map((cat) => (
                  <span key={cat} className="badge badge-accent">
                    {cat}
                  </span>
                ))}
                {(channel.languages || []).map((lang) => (
                  <span key={lang} className="badge">
                    🗣️ {lang.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="channel-actions">
            <button
              className={`btn ${isFav ? 'btn-danger' : 'btn-secondary'} btn-sm`}
              onClick={() => toggleFavorite(channel.id, isFav)}
            >
              {isFav ? '❤️ In Favorites' : '🤍 Add to Favorites'}
            </button>

            {channel.website && (
              <a
                href={channel.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                🌐 Official Website ↗
              </a>
            )}
          </div>
        </div>

        {/* PLAYER & STREAMS LAYOUT */}
        <div className="player-layout">
          {/* VIDEO PLAYER */}
          <div>
            {activeStream ? (
              <VideoPlayer stream={activeStream} channelTitle={channel.name} />
            ) : (
              <div className="video-player-container">
                <div className="empty-state">
                  <span className="empty-state-icon">📡</span>
                  <h4>No Active Streams Available</h4>
                  <p className="text-muted text-sm">
                    No public streams are currently registered for this channel.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STREAMS SELECTOR & HEALTH PROBE */}
          <div className="streams-card">
            <div className="section-title-row">
              <h3>Stream Feeds ({streams.length})</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleHealthCheck}
                disabled={probingHealth || streams.length === 0}
                title="Test all stream URLs reachability"
              >
                {probingHealth ? <span className="spinner spinner-sm" /> : '⚡ Check Health'}
              </button>
            </div>

            {streams.length === 0 ? (
              <p className="text-muted text-sm">No alternative feeds available.</p>
            ) : (
              <div className="streams-list">
                {streams.map((s, idx) => {
                  const health = streamHealth[s.url] || s.status || 'unknown'
                  const isActive = idx === selectedStreamIndex

                  return (
                    <div
                      key={s.id || idx}
                      className={`stream-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedStreamIndex(idx)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${health}`} />
                          <strong className="text-sm">Feed #{idx + 1}</strong>
                          {isActive && <span className="badge badge-accent text-xs">Playing</span>}
                        </div>
                        <span className="text-muted text-xs truncate" style={{ maxWidth: '200px' }}>
                          {s.url}
                        </span>
                      </div>

                      <span className="badge text-xs" style={{ textTransform: 'capitalize' }}>
                        {health}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* EPG PROGRAM SCHEDULE */}
        <div className="epg-timeline-card">
          <div className="section-title-row">
            <h2>Electronic Program Guide (EPG)</h2>
            <span className="text-muted text-sm">Schedule & Now Playing</span>
          </div>

          {(!epgData || epgData.length === 0) ? (
            <p className="text-muted">No program schedule available for this channel.</p>
          ) : (
            <div className="epg-program-list">
              {epgData.map((prog, idx) => {
                const isNow = prog.start_time <= now && prog.end_time > now

                return (
                  <div
                    key={prog.id || idx}
                    className={`epg-program-item ${isNow ? 'now-playing' : ''}`}
                  >
                    <div className="epg-time">
                      <div>
                        {formatTime(prog.start_time)} – {formatTime(prog.end_time)}
                      </div>
                      {isNow && <span className="badge badge-accent mt-2">🔴 Now Playing</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <strong style={{ fontSize: '15px' }}>{prog.title}</strong>
                      {prog.description && (
                        <p className="text-muted text-sm">{prog.description}</p>
                      )}
                      {prog.category && (
                        <span className="badge text-xs mt-2" style={{ alignSelf: 'flex-start' }}>
                          {prog.category}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

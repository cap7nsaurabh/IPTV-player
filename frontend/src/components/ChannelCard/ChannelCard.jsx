import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../../hooks/useFavorites'

export default function ChannelCard({ channel }) {
  const { toggleFavorite, isFavorite } = useFavorites()
  const [imgError, setImgError] = useState(false)
  const isFav = channel?.isFavorite || isFavorite(channel?.id)

  if (!channel) return null

  const handleFavoriteClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await toggleFavorite(channel.id, isFav)
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const logoSrc = imgError || !channel.logo
    ? `/api/proxy/logo/${encodeURIComponent(channel.id)}`
    : channel.logo

  const categories = Array.isArray(channel.categories) ? channel.categories : []
  const sources = Array.isArray(channel.sources) ? channel.sources : []

  const formatSourceBadge = (srcId) => {
    if (srcId === 'world-ip-tv') return { label: 'World IPTV', icon: '🌍' }
    if (srcId === 'iptv-org') return { label: 'iptv-org', icon: '🌐' }
    const clean = srcId.replace(/^custom-/, '').replace(/-[a-z0-9]{8}$/, '')
    const display = clean.length > 14 ? clean.slice(0, 13) + '…' : clean
    return { label: display, icon: '📁' }
  }

  return (
    <Link to={`/channel/${encodeURIComponent(channel.id)}`} className="channel-card">
      <div className="channel-card__logo-wrap">
        <img
          src={logoSrc}
          alt={channel.name}
          className="channel-card__logo"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <button
          className={`channel-card__fav-btn ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="channel-card__body">
        <div className="channel-card__name" title={channel.name}>
          {channel.name}
        </div>

        <div className="channel-card__meta">
          {sources.map((srcId) => {
            const info = formatSourceBadge(srcId)
            return (
              <span
                key={srcId}
                className={`badge badge-source ${srcId}`}
                title={`Catalog Source: ${info.label}`}
              >
                {info.icon} {info.label}
              </span>
            )
          })}

          {channel.country && (
            <span className="badge" title={`Country: ${channel.country}`}>
              🌐 {channel.country}
            </span>
          )}

          {categories.slice(0, 1).map((cat) => (
            <span key={cat} className="badge badge-accent">
              {cat}
            </span>
          ))}

          {channel.streamCount !== undefined && (
            <span
              className={`badge ${channel.streamCount > 0 ? 'badge-stream-active' : 'badge-stream-none'}`}
              title={
                channel.streamCount > 0
                  ? `${channel.streamCount} stream${channel.streamCount > 1 ? 's' : ''} available`
                  : 'No streams available'
              }
            >
              <span className={`stream-badge-dot ${channel.streamCount > 0 ? 'online' : 'offline'}`} />
              {channel.streamCount > 0
                ? `${channel.streamCount} ${channel.streamCount === 1 ? 'stream' : 'streams'}`
                : 'No stream'}
            </span>
          )}

          {channel.is_nsfw ? (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              18+
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

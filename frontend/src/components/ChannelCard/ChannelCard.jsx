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

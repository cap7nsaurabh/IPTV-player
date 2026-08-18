import React from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { api } from '../api/client'
import ChannelCard from '../components/ChannelCard/ChannelCard'

export default function Favorites() {
  const { data: favorites, isLoading, error } = useFavorites()

  const favoritesList = Array.isArray(favorites) ? favorites : []

  return (
    <div className="container page-wrapper">
      <div className="favorites-page">
        <div className="favorites-header">
          <div>
            <h2>My Favorite Channels</h2>
            <p className="text-muted text-sm">
              {isLoading ? 'Loading favorites...' : `${favoritesList.length} saved channels`}
            </p>
          </div>

          {favoritesList.length > 0 && (
            <div className="flex gap-2">
              <a
                href={api.export.m3uUrl(true)}
                download="favorites.m3u"
                className="btn btn-primary btn-sm"
              >
                📥 Export Favorites (.m3u)
              </a>
              <a
                href={api.export.m3uUrl(false)}
                download="all_channels.m3u"
                className="btn btn-secondary btn-sm"
              >
                📥 Export All (.m3u)
              </a>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="channel-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="channel-card skeleton" style={{ height: '180px' }} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <span className="empty-state-icon">⚠️</span>
            <h3>Failed to load favorites</h3>
            <p className="text-muted">{error.message}</p>
          </div>
        ) : favoritesList.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🤍</span>
            <h3>No Favorite Channels Yet</h3>
            <p className="text-muted">
              Click the heart icon on any channel card while browsing to save it to your favorites.
            </p>
            <Link to="/browse" className="btn btn-primary">
              Discover Channels
            </Link>
          </div>
        ) : (
          <div className="channel-grid">
            {favoritesList.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

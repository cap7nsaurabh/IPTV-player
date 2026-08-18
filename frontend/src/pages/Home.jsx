import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFilters, useChannels } from '../hooks/useChannels'
import ChannelCard from '../components/ChannelCard/ChannelCard'

const CATEGORY_ICONS = {
  news: '📰',
  sports: '⚽',
  movies: '🎬',
  music: '🎵',
  kids: '🧸',
  documentary: '🎥',
  entertainment: '🎭',
  general: '📺',
  animation: '🎨',
  lifestyle: '☕',
  series: '🍿',
  science: '🔬',
  weather: '⛅',
  travel: '✈️',
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('')
  const [recentChannels, setRecentChannels] = useState([])
  const navigate = useNavigate()

  const { data: filtersData } = useFilters()
  const { data: featuredData, isLoading: featuredLoading } = useChannels({ limit: 12, country: 'US' })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('iptv_recent_channels')
      if (stored) {
        setRecentChannels(JSON.parse(stored).slice(0, 6))
      }
    } catch {}
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      navigate('/browse')
    }
  }

  // Pick top quick categories
  const quickCategories = (filtersData?.categories || [])
    .slice(0, 8)
    .map((cat) => ({
      ...cat,
      icon: CATEGORY_ICONS[cat.value] || '📺',
    }))

  return (
    <div className="container page-wrapper">
      <div className="home-container">
        {/* HERO */}
        <section className="hero">
          <h1>Live IPTV Browser</h1>
          <p>
            Explore 40,000+ legal free-to-air channels from 200+ countries with instant HLS streaming and program guides.
          </p>

          <form className="hero-search-form" onSubmit={handleSearchSubmit}>
            <span className="hero-search-icon">🔍</span>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Search channels, broadcasters, networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-primary hero-search-btn">
              Explore
            </button>
          </form>
        </section>

        {/* QUICK CATEGORIES */}
        <section className="quick-categories">
          <div className="section-title-row">
            <h2>Explore by Category</h2>
            <Link to="/browse" className="btn btn-ghost btn-sm">
              View All Categories →
            </Link>
          </div>

          <div className="category-grid">
            {quickCategories.map((cat) => (
              <Link to={`/browse?category=${encodeURIComponent(cat.value)}`} key={cat.value} className="category-card">
                <span className="icon">{cat.icon}</span>
                <span className="label">{cat.label}</span>
                <span className="count">{cat.count.toLocaleString()} channels</span>
              </Link>
            ))}
          </div>
        </section>

        {/* RECENTLY WATCHED */}
        {recentChannels.length > 0 && (
          <section className="recent-section">
            <div className="section-title-row">
              <h2>Recently Watched</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  localStorage.removeItem('iptv_recent_channels')
                  setRecentChannels([])
                }}
              >
                Clear History
              </button>
            </div>
            <div className="channel-grid">
              {recentChannels.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          </section>
        )}

        {/* FEATURED / POPULAR CHANNELS */}
        <section className="recent-section">
          <div className="section-title-row">
            <h2>Featured Channels</h2>
            <Link to="/browse" className="btn btn-ghost btn-sm">
              Browse All Channels →
            </Link>
          </div>

          {featuredLoading ? (
            <div className="channel-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="channel-card skeleton" style={{ height: '180px' }} />
              ))}
            </div>
          ) : (
            <div className="channel-grid">
              {(featuredData?.data || []).map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

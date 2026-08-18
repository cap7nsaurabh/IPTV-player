import React, { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useChannels } from '../hooks/useChannels'
import SidebarFilters from '../components/SidebarFilters/SidebarFilters'
import SearchBar from '../components/SearchBar/SearchBar'
import ChannelGrid from '../components/ChannelGrid/ChannelGrid'

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const country = searchParams.get('country') || ''
  const language = searchParams.get('language') || ''
  const hasStreams = searchParams.get('hasStreams') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  // Query backend with active params
  const { data, isLoading, error } = useChannels({
    search,
    category,
    country,
    language,
    hasStreams,
    page,
    limit: 48,
  })

  const updateParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const currentVal = next.get(key) || ''
      // If already set to this value, avoid redundant searchParams update
      if (currentVal === value) return prev

      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }

      // Reset to page 1 ONLY when changing search, category, country, language, or hasStreams
      if (key !== 'page') {
        next.delete('page')
      }
      return next
    })
  }, [setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchParams({})
  }, [setSearchParams])

  const hasActiveFilters = Boolean(search || category || country || language || hasStreams)

  return (
    <div className="container page-wrapper">
      <div className="browse-layout">
        {/* SIDEBAR FILTERS */}
        <aside>
          <SidebarFilters
            selectedCategory={category}
            selectedCountry={country}
            selectedLanguage={language}
            selectedHasStreams={hasStreams}
            onSelectCategory={(val) => updateParam('category', val)}
            onSelectCountry={(val) => updateParam('country', val)}
            onSelectLanguage={(val) => updateParam('language', val)}
            onSelectHasStreams={(val) => updateParam('hasStreams', val)}
            onClearAll={handleClearAll}
          />
        </aside>

        {/* MAIN CHANNEL CATALOG */}
        <main className="browse-main">
          {/* HEADER & SEARCH BAR */}
          <div className="browse-header-row">
            <div>
              <h2>Browse Channels</h2>
              <p className="text-muted text-sm">
                {isLoading ? 'Loading channels...' : `${data?.total?.toLocaleString() || 0} channels available`}
              </p>
            </div>

            <div className="browse-header-controls">
              <button
                type="button"
                className={`stream-quick-filter-btn ${hasStreams === 'true' ? 'active' : ''}`}
                onClick={() => updateParam('hasStreams', hasStreams === 'true' ? '' : 'true')}
                title={hasStreams === 'true' ? 'Showing channels with streams only. Click to show all.' : 'Filter to show only channels with streams.'}
              >
                <span className={`status-indicator ${hasStreams === 'true' ? 'status-indicator--live' : 'status-indicator--offline'}`} />
                <span>{hasStreams === 'true' ? 'Streams Only' : 'Has Streams'}</span>
              </button>

              <SearchBar
                value={search}
                onChange={(val) => updateParam('search', val)}
                placeholder="Search by title, network..."
              />
            </div>
          </div>

          {/* ACTIVE FILTER PILLS */}
          {hasActiveFilters && (
            <div className="active-filters-bar">
              <span className="text-muted text-xs">Active Filters:</span>

              {search && (
                <span className="filter-pill">
                  Search: "{search}"
                  <span className="filter-pill-remove" onClick={() => updateParam('search', '')}>
                    ✕
                  </span>
                </span>
              )}

              {hasStreams && (
                <span className="filter-pill">
                  Streams: {hasStreams === 'true' ? 'With Streams Only' : 'No Streams'}
                  <span className="filter-pill-remove" onClick={() => updateParam('hasStreams', '')}>
                    ✕
                  </span>
                </span>
              )}

              {category && (
                <span className="filter-pill">
                  Category: {category}
                  <span className="filter-pill-remove" onClick={() => updateParam('category', '')}>
                    ✕
                  </span>
                </span>
              )}

              {country && (
                <span className="filter-pill">
                  Country: {country}
                  <span className="filter-pill-remove" onClick={() => updateParam('country', '')}>
                    ✕
                  </span>
                </span>
              )}

              {language && (
                <span className="filter-pill">
                  Language: {language}
                  <span className="filter-pill-remove" onClick={() => updateParam('language', '')}>
                    ✕
                  </span>
                </span>
              )}

              <button className="btn btn-ghost btn-sm text-xs" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          )}

          {/* CHANNEL GRID */}
          <ChannelGrid
            channels={data?.data || []}
            isLoading={isLoading}
            error={error}
            page={data?.page || page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            onPageChange={(p) => updateParam('page', String(p))}
            onClearFilters={handleClearAll}
          />
        </main>
      </div>
    </div>
  )
}

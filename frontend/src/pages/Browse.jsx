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
  const page = parseInt(searchParams.get('page') || '1', 10)

  // Query backend with active params
  const { data, isLoading, error } = useChannels({
    search,
    category,
    country,
    language,
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

      // Reset to page 1 ONLY when changing search, category, country, or language
      if (key !== 'page') {
        next.delete('page')
      }
      return next
    })
  }, [setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchParams({})
  }, [setSearchParams])

  const hasActiveFilters = Boolean(search || category || country || language)

  return (
    <div className="container page-wrapper">
      <div className="browse-layout">
        {/* SIDEBAR FILTERS */}
        <aside>
          <SidebarFilters
            selectedCategory={category}
            selectedCountry={country}
            selectedLanguage={language}
            onSelectCategory={(val) => updateParam('category', val)}
            onSelectCountry={(val) => updateParam('country', val)}
            onSelectLanguage={(val) => updateParam('language', val)}
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

            <SearchBar
              value={search}
              onChange={(val) => updateParam('search', val)}
              placeholder="Search by title, network..."
            />
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

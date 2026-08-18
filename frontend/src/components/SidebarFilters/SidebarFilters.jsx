import React, { useState, useMemo } from 'react'
import { useFilters } from '../../hooks/useChannels'

export default function SidebarFilters({
  selectedCategory = '',
  selectedCountry = '',
  selectedLanguage = '',
  onSelectCategory,
  onSelectCountry,
  onSelectLanguage,
  onClearAll,
}) {
  const { data: filtersData, isLoading } = useFilters()

  const [catSearch, setCatSearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [langSearch, setLangSearch] = useState('')

  const [openSections, setOpenSections] = useState({
    categories: true,
    countries: true,
    languages: false,
  })

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const categories = useMemo(() => {
    if (!filtersData?.categories) return []
    if (!catSearch) return filtersData.categories
    const q = catSearch.toLowerCase()
    return filtersData.categories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
    )
  }, [filtersData, catSearch])

  const countries = useMemo(() => {
    if (!filtersData?.countries) return []
    if (!countrySearch) return filtersData.countries
    const q = countrySearch.toLowerCase()
    return filtersData.countries.filter(
      (c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
    )
  }, [filtersData, countrySearch])

  const languages = useMemo(() => {
    if (!filtersData?.languages) return []
    if (!langSearch) return filtersData.languages
    const q = langSearch.toLowerCase()
    return filtersData.languages.filter(
      (l) => l.label.toLowerCase().includes(q) || l.value.toLowerCase().includes(q)
    )
  }, [filtersData, langSearch])

  const hasActiveFilter = Boolean(selectedCategory || selectedCountry || selectedLanguage)

  if (isLoading) {
    return (
      <div className="sidebar-filters">
        <div className="sidebar-header">
          <h3>Filters</h3>
        </div>
        <div className="skeleton" style={{ height: '140px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '140px' }} />
      </div>
    )
  }

  return (
    <div className="sidebar-filters">
      <div className="sidebar-header">
        <h3>Filters</h3>
        {hasActiveFilter && (
          <button className="btn btn-ghost btn-sm" onClick={onClearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* CATEGORIES */}
      <div className="filter-section">
        <div className="filter-section-title" onClick={() => toggleSection('categories')}>
          <span>Categories</span>
          <span>{openSections.categories ? '▾' : '▸'}</span>
        </div>

        {openSections.categories && (
          <>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Filter categories..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
            />
            <div className="filter-options-list">
              <div
                className={`filter-option-item ${!selectedCategory ? 'active' : ''}`}
                onClick={() => onSelectCategory('')}
              >
                <span>All Categories</span>
              </div>
              {categories.map((cat) => (
                <div
                  key={cat.value}
                  className={`filter-option-item ${selectedCategory === cat.value ? 'active' : ''}`}
                  onClick={() => onSelectCategory(selectedCategory === cat.value ? '' : cat.value)}
                >
                  <span className="truncate">{cat.label}</span>
                  <span className="filter-option-count">{cat.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* COUNTRIES */}
      <div className="filter-section">
        <div className="filter-section-title" onClick={() => toggleSection('countries')}>
          <span>Countries</span>
          <span>{openSections.countries ? '▾' : '▸'}</span>
        </div>

        {openSections.countries && (
          <>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
            />
            <div className="filter-options-list">
              <div
                className={`filter-option-item ${!selectedCountry ? 'active' : ''}`}
                onClick={() => onSelectCountry('')}
              >
                <span>All Countries</span>
              </div>
              {countries.map((c) => (
                <div
                  key={c.value}
                  className={`filter-option-item ${selectedCountry === c.value ? 'active' : ''}`}
                  onClick={() => onSelectCountry(selectedCountry === c.value ? '' : c.value)}
                >
                  <span className="truncate">
                    {c.flag} {c.label}
                  </span>
                  <span className="filter-option-count">{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* LANGUAGES */}
      <div className="filter-section">
        <div className="filter-section-title" onClick={() => toggleSection('languages')}>
          <span>Languages</span>
          <span>{openSections.languages ? '▾' : '▸'}</span>
        </div>

        {openSections.languages && (
          <>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search languages..."
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
            />
            <div className="filter-options-list">
              <div
                className={`filter-option-item ${!selectedLanguage ? 'active' : ''}`}
                onClick={() => onSelectLanguage('')}
              >
                <span>All Languages</span>
              </div>
              {languages.map((l) => (
                <div
                  key={l.value}
                  className={`filter-option-item ${selectedLanguage === l.value ? 'active' : ''}`}
                  onClick={() => onSelectLanguage(selectedLanguage === l.value ? '' : l.value)}
                >
                  <span>{l.label}</span>
                  <span className="filter-option-count">{l.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

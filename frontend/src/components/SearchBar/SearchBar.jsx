import React, { useState, useEffect, useRef } from 'react'

export default function SearchBar({ value = '', onChange, placeholder = 'Search channels by name, network...' }) {
  const [query, setQuery] = useState(value)
  const isFirstRender = useRef(true)

  // Sync internal state when external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Debounce notification to parent
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      if (onChange) onChange(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onChange])

  const handleClear = () => {
    setQuery('')
    if (onChange) onChange('')
  }

  return (
    <div className="search-bar-wrap">
      <span className="search-bar-icon">🔍</span>
      <input
        type="text"
        className="search-bar-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button
          type="button"
          className="search-bar-clear"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}

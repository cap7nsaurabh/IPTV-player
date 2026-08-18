import React, { useState, useEffect, useRef } from 'react'

export default function SearchBar({ value = '', onChange, placeholder = 'Search channels by name, network...' }) {
  const [query, setQuery] = useState(value)
  const isFirstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Sync internal state when external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Debounce notification to parent ONLY when user types a different query
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // If the internal query matches the external value prop, don't trigger onChange
    if (query === value) return

    const timer = setTimeout(() => {
      onChangeRef.current?.(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, value])

  const handleClear = () => {
    setQuery('')
    onChangeRef.current?.('')
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

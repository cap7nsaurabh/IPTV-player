import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import SyncStatus from '../SyncStatus/SyncStatus'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/', label: 'Home', exact: true },
    { to: '/browse', label: 'Browse' },
    { to: '/favorites', label: 'Favorites' },
    { to: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar__inner container">
        {/* Logo */}
        <NavLink to="/" className="navbar__logo">
          <span className="navbar__logo-icon">📺</span>
          <span className="navbar__logo-text">IPTV Browser</span>
        </NavLink>

        {/* Desktop links */}
        <ul className="navbar__links">
          {links.map(({ to, label, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  'navbar__link' + (isActive ? ' navbar__link--active' : '')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="navbar__right">
          <SyncStatus />
          {/* Hamburger */}
          <button
            className="navbar__hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
              <span /><span /><span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}>
        <ul className="navbar__mobile-links">
          {links.map(({ to, label, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  'navbar__mobile-link' + (isActive ? ' navbar__mobile-link--active' : '')
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

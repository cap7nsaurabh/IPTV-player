import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Channel from './pages/Channel'
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'

export default function App() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '60px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/channel/:id" element={<Channel />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </>
  )
}

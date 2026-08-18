import React, { useRef, useEffect, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { api } from '../../api/client'
import './VideoPlayer.css'

export default function VideoPlayer({ stream, channelTitle = 'Live Stream' }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const seekbarRef = useRef(null)
  const hideControlsTimerRef = useRef(null)
  const pulseTimerRef = useRef(null)
  const seekFeedbackTimerRef = useRef(null)

  // Player state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState('')
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Playback & Timing state
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedEnd, setBufferedEnd] = useState(0)
  const [isLive, setIsLive] = useState(false)
  const [seekableRange, setSeekableRange] = useState({ start: 0, end: 0 })
  const [isScrubbing, setIsScrubbing] = useState(false)

  // Audio state
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('iptv_player_volume')
    return saved !== null ? parseFloat(saved) : 1
  })
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('iptv_player_muted')
    return saved === 'true'
  })

  // UI / Controls state
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPiPAvailable, setIsPiPAvailable] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverPercent, setHoverPercent] = useState(0)
  const [centerPulse, setCenterPulse] = useState(null) // 'play' | 'pause'
  const [seekFeedback, setSeekFeedback] = useState(null) // { text: string, type: 'rewind' | 'forward' }

  const rawUrl = stream?.url || ''
  const playUrl = useProxy
    ? api.proxy.streamUrl(rawUrl, stream?.http_referrer, stream?.user_agent)
    : rawUrl

  // Check PiP support on mount
  useEffect(() => {
    if (typeof document !== 'undefined' && document.pictureInPictureEnabled) {
      setIsPiPAvailable(true)
    }
  }, [])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      )
      setIsFullscreen(isFs)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Show center pulse animation helper
  const triggerCenterPulse = useCallback((type) => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    setCenterPulse(type)
    pulseTimerRef.current = setTimeout(() => {
      setCenterPulse(null)
    }, 500)
  }, [])

  // Show seek feedback animation helper
  const triggerSeekFeedback = useCallback((text, type) => {
    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current)
    setSeekFeedback({ text, type })
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null)
    }, 550)
  }, [])

  // Auto-hide controls logic
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)

    // Only hide if playing and not scrubbing
    if (isPlaying && !isScrubbing) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false)
      }, 2500)
    }
  }, [isPlaying, isScrubbing])

  const handleMouseMove = () => {
    resetControlsTimer()
  }

  const handleMouseLeave = () => {
    if (isPlaying && !isScrubbing) {
      setControlsVisible(false)
    }
  }

  // Synchronize volume & mute with video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMuted
    localStorage.setItem('iptv_player_volume', String(volume))
    localStorage.setItem('iptv_player_muted', String(isMuted))
  }, [volume, isMuted])

  // Initialize HLS / Video Stream
  useEffect(() => {
    const video = videoRef.current
    if (!video || !playUrl) return

    setLoading(true)
    setError(null)
    setErrorDetails('')
    setIsRetrying(false)

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })
      hlsRef.current = hls

      hls.loadSource(playUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setLoading(false)
        const isLiveManifest = hls.isLive || data?.levels?.[0]?.details?.live || false
        setIsLive(isLiveManifest)

        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay policy fallback: mute and play
            video.muted = true
            setIsMuted(true)
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                setIsPlaying(false)
              })
          })
      })

      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
        if (data.details) {
          setIsLive(data.details.live)
          if (data.details.totalduration) {
            setDuration(data.details.totalduration)
          }
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('[HLS Error]', data.type, data.details, data)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy) {
                console.log('[HLS] Attempting automatic CORS proxy fallback...')
                setUseProxy(true)
              } else {
                setError('Stream network error. The broadcast server may be offline or unreachable.')
                setErrorDetails(`Network error: ${data.details} (${data.response?.code || 'No response'})`)
                setLoading(false)
                hls.destroy()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Fatal media error, attempting recovery...')
              hls.recoverMediaError()
              break
            default:
              setError('Stream playback error encountered with this broadcast feed.')
              setErrorDetails(`HLS Fatal (${data.type}): ${data.details}`)
              setLoading(false)
              hls.destroy()
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = playUrl
      const handleLoadedMetadata = () => {
        setLoading(false)
        setIsLive(!Number.isFinite(video.duration) || video.duration === Infinity)
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            video.muted = true
            setIsMuted(true)
            video.play().then(() => setIsPlaying(true)).catch(() => {})
          })
      }

      const handleNativeError = () => {
        if (!useProxy) {
          setUseProxy(true)
        } else {
          setError('Failed to play stream on native video player.')
          setErrorDetails(video.error ? `Code ${video.error.code}: ${video.error.message}` : 'Native playback failed')
          setLoading(false)
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('error', handleNativeError)

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('error', handleNativeError)
      }
    } else {
      setError('HLS playback is not supported in this browser environment.')
      setErrorDetails('MediaSource or Apple HLS extensions not found.')
      setLoading(false)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [playUrl, useProxy, retryKey])

  // Video element event listeners for time and progress
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return

    if (!isScrubbing) {
      setCurrentTime(video.currentTime)
    }

    // Determine duration and seekable range
    const dur = video.duration
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur)
    } else if (video.seekable && video.seekable.length > 0) {
      const sStart = video.seekable.start(0)
      const sEnd = video.seekable.end(video.seekable.length - 1)
      setSeekableRange({ start: sStart, end: sEnd })
      setIsLive(true)
    }

    // Update buffered progress
    if (video.buffered && video.buffered.length > 0) {
      try {
        const end = video.buffered.end(video.buffered.length - 1)
        setBufferedEnd(end)
      } catch {}
    }
  }

  const handleProgress = () => {
    const video = videoRef.current
    if (!video || !video.buffered || video.buffered.length === 0) return
    try {
      const end = video.buffered.end(video.buffered.length - 1)
      setBufferedEnd(end)
    } catch {}
  }

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => {
          setIsPlaying(true)
          triggerCenterPulse('play')
        })
        .catch((err) => {
          console.warn('Play interrupted:', err)
        })
    } else {
      video.pause()
      setIsPlaying(false)
      triggerCenterPulse('pause')
    }
    resetControlsTimer()
  }, [triggerCenterPulse, resetControlsTimer])

  // Seek relative (-10s / +10s)
  const handleSeekRelative = useCallback((seconds) => {
    const video = videoRef.current
    if (!video) return

    let targetTime = video.currentTime + seconds

    if (isLive && seekableRange.end > seekableRange.start) {
      // Clamped within live seekable range
      targetTime = Math.max(seekableRange.start, Math.min(seekableRange.end, targetTime))
      // If within 2s of live edge, sync to live edge
      if (seekableRange.end - targetTime < 2) {
        targetTime = seekableRange.end
      }
    } else if (duration > 0) {
      // Clamped within VOD duration
      targetTime = Math.max(0, Math.min(duration, targetTime))
    } else {
      targetTime = Math.max(0, targetTime)
    }

    video.currentTime = targetTime
    setCurrentTime(targetTime)

    if (seconds < 0) {
      triggerSeekFeedback(`${seconds}s`, 'rewind')
    } else {
      triggerSeekFeedback(`+${seconds}s`, 'forward')
    }
    resetControlsTimer()
  }, [isLive, seekableRange, duration, triggerSeekFeedback, resetControlsTimer])

  // Sync back to live edge
  const handleSyncToLive = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (seekableRange.end > 0) {
      video.currentTime = seekableRange.end
      setCurrentTime(seekableRange.end)
      triggerSeekFeedback('LIVE', 'forward')
    }
  }, [seekableRange, triggerSeekFeedback])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    }
    resetControlsTimer()
  }, [isFullscreen, resetControlsTimer])

  // Picture in Picture toggle
  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture()
      }
    } catch (err) {
      console.warn('PiP error:', err)
    }
    resetControlsTimer()
  }, [resetControlsTimer])

  // Volume & Mute Toggles
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0 && isMuted) {
      setIsMuted(false)
    }
    resetControlsTimer()
  }

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      if (volume === 0) setVolume(0.5)
    } else {
      setIsMuted(true)
    }
    resetControlsTimer()
  }

  // Retry handler
  const handleRetry = useCallback(() => {
    setError(null)
    setErrorDetails('')
    setLoading(true)
    setIsRetrying(true)

    // Reset video source
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }

    // Trigger re-mount / re-execution
    setTimeout(() => {
      setRetryKey((k) => k + 1)
    }, 150)
  }, [])

  // Keyboard Shortcuts
  const handleKeyDown = useCallback((e) => {
    // Avoid triggering when user is typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault()
        togglePlayPause()
        break
      case 'ArrowLeft':
      case 'j':
      case 'J':
        e.preventDefault()
        handleSeekRelative(-10)
        break
      case 'ArrowRight':
      case 'l':
      case 'L':
        e.preventDefault()
        handleSeekRelative(10)
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume((v) => Math.min(1, parseFloat((v + 0.1).toFixed(2))))
        if (isMuted) setIsMuted(false)
        resetControlsTimer()
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume((v) => Math.max(0, parseFloat((v - 0.1).toFixed(2))))
        resetControlsTimer()
        break
      case 'm':
      case 'M':
        e.preventDefault()
        toggleMute()
        break
      case 'f':
      case 'F':
        e.preventDefault()
        toggleFullscreen()
        break
      case 'r':
      case 'R':
        e.preventDefault()
        handleRetry()
        break
      default:
        break
    }
  }, [togglePlayPause, handleSeekRelative, isMuted, toggleMute, toggleFullscreen, handleRetry, resetControlsTimer])

  // Seekbar scrubbing calculations
  const calculateSeekTime = useCallback((clientX) => {
    if (!seekbarRef.current) return 0
    const rect = seekbarRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))

    if (isLive && seekableRange.end > seekableRange.start) {
      const windowSize = seekableRange.end - seekableRange.start
      return seekableRange.start + pct * windowSize
    } else if (duration > 0) {
      return pct * duration
    }
    return 0
  }, [isLive, seekableRange, duration])

  const handleSeekbarClick = (e) => {
    const newTime = calculateSeekTime(e.clientX)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
    resetControlsTimer()
  }

  const handleSeekbarMouseMove = (e) => {
    if (!seekbarRef.current) return
    const rect = seekbarRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverPercent(pct * 100)

    const calcTime = calculateSeekTime(e.clientX)
    setHoverTime(calcTime)
  }

  const handleSeekbarMouseLeave = () => {
    setHoverTime(null)
  }

  // Handle Drag Scrubbing
  const handleSeekbarMouseDown = (e) => {
    setIsScrubbing(true)
    const newTime = calculateSeekTime(e.clientX)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }

    const onMouseMove = (moveEvent) => {
      const t = calculateSeekTime(moveEvent.clientX)
      setCurrentTime(t)
      if (videoRef.current) {
        videoRef.current.currentTime = t
      }
    }

    const onMouseUp = () => {
      setIsScrubbing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      resetControlsTimer()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Format seconds to mm:ss or hh:mm:ss
  const formatTimeString = (seconds) => {
    if (isNaN(seconds) || !Number.isFinite(seconds) || seconds < 0) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Compute progress percentages for seekbar
  let progressPct = 0
  let bufferedPct = 0
  let isBehindLive = false
  let liveOffsetSeconds = 0

  if (isLive && seekableRange.end > seekableRange.start) {
    const windowSize = seekableRange.end - seekableRange.start
    if (windowSize > 0) {
      progressPct = Math.min(100, Math.max(0, ((currentTime - seekableRange.start) / windowSize) * 100))
      bufferedPct = Math.min(100, Math.max(0, ((bufferedEnd - seekableRange.start) / windowSize) * 100))
      liveOffsetSeconds = Math.max(0, Math.floor(seekableRange.end - currentTime))
      isBehindLive = liveOffsetSeconds > 4
    }
  } else if (duration > 0) {
    progressPct = Math.min(100, Math.max(0, (currentTime / duration) * 100))
    bufferedPct = Math.min(100, Math.max(0, (bufferedEnd / duration) * 100))
  }

  const hasDVRWindow = isLive && (seekableRange.end - seekableRange.start > 15)

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${!controlsVisible && isPlaying ? 'controls-hidden hide-cursor' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onPlay={() => {
          setIsPlaying(true)
          setLoading(false)
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Click zone on video surface */}
      <div
        className="player-center-clickzone"
        onClick={togglePlayPause}
        onDoubleClick={(e) => {
          e.stopPropagation()
          toggleFullscreen()
        }}
      />

      {/* Top and Bottom Gradients */}
      <div className="player-scrim-top" />
      <div className="player-scrim-bottom" />

      {/* TOP HEADER OVERLAY */}
      <div className="player-top-overlay">
        <div className="player-top-left">
          <span className="player-badge-live">
            <span className={`player-live-dot ${isBehindLive ? 'behind' : ''}`} />
            {isLive ? 'LIVE' : 'VIDEO'}
          </span>

          {channelTitle && (
            <span className="player-channel-title" title={channelTitle}>
              {channelTitle}
            </span>
          )}

          {useProxy && (
            <span className="player-badge-proxy" title="Stream routed through backend CORS proxy">
              Proxy Mode
            </span>
          )}
        </div>

        <div className="player-top-right">
          <button
            className="player-btn-icon-sm"
            onClick={handleRetry}
            title="Reload Stream (R)"
            aria-label="Reload Stream"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* CENTER BIG PLAY BUTTON (WHEN PAUSED / STOPPED) */}
      {!isPlaying && !loading && !error && (
        <div className="player-center-play-wrapper">
          <button
            className="player-big-play-btn"
            onClick={togglePlayPause}
            title="Play Stream (Space)"
            aria-label="Play Stream"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </button>
        </div>
      )}

      {/* CENTER TRANSIENT PULSE ON CLICK / SPACEBAR */}
      {centerPulse && (
        <div className="player-pulse-badge">
          {centerPulse === 'play' ? (
            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
        </div>
      )}

      {/* SEEK ANIMATION RIPPLE (-10s / +10s feedback) */}
      {seekFeedback && (
        <div className={`player-seek-ripple ${seekFeedback.type === 'rewind' ? 'left' : 'right'}`}>
          {seekFeedback.type === 'rewind' ? (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 19 2 12 11 5 11 19" fill="currentColor" />
              <polygon points="22 19 13 12 22 5 22 19" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 19 22 12 13 5 13 19" fill="currentColor" />
              <polygon points="2 19 11 12 2 5 2 19" fill="currentColor" />
            </svg>
          )}
          <span className="player-seek-ripple-text">{seekFeedback.text}</span>
        </div>
      )}

      {/* BUFFERING / LOADING OVERLAY */}
      {loading && !error && (
        <div className="player-loading-overlay">
          <span className="spinner spinner-lg" />
          <span className="player-loading-text">Connecting to Broadcast Feed...</span>
        </div>
      )}

      {/* ERROR & RETRY OVERLAY */}
      {error && (
        <div className="player-error-overlay">
          <div className="player-error-card">
            <div className="player-error-icon-wrapper">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h3 className="player-error-title">Stream Playback Error</h3>
            <p className="player-error-desc">{error}</p>

            {errorDetails && (
              <div style={{ width: '100%' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowErrorDetails((v) => !v)}
                  style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '2px 6px' }}
                >
                  {showErrorDetails ? 'Hide Diagnostics ▲' : 'Show Diagnostics ▼'}
                </button>
                {showErrorDetails && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#cbd5e1',
                      wordBreak: 'break-all',
                      textAlign: 'left',
                      marginTop: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div><strong>URL:</strong> {rawUrl}</div>
                    <div><strong>Detail:</strong> {errorDetails}</div>
                  </div>
                )}
              </div>
            )}

            <div className="player-error-actions">
              <button
                className={`player-retry-btn ${isRetrying ? 'retrying' : ''}`}
                onClick={handleRetry}
                disabled={isRetrying}
                title="Retry loading stream"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isRetrying ? 'Reconnecting...' : 'Retry Stream'}</span>
              </button>

              <button
                className="player-proxy-toggle-btn"
                onClick={() => {
                  setUseProxy((p) => !p)
                  handleRetry()
                }}
                title={useProxy ? 'Switch to direct stream' : 'Route stream through backend CORS proxy'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>{useProxy ? 'Use Direct Mode' : 'Force Proxy Mode'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      <div className="player-controls-bar" onClick={(e) => e.stopPropagation()}>
        {/* SEEKBAR */}
        {duration > 0 || hasDVRWindow ? (
          <div
            ref={seekbarRef}
            className={`player-seekbar-container ${isScrubbing ? 'scrubbing' : ''}`}
            onClick={handleSeekbarClick}
            onMouseDown={handleSeekbarMouseDown}
            onMouseMove={handleSeekbarMouseMove}
            onMouseLeave={handleSeekbarMouseLeave}
            title="Seek playback position"
          >
            <div className="player-seekbar-track">
              {/* Buffered progress */}
              <div
                className="player-seekbar-buffered"
                style={{ width: `${bufferedPct}%` }}
              />

              {/* Played progress */}
              <div
                className="player-seekbar-progress"
                style={{ width: `${progressPct}%` }}
              />

              {/* Draggable thumb handle */}
              <div
                className="player-seekbar-thumb"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Hover preview timestamp tooltip */}
            {hoverTime !== null && (
              <div
                className="player-seekbar-tooltip"
                style={{ left: `${hoverPercent}%` }}
              >
                {isLive && hasDVRWindow
                  ? (seekableRange.end - hoverTime <= 4 ? 'LIVE' : `-${formatTimeString(seekableRange.end - hoverTime)}`)
                  : formatTimeString(hoverTime)}
              </div>
            )}
          </div>
        ) : (
          /* Sleek Live Indicator line for non-sliding live feeds */
          <div className="player-live-seekbar">
            <div className="player-live-line" />
          </div>
        )}

        {/* CONTROLS ROW */}
        <div className="player-controls-row">
          {/* LEFT CONTROLS: Play/Pause, Rewind 10s, Forward 10s, Volume, Time */}
          <div className="player-controls-left">
            {/* Play / Pause Button */}
            <button
              className="player-ctrl-btn player-ctrl-play-btn"
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1.2" />
                  <rect x="14" y="4" width="4" height="16" rx="1.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              )}
            </button>

            {/* << REWIND 10s BUTTON */}
            <button
              className="player-ctrl-btn player-ctrl-seek-btn"
              onClick={() => handleSeekRelative(-10)}
              title="Rewind 10 seconds (Left Arrow / J)"
              aria-label="Rewind 10 seconds"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 19 2 12 11 5 11 19" fill="currentColor" />
                <polygon points="22 19 13 12 22 5 22 19" fill="currentColor" />
              </svg>
            </button>

            {/* >> FORWARD 10s BUTTON */}
            <button
              className="player-ctrl-btn player-ctrl-seek-btn"
              onClick={() => handleSeekRelative(10)}
              title="Skip forward 10 seconds (Right Arrow / L)"
              aria-label="Skip forward 10 seconds"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 19 22 12 13 5 13 19" fill="currentColor" />
                <polygon points="2 19 11 12 2 5 2 19" fill="currentColor" />
              </svg>
            </button>

            {/* Volume & Mute */}
            <div className="player-volume-group">
              <button
                className="player-ctrl-btn"
                onClick={toggleMute}
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>

              <div className="player-volume-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="player-volume-slider"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  aria-label="Volume Slider"
                />
              </div>
            </div>

            {/* Time / Live Display */}
            <div className="player-time-display">
              {isLive ? (
                hasDVRWindow ? (
                  <button
                    className={`player-live-sync-btn ${isBehindLive ? 'behind' : ''}`}
                    onClick={handleSyncToLive}
                    title={isBehindLive ? 'Click to jump to live edge' : 'Currently streaming live'}
                  >
                    <span className={`player-live-dot ${isBehindLive ? 'behind' : ''}`} />
                    {isBehindLive ? `-${formatTimeString(liveOffsetSeconds)} (Go Live)` : 'LIVE'}
                  </button>
                ) : (
                  <span className="player-live-sync-btn">
                    <span className="player-live-dot" /> LIVE
                  </span>
                )
              ) : (
                <>
                  <span className="player-time-current">{formatTimeString(currentTime)}</span>
                  <span className="player-time-divider">/</span>
                  <span className="player-time-duration">{formatTimeString(duration)}</span>
                </>
              )}
            </div>
          </div>

          {/* RIGHT CONTROLS: Reconnect / Reload, PiP, Fullscreen */}
          <div className="player-controls-right">
            {/* Quick Stream Reload Button */}
            <button
              className="player-ctrl-btn"
              onClick={handleRetry}
              title="Reload / Reconnect Stream (R)"
              aria-label="Reload Stream"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Picture in Picture */}
            {isPiPAvailable && (
              <button
                className="player-ctrl-btn"
                onClick={togglePiP}
                title="Picture in Picture"
                aria-label="Picture in Picture"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" />
                </svg>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              className="player-ctrl-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 9v-6h-6M3 15v6h6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

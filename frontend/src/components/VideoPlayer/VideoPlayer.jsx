import React, { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import { api } from '../../api/client'

export default function VideoPlayer({ stream, channelTitle = 'Live Stream' }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [useProxy, setUseProxy] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const rawUrl = stream?.url || ''
  const playUrl = useProxy
    ? api.proxy.streamUrl(rawUrl, stream?.http_referrer, stream?.user_agent)
    : rawUrl

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playUrl) return

    setLoading(true)
    setError(null)

    // Destroy existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })
      hlsRef.current = hls

      hls.loadSource(playUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        video.play().then(() => setIsPlaying(true)).catch(() => {
          // Autoplay policy may require mute
          video.muted = true
          video.play().catch(() => {})
        })
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[HLS fatal error]', data.type, data.details)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If not already using proxy, try proxying the stream
              if (!useProxy) {
                console.log('[HLS] Retrying via backend CORS proxy...')
                setUseProxy(true)
              } else {
                setError('Stream network error. The broadcast server may be offline or blocking access.')
                setLoading(false)
                hls.destroy()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Recovering media error...')
              hls.recoverMediaError()
              break
            default:
              setError('Playback error occurred with this stream.')
              setLoading(false)
              hls.destroy()
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari
      video.src = playUrl
      video.addEventListener('loadedmetadata', () => {
        setLoading(false)
        video.play().catch(() => {})
      })
      video.addEventListener('error', () => {
        if (!useProxy) {
          setUseProxy(true)
        } else {
          setError('Failed to play stream on native player.')
          setLoading(false)
        }
      })
    } else {
      setError('HLS playback is not supported in this browser.')
      setLoading(false)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [playUrl, useProxy])

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else if (video.requestFullscreen) {
      video.requestFullscreen()
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setUseProxy(false)
  }

  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        controls
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
      />

      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <span className="spinner spinner-lg" />
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'rgba(10, 13, 20, 0.92)',
            padding: '24px',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '36px' }}>⚠️</span>
          <h4>Stream Unavailable</h4>
          <p className="text-muted text-sm" style={{ maxWidth: '400px' }}>
            {error}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleRetry}>
              🔄 Retry Stream
            </button>
            {!useProxy && (
              <button className="btn btn-secondary btn-sm" onClick={() => setUseProxy(true)}>
                🌐 Force Proxy Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top overlay badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <span className="badge" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <span className="status-dot online" /> LIVE
        </span>
        {useProxy && (
          <span className="badge" style={{ background: 'rgba(59,130,246,0.3)', color: '#93c5fd' }}>
            CORS Proxied
          </span>
        )}
      </div>
    </div>
  )
}

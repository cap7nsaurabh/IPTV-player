const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || './data';

// Helper to rewrite m3u8 playlists so relative and nested URLs route through the proxy
function rewriteM3u8(manifestText, baseUrl, queryParams = {}) {
  const lines = manifestText.split(/\r?\n/);
  const rewritten = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Handle URI attributes in tags like #EXT-X-KEY:METHOD=...,URI="key.php" or #EXT-X-MAP:URI="init.mp4"
    if (trimmed.startsWith('#EXT-X-KEY:') || trimmed.startsWith('#EXT-X-MAP:') || trimmed.startsWith('#EXT-X-MEDIA:')) {
      return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
        try {
          const absoluteUrl = new URL(uri, baseUrl).toString();
          const proxyUri = buildProxyUrl(absoluteUrl, queryParams);
          return `URI="${proxyUri}"`;
        } catch {
          return _match;
        }
      });
    }

    // Don't rewrite comments or other tags
    if (trimmed.startsWith('#')) {
      return line;
    }

    // This line is a URL / file path
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).toString();
      return buildProxyUrl(absoluteUrl, queryParams);
    } catch {
      return line;
    }
  });

  return rewritten.join('\n');
}

function buildProxyUrl(targetUrl, { referrer, userAgent } = {}) {
  const params = new URLSearchParams({ url: targetUrl });
  if (referrer) params.set('referrer', referrer);
  if (userAgent) params.set('userAgent', userAgent);
  return `/api/proxy/stream?${params.toString()}`;
}

// Proxy HLS streams to bypass CORS
router.get('/stream', async (req, res) => {
  const { url, referrer, userAgent } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url param' });
  }

  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
  });

  try {
    const headers = {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };
    if (referrer) headers['Referer'] = referrer;

    const upstream = await fetch(url, {
      headers,
      signal: controller.signal,
      timeout: 15000,
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream error: ${upstream.status} ${upstream.statusText}`);
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isM3U8 =
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('vnd.apple.mpegurl') ||
      url.includes('.m3u8') ||
      url.includes('.m3u');

    // Safe CORS & Cache Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (isM3U8) {
      const bodyText = await upstream.text();
      if (bodyText.startsWith('#EXTM3U') || isM3U8) {
        const rewritten = rewriteM3u8(bodyText, url, { referrer, userAgent });
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.send(rewritten);
      }
    }

    // Binary segment (e.g. .ts, .m4s, .mp4, audio)
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    const acceptRanges = upstream.headers.get('accept-ranges');
    if (acceptRanges) {
      res.setHeader('Accept-Ranges', acceptRanges);
    }

    // Safely pipe response without sending conflicting content-length/transfer-encoding
    upstream.body.pipe(res);

    upstream.body.on('error', () => {
      if (!res.writableEnded && !res.destroyed) {
        try {
          res.end();
        } catch {}
      }
    });

    res.on('close', () => {
      if (upstream.body && !upstream.body.destroyed) {
        try {
          upstream.body.destroy();
        } catch {}
      }
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return; // Request was aborted by client disconnect
    }
    console.error('[Proxy] stream error:', err.message);
    if (!res.headersSent && !res.writableEnded) {
      res.status(502).json({ error: 'Bad gateway: ' + err.message });
    }
  }
});

// Serve cached logos, fallback to SVG placeholder
router.get('/logo/:channelId', (req, res) => {
  const { channelId } = req.params;
  const logoPath = path.join(DATA_DIR, 'logos', channelId + '.jpg');

  if (fs.existsSync(logoPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(logoPath).pipe(res);
  }

  // SVG placeholder with initials
  const initials = channelId
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '?';

  const hue = Math.abs(channelId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="10" fill="hsl(${hue},30%,18%)"/>
  <text x="60" y="72" font-family="Arial,sans-serif" font-size="40" font-weight="700"
        fill="hsl(${hue},60%,65%)" text-anchor="middle">${initials}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

module.exports = router;

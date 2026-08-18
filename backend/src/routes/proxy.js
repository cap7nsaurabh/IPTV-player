const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || './data';

// Proxy HLS streams to bypass CORS
router.get('/stream', async (req, res) => {
  const { url, referrer, userAgent } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url param' });
  }

  try {
    const headers = {
      'User-Agent': userAgent || 'Mozilla/5.0 (compatible; IPTVBrowser/1.0)',
      'Accept': '*/*',
    };
    if (referrer) headers['Referer'] = referrer;

    const upstream = await fetch(url, { headers });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream error');
    }

    const passHeaders = ['content-type', 'content-length', 'accept-ranges', 'transfer-encoding'];
    passHeaders.forEach(h => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    });
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    upstream.body.pipe(res);
    upstream.body.on('error', () => res.end());
  } catch (err) {
    console.error('[Proxy] stream error:', err.message);
    res.status(502).json({ error: 'Bad gateway: ' + err.message });
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

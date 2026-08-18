'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/db');

/**
 * Generates an M3U playlist based on channels or favorites
 */
router.get(['/', '/m3u'], (req, res) => {
  try {
    const favoritesOnly = req.query.favoritesOnly === 'true' || req.query.favorites === 'true';
    const fileName = favoritesOnly ? 'favorites.m3u' : 'playlist.m3u';

    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const query = favoritesOnly
      ? `SELECT c.id, c.name, c.logo, c.country, s.url
         FROM favorites f
         JOIN channels c ON c.id = f.channel_id
         JOIN streams s ON s.channel_id = c.id
         WHERE c.closed IS NULL
         ORDER BY c.name ASC`
      : `SELECT c.id, c.name, c.logo, c.country, s.url
         FROM channels c
         JOIN streams s ON s.channel_id = c.id
         WHERE c.closed IS NULL
         ORDER BY c.name ASC`;

    const rows = db.prepare(query).all();

    let output = '#EXTM3U\n';
    for (const row of rows) {
      const logoAttr = row.logo ? ` tvg-logo="${row.logo}"` : '';
      const countryAttr = row.country ? ` tvg-country="${row.country}"` : '';
      output += `#EXTINF:-1 tvg-id="${row.id}"${logoAttr}${countryAttr},${row.name}\n${row.url}\n`;
    }

    res.send(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

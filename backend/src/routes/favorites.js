const express = require('express');
const router = express.Router();
const db = require('../db/db');

function safeJSON(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, 1 as isFavorite, f.added_at as favorited_at,
             (SELECT COUNT(*) FROM streams s WHERE s.channel_id = c.id) AS streamCount
      FROM favorites f
      JOIN channels c ON c.id = f.channel_id
      ORDER BY f.added_at DESC
    `).all();
    const channels = rows.map(ch => ({
      ...ch,
      alt_names: safeJSON(ch.alt_names, []),
      categories: safeJSON(ch.categories, []),
      languages: safeJSON(ch.languages, []),
      isFavorite: true,
      streamCount: ch.streamCount != null ? Number(ch.streamCount) : undefined,
      hasStreams: ch.streamCount != null ? Number(ch.streamCount) > 0 : undefined,
    }));
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:channelId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO favorites (channel_id, added_at) VALUES (?, ?)').run(req.params.channelId, Date.now());
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:channelId', (req, res) => {
  try {
    db.prepare('DELETE FROM favorites WHERE channel_id = ?').run(req.params.channelId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

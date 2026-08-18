const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/streams/:channelId
router.get('/:channelId', (req, res) => {
  try {
    const streams = db.prepare(
      'SELECT * FROM streams WHERE channel_id = ? ORDER BY status ASC, id ASC'
    ).all(req.params.channelId);
    res.json(streams);
  } catch (err) {
    console.error('streams error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { syncEPG, getChannelEPG } = require('../services/epgService');

// GET /api/epg/:channelId - Get EPG schedule for a channel
router.get('/:channelId', (req, res) => {
  try {
    const { channelId } = req.params;
    const schedule = getChannelEPG(channelId);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/epg/sync/:region - Sync EPG for a region
router.post('/sync/:region?', async (req, res) => {
  try {
    const region = req.params.region || 'IN1';
    res.status(202).json({ ok: true, message: `EPG sync started for region ${region}` });
    syncEPG(region).catch(e => console.error('[EPG] Background sync error:', e.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

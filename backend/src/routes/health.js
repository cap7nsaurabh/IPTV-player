const express = require('express');
const router = express.Router();
const { checkChannelHealth } = require('../services/healthService');

router.post('/:channelId', async (req, res) => {
  try {
    const results = await checkChannelHealth(req.params.channelId);
    res.json(results);
  } catch (err) {
    console.error('[Health] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

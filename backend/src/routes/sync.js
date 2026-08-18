const express = require('express');
const router = express.Router();
const { syncCatalogs, getLastSync, getSyncHistory, getDbStats, cacheLogos } = require('../services/syncService');

router.get('/status', (req, res) => {
  try {
    const last = getLastSync();
    res.json(last || { status: 'never' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = getDbStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', (req, res) => {
  try {
    const history = getSyncHistory(parseInt(req.query.limit || '10', 10));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trigger', (req, res) => {
  res.status(202).json({ ok: true, message: 'Sync started in background' });
  syncCatalogs()
    .then(() => cacheLogos(500))
    .catch(err => console.error('[Sync] Background error:', err.message));
});

module.exports = router;

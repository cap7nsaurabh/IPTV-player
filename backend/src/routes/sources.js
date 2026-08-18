'use strict';

const express = require('express');
const router = express.Router();
const {
  getSources,
  getSource,
  addSource,
  updateSource,
  deleteSource,
  syncSource,
  syncAllSources,
  importDirectM3u,
  cacheLogos,
} = require('../services/syncService');

// GET /api/sources - List all sources
router.get('/', (_req, res) => {
  try {
    const sources = getSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sources/:id - Get single source
router.get('/:id', (req, res) => {
  try {
    const source = getSource(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources - Add new source
router.post('/', (req, res) => {
  try {
    const { id, name, type, url, enabled, auto_sync } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    const source = addSource({ id, name, type, url, enabled, auto_sync });
    res.status(201).json(source);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/sources/:id - Update source
router.put('/:id', (req, res) => {
  try {
    const { name, url, enabled, auto_sync } = req.body;
    const source = updateSource(req.params.id, { name, url, enabled, auto_sync });
    res.json(source);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/sources/:id - Delete source
router.delete('/:id', (req, res) => {
  try {
    const cleanStreams = req.query.cleanStreams !== 'false';
    const result = deleteSource(req.params.id, cleanStreams);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sources/:id/sync - Sync specific source
router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;
  const source = getSource(id);
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  // Acknowledge immediately if background requested, or wait and return result
  if (req.query.async === 'true') {
    res.status(202).json({ ok: true, message: `Sync started for source ${source.name}` });
    syncSource(id)
      .then(() => cacheLogos(100))
      .catch((err) => console.error(`[Sources] Async sync error for ${id}:`, err.message));
  } else {
    try {
      const result = await syncSource(id);
      cacheLogos(100).catch(() => {});
      res.json({ ok: true, source: getSource(id), result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/sources/sync-all - Sync all enabled sources
router.post('/sync-all', async (req, res) => {
  if (req.query.async === 'true') {
    res.status(202).json({ ok: true, message: 'Sync started for all sources' });
    syncAllSources()
      .then(() => cacheLogos(200))
      .catch((err) => console.error('[Sources] Sync-all error:', err.message));
  } else {
    try {
      const results = await syncAllSources();
      cacheLogos(200).catch(() => {});
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/sources/import-direct - Direct M3U text/file content import
router.post('/import-direct', async (req, res) => {
  try {
    const { name, content, sourceId } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'M3U content is required' });
    }
    const result = await importDirectM3u({ name, content, sourceId });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
'use strict';

const express = require('express');
const db = require('../db/db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: parse JSON fields that are stored as strings in SQLite
// ---------------------------------------------------------------------------
function parseChannel(ch) {
  if (!ch) return null;
  return {
    ...ch,
    alt_names:   safeParseJSON(ch.alt_names,  []),
    categories:  safeParseJSON(ch.categories, []),
    languages:   safeParseJSON(ch.languages,  []),
    is_nsfw:     Boolean(ch.is_nsfw),
    isFavorite:  Boolean(ch.isFavorite),
    streamCount: ch.streamCount != null ? Number(ch.streamCount) : undefined,
    hasStreams:  ch.streamCount != null ? Number(ch.streamCount) > 0 : undefined,
  };
}

function safeParseJSON(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// GET /api/channels
// Query params: search, country, category, language, page, limit, favoritesOnly, hasStreams
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const {
    search,
    country,
    category,
    language,
    favoritesOnly,
    hasStreams,
    page  = '1',
    limit = '48',
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 48));
  const offset   = (pageNum - 1) * limitNum;

  const conditions = ['c.closed IS NULL'];
  const params     = [];

  if (search) {
    conditions.push("(c.name LIKE ? OR c.alt_names LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (country) {
    conditions.push('c.country = ?');
    params.push(country);
  }

  if (category) {
    conditions.push("c.categories LIKE ?");
    params.push(`%"${category}"%`);
  }

  if (language) {
    conditions.push("c.languages LIKE ?");
    params.push(`%"${language}"%`);
  }

  if (hasStreams === 'true' || hasStreams === '1') {
    conditions.push("EXISTS (SELECT 1 FROM streams s WHERE s.channel_id = c.id)");
  } else if (hasStreams === 'false' || hasStreams === '0') {
    conditions.push("NOT EXISTS (SELECT 1 FROM streams s WHERE s.channel_id = c.id)");
  }

  const joinFav = favoritesOnly === 'true'
    ? 'INNER JOIN favorites f ON f.channel_id = c.id'
    : 'LEFT JOIN favorites f ON f.channel_id = c.id';

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countSql = `
    SELECT COUNT(*) as total
    FROM channels c
    ${joinFav}
    ${where}
  `;

  const dataSql = `
    SELECT c.*,
           CASE WHEN f.channel_id IS NOT NULL THEN 1 ELSE 0 END AS isFavorite,
           (SELECT COUNT(*) FROM streams s WHERE s.channel_id = c.id) AS streamCount
    FROM channels c
    ${joinFav}
    ${where}
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `;

  const total      = db.prepare(countSql).get(...params).total;
  const rows       = db.prepare(dataSql).all(...params, limitNum, offset);
  const totalPages = Math.ceil(total / limitNum);

  res.json({
    data:       rows.map(parseChannel),
    total,
    page:       pageNum,
    limit:      limitNum,
    totalPages,
  });
});

// ---------------------------------------------------------------------------
// GET /api/channels/filters
// ---------------------------------------------------------------------------
router.get('/filters', (_req, res) => {
  const countryRows = db.prepare(`
    SELECT c.country, count(*) as count, co.name, co.flag
    FROM channels c
    LEFT JOIN countries co ON co.code = c.country
    WHERE c.closed IS NULL AND c.country IS NOT NULL AND c.country != ''
    GROUP BY c.country
    ORDER BY count DESC
  `).all();

  const categoryRows = db.prepare(`SELECT id, name FROM categories`).all();
  const categoryMap = new Map(categoryRows.map(c => [c.id, c.name]));

  // Tally categories and languages from JSON arrays
  const catCount  = new Map();
  const langCount = new Map();

  const allRows = db.prepare(`
    SELECT categories, languages FROM channels WHERE closed IS NULL
  `).all();

  for (const row of allRows) {
    for (const cat of safeParseJSON(row.categories, [])) {
      catCount.set(cat, (catCount.get(cat) || 0) + 1);
    }
    for (const lang of safeParseJSON(row.languages, [])) {
      langCount.set(lang, (langCount.get(lang) || 0) + 1);
    }
  }

  const streamCounts = db.prepare(`
    SELECT
      COUNT(CASE WHEN EXISTS(SELECT 1 FROM streams s WHERE s.channel_id = c.id) THEN 1 END) as withStreams,
      COUNT(CASE WHEN NOT EXISTS(SELECT 1 FROM streams s WHERE s.channel_id = c.id) THEN 1 END) as withoutStreams,
      COUNT(*) as total
    FROM channels c
    WHERE c.closed IS NULL
  `).get() || { withStreams: 0, withoutStreams: 0, total: 0 };

  const toSortedCategories = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value,
        label: categoryMap.get(value) || (value.charAt(0).toUpperCase() + value.slice(1)),
        count
      }));

  const toSortedLanguages = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value,
        label: value.toUpperCase(),
        count
      }));

  res.json({
    categories: toSortedCategories(catCount),
    countries:  countryRows.map((r) => ({
      value: r.country,
      label: r.name ? `${r.name}` : r.country,
      flag: r.flag || '🌐',
      count: r.count
    })),
    languages:  toSortedLanguages(langCount),
    streams: {
      total: streamCounts.total || 0,
      withStreams: streamCounts.withStreams || 0,
      withoutStreams: streamCounts.withoutStreams || 0,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/channels/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const channel = db.prepare(`
    SELECT c.*, CASE WHEN f.channel_id IS NOT NULL THEN 1 ELSE 0 END AS isFavorite
    FROM channels c
    LEFT JOIN favorites f ON f.channel_id = c.id
    WHERE c.id = ?
  `).get(id);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const streams = db.prepare(`
    SELECT * FROM streams WHERE channel_id = ? ORDER BY status ASC
  `).all(id);

  res.json({ ...parseChannel(channel), streams });
});

module.exports = router;

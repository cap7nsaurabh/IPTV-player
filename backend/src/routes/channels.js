'use strict';

const express = require('express');
const db = require('../db/db');
const { GENRE_MAP } = require('../services/m3uParser');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: parse JSON fields that are stored as strings in SQLite
// ---------------------------------------------------------------------------
function parseChannel(ch) {
  if (!ch) return null;
  const rawSources = safeParseJSON(ch.sources, []);
  const sources = (Array.isArray(rawSources) ? rawSources : []).filter(Boolean);

  return {
    ...ch,
    alt_names:   safeParseJSON(ch.alt_names,  []),
    categories:  safeParseJSON(ch.categories, []),
    languages:   safeParseJSON(ch.languages,  []),
    sources,
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
// Query params: search, country, category, language, source, page, limit, favoritesOnly, hasStreams
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const {
    search,
    country,
    category,
    language,
    source,
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

  if (source) {
    conditions.push("EXISTS (SELECT 1 FROM streams s WHERE s.channel_id = c.id AND s.source = ?)");
    params.push(source);
  }

  if (hasStreams === 'true' || hasStreams === '1') {
    conditions.push("EXISTS (SELECT 1 FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1)");
  } else if (hasStreams === 'false' || hasStreams === '0') {
    conditions.push("NOT EXISTS (SELECT 1 FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1)");
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
           (SELECT COUNT(*) FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1) AS streamCount,
           (SELECT json_group_array(DISTINCT s.source) FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1) AS sources
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
// Helper: build WHERE clause for faceted filter counts
// ---------------------------------------------------------------------------
function buildFacetConditions(query = {}, excludeField = null) {
  const {
    search,
    country,
    category,
    language,
    source,
    hasStreams,
    favoritesOnly,
  } = query;

  const conditions = ['c.closed IS NULL'];
  const params = [];

  if (search && excludeField !== 'search') {
    conditions.push("(c.name LIKE ? OR c.alt_names LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (country && excludeField !== 'country') {
    conditions.push('c.country = ?');
    params.push(country);
  }

  if (category && excludeField !== 'category') {
    conditions.push("c.categories LIKE ?");
    params.push(`%"${category}"%`);
  }

  if (language && excludeField !== 'language') {
    conditions.push("c.languages LIKE ?");
    params.push(`%"${language}"%`);
  }

  if (source && excludeField !== 'source') {
    conditions.push("EXISTS (SELECT 1 FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND s.source = ? AND src.enabled = 1)");
    params.push(source);
  }

  if (hasStreams === 'true' || hasStreams === '1') {
    if (excludeField !== 'hasStreams') {
      conditions.push("EXISTS (SELECT 1 FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1)");
    }
  } else if (hasStreams === 'false' || hasStreams === '0') {
    if (excludeField !== 'hasStreams') {
      conditions.push("NOT EXISTS (SELECT 1 FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1)");
    }
  }

  const joinFav = favoritesOnly === 'true' && excludeField !== 'favorites'
    ? 'INNER JOIN favorites f ON f.channel_id = c.id'
    : '';

  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    joinFav,
    params,
  };
}

// ---------------------------------------------------------------------------
// GET /api/channels/filters
// Dynamically computes faceted facet counts matching the active query
// ---------------------------------------------------------------------------
router.get('/filters', (req, res) => {
  const query = req.query || {};

  // 1. Countries facet
  const countryCond = buildFacetConditions(query, 'country');
  const countryRows = db.prepare(`
    SELECT c.country, count(*) as count, co.name, co.flag
    FROM channels c
    LEFT JOIN countries co ON co.code = c.country
    ${countryCond.joinFav}
    ${countryCond.where} AND c.country IS NOT NULL AND c.country != ''
    GROUP BY c.country
    ORDER BY count DESC
  `).all(...countryCond.params);

  // 2. Sources facet
  const sourceCond = buildFacetConditions(query, 'source');
  const sourceCounts = new Map(
    db.prepare(`
      SELECT s2.source as id, COUNT(DISTINCT s2.channel_id) as count
      FROM streams s2
      JOIN channels c ON c.id = s2.channel_id
      ${sourceCond.joinFav}
      ${sourceCond.where}
      GROUP BY s2.source
    `).all(...sourceCond.params).map(r => [r.id, r.count])
  );

  const allSources = db.prepare('SELECT id as value, name as label, enabled FROM sources').all();
  const sourceRows = allSources
    .map(s => ({
      ...s,
      enabled: Boolean(s.enabled),
      count: sourceCounts.get(s.value) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Categories facet
  const categoryRows = db.prepare(`SELECT id, name FROM categories`).all();
  const categoryMap = new Map(categoryRows.map(c => [c.id, c.name]));

  const catCond = buildFacetConditions(query, 'category');
  const catRows = db.prepare(`
    SELECT c.categories FROM channels c
    ${catCond.joinFav}
    ${catCond.where} AND c.categories != '[]'
  `).all(...catCond.params);

  const catCount = new Map();
  for (const row of catRows) {
    for (const cat of safeParseJSON(row.categories, [])) {
      if (cat && GENRE_MAP[cat.toLowerCase()]) {
        const normalized = GENRE_MAP[cat.toLowerCase()];
        catCount.set(normalized, (catCount.get(normalized) || 0) + 1);
      }
    }
  }

  // 4. Languages facet
  const langCond = buildFacetConditions(query, 'language');
  const langRows = db.prepare(`
    SELECT c.languages FROM channels c
    ${langCond.joinFav}
    ${langCond.where} AND c.languages != '[]'
  `).all(...langCond.params);

  const langCount = new Map();
  for (const row of langRows) {
    for (const lang of safeParseJSON(row.languages, [])) {
      if (lang) {
        langCount.set(lang, (langCount.get(lang) || 0) + 1);
      }
    }
  }

  // 5. Streams count facet
  const streamCond = buildFacetConditions(query, 'hasStreams');
  const streamCounts = db.prepare(`
    SELECT
      COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM streams s
        JOIN sources src ON src.id = s.source
        WHERE s.channel_id = c.id AND src.enabled = 1
      ) THEN 1 END) as withStreams,
      COUNT(CASE WHEN NOT EXISTS(
        SELECT 1 FROM streams s
        JOIN sources src ON src.id = s.source
        WHERE s.channel_id = c.id AND src.enabled = 1
      ) THEN 1 END) as withoutStreams,
      COUNT(*) as total
    FROM channels c
    ${streamCond.joinFav}
    ${streamCond.where}
  `).get(...streamCond.params) || { withStreams: 0, withoutStreams: 0, total: 0 };

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
    sources:    sourceRows.map(s => ({ ...s, enabled: Boolean(s.enabled) })),
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
    SELECT c.*,
           CASE WHEN f.channel_id IS NOT NULL THEN 1 ELSE 0 END AS isFavorite,
           (SELECT json_group_array(DISTINCT s.source) FROM streams s JOIN sources src ON src.id = s.source WHERE s.channel_id = c.id AND src.enabled = 1) AS sources
    FROM channels c
    LEFT JOIN favorites f ON f.channel_id = c.id
    WHERE c.id = ?
  `).get(id);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const streams = db.prepare(`
    SELECT s.*, src.name as source_name, src.enabled as source_enabled
    FROM streams s
    JOIN sources src ON src.id = s.source
    WHERE s.channel_id = ? AND src.enabled = 1
    ORDER BY s.status ASC, s.id ASC
  `).all(id);

  res.json({ ...parseChannel(channel), streams });
});

module.exports = router;

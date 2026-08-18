'use strict';

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../db/db');
const { parseM3U, slugify, GENRE_MAP } = require('./m3uParser');

const DATA_DIR = process.env.DATA_DIR || './data';
const LOGOS_DIR = path.join(DATA_DIR, 'logos');

// Ensure logos directory exists at module load time
fs.mkdirSync(LOGOS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------
const insertSyncLog = db.prepare(`
  INSERT INTO sync_log (source_id, started_at, status)
  VALUES (@source_id, @started_at, 'running')
`);

const updateSyncLogDone = db.prepare(`
  UPDATE sync_log
  SET finished_at = @finished_at,
      channels_synced = @channels_synced,
      streams_synced  = @streams_synced,
      status          = 'done'
  WHERE id = @id
`);

const updateSyncLogError = db.prepare(`
  UPDATE sync_log
  SET finished_at = @finished_at,
      status      = 'error',
      error       = @error
  WHERE id = @id
`);

const upsertChannel = db.prepare(`
  INSERT INTO channels
    (id, name, alt_names, country, categories, languages, logo, logo_cached,
     website, is_nsfw, network, launched, closed, last_synced)
  VALUES
    (@id, @name, @alt_names, @country, @categories, @languages, @logo,
     COALESCE((SELECT logo_cached FROM channels WHERE id = @id), 0),
     @website, @is_nsfw, @network, @launched, @closed, @last_synced)
  ON CONFLICT(id) DO UPDATE SET
    name = COALESCE(excluded.name, channels.name),
    alt_names = CASE WHEN excluded.alt_names != '[]' THEN excluded.alt_names ELSE channels.alt_names END,
    country = COALESCE(excluded.country, channels.country),
    categories = excluded.categories,
    languages = CASE WHEN excluded.languages != '[]' THEN excluded.languages ELSE channels.languages END,
    logo = COALESCE(channels.logo, excluded.logo),
    network = COALESCE(excluded.network, channels.network),
    last_synced = excluded.last_synced
`);

const deleteStreamsForSource = db.prepare(`
  DELETE FROM streams WHERE source = ?
`);

const insertStream = db.prepare(`
  INSERT INTO streams (channel_id, url, http_referrer, user_agent, source, status, last_synced)
  VALUES (@channel_id, @url, @http_referrer, @user_agent, @source, 'unknown', @last_synced)
`);

const updateSourceStats = db.prepare(`
  UPDATE sources
  SET channel_count = @channel_count,
      stream_count  = @stream_count,
      last_synced   = @last_synced
  WHERE id = @id
`);

const getLastSyncStmt = db.prepare(`
  SELECT * FROM sync_log ORDER BY id DESC LIMIT 1
`);

const getUncachedLogos = db.prepare(`
  SELECT id, logo FROM channels
  WHERE logo IS NOT NULL
    AND logo != ''
    AND logo_cached = 0
    AND closed IS NULL
  LIMIT ?
`);

const markLogoCached = db.prepare(`
  UPDATE channels SET logo_cached = 1 WHERE id = ?
`);

const upsertCountry = db.prepare(`
  INSERT OR REPLACE INTO countries (code, name, languages, flag)
  VALUES (@code, @name, @languages, @flag)
`);

const upsertCategory = db.prepare(`
  INSERT OR REPLACE INTO categories (id, name)
  VALUES (@id, @name)
`);

// ---------------------------------------------------------------------------
// Source Management Methods
// ---------------------------------------------------------------------------

function getSources() {
  const rows = db.prepare(`
    SELECT s.*,
           (SELECT COUNT(DISTINCT channel_id) FROM streams WHERE source = s.id) as live_channels,
           (SELECT COUNT(*) FROM streams WHERE source = s.id) as live_streams
    FROM sources s
    ORDER BY s.created_at ASC
  `).all();

  return rows.map(r => ({
    ...r,
    enabled: Boolean(r.enabled),
    auto_sync: Boolean(r.auto_sync),
  }));
}

function getSource(id) {
  const row = db.prepare(`
    SELECT s.*,
           (SELECT COUNT(DISTINCT channel_id) FROM streams WHERE source = s.id) as live_channels,
           (SELECT COUNT(*) FROM streams WHERE source = s.id) as live_streams
    FROM sources s
    WHERE s.id = ?
  `).get(id);

  if (!row) return null;
  return {
    ...row,
    enabled: Boolean(row.enabled),
    auto_sync: Boolean(row.auto_sync),
  };
}

function addSource({ id, name, type = 'm3u', url, enabled = 1, auto_sync = 1 }) {
  if (!name || !url) {
    throw new Error('Source name and URL are required');
  }

  const cleanUrl = url.trim();
  const cleanName = name.trim();
  const sourceId = id || slugify(cleanName) + '-' + Date.now().toString(36);

  const existing = db.prepare('SELECT id FROM sources WHERE id = ?').get(sourceId);
  if (existing) {
    throw new Error(`Source with ID "${sourceId}" already exists.`);
  }

  db.prepare(`
    INSERT INTO sources (id, name, type, url, enabled, auto_sync, created_at)
    VALUES (@id, @name, @type, @url, @enabled, @auto_sync, @created_at)
  `).run({
    id: sourceId,
    name: cleanName,
    type,
    url: cleanUrl,
    enabled: enabled ? 1 : 0,
    auto_sync: auto_sync ? 1 : 0,
    created_at: Date.now(),
  });

  return getSource(sourceId);
}

function updateSource(id, { name, url, enabled, auto_sync }) {
  const current = getSource(id);
  if (!current) {
    throw new Error(`Source "${id}" not found.`);
  }

  db.prepare(`
    UPDATE sources
    SET name = COALESCE(@name, name),
        url = COALESCE(@url, url),
        enabled = COALESCE(@enabled, enabled),
        auto_sync = COALESCE(@auto_sync, auto_sync)
    WHERE id = @id
  `).run({
    id,
    name: name !== undefined ? name.trim() : null,
    url: url !== undefined ? url.trim() : null,
    enabled: enabled !== undefined ? (enabled ? 1 : 0) : null,
    auto_sync: auto_sync !== undefined ? (auto_sync ? 1 : 0) : null,
  });

  return getSource(id);
}

function deleteSource(id, cleanStreams = true) {
  const current = getSource(id);
  if (!current) {
    throw new Error(`Source "${id}" not found.`);
  }

  db.prepare('DELETE FROM sources WHERE id = ?').run(id);

  if (cleanStreams) {
    deleteStreamsForSource.run(id);
    // Clean orphan channels with no streams and no favorites
    db.prepare(`
      DELETE FROM channels
      WHERE id NOT IN (SELECT DISTINCT channel_id FROM streams)
        AND id NOT IN (SELECT channel_id FROM favorites)
    `).run();
  }

  return { success: true, deletedId: id };
}

// ---------------------------------------------------------------------------
// Ingest / Sync Methods
// ---------------------------------------------------------------------------

/**
 * Syncs IPTV-org API official catalog.
 */
async function syncIptvOrg(sourceId = 'iptv-org') {
  const logEntry = insertSyncLog.run({ source_id: sourceId, started_at: Date.now() });
  const logId = logEntry.lastInsertRowid;

  try {
    console.log(`[sync:${sourceId}] Fetching iptv-org catalogs...`);
    const [channelsRes, streamsRes, countriesRes, categoriesRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/channels.json'),
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/countries.json').catch(() => null),
      fetch('https://iptv-org.github.io/api/categories.json').catch(() => null),
    ]);

    if (!channelsRes.ok) throw new Error(`channels.json fetch failed: ${channelsRes.status}`);
    if (!streamsRes.ok) throw new Error(`streams.json fetch failed: ${streamsRes.status}`);

    const channels = await channelsRes.json();
    const streams  = await streamsRes.json();
    const countries = countriesRes && countriesRes.ok ? await countriesRes.json() : [];
    const categories = categoriesRes && categoriesRes.ok ? await categoriesRes.json() : [];

    const knownChannelIds = new Set(channels.map((c) => c.id).filter(Boolean));
    const now = Date.now();

    const runTransaction = db.transaction(() => {
      let channelsSynced = 0;
      let countriesSynced = 0;
      let categoriesSynced = 0;

      for (const ch of channels) {
        upsertChannel.run({
          id:          ch.id,
          name:        ch.name,
          alt_names:   JSON.stringify(ch.alt_names   || []),
          country:     ch.country    || null,
          categories:  JSON.stringify(ch.categories  || []),
          languages:   JSON.stringify(ch.languages   || []),
          logo:        ch.logo       || null,
          website:     ch.website    || null,
          is_nsfw:     ch.is_nsfw    ? 1 : 0,
          network:     ch.network    || null,
          launched:    ch.launched   || null,
          closed:      ch.closed     || null,
          last_synced: now,
        });
        channelsSynced++;
      }

      for (const country of countries) {
        if (country.code && country.name) {
          upsertCountry.run({
            code: country.code,
            name: country.name,
            languages: JSON.stringify(country.languages || []),
            flag: country.flag || null,
          });
          countriesSynced++;
        }
      }

      for (const cat of categories) {
        if (cat.id && cat.name) {
          upsertCategory.run({
            id: cat.id,
            name: cat.name,
          });
          categoriesSynced++;
        }
      }

      // Delete existing streams only for this source
      deleteStreamsForSource.run(sourceId);

      let streamsSynced = 0;
      for (const s of streams) {
        if (!s.channel || !knownChannelIds.has(s.channel)) continue;
        insertStream.run({
          channel_id:   s.channel,
          url:          s.url,
          http_referrer: s.http_referrer || null,
          user_agent:    s.user_agent    || null,
          source:        sourceId,
          last_synced:   now,
        });
        streamsSynced++;
      }

      updateSourceStats.run({
        id: sourceId,
        channel_count: channelsSynced,
        stream_count: streamsSynced,
        last_synced: now,
      });

      return { channelsSynced, streamsSynced, countriesSynced, categoriesSynced };
    });

    const result = runTransaction();

    updateSyncLogDone.run({
      id:              logId,
      finished_at:     Date.now(),
      channels_synced: result.channelsSynced,
      streams_synced:  result.streamsSynced,
    });

    console.log(`[sync:${sourceId}] Complete: ${result.channelsSynced} channels, ${result.streamsSynced} streams.`);
    return result;
  } catch (err) {
    console.error(`[sync:${sourceId}] Error:`, err.message);
    updateSyncLogError.run({
      id:          logId,
      finished_at: Date.now(),
      error:       err.message,
    });
    throw err;
  }
}

/**
 * Ingests an M3U playlist (from URL or raw content) and updates local database.
 */
async function syncM3uSource(sourceId, m3uUrlOrContent, sourceName, isRawContent = false) {
  const logEntry = insertSyncLog.run({ source_id: sourceId, started_at: Date.now() });
  const logId = logEntry.lastInsertRowid;

  try {
    let m3uText = '';
    if (isRawContent) {
      m3uText = m3uUrlOrContent;
    } else {
      console.log(`[sync:${sourceId}] Downloading M3U from ${m3uUrlOrContent} ...`);
      const res = await fetch(m3uUrlOrContent, {
        headers: {
          'User-Agent': 'IPTV-Browser/1.0 (https://github.com/cap7nsaurabh/IPTV-player)'
        },
        timeout: 45000,
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch M3U (${res.status} ${res.statusText})`);
      }
      m3uText = await res.text();
    }

    console.log(`[sync:${sourceId}] Parsing M3U content (${m3uText.length} bytes)...`);
    const entries = parseM3U(m3uText, sourceId);
    console.log(`[sync:${sourceId}] Extracted ${entries.length} valid channel/stream entries.`);

    if (entries.length === 0) {
      throw new Error('No valid channel entries found in M3U content.');
    }

    const now = Date.now();
    const categoriesSeen = new Set();

    const runTransaction = db.transaction(() => {
      // Clear previous streams for this source
      deleteStreamsForSource.run(sourceId);

      const channelMap = new Map();
      let streamsSynced = 0;

      for (const entry of entries) {
        const { channel, stream } = entry;

        if (!channelMap.has(channel.id)) {
          channelMap.set(channel.id, channel);
          upsertChannel.run({
            id:          channel.id,
            name:        channel.name,
            alt_names:   JSON.stringify(channel.alt_names || []),
            country:     channel.country || null,
            categories:  JSON.stringify(channel.categories || []),
            languages:   JSON.stringify(channel.languages || []),
            logo:        channel.logo || null,
            website:     channel.website || null,
            is_nsfw:     channel.is_nsfw ? 1 : 0,
            network:     channel.network || null,
            launched:    channel.launched || null,
            closed:      channel.closed || null,
            last_synced: now,
          });
        }

        // Keep track of categories (only valid genres)
        if (Array.isArray(channel.categories)) {
          for (const cat of channel.categories) {
            const normalized = cat ? GENRE_MAP[cat.toLowerCase()] : null;
            if (normalized && !categoriesSeen.has(normalized)) {
              categoriesSeen.add(normalized);
              upsertCategory.run({
                id: normalized,
                name: normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, ' '),
              });
            }
          }
        }

        // Insert stream
        insertStream.run({
          channel_id:   channel.id,
          url:          stream.url,
          http_referrer: stream.http_referrer || null,
          user_agent:    stream.user_agent || null,
          source:        sourceId,
          last_synced:   now,
        });
        streamsSynced++;
      }

      const channelsSynced = channelMap.size;

      // Update source stats
      updateSourceStats.run({
        id: sourceId,
        channel_count: channelsSynced,
        stream_count: streamsSynced,
        last_synced: now,
      });

      return { channelsSynced, streamsSynced, categoriesSynced: categoriesSeen.size };
    });

    const result = runTransaction();

    updateSyncLogDone.run({
      id:              logId,
      finished_at:     Date.now(),
      channels_synced: result.channelsSynced,
      streams_synced:  result.streamsSynced,
    });

    console.log(`[sync:${sourceId}] Complete: ${result.channelsSynced} channels, ${result.streamsSynced} streams.`);
    return result;
  } catch (err) {
    console.error(`[sync:${sourceId}] Error:`, err.message);
    updateSyncLogError.run({
      id:          logId,
      finished_at: Date.now(),
      error:       err.message,
    });
    throw err;
  }
}

/**
 * Dispatches sync for a specific source based on its type.
 */
async function syncSource(sourceId) {
  const source = getSource(sourceId);
  if (!source) {
    throw new Error(`Source with ID "${sourceId}" does not exist.`);
  }

  if (source.type === 'iptv-org') {
    return syncIptvOrg(source.id);
  } else if (source.type === 'm3u') {
    return syncM3uSource(source.id, source.url, source.name);
  } else {
    throw new Error(`Unsupported source type: ${source.type}`);
  }
}

/**
 * Ingests direct M3U raw text or uploaded content as a named source.
 */
async function importDirectM3u({ name, content, sourceId }) {
  if (!content) {
    throw new Error('M3U content is required.');
  }

  const finalName = name?.trim() || 'Custom M3U Direct Import';
  const finalId = sourceId || slugify(finalName) + '-' + Date.now().toString(36);

  let existing = getSource(finalId);
  if (!existing) {
    existing = addSource({
      id: finalId,
      name: finalName,
      type: 'm3u',
      url: 'direct://content',
      enabled: 1,
      auto_sync: 0,
    });
  }

  const result = await syncM3uSource(finalId, content, finalName, true);
  return { ...result, source: getSource(finalId) };
}

/**
 * Syncs all enabled catalog sources.
 */
async function syncAllSources() {
  const sources = db.prepare('SELECT * FROM sources WHERE enabled = 1').all();
  console.log(`[sync] Syncing all ${sources.length} enabled sources...`);

  let totalChannels = 0;
  let totalStreams = 0;
  const results = [];

  for (const src of sources) {
    try {
      let res;
      if (src.type === 'iptv-org') {
        res = await syncIptvOrg(src.id);
      } else if (src.type === 'm3u') {
        res = await syncM3uSource(src.id, src.url, src.name);
      }
      if (res) {
        totalChannels += res.channelsSynced || 0;
        totalStreams += res.streamsSynced || 0;
        results.push({ id: src.id, name: src.name, status: 'ok', ...res });
      }
    } catch (err) {
      console.error(`[sync] Failed syncing source ${src.id}:`, err.message);
      results.push({ id: src.id, name: src.name, status: 'error', error: err.message });
    }
  }

  return {
    channelsSynced: totalChannels,
    streamsSynced: totalStreams,
    sourcesSynced: results.length,
    details: results,
  };
}

// Backward compatibility alias
const syncCatalogs = syncAllSources;

// ---------------------------------------------------------------------------
// Stats & History
// ---------------------------------------------------------------------------

function getLastSync() {
  return getLastSyncStmt.get() || null;
}

function getSyncHistory(limit = 10) {
  return db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT ?').all(limit);
}

function getDbStats() {
  const channelCount = db.prepare('SELECT COUNT(*) as count FROM channels WHERE closed IS NULL').get()?.count || 0;
  const totalChannels = db.prepare('SELECT COUNT(*) as count FROM channels').get()?.count || 0;
  const streamCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM streams s
    JOIN sources src ON src.id = s.source
    WHERE src.enabled = 1
  `).get()?.count || 0;
  const totalStreams = db.prepare('SELECT COUNT(*) as count FROM streams').get()?.count || 0;
  const cachedLogos = db.prepare('SELECT COUNT(*) as count FROM channels WHERE logo_cached = 1').get()?.count || 0;
  const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get()?.count || 0;
  const epgProgramsCount = db.prepare('SELECT COUNT(*) as count FROM epg_programs').get()?.count || 0;
  const countriesCount = db.prepare('SELECT COUNT(*) as count FROM countries').get()?.count || 0;
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get()?.count || 0;
  const sourcesCount = db.prepare('SELECT COUNT(*) as count FROM sources').get()?.count || 0;

  return {
    activeChannels: channelCount,
    totalChannels,
    streams: streamCount,
    totalStreams,
    cachedLogos,
    favorites: favoritesCount,
    epgPrograms: epgProgramsCount,
    countries: countriesCount,
    categories: categoriesCount,
    sources: sourcesCount,
  };
}

// ---------------------------------------------------------------------------
// Logo Caching
// ---------------------------------------------------------------------------

async function cacheLogos(limit = 20) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const rows = getUncachedLogos.all(Math.min(limit, 30));
  if (rows.length === 0) return 0;

  let cached = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ id: channelId, logo }) => {
        try {
          const res = await fetch(logo, { timeout: 2500 });
          if (!res.ok) return;

          const buffer = await res.buffer();
          const destPath = path.join(LOGOS_DIR, `${channelId}.jpg`);

          await sharp(buffer)
            .resize(120, 120, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .jpeg({ quality: 85 })
            .toFile(destPath);

          markLogoCached.run(channelId);
          cached++;
        } catch (_err) {
          // Non-critical skip
        }
      })
    );
  }

  return cached;
}

function cleanupStaleCategories() {
  try {
    const rows = db.prepare('SELECT id, categories FROM channels WHERE categories != \'[]\'').all();
    const updateCat = db.prepare('UPDATE channels SET categories = ? WHERE id = ?');
    const dbTransaction = db.transaction(() => {
      for (const row of rows) {
        let current = [];
        try { current = JSON.parse(row.categories || '[]'); } catch (_e) { current = []; }
        const cleaned = current.filter(c => c && GENRE_MAP[c.toLowerCase()]).map(c => GENRE_MAP[c.toLowerCase()]);
        if (cleaned.length !== current.length) {
          updateCat.run(JSON.stringify(cleaned), row.id);
        }
      }
    });
    dbTransaction();

    const validGenreIds = Object.values(GENRE_MAP).map(g => `'${g}'`).join(',');
    db.exec(`DELETE FROM categories WHERE id NOT IN (${validGenreIds})`);
  } catch (err) {
    console.warn('[sync] Warning cleaning stale categories:', err.message);
  }
}

module.exports = {
  syncCatalogs,
  syncAllSources,
  syncSource,
  syncIptvOrg,
  syncM3uSource,
  importDirectM3u,
  cleanupStaleCategories,
  getSources,
  getSource,
  addSource,
  updateSource,
  deleteSource,
  getLastSync,
  getSyncHistory,
  getDbStats,
  cacheLogos,
};


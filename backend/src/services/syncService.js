'use strict';

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../db/db');

const DATA_DIR = process.env.DATA_DIR || './data';
const LOGOS_DIR = path.join(DATA_DIR, 'logos');

// Ensure logos directory exists at module load time
fs.mkdirSync(LOGOS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------
const insertSyncLog = db.prepare(`
  INSERT INTO sync_log (started_at, status)
  VALUES (@started_at, 'running')
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
  INSERT OR REPLACE INTO channels
    (id, name, alt_names, country, categories, languages, logo, logo_cached,
     website, is_nsfw, network, launched, closed, last_synced)
  VALUES
    (@id, @name, @alt_names, @country, @categories, @languages, @logo,
     COALESCE((SELECT logo_cached FROM channels WHERE id = @id), 0),
     @website, @is_nsfw, @network, @launched, @closed, @last_synced)
`);

const deleteStreamsForChannel = db.prepare(`
  DELETE FROM streams WHERE channel_id = ?
`);

const insertStream = db.prepare(`
  INSERT INTO streams (channel_id, url, http_referrer, user_agent, status, last_synced)
  VALUES (@channel_id, @url, @http_referrer, @user_agent, 'unknown', @last_synced)
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
// syncCatalogs
// ---------------------------------------------------------------------------

/**
 * Fetches the iptv-org channel, stream, country, and category catalogs and upserts them into
 * the local SQLite database.
 *
 * @returns {{ channelsSynced: number, streamsSynced: number, countriesSynced: number, categoriesSynced: number }}
 */
async function syncCatalogs() {
  const logEntry = insertSyncLog.run({ started_at: Date.now() });
  const logId = logEntry.lastInsertRowid;

  try {
    console.log('[sync] Fetching channels, streams, countries, and categories catalogs …');
    const [channelsRes, streamsRes, countriesRes, categoriesRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/channels.json'),
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/countries.json').catch(() => null),
      fetch('https://iptv-org.github.io/api/categories.json').catch(() => null),
    ]);

    if (!channelsRes.ok) {
      throw new Error(`channels.json fetch failed: ${channelsRes.status}`);
    }
    if (!streamsRes.ok) {
      throw new Error(`streams.json fetch failed: ${streamsRes.status}`);
    }

    const channels = await channelsRes.json();
    const streams  = await streamsRes.json();
    const countries = countriesRes && countriesRes.ok ? await countriesRes.json() : [];
    const categories = categoriesRes && categoriesRes.ok ? await categoriesRes.json() : [];

    console.log(`[sync] Downloaded ${channels.length} channels, ${streams.length} streams, ${countries.length} countries, ${categories.length} categories.`);

    // Build a set of known channel IDs
    const knownChannelIds = new Set(channels.map((c) => c.id).filter(Boolean));

    // Build a set of channel IDs present in the streams data so we know
    // which streams need to be replaced.
    const channelIdsInStreams = new Set(
      streams.map((s) => s.channel).filter((cid) => cid && knownChannelIds.has(cid))
    );

    const now = Date.now();

    // -----------------------------------------------------------------------
    // Upsert inside a single transaction for performance
    // -----------------------------------------------------------------------
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

      // Delete existing streams only for channels present in the new data
      for (const cid of channelIdsInStreams) {
        deleteStreamsForChannel.run(cid);
      }

      let streamsSynced = 0;
      for (const s of streams) {
        if (!s.channel || !knownChannelIds.has(s.channel)) continue;
        insertStream.run({
          channel_id:   s.channel,
          url:          s.url,
          http_referrer: s.http_referrer || null,
          user_agent:    s.user_agent    || null,
          last_synced:   now,
        });
        streamsSynced++;
      }

      return { channelsSynced, streamsSynced, countriesSynced, categoriesSynced };
    });

    const { channelsSynced, streamsSynced, countriesSynced, categoriesSynced } = runTransaction();

    updateSyncLogDone.run({
      id:              logId,
      finished_at:     Date.now(),
      channels_synced: channelsSynced,
      streams_synced:  streamsSynced,
    });

    console.log(`[sync] Done — ${channelsSynced} channels, ${streamsSynced} streams, ${countriesSynced} countries, ${categoriesSynced} categories.`);
    return { channelsSynced, streamsSynced, countriesSynced, categoriesSynced };
  } catch (err) {
    console.error('[sync] Error:', err.message);
    updateSyncLogError.run({
      id:          logId,
      finished_at: Date.now(),
      error:       err.message,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// getLastSync & getSyncHistory
// ---------------------------------------------------------------------------

/**
 * Returns the most recent entry from sync_log, or null if none exists.
 */
function getLastSync() {
  return getLastSyncStmt.get() || null;
}

function getSyncHistory(limit = 10) {
  return db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT ?').all(limit);
}

function getDbStats() {
  const channelCount = db.prepare('SELECT COUNT(*) as count FROM channels WHERE closed IS NULL').get()?.count || 0;
  const totalChannels = db.prepare('SELECT COUNT(*) as count FROM channels').get()?.count || 0;
  const streamCount = db.prepare('SELECT COUNT(*) as count FROM streams').get()?.count || 0;
  const cachedLogos = db.prepare('SELECT COUNT(*) as count FROM channels WHERE logo_cached = 1').get()?.count || 0;
  const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get()?.count || 0;
  const epgProgramsCount = db.prepare('SELECT COUNT(*) as count FROM epg_programs').get()?.count || 0;
  const countriesCount = db.prepare('SELECT COUNT(*) as count FROM countries').get()?.count || 0;
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get()?.count || 0;

  return {
    activeChannels: channelCount,
    totalChannels,
    streams: streamCount,
    cachedLogos,
    favorites: favoritesCount,
    epgPrograms: epgProgramsCount,
    countries: countriesCount,
    categories: categoriesCount,
  };
}

// ---------------------------------------------------------------------------
// cacheLogos
// ---------------------------------------------------------------------------

/**
 * Downloads and converts up to `limit` uncached channel logos to JPEG,
 * saving them under DATA_DIR/logos/<channelId>.jpg.
 *
 * Failures on individual logos are swallowed so the batch keeps going.
 *
 * @param {number} limit - Max number of logos to cache in this run.
 * @returns {Promise<number>} Number of logos successfully cached.
 */
async function cacheLogos(limit = 100) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const rows = getUncachedLogos.all(limit);
  console.log(`[logos] Caching ${rows.length} logos (limit=${limit}) …`);

  let cached = 0;

  for (const { id: channelId, logo } of rows) {
    try {
      const res = await fetch(logo, { timeout: 10000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.buffer();
      const destPath = path.join(LOGOS_DIR, `${channelId}.jpg`);

      await sharp(buffer)
        .resize(120, 120, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 85 })
        .toFile(destPath);

      markLogoCached.run(channelId);
      cached++;
    } catch (err) {
      // Non-fatal — skip this logo
      console.warn(`[logos] Skipped ${channelId}: ${err.message}`);
    }
  }

  console.log(`[logos] Cached ${cached} logos.`);
  return cached;
}

module.exports = { syncCatalogs, getLastSync, getSyncHistory, getDbStats, cacheLogos };

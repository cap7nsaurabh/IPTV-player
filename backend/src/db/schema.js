'use strict';

/**
 * Initialises the database schema — creates all tables and indexes
 * if they do not already exist. Safe to call on every startup.
 * @param {import('better-sqlite3').Database} [database]
 */
function initSchema(database) {
  const db = database || require('./db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      alt_names TEXT DEFAULT '[]',
      country TEXT,
      categories TEXT DEFAULT '[]',
      languages TEXT DEFAULT '[]',
      logo TEXT,
      logo_cached INTEGER DEFAULT 0,
      website TEXT,
      is_nsfw INTEGER DEFAULT 0,
      network TEXT,
      launched TEXT,
      closed TEXT,
      last_synced INTEGER
    );

    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      url TEXT NOT NULL,
      http_referrer TEXT,
      user_agent TEXT,
      source TEXT DEFAULT 'iptv-org',
      status TEXT DEFAULT 'unknown',
      last_checked INTEGER,
      last_synced INTEGER,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      languages TEXT DEFAULT '[]',
      flag TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL UNIQUE,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS epg_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      auto_sync INTEGER DEFAULT 1,
      channel_count INTEGER DEFAULT 0,
      stream_count INTEGER DEFAULT 0,
      last_synced INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT DEFAULT 'all',
      started_at INTEGER,
      finished_at INTEGER,
      channels_synced INTEGER DEFAULT 0,
      streams_synced INTEGER DEFAULT 0,
      logos_cached INTEGER DEFAULT 0,
      epg_synced INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error TEXT
    );
  `);

  // Migration helpers for existing databases
  const safeAlter = (sql) => {
    try {
      db.exec(sql);
    } catch (_e) {
      // Column already exists or table not ready
    }
  };

  safeAlter(`ALTER TABLE streams ADD COLUMN source TEXT DEFAULT 'iptv-org'`);
  safeAlter(`ALTER TABLE streams ADD COLUMN http_referrer TEXT`);
  safeAlter(`ALTER TABLE streams ADD COLUMN user_agent TEXT`);
  safeAlter(`ALTER TABLE streams ADD COLUMN last_checked INTEGER`);
  safeAlter(`ALTER TABLE streams ADD COLUMN last_synced INTEGER`);
  safeAlter(`ALTER TABLE sync_log ADD COLUMN source_id TEXT DEFAULT 'all'`);

  // Create indexes after migrations ensure columns exist
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country);
      CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
      CREATE INDEX IF NOT EXISTS idx_streams_channel ON streams(channel_id);
      CREATE INDEX IF NOT EXISTS idx_streams_source ON streams(source);
      CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON epg_programs(channel_id, start_time, end_time);
    `);
  } catch (err) {
    console.warn('[schema] Warning creating indexes:', err.message);
  }

  // Seed default sources if none exist
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM sources').get()?.c || 0;
    if (count === 0) {
      const insertSource = db.prepare(`
        INSERT INTO sources (id, name, type, url, enabled, auto_sync, created_at)
        VALUES (@id, @name, @type, @url, @enabled, @auto_sync, @created_at)
      `);

      const now = Date.now();
      insertSource.run({
        id: 'iptv-org',
        name: 'IPTV-org (Official)',
        type: 'iptv-org',
        url: 'https://iptv-org.github.io/api',
        enabled: 1,
        auto_sync: 1,
        created_at: now,
      });

      insertSource.run({
        id: 'world-ip-tv',
        name: 'World IPTV (Romaxa55 Auto-Verified)',
        type: 'm3u',
        url: 'https://romaxa55.github.io/world_ip_tv/output/index.m3u',
        enabled: 1,
        auto_sync: 1,
        created_at: now,
      });
      console.log('[schema] Seeded default catalog sources (iptv-org, world-ip-tv).');
    }
  } catch (err) {
    console.warn('[schema] Warning seeding sources:', err.message);
  }

  // Clean stale non-genre categories from legacy database runs
  try {
    const { GENRE_MAP } = require('../services/m3uParser');
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
  } catch (_e) {}

  console.log('[schema] Database schema initialised.');
}

module.exports = { initSchema };


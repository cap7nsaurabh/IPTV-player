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

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at INTEGER,
      finished_at INTEGER,
      channels_synced INTEGER DEFAULT 0,
      streams_synced INTEGER DEFAULT 0,
      logos_cached INTEGER DEFAULT 0,
      epg_synced INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country);
    CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
    CREATE INDEX IF NOT EXISTS idx_streams_channel ON streams(channel_id);
    CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON epg_programs(channel_id, start_time, end_time);
  `);

  console.log('[schema] Database schema initialised.');
}

module.exports = { initSchema };

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./schema');

const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'iptv.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Initialize schema immediately so any module preparing SQL statements has all tables ready
initSchema(db);

module.exports = db;

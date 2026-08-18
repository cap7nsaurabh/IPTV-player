# 📺 IPTV Browser & Player — Master Offline Implementation Guide & iptv-org Reference

> **Notice to Offline LLM Agents:** This document is the **single, completely self-contained source of truth** for the IPTV Browser project. It contains exhaustive technical documentation on the `https://github.com/iptv-org/iptv` ecosystem, complete JSON schemas, M3U/XMLTV specifications, exact API response payloads, SQL schemas, architecture diagrams, step-by-step algorithms, and an actionable implementation checklist. You do **not** need internet access to understand any aspect of iptv-org or the target system.

---

## 📚 SECTION 1: Deep-Dive Reference for `iptv-org` Ecosystem

The [iptv-org](https://github.com/iptv-org) organization maintains the world's largest open-source collection of publicly available, legal free-to-air IPTV channels. The ecosystem is split across several interrelated repositories:

| Repository | Purpose & Output |
|---|---|
| [`iptv-org/iptv`](https://github.com/iptv-org/iptv) | Master playlist repository (~10,000+ legal streams). Generates `.m3u` playlists by category, country, and language. |
| [`iptv-org/api`](https://github.com/iptv-org/api) | Automated CI/CD pipeline that compiles static REST JSON API endpoints hosted on GitHub Pages (`https://iptv-org.github.io/api/*`). |
| [`iptv-org/database`](https://github.com/iptv-org/database) | Centralized identity data store containing channel broadcast owners, countries, categories, languages, and logos. |
| [`iptv-org/epg`](https://github.com/iptv-org/epg) | Multi-source scraper generating global XMLTV Electronic Program Guide data for thousands of channels. |

---

### 1.1 REST / JSON API Payloads & Exact Schemas

All static JSON API feeds are hosted under `https://iptv-org.github.io/api/`. Below are the exact schemas, data types, and sample payloads for each endpoint.

#### 1. `https://iptv-org.github.io/api/channels.json`
Contains metadata for all known channels (~30,000+ entries, including active, inactive, and historical).

**JSON Schema / TypeScript Interface:**
```typescript
interface ChannelRecord {
  id: string;              // Unique channel ID (format: "<Name>.<country-code>", e.g. "CNN.us", "BBCNews.uk", "AajTak.in")
  name: string;            // Display title of the channel (e.g. "CNN", "BBC News", "Aaj Tak")
  alt_names: string[];     // Array of alternative names / acronyms (e.g. ["CNN International", "CNN USA"])
  network: string | null;  // Broadcast network / parent company (e.g. "Warner Bros. Discovery", "BBC")
  owners: string[];        // Array of corporate owners
  country: string;         // ISO 3166-1 alpha-2 country code in uppercase (e.g. "US", "GB", "IN", "CA", "AU")
  subdivision: string | null; // ISO 3166-2 state/province code (e.g. "US-CA", "CA-ON")
  city: string | null;     // Broadcast city of origin (e.g. "Atlanta", "London")
  broadcast_area: string[];// Array of area identifiers (e.g. ["c/US", "r/NAM"])
  languages: string[];     // Array of ISO 639-3 3-letter language codes (e.g. ["eng"], ["hin"], ["spa"], ["fra"])
  categories: string[];    // Array of canonical category slugs (e.g. ["news"], ["sports"], ["entertainment"])
  is_nsfw: boolean;        // true if channel contains adult/18+ content, false otherwise
  launched: string | null; // Launch date string (YYYY-MM-DD or YYYY)
  closed: string | null;   // Closure date string if channel is defunct (e.g. "2022-04-30"). If active, this is NULL!
  replaced_by: string | null; // ID of successor channel if closed
  website: string | null;  // Official website URL
  logo: string | null;     // Direct URL to channel logo image (PNG/SVG/JPG)
}
```

**Real Sample Payload (`channels.json`):**
```json
[
  {
    "id": "BBCNews.uk",
    "name": "BBC News",
    "alt_names": ["BBC News Channel", "BBC World News"],
    "network": "BBC",
    "owners": ["British Broadcasting Corporation"],
    "country": "GB",
    "subdivision": null,
    "city": "London",
    "broadcast_area": ["c/GB", "r/EUR"],
    "languages": ["eng"],
    "categories": ["news"],
    "is_nsfw": false,
    "launched": "1997-11-09",
    "closed": null,
    "replaced_by": null,
    "website": "https://www.bbc.co.uk/news",
    "logo": "https://i.imgur.com/7YjXUpm.png"
  },
  {
    "id": "AajTak.in",
    "name": "Aaj Tak",
    "alt_names": ["Aaj Tak HD"],
    "network": "TV Today Network",
    "owners": ["Living Media India Limited"],
    "country": "IN",
    "subdivision": "IN-DL",
    "city": "Noida",
    "broadcast_area": ["c/IN", "r/SAS"],
    "languages": ["hin"],
    "categories": ["news"],
    "is_nsfw": false,
    "launched": "2000-12-31",
    "closed": null,
    "replaced_by": null,
    "website": "https://www.aajtak.in",
    "logo": "https://i.imgur.com/abcdef.png"
  }
]
```

---

#### 2. `https://iptv-org.github.io/api/streams.json`
Contains all active stream URLs mapped to their channel ID.

**JSON Schema / TypeScript Interface:**
```typescript
interface StreamRecord {
  channel: string;         // Foreign key matching ChannelRecord.id (e.g. "BBCNews.uk")
  url: string;             // Direct playback URL (typically .m3u8, .mpd, or direct transport stream)
  timeshift: string | null;// Timeshift offset if stream is delayed
  http_referrer: string | null; // Referer HTTP header required to bypass upstream hotlink blocks
  user_agent: string | null;    // Custom User-Agent header required by the upstream server
}
```

**Real Sample Payload (`streams.json`):**
```json
[
  {
    "channel": "BBCNews.uk",
    "url": "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8",
    "timeshift": null,
    "http_referrer": "https://www.bbc.com/",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  },
  {
    "channel": "AajTak.in",
    "url": "https://aajtaklive-amd.akamaized.net/hls/live/2014416/aajtak/aajtaklive/master.m3u8",
    "timeshift": null,
    "http_referrer": "https://www.aajtak.in/",
    "user_agent": null
  }
]
```

---

#### 3. `https://iptv-org.github.io/api/countries.json`
Contains official ISO country definitions with full names and flag emojis.

**JSON Schema / TypeScript Interface:**
```typescript
interface CountryRecord {
  name: string;        // Full English name (e.g. "United States", "India", "United Kingdom")
  code: string;        // 2-letter uppercase ISO 3166-1 alpha-2 code (e.g. "US", "IN", "GB")
  languages: string[]; // Official 3-letter language codes in that country (e.g. ["eng"], ["hin", "eng"])
  flag: string;        // Unicode flag emoji (e.g. "🇺🇸", "🇮🇳", "🇬🇧")
}
```

**Real Sample Payload (`countries.json`):**
```json
[
  {
    "name": "United States",
    "code": "US",
    "languages": ["eng"],
    "flag": "🇺🇸"
  },
  {
    "name": "India",
    "code": "IN",
    "languages": ["hin", "eng"],
    "flag": "🇮🇳"
  },
  {
    "name": "United Kingdom",
    "code": "GB",
    "languages": ["eng"],
    "flag": "🇬🇧"
  }
]
```

---

#### 4. `https://iptv-org.github.io/api/categories.json`
Contains canonical category identifiers and display labels.

**Real Sample Payload (`categories.json`):**
```json
[
  { "id": "animation", "name": "Animation" },
  { "id": "auto", "name": "Auto" },
  { "id": "business", "name": "Business" },
  { "id": "classic", "name": "Classic" },
  { "id": "comedy", "name": "Comedy" },
  { "id": "cooking", "name": "Cooking" },
  { "id": "culture", "name": "Culture" },
  { "id": "documentary", "name": "Documentary" },
  { "id": "education", "name": "Education" },
  { "id": "entertainment", "name": "Entertainment" },
  { "id": "family", "name": "Family" },
  { "id": "general", "name": "General" },
  { "id": "kids", "name": "Kids" },
  { "id": "lifestyle", "name": "Lifestyle" },
  { "id": "movies", "name": "Movies" },
  { "id": "music", "name": "Music" },
  { "id": "news", "name": "News" },
  { "id": "outdoor", "name": "Outdoor" },
  { "id": "relax", "name": "Relax" },
  { "id": "religious", "name": "Religious" },
  { "id": "series", "name": "Series" },
  { "id": "science", "name": "Science" },
  { "id": "shop", "name": "Shop" },
  { "id": "sports", "name": "Sports" },
  { "id": "travel", "name": "Travel" },
  { "id": "weather", "name": "Weather" }
]
```

---

#### 5. `https://iptv-org.github.io/api/logos.json`
High-resolution vector and transparent raster logo catalog.

```json
[
  {
    "channel": "BBCNews.uk",
    "url": "https://raw.githubusercontent.com/iptv-org/logos/master/logos/uk/bbc_news.png",
    "format": "PNG",
    "width": 512,
    "height": 512
  }
]
```

---

#### 6. `https://iptv-org.github.io/api/guides.json`
Maps channel IDs to EPG provider sites and guide identifiers.

```json
[
  {
    "channel": "BBCNews.uk",
    "site": "tvguide.co.uk",
    "site_id": "bbc-news-hd",
    "lang": "en"
  }
]
```

---

### 1.2 M3U Playlist Format Specification

iptv-org distributes ready-to-use playlists conforming to the Extended M3U standard (`#EXTM3U`).

**Example Raw M3U Snippet:**
```m3u
#EXTM3U
#EXTINF:-1 tvg-id="BBCNews.uk" tvg-name="BBC News" tvg-logo="https://i.imgur.com/7YjXUpm.png" group-title="News",BBC News (1080p)
#EXTVLCOPT:http-referrer=https://www.bbc.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)
https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/main.m3u8
```

**M3U Tags Breakdown:**
- `#EXTM3U`: Playlist file header.
- `#EXTINF:<duration> <attributes>,<channel_name>`:
  - `tvg-id`: Matches `ChannelRecord.id`.
  - `tvg-name`: Clean channel name.
  - `tvg-logo`: URL to channel logo.
  - `group-title`: Primary category / genre.
- `#EXTVLCOPT:http-referrer=...`: Upstream HTTP Referer header.
- `#EXTVLCOPT:http-user-agent=...`: Upstream HTTP User-Agent header.
- The following line contains the raw HLS/DASH/TS stream URL.

---

### 1.3 XMLTV (EPG) Specification & Decompression

XMLTV is an XML-based file format for describing television program schedules. Feeds from `epgshare01.online` are compressed with gzip (`.xml.gz`).

**Decompression & Ingestion Flow:**
1. Download `.xml.gz` buffer using `node-fetch`.
2. Decompress via Node standard `zlib.gunzipSync(buffer)` or streaming `zlib.createGunzip()`.
3. Parse XMLTV `<programme>` elements:

**XMLTV Sample Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="epgshare">
  <channel id="BBCNews.uk">
    <display-name>BBC News HD</display-name>
    <icon src="https://i.imgur.com/7YjXUpm.png" />
  </channel>
  <programme start="20260818120000 +0000" stop="20260818130000 +0000" channel="BBCNews.uk">
    <title lang="en">BBC News at One</title>
    <desc lang="en">The latest national and international news stories from BBC News.</desc>
    <category lang="en">News</category>
  </programme>
</tv>
```

**Timestamp Parsing Rule:**
XMLTV date format is `YYYYMMDDHHMMSS +ZZZZ`.
- Example: `"20260818120000 +0000"` -> Year 2026, Month 08, Day 18, Hour 12, Min 00, Sec 00 UTC -> Unix timestamp `1787054400000` ms.

---

## 2. 🏛️ Complete System Architecture & Data Flow

```
                                  +──────────────────────────────────+
                                  |         CLIENT BROWSER           |
                                  |   React 18 + Vite Dark UI SPA    |
                                  |   • VideoPlayer (HLS.js + proxy) |
                                  |   • ChannelGrid + Live Search    |
                                  |   • EPG "Now Playing" Timeline   |
                                  +─────────────────┬────────────────+
                                                    |
                                                    | HTTP Requests (:8080)
                                                    v
                                  +──────────────────────────────────+
                                  |     PRODUCTION NGINX PROXY       |
                                  |   • Serves static SPA dist/      |
                                  |   • Reverse-proxies /api/ to     |
                                  |     http://backend:3001          |
                                  |   • proxy_buffering off;         |
                                  +─────────────────┬────────────────+
                                                    |
                                                    | Internal Network (:3001)
                                                    v
                                  +──────────────────────────────────+
                                  |      NODE.JS EXPRESS BACKEND     |
                                  |   • /api/channels  • /api/sync   |
                                  |   • /api/streams   • /api/health |
                                  |   • /api/favorites • /api/proxy  |
                                  |   • /api/epg       • /api/export |
                                  +─────────────────┬────────────────+
                                                    |
                         +──────────────────────────┴──────────────────────────+
                         |                                                     |
                         v                                                     v
          +──────────────────────────────+                      +──────────────────────────────+
          |      SQLITE (iptv.db)        |                      |    REMOTE UPSTREAM FEEDS     |
          |  • channels (30,000+ rows)   |                      |  • iptv-org/api/*.json       |
          |  • streams (HLS m3u8 URLs)   |                      |  • epgshare01.online XMLTV   |
          |  • countries & categories    |                      |  • tv-logo CDN & Live HLS    |
          |  • favorites & epg_programs  |                      |    Stream Chunks             |
          +──────────────────────────────+                      +──────────────────────────────+
```

---

## 3. 💾 Full SQLite Database Schema (`iptv.db`)

All tables are created in SQLite using `better-sqlite3` with `PRAGMA journal_mode = WAL;`.

```sql
-- 1. Master Channels Table
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  alt_names TEXT DEFAULT '[]',     -- JSON array of strings
  country TEXT,                    -- ISO 2-letter code (e.g. 'US', 'IN')
  categories TEXT DEFAULT '[]',    -- JSON array of strings (e.g. '["news"]')
  languages TEXT DEFAULT '[]',     -- JSON array of strings (e.g. '["eng"]')
  logo TEXT,                       -- Upstream logo URL
  logo_cached INTEGER DEFAULT 0,   -- 1 if saved to /data/logos/<id>.jpg, 0 otherwise
  website TEXT,
  is_nsfw INTEGER DEFAULT 0,       -- 0 = clean, 1 = adult
  network TEXT,
  launched TEXT,
  closed TEXT,                     -- NULL if channel is currently ACTIVE
  last_synced INTEGER
);

-- 2. Streams Table (Supports multi-origin feeds)
CREATE TABLE IF NOT EXISTS streams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  url TEXT NOT NULL,
  http_referrer TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'iptv-org',   -- 'iptv-org' | 'free-tv' | 'custom'
  status TEXT DEFAULT 'unknown',    -- 'online' | 'offline' | 'unknown'
  last_checked INTEGER,
  last_synced INTEGER,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

-- 3. Countries Reference Table
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,           -- e.g. 'US', 'IN', 'GB'
  name TEXT NOT NULL,              -- e.g. 'United States', 'India'
  languages TEXT DEFAULT '[]',     -- JSON array
  flag TEXT                        -- Unicode Flag Emoji (e.g. '🇺🇸', '🇮🇳')
);

-- 4. Categories Reference Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,             -- e.g. 'news', 'sports', 'movies'
  name TEXT NOT NULL               -- e.g. 'News', 'Sports', 'Movies'
);

-- 5. User Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL UNIQUE,
  added_at INTEGER NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

-- 6. EPG Schedule Programs Table
CREATE TABLE IF NOT EXISTS epg_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_time INTEGER NOT NULL,     -- Unix epoch in milliseconds
  end_time INTEGER NOT NULL,       -- Unix epoch in milliseconds
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

-- 7. Sync History Log Table
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER,
  finished_at INTEGER,
  channels_synced INTEGER DEFAULT 0,
  streams_synced INTEGER DEFAULT 0,
  logos_cached INTEGER DEFAULT 0,
  epg_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',   -- 'running' | 'done' | 'error'
  error TEXT
);

-- High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_channels_country ON channels(country);
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_streams_channel ON streams(channel_id);
CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON epg_programs(channel_id, start_time, end_time);
```

---

## 4. 🌐 REST API Endpoints & Request/Response Contracts

### 4.1 Channel & Filter Endpoints

#### `GET /api/channels`
- **Query Parameters:**
  - `search` (string): Search across `name` and `alt_names`.
  - `country` (string): Filter by 2-letter country code (e.g. `US`, `IN`).
  - `category` (string): Filter by category slug (e.g. `news`, `sports`).
  - `language` (string): Filter by 3-letter language code (e.g. `eng`, `hin`).
  - `favoritesOnly` (`"true"` | `"false"`): Return only favorited channels.
  - `page` (number, default `1`): Page number.
  - `limit` (number, default `48`, max `200`): Results per page.
- **SQL Logic:** Filters `closed IS NULL` (only active channels), parses JSON array columns before returning.
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "BBCNews.uk",
      "name": "BBC News",
      "alt_names": ["BBC News Channel"],
      "country": "GB",
      "categories": ["news"],
      "languages": ["eng"],
      "logo": "https://i.imgur.com/7YjXUpm.png",
      "logo_cached": 1,
      "website": "https://www.bbc.co.uk/news",
      "is_nsfw": false,
      "network": "BBC",
      "isFavorite": true
    }
  ],
  "total": 1240,
  "page": 1,
  "limit": 48,
  "totalPages": 26
}
```

#### `GET /api/channels/filters`
- **Response `200 OK`:**
```json
{
  "categories": [
    { "value": "news", "label": "News", "count": 1420 },
    { "value": "general", "label": "General", "count": 1150 }
  ],
  "countries": [
    { "value": "US", "label": "United States", "flag": "🇺🇸", "count": 1820 },
    { "value": "IN", "label": "India", "flag": "🇮🇳", "count": 940 }
  ],
  "languages": [
    { "value": "eng", "label": "eng", "count": 4200 },
    { "value": "hin", "label": "hin", "count": 890 }
  ]
}
```

#### `GET /api/channels/:id`
- **Response `200 OK`:** Returns full channel object with nested `streams: StreamRecord[]` and optional `currentProgram` / `nextProgram`.

---

### 4.2 Streaming & Logo Proxy Endpoints

#### `GET /api/proxy/stream?url=<m3u8_url>&referrer=<url>&userAgent=<ua>`
- **Behavior:**
  - Validates `url` starts with `http`.
  - Sets upstream request headers: `User-Agent: userAgent || 'VLC/3.0.0'`, `Referer: referrer || ''`.
  - Streams upstream response chunks directly to client (`upstream.body.pipe(res)`).
  - Sets response headers: `Access-Control-Allow-Origin: *`, `Cache-Control: no-cache`.
  - Handles errors with `502 Bad Gateway`.

#### `GET /api/proxy/logo/:channelId`
- **Multi-Tier Fallback Pipeline:**
  1. If local `/data/logos/<channelId>.jpg` exists -> Stream image (`image/jpeg`).
  2. If missing -> Stream dynamic SVG monogram with channel initials and deterministic HSL background color (`image/svg+xml`).

---

### 4.3 EPG & Export Endpoints

#### `GET /api/epg/:channelId`
- Returns array of scheduled programs:
```json
[
  {
    "id": 142,
    "channel_id": "BBCNews.uk",
    "title": "BBC News at One",
    "description": "Latest news headlines.",
    "category": "News",
    "start_time": 1787054400000,
    "end_time": 1787058000000
  }
]
```

#### `GET /api/export/m3u?favoritesOnly=true`
- Returns a downloadable `#EXTM3U` playlist containing channels and stream links compatible with VLC, TiviMate, and Jellyfin/Threadfin.

---

## 5. 🤖 Step-by-Step Implementation Instructions for LLM Agents

Follow these exact implementation steps sequentially. Every file must be fully written with complete, production-ready code.

### 🔹 Step 1: Complete Backend Scaffolding

1. **Create `backend/src/index.js`:**
   - Require `dotenv/config`, `express`, `cors`.
   - Call `initSchema()` from `./db/schema`.
   - Mount routers:
     - `app.use('/api/channels', require('./routes/channels'))`
     - `app.use('/api/streams', require('./routes/streams'))`
     - `app.use('/api/favorites', require('./routes/favorites'))`
     - `app.use('/api/sync', require('./routes/sync'))`
     - `app.use('/api/health', require('./routes/health'))`
     - `app.use('/api/proxy', require('./routes/proxy'))`
     - `app.use('/api/epg', require('./routes/epg'))`
     - `app.use('/api/export', require('./routes/export'))`
   - Add health ping: `app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }))`
   - Call `startScheduler()`.
   - Start listening on `process.env.PORT || 3001`.

2. **Create `backend/src/services/epgService.js`:**
   - Async function `syncEPG(region = 'IN1')`:
     - Fetches `https://epgshare01.online/epgshare01/epg_ripper_${region}.xml.gz`.
     - Gunzips buffer using `zlib.gunzipSync`.
     - Parses `<programme>` tags with regex or stream parser.
     - Inserts into `epg_programs` table in a transaction.

3. **Create `backend/src/routes/export.js`:**
   - Generates `#EXTM3U` content with `#EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="...",<Name>` headers and pipes as `attachment; filename="playlist.m3u"`.

4. **Create `backend/Dockerfile`:**
   ```dockerfile
   FROM node:20-alpine
   RUN apk add --no-cache python3 make g++ vips-dev
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY src/ ./src/
   EXPOSE 3001
   CMD ["node", "src/index.js"]
   ```

---

### 🔹 Step 2: Complete Frontend Components & Pages

1. **Create Component Styles & JSX Files:**
   - `src/components/Navbar/Navbar.css`: Header styling, active underline, mobile toggle.
   - `src/components/SyncStatus/SyncStatus.jsx` & `SyncStatus.css`: TanStack Query polling `/api/sync/status` every 30s. Green pulse for done, spinner for running, dropdown with "Sync Now" button.
   - `src/components/ChannelCard/ChannelCard.jsx` & `ChannelCard.css`: Channel tile showing logo (`/api/proxy/logo/:id`), name, country flag, category badges, and favorite toggle heart.
   - `src/components/ChannelGrid/ChannelGrid.jsx` & `ChannelGrid.css`: Responsive CSS grid (`repeat(auto-fill, minmax(180px, 1fr))`) with 24 shimmer skeleton cards during loading.
   - `src/components/SidebarFilters/SidebarFilters.jsx` & `SidebarFilters.css`: Accordion for Categories, Countries (with flag emojis), and Languages.
   - `src/components/SearchBar/SearchBar.jsx` & `SearchBar.css`: 300ms debounced input with clear button.
   - `src/components/VideoPlayer/VideoPlayer.jsx` & `VideoPlayer.css`: Full HLS.js player with custom overlay controls (play/pause, volume slider, fullscreen, error retry, automatic failover to secondary streams).

2. **Create Page Views:**
   - `src/pages/Home.jsx`: Hero search, quick-category icon tiles (News 📰, Sports ⚽, Movies 🎬, Music 🎵, Kids 🧸, Doc 🎥, etc.), and recent channels.
   - `src/pages/Browse.jsx`: Two-column layout with `SidebarFilters` on left (280px) and searchable `ChannelGrid` on right with "Load More" pagination.
   - `src/pages/Channel.jsx`: Channel metadata header, embedded `VideoPlayer`, stream source selector, health check button, and EPG program schedule.
   - `src/pages/Favorites.jsx`: Grid of saved channels with one-click M3U export button.
   - `src/pages/Settings.jsx`: Catalog sync status, DB stats, direct links to iptv-org playlists, and legal disclaimer.

3. **Create Frontend Dockerfile & Nginx Config:**
   - `frontend/nginx.conf`:
     ```nginx
     server {
         listen 80;
         server_name localhost;
         root /usr/share/nginx/html;
         index index.html;

         location /api/ {
             proxy_pass http://backend:3001;
             proxy_http_version 1.1;
             proxy_buffering off;
             proxy_read_timeout 86400;
         }

         location / {
             try_files $uri $uri/ /index.html;
         }
     }
     ```
   - `frontend/Dockerfile`: Multi-stage build (`node:20-alpine` builder -> `nginx:alpine` runtime).

---

### 🔹 Step 3: End-to-End Verification Checklist

1. **Database Schema & Ingestion:** Run `node src/index.js` in `backend/` -> confirm `iptv.db` is created and `channels` table populates with ~20,000+ entries.
2. **Frontend Compilation:** Run `npm run build` in `frontend/` -> confirm zero JSX, Vite, or CSS compilation errors.
3. **Stream Playback:** Test `/api/proxy/stream` with a live HLS stream URL -> confirm video renders in `<VideoPlayer />` without CORS errors.
4. **Docker Compose:** Run `docker compose up --build -d` -> confirm `http://localhost:8080` loads the web app and plays live streams.

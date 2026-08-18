# 📺 IPTV Browser & Player

A modern, self-hosted, Dockerized web application for browsing, searching, and streaming 50,000+ free-to-air IPTV channels with multi-catalog synchronization, custom M3U playlist importing, dynamic faceted filtering, and in-browser playback.

---

## ✨ Features

- 📡 **Multi-Source Catalog Aggregation** — Aggregate channels and streams across multiple upstream registries and custom playlists simultaneously.
- 🌍 **Romaxa55 World IPTV Integration** — Integrated auto-verified playlist with 14,000+ live tested streams worldwide.
- 📁 **Custom M3U / M3U8 Playlist Support** — Add any remote M3U playlist URL or ingest raw M3U files directly from the UI.
- 🏷️ **Catalog Source Badges** — Visual source tags on channel cards and stream selectors to easily identify stream origins.
- 🔍 **Dynamic Contextual Faceted Search** — Real-time reactive sidebar filters that dynamically calculate channel counts across countries, categories, languages, sources, and stream availability as you filter.
- 📺 **In-Browser HLS Player** — Stream HLS video directly in the browser with adaptive bitrate streaming (HLS.js).
- 🛡️ **Stream & CORS Proxy** — Built-in backend proxy to bypass CORS restrictions and rewrite nested M3U8 manifests.
- ❤️ **Favorites & Watchlist** — Save your favorite channels for quick access.
- 🔄 **Automated & Manual Sync** — Independent source toggles, manual sync buttons, auto-sync schedules, and detailed sync history logs.
- 📅 **EPG Schedules** — XMLTV Electronic Program Guide ingestion from EPGShare for schedule timelines.
- 🩺 **Stream Health Checks** — Test stream reachability and latency on demand.
- ⚡ **Ultra-Fast Performance** — SQLite in WAL mode with compound indexes delivering sub-50ms query responses across 50k+ records.

---

## 🚀 Quick Start (Docker)

To run the full stack using Docker Compose:

```bash
docker compose up --build -d
```

Open **http://localhost:8080** in your browser.

*Note: Initial startup will synchronize the base catalogs and cache logos. Database state is persisted across container restarts via Docker named volumes.*

---

## 🛠️ Development Setup

### Backend (Node.js + Express + SQLite)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
*Backend runs on `http://localhost:3001`*

### Frontend (React 18 + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend dev server runs on `http://localhost:5173`*

---

## 🏗️ Architecture

```
Browser → Nginx (port 8080)
               ├── /           → React SPA (Vite Production Build)
               └── /api/*      → Express REST API (port 3001)
                                      ├── /channels    → Channel catalog & faceted filters
                                      ├── /sources     → Multi-source & M3U sync engine
                                      ├── /proxy       → CORS & manifest rewrite proxy
                                      ├── /epg         → XMLTV program schedules
                                      ├── /favorites   → User watchlist
                                      └── SQLite (iptv.db with WAL & Memory Cache)
```

- **Frontend**: React 18, React Router v6, TanStack Query v5, HLS.js, CSS Custom Properties Design System.
- **Backend**: Node.js, Express, `better-sqlite3`, `node-fetch`, `sharp` image processor, `node-cron`.
- **Database**: SQLite with Write-Ahead Logging (WAL) and memory page caching for ultra-fast queries.

---

## 🌐 Data Sources & Credits

Special thanks to the open-source projects and communities providing free-to-air IPTV channel metadata and stream verification:

1. **[iptv-org / iptv](https://github.com/iptv-org/iptv)**
   - *Description:* A global community-maintained collection of publicly available IPTV channels.
   - *Repository:* [https://github.com/iptv-org/iptv](https://github.com/iptv-org/iptv)
   - *APIs used:* Channel metadata, stream endpoints, country registries, languages, and category schemas (`https://iptv-org.github.io/api`).

2. **[Romaxa55 / world_ip_tv](https://github.com/Romaxa55/world_ip_tv)**
   - *Description:* Automated daily-verified global IPTV playlist featuring 14,000+ tested active streams with automatic regional grouping.
   - *Repository:* [https://github.com/Romaxa55/world_ip_tv](https://github.com/Romaxa55/world_ip_tv)
   - *Feed:* `https://romaxa55.github.io/world_ip_tv/output/index.m3u`

3. **[EPGShare01](https://epgshare01.online)**
   - *Description:* Electronic Program Guide XMLTV distribution service for broadcast program schedules.
   - *Website:* [https://epgshare01.online](https://epgshare01.online)

---

## ⚖️ Legal Disclaimer

This application is an open-source indexing tool and media browser. It does not host, store, or broadcast any video streams or media content. All stream URLs and metadata are fetched from publicly accessible, free-to-air community repositories or user-provided M3U sources. Users are solely responsible for ensuring that their use complies with local laws and regulations. For more information, refer to the [iptv-org legal notice](https://github.com/iptv-org/iptv#legal).

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

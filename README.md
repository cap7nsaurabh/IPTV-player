# 📺 IPTV Browser & Player

A self-hosted, Dockerized web app for browsing and streaming 20,000+ free IPTV channels from the [iptv-org/iptv](https://github.com/iptv-org/iptv) catalog.

## Features

- 📡 **Browse** 20,000+ channels by category, country, and language
- 🔍 **Search** channels by name in real time
- 📺 **HLS Player** — stream directly in the browser (no plugins needed)
- ❤️ **Favorites** — save channels to a personal watchlist
- 🔄 **Auto-sync** — catalog refreshes daily from iptv-org
- 🩺 **Health checks** — test if a stream is live before watching
- 📅 **EPG** — Electronic Program Guide integration (Phase 3)

## Quick Start (Docker)

To run the project using Docker:

```bash
docker compose up --build -d
```

Open **http://localhost:8080** in your browser.

*Note: The first startup involves syncing ~20,000 channels and downloading logos, which may take 2-5 minutes.*

## Development Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
*Runs on http://localhost:3001*

### Frontend
```bash
cd frontend
npm install
npm run dev
```
*Runs on http://localhost:5173*


## Architecture

`
Browser → Nginx (port 8080)
               ├── /           → React SPA (static)
               └── /api/*      → Express Backend (port 3001)
                                        └── SQLite (iptv.db)
`

- **Frontend**: React 18 + Vite, served via Nginx
- **Backend**: Node.js + Express REST API
- **Database**: SQLite via etter-sqlite3 — stored in a Docker named volume
- **Player**: HLS.js for in-browser HLS streaming
- **Stream Proxy**: Backend proxies stream URLs to bypass CORS restrictions
- **Logo Cache**: Channel logos downloaded and served locally

## Data Source

Channel data is sourced from **[iptv-org/iptv](https://github.com/iptv-org/iptv)** — a community-maintained collection of publicly available IPTV channels from around the world.

APIs used:
- https://iptv-org.github.io/api/channels.json — channel metadata
- https://iptv-org.github.io/api/streams.json — stream URLs

## Legal Disclaimer

This application does not host any content. All streams are community-contributed links to publicly available sources. Users are responsible for ensuring their use complies with applicable laws in their jurisdiction. See [iptv-org legal notes](https://github.com/iptv-org/iptv#legal) for more information.

## License

MIT

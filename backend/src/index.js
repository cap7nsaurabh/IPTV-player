const dotenv = require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./db/schema');
const { startScheduler } = require('./scheduler');

// Initialize database schema
initSchema();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/channels', require('./routes/channels'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/health', require('./routes/health'));
app.use('/api/proxy', require('./routes/proxy'));
app.use('/api/epg', require('./routes/epg'));
app.use('/api/export', require('./routes/export'));

// Health Ping
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Start background sync scheduler
startScheduler();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

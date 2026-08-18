const cron = require('node-cron');
const db = require('./db/db');
const { syncCatalogs, cacheLogos } = require('./services/syncService');

async function startScheduler() {
  const intervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS || '24', 10);

  // Run initial sync if DB is empty
  try {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM channels').get();
    if (count === 0) {
      console.log('[Scheduler] DB empty — running initial sync...');
      await syncCatalogs();
      console.log('[Scheduler] Initial sync done. Caching logos...');
      cacheLogos(200).catch(e => console.error('[Scheduler] Logo cache error:', e.message));
    } else {
      console.log(`[Scheduler] DB has ${count} channels. Skipping initial sync.`);
    }
  } catch (err) {
    console.error('[Scheduler] Initial sync failed:', err.message);
  }

  // Recurring cron: every N hours at minute 0
  const cronExpr = `0 */${intervalHours} * * *`;
  console.log(`[Scheduler] Cron set: ${cronExpr} (every ${intervalHours}h)`);

  cron.schedule(cronExpr, async () => {
    console.log('[Scheduler] Running scheduled sync...');
    try {
      const stats = await syncCatalogs();
      console.log('[Scheduler] Sync complete:', stats);
      await cacheLogos(500);
    } catch (err) {
      console.error('[Scheduler] Scheduled sync error:', err.message);
    }
  });
}

module.exports = { startScheduler };

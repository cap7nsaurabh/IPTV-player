'use strict';

const fetch = require('node-fetch');
const db = require('../db/db');

const getStreamsForChannel = db.prepare(`
  SELECT * FROM streams WHERE channel_id = ?
`);

const updateStreamStatus = db.prepare(`
  UPDATE streams
  SET status = @status, last_checked = @last_checked
  WHERE id = @id
`);

/**
 * Checks the reachability of every stream URL associated with a channel.
 *
 * Each stream is probed with a HEAD request (5-second timeout). A 2xx/3xx
 * response is considered "online"; everything else is "offline".
 *
 * @param {string} channelId
 * @returns {Promise<Array<{ url: string, status: 'online'|'offline' }>>}
 */
async function checkChannelHealth(channelId) {
  const streams = getStreamsForChannel.all(channelId);

  if (!streams.length) {
    return [];
  }

  const results = await Promise.all(
    streams.map(async (stream) => {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), 5000);

      let status = 'offline';

      try {
        const res = await fetch(stream.url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': stream.user_agent || 'VLC/3.0.0',
            ...(stream.http_referrer ? { Referer: stream.http_referrer } : {}),
          },
        });

        // Treat 2xx and 3xx as online
        if (res.status >= 200 && res.status < 400) {
          status = 'online';
        }
      } catch (_err) {
        // Timeout, network error, etc. — stays offline
        status = 'offline';
      } finally {
        clearTimeout(timeoutHandle);
      }

      updateStreamStatus.run({
        status,
        last_checked: Date.now(),
        id:           stream.id,
      });

      return { url: stream.url, status };
    })
  );

  return results;
}

module.exports = { checkChannelHealth };

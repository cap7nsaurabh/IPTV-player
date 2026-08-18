'use strict';

const zlib = require('zlib');
const fetch = require('node-fetch');
const db = require('../db/db');

const getEPGStmt = db.prepare(`
  SELECT id, channel_id, title, description, category, start_time, end_time
  FROM epg_programs
  WHERE channel_id = ? AND end_time >= ?
  ORDER BY start_time ASC
  LIMIT 50
`);

const insertEPGStmt = db.prepare(`
  INSERT INTO epg_programs (channel_id, title, description, category, start_time, end_time)
  VALUES (@channel_id, @title, @description, @category, @start_time, @end_time)
`);

const deleteOldEPGStmt = db.prepare(`
  DELETE FROM epg_programs WHERE end_time < ?
`);

/**
 * Parses XMLTV timestamp "YYYYMMDDHHMMSS +ZZZZ" or "YYYYMMDDHHMMSS" into Unix epoch ms.
 */
function parseXmltvDate(str) {
  if (!str) return Date.now();
  const clean = str.trim();
  const year = parseInt(clean.slice(0, 4), 10);
  const month = parseInt(clean.slice(4, 6), 10) - 1;
  const day = parseInt(clean.slice(6, 8), 10);
  const hour = parseInt(clean.slice(8, 10), 10);
  const min = parseInt(clean.slice(10, 12), 10);
  const sec = parseInt(clean.slice(12, 14), 10) || 0;

  let offsetMs = 0;
  const tzMatch = clean.match(/([+-]\d{4})$/);
  if (tzMatch) {
    const sign = tzMatch[1][0] === '-' ? -1 : 1;
    const tzHours = parseInt(tzMatch[1].slice(1, 3), 10);
    const tzMins = parseInt(tzMatch[1].slice(3, 5), 10);
    offsetMs = sign * (tzHours * 60 + tzMins) * 60 * 1000;
  }

  const utc = Date.UTC(year, month, day, hour, min, sec);
  return utc - offsetMs;
}

/**
 * Generates dynamic mock EPG schedule blocks for channels without upstream XMLTV.
 */
function generateFallbackSchedule(channelId) {
  const channel = db.prepare('SELECT name, categories FROM channels WHERE id = ?').get(channelId);
  const name = channel?.name || channelId;
  const now = Date.now();
  const slotDuration = 60 * 60 * 1000; // 1 hour
  const startOfSlot = Math.floor(now / slotDuration) * slotDuration;

  const titles = [
    `${name} Live Broadcast`,
    `Global News & Analysis`,
    `Special Feature: Spotlight`,
    `Prime Time Edition`,
    `Late Night Recap`,
    `Morning Update`,
    `Afternoon Magazine`,
    `World Focus: In-Depth`,
  ];

  const schedule = [];
  for (let i = -1; i < 7; i++) {
    const startTime = startOfSlot + (i * slotDuration);
    const endTime = startTime + slotDuration;
    const titleIdx = Math.abs(Math.floor(startTime / slotDuration)) % titles.length;

    schedule.push({
      id: `gen-${channelId}-${startTime}`,
      channel_id: channelId,
      title: titles[titleIdx],
      description: `Continuous coverage and curated programming on ${name}.`,
      category: 'General',
      start_time: startTime,
      end_time: endTime,
    });
  }

  return schedule;
}

/**
 * Returns the EPG schedule for a given channel.
 * @param {string} channelId
 */
function getChannelEPG(channelId) {
  const since = Date.now() - (60 * 60 * 1000); // 1 hour ago
  const rows = getEPGStmt.all(channelId, since);

  if (rows && rows.length > 0) {
    return rows;
  }

  return generateFallbackSchedule(channelId);
}

/**
 * Syncs EPG data from remote sources.
 * @param {string} region - The epg_ripper region (e.g., 'IN1', 'US1')
 */
async function syncEPG(region = 'IN1') {
  const url = `https://epgshare01.online/epgshare01/epg_ripper_${region}.xml.gz`;
  console.log(`[EPG] Fetching EPG for region ${region} from ${url}...`);

  try {
    const response = await fetch(url, { timeout: 30000 });
    if (!response.ok) throw new Error(`Failed to fetch EPG: ${response.statusText}`);

    const buffer = await response.buffer();
    const decompressed = zlib.gunzipSync(buffer);
    const xml = decompressed.toString('utf-8');

    // Clean up programs older than 24h
    deleteOldEPGStmt.run(Date.now() - (24 * 60 * 60 * 1000));

    // Regex match <programme start="..." stop="..." channel="..."> ... </programme>
    const progRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)">([\s\S]*?)<\/programme>/g;
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/;
    const descRegex = /<desc[^>]*>([^<]+)<\/desc>/;
    const catRegex = /<category[^>]*>([^<]+)<\/category>/;

    let match;
    let count = 0;

    const insertTx = db.transaction(() => {
      while ((match = progRegex.exec(xml)) !== null) {
        const startStr = match[1];
        const stopStr = match[2];
        const channelId = match[3];
        const innerXml = match[4];

        const title = (innerXml.match(titleRegex)?.[1] || 'Scheduled Program').trim();
        const desc = (innerXml.match(descRegex)?.[1] || '').trim();
        const cat = (innerXml.match(catRegex)?.[1] || '').trim();

        const startTime = parseXmltvDate(startStr);
        const endTime = parseXmltvDate(stopStr);

        insertEPGStmt.run({
          channel_id: channelId,
          title,
          description: desc,
          category: cat,
          start_time: startTime,
          end_time: endTime,
        });
        count++;
      }
    });

    insertTx();
    console.log(`[EPG] Successfully parsed and saved ${count} programmes for region ${region}`);
    return { ok: true, count, region };
  } catch (error) {
    console.error(`[EPG] Error syncing EPG: ${error.message}`);
    throw error;
  }
}

module.exports = { syncEPG, getChannelEPG };

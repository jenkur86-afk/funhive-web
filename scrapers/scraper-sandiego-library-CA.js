#!/usr/bin/env node

/**
 * SAN DIEGO PUBLIC LIBRARY SCRAPER
 *
 * Uses the mylibrary.digital RSS feed (Cloudflare blocks Puppeteer on the main site).
 * Coverage: San Diego Public Library system (~35 branches), San Diego County, CA
 *
 * Usage:
 *   node scrapers/scraper-sandiego-library-CA.js
 */

'use strict';

const axios = require('axios');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { geocodeWithFallback } = require('./helpers/geocoding-helper');
const { normalizeDateString } = require('./helpers/date-normalization-helper');
const { detectLibraryBranch } = require('./helpers/library-branch-detector');
const { linkEventToVenue } = require('./venue-matcher');
const { logScraperResult } = require('./scraper-logger');

const RSS_URL = 'https://sandiego.events.mylibrary.digital/rss';
const STATE = 'CA';
const COUNTY = 'San Diego';
const SYSTEM_NAME = 'San Diego Public Library';
const CITY = 'San Diego';

const RSS_HEADERS = {
  'User-Agent': 'FunHive-EventAggregator/1.0 (family-events; contact@funhive.com)',
  'Accept': 'application/rss+xml, text/xml, */*',
};

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Extract date/time from description like:
//   "<strong>Date/Time:</strong> Mon, 29 Jun 2026, 11:30am - 12:30pm"
function parseDateTimeFromDesc(rawDesc) {
  const text = decodeHtmlEntities(rawDesc);
  const m = text.match(/Date\/Time:\s*\w+,\s*(\d{1,2}\s+\w+\s+\d{4}),?\s*([\d:]+\s*(?:am|pm)(?:\s*[-–]\s*[\d:]+\s*(?:am|pm))?)?/i);
  if (!m) return null;
  return {
    dateStr: m[1].trim(),
    timeStr: (m[2] || '').trim()
  };
}

function parseTimeRange(timeStr) {
  if (!timeStr) return { startTime: null, endTime: null };
  const fmt = (h, m, ap) => {
    h = parseInt(h);
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap.toUpperCase()}`;
  };
  // "11:30am - 12:30pm"
  const rm = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rm) {
    const sap = rm[3] || (parseInt(rm[1]) >= 7 && parseInt(rm[1]) < 12 ? 'AM' : 'PM');
    return { startTime: fmt(rm[1], rm[2], sap), endTime: fmt(rm[4], rm[5], rm[6]) };
  }
  // "10am - 2pm"
  const rn = timeStr.match(/(\d{1,2})\s*(am|pm)\s*[-–]\s*(\d{1,2})\s*(am|pm)/i);
  if (rn) return { startTime: fmt(rn[1], '00', rn[2]), endTime: fmt(rn[3], '00', rn[4]) };
  // "11:30am"
  const sm = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (sm) return { startTime: fmt(sm[1], sm[2], sm[3]), endTime: null };
  return { startTime: null, endTime: null };
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                   block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link  = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const desc  = (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    const imgM  = block.match(/<media:content[^>]+url="([^"]+)"/);
    items.push({
      title: title.trim(),
      link: link.trim(),
      description: desc,
      imageUrl: imgM ? imgM[1] : ''
    });
  }
  return items;
}

async function scrapeSanDiegoLibrary() {
  console.log('\n📚 SAN DIEGO PUBLIC LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Source: mylibrary.digital RSS feed (Cloudflare-proof)\n');

  let newCount = 0;
  let skippedPast = 0;
  let noParse = 0;
  let noCoords = 0;
  let failed = 0;
  let items = [];

  try {
    console.log(`📡 Fetching RSS...`);
    const response = await axios.get(RSS_URL, { headers: RSS_HEADERS, timeout: 15000 });
    items = parseRssItems(response.data);
    console.log(`  Found ${items.length} RSS items\n`);
  } catch (err) {
    console.error('❌ Failed to fetch RSS:', err.message);
    return { imported: 0, skipped: 0, failed: 1 };
  }

  for (const item of items) {
    try {
      // Extract date/time from description
      const dt = parseDateTimeFromDesc(item.description);
      if (!dt || !dt.dateStr) {
        noParse++;
        continue;
      }

      const normalizedDate = normalizeDateString(dt.dateStr);
      if (!normalizedDate) {
        noParse++;
        continue;
      }

      // Skip past events
      const dateObj = new Date(normalizedDate + 'T00:00:00');
      if (isNaN(dateObj.getTime()) || dateObj < new Date()) {
        skippedPast++;
        continue;
      }

      // Clean description text (remove the Date/Time header line)
      const descText = decodeHtmlEntities(item.description)
        .replace(/Date\/Time:\s*\w+,\s*[\d\s\w:,amp\-]+/i, '')
        .trim()
        .substring(0, 1000);

      // Detect branch from event title + description
      const branchInfo = detectLibraryBranch({
        venue: SYSTEM_NAME,
        eventName: item.title,
        description: descText,
        state: STATE
      });

      let venue = SYSTEM_NAME;
      let address = '';
      let city = CITY;
      let zipCode = '';

      if (branchInfo) {
        venue = `${branchInfo.branchName} - San Diego Public Library`;
        address = branchInfo.address;
        city = branchInfo.city;
        zipCode = branchInfo.zipCode;
        console.log(`  📚 Branch: ${branchInfo.branchName} (${branchInfo.city})`);
      }

      // Geocode — branch address → library name → city fallback
      const geocodeAddr = address
        ? `${address}, ${city}, ${STATE}`
        : `${SYSTEM_NAME}, ${CITY}, ${STATE}`;

      const coords = await geocodeWithFallback(geocodeAddr, {
        city,
        zipCode,
        state: STATE,
        county: COUNTY,
        venueName: venue,
        sourceName: SYSTEM_NAME
      });

      if (!coords) {
        console.log(`  ⚠️ No coords: ${item.title.substring(0, 50)}`);
        noCoords++;
        continue;
      }

      const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const { startTime, endTime } = parseTimeRange(dt.timeStr);

      // Build event doc using Firestore-compat field names (supabase-adapter converts)
      const eventDoc = {
        name: item.title,
        venue,
        eventDate: normalizedDate,
        startTime,
        endTime,
        description: descText,
        url: item.link || RSS_URL,
        imageUrl: item.imageUrl || '',
        state: STATE,
        cost: 'Free',
        geohash,
        location: {
          name: venue,
          address,
          city,
          state: STATE,
          zipCode,
          coordinates: { latitude: coords.latitude, longitude: coords.longitude }
        },
        contact: {
          website: item.link || 'https://www.sandiego.gov/public-library'
        },
        metadata: {
          source: 'San Diego Public Library Scraper',
          sourceName: SYSTEM_NAME,
          county: COUNTY,
          state: STATE,
          addedDate: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      // Link to venue activity
      const activityId = await linkEventToVenue(eventDoc);
      if (activityId) eventDoc.activityId = activityId;

      await db.collection('events').add(eventDoc);
      console.log(`  ✅ ${item.title.substring(0, 65)}${item.title.length > 65 ? '...' : ''}`);
      newCount++;

    } catch (err) {
      console.error(`  ❌ ${item.title?.substring(0, 40)}:`, err.message);
      failed++;
    }
  }

  const totalSkipped = skippedPast + noParse;
  console.log('\n' + '='.repeat(60));
  console.log('✅ SAN DIEGO PUBLIC LIBRARY SCRAPER COMPLETE!');
  console.log('📊 Summary:');
  console.log(`   Imported: ${newCount}`);
  console.log(`   Skipped (past/no-date): ${totalSkipped}`);
  console.log(`   No coords: ${noCoords}`);
  console.log(`   Errors: ${failed}`);
  console.log('='.repeat(60) + '\n');

  console.log(`📊 San Diego Public Library CA: ✅ ${newCount} new | ⏭️ ${skippedPast} past | ⚠️ ${noCoords} no coords`);

  return { imported: newCount, skipped: totalSkipped, failed };
}

if (require.main === module) {
  scrapeSanDiegoLibrary()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal:', err);
      process.exit(1);
    });
}

module.exports = { scrapeSanDiegoLibrary };

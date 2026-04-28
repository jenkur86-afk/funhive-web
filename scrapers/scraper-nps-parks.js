#!/usr/bin/env node

/**
 * NPS (National Park Service) EVENTS SCRAPER
 *
 * Scrapes events from the NPS Developer API for DC national parks/monuments.
 * DC has no state parks — all public parks are managed by NPS.
 *
 * API: https://developer.nps.gov/api/v1/events?stateCode=DC&limit=50&start=0
 * Docs: https://www.nps.gov/subjects/developer/api-documentation.htm
 *
 * Uses DEMO_KEY by default (limited to 30 req/hr). For higher throughput,
 * register a free key at https://www.nps.gov/subjects/developer/get-started.htm
 *
 * Usage:
 *   node scraper-nps-parks.js
 *
 * Cloud Function: scrapeNpsParksCloudFunction
 * Schedule: Group 2 (every 3 days on days 2, 5, 8, 11...)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'NpsParks';
const NPS_API_KEY = process.env.NPS_API_KEY || 'DEMO_KEY';

// ──────────────────────────────────────────────────────────────────────
// API fetching
// ──────────────────────────────────────────────────────────────────────

async function fetchAllEvents() {
  const allEvents = [];
  let start = 0;
  const limit = 50;
  let total = Infinity;

  while (start < total) {
    const url = 'https://developer.nps.gov/api/v1/events';
    console.log(`  📡 Fetching events ${start}-${start + limit}...`);

    try {
      const response = await axios.get(url, {
        params: {
          stateCode: 'DC',
          limit,
          start,
          api_key: NPS_API_KEY
        },
        timeout: 30000,
        headers: {
          'User-Agent': 'FunHive-Family-Events-Scraper/1.0 (https://funhive.co)'
        }
      });

      const data = response.data;
      total = parseInt(data.total) || 0;

      if (!data.data || data.data.length === 0) {
        break;
      }

      allEvents.push(...data.data);
      console.log(`  ✅ Got ${data.data.length} events (${allEvents.length}/${total})`);

      start += limit;

      // NPS DEMO_KEY rate limit: 30 req/hr → ~2s between requests
      if (start < total) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    } catch (err) {
      if (err.response?.status === 429) {
        console.log('  ⚠️  Rate limited, waiting 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue; // retry same page
      }
      console.error(`  ❌ API error at start=${start}: ${err.message}`);
      if (start === 0) throw err;
      break;
    }
  }

  return allEvents;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function detectAgeRange(title, description) {
  const fullText = `${title || ''} ${description || ''}`.toLowerCase();
  if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/\b0[-–]?3\b/)) {
    return 'Babies & Toddlers (0-2)';
  } else if (fullText.includes('preschool') || fullText.match(/\b3[-–]?5\b/)) {
    return 'Preschool (3-5)';
  } else if (fullText.includes('junior ranger') || fullText.includes('jr ranger') || fullText.includes('jr. ranger')) {
    return 'Kids (6-8)';
  } else if (fullText.includes('child') && !fullText.includes('adult')) {
    return 'Kids (6-8)';
  } else if (fullText.includes('tween') || fullText.match(/\b9[-–]?12\b/)) {
    return 'Tweens (9-12)';
  } else if (fullText.includes('teen') && !fullText.includes('volunteer') || fullText.match(/\b13[-–]?18\b/)) {
    return 'Teens (13-18)';
  }
  return 'All Ages';
}

// ──────────────────────────────────────────────────────────────────────
// Event transformation
// ──────────────────────────────────────────────────────────────────────

/**
 * NPS event fields:
 *   title, description, location, dates[], times[{timestart, timeend}],
 *   parkfullname, latitude, longitude, isfree, isallday,
 *   tags[], types[], category, contactname, contacttelephonenumber,
 *   images[{url, altText}], regresurl, infourl
 */
function transformEvent(raw) {
  // NPS events have a dates[] array — expand each date into a separate event
  const events = [];
  const dates = raw.dates || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use unique dates (NPS may list recurring dates)
  const uniqueDates = [...new Set(dates)].sort();

  // Only take future dates, and limit to first 5 occurrences to avoid flooding
  const futureDates = uniqueDates.filter(d => {
    const dt = new Date(d + 'T00:00:00');
    return !isNaN(dt.getTime()) && dt >= today;
  }).slice(0, 5);

  if (futureDates.length === 0) return [];

  const description = stripHtml(raw.description || '').substring(0, 1500);
  const venue = raw.parkfullname || 'National Park Service';
  const title = (raw.title || '').substring(0, 200);
  const ageRange = detectAgeRange(title, description);

  // Get time info
  const timeInfo = raw.times?.[0];
  let startTime = null;
  let endTime = null;
  if (timeInfo?.timestart && !raw.isallday) {
    startTime = timeInfo.timestart;
  }
  if (timeInfo?.timeend && !raw.isallday) {
    endTime = timeInfo.timeend;
  }

  // Location text
  const locationText = raw.location || '';

  // Get image
  const imageUrl = raw.images?.[0]?.url || '';

  // Get URL
  const url = raw.infourl || raw.regresurl || '';

  for (const dateStr of futureDates) {
    const dt = new Date(dateStr + 'T00:00:00');
    const eventDate = dt.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    events.push({
      title,
      name: title,
      date: eventDate,
      eventDate: eventDate,
      startTime,
      endTime,
      description,
      url,
      imageUrl,
      venue,
      venueName: venue,
      city: 'Washington',
      zipCode: '',
      ageRange,
      // DC coordinates — NPS events often don't have lat/lng
      latitude: raw.latitude ? parseFloat(raw.latitude) : null,
      longitude: raw.longitude ? parseFloat(raw.longitude) : null,
      metadata: {
        sourceName: 'National Park Service - DC',
        sourceUrl: 'https://developer.nps.gov',
        scrapedAt: new Date().toISOString(),
        npsEventId: raw.eventid
      }
    });
  }

  return events;
}

// ──────────────────────────────────────────────────────────────────────
// Main scraping
// ──────────────────────────────────────────────────────────────────────

async function scrapeNpsParks() {
  console.log('\n' + '='.repeat(60));
  console.log('🏛️  NPS PARKS EVENTS SCRAPER (DC)');
  console.log('='.repeat(60));
  console.log(`API Key: ${NPS_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (rate limited)' : 'custom key'}\n`);

  try {
    const rawEvents = await fetchAllEvents();
    console.log(`\n  📋 Total raw NPS events: ${rawEvents.length}`);

    if (rawEvents.length === 0) {
      console.log('⚠️  No events from NPS API\n');
      return { saved: 0, skipped: 0, errors: 0 };
    }

    // Transform — each NPS event may expand to multiple dated events
    const events = [];
    for (const raw of rawEvents) {
      if (!raw.title || raw.title.trim().length < 5) continue;

      const titleLower = (raw.title || '').toLowerCase();
      if (titleLower.includes('cancelled') || titleLower.includes('canceled')) continue;

      const expanded = transformEvent(raw);
      events.push(...expanded);
    }

    console.log(`  ✅ ${events.length} dated events after expansion and filtering`);

    if (events.length > 0) {
      // Build venue entries for each unique park
      const venueMap = new Map();
      for (const event of events) {
        const key = (event.venue || 'NPS').toLowerCase();
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: event.venue || 'National Park Service',
            city: 'Washington',
            state: 'DC',
            address: '',
            zipCode: '',
            url: 'https://www.nps.gov',
            county: 'District of Columbia'
          });
        }
      }

      const libraries = Array.from(venueMap.values());

      const result = await saveEventsWithGeocoding(events, libraries, {
        scraperName: SCRAPER_NAME,
        state: 'DC',
        category: 'parks',
        platform: 'nps-api'
      });

      console.log(`  📊 Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors\n`);
      return result;
    } else {
      console.log('⚠️  No valid events after filtering\n');
      return { saved: 0, skipped: 0, errors: 0 };
    }
  } catch (error) {
    console.error(`❌ Error scraping NPS:`, error.message);
    return { saved: 0, skipped: 0, errors: 1 };
  }
}

async function scrapeNpsParksCloudFunction(req, res) {
  try {
    const result = await scrapeNpsParks();
    res.status(200).json({ success: true, scraper: SCRAPER_NAME, ...result });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({ success: false, scraper: SCRAPER_NAME, error: error.message });
  }
}

if (require.main === module) {
  scrapeNpsParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeNpsParks, scrapeNpsParksCloudFunction };

#!/usr/bin/env node

/**
 * NASHVILLE PUBLIC LIBRARY SCRAPER (Nashville, TN)
 *
 * Nashville migrated off Communico to a Bedework calendar
 * (https://events.library.nashville.org/) — the old Communico entry in
 * scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js was removed
 * 2026-07-05 since chattanooga.libnet.info/nashville.libnet.info both now
 * 302-redirect to google.co.uk (decommissioned Communico tenants).
 *
 * Bedework's calendar widget itself is JS-rendered (no events in the initial
 * HTML), but the site exposes a documented "Export/Subscribe" JSON feed —
 * found by driving the feed-config form in a live browser and reading the
 * generated URL (bwExpUrlBox), then confirmed with a plain curl (no
 * session/cookies required, plain HTTP 200 JSON). Using that feed directly
 * instead of scraping the widget's DOM or intercepting its internal AJAX
 * calls — far more stable, and no Puppeteer/browser needed at all.
 *
 * Feed docs (self-documented on the page): RSS/JSON/XML/iCal/CSV, up to 200
 * events, sorted by start ascending. `start.datetime`/`end.datetime` are
 * already in local America/Chicago wall-clock time ("YYYYMMDDTHHMMSS"), no
 * timezone conversion needed.
 *
 * Coverage: Nashville Public Library (Nashville, TN) — 22 branches
 *
 * Usage:
 *   node scraper-nashville-library-TN.js
 *
 * Cloud Function: scrapeNashvilleLibraryTNCloudFunction
 * Schedule: Group 3 (rotation slot freed up by removing the dead Communico entry)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'NashvilleLibrary-TN';
const STATE = 'TN';
const CITY = 'Nashville';

// Documented Export/Subscribe feed (JSON, sorted by start ascending, capped
// at 200 — Bedework's own max). Excludes the "Exhibits" category and limits
// to event/todo entity types, matching the site's own default filters.
const FEED_URL = 'https://events.library.nashville.org/feeder/main/eventsFeed.do' +
  '?f=y&sort=dtstart.utc:asc' +
  '&fexpr=' + encodeURIComponent('(categories.href!="/public/.bedework/categories/Exhibits") and (entity_type="event" or entity_type="todo")') +
  '&skinName=list-json&count=200';

// Nashville Public Library main branch (used as the default/fallback venue
// for "Online" events and any location.address that doesn't match a real
// branch below).
// Named "NPL Church Street Library" rather than the feed's generic "Main
// Library" — that exact phrase is a shared branch key in
// helpers/library-addresses.js used by dozens of unrelated library systems
// (Bedford VA, Easton MD, Rock Hill SC, Reading PA, Clarksville-Montgomery
// County TN, ...), and geocoding-helper.js's Strategy 0 matches event.venueName
// against every system's branch names via substring inclusion in both
// directions — so *any* name that still contains the phrase "main library"
// (even prefixed, e.g. "Nashville Main Library") re-triggers the same
// collision. Caught 2026-07-05: Nashville's own "Main Library" events
// geocoded to Clarksville-Montgomery County's branch (also TN, so the
// same-state guard didn't catch it). The rename below must avoid the
// "main library" substring entirely, not just prefix it.
const NPL_HQ = {
  name: 'NPL Church Street Library',
  city: CITY,
  state: STATE,
  address: '615 Church Street',
  zipCode: '37219',
  county: 'Davidson',
};

// Real per-branch addresses (from https://library.nashville.gov/locations,
// 2026-07-05) so each event geocodes to its actual branch instead of one
// shared HQ address. event.location.address values from the feed are
// matched against these `name` fields by findLibraryForEvent() in
// event-save-helper.js (substring match either direction).
const NPL_BRANCHES = [
  NPL_HQ,
  { name: 'Bellevue', city: CITY, state: STATE, address: '720 Baugh Road', zipCode: '37221', county: 'Davidson' },
  { name: 'Bordeaux', city: CITY, state: STATE, address: '4000 Clarksville Pike', zipCode: '37218', county: 'Davidson' },
  { name: 'Donelson', city: CITY, state: STATE, address: '2714 Old Lebanon Pike', zipCode: '37214', county: 'Davidson' },
  { name: 'East', city: CITY, state: STATE, address: '206 N 11th Street', zipCode: '37206', county: 'Davidson' },
  { name: 'Edgehill', city: CITY, state: STATE, address: '1409 12th Avenue South', zipCode: '37203', county: 'Davidson' },
  { name: 'Edmondson Pike', city: CITY, state: STATE, address: '5501 Edmondson Pike', zipCode: '37211', county: 'Davidson' },
  { name: 'Goodlettsville', city: 'Goodlettsville', state: STATE, address: '205 Rivergate Parkway', zipCode: '37072', county: 'Davidson' },
  { name: 'Green Hills', city: CITY, state: STATE, address: '3701 Benham Ave', zipCode: '37215', county: 'Davidson' },
  { name: 'Hadley Park', city: CITY, state: STATE, address: '1039 28th Ave N', zipCode: '37208', county: 'Davidson' },
  { name: 'Hermitage', city: 'Hermitage', state: STATE, address: '3700 James Kay Lane', zipCode: '37076', county: 'Davidson' },
  { name: 'Inglewood', city: CITY, state: STATE, address: '4312 Gallatin Pike', zipCode: '37216', county: 'Davidson' },
  { name: 'Looby', city: CITY, state: STATE, address: '2301 Rosa L Parks Blvd', zipCode: '37228', county: 'Davidson' },
  { name: 'Madison', city: 'Madison', state: STATE, address: '610 Gallatin Pike South', zipCode: '37115', county: 'Davidson' },
  { name: 'NECAT', city: CITY, state: STATE, address: '120 White Bridge Rd. #46', zipCode: '37209', county: 'Davidson' },
  { name: 'North', city: CITY, state: STATE, address: '1001 Monroe Street', zipCode: '37208', county: 'Davidson' },
  { name: 'Old Hickory', city: 'Old Hickory', state: STATE, address: '1010 Jones St', zipCode: '37138', county: 'Davidson' },
  { name: 'Pruitt', city: CITY, state: STATE, address: '117 Charles E. Davis Boulevard', zipCode: '37210', county: 'Davidson' },
  { name: 'Richland Park', city: CITY, state: STATE, address: '4711 Charlotte Ave', zipCode: '37209', county: 'Davidson' },
  { name: 'Southeast', city: 'Antioch', state: STATE, address: '5260 Hickory Hollow Pkwy #201', zipCode: '37013', county: 'Davidson' },
  { name: 'Thompson Lane', city: CITY, state: STATE, address: '380 Thompson Ln', zipCode: '37211', county: 'Davidson' },
  { name: 'Watkins Park', city: CITY, state: STATE, address: '612 17th Ave N', zipCode: '37203', county: 'Davidson' },
];

// Parse age range from title/description/categories text
function parseAgeRange(text) {
  const lower = text.toLowerCase();
  if (/\bbabies?\b|\binfants?\b|\b0-2\b/.test(lower)) return 'Babies & Toddlers (0-2)';
  if (/\btoddlers?\b|\bpreschool\b|\b3-5\b/.test(lower)) return 'Preschool (3-5)';
  if (/\bkids\b|\bchildren\b|\b6-8\b/.test(lower)) return 'Kids (6-8)';
  if (/\btween\b|\b9-12\b/.test(lower)) return 'Tweens (9-12)';
  if (/\bteens?\b|\b13-18\b/.test(lower)) return 'Teens (13-18)';
  return 'All Ages';
}

// Decode the HTML entities Bedework leaves in summary/description text
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Scrape events from Nashville Public Library's Bedework JSON feed
 */
async function scrapeNashvilleLibraryTN() {
  console.log('\n📚 NASHVILLE PUBLIC LIBRARY SCRAPER (Bedework)');
  console.log('='.repeat(60));
  console.log(`Source: ${FEED_URL}\n`);

  try {
    const response = await axios.get(FEED_URL, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const rawEvents = response.data?.bwEventList?.events || [];
    console.log(`  ✅ Found ${rawEvents.length} events in feed\n`);

    const events = [];
    for (const item of rawEvents) {
      const title = decodeEntities(item.summary);
      if (!title || title.length < 3) continue;

      // start.datetime is already local America/Chicago wall-clock time in
      // "YYYYMMDDTHHMMSS" format — convert to "YYYY-MM-DDTHH:MM:SS".
      const raw = item.start?.datetime || '';
      const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
      if (!m) continue; // skip events with no parseable start time
      const eventDate = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;

      const description = decodeEntities(item.description || '');
      // Rewrite the feed's generic "Main Library" to a disambiguated name —
      // see the NPL_HQ comment above for why the bare name causes a
      // cross-system geocoding collision.
      const rawVenue = (item.location?.address || '').trim();
      const venue = (!rawVenue || /^main library$/i.test(rawVenue)) ? NPL_HQ.name : rawVenue;
      const categories = (item.categories || []).join(' ');

      events.push({
        title,
        name: title,
        eventDate,
        date: eventDate,
        description: description.substring(0, 1000),
        url: item.eventlink || FEED_URL,
        venue,
        venueName: venue,
        location: CITY,
        ageRange: parseAgeRange(`${title} ${description} ${categories}`),
        metadata: {
          sourceName: 'Nashville Public Library',
          sourceUrl: FEED_URL,
          scrapedAt: new Date().toISOString()
        }
      });
    }

    if (events.length === 0) {
      console.log('⚠️  No events found\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

    console.log('💾 Saving events...\n');
    const result = await saveEventsWithGeocoding(events, NPL_BRANCHES, {
      scraperName: SCRAPER_NAME,
      state: STATE,
      category: 'library',
      platform: 'bedework'
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRAPER COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   Saved: ${result.saved}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Deleted: ${result.deleted}`);
    console.log('='.repeat(60) + '\n');

    return result;
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    return { saved: 0, skipped: 0, errors: 1, deleted: 0 };
  }
}

/**
 * Cloud Function wrapper
 */
async function scrapeNashvilleLibraryTNCloudFunction(req, res) {
  try {
    const result = await scrapeNashvilleLibraryTN();
    res.status(200).json({
      success: true,
      scraper: SCRAPER_NAME,
      ...result
    });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({
      success: false,
      scraper: SCRAPER_NAME,
      error: error.message
    });
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeNashvilleLibraryTN()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeNashvilleLibraryTN, scrapeNashvilleLibraryTNCloudFunction };

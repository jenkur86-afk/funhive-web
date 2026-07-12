#!/usr/bin/env node

/**
 * MONTGOMERY PARKS SCRAPER (Maryland)
 *
 * Scrapes family events from montgomeryparks.org RSS feed
 * Coverage: Montgomery County, Maryland (~1.1 million residents)
 *
 * Data Source: WordPress RSS Feed (events/feed/)
 * Estimated Events: 30-50 per month
 *
 * Usage:
 *   node scraper-montgomery-parks-md.js          # Test mode
 *   node scraper-montgomery-parks-md.js --full   # Full mode
 *
 * Cloud Function: scheduledMontgomeryParksMD
 * Schedule: Every 3 days
 */

const axios = require('axios');
const cheerio = require('cheerio');
// xml2js replaced with cheerio XML parsing (cheerio already loaded)
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');
const { launchBrowser } = require('./puppeteer-config');
const { geocodeWithFallback } = require('./helpers/geocoding-helper');

const SCRAPER_NAME = 'MontgomeryParks-MD';
const BASE_URL = 'https://montgomeryparks.org';
const RSS_FEED_URL = `${BASE_URL}/events/feed/`;

// Maximum days in future to scrape
const MAX_DAYS_AHEAD = 60;

// Montgomery County coordinates (for events without specific location)
const MONTGOMERY_COUNTY_CENTER = {
  latitude: 39.1547,
  longitude: -77.2405,
};

// Common Montgomery Parks locations
const PARK_LOCATIONS = {
  'Brookside Gardens': { lat: 39.0561, lng: -77.0489, city: 'Wheaton', zip: '20902' },
  'Cabin John Regional Park': { lat: 39.0339, lng: -77.1622, city: 'Bethesda', zip: '20817' },
  'Black Hill Regional Park': { lat: 39.2106, lng: -77.2933, city: 'Boyds', zip: '20841' },
  'Wheaton Regional Park': { lat: 39.0636, lng: -77.0494, city: 'Wheaton', zip: '20902' },
  'Rock Creek Regional Park': { lat: 39.1183, lng: -77.0669, city: 'Rockville', zip: '20853' },
  'Agricultural History Farm Park': { lat: 39.1636, lng: -77.2231, city: 'Derwood', zip: '20855' },
  'Little Bennett Regional Park': { lat: 39.2728, lng: -77.2844, city: 'Clarksburg', zip: '20871' },
  'Meadowside Nature Center': { lat: 39.1236, lng: -77.0656, city: 'Rockville', zip: '20855' },
  'Locust Grove Nature Center': { lat: 39.0922, lng: -77.0656, city: 'Bethesda', zip: '20814' },
};

/**
 * Get coordinates for a park/venue
 */
function getLocationCoordinates(venueName) {
  if (!venueName) return MONTGOMERY_COUNTY_CENTER;

  const lowerVenue = venueName.toLowerCase();
  for (const [parkName, coords] of Object.entries(PARK_LOCATIONS)) {
    if (lowerVenue.includes(parkName.toLowerCase()) || parkName.toLowerCase().includes(lowerVenue)) {
      return { latitude: coords.lat, longitude: coords.lng, city: coords.city, zip: coords.zip };
    }
  }

  return MONTGOMERY_COUNTY_CENTER;
}

/**
 * Parse age range from event text
 */
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lower = text.toLowerCase();

  // Check for 55+ pattern (senior programs)
  if (text.match(/55\+|senior/i)) return 'Seniors (55+)';

  // Keyword matching
  if (lower.includes('adult') && !lower.includes('family')) return 'Adults';
  if (lower.includes('teen')) return 'Teens';
  if (lower.includes('family') || lower.includes('all ages')) return 'All Ages';
  if (lower.includes('toddler')) return 'Toddlers (1-3)';
  if (lower.includes('preschool')) return 'Preschool (3-5)';
  if (lower.includes('kid') || lower.includes('child')) return 'Children';

  return 'All Ages';
}

/**
 * Strip HTML tags
 */
function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, ' ').trim();
}

/**
 * Fetch RSS feed
 */
async function fetchRssFeed() {
  console.log(`\n📅 Fetching RSS feed from: ${RSS_FEED_URL}`);

  try {
    const response = await axios.get(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'FunHive/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      timeout: 30000,
    });

    // Parse XML with cheerio instead of xml2js
    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      items.push({
        title: $(el).find('title').text(),
        link: $(el).find('link').text(),
        description: $(el).find('description').text(),
        'content:encoded': $(el).find('content\\:encoded').text(),
        pubDate: $(el).find('pubDate').text(),
      });
    });
    console.log(`  Found ${items.length} events in RSS feed`);

    return items;

  } catch (error) {
    console.log(`  ⚠️ Error fetching RSS feed: ${error.message}`);
    return [];
  }
}

/**
 * The RSS feed's <pubDate> is when the post was PUBLISHED to the feed, not when
 * the event actually happens - using it as eventDate meant every event looked
 * "past" the moment it aged out of pubDate's own recency, and got silently
 * rejected. The real date/time/location only exist on the individual event
 * page, and the site is behind Cloudflare (blocks plain HTTP clients), so this
 * needs a real Puppeteer page load, not axios.
 */
async function fetchEventDateTimeLocation(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    return await page.evaluate(() => {
      const date = document.querySelector('.content .date')?.textContent.trim() || '';
      const time = document.querySelector('.content .time')?.textContent.trim() || '';
      const all = [...document.querySelectorAll('div')];
      const locBlock = all.find(el => el.children.length && el.textContent.trim().startsWith('Location:') && el.querySelector('strong'));
      let address = '';
      if (locBlock) {
        address = locBlock.textContent.replace(/^\s*Location:\s*/i, '').trim();
      }
      return { date, time, address };
    });
  } catch (error) {
    console.log(`  ⚠️ Error fetching event page ${url}: ${error.message}`);
    return { date: '', time: '', address: '' };
  }
}

/**
 * Save events to database
 */
async function saveEvents(events) {
  if (events.length === 0) return { saved: 0, failed: 0 };

  const batch = db.batch();
  let saved = 0, failed = 0;

  for (const event of events) {
    try {
      const eventId = generateEventId(event.url);
      const docRef = db.collection('events').doc(eventId);
      batch.set(docRef, event, { merge: true });
      saved++;
    } catch (error) {
      failed++;
    }
  }

  try {
    const commitResult = await batch.commit();
    const skippedCount = commitResult?.skippedReasons?.length || 0;
    if (skippedCount > 0) {
      saved -= skippedCount;
      console.log(`  ⏭️  ${skippedCount} event(s) rejected at save time (past/cancelled/junk-title/etc.)`);
    }
  } catch (error) {
    console.error('Batch commit error:', error.message);
    failed = events.length;
    saved = 0;
  }

  return { saved, failed };
}

/**
 * Main scraper function
 */
async function scrapeMontgomeryParks(options = {}) {
  console.log(`\n🏞️  MONTGOMERY PARKS SCRAPER`);
  console.log(`📍 Coverage: Montgomery County, Maryland`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allEvents = [];

  // Fetch RSS feed
  const rssItems = await fetchRssFeed();

  // The RSS feed only gives us pubDate (when the post was published), not the
  // real event date - visit each event page via Puppeteer (site is behind
  // Cloudflare) to get the actual date/time/location.
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Process each RSS item
  for (const item of rssItems) {
    try {
      const title = item.title || '';
      const link = item.link || '';
      const description = stripHtml(item['content:encoded'] || item.description || '');

      // Skip if no title
      if (!title || title.length < 3) continue;

      // Parse age range
      const ageText = parseAgeRange(`${title} ${description}`);

      // Skip adult-only and senior-only events
      if (ageText === 'Adults' || ageText === 'Seniors (55+)') {
        console.log(`  Skipping adult/senior event: ${title.substring(0, 40)}...`);
        continue;
      }

      if (!link) {
        console.log(`  Skipping event with no link: ${title.substring(0, 40)}...`);
        continue;
      }

      const { date: realDate, time: realTime, address: realAddress } = await fetchEventDateTimeLocation(page, link);
      if (!realDate) {
        console.log(`  Skipping event, could not find real date on page: ${title.substring(0, 40)}...`);
        continue;
      }

      const timeMatch = realTime.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
      const eventStartTime = timeMatch ? timeMatch[1].replace(/\s+/, ' ') : null;
      const eventEndTime = timeMatch ? timeMatch[2].replace(/\s+/, ' ') : null;

      // Normalize date format
      const normalizedDate = normalizeDateString(eventStartTime ? `${realDate} ${eventStartTime}` : realDate);
      if (!normalizedDate) {
        console.log(`  Skipping event with invalid date: "${realDate}"`);
        continue;
      }

      // Find park in title/description/address (fall back to static list only if
      // the real address didn't geocode)
      let venue = 'Montgomery Parks';
      const fullText = `${title} ${description} ${realAddress}`;
      for (const parkName of Object.keys(PARK_LOCATIONS)) {
        if (fullText.toLowerCase().includes(parkName.toLowerCase())) {
          venue = parkName;
          break;
        }
      }

      // Geocode the real address first; fall back to the static park list, then county center
      let coordinates = realAddress
        ? await geocodeWithFallback(`${realAddress}, MD`, {
            state: 'MD', county: 'Montgomery', venueName: venue, sourceName: 'Montgomery Parks'
          })
        : null;
      const staticCoords = getLocationCoordinates(venue);
      const coords = coordinates
        ? { latitude: coordinates.latitude, longitude: coordinates.longitude, city: staticCoords.city, zip: staticCoords.zip }
        : staticCoords;

      // Categorize
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: title,
        description: description.substring(0, 500),
      });

      // Determine cost
      let cost = 'See website';
      if (description.toLowerCase().includes('free')) cost = 'Free';
      const priceMatch = description.match(/\$(\d+(?:\.\d{2})?)/);
      if (priceMatch) cost = `$${priceMatch[1]}`;

      const event = {
        name: title,
        eventDate: normalizedDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        description: description.substring(0, 1000),
        venue,
        address: realAddress || '',
        city: coords.city || 'Montgomery County',
        state: 'MD',
        zipCode: coords.zip || '',
        location: {
          latitude: coords.latitude || MONTGOMERY_COUNTY_CENTER.latitude,
          longitude: coords.longitude || MONTGOMERY_COUNTY_CENTER.longitude,
        },
        geohash: ngeohash.encode(
          coords.latitude || MONTGOMERY_COUNTY_CENTER.latitude,
          coords.longitude || MONTGOMERY_COUNTY_CENTER.longitude,
          7
        ),
        ageRange: ageText,
        cost,
        parentCategory,
        displayCategory,
        subcategory,
        url: link || `${BASE_URL}/events/`,
        imageUrl: '',
        metadata: {
          sourceName: 'Montgomery Parks',
          sourceUrl: BASE_URL,
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'wordpress-rss',
          state: 'MD',
          county: 'Montgomery',
          addedDate: new Date().toISOString(),
        },
      };

      allEvents.push(event);
      console.log(`  ✅ ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);

    } catch (error) {
      console.log(`  ⚠️ Error parsing event: ${error.message}`);
    }
  }

  await browser.close();

  console.log(`\n📊 SAVING TO FIRESTORE`);
  console.log('-'.repeat(40));

  const { saved, failed } = await saveEvents(allEvents);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPER COMPLETE`);
  console.log(`   Events in RSS: ${rssItems.length}`);
  console.log(`   Events processed: ${allEvents.length}`);
  console.log(`   Events saved: ${saved}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventsImported: saved,
      eventsFailed: failed,
      eventsFound: rssItems.length,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { imported: saved, failed, total: allEvents.length };
}

/**
 * Cloud Function export
 */
async function scrapeMontgomeryParksCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeMontgomeryParks();
}

// Run if executed directly
if (require.main === module) {
  console.log(`\n🚀 Starting Montgomery Parks Scraper`);

  scrapeMontgomeryParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMontgomeryParks,
  scrapeMontgomeryParksCloudFunction,
};

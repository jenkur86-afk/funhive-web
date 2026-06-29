#!/usr/bin/env node

/**
 * PRINCE GEORGE'S COUNTY PARKS SCRAPER (Maryland)
 *
 * Scrapes family events from PG Parks & Recreation
 * Platform: WordPress with The Events Calendar (Tribe Events)
 * Coverage: Prince George's County, Maryland (~900,000+ residents)
 *
 * Data Source: https://pgparks.com/activities-events-events
 * Estimated Events: 50-100+ per month
 *
 * Usage:
 *   node scraper-pgparks-md.js          # Test mode (first 50 events)
 *   node scraper-pgparks-md.js --full   # Full mode (all events)
 *
 * Cloud Function: scheduledPGParksMD
 * Schedule: Every 3 days
 */

const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { geocodeWithFallback } = require('./helpers/geocoding-helper');
const { categorizeEvent } = require('./event-categorization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const SCRAPER_NAME = 'PGParks-MD';
const BASE_URL = 'https://pgparks.com';
const CALENDAR_URL = `${BASE_URL}/activities-events-events`;
const MAX_DAYS_AHEAD = 60;

// PG County center coordinates — used as geocoding fallback context only
const PG_COUNTY_CENTER = {
  latitude: 38.8286,
  longitude: -76.8453,
};

// Known park coordinates — avoids Nominatim calls for common venues
const PARK_LOCATIONS = {
  'Watkins Regional Park': { lat: 38.8872, lng: -76.8308, city: 'Upper Marlboro', zip: '20774', address: '301 Watkins Park Dr, Upper Marlboro, MD 20774' },
  'Lake Artemesia': { lat: 38.9842, lng: -76.9342, city: 'College Park', zip: '20740', address: '5801 Berwyn Rd, College Park, MD 20740' },
  'Riversdale House Museum': { lat: 38.9536, lng: -76.9389, city: 'Riverdale Park', zip: '20737', address: '4811 Riverdale Rd, Riverdale Park, MD 20737' },
  'Bladensburg Waterfront Park': { lat: 38.9397, lng: -76.9347, city: 'Bladensburg', zip: '20710', address: '4601 Annapolis Rd, Bladensburg, MD 20710' },
  'Allen Pond Park': { lat: 38.9575, lng: -76.7289, city: 'Bowie', zip: '20716', address: '3330 Northview Dr, Bowie, MD 20716' },
  'Tucker Road Ice Rink': { lat: 38.8014, lng: -76.8886, city: 'Fort Washington', zip: '20744', address: '1771 Tucker Rd, Fort Washington, MD 20744' },
  "Prince George's Sports and Learning Complex": { lat: 38.8583, lng: -76.9003, city: 'Landover', zip: '20785', address: '8001 Sheriff Rd, Landover, MD 20785' },
  'Fairland Regional Park': { lat: 39.0614, lng: -76.9256, city: 'Laurel', zip: '20708', address: '13950 Old Gunpowder Rd, Laurel, MD 20708' },
  'Walker Mill Regional Park': { lat: 38.8731, lng: -76.8722, city: 'Capitol Heights', zip: '20743', address: '11400 Penn Mar Rd, Capitol Heights, MD 20743' },
  'Cosca Regional Park': { lat: 38.7256, lng: -76.8975, city: 'Clinton', zip: '20735', address: '11000 Thrift Rd, Clinton, MD 20735' },
};

function getParkLocation(venueName) {
  if (!venueName) return null;
  const lower = venueName.toLowerCase();
  for (const [name, loc] of Object.entries(PARK_LOCATIONS)) {
    if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
      return loc;
    }
  }
  return null;
}

function parseAgeRange(text) {
  if (!text) return 'All Ages';
  const lower = text.toLowerCase();
  const ageMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(yrs?|years?)?/i);
  if (ageMatch) {
    const minAge = parseInt(ageMatch[1]);
    const maxAge = parseInt(ageMatch[2]);
    if (minAge <= 3) return 'Toddlers (1-3)';
    if (minAge <= 5 && maxAge <= 6) return 'Preschool (3-5)';
    if (maxAge <= 12) return 'Elementary (6-12)';
    if (maxAge <= 18) return 'Teens';
  }
  if (lower.includes('adult') && !lower.includes('family')) return 'Adults';
  if (lower.includes('senior')) return 'Seniors';
  if (lower.includes('teen')) return 'Teens';
  if (lower.includes('family') || lower.includes('all ages')) return 'All Ages';
  if (lower.includes('toddler')) return 'Toddlers (1-3)';
  if (lower.includes('preschool')) return 'Preschool (3-5)';
  if (lower.includes('kid') || lower.includes('child')) return 'Children';
  return 'All Ages';
}

function parseCost(text) {
  if (!text) return 'See website';
  const lower = text.toLowerCase();
  if (lower.includes('free')) return 'Free';
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) return `$${priceMatch[1]}`;
  return 'See website';
}

async function fetchEvents(maxEvents = 100) {
  console.log(`\n📅 Fetching events from: ${CALENDAR_URL}`);

  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('  Navigating to calendar page...');
    await page.goto(CALENDAR_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

    await page.waitForSelector('article, .tribe-events-calendar-list__event, .tribe-common-g-row, article[class*="event"], .event-card, [class*="event-item"]', { timeout: 15000 }).catch(() => {
      console.log('  ⚠️ No standard event selectors found, checking for other content...');
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const rawEvents = await page.evaluate((baseUrl, maxEventsLimit) => {
      const events = [];

      const eventSelectors = [
        'article',
        '.tribe-events-calendar-list__event',
        '.tribe-common-g-row.tribe-events-calendar-list__event-row',
        'article.tribe-events-calendar-list__event-row',
        '.tribe-events-list-event',
        '.event-card',
        '[class*="event-item"]',
        '.wp-block-tribe-events-event-datetime',
        'article[class*="event"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          eventElements = Array.from(found);
          break;
        }
      }

      // Fallback: JSON-LD structured data
      if (eventElements.length === 0) {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'Event' || (Array.isArray(data) && data[0]?.['@type'] === 'Event')) {
              const eventData = Array.isArray(data) ? data : [data];
              eventData.forEach(e => {
                if (e['@type'] === 'Event' && e.name) {
                  events.push({ title: e.name, link: e.url || window.location.href, dateText: e.startDate || '', timeText: '', venue: e.location?.name || '', description: e.description || '' });
                }
              });
            }
          } catch (err) {}
        });
        return events;
      }

      eventElements.slice(0, maxEventsLimit).forEach(el => {
        try {
          const titleEl = el.querySelector('.tribe-events-pro-photo__event-title-link, .tribe-events-pro-photo__event-title a, .tribe-events-calendar-list__event-title a, .tribe-events-list-event-title a, h3 a, h2 a, .event-title a, a[class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 3) return;

          let link = titleEl?.href || '';
          if (link && !link.startsWith('http')) link = baseUrl + link;

          const dateEl = el.querySelector('.tribe-events-pro-photo__event-date-tag-datetime, .tribe-events-pro-photo__event-datetime, .tribe-events-calendar-list__event-datetime, time, .tribe-event-date-start, [datetime], .event-date');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';

          const venueEl = el.querySelector('.tribe-events-pro-photo__event-venue, .tribe-events-calendar-list__event-venue, .tribe-events-venue, .tribe-venue, .event-venue, .location');
          const venue = venueEl?.textContent?.trim() || '';

          const descEl = el.querySelector('.event-summary, .tribe-events-calendar-list__event-description, .tribe-events-list-event-description, .event-description, p');
          const description = (descEl?.textContent?.trim() || '').substring(0, 500);

          const timeEl = el.querySelector('.tribe-events-pro-photo__event-datetime, .tribe-events-calendar-list__event-datetime-time, .tribe-event-time, .event-time');
          const timeText = timeEl?.textContent?.trim() || '';

          events.push({ title, link, dateText, timeText, venue, description });
        } catch (err) {}
      });

      return events;
    }, BASE_URL, maxEvents);

    console.log(`  Found ${rawEvents.length} raw events`);

    for (const raw of rawEvents) {
      if (events.length >= maxEvents) break;

      let eventDate = null;
      if (raw.dateText) {
        eventDate = new Date(raw.dateText);
        if (isNaN(eventDate.getTime())) {
          const parsed = Date.parse(raw.dateText);
          if (!isNaN(parsed)) eventDate = new Date(parsed);
        }
      }

      if (!eventDate || isNaN(eventDate.getTime())) continue;
      if (eventDate < today || eventDate > maxDate) continue;

      events.push({ ...raw, eventDate, fullText: `${raw.title} ${raw.description}` });
    }

    console.log(`  Total valid events: ${events.length}`);
    return events;

  } catch (error) {
    console.log(`  ⚠️ Error fetching events: ${error.message}`);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapePGParks(options = {}) {
  const { maxEvents = 100 } = options;

  console.log(`\n🏞️  PRINCE GEORGE'S COUNTY PARKS SCRAPER`);
  console.log(`📍 Coverage: Prince George's County, Maryland`);
  console.log(`📄 Max events: ${maxEvents}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const rawEvents = await fetchEvents(maxEvents);

  console.log(`\n📊 SAVING TO SUPABASE`);
  console.log('-'.repeat(40));

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of rawEvents) {
    try {
      // Skip adult/senior-only events
      const ageRange = parseAgeRange(raw.fullText);
      if (ageRange === 'Adults' || ageRange === 'Seniors') {
        skipped++;
        continue;
      }

      // Resolve coordinates — known park lookup first, geocoding fallback second
      const knownLoc = getParkLocation(raw.venue);
      let latitude, longitude, venueCity, venueZip, venueAddress;

      if (knownLoc) {
        latitude = knownLoc.lat;
        longitude = knownLoc.lng;
        venueCity = knownLoc.city;
        venueZip = knownLoc.zip;
        venueAddress = knownLoc.address;
      } else {
        // Geocode via rate-limited helper (3.5s min delay, Photon fallback, cache)
        const geocodeQuery = raw.venue
          ? `${raw.venue}, Prince George's County, MD`
          : `Prince George's County, MD`;

        const coords = await geocodeWithFallback(geocodeQuery, {
          city: 'Upper Marlboro',
          state: 'MD',
          county: "Prince George's",
          venueName: raw.venue || 'PG Parks',
          sourceName: 'PG Parks & Recreation'
        });

        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        } else {
          latitude = PG_COUNTY_CENTER.latitude;
          longitude = PG_COUNTY_CENTER.longitude;
        }
        venueCity = 'Upper Marlboro';
        venueZip = '';
        venueAddress = '';
      }

      const geohash = ngeohash.encode(latitude, longitude, 7);
      const eventDateStr = raw.eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: raw.title,
        description: raw.description,
      });

      const eventDoc = {
        name: raw.title,
        venue: raw.venue || 'PG Parks & Recreation',
        eventDate: eventDateStr,
        startTime: raw.timeText || null,
        endTime: null,
        description: raw.description || '',
        cost: parseCost(raw.fullText),
        ageRange,
        parentCategory,
        displayCategory,
        subcategory,
        state: 'MD',
        geohash,
        location: {
          name: raw.venue || 'PG Parks & Recreation',
          address: venueAddress,
          city: venueCity,
          state: 'MD',
          zipCode: venueZip,
          coordinates: { latitude, longitude }
        },
        contact: {
          website: raw.link || CALENDAR_URL,
          phone: ''
        },
        url: raw.link || CALENDAR_URL,
        metadata: {
          source: 'PG Parks Scraper',
          sourceName: 'PG Parks & Recreation',
          county: "Prince George's",
          state: 'MD',
          platform: 'tribe-events',
          addedDate: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      const activityId = await linkEventToVenue(eventDoc);
      if (activityId) eventDoc.activityId = activityId;

      await db.collection('events').add(eventDoc);
      console.log(`  ✅ ${raw.title.substring(0, 65)}${raw.title.length > 65 ? '...' : ''}`);
      saved++;

    } catch (error) {
      console.error(`  ❌ ${raw.title?.substring(0, 40)}:`, error.message);
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPER COMPLETE`);
  console.log(`   Events found: ${rawEvents.length}`);
  console.log(`   Events saved: ${saved}`);
  console.log(`   Skipped (adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  await logScraperResult('PG Parks & Recreation', {
    found: rawEvents.length,
    new: saved,
    duplicates: skipped,
    errors: failed
  }, { dataType: 'events', state: 'MD' });

  return { imported: saved, failed, total: rawEvents.length };
}

async function scrapePGParksCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapePGParks({ maxEvents: 150 });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fullMode = args.includes('--full');
  const maxEvents = fullMode ? 150 : 50;

  console.log(`\n🚀 Starting PG Parks Scraper (${fullMode ? 'Full' : 'Test'} Mode)`);

  scrapePGParks({ maxEvents })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapePGParks, scrapePGParksCloudFunction };

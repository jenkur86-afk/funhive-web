/**
 * SOMERSET COUNTY LIBRARY SCRAPER
 *
 * Scrapes events from Somerset County Library
 * Uses Google Calendar API interception
 *
 * COVERAGE:
 * - Somerset County, MD (26,000+ population)
 *
 * Note: Somerset library still embeds a Google Calendar widget, but as of a
 * 2026-08-02 site redesign it moved off the homepage onto three separate
 * "programs" pages (adultprograms.php / childprograms.php / teenprograms.php),
 * each with its own set of Google Calendar IDs. This scraper visits all three
 * and uses Puppeteer request interception to capture the Google Calendar API
 * calls on each, same as the old homepage-only approach.
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Somerset County Library',
  url: 'https://www.somelibrary.org',
  county: 'Somerset',
  state: 'MD',
  website: 'https://www.somelibrary.org',
  city: 'Princess Anne',
  zipCode: '21853'
};

// The redesigned site (as of 2026-08-02) no longer embeds a calendar on the
// homepage. The real Google Calendar widgets now live on these three pages.
const PROGRAM_PAGES = [
  'https://www.somelibrary.org/adultprograms.php',
  'https://www.somelibrary.org/childprograms.php',
  'https://www.somelibrary.org/teenprograms.php'
];

// Branch lookup — the Google Calendar API's `location` field on each event
// identifies which physical branch it's at (confirmed live 2026-08-03: values
// like "Crisfield Library, 100 Collins St, Crisfield, MD 21817, USA" or the
// bare name "Princess Anne Library"). Coordinates geocoded once via Nominatim.
// Falls back to the Princess Anne branch (the county's main branch) when an
// event has no location field at all, matching the scraper's prior behavior
// of defaulting every event to Princess Anne's coordinates.
const BRANCHES = [
  {
    match: /crisfield/i,
    name: 'Crisfield Library',
    address: '100 Collins St',
    city: 'Crisfield',
    zipCode: '21817',
    latitude: 37.9852,
    longitude: -75.8544
  },
  {
    match: /ewell|smith island/i,
    name: 'Ewell Library',
    address: '4005 Smith Island Rd',
    city: 'Ewell',
    zipCode: '21824',
    latitude: 37.9945,
    longitude: -76.0341
  },
  {
    match: /princess anne/i,
    name: 'Somerset County Library',
    address: '11767 Beechwood St',
    city: 'Princess Anne',
    zipCode: '21853',
    latitude: 38.2044,
    longitude: -75.6921
  }
];
const DEFAULT_BRANCH = BRANCHES[2]; // Princess Anne — matches prior default

function resolveBranch(locationText) {
  if (locationText) {
    for (const branch of BRANCHES) {
      if (branch.match.test(locationText)) return branch;
    }
  }
  return DEFAULT_BRANCH;
}

// Geocode address
async function geocodeAddress(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
      },
      headers: {
        'User-Agent': 'FunHive/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

// Parse age range from event text
function parseAgeRange(eventText) {
  if (!eventText) return 'All Ages';

  const lowerText = eventText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages|everyone/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Somerset
async function scrapeSomersetEvents() {
  console.log(`\n📚 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   Pages: ${PROGRAM_PAGES.join(', ')}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    // Intercept network requests to find calendar data API calls. Each of the
    // three program pages embeds its own Google Calendar widget(s), so we
    // navigate to all three (reusing one page + one set of listeners) and
    // aggregate the API responses across all of them before extracting events.
    const apiResponses = [];

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setRequestInterception(true);

    page.on('request', request => {
      // Interception can race with navigation teardown; a double-handled request
      // throws and would otherwise surface as an unhandled rejection.
      try { request.continue(); } catch (err) { /* already handled */ }
    });

    // The embedded Google Calendar widgets POLL, so the same calendar URL comes
    // back many times per page. Keying by URL bounds this to one entry per
    // calendar instead of letting the array grow without limit — which on
    // 2026-08-10 made the run never finish (see the snapshot note below).
    const seenApiUrls = new Set();
    const MAX_API_RESPONSES = 200;

    page.on('response', async response => {
      const url = response.url();
      // Look for calendar-related API calls or JSON responses
      if (url.includes('calendar') || url.includes('event') || url.includes('google') ||
          url.includes('.json') || url.includes('/api/')) {
        if (seenApiUrls.has(url)) return;
        if (apiResponses.length >= MAX_API_RESPONSES) return;
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            seenApiUrls.add(url);
            apiResponses.push({ url, data });
            console.log(`   📡 Found API call: ${url.substring(0, 80)}...`);
          }
        } catch (err) {
          // Ignore errors parsing response
        }
      }
    });

    for (const pageUrl of PROGRAM_PAGES) {
      try {
        console.log(`   🌐 Navigating to ${pageUrl}`);
        await page.goto(pageUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for page to load and any calendar widgets to initialize
        await page.waitForSelector('body', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 8000)); // Longer wait for calendar rendering
      } catch (navErr) {
        console.log(`   ⚠️  Error navigating to ${pageUrl}: ${navErr.message}`);
      }
    }

    // Detach the listeners before processing. The calendar widgets keep polling
    // in the background for as long as the page is open, and the loop below used
    // to iterate `apiResponses` directly — a for...of over an array that the
    // still-attached handler was appending to never terminates. That is what hung
    // the 2026-08-10 run for 16+ minutes with no completion line.
    page.removeAllListeners('response');
    page.removeAllListeners('request');

    console.log(`   📡 Captured ${apiResponses.length} API responses across ${PROGRAM_PAGES.length} pages\n`);

    // Try to extract events from API responses first (Google Calendar)
    // Somerset has MULTIPLE calendars, so we need to aggregate events from all of them
    let events = [];
    let totalItemsFound = 0;

    // Snapshot as a second guard, so a late in-flight handler cannot extend the
    // sequence being iterated even if detaching missed one.
    const capturedResponses = apiResponses.slice();

    for (const apiResp of capturedResponses) {
      try {
        // Look for Google Calendar API response
        if ((apiResp.url.includes('google.com/calendar') || apiResp.url.includes('somelibrary')) &&
            apiResp.data && Array.isArray(apiResp.data.items)) {

          totalItemsFound += apiResp.data.items.length;

          // Map Google Calendar items to event format
          const calendarEvents = apiResp.data.items.map(item => {
            // Extract date from Google Calendar format
            // Use standard parseable format: "December 15, 2025 2:30 PM"
            let eventDate = '';
            if (item.start) {
              if (item.start.dateTime) {
                const d = new Date(item.start.dateTime);
                const monthName = d.toLocaleString('en-US', { month: 'long' });
                const day = d.getDate();
                const year = d.getFullYear();
                const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                eventDate = `${monthName} ${day}, ${year} ${time}`;
              } else if (item.start.date) {
                const d = new Date(item.start.date);
                const monthName = d.toLocaleString('en-US', { month: 'long' });
                const day = d.getDate();
                const year = d.getFullYear();
                eventDate = `${monthName} ${day}, ${year}`;
              }
            }

            return {
              name: item.summary || '',
              eventDate: eventDate,
              // Raw Google Calendar `location` text — used only to resolve which
              // physical branch (Princess Anne / Crisfield / Ewell) the event is
              // at. It's NOT the final venue name saved to the DB.
              rawLocation: item.location || '',
              description: item.description || '',
              url: item.htmlLink || ''
            };
          }).filter(e => {
            // Filter out general US holidays
            const holidayKeywords = ['veterans day', 'election day', 'thanksgiving',
                                    'halloween', 'black friday', 'daylight saving',
                                    'independence day', 'memorial day', 'labor day',
                                    'christmas', 'new year'];
            const lowerName = e.name.toLowerCase();
            const isHoliday = holidayKeywords.some(keyword => lowerName.includes(keyword));

            return e.name && e.eventDate && !isHoliday;
          });

          // Add events from this calendar to the aggregate list
          events.push(...calendarEvents);
        }
      } catch (err) {
        console.log(`   ⚠️  Error parsing API response: ${err.message}`);
      }
    }

    if (totalItemsFound > 0) {
      console.log(`   🔍 Found ${totalItemsFound} total items across all calendars`);
    }

    // Dedup: each program page loads its calendar widget twice (a desktop
    // agenda view + a separate mobile view), and a couple of calendar IDs are
    // shared across pages (e.g. the "Programs To Go" calendar appears on both
    // adultprograms.php and childprograms.php), so the same Google Calendar
    // item can show up in apiResponses several times. Collapse on
    // name+eventDate+rawLocation before processing so we don't do redundant
    // duplicate-check DB round-trips or inflate the found/new counts.
    if (events.length > 0) {
      const seen = new Set();
      const deduped = [];
      for (const e of events) {
        const key = `${e.name.toLowerCase().trim()}|${e.eventDate}|${e.rawLocation.toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(e);
        }
      }
      console.log(`   ✅ Extracted ${deduped.length} unique library events (from ${events.length} raw, holidays filtered)`);
      events = deduped;
    }

    // If no events from API, try scraping the DOM
    if (events.length === 0) {
      console.log('   🔍 No events from API, trying DOM extraction...\n');
      events = await page.evaluate(() => {
      const results = [];

      // Look for any event listings on the homepage or program pages
      const selectors = [
        'article',
        '[class*="event"]',
        '[class*="program"]',
        'h1, h2, h3, h4'
      ];

      const headings = document.querySelectorAll('h1, h2, h3, h4');

      headings.forEach(heading => {
        try {
          const text = heading.textContent.trim();

          // Look for text that might indicate events/programs
          if (text.match(/program|event|story\s*time|craft|activity/i) && text.length > 5) {
            const container = heading.parentElement;
            if (!container) return;

            const fullText = container.textContent;

            // Try to find date patterns
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);

            if (dateMatch) {
              let timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);

              results.push({
                name: text,
                eventDate: timeMatch ? `${dateMatch[0]} ${timeMatch[0]}` : dateMatch[0],
                venue: '',
                description: fullText.substring(0, 200),
                url: ''
              });
            }
          }
        } catch (err) {
          console.log('Error parsing potential event:', err);
        }
      });

      return results;
      });
    }

    console.log(`   Found ${events.length} potential events\n`);

    if (events.length === 0) {
      console.log('   ⚠️  No events found on website.');
      console.log('   Somerset County Library uses PDF program booklets.');
      console.log('   Manual import or PDF parsing may be required.\n');
    }

    // Process each event
    for (const event of events) {
      try {
        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(`${event.name} ${event.description}`);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Resolve which physical branch this event is at from the Google
        // Calendar item's raw location text (falls back to Princess Anne,
        // the county's main branch, same as the scraper's prior behavior).
        const branch = resolveBranch(event.rawLocation);

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: branch.name,
          state: LIBRARY.state, // CRITICAL: Add state field
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          geohash: ngeohash.encode(branch.latitude, branch.longitude, 7), // Add geohash
          location: {
            name: branch.name,
            address: branch.address,
            city: branch.city,
            state: LIBRARY.state,
            zipCode: branch.zipCode,
            latitude: branch.latitude,
            longitude: branch.longitude
          },
          contact: {
            website: LIBRARY.website,
            phone: '(410) 651-0852'
          },
          // CRITICAL: use the per-event Google Calendar htmlLink (event.url,
          // populated from item.htmlLink), NOT the generic library homepage.
          // Bug found 2026-08-03: this used to hardcode LIBRARY.website for
          // every single event. _stableEventId() (supabase-adapter.js) derives
          // each row's id primarily from a hash of the `url` field, so every
          // event from this scraper collapsed onto the SAME id and only the
          // very first insert ever landed — every event after that silently
          // hit a 23505 duplicate-key conflict (returned as `{duplicate:true}`,
          // not `{skipped:true}`), which this file's own success-logging only
          // checks for `.skipped`, so it kept logging "✅ imported" and
          // incrementing `imported` on every run while writing at most one
          // real row to the DB. Confirmed live: before this fix, a DB query
          // for `url = 'https://www.somelibrary.org'` returned 483 rows
          // accumulated from the pre-2026-05-14 random-UUID era, but only ONE
          // row existed with today's stable hash id. Each Google Calendar item
          // has a unique, stable per-occurrence htmlLink, so using it gives
          // every event its own id (and a real deep link instead of the
          // homepage as a bonus).
          url: event.url || LIBRARY.website,
          metadata: {
            scraperName: 'Somerset-County',
            source: 'Somerset Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: LIBRARY.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', LIBRARY.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        const addResult = await db.collection('events').add(eventDoc);
        if (addResult.skipped) {
          console.log(`  ⏭️  ${addResult.skipReason}`);
          skipped++;
        } else if (addResult.duplicate) {
          // The pre-check above only matches on name+eventDate+sourceName (no
          // venue), so it can miss a real conflict on the DB's content-based
          // unique index (name+event_date+venue+description+city+address).
          // Bug found 2026-08-03 verifying the site-change fix: this branch
          // used to fall into the `else` below and count as imported even
          // though nothing was actually written — e.g. this scraper's
          // recurring-series events (Gaming, Mother Goose on the Loose,
          // S.T.E.A.M., etc) were already captured with future dates out to
          // April 2027 before the 2026-08-02 outage, so most re-scraped
          // occurrences are genuine duplicates, not new rows.
          skipped++;
        } else {
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        }
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SOMERSET SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to database
  await logScraperResult('Somerset County Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeSomersetEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeSomersetEvents };

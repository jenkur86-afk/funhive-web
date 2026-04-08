#!/usr/bin/env node

/**
 * HAMPTON PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Hampton Public Library
 *
 * KNOWN LIMITATION: Hampton uses BeWith/WithApps platform at calendar.hampton.gov
 * which loads events dynamically via React/JavaScript. The events are not available
 * in the initial HTML and API interception is complex. This scraper attempts multiple
 * approaches but may return 0 events due to the dynamic loading.
 *
 * COVERAGE (1 library system in VA):
 * - Hampton Public Library (Hampton, VA) - 135,000 population
 *
 * FUTURE IMPROVEMENTS:
 * - Request iCal/RSS feed access from Hampton library
 * - Use Puppeteer with longer wait times and scroll triggers
 * - Intercept API calls to api.withapps.io
 *
 * Usage:
 *   node functions/scrapers/scraper-withapps-libraries-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Hampton Public Library',
  calendarUrl: 'https://calendar.hampton.gov/hamptonva/calendar',
  libraryPage: 'https://www.hampton.gov/100/Libraries',
  county: 'Hampton',
  state: 'VA',
  website: 'https://www.hampton.gov/100/Libraries',
  city: 'Hampton',
  zipCode: '23669',
  // Default coordinates for Hampton Main Library
  defaultLat: 37.0299,
  defaultLon: -76.3452
};

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';
  const lowerText = text.toLowerCase();

  if (lowerText.match(/adults? only|18\+|21\+/i)) return 'Adults';
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Hampton library
async function scrapeLibraryEvents(browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   Calendar URL: ${LIBRARY.calendarUrl}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let events = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to the calendar page
    console.log('   Loading BeWith calendar (dynamic React app)...');
    await page.goto(LIBRARY.calendarUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for JavaScript to potentially load events
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Try to find events in the DOM - BeWith calendar displays events as text blocks
    events = await page.evaluate(() => {
      const results = [];
      const processedTitles = new Set();
      const bodyText = document.body.innerText;

      // Parse events from page text - format is:
      // Organization Name
      // Event Title @ Location
      // Address
      // Day, Month DD, YYYY
      // HH:MM AM/PM - HH:MM AM/PM

      // Find all date patterns and work backwards to get event info
      const datePattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(datePattern)) {
          // Found a date line - look backwards for event title
          let title = '';
          let location = '';
          let address = '';

          // The event title is usually 2-3 lines above the date
          for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
            const prevLine = lines[j];
            // Skip navigation/filter items
            if (prevLine.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat|\d+|Reset|January|February|March|April|May|June|July|August|September|October|November|December|Audience|Event Type|Location|City Council|Featured|Free|Public Meeting|Ticketed|Calendar View)$/i)) continue;

            // Line with @ is likely the event title
            if (prevLine.includes('@')) {
              title = prevLine;
              break;
            }
            // Line ending with Library might be the organizer
            if (prevLine.match(/Library$/i) && !title) {
              // Skip - this is likely the organizer, look further back
              continue;
            }
            // Address line (contains street names, VA, USA)
            if (prevLine.match(/,\s*(VA|Virginia),?\s*USA/i)) {
              address = prevLine;
              continue;
            }
            // If we haven't found a title yet and this looks like one
            if (!title && prevLine.length > 5 && prevLine.length < 150 && !prevLine.match(/^\d/)) {
              title = prevLine;
            }
          }

          if (!title || title.length < 5 || processedTitles.has(title)) continue;
          processedTitles.add(title);

          // Get the time from the next line
          let timeText = '';
          if (i + 1 < lines.length) {
            const timeLine = lines[i + 1];
            const timeMatch = timeLine.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            if (timeMatch) timeText = timeMatch[1];
          }

          const dateText = line;

          results.push({
            name: title,
            eventDate: timeText ? `${dateText} ${timeText}` : dateText,
            venue: address || 'Hampton Public Library',
            description: '',
            url: window.location.href
          });
        }
      }

      return results;
    });

    console.log(`   Found ${events.length} events from calendar page`);

    // Process each event
    for (const event of events) {
      try {
        const ageRange = parseAgeRange(event.name + ' ' + event.description);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        const eventDoc = {
          name: event.name,
          venue: LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          state: LIBRARY.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: LIBRARY.name,
            address: '4207 Victoria Blvd',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: LIBRARY.defaultLat,
            longitude: LIBRARY.defaultLon
          },
          geohash: ngeohash.encode(LIBRARY.defaultLat, LIBRARY.defaultLon, 7),
          contact: {
            website: event.url || LIBRARY.website,
            phone: '757-727-1154'
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Hampton Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

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

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeWithAppsLibraries() {
  console.log('\n📚 HAMPTON PUBLIC LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Hampton Public Library, VA (135K population)');
  console.log('Note: BeWith calendar uses dynamic loading - events may be limited\n');

  const browser = await launchBrowser();

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    const { imported, failed, skipped } = await scrapeLibraryEvents(browser);
    totalImported = imported;
    totalSkipped = skipped;
    totalFailed = failed;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ HAMPTON LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('WithApps-VA', {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeWithAppsLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWithAppsLibraries };

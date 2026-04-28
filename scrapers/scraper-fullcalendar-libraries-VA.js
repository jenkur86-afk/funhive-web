#!/usr/bin/env node

/**
 * FULLCALENDAR SCRAPER
 *
 * Scrapes events from libraries using FullCalendar (JavaScript/WordPress plugin)
 * FullCalendar is a popular JavaScript event calendar library
 *
 * COVERAGE (1 library system in VA):
 * - Blue Ridge Regional Library (Martinsville, VA) - 130,000 population
 *
 * Usage:
 *   node functions/scrapers/scraper-fullcalendar-libraries-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using FullCalendar
const LIBRARY_SYSTEMS = [
  {
    name: 'Blue Ridge Regional Library',
    // Library switched from FullCalendar to Angular app at events.brrl.us
    url: 'https://events.brrl.us/iframe-events',
    county: 'Henry',
    state: 'VA',
    website: 'https://www.brrl.lib.va.us',
    city: 'Martinsville',
    zipCode: '24112'
  }
];

// Use shared geocoding helper with caching + rate limiting
const { geocodeWithFallback } = require('./helpers/geocoding-helper');

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from FullCalendar library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for FullCalendar to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Blue Ridge Regional Library uses Angular app with gcal-event elements
      // Fall back to FullCalendar selectors for other libraries
      let eventElements = document.querySelectorAll('a.gcal-event');

      // If no gcal-event elements, try FullCalendar selectors
      if (eventElements.length === 0) {
        eventElements = document.querySelectorAll('.fc-event, .fc-daygrid-event, .fc-list-event, [class*="fc-event"], article, .event-item');
      }

      // Track current date heading for events
      let currentDateHeading = '';

      eventElements.forEach(el => {
        try {
          // For Angular app, check for nearby date heading
          let prevEl = el.previousElementSibling;
          while (prevEl) {
            if (prevEl.classList && prevEl.classList.contains('event-day-heading')) {
              currentDateHeading = prevEl.textContent.trim();
              break;
            }
            prevEl = prevEl.previousElementSibling;
          }

          // Look for event title
          const titleEl = el.querySelector('.gcal-title, .fc-event-title, .fc-list-event-title, h1, h2, h3, h4');
          if (!titleEl) return;

          let title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // For BRRL, title format is "Event Name – Branch Name"
          // Extract just the event name
          let location = '';
          if (title.includes('–')) {
            const parts = title.split('–');
            title = parts[0].trim();
            location = parts[1] ? parts[1].trim() : '';
          }

          // Get URL (if any)
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date from heading or text
          let eventDate = currentDateHeading || '';
          if (!eventDate) {
            const dateEl = el.querySelector('.fc-event-time, .fc-list-event-time, time, [class*="date"]');
            if (dateEl) {
              eventDate = dateEl.textContent.trim();
            } else {
              const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                               fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
              if (dateMatch) eventDate = dateMatch[0];
            }
          }

          // Extract time from gcal-date-container or text
          let time = '';
          const timeContainer = el.querySelector('.gcal-date-container');
          if (timeContainer) {
            time = timeContainer.textContent.trim();
          } else {
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location if not already found
          if (!location) {
            const locationEl = el.querySelector('.fc-event-location, [class*="location"]');
            if (locationEl) {
              location = locationEl.textContent.trim();
            }
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('.fc-event-description, p, [class*="description"], .toggle-me');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        const ageRange = parseAgeRange(event.description);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeWithFallback(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            venueName: event.venue,
            sourceName: library.name
          });
        }

        // Extract time BEFORE normalization strips it
        let eventStartTime = null;
        let eventEndTime = null;
        const rawTimeMatch = event.eventDate?.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i)
          || event.eventDate?.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (rawTimeMatch && rawTimeMatch[6]) {
          // Range match
          const sap = (rawTimeMatch[3] || 'AM').toUpperCase();
          const eap = rawTimeMatch[6].toUpperCase();
          eventStartTime = `${parseInt(rawTimeMatch[1])}:${rawTimeMatch[2]} ${sap}`;
          eventEndTime = `${parseInt(rawTimeMatch[4])}:${rawTimeMatch[5]} ${eap}`;
        } else if (rawTimeMatch) {
          // Single time match
          eventStartTime = `${parseInt(rawTimeMatch[1])}:${rawTimeMatch[2]} ${(rawTimeMatch[3] || 'AM').toUpperCase()}`;
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
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          scheduleDescription: event.eventDate,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            latitude: coordinates?.latitude || null,
            longitude: coordinates?.longitude || null
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'FullCalendar Scraper',
            scraperName: 'FullCalendar-VA',
            sourceName: library.name,
            county: library.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', library.name)
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
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeFullCalendarLibraries() {
  console.log('\n📚 FULLCALENDAR SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 1 library system in VA\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('FullCalendar-VA', 'events', {
    state: 'VA',
    source: 'fullcalendar'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.url, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);

        // Track per-site stats (updates both site AND aggregate totals)
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  // Log to database with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Run if executed directly
if (require.main === module) {
  scrapeFullCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeFullCalendarLibraries };

#!/usr/bin/env node

/**
 * MODERN EVENTS CALENDAR (WORDPRESS) SCRAPER
 *
 * Scrapes events from libraries using Modern Events Calendar WordPress plugin
 * Modern Events Calendar is a premium WordPress events plugin with advanced features
 *
 * COVERAGE (1 library system in VA):
 * - Lonesome Pine Regional Library (Big Stone Gap, VA) - 100,000 population
 *   NOTE: Library changed domain from lonesomepinelibrary.org to lprlibrary.org in 2024
 *   NOTE: Library now uses Google Calendar embeds which cannot be scraped without API access
 *
 * Usage:
 *   node functions/scrapers/scraper-wordpress-modern-events-calendar-libraries-VA.js
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

// Library Systems using Modern Events Calendar
// NOTE: Lonesome Pine moved to Google Calendar embeds, which require API access to scrape
const LIBRARY_SYSTEMS = [
  {
    name: 'Lonesome Pine Regional Library',
    url: 'https://www.lprlibrary.org/events/',
    county: 'Wise',
    state: 'VA',
    website: 'https://www.lprlibrary.org',
    city: 'Big Stone Gap',
    zipCode: '24219',
    // Library uses Google Calendar embeds - cannot scrape without Google Calendar API
    usesGoogleCalendar: true
  }
];

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

// Scrape events from Modern Events Calendar library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Skip libraries that use Google Calendar embeds (cannot scrape without API)
  if (library.usesGoogleCalendar) {
    console.log(`   ⚠️ Skipping - uses Google Calendar embeds (requires API access)`);
    return { imported: 0, failed: 0, skipped: 0 };
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for Modern Events Calendar to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Modern Events Calendar uses specific classes
      const eventElements = document.querySelectorAll('.mec-event-article, .mec-event-list-modern, article[class*="mec"], .mec-event-grid-modern, [class*="mec-event"]');

      eventElements.forEach(el => {
        try {
          // Look for event title
          const titleEl = el.querySelector('h1, h2, h3, h4, .mec-event-title, a[class*="mec"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Get URL
          const linkEl = el.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date - Modern Events Calendar formats
          let eventDate = '';
          const dateEl = el.querySelector('.mec-event-date, time, [class*="mec-date"], [class*="date"]');
          if (dateEl) {
            eventDate = dateEl.textContent.trim();
          } else {
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time
          let time = '';
          const timeEl = el.querySelector('.mec-event-time, [class*="mec-time"], [class*="time"]');
          if (timeEl) {
            time = timeEl.textContent.trim();
          } else {
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location
          let location = '';
          const locationEl = el.querySelector('.mec-event-location, [class*="mec-loc"], [class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('.mec-event-description, p, [class*="description"]');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract category/audience
          let audience = '';
          const catEl = el.querySelector('.mec-event-category, [class*="mec-cat"], [class*="category"]');
          if (catEl) {
            audience = catEl.textContent.trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              audience: audience
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
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }

        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize the date string
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;

        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.audience || '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Modern Events Calendar Scraper',
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
async function scrapeModernEventsCalendarLibraries() {
  console.log('\n📚 MODERN EVENTS CALENDAR (WORDPRESS) SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 1 library system in VA\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);
      totalImported += imported;
      totalSkipped += skipped;
      totalFailed += failed;
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ MODERN EVENTS CALENDAR SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  
  // Log scraper stats to Firestore
  await logScraperResult('Wordpress Modern Events Calendar Libraries VA', {
    found: totalImported,
    new: totalImported,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeModernEventsCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeModernEventsCalendarLibraries };

#!/usr/bin/env node

/**
 * WIX THUNDERBOLT SCRAPER - Beaufort County Library (SC)
 *
 * Scrapes events from Beaufort County Library using Wix Thunderbolt platform
 *
 * COVERAGE:
 * - Beaufort County Library (SC) - 201,000 population
 *
 * Platform: Wix Thunderbolt (dynamic calendar via API)
 * Events URL: https://www.beaufortcountylibrary.org/calendar
 *
 * Usage:
 *   node functions/scrapers/scraper-wix-beaufort-county-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Beaufort County Library',
  url: 'https://www.beaufortcountylibrary.org/calendar',
  county: 'Beaufort',
  state: 'SC',
  website: 'https://www.beaufortcountylibrary.org',
  city: 'Beaufort',
  zipCode: '29902'
};

// Parse age range from event description
function parseAgeRange(description) {
  if (!description) return 'All Ages';

  const text = description.toLowerCase();

  // Check for adult-only indicators
  if (text.match(/adults? only|18\+|21\+/i)) {
    return 'Adults';
  }

  // Check for specific age ranges
  if (text.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (text.match(/toddlers?|preschool|3-5|pre-k/i)) return 'Preschool (3-5)';
  if (text.match(/children|kids|6-12|elementary|school-?age/i)) return 'Children (6-12)';
  if (text.match(/teens?|13-17|middle school|high school|young adult/i)) return 'Teens (13-17)';
  if (text.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Beaufort County Library
async function scrapeWixBeaufortCounty() {
  console.log('\n📚 WIX THUNDERBOLT SCRAPER - Beaufort County Library');
  console.log('='.repeat(70));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}`);
  console.log(`   Population: 201,000\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Enable request interception to capture API calls
    await page.setRequestInterception(true);

    let apiData = null;

    page.on('request', request => {
      request.continue();
    });

    page.on('response', async response => {
      const url = response.url();

      // Intercept Wix dynamic model API calls
      if (url.includes('/_api/v2/dynamicmodel') || url.includes('/calendar') && url.includes('api')) {
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            apiData = await response.json();
          }
        } catch (err) {
          // Ignore parsing errors
        }
      }
    });

    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to extract events from the page (fallback if API interception fails)
    const events = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors for Wix event elements
      const eventSelectors = [
        '[data-testid*="event"]',
        '[class*="event-item"]',
        '[class*="calendar-event"]',
        'article',
        '[role="listitem"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleEl = el.querySelector('h2, h3, h4, [class*="title"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();

          // Extract date
          let eventDate = '';
          const dateEl = el.querySelector('time, [class*="date"]');
          if (dateEl) {
            eventDate = dateEl.textContent.trim() || dateEl.getAttribute('datetime') || '';
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('p, [class*="description"]');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract location
          let location = '';
          const locationEl = el.querySelector('[class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Try to get event URL
          let url = '';
          const linkEl = el.querySelector('a');
          if (linkEl && linkEl.href) {
            url = linkEl.href;
          }

          if (title && eventDate) {
            results.push({
              name: title,
              eventDate: eventDate,
              venue: location,
              description: description,
              url: url
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err.message);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Geocode location if available
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeWithFallback(
            `${event.venue}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`,
            {
              city: LIBRARY.city,
              zipCode: LIBRARY.zipCode,
              state: LIBRARY.state,
              county: LIBRARY.county,
              venueName: event.venue,
              sourceName: LIBRARY.name
            }
          );
        }

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: event.venue || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Wix Thunderbolt Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

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

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
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

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ WIX BEAUFORT COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeWixBeaufortCountyCloudFunction() {
  try {
    const results = await scrapeWixBeaufortCounty();

    // Log scraper stats to database
    await logScraperResult('Wix Beaufort County Library', {
      found: results.imported + results.skipped,
      new: results.imported,
      duplicates: results.skipped
    }, { dataType: 'events' });

    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Cloud Function Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  scrapeWixBeaufortCounty,
  scrapeWixBeaufortCountyCloudFunction
};

// Run if called directly
if (require.main === module) {
  scrapeWixBeaufortCounty()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

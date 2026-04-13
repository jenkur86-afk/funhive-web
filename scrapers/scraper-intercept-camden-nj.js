#!/usr/bin/env node

/**
 * INTERCEPT SCRAPER - Camden County Library System (NJ)
 *
 * Scrapes events from Camden County Library System using Intercept platform
 *
 * COVERAGE:
 * - Camden County Library System (NJ) - 500K people
 *
 * Usage:
 *   node functions/scrapers/scraper-intercept-camden-nj.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Camden County Library System',
  url: 'https://events.camdencountylibrary.org/',
  county: 'Camden',
  state: 'NJ',
  website: 'https://www.camdencountylibrary.org',
  city: 'Voorhees',
  zipCode: '08043'
};

// Geocode address using OpenStreetMap
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
        'User-Agent': 'SocialSpot/1.0'
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

// Parse age range from event title/description
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/\badults?\s+only\b/i) || lowerText.match(/\b18\+/)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/\b(babies?|infants?|0-2)\b/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/\b(toddlers?|preschool|3-5)\b/i)) return 'Preschool (3-5)';
  if (lowerText.match(/\b(children|kids|6-12|elementary)\b/i)) return 'Children (6-12)';
  if (lowerText.match(/\b(teens?|13-17|teenage|youth)\b/i)) return 'Teens (13-17)';
  if (lowerText.match(/\b(family|families|everyone|all ages)\b/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Intercept platform
async function scrapeInterceptEvents(browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Intercept uses various selectors for events
      const selectors = [
        '.view-intercept-events .views-row',
        'article[class*="event"]',
        '.event-item',
        '[class*="intercept-event"]'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleEl = el.querySelector('h2, h3, h4, .title, [class*="title"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const linkEl = el.querySelector('a[href*="event"]') || titleEl.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          // Extract description
          let description = '';
          const descEl = el.querySelector('.description, .summary, p');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract date/time
          let eventDate = '';
          const dateEl = el.querySelector('.date-display-single, .datetime, [class*="date"], time');
          if (dateEl) {
            eventDate = dateEl.textContent.trim() || dateEl.getAttribute('datetime') || '';
          }

          // Extract location/branch
          let location = '';
          const locationEl = el.querySelector('.location, .branch, [class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Extract age group
          let audience = '';
          const audienceEl = el.querySelector('.audience, .age-group, [class*="audience"]');
          if (audienceEl) {
            audience = audienceEl.textContent.trim();
          }

          if (title && eventDate) {
            results.push({
              name: title,
              eventDate: eventDate,
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
        // Parse age range
        const ageRange = parseAgeRange(event.audience || event.name + ' ' + event.description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`);
        }

        // If geocoding failed, try with just city
        if (!coordinates) {
          coordinates = await geocodeAddress(`${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`);
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
          state: LIBRARY.state,
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
            source: 'Intercept Scraper',
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
  }

  console.log(`\n   Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}\n`);
  return { imported, skipped, failed };
}

// Main function
async function scrapeInterceptLibrary() {
  console.log('\n📚 INTERCEPT SCRAPER - CAMDEN COUNTY LIBRARY SYSTEM');
  console.log('='.repeat(60));

  const browser = await launchBrowser();

  try {
    const { imported, skipped, failed } = await scrapeInterceptEvents(browser);

    console.log('\n' + '='.repeat(60));
    console.log('✅ INTERCEPT SCRAPER COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped (duplicates/adults): ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('='.repeat(60) + '\n');

    return { imported, skipped, failed };
  } finally {
    await browser.close();
  }
}

// Cloud Function wrapper
async function scrapeInterceptLibraryCloudFunction() {
  console.log('\n📚 Intercept Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeInterceptLibrary();
    return {
      ...result,
      message: 'Intercept scraper completed'
    };
  } catch (error) {
    console.error('Error in Intercept scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeInterceptLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeInterceptLibrary, scrapeInterceptLibraryCloudFunction };

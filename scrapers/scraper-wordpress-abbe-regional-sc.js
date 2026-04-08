#!/usr/bin/env node

/**
 * WORDPRESS PRESSVILLE SCRAPER - ABBE Regional Library (SC)
 *
 * Scrapes events from ABBE Regional Library System using WordPress Pressville theme
 *
 * COVERAGE:
 * - ABBE Regional Library System (SC) - 179,000 population
 * - Serves Aiken, Bamberg, Barnwell, and Edgefield counties
 *
 * Platform: WordPress 6.8.3 with Pressville theme (custom post types)
 * Events URL: https://www.abbe-lib.org/events/
 *
 * Usage:
 *   node functions/scrapers/scraper-wordpress-abbe-regional-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'ABBE Regional Library System',
  url: 'https://www.abbe-lib.org/events/',
  county: 'Aiken',
  state: 'SC',
  website: 'https://www.abbe-lib.org',
  city: 'Aiken',
  zipCode: '29801'
};

// Parse age range from event description
function parseAgeRange(description, title) {
  const text = (description + ' ' + title).toLowerCase();

  // Check for adult-only indicators
  if (text.match(/adults? only|18\+|21\+/i)) {
    return 'Adults';
  }

  // Check for specific age ranges
  if (text.match(/babies?|infants?|0-2|baby/i)) return 'Babies & Toddlers (0-2)';
  if (text.match(/toddlers?|preschool|3-5|pre-?k|storytime/i)) return 'Preschool (3-5)';
  if (text.match(/children|kids|6-12|elementary|school-?age/i)) return 'Children (6-12)';
  if (text.match(/teens?|13-17|middle school|high school|young adult|tween/i)) return 'Teens (13-17)';
  if (text.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from ABBE Regional Library
async function scrapeWordPressAbbeRegional() {
  console.log('\n📚 WORDPRESS PRESSVILLE SCRAPER - ABBE Regional Library');
  console.log('='.repeat(70));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}`);
  console.log(`   Population: 179,000 (4 counties)\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load (WordPress may load via AJAX)
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors for WordPress event post types
      const eventSelectors = [
        '.event, .lsvr-event',
        'article[class*="event"]',
        '[class*="event-item"]',
        '.post-type-event',
        'div[class*="event"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      // If no events found with specific selectors, try articles
      if (eventElements.length === 0) {
        eventElements = document.querySelectorAll('article, .item');
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleEl = el.querySelector('h1, h2, h3, h4, .entry-title, .event-title');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();

          // Extract date
          let eventDate = '';
          const dateEl = el.querySelector('time, .event-date, .date, [class*="date"]');
          if (dateEl) {
            eventDate = dateEl.textContent.trim() || dateEl.getAttribute('datetime') || '';
          }

          // If no date element, try to extract from text
          if (!eventDate) {
            const dateMatch = el.textContent.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('p, .description, .event-description, .entry-content');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract location
          let location = '';
          const locationEl = el.querySelector('.location, .event-location, [class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Try to get event URL
          let url = '';
          const linkEl = el.querySelector('a');
          if (linkEl && linkEl.href) {
            url = linkEl.href;
          }

          // Extract categories/tags
          let categories = '';
          const catEls = el.querySelectorAll('.category, .event-category, [class*="tag"]');
          if (catEls.length > 0) {
            categories = Array.from(catEls).map(c => c.textContent.trim()).join(', ');
          }

          if (title && eventDate) {
            results.push({
              name: title,
              eventDate: eventDate,
              venue: location,
              description: description,
              url: url,
              categories: categories
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
        const ageRange = parseAgeRange(event.description, event.name);

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

        // Normalize the date string
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;

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
          moreInfo: event.categories || '',
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
            source: 'WordPress Pressville Scraper',
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
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ WORDPRESS ABBE REGIONAL SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeWordPressAbbeRegionalCloudFunction() {
  try {
    const results = await scrapeWordPressAbbeRegional();
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
  scrapeWordPressAbbeRegional,
  scrapeWordPressAbbeRegionalCloudFunction
};

// Run if called directly
if (require.main === module) {
  scrapeWordPressAbbeRegional()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

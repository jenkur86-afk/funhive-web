#!/usr/bin/env node

/**
 * GRANICUS OPENCITIES SCRAPER - Morris County Library (NJ)
 *
 * Scrapes events from Morris County Library using Granicus OpenCities platform
 *
 * COVERAGE:
 * - Morris County Library System (NJ) - 500,000+ population
 *
 * Platform: Granicus OpenCities CMS
 * Events URL: https://www.mclib.info/Events
 *
 * Usage:
 *   node functions/scrapers/scraper-granicus-morris-county-nj.js
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
  name: 'Morris County Library',
  url: 'https://www.mclib.info/Events',
  county: 'Morris',
  state: 'NJ',
  website: 'https://www.mclib.info',
  city: 'Whippany',
  zipCode: '07981'
};

// Parse age range from event description and tags
function parseAgeRange(description, tags) {
  const text = (description + ' ' + tags).toLowerCase();

  // Check for adult-only indicators
  if (text.match(/adults? only|18\+|21\+/i)) {
    return 'Adults';
  }

  // Check for specific age ranges
  if (text.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (text.match(/toddlers?|preschool|3-5|pre-k/i)) return 'Preschool (3-5)';
  if (text.match(/children|kids|6-12|elementary|school-?age/i)) return 'Children (6-12)';
  if (text.match(/teens?|13-17|middle school|high school|young adult/i)) return 'Teens (13-17)';
  if (text.match(/family|families|all ages|kids & family/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Morris County Library
async function scrapeGranicusMorrisCounty() {
  console.log('\n📚 GRANICUS OPENCITIES SCRAPER - Morris County Library');
  console.log('='.repeat(70));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}`);
  console.log(`   Population: 500,000+\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Loop through all pages (pagination)
    let currentPage = 1;
    const maxPages = 10; // Safety limit
    let hasMorePages = true;

    while (hasMorePages && currentPage <= maxPages) {
      console.log(`\n📄 Scraping page ${currentPage}...`);

      const pageUrl = currentPage === 1 ? LIBRARY.url : `${LIBRARY.url}?Page=${currentPage}`;

      await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for events to load
      await page.waitForSelector('body', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract events from the page
      const pageEvents = await page.evaluate(() => {
        const results = [];

        // Find all event items (adjust selector based on actual HTML structure)
        const eventItems = document.querySelectorAll('.item, article, [class*="event"], .result-item');

        eventItems.forEach(item => {
          try {
            // Extract title
            const titleEl = item.querySelector('h2 a, h3 a, h4 a, a[href*="/Events/"]');
            if (!titleEl) return;

            const title = titleEl.textContent.trim();
            const url = titleEl.href;

            // Extract date
            let eventDate = '';
            const dateEl = item.querySelector('.date, time, [class*="date"]');
            if (dateEl) {
              eventDate = dateEl.textContent.trim();
            } else {
              // Try to extract date from item text
              const dateMatch = item.textContent.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
              if (dateMatch) eventDate = dateMatch[1];
            }

            // Extract description
            let description = '';
            const descEl = item.querySelector('p, .description, [class*="description"]');
            if (descEl) {
              description = descEl.textContent.trim();
            }

            // Extract location
            let location = '';
            const locationEl = item.querySelector('.location, [class*="location"]');
            if (locationEl) {
              location = locationEl.textContent.trim();
            }

            // Extract tags/categories
            let tags = '';
            const tagEls = item.querySelectorAll('.tag, [class*="tag"], [class*="category"]');
            if (tagEls.length > 0) {
              tags = Array.from(tagEls).map(t => t.textContent.trim()).join(', ');
            }

            if (title && eventDate) {
              results.push({
                name: title,
                eventDate: eventDate,
                venue: location,
                description: description,
                url: url,
                tags: tags
              });
            }
          } catch (err) {
            console.log('Error parsing event:', err.message);
          }
        });

        // Check if there's a next page
        const nextPageLink = document.querySelector('a[href*="Page="][class*="next"], .pagination a[rel="next"]');
        const hasNext = !!nextPageLink;

        return { events: results, hasNext };
      });

      const { events, hasNext } = pageEvents;
      console.log(`   Found ${events.length} events on page ${currentPage}`);

      // Process each event
      for (const event of events) {
        try {
          // Parse age range
          const ageRange = parseAgeRange(event.description, event.tags);

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
            cost: event.tags.toLowerCase().includes('free') ? 'Free' : 'Unknown',
            description: (event.description || '').substring(0, 1000),
            moreInfo: event.tags || '',
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
              source: 'Granicus OpenCities Scraper',
              sourceName: LIBRARY.name,
              county: LIBRARY.county,
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            },
            filters: {
              isFree: event.tags.toLowerCase().includes('free'),
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

      // Check if there are more pages
      if (!hasNext || events.length === 0) {
        hasMorePages = false;
      } else {
        currentPage++;
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
  console.log('✅ GRANICUS MORRIS COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeGranicusMorrisCountyCloudFunction() {
  try {
    const results = await scrapeGranicusMorrisCounty();
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
  scrapeGranicusMorrisCounty,
  scrapeGranicusMorrisCountyCloudFunction
};

// Run if called directly
if (require.main === module) {
  scrapeGranicusMorrisCounty()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

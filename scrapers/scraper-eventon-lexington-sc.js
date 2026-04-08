#!/usr/bin/env node

/**
 * EVENTON SCRAPER - LEXINGTON COUNTY PUBLIC LIBRARY
 *
 * Scrapes events from Lexington County Public Library using EventON (WordPress plugin)
 *
 * COVERAGE:
 * - Lexington County Public Library (SC) - 310,000 people
 *
 * Platform: EventON WordPress plugin + WordPress REST API
 * Strategy: Fetch event list from WP REST API, then scrape event details with Puppeteer
 *
 * Usage:
 *   node functions/scrapers/scraper-eventon-lexington-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Lexington County Public Library',
  apiUrl: 'https://lexcolibrary.com/wp-json/wp/v2/ajde_events',
  county: 'Lexington',
  state: 'SC',
  website: 'https://lexcolibrary.com',
  city: 'Lexington',
  zipCode: '29072'
};

// Parse age range from text and taxonomies
function parseAgeRange(text, classListOrTaxonomies) {
  if (!text) text = '';

  const lowerText = text.toLowerCase();
  const classList = classListOrTaxonomies ? classListOrTaxonomies.join(' ').toLowerCase() : '';

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i) || lowerText.match(/21\+/i)) {
    return 'Adults';
  }

  // Check class list for age categories
  if (classList.includes('preschool') || classList.includes('event_type_2-1')) return 'Preschool (3-5)';
  if (classList.includes('youth') || classList.includes('grades k') || classList.includes('event_type_2-2')) return 'Children (6-12)';
  if (classList.includes('tweens') || classList.includes('event_type_2-3')) return 'Children (6-12)';
  if (classList.includes('teens') || classList.includes('event_type_2-4')) return 'Teens (13-17)';
  if (classList.includes('adults') || classList.includes('event_type_2-5')) return 'Adults';
  if (classList.includes('families') || classList.includes('event_type_2-6') || classList.includes('all ages')) return 'All Ages';

  // Age-specific ranges from text
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary|grades k/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Extract location from class list
function extractLocationFromClassList(classList) {
  if (!Array.isArray(classList)) return null;

  for (const cls of classList) {
    if (cls.startsWith('event_location-')) {
      const locationSlug = cls.replace('event_location-', '').replace(/-/g, ' ');
      // Capitalize each word
      return locationSlug.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') + ' Library';
    }
  }
  return null;
}

// Fetch events from WordPress REST API
async function fetchEventsFromAPI() {
  console.log(`   Fetching events from WordPress REST API...`);

  const allEvents = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore && page <= 10) { // Limit to 10 pages for safety
      const response = await axios.get(`${LIBRARY.apiUrl}?per_page=100&page=${page}&_embed`);
      const events = response.data;

      if (events.length === 0) {
        hasMore = false;
      } else {
        allEvents.push(...events);
        page++;

        // Check if there's a next page link
        const linkHeader = response.headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          hasMore = false;
        }
      }

      // Rate limiting (reduced from 500ms)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`   Found ${allEvents.length} events from API`);
    return allEvents;

  } catch (error) {
    console.error(`   ❌ Error fetching from API:`, error.message);
    return [];
  }
}

// Scrape event details from individual event page
async function scrapeEventDetails(event, page) {
  try {
    const eventUrl = event.link;

    // Increased timeout for slow server
    await page.goto(eventUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000  // Increased from 15s to 30s
    });

    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract event details from rendered page
    const details = await page.evaluate(() => {
      const result = {
        date: '',
        time: '',
        location: '',
        description: ''
      };

      // Try to find EventON event container
      const selectors = [
        '.eventon_list_event',
        '.evo-event',
        '.event-details',
        '[class*="eventon"]',
        'article.event',
        '.entry-content'
      ];

      let eventContainer = null;
      for (const selector of selectors) {
        eventContainer = document.querySelector(selector);
        if (eventContainer) break;
      }

      if (!eventContainer) {
        eventContainer = document.querySelector('.entry-content, main, article');
      }

      if (eventContainer) {
        const fullText = eventContainer.textContent;

        // Extract date
        const dateSelectors = [
          '.event-date', '.evo-date', 'time', '[class*="date"]',
          '.event-time-date', '.event_date'
        ];

        for (const selector of dateSelectors) {
          const dateEl = eventContainer.querySelector(selector);
          if (dateEl) {
            result.date = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
            break;
          }
        }

        // Try to extract date from text if not found
        if (!result.date) {
          const dateMatch = fullText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                           fullText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
          if (dateMatch) result.date = dateMatch[0];
        }

        // Extract time
        const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                         fullText.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i);
        if (timeMatch) result.time = timeMatch[0];

        // Extract location
        const locationSelectors = [
          '.event-location', '.evo-location', '.location',
          '[class*="location"]', '.venue'
        ];

        for (const selector of locationSelectors) {
          const locEl = eventContainer.querySelector(selector);
          if (locEl && locEl.textContent.trim().length > 2) {
            result.location = locEl.textContent.trim();
            break;
          }
        }

        // Extract description
        const descSelectors = [
          '.event-description', '.evo-description', '.description',
          '.entry-content p', 'p'
        ];

        for (const selector of descSelectors) {
          const descEl = eventContainer.querySelector(selector);
          if (descEl && descEl.textContent.trim().length > 50) {
            result.description = descEl.textContent.trim();
            break;
          }
        }
      }

      return result;
    });

    return details;

  } catch (error) {
    console.error(`  ⚠️  Error scraping event page:`, error.message);
    return { date: '', time: '', location: '', description: '' };
  }
}

// Process events
async function processLexingtonEvents() {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   API: ${LIBRARY.apiUrl}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Fetch events from API
  const apiEvents = await fetchEventsFromAPI();

  if (apiEvents.length === 0) {
    console.log('   No events found from API');
    return { imported, skipped, failed };
  }

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Process each event
    for (const apiEvent of apiEvents) {
      try {
        // Get basic info from API
        const title = apiEvent.title?.rendered || 'Untitled Event';
        const contentHtml = apiEvent.content?.rendered || '';
        const classList = apiEvent.class_list || [];

        // Extract description from HTML content
        const tempDiv = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        let description = tempDiv.substring(0, 500);

        // Parse age range from API data
        const ageRange = parseAgeRange(title + ' ' + description, classList);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to get date from API first (check meta fields or content)
        let eventDate = '';
        let eventDetails = { date: '', time: '', location: '', description: '' };

        // Try to extract date from content first (avoid page visit if possible)
        const dateMatch = tempDiv.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?/i);
        if (dateMatch) {
          eventDate = dateMatch[0];
          // Also try to find time in content
          const timeMatch = tempDiv.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) eventDate = `${eventDate} ${timeMatch[0]}`;
        }

        // Only scrape event page if we don't have a date
        if (!eventDate || eventDate.trim().length < 5) {
          try {
            eventDetails = await scrapeEventDetails(apiEvent, page);
            eventDate = eventDetails.date;
            if (eventDetails.time && eventDate) {
              eventDate = `${eventDate} ${eventDetails.time}`;
            }
          } catch (scrapeError) {
            // If scrape fails, try to use API date from modified field
            const modDate = new Date(apiEvent.modified);
            if (!isNaN(modDate.getTime())) {
              eventDate = modDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              console.log(`  ⚠️ Using modified date for: ${title.substring(0, 40)}...`);
            }
          }
        }

        // If still no date, skip this event
        if (!eventDate || eventDate.trim().length < 5) {
          console.log(`  ⚠️  Skipping "${title.substring(0, 40)}" - no date found`);
          skipped++;
          continue;
        }

        // Get location from scraped details or class list
        let venue = eventDetails.location || extractLocationFromClassList(classList) || LIBRARY.name;

        // Use more detailed description if scraped
        if (eventDetails.description && eventDetails.description.length > description.length) {
          description = eventDetails.description;
        }

        // Geocode with intelligent fallback
        let coordinates = null;
        if (venue && venue !== LIBRARY.name) {
          const fullAddress = `${venue}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: LIBRARY.city,
            zipCode: LIBRARY.zipCode,
            state: LIBRARY.state,
            county: LIBRARY.county,
            venueName: venue,
            sourceName: LIBRARY.name
          });
        } else {
          coordinates = await geocodeWithFallback(`${LIBRARY.city}, ${LIBRARY.state}`, {
            city: LIBRARY.city,
            zipCode: LIBRARY.zipCode,
            state: LIBRARY.state,
            county: LIBRARY.county,
            sourceName: LIBRARY.name
          });
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: title,
          description: description
        });

        // Parse date to get Date object for Timestamp
        const dateObj = parseDateToObject(eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Normalize date format
        const normalizedDate = normalizeDateString(eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventDate}"`);
          skipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: title,
          venue: venue,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: description.substring(0, 1000),
          moreInfo: '',
          location: {
            name: venue,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: apiEvent.link || LIBRARY.website,
            phone: ''
          },
          url: apiEvent.link || LIBRARY.website,
          metadata: {
            source: 'EventON Scraper',
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
          console.log(`  ✅ ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting (reduced from 500ms)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error in processing:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  return { imported, skipped, failed };
}

// Main scraper function
async function scrapeEventONLexington() {
  console.log('\n📚 EVENTON SCRAPER - LEXINGTON COUNTY');
  console.log('='.repeat(60));
  console.log('Coverage: Lexington County Public Library (SC)');
  console.log('Population reach: ~310,000 people\n');

  const { imported, skipped, failed } = await processLexingtonEvents();

  console.log('\n' + '='.repeat(60));
  console.log('✅ EVENTON SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeEventONLexingtonCloudFunction() {
  console.log('\n📚 EventON Lexington Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeEventONLexington();
    
  // Log scraper stats to Firestore
  await logScraperResult('Eventon Lexington Sc', {
    found: stats.imported,
    new: stats.imported,
    duplicates: 0
  }, { dataType: 'events' });

  return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'EventON Lexington scraper completed'
    };
  } catch (error) {
    console.error('Error in EventON Lexington scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeEventONLexington()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeEventONLexington, scrapeEventONLexingtonCloudFunction };

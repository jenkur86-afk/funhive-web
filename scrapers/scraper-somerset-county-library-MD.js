/**
 * SOMERSET COUNTY LIBRARY SCRAPER
 *
 * Scrapes events from Somerset County Library
 * Uses Google Calendar API interception
 *
 * COVERAGE:
 * - Somerset County, MD (26,000+ population)
 *
 * Note: Somerset library has a Google Calendar embedded on their website.
 * This scraper uses Puppeteer request interception to capture Google Calendar API calls.
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
  console.log(`   URL: ${LIBRARY.url}\n`);
  console.log('   Note: Somerset uses PDF program booklets. Limited online event data available.');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Intercept network requests to find calendar data API calls
    const apiResponses = [];
    await page.setRequestInterception(true);

    page.on('request', request => {
      request.continue();
    });

    page.on('response', async response => {
      const url = response.url();
      // Look for calendar-related API calls or JSON responses
      if (url.includes('calendar') || url.includes('event') || url.includes('google') ||
          url.includes('.json') || url.includes('/api/')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            apiResponses.push({ url, data });
            console.log(`   📡 Found API call: ${url.substring(0, 80)}...`);
          }
        } catch (err) {
          // Ignore errors parsing response
        }
      }
    });

    // Navigate to main page
    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load and any calendar widgets to initialize
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 8000)); // Longer wait for calendar rendering

    console.log(`   📡 Captured ${apiResponses.length} API responses\n`);

    // Try to extract events from API responses first (Google Calendar)
    // Somerset has MULTIPLE calendars, so we need to aggregate events from all of them
    let events = [];
    let totalItemsFound = 0;

    for (const apiResp of apiResponses) {
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
              venue: item.location || '',
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
      console.log(`   ✅ Extracted ${events.length} library events (filtered out holidays)`);
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

        // Default coordinates for Somerset County Library (Princess Anne, MD)
        const defaultCoords = { latitude: 38.2029, longitude: -75.6924 };

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: LIBRARY.name,
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
          geohash: ngeohash.encode(defaultCoords.latitude, defaultCoords.longitude, 7), // Add geohash
          location: {
            name: LIBRARY.name,
            address: '11767 Beechwood St',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: defaultCoords.latitude,
            longitude: defaultCoords.longitude
          },
          contact: {
            website: LIBRARY.website,
            phone: '(410) 651-0852'
          },
          url: LIBRARY.website,
          metadata: {
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

  // Log scraper stats to Firestore
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

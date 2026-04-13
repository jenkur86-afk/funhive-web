/**
 * DORCHESTER COUNTY PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Dorchester County Public Library
 * Uses Squarespace calendar block renderer with Google Calendar API
 *
 * COVERAGE:
 * - Dorchester County, MD (32,000+ population)
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Dorchester County Public Library',
  url: 'https://www.dorchesterlibrary.org/calendar-of-events',
  county: 'Dorchester',
  state: 'MD',
  website: 'https://www.dorchesterlibrary.org',
  city: 'Cambridge',
  zipCode: '21613'
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
  if (lowerText.match(/18\+/) || lowerText.match(/adults? only/i)) {
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

// Scrape events from Dorchester
async function scrapeDorchesterEvents() {
  console.log(`\n📚 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}\n`);

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
      if (url.includes('calendar') || url.includes('event') || url.includes('squarespace') ||
          url.includes('google') || url.includes('.json') || url.includes('/api/')) {
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

    // Navigate to calendar page
    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for Squarespace/Google Calendar to load (dynamic rendering)
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 8000)); // Longer wait for calendar rendering

    console.log(`   📡 Captured ${apiResponses.length} API responses\n`);

    // Try to extract events from API responses first
    // Aggregate events from all calendar API responses
    let events = [];
    let totalItemsFound = 0;

    for (const apiResp of apiResponses) {
      try {
        // Look for Google Calendar API response specifically (not holidays)
        if (apiResp.url.includes('dorchester.library.events') &&
            apiResp.data && Array.isArray(apiResp.data.items)) {

          totalItemsFound += apiResp.data.items.length;

          // Map Google Calendar items to event format
          const calendarEvents = apiResp.data.items.map(item => {
            // Extract date from Google Calendar format
            let eventDate = '';
            if (item.start) {
              if (item.start.dateTime) {
                eventDate = new Date(item.start.dateTime).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                });
              } else if (item.start.date) {
                eventDate = new Date(item.start.date).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
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

      // Try multiple selectors for Squarespace calendar and Google Calendar
      const selectors = [
        '.eventlist-event',
        '.sqs-block-calendar',
        '[class*="calendar"]',
        '[class*="event"]',
        'article',
        'a[href*="/events/"]',
        'iframe[src*="google.com/calendar"]',
        '.event-item',
        '[data-controller="CalendarBlock"]'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} elements with selector: ${selector}`);
          break;
        }
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleEl = el.querySelector('h1, h2, h3, h4, .eventlist-title, a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const linkEl = el.querySelector('a') || titleEl;
          const url = linkEl.href || '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date and time
          let eventDate = '';
          let time = '';

          const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                           fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
          if (dateMatch) eventDate = dateMatch[0];

          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract description
          const descEl = el.querySelector('p, .eventlist-description, .summary');
          const description = descEl ? descEl.textContent.trim() : fullText.substring(0, 200);

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: '',
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
    }

    console.log(`   Found ${events.length} events\n`);

    // Process each event
    for (const event of events) {
      try {
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

        // Normalize the date
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;

        // Default coordinates for Dorchester County Public Library (Cambridge, MD)
        const defaultCoords = { latitude: 38.5634, longitude: -76.0788 };

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: normalizedDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          state: LIBRARY.state,
          geohash: ngeohash.encode(defaultCoords.latitude, defaultCoords.longitude, 7),
          location: {
            name: LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: defaultCoords
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Dorchester Scraper',
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
  console.log('✅ DORCHESTER SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeDorchesterEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeDorchesterEvents };

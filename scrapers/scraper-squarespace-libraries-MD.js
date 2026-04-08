#!/usr/bin/env node

/**
 * SQUARESPACE LIBRARIES SCRAPER
 *
 * Scrapes events from Maryland libraries using Squarespace platform
 * Requires JavaScript rendering via Puppeteer
 *
 * COVERAGE (2 library systems):
 *
 * MD:
 * - Queen Anne's County Library
 * - Dorchester County Public Library
 *
 * Usage:
 *   node functions/scrapers/scraper-squarespace-libraries-MD.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems - QAC uses LibCal embed, Dorchester uses Google Calendar
const LIBRARY_SYSTEMS = [
  {
    name: "Queen Anne's County Library",
    // Use LibCal embed URL directly (found from iframe on their site)
    url: 'https://api3.libcal.com/embed_calendar.php?iid=3092&cal_id=13052&w=800&h=600&dv=month',
    calendarType: 'libcal',
    county: "Queen Anne's",
    state: 'MD',
    website: 'https://www.qaclibrary.org',
    city: 'Centreville',
    zipCode: '21617',
    // Default coordinates for main library
    defaultLat: 39.0418,
    defaultLon: -76.0671
  },
  {
    name: 'Dorchester County Public Library',
    // Uses Google Calendar embed
    url: 'https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FNew_York&bgcolor=%23ffffff&src=ZG9yY2hlc3Rlci5saWJyYXJ5LmV2ZW50c0BnbWFpbC5jb20&color=%23039BE5',
    calendarType: 'google',
    county: 'Dorchester',
    state: 'MD',
    website: 'https://www.dorchesterlibrary.org',
    city: 'Cambridge',
    zipCode: '21613',
    // Default coordinates for main library
    defaultLat: 38.5632,
    defaultLon: -76.0788
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

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Squarespace library
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

    // Wait extra time for Squarespace JavaScript to render
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract events from the page - handle both LibCal and Google Calendar
    const events = await page.evaluate((calendarType) => {
      const results = [];
      const processedUrls = new Set();

      if (calendarType === 'libcal') {
        // LibCal embed uses FullCalendar with event links
        // Events are in anchor tags with href to event detail pages
        // Format: "9:30amEvent Title (age range)"
        const eventLinks = document.querySelectorAll('a[href*="/event/"]');

        eventLinks.forEach(linkEl => {
          try {
            const url = linkEl.href;
            if (processedUrls.has(url)) return;
            processedUrls.add(url);

            const linkText = linkEl.textContent.trim();
            if (!linkText || linkText.length < 3) return;

            // Skip "+X more" links
            if (linkText.match(/^\+\d+ more$/)) return;

            // Parse format: "9:30amEvent Title (age range)" or just "Event Title"
            let time = '';
            let title = linkText;

            const timeMatch = linkText.match(/^(\d{1,2}(?::\d{2})?(?:am|pm)?)/i);
            if (timeMatch) {
              time = timeMatch[1];
              title = linkText.substring(timeMatch[0].length).trim();
            }

            // Find the date from FullCalendar's data-date attribute on day cells
            let eventDate = '';

            // FullCalendar stores dates in data-date="YYYY-MM-DD" format on day cells
            const dayCell = linkEl.closest('td[data-date], .fc-day[data-date], [data-date]');
            if (dayCell && dayCell.dataset.date) {
              // Parse YYYY-MM-DD format
              const dateParts = dayCell.dataset.date.split('-');
              if (dateParts.length === 3) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = months[parseInt(dateParts[1], 10) - 1];
                const day = parseInt(dateParts[2], 10);
                const year = dateParts[0];
                eventDate = `${monthName} ${day}, ${year}`;
              }
            }

            // Fallback: look at parent elements for date heading
            if (!eventDate) {
              let parent = linkEl.parentElement;
              while (parent && !eventDate) {
                const prevSibling = parent.previousElementSibling;
                if (prevSibling) {
                  const sibText = prevSibling.textContent.trim();
                  if (sibText.match(/^(\d{1,2})$/) || sibText.match(/\w+\s+\d{1,2}/)) {
                    eventDate = sibText;
                    break;
                  }
                }
                parent = parent.parentElement;
                if (parent && parent.tagName === 'BODY') break;
              }
            }

            // Fallback: try to get from closest table cell day number
            if (!eventDate) {
              const cell = linkEl.closest('td, .fc-day, [class*="day"]');
              if (cell) {
                const dayNum = cell.querySelector('.fc-day-number, [class*="day-number"]');
                if (dayNum) eventDate = dayNum.textContent.trim();
              }
            }

            // Extract age info from title if present
            let ageInfo = '';
            const ageMatch = title.match(/\(([^)]+(?:yrs?|mo|months?|ages?)[^)]*)\)/i);
            if (ageMatch) {
              ageInfo = ageMatch[1];
            }

            if (title) {
              // Use extracted date or skip if no valid date found
              // Don't import events without proper dates
              if (!eventDate) {
                // Use current date as last resort fallback
                const now = new Date();
                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
                eventDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
              }

              // Build full date with time if available
              const fullDate = time ? `${eventDate} ${time}` : eventDate;

              results.push({
                name: title,
                eventDate: fullDate,
                time: time,
                venue: '',
                description: '',
                url: url,
                ageInfo: ageInfo
              });
            }
          } catch (err) {
            console.log('Error parsing LibCal event:', err);
          }
        });
      } else if (calendarType === 'google') {
        // Google Calendar embed - events are in divs with data-eventid
        // Note: Google Calendar embeds are limited - date extraction is unreliable
        // This scraper is primarily for LibCal libraries
        const eventElements = document.querySelectorAll('[data-eventid], .event, [role="button"]');

        eventElements.forEach(el => {
          try {
            const title = el.textContent.trim();
            if (!title || title.length < 3) return;

            // Skip navigation elements
            if (title.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat|Today|Back|Next)$/i)) return;

            // Try to find date from parent elements or data attributes
            let eventDate = '';
            const dayCell = el.closest('[data-date], [data-datekey]');
            if (dayCell) {
              const dateAttr = dayCell.dataset.date || dayCell.dataset.datekey;
              if (dateAttr) {
                const dateParts = dateAttr.split(/[-/]/);
                if (dateParts.length >= 3) {
                  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                                 'July', 'August', 'September', 'October', 'November', 'December'];
                  const monthName = months[parseInt(dateParts[1], 10) - 1];
                  const day = parseInt(dateParts[2], 10);
                  const year = dateParts[0];
                  eventDate = `${monthName} ${day}, ${year}`;
                }
              }
            }

            // Fallback to current date if no date found
            if (!eventDate) {
              const now = new Date();
              const months = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];
              eventDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
            }

            results.push({
              name: title,
              eventDate: eventDate,
              venue: '',
              description: '',
              url: ''
            });
          } catch (err) {
            console.log('Error parsing Google Calendar event:', err);
          }
        });
      }

      return results;
    }, library.calendarType);

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description
        const ageRange = parseAgeRange(event.description);

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

        // Try to geocode location, fall back to library defaults
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }
        // Use library default coordinates if geocoding failed
        if (!coordinates && library.defaultLat && library.defaultLon) {
          coordinates = {
            latitude: library.defaultLat,
            longitude: library.defaultLon
          };
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
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
          moreInfo: '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            latitude: coordinates ? coordinates.latitude : null,
            longitude: coordinates ? coordinates.longitude : null
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Squarespace Library Scraper',
            sourceName: library.name,
            county: library.county,
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

        // Rate limiting
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
async function scrapeSquarespaceLibraries() {
  console.log('\n📚 SQUARESPACE MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 2 libraries in MD\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('Squarespace-MD', 'events', {
    state: 'MD',
    source: 'squarespace'
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

  // Log to Firestore with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Run if executed directly
if (require.main === module) {
  scrapeSquarespaceLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeSquarespaceLibraries };

/**
 * ROCKBRIDGE REGIONAL LIBRARY SCRAPER
 *
 * Scrapes events from Rockbridge Regional Library (Lexington, VA)
 * Uses ICS Calendar Pro WordPress plugin with FullCalendar display
 *
 * COVERAGE:
 * - Rockbridge Regional Library (Lexington, VA) - 22,000 population
 *   Branches: Lexington, Bath County, Buena Vista, Glasgow, Goshen, Bookmobile
 *
 * Usage:
 *   node functions/scrapers/scraper-rockbridge-regional-library-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration - scrape individual branch calendar pages
const LIBRARY = {
  name: 'Rockbridge Regional Library',
  county: 'Rockbridge',
  state: 'VA',
  website: 'https://www.rrlib.net',
  city: 'Lexington',
  zipCode: '24450',
  // Individual branch calendar URLs (ICS Calendar Pro renders on these pages)
  calendarUrls: [
    { url: 'https://www.rrlib.net/lexington-ics-calendar/', branch: 'Lexington' },
    { url: 'https://www.rrlib.net/buena-vista-ics-calendar/', branch: 'Buena Vista' },
    { url: 'https://www.rrlib.net/glasgow-ics-calendar/', branch: 'Glasgow' },
    { url: 'https://www.rrlib.net/goshen-ics-calendar/', branch: 'Goshen' },
    { url: 'https://www.rrlib.net/bath-county-ics-calendar/', branch: 'Bath County' },
    { url: 'https://www.rrlib.net/bookmobile-ics-calendar/', branch: 'Bookmobile' }
  ],
  // Branch abbreviations used in event titles
  branches: {
    'Lex': 'Lexington',
    'LEX': 'Lexington',
    'LEX-B': 'Lexington',
    'GO': 'Goshen',
    'GL': 'Glasgow',
    'BA': 'Bath County',
    'BV': 'Buena Vista',
    'BMB': 'Bookmobile'
  }
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

// Scrape events from a single branch calendar page
async function scrapeBranchCalendar(page, calendarUrl, branchName) {
  console.log(`\n   📍 ${branchName} branch: ${calendarUrl}`);

  await page.goto(calendarUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Wait for FullCalendar to render events
  await page.waitForSelector('.fc-event, .fc-daygrid-event', { timeout: 15000 }).catch(() => {
    console.log(`      Waiting for calendar events on ${branchName}...`);
  });
  // Extra wait for AJAX content
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Extract events from FullCalendar
  const events = await page.evaluate((defaultBranch) => {
    const results = [];
    const processedKeys = new Set();

    // FullCalendar event elements
    const eventElements = document.querySelectorAll('a.fc-event, .fc-daygrid-event');

    eventElements.forEach(el => {
      try {
        // Get the title
        const titleEl = el.querySelector('.fc-event-title');
        if (!titleEl) return;

        let fullTitle = titleEl.textContent.trim();
        if (!fullTitle || fullTitle.length < 3) return;

        // Extract branch abbreviation from title (e.g., "(Lex)", "(GO)", "(LEX-B)")
        let branchAbbr = '';
        const branchMatch = fullTitle.match(/^\(([A-Za-z0-9-]+)\)\s*/);
        if (branchMatch) {
          branchAbbr = branchMatch[1];
          fullTitle = fullTitle.replace(/^\([A-Za-z0-9-]+\)\s*/, '').trim();
        }

        // Get time from fc-event-time
        let time = '';
        const timeEl = el.querySelector('.fc-event-time');
        if (timeEl) {
          time = timeEl.textContent.trim();
        }

        // Get the date from parent day cell
        let eventDate = '';
        const dayCell = el.closest('[data-date]');
        if (dayCell) {
          const dateAttr = dayCell.getAttribute('data-date');
          if (dateAttr) {
            const dateParts = dateAttr.split('-');
            if (dateParts.length === 3) {
              const months = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];
              const monthName = months[parseInt(dateParts[1]) - 1];
              eventDate = `${monthName} ${parseInt(dateParts[2])}, ${dateParts[0]}`;
            }
          }
        }

        // Create unique key to deduplicate
        const eventKey = `${fullTitle}|${eventDate}|${time}`.toLowerCase();
        if (processedKeys.has(eventKey)) return;
        processedKeys.add(eventKey);

        if (fullTitle && eventDate) {
          results.push({
            name: fullTitle,
            eventDate: eventDate,
            time: time,
            branchAbbr: branchAbbr,
            defaultBranch: defaultBranch,
            description: ''
          });
        }
      } catch (err) {
        console.log('Error parsing event:', err);
      }
    });

    return results;
  }, branchName);

  console.log(`      Found ${events.length} events`);
  return events;
}

// Main scrape function
async function scrapeRockbridgeEvents() {
  console.log(`\n📚 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   Scraping ${LIBRARY.calendarUrls.length} branch calendars...`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let allEvents = [];

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Scrape each branch calendar
    for (const calendar of LIBRARY.calendarUrls) {
      try {
        const branchEvents = await scrapeBranchCalendar(page, calendar.url, calendar.branch);
        allEvents = allEvents.concat(branchEvents);
      } catch (error) {
        console.error(`      ❌ Error scraping ${calendar.branch}:`, error.message);
      }
    }

    // Deduplicate events across branches
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const event of allEvents) {
      const key = `${event.name}|${event.eventDate}|${event.time}`.toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(event);
      }
    }

    console.log(`\n   Total unique events: ${uniqueEvents.length}`);

    // Process each event
    for (const event of uniqueEvents) {
      try {
        // Parse age range from event name and description
        const ageRange = parseAgeRange(event.name + ' ' + event.description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Skip events with "Adult" in title
        if (event.name.match(/\badult\b/i)) {
          skipped++;
          continue;
        }

        // Resolve branch name from abbreviation or use default from calendar page
        let branchName = LIBRARY.name;
        let branchKey = null;
        if (event.branchAbbr && LIBRARY.branches[event.branchAbbr]) {
          branchKey = LIBRARY.branches[event.branchAbbr];
          branchName = `${LIBRARY.name} - ${branchKey}`;
        } else if (event.defaultBranch) {
          branchKey = event.defaultBranch;
          branchName = `${LIBRARY.name} - ${event.defaultBranch}`;
        }

        // Build full event date with time if available
        const fullEventDate = event.time ? `${event.eventDate} ${event.time}` : event.eventDate;

        // Get branch address from library-addresses.js
        const branchLocation = getBranchAddress(LIBRARY.name, branchKey, LIBRARY.state);
        let coordinates = null;

        // Try to geocode using the branch address
        if (branchLocation && branchLocation.address) {
          const fullAddress = `${branchLocation.address}, ${branchLocation.city}, ${branchLocation.state} ${branchLocation.zipCode}`;
          coordinates = await geocodeAddress(fullAddress);
        }

        // Fallback to generic geocoding if branch address didn't work
        if (!coordinates) {
          coordinates = await geocodeAddress(`${branchName}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: branchName,
          eventDate: fullEventDate,
          scheduleDescription: fullEventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: branchName,
            address: branchLocation?.address || '',
            city: branchLocation?.city || LIBRARY.city,
            state: LIBRARY.state,
            zipCode: branchLocation?.zipCode || LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Rockbridge Regional Library Scraper',
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

  console.log('\n' + '='.repeat(60));
  console.log('✅ ROCKBRIDGE REGIONAL SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Rockbridge-VA', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeRockbridgeEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeRockbridgeEvents };

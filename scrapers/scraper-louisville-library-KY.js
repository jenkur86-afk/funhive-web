#!/usr/bin/env node

/**
 * LOUISVILLE FREE PUBLIC LIBRARY EVENTS SCRAPER
 *
 * Scrapes events from Louisville Free Public Library's events page
 * Uses Puppeteer to extract event listings
 *
 * Coverage: Louisville, KY (Jefferson County)
 *
 * Usage:
 *   node scrapers/scraper-louisville-library-KY.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { ScraperLogger } = require('./scraper-logger');
const ngeohash = require('ngeohash');

// Louisville Free Public Library main branch coordinates
const LIBRARY_BRANCHES = {
  'Main': {
    name: 'Main Library',
    address: '301 York St, Louisville, KY 40203',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40203',
    lat: 38.2542,
    lng: -85.7594,
    url: 'https://www.lfpl.org'
  },
  'Southwest': {
    name: 'Southwest Library',
    address: '7140 Dixie Hwy, Louisville, KY 40258',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40258',
    lat: 38.1764,
    lng: -85.7733,
    url: 'https://www.lfpl.org'
  },
  'Southeast': {
    name: 'Southeast Library',
    address: '3640 Goldsmith Ln, Louisville, KY 40218',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40218',
    lat: 38.2018,
    lng: -85.6386,
    url: 'https://www.lfpl.org'
  },
  'Highlands': {
    name: 'Highlands Library',
    address: '2014 Bardstown Rd, Louisville, KY 40204',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40204',
    lat: 38.2305,
    lng: -85.7556,
    url: 'https://www.lfpl.org'
  },
  'Shively': {
    name: 'Shively Library',
    address: '2845 Goldsmith Ln, Louisville, KY 40218',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40218',
    lat: 38.2045,
    lng: -85.6408,
    url: 'https://www.lfpl.org'
  },
  'Watterson': {
    name: 'Watterson Library',
    address: '9420 Watterson Park Dr, Louisville, KY 40299',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40299',
    lat: 38.1520,
    lng: -85.5611,
    url: 'https://www.lfpl.org'
  },
  'Middletown': {
    name: 'Middletown Library',
    address: '1001 Herrs Ln, Louisville, KY 40223',
    city: 'Louisville',
    state: 'KY',
    zipCode: '40223',
    lat: 38.2662,
    lng: -85.6555,
    url: 'https://www.lfpl.org'
  }
};

// Default to Main Library
const DEFAULT_BRANCH = LIBRARY_BRANCHES['Main'];

// Find matching library branch
function findBranch(locationText) {
  if (!locationText) return DEFAULT_BRANCH;

  const locationLower = locationText.toLowerCase();

  for (const [key, branch] of Object.entries(LIBRARY_BRANCHES)) {
    if (locationLower.includes(key.toLowerCase()) ||
        locationLower.includes(branch.name.toLowerCase())) {
      return branch;
    }
  }

  return DEFAULT_BRANCH;
}

// Extract time from event date string
function extractTime(dateStr) {
  if (!dateStr) return { startTime: null, endTime: null };

  // Match times like "2:00pm" or "2:00 PM" or "2:00pm - 3:30pm"
  const timeMatch = dateStr.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)(?:\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:am|pm)?))?/i);

  if (!timeMatch) return { startTime: null, endTime: null };

  let startTime = timeMatch[1].trim();
  let endTime = timeMatch[2] ? timeMatch[2].trim() : null;

  // Normalize time format to "H:MM AM/PM"
  startTime = startTime.replace(/([ap])m\b/i, ' $1M').toUpperCase();
  if (endTime) {
    endTime = endTime.replace(/([ap])m\b/i, ' $1M').toUpperCase();
  }

  return { startTime, endTime };
}

// Scrape Louisville Free Public Library events
async function scrapeLouisvilleLibrary() {
  const logger = new ScraperLogger('Louisville Free Public Library', 'events', {
    state: 'KY',
    county: 'Jefferson',
    source: 'louisville-library'
  });

  console.log('\n📚 LOUISVILLE FREE PUBLIC LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Source: https://www.lfpl.org/events\n');

  let browser = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Navigate to events page
    console.log('📅 Loading events page: https://www.lfpl.org/events');
    await page.goto('https://www.lfpl.org/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract all events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors for event containers
      const eventElements = document.querySelectorAll(
        '[class*="event"], [class*="program"], article, .event-item, [data-event], li[class*="event"]'
      );

      eventElements.forEach(el => {
        try {
          // Extract title
          let title = '';
          const titleEl = el.querySelector('h2, h3, [class*="title"], [class*="heading"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }

          if (!title) {
            title = el.textContent.split('\n')[0]?.trim();
          }

          if (!title || title.length < 3) return;

          // Extract date/time
          let eventDate = '';
          let dateEl = el.querySelector('[class*="date"], [class*="time"], time');
          if (dateEl) {
            eventDate = dateEl.textContent.trim();
          } else {
            // Look for date patterns in text
            const text = el.textContent;
            const dateMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]?\s+\d{1,2},?\s+\d{4}?/i);
            if (dateMatch) {
              eventDate = dateMatch[0];
            }
          }

          // Extract location/venue
          let venue = '';
          const venueEl = el.querySelector('[class*="location"], [class*="venue"], [class*="place"]');
          if (venueEl) {
            venue = venueEl.textContent.trim();
          } else {
            // Look for location text
            const text = el.textContent;
            const venueMatch = text.match(/(?:at|location|venue):\s*([^\n]+)/i);
            if (venueMatch) {
              venue = venueMatch[1].trim().substring(0, 100);
            }
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('[class*="description"], [class*="content"], p');
          if (descEl) {
            description = descEl.textContent.trim().substring(0, 500);
          } else {
            description = el.textContent.substring(0, 500);
          }

          // Extract URL
          let url = '';
          const linkEl = el.querySelector('a[href*="/event"], a');
          if (linkEl) {
            url = linkEl.href;
          }

          if (title && eventDate) {
            results.push({
              title: title,
              eventDate: eventDate,
              venue: venue,
              description: description,
              url: url
            });
          }
        } catch (err) {
          // Skip this element on error
        }
      });

      return results;
    });

    logger.trackFound(events.length);
    console.log(`  ✅ Found ${events.length} events\n`);

    // Process events for saving
    const processedEvents = [];

    for (const event of events) {
      try {
        // Extract time information
        const { startTime, endTime } = extractTime(event.eventDate);

        // Find matching branch
        const branch = findBranch(event.venue);

        // Build event object for saveEventsWithGeocoding
        const processedEvent = {
          title: event.title,
          name: event.title,
          date: event.eventDate,
          eventDate: event.eventDate,
          startTime: startTime,
          endTime: endTime,
          venueName: event.venue || branch.name,
          venue: event.venue || branch.name,
          description: event.description,
          url: event.url || 'https://www.lfpl.org/events',
          location: event.venue || branch.name,
          metadata: {
            sourceName: 'Louisville Free Public Library'
          }
        };

        processedEvents.push(processedEvent);
      } catch (err) {
        logger.trackError(err);
      }
    }

    // Save events with geocoding
    const librariesForSave = [
      {
        name: 'Louisville Free Public Library',
        city: 'Louisville',
        state: 'KY',
        zipCode: '40203',
        address: DEFAULT_BRANCH.address,
        url: 'https://www.lfpl.org/events',
        county: 'Jefferson'
      }
    ];

    const saveResult = await saveEventsWithGeocoding(processedEvents, librariesForSave, {
      scraperName: 'Louisville Free Public Library',
      state: 'KY',
      category: 'library',
      platform: 'lfpl-custom'
    });

    logger.stats.new = saveResult.saved;
    logger.stats.pastDate = saveResult.skipped;
    logger.stats.errors = saveResult.errors;

  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    logger.trackError(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Log final results
  await logger.finish();

  return {
    success: logger.stats.errors === 0,
    stats: logger.stats
  };
}

// Cloud Function export
async function scrapeLouisvilleLibraryCloudFunction(req, res) {
  try {
    const result = await scrapeLouisvilleLibrary();
    res.status(200).json({
      success: result.success,
      message: `Successfully scraped ${result.stats.new} events`,
      stats: result.stats
    });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeLouisvilleLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeLouisvilleLibrary,
  scrapeLouisvilleLibraryCloudFunction
};

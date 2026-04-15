#!/usr/bin/env node

/**
 * MIAMI-DADE PUBLIC LIBRARY SYSTEM EVENTS SCRAPER
 *
 * Scrapes events from Miami-Dade Public Library System
 * Uses Puppeteer with JavaScript rendering for amEvents jQuery plugin
 *
 * Coverage: Miami-Dade County, FL
 * Source: https://mdpls.org/events
 *
 * Usage:
 *   node scrapers/scraper-miami-dade-library-FL.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { ScraperLogger } = require('./scraper-logger');
const ngeohash = require('ngeohash');

// Miami-Dade Public Library main branch coordinates
const LIBRARY_BRANCHES = {
  'Main': {
    name: 'Main Library',
    address: '101 W Flagler St, Miami, FL 33130',
    city: 'Miami',
    state: 'FL',
    zipCode: '33130',
    lat: 25.7617,
    lng: -80.1918,
    url: 'https://mdpls.org'
  },
  'Allapattah': {
    name: 'Allapattah Library',
    address: '1313 NW 24th St, Miami, FL 33125',
    city: 'Miami',
    state: 'FL',
    zipCode: '33125',
    lat: 25.7681,
    lng: -80.2344,
    url: 'https://mdpls.org'
  },
  'Buena Vista': {
    name: 'Buena Vista Library',
    address: '3645 Main Hwy, Miami, FL 33133',
    city: 'Miami',
    state: 'FL',
    zipCode: '33133',
    lat: 25.7383,
    lng: -80.2364,
    url: 'https://mdpls.org'
  },
  'Brownsville': {
    name: 'Brownsville Library',
    address: '3795 NW 36th St, Miami, FL 33142',
    city: 'Miami',
    state: 'FL',
    zipCode: '33142',
    lat: 25.8141,
    lng: -80.2425,
    url: 'https://mdpls.org'
  },
  'Coral Way': {
    name: 'Coral Way Library',
    address: '2211 SW 8th St, Miami, FL 33135',
    city: 'Miami',
    state: 'FL',
    zipCode: '33135',
    lat: 25.7442,
    lng: -80.2444,
    url: 'https://mdpls.org'
  },
  'Culmer': {
    name: 'Culmer Library',
    address: '501 NW 24th St, Miami, FL 33127',
    city: 'Miami',
    state: 'FL',
    zipCode: '33127',
    lat: 25.8014,
    lng: -80.2108,
    url: 'https://mdpls.org'
  },
  'Wynwood': {
    name: 'Wynwood Library',
    address: '770 NW 24th St, Miami, FL 33127',
    city: 'Miami',
    state: 'FL',
    zipCode: '33127',
    lat: 25.8056,
    lng: -80.2031,
    url: 'https://mdpls.org'
  },
  'Kendall': {
    name: 'Kendall Library',
    address: '9101 SW 107th Ave, Miami, FL 33173',
    city: 'Miami',
    state: 'FL',
    zipCode: '33173',
    lat: 25.6936,
    lng: -80.3569,
    url: 'https://mdpls.org'
  },
  'South Miami': {
    name: 'South Miami Library',
    address: '6001 SW 67th Ave, South Miami, FL 33143',
    city: 'Miami',
    state: 'FL',
    zipCode: '33143',
    lat: 25.7239,
    lng: -80.3083,
    url: 'https://mdpls.org'
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

// Scrape Miami-Dade Public Library events
async function scrapeMiamiDadeLibrary() {
  const logger = new ScraperLogger('Miami-Dade Public Library', 'events', {
    state: 'FL',
    county: 'Miami-Dade',
    source: 'miami-dade-library'
  });

  console.log('\n📚 MIAMI-DADE PUBLIC LIBRARY SYSTEM SCRAPER');
  console.log('='.repeat(60));
  console.log('Source: https://mdpls.org/events\n');

  let browser = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Navigate to events page
    console.log('📅 Loading events page: https://mdpls.org/events');
    await page.goto('https://mdpls.org/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for amEvents jQuery plugin to render - this is JavaScript-heavy
    console.log('⏳ Waiting for events to render (amEvents plugin)...');
    try {
      await page.waitForSelector('[class*="event"], [class*="calendar"], [class*="am-event"], .event-item', {
        timeout: 15000
      });
    } catch (err) {
      console.log('⚠️  Events selector not found, trying alternative wait');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Additional wait for DOM to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract all events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors for event containers (amEvents plugin common selectors)
      const eventElements = document.querySelectorAll(
        '.event-item, [class*="am-event"], [class*="event"], .calendar-event, [data-event], article'
      );

      eventElements.forEach(el => {
        try {
          // Extract title
          let title = '';
          const titleEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="heading"], .event-title');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }

          if (!title) {
            // Fallback: first text node of substantial length
            const textContent = el.textContent.trim();
            const lines = textContent.split('\n').filter(l => l.trim().length > 0);
            title = lines[0]?.trim() || '';
          }

          if (!title || title.length < 3) return;

          // Extract date/time from various possible locations
          let eventDate = '';

          // Try data attributes first
          const dataDate = el.getAttribute('data-date') || el.getAttribute('data-event-date');
          if (dataDate) {
            eventDate = dataDate;
          }

          // Try dedicated date element
          if (!eventDate) {
            const dateEl = el.querySelector('[class*="date"], time, [class*="event-date"], .date');
            if (dateEl) {
              eventDate = dateEl.textContent.trim();
            }
          }

          // Try to extract from text content
          if (!eventDate) {
            const text = el.textContent;
            // Match various date formats
            const dateMatch = text.match(
              /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/i
            );
            if (dateMatch) {
              eventDate = dateMatch[0];
            }
          }

          // Extract location/venue
          let venue = '';
          const venueEl = el.querySelector('[class*="location"], [class*="venue"], [class*="place"], .event-location');
          if (venueEl) {
            venue = venueEl.textContent.trim();
          }

          if (!venue) {
            // Try to find location in text
            const text = el.textContent;
            const venueMatch = text.match(/(?:at|location|venue):\s*([^\n]+)/i);
            if (venueMatch) {
              venue = venueMatch[1].trim().substring(0, 100);
            }
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('[class*="description"], [class*="content"], p, .event-description');
          if (descEl) {
            description = descEl.textContent.trim().substring(0, 500);
          }

          if (!description) {
            // Use remaining text content as fallback
            const allText = el.textContent.substring(0, 500);
            description = allText.replace(title, '').trim();
          }

          // Extract URL
          let url = '';
          const linkEl = el.querySelector('a[href*="/event"], a[href*="/programs"], a');
          if (linkEl && linkEl.href) {
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
          url: event.url || 'https://mdpls.org/events',
          location: event.venue || branch.name,
          metadata: {
            sourceName: 'Miami-Dade Public Library'
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
        name: 'Miami-Dade Public Library',
        city: 'Miami',
        state: 'FL',
        zipCode: '33130',
        address: DEFAULT_BRANCH.address,
        url: 'https://mdpls.org/events',
        county: 'Miami-Dade'
      }
    ];

    const saveResult = await saveEventsWithGeocoding(processedEvents, librariesForSave, {
      scraperName: 'Miami-Dade Public Library',
      state: 'FL',
      category: 'library',
      platform: 'mdpls-custom'
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
async function scrapeMiamiDadeLibraryCloudFunction(req, res) {
  try {
    const result = await scrapeMiamiDadeLibrary();
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
  scrapeMiamiDadeLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMiamiDadeLibrary,
  scrapeMiamiDadeLibraryCloudFunction
};

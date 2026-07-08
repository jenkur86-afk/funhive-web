#!/usr/bin/env node

/**
 * BROOKLYN PUBLIC LIBRARY EVENTS SCRAPER
 *
 * Scrapes real-time events from Brooklyn Public Library website using Puppeteer
 * Covers all 60+ BPL branches across Brooklyn
 *
 * Source: https://www.bklynlibrary.org/calendar/list
 * Alternative: https://discover.bklynlibrary.org/?event=true
 *
 * Usage:
 *   node scripts/scraper-brooklyn-library-NY.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');

// Brooklyn Public Library branches with coordinates (representative sample)
const BROOKLYN_LIBRARY_BRANCHES = {
  'Central Library': {
    address: '10 Flatbush Avenue, Brooklyn, NY 11217',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11217',
    lat: 40.6807,
    lng: -73.9898
  },
  'Bay Ridge': {
    address: '7414 20th Avenue, Brooklyn, NY 11204',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11204',
    lat: 40.5995,
    lng: -74.0101
  },
  'Bensonhurst': {
    address: '1901 86th Street, Brooklyn, NY 11214',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11214',
    lat: 40.5903,
    lng: -74.0035
  },
  'Brooklyn Heights': {
    address: '280 Cadman Plaza West, Brooklyn, NY 11201',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11201',
    lat: 40.6952,
    lng: -73.9909
  },
  'Brownsville': {
    address: '61 Glenmore Avenue, Brooklyn, NY 11212',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11212',
    lat: 40.6484,
    lng: -73.9410
  },
  'Bushwick': {
    address: '104 Onderdonk Avenue, Brooklyn, NY 11237',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11237',
    lat: 40.6796,
    lng: -73.8905
  },
  'Carroll Gardens': {
    address: '396 Clinton Street, Brooklyn, NY 11231',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11231',
    lat: 40.6760,
    lng: -73.9849
  },
  'Coney Island': {
    address: '1901 Mermaid Avenue, Brooklyn, NY 11224',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11224',
    lat: 40.5760,
    lng: -73.9878
  },
  'Downtown Brooklyn': {
    address: '33 Flatbush Avenue, Brooklyn, NY 11217',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11217',
    lat: 40.6858,
    lng: -73.9743
  },
  'East Flatbush': {
    address: '9402 Church Lane, Brooklyn, NY 11236',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11236',
    lat: 40.6393,
    lng: -73.9416
  },
  'Flatbush': {
    address: '22 Snediker Avenue, Brooklyn, NY 11226',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11226',
    lat: 40.6340,
    lng: -73.9656
  },
  'Greenpoint': {
    address: '107 Norman Avenue, Brooklyn, NY 11222',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11222',
    lat: 40.7451,
    lng: -73.9526
  },
  'Park Slope': {
    address: '431 15th Street, Brooklyn, NY 11215',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11215',
    lat: 40.6619,
    lng: -73.9860
  },
  'Prospect Heights': {
    address: '393 Eastern Parkway, Brooklyn, NY 11238',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11238',
    lat: 40.6692,
    lng: -73.9736
  },
  'Sunset Park': {
    address: '5445 5th Avenue, Brooklyn, NY 11220',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11220',
    lat: 40.6408,
    lng: -74.0188
  },
  'Williamsburg': {
    address: '240 Division Avenue, Brooklyn, NY 11211',
    city: 'Brooklyn',
    state: 'NY',
    county: 'Kings',
    zipCode: '11211',
    lat: 40.7092,
    lng: -73.9597
  }
};

// Default Brooklyn reference
const DEFAULT_BRANCH = {
  name: 'Brooklyn Public Library',
  address: '10 Flatbush Avenue, Brooklyn, NY 11217',
  city: 'Brooklyn',
  state: 'NY',
  county: 'Kings',
  zipCode: '11217',
  lat: 40.6807,
  lng: -73.9898
};

/**
 * Find matching library branch by name
 */
function findBranch(eventVenueOrTitle, eventTitle = '') {
  if (!eventVenueOrTitle) return DEFAULT_BRANCH;

  const combinedText = `${eventVenueOrTitle} ${eventTitle}`.toLowerCase();

  for (const [branchName, branchData] of Object.entries(BROOKLYN_LIBRARY_BRANCHES)) {
    const branchNameLower = branchName.toLowerCase();
    if (combinedText.includes(branchNameLower)) {
      return { name: branchName, ...branchData };
    }
  }

  return { name: 'Brooklyn Public Library', ...DEFAULT_BRANCH };
}

/**
 * Scrape Brooklyn Public Library events using Puppeteer
 */
async function scrapeBrooklynLibrary() {
  console.log('\n📚 BROOKLYN PUBLIC LIBRARY EVENTS SCRAPER');
  console.log('='.repeat(60));
  console.log('Source: https://www.bklynlibrary.org/calendar/list\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let foundCount = 0;
  const events = [];

  let browser;
  try {
    browser = await launchBrowser();
    const page = await createStealthPage(browser);

    // Navigate to BPL events calendar
    console.log('📅 Loading events calendar...');
    try {
      await page.goto('https://www.bklynlibrary.org/calendar/list', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (navErr) {
      console.log('⚠️ Primary URL timeout, trying discover endpoint...');
      await page.goto('https://discover.bklynlibrary.org/?event=true', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    }

    // Wait for event cards to render (React SPA)
    console.log('⏳ Waiting for events to load...');
    try {
      await page.waitForSelector('.result-container', { timeout: 15000 });
    } catch (e) {
      console.log('⚠️ .result-container not found, proceeding with page evaluation');
    }

    // Additional wait for React rendering
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from page
    console.log('📖 Extracting event data...\n');
    const pageEvents = await page.evaluate(() => {
      const results = [];

      // The site migrated from a standalone calendar to a BiblioCommons-style
      // discovery/search portal (discover.bklynlibrary.org?event=true). Real
      // event cards live under `.result-container`; the old `[class*="event"]`
      // selector only matched sub-fragments of each card (date/time/venue rows,
      // hidden error-message divs, etc.), never the card itself.
      const eventElements = Array.from(document.querySelectorAll('.result-container'));

      eventElements.forEach(el => {
        try {
          const titleEl = el.querySelector('.result-title a');
          if (!titleEl) return;
          const title = titleEl.textContent.trim();
          const url = titleEl.href || '';
          if (!title) return;

          // Each of date/time/venue lives in its own `.flex` row inside
          // `.event-date-location-container`: an icon <div> followed by a
          // text <div> (venue's text div additionally has class "notranslate").
          // Order is fixed: date, time, venue.
          const flexRows = el.querySelectorAll('.event-date-location-container .flex');
          let eventDate = '';
          let timeRange = '';
          let venue = '';
          flexRows.forEach((row, i) => {
            const textDiv = row.children[1];
            const text = textDiv ? textDiv.textContent.trim() : '';
            if (i === 0) eventDate = text;       // e.g. "Wed, Jul 8" (no year - normalizeDateString infers it)
            else if (i === 1) timeRange = text;  // e.g. "1:00am to 3:00pm"
            else if (i === 2) venue = text;      // e.g. "Paerdegat Library"
          });

          const timeMatch = timeRange.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*(?:to|-)\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
          const startTime = timeMatch ? timeMatch[1].toUpperCase().replace(/([AP])M/, ' $1M') : '';
          const endTime = timeMatch ? timeMatch[2].toUpperCase().replace(/([AP])M/, ' $1M') : '';

          const description = (el.querySelector('.web-summary')?.textContent || '').trim().substring(0, 500);

          // Extract age range if present
          const fullText = el.textContent || '';
          let ageRange = '';
          if (fullText.match(/baby|infant|toddler|0[–-]?2/i)) ageRange = 'Babies & Toddlers (0-2)';
          else if (fullText.match(/preschool|3[–-]?5|ages 3-5/i)) ageRange = 'Preschool (3-5)';
          else if (fullText.match(/children|kids|6[–-]?8|ages 6-8/i)) ageRange = 'Kids (6-8)';
          else if (fullText.match(/tween|9[–-]?12|ages 9-12/i)) ageRange = 'Tweens (9-12)';
          else if (fullText.match(/teen|13[–-]?18|ages 13-18/i)) ageRange = 'Teens (13-18)';

          if (title && eventDate) {
            results.push({
              title: title.substring(0, 150),
              date: eventDate,
              startTime: startTime,
              endTime: endTime,
              venue: venue,
              description: description,
              url: url,
              ageRange: ageRange
            });
          }
        } catch (err) {
          // Skip malformed elements silently
        }
      });

      return results;
    });

    console.log(`  ✅ Found ${pageEvents.length} events\n`);
    foundCount = pageEvents.length;

    // Process extracted events
    for (const event of pageEvents) {
      try {
        const branch = findBranch(event.venue, event.title);

        const processedEvent = {
          title: event.title,
          name: event.title,
          venueName: branch.name || 'Brooklyn Public Library',
          venue: branch.name || 'Brooklyn Public Library',
          location: event.venue || branch.name,
          date: event.date,
          eventDate: event.date,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          description: event.description || `Event at ${branch.name}`,
          url: event.url || 'https://www.bklynlibrary.org/calendar/list',
          ageRange: event.ageRange || 'All Ages',
          metadata: {
            source: 'Brooklyn Public Library',
            sourceName: branch.name || 'Brooklyn Public Library'
          }
        };

        events.push(processedEvent);
      } catch (error) {
        console.error(`  ❌ Error processing event: ${error.message}`);
        failed++;
      }
    }

    console.log(`📊 Processed ${events.length} events for saving\n`);

  } catch (error) {
    console.error('❌ Fatal scraping error:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Save events using helper
  try {
    const libraryList = Object.values(BROOKLYN_LIBRARY_BRANCHES).map(branch => ({
      name: Object.keys(BROOKLYN_LIBRARY_BRANCHES).find(k => BROOKLYN_LIBRARY_BRANCHES[k] === branch),
      city: branch.city,
      state: branch.state,
      zipCode: branch.zipCode,
      address: branch.address,
      county: branch.county,
      url: 'https://www.bklynlibrary.org'
    }));

    const result = await saveEventsWithGeocoding(events, libraryList, {
      scraperName: 'scraper-brooklyn-library-NY',
      state: 'NY',
      category: 'library',
      platform: 'bpl-website'
    });

    imported = result.saved;
    skipped = result.skipped + (result.invalidDate || 0);

  } catch (saveError) {
    console.error('❌ Error saving events:', saveError.message);
    failed++;
  }

  // Log results
  console.log('\n' + '='.repeat(60));
  console.log('✅ BROOKLYN PUBLIC LIBRARY SCRAPER COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   Imported: ${imported} events`);
  console.log(`   Skipped: ${skipped} events`);
  console.log(`   Failed: ${failed} events`);
  console.log('='.repeat(60) + '\n');

  // Log for monitoring
  await logScraperResult('Brooklyn Public Library', {
    found: foundCount,
    new: imported,
    duplicates: skipped,
    errors: failed
  }, {
    state: 'NY',
    source: 'Brooklyn Public Library'
  });

  return { found: foundCount, new: imported, imported, skipped, failed };
}

/**
 * Cloud Function wrapper
 */
async function scrapeBrooklynLibraryCloudFunction(req, res) {
  try {
    const result = await scrapeBrooklynLibrary();
    res.json({
      success: true,
      result: result
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
  scrapeBrooklynLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeBrooklynLibrary,
  scrapeBrooklynLibraryCloudFunction
};

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
      await Promise.race([
        page.waitForSelector('[class*="event"]', { timeout: 15000 }),
        page.waitForSelector('article', { timeout: 15000 }),
        page.waitForSelector('[class*="card"]', { timeout: 15000 })
      ]).catch(() => {
        console.log('⚠️ Event selectors not found, proceeding with page evaluation');
      });
    } catch (e) {
      console.log('⚠️ Timeout waiting for events, proceeding');
    }

    // Additional wait for React rendering
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from page
    console.log('📖 Extracting event data...\n');
    const pageEvents = await page.evaluate(() => {
      const results = [];

      // Try multiple selector strategies
      let eventElements = [];

      // Strategy 1: Look for article tags
      eventElements = Array.from(document.querySelectorAll('article'));

      // Strategy 2: Look for divs with event-like classes
      if (eventElements.length === 0) {
        eventElements = Array.from(document.querySelectorAll('[class*="event"], [class*="card"]'));
      }

      // Strategy 3: Look for links with event-like paths
      if (eventElements.length === 0) {
        eventElements = Array.from(document.querySelectorAll('a[href*="/event"], a[href*="/events"]'));
      }

      eventElements.forEach(el => {
        try {
          const fullText = el.textContent || '';
          if (!fullText.trim()) return;

          // Extract title
          let title = '';
          const titleEl = el.querySelector('h2, h3, h4, .title, [class*="title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            const parts = fullText.split(/\d{1,2}[\/-]\d{1,2}/);
            if (parts[0]) {
              title = parts[0].trim().substring(0, 100);
            }
          }

          // Extract URL
          let url = '';
          const linkEl = el.querySelector('a[href*="/event"], a[href*="/calendar"]');
          if (linkEl) {
            url = linkEl.href || '';
          } else if (el.tagName === 'A') {
            url = el.href || '';
          }

          // Extract date and time
          let eventDate = '';
          let startTime = '';
          let endTime = '';

          const dateMatch = fullText.match(
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i
          );
          if (dateMatch) {
            eventDate = dateMatch[0];
          }

          const timeMatch = fullText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/gi);
          if (timeMatch && timeMatch.length >= 1) {
            startTime = timeMatch[0].toUpperCase().replace(/([AP])M/, ' $1M');
          }
          if (timeMatch && timeMatch.length >= 2) {
            endTime = timeMatch[1].toUpperCase().replace(/([AP])M/, ' $1M');
          }

          // Extract location/branch
          let venue = '';
          const locationMatch = fullText.match(/(?:at|location|branch):\s*([^,\n]+)/i);
          if (locationMatch) {
            venue = locationMatch[1].trim();
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('[class*="description"], [class*="desc"], p');
          if (descEl) {
            description = descEl.textContent.trim().substring(0, 500);
          }

          // Extract age range if present
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
    skipped = result.skipped;
    failed += result.errors;

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
  await logScraperResult({
    scraperName: 'Brooklyn Public Library',
    state: 'NY',
    city: 'Brooklyn',
    imported,
    skipped,
    failed,
    status: failed > 0 ? 'warning' : 'success'
  });

  return { imported, skipped, failed };
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

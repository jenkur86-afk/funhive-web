#!/usr/bin/env node

/**
 * THE EVENTS CALENDAR (WORDPRESS) MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using "The Events Calendar" WordPress plugin
 * This is a very popular plugin used by many Virginia libraries
 *
 * COVERAGE (14 library systems in VA and PA):
 *
 * VA:
 * - Washington County Public Library (Abingdon) - 55,000 population
 * - Wythe-Grayson Regional Library (Wytheville) - 50,000 population
 * - Alleghany Highlands Regional Library (Covington) - 25,000 population
 * - Galax-Carroll Regional Library - 35,000 population
 * - Charlotte County Library - 12,000 population
 * - Halifax County-South Boston Library - 35,000 population
 * - Blackwater Regional Library (Courtland) - 75,000 population
 * - Rappahannock County Library (Washington) - 7,500 population
 * - Heritage Public Library (New Kent) - 25,000 population
 * - Shenandoah County Library - 45,000 population
 * - Bristol Public Library - 17,000 population
 * - Pittsylvania County Public Library - 59,000 population
 *
 * PA:
 * - Carnegie Library of Pittsburgh - 1,232,000 population
 * - Osterhout Free Library (Luzerne County) - 325,000 population
 *
 * Usage:
 *   node functions/scrapers/scraper-wordpress-events-calendar-libraries-VA-PA.js
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

// Library Systems using The Events Calendar WordPress plugin
const LIBRARY_SYSTEMS = [
  {
    name: 'Washington County Public Library',
    url: 'https://www.wcpl.net/events/',
    county: 'Washington',
    state: 'VA',
    website: 'https://www.wcpl.net',
    city: 'Abingdon',
    zipCode: '24210'
  },
  {
    name: 'Wythe-Grayson Regional Library',
    url: 'https://wythegrayson.lib.va.us/calendar/',
    county: 'Wythe',
    state: 'VA',
    website: 'https://wythegrayson.lib.va.us',
    city: 'Wytheville',
    zipCode: '24382'
  },
  {
    name: 'Alleghany Highlands Regional Library',
    url: 'https://ahrlib.org/events/',
    county: 'Alleghany',
    state: 'VA',
    website: 'https://ahrlib.org',
    city: 'Covington',
    zipCode: '24426'
  },
  {
    name: 'Galax-Carroll Regional Library',
    url: 'https://galaxcarroll.lib.va.us/events/',
    county: 'Carroll',
    state: 'VA',
    website: 'https://galaxcarroll.lib.va.us',
    city: 'Galax',
    zipCode: '24333'
  },
  {
    name: 'Charlotte County Library',
    url: 'https://cclibrary.net/events/',
    county: 'Charlotte',
    state: 'VA',
    website: 'https://cclibrary.net',
    city: 'Charlotte Court House',
    zipCode: '23923'
  },
  {
    name: 'Halifax County-South Boston Library',
    url: 'https://halifaxlibrary.org/events/',
    county: 'Halifax',
    state: 'VA',
    website: 'https://halifaxlibrary.org',
    city: 'South Boston',
    zipCode: '24592'
  },
  {
    name: 'Blackwater Regional Library',
    url: 'https://blackwaterlib.org/events/',
    county: 'Southampton',
    state: 'VA',
    website: 'https://blackwaterlib.org',
    city: 'Courtland',
    zipCode: '23837'
  },
  {
    name: 'Rappahannock County Library',
    url: 'https://rappahannocklibrary.org/events/',
    county: 'Rappahannock',
    state: 'VA',
    website: 'https://rappahannocklibrary.org',
    city: 'Washington',
    zipCode: '22747'
  },
  {
    name: 'Heritage Public Library',
    url: 'https://heritagepubliclibrary.org/events-programs/',
    county: 'New Kent',
    state: 'VA',
    website: 'https://heritagepubliclibrary.org',
    city: 'New Kent',
    zipCode: '23124'
  },
  // REMOVED: Shenandoah County Library - uses JEvents (Joomla), not WordPress Events Calendar
  // {
  //   name: 'Shenandoah County Library',
  //   url: 'https://countylib.org/calendar/',
  //   county: 'Shenandoah',
  //   state: 'VA',
  //   website: 'https://countylib.org',
  //   city: 'Edinburg',
  //   zipCode: '22824'
  // },
  {
    name: 'Bristol Public Library',
    url: 'https://bristolpubliclibrary.org/events/',
    county: 'Bristol',
    state: 'VA',
    website: 'https://bristolpubliclibrary.org',
    city: 'Bristol',
    zipCode: '24201'
  },
  {
    name: 'Pittsylvania County Public Library',
    url: 'https://pcplib.org/events/',
    county: 'Pittsylvania',
    state: 'VA',
    website: 'https://pcplib.org',
    city: 'Chatham',
    zipCode: '24531'
  },

  // PENNSYLVANIA
  {
    name: 'Carnegie Library of Pittsburgh',
    url: 'https://www.carnegielibrary.org/events/',
    county: 'Allegheny',
    state: 'PA',
    website: 'https://www.carnegielibrary.org',
    city: 'Pittsburgh',
    zipCode: '15213'
  },

  {
    name: 'Osterhout Free Library',
    url: 'https://osterhout.info/events/',
    county: 'Luzerne',
    state: 'PA',
    website: 'https://osterhout.info',
    city: 'Wilkes-Barre',
    zipCode: '18701'
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

// Scrape events from WordPress Events Calendar library
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

    // Try list view first (shows all upcoming events), fall back to default URL
    const listViewUrl = library.url.replace(/\/?$/, '/').replace(/events\/?$/, 'events/list/');
    const urlsToTry = [library.url];
    // Add list view URL if it's different from the base URL
    if (listViewUrl !== library.url && !library.url.includes('/list')) {
      urlsToTry.unshift(listViewUrl);
    }

    let events = [];
    for (const tryUrl of urlsToTry) {
      await page.goto(tryUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for events to load
      await page.waitForSelector('body', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract events from the page
      events = await page.evaluate(() => {
      const results = [];

      // The Events Calendar uses specific classes
      const selectors = [
        '.tribe-events-calendar-list__event',    // Modern Tribe Events Calendar
        '.tribe-event',                           // Classic version
        '.mec-event-article',                     // Modern Events Calendar variant
        'article[class*="tribe"]',                // Article with tribe class
        'article[class*="event"]',                // Generic event articles
        '.event-item',                            // Alternative
        '[data-tribe-event]'                      // Data attribute
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Look for event title in various structures
          const titleEl = el.querySelector('.tribe-events-calendar-list__event-title, .tribe-event-title, .mec-event-title, h1, h2, h3, h4, a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const linkEl = el.querySelector('a[href*="event"], a[href*="calendar"]');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date - WordPress Events Calendar formats
          let eventDate = '';
          const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                           fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i) ||
                           fullText.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
          if (dateMatch) eventDate = dateMatch[0];

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract description
          let description = '';
          const descEl = el.querySelector('.tribe-events-calendar-list__event-description, .tribe-event-description, .mec-event-description, p');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract location/venue
          let location = '';
          const locationEl = el.querySelector('.tribe-events-venue-title, .mec-event-venue, [class*="venue"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          } else {
            const locationMatch = fullText.match(/(?:Location|Venue|Branch):\s*([^\n]+)/i);
            if (locationMatch) {
              location = locationMatch[1].trim();
            }
          }

          // Extract category/audience
          let audience = '';
          const categoryEl = el.querySelector('.tribe-events-event-categories, .mec-event-category, [class*="category"]');
          if (categoryEl) {
            audience = categoryEl.textContent.trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              audience: audience
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

      // If we found events, stop trying alternative URLs
      if (events.length > 0) break;
    }

    // If still 0 events, try clicking "Next Month" to navigate forward
    if (events.length === 0) {
      const nextBtnSelectors = [
        '.tribe-events-c-nav__next',
        '.tribe-events-nav-next a',
        'a[rel="next"]',
        '.mec-load-more-button',
        'a[class*="next"]',
        '.tribe-events-sub-nav .tribe-events-nav-next a'
      ];
      for (const sel of nextBtnSelectors) {
        try {
          const nextBtn = await page.$(sel);
          if (nextBtn) {
            await nextBtn.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            events = await page.evaluate(() => {
              const results = [];
              const sels = ['.tribe-events-calendar-list__event', '.tribe-event', '.mec-event-article', 'article[class*="tribe"]', 'article[class*="event"]'];
              let els = [];
              for (const s of sels) { els = document.querySelectorAll(s); if (els.length) break; }
              els.forEach(el => {
                const titleEl = el.querySelector('.tribe-events-calendar-list__event-title, .tribe-event-title, .mec-event-title, h1, h2, h3, h4, a');
                if (!titleEl) return;
                const title = titleEl.textContent.trim();
                const fullText = el.textContent;
                let eventDate = '';
                const dm = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) || fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
                if (dm) eventDate = dm[0];
                let time = '';
                const tm = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) || fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
                if (tm) time = tm[0];
                const descEl = el.querySelector('.tribe-events-calendar-list__event-description, .tribe-event-description, .mec-event-description, p');
                const locationEl = el.querySelector('.tribe-events-venue-title, .mec-event-venue, [class*="venue"]');
                if (title && eventDate) {
                  results.push({
                    name: title,
                    eventDate: time ? eventDate + ' ' + time : eventDate,
                    venue: locationEl?.textContent?.trim() || '',
                    description: descEl?.textContent?.trim() || '',
                    url: el.querySelector('a[href*="event"]')?.href || '',
                    audience: ''
                  });
                }
              });
              return results;
            });
            if (events.length > 0) break;
          }
        } catch (e) { /* next selector */ }
      }
    }

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description and audience
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize the date string
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;

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
          moreInfo: event.audience || '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            latitude: coordinates?.latitude || null,
            longitude: coordinates?.longitude || null
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'WordPress Events Calendar Scraper',
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
async function scrapeWordPressEventsCalendarLibraries() {
  console.log('\n📚 WORDPRESS EVENTS CALENDAR MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 12 libraries in VA, 2 libraries in PA\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('WordPress-Events-VA-PA', 'events', {
    source: 'wordpress-events-calendar'
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
  scrapeWordPressEventsCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWordPressEventsCalendarLibraries };

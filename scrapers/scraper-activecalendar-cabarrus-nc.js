#!/usr/bin/env node

/**
 * CABARRUS COUNTY PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Cabarrus County Public Library
 *
 * COVERAGE:
 * - Cabarrus County Public Library (NC) - 216,000 people
 *
 * Platform: SirsiDynix (primary) / ActiveCalendar (fallback)
 *
 * KNOWN ISSUES (as of Dec 2025):
 * - Library migrated from ActiveCalendar to SirsiDynix
 * - SirsiDynix site (cabarrus-cep.bc.sirsidynix.net) has aggressive Cloudflare
 *   Turnstile protection that cannot be bypassed with stealth mode
 * - ActiveCalendar site (/site/library/) is deprecated and has no events
 *
 * POTENTIAL FIXES:
 * 1. Contact library for API access or RSS feed URL
 * 2. Use a Cloudflare bypass service (2captcha, etc.)
 * 3. Monitor if library exposes an API endpoint in the future
 *
 * Usage:
 *   node functions/scrapers/scraper-activecalendar-cabarrus-nc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const cheerio = require('cheerio');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Puppeteer-extra with stealth for Cloudflare bypass
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Library configuration
const LIBRARY = {
  name: 'Cabarrus County Public Library',
  sirsiUrl: 'https://cabarrus-cep.bc.sirsidynix.net/events/list/',
  activeCalendarUrl: 'https://go.activecalendar.com/cabarruscounty/site/library/',
  county: 'Cabarrus',
  state: 'NC',
  website: 'https://www.cabarruscounty.us/government/departments/library',
  city: 'Concord',
  zipCode: '28025'
};

// Branch locations for geocoding
const BRANCHES = {
  'Concord Library': { address: '27 Union St N', city: 'Concord', zipCode: '28025' },
  'Kannapolis Library': { address: '850 Mountain St', city: 'Kannapolis', zipCode: '28081' },
  'Harrisburg Library': { address: '201 Sims Pkwy', city: 'Harrisburg', zipCode: '28075' },
  'Midland Library': { address: '4297 NC Hwy 24-27', city: 'Midland', zipCode: '28107' },
  'Mt. Pleasant Library': { address: '1111 N Washington St', city: 'Mt Pleasant', zipCode: '28124' },
  'Afton Library': { address: '6095 Glen Afton Blvd', city: 'Kannapolis', zipCode: '28027' }
};

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';
  const lowerText = text.toLowerCase();

  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i) || lowerText.match(/21\+/i)) {
    return 'Adults';
  }
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Find branch from location text
function findBranch(locationText) {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();

  for (const [branchName, info] of Object.entries(BRANCHES)) {
    if (lower.includes(branchName.toLowerCase().replace(' library', ''))) {
      return { name: branchName, ...info };
    }
  }
  return null;
}

// Try to scrape from SirsiDynix platform using stealth mode
async function scrapeSirsiDynix(browser) {
  console.log('   Attempting SirsiDynix platform with stealth mode...');
  const events = [];

  try {
    // Launch a new browser with puppeteer-extra stealth for Cloudflare bypass
    // Use headless: false for better Cloudflare bypass (required for some CF challenges)
    const isCI = process.env.CI || process.env.FUNCTION_TARGET;
    const stealthBrowser = await puppeteer.launch({
      headless: isCI ? 'new' : false, // Use headed mode locally for better CF bypass
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await stealthBrowser.newPage();

    // Set viewport and additional headers to look more like a real browser
    await page.setViewport({ width: 1920, height: 1080 });

    // Override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    console.log('   Navigating to SirsiDynix...');
    await page.goto(LIBRARY.sirsiUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for Cloudflare challenge to complete - give it more time
    console.log('   Waiting for Cloudflare challenge (may take up to 30 seconds)...');

    // Poll for Cloudflare completion
    let attempts = 0;
    const maxAttempts = 6;
    let pageContent = '';

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      pageContent = await page.content();

      if (!pageContent.includes('Just a moment') && !pageContent.includes('challenge-platform')) {
        console.log('   Cloudflare challenge passed!');
        break;
      }

      attempts++;
      console.log(`   Still waiting... (attempt ${attempts}/${maxAttempts})`);
    }

    // Final check
    if (pageContent.includes('Just a moment') || pageContent.includes('challenge-platform')) {
      console.log('   Cloudflare challenge could not be bypassed');
      await stealthBrowser.close();
      return [];
    }

    console.log('   Page loaded successfully, extracting events...');

    // Extract events from SirsiDynix
    const sirsiEvents = await page.evaluate(() => {
      const results = [];

      // SirsiDynix uses various selectors for event listings
      const selectors = [
        '.event-card', '.event-item', '.event', 'article.event',
        '[class*="event-listing"]', '.tribe-events-list-event-title',
        '.list-view-item', '.calendar-event'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(card => {
        try {
          const titleEl = card.querySelector('h2, h3, h4, .event-title, .title, a.event-link, [class*="title"]');
          const dateEl = card.querySelector('.event-date, .date, time, [class*="date"]');
          const descEl = card.querySelector('.event-description, .description, p, [class*="description"]');
          const locationEl = card.querySelector('.event-location, .location, .venue, [class*="location"]');
          const linkEl = card.querySelector('a[href]');

          if (titleEl) {
            const title = titleEl.textContent.trim();
            if (title.length > 3 && !title.match(/^(view|more|details|register)$/i)) {
              results.push({
                name: title,
                eventDate: dateEl ? dateEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim().substring(0, 500) : '',
                venue: locationEl ? locationEl.textContent.trim() : '',
                url: linkEl ? linkEl.href : window.location.href
              });
            }
          }
        } catch (e) {
          // Skip problematic elements
        }
      });

      return results;
    });

    events.push(...sirsiEvents);
    console.log(`   Found ${events.length} events from SirsiDynix`);
    await stealthBrowser.close();

  } catch (error) {
    console.log(`   SirsiDynix error: ${error.message}`);
  }

  return events;
}

// Try to scrape from ActiveCalendar platform
async function scrapeActiveCalendar(browser) {
  console.log('   Attempting ActiveCalendar fallback...');
  const events = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Calculate date range
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);

    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const url = `${LIBRARY.activeCalendarUrl}?view=list&startdate=${formatDate(startDate)}&enddate=${formatDate(endDate)}`;
    console.log(`   URL: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Wait for AJAX content to load
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Try to trigger search/list view
    try {
      const searchBtn = await page.$('#searchBtn, button.search, input[type="submit"]');
      if (searchBtn) {
        await searchBtn.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (e) {
      // No search button
    }

    // Extract events from ActiveCalendar
    const activeEvents = await page.evaluate(() => {
      const results = [];

      const selectors = [
        '.list-item', '.event-item', '[class*="event"]', 'article',
        '#search_results li', '#theme-list-view .item'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          const text = el.textContent.trim();
          if (text.length < 30) return;

          // Extract title
          let title = '';
          const titleEl = el.querySelector('h2, h3, h4, a.title, .event-title, [class*="title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            const firstLink = el.querySelector('a');
            if (firstLink) title = firstLink.textContent.trim();
          }

          if (!title || title.length < 5) return;

          // Extract date from text
          let eventDate = '';
          const datePatterns = [
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?/i,
            /\d{1,2}\/\d{1,2}\/\d{2,4}/
          ];
          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              eventDate = match[0];
              break;
            }
          }

          // Extract time
          const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch && eventDate) {
            eventDate += ' ' + timeMatch[0];
          }

          // Extract location
          const locMatch = text.match(/(?:Location|at|@)[:.]?\s*([^,\n]+(?:Library|Branch)?)/i);
          const location = locMatch ? locMatch[1].trim() : '';

          const linkEl = el.querySelector('a[href]');
          const url = linkEl ? linkEl.href : '';

          if (title && eventDate) {
            results.push({
              name: title,
              eventDate: eventDate,
              description: text.substring(0, 500),
              venue: location,
              url: url
            });
          }
        } catch (e) {
          // Skip problematic elements
        }
      });

      return results;
    });

    events.push(...activeEvents);
    console.log(`   Found ${events.length} events from ActiveCalendar`);
    await page.close();

  } catch (error) {
    console.log(`   ActiveCalendar error: ${error.message}`);
  }

  return events;
}

// Main scraping function
async function scrapeCabarrusEvents() {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();
  let events = [];

  try {
    // Try SirsiDynix first
    events = await scrapeSirsiDynix(browser);

    // If no events, try ActiveCalendar fallback
    if (events.length === 0) {
      events = await scrapeActiveCalendar(browser);
    }

    console.log(`\n   Total events found: ${events.length}`);

    if (events.length === 0) {
      console.log('\n   ⚠️  No events found from either source.');
      console.log('   Note: Cabarrus County Library has migrated to SirsiDynix which');
      console.log('   uses Cloudflare Turnstile protection that cannot be bypassed.');
      console.log('   Consider contacting the library for API access or RSS feed URL.');
    }

    // Process each event
    for (const event of events) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.name + ' ' + event.description);
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Find branch location for geocoding
        const branch = findBranch(event.venue);
        const branchInfo = branch || {
          address: '',
          city: LIBRARY.city,
          zipCode: LIBRARY.zipCode
        };

        // Geocode
        let coordinates = null;
        const geocodeAddress = branch
          ? `${branch.address}, ${branch.city}, ${LIBRARY.state} ${branch.zipCode}`
          : `${LIBRARY.city}, ${LIBRARY.state}`;

        coordinates = await geocodeWithFallback(geocodeAddress, {
          city: branchInfo.city,
          zipCode: branchInfo.zipCode,
          state: LIBRARY.state,
          county: LIBRARY.county,
          venueName: event.venue,
          sourceName: LIBRARY.name
        });

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse date
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || LIBRARY.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          state: LIBRARY.state,
          location: {
            name: event.venue || LIBRARY.name,
            address: branch ? branch.address : '',
            city: branchInfo.city,
            state: LIBRARY.state,
            zipCode: branchInfo.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Cabarrus County Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            category: 'library',
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

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  return { imported, skipped, failed };
}

// Main function
async function scrapeActiveCaendarCabarrus() {
  console.log('\n📚 CABARRUS COUNTY PUBLIC LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Cabarrus County Public Library (NC)');
  console.log('Population reach: ~216,000 people\n');

  const { imported, skipped, failed } = await scrapeCabarrusEvents();

  console.log('\n' + '='.repeat(60));
  console.log('✅ CABARRUS COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeActiveCaendarCabarrusCloudFunction() {
  console.log('\n📚 Cabarrus County Library Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeActiveCaendarCabarrus();

    // Log scraper stats to Firestore
    await logScraperResult('ActiveCalendar-Cabarrus-NC', {
      found: stats.imported + stats.skipped,
      new: stats.imported,
      duplicates: stats.skipped
    }, { dataType: 'events' });

    return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'Cabarrus County Library scraper completed'
    };
  } catch (error) {
    console.error('Error in Cabarrus County scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeActiveCaendarCabarrus()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeActiveCaendarCabarrus, scrapeActiveCaendarCabarrusCloudFunction };

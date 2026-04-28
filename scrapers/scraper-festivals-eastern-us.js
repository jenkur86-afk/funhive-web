#!/usr/bin/env node

/**
 * EASTERN US FAMILY FESTIVALS SCRAPER
 *
 * Scrapes family-friendly festivals from multiple sources across 27 eastern US states + DC.
 *
 * Sources:
 *   1. Eventbrite — structured festival listings with rich data (primary)
 *   2. FairsAndFestivals.net — comprehensive craft shows, art fairs, food fests (secondary)
 *
 * Coverage: DC, MD, VA, WV, PA, NJ, DE, NY, CT, MA, RI, VT, NH, ME,
 *           NC, SC, GA, FL, AL, MS, TN, KY, OH, IN, MI, IL, WI
 *
 * Event types: Music festivals, food festivals, cultural festivals, art fairs,
 *              county fairs, Renaissance fairs, holiday festivals, harvest fests,
 *              craft shows, street fairs, seasonal celebrations
 *
 * Usage:
 *   node scraper-festivals-eastern-us.js                    # Test mode (3 states)
 *   node scraper-festivals-eastern-us.js --full             # All 27 states
 *   node scraper-festivals-eastern-us.js --state VA         # Single state
 *   node scraper-festivals-eastern-us.js --state VA --full  # Full scrape for VA
 *
 * Cloud Function: scrapeFestivalsEasternUSCloudFunction
 * Schedule: Every 3 days (Group 2)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { geocodeAddress } = require('./helpers/geocoding-helper');

const SCRAPER_NAME = 'Festivals-Eastern-US';

// All 27 eastern states + DC
const STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MD', name: 'Maryland' },
  { code: 'ME', name: 'Maine' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NY', name: 'New York' },
  { code: 'OH', name: 'Ohio' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'VA', name: 'Virginia' },
  { code: 'VT', name: 'Vermont' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WV', name: 'West Virginia' },
];

// ============================================================================
// SOURCE 1: Eventbrite — festival search by state
// ============================================================================

function getEventbriteUrl(stateName) {
  // Eventbrite uses lowercase, hyphenated state names in URLs
  const slug = stateName.toLowerCase().replace(/\s+/g, '-');
  return `https://www.eventbrite.com/d/united-states--${slug}/festivals/?page=1`;
}

async function scrapeEventbriteFestivals(page, stateObj) {
  const url = getEventbriteUrl(stateObj.name);
  const events = [];

  try {
    console.log(`    🎫 Eventbrite: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 3000)); // Let JS render

    // Scroll down to trigger lazy-loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1000));
    }

    // Try JSON-LD structured data first (most reliable on Eventbrite)
    const jsonLdEvents = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const results = [];
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
          for (const item of items) {
            if (item['@type'] === 'Event' || item['@type'] === 'SocialEvent') {
              results.push({
                name: item.name,
                eventDate: item.startDate,
                endDate: item.endDate,
                description: (item.description || '').substring(0, 1000),
                url: item.url,
                image: typeof item.image === 'string' ? item.image : item.image?.url,
                venue: item.location?.name || '',
                address: item.location?.address?.streetAddress || '',
                city: item.location?.address?.addressLocality || '',
                stateCode: item.location?.address?.addressRegion || '',
                zipCode: item.location?.address?.postalCode || '',
                isFree: item.isAccessibleForFree || false,
                price: item.offers?.price || item.offers?.[0]?.price || ''
              });
            }
          }
        } catch (_) {}
      });
      return results;
    });

    if (jsonLdEvents.length > 0) {
      console.log(`    ✓ Found ${jsonLdEvents.length} events via JSON-LD`);
      events.push(...jsonLdEvents);
    }

    // Fallback: DOM scraping if JSON-LD didn't yield events
    if (events.length === 0) {
      const domEvents = await page.evaluate(() => {
        const results = [];

        // Eventbrite event card selectors
        const selectors = [
          '[data-testid="event-card"]',
          '.search-event-card-wrapper',
          '.eds-event-card',
          'article[class*="event"]',
          '.discover-search-desktop-card',
          'a[data-event-id]',
          '.event-card-details'
        ];

        let cards = [];
        for (const sel of selectors) {
          cards = document.querySelectorAll(sel);
          if (cards.length > 0) break;
        }

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]');
            const dateEl = card.querySelector('p, [class*="date"], [class*="time"], time');
            const linkEl = card.querySelector('a[href*="/e/"], a[href*="eventbrite"]');
            const locationEl = card.querySelector('[class*="location"], [class*="venue"]');
            const imgEl = card.querySelector('img');

            const title = titleEl?.textContent?.trim() || '';
            if (!title) return;

            results.push({
              name: title,
              eventDate: dateEl?.textContent?.trim() || '',
              url: linkEl?.href || card.querySelector('a')?.href || '',
              description: '',
              venue: locationEl?.textContent?.trim() || '',
              image: imgEl?.src || '',
              city: '',
              stateCode: '',
              zipCode: '',
              address: ''
            });
          } catch (_) {}
        });

        return results;
      });

      if (domEvents.length > 0) {
        console.log(`    ✓ Found ${domEvents.length} events via DOM`);
        events.push(...domEvents);
      }
    }

    // Paginate: try page 2 if we got a full page of results
    if (events.length >= 15) {
      try {
        const page2Url = url.replace('page=1', 'page=2');
        await page.goto(page2Url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const page2Events = await page.evaluate(() => {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          const results = [];
          scripts.forEach(script => {
            try {
              const data = JSON.parse(script.textContent);
              const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
              for (const item of items) {
                if (item['@type'] === 'Event' || item['@type'] === 'SocialEvent') {
                  results.push({
                    name: item.name,
                    eventDate: item.startDate,
                    endDate: item.endDate,
                    description: (item.description || '').substring(0, 1000),
                    url: item.url,
                    image: typeof item.image === 'string' ? item.image : item.image?.url,
                    venue: item.location?.name || '',
                    address: item.location?.address?.streetAddress || '',
                    city: item.location?.address?.addressLocality || '',
                    stateCode: item.location?.address?.addressRegion || '',
                    zipCode: item.location?.address?.postalCode || '',
                    isFree: item.isAccessibleForFree || false,
                    price: item.offers?.price || item.offers?.[0]?.price || ''
                  });
                }
              }
            } catch (_) {}
          });
          return results;
        });

        if (page2Events.length > 0) {
          console.log(`    ✓ Page 2: ${page2Events.length} more events`);
          events.push(...page2Events);
        }
      } catch (_) {
        // Page 2 failure is OK — we still have page 1
      }
    }

  } catch (error) {
    console.error(`    ⚠️  Eventbrite error: ${error.message}`);
  }

  return events;
}

// ============================================================================
// SOURCE 2: FairsAndFestivals.net — static HTML festival listings
// ============================================================================

function getFairsAndFestivalsUrl(stateCode) {
  return `https://www.fairsandfestivals.net/states/${stateCode}/`;
}

async function scrapeFairsAndFestivals(page, stateObj) {
  const url = getFairsAndFestivalsUrl(stateObj.code);
  const events = [];

  try {
    console.log(`    🎪 FairsAndFestivals.net: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1500));

    const pageEvents = await page.evaluate(() => {
      const results = [];

      // This site lists festivals in table rows or card-like divs
      // Try multiple extraction patterns

      // Pattern 1: Table rows with event data
      const rows = document.querySelectorAll('tr, .event-row, .listing-row');
      rows.forEach(row => {
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const name = cells[0]?.textContent?.trim() || '';
            const date = cells[1]?.textContent?.trim() || '';
            const location = cells[2]?.textContent?.trim() || '';
            const linkEl = row.querySelector('a[href]');

            if (name && !name.match(/^(Name|Event|Festival)/i)) {
              results.push({
                name,
                eventDate: date,
                venue: '',
                city: location.split(',')[0]?.trim() || '',
                url: linkEl?.href || '',
                description: ''
              });
            }
          }
        } catch (_) {}
      });

      // Pattern 2: Article/card-based layout
      if (results.length === 0) {
        const cards = document.querySelectorAll('article, .event, .festival, .listing, .card, [class*="event"], [class*="festival"]');
        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"], a');
            const dateEl = card.querySelector('.date, [class*="date"], time');
            const locationEl = card.querySelector('.location, [class*="location"], [class*="city"]');
            const descEl = card.querySelector('.description, p, [class*="desc"]');
            const linkEl = card.querySelector('a[href]');

            const title = titleEl?.textContent?.trim();
            if (!title) return;

            results.push({
              name: title,
              eventDate: dateEl?.textContent?.trim() || '',
              venue: '',
              city: locationEl?.textContent?.trim() || '',
              url: linkEl?.href || '',
              description: (descEl?.textContent?.trim() || '').substring(0, 500)
            });
          } catch (_) {}
        });
      }

      // Pattern 3: Links inside list items
      if (results.length === 0) {
        const items = document.querySelectorAll('li a, .list-item a');
        items.forEach(link => {
          try {
            const text = link.textContent?.trim();
            if (text && text.length > 5 && !text.match(/^(Home|About|Contact|Privacy|Login)/i)) {
              results.push({
                name: text,
                eventDate: '',
                venue: '',
                city: '',
                url: link.href || '',
                description: ''
              });
            }
          } catch (_) {}
        });
      }

      return results;
    });

    if (pageEvents.length > 0) {
      console.log(`    ✓ Found ${pageEvents.length} festivals`);
      events.push(...pageEvents);
    }

  } catch (error) {
    console.error(`    ⚠️  FairsAndFestivals error: ${error.message}`);
  }

  return events;
}

// ============================================================================
// EVENT PROCESSING & SAVING
// ============================================================================

/**
 * Determine if an event is likely family-friendly (filter out adult-only events)
 */
function isFamilyFriendly(name, description) {
  const text = `${name} ${description}`.toLowerCase();

  // Exact-phrase adult keywords — if any appear, reject the event
  const adultKeywords = [
    // Alcohol-centric events
    'beer fest', 'beer festival', 'beer garden fest', 'beerfest',
    'wine fest', 'wine festival', 'wine tasting', 'wine walk',
    'wine at sunset', 'wine & music', 'wine and music',
    'wine cup', 'wine crawl', 'wine trail',
    'craft beer', 'brew fest', 'brewfest', 'brews fest',
    'rhythm & brews', 'rhythm and brews',
    'bourbon fest', 'bourbon festival', 'bourbon trail',
    'cocktail', 'mixology', 'spirits fest', 'spirits festival',
    'mimosa crawl', 'mimosa fest', 'champagne brunch',
    'bar crawl', 'pub crawl', 'tap takeover',
    'happy hour', 'drink fest',
    'hard cider fest', 'meadery',
    // Adult-only nightlife
    'burlesque', 'strip club', 'adult only', 'adults only',
    '21+', '21 and over', '21 & over', 'must be 21',
    'nightclub', 'after dark party', 'late night party',
    'drag brunch',
    // Cannabis
    'cannabis fest', 'weed fest', '420 fest',
    // Gambling
    'poker tournament', 'casino night',
  ];

  for (const kw of adultKeywords) {
    if (text.includes(kw)) return false;
  }

  // Regex patterns for trickier matches
  const adultPatterns = [
    /\bwine\b.*\bfest/,       // "wine" + "fest" anywhere in title
    /\bbeer\b.*\bfest/,       // "beer" + "fest" anywhere
    /\bbrews?\b/,             // any mention of "brew" or "brews" (brewfest, brewery tour, etc.)
    /\bbourbon\b/,            // any bourbon event
    /\bwhiskey\b.*\bfest/,    // whiskey festivals
    /\bspirits\b.*\bfest/,    // spirits festivals
    /\bwinery\b.*\btour/,     // winery tours
    /\bvineyard\b.*\bfest/,   // vineyard festivals
    /\bmimosa\b/,             // mimosa anything
    /\b21\s*\+/,              // "21+" with optional space
    /ages?\s*21\s*and\s*(up|over|older)/, // "age 21 and up"
  ];

  for (const pat of adultPatterns) {
    if (pat.test(text)) return false;
  }

  return true;
}

/**
 * Parse a date string into a Date object
 */
function parseFestivalDate(dateStr) {
  if (!dateStr) return null;

  const text = dateStr.trim();

  // ISO / Eventbrite format: 2026-04-18T10:00:00-04:00
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const d = new Date(text);
    if (!isNaN(d.getTime())) return d;
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const yr = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    const parsed = new Date(yr, parseInt(m) - 1, parseInt(d));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // "April 18, 2026" / "Apr 18 2026" etc.
  const parsed = new Date(text.replace(/,/g, ''));
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) return parsed;

  // Try extracting "Month Day" patterns
  const monthDayMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s*(\d{4})?/i);
  if (monthDayMatch) {
    const year = monthDayMatch[3] || new Date().getFullYear();
    const attempt = new Date(`${monthDayMatch[1]} ${monthDayMatch[2]}, ${year}`);
    if (!isNaN(attempt.getTime())) return attempt;
  }

  return null;
}

/**
 * Extract time from an event date/time string
 */
function extractTime(dateStr) {
  if (!dateStr) return '';
  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`;
  }
  return '';
}

/**
 * Deduplicate events by name similarity (case-insensitive, trimmed)
 */
function deduplicateEvents(events) {
  const seen = new Set();
  return events.filter(evt => {
    const key = `${evt.name}|||${evt.eventDate}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Geocode a festival location — tries full address, then city+state, then state
 */
async function geocodeFestival(address, city, state, zipCode, venueName) {
  // Try full address first
  if (address && city) {
    const fullAddr = `${address}, ${city}, ${state} ${zipCode || ''}`.trim();
    try {
      const coords = await geocodeAddress(fullAddr);
      if (coords) return coords;
    } catch (_) {}
  }

  // Try city + state + zip
  if (city) {
    const cityAddr = `${city}, ${state} ${zipCode || ''}`.trim();
    try {
      const coords = await geocodeAddress(cityAddr);
      if (coords) return coords;
    } catch (_) {}
  }

  // Try just zip + state
  if (zipCode) {
    try {
      const coords = await geocodeAddress(`${zipCode}, ${state}`);
      if (coords) return coords;
    } catch (_) {}
  }

  // Fallback: try venue name + state (for events missing city/address/zip)
  if (venueName && state) {
    try {
      const coords = await geocodeAddress(`${venueName}, ${state}`);
      if (coords) return coords;
    } catch (_) {}
  }

  return null;
}

/**
 * Process raw scraped events into FunHive event format and save directly to DB
 */
async function processAndSaveEvents(stateObj, rawEvents) {
  if (rawEvents.length === 0) return { saved: 0, skipped: 0, failed: 0 };

  // Deduplicate and filter
  const unique = deduplicateEvents(rawEvents);
  let saved = 0, skipped = 0, failed = 0;

  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  for (const event of unique) {
    try {
      // Must have a name
      if (!event.name || event.name.trim().length < 3) { skipped++; continue; }

      // Filter adult-only events
      if (!isFamilyFriendly(event.name, event.description || '')) { skipped++; continue; }

      // Parse date
      const parsedDate = parseFestivalDate(event.eventDate);
      if (!parsedDate) {
        // Events without dates from FairsAndFestivals might still be valid listings
        // Skip them for now (would need detail-page scraping to get dates)
        skipped++;
        continue;
      }

      // Skip past events
      if (parsedDate < now) { skipped++; continue; }

      // Skip events more than 90 days out
      if (parsedDate > maxDate) { skipped++; continue; }

      // Normalize date for DB
      const normalizedDate = normalizeDateString(parsedDate.toISOString());
      if (!normalizedDate) { skipped++; continue; }

      // Categorize
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: event.name,
        description: event.description || ''
      });

      // Determine cost
      let cost = 'See website';
      if (event.isFree) cost = 'Free';
      else if (event.price) cost = `$${event.price}`;

      // Use location from event if available, fall back to state
      const city = event.city || '';
      const zip = event.zipCode || '';
      const address = event.address || '';
      const stateCode = event.stateCode || stateObj.code;

      // Geocode the festival location
      const coords = await geocodeFestival(address, city, stateCode, zip, event.venue || event.name);
      let geohash = '';
      if (coords) {
        geohash = ngeohash.encode(coords.lat || coords.latitude, coords.lon || coords.longitude, 7);
      }

      // Check for duplicate by URL
      if (event.url) {
        const existing = await db.collection('events').where('url', '==', event.url).limit(1).get();
        if (!existing.empty) {
          // Update existing event with fresh data
          try {
            const existingDoc = existing.docs[0];
            await db.collection('events').doc(existingDoc.id).set({
              name: event.name.trim(),
              venue: event.venue || event.name.trim(),
              eventDate: normalizedDate,
              date: parsedDate,
              startTime: extractTime(event.eventDate),
              description: (event.description || `Family festival in ${city || stateObj.name}`).substring(0, 2000),
              city, state: stateCode, zipCode: zip, address,
              geohash,
              location: coords ? {
                name: event.venue || event.name.trim(),
                city, state: stateCode, zipCode: zip, address,
                latitude: coords.lat || coords.latitude,
                longitude: coords.lon || coords.longitude,
                coordinates: { latitude: coords.lat || coords.latitude, longitude: coords.lon || coords.longitude }
              } : { name: event.venue || event.name.trim(), city, state: stateCode, zipCode: zip, address },
              parentCategory: parentCategory || 'Festivals & Fairs',
              displayCategory: displayCategory || 'Festivals & Fairs',
              subcategory: subcategory || 'Festival',
              ageRange: 'All Ages', cost,
              url: event.url,
              imageUrl: event.image || '',
              metadata: {
                sourceName: `Festivals in ${stateObj.name}`,
                sourceUrl: event.url,
                scrapedAt: new Date().toISOString(),
                scraperName: SCRAPER_NAME,
                platform: 'festivals-aggregator',
                state: stateCode,
                category: parentCategory || 'Festivals & Fairs'
              }
            });
          } catch (_) {}
          skipped++; // Count as update/skip for reporting
          continue;
        }
      }

      // Build new event document
      const eventDoc = {
        name: event.name.trim(),
        venue: event.venue || event.name.trim(),
        eventDate: normalizedDate,
        date: parsedDate,
        startTime: extractTime(event.eventDate),
        endTime: event.endDate ? extractTime(event.endDate) : '',
        scheduleDescription: event.eventDate || '',
        description: (event.description || `Family festival in ${city || stateObj.name}`).substring(0, 2000),
        address, city, state: stateCode, zipCode: zip,
        geohash,
        location: coords ? {
          name: event.venue || event.name.trim(),
          city, state: stateCode, zipCode: zip, address,
          latitude: coords.lat || coords.latitude,
          longitude: coords.lon || coords.longitude,
          coordinates: { latitude: coords.lat || coords.latitude, longitude: coords.lon || coords.longitude }
        } : { name: event.venue || event.name.trim(), city, state: stateCode, zipCode: zip, address },
        parentCategory: parentCategory || 'Festivals & Fairs',
        displayCategory: displayCategory || 'Festivals & Fairs',
        subcategory: subcategory || 'Festival',
        ageRange: 'All Ages',
        cost,
        url: event.url || '',
        imageUrl: event.image || '',
        metadata: {
          sourceName: `Festivals in ${stateObj.name}`,
          sourceUrl: event.url || '',
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'festivals-aggregator',
          state: stateCode,
          category: parentCategory || 'Festivals & Fairs'
        }
      };

      // Save to database
      await db.collection('events').add(eventDoc);
      saved++;
      console.log(`    ✅ ${event.name.substring(0, 50)}`);

    } catch (error) {
      console.error(`    ❌ Error saving "${(event.name || '').substring(0, 40)}": ${error.message}`);
      failed++;
    }
  }

  return { saved, skipped, failed };
}

// ============================================================================
// MAIN SCRAPER
// ============================================================================

async function scrapeFestivals(options = {}) {
  const { stateFilter = null, fullMode = false, maxDays = 90 } = options;

  // In test mode, only scrape 3 states unless --full is passed
  let statesToScrape = STATES;
  if (stateFilter) {
    statesToScrape = STATES.filter(s => s.code === stateFilter.toUpperCase());
    if (statesToScrape.length === 0) {
      console.error(`Unknown state: ${stateFilter}`);
      return { imported: 0, skipped: 0, failed: 0 };
    }
  } else if (!fullMode) {
    statesToScrape = STATES.filter(s => ['VA', 'MD', 'PA'].includes(s.code));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎪  EASTERN US FAMILY FESTIVALS SCRAPER`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📍 States: ${statesToScrape.map(s => s.code).join(', ')}`);
  console.log(`📊 Mode: ${fullMode ? 'FULL' : stateFilter ? `SINGLE STATE (${stateFilter.toUpperCase()})` : 'TEST (VA, MD, PA)'}`);
  console.log(`📅 Lookahead: ${maxDays} days`);
  console.log(`📡 Sources: Eventbrite + FairsAndFestivals.net`);
  console.log(`${'='.repeat(70)}\n`);

  const startTime = Date.now();
  let browser;

  try {
    browser = await launchBrowser({ stealth: true });
    let page = await createStealthPage(browser);

    let grandTotalSaved = 0, grandTotalSkipped = 0, grandTotalFailed = 0;

    for (let i = 0; i < statesToScrape.length; i++) {
      const stateObj = statesToScrape[i];

      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📍 [${i + 1}/${statesToScrape.length}] ${stateObj.name} (${stateObj.code})`);
      console.log(`${'─'.repeat(60)}`);

      let allRawEvents = [];

      // Source 1: Eventbrite
      try {
        const ebEvents = await scrapeEventbriteFestivals(page, stateObj);
        allRawEvents.push(...ebEvents);
      } catch (err) {
        console.error(`    Eventbrite failed: ${err.message}`);
      }

      // Brief delay between sources
      await new Promise(r => setTimeout(r, 2000));

      // Source 2: FairsAndFestivals.net
      try {
        const ffEvents = await scrapeFairsAndFestivals(page, stateObj);
        allRawEvents.push(...ffEvents);
      } catch (err) {
        console.error(`    FairsAndFestivals failed: ${err.message}`);
      }

      console.log(`    📊 Total raw events: ${allRawEvents.length}`);

      // Process and save
      const { saved, skipped, failed } = await processAndSaveEvents(stateObj, allRawEvents);
      grandTotalSaved += saved;
      grandTotalSkipped += skipped;
      grandTotalFailed += failed;

      console.log(`    ✅ Saved: ${saved} | ⏭️ Skipped: ${skipped} | ❌ Failed: ${failed}`);

      // Delay between states (be respectful to sources)
      if (i < statesToScrape.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }

      // Restart browser every 10 states to prevent memory issues
      if ((i + 1) % 10 === 0 && i < statesToScrape.length - 1) {
        console.log('\n🔄 Restarting browser to prevent memory issues...');
        await browser.close();
        browser = await launchBrowser({ stealth: true });
        page = await createStealthPage(browser);
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ FESTIVALS SCRAPER COMPLETE`);
    console.log(`   States: ${statesToScrape.length}`);
    console.log(`   Events saved: ${grandTotalSaved}`);
    console.log(`   Events skipped: ${grandTotalSkipped}`);
    console.log(`   Events failed: ${grandTotalFailed}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`${'='.repeat(70)}\n`);

    // Log results
    try {
      await logScraperResult(SCRAPER_NAME, {
        found: grandTotalSaved + grandTotalSkipped,
        new: grandTotalSaved,
        duplicates: grandTotalSkipped
      }, { dataType: 'events', state: stateFilter || 'Multi' });
    } catch (error) {
      console.error('Failed to log results:', error.message);
    }

    return { imported: grandTotalSaved, skipped: grandTotalSkipped, failed: grandTotalFailed };

  } catch (error) {
    console.error('Fatal error:', error);
    return { imported: 0, skipped: 0, failed: 0 };

  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Cloud Function export
 */
async function scrapeFestivalsEasternUSCloudFunction(req = {}) {
  console.log('☁️ Running as Cloud Function');
  const stateFilter = req.body?.state || req.query?.state || null;
  return await scrapeFestivals({ stateFilter, fullMode: true, maxDays: 90 });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  let stateFilter = null;
  let fullMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && args[i + 1]) {
      stateFilter = args[i + 1];
      i++;
    } else if (args[i] === '--full') {
      fullMode = true;
    }
  }

  scrapeFestivals({ stateFilter, fullMode, maxDays: 90 })
    .then(result => {
      console.log(`\n📊 Festivals: ✅ ${result.imported} new | ⏭️ ${result.skipped} skipped | ❌ ${result.failed} failed`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal:', error);
      process.exit(1);
    });
}

module.exports = { scrapeFestivals, scrapeFestivalsEasternUSCloudFunction };

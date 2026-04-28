#!/usr/bin/env node

/**
 * CUSTOM DRUPAL LIBRARIES SCRAPER
 *
 * Scrapes events from libraries using custom Drupal-based platforms
 *
 * COVERAGE (8 library systems across 4 states):
 *
 * SC (4 libraries - 1.243M people):
 * - Richland Library (Columbia) (400K)
 * - Greenville County Library System (500K)
 * - Anderson County Library System (205K) (NEW)
 * - Florence County Library System (138K) (NEW)
 *
 * NC (2 libraries - 453K people):
 * - Greensboro Public Library (300K)
 * - Rowan County Public Library (153K) (NEW)
 *
 * GA (1 library - 750K people):
 * - Cobb County Public Library System (750K)
 *
 * WV (1 library - 200K people):
 * - Kanawha County Public Library (200K)
 *
 * Total: 8 libraries serving ~2.646 million people
 *
 * Usage:
 *   node functions/scrapers/scraper-custom-drupal-libraries-GA-NC-SC-WV.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using custom Drupal platforms
const LIBRARY_SYSTEMS = [
  // SOUTH CAROLINA (2 libraries)
  {
    name: 'Richland Library',
    url: 'https://www.richlandlibrary.com/events',
    county: 'Richland',
    state: 'SC',
    website: 'https://www.richlandlibrary.com',
    city: 'Columbia',
    zipCode: '29201',
    selectors: {
      eventContainer: '.views-row, article',
      title: 'h3 a, h2 a',
      date: 'time, .event-date',
      location: '.field-location, .location',
      description: 'p, .description',
      url: 'h3 a, h2 a'
    }
  },
  {
    name: 'Greenville County Library System',
    url: 'https://www.greenvillelibrary.org/events',
    county: 'Greenville',
    state: 'SC',
    website: 'https://www.greenvillelibrary.org',
    city: 'Greenville',
    zipCode: '29601',
    selectors: {
      eventContainer: 'div[class*="event"], .views-row',
      title: 'h2, h3',
      date: 'time, .event-date',
      location: '.event-location, [class*="location"]',
      description: 'p, [class*="description"]',
      url: 'a[href*="/event"]'
    }
  },
  {
    name: 'Anderson County Library System',
    url: 'https://www.andersonlibrary.org/events/month',
    county: 'Anderson',
    state: 'SC',
    website: 'https://www.andersonlibrary.org',
    city: 'Anderson',
    zipCode: '29621',
    selectors: {
      eventContainer: '.views-row, article[class*="event"]',
      title: 'h2 a, h3 a',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"]'
    }
  },
  {
    name: 'Florence County Library System',
    url: 'https://www.florencelibrary.org/events',
    county: 'Florence',
    state: 'SC',
    website: 'https://www.florencelibrary.org',
    city: 'Florence',
    zipCode: '29501',
    selectors: {
      eventContainer: '.views-row, article, div[class*="event"]',
      title: 'h2 a, h3 a, h2, h3',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"], a'
    }
  },

  // NORTH CAROLINA (2 libraries)
  // REMOVED: Greensboro Public Library - 403 Forbidden error
  // {
  //   name: 'Greensboro Public Library',
  //   url: 'https://library.greensboro-nc.gov/about-us/calendar-of-library-events',
  //   county: 'Guilford',
  //   state: 'NC',
  //   website: 'https://library.greensboro-nc.gov',
  //   city: 'Greensboro',
  //   zipCode: '27401',
  //   selectors: {
  //     eventContainer: '.views-row, div[class*="event"]',
  //     title: 'h3, h2',
  //     date: 'time, .event-date',
  //     location: '.field-event-location, .location',
  //     description: 'p, .description',
  //     url: 'a[href*="/event"]'
  //   }
  // },
  {
    name: 'Rowan County Public Library',
    url: 'https://www.rowancountylibrary.org/events/upcoming',
    county: 'Rowan',
    state: 'NC',
    website: 'https://www.rowancountylibrary.org',
    city: 'Salisbury',
    zipCode: '28144',
    selectors: {
      eventContainer: '.views-row, article, div[class*="event"]',
      title: 'h2 a, h3 a, h2, h3',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"], a'
    }
  },

  // GEORGIA (1 library)
  {
    name: 'Cobb County Public Library System',
    url: 'https://www.cobbcounty.gov/events?department=85',
    county: 'Cobb',
    state: 'GA',
    website: 'https://www.cobbcounty.gov/library',
    city: 'Marietta',
    zipCode: '30060',
    selectors: {
      eventContainer: '[class*="border-accent-1"][class*="border-t"]',
      title: 'h3',
      date: 'span.text-primary-1',
      location: 'span.text-primary-1',
      description: 'span.text-primary-1',
      url: 'a[href*="/events/"]'
    }
  },

  // WEST VIRGINIA (1 library)
  {
    name: 'Kanawha County Public Library',
    url: 'https://www.kcpls.org/events/upcoming',
    county: 'Kanawha',
    state: 'WV',
    website: 'https://www.kcpls.org',
    city: 'Charleston',
    zipCode: '25301',
    selectors: {
      eventContainer: '.views-row, div[class*="event"]',
      title: 'h3, a[href*="/event/"]',
      date: '.field-event-date, time',
      location: '.field-event-location, [class*="location"]',
      description: '.field-event-description, p',
      url: 'a[href*="/event/"]'
    }
  }
];

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  // Check for adult-only indicators — explicit labels
  // Catches: "Adults", "Adults Only", "18+", "21+", "Adult", "Audience: Adults"
  // But NOT: "Young Adult" (= teens), "Adults and Children", "Families and Adults"
  if (/\badults?\b/i.test(lowerText) && !/\byoung\s+adults?\b/i.test(lowerText) && !/\b(and\s+)?adults?\s+(and\s+)?(children|kids|families|family|teens?|all\s*ages)/i.test(lowerText) && !/\b(children|kids|families|family|teens?|all\s*ages)\s+(and\s+)?adults?\b/i.test(lowerText)) {
    return 'Adults';
  }
  if (/\b18\+/.test(lowerText) || /\b21\+/.test(lowerText)) {
    return 'Adults';
  }

  // Check for adult-oriented event keywords (career, professional, senior services, etc.)
  if (/\b(career\s*coach|career\s*fair|career\s*services|job\s*fair|job\s*search|resume\s*(workshop|writing|review|help|clinic)|interview\s*(prep|skills|workshop)|networking\s*(event|mixer|session)|professional\s*development|linkedin|salary\s*negoti|cover\s*letter|workforce|employment\s*(workshop|services)|tax\s*(prep|help|assistance|clinic)|estate\s*planning|retirement\s*planning|medicare|social\s*security|caregiver\s*support|grief\s*support|divorce|legal\s*clinic|legal\s*aid|blood\s*pressure|health\s*screening|AA\s*meeting|al-anon|narcotics\s*anonymous|book\s*club\s*for\s*adults|adult\s*book\s*club|adult\s*craft|adult\s*coloring|adult\s*program|for\s*adults|seniors?\s*only)\b/i.test(lowerText)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (/\b(babies?|infants?|0\s*[-–]\s*2)\b/i.test(lowerText)) return 'Babies & Toddlers (0-2)';
  if (/\b(toddlers?|preschool|pre-school|3\s*[-–]\s*5)\b/i.test(lowerText)) return 'Preschool (3-5)';
  if (/\b(children|kids|6\s*[-–]\s*12|elementary)\b/i.test(lowerText)) return 'Children (6-12)';
  if (/\b(teens?|13\s*[-–]\s*17|middle\s*school|high\s*school)\b/i.test(lowerText)) return 'Teens (13-17)';
  if (/\b(family|families|all\s*ages)\b/i.test(lowerText)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Drupal-based library
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

    // OPTIMIZED: Faster page load strategy
    const response = await page.goto(library.url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Check for HTTP errors
    if (response && (response.status() === 404 || response.status() >= 500)) {
      console.log(`  ⚠️ HTTP ${response.status()} for ${library.url}, skipping`);
      await page.close();
      return { imported: 0, failed: 1, skipped: 0, total: 0 };
    }

    // Wait for page to load - OPTIMIZED: Reduced from 3000ms
    await page.waitForSelector('body', { timeout: 3000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract events using library-specific selectors
    const events = await page.evaluate((selectors) => {
      const results = [];

      // Try each selector variant for event containers
      const containerSelectors = selectors.eventContainer.split(',').map(s => s.trim());
      let eventElements = [];

      for (const selector of containerSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleSelectors = selectors.title.split(',').map(s => s.trim());
          let titleEl = null;
          for (const selector of titleSelectors) {
            titleEl = el.querySelector(selector);
            if (titleEl) break;
          }
          if (!titleEl) return;

          const title = titleEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (!title || title.length < 3) return;

          // Skip UI elements that aren't real events
          if (/^(Filter|Search|Clear|Apply|Reset|Show|Hide|More|Less|Close|Open|Menu)$/i.test(title)) return;

          // Extract URL
          const urlSelectors = selectors.url.split(',').map(s => s.trim());
          let linkEl = null;
          for (const selector of urlSelectors) {
            linkEl = el.querySelector(selector);
            if (linkEl && linkEl.href) break;
          }
          const url = linkEl ? linkEl.href : '';

          // Get all text content for pattern matching
          const fullText = el.textContent;

          // Extract date
          let eventDate = '';
          const dateSelectors = selectors.date.split(',').map(s => s.trim());
          let dateEl = null;
          for (const selector of dateSelectors) {
            dateEl = el.querySelector(selector);
            if (dateEl) break;
          }

          if (dateEl) {
            // Normalize whitespace (remove newlines and collapse spaces)
            eventDate = dateEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          }

          // If dateEl content is just a time (no actual date), try to extract from full text
          const isTimeOnly = eventDate && /^\d{1,2}:\d{2}\s*(?:am|pm)/i.test(eventDate) &&
                            !/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i.test(eventDate);

          if (!eventDate || isTimeOnly) {
            // Try to extract date from full text
            const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{4}|\s+\d{4})?/i) ||
                             fullText.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                             fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?/i);
            if (dateMatch) {
              // Combine date with original time if we have both
              if (isTimeOnly) {
                eventDate = dateMatch[0] + ' ' + eventDate;
              } else {
                eventDate = dateMatch[0];
              }
            }
          }

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract location
          let location = '';
          const locationSelectors = selectors.location.split(',').map(s => s.trim());
          let locationEl = null;
          for (const selector of locationSelectors) {
            locationEl = el.querySelector(selector);
            if (locationEl) break;
          }
          if (locationEl) {
            location = locationEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
            // Skip invalid location values (UI elements)
            if (/^(open filter|filter|virtual event|online|zoom)$/i.test(location)) {
              location = '';
            }
          } else {
            // Try to extract from text
            const locationMatch = fullText.match(/(?:Location|Branch|Library):\s*([^\n]+)/i);
            if (locationMatch) location = locationMatch[1].trim();
          }

          // Extract description
          let description = '';
          const descSelectors = selectors.description.split(',').map(s => s.trim());
          let descEl = null;
          for (const selector of descSelectors) {
            descEl = el.querySelector(selector);
            if (descEl) break;
          }
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // If eventDate is still time-only (no actual date found), use today's date
          const stillTimeOnly = eventDate && /^\d{1,2}:\d{2}\s*(?:am|pm)/i.test(eventDate) &&
                               !/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}|\d{1,2}\/\d{1,2})/i.test(eventDate);
          if (stillTimeOnly) {
            const today = new Date();
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            eventDate = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()} ${eventDate}`;
          }

          // Extract audience/age info from page elements
          let audience = '';
          const audienceEl = el.querySelector('[class*="audience"], [class*="age-group"], [class*="event-type"], .taxonomy-term, [class*="category"]');
          if (audienceEl) {
            audience = audienceEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          }
          // Also check for audience in full text patterns
          if (!audience) {
            const audMatch = fullText.match(/(?:Audience|Age Group|For|Who):\s*([^\n]+)/i);
            if (audMatch) audience = audMatch[1].trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              fullText: fullText,
              audience: audience
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    }, library.selectors);

    console.log(`   Found ${events.length} events`);

    // Visit detail pages to extract audience info when not found on listing card
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event.audience && event.url) {
        try {
          await page.goto(event.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await new Promise(resolve => setTimeout(resolve, 500));

          const detailAudience = await page.evaluate(() => {
            // Look for audience/age-group fields on the detail page
            // Richland Library uses field labels like "Audience:" with taxonomy terms
            const selectors = [
              // Drupal field label + value pattern
              '.field--name-field-audience .field__item',
              '.field--name-field-age-group .field__item',
              '[class*="audience"] .field__item',
              '[class*="age-group"] .field__item',
              // Generic taxonomy terms near "Audience" label
              '.taxonomy-term',
              '[class*="event-type"] .field__item',
              '[class*="category"] .field__item',
            ];

            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                const text = el.textContent.trim();
                if (text && /\b(adults?|children|kids|teens?|families|all\s*ages|baby|toddler|preschool|tween|senior)\b/i.test(text)) {
                  return text;
                }
              }
            }

            // Fallback: search entire page text for "Audience: ..." pattern
            const bodyText = document.body ? document.body.innerText : '';
            const audMatch = bodyText.match(/(?:Audience|Age\s*Group|For|Who|Intended\s*for):\s*([^\n]+)/i);
            if (audMatch) return audMatch[1].trim();

            return '';
          });

          if (detailAudience) {
            events[i].audience = detailAudience;
            console.log(`   🏷️ Detail page audience for "${event.name.substring(0, 40)}": ${detailAudience}`);
          }
        } catch (err) {
          // Detail page failed — continue with what we have
        }
      }
    }

    // Navigate back isn't needed since we process events from stored data

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description, title, and audience tag
        const ageRange = parseAgeRange(event.name + ' ' + event.description + ' ' + (event.audience || ''));

        if (ageRange === 'Adults') {
          console.log(`   ⛔ Skipping adult event: "${event.name.substring(0, 50)}" (audience: ${event.audience || 'keyword match'})`);
          skipped++;
          continue;
        }

        // Geocode with intelligent fallback
        let coordinates = null;
        if (event.venue && event.venue.trim()) {
          const fullAddress = `${event.venue}, ${library.city}, ${library.county} County, ${library.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            venueName: event.venue,
            sourceName: library.name
          });
        } else {
          // If no venue specified, use library's main location
          coordinates = await geocodeWithFallback(`${library.city}, ${library.state}`, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            sourceName: library.name
          });
        }

        // Use categorization helper
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

        // Parse date to get Date object for Timestamp
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
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
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Custom Drupal Scraper',
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
async function scrapeCustomDrupalLibraries() {
  console.log('\n📚 CUSTOM DRUPAL LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 5 libraries across 4 states (GA, NC, SC, WV)');
  console.log('Population reach: ~2.15 million people\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('CustomDrupal-GA-NC-SC-WV', 'events', {
    source: 'drupal'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.calendarUrl || library.eventsUrl, {
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

  // Log to database with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Cloud Function wrapper
async function scrapeCustomDrupalLibrariesCloudFunction() {
  console.log('\n📚 Custom Drupal Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeCustomDrupalLibraries();

    return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'Custom Drupal libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in Custom Drupal scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeCustomDrupalLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCustomDrupalLibraries, scrapeCustomDrupalLibrariesCloudFunction };

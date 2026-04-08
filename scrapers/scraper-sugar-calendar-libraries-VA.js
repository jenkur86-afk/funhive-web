#!/usr/bin/env node

/**
 * WIX CALENDAR SCRAPER - Fauquier County Public Library
 *
 * Scrapes events from Fauquier County Public Library (VA)
 * Library moved from WordPress Sugar Calendar to Wix platform in 2024
 *
 * COVERAGE (1 library system in VA):
 * - Fauquier County Public Library (Warrenton, VA) - 45,000 population
 *
 * Platform: Wix Thunderbolt (dynamic calendar pages)
 * Calendar URLs:
 * - https://www.fauquierlibrary.org/calendar-category-young-children
 * - https://www.fauquierlibrary.org/calendar-category-adults
 *
 * Usage:
 *   node functions/scrapers/scraper-sugar-calendar-libraries-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems - Fauquier now uses Wix with category-specific calendar pages
const LIBRARY_SYSTEMS = [
  {
    name: 'Fauquier County Public Library',
    // Multiple calendar pages by category
    urls: [
      'https://www.fauquierlibrary.org/calendar-category-young-children',
      'https://www.fauquierlibrary.org/calendar-category-adults'
    ],
    county: 'Fauquier',
    state: 'VA',
    website: 'https://www.fauquierlibrary.org',
    city: 'Warrenton',
    zipCode: '20186'
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

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from a single calendar page
async function scrapeCalendarPage(pageUrl, library, page) {
  console.log(`   Scraping: ${pageUrl}`);

  await page.goto(pageUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Wait for Wix dynamic content to load
  await page.waitForSelector('body', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Extract events from the Wix page
  const events = await page.evaluate(() => {
    const results = [];
    const processedTitles = new Set();

    // Wix calendar pages use various selectors for events
    // Try multiple selector strategies
    const eventSelectors = [
      '[data-testid*="event"]',
      '[class*="event-item"]',
      '[class*="calendar-event"]',
      '[class*="event"]',
      'article',
      '[role="listitem"]',
      '[data-hook*="event"]',
      'div[class*="Event"]'
    ];

    let eventElements = [];
    for (const selector of eventSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        eventElements = elements;
        break;
      }
    }

    // If no events found via selectors, try to find event-like content
    if (eventElements.length === 0) {
      // Look for any elements that might contain event info
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach(div => {
        const text = div.textContent;
        // If div has a date pattern and is reasonably sized, might be an event
        if (text.length > 20 && text.length < 1000 &&
            text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4}|\w{3,9}\s+\d{1,2}/)) {
          eventElements.push(div);
        }
      });
    }

    eventElements.forEach(el => {
      try {
        // Extract title
        const titleEl = el.querySelector('h1, h2, h3, h4, h5, [class*="title"], a');
        if (!titleEl) return;

        const title = titleEl.textContent.trim();
        if (!title || title.length < 3 || title.length > 200) return;

        // Skip duplicates
        if (processedTitles.has(title)) return;
        processedTitles.add(title);

        // Skip navigation/header items
        if (title.match(/^(home|about|contact|calendar|events|hours|services)$/i)) return;

        // Extract date
        let eventDate = '';
        const dateEl = el.querySelector('time, [class*="date"], [data-hook*="date"]');
        if (dateEl) {
          eventDate = dateEl.textContent.trim() || dateEl.getAttribute('datetime') || '';
        }

        // Try to extract date from full text if not found
        if (!eventDate) {
          const fullText = el.textContent;
          const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                           fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i) ||
                           fullText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
          if (dateMatch) eventDate = dateMatch[0];
        }

        // Extract time
        let time = '';
        const timeEl = el.querySelector('[class*="time"]');
        if (timeEl) {
          time = timeEl.textContent.trim();
        } else {
          const fullText = el.textContent;
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];
        }

        // Extract description
        let description = '';
        const descEl = el.querySelector('p, [class*="description"], [class*="excerpt"]');
        if (descEl) {
          description = descEl.textContent.trim();
        }

        // Extract location
        let location = '';
        const locationEl = el.querySelector('[class*="location"]');
        if (locationEl) {
          location = locationEl.textContent.trim();
        }

        // Get event URL
        let url = '';
        const linkEl = el.querySelector('a');
        if (linkEl && linkEl.href) {
          url = linkEl.href;
        }

        if (title) {
          const rawDate = eventDate && time ? `${eventDate} ${time}` : eventDate || 'TBD';

          results.push({
            name: title,
            eventDate: rawDate,
            venue: location,
            description: description,
            url: url
          });
        }
      } catch (err) {
        console.log('Error parsing event:', err.message);
      }
    });

    return results;
  });

  return events;
}

// Scrape events from Wix library calendar
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let allEvents = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Scrape each calendar page
    for (const url of library.urls) {
      try {
        const pageEvents = await scrapeCalendarPage(url, library, page);
        console.log(`   Found ${pageEvents.length} events on ${url.split('/').pop()}`);
        allEvents = allEvents.concat(pageEvents);
      } catch (error) {
        console.error(`   ❌ Error scraping ${url}:`, error.message);
      }
    }

    // Deduplicate events by name
    const uniqueEvents = [];
    const seenNames = new Set();
    for (const event of allEvents) {
      if (!seenNames.has(event.name)) {
        seenNames.add(event.name);
        uniqueEvents.push(event);
      }
    }

    console.log(`   Total unique events: ${uniqueEvents.length}`);

    // Process each event
    for (const event of uniqueEvents) {
      try {
        const ageRange = parseAgeRange(event.description);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

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
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Wix Calendar Scraper',
            sourceName: library.name,
            county: library.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

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
async function scrapeSugarCalendarLibraries() {
  console.log('\n📚 WIX CALENDAR SCRAPER - FAUQUIER COUNTY');
  console.log('='.repeat(60));
  console.log('Coverage: 1 library system in VA (Wix platform)\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);
      totalImported += imported;
      totalSkipped += skipped;
      totalFailed += failed;
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ WIX FAUQUIER COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  
  // Log scraper stats to Firestore
  await logScraperResult('SugarCalendar-VA', {
    found: totalImported,
    new: totalImported,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeSugarCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeSugarCalendarLibraries };

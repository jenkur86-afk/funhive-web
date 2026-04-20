#!/usr/bin/env node

/**
 * LIBRARYMARKET MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using LibraryMarket platform
 *
 * COVERAGE (10 library systems across 7 states):
 * CA:
 * - San Diego Public Library
 *
 * CO:
 * - Pikes Peak Library District
 *
 * FL:
 * - Lee County Library System
 * - Sarasota County Libraries
 *
 * MD:
 * - Allegany County Library System
 * - Carroll County Public Library
 * - Washington County Free Library
 *
 * NY:
 * - Rochester Public Library
 *
 * TX:
 * - Dallas Public Library
 *
 * VA:
 * - Virginia Beach Public Library
 *
 * Usage:
 *   node scripts/scraper-librarymarket-libraries.js
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

// LibraryMarket Library Systems
const LIBRARY_SYSTEMS = [
  // CALIFORNIA
  {
    name: 'San Diego Public Library',
    url: 'https://sandiego.librarymarket.com/events/upcoming',
    county: 'San Diego',
    state: 'CA',
    website: 'https://www.sandiego.gov/public-library',
    city: 'San Diego',
    zipCode: '92101'
  },

  // COLORADO
  {
    name: 'Pikes Peak Library District',
    url: 'https://ppld.librarymarket.com/events/upcoming',
    county: 'El Paso',
    state: 'CO',
    website: 'https://ppld.org',
    city: 'Colorado Springs',
    zipCode: '80901'
  },

  // FLORIDA
  {
    name: 'Lee County Library System',
    url: 'https://leelibrary.librarymarket.com/events/upcoming',
    county: 'Lee',
    state: 'FL',
    website: 'https://www.leelibrary.net',
    city: 'Fort Myers',
    zipCode: '33901'
  },

  {
    name: 'Sarasota County Libraries',
    url: 'https://scgovlibrary.librarymarket.com/events/upcoming',
    county: 'Sarasota',
    state: 'FL',
    website: 'https://www.scgov.net/government/libraries',
    city: 'Sarasota',
    zipCode: '34237'
  },

  // MARYLAND
  {
    name: 'Allegany County Library System',
    url: 'https://allegany.librarymarket.com/events/upcoming',
    county: 'Allegany',
    state: 'MD',
    website: 'https://www.alleganycountylibrary.info',
    city: 'Cumberland',
    zipCode: '21502'
  },
  {
    name: 'Carroll County Public Library',
    url: 'https://ccpl.librarymarket.com/events/month',
    county: 'Carroll',
    state: 'MD',
    website: 'https://library.carr.org',
    city: 'Westminster',
    zipCode: '21157'
  },
  {
    name: 'Washington County Free Library',
    url: 'https://wcfl.librarymarket.com/events/upcoming',
    county: 'Washington',
    state: 'MD',
    website: 'https://www.washcolibrary.org',
    city: 'Hagerstown',
    zipCode: '21740'
  },

  // NEW YORK
  {
    name: 'Rochester Public Library',
    url: 'https://rochesterpubliclibrary.librarymarket.com/events/upcoming',
    county: 'Monroe',
    state: 'NY',
    website: 'https://www.rpl.org',
    city: 'Rochester',
    zipCode: '14614'
  },

  // TEXAS
  {
    name: 'Dallas Public Library',
    url: 'https://dallaslibrary.librarymarket.com/events/upcoming',
    county: 'Dallas',
    state: 'TX',
    website: 'https://dallaslibrary2.org',
    city: 'Dallas',
    zipCode: '75201'
  },

  // VIRGINIA
  {
    name: 'Virginia Beach Public Library',
    url: 'https://vbpl.librarymarket.com/events/upcoming',
    county: 'Virginia Beach',
    state: 'VA',
    website: 'https://www.vbgov.com/government/departments/libraries',
    city: 'Virginia Beach',
    zipCode: '23451'
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

// Scrape events from LibraryMarket library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County)`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Scrape multiple pages (LibraryMarket uses ?page=X with 0-based indexing)
    const maxPages = 5;
    let allEvents = [];

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const pageUrl = pageNum === 0 ? library.url : `${library.url}?page=${pageNum}`;

      await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for events to load
      await page.waitForSelector('body', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract events from this page
      const pageEvents = await page.evaluate(() => {
      const results = [];
      const processedUrls = new Set();

      // LibraryMarket uses h3 > a for event titles
      // Some libraries use /event/ pattern, others use .event-card pattern
      let eventLinks = document.querySelectorAll('h3 a[href*="/event/"]');

      // If no /event/ links found, try event-card pattern (Virginia Beach uses this)
      if (eventLinks.length === 0) {
        eventLinks = document.querySelectorAll('.event-card h3 a, article h3 a');
      }

      eventLinks.forEach(linkEl => {
        try {
          const url = linkEl.href;
          if (processedUrls.has(url)) return;
          processedUrls.add(url);

          // Skip navigation/utility links
          if (url.includes('/events/') || url.includes('/branches/') || url.includes('#')) return;

          // Extract title from link text
          const title = linkEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Find parent container for additional info
          let container = linkEl.closest('article') || linkEl.parentElement?.parentElement?.parentElement;
          const fullText = container ? container.textContent.replace(/\s+/g, ' ').trim() : '';

          // Extract date - try lc-date-icon elements first (LibraryMarket date icon structure)
          let eventDate = '';
          const lcMonthEl = container?.querySelector('.lc-date-icon__item--month');
          const lcDayEl = container?.querySelector('.lc-date-icon__item--day');
          const lcYearEl = container?.querySelector('.lc-date-icon__item--year');
          if (lcMonthEl && lcDayEl) {
            const month = lcMonthEl.textContent.trim();
            const day = lcDayEl.textContent.trim();
            const year = lcYearEl ? lcYearEl.textContent.trim() : new Date().getFullYear();
            eventDate = `${month} ${day}, ${year}`;
          }

          // Fallback: look for patterns like "12/15" or "January 15, 2025"
          if (!eventDate) {
            const datePatterns = [
              /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,           // "12/15" or "12/15/25"
              /(\w{3,9}\s+\d{1,2},?\s+\d{4})/i,             // "December 15, 2025"
              /(\w{3,9}\s+\d{1,2})/i                         // "December 15"
            ];

            for (const pattern of datePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                eventDate = match[1];
                break;
              }
            }
          }

          // Extract time — try range first, then single time
          let time = '';
          const timeRangeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–—]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
          if (timeRangeMatch) {
            time = `${timeRangeMatch[1].trim()} - ${timeRangeMatch[2].trim()}`;
          } else {
            const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.))/i);
            if (timeMatch) time = timeMatch[1];
          }

          // Extract location/branch - look for "Library" in text
          let location = '';
          const libraryMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Library|Branch|Center))/);
          if (libraryMatch) location = libraryMatch[1];

          // Fallback: Try CSS selectors for location
          if (!location) {
            const altSelectors = ['[class*="location"]', '[class*="branch"]', '[class*="venue"]'];
            for (const selector of altSelectors) {
              const locEl = container?.querySelector(selector);
              if (locEl) {
                location = locEl.textContent.trim();
                break;
              }
            }
          }

          // Extract age range
          let ageRange = 'All Ages';
          const lowerText = fullText.toLowerCase();
          if (lowerText.match(/baby|infant|0-2/)) ageRange = 'Babies & Toddlers (0-2)';
          else if (lowerText.match(/toddler|preschool|3-5/)) ageRange = 'Preschool (3-5)';
          else if (lowerText.match(/children|kids|6-12/)) ageRange = 'Children (6-12)';
          else if (lowerText.match(/teen|13-17/)) ageRange = 'Teens (13-17)';
          else if (lowerText.match(/adult only|seniors only|21\+|18\+/)) ageRange = 'Adults';

          // Extract description from sibling p elements
          let description = '';
          const nextP = linkEl.closest('h3')?.nextElementSibling;
          if (nextP && nextP.tagName === 'P') {
            description = nextP.textContent.trim();
          }

          // Only add events with both title and date
          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              ageRange: ageRange
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

      // Add events from this page to allEvents
      if (pageEvents.length === 0) {
        break; // No more events, stop pagination
      }
      allEvents = allEvents.concat(pageEvents);

      // Small delay between pages
      if (pageNum < maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const events = allEvents;
    console.log(`   Found ${events.length} events (across ${Math.min(maxPages, Math.ceil(events.length / 24) + 1)} pages)`);

    // Process each event
    for (const event of events) {
      try {
        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Try to geocode location, with fallback to library default location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }
        // Fallback to default library coordinates if geocoding failed
        if (!coordinates) {
          coordinates = await geocodeAddress(`${library.name}, ${library.city}, ${library.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Extract start/end time from raw date string before normalization stripped it
        let startTime = null;
        let endTime = null;
        const rawForTime = event.eventDate || '';
        // Range with minutes "9:00am - 10:30pm"
        const trm = rawForTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (trm) {
          const sap = (trm[3] || (parseInt(trm[1]) >= 7 && parseInt(trm[1]) < 12 ? 'AM' : 'PM')).toUpperCase();
          const eap = trm[6].toUpperCase();
          const fmtT = (h, m, ap) => { if (h > 12) h -= 12; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
          startTime = fmtT(parseInt(trm[1]), trm[2], sap);
          endTime = fmtT(parseInt(trm[4]), trm[5], eap);
        } else {
          // Range without minutes "10am-2pm"
          const trn = rawForTime.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
          if (trn) {
            const fmtT = (h, m, ap) => { if (h > 12) h -= 12; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
            startTime = fmtT(parseInt(trn[1]), '00', trn[2].toUpperCase());
            endTime = fmtT(parseInt(trn[3]), '00', trn[4].toUpperCase());
          } else {
            // Single time "3:00 PM"
            const tsm = rawForTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
            if (tsm) {
              const fmtT = (h, m, ap) => { if (h > 12) h -= 12; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
              startTime = fmtT(parseInt(tsm[1]), tsm[2], tsm[3].toUpperCase());
            } else {
              // Single time no minutes "6pm"
              const tsn = rawForTime.match(/\b(\d{1,2})\s*(am|pm)\b/i);
              if (tsn) {
                const fmtT = (h, m, ap) => { if (h > 12) h -= 12; if (h === 0) h = 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
                startTime = fmtT(parseInt(tsn[1]), '00', tsn[2].toUpperCase());
              }
            }
          }
        }

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          startTime: startTime,
          endTime: endTime,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: event.ageRange,
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
            source: 'LibraryMarket Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: event.ageRange
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
async function scrapeLibraryMarketLibraries() {
  console.log('\n📚 LIBRARYMARKET MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: CA, CO, FL, MD, TX, VA (6 states, 9 libraries)\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('LibraryMarket-MultiState', 'events', {
    source: 'librarymarket'
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
  scrapeLibraryMarketLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLibraryMarketLibraries };

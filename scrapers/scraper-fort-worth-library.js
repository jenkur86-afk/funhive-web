#!/usr/bin/env node

/**
 * FORT WORTH PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Fort Worth Public Library's Fun Finder calendar
 *
 * COVERAGE:
 * TX:
 * - Fort Worth Public Library (935K people)
 *
 * Platform: Custom Granicus/OpenCities calendar system
 * URL: https://www.fortworthtexas.gov/departments/library/5-library-events
 *
 * Usage:
 *   node functions/scrapers/scraper-fort-worth-library.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Fort Worth Library System
const LIBRARY = {
  name: 'Fort Worth Public Library',
  url: 'https://www.fortworthtexas.gov/departments/library/5-library-events',
  county: 'Tarrant',
  state: 'TX',
  website: 'https://www.fortworthtexas.gov/departments/library',
  city: 'Fort Worth',
  zipCode: '76102'
};

// Geocode address using OpenStreetMap Nominatim
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

// Scrape events from Fort Worth Library
async function scrapeFortWorthLibrary() {
  console.log(`\n📚 FORT WORTH PUBLIC LIBRARY SCRAPER`);
  console.log('='.repeat(60));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, TX)`);
  console.log(`   URL: ${LIBRARY.url}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Navigate to Fun Finder
    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract total number of pages from pagination
    const totalPages = await page.evaluate(() => {
      // Look for pagination controls - adjust selector based on actual HTML
      const paginationText = document.body.innerText;
      const pagesMatch = paginationText.match(/Page \d+ of (\d+)/i);
      if (pagesMatch) {
        return parseInt(pagesMatch[1]);
      }
      // Default to scraping just first few pages if pagination not found
      return 5;
    });

    console.log(`   Found ${totalPages} pages of events to scrape\n`);

    // Scrape each page (limit to first 10 pages for safety)
    const pagesToScrape = Math.min(totalPages, 10);

    for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
      console.log(`\n📄 Scraping page ${pageNum} of ${pagesToScrape}...`);

      // Extract events from current page
      const events = await page.evaluate(() => {
        const results = [];

        // Try different selectors for event cards
        const selectors = [
          '.event-item',
          '.calendar-event',
          'article',
          '.program-item',
          '[class*="event"]'
        ];

        let eventElements = [];
        for (const selector of selectors) {
          eventElements = document.querySelectorAll(selector);
          if (eventElements.length > 0) break;
        }

        // If no specific selectors work, try finding repeating patterns
        if (eventElements.length === 0) {
          // Look for div elements that might contain events
          const allDivs = document.querySelectorAll('div[class*="item"], div[class*="card"]');
          eventElements = allDivs;
        }

        eventElements.forEach(el => {
          try {
            const fullText = el.textContent.replace(/\s+/g, ' ').trim();

            // Extract title
            const titleEl = el.querySelector('h2, h3, h4, .title, strong, a[href*="program"], a[href*="event"]');
            if (!titleEl) return;
            const title = titleEl.textContent.trim();

            // Skip if title is too short
            if (title.length < 3) return;

            // Extract date - look for patterns
            let eventDate = '';
            const datePatterns = [
              /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\.?\s+\d{1,2},?\s+\d{4}/i,  // "Thursday, Nov. 13, 2025"
              /\w{3,9}\s+\d{1,2},?\s+\d{4}/i,  // "November 13, 2025"
              /\d{1,2}\/\d{1,2}\/\d{4}/,        // "11/13/2025"
            ];

            for (const pattern of datePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                eventDate = match[0];
                break;
              }
            }

            if (!eventDate) return; // Skip if no date found

            // Extract time
            let time = '';
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.)/i);
            if (timeMatch) time = timeMatch[0];

            // Extract location/branch
            let location = '';
            const locationPatterns = [
              /(?:at|@)\s+([^,\n]+(?:Library|Branch))/i,
              /Location:\s*([^,\n]+)/i,
              /([A-Z][a-z]+\s+(?:Regional\s+)?Library)/,
            ];

            for (const pattern of locationPatterns) {
              const match = fullText.match(pattern);
              if (match) {
                location = match[1].trim();
                break;
              }
            }

            // Extract age range / audience
            let ageRange = 'All Ages';
            const lowerText = fullText.toLowerCase();
            if (lowerText.match(/\bteen\b|\bteens\b|\badolescent/)) {
              ageRange = 'Teens (13-17)';
            } else if (lowerText.match(/\byouth\b|\bkids\b|\bchildren\b|\bages 6-12/)) {
              ageRange = 'Children (6-12)';
            } else if (lowerText.match(/\bpreschool\b|\btoddler|\bages 3-5/)) {
              ageRange = 'Preschool (3-5)';
            } else if (lowerText.match(/\bbaby\b|\binfant|\bages 0-2/)) {
              ageRange = 'Babies & Toddlers (0-2)';
            } else if (lowerText.match(/\badult\b|\bsenior/)) {
              ageRange = 'Adults';
            }

            // Skip adult-only events
            if (ageRange === 'Adults') return;

            // Extract description
            const descEl = el.querySelector('p, .description, .summary');
            const description = descEl ? descEl.textContent.trim() : fullText.substring(0, 200);

            // Extract URL if available
            const linkEl = el.querySelector('a[href]');
            const eventUrl = linkEl ? linkEl.href : '';

            results.push({
              name: title,
              eventDate: eventDate,
              time: time,
              venue: location,
              description: description,
              url: eventUrl,
              ageRange: ageRange
            });
          } catch (err) {
            // Skip problematic events
          }
        });

        return results;
      });

      console.log(`   Found ${events.length} events on this page`);

      // Process each event
      for (const event of events) {
        try {
          // Geocode location
          let coordinates = null;
          if (event.venue) {
            const fullAddress = `${event.venue}, Fort Worth, TX`;
            coordinates = await geocodeAddress(fullAddress);
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
          }

          // Use categorization helper
          const { parentCategory, displayCategory, subcategory } = categorizeEvent({
            name: event.name,
            description: event.description
          });

          // Normalize date
          const rawDate = event.time ? `${event.eventDate} ${event.time}` : event.eventDate;
          const normalizedDate = normalizeDateString(rawDate) || rawDate;

          // Build event document
          const eventDoc = {
            name: event.name,
            venue: event.venue || LIBRARY.name,
            eventDate: normalizedDate,
            scheduleDescription: normalizedDate,
            parentCategory,
            displayCategory,
            subcategory,
            ageRange: event.ageRange,
            cost: 'Free',
            description: event.description.substring(0, 1000),
            moreInfo: '',
            location: {
              name: event.venue || LIBRARY.name,
              address: '',
              city: LIBRARY.city,
              zipCode: LIBRARY.zipCode,
              coordinates: coordinates
            },
            contact: {
              website: event.url || LIBRARY.website,
              phone: ''
            },
            url: event.url || LIBRARY.website,
            metadata: {
              source: 'Fort Worth Library Scraper',
              sourceName: LIBRARY.name,
              county: LIBRARY.county,
            state: 'TX',
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
            totalImported++;
          } else {
            totalSkipped++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`  ❌ Error processing event:`, error.message);
          totalFailed++;
        }
      }

      // Navigate to next page if not the last page
      if (pageNum < pagesToScrape) {
        try {
          // Click next page button - adjust selector based on actual HTML
          const nextButtonClicked = await page.evaluate(() => {
            const nextButtons = [
              ...document.querySelectorAll('a[class*="next"]'),
              ...document.querySelectorAll('a[rel="next"]'),
              ...document.querySelectorAll('button[class*="next"]')
            ];

            for (const btn of nextButtons) {
              if (btn.textContent.toLowerCase().includes('next') || btn.textContent.includes('>')) {
                btn.click();
                return true;
              }
            }
            return false;
          });

          if (nextButtonClicked) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page load
          } else {
            console.log('   Could not find next page button, stopping pagination');
            break;
          }
        } catch (error) {
          console.log(`   Error navigating to next page: ${error.message}`);
          break;
        }
      }
    }

    await page.close();

  } catch (error) {
    console.error(`\n❌ Error scraping Fort Worth Library:`, error.message);
    totalFailed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FORT WORTH PUBLIC LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  
  // Log scraper stats to Firestore
  await logScraperResult('Fort Worth Library', {
    found: totalImported,
    new: totalImported,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeFortWorthLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeFortWorthLibrary };

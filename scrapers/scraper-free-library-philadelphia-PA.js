/**
 * FREE LIBRARY OF PHILADELPHIA SCRAPER
 *
 * Scrapes events from the Free Library of Philadelphia's custom calendar system
 * This is the largest public library system in Pennsylvania
 *
 * COVERAGE:
 * - Free Library of Philadelphia - 1,574,000 population
 * - 54 neighborhood/regional locations + Parkway Central Library + Rosenbach
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Free Library of Philadelphia',
  baseUrl: 'https://libwww.freelibrary.org',
  calendarPath: '/calendar/main/home',
  county: 'Philadelphia',
  state: 'PA',
  website: 'https://www.freelibrary.org',
  city: 'Philadelphia',
  zipCode: '19103'
};

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

  // Skip adult-only events
  if (lowerText.match(/adults? only/i) || lowerText.match(/\b18\+/i) || lowerText.match(/\b21\+/i)) {
    return 'Adults';
  }

  // Check for age indicators
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  // Look for specific age mentions
  const ageMatch = lowerText.match(/ages?\s+(\d+)/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age <= 2) return 'Babies & Toddlers (0-2)';
    if (age <= 5) return 'Preschool (3-5)';
    if (age <= 12) return 'Children (6-12)';
    if (age <= 17) return 'Teens (13-17)';
    return 'Adults';
  }

  return 'All Ages';
}

// Scrape events from a single page
async function scrapePage(page, pageNum) {
  const url = pageNum === 1
    ? `${LIBRARY.baseUrl}${LIBRARY.calendarPath}/having/all`
    : `${LIBRARY.baseUrl}${LIBRARY.calendarPath}/page/${pageNum}/having/all`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Wait for Cloudflare challenge to complete (if present)
    // Check if we're on a challenge page and wait for redirect
    const isChallenge = await page.evaluate(() => {
      return document.title.includes('moment') || document.body.innerText.includes('Enable JavaScript');
    });

    if (isChallenge) {
      console.log('   Cloudflare challenge detected, waiting...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      // Wait for navigation after challenge
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    }

    await page.waitForSelector('body', { timeout: 5000 });

    // Wait additional time for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Debug: Check page title and content
    const pageTitle = await page.title();
    console.log(`   Page ${pageNum} title: "${pageTitle}"`);

    // Extract events from the page - Free Library structure:
    // Event titles are in h3.h4 > a[href*="/calendar/event/"]
    // Date in <strong>, Time in span.text-lowercase, Location in a[href*="/locations/"]
    const events = await page.evaluate(() => {
      const results = [];
      const processedUrls = new Set();

      // Debug: Log what we find on the page
      const allH3 = document.querySelectorAll('h3');
      const allCalendarLinks = document.querySelectorAll('a[href*="/calendar/"]');
      const allEventLinks = document.querySelectorAll('a[href*="/event/"]');
      console.log(`Debug: Found ${allH3.length} h3 elements, ${allCalendarLinks.length} calendar links, ${allEventLinks.length} event links`);

      // Find event title links inside h3 elements (original selector)
      let titleLinks = document.querySelectorAll('h3 a[href*="/calendar/event/"]');

      // If no events found, try alternative selectors
      if (titleLinks.length === 0) {
        // Try broader selectors
        titleLinks = document.querySelectorAll('a[href*="/calendar/event/"]');
        console.log(`Debug: Using fallback selector, found ${titleLinks.length} event links`);
      }

      // If still no events, try looking for any calendar event patterns
      if (titleLinks.length === 0) {
        titleLinks = document.querySelectorAll('.event a, .calendar-item a, [class*="event"] a');
        console.log(`Debug: Using class-based selector, found ${titleLinks.length} links`);
      }

      titleLinks.forEach(linkEl => {
        try {
          const href = linkEl.getAttribute('href');
          if (processedUrls.has(href)) return;
          processedUrls.add(href);

          // Get title from link text
          const title = linkEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Find the parent row container (go up to find the event block)
          let container = linkEl.closest('.row') || linkEl.parentElement.parentElement.parentElement;

          // Extract date from <strong> tag
          let dateText = '';
          const strongEl = container ? container.querySelector('strong') : null;
          if (strongEl) {
            dateText = strongEl.textContent.trim();
          }

          // Extract time from span.text-lowercase
          let timeText = '';
          const timeEl = container ? container.querySelector('span.text-lowercase') : null;
          if (timeEl) {
            timeText = timeEl.textContent.trim();
          }

          // Extract location from location link
          let location = '';
          const locationEl = container ? container.querySelector('a[href*="/locations/"]') : null;
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Extract description from paragraph
          let description = '';
          const descPs = container ? container.querySelectorAll('p') : [];
          for (const p of descPs) {
            const pText = p.textContent.trim();
            if (pText.length > 50 && !pText.includes('Showing')) {
              description = pText;
              break;
            }
          }

          // Extract age/audience info
          let ageInfo = '';
          const fullText = container ? container.textContent.toUpperCase() : '';
          const agePatterns = ['BABY', 'TODDLER', 'CHILDREN', 'CHILD', 'KIDS', 'TEEN', 'TWEEN', 'ADULT', 'SENIOR', 'FAMILY'];
          for (const pattern of agePatterns) {
            if (fullText.includes(pattern)) {
              ageInfo = ageInfo ? `${ageInfo}, ${pattern}` : pattern;
            }
          }

          if (title && dateText) {
            results.push({
              title: title,
              url: href.startsWith('http') ? href : 'https://libwww.freelibrary.org' + href,
              date: dateText,
              time: timeText,
              location: location,
              description: description,
              ageInfo: ageInfo
            });
          }
        } catch (err) {
          // Skip errors
        }
      });

      return results;
    });

    return events;

  } catch (error) {
    console.error(`Error scraping page ${pageNum}:`, error.message);
    return [];
  }
}

// Main scraper function
async function scrapeFreeLibraryPhiladelphia() {
  console.log('\n📚 FREE LIBRARY OF PHILADELPHIA SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Philadelphia County, PA (1.6M population)\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    // Set realistic browser fingerprint to bypass Cloudflare
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    // Bypass webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('   Scraping calendar pages...');

    // Scrape first page to determine total pages
    const firstPageEvents = await scrapePage(page, 1);
    console.log(`   Page 1: Found ${firstPageEvents.length} events`);

    // Process first page events
    for (const event of firstPageEvents) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.ageInfo + ' ' + event.description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.title,
          description: event.description
        });

        // Try to geocode location
        let coordinates = null;
        if (event.location) {
          coordinates = await geocodeAddress(`${event.location}, Philadelphia, PA`);
        }

        // Normalize date format
        const rawDate = `${event.date} ${event.time}`;
        const normalizedDate = normalizeDateString(rawDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${rawDate}"`);
          skipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: event.title,
          venue: event.location || LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: `${event.date} ${event.time}`,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.ageInfo || '',
          location: {
            name: event.location || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Free Library of Philadelphia Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
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
          console.log(`  ✅ ${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    // Scrape additional pages (up to 50 pages to avoid overload)
    const maxPages = 50;
    for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
      const events = await scrapePage(page, pageNum);

      if (events.length === 0) {
        console.log(`   No more events found at page ${pageNum}. Stopping.`);
        break;
      }

      console.log(`   Page ${pageNum}: Found ${events.length} events`);

      for (const event of events) {
        try {
          const ageRange = parseAgeRange(event.ageInfo + ' ' + event.description);

          if (ageRange === 'Adults') {
            skipped++;
            continue;
          }

          const { parentCategory, displayCategory, subcategory } = categorizeEvent({
            name: event.title,
            description: event.description
          });

          let coordinates = null;
          if (event.location) {
            coordinates = await geocodeAddress(`${event.location}, Philadelphia, PA`);
          }

          // Normalize date format
          const rawDate2 = `${event.date} ${event.time}`;
          const normalizedDate2 = normalizeDateString(rawDate2);
          if (!normalizedDate2) {
            console.log(`  ⚠️ Skipping event with invalid date: "${rawDate2}"`);
            skipped++;
            continue;
          }

          const eventDoc = {
            name: event.title,
            venue: event.location || LIBRARY.name,
            eventDate: normalizedDate2,
            scheduleDescription: `${event.date} ${event.time}`,
            parentCategory,
            displayCategory,
            subcategory,
            ageRange: ageRange,
            cost: 'Free',
            description: (event.description || '').substring(0, 1000),
            moreInfo: event.ageInfo || '',
            location: {
              name: event.location || LIBRARY.name,
              address: '',
              city: LIBRARY.city,
              state: LIBRARY.state,
              zipCode: LIBRARY.zipCode,
              coordinates: coordinates
            },
            contact: {
              website: event.url || LIBRARY.website,
              phone: ''
            },
            url: event.url || LIBRARY.website,
            metadata: {
              source: 'Free Library of Philadelphia Scraper',
              sourceName: LIBRARY.name,
              county: LIBRARY.county,
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
            .where('metadata.sourceName', '==', LIBRARY.name)
            .limit(1)
            .get();

          if (existing.empty) {
            await db.collection('events').add(eventDoc);
            console.log(`  ✅ ${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''}`);
            imported++;
          } else {
            skipped++;
          }

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`  ❌ Error processing event:`, error.message);
          failed++;
        }
      }

      // Delay between pages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping Free Library:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FREE LIBRARY OF PHILADELPHIA SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Free Library of Philadelphia', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeFreeLibraryPhiladelphia()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeFreeLibraryPhiladelphia };

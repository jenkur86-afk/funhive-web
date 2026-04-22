#!/usr/bin/env node

/**
 * PENNSYLVANIA DRUPAL LIBRARIES SCRAPER
 *
 * Scrapes events from Pennsylvania libraries using custom Drupal HTML feed systems
 * Both Lancaster and York use the same Drupal architecture with HTML feed endpoints
 *
 * COVERAGE (2 library systems in PA):
 *
 * PA:
 * - Library System of Lancaster County - 560,000 population
 * - York County Libraries - 450,000 population
 *
 * Usage:
 *   node scripts/Scraper-event-drupal-pennsylvania.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-utils');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using Custom Drupal with HTML feed
const LIBRARY_SYSTEMS = [
  {
    name: 'Library System of Lancaster County',
    baseUrl: 'https://calendar.lancasterlibraries.org',
    feedPath: '/events/feed/html',
    county: 'Lancaster',
    state: 'PA',
    website: 'https://lancasterlibraries.org',
    city: 'Lancaster',
    zipCode: '17602'
  },
  {
    name: 'York County Libraries',
    baseUrl: 'https://events.yorklibraries.org',
    feedPath: '/events/feed/html',
    county: 'York',
    state: 'PA',
    website: 'https://yorklibraries.org',
    city: 'York',
    zipCode: '17401'
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

// Map age groups to standard categories
function mapAgeRange(ageGroupText) {
  if (!ageGroupText) return 'All Ages';

  const lowerText = ageGroupText.toLowerCase();

  // Skip adult-only events
  if (lowerText.match(/adults? only/i) || lowerText === 'adults') {
    return 'Adults';
  }

  // Map various age group formats to standard ranges
  if (lowerText.match(/babies?|toddlers?/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/preschool/i)) return 'Preschool (3-5)';
  if (lowerText.match(/school age|grades? k-5|children/i)) return 'Children (6-12)';
  if (lowerText.match(/grades? 6-8|teens?/i)) return 'Teens (13-17)';
  if (lowerText.match(/everyone|all ages|family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Get dates to scrape (today + next 60 days)
function getDatesToScrape() {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    dates.push(dateStr);
  }

  return dates;
}

// Scrape events from Drupal HTML feed for a specific date
async function scrapeDateEvents(library, date, page) {
  const url = `${library.baseUrl}${library.feedPath}?_wrapper_format=lc_calendar_feed&current_date=${date}`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 5000 });

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Find all H3 headings (event titles)
      const headings = document.querySelectorAll('h3');

      headings.forEach(heading => {
        try {
          // Get event title from h3 text directly (may or may not have nested link)
          let title = '';
          let eventUrl = '';

          const link = heading.querySelector('a');
          if (link) {
            // If there's a link inside h3, use it
            title = link.textContent.trim();
            eventUrl = link.href;
          } else {
            // Otherwise extract title from h3 text directly
            title = heading.textContent.trim();
            // Try to find a link in nearby elements
            let searchElement = heading.nextElementSibling;
            for (let i = 0; i < 5 && searchElement; i++) {
              const nearbyLink = searchElement.querySelector('a');
              if (nearbyLink) {
                eventUrl = nearbyLink.href;
                break;
              }
              searchElement = searchElement.nextElementSibling;
            }
          }

          if (!title) return;

          // Get the content after this heading
          let currentElement = heading.nextElementSibling;
          let timeText = '';
          let locationText = '';
          let ageGroupText = '';
          let programTypeText = '';
          let descriptionText = '';

          // Parse content following the heading
          while (currentElement && currentElement.tagName !== 'H3') {
            const text = currentElement.textContent;

            // Extract time (e.g., "9:00am–11:00am") or mark as "All Day" if not present
            if (text.match(/\d{1,2}:\d{2}[ap]m/i)) {
              timeText = text.match(/\d{1,2}:\d{2}[ap]m\s*[–-]\s*\d{1,2}:\d{2}[ap]m/i)?.[0] ||
                        text.match(/\d{1,2}:\d{2}[ap]m/i)?.[0] || '';
            } else if (text.toLowerCase().includes('all day') && !timeText) {
              timeText = 'All Day';
            }

            // Extract fields
            if (text.includes('Library:') || text.includes('Branch:')) {
              locationText = text.replace(/^(Library|Branch):\s*/i, '').trim();
            }

            if (text.includes('Age Group:')) {
              ageGroupText = text.replace(/^Age Group:\s*/i, '').trim();
            }

            if (text.includes('Program Type:')) {
              programTypeText = text.replace(/^Program Type:\s*/i, '').trim();
            }

            // Collect description paragraphs
            if (currentElement.tagName === 'P' && text.length > 20 && !text.includes(':')) {
              descriptionText += text + ' ';
            }

            currentElement = currentElement.nextElementSibling;
          }

          if (title) {
            results.push({
              title: title,
              url: eventUrl,
              time: timeText,
              location: locationText,
              ageGroup: ageGroupText,
              programType: programTypeText,
              description: descriptionText.trim()
            });
          }
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      });

      return results;
    });

    return events;

  } catch (error) {
    console.error(`Error scraping date ${date} for ${library.name}:`, error.message);
    return [];
  }
}

// Fallback: scrape the regular /events page if the feed URL is dead
async function scrapeEventsPageFallback(library, page) {
  const eventsUrl = `${library.baseUrl}/events`;
  console.log(`   Trying fallback: ${eventsUrl}`);
  try {
    await page.goto(eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Try various selectors for event listings
      const selectors = ['.views-row', '.event-item', 'article', '.node--type-event', '.calendar-event', '.event-card', 'li.event'];
      let elements = [];
      for (const sel of selectors) {
        elements = document.querySelectorAll(sel);
        if (elements.length > 0) break;
      }

      // Fallback: use links to event detail pages
      if (elements.length === 0) {
        const links = document.querySelectorAll('a[href*="/event/"], a[href*="/events/"], a[href*="/node/"]');
        links.forEach(link => {
          const title = link.textContent.trim();
          const href = link.getAttribute('href') || '';
          if (!title || title.length < 5 || title.length > 200 || seen.has(title)) return;
          if (href.endsWith('/events') || href.endsWith('/events/')) return;
          seen.add(title);
          const card = link.closest('li, article, div, tr') || link.parentElement;
          const cardText = card.textContent || '';
          const dateMatch = cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i);
          const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
          if (dateMatch) {
            results.push({
              title, url: href.startsWith('http') ? href : window.location.origin + href,
              time: timeMatch ? timeMatch[1] : '', location: '', ageGroup: '', programType: '',
              description: '', _date: dateMatch[1]
            });
          }
        });
        return results;
      }

      elements.forEach(el => {
        const titleEl = el.querySelector('h2, h3, h4, .field-name-node-title, .event-title, a');
        const title = titleEl ? titleEl.textContent.trim() : '';
        if (!title || title.length < 3 || seen.has(title)) return;
        seen.add(title);

        const linkEl = el.querySelector('a');
        const href = linkEl ? linkEl.getAttribute('href') : '';
        const cardText = el.textContent || '';
        const dateMatch = cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i);
        const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*[–-]\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i);

        const locationEl = el.querySelector('[class*="location"], .branch, .library');
        const location = locationEl ? locationEl.textContent.trim() : '';

        results.push({
          title, url: href ? (href.startsWith('http') ? href : window.location.origin + href) : '',
          time: timeMatch ? timeMatch[1] : '', location, ageGroup: '', programType: '',
          description: '', _date: dateMatch ? dateMatch[1] : ''
        });
      });
      return results;
    });

    console.log(`   Fallback found ${events.length} events`);
    return events;
  } catch (error) {
    console.error(`   Fallback failed: ${error.message}`);
    return [];
  }
}

// Scrape all events from library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, PA)`);
  console.log(`   Feed URL: ${library.baseUrl}${library.feedPath}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    const dates = getDatesToScrape();
    console.log(`   Scraping ${dates.length} dates...`);

    for (const date of dates) {
      const events = await scrapeDateEvents(library, date, page);

      for (const event of events) {
        try {
          // Map age range
          const ageRange = mapAgeRange(event.ageGroup);

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
            coordinates = await geocodeAddress(`${event.location}, ${library.county} County, PA`);
          }

          // If no coordinates from venue, use library default coordinates
          if (!coordinates) {
            // Default coordinates for PA libraries
            const defaultCoords = {
              'Lancaster': { latitude: 40.0379, longitude: -76.3055 },
              'York': { latitude: 39.9626, longitude: -76.7277 }
            };
            coordinates = defaultCoords[library.county] || null;
          }

          // Build event document
          // Format date properly: "2026-02-10" -> "February 10, 2026"
          const rawDate = `${date} ${event.time}`;
          const formattedDate = normalizeDateString(rawDate);

          const eventDoc = {
            name: event.title,
            venue: event.location || library.name,
            state: library.state, // CRITICAL: Add state field
            eventDate: formattedDate,
            scheduleDescription: formattedDate,
            parentCategory,
            displayCategory,
            subcategory,
            ageRange: ageRange,
            cost: 'Free',
            description: (event.description || '').substring(0, 1000),
            moreInfo: event.programType || '',
            location: {
              name: event.location || library.name,
              address: '',
              city: library.city,
              state: library.state,
              zipCode: library.zipCode,
              coordinates: coordinates || null
            },
            contact: {
              website: event.url || library.website,
              phone: ''
            },
            url: event.url || library.website,
            metadata: {
              source: 'Drupal Pennsylvania Libraries Scraper',
              sourceName: library.name,
              county: library.county,
              state: library.state,
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            },
            filters: {
              isFree: true,
              ageRange: ageRange
            }
          };

          // Add geohash - required for app display
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

      // Delay between date requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // If feed-based scraping found 0 events, try the regular events page as fallback
    if (imported === 0) {
      console.log(`   ⚠ Feed-based scraping found 0 events — trying regular /events page fallback`);
      const fallbackEvents = await scrapeEventsPageFallback(library, page);
      for (const event of fallbackEvents) {
        try {
          const ageRange = mapAgeRange(event.ageGroup);
          if (ageRange === 'Adults') { skipped++; continue; }

          const { parentCategory, displayCategory, subcategory } = categorizeEvent({
            name: event.title, description: event.description
          });

          let coordinates = null;
          if (event.location) {
            coordinates = await geocodeAddress(`${event.location}, ${library.county} County, PA`);
          }
          if (!coordinates) {
            const defaultCoords = {
              'Lancaster': { latitude: 40.0379, longitude: -76.3055 },
              'York': { latitude: 39.9626, longitude: -76.7277 }
            };
            coordinates = defaultCoords[library.county] || null;
          }

          const rawDate = event._date ? `${event._date} ${event.time}` : event.time;
          const formattedDate = normalizeDateString(rawDate) || rawDate;

          const eventDoc = {
            name: event.title,
            venue: event.location || library.name,
            state: library.state,
            eventDate: formattedDate,
            scheduleDescription: formattedDate,
            parentCategory,
            displayCategory,
            subcategory,
            description: event.description || '',
            ageRange,
            source: `Drupal-${library.name}`,
            sourceUrl: event.url || `${library.baseUrl}/events`,
            city: library.city,
            address: event.location || '',
            zipCode: library.zipCode,
            ...(coordinates && {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              geohash: ngeohash.encode(coordinates.latitude, coordinates.longitude, 7),
              location: `SRID=4326;POINT(${coordinates.longitude} ${coordinates.latitude})`
            }),
            lastScraped: admin.firestore.Timestamp.now()
          };

          const activityId = await linkEventToVenue(eventDoc);
          if (activityId) eventDoc.activityId = activityId;

          await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''}`);
          imported++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`  ❌ Error processing fallback event:`, error.message);
          failed++;
        }
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
async function scrapeDrupalPennsylvaniaLibraries() {
  console.log('\n📚 PENNSYLVANIA DRUPAL LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 2 libraries in PA (Lancaster, York)\n');

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
  console.log('✅ PENNSYLVANIA DRUPAL LIBRARIES SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');
}

// Cloud Function wrapper
async function scrapeDrupalPennsylvaniaLibrariesCloudFunction() {
  console.log('\n📚 Pennsylvania Drupal Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('Drupal-PA', 'events', {
    state: 'PA',
    source: 'drupal'
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

  return {
    imported: result.stats.new,
    skipped: result.stats.duplicates,
    failed: result.stats.errors,
    message: 'Pennsylvania Drupal libraries scraper completed'
  };
}

// Run if executed directly
if (require.main === module) {
  scrapeDrupalPennsylvaniaLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeDrupalPennsylvaniaLibraries, scrapeDrupalPennsylvaniaLibrariesCloudFunction };

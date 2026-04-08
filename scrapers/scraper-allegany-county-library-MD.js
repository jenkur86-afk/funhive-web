#!/usr/bin/env node

/**
 * ALLEGANY COUNTY LIBRARY SYSTEM SCRAPER
 * Platform: LibraryMarket
 * URL: https://allegany.librarymarket.com
 * State: MD
 *
 * Branches:
 * - Washington Street Library (31 Washington St, Cumberland, MD 21502)
 * - South Cumberland Library (100 Seymour St, Cumberland, MD 21502)
 * - LaVale Library (815 National Hwy, LaVale, MD 21502)
 * - Frostburg Library (65 E Main St, Frostburg, MD 21532)
 * - Westernport Library (66 Main St, Westernport, MD 21562)
 */

const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');
const ngeohash = require('ngeohash');
const axios = require('axios');
const { categorizeEvent } = require('./event-categorization-helper');
const { logScraperResult } = require('./scraper-logger');
const { getOrCreateActivity } = require('./event-save-helper');
const { normalizeDateString } = require('./date-utils');

const LIBRARY_NAME = 'Allegany County Library System';
const EVENTS_URL = 'https://allegany.librarymarket.com';
const SCRAPER_NAME = 'allegany-county-library-MD';

// Branch addresses with coordinates
const BRANCHES = {
  'Washington Street Library': { address: '31 Washington St, Cumberland, MD 21502', lat: 39.6529, lng: -78.7625, city: 'Cumberland', zipCode: '21502' },
  'Washington Street': { address: '31 Washington St, Cumberland, MD 21502', lat: 39.6529, lng: -78.7625, city: 'Cumberland', zipCode: '21502' },
  'South Cumberland': { address: '100 Seymour St, Cumberland, MD 21502', lat: 39.6442, lng: -78.7617, city: 'Cumberland', zipCode: '21502' },
  'South Cumberland Library': { address: '100 Seymour St, Cumberland, MD 21502', lat: 39.6442, lng: -78.7617, city: 'Cumberland', zipCode: '21502' },
  'LaVale': { address: '815 National Hwy, LaVale, MD 21502', lat: 39.6562, lng: -78.8103, city: 'LaVale', zipCode: '21502' },
  'LaVale Library': { address: '815 National Hwy, LaVale, MD 21502', lat: 39.6562, lng: -78.8103, city: 'LaVale', zipCode: '21502' },
  'Frostburg': { address: '65 E Main St, Frostburg, MD 21532', lat: 39.6581, lng: -78.9281, city: 'Frostburg', zipCode: '21532' },
  'Frostburg Library': { address: '65 E Main St, Frostburg, MD 21532', lat: 39.6581, lng: -78.9281, city: 'Frostburg', zipCode: '21532' },
  'Westernport': { address: '66 Main St, Westernport, MD 21562', lat: 39.4844, lng: -79.0456, city: 'Westernport', zipCode: '21562' },
  'Westernport Library': { address: '66 Main St, Westernport, MD 21562', lat: 39.4844, lng: -79.0456, city: 'Westernport', zipCode: '21562' }
};

// Default to main branch
const DEFAULT_BRANCH = BRANCHES['Washington Street Library'];

function getBranchInfo(branchText) {
  if (!branchText) return DEFAULT_BRANCH;

  const lowerText = branchText.toLowerCase();

  for (const [branchName, info] of Object.entries(BRANCHES)) {
    if (lowerText.includes(branchName.toLowerCase())) {
      return { ...info, name: branchName };
    }
  }

  // Check for partial matches
  if (lowerText.includes('washington')) return { ...BRANCHES['Washington Street Library'], name: 'Washington Street Library' };
  if (lowerText.includes('south')) return { ...BRANCHES['South Cumberland'], name: 'South Cumberland Library' };
  if (lowerText.includes('lavale')) return { ...BRANCHES['LaVale'], name: 'LaVale Library' };
  if (lowerText.includes('frostburg')) return { ...BRANCHES['Frostburg'], name: 'Frostburg Library' };
  if (lowerText.includes('westernport')) return { ...BRANCHES['Westernport'], name: 'Westernport Library' };

  return { ...DEFAULT_BRANCH, name: 'Washington Street Library' };
}

async function scrapeAlleganyCountyLibrary() {
  console.log(`\n📚 ALLEGANY COUNTY LIBRARY SYSTEM SCRAPER`);
  console.log('='.repeat(60));
  console.log(`URL: ${EVENTS_URL}`);

  const browser = await launchBrowser();
  const events = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(EVENTS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('.event-card, .lc-event, [class*="event"]', { timeout: 15000 }).catch(() => null);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from LibraryMarket page
    const rawEvents = await page.evaluate(() => {
      const events = [];

      // LibraryMarket uses various event card structures
      const eventCards = document.querySelectorAll('.event-card, .lc-event, [class*="event-item"], article');

      eventCards.forEach(card => {
        try {
          // Get title
          const titleEl = card.querySelector('h2, h3, h4, .event-title, [class*="title"] a, a[href*="/event/"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Get URL
          const linkEl = card.querySelector('a[href*="/event/"], a[href]');
          const url = linkEl ? linkEl.href : '';

          // Get date/time - LibraryMarket format: "Thursday, December 4, 2025 at 10:00am - 6:00pm"
          const fullText = card.textContent;
          let eventDate = '';
          let eventTime = '';

          // Match full date with time
          const dateTimeMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm))/i);
          if (dateTimeMatch) {
            eventDate = dateTimeMatch[0];
          } else {
            // Try just date
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}/i) ||
                             fullText.match(/\w+\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Get branch/location - LibraryMarket shows "Library Branch:" or location field
          let branch = '';
          const branchMatch = fullText.match(/(?:Library Branch|Location|Branch):\s*([^,\n]+)/i);
          if (branchMatch) {
            branch = branchMatch[1].trim();
          } else {
            // Look for branch names in text
            const branchNames = ['Washington Street', 'South Cumberland', 'LaVale', 'Frostburg', 'Westernport'];
            for (const name of branchNames) {
              if (fullText.includes(name)) {
                branch = name;
                break;
              }
            }
          }

          // Get description
          const descEl = card.querySelector('.event-description, [class*="description"], p');
          const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

          // Get image
          const imgEl = card.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';

          events.push({
            title,
            eventDate,
            branch,
            description,
            url,
            imageUrl
          });
        } catch (e) {
          // Skip problematic cards
        }
      });

      // Deduplicate by title + date
      const seen = new Set();
      return events.filter(e => {
        const key = `${e.title}|${e.eventDate}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`   Found ${rawEvents.length} raw events`);

    // Process each event with location data
    for (const rawEvent of rawEvents) {
      try {
        const branchInfo = getBranchInfo(rawEvent.branch);

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: rawEvent.title,
          description: rawEvent.description
        });

        // Normalize the date format
        const normalizedDate = normalizeDateString(rawEvent.eventDate);

        const eventDoc = {
          name: rawEvent.title,
          venue: branchInfo.name || LIBRARY_NAME,
          eventDate: normalizedDate,
          description: rawEvent.description,
          url: rawEvent.url || EVENTS_URL,
          imageUrl: rawEvent.imageUrl,
          state: 'MD',
          city: branchInfo.city,
          zipCode: branchInfo.zipCode,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: 'All Ages',
          cost: 'Free',
          geohash: ngeohash.encode(branchInfo.lat, branchInfo.lng, 7),
          location: {
            name: branchInfo.name || LIBRARY_NAME,
            address: branchInfo.address,
            city: branchInfo.city,
            zipCode: branchInfo.zipCode,
            latitude: branchInfo.lat,
            longitude: branchInfo.lng,
            coordinates: {
              latitude: branchInfo.lat,
              longitude: branchInfo.lng
            }
          },
          contact: {
            website: EVENTS_URL,
            phone: ''
          },
          metadata: {
            source: 'Allegany County Library Scraper',
            sourceName: LIBRARY_NAME,
            branch: branchInfo.name,
            state: 'MD',
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: 'All Ages'
          }
        };

        events.push(eventDoc);
      } catch (e) {
        console.error(`   Error processing event: ${e.message}`);
      }
    }

    await page.close();

  } catch (error) {
    console.error(`   ❌ Error scraping: ${error.message}`);
  } finally {
    await browser.close();
  }

  console.log(`   ✅ Processed ${events.length} events with location data`);
  return events;
}

async function saveToFirebase(events) {
  let batch = db.batch();
  let imported = 0;
  let skipped = 0;
  let batchCount = 0;

  for (const event of events) {
    // Check for duplicates
    const existing = await db.collection('events')
      .where('name', '==', event.name)
      .where('eventDate', '==', event.eventDate)
      .where('metadata.sourceName', '==', LIBRARY_NAME)
      .limit(1)
      .get();

    if (existing.empty) {
      // Get or create activity for this library branch
      const library = {
        name: event.venue || LIBRARY_NAME,
        city: event.location?.city || 'Cumberland',
        state: 'MD',
        address: event.location?.address,
        zipCode: event.location?.zipCode
      };
      const coordinates = event.location?.latitude && event.location?.longitude
        ? { latitude: event.location.latitude, longitude: event.location.longitude }
        : null;

      event.activityId = await getOrCreateActivity(library, coordinates, 'MD');

      const docRef = db.collection('events').doc();
      batch.set(docRef, event);
      imported++;
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log(`   💾 Committed batch (${imported} imported so far)`);
      }
    } else {
      skipped++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ ${LIBRARY_NAME} complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);

  // Log scraper stats to Firestore
  await logScraperResult('Allegany County Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped };
}

async function scrapeAlleganyCountyLibraryCloudFunction() {
  console.log(`☁️ Running ${LIBRARY_NAME} as Cloud Function`);
  const events = await scrapeAlleganyCountyLibrary();

  if (events.length > 0) {
    const result = await saveToFirebase(events);
    return result;
  }

  // Log 0 events if scraping returned nothing
  await logScraperResult('Allegany County Library', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: 0, skipped: 0 };
}

// Run if executed directly
if (require.main === module) {
  scrapeAlleganyCountyLibrary()
    .then(events => {
      if (events.length > 0) {
        return saveToFirebase(events);
      }
      return { imported: 0, skipped: 0 };
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAlleganyCountyLibrary, scrapeAlleganyCountyLibraryCloudFunction };

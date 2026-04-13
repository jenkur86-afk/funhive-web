#!/usr/bin/env node

/**
 * RUTH ENLOW LIBRARY OF GARRETT COUNTY SCRAPER
 * Platform: LibraryMarket
 * URL: https://relib.librarymarket.com/events/month
 * State: MD
 *
 * Branches:
 * - Oakland (6 N Second St, Oakland, MD 21550)
 * - Accident (108 S Main St, Accident, MD 21520)
 * - Friendsville (47 2nd Ave, Friendsville, MD 21531)
 * - Grantsville (150 Main St, Grantsville, MD 21536)
 * - Kitzmiller (141 1st St, Kitzmiller, MD 21538)
 */

const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { getOrCreateActivity } = require('./event-save-helper');

const LIBRARY_NAME = 'Ruth Enlow Library of Garrett County';
const EVENTS_URL = 'https://relib.librarymarket.com/events/month';
const SCRAPER_NAME = 'ruth-enlow-library-MD';

// Branch addresses with coordinates
const BRANCHES = {
  'Oakland': { address: '6 N Second St, Oakland, MD 21550', lat: 39.4078, lng: -79.4067, city: 'Oakland', zipCode: '21550' },
  'Oakland Branch': { address: '6 N Second St, Oakland, MD 21550', lat: 39.4078, lng: -79.4067, city: 'Oakland', zipCode: '21550' },
  'Accident': { address: '108 S Main St, Accident, MD 21520', lat: 39.6279, lng: -79.3204, city: 'Accident', zipCode: '21520' },
  'Accident Branch': { address: '108 S Main St, Accident, MD 21520', lat: 39.6279, lng: -79.3204, city: 'Accident', zipCode: '21520' },
  'Friendsville': { address: '47 2nd Ave, Friendsville, MD 21531', lat: 39.6614, lng: -79.4048, city: 'Friendsville', zipCode: '21531' },
  'Friendsville Branch': { address: '47 2nd Ave, Friendsville, MD 21531', lat: 39.6614, lng: -79.4048, city: 'Friendsville', zipCode: '21531' },
  'Grantsville': { address: '150 Main St, Grantsville, MD 21536', lat: 39.7011, lng: -79.1502, city: 'Grantsville', zipCode: '21536' },
  'Grantsville Branch': { address: '150 Main St, Grantsville, MD 21536', lat: 39.7011, lng: -79.1502, city: 'Grantsville', zipCode: '21536' },
  'Kitzmiller': { address: '141 1st St, Kitzmiller, MD 21538', lat: 39.3872, lng: -79.1858, city: 'Kitzmiller', zipCode: '21538' },
  'Kitzmiller Branch': { address: '141 1st St, Kitzmiller, MD 21538', lat: 39.3872, lng: -79.1858, city: 'Kitzmiller', zipCode: '21538' }
};

// Default to main branch (Oakland)
const DEFAULT_BRANCH = BRANCHES['Oakland'];

function getBranchInfo(branchText) {
  if (!branchText) return { ...DEFAULT_BRANCH, name: 'Oakland' };

  const lowerText = branchText.toLowerCase();

  for (const [branchName, info] of Object.entries(BRANCHES)) {
    if (lowerText.includes(branchName.toLowerCase())) {
      return { ...info, name: branchName };
    }
  }

  // Check for partial matches
  if (lowerText.includes('oakland')) return { ...BRANCHES['Oakland'], name: 'Oakland' };
  if (lowerText.includes('accident')) return { ...BRANCHES['Accident'], name: 'Accident' };
  if (lowerText.includes('friendsville')) return { ...BRANCHES['Friendsville'], name: 'Friendsville' };
  if (lowerText.includes('grantsville')) return { ...BRANCHES['Grantsville'], name: 'Grantsville' };
  if (lowerText.includes('kitzmiller')) return { ...BRANCHES['Kitzmiller'], name: 'Kitzmiller' };

  return { ...DEFAULT_BRANCH, name: 'Oakland' };
}

async function scrapeRuthEnlowLibrary() {
  console.log(`\n📚 RUTH ENLOW LIBRARY OF GARRETT COUNTY SCRAPER`);
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
      const eventCards = document.querySelectorAll('.event-card, .lc-event, [class*="event-item"], article, .views-row');

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

          // Get date/time - LibraryMarket format varies
          const fullText = card.textContent;
          let eventDate = '';

          // Try lc-date-icon elements first (LibraryMarket date icon structure)
          const lcMonthEl = card.querySelector('.lc-date-icon__item--month');
          const lcDayEl = card.querySelector('.lc-date-icon__item--day');
          const lcYearEl = card.querySelector('.lc-date-icon__item--year');
          if (lcMonthEl && lcDayEl) {
            const month = lcMonthEl.textContent.trim();
            const day = lcDayEl.textContent.trim();
            const year = lcYearEl ? lcYearEl.textContent.trim() : new Date().getFullYear();
            eventDate = `${month} ${day}, ${year}`;
          }

          // Fallback: Match full date with time
          if (!eventDate) {
            const dateTimeMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm))/i);
            if (dateTimeMatch) {
              eventDate = dateTimeMatch[0];
            } else {
              // Try just date
              const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}/i) ||
                               fullText.match(/\w+\s+\d{1,2},?\s+\d{4}/i);
              if (dateMatch) eventDate = dateMatch[0];
            }
          }

          // Get branch/location
          let branch = '';
          const branchMatch = fullText.match(/(?:Library Branch|Location|Branch):\s*([^,\n]+)/i);
          if (branchMatch) {
            branch = branchMatch[1].trim();
          } else {
            // Look for branch names in text
            const branchNames = ['Oakland', 'Accident', 'Friendsville', 'Grantsville', 'Kitzmiller'];
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

      // Deduplicate by title + date (skip events without dates)
      const seen = new Set();
      return events.filter(e => {
        if (!e.eventDate) return false; // Skip events without dates
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

        // Normalize date format
        const normalizedDate = normalizeDateString(rawEvent.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${rawEvent.eventDate}"`);
          continue;
        }

        const eventDoc = {
          name: rawEvent.title,
          venue: branchInfo.name ? `${LIBRARY_NAME} - ${branchInfo.name}` : LIBRARY_NAME,
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
            name: branchInfo.name ? `${LIBRARY_NAME} - ${branchInfo.name}` : LIBRARY_NAME,
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
            source: 'Ruth Enlow Library Scraper',
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
        city: event.location?.city || 'Oakland',
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
  await logScraperResult('Ruth Enlow Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped };
}

async function scrapeRuthEnlowLibraryCloudFunction() {
  console.log(`☁️ Running ${LIBRARY_NAME} as Cloud Function`);
  const events = await scrapeRuthEnlowLibrary();

  if (events.length > 0) {
    const result = await saveToFirebase(events);
    return result;
  }

  // Log 0 events if scraping returned nothing
  await logScraperResult('Ruth Enlow Library', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: 0, skipped: 0 };
}

// Run if executed directly
if (require.main === module) {
  scrapeRuthEnlowLibrary()
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

module.exports = { scrapeRuthEnlowLibrary, scrapeRuthEnlowLibraryCloudFunction };

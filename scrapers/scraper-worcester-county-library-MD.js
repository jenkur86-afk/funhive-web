#!/usr/bin/env node

/**
 * WORCESTER COUNTY LIBRARY SCRAPER
 * Platform: LibCal
 * URL: https://worcesterlibrary.libcal.com/calendar/Library_Events
 * State: MD
 *
 * Branches:
 * - Snow Hill (307 N Washington St, Snow Hill, MD 21863)
 * - Berlin (13 Harrison Ave, Berlin, MD 21811)
 * - Ocean City (10003 Coastal Hwy, Ocean City, MD 21842)
 * - Ocean Pines (11107 Cathell Rd, Ocean Pines, MD 21811)
 * - Pocomoke (301 Market St, Pocomoke City, MD 21851)
 */

const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const LIBRARY_NAME = 'Worcester County Library';
const EVENTS_URL = 'https://worcesterlibrary.libcal.com/calendar/Library_Events';
const SCRAPER_NAME = 'worcester-county-library-MD';

// Branch addresses with coordinates
const BRANCHES = {
  'Snow Hill': { address: '307 N Washington St, Snow Hill, MD 21863', lat: 38.1768, lng: -75.3927, city: 'Snow Hill', zipCode: '21863' },
  'Snow Hill Branch': { address: '307 N Washington St, Snow Hill, MD 21863', lat: 38.1768, lng: -75.3927, city: 'Snow Hill', zipCode: '21863' },
  'Berlin': { address: '13 Harrison Ave, Berlin, MD 21811', lat: 38.3226, lng: -75.2177, city: 'Berlin', zipCode: '21811' },
  'Berlin Branch': { address: '13 Harrison Ave, Berlin, MD 21811', lat: 38.3226, lng: -75.2177, city: 'Berlin', zipCode: '21811' },
  'Ocean City': { address: '10003 Coastal Hwy, Ocean City, MD 21842', lat: 38.4011, lng: -75.0704, city: 'Ocean City', zipCode: '21842' },
  'Ocean City Branch': { address: '10003 Coastal Hwy, Ocean City, MD 21842', lat: 38.4011, lng: -75.0704, city: 'Ocean City', zipCode: '21842' },
  'Ocean Pines': { address: '11107 Cathell Rd, Ocean Pines, MD 21811', lat: 38.3932, lng: -75.1516, city: 'Ocean Pines', zipCode: '21811' },
  'Ocean Pines Branch': { address: '11107 Cathell Rd, Ocean Pines, MD 21811', lat: 38.3932, lng: -75.1516, city: 'Ocean Pines', zipCode: '21811' },
  'Pocomoke': { address: '301 Market St, Pocomoke City, MD 21851', lat: 38.0757, lng: -75.5679, city: 'Pocomoke City', zipCode: '21851' },
  'Pocomoke Branch': { address: '301 Market St, Pocomoke City, MD 21851', lat: 38.0757, lng: -75.5679, city: 'Pocomoke City', zipCode: '21851' }
};

// Default to main branch
const DEFAULT_BRANCH = BRANCHES['Snow Hill'];

function getBranchInfo(branchText) {
  if (!branchText) return { ...DEFAULT_BRANCH, name: 'Snow Hill' };

  const lowerText = branchText.toLowerCase();

  for (const [branchName, info] of Object.entries(BRANCHES)) {
    if (lowerText.includes(branchName.toLowerCase())) {
      return { ...info, name: branchName };
    }
  }

  // Check for partial matches
  if (lowerText.includes('snow')) return { ...BRANCHES['Snow Hill'], name: 'Snow Hill' };
  if (lowerText.includes('berlin')) return { ...BRANCHES['Berlin'], name: 'Berlin' };
  if (lowerText.includes('ocean city')) return { ...BRANCHES['Ocean City'], name: 'Ocean City' };
  if (lowerText.includes('ocean pines') || lowerText.includes('pines')) return { ...BRANCHES['Ocean Pines'], name: 'Ocean Pines' };
  if (lowerText.includes('pocomoke')) return { ...BRANCHES['Pocomoke'], name: 'Pocomoke' };

  return { ...DEFAULT_BRANCH, name: 'Snow Hill' };
}

async function scrapeWorcesterCountyLibrary() {
  console.log(`\n📚 WORCESTER COUNTY LIBRARY SCRAPER`);
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

    // Wait for LibCal events to load
    await page.waitForSelector('.s-lc-c-evt, .s-lc-eventcard, .s-lc-ea-e', { timeout: 15000 }).catch(() => null);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from LibCal page
    const rawEvents = await page.evaluate(() => {
      const events = [];

      // LibCal event selectors
      const eventSelectors = [
        '.s-lc-c-evt',           // List view events
        '.s-lc-eventcard',       // Card view events
        '.s-lc-ea-e',            // Older LibCal format
        '.s-lc-whw-row'          // Week/day view
      ];

      let foundElements = [];
      for (const selector of eventSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          foundElements = Array.from(elements);
          break;
        }
      }

      foundElements.forEach(card => {
        try {
          // Get title
          const titleEl = card.querySelector('.s-lc-c-evt-title, .s-lc-eventcard-title, .s-lc-ea-ttl, h2, h3');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Get URL
          const linkEl = card.querySelector('a[href]');
          const url = linkEl ? linkEl.href : '';

          // Get date - LibCal shows month/day in .s-lc-evt-date
          const monthEl = card.querySelector('.s-lc-evt-date-m');
          const dayEl = card.querySelector('.s-lc-evt-date-d');
          const dateEl = card.querySelector('.s-lc-ea-date, .event-date');

          let eventDate = '';
          if (monthEl && dayEl) {
            eventDate = `${monthEl.textContent.trim()} ${dayEl.textContent.trim()}`;
          } else if (dateEl) {
            eventDate = dateEl.textContent.trim();
          }

          // Get time from heading text or description
          const timeEl = card.querySelector('.s-lc-eventcard-heading-text, .s-lc-ea-time, .event-time');
          let eventTime = '';
          if (timeEl) {
            const timeText = timeEl.textContent.trim();
            const timeMatch = timeText.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i);
            if (timeMatch) eventTime = timeMatch[0];
          }

          // Get location/campus - LibCal uses campus field
          let branch = '';
          const locationEl = card.querySelector('.s-lc-ea-loc, [class*="campus"], [class*="location"]');
          if (locationEl) {
            branch = locationEl.textContent.trim();
          }

          // Also check the heading text for campus info (Worcester shows it there)
          const headingEl = card.querySelector('.s-lc-eventcard-heading-text');
          if (headingEl && !branch) {
            const headingText = headingEl.textContent;
            const branches = ['Berlin', 'Ocean City', 'Ocean Pines', 'Pocomoke', 'Snow Hill'];
            for (const b of branches) {
              if (headingText.includes(b)) {
                branch = b;
                break;
              }
            }
          }

          // Get description
          const descEl = card.querySelector('.s-lc-c-evt-des, .s-lc-eventcard-description, .s-lc-ea-desc');
          const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

          // Get image
          const imgEl = card.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';

          // Combine date and time
          const fullDate = eventTime ? `${eventDate} ${eventTime}` : eventDate;

          events.push({
            title,
            eventDate: fullDate,
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
            source: 'Worcester County Library Scraper',
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

  return { imported, skipped };
}

async function scrapeWorcesterCountyLibraryCloudFunction() {
  console.log(`☁️ Running ${LIBRARY_NAME} as Cloud Function`);
  const events = await scrapeWorcesterCountyLibrary();

  if (events.length > 0) {
    const result = await saveToFirebase(events);
    return result;
  }

  
  // Log scraper stats to Firestore
  await logScraperResult('worcester-county-library-MD', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  
  // Log scraper stats to Firestore
  await logScraperResult('worcester-county-library-MD', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: 0, skipped: 0 };
}

// Run if executed directly
if (require.main === module) {
  scrapeWorcesterCountyLibrary()
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

module.exports = { scrapeWorcesterCountyLibrary, scrapeWorcesterCountyLibraryCloudFunction };

#!/usr/bin/env node

/**
 * KENT COUNTY PUBLIC LIBRARY SCRAPER
 * Platform: LibCal
 * URL: https://kent-md.libcal.com/calendar
 * State: MD
 *
 * Branches:
 * - Chestertown (408 High St, Chestertown, MD 21620)
 * - North County (201 Scheeler Rd, Millington, MD 21651)
 * - Rock Hall (5585 Main St, Rock Hall, MD 21661)
 */

const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const LIBRARY_NAME = 'Kent County Public Library';
const EVENTS_URL = 'https://kent-md.libcal.com/calendar?cid=-1&t=d';
const SCRAPER_NAME = 'kent-county-library-MD';

// Branch addresses with coordinates
const BRANCHES = {
  'Chestertown': { address: '408 High St, Chestertown, MD 21620', lat: 39.2090, lng: -76.0671, city: 'Chestertown', zipCode: '21620' },
  'Chestertown Branch': { address: '408 High St, Chestertown, MD 21620', lat: 39.2090, lng: -76.0671, city: 'Chestertown', zipCode: '21620' },
  'North County': { address: '201 Scheeler Rd, Millington, MD 21651', lat: 39.2573, lng: -75.8355, city: 'Millington', zipCode: '21651' },
  'North County Branch': { address: '201 Scheeler Rd, Millington, MD 21651', lat: 39.2573, lng: -75.8355, city: 'Millington', zipCode: '21651' },
  'Rock Hall': { address: '5585 Main St, Rock Hall, MD 21661', lat: 39.1378, lng: -76.2343, city: 'Rock Hall', zipCode: '21661' },
  'Rock Hall Branch': { address: '5585 Main St, Rock Hall, MD 21661', lat: 39.1378, lng: -76.2343, city: 'Rock Hall', zipCode: '21661' },
  'Outreach': { address: '408 High St, Chestertown, MD 21620', lat: 39.2090, lng: -76.0671, city: 'Chestertown', zipCode: '21620' },
  'Outreach/Off-site': { address: '408 High St, Chestertown, MD 21620', lat: 39.2090, lng: -76.0671, city: 'Chestertown', zipCode: '21620' }
};

// Default to main branch
const DEFAULT_BRANCH = BRANCHES['Chestertown'];

function getBranchInfo(branchText) {
  if (!branchText) return { ...DEFAULT_BRANCH, name: 'Chestertown' };

  const lowerText = branchText.toLowerCase();

  for (const [branchName, info] of Object.entries(BRANCHES)) {
    if (lowerText.includes(branchName.toLowerCase())) {
      return { ...info, name: branchName };
    }
  }

  // Check for partial matches
  if (lowerText.includes('chester')) return { ...BRANCHES['Chestertown'], name: 'Chestertown' };
  if (lowerText.includes('north')) return { ...BRANCHES['North County'], name: 'North County' };
  if (lowerText.includes('rock')) return { ...BRANCHES['Rock Hall'], name: 'Rock Hall' };
  if (lowerText.includes('outreach') || lowerText.includes('off-site')) return { ...BRANCHES['Outreach'], name: 'Outreach' };

  return { ...DEFAULT_BRANCH, name: 'Chestertown' };
}

async function scrapeKentCountyLibrary() {
  console.log(`\n📚 KENT COUNTY PUBLIC LIBRARY SCRAPER`);
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

          // Get date - try multiple LibCal date formats
          let eventDate = '';

          // Method 1: Date badge elements (newer LibCal)
          const monthEl = card.querySelector('.s-lc-evt-date-m, .lc-date-icon__item--month');
          const dayEl = card.querySelector('.s-lc-evt-date-d, .lc-date-icon__item--day');
          const yearEl = card.querySelector('.lc-date-icon__item--year');
          if (monthEl && dayEl) {
            const yearText = yearEl ? yearEl.textContent.trim() : new Date().getFullYear();
            eventDate = `${monthEl.textContent.trim()} ${dayEl.textContent.trim()}, ${yearText}`;
          }

          // Method 2: dl.dl-horizontal (common LibCal format)
          if (!eventDate) {
            const dlEl = card.querySelector('dl.dl-horizontal');
            if (dlEl) {
              const dlText = dlEl.textContent || '';
              const fromMatch = dlText.match(/From:\s*(.*?)(?:To:|$)/s);
              if (fromMatch) {
                eventDate = fromMatch[1].trim();
              } else {
                const dateMatch = dlText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4})/i);
                if (dateMatch) eventDate = dateMatch[1];
              }
            }
          }

          // Method 3: Generic date elements
          if (!eventDate) {
            const dateEl = card.querySelector('.s-lc-ea-date, .event-date');
            if (dateEl) eventDate = dateEl.textContent.trim();
          }

          // Method 4: Regex fallback on card text
          if (!eventDate) {
            const cardText = card.textContent || '';
            const dateMatch = cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4})/i);
            if (dateMatch) eventDate = dateMatch[1];
          }

          // Get time
          const timeEl = card.querySelector('.s-lc-eventcard-heading-text, .s-lc-ea-time, .event-time, dl.dl-horizontal dd');
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

          // Also check in definition list for Location
          const dlElements = card.querySelectorAll('dl dd');
          dlElements.forEach(dd => {
            const dt = dd.previousElementSibling;
            if (dt && dt.textContent.toLowerCase().includes('location')) {
              branch = dd.textContent.trim();
            }
          });

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
            source: 'Kent County Library Scraper',
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

async function saveToDatabase(events) {
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

async function scrapeKentCountyLibraryCloudFunction() {
  console.log(`☁️ Running ${LIBRARY_NAME} as Cloud Function`);
  const events = await scrapeKentCountyLibrary();

  if (events.length > 0) {
    const result = await saveToDatabase(events);

    // Log scraper stats to database
    await logScraperResult('Kent County Library MD', {
      found: events.length,
      new: result.imported,
      duplicates: result.skipped
    }, { dataType: 'events' });

    return result;
  }

  // Log scraper stats to database (no events found)
  await logScraperResult('Kent County Library MD', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: 0, skipped: 0 };
}

// Run if executed directly
if (require.main === module) {
  scrapeKentCountyLibrary()
    .then(events => {
      if (events.length > 0) {
        return saveToDatabase(events);
      }
      return { imported: 0, skipped: 0 };
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeKentCountyLibrary, scrapeKentCountyLibraryCloudFunction };

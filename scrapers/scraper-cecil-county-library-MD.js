/**
 * CECIL COUNTY PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Cecil County Public Library
 * Uses custom Drupal-based event management system
 *
 * COVERAGE:
 * - Cecil County, MD (103,000+ population)
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { geocodeWithFallback } = require('./helpers/geocoding-helper');
const { detectLibraryBranch } = require('./helpers/library-branch-detector');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');
const { logScraperResult } = require('./scraper-logger');

// Library configuration
const LIBRARY = {
  name: 'Cecil County Public Library',
  url: 'https://www.cecilcountylibrary.org/events',
  county: 'Cecil',
  state: 'MD',
  website: 'https://www.cecilcountylibrary.org',
  city: 'Elkton',
  zipCode: '21921'
};

// Parse "1:00pm–2:00pm" → { startTime, endTime }
function parseTimeRange(timeStr) {
  if (!timeStr) return { startTime: null, endTime: null };
  const fmt = (h, m, ap) => {
    h = parseInt(h);
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap.toUpperCase()}`;
  };
  const rm = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rm) {
    const sap = rm[3] || (parseInt(rm[1]) >= 7 && parseInt(rm[1]) < 12 ? 'AM' : 'PM');
    return { startTime: fmt(rm[1], rm[2], sap), endTime: fmt(rm[4], rm[5], rm[6]) };
  }
  const sm = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (sm) return { startTime: fmt(sm[1], sm[2], sm[3]), endTime: null };
  return { startTime: null, endTime: null };
}

// Parse age range from age group text
function parseAgeRange(eventText) {
  if (!eventText) return 'All Ages';

  const lowerText = eventText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/18\+/) || lowerText.match(/adults? only/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages|everyone/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Cecil County
async function scrapeCecilEvents() {
  console.log(`\n📚 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Navigate to events page
    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Cecil uses heading tags for event titles
      const headings = document.querySelectorAll('h1, h2, h3, h4');

      headings.forEach(heading => {
        try {
          // Look for event links
          const link = heading.querySelector('a[href*="event"]') || heading.querySelector('a');
          if (!link) return;

          const title = link.textContent.trim();
          if (!title || title.length < 3) return;

          const url = link.href || '';

          // Get parent container with event details
          let eventContainer = heading.parentElement;
          let attempts = 0;
          while (eventContainer && attempts < 5) {
            const text = eventContainer.textContent;
            if (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/)) break;
            eventContainer = eventContainer.parentElement;
            attempts++;
          }

          if (!eventContainer || eventContainer.tagName === 'BODY') return;

          // Get all text content
          const fullText = eventContainer.textContent;

          // Extract date and time - Cecil format: "Nov 10 2025 Mon 1:00pm–2:00pm"
          let eventDate = '';
          let time = '';

          const dateTimeMatch = fullText.match(/(\w{3}\s+\d{1,2}\s+\d{4}\s+\w{3})\s+(\d{1,2}:\d{2}(?:am|pm)(?:–|-)\d{1,2}:\d{2}(?:am|pm))/i);
          if (dateTimeMatch) {
            eventDate = dateTimeMatch[1];
            time = dateTimeMatch[2];
          } else {
            // Try to extract just the date
            const dateMatch = fullText.match(/\w{3}\s+\d{1,2}\s+\d{4}\s+\w{3}/i);
            if (dateMatch) eventDate = dateMatch[0];

            // Try to extract time separately
            const timeMatch = fullText.match(/\d{1,2}:\d{2}(?:am|pm)(?:–|-)\d{1,2}:\d{2}(?:am|pm)/i) ||
                             fullText.match(/\d{1,2}:\d{2}(?:am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const locationMatch = fullText.match(/(?:Location|Branch|Library):\s*([^\n]+)/i) ||
                               fullText.match(/(Elkton|North East|Perryville|Rising Sun|Chesapeake City)\s+Branch/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract age group
          let ageGroup = '';
          const ageMatch = fullText.match(/(?:Age Group|Ages?):\s*([^\n]+)/i);
          if (ageMatch) {
            ageGroup = ageMatch[1].trim();
          }

          // Extract program type
          let programType = '';
          const programMatch = fullText.match(/(?:Program Type):\s*([^\n]+)/i);
          if (programMatch) {
            programType = programMatch[1].trim();
          }

          // Extract description
          let description = '';
          const paragraphs = eventContainer.querySelectorAll('p');
          if (paragraphs.length > 0) {
            let longest = '';
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text.length > longest.length && !text.includes('Age Group') && !text.includes('Program Type')) {
                longest = text;
              }
            });
            description = longest;
          }

          if (title && eventDate) {
            results.push({
              name: title,
              eventDate: time ? `${eventDate} ${time}` : eventDate,
              time,
              venue: location,
              description: description || fullText.substring(0, 200),
              url,
              ageGroup,
              programType
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events\n`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(`${event.name} ${event.description} ${event.ageGroup}`);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Resolve branch address via library-branch-detector
        const branchInfo = detectLibraryBranch({
          venue: event.venue || LIBRARY.name,
          eventName: event.name,
          description: event.description,
          state: LIBRARY.state
        });

        let venueName = event.venue || LIBRARY.name;
        let venueAddress = '';
        let venueCity = LIBRARY.city;
        let venueZip = LIBRARY.zipCode;

        if (branchInfo) {
          venueName = branchInfo.branchName;
          venueAddress = branchInfo.address;
          venueCity = branchInfo.city;
          venueZip = branchInfo.zipCode;
        }

        // Geocode via rate-limited helper (3.5s min delay, Photon fallback, cache)
        const geocodeAddr = venueAddress
          ? `${venueAddress}, ${venueCity}, ${LIBRARY.state}`
          : `${LIBRARY.name}, ${LIBRARY.city}, ${LIBRARY.state}`;

        const coordinates = await geocodeWithFallback(geocodeAddr, {
          city: venueCity,
          zipCode: venueZip,
          state: LIBRARY.state,
          county: LIBRARY.county,
          venueName,
          sourceName: LIBRARY.name
        });

        const { startTime, endTime } = parseTimeRange(event.time);

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: venueName,
          eventDate: normalizedDate,
          startTime,
          endTime,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.programType || '',
          state: LIBRARY.state,
          location: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: LIBRARY.state,
            zipCode: venueZip,
            coordinates: coordinates || null
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Cecil County Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: LIBRARY.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange
          }
        };

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
          imported++;
        } else {
          skipped++;
        }

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CECIL COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to database
  await logScraperResult('Cecil County Public Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped,
    errors: failed
  }, { dataType: 'events', state: 'MD' });

  return { imported, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeCecilEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCecilEvents };

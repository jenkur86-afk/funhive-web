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
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
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
            if (text.includes('Nov') || text.includes('Dec') || text.includes('Jan') || text.includes('2025')) {
              break;
            }
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
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description || fullText.substring(0, 200),
              url: url,
              ageGroup: ageGroup,
              programType: programType
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

        // Try to geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: event.description.substring(0, 1000),
          moreInfo: event.programType || '',
          state: LIBRARY.state,
          location: {
            name: event.venue || LIBRARY.name,
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
            source: 'Cecil County Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: LIBRARY.state,
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

  // Log scraper stats to Firestore
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

/**
 * WICOMICO PUBLIC LIBRARIES SCRAPER
 *
 * Scrapes events from Wicomico County Public Library
 * Uses custom Drupal-based event management system
 *
 * COVERAGE:
 * - Wicomico County, MD (103,000+ population)
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
// NOTE: If returning 0 events, the site may have changed its DOM structure.
// Check https://www.wicomicolibrary.org/events manually to verify.
const LIBRARY = {
  name: 'Wicomico Public Libraries',
  url: 'https://www.wicomicolibrary.org/events/upcoming',
  county: 'Wicomico',
  state: 'MD',
  website: 'https://www.wicomicolibrary.org',
  city: 'Salisbury',
  zipCode: '21801'
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
function parseAgeRange(ageGroupText) {
  if (!ageGroupText) return 'All Ages';

  const lowerText = ageGroupText.toLowerCase();

  // Check for adult-only indicators (18+)
  if (lowerText.match(/18\+/) || lowerText.match(/adults? only/i)) {
    return 'Adults';
  }

  // Age-specific ranges based on Wicomico's age groups
  if (lowerText.match(/0-5|babies?|infants?|toddlers?|preschool/i)) return 'Preschool (3-5)';
  if (lowerText.match(/6-11|children|kids|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/12-18|teens?|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/everyone|all ages|family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Wicomico
async function scrapeWicomicoEvents() {
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

      // Wicomico uses lc-event / event-card classes (LibraryCalendar platform)
      const eventCards = document.querySelectorAll('article.event-card, .lc-event--upcoming > article');

      eventCards.forEach(card => {
        try {
          // Extract title
          const titleEl = card.querySelector('.lc-event__title a, .lc-event__link, h3 a, h2 a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const url = titleEl.href || '';

          // Extract date from lc-date-icon elements (month/day/year spans)
          let eventDate = '';
          const monthEl = card.querySelector('.lc-date-icon__item--month');
          const dayEl = card.querySelector('.lc-date-icon__item--day');
          const yearEl = card.closest('.lc-event--upcoming') ?
            card.closest('.lc-event--upcoming').querySelector('.lc-event__month-summary') : null;

          if (monthEl && dayEl) {
            const month = monthEl.textContent.trim();
            const day = dayEl.textContent.trim();
            // Extract year from month-summary or use current year
            let year = new Date().getFullYear();
            if (yearEl) {
              const yearMatch = yearEl.textContent.match(/\d{4}/);
              if (yearMatch) year = yearMatch[0];
            }
            eventDate = month + ' ' + day + ', ' + year;
          }

          // Fallback: try regex on full text
          if (!eventDate) {
            const fullText = card.textContent;
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time
          let time = '';
          const timeEl = card.querySelector('.lc-event-info-item--time, [class*="time"]');
          if (timeEl) {
            time = timeEl.textContent.trim();
          } else {
            const fullText = card.textContent;
            const timeMatch = fullText.match(/\d{1,2}:\d{2}(?:am|pm)(?:[–-]\d{1,2}:\d{2}(?:am|pm))?/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const branchEl = card.querySelector('.lc-event__branch, [class*="branch"]');
          if (branchEl) {
            location = branchEl.textContent.replace(/Library Branch:\s*/i, '').trim();
          }

          // Extract age group
          let ageGroup = '';
          const ageEl = card.querySelector('.lc-event__age-groups, [class*="age"]');
          if (ageEl) {
            ageGroup = ageEl.textContent.trim();
          }

          // Extract program type / categories
          let programType = '';
          const catEl = card.querySelector('[class*="categories"], [class*="category"]');
          if (catEl) {
            programType = catEl.textContent.trim();
          }

          // Extract description
          let description = '';
          const descEl = card.querySelector('.lc-event__body, .lc-event-subtitle, p');
          if (descEl) {
            description = descEl.textContent.trim();
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
        const ageRange = parseAgeRange(event.ageGroup);

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

        // Default coordinates for Wicomico County Library (Salisbury, MD)
        if (!coordinates) {
          coordinates = { latitude: 38.3607, longitude: -75.5994 };
        }

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || LIBRARY.name,
          state: LIBRARY.state, // CRITICAL: Add state field
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: event.description.substring(0, 1000),
          moreInfo: event.programType || '',
          geohash: ngeohash.encode(coordinates.latitude, coordinates.longitude, 7), // Always add geohash
          location: {
            name: event.venue || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Wicomico Scraper',
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
  console.log('✅ WICOMICO SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeWicomicoEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWicomicoEvents };

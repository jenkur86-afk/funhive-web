#!/usr/bin/env node

/**
 * CUSTOM DRUPAL LIBRARIES SCRAPER
 *
 * Scrapes events from Maryland libraries using custom Drupal event systems
 *
 * COVERAGE (2 library systems):
 *
 * MD:
 * - Cecil County Public Library
 * - Wicomico Public Libraries
 *
 * Usage:
 *   node scripts/Scraper-event-custom-drupal-libraries.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using Custom Drupal
const LIBRARY_SYSTEMS = [
  {
    name: 'Cecil County Public Library',
    url: 'https://www.cecilcountylibrary.org/events/upcoming',
    county: 'Cecil',
    state: 'MD',
    website: 'https://www.cecilcountylibrary.org',
    city: 'North East',
    zipCode: '21901'
  },
  {
    name: 'Wicomico Public Libraries',
    url: 'https://www.wicomicolibrary.org/events/upcoming',
    county: 'Wicomico',
    state: 'MD',
    website: 'https://www.wicomicolibrary.org',
    city: 'Salisbury',
    zipCode: '21801'
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

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Custom Drupal library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors - different Drupal sites use different structures
      // Cecil County uses .lc-event with date parts in separate spans
      // Wicomico uses article or views-row structure
      const eventElements = document.querySelectorAll('article.event-card, .lc-event, article, .views-row');

      eventElements.forEach(el => {
        try {
          // Look for event title - Cecil County uses .lc-event__title h3
          const titleEl = el.querySelector('.lc-event__title, h2, h3, h4, .event-title, a[href*="/event/"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title) return;

          // Extract URL
          const linkEl = el.querySelector('a[href*="/event/"]');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date - Try Cecil County format first (separate span elements)
          let eventDate = '';
          const monthEl = el.querySelector('.lc-date-icon__item--month, [class*="month"]');
          const dayEl = el.querySelector('.lc-date-icon__item--day, [class*="day"]:not([class*="day-name"])');
          const yearEl = el.querySelector('.lc-date-icon__item--year, [class*="year"]');

          if (monthEl && dayEl && yearEl) {
            const month = monthEl.textContent.trim();
            const day = dayEl.textContent.trim();
            const year = yearEl.textContent.trim();
            eventDate = `${month} ${day} ${year}`;
          } else {
            // Fall back to regex patterns for other Drupal sites
            let dateMatch = fullText.match(/\w{3}\s+\d{1,2}\s+\d{4}\s+\w{3}/i) || // "Nov 10 2025 Mon"
                           fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                           fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time - Cecil County uses .lc-event-info-item--time
          let time = '';
          const timeEl = el.querySelector('.lc-event-info-item--time, [class*="time"]');
          if (timeEl) {
            time = timeEl.textContent.trim();
          } else {
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                             fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const locationMatch = fullText.match(/(?:Library Branch|Location|Branch):\s*([^\n]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract audience/age group - Cecil County may have color-coded indicators
          let audience = '';
          const ageEl = el.querySelector('[class*="color-indicator"]');
          if (ageEl) {
            const ageClass = ageEl.className;
            if (ageClass.includes('adults')) audience = 'Adults';
            else if (ageClass.includes('teens')) audience = 'Teens';
            else if (ageClass.includes('children')) audience = 'Children';
            else if (ageClass.includes('family') || ageClass.includes('all-ages')) audience = 'All Ages';
          }
          if (!audience) {
            const audienceMatch = fullText.match(/(?:Audience|Age Group):\s*([^\n]+)/i);
            if (audienceMatch) {
              audience = audienceMatch[1].trim();
            }
          }

          // Extract program type
          let programType = '';
          const programMatch = fullText.match(/(?:Program Type):\s*([^\n]+)/i);
          if (programMatch) {
            programType = programMatch[1].trim();
          }

          // Extract description
          let description = '';
          const descMatch = fullText.match(/(?:Event Details|Description):\s*([^\n]+)/i);
          if (descMatch) {
            description = descMatch[1].trim();
          } else {
            const descEl = el.querySelector('p');
            description = descEl ? descEl.textContent.trim() : '';
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              audience: audience,
              programType: programType
            });
          }
        } catch (err) {
          // Skip errors silently
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description || event.programType
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.programType || '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Custom Drupal Library Scraper',
            sourceName: library.name,
            county: library.county,
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

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeCustomDrupalLibraries() {
  console.log('\n📚 CUSTOM DRUPAL MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 2 libraries in MD\n');

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
  console.log('✅ CUSTOM DRUPAL SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');
}

// Cloud Function wrapper
async function scrapeCustomDrupalLibrariesCloudFunction() {
  console.log('\n📚 Custom Drupal Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

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
  console.log('✅ CUSTOM DRUPAL SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Custom Drupal MD Libraries', {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { dataType: 'events' });

  return {
    imported: totalImported,
    skipped: totalSkipped,
    failed: totalFailed,
    message: 'Custom Drupal libraries scraper completed'
  };
}

// Run if executed directly
if (require.main === module) {
  scrapeCustomDrupalLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCustomDrupalLibraries, scrapeCustomDrupalLibrariesCloudFunction };

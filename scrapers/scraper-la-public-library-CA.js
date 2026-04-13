#!/usr/bin/env node

/**
 * LOS ANGELES PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Los Angeles Public Library's custom Drupal-based calendar
 * This is the largest public library system in California
 *
 * COVERAGE:
 * CA:
 * - Los Angeles Public Library (3.9M people)
 * - 73 library locations throughout Los Angeles
 *
 * Platform: Custom Drupal 7 CMS
 * URL: https://www.lapl.org/events
 *
 * Usage:
 *   node functions/scrapers/scraper-la-public-library-CA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// LA Public Library System
const LIBRARY = {
  name: 'Los Angeles Public Library',
  baseUrl: 'https://www.lapl.org',
  eventsUrl: 'https://www.lapl.org/events',
  county: 'Los Angeles',
  state: 'CA',
  website: 'https://www.lapl.org',
  city: 'Los Angeles',
  zipCode: '90071'
};

// Map LAPL audience tags to our age ranges
const AUDIENCE_MAP = {
  'babies and toddlers': 'Babies & Toddlers (0-2)',
  'babies': 'Babies & Toddlers (0-2)',
  'toddlers': 'Babies & Toddlers (0-2)',
  'preschool': 'Preschool (3-5)',
  'kids': 'Children (6-12)',
  'children': 'Children (6-12)',
  'tweens': 'Children (6-12)',
  'teens': 'Teens (13-17)',
  'young adults': 'Teens (13-17)',
  'families': 'All Ages',
  'all ages': 'All Ages',
  'adults': 'Adults',
  'seniors': 'Adults'
};

// Geocode address using OpenStreetMap Nominatim
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
        'User-Agent': 'SocialSpot/1.0'
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

// Map LAPL audience to our age range format
function mapAudience(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check each audience mapping
  for (const [key, value] of Object.entries(AUDIENCE_MAP)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }

  return 'All Ages';
}

// Extract event details from event page
async function scrapeEventDetails(page, eventUrl) {
  try {
    await page.goto(`${LIBRARY.baseUrl}${eventUrl}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 5000 });

    // Extract event data from the page
    const eventData = await page.evaluate(() => {
      const data = {
        title: '',
        schedule: '',
        location: '',
        address: '',
        audience: [],
        category: '',
        description: '',
        tags: []
      };

      // Extract title - LAPL uses plain h1 within main content
      // Try multiple approaches to find title
      const allH1s = document.querySelectorAll('h1');
      for (const h1 of allH1s) {
        const text = h1.textContent.trim();
        // Skip if it's just the library name or navigation
        if (text &&
            text !== 'Los Angeles Public Library' &&
            !text.includes('Navigation') &&
            text.length > 3 &&
            text.length < 200) {
          data.title = text;
          break;
        }
      }

      // Fallback: try document.title
      if (!data.title) {
        const docTitle = document.title;
        if (docTitle && docTitle.includes('|')) {
          data.title = docTitle.split('|')[0].trim();
        }
      }

      // Extract schedule/date info
      const scheduleSelectors = [
        '.field--name-field-event-date',
        '.date-display-single',
        '.date-display-range'
      ];
      for (const selector of scheduleSelectors) {
        const scheduleEl = document.querySelector(selector);
        if (scheduleEl) {
          data.schedule = scheduleEl.textContent.trim();
          break;
        }
      }

      // Extract location/branch
      const locationSelectors = [
        '.field--name-field-event-location a',
        '.field--name-field-location a',
        'a[href*="/locations/"]'
      ];
      for (const selector of locationSelectors) {
        const locationEl = document.querySelector(selector);
        if (locationEl) {
          data.location = locationEl.textContent.trim();
          break;
        }
      }

      // Extract address
      const addressSelectors = [
        '.field--name-field-address',
        '.street-block',
        '.location-address'
      ];
      for (const selector of addressSelectors) {
        const addressEl = document.querySelector(selector);
        if (addressEl) {
          data.address = addressEl.textContent.trim();
          break;
        }
      }

      // Extract audience
      const audienceElements = document.querySelectorAll('.field--name-field-event-audience .field__item, a[href*="field_event_audience_tid"]');
      audienceElements.forEach(el => {
        const text = el.textContent.trim();
        if (text) data.audience.push(text);
      });

      // Extract category
      const categorySelectors = [
        '.field--name-field-event-categories .field__item',
        'a[href*="field_event_categories_tid"]'
      ];
      for (const selector of categorySelectors) {
        const categoryEl = document.querySelector(selector);
        if (categoryEl) {
          data.category = categoryEl.textContent.trim();
          break;
        }
      }

      // Extract description
      const descSelectors = [
        '.field--name-body .field__item',
        '.field--name-field-description .field__item',
        'article p'
      ];
      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector);
        if (descEl) {
          data.description = descEl.textContent.trim();
          break;
        }
      }

      // Extract tags/series
      const tagElements = document.querySelectorAll('.field--name-field-tags .field__item, .field--name-field-series .field__item');
      tagElements.forEach(el => {
        const text = el.textContent.trim();
        if (text) data.tags.push(text);
      });

      return data;
    });

    return eventData;

  } catch (error) {
    console.error(`Error scraping event details from ${eventUrl}:`, error.message);
    return null;
  }
}

// Scrape events from LA Public Library
async function scrapeLAPublicLibrary() {
  console.log(`\n📚 LOS ANGELES PUBLIC LIBRARY SCRAPER`);
  console.log('='.repeat(60));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, CA)`);
  console.log(`   URL: ${LIBRARY.eventsUrl}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Load the events page
    console.log('   Loading events calendar...\n');
    await page.goto(LIBRARY.eventsUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Extra wait for dynamic content

    // Extract all event links from the page
    const eventLinks = await page.evaluate(() => {
      const links = new Set();

      // Find all event links
      const eventSelectors = [
        'a[href*="/whats-on/events/"]',
        'a[href*="/events/"]'
      ];

      for (const selector of eventSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const href = el.getAttribute('href');
          if (href && href.includes('/whats-on/events/')) {
            // Get just the path, not full URL
            links.add(href.startsWith('http') ? new URL(href).pathname : href);
          }
        });
      }

      return Array.from(links);
    });

    console.log(`   Found ${eventLinks.length} event links\n`);

    // Process each event
    for (const eventPath of eventLinks) {
      try {
        // Scrape event details
        const eventData = await scrapeEventDetails(page, eventPath);

        if (!eventData || !eventData.title) {
          console.log(`  ⚠️  Skipping event with no title: ${eventPath}`);
          totalSkipped++;
          continue;
        }

        // Map audience to age range
        const audienceText = eventData.audience.join(', ');
        const ageRange = mapAudience(audienceText);

        // Skip adult-only events
        if (ageRange === 'Adults' && !audienceText.toLowerCase().includes('famil')) {
          totalSkipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: eventData.title,
          description: eventData.description
        });

        // Geocode location
        let coordinates = null;
        if (eventData.address) {
          const fullAddress = `${eventData.address}, Los Angeles, CA`;
          coordinates = await geocodeAddress(fullAddress);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        } else if (eventData.location && eventData.location !== LIBRARY.name) {
          const fullAddress = `${eventData.location}, Los Angeles, CA`;
          coordinates = await geocodeAddress(fullAddress);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }
        // Fallback to LAPL Central Library coordinates if geocoding failed
        if (!coordinates) {
          coordinates = { latitude: 34.0500, longitude: -118.2551 };
        }

        // Parse date to get Date object for Timestamp
        const dateObj = parseDateToObject(eventData.schedule);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Normalize date format
        const normalizedDate = normalizeDateString(eventData.schedule);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventData.schedule}"`);
          totalSkipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: eventData.title.trim(),
          venue: eventData.location || LIBRARY.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: eventData.schedule,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: (eventData.description || '').substring(0, 1000),
          moreInfo: eventData.tags.join(', '),
          state: LIBRARY.state,
          location: {
            name: eventData.location || LIBRARY.name,
            address: eventData.address,
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: `${LIBRARY.baseUrl}${eventPath}`,
            phone: ''
          },
          url: `${LIBRARY.baseUrl}${eventPath}`,
          metadata: {
            source: 'LA Public Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: LIBRARY.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp(),
            category: eventData.category,
            audience: audienceText
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Always add geohash since we always have coordinates (with fallback)
        eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);

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
          console.log(`  ✅ ${eventData.title.substring(0, 60)}${eventData.title.length > 60 ? '...' : ''}`);
          totalImported++;
        } else {
          totalSkipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`  ❌ Error processing event ${eventPath}:`, error.message);
        totalFailed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`\n❌ Error scraping LA Public Library:`, error.message);
    throw error;
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ LA PUBLIC LIBRARY SCRAPER COMPLETE!`);
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('LA Public Library', {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { dataType: 'events' });

  return { totalImported, totalSkipped, totalFailed };
}

// Run scraper if called directly
if (require.main === module) {
  scrapeLAPublicLibrary()
    .then(() => {
      console.log('Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLAPublicLibrary };

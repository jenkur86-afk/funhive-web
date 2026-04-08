#!/usr/bin/env node

/**
 * DES MOINES PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Des Moines Public Library's Drupal 10 calendar
 * This is the largest public library system in Iowa
 *
 * COVERAGE:
 * IA:
 * - Des Moines Public Library (700K people)
 * - 6 library locations throughout Des Moines metro
 *
 * Platform: Drupal 10 with custom library_calendar module
 * URL: https://www.dmpl.org/events/month
 *
 * Usage:
 *   node functions/scrapers/scraper-des-moines-library-IA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Des Moines Public Library System
const LIBRARY = {
  name: 'Des Moines Public Library',
  baseUrl: 'https://www.dmpl.org',
  // Use 'upcoming' view instead of 'month' - month view requires AJAX clicks
  eventsUrl: 'https://www.dmpl.org/events/upcoming',
  county: 'Polk',
  state: 'IA',
  website: 'https://www.dmpl.org',
  city: 'Des Moines',
  zipCode: '50309'
};

// Map DMPL audience classes to our age ranges
const AUDIENCE_MAP = {
  'birth-preschool': 'Babies & Toddlers (0-2)',
  'preschool': 'Preschool (3-5)',
  'children': 'Children (6-12)',
  'teens': 'Teens (13-17)',
  'adults': 'Adults',
  'all-ages': 'All Ages',
  'families': 'All Ages'
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

// Map DMPL audience to our age range format
function mapAudience(audienceClasses, audienceText) {
  // Check CSS classes first (most reliable)
  for (const [key, value] of Object.entries(AUDIENCE_MAP)) {
    if (audienceClasses.includes(key)) {
      return value;
    }
  }

  // Fall back to text matching
  if (audienceText) {
    const lowerText = audienceText.toLowerCase();
    for (const [key, value] of Object.entries(AUDIENCE_MAP)) {
      if (lowerText.includes(key.replace('-', ' '))) {
        return value;
      }
    }
  }

  return 'All Ages';
}

// Extract event details from event page
async function scrapeEventDetails(page, eventPath) {
  try {
    // Build full URL - handle both absolute and relative paths
    const fullUrl = eventPath.startsWith('http') ? eventPath : `${LIBRARY.baseUrl}${eventPath}`;

    // OPTIMIZED: Faster page load with longer timeout for slow server
    await page.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000  // Increased from 15s to 30s
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract event data from the page
    const eventData = await page.evaluate(() => {
      const data = {
        title: '',
        dateTime: '',
        location: '',
        address: '',
        phone: '',
        description: '',
        audienceText: ''
      };

      // Extract title
      const titleEl = document.querySelector('h1.page-title, h1');
      if (titleEl) {
        data.title = titleEl.textContent.trim();
      }

      // Extract date/time
      const dateEl = document.querySelector('.lc-event-date-time, .lc-event__date, .date-display-single, .date-display-range');
      if (dateEl) {
        data.dateTime = dateEl.textContent.trim();
      }

      // Extract location details
      const locationNameEl = document.querySelector('.lc-event-location-address .lc-font-weight-bold, .lc-event-location__name');
      if (locationNameEl) {
        data.location = locationNameEl.textContent.trim();
      }

      // Extract address (multiple lines)
      const addressLines = [];
      const addressEl1 = document.querySelector('.lc-address-line--first');
      const addressEl2 = document.querySelector('.lc-address-line--second');

      if (addressEl1) addressLines.push(addressEl1.textContent.trim());
      if (addressEl2) addressLines.push(addressEl2.textContent.trim());

      if (addressLines.length > 0) {
        data.address = addressLines.join(', ');
      }

      // Extract phone
      const phoneEl = document.querySelector('.lc-event-location__phone a, a[href^="tel:"]');
      if (phoneEl) {
        data.phone = phoneEl.textContent.trim();
      }

      // Extract description
      const descSelectors = [
        '.lc-event-description',
        '.field--name-body',
        '.field--name-field-description',
        'article .content p'
      ];
      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector);
        if (descEl) {
          data.description = descEl.textContent.trim();
          break;
        }
      }

      // Extract audience text
      const audienceEl = document.querySelector('.lc-event-info__item--colors, .lc-event-audience');
      if (audienceEl) {
        data.audienceText = audienceEl.textContent.trim();
      }

      return data;
    });

    return eventData;

  } catch (error) {
    console.error(`Error scraping event details from ${eventPath}:`, error.message);
    return null;
  }
}

// Scrape events from Des Moines Public Library
async function scrapeDesMoinesLibrary() {
  console.log(`\n📚 DES MOINES PUBLIC LIBRARY SCRAPER`);
  console.log('='.repeat(60));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, IA)`)
;
  console.log(`   URL: ${LIBRARY.eventsUrl}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Load the events list page (upcoming view)
    console.log('   Loading events list...\n');

    await page.goto(LIBRARY.eventsUrl, {
      waitUntil: 'networkidle2',  // Wait for AJAX to complete
      timeout: 45000  // Increased timeout for slow server
    });

    // Wait for event cards to appear
    try {
      await page.waitForSelector('.lc-event, article.event-card, .lc-event__title', { timeout: 15000 });
    } catch (e) {
      console.log('   ⚠️ Event cards not found, trying alternative selectors...');
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // Allow page to settle

    // Extract all event links and audience classes from the list view
    const events = await page.evaluate(() => {
      const results = [];

      // Find all event containers - try multiple selectors for list view
      const eventCards = document.querySelectorAll('article.event-card, .lc-event, .views-row');

      eventCards.forEach(card => {
        // Extract event link - try multiple selector patterns
        const linkEl = card.querySelector('.lc-event__title a, a.lc-event__link, .lc-event-title a, h3 a, h2 a');
        if (!linkEl) return;

        const href = linkEl.getAttribute('href');
        const title = linkEl.textContent.trim();

        // Extract audience from CSS classes
        const audienceClasses = [];
        const colorIndicators = card.querySelectorAll('.lc-event__color-indicator, .lc-event-info-item--colors span');
        colorIndicators.forEach(indicator => {
          // Extract audience from class names like "lc-event__color-indicator--children"
          const classes = indicator.className.split(' ');
          classes.forEach(cls => {
            if (cls.includes('lc-event__color-indicator--') || cls.includes('lc-event-color--')) {
              const audience = cls.replace('lc-event__color-indicator--', '').replace('lc-event-color--', '');
              if (audience && audience !== 'tid') {
                audienceClasses.push(audience);
              }
            }
          });
        });

        // Also check for audience text in the card
        const audienceTextEl = card.querySelector('.lc-event-info-item--colors, .lc-event__audience');
        if (audienceTextEl) {
          const audienceText = audienceTextEl.textContent.toLowerCase();
          if (audienceText.includes('children')) audienceClasses.push('children');
          if (audienceText.includes('teen')) audienceClasses.push('teens');
          if (audienceText.includes('birth') || audienceText.includes('preschool')) audienceClasses.push('birth-preschool');
          if (audienceText.includes('adult')) audienceClasses.push('adults');
          if (audienceText.includes('all ages')) audienceClasses.push('all-ages');
        }

        // Extract date from list view - DMPL structure:
        // Date is shown as "Jan 20 - 22 2026" or "Jan 21 2026" in the card text
        // Time is in .lc-event__date as "All Day 1/20–1/22" or "10:15am–10:45am"
        const cardText = card.textContent;
        let dateText = '';

        // Extract the actual date from card text (format: "Jan 20 - 22 2026" or "Jan 21 2026")
        const dateMatch = cardText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s+\d{4}/i);
        if (dateMatch) {
          dateText = dateMatch[0];

          // Also extract time if available (format: "10:15am–10:45am")
          const timeMatch = cardText.match(/\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*[–-]\s*\d{1,2}:\d{2}\s*(?:am|pm))?/i);
          if (timeMatch) {
            dateText = `${dateText} ${timeMatch[0]}`;
          }
        }

        // Extract location from list view
        const locationEl = card.querySelector('.lc-event__location, .lc-event-info-item--location, .lc-event-location');
        const locationText = locationEl ? locationEl.textContent.trim() : '';

        if (href && title) {
          results.push({
            path: href,
            title: title,
            audienceClasses: [...new Set(audienceClasses)], // Deduplicate
            calendarDate: dateText,
            listLocation: locationText
          });
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} event links\n`);

    // Process each event
    for (const event of events) {
      try {
        // Map audience to age range FIRST (before fetching details)
        const ageRange = mapAudience(event.audienceClasses, '');

        // Skip adult-only events early
        if (ageRange === 'Adults') {
          totalSkipped++;
          continue;
        }

        // Try to get event details - with retry on timeout
        let eventData = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            eventData = await scrapeEventDetails(page, event.path);
            break; // Success - exit retry loop
          } catch (detailError) {
            if (attempt === 2 || !detailError.message.includes('timeout')) {
              // Use list data as fallback if detail page fails
              console.log(`  ⚠️ Using list data for: ${event.title.substring(0, 40)}...`);
              eventData = {
                title: event.title,
                dateTime: event.calendarDate,
                location: event.listLocation || LIBRARY.name,
                address: '',
                phone: '',
                description: '',
                audienceText: ''
              };
            } else {
              console.log(`  ⚠️ Retry ${attempt} for: ${event.title.substring(0, 40)}...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        if (!eventData || !eventData.title) {
          console.log(`  ⚠️  Skipping event with no title: ${event.path}`);
          totalSkipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: eventData.title,
          description: eventData.description || ''
        });

        // Geocode location
        let coordinates = null;
        const locationName = eventData.location || event.listLocation || LIBRARY.name;
        if (eventData.address) {
          coordinates = await geocodeAddress(eventData.address);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        } else if (locationName && locationName !== LIBRARY.name) {
          const fullAddress = `${locationName}, Des Moines, IA`;
          coordinates = await geocodeAddress(fullAddress);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }

        // Parse date to get Date object for Timestamp
        const dateStr = eventData.dateTime || event.calendarDate;
        const dateObj = parseDateToObject(dateStr);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Normalize date format
        const normalizedDate = normalizeDateString(dateStr);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${dateStr}"`);
          totalSkipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: eventData.title.trim(),
          venue: locationName,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: dateStr,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: (eventData.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: locationName,
            address: eventData.address || '',
            city: LIBRARY.city,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: `${LIBRARY.baseUrl}${event.path}`,
            phone: eventData.phone || ''
          },
          url: `${LIBRARY.baseUrl}${event.path}`,
          metadata: {
            source: 'Des Moines Public Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: 'IA',
            addedDate: admin.firestore.FieldValue.serverTimestamp(),
            audience: event.audienceClasses.join(', ')
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
          console.log(`  ✅ ${eventData.title.substring(0, 60)}${eventData.title.length > 60 ? '...' : ''}`);
          totalImported++;
        } else {
          totalSkipped++;
        }

        // Rate limiting (reduced from 500ms)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Error processing event ${event.path}:`, error.message);
        totalFailed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`\n❌ Error scraping Des Moines Public Library:`, error.message);
    throw error;
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ DES MOINES PUBLIC LIBRARY SCRAPER COMPLETE!`);
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult(LIBRARY.name, {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { state: LIBRARY.state, dataType: 'events' });

  return { totalImported, totalSkipped, totalFailed };
}

// Run scraper if called directly
if (require.main === module) {
  scrapeDesMoinesLibrary()
    .then(() => {
      console.log('Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeDesMoinesLibrary };

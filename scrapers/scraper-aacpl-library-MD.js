#!/usr/bin/env node

/**
 * ANNE ARUNDEL COUNTY LIBRARY EVENTS WEB SCRAPER
 *
 * Scrapes real-time events from AACPL website
 * Replaces hardcoded library events with live data
 *
 * Usage:
 *   node scripts/scraper-library-events-web.js
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

// AACPL Library Branches with coordinates
const LIBRARY_BRANCHES = {
  'Annapolis': {
    address: '1410 West St, Annapolis, MD 21401',
    city: 'Annapolis',
    county: 'Anne Arundel',
    zipCode: '21401',
    lat: 38.9784,
    lng: -76.4922,
    website: 'https://www.aacpl.net/branches/annapolis'
  },
  'Glen Burnie': {
    address: '1010 Eastway, Glen Burnie, MD 21061',
    city: 'Glen Burnie',
    county: 'Anne Arundel',
    zipCode: '21061',
    lat: 39.1626,
    lng: -76.6244,
    website: 'https://www.aacpl.net/branches/glen-burnie'
  },
  'Severna Park': {
    address: '45 W McKinsey Rd, Severna Park, MD 21146',
    city: 'Severna Park',
    county: 'Anne Arundel',
    zipCode: '21146',
    lat: 39.0709,
    lng: -76.5455,
    website: 'https://www.aacpl.net/branches/severna-park'
  },
  'Brooklyn Park': {
    address: '1 Central Blvd, Brooklyn Park, MD 21225',
    city: 'Brooklyn Park',
    county: 'Anne Arundel',
    zipCode: '21225',
    lat: 39.2105,
    lng: -76.6150,
    website: 'https://www.aacpl.net/branches/brooklyn-park'
  },
  'Crofton': {
    address: '1681 Riedel Rd, Crofton, MD 21114',
    city: 'Crofton',
    county: 'Anne Arundel',
    zipCode: '21114',
    lat: 39.0028,
    lng: -76.6836,
    website: 'https://www.aacpl.net/branches/crofton'
  },
  'Deale': {
    address: '5940 Deale Churchton Rd, Deale, MD 20751',
    city: 'Deale',
    county: 'Anne Arundel',
    zipCode: '20751',
    lat: 38.7884,
    lng: -76.5519,
    website: 'https://www.aacpl.net/branches/deale'
  },
  'Edgewater': {
    address: '25 Stepneys Ln, Edgewater, MD 21037',
    city: 'Edgewater',
    county: 'Anne Arundel',
    zipCode: '21037',
    lat: 38.9322,
    lng: -76.5469,
    website: 'https://www.aacpl.net/branches/edgewater'
  },
  'Eastport-Annapolis Neck': {
    address: '269 Hillsmere Dr, Annapolis, MD 21403',
    city: 'Annapolis',
    county: 'Anne Arundel',
    zipCode: '21403',
    lat: 38.9527,
    lng: -76.4711,
    website: 'https://www.aacpl.net/branches/eastport-annapolis-neck'
  },
  'Linthicum': {
    address: '400 Shipley Rd, Linthicum Heights, MD 21090',
    city: 'Linthicum Heights',
    county: 'Anne Arundel',
    zipCode: '21090',
    lat: 39.2081,
    lng: -76.6597,
    website: 'https://www.aacpl.net/branches/linthicum'
  },
  'Odenton': {
    address: '1325 Annapolis Rd, Odenton, MD 21113',
    city: 'Odenton',
    county: 'Anne Arundel',
    zipCode: '21113',
    lat: 39.0811,
    lng: -76.7011,
    website: 'https://www.aacpl.net/branches/odenton'
  },
  'Pasadena': {
    address: '8143 Fort Smallwood Rd, Pasadena, MD 21122',
    city: 'Pasadena',
    county: 'Anne Arundel',
    zipCode: '21122',
    lat: 39.1073,
    lng: -76.5469,
    website: 'https://www.aacpl.net/branches/pasadena'
  },
  'Riviera Beach': {
    address: '1130 Duvall Hwy, Pasadena, MD 21122',
    city: 'Pasadena',
    county: 'Anne Arundel',
    zipCode: '21122',
    lat: 39.1511,
    lng: -76.5189,
    website: 'https://www.aacpl.net/branches/riviera-beach'
  },
  'Mountain Road': {
    address: '4730 Mountain Rd, Pasadena, MD 21122',
    city: 'Pasadena',
    county: 'Anne Arundel',
    zipCode: '21122',
    lat: 39.1156,
    lng: -76.5758,
    website: 'https://www.aacpl.net/branches/mountain-road'
  },
  'Severn': {
    address: '805 Revell Hwy, Severn, MD 21144',
    city: 'Severn',
    county: 'Anne Arundel',
    zipCode: '21144',
    lat: 39.1348,
    lng: -76.6963,
    website: 'https://www.aacpl.net/branches/severn'
  },
  'Broadneck': {
    address: '1275 Green Holly Dr, Annapolis, MD 21409',
    city: 'Annapolis',
    county: 'Anne Arundel',
    zipCode: '21409',
    lat: 39.0184,
    lng: -76.5269,
    website: 'https://www.aacpl.net/branches/broadneck'
  },
  'Discoveries': {
    address: '595 Ritchie Hwy, Severna Park, MD 21146',
    city: 'Severna Park',
    county: 'Anne Arundel',
    zipCode: '21146',
    lat: 39.0701,
    lng: -76.5565,
    website: 'https://www.aacpl.net/branches/discoveries'
  }
};

// Geocode address if coordinates not provided
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

// Scrape events from AACPL events calendar
async function scrapeAACPLEvents() {
  console.log('\n📚 Scraping Anne Arundel County Library events...\n');

  const browser = await launchBrowser();

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Visit AACPL events calendar
    console.log('📅 Loading events calendar: https://www.aacpl.net/events');
    await page.goto('https://www.aacpl.net/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('article');
      const results = [];

      eventElements.forEach(el => {
        try {
          // Get event link and title
          const linkEl = el.querySelector('a[href*="/event/"]');
          const titleEl = el.querySelector('h3');

          if (!linkEl || !titleEl) return;

          const title = titleEl.textContent.trim();
          const url = linkEl.href;

          // Get all text content and normalize whitespace
          const fullText = el.textContent.replace(/\s+/g, ' ').trim();

          // Extract date and time (look for patterns like "Nov 6 2025 Thu" and "2:00pm–3:30pm")
          let eventDate = '';
          let startTime = '';
          let endTime = '';
          const dateMatch = fullText.match(/\w{3}\s+\d{1,2}\s+\d{4}\s+\w{3}/); // "Nov 6 2025 Thu"
          const timeMatch = fullText.match(/(\d{1,2}:\d{2}(?:am|pm))(?:[–-](\d{1,2}:\d{2}(?:am|pm)))?/i);

          if (dateMatch) {
            eventDate = dateMatch[0];
          }
          if (timeMatch) {
            // Format time with proper spacing: "2:00pm" -> "2:00 PM"
            startTime = timeMatch[1].replace(/([ap])m/i, ' $1M').toUpperCase();
            if (timeMatch[2]) {
              endTime = timeMatch[2].replace(/([ap])m/i, ' $1M').toUpperCase();
            }
          }

          // Combine date and time for display
          const fullDateTime = startTime ? `${eventDate} ${startTime}${endTime ? '–' + endTime : ''}` : eventDate;

          // Extract location (look for "Library Branch:" or branch names)
          let venue = '';
          const locationMatch = fullText.match(/Library Branch:\s*([^\n]+)/i);
          if (locationMatch) {
            venue = locationMatch[1].trim();
          }

          // Extract description (text after "Event Details:" if present)
          let description = '';
          const descMatch = fullText.match(/Event Details:\s*([^\n]+)/i);
          if (descMatch) {
            description = descMatch[1].trim().substring(0, 500);
          } else {
            // Fallback: use first 200 chars of text
            const cleanText = fullText.replace(/\s+/g, ' ').trim();
            description = cleanText.substring(0, 200);
          }

          // Extract age range if mentioned
          let ageRange = 'All Ages';
          if (fullText.match(/baby|infant|toddler/i)) ageRange = 'Babies & Toddlers (0-2)';
          else if (fullText.match(/preschool|ages 3-5|3-5 years/i)) ageRange = 'Preschool (3-5)';
          else if (fullText.match(/children|kids|ages 6-12/i)) ageRange = 'Children (6-12)';
          else if (fullText.match(/teen|ages 13-17/i)) ageRange = 'Teens (13-17)';
          else if (fullText.match(/family|all ages/i)) ageRange = 'All Ages';

          if (title && fullDateTime) {
            results.push({
              name: title,
              eventDate: fullDateTime,
              startTime: startTime,
              endTime: endTime,
              venue: venue,
              description: description,
              url: url,
              ageRange: ageRange
            });
          }
        } catch (err) {
          console.log('Error parsing event element:', err);
        }
      });

      return results;
    });

    console.log(`  ✅ Found ${events.length} events on calendar\n`);

    // Process each event
    for (const event of events) {
      try {
        // Find matching library branch
        let branch = null;
        let branchName = null;

        for (const [name, data] of Object.entries(LIBRARY_BRANCHES)) {
          if (event.venue.includes(name) || event.name.includes(name)) {
            branch = data;
            branchName = name;
            break;
          }
        }

        // Skip if we can't match to a branch
        if (!branch) {
          console.log(`  ⏭️  Skipping: ${event.name} (no branch match)`);
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

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: `${branchName} Library`,
          eventDate: normalizedDate,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: event.ageRange || 'All Ages',
          cost: 'Free',
          description: event.description || `Library event at ${branchName}.`,
          moreInfo: '',
          state: 'MD',  // Top-level state field for queries
          city: branch.city,
          zipCode: branch.zipCode,
          location: {
            name: `${branchName} Library`,
            address: branch.address,
            city: branch.city,
            zipCode: branch.zipCode,
            coordinates: {
              latitude: branch.lat,
              longitude: branch.lng
            }
          },
          contact: {
            website: event.url || branch.website,
            phone: ''
          },
          url: event.url || branch.website,
          source: 'aacpl-library',
          metadata: {
            source: 'AACPL Library Scraper',
            sourceName: 'Anne Arundel County Public Library',
            county: 'Anne Arundel',
            state: 'MD',
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          geohash: ngeohash.encode(branch.lat, branch.lng, 7),
          filters: {
            isFree: true,
            ageRange: event.ageRange || 'All Ages'
          }
        };

        // Check for duplicates using URL as unique identifier
        const existing = await db.collection('events')
          .where('url', '==', eventDoc.url)
          .where('name', '==', eventDoc.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name} - ${branchName}`);
          imported++;
        } else {
          console.log(`  ⏭️  Duplicate: ${event.name}`);
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`  ❌ Error processing event: ${event.name}`, error.message);
        failed++;
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ AACPL LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to database
  await logScraperResult('Anne Arundel County Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeAACPLEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAACPL: scrapeAACPLEvents };

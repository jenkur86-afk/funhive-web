#!/usr/bin/env node

/**
 * LIBRARYCALENDAR MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using LibraryCalendar platform
 *
 * COVERAGE (22 library systems across 5 states):
 *
 * MD:
 * - Howard County Library System
 * - Frederick County Public Libraries
 * - Talbot County Free Library
 * - Caroline County Public Library
 *
 * VA:
 * - Amherst County Public Library
 * - Appomattox Regional Library
 * - Bedford Public Library System
 * - Essex Public Library
 * - Gloucester County Library System
 * - Lynchburg Public Library
 * - Petersburg Public Library
 * - Poquoson Public Library
 * - Portsmouth Public Library
 * - Powhatan County Public Library
 * - Waynesboro Public Library
 * - York County Public Library
 *
 * NC:
 * - Forsyth County Public Library
 * - Cumberland County Public Library
 *
 * NJ:
 * - Atlantic County Library System (NEW)
 * - Gloucester County Library System (NEW)
 *
 * SC:
 * - York County Library (NEW)
 *
 * Usage:
 *   node scripts/Scraper-event-librarycalendar.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const { normalizeDateString } = require('./date-utils');
const { linkEventToVenue } = require('./venue-matcher');

// Pre-geocoded branch coordinates for Howard County Library System
// Added 2025-12-03 to fix null coordinates issue
const HOWARD_COUNTY_BRANCHES = {
  'Central': { lat: 39.2112, lng: -76.8584, city: 'Columbia', zipCode: '21044', address: '10375 Little Patuxent Pkwy, Columbia, MD 21044' },
  'East Columbia': { lat: 39.1906, lng: -76.8468, city: 'Columbia', zipCode: '21045', address: '6600 Cradlerock Way, Columbia, MD 21045' },
  'Elkridge': { lat: 39.2125, lng: -76.7138, city: 'Elkridge', zipCode: '21075', address: '6540 Washington Blvd, Elkridge, MD 21075' },
  'Glenwood': { lat: 39.3228, lng: -77.0233, city: 'Cooksville', zipCode: '21723', address: '2350 State Route 97, Cooksville, MD 21723' },
  'Miller': { lat: 39.2715, lng: -76.8619, city: 'Ellicott City', zipCode: '21043', address: '9421 Frederick Rd, Ellicott City, MD 21043' },
  'Savage': { lat: 39.1369, lng: -76.8222, city: 'Laurel', zipCode: '20723', address: '9525 Durness Ln, Laurel, MD 20723' }
};

// Pre-geocoded branch coordinates for Frederick County Public Libraries
// Added 2025-12-03 to fix null coordinates issue
const FREDERICK_COUNTY_BRANCHES = {
  'C. Burr Artz': { lat: 39.4136, lng: -77.4086, city: 'Frederick', zipCode: '21701', address: '110 E Patrick St, Frederick, MD 21701' },
  'Brunswick': { lat: 39.3210, lng: -77.6243, city: 'Brunswick', zipCode: '21716', address: '915 N Maple Ave, Brunswick, MD 21716' },
  'Emmitsburg': { lat: 39.7045, lng: -77.3270, city: 'Emmitsburg', zipCode: '21727', address: '300A S Seton Ave, Emmitsburg, MD 21727' },
  'Middletown': { lat: 39.4431, lng: -77.5467, city: 'Middletown', zipCode: '21769', address: '31 E Green St, Middletown, MD 21769' },
  'Myersville': { lat: 39.5126, lng: -77.5673, city: 'Myersville', zipCode: '21773', address: '8 Harp Pl, Myersville, MD 21773' },
  'Thurmont': { lat: 39.6235, lng: -77.4109, city: 'Thurmont', zipCode: '21788', address: '76 E Moser Rd, Thurmont, MD 21788' },
  'Urbana': { lat: 39.3314, lng: -77.3540, city: 'Urbana', zipCode: '21704', address: '9020 Amelung St, Frederick, MD 21704' },
  'Walkersville': { lat: 39.4853, lng: -77.3529, city: 'Walkersville', zipCode: '21793', address: '2 S Glade Rd, Walkersville, MD 21793' },
  'Point of Rocks': { lat: 39.2756, lng: -77.5393, city: 'Point of Rocks', zipCode: '21777', address: '4008 Ballenger Creek Pike, Point of Rocks, MD 21777' }
};

// Find matching branch from location name
function findBranchCoordinates(locationName, libraryName, libraryState) {
  if (!locationName) return null;

  const locationLower = locationName.toLowerCase();

  // Check Howard County branches
  if (libraryName.includes('Howard County')) {
    for (const [branchName, branchData] of Object.entries(HOWARD_COUNTY_BRANCHES)) {
      if (locationLower.includes(branchName.toLowerCase())) {
        return { name: branchName, ...branchData };
      }
    }
  }

  // Check Frederick County branches
  if (libraryName.includes('Frederick County')) {
    for (const [branchName, branchData] of Object.entries(FREDERICK_COUNTY_BRANCHES)) {
      if (locationLower.includes(branchName.toLowerCase())) {
        return { name: branchName, ...branchData };
      }
    }
  }

  // Fallback: try library-addresses.js for other library systems
  // Extract branch name from location string
  let branchName = locationName;
  // Remove common suffixes like "Branch", "Library" to get core name
  branchName = branchName.replace(/\s+(Branch|Library)\s*$/i, '').trim();

  const branchLocation = getBranchAddress(libraryName, branchName, libraryState);
  if (branchLocation && branchLocation.address) {
    return {
      name: branchName,
      address: branchLocation.address,
      city: branchLocation.city,
      zipCode: branchLocation.zipCode,
      // Note: This won't have lat/lng pre-geocoded, but address is provided
      // The calling code should geocode using this address
      needsGeocoding: true
    };
  }

  return null;
}

// LibraryCalendar Library Systems
const LIBRARY_SYSTEMS = [
  // MARYLAND
  {
    name: 'Howard County Library System',
    url: 'https://howardcounty.librarycalendar.com/events/month',
    county: 'Howard',
    state: 'MD',
    website: 'https://hclibrary.org',
    city: 'Columbia',
    zipCode: '21044'
  },
  {
    name: 'Frederick County Public Libraries',
    url: 'https://frederick.librarycalendar.com/events/month',
    county: 'Frederick',
    state: 'MD',
    website: 'https://www.fcpl.org',
    city: 'Frederick',
    zipCode: '21701'
  },
  {
    name: 'Talbot County Free Library',
    url: 'https://talbot.librarycalendar.com/events/month',
    county: 'Talbot',
    state: 'MD',
    website: 'https://www.tcfl.org',
    city: 'Easton',
    zipCode: '21601'
  },
  {
    name: 'Caroline County Public Library',
    url: 'https://carolinecounty.librarycalendar.com/events/month',
    county: 'Caroline',
    state: 'MD',
    website: 'https://carolib.org',
    city: 'Denton',
    zipCode: '21629'
  },

  // VIRGINIA
  {
    name: 'Amherst County Public Library',
    url: 'https://amherstpl.librarycalendar.com/events/month',
    county: 'Amherst',
    state: 'VA',
    website: 'https://amherstpubliclibrary.org',
    city: 'Amherst',
    zipCode: '24521'
  },
  {
    name: 'Appomattox Regional Library',
    url: 'https://appomattox.librarycalendar.com/events/month',
    county: 'Appomattox',
    state: 'VA',
    website: 'https://www.appomattoxlibrary.org',
    city: 'Appomattox',
    zipCode: '24522'
  },
  {
    name: 'Bedford Public Library System',
    url: 'https://bedford.librarycalendar.com/events/month',
    county: 'Bedford',
    state: 'VA',
    website: 'https://www.bedfordvalibrary.org',
    city: 'Bedford',
    zipCode: '24523'
  },
  {
    name: 'Essex Public Library',
    url: 'https://essex.librarycalendar.com/events/month',
    county: 'Essex',
    state: 'VA',
    website: 'https://www.essexpubliclibrary.org',
    city: 'Tappahannock',
    zipCode: '22560'
  },
  {
    name: 'Gloucester County Library System',
    url: 'https://gcls.librarycalendar.com/events/month',
    county: 'Gloucester',
    state: 'VA',
    website: 'https://www.gloucesterlibrary.org',
    city: 'Gloucester',
    zipCode: '23061'
  },
  {
    name: 'Lynchburg Public Library',
    url: 'https://lynchburg.librarycalendar.com/events/month',
    county: 'Lynchburg',
    state: 'VA',
    website: 'https://www.lynchburgva.gov/library',
    city: 'Lynchburg',
    zipCode: '24504'
  },
  {
    name: 'Petersburg Public Library',
    url: 'https://petersburg.librarycalendar.com/events/month',
    county: 'Petersburg',
    state: 'VA',
    website: 'https://www.petersburgva.gov/481/Library',
    city: 'Petersburg',
    zipCode: '23803'
  },
  {
    name: 'Poquoson Public Library',
    url: 'https://poquoson.librarycalendar.com/events/month',
    county: 'Poquoson',
    state: 'VA',
    website: 'https://www.poquoson-va.gov/government/departments-services/library',
    city: 'Poquoson',
    zipCode: '23662'
  },
  {
    name: 'Powhatan County Public Library',
    url: 'https://powhatancounty.librarycalendar.com/events/month',
    county: 'Powhatan',
    state: 'VA',
    website: 'https://www.powhatanva.gov/203/Library',
    city: 'Powhatan',
    zipCode: '23139'
  },
  {
    name: 'Waynesboro Public Library',
    url: 'https://waynesboro.librarycalendar.com/events/month',
    county: 'Waynesboro',
    state: 'VA',
    website: 'https://www.waynesboro.va.us/government/library',
    city: 'Waynesboro',
    zipCode: '22980'
  },
  {
    name: 'York County Public Library',
    url: 'https://yorkcountyva.librarycalendar.com/events/month',
    county: 'York',
    state: 'VA',
    website: 'https://www.yorkcounty.gov/369/Library',
    city: 'Yorktown',
    zipCode: '23690'
  },
  {
    name: 'Portsmouth Public Library',
    url: 'https://portsmouthpl.librarycalendar.com/events/month',
    county: 'Portsmouth',
    state: 'VA',
    website: 'https://www.portsmouthpubliclibrary.org',
    city: 'Portsmouth',
    zipCode: '23704'
  },

  // NORTH CAROLINA
  {
    name: 'Forsyth County Public Library',
    url: 'https://forsythcounty.librarycalendar.com/events/month',
    county: 'Forsyth',
    state: 'NC',
    website: 'https://www.forsyth.cc',
    city: 'Winston-Salem',
    zipCode: '27101'
  },
  {
    name: 'Cumberland County Public Library',
    url: 'https://cumberland.librarycalendar.com/events/month',
    county: 'Cumberland',
    state: 'NC',
    website: 'https://www.cumberland.lib.nc.us',
    city: 'Fayetteville',
    zipCode: '28301'
  },

  // NEW JERSEY
  {
    name: 'Atlantic County Library System',
    url: 'https://atlanticcounty.librarycalendar.com/events/month',
    county: 'Atlantic',
    state: 'NJ',
    website: 'https://atlanticlibrary.org',
    city: 'Mays Landing',
    zipCode: '08330'
  },
  {
    name: 'Gloucester County Library System',
    url: 'https://gcls.librarycalendar.com/events/month',
    county: 'Gloucester',
    state: 'NJ',
    website: 'https://www.gcls.org',
    city: 'Mullica Hill',
    zipCode: '08062'
  },

  // SOUTH CAROLINA
  {
    name: 'York County Library',
    url: 'https://yorkcounty.librarycalendar.com/events/month',
    county: 'York',
    state: 'SC',
    website: 'https://www.yclibrary.org',
    city: 'Rock Hill',
    zipCode: '29730'
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
  if (lowerText.match(/adults? only/i) || lowerText === 'adults') {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|everyone|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from LibraryCalendar library
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
      timeout: 45000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Try different selectors for LibraryCalendar
      const selectors = [
        'article',
        '.event-card',
        'section',
        '[class*="event"]'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 5) break; // Find container with substantial events
      }

      eventElements.forEach(el => {
        try {
          // Look for title in heading or link
          const titleEl = el.querySelector('h1, h2, h3, h4, a[href*="event"]');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const linkEl = el.querySelector('a[href*="event"]');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date and time - LibraryCalendar format: "Sunday, November 9, 2025 at 2:00pm - 3:30pm"
          let eventDate = '';
          let time = '';

          const dateTimeMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}(?:am|pm)/i);
          if (dateTimeMatch) {
            eventDate = dateTimeMatch[0];
          } else {
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2},?\s+\d{4}/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];

            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                             fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract library branch/location
          let location = '';
          const locationMatch = fullText.match(/(?:Library Branch|Branch|Location):\s*([^\n]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract age group
          let audience = '';
          const audienceMatch = fullText.match(/(?:Age Group|Audience):\s*([^\n]+)/i);
          if (audienceMatch) {
            audience = audienceMatch[1].trim();
          }

          // Extract program type
          let programType = '';
          const programMatch = fullText.match(/(?:Program Type):\s*([^\n]+)/i);
          if (programMatch) {
            programType = programMatch[1].trim();
          }

          // Extract description
          let description = '';
          const paragraphs = el.querySelectorAll('p');
          if (paragraphs.length > 0) {
            // Get longest paragraph as description
            let longest = '';
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text.length > longest.length) {
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
              description: description,
              url: url,
              audience: audience,
              programType: programType
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to find pre-geocoded branch coordinates first
        let coordinates = null;
        let branchInfo = null;
        if (event.venue) {
          branchInfo = findBranchCoordinates(event.venue, library.name, library.state);
          if (branchInfo) {
            if (branchInfo.lat && branchInfo.lng) {
              // Pre-geocoded coordinates available
              coordinates = { latitude: branchInfo.lat, longitude: branchInfo.lng };
            } else if (branchInfo.needsGeocoding && branchInfo.address) {
              // Branch found in library-addresses.js but needs geocoding
              const fullAddress = `${branchInfo.address}, ${branchInfo.city}, ${library.state} ${branchInfo.zipCode}`;
              coordinates = await geocodeAddress(fullAddress);
            }
          }

          // Fall back to generic geocoding if no branch match or geocoding failed
          if (!coordinates) {
            coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
          }
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description || event.programType
        });

        // Normalize date format to "Month Day, Year Time"
        const normalizedDate = normalizeDateString(event.eventDate);

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: normalizedDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.programType || '',
          state: library.state,
          location: {
            name: event.venue || library.name,
            address: branchInfo ? branchInfo.address : '',
            city: branchInfo ? branchInfo.city : library.city,
            zipCode: branchInfo ? branchInfo.zipCode : library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'LibraryCalendar Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
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

  return { imported, skipped, failed };
}

// Main scraper function
async function scrapeLibraryCalendarLibraries() {
  console.log('\n📚 LIBRARYCALENDAR MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 22 libraries across MD, VA, NC, NJ & SC\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('LibraryCalendar-MD-VA', 'events', {
    source: 'librarycalendar'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.calendarUrl, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, skipped, failed } = await scrapeLibraryEvents(library, browser);

        // Track per-site stats (updates both site AND aggregate totals)
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  // Log to Firestore with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Cloud Function wrapper
async function scrapeLibraryCalendarLibrariesCloudFunction() {
  console.log('\n📚 LibraryCalendar Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeLibraryCalendarLibraries();

    return {
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      message: 'LibraryCalendar libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in LibraryCalendar scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeLibraryCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLibraryCalendarLibraries, scrapeLibraryCalendarLibrariesCloudFunction };

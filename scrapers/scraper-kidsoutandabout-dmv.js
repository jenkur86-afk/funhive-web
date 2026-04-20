#!/usr/bin/env node

/**
 * KIDS OUT AND ABOUT DMV SCRAPER
 *
 * Scrapes family events from dmv.kidsoutandabout.com
 * Coverage: Washington DC, Maryland, Virginia (DMV region)
 *
 * Data Source: JSON-LD structured data on event pages
 * Estimated Events: 200+ per month
 *
 * Usage:
 *   node scraper-kidsoutandabout-dmv.js          # Test mode (3 days)
 *   node scraper-kidsoutandabout-dmv.js --full   # Full mode (30 days)
 *
 * Cloud Function: scheduledKidsOutAndAboutDMV
 * Schedule: Every 3 days
 */

const axios = require('axios');
const cheerio = require('cheerio');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');
const { launchBrowser, createStealthPage } = require('./puppeteer-config');

const SCRAPER_NAME = 'KidsOutAndAbout-DMV';
const BASE_URL = 'https://dmv.kidsoutandabout.com';

// States covered by this scraper
const DMV_STATES = ['DC', 'MD', 'VA'];

/**
 * Format date as YYYY-MM-DD for URL
 */
function formatDateForUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object
 */
function parseEventDate(dateStr) {
  if (!dateStr) return null;

  // Handle ISO date strings
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[0] - 1, parts[1]);
  }

  // Try direct parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Extract state from location string
 */
function extractState(location) {
  if (!location) return null;

  // Look for state abbreviations
  const stateMatch = location.match(/\b(DC|MD|VA|Virginia|Maryland|Washington\s*D\.?C\.?)\b/i);
  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    if (state.includes('VIRGINIA')) return 'VA';
    if (state.includes('MARYLAND')) return 'MD';
    if (state.includes('WASHINGTON') || state.includes('DC')) return 'DC';
    return state;
  }
  return null;
}

/**
 * Parse age range from string
 */
function parseAgeRange(ageStr) {
  if (!ageStr) return 'All Ages';

  const lower = ageStr.toLowerCase();
  if (lower.includes('all ages')) return 'All Ages';
  if (lower.includes('adult')) return 'Adults';
  if (lower.includes('teen')) return 'Teens';
  if (lower.includes('toddler')) return 'Toddlers (1-3)';
  if (lower.includes('preschool')) return 'Preschool (3-5)';
  if (lower.includes('elementary') || lower.includes('school age')) return 'Elementary (6-12)';

  return ageStr.substring(0, 50);
}

// Shared browser instance for stealth browsing (avoids 403 blocks)
let _sharedBrowser = null;
async function getSharedBrowser() {
  if (!_sharedBrowser) {
    _sharedBrowser = await launchBrowser({ stealth: true });
  }
  return _sharedBrowser;
}
async function closeSharedBrowser() {
  if (_sharedBrowser) {
    await _sharedBrowser.close();
    _sharedBrowser = null;
  }
}

/**
 * Fetch event list page for a specific date (using Puppeteer to bypass 403)
 */
async function fetchEventListPage(date) {
  const dateStr = formatDateForUrl(date);
  const url = `${BASE_URL}/event-list/${dateStr}`;

  try {
    const browser = await getSharedBrowser();
    const page = await createStealthPage(browser);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const html = await page.content();
    await page.close();
    return html;
  } catch (error) {
    console.log(`  ⚠️ Failed to fetch ${dateStr}: ${error.message}`);
    return null;
  }
}

/**
 * Extract event URLs from list page
 */
function extractEventUrls(html) {
  const $ = cheerio.load(html);
  const urls = new Set();

  // Find all event links
  $('a[href*="/content/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('/content/') && !href.includes('/content/search')) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      urls.add(fullUrl);
    }
  });

  return Array.from(urls);
}

/**
 * Fetch and parse individual event page (using Puppeteer to bypass 403)
 */
async function fetchEventDetails(url) {
  try {
    const browser = await getSharedBrowser();
    const page = await createStealthPage(browser);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    const html = await page.content();
    await page.close();

    const $ = cheerio.load(html);

    // Try to extract JSON-LD data first
    let jsonLdData = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Event' || (Array.isArray(json) && json.some(j => j['@type'] === 'Event'))) {
          jsonLdData = Array.isArray(json) ? json.find(j => j['@type'] === 'Event') : json;
        }
      } catch (e) {}
    });

    // Extract data from page content
    const title = $('h1').first().text().trim() || $('title').text().split('|')[0].trim();

    // Get description
    let description = '';
    $('.field-name-body p, .node-content p').each((i, el) => {
      if (i < 3) description += $(el).text().trim() + ' ';
    });
    description = description.trim().substring(0, 500);

    // Extract location from page
    let venue = '', address = '', city = '', state = '', zipCode = '';

    // Try to find location info
    const locationText = $('*:contains("Location:")').last().parent().text();
    const addressMatch = locationText.match(/(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
    if (addressMatch) {
      address = addressMatch[1].trim();
      city = addressMatch[2].trim();
      state = addressMatch[3];
      zipCode = addressMatch[4] || '';
    }

    // Try to get venue name
    venue = $('*:contains("Location:")').last().next().text().trim();
    if (!venue) {
      venue = jsonLdData?.location?.name || '';
    }

    // Get coordinates from JSON-LD or try to geocode
    let latitude = null, longitude = null;
    if (jsonLdData?.location?.geo) {
      latitude = parseFloat(jsonLdData.location.geo.latitude);
      longitude = parseFloat(jsonLdData.location.geo.longitude);
    }

    // Parse dates
    let startDate = jsonLdData?.startDate || '';
    let endDate = jsonLdData?.endDate || '';

    // Get time info — try multiple sources
    let time = '';
    // Source 1: "Time:" label on page
    const timeText = $('*:contains("Time:")').first().parent().text();
    const timeMatch = timeText.match(/Time:\s*(.+?)(?:\n|$)/i);
    if (timeMatch) {
      time = timeMatch[1].trim();
    }
    // Source 2: JSON-LD startDate/endDate ISO timestamps (e.g., "2026-04-20T14:00:00-04:00")
    if (!time && startDate && startDate.includes('T')) {
      const isoTimeMatch = startDate.match(/T(\d{2}):(\d{2})/);
      if (isoTimeMatch) {
        let h = parseInt(isoTimeMatch[1]); const m = isoTimeMatch[2];
        if (!(h === 0 && m === '00')) { // Skip midnight (no real time)
          const ap = h >= 12 ? 'PM' : 'AM';
          if (h > 12) h -= 12; if (h === 0) h = 12;
          time = `${h}:${m} ${ap}`;
          // Also extract end time if available
          if (endDate && endDate.includes('T')) {
            const endMatch = endDate.match(/T(\d{2}):(\d{2})/);
            if (endMatch) {
              let eh = parseInt(endMatch[1]); const em = endMatch[2];
              if (!(eh === 0 && em === '00')) {
                const eap = eh >= 12 ? 'PM' : 'AM';
                if (eh > 12) eh -= 12; if (eh === 0) eh = 12;
                time = `${time} - ${eh}:${em} ${eap}`;
              }
            }
          }
        }
      }
    }

    // Get age range
    let ageRange = 'All Ages';
    const ageText = $('*:contains("Ages:")').first().parent().text();
    if (ageText) {
      const ageMatch = ageText.match(/Ages?:\s*(.+?)(?:\n|$)/i);
      if (ageMatch) {
        ageRange = parseAgeRange(ageMatch[1].trim());
      }
    }

    // Get cost
    let cost = 'See website';
    const priceText = $('*:contains("Price:")').first().parent().text();
    if (priceText) {
      const priceMatch = priceText.match(/Price:\s*(.+?)(?:\n|$)/i);
      if (priceMatch) {
        cost = priceMatch[1].trim().substring(0, 100);
      }
    }
    if (cost.toLowerCase().includes('free')) cost = 'Free';

    // Get categories/tags
    const tags = [];
    $('.field-name-field-tags a, .taxonomy-term a').each((_, el) => {
      tags.push($(el).text().trim());
    });

    // Use JSON-LD data to fill in gaps
    if (jsonLdData) {
      if (!venue && jsonLdData.location?.name) venue = jsonLdData.location.name;
      if (!address && jsonLdData.location?.address) {
        if (typeof jsonLdData.location.address === 'string') {
          address = jsonLdData.location.address;
        } else {
          address = jsonLdData.location.address.streetAddress || '';
          city = city || jsonLdData.location.address.addressLocality || '';
          state = state || jsonLdData.location.address.addressRegion || '';
          zipCode = zipCode || jsonLdData.location.address.postalCode || '';
        }
      }
    }

    // Parse address components from venue field if it contains a full address blob
    // e.g., "Shipgarten, 7581 Colshire Dr, McLean, VA 22102, United States \n See map: Google Maps"
    if (venue && !address && !city) {
      let cleanedVenue = venue.replace(/\s*See\s*map:\s*Google\s*Maps\s*/gi, '').trim();
      cleanedVenue = cleanedVenue.replace(/,?\s*(United States|USA)\s*$/i, '').trim();

      // Try: "Name, Street, City, ST ZIP"
      const fullAddrMatch = cleanedVenue.match(/^(.+?),\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
      if (fullAddrMatch) {
        venue = fullAddrMatch[1].trim();
        address = fullAddrMatch[2].trim();
        city = fullAddrMatch[3].trim();
        state = state || fullAddrMatch[4];
        zipCode = zipCode || (fullAddrMatch[5] || '').trim();
      } else {
        // Try: "Name, Street Name, City, ST" (no number, e.g., "Baker Park, North Bentz Street, Frederick, MD")
        const streetMatch = cleanedVenue.match(/^(.+?),\s*([^,]+(?:Street|Road|Avenue|Drive|Boulevard|Blvd|Lane|Way|Pike|Pkwy|Parkway|Hwy|Highway|Rd|Dr|Ave|St|Ln|Ct|Pl|Circle|Trail|Tr)[^,]*),\s*([^,]+),\s*([A-Z]{2})/i);
        if (streetMatch) {
          venue = streetMatch[1].trim();
          address = streetMatch[2].trim();
          city = streetMatch[3].trim();
          state = state || streetMatch[4];
        } else {
          // Try: "Name, City, ST ZIP"
          const nStreetMatch = cleanedVenue.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
          if (nStreetMatch) {
            venue = nStreetMatch[1].trim();
            city = nStreetMatch[2].trim();
            state = state || nStreetMatch[3];
            zipCode = zipCode || (nStreetMatch[4] || '').trim();
          }
        }
      }
    }

    // Determine state for DMV filtering
    const eventState = state || extractState(venue + ' ' + address + ' ' + city);

    return {
      name: title,
      description: description,
      venue: venue,
      address: address,
      city: city,
      state: eventState,
      zipCode: zipCode,
      latitude: latitude,
      longitude: longitude,
      startDate: startDate,
      endDate: endDate,
      time: time,
      ageRange: ageRange,
      cost: cost,
      tags: tags,
      url: url,
    };

  } catch (error) {
    console.log(`  ⚠️ Failed to parse event: ${error.message}`);
    return null;
  }
}

/**
 * Geocode address if coordinates are missing
 */
async function geocodeAddress(address, city, state, zipCode) {
  if (!address && !city) return null;

  const query = [address, city, state, zipCode].filter(Boolean).join(', ');

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0' },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
      };
    }
  } catch (error) {}

  return null;
}

/**
 * Save events to Firestore
 */
async function saveEvents(events) {
  if (events.length === 0) return { saved: 0, failed: 0 };

  const batch = db.batch();
  let saved = 0, failed = 0;

  for (const event of events) {
    try {
      const eventId = generateEventId(event.url);
      const docRef = db.collection('events').doc(eventId);
      batch.set(docRef, event, { merge: true });
      saved++;
    } catch (error) {
      failed++;
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Batch commit error:', error.message);
    failed = events.length;
    saved = 0;
  }

  return { saved, failed };
}

/**
 * Main scraper function
 */
async function scrapeKidsOutAndAboutDMV(options = {}) {
  const { daysToScrape = 7, testMode = false } = options;

  console.log(`\n🐝 KIDS OUT AND ABOUT DMV SCRAPER`);
  console.log(`📅 Scraping ${daysToScrape} days of events`);
  console.log(`🎯 Coverage: DC, MD, VA`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allEvents = [];
  const seenUrls = new Set();

  // Generate dates to scrape
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysToScrape; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    console.log(`\n📆 ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);

    const html = await fetchEventListPage(date);
    if (!html) continue;

    const eventUrls = extractEventUrls(html);
    console.log(`  Found ${eventUrls.length} event links`);

    // Filter out already-seen URLs
    const newUrls = eventUrls.filter(url => !seenUrls.has(url));
    newUrls.forEach(url => seenUrls.add(url));

    console.log(`  Processing ${newUrls.length} new events...`);

    let processed = 0;
    for (const url of newUrls) {
      const details = await fetchEventDetails(url);
      if (!details || !details.name) continue;

      // Filter to DMV states only
      if (details.state && !DMV_STATES.includes(details.state)) {
        continue;
      }

      // Geocode if needed
      if (!details.latitude || !details.longitude) {
        const coords = await geocodeAddress(
          details.address, details.city, details.state, details.zipCode
        );
        if (coords) {
          details.latitude = coords.latitude;
          details.longitude = coords.longitude;
        }
      }

      // Build event object
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: details.name,
        description: details.description,
      });

      // Normalize date format
      const rawDate = details.startDate || date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const normalizedDate = normalizeDateString(rawDate);
      if (!normalizedDate) {
        console.log(`  ⚠️ Skipping event with invalid date: "${rawDate}"`);
        continue;
      }

      // Infer state from available data if extractState() failed
      if (!details.state) {
        // Try from city name
        const cityStateMap = {
          'washington': 'DC', 'silver spring': 'MD', 'bethesda': 'MD', 'rockville': 'MD',
          'gaithersburg': 'MD', 'columbia': 'MD', 'frederick': 'MD', 'bowie': 'MD',
          'clarksburg': 'MD', 'aberdeen': 'MD', 'germantown': 'MD', 'laurel': 'MD',
          'college park': 'MD', 'hyattsville': 'MD', 'takoma park': 'MD', 'greenbelt': 'MD',
          'arlington': 'VA', 'fairfax': 'VA', 'alexandria': 'VA', 'burke': 'VA',
          'chantilly': 'VA', 'manassas': 'VA', 'ashburn': 'VA', 'reston': 'VA',
          'herndon': 'VA', 'leesburg': 'VA', 'sterling': 'VA', 'vienna': 'VA',
          'mclean': 'VA', 'tysons': 'VA', 'falls church': 'VA', 'woodbridge': 'VA',
          'centreville': 'VA', 'springfield': 'VA', 'annandale': 'VA', 'dale city': 'VA',
        };
        const cityLower = (details.city || '').toLowerCase().trim();
        if (cityStateMap[cityLower]) {
          details.state = cityStateMap[cityLower];
        }
        // Try from zip code prefix
        if (!details.state && details.zipCode) {
          const zip3 = details.zipCode.substring(0, 3);
          if (['200', '202', '203', '204', '205'].includes(zip3)) details.state = 'DC';
          else if (['206', '207', '208', '209', '210', '211', '212', '214', '215', '216', '217', '218', '219'].includes(zip3)) details.state = 'MD';
          else if (['220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246'].includes(zip3)) details.state = 'VA';
        }
        // Try from address/venue text
        if (!details.state) {
          details.state = extractState(details.address || '') || extractState(details.venue || '') || '';
        }
      }

      // Skip promo/meta events with no real location data
      if (!details.venue && !details.address && !details.city && !details.state) {
        console.log(`  ⏭️ Skipping no-location: ${(details.name || '').substring(0, 50)}`);
        continue;
      }

      // Skip promotional/listing-type events
      const promoNames = /^(how to list|free things to do|free places to take|things to do this|top \d+ things|best things to do|submit your event|add your event)/i;
      if (promoNames.test(details.name || '')) {
        console.log(`  ⏭️ Skipping promo: ${(details.name || '').substring(0, 50)}`);
        continue;
      }

      // Parse start/end time from details.time (e.g., "3:00 PM - 5:00 PM" or "3:00 PM")
      let parsedStartTime = '';
      let parsedEndTime = '';
      if (details.time) {
        const trm = details.time.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-–—]+\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
        if (trm) {
          parsedStartTime = trm[1].trim().toUpperCase();
          parsedEndTime = trm[2].trim().toUpperCase();
        } else {
          const tsm = details.time.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
          if (tsm) parsedStartTime = tsm[1].trim().toUpperCase();
        }
      }

      const event = {
        name: details.name,
        eventDate: normalizedDate,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        description: details.description,
        venue: details.venue || 'See event page',
        address: details.address || '',
        city: details.city || '',
        state: details.state || '',
        zipCode: details.zipCode || '',
        location: details.latitude && details.longitude ? {
          latitude: details.latitude,
          longitude: details.longitude,
        } : null,
        geohash: details.latitude && details.longitude
          ? ngeohash.encode(details.latitude, details.longitude, 7)
          : null,
        ageRange: details.ageRange || 'All Ages',
        cost: details.cost || 'See website',
        parentCategory,
        displayCategory,
        subcategory,
        url: details.url,
        imageUrl: '',
        metadata: {
          sourceName: 'Kids Out and About DMV',
          sourceUrl: BASE_URL,
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'kidsoutandabout',
          state: details.state || '',
          addedDate: new Date().toISOString(),
        },
      };

      allEvents.push(event);
      processed++;

      // Rate limiting - be nice to the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`  ✅ Processed ${processed} DMV events`);

    // Rate limiting between days
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 SAVING TO FIRESTORE`);
  console.log('-'.repeat(40));

  const { saved, failed } = await saveEvents(allEvents);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPER COMPLETE`);
  console.log(`   Events found: ${allEvents.length}`);
  console.log(`   Events saved: ${saved}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventsImported: saved,
      eventsFailed: failed,
      eventsFound: allEvents.length,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
      daysScraped: daysToScrape,
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  // Close the shared browser
  await closeSharedBrowser();

  return { imported: saved, failed, total: allEvents.length };
}

/**
 * Cloud Function export
 */
async function scrapeKidsOutAndAboutDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeKidsOutAndAboutDMV({ daysToScrape: 14, testMode: false });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const fullMode = args.includes('--full');
  const daysToScrape = fullMode ? 30 : 7;

  console.log(`\n🚀 Starting Kids Out and About DMV Scraper (${fullMode ? 'Full' : 'Test'} Mode)`);

  scrapeKidsOutAndAboutDMV({ daysToScrape, testMode: !fullMode })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeKidsOutAndAboutDMV,
  scrapeKidsOutAndAboutDMVCloudFunction,
};

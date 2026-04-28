#!/usr/bin/env node

/**
 * NORTH CAROLINA MACARONI KID SCRAPER - CLOUD VERSION
 *
 * Uses axios + cheerio instead of Puppeteer for Cloud Functions compatibility
 * Scrapes events from 14 North Carolina Macaroni Kid sites
 *
 * Coverage: Asheville, Burlington-Hillsborough, Cary, Chapel Hill-Durham, Durham,
 *           Fayetteville-Hope Mills-Fort Bragg, Garner-Clayton-Smithfield,
 *           Hendersonville, Hickory-Western Piedmont, Leland, South Charlotte,
 *           Union, Wake Forest, Waynesville-Bryson-Canton-Sylva
 */

const axios = require('axios');
const cheerio = require('cheerio');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { getCountyCentroid } = require('./utils/county-centroids');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');
const { tryGeocode: _sharedTryGeocode, geocodeAddress: _sharedGeocodeAddress, getCityCenterCoords, geocodeVenue: _sharedGeocodeVenue, flushMacaroniGeocodeCache } = require('./helpers/macaroni-geocoding-helper');

// All 14 North Carolina Macaroni Kid Sites
const NC_MK_SITES = [
  { url: 'https://asheville.macaronikid.com', name: 'Asheville', county: 'Buncombe' },
  { url: 'https://burlington-hillsborough.macaronikid.com', name: 'Burlington-Hillsborough', county: 'Alamance' },
  { url: 'https://cary.macaronikid.com', name: 'Cary', county: 'Wake' },
  { url: 'https://southdurham.macaronikid.com', name: 'Chapel Hill-Durham', county: 'Durham' },
  { url: 'https://durham.macaronikid.com', name: 'Durham', county: 'Durham' },
  { url: 'https://fayettevillenc.macaronikid.com', name: 'Fayetteville-Hope Mills-Fort Bragg', county: 'Cumberland' },
  { url: 'https://clayton.macaronikid.com', name: 'Garner-Clayton-Smithfield', county: 'Johnston' },
  { url: 'https://hendersonville.macaronikid.com', name: 'Hendersonville', county: 'Henderson' },
  { url: 'https://hickory.macaronikid.com', name: 'Hickory-Western Piedmont', county: 'Catawba' },
  { url: 'https://leland.macaronikid.com', name: 'Leland', county: 'Brunswick' },
  { url: 'https://southcharlotte.macaronikid.com', name: 'South Charlotte', county: 'Mecklenburg' },
  { url: 'https://union.macaronikid.com', name: 'Union', county: 'Union' },
  { url: 'https://wakeforest.macaronikid.com', name: 'Wake Forest', county: 'Wake' },
  { url: 'https://waynesville.macaronikid.com', name: 'Waynesville-Bryson-Canton-Sylva', county: 'Haywood' }
];

/**
 * Geocode an address using OpenStreetMap Nominatim
 */
async function geocodeAddress(address, city, zipCode) {
  return _sharedGeocodeAddress(address, city, 'NC', zipCode);
}

async function geocodeVenue(venue, city, zipCode) {
  return _sharedGeocodeVenue(venue, city, 'NC', zipCode);
}

async function tryGeocode(address) {
  return _sharedTryGeocode(address);
}

/**
 * Extract event URLs from the calendar page using cheerio
 */
async function extractEventUrls(siteUrl) {
  try {
    const response = await axios.get(`${siteUrl}/events/calendar`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 45000
    });

    const $ = cheerio.load(response.data);
    const urls = new Set();

    // Find all links that match event patterns
    $('a[href*="/events/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.includes('/events/') && !href.endsWith('/events') &&
          !href.includes('/submit') && href.match(/\/events\/[a-f0-9]{24}/)) {
        // Make absolute URL if needed
        const fullUrl = href.startsWith('http') ? href : `${siteUrl}${href}`;
        urls.add(fullUrl);
      }
    });

    return Array.from(urls);
  } catch (error) {
    console.error(`  ❌ Error fetching calendar: ${error.message}`);
    return [];
  }
}

/**
 * Extract event details from individual event page using cheerio
 */
async function extractEventDetails(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 45000
    });

    const $ = cheerio.load(response.data);
    const result = {
      name: '',
      eventDate: '',
      dayOfWeek: '',
      time: '',
      venue: '',
      address: '',
      city: '',
      zipCode: '',
      phone: '',
      cost: 'Contact for pricing',
      ageRange: 'All Ages',
      description: '',
      moreInfo: ''
    };

    // Extract title
    const h1 = $('h1').first();
    if (h1.length) {
      result.name = h1.text().trim();
    }

    // === DOM-based address extraction (reliable — uses structured elements) ===
    const locationNameEl = $('.location-name').first();
    const locationAddressEl = $('.location-address').first();
    if (locationNameEl.length) {
      result.venue = locationNameEl.text().trim();
    }
    if (locationAddressEl.length) {
      const addressLines = [];
      locationAddressEl.children('span').each(function() {
        const text = $(this).text().trim();
        if (text && !text.includes('Google Map')) addressLines.push(text);
      });

      for (const line of addressLines) {
        const cityStateZip = line.match(/^([\w\s.'-]+)\s+([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
        if (cityStateZip) {
          result.city = cityStateZip[1].trim();
          result.zipCode = cityStateZip[3];
          continue;
        }
        if (/^\d+\s+/.test(line) && !result.address) {
          result.address = line;
          continue;
        }
        if (/^(STE|Suite|Unit|Apt|#)\s/i.test(line)) {
          if (result.address) result.address += ', ' + line;
          continue;
        }
      }

      // Fallback: parse from Google Maps link URL
      if (!result.address || !result.city) {
        const mapLink = locationAddressEl.find('a.gmaplink').attr('href') || '';
        const qParam = mapLink.match(/[?&]q=([^&]+)/);
        if (qParam) {
          const mapAddr = decodeURIComponent(qParam[1].replace(/\+/g, ' '));
          const mapMatch = mapAddr.match(/^(.+?)\s+([\w\s.'-]+)\s+([A-Z]{2})\s+(\d{5})$/);
          if (mapMatch) {
            if (!result.address) result.address = mapMatch[1].trim();
            if (!result.city) result.city = mapMatch[2].trim();
            if (!result.zipCode) result.zipCode = mapMatch[4];
          }
        }
      }
    }

    // Extract all text and split into lines for parsing
    const bodyText = $('body').text();
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Find key section indices
    let eventsIndex = -1, descIndex = -1, moreInfoIndex = -1, whoIndex = -1, costIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'EVENTS') eventsIndex = i;
      if (lines[i] === 'Description') descIndex = i;
      if (lines[i] === 'More Info') moreInfoIndex = i;
      if (lines[i] === 'Who') whoIndex = i;
      if (lines[i] === 'Cost') costIndex = i;
    }

    // Parse EVENTS section for date/time/location
    if (eventsIndex > -1) {
      let idx = eventsIndex + 2;

      // Day of week
      if (idx < lines.length && /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(lines[idx])) {
        result.dayOfWeek = lines[idx];
        idx++;
      }

      // Event date
      if (idx < lines.length) {
        const dateMatch = lines[idx].match(/^([A-Z][a-z]+\s+\d{1,2},\s+\d{4})$/);
        if (dateMatch) {
          result.eventDate = dateMatch[1];
          idx++;
        }
      }

      // Time
      if (idx < lines.length && /\d{1,2}:\d{2}\s*(?:am|pm)/i.test(lines[idx])) {
        result.time = lines[idx];
        idx++;
      }

      // Only use text-based address parsing as fallback if DOM extraction didn't work
      if (!result.venue || !result.address || !result.city) {
        // Skip empty lines
        while (idx < lines.length && lines[idx].length === 0) idx++;

        // Venue name (not starting with digit, short line)
        if (!result.venue && idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100) {
          result.venue = lines[idx];
          idx++;
        }

        // Address (starts with digit)
        if (!result.address && idx < lines.length && /^\d+\s+[\w\s]+/.test(lines[idx])) {
          result.address = lines[idx];
          idx++;
        }

        // City, State, Zip
        if (!result.city && idx < lines.length) {
          const cityZipMatch = lines[idx].match(/^([\w\s]+)\s+[A-Z]{2}\s+(\d{5})/);
          if (cityZipMatch) {
            result.city = cityZipMatch[1].trim();
            result.zipCode = cityZipMatch[2];
          }
        }
      }
    }

    // Parse Description section
    if (descIndex > -1) {
      const descLines = [];
      for (let i = descIndex + 1; i < lines.length; i++) {
        if (lines[i] === 'More Info' || lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break;
        descLines.push(lines[i]);
      }
      result.description = descLines.join('\n\n');
    }

    // Parse More Info section
    if (moreInfoIndex > -1) {
      const moreInfoLines = [];
      for (let i = moreInfoIndex + 1; i < lines.length; i++) {
        if (lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break;
        moreInfoLines.push(lines[i]);
      }
      result.moreInfo = moreInfoLines.join('\n\n');
    }

    // Parse Who section (age range)
    if (whoIndex > -1) {
      const whoLines = [];
      for (let i = whoIndex + 1; i < lines.length; i++) {
        if (lines[i] === 'Cost' || lines[i] === 'More Info' || lines[i].includes('Add to')) break;
        whoLines.push(lines[i]);
      }
      const whoText = whoLines.join(' ');
      if (whoText) result.ageRange = whoText;
    }

    // Parse Cost section
    if (costIndex > -1) {
      const costLines = [];
      for (let i = costIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === 'How' || line === 'More Info' || line.includes('Add to') ||
            line === 'ADVERTISEMENTS' || line.startsWith('http')) break;
        costLines.push(line);
        if (costLines.join(' ').length > 150) break;
      }
      if (costLines.length > 0) {
        let costText = costLines.join(' ').substring(0, 150);
        if (costText.length === 150) {
          costText = costText.substring(0, costText.lastIndexOf(' ')) + '...';
        }
        result.cost = costText;
      }
    }

    return result;
  } catch (error) {
    console.error(`  ❌ Error fetching event details: ${error.message}`);
    return null;
  }
}

/**
 * Scrape a single Macaroni Kid site
 */
async function scrapeSite(site, maxEvents = 50) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${site.name} (${site.county} County)`);
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate 60 days from now
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  try {
    // Get event URLs from calendar
    const eventUrls = await extractEventUrls(site.url);
    console.log(`  Found ${eventUrls.length} URLs`);

    let imported = 0, updated = 0, skippedPast = 0, skippedFuture = 0, noLocation = 0;

    for (const url of eventUrls) {

      // Fetch event details
      const details = await extractEventDetails(url);
      if (!details || !details.eventDate) continue;

      // Parse date and skip past events
      const eventDate = new Date(details.eventDate);
      if (eventDate < today) {
        skippedPast++;
        continue;
      }

      // Try to geocode location
      let coords = null;
      let locationObj = null;

      if (details.address && details.city && details.zipCode) {
        coords = await geocodeAddress(details.address, details.city, details.zipCode);
      }
      // Try venue name geocoding when address geocode failed or no address available
      if (!coords && details.venue) {
        coords = await geocodeVenue(details.venue, details.city, details.zipCode);
        if (coords) {
          console.log(`  📍 Venue geocoded: ${details.venue?.substring(0, 35)} → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
        }
      }

      if (coords) {
        locationObj = {
          address: details.address,
          city: details.city,
          state: 'NC',
          zipCode: details.zipCode,
          coordinates: coords
        };
        if (details.venue && details.venue.trim()) {
          locationObj.name = details.venue;
        }
      } else {
        // Try city-level geocoding first
        if (details.city) {
          coords = await getCityCenterCoords(details.city, 'NC', details.zipCode);
          if (coords) {
            locationObj = {
              address: details.address || '',
              city: details.city,
              zipCode: details.zipCode || '',
              coordinates: coords,
              name: details.venue || 'See website',
              note: 'Geocoded to city level'
            };
            console.log(`  📍 Using city-level geocode for: ${details.name?.substring(0, 30)}`);
          }
        }

        // If city geocode also failed, try county centroid as fallback
        if (!coords) {
          const countyCentroid = getCountyCentroid(site.county, 'NC');
          if (countyCentroid) {
            coords = { latitude: countyCentroid.lat, longitude: countyCentroid.lng };
            locationObj = {
              address: details.address || '',
              city: details.city || countyCentroid.city,
              state: 'NC',
              zipCode: details.zipCode || '',
              coordinates: coords,
              name: details.venue || 'See website',
              note: `Approximate location (${site.county} County center)`
            };
            console.log(`  📍 Using county centroid for: ${details.name?.substring(0, 30)}`);
          } else {
            noLocation++;
            locationObj = {
              address: details.address || '',
              city: details.city || '',
              state: 'NC',
              zipCode: details.zipCode || '',
              name: details.venue || 'See website'
            };
          }
        }
      }

      // Categorize event
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: details.name,
        description: details.description
      });

      // Validate schedule data
      const invalidPhrases = ['stationed', 'retiring', 'my ', 'i was', 'he was', 'she was', 'because', 'although', 'however', 'therefore'];
      const scheduleText = `${details.dayOfWeek} ${details.eventDate} ${details.time}`.toLowerCase();

      let rejectionReason = null;

      if (invalidPhrases.some(phrase => scheduleText.includes(phrase))) {
        rejectionReason = 'Invalid schedule data - contains narrative text';
      } else if (!details.eventDate.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{2,4})/i)) {
        rejectionReason = 'Malformed date - does not contain valid date pattern';
      }

      if (rejectionReason) {
        // Save to rejected_events collection
        await db.collection('rejected_events').add({
          name: details.name,
          venue: details.venue,
          url: url,
          rawData: {
            dayOfWeek: details.dayOfWeek,
            eventDate: details.eventDate,
            time: details.time,
            address: details.address,
            city: details.city,
            zipCode: details.zipCode,
            description: details.description,
            moreInfo: details.moreInfo,
            ageRange: details.ageRange,
            cost: details.cost
          },
          rejectionReason: rejectionReason,
          source: `Macaroni Kid ${site.name}`,
          county: site.county,
          state: 'NC',
          rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ⚠️ Rejected: ${details.name} - ${rejectionReason}`);
        continue;
      }

      // Normalize the date string for consistent storage
      const normalizedDate = normalizeDateString(details.eventDate) || details.eventDate;

      // Parse date into a proper Date object for the TIMESTAMPTZ column
      const parsedDateObj = /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ? new Date(normalizedDate + 'T00:00:00') : new Date(normalizedDate);
      const dateTimestamp = !isNaN(parsedDateObj.getTime()) ? admin.firestore.Timestamp.fromDate(parsedDateObj) : null;

      // Build event document
      const eventDoc = {
        name: details.name,
        venue: details.venue || 'See website',
        eventDate: normalizedDate,
        date: dateTimestamp,
        scheduleDescription: `${details.dayOfWeek}, ${details.eventDate}${details.time ? ' at ' + details.time : ''}`,
        parentCategory,
        displayCategory,
        subcategory,
        ageRange: details.ageRange,
        cost: details.cost,
        description: details.description,
        moreInfo: details.moreInfo || '',
        location: locationObj,
        contact: {
          website: url,
          phone: details.phone || ''
        },
        url: url,
        metadata: {
          source: 'macaroni-kid',
          sourceName: `Macaroni Kid ${site.name}`,
          county: site.county,
          state: 'NC',
          addedDate: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      // Add geohash if we have coordinates
      if (coords) {
        eventDoc.geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      }

      // Check if event already exists
      const existing = await db.collection('events').where('url', '==', url).limit(1).get();
      if (existing.empty) {
        events.push(eventDoc); imported++;
      } else {
        // Update existing event with fresh data (address, venue, coordinates, etc.)
        const existingDoc = existing.docs[0];
        try {
          await db.collection('events').doc(existingDoc.id).set(eventDoc);
          updated++;
        } catch (updateErr) {
          console.log(`  ⚠️ Update failed for ${url}: ${updateErr.message}`);
        }
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`  ✅ ${imported} new | 🔄 ${updated} updated | ⏭️ ${skippedPast} past | ⚠️ ${noLocation} no coords`);
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }

  return events;
}

/**
 * Main scraper function - scrapes all NC Macaroni Kid sites
 */
async function scrapeMacaroniKidNorthCarolina() {
  console.log('🥕 NORTH CAROLINA MACARONI KID SCRAPER (CLOUD VERSION)\n' + '='.repeat(60));
  console.log(`Scraping ${NC_MK_SITES.length} NC sites without Puppeteer\n`);

  let imported = 0;
  let updated = 0;
  let failed = 0;
  const startTime = Date.now();

  try {
    for (const site of NC_MK_SITES) {
      try {
        const events = await scrapeSite(site, 50);

        // Import events to Firestore
        for (const event of events) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(event);
        if (activityId) {
          event.activityId = activityId;
        }

        await db.collection('events').add(event);
          imported++;
        }
      } catch (error) {
        console.error(`❌ Error scraping ${site.name}:`, error.message);
        failed++;
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Log results
  await db.collection('scraperLogs').add({
    scraperName: 'Macaroni Kid North Carolina (Cloud)',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    success: failed === 0,
    imported: imported,
    failed: failed,
    total: imported + failed,
    duration: elapsed,
    error: failed > 0 ? `${failed} sites failed` : null
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ NORTH CAROLINA MACARONI KID SCRAPER COMPLETE!');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log('='.repeat(60) + '\n');

  return {
    success: failed === 0,
    scraperName: 'Macaroni Kid North Carolina',
    stats: {
      imported: imported,
      failed: failed
    }
  };
}

// Export for use in Cloud Functions
module.exports = { scrapeMacaroniKidNorthCarolina };

// Allow running directly for testing
if (require.main === module) {
  scrapeMacaroniKidNorthCarolina()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

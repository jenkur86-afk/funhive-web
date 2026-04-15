#!/usr/bin/env node

/**
 * MINNESOTA MACARONI KID SCRAPER
 *
 * Scrapes events from 8 Minnesota Macaroni Kid sites
 *
 * Coverage: Brainerd-Little Falls-Long Prairie-Mille Lacs Lake, Carver-Eden Prairie, Coon Rapids-Blaine-Andover-Anoka, Eagan-Rosemount-Burnsville-Lakeville-Apple Valley, Plymouth-Golden Valley-St. Louis Park, Shakopee, White Bear Lake-Shoreview-Roseville, Woodbury-Oakdale-Cottage Grove-Stillwater
 *
 * Usage:
 *   node scraper-macaroni-mn.js          # Test mode (5 sites)
 *   node scraper-macaroni-mn.js --full   # Production (all 8 sites)
 */

const axios = require('axios');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { launchBrowser } = require('./puppeteer-config');
const { getCountyCentroid } = require('./utils/county-centroids');
const { getOrCreateVenue, findMatchingVenue } = require('./venue-matcher');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');

// All 8 Minnesota Macaroni Kid Sites
const MN_MK_SITES = [
  { url: 'https://brainerd.macaronikid.com', name: 'Brainerd-Little Falls-Long Prairie-Mille Lacs Lake', county: 'Crow Wing' },
  { url: 'https://carver.macaronikid.com', name: 'Carver-Eden Prairie', county: 'Carver' },
  { url: 'https://coonrapids.macaronikid.com', name: 'Coon Rapids-Blaine-Andover-Anoka', county: 'Anoka' },
  { url: 'https://southmetro.macaronikid.com', name: 'Eagan-Rosemount-Burnsville-Lakeville-Apple Valley', county: 'Dakota' },
  { url: 'https://plymouth.macaronikid.com', name: 'Plymouth-Golden Valley-St. Louis Park', county: 'Hennepin' },
  { url: 'https://shakopee.macaronikid.com', name: 'Shakopee', county: 'Scott' },
  { url: 'https://whitebearlake.macaronikid.com', name: 'White Bear Lake-Shoreview-Roseville', county: 'Ramsey' },
  { url: 'https://semetro.macaronikid.com', name: 'Woodbury-Oakdale-Cottage Grove-Stillwater', county: 'Washington' }
];

async function geocodeAddress(address, city, zipCode) {
  const fullAddress = `${address}, ${city}, MN ${zipCode}`;
  let result = await tryGeocode(fullAddress);
  if (result) return result;

  const cleaned = address.replace(/,?\s*Suite\s+[A-Z0-9-]+/i, '').replace(/,?\s*#\s*[A-Z0-9-]+/i, '');
  if (cleaned !== address) {
    result = await tryGeocode(`${cleaned}, ${city}, MN ${zipCode}`);
    if (result) return result;
  }

  const streetOnly = cleaned.split(',')[0];
  return await tryGeocode(`${streetOnly}, MN ${zipCode}`);
}

async function tryGeocode(address) {
  // Rate limit: wait 1.5s between Nominatim requests
  await new Promise(r => setTimeout(r, 1500));
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0 (family-events)' },
      timeout: 10000
    });
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log('Geocoding rate limited — waiting 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  return null;
}

async function extractEventUrls(page) {
  return await page.evaluate(() => {
    const urls = new Set();
    document.querySelectorAll('a[href*="/events/"]').forEach(link => {
      const href = link.href;
      if (href && href.includes('/events/') && !href.endsWith('/events') &&
          !href.includes('/submit') && href.match(/\/events\/[a-f0-9]{24}/)) {
        urls.add(href);
      }
    });
    return Array.from(urls);
  });
}

async function extractEventDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    return await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const result = { name: '', eventDate: '', dayOfWeek: '', time: '', venue: '', address: '', city: '', zipCode: '', phone: '', cost: 'Contact for pricing', ageRange: 'All Ages', description: '', moreInfo: '' };

      const h1 = document.querySelector('h1');
      if (h1) result.name = h1.textContent.trim();

      // === DOM-based address extraction (reliable — uses structured elements) ===
      const locationName = document.querySelector('.location-name');
      const locationAddress = document.querySelector('.location-address');
      if (locationName) {
        result.venue = locationName.textContent.trim();
      }
      if (locationAddress) {
        const spans = Array.from(locationAddress.querySelectorAll(':scope > span'));
        const addressLines = spans
          .map(s => s.textContent.trim())
          .filter(t => t.length > 0 && !t.includes('Google Map'));

        for (const line of addressLines) {
          // Match city/state/zip: "Wyomissing PA 19610" or "Frederick MD 21701"
          const cityStateZip = line.match(/^([\w\s.'-]+)\s+([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
          if (cityStateZip) {
            result.city = cityStateZip[1].trim();
            result.zipCode = cityStateZip[3];
            continue;
          }
          // Match street address: starts with a number
          if (/^\d+\s+/.test(line) && !result.address) {
            result.address = line;
            continue;
          }
          // Suite/unit line (starts with STE, Suite, Unit, Apt, #)
          if (/^(STE|Suite|Unit|Apt|#)\s/i.test(line)) {
            if (result.address) result.address += ', ' + line;
            continue;
          }
        }

        // Fallback: parse from Google Maps link URL if DOM spans didn't work
        if (!result.address || !result.city) {
          const mapLink = locationAddress.querySelector('a.gmaplink');
          if (mapLink) {
            const mapUrl = mapLink.href || '';
            const qParam = mapUrl.match(/[?&]q=([^&]+)/);
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
      }


      let eventsIndex = -1, descIndex = -1, moreInfoIndex = -1, whoIndex = -1, costIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === 'EVENTS') eventsIndex = i;
        if (lines[i] === 'Description') descIndex = i;
        if (lines[i] === 'More Info') moreInfoIndex = i;
        if (lines[i] === 'Who') whoIndex = i;
        if (lines[i] === 'Cost') costIndex = i;
      }

      if (eventsIndex > -1) {
        let idx = eventsIndex + 2;
        if (idx < lines.length && /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(lines[idx])) { result.dayOfWeek = lines[idx]; idx++; }
        if (idx < lines.length) { const dateMatch = lines[idx].match(/^([A-Z][a-z]+\s+\d{1,2},\s+\d{4})$/); if (dateMatch) { result.eventDate = dateMatch[1]; idx++; }}
        // Match time patterns including "All Day", "All-Day", time ranges, and standard times
        if (idx < lines.length && (/\d{1,2}:\d{2}\s*(?:am|pm)/i.test(lines[idx]) || /^all[\s-]*day$/i.test(lines[idx]))) { result.time = lines[idx]; idx++; }
        while (idx < lines.length && lines[idx].length === 0) idx++;
        // Skip invalid venue values (time-related phrases, placeholders)
        const invalidVenuePatterns = /^(all[\s-]*day|see website|n\/a|various|tbd|tba|online|virtual|zoom|webinar|microsoft teams|google meet|skype|teams meeting|check website|contact for details|\d{1,2}:\d{2}\s*(am|pm)?)$/i;
        if (idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { if (!result.venue) result.venue = lines[idx]; idx++; }
        // If venue was invalid, try the next line
        else if (idx < lines.length && invalidVenuePatterns.test(lines[idx])) { idx++; if (idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { if (!result.venue) result.venue = lines[idx]; idx++; }}
        if (idx < lines.length && /^\d+\s+[\w\s]+/.test(lines[idx])) { if (!result.address) result.address = lines[idx]; idx++; }
        if (idx < lines.length) { const cityZipMatch = lines[idx].match(/^([\w\s]+)\s+[A-Z]{2}\s+(\d{5})/); if (cityZipMatch && !result.city) { result.city = cityZipMatch[1].trim(); result.zipCode = cityZipMatch[2]; }}
      }

      if (descIndex > -1) { const descLines = []; for (let i = descIndex + 1; i < lines.length; i++) { if (lines[i] === 'More Info' || lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break; descLines.push(lines[i]); } result.description = descLines.join('\n\n'); }
      if (moreInfoIndex > -1) { const moreInfoLines = []; for (let i = moreInfoIndex + 1; i < lines.length; i++) { if (lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break; moreInfoLines.push(lines[i]); } result.moreInfo = moreInfoLines.join('\n\n'); }
      if (whoIndex > -1) { const whoLines = []; for (let i = whoIndex + 1; i < lines.length; i++) { if (lines[i] === 'Cost' || lines[i] === 'More Info' || lines[i].includes('Add to')) break; whoLines.push(lines[i]); } const whoText = whoLines.join(' '); if (whoText) result.ageRange = whoText; }
      if (costIndex > -1) { const costLines = []; for (let i = costIndex + 1; i < lines.length; i++) { const line = lines[i]; if (line === 'How' || line === 'More Info' || line.includes('Add to') || line === 'ADVERTISEMENTS' || line.startsWith('http')) break; costLines.push(line); if (costLines.join(' ').length > 150) break; } if (costLines.length > 0) { let costText = costLines.join(' ').substring(0, 150); if (costText.length === 150) { costText = costText.substring(0, costText.lastIndexOf(' ')) + '...'; } result.cost = costText; }}
      return result;
    });
  } catch (error) { return null; }
}

async function scrapeSite(browser, site, maxEvents = 50) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${site.name} (${site.county} County)`);
  const events = []; const today = new Date(); today.setHours(0, 0, 0, 0);

  // Calculate 60 days from now
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto(`${site.url}/events/calendar`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    const eventUrls = await extractEventUrls(page);
    console.log(`  Found ${eventUrls.length} URLs`);

    let imported = 0, updated = 0, skippedPast = 0, skippedFuture = 0, failedGeocode = 0, noLocation = 0;

    for (const url of eventUrls) {
      const details = await extractEventDetails(page, url);
      if (!details || !details.eventDate) continue;
      const eventDate = new Date(details.eventDate);
      if (eventDate < today) { skippedPast++; continue; }
      if (eventDate > maxDate) { skippedFuture++; continue; }
      // Skip promotional/newsletter events (not real events)
      const promoPatterns = {
        venues: [
          /^everywhere$/i,
          /^your home$/i,
          /macaronikid/i,
          /^online\b/i,        // "Online", "Online Event", "Online event"
          /^virtual\b/i,       // "Virtual", "Virtual Event"
          /^zoom\b/i,          // "Zoom", "Zoom Meeting"
          /\bonline\s*event\b/i  // Matches "Online Event" anywhere in venue
        ],
        names: [
          /^📅?\s*find more family fun/i,
          /submit your event/i,
          /^📆/,
          /\b(webinar|zoom|virtual|online)\b.*:/i,  // "Webinar: Topic"
          /:\s*(webinar|virtual|online)\b/i,         // "Topic: Virtual"
          /^virtual\s+/i,                             // "Virtual Storytime"
          /^online\s+/i                               // "Online Class"
        ]
      };

      const isPromoEvent =
        promoPatterns.venues.some(p => p.test(details.venue || '')) ||
        promoPatterns.names.some(p => p.test(details.name || ''));

      if (isPromoEvent) {
        console.log(`  ⏭️ Skipping promo/online: ${(details.name || '').substring(0, 40)}...`);
        continue;
      }

      // Check for online-only indicators in description
      const onlineIndicators = /\b(online\s+only|virtual\s+only|zoom\s+(?:meeting|call|link)|webinar|hosted?\s+(?:online|virtually)|no\s+physical\s+location)\b/i;
      if (onlineIndicators.test(details.description || '')) {
        console.log(`  ⏭️ Skipping online event: ${(details.name || '').substring(0, 40)}...`);
        continue;
      }

      // Skip events with insufficient location data (likely online-only)
      if (!details.venue && !details.address && !details.city) {
        console.log(`  ⏭️ Skipping no-location: ${(details.name || '').substring(0, 40)}...`);
        continue;
      }



      let coords = null;
      let locationObj = null;

      if (details.address && details.city && details.zipCode) {
        coords = await geocodeAddress(details.address, details.city, details.zipCode);
      }

      if (coords) {
        locationObj = {
          address: details.address,
          city: details.city,
          zipCode: details.zipCode,
          coordinates: coords
        };
        if (details.venue && details.venue.trim()) {
          locationObj.name = details.venue;
        }
      } else {
        failedGeocode++;

        // Try venue cache first - many venues already have coordinates
        const matchedVenue = await findMatchingVenue({
          venue: details.venue,
          city: details.city,
          state: 'MN',
          address: details.address
        });

        if (matchedVenue) {
          const venueLat = matchedVenue.location?.coordinates?.latitude || matchedVenue.location?.latitude;
          const venueLng = matchedVenue.location?.coordinates?.longitude || matchedVenue.location?.longitude;

          if (venueLat && venueLng) {
            coords = { latitude: venueLat, longitude: venueLng };
            locationObj = {
              address: details.address || matchedVenue.location?.address || '',
              city: details.city || matchedVenue.city || matchedVenue.location?.city || '',
              zipCode: details.zipCode || matchedVenue.location?.zipCode || '',
              coordinates: coords,
              name: details.venue || matchedVenue.name || 'See website'
            };
            console.log(`  📍 Using venue cache for: ${details.name?.substring(0, 30)}`);
          }
        }

        // If venue cache didn't provide coords, try city-level geocoding first
        if (!coords && details.city) {
          coords = await tryGeocode(`${details.city}, MN ${details.zipCode || ''}`);
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

        // If city geocode also failed, try county centroid
        if (!coords) {
          const countyCentroid = getCountyCentroid(site.county, 'MN');
          if (countyCentroid) {
            coords = { latitude: countyCentroid.lat, longitude: countyCentroid.lng };
            locationObj = {
              address: details.address || '',
              city: details.city || countyCentroid.city,
              zipCode: details.zipCode || '',
              coordinates: coords,
              name: details.venue || 'See website',
              note: `Approximate location (${site.county} County center)`
            };
            console.log(`  📍 Using county centroid for: ${details.name?.substring(0, 30)}`);
          } else {
            locationObj = {
              address: details.address || '',
              city: details.city || '',
              zipCode: details.zipCode || '',
              name: details.venue || 'See website'
            };
            noLocation++;
          }
        }
      }

      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: details.name,
        description: details.description
      });

      const invalidPhrases = ['stationed', 'retiring', 'my ', 'i was', 'he was', 'she was', 'because', 'although', 'however', 'therefore'];
      const scheduleText = `${details.dayOfWeek} ${details.eventDate} ${details.time}`.toLowerCase();

      let rejectionReason = null;

      if (invalidPhrases.some(phrase => scheduleText.includes(phrase))) {
        rejectionReason = 'Invalid schedule data - contains narrative text';
      } else if (!details.eventDate.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{2,4})/i)) {
        rejectionReason = 'Malformed date - does not contain valid date pattern';
      }

      if (rejectionReason) {
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
          state: 'MN',
          rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ⚠️ Rejected: ${details.name} - ${rejectionReason}`);
        continue;
      }

      // Normalize the date string for consistent storage


      const normalizedDate = normalizeDateString(details.eventDate) || details.eventDate;



      const eventDoc = {


        name: details.name, venue: details.venue || 'See website', eventDate: normalizedDate,
        scheduleDescription: `${details.dayOfWeek}, ${details.eventDate}${details.time ? ' at ' + details.time : ''}`,
        parentCategory, displayCategory, subcategory,
        ageRange: details.ageRange, cost: details.cost, description: details.description, moreInfo: details.moreInfo || '',
        location: locationObj,
        contact: { website: url, phone: details.phone || '' }, url: url,
        metadata: {
          source: 'Macaroni Kid Minnesota Scraper',
          sourceName: `Macaroni Kid ${site.name}`,
          county: site.county,
          state: 'MN',
          addedDate: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      if (coords) {
        eventDoc.geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      }
      // Link to existing venue or create new one
      const activityId = await getOrCreateVenue({
        venue: details.venue,
        city: details.city || locationObj?.city,
        state: 'MN',
        address: details.address || locationObj?.address,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        zipCode: details.zipCode || locationObj?.zipCode
      }, { category: parentCategory, subcategory: subcategory });

      if (activityId) {
        eventDoc.activityId = activityId;
      }


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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`  ✅ ${imported} new | 🔄 ${updated} updated | ⏭️ ${skippedPast} past | ⚠️ ${noLocation} no coords`);
    await page.close();
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    // Re-throw browser/protocol errors so main loop can restart browser
    if (error.message.includes('Protocol error') || error.message.includes('Connection closed') || error.message.includes('Target closed')) {
      throw error;
    }
  }
  return events;
}

async function scrapeMacaroniKidMinnesota() {
  const fullMode = true; // PRODUCTION: All sites
  console.log('🥕 MINNESOTA MACARONI KID SCRAPER\n' + '='.repeat(60));
  const sitesToScrape = fullMode ? MN_MK_SITES : MN_MK_SITES.slice(0, 5);
  const maxEventsPerSite = fullMode ? 999 : 30; // No limit - filtered by 60 day date range
  console.log(`Mode: ${fullMode ? 'FULL (all 8 sites)' : 'LIMITED (5 sites)'}\nDate range: Next 60 days\n`);

  let browser = null;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  // Track sites scraped since last browser restart
  let sitesSinceRestart = 0;
  const RESTART_INTERVAL = 5; // Restart browser every 5 sites to prevent memory issues

  for (const site of sitesToScrape) {
    try {
      // Start or restart browser if needed
      if (!browser || sitesSinceRestart >= RESTART_INTERVAL) {
        if (browser) {
          console.log('\n🔄 Restarting browser to prevent memory issues...');
          try { await browser.close(); } catch (e) { /* ignore close errors */ }
        }
        browser = await launchBrowser();
        sitesSinceRestart = 0;
      }

      const events = await scrapeSite(browser, site, maxEventsPerSite);
      for (const event of events) {
        await db.collection('events').add(event);
        imported++;
      }
      sitesSinceRestart++;

    } catch (error) {
      console.error(`❌ Error scraping ${site.name}:`, error.message);
      failed++;

      // If we get a protocol error (browser crashed), restart browser
      if (error.message.includes('Protocol error') || error.message.includes('Connection closed')) {
        console.log('🔄 Browser crashed, restarting...');
        try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
        browser = null; // Will be recreated on next iteration
        sitesSinceRestart = 0;
      }
    }
  }

  // Clean up browser
  if (browser) {
    try { await browser.close(); } catch (e) { /* ignore close errors */ }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('✅ MINNESOTA MACARONI KID SCRAPER COMPLETE!');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log('='.repeat(60) + '\n');

  // Log to Firestore for monitoring
  await logScraperResult('Macaroni Kid MN', {
    new: imported,
    duplicates: skipped,
    errors: failed
  }, { state: 'MN', source: 'macaroni-kid' });

  return { imported, failed };
}

if (require.main === module) {
  scrapeMacaroniKidMinnesota()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMacaroniKidMinnesota };

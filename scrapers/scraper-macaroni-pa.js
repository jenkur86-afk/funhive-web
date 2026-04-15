#!/usr/bin/env node

/**
 * PENNSYLVANIA MACARONI KID SCRAPER
 *
 * Scrapes events from 34 Pennsylvania Macaroni Kid sites
 *
 * Coverage: Allentown, Bethlehem, Boyertown, Carlisle-Shippensburg-Boiling Springs, Easton Area, Erie, Gettysburg-Hanover, Harrisburg and West Shore, Havertown-Main Line, Hershey to Elizabethtown, Kennett Square-Oxford, Lancaster, Lebanon, Lower Bucks, Media, MonValley-Pittsburgh East, Morgantown-Ephrata-Akron-New Holland, NE Philly, North Huntingdon-Greensburg-Latrobe, North York, Pittsburgh-City, Pittsburgh-South Hills, Pittsburgh North, Pittsburgh West-Robinson, Reading, Scranton, South York, Southern Montgomery, Springfield-Ridley Park, Uniontown, Upper Bucks, Warminster-Willow Grove, West Chester, Wilkes-Barre
 *
 * Usage:
 *   node scraper-macaroni-pa.js          # Test mode (5 sites)
 *   node scraper-macaroni-pa.js --full   # Production (all 34 sites)
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

// All 34 Pennsylvania Macaroni Kid Sites
const PA_MK_SITES = [
  { url: 'https://kutztown-to-allentown.macaronikid.com', name: 'Allentown', county: 'Lehigh' },
  { url: 'https://bethlehem.macaronikid.com', name: 'Bethlehem', county: 'Northampton' },
  { url: 'https://boyertown.macaronikid.com', name: 'Boyertown', county: 'Berks' },
  { url: 'https://carlisle.macaronikid.com', name: 'Carlisle-Shippensburg-Boiling Springs', county: 'Cumberland' },
  { url: 'https://eastonmetro.macaronikid.com', name: 'Easton Area', county: 'Northampton' },
  { url: 'https://erie.macaronikid.com', name: 'Erie', county: 'Erie' },
  { url: 'https://gettysburgpa.macaronikid.com', name: 'Gettysburg-Hanover', county: 'Adams' },
  { url: 'https://harrisburg.macaronikid.com', name: 'Harrisburg and West Shore', county: 'Dauphin' },
  { url: 'https://havertown.macaronikid.com', name: 'Havertown-Main Line', county: 'Delaware' },
  { url: 'https://hershey.macaronikid.com', name: 'Hershey to Elizabethtown', county: 'Dauphin' },
  { url: 'https://kennettsquare.macaronikid.com', name: 'Kennett Square-Oxford', county: 'Chester' },
  { url: 'https://lancaster.macaronikid.com', name: 'Lancaster', county: 'Lancaster' },
  { url: 'https://lebanon.macaronikid.com', name: 'Lebanon', county: 'Lebanon' },
  { url: 'https://lowermakefield.macaronikid.com', name: 'Lower Bucks', county: 'Bucks' },
  { url: 'https://media.macaronikid.com', name: 'Media', county: 'Delaware' },
  { url: 'https://pittsburgheast.macaronikid.com', name: 'MonValley-Pittsburgh East', county: 'Allegheny' },
  { url: 'https://morgantown.macaronikid.com', name: 'Morgantown-Ephrata-Akron-New Holland', county: 'Lancaster' },
  { url: 'https://nephilly.macaronikid.com', name: 'NE Philly', county: 'Philadelphia' },
  { url: 'https://nhuntingdon.macaronikid.com', name: 'North Huntingdon-Greensburg-Latrobe', county: 'Westmoreland' },
  { url: 'https://york.macaronikid.com', name: 'North York', county: 'York' },
  { url: 'https://cityofpittsburgh.macaronikid.com', name: 'Pittsburgh-City', county: 'Allegheny' },
  { url: 'https://southhills.macaronikid.com', name: 'Pittsburgh-South Hills', county: 'Allegheny' },
  { url: 'https://pittsburghnorth.macaronikid.com', name: 'Pittsburgh North', county: 'Allegheny' },
  { url: 'https://robinson.macaronikid.com', name: 'Pittsburgh West-Robinson', county: 'Allegheny' },
  { url: 'https://reading.macaronikid.com', name: 'Reading', county: 'Berks' },
  { url: 'https://scranton.macaronikid.com', name: 'Scranton', county: 'Lackawanna' },
  { url: 'https://southyork.macaronikid.com', name: 'South York', county: 'York' },
  { url: 'https://swmontgomery.macaronikid.com', name: 'Southern Montgomery', county: 'Montgomery' },
  { url: 'https://springfieldpa.macaronikid.com', name: 'Springfield-Ridley Park', county: 'Delaware' },
  { url: 'https://uniontown.macaronikid.com', name: 'Uniontown', county: 'Fayette' },
  { url: 'https://quakertown.macaronikid.com', name: 'Upper Bucks', county: 'Bucks' },
  { url: 'https://willowgrove.macaronikid.com', name: 'Warminster-Willow Grove', county: 'Bucks' },
  { url: 'https://westchesterpa.macaronikid.com', name: 'West Chester', county: 'Chester' },
  { url: 'https://wilkesbarre.macaronikid.com', name: 'Wilkes-Barre', county: 'Luzerne' }
];

async function geocodeAddress(address, city, zipCode) {
  const fullAddress = `${address}, ${city}, PA ${zipCode}`;
  let result = await tryGeocode(fullAddress);
  if (result) return result;

  const cleaned = address.replace(/,?\s*Suite\s+[A-Z0-9-]+/i, '').replace(/,?\s*#\s*[A-Z0-9-]+/i, '');
  if (cleaned !== address) {
    result = await tryGeocode(`${cleaned}, ${city}, PA ${zipCode}`);
    if (result) return result;
  }

  const streetOnly = cleaned.split(',')[0];
  return await tryGeocode(`${streetOnly}, PA ${zipCode}`);
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
            // Append to address
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
              // Parse "1235 Penn Ave Wyomissing PA 19610" from map URL
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

        // Only fall back to text-based address parsing if DOM extraction didn't find address
        if (!result.venue || !result.address || !result.city) {
          while (idx < lines.length && lines[idx].length === 0) idx++;
          const invalidVenuePatterns = /^(all[\s-]*day|see website|n\/a|various|tbd|tba|online|virtual|zoom|webinar|microsoft teams|google meet|skype|teams meeting|check website|contact for details|\d{1,2}:\d{2}\s*(am|pm)?)$/i;
          if (!result.venue && idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { result.venue = lines[idx]; idx++; }
          else if (idx < lines.length && invalidVenuePatterns.test(lines[idx])) { idx++; if (!result.venue && idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { result.venue = lines[idx]; idx++; }}
          if (!result.address && idx < lines.length && /^\d+\s+[\w\s]+/.test(lines[idx])) { result.address = lines[idx]; idx++; }
          if (!result.city && idx < lines.length) { const cityZipMatch = lines[idx].match(/^([\w\s]+)\s+[A-Z]{2}\s+(\d{5})/); if (cityZipMatch) { result.city = cityZipMatch[1].trim(); result.zipCode = cityZipMatch[2]; }}
        }
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
          state: 'PA',
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
          coords = await tryGeocode(`${details.city}, PA ${details.zipCode || ''}`);
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
          const countyCentroid = getCountyCentroid(site.county, 'PA');
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
          state: 'PA',
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
          source: 'Macaroni Kid Pennsylvania Scraper',
          sourceName: `Macaroni Kid ${site.name}`,
          county: site.county,
          state: 'PA',
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
        state: 'PA',
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

async function scrapeMacaroniKidPennsylvania() {
  const fullMode = true; // PRODUCTION: All sites
  console.log('🥕 PENNSYLVANIA MACARONI KID SCRAPER\n' + '='.repeat(60));
  const sitesToScrape = fullMode ? PA_MK_SITES : PA_MK_SITES.slice(0, 5);
  const maxEventsPerSite = fullMode ? 999 : 30; // No limit - filtered by 60 day date range
  console.log(`Mode: ${fullMode ? 'FULL (all 34 sites)' : 'LIMITED (5 sites)'}\nDate range: Next 60 days\n`);

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
  console.log('✅ PENNSYLVANIA MACARONI KID SCRAPER COMPLETE!');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log('='.repeat(60) + '\n');

  // Log to Firestore for monitoring
  await logScraperResult('Macaroni Kid PA', {
    new: imported,
    duplicates: skipped,
    errors: failed
  }, { state: 'PA', source: 'macaroni-kid' });

  return { imported, failed };
}

if (require.main === module) {
  scrapeMacaroniKidPennsylvania()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMacaroniKidPennsylvania };

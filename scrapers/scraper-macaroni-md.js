#!/usr/bin/env node

/**
 * MARYLAND MACARONI KID SCRAPER
 *
 * Scrapes events from 20 Maryland Macaroni Kid sites
 *
 * Coverage: Annapolis, Bel Air, Bethesda-Chevy Chase-Potomac, Bowie-Crofton-Odenton, Calvert-St. Marys, Charles, College Park-Hyattsville, Columbia-Ellicott City-Western Howard, District Heights, Essex-Middle River, Frederick, Laurel-Hanover-Jessup, Mt Airy-Damascus-Urbana, Olney-Rockville, Pasadena-Severna Park-Glen Burnie, South Baltimore, Southern Prince Georges, Takoma Park-Silver Spring, Timonium-North Baltimore, Westminster-Carroll
 *
 * Usage:
 *   node scraper-macaroni-md.js          # Test mode (5 sites)
 *   node scraper-macaroni-md.js --full   # Production (all 20 sites)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { launchBrowser } = require('./puppeteer-config');
const { getCountyCentroid } = require('./utils/county-centroids');
const { getOrCreateVenue, findMatchingVenue } = require('./venue-matcher');
const { normalizeDateString } = require('./date-normalization-helper');
const { parseTimeString } = require('./helpers/date-time-utils');
const { ScraperLogger } = require('./scraper-logger');

/**
 * Normalize text for comparison - removes punctuation, extra spaces, lowercases
 * Used to detect duplicate events across different Macaroni Kid sites
 */
function normalizeForComparison(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Collapse whitespace
    .trim();
}

/**
 * Check if an event with similar name, date, and venue already exists
 * This prevents duplicates when same event is posted to multiple MK sites
 */
async function isDuplicateEvent(name, eventDate, venue, city) {
  // First, try exact match on name and date
  const snapshot = await db.collection('events')
    .where('eventDate', '==', eventDate)
    .limit(100)
    .get();

  if (snapshot.empty) return { isDuplicate: false };

  const normalizedName = normalizeForComparison(name);
  const normalizedVenue = normalizeForComparison(venue);
  const normalizedCity = normalizeForComparison(city);

  for (const doc of snapshot.docs) {
    const existing = doc.data();
    const existingNormalizedName = normalizeForComparison(existing.name);
    const existingNormalizedVenue = normalizeForComparison(existing.venue);
    const existingNormalizedCity = normalizeForComparison(existing.location?.city);

    // Check for similar name (either exact match or one contains the other)
    const nameMatch = existingNormalizedName === normalizedName ||
      existingNormalizedName.includes(normalizedName) ||
      normalizedName.includes(existingNormalizedName);

    // Check venue similarity
    const venueMatch = existingNormalizedVenue === normalizedVenue ||
      (normalizedVenue && existingNormalizedVenue.includes(normalizedVenue)) ||
      (normalizedVenue && normalizedVenue.includes(existingNormalizedVenue));

    // Check city match
    const cityMatch = existingNormalizedCity === normalizedCity;

    // If name matches and either venue or city matches, it's a duplicate
    if (nameMatch && (venueMatch || cityMatch)) {
      return { isDuplicate: true, existingId: doc.id, existingSource: existing.metadata?.sourceName };
    }
  }

  return { isDuplicate: false };
}

// All 20 Maryland Macaroni Kid Sites
const MD_MK_SITES = [
  { url: 'https://annapolis.macaronikid.com', name: 'Annapolis', county: 'Anne Arundel' },
  { url: 'https://belairmd.macaronikid.com', name: 'Bel Air', county: 'Harford' },
  { url: 'https://bethesda.macaronikid.com', name: 'Bethesda-Chevy Chase-Potomac', county: 'Montgomery' },
  { url: 'https://bowie.macaronikid.com', name: 'Bowie-Crofton-Odenton', county: 'Anne Arundel' },
  { url: 'https://calvert.macaronikid.com', name: 'Calvert-St. Marys', county: 'Calvert' },
  { url: 'https://charlesmd.macaronikid.com', name: 'Charles', county: 'Charles' },
  { url: 'https://hyattsville.macaronikid.com', name: 'College Park-Hyattsville', county: 'Prince Georges' },
  { url: 'https://columbiamd.macaronikid.com', name: 'Columbia-Ellicott City-Western Howard', county: 'Howard' },
  { url: 'https://districtheights.macaronikid.com', name: 'District Heights', county: 'Prince Georges' },
  { url: 'https://essexmiddleriver.macaronikid.com', name: 'Essex-Middle River', county: 'Baltimore' },
  { url: 'https://frederick.macaronikid.com', name: 'Frederick', county: 'Frederick' },
  { url: 'https://jessup.macaronikid.com', name: 'Laurel-Hanover-Jessup', county: 'Howard' },
  { url: 'https://mtairy.macaronikid.com', name: 'Mt Airy-Damascus-Urbana', county: 'Montgomery' },
  { url: 'https://rockville.macaronikid.com', name: 'Olney-Rockville', county: 'Montgomery' },
  { url: 'https://pasadenamd.macaronikid.com', name: 'Pasadena-Severna Park-Glen Burnie', county: 'Anne Arundel' },
  { url: 'https://southbaltimore.macaronikid.com', name: 'South Baltimore', county: 'Baltimore' },
  { url: 'https://southernprincegeorge.macaronikid.com', name: 'Southern Prince Georges', county: 'Prince Georges' },
  { url: 'https://tpss.macaronikid.com', name: 'Takoma Park-Silver Spring', county: 'Montgomery' },
  { url: 'https://timonium.macaronikid.com', name: 'Timonium-North Baltimore', county: 'Baltimore' },
  { url: 'https://westminster.macaronikid.com', name: 'Westminster-Carroll', county: 'Carroll' }
];

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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    return await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const result = { name: '', eventDate: '', dayOfWeek: '', time: '', venue: '', address: '', city: '', zipCode: '', phone: '', cost: 'Contact for pricing', ageRange: 'All Ages', description: '', moreInfo: '' };

      const h1 = document.querySelector('h1');
      if (h1) result.name = h1.textContent.trim();

      // --- Extract location from structured HTML (locationbox) ---
      const locationName = document.querySelector('.location-name');
      if (locationName) result.venue = locationName.textContent.trim();

      const locationAddress = document.querySelector('.location-address');
      if (locationAddress) {
        const spans = locationAddress.querySelectorAll(':scope > span');
        for (const span of spans) {
          const text = span.textContent.trim().replace(/,\s*$/, ''); // strip trailing comma
          if (!text || span.querySelector('a')) continue; // skip Google Map link
          // Check for city/state/zip pattern (e.g., "Arnold  MD 21012" or "Arnold, MD 21012")
          const cityZipMatch = text.match(/^([\w\s]+?),?\s+MD\s+(\d{5})/);
          if (cityZipMatch) {
            result.city = cityZipMatch[1].trim();
            result.zipCode = cityZipMatch[2];
          } else if (/^\d+\s+/.test(text)) {
            // Street address starts with a number
            result.address = result.address ? result.address + ', ' + text : text;
          }
          // Skip non-address lines like "2nd Floor", "Suite 100" (append to address)
          else if (result.address && !result.city) {
            result.address = result.address + ', ' + text;
          }
        }
      }

      // --- Extract date/time from structured HTML (meta) ---
      const weekday = document.querySelector('.meta .weekday');
      if (weekday) result.dayOfWeek = weekday.textContent.trim();

      const startDate = document.querySelector('.meta .startDate');
      if (startDate) result.eventDate = startDate.textContent.trim();

      const startTime = document.querySelector('.meta .startTime');
      if (startTime) result.time = startTime.textContent.trim();

      // --- Fallback: text-based parsing if structured HTML didn't provide data ---
      let eventsIndex = -1, descIndex = -1, moreInfoIndex = -1, whoIndex = -1, costIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === 'EVENTS' || lines[i] === 'events') eventsIndex = i;
        if (lines[i] === 'Description') descIndex = i;
        if (lines[i] === 'More Info') moreInfoIndex = i;
        if (lines[i] === 'Who') whoIndex = i;
        if (lines[i] === 'Cost') costIndex = i;
      }

      if (!result.eventDate && eventsIndex > -1) {
        let idx = eventsIndex + 2;
        if (idx < lines.length && /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(lines[idx])) { if (!result.dayOfWeek) result.dayOfWeek = lines[idx]; idx++; }
        if (idx < lines.length) { const dateMatch = lines[idx].match(/^([A-Z][a-z]+\s+\d{1,2},\s+\d{4})$/); if (dateMatch) { result.eventDate = dateMatch[1]; idx++; }}
        // Match time patterns including "All Day", "All-Day", time ranges, and standard times
        if (idx < lines.length && (/\d{1,2}:\d{2}\s*(?:am|pm)/i.test(lines[idx]) || /^all[\s-]*day$/i.test(lines[idx]))) { if (!result.time) result.time = lines[idx]; idx++; }
        while (idx < lines.length && lines[idx].length === 0) idx++;
        // Skip invalid venue values (time-related phrases, placeholders, online platforms)
        const invalidVenuePatterns = /^(all[\s-]*day|see website|n\/a|various|tbd|tba|online|virtual|zoom|webinar|microsoft teams|google meet|skype|teams meeting|check website|contact for details|\d{1,2}:\d{2}\s*(am|pm)?)$/i;
        if (!result.venue && idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { result.venue = lines[idx]; idx++; }
        else if (!result.venue && idx < lines.length && invalidVenuePatterns.test(lines[idx])) { idx++; if (idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100 && !invalidVenuePatterns.test(lines[idx])) { result.venue = lines[idx]; idx++; }}
        if (!result.address && idx < lines.length && /^\d+\s+[\w\s]+/.test(lines[idx])) { result.address = lines[idx]; idx++; }
        if (!result.city && idx < lines.length) { const cityZipMatch = lines[idx].match(/^([\w\s]+?),?\s+MD\s+(\d{5})/); if (cityZipMatch) { result.city = cityZipMatch[1].trim(); result.zipCode = cityZipMatch[2]; idx++; }}
        if (!result.city && idx < lines.length) { const cityZipMatch2 = lines[idx].match(/^([\w\s]+?),?\s+MD\s+(\d{5})/); if (cityZipMatch2) { result.city = cityZipMatch2[1].trim(); result.zipCode = cityZipMatch2[2]; }}
      }

      if (descIndex > -1) { const descLines = []; for (let i = descIndex + 1; i < lines.length; i++) { if (lines[i] === 'More Info' || lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break; descLines.push(lines[i]); } result.description = descLines.join('\n\n'); }
      if (moreInfoIndex > -1) { const moreInfoLines = []; for (let i = moreInfoIndex + 1; i < lines.length; i++) { if (lines[i] === 'Who' || lines[i] === 'Cost' || lines[i].includes('Add to')) break; moreInfoLines.push(lines[i]); } result.moreInfo = moreInfoLines.join('\n\n'); }
      if (whoIndex > -1) { const whoLines = []; for (let i = whoIndex + 1; i < lines.length; i++) { if (lines[i] === 'Cost' || lines[i] === 'More Info' || lines[i].includes('Add to')) break; whoLines.push(lines[i]); } const whoText = whoLines.join(' '); if (whoText) result.ageRange = whoText; }
      if (costIndex > -1) { const costLines = []; for (let i = costIndex + 1; i < lines.length; i++) { const line = lines[i]; if (line === 'How' || line === 'More Info' || line.includes('Add to') || line === 'ADVERTISEMENTS' || line.startsWith('http')) break; costLines.push(line); if (costLines.join(' ').length > 150) break; } if (costLines.length > 0) { let costText = costLines.join(' ').substring(0, 150); if (costText.length === 150) { costText = costText.substring(0, costText.lastIndexOf(' ')) + '...'; } result.cost = costText; }}
      return result;
    });
  } catch (error) { return null; }
}

async function scrapeSite(browser, site, logger, maxEvents = 50) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${site.name} (${site.county} County)`);
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate 60 days from now
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  // Start tracking this site
  logger.startSite(site.name, site.url, { county: site.county, state: 'MD' });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto(`${site.url}/events/calendar`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    const eventUrls = await extractEventUrls(page);
    console.log(`  Found ${eventUrls.length} URLs`);
    logger.trackFound(eventUrls.length);

    let imported = 0, skippedPast = 0, skippedFuture = 0, noLocation = 0, skippedDuplicate = 0;

    for (const url of eventUrls) {
      // No maxEvents limit - only limit by date (60 days)
      const details = await extractEventDetails(page, url);
      if (!details || !details.eventDate) continue;
      const eventDate = new Date(details.eventDate);
      if (eventDate < today) { skippedPast++; logger.trackPastDate(); continue; }
      if (eventDate > maxDate) { skippedFuture++; logger.trackFutureDate(); continue; }
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
        logger.trackInvalid();
        continue;
      }

      // Check for online-only indicators in description
      const onlineIndicators = /\b(online\s+only|virtual\s+only|zoom\s+(?:meeting|call|link)|webinar|hosted?\s+(?:online|virtually)|no\s+physical\s+location)\b/i;
      if (onlineIndicators.test(details.description || '')) {
        console.log(`  ⏭️ Skipping online event: ${(details.name || '').substring(0, 40)}...`);
        logger.trackInvalid();
        continue;
      }

      // Skip events with insufficient location data (likely online-only)
      if (!details.venue && !details.address && !details.city) {
        console.log(`  ⏭️ Skipping no-location: ${(details.name || '').substring(0, 40)}...`);
        logger.trackInvalid();
        continue;
      }


      // --- EARLY DUPLICATE CHECKS (before any geocoding) ---

      // Check 1: Does this exact event already exist in DB with coordinates?
      const eventId = generateEventId(url);
      const existingDoc = await db.collection('events').doc(eventId).get();
      if (existingDoc.exists) {
        const existing = existingDoc.data();
        if (existing.geohash) {
          skippedDuplicate++;
          logger.trackDuplicate();
          continue;
        }
      }

      // Check 2: Cross-site duplicate (same event posted to multiple MK sites)
      const duplicateCheck = await isDuplicateEvent(
        details.name,
        details.eventDate,
        details.venue,
        details.city
      );
      if (duplicateCheck.isDuplicate) {
        skippedDuplicate++;
        logger.trackDuplicate();
        continue;
      }

      // --- VALIDATION ---

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
          state: 'MD',
          rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ⚠️ Rejected: ${details.name} - ${rejectionReason}`);
        continue;
      }

      // --- GEOCODING (no Nominatim — venue cache + centroid only) ---

      let coords = null;
      let locationObj = null;

      // Step 1: Check venue cache (no API calls)
      const matchedVenue = await findMatchingVenue({
        venue: details.venue,
        city: details.city,
        state: 'MD',
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
        }
      }

      // Step 2: County centroid fallback (no API calls)
      if (!coords) {
        const countyCentroid = getCountyCentroid(site.county, 'MD');
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
        } else {
          // Step 3: Save without coordinates rather than calling Nominatim
          locationObj = {
            address: details.address || '',
            city: details.city || '',
            zipCode: details.zipCode || '',
            name: details.venue || 'See website'
          };
          noLocation++;
          logger.trackNoCoords();
        }
      }

      // --- BUILD EVENT DOC ---

      const normalizedDate = normalizeDateString(details.eventDate) || details.eventDate;
      const parsedTime = parseTimeString(details.time);

      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: details.name,
        description: details.description
      });

      const eventDoc = {
        name: details.name,
        venue: details.venue || 'See website',
        eventDate: normalizedDate,
        startTime: parsedTime.startTime || null,
        endTime: parsedTime.endTime || null,
        description: details.description,
        url: url,
        state: 'MD',
        location: {
          ...locationObj,
          state: 'MD'
        },
        metadata: {
          sourceUrl: url,
          scraperName: 'MacaroniKid-MD',
          scrapedAt: new Date().toISOString(),
          category: parentCategory,
          platform: 'macaroni-kid',
          sourceName: `Macaroni Kid ${site.name}`,
          county: site.county,
          state: 'MD'
        }
      };

      if (coords) {
        eventDoc.geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      }

      const activityId = await getOrCreateVenue({
        venue: details.venue,
        city: details.city || locationObj?.city,
        state: 'MD',
        address: details.address || locationObj?.address,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        zipCode: details.zipCode || locationObj?.zipCode
      }, { category: parentCategory, subcategory: subcategory });

      if (activityId) {
        eventDoc.activityId = activityId;
      }

      events.push(eventDoc);
      imported++;
      logger.trackNew();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`  ✅ ${imported} new | 🔄 ${skippedDuplicate} dup | ⏭️ ${skippedPast} past | ⏩ ${skippedFuture} future | ⚠️ ${noLocation} no coords`);
    await page.close();
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    logger.trackError(error);
    // Re-throw browser/protocol errors so main loop can restart browser
    if (error.message.includes('Protocol error') || error.message.includes('Connection closed') || error.message.includes('Target closed')) {
      logger.endSite();
      throw error;
    }
  }
  logger.endSite();
  return events;
}

async function scrapeMacaroniKidMaryland() {
  const fullMode = true; // PRODUCTION: All 20 sites
  console.log('🥕 MARYLAND MACARONI KID SCRAPER\n' + '='.repeat(60));
  const sitesToScrape = fullMode ? MD_MK_SITES : MD_MK_SITES.slice(0, 5);
  const maxEventsPerSite = fullMode ? 999 : 30; // No limit - filtered by 60 day date range
  console.log(`Mode: ${fullMode ? 'FULL (all 20 sites)' : 'LIMITED (5 sites)'}\nDate range: Next 60 days\n`);

  // Create logger with per-site tracking
  const logger = new ScraperLogger('Macaroni Kid MD', 'events', { state: 'MD', source: 'macaroni-kid' });

  let browser = null;
  let imported = 0;
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

      const events = await scrapeSite(browser, site, logger, maxEventsPerSite);
      for (const event of events) {
        const eventId = generateEventId(event.url);
        if (imported === 0) {
          console.log(`  🕐 Time debug: { name: "${event.name?.substring(0, 40)}", startTime: ${JSON.stringify(event.startTime)}, endTime: ${JSON.stringify(event.endTime)} }`);
        }
        await db.collection('events').doc(eventId).set(event);
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
  console.log('✅ MARYLAND MACARONI KID SCRAPER COMPLETE!');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log('='.repeat(60) + '\n');

  // Log to Firestore with per-site breakdown
  await logger.finish();

  return { imported, failed };
}

if (require.main === module) {
  scrapeMacaroniKidMaryland()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMacaroniKidMaryland };

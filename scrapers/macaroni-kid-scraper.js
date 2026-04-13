#!/usr/bin/env node

/**
 * MACARONI KID PRODUCTION SCRAPER
 * 
 * Usage:
 *   node macaroni-kid-scraper.js          # Test mode (5 sites)
 *   node macaroni-kid-scraper.js --full   # Production (all 27 sites)
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./scripts/event-categorization-helper');

// All 27 Maryland Macaroni Kid Sites
const MARYLAND_MK_SITES = [
  { url: 'https://pasadenamd.macaronikid.com', name: 'Pasadena-Severna Park', county: 'Anne Arundel' },
  { url: 'https://belairmd.macaronikid.com', name: 'Bel Air', county: 'Harford' },
  { url: 'https://bethesda.macaronikid.com', name: 'Bethesda', county: 'Montgomery' },
  { url: 'https://bowie.macaronikid.com', name: 'Bowie', county: 'Prince George\'s' },
  { url: 'https://calvert.macaronikid.com', name: 'Calvert County', county: 'Calvert' },
  { url: 'https://cecil.macaronikid.com', name: 'Cecil County', county: 'Cecil' },
  { url: 'https://charlesmd.macaronikid.com', name: 'Charles County', county: 'Charles' },
  { url: 'https://columbiamd.macaronikid.com', name: 'Columbia', county: 'Howard' },
  { url: 'https://districtheights.macaronikid.com', name: 'District Heights', county: 'Prince George\'s' },
  { url: 'https://easternshore.macaronikid.com', name: 'Eastern Shore', county: 'Multiple' },
  { url: 'https://essexmiddleriver.macaronikid.com', name: 'Essex-Middle River', county: 'Baltimore' },
  { url: 'https://frederick.macaronikid.com', name: 'Frederick', county: 'Frederick' },
  { url: 'https://germantown.macaronikid.com', name: 'Germantown', county: 'Montgomery' },
  { url: 'https://hagerstown.macaronikid.com', name: 'Hagerstown', county: 'Washington' },
  { url: 'https://hyattsville.macaronikid.com', name: 'Hyattsville', county: 'Prince George\'s' },
  { url: 'https://jessup.macaronikid.com', name: 'Jessup', county: 'Howard' },
  { url: 'https://mtairy.macaronikid.com', name: 'Mt. Airy', county: 'Carroll' },
  { url: 'https://northeastbaltimore.macaronikid.com', name: 'Northeast Baltimore', county: 'Baltimore' },
  { url: 'https://northwestbaltimore.macaronikid.com', name: 'Northwest Baltimore', county: 'Baltimore' },
  { url: 'https://owingsmills.macaronikid.com', name: 'Owings Mills', county: 'Baltimore' },
  { url: 'https://queenannes.macaronikid.com', name: 'Queen Anne\'s County', county: 'Queen Anne\'s' },
  { url: 'https://rockville.macaronikid.com', name: 'Rockville', county: 'Montgomery' },
  { url: 'https://southbaltimore.macaronikid.com', name: 'South Baltimore', county: 'Baltimore' },
  { url: 'https://southernprincegeorge.macaronikid.com', name: 'Southern Prince George\'s', county: 'Prince George\'s' },
  { url: 'https://timonium.macaronikid.com', name: 'Timonium', county: 'Baltimore' },
  { url: 'https://tpss.macaronikid.com', name: 'Takoma Park-Silver Spring', county: 'Montgomery' },
  { url: 'https://westminster.macaronikid.com', name: 'Westminster', county: 'Carroll' }
];

async function geocodeAddress(address, city, zipCode) {
  const fullAddress = `${address}, ${city}, MD ${zipCode}`;
  let result = await tryGeocode(fullAddress);
  if (result) return result;
  
  const cleaned = address.replace(/,?\s*Suite\s+[A-Z0-9-]+/i, '').replace(/,?\s*#\s*[A-Z0-9-]+/i, '');
  if (cleaned !== address) {
    result = await tryGeocode(`${cleaned}, ${city}, MD ${zipCode}`);
    if (result) return result;
  }
  
  const streetOnly = cleaned.split(',')[0];
  return await tryGeocode(`${streetOnly}, MD ${zipCode}`);
}

async function tryGeocode(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'SocialSpot/1.0' }
    });
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {}
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
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
        if (idx < lines.length && /\d{1,2}:\d{2}\s*(?:am|pm)/i.test(lines[idx])) { result.time = lines[idx]; idx++; }
        while (idx < lines.length && lines[idx].length === 0) idx++;
        if (idx < lines.length && !/^\d/.test(lines[idx]) && lines[idx].length < 100) { if (!result.venue) result.venue = lines[idx]; idx++; }
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
  console.log(`\n📍 ${site.name} (${site.county} County)`);
  const events = []; const today = new Date(); today.setHours(0, 0, 0, 0);
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto(`${site.url}/events/calendar`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventUrls = await extractEventUrls(page);
    console.log(`  Found ${eventUrls.length} URLs`);
    
    let imported = 0, updated = 0, skippedPast = 0, failedGeocode = 0, noLocation = 0;

    for (const url of eventUrls) {
      if (imported >= maxEvents) break;
      const details = await extractEventDetails(page, url);
      if (!details || !details.eventDate) continue;
      // Skip events with empty/null names (prevents DB errors)
      if (!details.name || !details.name.trim()) {
        console.log(`  ⏭️ Skipping event with no name: ${url}`);
        continue;
      }
      const eventDate = new Date(details.eventDate);
      if (eventDate < today) { skippedPast++; continue; }

      // Try to get coordinates, but don't skip event if we can't
      let coords = null;
      let locationObj = null;

      if (details.address && details.city && details.zipCode) {
        coords = await geocodeAddress(details.address, details.city, details.zipCode);
      }

      if (coords) {
        // Build location object with coordinates
        locationObj = {
          address: details.address,
          city: details.city,
          zipCode: details.zipCode,
          coordinates: coords
        };

        // If we have a venue, add it to location.name as well for fallback
        if (details.venue && details.venue.trim()) {
          locationObj.name = details.venue;
        }
      } else {
        // No coordinates - save what we have
        failedGeocode++;
        locationObj = {
          address: details.address || '',
          city: details.city || '',
          zipCode: details.zipCode || '',
          name: details.venue || 'See website'
        };
        noLocation++;
      }

      // Use categorization helper for proper category assignment
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: details.name,
        description: details.description
      });

      // Validate schedule data - save to rejected collection if invalid
      const invalidPhrases = ['stationed', 'retiring', 'my ', 'i was', 'he was', 'she was', 'because', 'although', 'however', 'therefore'];
      const scheduleText = `${details.dayOfWeek} ${details.eventDate} ${details.time}`.toLowerCase();

      let rejectionReason = null;

      if (invalidPhrases.some(phrase => scheduleText.includes(phrase))) {
        rejectionReason = 'Invalid schedule data - contains narrative text';
      } else if (!details.eventDate.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{2,4})/i)) {
        rejectionReason = 'Malformed date - does not contain valid date pattern';
      }

      if (rejectionReason) {
        // Save to rejected_events collection for review
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
          rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ⚠️ Rejected: ${details.name} - ${rejectionReason}`);
        continue;
      }

      const eventDoc = {
        name: details.name, venue: details.venue || 'See website', eventDate: details.eventDate,
        scheduleDescription: `${details.dayOfWeek}, ${details.eventDate}${details.time ? ' at ' + details.time : ''}`,
        parentCategory, displayCategory, subcategory,
        ageRange: details.ageRange, cost: details.cost, description: details.description, moreInfo: details.moreInfo || '',
        location: locationObj,
        contact: { website: url, phone: details.phone || '' }, url: url,
        metadata: { source: 'Macaroni Kid Scraper', sourceName: `Macaroni Kid ${site.name}`, county: site.county, addedDate: admin.firestore.FieldValue.serverTimestamp() }
      };

      // Only add geohash if we have coordinates
      if (coords) {
        eventDoc.geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      }
      
      // Check for duplicates using URL as unique identifier (more reliable than name+date)
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
      // Skipping duplicate logging to reduce noise in Cloud Functions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`  ✅ ${imported} new | 🔄 ${updated} updated | ⏭️ ${skippedPast} past | ⚠️ ${noLocation} no coords`);
    await page.close();
  } catch (error) { console.error(`  ❌ Error: ${error.message}`); }
  return events;
}

async function scrapeMacaroniKid() {
  const fullMode = false; // Use limited mode for Cloud Functions
  console.log('🥕 MACARONI KID PRODUCTION SCRAPER\n' + '='.repeat(60));
  const sitesToScrape = fullMode ? MARYLAND_MK_SITES : MARYLAND_MK_SITES.slice(0, 5);
  const maxEventsPerSite = fullMode ? 50 : 30;
  console.log(`Mode: ${fullMode ? 'FULL (all 27 sites)' : 'LIMITED (5 sites)'}\nMax events per site: ${maxEventsPerSite}\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  try {
    for (const site of sitesToScrape) {
      try {
        const events = await scrapeSite(browser, site, maxEventsPerSite);
        for (const event of events) {
          await db.collection('events').add(event);
          imported++;
        }
      } catch (error) {
        console.error(`❌ Error scraping ${site.name}:`, error.message);
        failed++;
      }
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('✅ MACARONI KID SCRAPER COMPLETE!');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log('='.repeat(60) + '\n');

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeMacaroniKid()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMacaroniKid };

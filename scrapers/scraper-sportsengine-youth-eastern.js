#!/usr/bin/env node

/**
 * SPORTSENGINE YOUTH SPORTS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for youth sports camps, clinics, tournaments,
 * and family fun runs from SportsEngine across 28 eastern US states.
 *
 * SOURCE: SportsEngine Play discovery — https://discover.sportsengineplay.com/
 * Searches by metro area for upcoming youth/family sports events.
 *
 * COVERAGE: 28 states (AL, CT, DC, DE, FL, GA, IA, IL, IN, KY, MA, MD, ME,
 *           MN, MS, NC, NH, NJ, NY, OH, PA, RI, SC, TN, VA, VT, WI, WV)
 *
 * Usage:
 *   node scrapers/scraper-sportsengine-youth-eastern.js                    # All locations
 *   node scrapers/scraper-sportsengine-youth-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-sportsengine-youth-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-sportsengine-youth-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeSportsEngineYouthCloudFunction
 * Registry: Group 2
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'SportsEngine-Youth-Eastern';
const BASE_URL = 'https://discover.sportsengineplay.com/';

// ==========================================
// METRO LOCATIONS (~2-3 per state, 28 states)
// ==========================================
const LOCATIONS = [
  // Alabama
  { city: 'Birmingham', state: 'AL', lat: 33.5186, lng: -86.8104 },
  { city: 'Huntsville', state: 'AL', lat: 34.7304, lng: -86.5861 },
  { city: 'Mobile', state: 'AL', lat: 30.6954, lng: -88.0399 },
  // Connecticut
  { city: 'Hartford', state: 'CT', lat: 41.7658, lng: -72.6734 },
  { city: 'New Haven', state: 'CT', lat: 41.3083, lng: -72.9279 },
  { city: 'Stamford', state: 'CT', lat: 41.0534, lng: -73.5387 },
  // DC
  { city: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  // Delaware
  { city: 'Wilmington', state: 'DE', lat: 39.7391, lng: -75.5398 },
  { city: 'Dover', state: 'DE', lat: 39.1582, lng: -75.5244 },
  // Florida
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  // Georgia
  { city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { city: 'Savannah', state: 'GA', lat: 32.0809, lng: -81.0912 },
  { city: 'Augusta', state: 'GA', lat: 33.4735, lng: -81.9748 },
  // Iowa
  { city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.625 },
  { city: 'Cedar Rapids', state: 'IA', lat: 41.9779, lng: -91.6656 },
  { city: 'Davenport', state: 'IA', lat: 41.5236, lng: -90.5776 },
  // Illinois
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Springfield', state: 'IL', lat: 39.7817, lng: -89.6501 },
  { city: 'Rockford', state: 'IL', lat: 42.2711, lng: -89.094 },
  // Indiana
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { city: 'Fort Wayne', state: 'IN', lat: 41.0793, lng: -85.1394 },
  { city: 'South Bend', state: 'IN', lat: 41.6764, lng: -86.2520 },
  // Kentucky
  { city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { city: 'Lexington', state: 'KY', lat: 38.0406, lng: -84.5037 },
  // Massachusetts
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'Worcester', state: 'MA', lat: 42.2626, lng: -71.8023 },
  { city: 'Springfield', state: 'MA', lat: 42.1015, lng: -72.5898 },
  // Maryland
  { city: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { city: 'Rockville', state: 'MD', lat: 39.084, lng: -77.1528 },
  { city: 'Frederick', state: 'MD', lat: 39.4143, lng: -77.4105 },
  // Maine
  { city: 'Portland', state: 'ME', lat: 43.6591, lng: -70.2568 },
  { city: 'Bangor', state: 'ME', lat: 44.8016, lng: -68.7712 },
  // Minnesota
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
  { city: 'Rochester', state: 'MN', lat: 44.0121, lng: -92.4802 },
  { city: 'Duluth', state: 'MN', lat: 46.7867, lng: -92.1005 },
  // Mississippi
  { city: 'Jackson', state: 'MS', lat: 32.2988, lng: -90.1848 },
  { city: 'Gulfport', state: 'MS', lat: 30.3674, lng: -89.0928 },
  // North Carolina
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { city: 'Greensboro', state: 'NC', lat: 36.0726, lng: -79.7920 },
  // New Hampshire
  { city: 'Manchester', state: 'NH', lat: 42.9956, lng: -71.4548 },
  { city: 'Nashua', state: 'NH', lat: 42.7654, lng: -71.4676 },
  // New Jersey
  { city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  { city: 'Trenton', state: 'NJ', lat: 40.2171, lng: -74.7429 },
  { city: 'Cherry Hill', state: 'NJ', lat: 39.9348, lng: -75.0307 },
  // New York
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { city: 'Buffalo', state: 'NY', lat: 42.8864, lng: -78.8784 },
  { city: 'Syracuse', state: 'NY', lat: 43.0481, lng: -76.1474 },
  { city: 'Albany', state: 'NY', lat: 42.6526, lng: -73.7562 },
  // Ohio
  { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { city: 'Cincinnati', state: 'OH', lat: 39.1031, lng: -84.512 },
  // Pennsylvania
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
  { city: 'Harrisburg', state: 'PA', lat: 40.2732, lng: -76.8867 },
  // Rhode Island
  { city: 'Providence', state: 'RI', lat: 41.824, lng: -71.4128 },
  { city: 'Warwick', state: 'RI', lat: 41.7001, lng: -71.4162 },
  // South Carolina
  { city: 'Charleston', state: 'SC', lat: 32.7765, lng: -79.9311 },
  { city: 'Columbia', state: 'SC', lat: 34.0007, lng: -81.0348 },
  { city: 'Greenville', state: 'SC', lat: 34.8526, lng: -82.394 },
  // Tennessee
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { city: 'Knoxville', state: 'TN', lat: 35.9606, lng: -83.9207 },
  // Virginia
  { city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.436 },
  { city: 'Virginia Beach', state: 'VA', lat: 36.8529, lng: -75.978 },
  { city: 'Arlington', state: 'VA', lat: 38.8799, lng: -77.1068 },
  // Vermont
  { city: 'Burlington', state: 'VT', lat: 44.4759, lng: -73.2121 },
  { city: 'Montpelier', state: 'VT', lat: 44.2601, lng: -72.5754 },
  // Wisconsin
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { city: 'Madison', state: 'WI', lat: 43.0731, lng: -89.4012 },
  { city: 'Green Bay', state: 'WI', lat: 44.5133, lng: -88.0133 },
  // West Virginia
  { city: 'Charleston', state: 'WV', lat: 38.3498, lng: -81.6326 },
  { city: 'Morgantown', state: 'WV', lat: 39.6295, lng: -79.9559 },
];

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|burlesque|nightclub|strip\s*club|lingerie|cannabis|hemp\s*fest|happy\s*hour)\b/i;

// Keywords indicating ongoing league registrations (skip these)
const LEAGUE_REG_PATTERNS = /\b(league\s*registration|season\s*registration|sign[\s-]?up\s*for\s*(spring|fall|winter|summer)\s*league|recurring\s*league)\b/i;

// Keywords indicating family-relevant sports events (keep these)
const FAMILY_SPORTS_PATTERNS = /\b(camp|clinic|tournament|fun\s*run|family\s*run|5k|youth|kids?|junior|pee\s*wee|little\s*league|t-ball|tee[\s-]?ball|soccer|baseball|basketball|lacrosse|flag\s*football|swim\s*meet|track\s*meet|skills?\s*camp|sports?\s*camp|all[\s-]?star|jamboree|invitational|showcase|training|lesson|class|academy)\b/i;

// ==========================================
// SCRAPE THE SPORTSENGINE DISCOVERY PAGE
// ==========================================
// NOTE: The SportsEngine Play discovery page (discover.sportsengineplay.com)
// shows the same promoted programs regardless of lat/lng params — the URL
// parameters are cosmetic. The page renders ~4 featured .se-program-card
// elements via a WordPress widget. We scrape these once per run.
//
// The scraper also visits individual org program pages found on the
// discovery page to get richer event data per location.

async function scrapeDiscoveryPage(browser) {
  console.log(`\n  🌐 Scraping SportsEngine Play discovery page...`);
  console.log(`     ${BASE_URL}`);

  const events = [];

  try {
    const page = await createStealthPage(browser);

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 45000 });

    // Wait for content to load
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to trigger lazy loading of program cards
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 800));
    }

    // Extract from .se-program-card elements (the real program listings)
    const rawEvents = await page.evaluate(() => {
      const results = [];

      // Strategy 1: Extract from .se-program-card (featured programs near you)
      const programCards = document.querySelectorAll('.se-program-card');
      programCards.forEach(card => {
        try {
          // Get the header content which contains org + title
          const headerEl = card.querySelector('.se-program-card__header');
          const headerText = headerEl ? headerEl.textContent.trim() : '';
          if (!headerText || headerText.length < 4) return;

          // Get org name (first line) and program title (second line)
          const contentEl = card.querySelector('.se-program-card__content');
          const contentText = contentEl ? contentEl.textContent.trim() : '';

          // Extract org name and title from the content block
          // Format: "Org Name    Program Title\n  Sports Offered\n  SportType"
          const lines = contentText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          // The first meaningful chunk often has "OrgName    Title" with lots of spaces
          const firstLine = lines[0] || '';
          // Split by multiple spaces to separate org from title
          const parts = firstLine.split(/\s{3,}/);
          const orgName = parts[0] || '';
          const programTitle = parts[1] || parts[0] || '';

          // Sport type
          const sportEl = card.querySelector('.se-program-card__sport, [class*="sport"]');
          let sportType = '';
          if (sportEl) {
            sportType = sportEl.textContent.replace('Sports Offered', '').trim();
          }

          // Date from the card
          const dateEl = card.querySelector('.se-program-card__date, [class*="date"], time');
          const dateText = dateEl ? dateEl.textContent.trim() : '';

          // Price from footer
          const footerEl = card.querySelector('.se-program-card__footer');
          const price = footerEl ? footerEl.textContent.trim() : '';

          // Link to the program
          const linkEl = card.closest('a') || card.querySelector('a[href*="sportsengine.com"]');
          const url = linkEl ? linkEl.href : '';

          // Image
          const imgEl = card.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';

          // Distance/type info
          const infoEl = card.querySelector('.se-program-card__info, [class*="distance"], [class*="info"]');
          const info = infoEl ? infoEl.textContent.trim() : '';

          results.push({
            title: programTitle || headerText,
            orgName,
            dateText,
            venue: orgName,
            description: `${programTitle} by ${orgName}. ${sportType ? 'Sport: ' + sportType + '.' : ''} ${info}`.trim(),
            imageUrl,
            url,
            ageRange: '',
            sportType,
            price,
          });
        } catch (e) {
          // Skip individual card errors
        }
      });

      // Strategy 2: Look for JSON-LD structured data
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            if (item['@type'] === 'Event' || item['@type'] === 'SportsEvent') {
              results.push({
                title: item.name || '',
                orgName: '',
                dateText: item.startDate || '',
                venue: item.location?.name || '',
                description: (item.description || '').substring(0, 1000),
                imageUrl: item.image || '',
                url: item.url || '',
                ageRange: '',
                sportType: '',
                price: '',
              });
            }
          });
        } catch (e) {
          // Skip JSON parse errors
        }
      });

      return results;
    });

    console.log(`     📋 Found ${rawEvents.length} program listings`);

    // Filter and build event objects
    const seenTitles = new Set();

    for (const raw of rawEvents) {
      const combined = `${raw.title} ${raw.description}`;

      // Skip non-family events
      if (NON_FAMILY_PATTERNS.test(combined)) continue;

      // Deduplicate by title
      const titleKey = raw.title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      // Parse date range — format: "Jan 17, 2026 - Oct 25, 2026"
      let parsedDate = '';
      let eventDateStr = '';
      if (raw.dateText) {
        // Try to parse start date from range like "Jan 17, 2026 - Oct 25, 2026"
        const rangeMatch = raw.dateText.match(/(\w+\s+\d{1,2},?\s*\d{4})/);
        if (rangeMatch) {
          const d = new Date(rangeMatch[1] + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
            eventDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          }
        }
      }

      // Build full URL
      let eventUrl = raw.url || '';
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = `https://www.sportsengine.com${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}`;
      }
      if (!eventUrl) {
        eventUrl = BASE_URL;
      }

      // Use "United States" as generic location since discovery page doesn't localize
      events.push({
        title: raw.title,
        eventDate: eventDateStr || raw.dateText || '',
        date: parsedDate,
        description: raw.description || `${raw.title} - Youth sports program on SportsEngine`,
        venueName: raw.venue || raw.orgName || '',
        city: '',
        state: '',
        url: eventUrl,
        image_url: raw.imageUrl || '',
        category: 'Sports & Recreation',
        age_range: raw.ageRange || '',
        source_url: BASE_URL,
        details: {
          address: '',
        },
      });
    }

    console.log(`     ✅ ${events.length} unique family-friendly programs`);
    await page.close();
  } catch (err) {
    console.error(`     ❌ Failed: ${err.message}`);
  }

  return events;
}

// ==========================================
// SCRAPE INDIVIDUAL ORG PROGRAM PAGES
// ==========================================
// Visit org program pages found on the discovery page to get richer data.
// Each org page at sportsengine.com/org/{slug} lists upcoming programs
// with location, dates, and registration info.

async function scrapeOrgPage(browser, url, orgName) {
  console.log(`\n  🏢 Scraping org: ${orgName}`);
  console.log(`     ${url}`);

  const events = [];
  let page;

  try {
    page = await createStealthPage(browser);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const rawPrograms = await page.evaluate(() => {
      const results = [];

      // Look for program listing cards on the org page
      const cards = document.querySelectorAll(
        '.program-card, .se-program-card, [class*="program-listing"], ' +
        'a[href*="/program/"], [class*="registration-card"]'
      );

      cards.forEach(card => {
        try {
          const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 4) return;

          const dateEl = card.querySelector('[class*="date"], time, [datetime]');
          const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';

          const locEl = card.querySelector('[class*="location"], [class*="venue"], [class*="address"]');
          const venue = locEl ? locEl.textContent.trim() : '';

          const descEl = card.querySelector('[class*="desc"], p, [class*="summary"]');
          const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

          const linkEl = card.tagName === 'A' ? card : card.querySelector('a');
          const link = linkEl ? linkEl.href : '';

          const sportEl = card.querySelector('[class*="sport"], [class*="category"]');
          const sportType = sportEl ? sportEl.textContent.trim() : '';

          results.push({ title, dateText, venue, description, url: link, sportType });
        } catch (e) {}
      });

      return results;
    });

    console.log(`     📋 Found ${rawPrograms.length} programs on org page`);

    for (const raw of rawPrograms) {
      const combined = `${raw.title} ${raw.description}`;
      if (NON_FAMILY_PATTERNS.test(combined)) continue;

      let parsedDate = '';
      let eventDateStr = '';
      if (raw.dateText) {
        const dateMatch = raw.dateText.match(/(\w+\s+\d{1,2},?\s*\d{4})/);
        if (dateMatch) {
          const d = new Date(dateMatch[1] + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
            eventDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          }
        }
      }

      events.push({
        title: raw.title,
        eventDate: eventDateStr || raw.dateText || '',
        date: parsedDate,
        description: raw.description || `${raw.title} by ${orgName}`,
        venueName: raw.venue || orgName,
        city: '',
        state: '',
        url: raw.url || url,
        image_url: '',
        category: 'Sports & Recreation',
        age_range: '',
        source_url: url,
        details: { address: raw.venue || '' },
      });
    }

    console.log(`     ✅ ${events.length} family-friendly programs`);
    await page.close();
  } catch (err) {
    console.error(`     ❌ Failed: ${err.message}`);
    if (page) await page.close().catch(() => {});
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapeSportsEngineYouth(filterStates = null) {
  console.log('\n\x1b[33m⚽🏀━━━━━━━━━━━━━ SPORTSENGINE YOUTH SPORTS SCRAPER ━━━━━━━━━━━━━━⚽🏀\x1b[0m');
  console.log(`🌐 Source: SportsEngine Play Discovery`);
  console.log(`   Note: Discovery page shows the same featured programs regardless of location.`);
  console.log(`   Scraping once, then visiting individual org pages for additional programs.\n`);

  const browser = await launchBrowser();
  let allEvents = [];

  try {
    // Step 1: Scrape the discovery page (returns ~4-10 featured programs)
    const discoveryEvents = await scrapeDiscoveryPage(browser);
    allEvents.push(...discoveryEvents);

    // Step 2: Collect org page URLs from discovery results and visit them
    const orgUrls = new Set();
    for (const evt of discoveryEvents) {
      if (evt.url && evt.url.includes('sportsengine.com') && !evt.url.includes('discover.sportsengineplay.com')) {
        // Extract org base URL from program URL
        // e.g. https://www.sportsengine.com/org/some-org/program/123 → org page
        const orgMatch = evt.url.match(/(https:\/\/www\.sportsengine\.com\/org\/[^/]+)/);
        if (orgMatch) {
          orgUrls.add(orgMatch[1]);
        }
      }
    }

    if (orgUrls.size > 0) {
      console.log(`\n  🔗 Found ${orgUrls.size} unique org pages to visit for more programs`);

      for (const orgUrl of orgUrls) {
        const orgName = orgUrl.split('/org/')[1] || 'Unknown Org';
        const orgEvents = await scrapeOrgPage(browser, orgUrl, orgName);

        // Deduplicate against discovery events
        for (const oe of orgEvents) {
          const isDupe = allEvents.some(e =>
            e.title.toLowerCase().trim() === oe.title.toLowerCase().trim()
          );
          if (!isDupe) {
            allEvents.push(oe);
          }
        }

        // Polite delay between org pages
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Step 3: If state filter is set, only keep events matching those states
    // (events from discovery page may not have state set, so we keep those too)
    if (filterStates && filterStates.length > 0) {
      allEvents = allEvents.filter(e =>
        !e.state || filterStates.includes(e.state.toUpperCase())
      );
    }

    // Step 4: Save events
    if (allEvents.length > 0 && !DRY_RUN) {
      console.log(`\n💾 Saving ${allEvents.length} events...`);

      const venues = allEvents.map(e => ({
        name: e.venueName || e.title,
        city: e.city || '',
        state: e.state || '',
      }));

      try {
        const result = await saveEventsWithGeocoding(
          allEvents,
          venues,
          {
            scraperName: SCRAPER_NAME,
            state: 'US',
            category: 'Sports & Recreation',
            platform: 'sportsengine',
          }
        );
        const saved = result?.saved || result?.new || result?.imported || 0;
        console.log(`   💾 Saved: ${saved}`);
      } catch (err) {
        console.error(`   ❌ Save error: ${err.message}`);
      }
    } else if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN — ${allEvents.length} events extracted but NOT saved`);
      for (const evt of allEvents) {
        console.log(`   • ${evt.title} | ${evt.eventDate || 'no date'} | ${evt.venueName || 'no venue'}`);
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  console.log('\n\x1b[33m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events: ${allEvents.length}`);
  if (allEvents.length > 0) {
    console.log(`Programs:`);
    for (const evt of allEvents) {
      console.log(`  • ${evt.title}${evt.eventDate ? ' (' + evt.eventDate + ')' : ''}`);
    }
  }

  logScraperResult(SCRAPER_NAME, {
    found: allEvents.length,
    new: allEvents.length,
    duplicates: 0,
  });

  return { total: allEvents.length };
}

// ==========================================
// CLI & CLOUD FUNCTION EXPORTS
// ==========================================

const args = process.argv.slice(2);
const stateArgIdx = args.findIndex(a => a === '--state');
const DRY_RUN = args.includes('--dry');

if (require.main === module) {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapeSportsEngineYouth(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeSportsEngineYouthCloudFunction() {
  try {
    const result = await scrapeSportsEngineYouth();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeSportsEngineYouth,
  scrapeSportsEngineYouthCloudFunction,
};

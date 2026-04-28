#!/usr/bin/env node

/**
 * SIMPLEVIEW TOURISM BUREAU EVENTS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for family events from Convention & Visitor Bureau
 * websites powered by Simpleview CMS across 28 eastern US states.
 *
 * SOURCE: CVB event calendars — tourism bureau websites with event listings
 * Simpleview-powered sites share common calendar module patterns.
 *
 * COVERAGE: 28 states (AL, CT, DC, DE, FL, GA, IA, IL, IN, KY, MA, MD, ME,
 *           MN, MS, NC, NH, NJ, NY, OH, PA, RI, SC, TN, VA, VT, WI, WV)
 *
 * Usage:
 *   node scrapers/scraper-simpleview-tourism-eastern.js                    # All CVBs
 *   node scrapers/scraper-simpleview-tourism-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-simpleview-tourism-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-simpleview-tourism-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeSimpleviewTourismCloudFunction
 * Registry: Group 3
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'Simpleview-Tourism-Eastern';

// ==========================================
// CVB SITES CONFIG (~1-3 per state, 28 states)
// ==========================================
const CVB_SITES = [
  // Alabama
  { name: 'Visit Alabama', url: 'https://www.alabama.travel', eventsUrl: 'https://www.alabama.travel/events', city: 'Montgomery', state: 'AL' },
  { name: 'Visit Birmingham', url: 'https://www.visitbirmingham.com', eventsUrl: 'https://www.visitbirmingham.com/events/', city: 'Birmingham', state: 'AL' },
  // Connecticut
  { name: 'Visit Connecticut', url: 'https://www.ctvisit.com', eventsUrl: 'https://www.ctvisit.com/events', city: 'Hartford', state: 'CT' },
  { name: 'Visit New Haven', url: 'https://www.visitnewhaven.com', eventsUrl: 'https://www.visitnewhaven.com/events/', city: 'New Haven', state: 'CT' },
  // DC
  { name: 'Washington DC', url: 'https://washington.org', eventsUrl: 'https://washington.org/events', city: 'Washington', state: 'DC' },
  // Delaware
  { name: 'Visit Delaware', url: 'https://www.visitdelaware.com', eventsUrl: 'https://www.visitdelaware.com/events/', city: 'Dover', state: 'DE' },
  // Florida
  { name: 'Visit Florida', url: 'https://www.visitflorida.com', eventsUrl: 'https://www.visitflorida.com/things-to-do/events/', city: 'Tallahassee', state: 'FL' },
  { name: 'Visit Orlando', url: 'https://www.visitorlando.com', eventsUrl: 'https://www.visitorlando.com/things-to-do/events/', city: 'Orlando', state: 'FL' },
  { name: 'Visit Tampa Bay', url: 'https://www.visittampabay.com', eventsUrl: 'https://www.visittampabay.com/events/', city: 'Tampa', state: 'FL' },
  // Georgia
  { name: 'Discover Atlanta', url: 'https://discoveratlanta.com', eventsUrl: 'https://discoveratlanta.com/events/', city: 'Atlanta', state: 'GA' },
  { name: 'Visit Savannah', url: 'https://www.visitsavannah.com', eventsUrl: 'https://www.visitsavannah.com/events/', city: 'Savannah', state: 'GA' },
  // Iowa
  { name: 'Travel Iowa', url: 'https://www.traveliowa.com', eventsUrl: 'https://www.traveliowa.com/events/', city: 'Des Moines', state: 'IA' },
  { name: 'Catch Des Moines', url: 'https://www.catchdesmoines.com', eventsUrl: 'https://www.catchdesmoines.com/events/', city: 'Des Moines', state: 'IA' },
  // Illinois
  { name: 'Enjoy Illinois', url: 'https://www.enjoyillinois.com', eventsUrl: 'https://www.enjoyillinois.com/events/', city: 'Springfield', state: 'IL' },
  { name: 'Choose Chicago', url: 'https://www.choosechicago.com', eventsUrl: 'https://www.choosechicago.com/events/', city: 'Chicago', state: 'IL' },
  // Indiana
  { name: 'Visit Indiana', url: 'https://www.visitindiana.com', eventsUrl: 'https://www.visitindiana.com/events/', city: 'Indianapolis', state: 'IN' },
  { name: 'Visit Indy', url: 'https://www.visitindy.com', eventsUrl: 'https://www.visitindy.com/events/', city: 'Indianapolis', state: 'IN' },
  // Kentucky
  { name: 'Visit Kentucky', url: 'https://www.kentuckytourism.com', eventsUrl: 'https://www.kentuckytourism.com/events/', city: 'Frankfort', state: 'KY' },
  { name: 'Go To Louisville', url: 'https://www.gotolouisville.com', eventsUrl: 'https://www.gotolouisville.com/events/', city: 'Louisville', state: 'KY' },
  // Massachusetts
  { name: 'Visit Massachusetts', url: 'https://www.massvacation.com', eventsUrl: 'https://www.massvacation.com/events/', city: 'Boston', state: 'MA' },
  { name: 'Visit Boston', url: 'https://www.bostonusa.com', eventsUrl: 'https://www.bostonusa.com/events/', city: 'Boston', state: 'MA' },
  // Maryland
  { name: 'Visit Maryland', url: 'https://www.visitmaryland.org', eventsUrl: 'https://www.visitmaryland.org/events', city: 'Baltimore', state: 'MD' },
  { name: 'Visit Baltimore', url: 'https://baltimore.org', eventsUrl: 'https://baltimore.org/events/', city: 'Baltimore', state: 'MD' },
  // Maine
  { name: 'Visit Maine', url: 'https://visitmaine.com', eventsUrl: 'https://visitmaine.com/events/', city: 'Portland', state: 'ME' },
  // Minnesota
  { name: 'Explore Minnesota', url: 'https://www.exploreminnesota.com', eventsUrl: 'https://www.exploreminnesota.com/events', city: 'Minneapolis', state: 'MN' },
  { name: 'Meet Minneapolis', url: 'https://www.minneapolis.org', eventsUrl: 'https://www.minneapolis.org/events/', city: 'Minneapolis', state: 'MN' },
  // Mississippi
  { name: 'Visit Mississippi', url: 'https://visitmississippi.org', eventsUrl: 'https://visitmississippi.org/events/', city: 'Jackson', state: 'MS' },
  // North Carolina
  { name: 'Visit North Carolina', url: 'https://www.visitnc.com', eventsUrl: 'https://www.visitnc.com/events', city: 'Raleigh', state: 'NC' },
  { name: 'Visit Charlotte', url: 'https://www.charlottesgotalot.com', eventsUrl: 'https://www.charlottesgotalot.com/events', city: 'Charlotte', state: 'NC' },
  // New Hampshire
  { name: 'Visit New Hampshire', url: 'https://www.visitnh.gov', eventsUrl: 'https://www.visitnh.gov/events', city: 'Concord', state: 'NH' },
  // New Jersey
  { name: 'Visit New Jersey', url: 'https://www.visitnj.org', eventsUrl: 'https://www.visitnj.org/events', city: 'Trenton', state: 'NJ' },
  // New York
  { name: 'I Love NY', url: 'https://www.iloveny.com', eventsUrl: 'https://www.iloveny.com/things-to-do/events/', city: 'Albany', state: 'NY' },
  { name: 'NYC Go', url: 'https://www.nycgo.com', eventsUrl: 'https://www.nycgo.com/events/', city: 'New York', state: 'NY' },
  { name: 'Visit Buffalo Niagara', url: 'https://www.visitbuffaloniagara.com', eventsUrl: 'https://www.visitbuffaloniagara.com/events/', city: 'Buffalo', state: 'NY' },
  // Ohio
  { name: 'Ohio Travel', url: 'https://ohio.org', eventsUrl: 'https://ohio.org/things-to-do/events/', city: 'Columbus', state: 'OH' },
  { name: 'Experience Columbus', url: 'https://www.experiencecolumbus.com', eventsUrl: 'https://www.experiencecolumbus.com/events/', city: 'Columbus', state: 'OH' },
  { name: 'This Is Cleveland', url: 'https://www.thisiscleveland.com', eventsUrl: 'https://www.thisiscleveland.com/events/', city: 'Cleveland', state: 'OH' },
  // Pennsylvania
  { name: 'Visit PA', url: 'https://www.visitpa.com', eventsUrl: 'https://www.visitpa.com/events', city: 'Harrisburg', state: 'PA' },
  { name: 'Visit Philly', url: 'https://www.visitphilly.com', eventsUrl: 'https://www.visitphilly.com/things-to-do/events/', city: 'Philadelphia', state: 'PA' },
  { name: 'Visit Pittsburgh', url: 'https://www.visitpittsburgh.com', eventsUrl: 'https://www.visitpittsburgh.com/events/', city: 'Pittsburgh', state: 'PA' },
  // Rhode Island
  { name: 'Visit Rhode Island', url: 'https://www.visitrhodeisland.com', eventsUrl: 'https://www.visitrhodeisland.com/things-to-do/events/', city: 'Providence', state: 'RI' },
  // South Carolina
  { name: 'Discover South Carolina', url: 'https://discoversouthcarolina.com', eventsUrl: 'https://discoversouthcarolina.com/events', city: 'Columbia', state: 'SC' },
  { name: 'Visit Charleston', url: 'https://www.charlestoncvb.com', eventsUrl: 'https://www.charlestoncvb.com/events/', city: 'Charleston', state: 'SC' },
  // Tennessee
  { name: 'Tennessee Vacation', url: 'https://www.tnvacation.com', eventsUrl: 'https://www.tnvacation.com/events', city: 'Nashville', state: 'TN' },
  { name: 'Visit Nashville', url: 'https://www.visitmusiccity.com', eventsUrl: 'https://www.visitmusiccity.com/events/', city: 'Nashville', state: 'TN' },
  // Virginia
  { name: 'Visit Virginia', url: 'https://www.virginia.org', eventsUrl: 'https://www.virginia.org/events/', city: 'Richmond', state: 'VA' },
  { name: 'Visit Richmond', url: 'https://www.visitrichmondva.com', eventsUrl: 'https://www.visitrichmondva.com/events/', city: 'Richmond', state: 'VA' },
  // Vermont
  { name: 'Vermont Tourism', url: 'https://www.vermontvacation.com', eventsUrl: 'https://www.vermontvacation.com/events', city: 'Burlington', state: 'VT' },
  // Wisconsin
  { name: 'Travel Wisconsin', url: 'https://www.travelwisconsin.com', eventsUrl: 'https://www.travelwisconsin.com/events', city: 'Madison', state: 'WI' },
  { name: 'Visit Milwaukee', url: 'https://www.visitmilwaukee.org', eventsUrl: 'https://www.visitmilwaukee.org/events/', city: 'Milwaukee', state: 'WI' },
  // West Virginia
  { name: 'Visit WV', url: 'https://wvtourism.com', eventsUrl: 'https://wvtourism.com/events/', city: 'Charleston', state: 'WV' },
];

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|beer\s*fest|wine\s*tasting|wine\s*trail|brew\s*fest|bourbon\s*trail|cocktail|burlesque|nightclub|strip\s*club|lingerie|cannabis|hemp\s*fest|happy\s*hour|singles?\s*night|drag\s*show|bachelorette|after[\s-]?dark)\b/i;

// Subcategory detection patterns
const CATEGORY_PATTERNS = [
  { pattern: /\b(music|concert|symphony|jazz|blues|live\s*band|orchestra)\b/i, category: 'Music & Concerts' },
  { pattern: /\b(museum|exhibit|gallery|art\s*show|sculpture)\b/i, category: 'Arts & Culture' },
  { pattern: /\b(festival|fair|parade|carnival|celebration)\b/i, category: 'Fairs & Festivals' },
  { pattern: /\b(sport|race|run|marathon|5k|game|tournament)\b/i, category: 'Sports & Recreation' },
  { pattern: /\b(farm|garden|nature|hike|trail|wildlife|park)\b/i, category: 'Nature & Outdoors' },
  { pattern: /\b(food|taste|chef|culinary|cooking|farmers?\s*market)\b/i, category: 'Food & Drink' },
  { pattern: /\b(holiday|christmas|halloween|easter|fourth|july\s*4|firework)\b/i, category: 'Holiday & Seasonal' },
  { pattern: /\b(story\s*time|kids?|children|family|youth|toddler)\b/i, category: 'Kids & Family' },
];

function detectCategory(text) {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'Community';
}

// ==========================================
// SCRAPE A SINGLE CVB SITE
// ==========================================

async function scrapeCVBSite(site, browser) {
  console.log(`\n  🏛️ ${site.name} (${site.state})`);
  console.log(`     🌐 ${site.eventsUrl}`);

  const events = [];

  try {
    const page = await createStealthPage(browser);

    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(site.eventsUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`     ⚠️ Navigation retry...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Wait for content
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to load lazy content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 1000));
    }

    // Extract events using multiple selector strategies
    const rawEvents = await page.evaluate((siteData) => {
      const results = [];
      const seen = new Set();

      // Helper: clean whitespace
      const clean = (str) => (str || '').replace(/\s+/g, ' ').trim();

      // Strategy 1: JSON-LD structured data (most reliable)
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          let data = JSON.parse(script.textContent);
          if (!Array.isArray(data)) data = [data];
          // Handle @graph patterns
          data.forEach(item => {
            const items = item['@graph'] || [item];
            items.forEach(ev => {
              if (ev['@type'] === 'Event' && ev.name) {
                const key = ev.name.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                results.push({
                  title: clean(ev.name),
                  dateText: ev.startDate || '',
                  endDate: ev.endDate || '',
                  venue: ev.location?.name || '',
                  address: ev.location?.address?.streetAddress ||
                           (typeof ev.location?.address === 'string' ? ev.location.address : '') || '',
                  city: ev.location?.address?.addressLocality || siteData.city,
                  description: clean(ev.description || '').substring(0, 1000),
                  imageUrl: typeof ev.image === 'string' ? ev.image :
                            (Array.isArray(ev.image) ? ev.image[0] : ev.image?.url || ''),
                  url: ev.url || '',
                });
              }
            });
          });
        } catch (e) {
          // Skip parse errors
        }
      });

      // Strategy 2: Simpleview common event card selectors
      const cardSelectors = [
        '.events-list .event-item',
        '.event-listing .event-card',
        '.eventList .eventItem',
        '.events-calendar .event',
        '[class*="event-card"]',
        '[class*="eventCard"]',
        '[class*="EventCard"]',
        '.listing-item',
        '.card-event',
        'article.event',
        '.search-result-item',
        '.results-list .result',
        '.event-results .event',
        '[data-type="event"]',
      ];

      for (const selector of cardSelectors) {
        const cards = document.querySelectorAll(selector);
        cards.forEach(card => {
          try {
            const titleEl = card.querySelector(
              'h2, h3, h4, .title, .event-title, [class*="title"], [class*="name"], a[class*="title"]'
            );
            const title = clean(titleEl?.textContent);
            if (!title || title.length < 4) return;

            const key = title.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);

            const dateEl = card.querySelector(
              '.date, .event-date, time, [class*="date"], [datetime], .when'
            );
            const dateText = dateEl?.getAttribute('datetime') ||
                             clean(dateEl?.textContent) || '';

            const venueEl = card.querySelector(
              '.venue, .location, [class*="venue"], [class*="location"], .where, .address'
            );
            const venue = clean(venueEl?.textContent) || '';

            const descEl = card.querySelector(
              '.description, .summary, .excerpt, p, [class*="desc"], [class*="summary"], [class*="excerpt"]'
            );
            const description = clean(descEl?.textContent || '').substring(0, 1000);

            const imgEl = card.querySelector('img');
            let imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

            const linkEl = card.querySelector('a[href]') || (card.tagName === 'A' ? card : null);
            let url = linkEl?.getAttribute('href') || '';

            results.push({
              title,
              dateText,
              endDate: '',
              venue,
              address: '',
              city: siteData.city,
              description,
              imageUrl,
              url,
            });
          } catch (e) {
            // Skip individual card errors
          }
        });
      }

      // Strategy 3: Generic link-based extraction for simpler pages
      if (results.length === 0) {
        const links = document.querySelectorAll('a[href*="event"], a[href*="/events/"]');
        links.forEach(link => {
          try {
            const title = clean(link.textContent);
            if (!title || title.length < 6 || title.length > 200) return;
            // Skip nav/menu links
            if (link.closest('nav, header, footer, .menu, .nav')) return;

            const key = title.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);

            const parent = link.closest('div, article, li, section');
            const dateEl = parent?.querySelector('.date, time, [class*="date"]');
            const dateText = dateEl?.getAttribute('datetime') || clean(dateEl?.textContent) || '';

            results.push({
              title,
              dateText,
              endDate: '',
              venue: '',
              address: '',
              city: siteData.city,
              description: '',
              imageUrl: '',
              url: link.getAttribute('href') || '',
            });
          } catch (e) {
            // Skip individual link errors
          }
        });
      }

      return results;
    }, { city: site.city, state: site.state });

    console.log(`     📋 Found ${rawEvents.length} raw event listings`);

    // Filter and build event objects
    let skippedNonFamily = 0;

    for (const raw of rawEvents) {
      const combined = `${raw.title} ${raw.description}`;

      // Skip non-family events
      if (NON_FAMILY_PATTERNS.test(combined)) {
        skippedNonFamily++;
        continue;
      }

      // Build ISO date
      let parsedDate = '';
      if (raw.dateText) {
        try {
          const d = new Date(raw.dateText + (raw.dateText.includes('T') ? '' : 'T00:00:00'));
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
          }
        } catch (e) {
          // Date parse failed
        }
      }

      // Build full URL
      let eventUrl = raw.url || '';
      if (eventUrl && !eventUrl.startsWith('http')) {
        // Relative URL — prepend site base
        const baseOrigin = new URL(site.url).origin;
        eventUrl = `${baseOrigin}${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}`;
      }
      if (!eventUrl) {
        eventUrl = site.eventsUrl;
      }

      // Build image URL
      let imageUrl = raw.imageUrl || '';
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        const baseOrigin = new URL(site.url).origin;
        imageUrl = `${baseOrigin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      // Detect category from title + description
      const category = detectCategory(combined);

      // Build description
      let description = raw.description || '';
      if (!description) {
        description = `${raw.title} - Event in ${raw.city || site.city}, ${site.state}. Presented by ${site.name}.`;
      }

      events.push({
        title: raw.title,
        eventDate: raw.dateText || '',
        date: parsedDate,
        description: description,
        venueName: raw.venue || '',
        city: raw.city || site.city,
        state: site.state,
        url: eventUrl,
        image_url: imageUrl,
        category: category,
        source_url: site.eventsUrl,
        details: {
          city: raw.city || site.city,
          state: site.state,
          address: raw.address || (raw.venue ? `${raw.venue}, ${raw.city || site.city}, ${site.state}` : `${raw.city || site.city}, ${site.state}`),
        },
      });
    }

    if (skippedNonFamily > 0) {
      console.log(`     🚫 Skipped ${skippedNonFamily} non-family events`);
    }
    console.log(`     ✅ ${events.length} family-friendly events extracted`);

    await page.close();
  } catch (err) {
    console.error(`     ❌ Failed: ${err.message}`);
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapeSimpleviewTourism(filterStates = null) {
  console.log('\n\x1b[33m🏛️🗺️━━━━━━━━━━━━━ SIMPLEVIEW TOURISM BUREAU SCRAPER ━━━━━━━━━━━━━━🏛️🗺️\x1b[0m');

  const sitesToScrape = filterStates
    ? CVB_SITES.filter(s => filterStates.includes(s.state))
    : CVB_SITES;

  const uniqueStates = [...new Set(sitesToScrape.map(s => s.state))];
  console.log(`📍 Target: ${sitesToScrape.length} CVB sites across ${uniqueStates.length} states`);
  console.log(`🌐 Source: Tourism Bureau Event Calendars\n`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};

  try {
    for (let i = 0; i < sitesToScrape.length; i++) {
      const site = sitesToScrape[i];
      console.log(`\n[${i + 1}/${sitesToScrape.length}] ${site.name} (${site.state})`);

      const siteEvents = await scrapeCVBSite(site, browser);
      allEvents.push(...siteEvents);

      if (!stateResults[site.state]) {
        stateResults[site.state] = 0;
      }
      stateResults[site.state] += siteEvents.length;

      // Save in batches to keep memory manageable
      if (allEvents.length >= 400 || i === sitesToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          const venues = allEvents.map(e => ({
            name: e.venueName || e.title,
            city: e.city,
            state: e.state,
          }));

          try {
            const result = await saveEventsWithGeocoding(
              allEvents,
              venues,
              {
                scraperName: SCRAPER_NAME,
                state: allEvents[0].state,
                category: 'Community',
                platform: 'simpleview-tourism',
              }
            );
            const saved = result?.saved || result?.new || result?.imported || 0;
            console.log(`   💾 Saved: ${saved}`);
          } catch (err) {
            console.error(`   ❌ Save error: ${err.message}`);
          }
        }
        allEvents = [];
      }

      // 4-second delay between sites to be polite
      if (i < sitesToScrape.length - 1) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  const totalEvents = Object.values(stateResults).reduce((sum, n) => sum + n, 0);
  console.log('\n\x1b[33m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalEvents}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalEvents,
    new: totalEvents,
    duplicates: 0,
  });

  return stateResults;
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

  scrapeSimpleviewTourism(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeSimpleviewTourismCloudFunction() {
  try {
    const result = await scrapeSimpleviewTourism();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeSimpleviewTourism,
  scrapeSimpleviewTourismCloudFunction,
};

#!/usr/bin/env node

/**
 * SCIENCE MUSEUMS, NATURAL HISTORY MUSEUMS & ARTS/CULTURE VENUES SCRAPER
 *
 * Scrapes family events from major science museums, natural history museums,
 * and arts/culture venues across 15+ eastern US states.
 *
 * Coverage:
 *   - Connecticut (2 venues)
 *   - DC (3 venues)
 *   - Florida (4 venues)
 *   - Georgia (2 venues)
 *   - Illinois (4 venues)
 *   - Indiana (2 venues)
 *   - Maryland (1 venue)
 *   - Massachusetts (2 venues)
 *   - Michigan (3 venues)
 *   - New Hampshire (1 venue)
 *   - New York (4 venues)
 *   - North Carolina (1 venue)
 *   - Ohio (2 venues)
 *   - Pennsylvania (3 venues)
 *   - Tennessee (1 venue)
 *   - Virginia (2 venues)
 *   - Wisconsin (1 venue)
 *
 * Total: 38 venues across 17 states
 *
 * Removed (no scrapable events page):
 *   Maritime Aquarium (ticketing platform), Orlando Science Center (static page),
 *   Fernbank Science Center (timeouts), New England Aquarium (no events page),
 *   Liberty Science Center (redirects), Greensboro Science Center (404)
 *
 * Usage:
 *   node scraper-venue-events-science-arts.js          # Test mode (all states)
 *   node scraper-venue-events-science-arts.js --state CT # Test mode (CT only)
 *   node scraper-venue-events-science-arts.js --state NY --full # Full mode (NY only)
 *
 * Cloud Function: scrapeScienceArtsEventsCloudFunction
 * Schedule: Every 3 days
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'ScienceArtsVenues';

const VENUES = [
  // Connecticut
  { name: "Connecticut Science Center", eventsUrl: "https://ctsciencecenter.org/events/", city: "Hartford", state: "CT", zip: "06103" },
  { name: "Yale Peabody Museum", eventsUrl: "https://peabody.yale.edu/events", city: "New Haven", state: "CT", zip: "06511",
    extraction: { platform: 'drupal', container: '.views-row', title: '.views-field-title a', date: '.views-field-field-event-date, time[datetime]', link: '.views-field-title a', desc: '.views-field-body' } },
  // DC
  { name: "Smithsonian Air & Space Museum", eventsUrl: "https://airandspace.si.edu/events", city: "Washington", state: "DC", zip: "20560",
    extraction: { platform: 'smithsonian', container: 'a.event-teaser, div.view__row', title: 'h4.event-teaser__title', date: 'div.event-teaser__date p, div.event-teaser__date', link: 'a.event-teaser', desc: '' } },
  { name: "Smithsonian Natural History Museum", eventsUrl: "https://naturalhistory.si.edu/events", city: "Washington", state: "DC", zip: "20560",
    extraction: { platform: 'smithsonian', container: 'a.event-teaser, div.view__row', title: 'h4.event-teaser__title', date: 'div.event-teaser__date p, div.event-teaser__date', link: 'a.event-teaser', desc: '' } },
  { name: "National Building Museum", eventsUrl: "https://www.nbm.org/events/", city: "Washington", state: "DC", zip: "20001",
    extraction: { platform: 'tec' } },
  // Florida
  { name: "Frost Science Museum", eventsUrl: "https://www.frostscience.org/calendar-events/", city: "Miami", state: "FL", zip: "33132",
    extraction: { platform: 'frost-fernbank', container: 'div.row.list-d', title: 'h2.headline_style5 a, h2.title a', date: 'div.headline_style3.event-list-date', time: 'p.time', link: 'h2.headline_style5 a, h2.title a', desc: '' } },
  { name: "Museum of Science & Industry", eventsUrl: "https://www.mosi.org/events/", city: "Tampa", state: "FL", zip: "33613" },
  { name: "Bishop Museum of Science & Nature", eventsUrl: "https://bishopscience.org/events/", city: "Sarasota", state: "FL", zip: "34236",
    extraction: { platform: 'mec', container: '.mec-event-article', title: '.mec-event-title a, h4.mec-event-title', date: '.mec-start-date-details, .mec-event-date', link: '.mec-event-title a', desc: '.mec-event-description' } },
  { name: "Kennedy Space Center Visitor Complex", eventsUrl: "https://www.kennedyspacecenter.com/launches-and-events/featured-events", city: "Merritt Island", state: "FL", zip: "32953" },
  // Georgia
  { name: "Fernbank Museum of Natural History", eventsUrl: "https://www.fernbankmuseum.org/events/calendar-of-events/", city: "Atlanta", state: "GA", zip: "30307",
    extraction: { platform: 'frost-fernbank', container: 'div.row.list-d', title: 'h2.headline_style5 a, h2.title a', date: 'div.headline_style3.event-list-date', time: 'p.time', link: 'h2.headline_style5 a, h2.title a', desc: '' } },
  { name: "Tellus Science Museum", eventsUrl: "https://tellusmuseum.org/events/", city: "Cartersville", state: "GA", zip: "30120" },
  // Illinois
  { name: "Griffin Museum of Science and Industry", eventsUrl: "https://www.griffinmsi.org/events", city: "Chicago", state: "IL", zip: "60637" },
  { name: "Adler Planetarium", eventsUrl: "https://www.adlerplanetarium.org/explore/events/", city: "Chicago", state: "IL", zip: "60605",
    extraction: { platform: 'custom', container: 'div.refresh-half-col, div.exhibits-row', title: 'h4, div.refresh-exhibits-excerpt h4', date: '', link: 'a[href]', desc: 'div.refresh-exhibits-excerpt p' } },
  { name: "Field Museum", eventsUrl: "https://www.fieldmuseum.org/events", city: "Chicago", state: "IL", zip: "60605" },
  { name: "Art Institute of Chicago", eventsUrl: "https://www.artic.edu/events", city: "Chicago", state: "IL", zip: "60603",
    extraction: { platform: 'artic', container: 'li.m-listing', title: 'strong.title.f-list-2', date: 'time[datetime]', link: 'a.m-listing__link', desc: 'span.short-description' } },
  // Indiana
  { name: "Indiana State Museum", eventsUrl: "https://www.indianamuseum.org/events/", city: "Indianapolis", state: "IN", zip: "46204" },
  { name: "Conner Prairie Living History", eventsUrl: "https://www.connerprairie.org/visit/events/", city: "Fishers", state: "IN", zip: "46038" },
  // Maryland
  { name: "Maryland Science Center", eventsUrl: "https://www.mdsci.org/whats-happening/events/", city: "Baltimore", state: "MD", zip: "21230",
    extraction: { platform: 'custom', container: 'article.event-slide', title: 'p.event-slide-title a', date: 'p.event-slide-date time[datetime], p.event-slide-date', link: 'p.event-slide-title a', desc: '' } },
  // Massachusetts
  { name: "Museum of Science Boston", eventsUrl: "https://www.mos.org/events", city: "Boston", state: "MA", zip: "02114" },
  { name: "EcoTarium", eventsUrl: "https://ecotarium.org/events/", city: "Worcester", state: "MA", zip: "01604",
    extraction: { platform: 'tec' } },
  // Michigan
  { name: "Michigan Science Center", eventsUrl: "https://www.mi-sci.org/calendar/", city: "Detroit", state: "MI", zip: "48202" },
  { name: "Impression 5 Science Center", eventsUrl: "https://impression5.org/events/", city: "Lansing", state: "MI", zip: "48933" },
  { name: "Henry Ford Museum", eventsUrl: "https://www.thehenryford.org/visit/events/", city: "Dearborn", state: "MI", zip: "48124" },
  // New Hampshire
  { name: "McAuliffe-Shepard Discovery Center", eventsUrl: "https://www.starhop.com/events/", city: "Concord", state: "NH", zip: "03301" },
  // New York
  { name: "American Museum of Natural History", eventsUrl: "https://www.amnh.org/calendar", city: "New York", state: "NY", zip: "10024",
    extraction: { platform: 'amnh', container: 'a.amnh-calendar-new-event', title: 'div.amnh-calendar-new-event__info h3', date: 'div.amnh-calendar-new-event__info p:last-child', link: 'a.amnh-calendar-new-event', desc: 'p.small-paragraph' } },
  { name: "New York Hall of Science", eventsUrl: "https://nysci.org/nysci-events", city: "Queens", state: "NY", zip: "11368" },
  { name: "Intrepid Sea Air & Space Museum", eventsUrl: "https://www.intrepidmuseum.org/events/calendar", city: "New York", state: "NY", zip: "10036" },
  { name: "Corning Museum of Glass", eventsUrl: "https://whatson.cmog.org/events-programs", city: "Corning", state: "NY", zip: "14830",
    extraction: { platform: 'drupal', container: 'div.node--type-event, div.views-row', title: 'a.card__heading span, a.card__heading', date: 'div.icon--before.icon--date', link: 'a.card__heading', desc: '' } },
  // North Carolina
  { name: "NC Museum of Natural Sciences", eventsUrl: "https://naturalsciences.org/calendar", city: "Raleigh", state: "NC", zip: "27601" },
  // Ohio
  { name: "Great Lakes Science Center", eventsUrl: "https://greatscience.com/explore/events-programs", city: "Cleveland", state: "OH", zip: "44114",
    extraction: { platform: 'drupal', container: 'article.child-tile', title: 'h3 a', date: '', link: 'h3 a', desc: '' } },
  { name: "Imagination Station", eventsUrl: "https://www.imaginationstationtoledo.org/visit/events", city: "Toledo", state: "OH", zip: "43604" },
  // Pennsylvania
  { name: "Franklin Institute", eventsUrl: "https://www.fi.edu/en/events-calendar", city: "Philadelphia", state: "PA", zip: "19103" },
  { name: "Academy of Natural Sciences", eventsUrl: "https://ansp.org/experience/events", city: "Philadelphia", state: "PA", zip: "19103",
    extraction: { platform: 'sitecore', container: 'li.o-list-card', title: 'h4.o-list-card__title span, h4.o-list-card__title', date: 'p.o-list-card__date', link: 'a.o-list-card__link', desc: 'p.o-list-card__description' } },
  { name: "Kamin Science Center", eventsUrl: "https://kaminsciencecenter.org/plan-a-visit/?filter_exhibit=events", city: "Pittsburgh", state: "PA", zip: "15212",
    extraction: { platform: 'tec' } },
  // Tennessee
  { name: "Tennessee State Museum", eventsUrl: "https://tnmuseum.org/calendar-of-events", city: "Nashville", state: "TN", zip: "37243" },
  // Virginia
  { name: "Science Museum of Virginia", eventsUrl: "https://smv.org/explore/things-to-do/?things_to_do_type=eventpage", city: "Richmond", state: "VA", zip: "23220",
    extraction: { platform: 'custom', container: 'div.ttd-card', title: 'h3', date: 'div.font-bold.uppercase', link: 'a[href]', desc: 'div.my-3' } },
  { name: "Virginia Museum of Natural History", eventsUrl: "https://www.vmnh.net/calendar", city: "Martinsville", state: "VA", zip: "24112",
    extraction: { platform: 'vmnh', container: 'div.event', title: 'a.tooltip_link', date: '', link: 'a.tooltip_link', desc: '' } },
  // Wisconsin
  { name: "Milwaukee Art Museum", eventsUrl: "https://mam.org/events/", city: "Milwaukee", state: "WI", zip: "53202",
    extraction: { platform: 'tec' } },
];

/**
 * Extract events from a venue's events page.
 * Uses venue-specific extraction configs when available, falls back to generic selectors.
 */
async function extractEventsFromPage(page, venue) {
  try {
    await page.goto(venue.eventsUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page content
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const config = venue.extraction || null;
    const platform = config ? config.platform : 'generic';

    // For TEC sites, also wait for TEC-specific elements
    if (platform === 'tec') {
      try {
        await page.waitForSelector('article.tribe-events-calendar-list__event, .tribe-events-calendar-day__event, .tribe-events', { timeout: 5000 });
      } catch (e) { /* continue with what's available */ }
    }

    const events = await page.evaluate((cfg, plat) => {
      // These extraction functions are defined above but need to be available inside evaluate
      // So we inline the dispatch logic here

      if (plat === 'tec') {
        // TEC extraction
        const results = [];
        const els = document.querySelectorAll(
          'article.tribe-events-calendar-list__event, article.tribe-event, .tribe-events-calendar-list__event-row'
        );
        els.forEach(el => {
          try {
            const titleEl = el.querySelector('a.tribe-events-calendar-list__event-title-link, a.tribe-event-url, .tribe-events-calendar-list__event-title a');
            const dateEl = el.querySelector('.tribe-events-calendar-list__event-datetime, time[datetime], .tribe-events-calendar-list__event-date-tag');
            const descEl = el.querySelector('.tribe-events-calendar-list__event-description p, .tribe-events-content p');
            const title = titleEl ? titleEl.textContent.trim() : '';
            const url = titleEl ? titleEl.href : '';
            let dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
            if (title && (dateText || url)) {
              results.push({ name: title, eventDate: dateText, url, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
            }
          } catch (e) {}
        });
        if (results.length === 0) {
          document.querySelectorAll('a.tribe-events-calendar-day__event-title-link, a.tribe-events-calendar-month__calendar-event-title-link').forEach(a => {
            results.push({ name: a.textContent.trim(), eventDate: '', url: a.href, description: '' });
          });
        }
        return results;
      }

      if (plat === 'frost-fernbank') {
        const results = [];
        let currentDate = '';
        document.querySelectorAll('div.headline_style3.event-list-date, div.headline_style3, div.row.list-d, div.col-xs-12').forEach(el => {
          if (el.classList.contains('headline_style3') || el.classList.contains('event-list-date')) {
            currentDate = el.textContent.trim();
            return;
          }
          const titleEl = el.querySelector('h2.headline_style5 a, h2.title a, h2 a');
          const timeEl = el.querySelector('p.time');
          if (titleEl) {
            results.push({
              name: titleEl.textContent.trim(),
              eventDate: currentDate + (timeEl ? ' ' + timeEl.textContent.trim() : ''),
              url: titleEl.href || '',
              description: ''
            });
          }
        });
        return results;
      }

      if (plat === 'mec') {
        const results = [];
        document.querySelectorAll('.mec-event-article').forEach(el => {
          try {
            const titleEl = el.querySelector('.mec-event-title a, h4.mec-event-title');
            const dateEl = el.querySelector('.mec-start-date-details, .mec-event-date');
            const descEl = el.querySelector('.mec-event-description');
            const title = titleEl ? titleEl.textContent.trim() : '';
            const url = titleEl && titleEl.href ? titleEl.href : (el.querySelector('.mec-event-title a') || {}).href || '';
            const dateText = dateEl ? dateEl.textContent.trim() : '';
            if (title && (dateText || url)) {
              results.push({ name: title, eventDate: dateText, url, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
            }
          } catch (e) {}
        });
        return results;
      }

      if (plat === 'vmnh') {
        const results = [];
        document.querySelectorAll('div.event a.tooltip_link, a.tooltip_link').forEach(a => {
          const title = a.textContent.trim();
          const url = a.href || '';
          let dateText = '';
          const slugMatch = (url || '').match(/\/event\/(\d{4}-\d{2}-\d{2})/);
          if (slugMatch) {
            const parts = slugMatch[1].split('-');
            const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            dateText = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          }
          const tooltip = a.getAttribute('data-original-title') || a.getAttribute('title') || '';
          if (!dateText && tooltip) {
            const dm = tooltip.match(/(\w+ \d{1,2},?\s*\d{4})/);
            if (dm) dateText = dm[1];
          }
          if (title && (dateText || url)) {
            results.push({ name: title, eventDate: dateText, url, description: '' });
          }
        });
        return results;
      }

      // Custom config or known platform with specific selectors
      if (cfg && cfg.container) {
        const results = [];
        document.querySelectorAll(cfg.container).forEach(el => {
          try {
            let title = '';
            if (cfg.title) {
              for (const sel of cfg.title.split(',').map(s => s.trim())) {
                const t = el.querySelector(sel);
                if (t) { title = t.textContent.trim(); break; }
              }
            }
            if (!title && el.tagName === 'A') {
              const inner = el.querySelector('h3, h4, h2, .title');
              if (inner) title = inner.textContent.trim();
            }
            let url = '';
            if (cfg.link) {
              for (const sel of cfg.link.split(',').map(s => s.trim())) {
                const linkEl = el.querySelector(sel);
                if (linkEl) { url = linkEl.href || linkEl.getAttribute('href') || ''; break; }
              }
            }
            if (!url && el.tagName === 'A' && el.href) url = el.href;
            let dateText = '';
            if (cfg.date) {
              for (const sel of cfg.date.split(',').map(s => s.trim())) {
                const d = el.querySelector(sel);
                if (d) { dateText = d.getAttribute('datetime') || d.textContent.trim(); break; }
              }
            }
            let description = '';
            if (cfg.desc) {
              for (const sel of cfg.desc.split(',').map(s => s.trim())) {
                const descEl = el.querySelector(sel);
                if (descEl) { description = descEl.textContent.trim(); break; }
              }
            }
            if (title && (dateText || url)) {
              results.push({ name: title, eventDate: dateText, url, description: description.substring(0, 500) });
            }
          } catch (e) {}
        });
        // If venue-specific config found events, return them
        if (results.length > 0) return results;
        // Otherwise fall through to generic
      }

      // Generic fallback
      const results = [];
      const selectors = ['article', '.event', '.event-item', '[class*="event"]', '.card', '.post'];
      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }
      eventElements.forEach(el => {
        try {
          let title = '';
          for (const sel of ['h2', 'h3', 'h4', '.title', '.event-title', '[class*="title"]']) {
            const t = el.querySelector(sel);
            if (t) { title = t.textContent.trim(); break; }
          }
          const linkEl = el.querySelector('a[href*="event"], a[href*="program"], a');
          const url = linkEl ? linkEl.href : '';
          let dateText = '';
          for (const sel of ['.date', '.event-date', '.date-time', 'time', '[class*="date"]', '[class*="when"]']) {
            const d = el.querySelector(sel);
            if (d) { dateText = d.textContent.trim(); break; }
          }
          let description = '';
          for (const sel of ['.description', '.event-description', '.excerpt', 'p', '[class*="description"]']) {
            const descEl = el.querySelector(sel);
            if (descEl) { description = descEl.textContent.trim(); break; }
          }
          if (title && (dateText || url)) {
            results.push({ name: title, eventDate: dateText, url, description: description.substring(0, 500) });
          }
        } catch (e) {}
      });
      return results;
    }, config, platform);

    console.log(`   [${platform}] Found ${events.length} events`);
    return events;
  } catch (error) {
    console.error(`  Error extracting events from ${venue.name}: ${error.message}`);
    return [];
  }
}

/**
 * Check if a normalized date string is in the future (not past) and within range.
 * @param {string} normalizedDate - "Month Day, Year" format from normalizeDateString()
 * @param {number} maxDays - Maximum days in future (default 90)
 * @returns {boolean}
 */
function isDateInRange(normalizedDate, maxDays = 90) {
  if (!normalizedDate) return false;
  const parsed = new Date(normalizedDate);
  if (isNaN(parsed.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (parsed < now) return false;
  const max = new Date();
  max.setDate(max.getDate() + maxDays);
  return parsed <= max;
}

/**
 * Process extracted events and save to database
 */
async function processAndSaveVenueEvents(venue, extractedEvents) {
  if (extractedEvents.length === 0) return { saved: 0, skipped: 0, failed: 0 };

  let saved = 0, skipped = 0, failed = 0;
  const allEvents = [];
  const seenEvents = new Set();

  for (const event of extractedEvents) {
    try {
      // Skip duplicates within this batch
      const eventKey = `${event.name}|||${event.eventDate}`;
      if (seenEvents.has(eventKey)) {
        skipped++;
        continue;
      }
      seenEvents.add(eventKey);

      // Normalize date using the robust date-normalization-helper
      // This handles "April 22, 2026", "APR 22 - APR 30", "Sat, Apr 26 10:00 AM", etc.
      const normalizedDate = normalizeDateString(event.eventDate);

      // If we can't parse the date at all and there's no URL, skip
      if (!normalizedDate && !event.url) {
        skipped++;
        continue;
      }

      // If the date is parseable, check if it's in range; if not parseable, keep it
      // (the downstream save pipeline will handle date validation)
      if (normalizedDate && isDateInRange(normalizedDate, 90) === false) {
        // Only skip if we can definitively say it's out of range
        const parsed = new Date(normalizedDate);
        if (!isNaN(parsed.getTime())) {
          // Date parsed fine but is out of range — skip
          skipped++;
          continue;
        }
        // If Date() can't parse the normalized string, keep the event
        // (the save pipeline has additional date parsing logic)
      }

      // Categorize event
      const { parentCategory, displayCategory, subcategory } = categorizeEvent({
        name: event.name,
        description: event.description || ''
      });

      // Extract time if present
      const timeMatch = event.eventDate.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      let startTime = '';
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = timeMatch[2];
        const ap = timeMatch[3].toUpperCase();
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        startTime = `${h}:${m} ${ap}`;
      }

      // Build event document
      const eventDoc = {
        name: event.name,
        venue: venue.name,
        venueName: venue.name,
        eventDate: normalizedDate || event.eventDate,
        startTime: startTime,
        endTime: '',
        scheduleDescription: event.eventDate,
        description: event.description || `Family event at ${venue.name}`,
        address: '',
        city: venue.city,
        state: venue.state,
        zipCode: venue.zip,
        location: venue.name,
        parentCategory,
        displayCategory,
        subcategory,
        ageRange: 'All Ages',
        cost: 'Included with admission',
        url: event.url || venue.eventsUrl,
        metadata: {
          sourceName: venue.name,
          sourceUrl: venue.eventsUrl,
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'museum-arts-venue',
          state: venue.state,
          category: parentCategory
        }
      };

      allEvents.push(eventDoc);
      saved++;

    } catch (error) {
      console.error(`    Error saving event: ${error.message}`);
      failed++;
    }
  }

  // Batch save all events for this venue
  if (allEvents.length > 0) {
    try {
      await saveEventsWithGeocoding(allEvents, [{ name: venue.name, city: venue.city, state: venue.state, zipCode: venue.zip }], {
        scraperName: SCRAPER_NAME,
        state: venue.state,
        category: 'learning-culture',
        platform: 'museum-arts-venue'
      });
    } catch (err) {
      console.error(`    Error batch saving: ${err.message}`);
    }
  }

  return { saved, skipped, failed };
}

/**
 * Scrape all venues or filter by state
 */
async function scrapeVenueEvents(options = {}) {
  const { state = null, maxDays = 60 } = options;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🏛️  SCIENCE MUSEUMS, NATURAL HISTORY & ARTS/CULTURE VENUES SCRAPER`);
  console.log(`📊 Total venues to scan: ${VENUES.length}`);
  if (state) {
    const stateVenues = VENUES.filter(v => v.state === state.toUpperCase());
    console.log(`📍 Filtering by state: ${state.toUpperCase()} (${stateVenues.length} venues)`);
  }
  console.log(`📅 Max event age: ${maxDays} days`);
  console.log(`${'='.repeat(70)}\n`);

  const startTime = Date.now();
  let browser;

  try {
    browser = await launchBrowser({ stealth: true });
    const page = await createStealthPage(browser);

    let totalSaved = 0, totalSkipped = 0, totalFailed = 0;
    let venuesProcessed = 0;

    const filteredVenues = state
      ? VENUES.filter(v => v.state === state.toUpperCase())
      : VENUES;

    for (const venue of filteredVenues) {
      try {
        console.log(`\n📍 Scraping: ${venue.name} (${venue.state})`);
        console.log(`   URL: ${venue.eventsUrl}`);

        const events = await extractEventsFromPage(page, venue);
        console.log(`   Found: ${events.length} events`);

        if (events.length > 0) {
          const { saved, skipped, failed } = await processAndSaveVenueEvents(venue, events);
          totalSaved += saved;
          totalSkipped += skipped;
          totalFailed += failed;

          console.log(`   Saved: ${saved}, Skipped: ${skipped}, Failed: ${failed}`);
        }

        venuesProcessed++;

        // 3-second delay between venues to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`   Error processing venue: ${error.message}`);
        totalFailed++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ SCRAPER COMPLETE`);
    console.log(`   Venues processed: ${venuesProcessed}`);
    console.log(`   Events saved: ${totalSaved}`);
    console.log(`   Events skipped: ${totalSkipped}`);
    console.log(`   Events failed: ${totalFailed}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`${'='.repeat(70)}\n`);

    // Log scraper results for monitoring
    try {
      await logScraperResult(SCRAPER_NAME, {
        found: totalSaved + totalSkipped,
        new: totalSaved,
        duplicates: totalSkipped
      }, { dataType: 'events', state });
    } catch (error) {
      console.error('Failed to log results:', error.message);
    }

    return { imported: totalSaved, skipped: totalSkipped, failed: totalFailed };

  } catch (error) {
    console.error('Fatal error:', error);
    return { imported: 0, skipped: 0, failed: VENUES.length };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Cloud Function export
 */
async function scrapeScienceArtsEventsCloudFunction(req = {}) {
  console.log('☁️ Running as Cloud Function');
  const state = req.body?.state || req.query?.state || null;
  return await scrapeVenueEvents({ state, maxDays: 60 });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  let state = null;
  let fullMode = false;

  // Parse --state and --full flags
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && args[i + 1]) {
      state = args[i + 1];
      i++;
    } else if (args[i] === '--full') {
      fullMode = true;
    }
  }

  const stateStr = state ? ` (${state})` : '';
  const modeStr = fullMode ? 'Full' : 'Test';
  console.log(`\n🚀 Starting Scraper${stateStr} (${modeStr} Mode)\n`);

  scrapeVenueEvents({ state, maxDays: fullMode ? 90 : 60 })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeVenueEvents,
  scrapeScienceArtsEventsCloudFunction
};

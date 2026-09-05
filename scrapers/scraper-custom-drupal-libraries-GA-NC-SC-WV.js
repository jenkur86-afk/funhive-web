#!/usr/bin/env node

/**
 * CUSTOM DRUPAL LIBRARIES SCRAPER
 *
 * Scrapes events from libraries using custom Drupal-based platforms
 *
 * COVERAGE (9 library systems across 4 states):
 *
 * SC (4 libraries - 1.243M people):
 * - Richland Library (Columbia) (400K)
 * - Greenville County Library System (500K)
 * - Anderson County Library System (205K) (NEW)
 * - Florence County Library System (138K) (NEW)
 *
 * NC (3 libraries - 1.564M people):
 * - Greensboro Public Library (300K) (REMOVED - 403 Forbidden)
 * - Rowan County Public Library (153K)
 * - Wake County Public Libraries (1.111M) (added 2026-08-07, migrated from Communico-NC)
 *
 * GA (1 library - 750K people):
 * - Cobb County Public Library System (750K)
 *
 * WV (1 library - 200K people):
 * - Kanawha County Public Library (200K)
 *
 * Total: 8 active library systems (Greensboro disabled) serving ~3.757 million people
 *
 * Usage:
 *   node functions/scrapers/scraper-custom-drupal-libraries-GA-NC-SC-WV.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using custom Drupal platforms
const LIBRARY_SYSTEMS = [
  // SOUTH CAROLINA (2 libraries)
  {
    name: 'Richland Library',
    url: 'https://www.richlandlibrary.com/events',
    county: 'Richland',
    state: 'SC',
    website: 'https://www.richlandlibrary.com',
    city: 'Columbia',
    zipCode: '29201',
    selectors: {
      eventContainer: '.views-row, article',
      title: 'h3 a, h2 a',
      date: 'time, .event-date',
      location: '.field-location, .location',
      description: 'p, .description',
      url: 'h3 a, h2 a'
    }
  },
  {
    // DEAD CALENDAR, SITE-SIDE — verified live 2026-09-01 (§1.4). Do NOT spend a
    // session on selectors here: extraction works fine and the scraper is right
    // to store nothing. greenvillelibrary.org/events serves 2020 content, every
    // entry stamped "This event has already taken place" ("Bouncing Babies",
    // Tue Oct 27 2020; "Indie Author Day", Sat Nov 7 2020), and it is not a URL
    // problem — the audience sub-views the site's own nav links to
    // (/events/kids, /events/teens, /events/adults) serve the same 2020 archive,
    // and the page still carries a Labor Day banner from that year. Most of the
    // listings are Zoom events with YouTube recordings, i.e. a COVID-era calendar
    // that was frozen and never restored.
    //
    // LEFT RUNNING ON PURPOSE rather than guarded or deleted: it costs one page
    // load, its 10 past events are correctly skipped, and the row it now produces
    // in LIBRARY-SITE-AUDIT.md keeps this library visible as an EXPLAINED GAP.
    // Deleting it would hide a real coverage hole (the Worcester rule). Reopen if
    // the library ever publishes a live calendar — check whether it has moved to
    // a platform this codebase already parses before re-pointing this entry.
    name: 'Greenville County Library System',
    url: 'https://www.greenvillelibrary.org/events',
    county: 'Greenville',
    state: 'SC',
    website: 'https://www.greenvillelibrary.org',
    city: 'Greenville',
    zipCode: '29601',
    selectors: {
      eventContainer: 'div[class*="event"], .views-row',
      title: 'h2, h3',
      date: 'time, .event-date',
      location: '.event-location, [class*="location"]',
      description: 'p, [class*="description"]',
      url: 'a[href*="/event"]'
    }
  },
  {
    // RELOCATED 2026-09-02 to scraper-librarycalendar-libraries-MD-VA.js as
    // LibraryCalendar-Libraries-andersonlibrary. This is NOT a custom Drupal site:
    // its markup is LibraryCalendar (`div.lc-event > article.event-card`,
    // `h3.lc-event__title`), which that file already parses.
    //
    // Why this entry reported "found 0 events" every run, and why it was never an
    // extraction bug here: the URL below is the month GRID view, whose markup contains
    // no `.views-row` at all, so the selectors could never match. The site itself is
    // healthy — 481ms, HTTP 200, 234KB — and /events/upcoming serves 24 dated events.
    //
    // STILL ENABLED ON PURPOSE, per the Worcester rule: the replacement has not yet
    // produced database rows, so removing this now would delete coverage on an unproven
    // claim. Delete this entry only after a real LibraryCalendar-Libraries run stores
    // Anderson rows; until then it costs one page load and correctly stores nothing.
    name: 'Anderson County Library System',
    url: 'https://www.andersonlibrary.org/events/month',
    county: 'Anderson',
    state: 'SC',
    website: 'https://www.andersonlibrary.org',
    city: 'Anderson',
    zipCode: '29621',
    selectors: {
      eventContainer: '.views-row, article[class*="event"]',
      title: 'h2 a, h3 a',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"]'
    }
  },
  {
    name: 'Florence County Library System',
    url: 'https://www.florencelibrary.org/events',
    county: 'Florence',
    state: 'SC',
    website: 'https://www.florencelibrary.org',
    city: 'Florence',
    zipCode: '29501',
    // GUARDED 2026-09-05 - right library, right state, WRONG PLATFORM. The Step 3d
    // verifier reported event containers present but no parseable dates, and a
    // markup probe found 48 h3.lc-event__title and 55 .event-card: this is a
    // LibraryCalendar instance, so the selectors below can never match it. The
    // configured /events path also 301s to the MONTH GRID, the same trap as
    // Anderson County on 2026-09-02. Relocated to LibraryCalendar-Libraries at
    // /events/upcoming and PROVEN LIVE the same day - 23 events found including
    // Toddler Storytime, Family Storytime and Preschool Storytime - so this is a
    // duplicate rather than a coverage gap.
    urlCollision: 'florencelibrary.org runs LibraryCalendar, not custom Drupal - relocated to LibraryCalendar-Libraries on 2026-09-05 and proven live at 23 events',
    selectors: {
      eventContainer: '.views-row, article, div[class*="event"]',
      title: 'h2 a, h3 a, h2, h3',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"], a'
    }
  },

  // NORTH CAROLINA (3 libraries)
  {
    // Migrated in 2026-08-07 from Communico-NC (scraper-communico-libraries-...js),
    // whose wake.libnet.info/events entry now dead-redirects (302 to google.co.uk) —
    // Wake County migrated off Communico/LibNet to this custom Drupal calendar on
    // wake.gov. Verified live: 1,177 real dated events across ~20 branches, real
    // Drupal Views pager (?page=0,1,2...). Card markup is `.event--card` with a
    // `h2 a` title, `.date-time` date/time block, and `.eventbrite-card-location a`
    // branch link — distinct from this file's other configs but the same
    // querySelector-cascade extraction pattern already handles it.
    name: 'Wake County Public Libraries',
    url: 'https://www.wake.gov/events?title=&field_department_target_id=25&field_audience_target_id=All&field_category_id_target_id=All&location=All&field_end_date_value=&field_start_date_value=',
    county: 'Wake',
    state: 'NC',
    website: 'https://www.wake.gov/libraries',
    city: 'Raleigh',
    zipCode: '27601',
    // 18 events/page, 1177 total (mostly recurring storytimes booked out for
    // months). 8 pages (~144 events) covers roughly the next 1-2 weeks across all
    // branches without an unbounded daily crawl; the daily rotation plus upsert
    // dedup naturally cycles through the rest over time.
    maxPages: 8,
    getPageUrl: (pageIndex) =>
      `https://www.wake.gov/events?title=&field_department_target_id=25&field_audience_target_id=All&field_category_id_target_id=All&location=All&field_end_date_value=&field_start_date_value=&page=${pageIndex}`,
    scraperName: 'CustomDrupal-Libraries-wake',
    selectors: {
      eventContainer: '.event--card',
      title: 'h2 a span, h2 a',
      date: '.date-time',
      location: '.eventbrite-card-location a, .eventbrite-card-location',
      description: '.description, p',
      url: 'h2 a'
    }
  },
  // REMOVED: Greensboro Public Library - 403 Forbidden error
  // {
  //   name: 'Greensboro Public Library',
  //   url: 'https://library.greensboro-nc.gov/about-us/calendar-of-library-events',
  //   county: 'Guilford',
  //   state: 'NC',
  //   website: 'https://library.greensboro-nc.gov',
  //   city: 'Greensboro',
  //   zipCode: '27401',
  //   selectors: {
  //     eventContainer: '.views-row, div[class*="event"]',
  //     title: 'h3, h2',
  //     date: 'time, .event-date',
  //     location: '.field-event-location, .location',
  //     description: 'p, .description',
  //     url: 'a[href*="/event"]'
  //   }
  // },
  {
    name: 'Rowan County Public Library',
    url: 'https://www.rowancountylibrary.org/events/upcoming',
    county: 'Rowan',
    state: 'NC',
    website: 'https://www.rowancountylibrary.org',
    city: 'Salisbury',
    zipCode: '28144',
    // GUARDED 2026-09-05 - WRONG STATE and wrong platform, a Defect A collision.
    // rowancountylibrary.org is Rowan County Public Library of MOREHEAD KENTUCKY,
    // 175 Beacon Hill Rd, KY 40351, ph 606-784-7137 - taken from the live page,
    // never from the name, because both states have a Rowan County and that is
    // precisely how this collision was minted. The control is that ZIP 40351
    // matches the WordPress-KY entry byte for byte. It also runs LibraryCalendar
    // (35 div.lc-event, 24 h3.lc-event__title), so it was relocated there under KY
    // and PROVEN LIVE at 19 events including Toddler Time, Preschool Storytime,
    // Kids LEGO Club and Teen Game Night.
    // ROWAN COUNTY NORTH CAROLINA IS NOW AN OPEN COVERAGE GAP. Its real library is
    // Rowan Public Library in Salisbury NC and nothing here has been shown to
    // cover it - no such claim is made.
    urlCollision: 'rowancountylibrary.org is KENTUCKY not NC - Rowan County Public Library, 175 Beacon Hill Rd, Morehead KY 40351, ph 606-784-7137. Relocated to LibraryCalendar-Libraries under KY on 2026-09-05, proven live at 19 events. Rowan County NC remains uncovered',
    selectors: {
      eventContainer: '.views-row, article, div[class*="event"]',
      title: 'h2 a, h3 a, h2, h3',
      date: 'time, .event-date, [class*="date"]',
      location: '.location, [class*="location"]',
      description: '.description, p',
      url: 'a[href*="event"], a'
    }
  },

  // GEORGIA (1 library)
  {
    name: 'Cobb County Public Library System',
    url: 'https://www.cobbcounty.gov/events?department=85',
    county: 'Cobb',
    state: 'GA',
    website: 'https://www.cobbcounty.gov/library',
    city: 'Marietta',
    zipCode: '30060',
    selectors: {
      eventContainer: '[class*="border-accent-1"][class*="border-t"]',
      title: 'h3',
      date: 'span.text-primary-1',
      // location and description previously BOTH reused the date selector
      // above, so every Cobb event took the date string as its venue. That fed
      // saveEvent an address of the form "Wednesday, August 5, 2026, Marietta,
      // Cobb County, GA", which geocoding could not resolve and which cost the
      // events their save — the run logged 7 extractions on 2026-08-05 and the
      // database ended up with 0 rows for this library. Cobb is the only config
      // in this file that had this collision; every other one already uses
      // distinct selectors, so these are aligned to the same shape they use.
      // Neither element exists on cobbcounty.gov's list markup, which is the
      // intended outcome: venue then falls back to the library name below
      // rather than to a date, and an absent description is left empty per
      // CLAUDE.md's "descriptions stay empty if the scraper didn't supply one".
      location: '.event-location, [class*="location"]',
      description: 'p, [class*="description"]',
      url: 'a[href*="/events/"]'
    }
  },

  // WEST VIRGINIA (1 library)
  {
    name: 'Kanawha County Public Library',
    url: 'https://www.kcpls.org/events/upcoming',
    county: 'Kanawha',
    state: 'WV',
    website: 'https://www.kcpls.org',
    city: 'Charleston',
    zipCode: '25301',
    selectors: {
      eventContainer: '.views-row, div[class*="event"]',
      title: 'h3, a[href*="/event/"]',
      date: '.field-event-date, time',
      location: '.field-event-location, [class*="location"]',
      description: '.field-event-description, p',
      url: 'a[href*="/event/"]'
    }
  }
];

// Parse age range from text.
// IMPORTANT: This function is called with `name + description + audience` concatenated.
// We prioritize the explicit audience signal because library descriptions often contain
// the word "adult" in unrelated context (e.g., "an adult must accompany the child"),
// which previously caused 43+ kid-friendly storytimes to be incorrectly flagged adult-only.
function parseAgeRange(text, audienceField = '') {
  if (!text && !audienceField) return 'All Ages';

  // 1) Strong audience-field signals always win, regardless of what's in the description
  const aud = (audienceField || '').toLowerCase();
  if (aud) {
    // Explicit kid age groups in audience field — return early, don't check the broader text
    if (/\b(birth|infant|baby|babies|toddler|preschool|pre-school|early\s+childhood)\b/.test(aud)) {
      if (/\bteens?\b/.test(aud)) return 'All Ages';
      if (/\b(elementary|grade|kids?|children)\b/.test(aud)) return 'Children (6-12)';
      if (/\btoddler|preschool|pre-school\b/.test(aud)) return 'Preschool (3-5)';
      return 'Babies & Toddlers (0-2)';
    }
    if (/\b(family|families|all\s*ages|all-ages)\b/.test(aud) && !/\b(adults?\s*only)\b/.test(aud)) {
      return 'All Ages';
    }
    if (/\b(elementary|grade|kids?|children|youth|tweens?)\b/.test(aud)) return 'Children (6-12)';
    if (/\bteens?\b/.test(aud) && !/\badults?\b/.test(aud)) return 'Teens (13-17)';
    // Audience explicitly says adults-only and no kid keyword → adults
    if (/\badults?\b/.test(aud) && !/\b(family|families|all\s*ages|kids?|children|teens?|toddler|preschool|baby|babies|infant)\b/.test(aud)) {
      return 'Adults';
    }
  }

  const lowerText = (text || '').toLowerCase();

  // 2) Check for adult-only indicators — explicit labels
  // Catches: "Adults", "Adults Only", "18+", "21+", "Adult", "Audience: Adults"
  // But NOT: "Young Adult" (= teens), "Adults and Children", "Families and Adults"
  // Also exclude common library phrases ("an adult must accompany", "adult registration required")
  // that appear in family-event descriptions.
  if (/\badults?\b/i.test(lowerText)
      && !/\byoung\s+adults?\b/i.test(lowerText)
      && !/\b(and\s+)?adults?\s+(and\s+)?(children|kids|families|family|teens?|all\s*ages)/i.test(lowerText)
      && !/\b(children|kids|families|family|teens?|all\s*ages)\s+(and\s+)?adults?\b/i.test(lowerText)
      && !/\b(an?\s+)?adults?\s+(must|should|may|will|can|need|are\s+(required|asked|expected))\b/i.test(lowerText)
      && !/\b(accompanied|accompany|with|by|registration|caregiver|guardian)\s+(?:by\s+)?(?:an?\s+)?adults?\b/i.test(lowerText)) {
    return 'Adults';
  }
  if (/\b18\+/.test(lowerText) || /\b21\+/.test(lowerText)) {
    return 'Adults';
  }

  // Check for adult-oriented event keywords (career, professional, senior services, etc.)
  if (/\b(career\s*coach|career\s*fair|career\s*services|job\s*fair|job\s*search|resume\s*(workshop|writing|review|help|clinic)|interview\s*(prep|skills|workshop)|networking\s*(event|mixer|session)|professional\s*development|linkedin|salary\s*negoti|cover\s*letter|workforce|employment\s*(workshop|services)|tax\s*(prep|help|assistance|clinic)|estate\s*planning|retirement\s*planning|medicare|social\s*security|caregiver\s*support|grief\s*support|divorce|legal\s*clinic|legal\s*aid|blood\s*pressure|health\s*screening|AA\s*meeting|al-anon|narcotics\s*anonymous|book\s*club\s*for\s*adults|adult\s*book\s*club|adult\s*craft|adult\s*coloring|adult\s*program|for\s*adults|seniors?\s*only)\b/i.test(lowerText)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (/\b(babies?|infants?|0\s*[-–]\s*2)\b/i.test(lowerText)) return 'Babies & Toddlers (0-2)';
  if (/\b(toddlers?|preschool|pre-school|3\s*[-–]\s*5)\b/i.test(lowerText)) return 'Preschool (3-5)';
  if (/\b(children|kids|6\s*[-–]\s*12|elementary)\b/i.test(lowerText)) return 'Children (6-12)';
  if (/\b(teens?|13\s*[-–]\s*17|middle\s*school|high\s*school)\b/i.test(lowerText)) return 'Teens (13-17)';
  if (/\b(family|families|all\s*ages)\b/i.test(lowerText)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Drupal-based library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // A guarded entry is NOT fetched, but it still prints the "📍 name" +
  // "Found 0 events" pair, because that pair is what gives the library a row in
  // LIBRARY-SITE-AUDIT.md. Dropping the row is what hid BiblioCommons-* and
  // Communico-* from the audit until 2026-08-20: a site absent from the audit is
  // indistinguishable from a site that does not exist. The guard also stops the
  // verifier re-fetching a URL already proven to belong to somewhere else — the
  // exact failure fixed in build-verify-input.js on 2026-09-03.
  if (library.urlCollision) {
    console.log(`   ⛔ GUARDED: ${library.urlCollision}`);
    console.log(`   Found 0 events`);
    return { imported: 0, failed: 0, skipped: 0 };
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Sites with a getPageUrl() + maxPages configured are paginated (Drupal Views
    // pager). Everything else keeps the original single-page behavior.
    const pageCount = library.maxPages || 1;
    const events = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const pageUrl = pageIndex === 0
        ? library.url
        : (library.getPageUrl ? library.getPageUrl(pageIndex) : null);
      if (!pageUrl) break;

      // OPTIMIZED: Faster page load strategy
      const response = await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        // 45s, raised from 15s on 2026-09-01 (§1.4). Richland Library
        // (richlandlibrary.com) exceeded 15s on EVERY run and was therefore
        // never scraped at all — it has zero rows in the database, ever. 15s is
        // tight for a Drupal library site rendering a full events view, and the
        // cost of being wrong is asymmetric: a slow site that times out is lost
        // silently and permanently, while an extra 30s of patience costs one
        // scraper run a few seconds. Matches the 30s+ budgets used elsewhere in
        // the fleet for the same reason.
        timeout: 45000
      });

      // Check for HTTP errors
      if (response && (response.status() === 404 || response.status() >= 500)) {
        console.log(`  ⚠️ HTTP ${response.status()} for ${pageUrl}, skipping`);
        if (pageIndex === 0) {
          await page.close();
          return { imported: 0, failed: 1, skipped: 0, total: 0 };
        }
        break; // later page failed — keep what we already collected
      }

      // Wait for page to load - OPTIMIZED: Reduced from 3000ms
      await page.waitForSelector('body', { timeout: 3000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract events using library-specific selectors
      const pageEvents = await page.evaluate((selectors) => {
      const results = [];

      // Try each selector variant for event containers
      const containerSelectors = selectors.eventContainer.split(',').map(s => s.trim());
      let eventElements = [];

      for (const selector of containerSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleSelectors = selectors.title.split(',').map(s => s.trim());
          let titleEl = null;
          for (const selector of titleSelectors) {
            titleEl = el.querySelector(selector);
            if (titleEl) break;
          }
          if (!titleEl) return;

          const title = titleEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (!title || title.length < 3) return;

          // Skip UI elements that aren't real events
          if (/^(Filter|Search|Clear|Apply|Reset|Show|Hide|More|Less|Close|Open|Menu)$/i.test(title)) return;

          // Extract URL
          const urlSelectors = selectors.url.split(',').map(s => s.trim());
          let linkEl = null;
          for (const selector of urlSelectors) {
            linkEl = el.querySelector(selector);
            if (linkEl && linkEl.href) break;
          }
          const url = linkEl ? linkEl.href : '';

          // Get all text content for pattern matching
          const fullText = el.textContent;

          // Extract date
          let eventDate = '';
          const dateSelectors = selectors.date.split(',').map(s => s.trim());
          let dateEl = null;
          for (const selector of dateSelectors) {
            dateEl = el.querySelector(selector);
            if (dateEl) break;
          }

          if (dateEl) {
            // Normalize whitespace (remove newlines and collapse spaces)
            eventDate = dateEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          }

          // Detect cases where the matched element gives only time/duration info but
          // no real date — we need to look elsewhere on the card for the date.
          //   - "10:00 am" / "10:00 am - 12:00 pm"           → pure time
          //   - "All Day"                                     → all-day flag
          //   - "All Day 5/23–5/25"                           → has a date, but our
          //                                                      normalizer rejects it as a
          //                                                      whole string; extract the date
          //                                                      portion before falling back
          const hasMonth = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i.test(eventDate);
          const hasNumericDate = /\d{1,2}\/\d{1,2}/.test(eventDate);
          const isTimeOnly = eventDate &&
            (
              (/^\d{1,2}:\d{2}\s*(?:am|pm)/i.test(eventDate) && !hasMonth) ||
              (/^all\s*day\b/i.test(eventDate) && !hasMonth && !hasNumericDate)
            );
          // "All Day 5/23–5/25" — strip the "All Day" prefix so the normalizer can use
          // the date range that follows.
          if (eventDate && /^all\s*day\b/i.test(eventDate) && (hasMonth || hasNumericDate)) {
            eventDate = eventDate.replace(/^all\s*day\s*/i, '').trim();
          }

          if (!eventDate || isTimeOnly) {
            // Try to extract date from full text
            const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{4}|\s+\d{4})?/i) ||
                             fullText.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                             fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?/i);
            if (dateMatch) {
              // Combine date with original time if we have both
              if (isTimeOnly && /^\d{1,2}:\d{2}\s*(?:am|pm)/i.test(eventDate)) {
                eventDate = dateMatch[0] + ' ' + eventDate;
              } else {
                eventDate = dateMatch[0];
              }
            }
          }

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract location
          let location = '';
          const locationSelectors = selectors.location.split(',').map(s => s.trim());
          let locationEl = null;
          for (const selector of locationSelectors) {
            locationEl = el.querySelector(selector);
            if (locationEl) break;
          }
          if (locationEl) {
            location = locationEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
            // Skip invalid location values (UI elements)
            if (/^(open filter|filter|virtual event|online|zoom)$/i.test(location)) {
              location = '';
            }
          } else {
            // Try to extract from text
            const locationMatch = fullText.match(/(?:Location|Branch|Library):\s*([^\n]+)/i);
            if (locationMatch) location = locationMatch[1].trim();
          }

          // Extract description
          let description = '';
          const descSelectors = selectors.description.split(',').map(s => s.trim());
          let descEl = null;
          for (const selector of descSelectors) {
            descEl = el.querySelector(selector);
            if (descEl) break;
          }
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // If eventDate is still time-only (no actual date found), use today's date
          const stillTimeOnly = eventDate && /^\d{1,2}:\d{2}\s*(?:am|pm)/i.test(eventDate) &&
                               !/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}|\d{1,2}\/\d{1,2})/i.test(eventDate);
          if (stillTimeOnly) {
            const today = new Date();
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            eventDate = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()} ${eventDate}`;
          }

          // Extract audience/age info from page elements
          let audience = '';
          const audienceEl = el.querySelector('[class*="audience"], [class*="age-group"], [class*="event-type"], .taxonomy-term, [class*="category"]');
          if (audienceEl) {
            audience = audienceEl.textContent.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          }
          // Also check for audience in full text patterns
          if (!audience) {
            const audMatch = fullText.match(/(?:Audience|Age Group|For|Who):\s*([^\n]+)/i);
            if (audMatch) audience = audMatch[1].trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              fullText: fullText,
              audience: audience
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
      }, library.selectors);

      console.log(`   Page ${pageIndex + 1}/${pageCount}: found ${pageEvents.length} events`);
      if (pageEvents.length === 0) break; // ran out of results, stop paginating
      events.push(...pageEvents);

      if (pageIndex < pageCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // be polite between pages
      }
    }

    console.log(`   Found ${events.length} events total`);

    // Visit detail pages to extract audience info when not found on listing card
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event.audience && event.url) {
        try {
          await page.goto(event.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await new Promise(resolve => setTimeout(resolve, 500));

          const detailAudience = await page.evaluate(() => {
            // Look for audience/age-group fields on the detail page
            // Richland Library uses field labels like "Audience:" with taxonomy terms
            const selectors = [
              // Drupal field label + value pattern
              '.field--name-field-audience .field__item',
              '.field--name-field-age-group .field__item',
              '[class*="audience"] .field__item',
              '[class*="age-group"] .field__item',
              // Generic taxonomy terms near "Audience" label
              '.taxonomy-term',
              '[class*="event-type"] .field__item',
              '[class*="category"] .field__item',
            ];

            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                const text = el.textContent.trim();
                if (text && /\b(adults?|children|kids|teens?|families|all\s*ages|baby|toddler|preschool|tween|senior)\b/i.test(text)) {
                  return text;
                }
              }
            }

            // Fallback: search entire page text for "Audience: ..." pattern
            const bodyText = document.body ? document.body.innerText : '';
            const audMatch = bodyText.match(/(?:Audience|Age\s*Group|For|Who|Intended\s*for):\s*([^\n]+)/i);
            if (audMatch) return audMatch[1].trim();

            return '';
          });

          if (detailAudience) {
            events[i].audience = detailAudience;
            console.log(`   🏷️ Detail page audience for "${event.name.substring(0, 40)}": ${detailAudience}`);
          }
        } catch (err) {
          // Detail page failed — continue with what we have
        }
      }
    }

    // Navigate back isn't needed since we process events from stored data

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description, title, and audience tag.
        // Pass audience separately so explicit audience signals (e.g. "Birth to Preschool")
        // win over loose "adult" word matches in the description body.
        const ageRange = parseAgeRange(event.name + ' ' + event.description, event.audience || '');

        if (ageRange === 'Adults') {
          console.log(`   ⛔ Skipping adult event: "${event.name.substring(0, 50)}" (audience: ${event.audience || 'keyword match'})`);
          skipped++;
          continue;
        }

        // Geocode with intelligent fallback
        let coordinates = null;
        if (event.venue && event.venue.trim()) {
          const fullAddress = `${event.venue}, ${library.city}, ${library.county} County, ${library.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            venueName: event.venue,
            sourceName: library.name
          });
        } else {
          // If no venue specified, use library's main location
          coordinates = await geocodeWithFallback(`${library.city}, ${library.state}`, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            sourceName: library.name
          });
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse date to get Date object for Timestamp
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Custom Drupal Scraper',
            sourceName: library.name,
            // The site's own listing page (not the per-event URL) — lets
            // verify-coverage.js establish identity by host. Safe to set for every
            // config in this file since library.url is already each site's calendar.
            sourceUrl: library.url,
            // Per-CLAUDE.md scraper-naming rules, only set when the config declares
            // one explicitly (new coverage). The other 7 configs in this file still
            // fall back to sourceName (their library display name) — a known,
            // documented gap (see fix-notes.json / CustomDrupal-Libraries) that is a
            // deliberate, scoped rename migration, not something to fix piecemeal here.
            ...(library.scraperName ? { scraperName: library.scraperName } : {}),
            county: library.county,
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

        const addResult = await db.collection('events').add(eventDoc);
        if (addResult.skipped) {
          console.log(`  ⏭️  ${addResult.skipReason}`);
        } else if (addResult.duplicate) {
          // 23505: the row already existed, nothing was written. Counting this as
          // an import is what let collapsed-id scrapers report healthy NEW counts
          // while saving nothing (see SCRAPER-FIX-LOG.jsonl 2026-08-10).
          skipped++;
        } else {
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        }
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
    // BOTH STREAMS, DELIBERATELY (2026-09-01, §1.4).
    //
    // This used to write only to console.error. run-scrapers.bat sends stdout and
    // stderr to SEPARATE files, and the Step 3b library audit is built by parsing
    // scrapers/logs/scraper-stdout.log — so a site that crashed printed its
    // "📍 name" and "URL:" header to stdout and then nothing, which is
    // indistinguishable from a site whose calendar is genuinely empty. Richland
    // Library had been failing on a navigation timeout every single run and was
    // recorded in the audit as a zero-event site, with the real reason sitting
    // unread in the other file.
    //
    // The "Found 0 events" line matters as much as the error text: it is the
    // shape build-library-site-audit.js pairs with the "📍" header, so without it
    // the site produces no audit row at all.
    const msg = `  ❌ Error scraping ${library.name}: ${error.message}`;
    console.error(msg);
    console.log(msg);
    console.log(`   Found 0 events`);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeCustomDrupalLibraries() {
  console.log('\n📚 CUSTOM DRUPAL LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 5 libraries across 4 states (GA, NC, SC, WV)');
  console.log('Population reach: ~2.15 million people\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('CustomDrupal-GA-NC-SC-WV', 'events', {
    source: 'drupal'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.calendarUrl || library.eventsUrl, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);

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

  // Log to database with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Cloud Function wrapper
async function scrapeCustomDrupalLibrariesCloudFunction() {
  console.log('\n📚 Custom Drupal Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeCustomDrupalLibraries();

    return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'Custom Drupal libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in Custom Drupal scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeCustomDrupalLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCustomDrupalLibraries, scrapeCustomDrupalLibrariesCloudFunction };

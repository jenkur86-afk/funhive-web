const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');

/**
 * Virginia Custom-Site Libraries Scraper
 *
 * Only covers libraries with custom websites (not LibCal, LibraryMarket,
 * BiblioCommons, LibNet/Communico, or LibraryCalendar — those have dedicated scrapers).
 *
 * Libraries moved to dedicated scrapers:
 *   → libcal-VA:         Richmond, Norfolk, Newport News, Hampton, Roanoke, Suffolk, Williamsburg, Library of VA
 *   → libcal-VA (existing): Fairfax County, Arlington, Prince William
 *   → LibraryMarket:     Virginia Beach
 *   → BiblioCommons:     Staunton, Central Rappahannock
 *   → Communico:         Loudoun County, Chesterfield County
 *   → LibraryCalendar:   Lynchburg, Portsmouth
 */
const LIBRARIES = [
  { name: 'Alexandria Library', url: 'https://alexlibraryva.org', eventsUrl: 'https://alexlibraryva.org/events', city: 'Alexandria', state: 'VA', zipCode: '22314', county: 'Alexandria' },
  { name: 'Chesapeake Public Library', url: 'https://www.chesapeakepubliclibrary.org', eventsUrl: 'https://events.chesapeakelibrary.org/events', city: 'Chesapeake', state: 'VA', zipCode: '23320', county: 'Chesapeake' },
  { name: 'Henrico County Public Library', url: 'https://www.henricolibrary.org', eventsUrl: 'https://www.henricolibrary.org/events', city: 'Henrico', state: 'VA', zipCode: '23228', county: 'Henrico' },
  { name: 'Jefferson-Madison Regional Library', url: 'https://jmrl.org', eventsUrl: 'https://jmrl.org/events', city: 'Charlottesville', state: 'VA', zipCode: '22902', county: 'Charlottesville' },
  { name: 'Manassas Park City Library', url: 'https://www.manassasparkcitylibrary.org', eventsUrl: 'https://www.manassasparkcitylibrary.org/events', city: 'Manassas Park', state: 'VA', zipCode: '20111', county: 'Manassas Park' },
  { name: 'Newport News Public Library', url: 'https://library.nnva.gov', eventsUrl: 'https://library.nnva.gov/264/Events-Calendar', city: 'Newport News', state: 'VA', zipCode: '23601', county: 'Newport News' },
  { name: 'Culpeper County Library', url: 'https://www.cclva.org', eventsUrl: 'https://www.cclva.org/events/upcoming', city: 'Culpeper', state: 'VA', zipCode: '22701', county: 'Culpeper' },
  // Falls Church: no family events (adult programming only)
  // Harrisonburg-Rockingham: DNS failure (ERR_NAME_NOT_RESOLVED) — hrbpl.org appears defunct
  // NOTE: ~230 fabricated "{city}library.org" entries were removed (Apr 2026).
  // They were auto-generated from a spreadsheet and most domains don't exist.
  // Real VA libraries are covered by dedicated scrapers: LibCal-VA, BiblioCommons-VA,
  // Communico-DC-VA, LibraryCalendar-VA, FullCalendar-VA, and LibraryMarket.
];

const SCRAPER_NAME = 'wordpress-VA';

/**
 * Validates that text looks like a real event date (not just a time, weekday, or number).
 * Must contain either a month name/abbreviation or a numeric date pattern.
 */
function isValidDateString(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 5) return false;

  // Reject time-only strings like "9:00am–9:30am" or "10:30am"
  if (/^\d{1,2}:\d{2}\s*(am|pm)/i.test(t) && !/\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|oct|nov|dec|january|february|august|september|october|november|december)\b/i.test(t) && !/\d{1,2}\/\d{1,2}/.test(t)) {
    return false;
  }

  // Must contain a month name or a numeric date pattern (MM/DD, YYYY-MM-DD, etc.)
  const hasMonth = /\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|oct|nov|dec|january|february|august|september|october|november|december)\b/i.test(t);
  const hasNumericDate = /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/.test(t);
  return hasMonth || hasNumericDate;
}

/**
 * Check if text is junk (UI element, category header, calendar artifact, etc.)
 */
function isJunkTitle(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 4) return true;
  if (t.length > 200) return true; // Extremely long text is probably page content, not an event title

  // Calendar grid artifacts: "0 events\n\n30", "2 events\n\n4", "M\n\nMonday"
  if (/^\d+\s*events?\b/i.test(t)) return true;
  if (/^[MTWFS]\n/i.test(t)) return true; // Calendar day headers
  if (/^\d{1,2}\n/.test(t)) return true; // Calendar date cells

  // UI navigation elements
  const UI_JUNK = /^(skip to|rsvp|google calendar|icalendar|outlook|export|download|add to calendar|share this|list|month|day|week|this month|prev|next|view all|see all|show more|load more|back to|return to|sign up|log in|register|subscribe|more info|learn more|read more|click here|view details|event details|events search|views navigation)\b/i;
  if (UI_JUNK.test(t)) return true;

  // Error/empty state messages
  const ERROR_JUNK = /^(sorry|but don't give up|no events|there are no|no results|nothing found|loading|please wait|search results|filter|we couldn't find|page not found|error|oops)/i;
  if (ERROR_JUNK.test(t)) return true;

  // Category headers / audience labels (standalone)
  const CATEGORY_JUNK = /^(family|adults?|teens?|tweens?|children|kids|seniors?|all ages?|baby|babies|toddlers?|preschool|storytime|programs?|calendar|home|library|details|info|more|events?|upcoming|featured|popular|new|today|tomorrow|this week|this weekend)$/i;
  if (CATEGORY_JUNK.test(t)) return true;

  // Age range headers like "Teen (ages 13-18)", "Children (5-10)", "Adults"
  if (/^(teen|tween|children|kids|adult|senior|baby|toddler|preschool|family)\s*(\(.*\))?$/i.test(t)) return true;

  // Month names (standalone or with year) - calendar navigation
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(\s+\d{4})?$/i.test(t)) return true;

  // Day names (standalone)
  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/i.test(t)) return true;

  // Pure numbers or very short codes
  if (/^\d+$/.test(t)) return true;

  // Contains mostly newlines or whitespace (garbled content)
  const lines = t.split('\n').filter(l => l.trim().length > 0);
  if (lines.length > 3 && lines.every(l => l.trim().length < 15)) return true; // Multi-line short fragments = calendar grid

  return false;
}

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name} (${library.eventsUrl})...`);
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const seen = new Set();

        function addEvent(title, date, description, url, ageRange) {
          if (!title || title.length < 4) return;
          const key = title.toLowerCase().trim();
          if (seen.has(key)) return;
          seen.add(key);
          events.push({
            title: title.trim(),
            date: date || '',
            description: (description || '').substring(0, 500),
            url: url || '',
            ageRange: ageRange || '',
            location: libName,
            venueName: libName
          });
        }

        // Strategy 1: Tribe Events (The Events Calendar WordPress plugin - very common)
        document.querySelectorAll(
          '.tribe-events-single, .tribe_events, .type-tribe_events, ' +
          '.tribe-events-list .tribe-events-loop .type-tribe_events, ' +
          '.tribe-events-calendar td[class*="tribe-events-has-events"], ' +
          '.tribe-common-g-row'
        ).forEach(card => {
          const titleEl = card.querySelector('.tribe-events-list-event-title a, .tribe-event-url a, h2 a, h3 a, .tribe-events-title a, [class*="title"] a');
          const dateEl = card.querySelector('.tribe-event-schedule-details, time, [datetime], abbr[class*="tribe"]');
          if (titleEl) {
            const date = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
            addEvent(titleEl.textContent, date, '', titleEl.href, '');
          }
        });

        // Strategy 2: Look for structured event containers with BOTH title AND date
        if (events.length < 3) {
          const eventCards = document.querySelectorAll(
            '.event-card, .event-item, .event-listing, .event-row, ' +
            '[class*="event-card"], [class*="event-item"], [class*="event-listing"], ' +
            '.views-row, .view-content .views-row, ' +
            'article.event, article[class*="event"]'
          );

          eventCards.forEach(card => {
            const titleEl = card.querySelector('h2, h3, h4, [class*="title"] a, [class*="title"], .field-name-title a, .field-name-title');
            const dateEl = card.querySelector('time, [class*="date"], .field-name-field-date, [datetime]');
            const descEl = card.querySelector('[class*="description"], [class*="summary"], [class*="teaser"], .field-name-body p');
            const linkEl = card.querySelector('a[href*="event"], a[href*="program"], h2 a, h3 a, [class*="title"] a');
            const ageEl = [
              card.querySelector('[class*="audience"]'),
              card.querySelector('[class*="age-group"]'),
              card.querySelector('[class*="category"]')
            ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

            if (titleEl && titleEl.textContent.trim()) {
              const date = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
              addEvent(titleEl.textContent, date, descEl ? descEl.textContent.trim() : '', linkEl ? linkEl.href : '', ageEl ? ageEl.textContent.trim() : '');
            }
          });
        }

        // Strategy 3: LibCal-style widgets (some libraries embed LibCal on WordPress pages)
        if (events.length < 3) {
          document.querySelectorAll('.s-lc-ea-tbd, .s-lc-ea-ebd, [id*="s-lc-ea"], .lc_calendar_event').forEach(card => {
            const titleEl = card.querySelector('.s-lc-ea-ttl a, .s-lc-ea-ttl, a[class*="title"]');
            const dateEl = card.querySelector('.s-lc-ea-dt, .s-lc-ea-dtb, [class*="date"]');
            if (titleEl) {
              addEvent(titleEl.textContent, dateEl ? dateEl.textContent.trim() : '', '', titleEl.href || '', '');
            }
          });
        }

        // Strategy 4: Broader search — any container with paired title + date
        if (events.length < 3) {
          document.querySelectorAll('[class*="event"]:not(nav):not(header):not(footer)').forEach(card => {
            if (card.closest('nav, header, footer, [class*="filter"], [class*="search"], [class*="calendar-grid"], [class*="mini-cal"]')) return;
            if (card.tagName === 'NAV' || card.tagName === 'HEADER' || card.tagName === 'FOOTER') return;

            const titleEl = card.querySelector('h2, h3, h4');
            const dateEl = card.querySelector('time, [datetime], [class*="date"]:not([class*="calendar"])');

            if (titleEl && dateEl && titleEl.textContent.trim().length > 4) {
              addEvent(titleEl.textContent, dateEl.getAttribute('datetime') || dateEl.textContent.trim(), '', titleEl.querySelector('a') ? titleEl.querySelector('a').href : '', '');
            }
          });
        }

        // Strategy 5: Last resort — scan all links that look like event detail pages
        if (events.length < 3) {
          document.querySelectorAll('a[href*="/event"], a[href*="/program"], a[href*="/calendar/"]').forEach(link => {
            if (link.closest('nav, header, footer')) return;
            const title = link.textContent.trim();
            if (title.length > 4 && title.length < 200) {
              // Look for a nearby date element
              const parent = link.closest('li, tr, div, article');
              const dateEl = parent ? parent.querySelector('time, [datetime], [class*="date"]') : null;
              const date = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
              addEvent(title, date, '', link.href, '');
            }
          });
        }

        return events;
      }, library.name);

      // Server-side filtering: apply junk title check; accept events even without date
      // (saveEventsWithGeocoding will handle date normalization/rejection downstream)
      const validEvents = libraryEvents.filter(event => {
        if (isJunkTitle(event.title)) {
          return false;
        }
        // Accept events with any date string OR a valid URL (detail pages have dates)
        if (!event.date && !event.url) {
          return false;
        }
        return true;
      });

      console.log(`   Found ${libraryEvents.length} raw → ${validEvents.length} valid events`);

      validEvents.forEach(event => events.push({
        ...event,
        state: 'VA',
        metadata: {
          sourceName: library.name,
          sourceUrl: library.url,
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          category: 'library',
          state: 'VA',
          city: library.city,
          zipCode: library.zipCode
        }
      }));

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error: ${library.name}:`, error.message);
    }
  }

  await browser.close();
  console.log(`\n📊 Total valid events: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVACloudFunction() {
  console.log('☁️ Running WordPress VA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-VA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressVACloudFunction };

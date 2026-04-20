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
  { name: 'Falls Church Library', url: 'https://www.fallschurchva.gov/library', eventsUrl: 'https://www.fallschurchva.gov/library/events', city: 'Falls Church', state: 'VA', zipCode: '22046', county: 'Falls Church' },
  { name: 'Harrisonburg-Rockingham Public Library', url: 'https://www.hrbpl.org', eventsUrl: 'https://www.hrbpl.org/events', city: 'Harrisonburg', state: 'VA', zipCode: '22801', county: 'Harrisonburg' },
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

        // Strategy 1: Look for structured event containers with BOTH title AND date
        const eventCards = document.querySelectorAll(
          '.event-card, .event-item, .event-listing, .event-row, ' +
          '[class*="event-card"], [class*="event-item"], [class*="event-listing"], ' +
          '.views-row, .view-content .views-row, ' +
          'article.event, article[class*="event"], ' +
          '.tribe-events-single, .tribe_events, .type-tribe_events'
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
            const title = titleEl.textContent.trim();
            const key = title.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            events.push({
              title: title,
              date: dateEl ? dateEl.textContent.trim() : (dateEl && dateEl.getAttribute('datetime') ? dateEl.getAttribute('datetime') : ''),
              description: descEl ? descEl.textContent.trim().substring(0, 500) : '',
              url: linkEl ? linkEl.href : '',
              ageRange: ageEl ? ageEl.textContent.trim() : '',
              location: libName,
              venueName: libName
            });
          }
        });

        // Strategy 2: If strategy 1 found very few events, try broader but still paired title+date
        if (events.length < 3) {
          document.querySelectorAll('[class*="event"]:not(nav):not(header):not(footer)').forEach(card => {
            // Skip cards that are clearly navigation, filters, or calendar grids
            if (card.closest('nav, header, footer, [class*="filter"], [class*="search"], [class*="calendar-grid"], [class*="mini-cal"]')) return;
            if (card.tagName === 'NAV' || card.tagName === 'HEADER' || card.tagName === 'FOOTER') return;

            const titleEl = card.querySelector('h2, h3, h4');
            const dateEl = card.querySelector('time, [datetime], [class*="date"]:not([class*="calendar"])');

            if (titleEl && dateEl && titleEl.textContent.trim().length > 4) {
              const title = titleEl.textContent.trim();
              const key = title.toLowerCase();
              if (seen.has(key)) return;
              seen.add(key);
              events.push({
                title: title,
                date: dateEl.getAttribute('datetime') || dateEl.textContent.trim(),
                description: '',
                url: titleEl.querySelector('a') ? titleEl.querySelector('a').href : '',
                ageRange: '',
                location: libName,
                venueName: libName
              });
            }
          });
        }

        return events;
      }, library.name);

      // Server-side filtering: apply strict junk and date validation
      const validEvents = libraryEvents.filter(event => {
        if (isJunkTitle(event.title)) {
          return false;
        }
        if (!isValidDateString(event.date)) {
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

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToFirebase(events);
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
  const result = await saveToFirebase(events);
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressVACloudFunction };

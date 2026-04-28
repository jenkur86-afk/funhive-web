const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');

/**
 * Assabet Interactive Library Calendar Scraper
 * States: NH, MA
 * Coverage: 15 libraries using the Assabet Interactive calendar platform
 * URL pattern: https://[slug].assabetinteractive.com/calendar/
 */

const LIBRARIES = [
  // New Hampshire
  { name: 'Dover Public Library', slug: 'dovernh', eventsUrl: 'https://dovernh.assabetinteractive.com/calendar/', city: 'Dover', state: 'NH', zipCode: '03820' },
  { name: 'Derry Public Library', slug: 'derrypl', eventsUrl: 'https://derrypl.assabetinteractive.com/calendar/', city: 'Derry', state: 'NH', zipCode: '03038' },
  { name: 'Leach Library', slug: 'londonderrynh', eventsUrl: 'https://londonderrynh.assabetinteractive.com/calendar/', city: 'Londonderry', state: 'NH', zipCode: '03053' },
  { name: 'Wadleigh Memorial Library', slug: 'wadleighlibrary', eventsUrl: 'https://wadleighlibrary.assabetinteractive.com/calendar/', city: 'Milford', state: 'NH', zipCode: '03055' },
  { name: 'Lane Memorial Library', slug: 'hampton', eventsUrl: 'https://hampton.assabetinteractive.com/calendar/', city: 'Hampton', state: 'NH', zipCode: '03842' },
  { name: 'Goffstown Public Library', slug: 'goffstownlibrary', eventsUrl: 'https://goffstownlibrary.assabetinteractive.com/calendar/', city: 'Goffstown', state: 'NH', zipCode: '03045' },
  { name: 'Bedford Public Library', slug: 'bedfordnhlibrary', eventsUrl: 'https://bedfordnhlibrary.assabetinteractive.com/calendar/', city: 'Bedford', state: 'NH', zipCode: '03110' },
  { name: 'Amherst Town Library', slug: 'amherstlibrary', eventsUrl: 'https://amherstlibrary.assabetinteractive.com/calendar/', city: 'Amherst', state: 'NH', zipCode: '03031' },
  { name: 'Nesmith Library', slug: 'nesmithlibrary', eventsUrl: 'https://nesmithlibrary.assabetinteractive.com/calendar/', city: 'Windham', state: 'NH', zipCode: '03087' },
  // Massachusetts
  { name: 'Thomas Crane Public Library', slug: 'thomascranelibrary', eventsUrl: 'https://thomascranelibrary.assabetinteractive.com/calendar/', city: 'Quincy', state: 'MA', zipCode: '02169' },
  { name: 'Somerville Public Library', slug: 'somervillepubliclibrary', eventsUrl: 'https://somervillepubliclibrary.assabetinteractive.com/calendar/', city: 'Somerville', state: 'MA', zipCode: '02143' },
  { name: 'Haverhill Public Library', slug: 'haverhillpl', eventsUrl: 'https://haverhillpl.assabetinteractive.com/calendar/', city: 'Haverhill', state: 'MA', zipCode: '01830' },
  { name: 'Malden Public Library', slug: 'maldenpubliclibrary', eventsUrl: 'https://maldenpubliclibrary.assabetinteractive.com/calendar/', city: 'Malden', state: 'MA', zipCode: '02148' },
  { name: 'Taunton Public Library', slug: 'tauntonlibrary', eventsUrl: 'https://tauntonlibrary.assabetinteractive.com/calendar/', city: 'Taunton', state: 'MA', zipCode: '02780' },
  { name: 'Weymouth Public Libraries', slug: 'weymouth', eventsUrl: 'https://weymouth.assabetinteractive.com/calendar/', city: 'Weymouth', state: 'MA', zipCode: '02188' },
  { name: 'Chicopee Public Library', slug: 'chicopeepubliclibrary', eventsUrl: 'https://chicopeepubliclibrary.assabetinteractive.com/calendar/', city: 'Chicopee', state: 'MA', zipCode: '01013' },
  { name: 'Pollard Memorial Library', slug: 'pollardml', eventsUrl: 'https://pollardml.assabetinteractive.com/calendar/', city: 'Lowell', state: 'MA', zipCode: '01852' },
];

const SCRAPER_NAME = 'assabet-NH-MA';

async function scrapeAssabetEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`Scraping: ${library.name} (${library.slug})`);
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName, libSlug) => {
        const events = [];

        // Strategy 1: Look for Assabet-specific calendar event selectors
        const selectors = [
          '.event-card', '.event-listing', '.calendar-event',
          '.event-item', '.cal-event', '.event-entry',
          '.event_card', '.eventCard', '.event-row',
          '[class*="event-card"]', '[class*="calendar-event"]', '[class*="event-list"]',
          '[class*="event_item"]', '[class*="eventItem"]',
          '.fc-event', '.tribe-events-single', '.type-tribe_events'
        ];

        let eventElements = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            eventElements = found;
            break;
          }
        }

        // Strategy 2: Look for generic article/list patterns with event-like content
        if (eventElements.length === 0) {
          eventElements = document.querySelectorAll('article, .post, li[class*="event"], div[class*="event"]');
        }

        // Strategy 3: Look for links inside a calendar/events container
        if (eventElements.length === 0) {
          const containers = document.querySelectorAll('[class*="calendar"], [class*="events"], [id*="calendar"], [id*="events"], main, .content, #content');
          for (const container of containers) {
            const links = container.querySelectorAll('a[href*="/calendar/"], a[href*="/event/"], a[href*="/events/"]');
            if (links.length > 0) {
              eventElements = links;
              break;
            }
          }
        }

        eventElements.forEach(card => {
          // Try to extract title
          const titleEl = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
          const title = titleEl ? titleEl.textContent.trim() : (card.tagName === 'A' ? card.textContent.trim() : '');

          if (!title || title.length < 3) return;

          // Try to extract date
          const dateEl = card.querySelector('[class*="date"], time, [class*="when"], [class*="time"], [datetime]');
          let dateText = '';
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          } else {
            // Look for date-like text in the card
            const cardText = card.textContent;
            const dateMatch = cardText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?/i);
            if (dateMatch) dateText = dateMatch[0];
          }

          // Try to extract time
          const timeEl = card.querySelector('[class*="time"]');
          let timeText = '';
          if (timeEl && timeEl !== dateEl) {
            timeText = timeEl.textContent.trim();
          }
          if (timeText && dateText && !dateText.includes(timeText)) {
            dateText = dateText + ' ' + timeText;
          }

          // Try to extract description
          const descEl = card.querySelector('[class*="desc"], [class*="summary"], [class*="excerpt"], p');
          const description = descEl ? descEl.textContent.trim() : '';

          // Try to extract link
          let url = '';
          if (card.tagName === 'A') {
            url = card.href;
          } else {
            const linkEl = card.querySelector('a');
            if (linkEl) url = linkEl.href;
          }

          // Try to extract age/audience info
          const ageEl = [
            card.querySelector('[class*="audience"]'),
            card.querySelector('[class*="age"]'),
            card.querySelector('[class*="category"]')
          ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

          events.push({
            title: title,
            date: dateText,
            description: description.substring(0, 500),
            url: url,
            ageRange: ageEl ? ageEl.textContent.trim() : '',
            location: libName,
            venueName: libName
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(e => {
          const key = e.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name, library.slug);

      console.log(`  Found ${libraryEvents.length} events at ${library.name}`);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.eventsUrl,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            state: library.state,
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Error: ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    category: 'library',
    platform: 'assabet-interactive'
  });
}

async function main() {
  const events = await scrapeAssabetEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeAssabetLibrariesCloudFunction() {
  console.log('☁️ Running Assabet Libraries NH-MA as Cloud Function');
  const events = await scrapeAssabetEvents();
  if (events.length === 0) {
    await logScraperResult('Assabet-NH-MA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('Assabet-NH-MA', {
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

module.exports = { scrapeAssabetEvents, saveToDatabase, scrapeAssabetLibrariesCloudFunction };

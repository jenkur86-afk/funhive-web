#!/usr/bin/env node

/**
 * STATE PARKS EVENTS SCRAPER (Multi-State)
 *
 * Site-specific scraper for state parks events across multiple states.
 * Each state has a custom extraction function because every state parks
 * website uses completely different technology and HTML structure.
 *
 * Supports: Florida, Georgia, North Carolina, Tennessee, Kentucky, Alabama
 *
 * Browser investigation notes (April 2026):
 *   FL: Drupal cards, .card--green .card__title, .date-display-range
 *   GA: explore.gastateparks.org, TABLE-based layout
 *   NC: events.dncr.nc.gov, Events Manager plugin (.em-item)
 *   TN: tnstateparks.com/happenings, Drupal views
 *   KY: parks.ky.gov/events, JS card layout with date overlays
 *   AL: alapark.com/events, flat generic elements (Park:/When:/Meeting Place:)
 *
 * Usage:
 *   node scraper-state-parks-events.js --state FL    # Florida only
 *   node scraper-state-parks-events.js --state GA    # Georgia only
 *   node scraper-state-parks-events.js               # All states
 *
 * Cloud Function: scrapeStateParksEventsCloudFunction
 * Schedule: Group 3 (every 3 days on days 3, 6, 9, 12...)
 */

const { launchBrowser } = require('./helpers/puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'StateParksEvents';

// ──────────────────────────────────────────────────────────────────────
// State configurations
// ──────────────────────────────────────────────────────────────────────

const PARKS_CONFIG = [
  {
    name: 'Florida State Parks',
    state: 'FL',
    eventsUrl: 'https://www.floridastateparks.org/events',
    county: 'Multi-County',
    extract: extractFlorida
  },
  {
    name: 'Georgia State Parks',
    state: 'GA',
    eventsUrl: 'https://explore.gastateparks.org/events',
    altUrl: 'https://gastateparks.org/Events',
    county: 'Multi-County',
    extract: extractGeorgia
  },
  {
    name: 'North Carolina State Parks',
    state: 'NC',
    eventsUrl: 'https://events.dncr.nc.gov/department/north-carolina-state-parks-and-recreation/calendar',
    county: 'Multi-County',
    extract: extractNorthCarolina
  },
  {
    name: 'Tennessee State Parks',
    state: 'TN',
    eventsUrl: 'https://tnstateparks.com/happenings',
    altUrl: 'https://tnstateparks.com/events',
    county: 'Multi-County',
    extract: extractTennessee
  },
  {
    name: 'Kentucky State Parks',
    state: 'KY',
    eventsUrl: 'https://parks.ky.gov/events',
    county: 'Multi-County',
    extract: extractKentucky
  },
  {
    name: 'Alabama State Parks',
    state: 'AL',
    eventsUrl: 'https://www.alapark.com/events',
    county: 'Multi-County',
    extract: extractAlabama
  }
];

// ──────────────────────────────────────────────────────────────────────
// Site-specific extraction functions (run inside page.evaluate)
// ──────────────────────────────────────────────────────────────────────

/**
 * Florida: Drupal cards with .card--green, h3.card__title, .date-display-range
 * Also tries generic article/card fallback.
 */
async function extractFlorida(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Drupal card elements (.card--green or .card)
    document.querySelectorAll('.card--green, .card, [class*="card"]').forEach(card => {
      // Skip nav/header/footer cards
      if (card.closest('nav, header, footer, [class*="menu"], [class*="nav"]')) return;

      const titleEl = card.querySelector('.card__title, h3, h2, [class*="title"]');
      const dateEl = card.querySelector('.date-display-range, .date-display-single, [class*="date"], time');
      const descEl = card.querySelector('.card__summary, .card__body, [class*="summary"], [class*="body"], p');
      const linkEl = card.querySelector('a[href]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
        location: '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: linkEl?.href || ''
      });
    });

    // Strategy 2: Articles fallback
    if (events.length < 3) {
      document.querySelectorAll('article, .views-row').forEach(el => {
        if (el.closest('nav, header, footer')) return;
        const titleEl = el.querySelector('h2 a, h3 a, h2, h3, [class*="title"]');
        const dateEl = el.querySelector('.date-display-range, .date-display-single, time, [class*="date"]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        events.push({
          title: title.substring(0, 200),
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: titleEl?.href || titleEl?.closest('a')?.href || el.querySelector('a')?.href || ''
        });
      });
    }

    return events;
  });
}

/**
 * Georgia: explore.gastateparks.org TABLE-based layout with event rows.
 * Events are in table cells with "View Event Details" links.
 */
async function extractGeorgia(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Table rows (the primary layout)
    document.querySelectorAll('table tr, tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;

      // Look for event link in cells
      const linkEl = row.querySelector('a[href*="event"], a[href*="Event"], a[href*="detail"]');
      const allText = row.textContent.trim();

      // Try to extract title from link or first meaningful cell
      let title = '';
      if (linkEl) {
        title = linkEl.textContent.trim();
      } else {
        // Find the cell with the most text that looks like a title
        for (const cell of cells) {
          const t = cell.textContent.trim();
          if (t.length > 4 && t.length < 200 && !t.match(/^\d{1,2}\/\d{1,2}/)) {
            title = t;
            break;
          }
        }
      }

      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      // Extract date from cells
      let date = '';
      for (const cell of cells) {
        const t = cell.textContent.trim();
        if (t.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
          date = t.substring(0, 100);
          break;
        }
      }

      // Extract location from cells
      let location = '';
      for (const cell of cells) {
        const t = cell.textContent.trim();
        if (t.match(/park|state|lake|mountain|fort|creek/i) && t !== title) {
          location = t.substring(0, 200);
          break;
        }
      }

      events.push({
        title: title.substring(0, 200),
        date,
        location,
        description: '',
        url: linkEl?.href || ''
      });
    });

    // Strategy 2: Card/list-based fallback
    if (events.length < 3) {
      document.querySelectorAll('[class*="event"], [class*="card"], article, .views-row').forEach(el => {
        if (el.closest('nav, header, footer')) return;
        const titleEl = el.querySelector('h2, h3, h4, [class*="title"], a[href*="event"]');
        const dateEl = el.querySelector('time, [class*="date"], [datetime]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        events.push({
          title: title.substring(0, 200),
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: titleEl?.href || el.querySelector('a')?.href || ''
        });
      });
    }

    return events;
  });
}

/**
 * North Carolina: events.dncr.nc.gov, Events Manager plugin with .em-item listings
 * Also handles .em-listing-item and generic article fallbacks.
 */
async function extractNorthCarolina(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Events Manager items (.em-item, .em-listing-item)
    document.querySelectorAll('.em-item, .em-listing-item, [class*="em-item"]').forEach(item => {
      const titleEl = item.querySelector('.em-item_title a, .em-item_title, h3 a, h3, [class*="title"] a');
      const dateEl = item.querySelector('.em-item_date, .em-item_meta, time, [class*="date"]');
      const locEl = item.querySelector('.em-item_location, [class*="location"], [class*="venue"]');
      const descEl = item.querySelector('.em-item_desc, [class*="desc"], [class*="excerpt"]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
        location: locEl?.textContent?.trim()?.substring(0, 200) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: titleEl?.href || item.querySelector('a')?.href || ''
      });
    });

    // Strategy 2: Generic event containers
    if (events.length < 3) {
      document.querySelectorAll('[class*="event-item"], [class*="event-card"], article, .views-row').forEach(el => {
        if (el.closest('nav, header, footer')) return;
        const titleEl = el.querySelector('h2 a, h3 a, h2, h3, [class*="title"]');
        const dateEl = el.querySelector('time, [class*="date"], [datetime]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        events.push({
          title: title.substring(0, 200),
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: titleEl?.href || el.querySelector('a')?.href || ''
        });
      });
    }

    return events;
  });
}

/**
 * Tennessee: tnstateparks.com/happenings, Drupal views layout.
 * URL changed from /activities-events to /happenings (old URL 404s).
 * Featured events in .view-feature-happenings cards.
 */
async function extractTennessee(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Drupal views rows (happenings)
    document.querySelectorAll('.views-row, .view-content .views-row, [class*="happening"], [class*="featured"]').forEach(row => {
      if (row.closest('nav, header, footer')) return;
      const titleEl = row.querySelector('h2 a, h3 a, h2, h3, [class*="title"] a, [class*="title"]');
      const dateEl = row.querySelector('.date-display-range, .date-display-single, time, [class*="date"], [datetime]');
      const locEl = row.querySelector('[class*="park"], [class*="location"], [class*="venue"]');
      const descEl = row.querySelector('[class*="body"], [class*="summary"], [class*="teaser"], p');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
        location: locEl?.textContent?.trim()?.substring(0, 200) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: titleEl?.href || row.querySelector('a')?.href || ''
      });
    });

    // Strategy 2: Card-based layout
    if (events.length < 3) {
      document.querySelectorAll('[class*="card"], article, [class*="event"]').forEach(el => {
        if (el.closest('nav, header, footer, [class*="menu"]')) return;
        const titleEl = el.querySelector('h2, h3, h4, [class*="title"]');
        const dateEl = el.querySelector('time, [class*="date"]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4 || title.length > 200) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        events.push({
          title: title.substring(0, 200),
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: titleEl?.querySelector('a')?.href || el.querySelector('a')?.href || ''
        });
      });
    }

    // Strategy 3: Links to event detail pages
    if (events.length < 3) {
      document.querySelectorAll('a[href*="/happenings/"], a[href*="/events/"], a[href*="/event/"]').forEach(link => {
        if (link.closest('nav, header, footer')) return;
        const title = link.textContent.trim();
        if (title.length < 4 || title.length > 200) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const parent = link.closest('li, tr, div, article, section');
        const dateEl = parent?.querySelector('time, [class*="date"]');
        events.push({
          title,
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: link.href
        });
      });
    }

    return events;
  });
}

/**
 * Kentucky: parks.ky.gov/events, JS-heavy card layout with image cards,
 * date overlay badges, park name + city/state. Cards may load dynamically.
 */
async function extractKentucky(page) {
  // Wait extra for JS content to load
  await page.waitForTimeout(3000);

  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Card-based layout (image cards with event info)
    document.querySelectorAll('[class*="card"], [class*="event"], article, .views-row').forEach(card => {
      if (card.closest('nav, header, footer, [class*="filter"], [class*="search"]')) return;

      const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="heading"]');
      const dateEl = card.querySelector('[class*="date"], time, [datetime], [class*="badge"]');
      const locEl = card.querySelector('[class*="park"], [class*="location"], [class*="venue"], [class*="subtitle"]');
      const descEl = card.querySelector('[class*="body"], [class*="desc"], [class*="summary"], [class*="excerpt"], p');
      const linkEl = card.querySelector('a[href]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
        location: locEl?.textContent?.trim()?.substring(0, 200) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: linkEl?.href || ''
      });
    });

    // Strategy 2: Scan all links to event pages
    if (events.length < 3) {
      document.querySelectorAll('a[href*="/event"], a[href*="/parks/"]').forEach(link => {
        if (link.closest('nav, header, footer')) return;
        const title = link.textContent.trim();
        if (title.length < 4 || title.length > 200) return;
        if (/^(home|events?|parks?|about|contact|calendar|map|search|filter|more|view|all)/i.test(title)) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const parent = link.closest('li, tr, div, article, section');
        const dateEl = parent?.querySelector('[class*="date"], time');
        events.push({
          title,
          date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
          location: '',
          description: '',
          url: link.href
        });
      });
    }

    return events;
  });
}

/**
 * Alabama: alapark.com/events, Drupal site with flat generic elements.
 * Events are NOT in individual card wrappers. Instead, the region contains
 * a repeating sequence: image → "Park: {name}" → title → "When: MM/DD/YYYY at HH:MM AM/PM"
 * → optional notes → "Meeting Place: {location}" → description → "Register Online" link.
 * Has pagination (9+ pages). We scrape page 1 (15 events is plenty per run).
 */
async function extractAlabama(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();
    const allText = document.body.innerText;

    // Alabama's events are flat elements in a region, not in card wrappers.
    // We parse by looking at text content patterns.
    // Each event starts with "Park: {name}" and has "When: {date}" and "Meeting Place: {loc}"

    // Get all text nodes in the main content area
    const mainContent = document.querySelector('main') || document.body;
    const allElements = mainContent.querySelectorAll('*');
    const textNodes = [];

    allElements.forEach(el => {
      // Only consider direct text elements (not containers)
      if (el.children.length === 0 || el.tagName === 'A') {
        const text = el.textContent.trim();
        if (text.length > 0) {
          textNodes.push({ text, el, href: el.href || el.closest('a')?.href || '' });
        }
      }
    });

    // Walk through text nodes looking for "Park:" markers
    let i = 0;
    while (i < textNodes.length) {
      const node = textNodes[i];

      if (node.text.startsWith('Park:')) {
        const parkName = node.text.replace('Park:', '').trim();

        // Look ahead for title, date, meeting place, description
        let title = '';
        let date = '';
        let meetingPlace = '';
        let description = '';
        let url = '';

        // Scan next several nodes (up to 10) for event fields
        for (let j = i + 1; j < Math.min(i + 12, textNodes.length); j++) {
          const next = textNodes[j];
          if (next.text.startsWith('Park:')) break; // Next event

          if (next.text.startsWith('When:')) {
            date = next.text.replace('When:', '').trim();
          } else if (next.text.startsWith('Meeting Place:')) {
            meetingPlace = next.text.replace('Meeting Place:', '').trim();
          } else if (next.text === 'Register Online' || next.text === 'Learn More') {
            url = next.href;
          } else if (next.text === 'Multiple dates and times available.' || next.text === 'Fees may apply.') {
            // Skip these notes
          } else if (!title && next.text.length > 4 && next.text.length < 200 &&
                     !next.text.startsWith('When:') && !next.text.startsWith('Meeting Place:')) {
            // First non-field text after "Park:" is the title
            title = next.text;
          } else if (title && !description && next.text.length > 10 && next.text.length < 500 &&
                     !next.text.startsWith('When:') && !next.text.startsWith('Meeting Place:') &&
                     next.text !== 'Register Online' && next.text !== 'Multiple dates and times available.' &&
                     next.text !== 'Fees may apply.') {
            description = next.text;
          }
        }

        if (title && title.length > 3) {
          const key = title.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            const location = meetingPlace
              ? `${parkName} State Park - ${meetingPlace}`
              : `${parkName} State Park`;

            events.push({
              title: title.substring(0, 200),
              date: date.substring(0, 100),
              location: location.substring(0, 200),
              description: description.substring(0, 500),
              url
            });
          }
        }
      }
      i++;
    }

    return events;
  });
}

// ──────────────────────────────────────────────────────────────────────
// Core scraper logic
// ──────────────────────────────────────────────────────────────────────

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const stateArg = args.find(arg => arg.startsWith('--state'));

  if (stateArg) {
    const state = stateArg.split('=')[1] || args[args.indexOf(stateArg) + 1];
    return state ? state.toUpperCase() : null;
  }

  return null;
}

/**
 * Scrape events from a single state parks website
 */
async function scrapeStateParks(config, browser) {
  console.log(`\n🌲 Scraping ${config.name} (${config.state})`);
  console.log('-'.repeat(60));
  console.log(`URL: ${config.eventsUrl}\n`);

  const events = [];

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📅 Loading events page...');

    // Try primary URL, fallback to alternate if provided
    let url = config.eventsUrl;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (err) {
      if (config.altUrl) {
        console.log('⚠️  Primary URL failed, trying alternate...');
        url = config.altUrl;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      } else {
        throw err;
      }
    }

    // Allow dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use the site-specific extraction function
    const eventData = await config.extract(page);

    console.log(`  ✅ Found ${eventData.length} raw events`);

    await page.close();

    // Transform event data
    for (const event of eventData) {
      if (!event.title) continue;

      // Skip junk titles
      const titleLower = event.title.toLowerCase();
      if (/^(skip|rsvp|share|export|calendar|month|week|day|prev|next|home|filter|search|view|more|load|back)/i.test(event.title)) continue;
      if (event.title.length < 5) continue;

      const eventObj = {
        title: event.title,
        name: event.title,
        eventDate: event.date || '',
        description: event.description || '',
        url: event.url || url,
        venue: event.location || config.name,
        venueName: event.location || config.name,
        location: event.location || config.name,
        metadata: {
          sourceName: config.name,
          sourceUrl: url,
          scrapedAt: new Date().toISOString()
        }
      };

      // Extract age group from description or title
      const fullText = `${event.title} ${event.description || ''}`.toLowerCase();

      if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/\b0[-–]?3\b/)) {
        eventObj.ageRange = 'Babies & Toddlers (0-2)';
      } else if (fullText.includes('preschool') || fullText.match(/\b3[-–]?5\b/)) {
        eventObj.ageRange = 'Preschool (3-5)';
      } else if ((fullText.includes('junior ranger') || fullText.includes('jr ranger') || fullText.includes('jr. ranger'))) {
        eventObj.ageRange = 'Kids (6-8)';
      } else if (fullText.includes('child') && !fullText.includes('adult')) {
        eventObj.ageRange = 'Kids (6-8)';
      } else if (fullText.includes('tween') || fullText.match(/\b9[-–]?12\b/)) {
        eventObj.ageRange = 'Tweens (9-12)';
      } else if (fullText.includes('teen') && !fullText.includes('volunteer') || fullText.match(/\b13[-–]?18\b/)) {
        eventObj.ageRange = 'Teens (13-18)';
      } else if (fullText.includes('family') || fullText.includes('all ages') || fullText.includes('homeschool')) {
        eventObj.ageRange = 'All Ages';
      } else {
        eventObj.ageRange = 'All Ages';
      }

      // Determine cost
      if (fullText.includes('free') && !fullText.includes('fees may apply')) {
        eventObj.cost = 'Free';
      } else {
        eventObj.cost = 'See website';
      }

      events.push(eventObj);
    }

    console.log(`  ✅ ${events.length} valid events after filtering`);

    // Save events
    if (events.length > 0) {
      const stateVenue = {
        name: config.name,
        city: config.name,
        state: config.state,
        address: '',
        zipCode: '',
        url: url,
        county: config.county
      };

      const result = await saveEventsWithGeocoding(events, [stateVenue], {
        scraperName: `${SCRAPER_NAME}-${config.state}`,
        state: config.state,
        category: 'parks',
        platform: 'state-parks'
      });

      console.log(`  📊 Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors\n`);
      return result;
    } else {
      console.log('⚠️  No events found\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

  } catch (error) {
    console.error(`❌ Error scraping ${config.name}:`, error.message);
    return { saved: 0, skipped: 0, errors: 1, deleted: 0 };
  }
}

/**
 * Main scraper function
 */
async function scrapeStateParksEvents() {
  console.log('\n' + '='.repeat(60));
  console.log('🌲 STATE PARKS EVENTS SCRAPER (Multi-State)');
  console.log('='.repeat(60));

  const requestedState = parseArgs();
  const configsToScrape = requestedState
    ? PARKS_CONFIG.filter(cfg => cfg.state === requestedState)
    : PARKS_CONFIG;

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for state: ${requestedState}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} state(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalDeleted = 0;

  // Share a single browser instance across all states
  const browser = await launchBrowser();

  try {
    for (const config of configsToScrape) {
      const result = await scrapeStateParks(config, browser);
      totalSaved += result.saved;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      totalDeleted += result.deleted || 0;

      // Rate limiting between state scrapes
      if (config !== configsToScrape[configsToScrape.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL STATE PARKS SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Deleted: ${totalDeleted}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors, deleted: totalDeleted };
}

/**
 * Cloud Function wrapper
 */
async function scrapeStateParksEventsCloudFunction(req, res) {
  try {
    const state = req.query?.state || req.body?.state;
    const result = await scrapeStateParksEvents();
    res.status(200).json({
      success: true,
      scraper: SCRAPER_NAME,
      ...result
    });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({
      success: false,
      scraper: SCRAPER_NAME,
      error: error.message
    });
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeStateParksEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeStateParksEvents, scrapeStateParksEventsCloudFunction, PARKS_CONFIG };

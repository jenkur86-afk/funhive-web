#!/usr/bin/env node

/**
 * STATE PARKS EVENTS SCRAPER (Multi-State)
 *
 * Site-specific scraper for state parks events across multiple states.
 * Each state has a custom extraction function because every state parks
 * website uses completely different technology and HTML structure.
 *
 * Supports: Florida, Georgia, North Carolina, Tennessee, Kentucky, Alabama,
 *           Virginia, New York, South Carolina, Ohio, Maryland, Michigan,
 *           Massachusetts, Illinois, Delaware, Rhode Island, Mississippi, Maine
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
  },
  {
    name: 'Virginia State Parks',
    state: 'VA',
    eventsUrl: 'https://www.dcr.virginia.gov/state-parks/events',
    county: 'Multi-County',
    extract: extractVirginia,
    // VA has pagination via date ranges; first page shows ~10 days of events
    multiPage: true,
    maxPages: 5
  },
  {
    name: 'New York State Parks',
    state: 'NY',
    eventsUrl: 'https://parks.ny.gov/visit/events',
    county: 'Multi-County',
    extract: extractNewYork,
    multiPage: true,
    maxPages: 10
  },
  {
    name: 'South Carolina State Parks',
    state: 'SC',
    eventsUrl: 'https://southcarolinaparks.com/programs-and-events',
    county: 'Multi-County',
    extract: extractSouthCarolina
  },
  {
    name: 'Ohio State Parks',
    state: 'OH',
    eventsUrl: 'https://ohiodnr.gov/home/news-and-events/all-events/parks-wc-events',
    altUrl: 'https://ohiodnr.gov/discover-and-learn/things-to-do/events',
    county: 'Multi-County',
    extract: extractOhio
  },
  {
    name: 'Maryland State Parks',
    state: 'MD',
    eventsUrl: 'https://dnr.maryland.gov/publiclands/pages/park-events.aspx',
    county: 'Multi-County',
    extract: extractMaryland
  },
  {
    name: 'Michigan State Parks',
    state: 'MI',
    eventsUrl: 'https://www.michigan.gov/dnr/things-to-do/calendar',
    county: 'Multi-County',
    extract: extractMichigan
  },
  {
    name: 'Massachusetts State Parks',
    state: 'MA',
    eventsUrl: 'https://www.mass.gov/info-details/massachusetts-state-parks-programs-and-events',
    county: 'Multi-County',
    extract: extractMassachusetts
  },
  {
    name: 'Illinois State Parks',
    state: 'IL',
    eventsUrl: 'https://dnr.illinois.gov/parks/event.html',
    county: 'Multi-County',
    extract: extractIllinois
  },
  {
    name: 'Delaware State Parks',
    state: 'DE',
    eventsUrl: 'https://www.destateparks.com/programs',
    county: 'Multi-County',
    extract: extractDelaware
  },
  {
    name: 'Rhode Island State Parks',
    state: 'RI',
    eventsUrl: 'https://riparks.ri.gov/events',
    county: 'Multi-County',
    extract: extractRhodeIsland
  },
  {
    name: 'Mississippi State Parks',
    state: 'MS',
    eventsUrl: 'https://www.mdwfp.com/events/',
    county: 'Multi-County',
    extract: extractMississippi,
    multiPage: true,
    maxPages: 2
  },
  {
    name: 'Maine State Parks',
    state: 'ME',
    eventsUrl: 'https://www.maine.gov/dacf/parks/discover_history_explore_nature/activities/index.shtml',
    county: 'Multi-County',
    extract: extractMaine
  }
];

// ──────────────────────────────────────────────────────────────────────
// Venue name cleanup — strips room/department/sublocation suffixes
// so "Fairy Stone State Park Amphitheater Trailhead" → "Fairy Stone State Park"
// ──────────────────────────────────────────────────────────────────────

function cleanParkVenueName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  let name = raw.trim();

  // MI prefix: "Location: Outdoor Adventure Center" → "Outdoor Adventure Center"
  name = name.replace(/^Location:\s*/i, '');

  // If the name contains " State Park", " State Forest", " State Beach", etc.,
  // keep only up to (and including) the park/forest/beach qualifier.
  // E.g., "Pocahontas State Park Playground by Aquatic Complex" → "Pocahontas State Park"
  const parkMatch = name.match(/^(.+?\s+(?:State\s+)?(?:Park|Forest|Beach|Reserve|Recreation\s+Area|Natural\s+Area|Historic\s+Site|Historical\s+Park|Preserve|Monument|Memorial|Battlefield|Seashore|Lakeshore|Heritage\s+Park|Conservation\s+Area))\b/i);
  if (parkMatch) {
    name = parkMatch[1].trim();
  }

  // Strip trailing dash/colon fragments: "Lake James - Paddy Creek" → "Lake James"
  name = name.replace(/\s*[-–—:]\s+.*$/, '');

  // Remove trailing room/department/sublocation words if still present
  // Apply repeatedly to strip compound suffixes like "Amphitheater Trailhead"
  let prevName;
  do {
    prevName = name;
    name = name.replace(/\s+(?:Amphitheater|Pavilion|Shelter|Trailhead|Trail|Visitor\s+Center|Nature\s+Center|Lodge|Campground|Campsite|Boat\s+Ramp|Boat\s+Launch|Picnic\s+Area|Picnic\s+Shelter|Playground|Swimming\s+Pool|Beach\s+House|Meeting\s+Room|Conference\s+Room|Auditorium|Education\s+Center|Environmental\s+Education|Discovery\s+Center|Interpretive\s+Center|Welcome\s+Center|Contact\s+Station|Ranger\s+Station|Museum|Gift\s+Shop|Parking\s+Lot|Parking\s+Area|Day\s+Use\s+Area|Group\s+Camp|Swimming\s+Area|Lake\s+Area|Overlook|Observatory|Pier|Dock|Marina|Amphitheatre|Theater|Theatre|Office|Headquarters|HQ|Entrance|Gate|Pool|Cabin|Cabins|Yurt|Yurts)\s*$/i, '');
  } while (name !== prevName && name.length > 3);

  return name.trim() || raw.trim();
}

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
      const dateEl = card.querySelector('.date-display-range, .date-display-single, [class*="date"], time, [datetime]');
      const descEl = card.querySelector('.card__summary, .card__body, [class*="summary"], [class*="body"], p');
      const linkEl = card.querySelector('a[href]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      let date = dateEl?.textContent?.trim()?.substring(0, 100) || '';
      // Fallback: try datetime attribute
      if (!date && dateEl) {
        date = dateEl.getAttribute('datetime')?.substring(0, 30) || '';
      }
      // Last resort: look for date-like text in the card itself
      if (!date) {
        const cardText = card.textContent || '';
        const dateMatch = cardText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i)
          || cardText.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
        if (dateMatch) date = dateMatch[1];
      }

      events.push({
        title: title.substring(0, 200),
        date: date,
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
        const dateEl = el.querySelector('.date-display-range, .date-display-single, time, [class*="date"], [datetime]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        let date = dateEl?.textContent?.trim()?.substring(0, 100) || '';
        if (!date) {
          const elText = el.textContent || '';
          const dateMatch = elText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i)
            || elText.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
          if (dateMatch) date = dateMatch[1];
        }

        events.push({
          title: title.substring(0, 200),
          date: date,
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

    // Strategy 1: GA uses nested tables (Apr 2026 structure):
    //   table.eventDateHeader h2.itemtitle — date header (e.g., "Saturday, April 25, 2026")
    //   table.eventTitle — contains event title link and park info
    //   a[href*="/info/"] — event detail link with title text
    //   a[href*="gastateparks.org"] span — park name
    let currentDate = '';

    // Walk all tables sequentially — date headers and event titles alternate
    document.querySelectorAll('table.eventDateHeader, table.eventTitle').forEach(table => {
      if (table.classList.contains('eventDateHeader')) {
        const dateEl = table.querySelector('h2.itemtitle, h2');
        if (dateEl) currentDate = dateEl.textContent.trim();
        return;
      }

      // This is an eventTitle table
      const linkEl = table.querySelector('a[href*="/info/"], a[href*="/event"], a[href*="Event"]');
      if (!linkEl) return;
      const title = linkEl.textContent.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      // Park name from gastateparks.org link
      const parkEl = table.querySelector('a[href*="gastateparks.org"] span, a[href*="gastateparks.org"]');
      let parkName = parkEl ? parkEl.textContent.trim() : '';

      // Description from remaining td text
      const allText = table.textContent.replace(title, '').replace(parkName, '').trim();
      const descMatch = allText.match(/([A-Z][\s\S]{20,}?)(?:View Event|\n\n|$)/);

      events.push({
        title: title.substring(0, 200),
        date: currentDate.substring(0, 100),
        location: parkName ? `${parkName}` : '',
        description: descMatch ? descMatch[1].trim().substring(0, 500) : '',
        url: linkEl.href || ''
      });
    });

    // Fallback: generic table row extraction
    if (events.length === 0) {
      document.querySelectorAll('table tr, tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        const linkEl = row.querySelector('a[href*="event"], a[href*="info"]');
        let title = linkEl ? linkEl.textContent.trim() : '';
        if (!title) {
          for (const cell of cells) {
            const t = cell.textContent.trim();
            if (t.length > 4 && t.length < 200 && !t.match(/^\d{1,2}\//)) { title = t; break; }
          }
        }
        if (!title || title.length < 4) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        let date = '';
        for (const cell of cells) {
          const t = cell.textContent.trim();
          if (t.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
            date = t.substring(0, 100); break;
          }
        }
        events.push({ title: title.substring(0, 200), date, location: '', description: '', url: linkEl?.href || '' });
      });
    }

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

    // Strategy 1: Events Manager / Localist items
    // NC switched from .em-item to .em-card in 2026. Support both.
    document.querySelectorAll('.em-card, .em-item, .em-listing-item, [class*="em-item"], [class*="em-card"]').forEach(item => {
      const titleEl = item.querySelector('.em-card_title a, .em-item_title a, h3 a, h3, [class*="title"] a');
      const dateEl = item.querySelector('em-local-time, .em-card_date, .em-item_date, time, [class*="date"]');
      const locEl = item.querySelector('.em-card_event-text a, .em-item_location, [class*="location"], [class*="venue"]');
      const descEl = item.querySelector('.em-card_desc, .em-item_desc, [class*="desc"], [class*="excerpt"]');

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

    // Strategy 1: Featured happening cards (TN 2026 structure)
    // .feature-happening-card with h3 a for title, time.event-date for date, .field--name-field-park a for park
    document.querySelectorAll('.feature-happening-card, .views-row, .view-content .views-row, [class*="happening"]').forEach(row => {
      if (row.closest('nav, header, footer')) return;
      const titleEl = row.querySelector('h3 a[href*="/events/"], h2 a, h3 a, h2, h3, [class*="title"] a, [class*="title"]');
      const dateEl = row.querySelector('time.event-date, .date-display-range, .date-display-single, time, [class*="date"], [datetime]');
      const locEl = row.querySelector('.field--name-field-park a, [class*="park"], [class*="location"], [class*="venue"]');
      const descEl = row.querySelector('.feature-happening-card__content, [class*="body"], [class*="summary"], [class*="teaser"], p');

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
  // Wait extra for JS content to load (use setTimeout — waitForTimeout removed in newer Puppeteer)
  await new Promise(resolve => setTimeout(resolve, 3000));

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
  // Alabama (Apr 2026): Drupal Views with structured CSS classes:
  //   .events-row.views-row — container for each event
  //   .views-field-title .field-content — event title
  //   .views-field-field-account .field-content — "Park: Lakepoint"
  //   .views-field-field-eventtime .field-content — "When: 04/25/2026 at 09:00 AM"
  //   .views-field-field-meetinghtml .field-content — "Meeting Place: Nature Center"
  //   .views-field-field-summary .field-content — description
  //   .views-field-field-eventurl .field-content a — registration link
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Primary: use structured Drupal Views classes
    const rows = document.querySelectorAll('.events-row.views-row, .views-row');
    rows.forEach(row => {
      const titleEl = row.querySelector('.views-field-title .field-content');
      const title = titleEl ? titleEl.textContent.trim() : '';
      if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
      seen.add(title.toLowerCase());

      const parkEl = row.querySelector('.views-field-field-account .field-content');
      const parkRaw = parkEl ? parkEl.textContent.trim() : '';
      const parkName = parkRaw.replace(/^Park:\s*/i, '').trim();

      const dateEl = row.querySelector('.views-field-field-eventtime .field-content');
      const dateRaw = dateEl ? dateEl.textContent.trim() : '';
      const date = dateRaw.replace(/^When:\s*/i, '').trim();

      const meetEl = row.querySelector('.views-field-field-meetinghtml .field-content');
      const meetRaw = meetEl ? meetEl.textContent.trim() : '';
      const meetingPlace = meetRaw.replace(/^Meeting Place:\s*/i, '').trim();

      const descEl = row.querySelector('.views-field-field-summary .field-content');
      const description = descEl ? descEl.textContent.trim() : '';

      const urlEl = row.querySelector('.views-field-field-eventurl .field-content a');
      const url = urlEl ? urlEl.href : '';

      const location = meetingPlace
        ? `${parkName} State Park - ${meetingPlace}`
        : parkName ? `${parkName} State Park` : '';

      events.push({
        title: title.substring(0, 200),
        date: date.substring(0, 100),
        location: location.substring(0, 200),
        description: description.substring(0, 500),
        url
      });
    });

    // Fallback: legacy text-node walking if no Views rows found
    if (events.length === 0) {
      const mainContent = document.querySelector('main') || document.body;
      const fullText = mainContent.innerText;
      const parkBlocks = fullText.split(/(?=Park:)/);
      for (const block of parkBlocks) {
        if (!block.startsWith('Park:')) continue;
        const parkMatch = block.match(/^Park:\s*(.+)/m);
        const titleMatch = block.match(/\n\s*(.{5,200})\n/);
        const dateMatch = block.match(/When:\s*(.+)/);
        const meetMatch = block.match(/Meeting Place:\s*(.+)/);
        if (parkMatch && titleMatch) {
          const pk = parkMatch[1].trim();
          const title = titleMatch[1].trim();
          if (seen.has(title.toLowerCase())) continue;
          seen.add(title.toLowerCase());
          events.push({
            title, date: dateMatch ? dateMatch[1].trim() : '',
            location: `${pk} State Park`, description: '', url: ''
          });
        }
      }
    }

    return events;
  });
}

/**
 * Virginia: dcr.virginia.gov — server-rendered HTML with CSS classes:
 *   .an_event_name a — title + link (href="event?id=...")
 *   .an_event_date — "April 1, 2026 10:00 a.m. - May 31, 2026 5:00 p.m."
 *   .an_event_park — venue (+ .an_event_location sublocation)
 *   .an_event_description — description text
 */
async function extractVirginia(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('.an_event_name').forEach(nameEl => {
      const link = nameEl.querySelector('a');
      const title = link?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      // Walk to sibling elements for date, park, description
      const parent = nameEl.parentElement;
      const dateEl = parent?.querySelector('.an_event_date');
      const parkEl = parent?.querySelector('.an_event_park');
      const descEl = parent?.querySelector('.an_event_description');

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.replace(/\s+/g, ' ')?.substring(0, 100) || '',
        location: parkEl?.textContent?.trim()?.replace(/\s+/g, ' ')?.substring(0, 150) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: link?.href || ''
      });
    });

    return events;
  });
}

/**
 * New York: parks.ny.gov — modern card layout:
 *   .c-card__title-link — title
 *   .c-card__date — "Apr 24, 2026"
 *   .c-card__eyebrow — "Taconic State Park - Copake Falls Area"
 *   .c-card__summary — description
 *   Pagination: ?page=N (0-indexed)
 */
async function extractNewYork(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('.c-card__title-link, a[class*="card__title"]').forEach(link => {
      const title = link?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const card = link.closest('[class*="card"]') || link.parentElement?.parentElement;
      let dateText = card?.querySelector('.c-card__date:not(.c-card__date-mobile), [class*="card__date"]')?.textContent?.trim() || '';
      const venueEl = card?.querySelector('.c-card__eyebrow, [class*="eyebrow"]');
      let descText = card?.querySelector('.c-card__summary, [class*="summary"]')?.textContent?.trim() || '';

      // Broader date fallback
      if (!dateText) {
        const dateEl = card?.querySelector('time, [class*="date"], [datetime]');
        dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
      }

      // Broader description fallback
      if (!descText) {
        descText = card?.querySelector('p, [class*="desc"], [class*="body"]')?.textContent?.trim() || '';
      }

      events.push({
        title: title.substring(0, 200),
        date: dateText.substring(0, 100),
        location: venueEl?.textContent?.trim()?.substring(0, 150) || '',
        description: descText.substring(0, 500),
        url: link?.href || ''
      });
    });

    // Fallback: generic extraction if card-based approach found nothing with dates
    if (events.length === 0 || events.every(e => !e.date)) {
      const fallbackEvents = [];
      const fallbackSeen = new Set();
      document.querySelectorAll('article, .event, [class*="event-card"], [class*="event-list"] > *, .views-row').forEach(el => {
        if (el.closest('nav, header, footer, [class*="menu"]')) return;
        const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, h2, h3');
        const dateEl = el.querySelector('time, [class*="date"], [datetime]');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        if (!dateText) return;
        const key = title.toLowerCase();
        if (fallbackSeen.has(key)) return;
        fallbackSeen.add(key);
        fallbackEvents.push({
          title: title.substring(0, 200),
          date: dateText.substring(0, 100),
          location: el.querySelector('[class*="location"], [class*="venue"]')?.textContent?.trim()?.substring(0, 150) || '',
          description: el.querySelector('p, [class*="desc"], [class*="summary"]')?.textContent?.trim()?.substring(0, 500) || '',
          url: titleEl?.href || el.querySelector('a')?.href || ''
        });
      });
      if (fallbackEvents.length > 0) return fallbackEvents;
    }

    return events;
  });
}

/**
 * South Carolina: southcarolinaparks.com — programs & events listing.
 * Generic extraction: look for event cards/list items with titles and dates.
 */
async function extractSouthCarolina(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Try event cards or list items
    document.querySelectorAll('article, .event, .program, [class*="event"], [class*="card"], .views-row').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"]')) return;

      const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, h2, h3');
      const dateEl = el.querySelector('time, [class*="date"], .date, span[class*="date"]');
      const descEl = el.querySelector('[class*="desc"], [class*="summary"], [class*="body"], p');

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
        url: titleEl?.href || titleEl?.closest('a')?.href || el.querySelector('a')?.href || ''
      });
    });

    return events;
  });
}

/**
 * Ohio: ohiodnr.gov — events listing with various card/list formats.
 */
async function extractOhio(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('article, .event-card, [class*="event"], .views-row, .card, [class*="card"]').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"], [class*="nav"]')) return;

      const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, h2, h3');
      const dateEl = el.querySelector('time, [class*="date"], .date');
      const descEl = el.querySelector('[class*="desc"], [class*="summary"], p');
      const locationEl = el.querySelector('[class*="location"], [class*="venue"], [class*="park"]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || '',
        location: locationEl?.textContent?.trim()?.substring(0, 150) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: titleEl?.href || titleEl?.closest('a')?.href || el.querySelector('a')?.href || ''
      });
    });

    return events;
  });
}

/**
 * Maryland: dnr.maryland.gov — ASP.NET page with event listings.
 */
async function extractMaryland(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Google Translate language names to skip
    const JUNK_WORDS = new Set([
      'afrikaans','albanian','amharic','arabic','armenian','azerbaijani','basque','belarusian',
      'bengali','bosnian','bulgarian','catalan','cebuano','chichewa','chinese','corsican',
      'croatian','czech','danish','dutch','english','esperanto','estonian','filipino','finnish',
      'french','frisian','galician','georgian','german','greek','gujarati','haitian','hausa',
      'hawaiian','hebrew','hindi','hmong','hungarian','icelandic','igbo','indonesian','irish',
      'italian','japanese','javanese','kannada','kazakh','khmer','kinyarwanda','korean',
      'kurdish','kyrgyz','lao','latin','latvian','lithuanian','luxembourgish','macedonian',
      'malagasy','malay','malayalam','maltese','maori','marathi','mongolian','myanmar',
      'nepali','norwegian','odia','pashto','persian','polish','portuguese','punjabi',
      'romanian','russian','samoan','scots','serbian','sesotho','shona','sindhi','sinhala',
      'slovak','slovenian','somali','spanish','sundanese','swahili','swedish','tajik','tamil',
      'tatar','telugu','thai','turkish','turkmen','ukrainian','urdu','uyghur','uzbek',
      'vietnamese','welsh','xhosa','yiddish','yoruba','zulu'
    ]);

    // Only match structured event containers — skip bare li to avoid Google Translate / nav lists
    document.querySelectorAll('table tr, .event, article, [class*="event"]').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"], [class*="goog-te"], [class*="translate"], [class*="lang"]')) return;

      const titleEl = el.querySelector('a, h2, h3, h4, strong, b');
      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 5 || title.length > 200) return;

      // Skip nav-like items, language names, and single-word items without dates
      if (/^(home|about|contact|search|menu|login|signup|select|translate|powered)/i.test(title)) return;
      if (JUNK_WORDS.has(title.toLowerCase())) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const fullText = el.textContent.trim();
      // Try to extract date from the full text
      const dateMatch = fullText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i);

      // Skip items with no date — they're likely nav/translate junk
      if (!dateMatch) return;

      events.push({
        title: title.substring(0, 200),
        date: dateMatch ? dateMatch[1] : '',
        location: '',
        description: fullText.substring(0, 500),
        url: titleEl?.href || el.querySelector('a')?.href || ''
      });
    });

    return events;
  });
}

/**
 * Michigan: michigan.gov/dnr — Drupal-based calendar page.
 */
async function extractMichigan(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('article, .event, [class*="event"], .views-row, .card, [class*="card"], .view-content > div').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"], [class*="nav"]')) return;

      const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, a[href*="event"], h2, h3');
      const dateEl = el.querySelector('time, [class*="date"], .date, [datetime]');
      const descEl = el.querySelector('[class*="desc"], [class*="summary"], [class*="body"], p');
      const locationEl = el.querySelector('[class*="location"], [class*="venue"]');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      events.push({
        title: title.substring(0, 200),
        date: dateEl?.textContent?.trim()?.substring(0, 100) || dateEl?.getAttribute('datetime')?.substring(0, 30) || '',
        location: locationEl?.textContent?.trim()?.substring(0, 150) || '',
        description: descEl?.textContent?.trim()?.substring(0, 500) || '',
        url: titleEl?.href || titleEl?.closest('a')?.href || el.querySelector('a')?.href || ''
      });
    });

    return events;
  });
}

/**
 * Massachusetts: mass.gov — Drupal info page with links to programs and events.
 */
async function extractMassachusetts(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('article, .event, [class*="event"], .ma__event, .views-row, [class*="card"], li').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"], [class*="nav"]')) return;

      const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, a[href*="event"], h2, h3');
      const dateEl = el.querySelector('time, [class*="date"], .date');
      const descEl = el.querySelector('[class*="desc"], [class*="summary"], p');

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
        url: titleEl?.href || titleEl?.closest('a')?.href || el.querySelector('a')?.href || ''
      });
    });

    return events;
  });
}

/**
 * Delaware: destateparks.com — WordPress site with spotlight cards and calendar items.
 *   .spotlight-name — title (in spotlight carousel)
 *   .spotlight-date-time span — date, time
 *   .spotlight-place — venue/park name
 *   Also has calendar items below with date | time, venue, title patterns.
 */
async function extractDelaware(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Spotlight cards
    document.querySelectorAll('.spotlight-name, h3[class*="spotlight"]').forEach(nameEl => {
      const title = nameEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const card = nameEl.closest('a, div, [class*="spotlight"]');
      const dateTimeEl = card?.querySelector('.spotlight-date-time');
      const placeEl = card?.querySelector('.spotlight-place');

      const spans = dateTimeEl?.querySelectorAll('span') || [];
      let dateText = spans[0]?.textContent?.trim() || '';
      const timeText = spans[1]?.textContent?.trim() || '';
      let combinedDate = `${dateText} ${timeText}`.trim();

      // Broader date fallback
      if (!combinedDate || combinedDate.length < 3) {
        const genericDateEl = card?.querySelector('time, [class*="date"], [datetime]');
        combinedDate = genericDateEl?.getAttribute('datetime') || genericDateEl?.textContent?.trim() || '';
      }
      if (!combinedDate || combinedDate.length < 3) {
        const cardText = card?.textContent || '';
        const dateMatch = cardText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i);
        if (dateMatch) combinedDate = dateMatch[1];
      }

      events.push({
        title: title.substring(0, 200),
        date: combinedDate.substring(0, 100),
        location: placeEl?.textContent?.trim()?.substring(0, 150) || '',
        description: '',
        url: card?.href || card?.closest('a')?.href || ''
      });
    });

    // Calendar list items (below the spotlight) — only match event-specific containers
    document.querySelectorAll('[class*="calendar-item"], [class*="event-card"], [class*="event-list"] a').forEach(el => {
      if (el.closest('nav, header, footer, [class*="menu"], [class*="cookie"], [class*="consent"], [class*="popup"]')) return;
      const link = el.tagName === 'A' ? el : el.querySelector('a');
      const parent = el.closest('[class*="calendar-item"], [class*="event"]') || el;
      const title = parent?.querySelector('h3, h2, [class*="name"], [class*="title"]')?.textContent?.trim()
        || link?.textContent?.trim();
      if (!title || title.length < 4 || title.length > 200) return;
      // Skip common nav/cookie/UI text
      if (/^(accept|reject|cookie|privacy|menu|home|about|contact|search|close|dismiss|allow|manage|settings)/i.test(title)) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const dateEl = parent?.querySelector('[class*="date"], time');
      const placeEl = parent?.querySelector('[class*="place"], [class*="location"], [class*="venue"]');

      // Skip items with no date — they're likely nav/UI junk
      const dateText = dateEl?.textContent?.trim() || '';
      if (!dateText) return;

      events.push({
        title: title.substring(0, 200),
        date: dateText.substring(0, 100),
        location: placeEl?.textContent?.trim()?.substring(0, 150) || '',
        description: '',
        url: link?.href || ''
      });
    });

    return events;
  });
}

/**
 * Rhode Island: riparks.ri.gov — Drupal site with qh__teaser-event__ classes.
 *   .qh__teaser-event__link — title link
 *   .qh__teaser-event__start-date + parent span — "Apr 28"
 *   .qh__teaser-event__start-time / end-time — "3:00pm - 4:00pm"
 *   .qh__teaser-event__location — venue (with "Location:" prefix)
 */
async function extractRhodeIsland(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    document.querySelectorAll('.qh__teaser-event__title, [class*="teaser-event__title"]').forEach(titleEl => {
      const link = titleEl.querySelector('a') || titleEl.closest('a');
      const title = (link || titleEl)?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const card = titleEl.closest('[class*="teaser-event"]') || titleEl.parentElement;
      const dateEl = card?.querySelector('[class*="teaser-event__date"]');
      const monthSpan = dateEl?.querySelector('.small-text, span');
      const dayEl = dateEl?.querySelector('[class*="start-date"]');
      const month = monthSpan?.textContent?.trim() || '';
      const day = dayEl?.textContent?.trim() || '';
      let dateStr = `${month} ${day}`.trim();

      // Broader date fallback
      if (!dateStr || dateStr.length < 3) {
        const genericDateEl = card?.querySelector('time, [class*="date"], [datetime]');
        dateStr = genericDateEl?.getAttribute('datetime') || genericDateEl?.textContent?.trim() || '';
      }
      if (!dateStr || dateStr.length < 3) {
        const cardText = card?.textContent || '';
        const dateMatch = cardText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i);
        if (dateMatch) dateStr = dateMatch[1];
      }

      const startTimeEl = card?.querySelector('[class*="start-time"]');
      const endTimeEl = card?.querySelector('[class*="end-time"]');
      const timeStr = startTimeEl ? `${startTimeEl.textContent.trim()}${endTimeEl ? ' - ' + endTimeEl.textContent.trim() : ''}` : '';

      const locationEl = card?.querySelector('[class*="location"]');
      const location = locationEl?.textContent?.trim()?.replace(/^Location:\s*/i, '') || '';

      events.push({
        title: title.substring(0, 200),
        date: `${dateStr} ${timeStr}`.trim().substring(0, 100),
        location: location.substring(0, 150),
        description: '',
        url: link?.href || ''
      });
    });

    return events;
  });
}

/**
 * Mississippi: mdwfp.com — Drupal site with block-layout-builder classes.
 *   .block-field-blocknodeeventtitle a — title
 *   h2 with date text — "Saturday, April 25th, 2026"
 *   .block-field-blocknodeeventfield-location — venue
 *   .block-field-blocknodeeventfield-time — time
 */
async function extractMississippi(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Find event title blocks
    document.querySelectorAll('[class*="blocknodeeventtitle"] a, .field--name-title a').forEach(link => {
      const title = link?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      // Navigate up to the event container
      const container = link.closest('[class*="views-row"], [class*="event"], article, .col, [class*="col-"]') || link.parentElement?.parentElement?.parentElement;

      // Find the date header — usually an h2 sibling or ancestor
      let dateStr = '';
      // Walk up to find date heading
      let el = container;
      while (el && !dateStr) {
        const prevH2 = el.previousElementSibling;
        if (prevH2?.tagName === 'H2') {
          const text = prevH2.textContent.trim();
          if (text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i)) {
            dateStr = text;
          }
        }
        el = el.parentElement;
      }

      // Broader date fallback: try date-related elements within container
      if (!dateStr) {
        const dateEl = container?.querySelector('[class*="date"], time, [class*="when"], [datetime]');
        dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
      }

      // Last resort: look for date-like text in the container
      if (!dateStr && container) {
        const containerText = container.textContent || '';
        const dateMatch = containerText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i);
        if (dateMatch) dateStr = dateMatch[1];
      }

      const locationEl = container?.querySelector('[class*="field-location"], [class*="location"]');
      const timeEl = container?.querySelector('[class*="field-time"], [class*="time"]');
      const location = locationEl?.textContent?.trim()?.replace(/^[\s📍🕐]+/g, '') || '';
      const timeStr = timeEl?.textContent?.trim()?.replace(/^[\s🕐]+/g, '') || '';

      events.push({
        title: title.substring(0, 200),
        date: dateStr ? `${dateStr} ${timeStr}`.trim().substring(0, 100) : timeStr.substring(0, 100),
        location: location.substring(0, 150),
        description: '',
        url: link.href || ''
      });
    });

    return events;
  });
}

/**
 * Maine: maine.gov — old-school .shtml page with simple text links.
 *   "April 25, 2026 : Event Title" pattern with links.
 */
async function extractMaine(page) {
  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Look for links that contain event info
    // ME events are simple: "Date : Title" text with a link
    const contentArea = document.querySelector('#content, .content, main, #main-content') || document.body;
    // Tighten to eventinfo.shtml links — broader selectors match too many nav items
    const links = contentArea.querySelectorAll('a[href*="eventinfo.shtml"], a[href*="eventinfo"]');

    links.forEach(link => {
      const title = link.textContent.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      // The date is in the text before the link
      const parent = link.parentElement;
      const fullText = parent?.textContent?.trim() || '';
      const dateMatch = fullText.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4})/i);
      // Also try date range "May 15, 2026 - June 30, 2026:"
      const dateRangeMatch = fullText.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4})/i);

      events.push({
        title: title.substring(0, 200),
        date: (dateRangeMatch?.[1] || dateMatch?.[1] || '').substring(0, 100),
        location: '',
        description: '',
        url: link.href || ''
      });
    });

    return events;
  });
}

/**
 * Illinois: dnr.illinois.gov — Handlebars-templated event page.
 * Events render client-side via Handlebars into .cmp-cf-list__item elements.
 * Date in .cmp-news-feed__event-date__month / __day / __year spans.
 */
async function extractIllinois(page) {
  // Wait extra time for Handlebars to render
  await page.waitForSelector('.cmp-cf-list__item, article, [class*="event"]', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  return await page.evaluate(() => {
    const events = [];
    const seen = new Set();

    // Strategy 1: Handlebars-rendered list items (2026 structure)
    document.querySelectorAll('li.cmp-cf-list__item, .cmp-cf-list__item').forEach(el => {
      const titleEl = el.querySelector('a.cmp-cf-list__item-anchor, .cmp-cf-list__item-value a, a');
      const monthEl = el.querySelector('.cmp-news-feed__event-date__month');
      const dayEl = el.querySelector('.cmp-news-feed__event-date__day');
      const yearEl = el.querySelector('.cmp-news-feed__event-date__year');

      const title = titleEl?.textContent?.trim();
      if (!title || title.length < 4) return;
      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      let date = '';
      if (monthEl && dayEl) {
        date = `${monthEl.textContent.trim()} ${dayEl.textContent.trim()}`;
        if (yearEl) date += `, ${yearEl.textContent.trim()}`;
      }

      // Broader date fallback: try any element with "date" in class, or time element
      if (!date) {
        const dateEl = el.querySelector('[class*="date"], time, [class*="when"]');
        date = dateEl?.textContent?.trim() || '';
      }

      // Last resort: look for date-like text in the item itself
      if (!date) {
        const itemText = el.textContent || '';
        const dateMatch = itemText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?)\b/i);
        if (dateMatch) date = dateMatch[1];
      }

      events.push({
        title: title.substring(0, 200),
        date: date.substring(0, 100),
        location: '',
        description: '',
        url: titleEl?.href || el.querySelector('a')?.href || ''
      });
    });

    // Strategy 2: Generic fallback (excluding li to avoid nav/park-name lists)
    if (events.length === 0) {
      document.querySelectorAll('article, .event, [class*="event"], .views-row, [class*="card"], .card').forEach(el => {
        if (el.closest('nav, header, footer, [class*="menu"], [class*="nav"], [class*="sidebar"], [class*="sitemap"]')) return;
        const titleEl = el.querySelector('h2 a, h3 a, h4 a, [class*="title"] a, a[href*="event"], h2, h3');
        const dateEl = el.querySelector('time, [class*="date"], .date');
        const title = titleEl?.textContent?.trim();
        if (!title || title.length < 4) return;
        // Skip park names / nav items (no date = not an event)
        if (!dateEl?.textContent?.trim()) return;
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
    let eventData = await config.extract(page);
    console.log(`  ✅ Found ${eventData.length} raw events on page 1`);

    // Multi-page support (e.g., NY uses ?page=N)
    if (config.multiPage && eventData.length > 0) {
      const maxPages = config.maxPages || 5;
      for (let pageNum = 1; pageNum < maxPages; pageNum++) {
        try {
          const sep = url.includes('?') ? '&' : '?';
          const pageUrl = `${url}${sep}page=${pageNum}`;
          console.log(`  📄 Loading page ${pageNum + 1}...`);
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 25000 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          const moreEvents = await config.extract(page);
          if (moreEvents.length === 0) {
            console.log(`  ⚠️  No more events on page ${pageNum + 1}, stopping`);
            break;
          }
          eventData = eventData.concat(moreEvents);
          console.log(`  ✅ +${moreEvents.length} events (total: ${eventData.length})`);
        } catch (pageErr) {
          console.log(`  ⚠️  Page ${pageNum + 1} failed: ${pageErr.message}`);
          break;
        }
      }
    }

    console.log(`  ✅ Total raw events: ${eventData.length}`);

    await page.close();

    // Transform event data
    for (const event of eventData) {
      if (!event.title) continue;

      // Skip junk titles (nav items, UI controls, single-word items)
      const titleLower = event.title.toLowerCase();
      if (/^(skip|rsvp|share|export|calendar|month|week|day|prev|next|home|filter|search|view|more|load|back|accept|reject|cookie|privacy|close|dismiss|allow|manage|settings|menu|select|translate|powered|table of contents|breadcrumb|footer|sidebar|navigation|come out & play)/i.test(event.title)) continue;
      if (event.title.length < 5) continue;
      // Skip items that look like park/place names with no date at all
      if (!event.date && !event.description) continue;

      const eventObj = {
        title: event.title,
        name: event.title,
        eventDate: event.date || '',
        description: event.description || '',
        url: event.url || url,
        venue: cleanParkVenueName(event.location) || config.name,
        venueName: cleanParkVenueName(event.location) || config.name,
        location: cleanParkVenueName(event.location) || config.name,
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
      // Build a venue entry for each unique park/location, not one generic state venue.
      // This ensures each event geocodes against its actual park name instead of
      // the generic "Alabama State Parks" etc.
      const venueMap = new Map();
      for (const ev of events) {
        const vName = ev.venueName || ev.venue || config.name;
        if (!venueMap.has(vName)) {
          venueMap.set(vName, {
            name: vName,
            city: vName,       // city will be refined by geocoding
            state: config.state,
            address: '',
            zipCode: '',
            url: url,
            county: config.county
          });
        }
      }
      const venues = Array.from(venueMap.values());

      const result = await saveEventsWithGeocoding(events, venues, {
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

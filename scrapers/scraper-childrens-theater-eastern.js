#!/usr/bin/env node

/**
 * CHILDREN'S THEATERS & PERFORMING ARTS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for children's theaters, family theater companies,
 * puppet theaters, and performing arts venues across all 28 eastern US states.
 *
 * Multi-strategy scraping per theater:
 *   1. Try WordPress REST API: {url}/wp-json/tribe/events/v1/events/ (The Events Calendar plugin)
 *   2. Fall back to Puppeteer HTML scraping for show listings, season pages
 *   3. Look for: show titles, dates, ticket links, descriptions
 *
 * Coverage: 28 states (~60-80 theaters)
 *
 * Usage:
 *   node scrapers/scraper-childrens-theater-eastern.js                    # All states
 *   node scrapers/scraper-childrens-theater-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-childrens-theater-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-childrens-theater-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeChildrensTheaterCloudFunction
 * Registry: Group 3
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'ChildrensTheater-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie|singles\s*night|explicit|mature\s*content)\b/i;

// ==========================================
// THEATERS CONFIG (~60-80 children's and family theaters)
// ==========================================
const THEATERS = [
  // Alabama
  { name: 'Red Mountain Theatre', url: 'https://www.redmountaintheatre.org', eventsUrl: 'https://www.redmountaintheatre.org/events/', city: 'Birmingham', state: 'AL' },
  { name: 'Alabama Shakespeare Festival', url: 'https://www.asf.net', eventsUrl: 'https://www.asf.net/shows-events/', city: 'Montgomery', state: 'AL' },

  // Connecticut
  { name: 'Westport Country Playhouse', url: 'https://www.westportplayhouse.org', eventsUrl: 'https://www.westportplayhouse.org/shows-events/', city: 'Westport', state: 'CT' },
  { name: 'Hartford Stage', url: 'https://www.hartfordstage.org', eventsUrl: 'https://www.hartfordstage.org/shows-tickets/', city: 'Hartford', state: 'CT' },
  { name: 'Playhouse on Park', url: 'https://www.playhouseonpark.org', eventsUrl: 'https://www.playhouseonpark.org/shows/', city: 'West Hartford', state: 'CT' },

  // DC
  { name: 'Adventure Theatre MTC', url: 'https://www.adventuretheatre-mtc.org', eventsUrl: 'https://www.adventuretheatre-mtc.org/on-stage/', city: 'Glen Echo', state: 'DC' },
  { name: 'Imagination Stage', url: 'https://www.imaginationstage.org', eventsUrl: 'https://www.imaginationstage.org/on-stage/', city: 'Bethesda', state: 'DC' },
  { name: 'Kennedy Center Family Theater', url: 'https://www.kennedy-center.org', eventsUrl: 'https://www.kennedy-center.org/whats-on/explore-by-genre/theater-for-young-audiences/', city: 'Washington', state: 'DC' },

  // Delaware
  { name: 'Delaware Children\'s Theatre', url: 'https://www.dechildrenstheatre.org', eventsUrl: 'https://www.dechildrenstheatre.org/events/', city: 'Wilmington', state: 'DE' },
  { name: 'Delaware Theatre Company', url: 'https://www.delawaretheatre.org', eventsUrl: 'https://www.delawaretheatre.org/whats-on/', city: 'Wilmington', state: 'DE' },

  // Florida
  { name: 'Orlando Repertory Theatre', url: 'https://www.orlandorep.com', eventsUrl: 'https://www.orlandorep.com/shows/', city: 'Orlando', state: 'FL' },
  { name: 'Broward Center for the Performing Arts', url: 'https://www.browardcenter.org', eventsUrl: 'https://www.browardcenter.org/events', city: 'Fort Lauderdale', state: 'FL' },
  { name: 'Kravis Center - Family Fare', url: 'https://www.kravis.org', eventsUrl: 'https://www.kravis.org/events/', city: 'West Palm Beach', state: 'FL' },
  { name: 'Patel Conservatory at Straz Center', url: 'https://www.strazcenter.org', eventsUrl: 'https://www.strazcenter.org/events', city: 'Tampa', state: 'FL' },

  // Georgia
  { name: 'Alliance Theatre', url: 'https://www.alliancetheatre.org', eventsUrl: 'https://www.alliancetheatre.org/production/', city: 'Atlanta', state: 'GA' },
  { name: 'Center for Puppetry Arts', url: 'https://puppet.org', eventsUrl: 'https://puppet.org/performances/', city: 'Atlanta', state: 'GA' },
  { name: 'Horizon Theatre Company', url: 'https://www.horizontheatre.com', eventsUrl: 'https://www.horizontheatre.com/season/', city: 'Atlanta', state: 'GA' },

  // Iowa
  { name: 'Des Moines Community Playhouse', url: 'https://www.dmplayhouse.com', eventsUrl: 'https://www.dmplayhouse.com/shows-events/', city: 'Des Moines', state: 'IA' },
  { name: 'Old Creamery Theatre', url: 'https://www.oldcreamery.com', eventsUrl: 'https://www.oldcreamery.com/season/', city: 'Amana', state: 'IA' },

  // Illinois
  { name: 'Chicago Children\'s Theatre', url: 'https://chicagochildrenstheatre.org', eventsUrl: 'https://chicagochildrenstheatre.org/shows/', city: 'Chicago', state: 'IL' },
  { name: 'Emerald City Theatre', url: 'https://www.emeraldcitytheatre.com', eventsUrl: 'https://www.emeraldcitytheatre.com/shows/', city: 'Chicago', state: 'IL' },
  { name: 'Marriott Theatre for Young Audiences', url: 'https://www.marriotttheatre.com', eventsUrl: 'https://www.marriotttheatre.com/theatre-for-young-audiences', city: 'Lincolnshire', state: 'IL' },
  { name: 'Paramount Theatre Aurora', url: 'https://www.paramountaurora.com', eventsUrl: 'https://www.paramountaurora.com/shows-events/', city: 'Aurora', state: 'IL' },

  // Indiana
  { name: 'Beef & Boards Dinner Theatre', url: 'https://www.beefandboards.com', eventsUrl: 'https://www.beefandboards.com/shows/', city: 'Indianapolis', state: 'IN' },
  { name: 'Indiana Repertory Theatre', url: 'https://www.irtlive.com', eventsUrl: 'https://www.irtlive.com/season/', city: 'Indianapolis', state: 'IN' },

  // Kentucky
  { name: 'Actors Theatre of Louisville', url: 'https://www.actorstheatre.org', eventsUrl: 'https://www.actorstheatre.org/shows-events/', city: 'Louisville', state: 'KY' },
  { name: 'Lexington Children\'s Theatre', url: 'https://www.lctonstage.org', eventsUrl: 'https://www.lctonstage.org/shows/', city: 'Lexington', state: 'KY' },

  // Massachusetts
  { name: 'Boston Children\'s Theatre', url: 'https://www.bostonchildrenstheatre.org', eventsUrl: 'https://www.bostonchildrenstheatre.org/shows/', city: 'Boston', state: 'MA' },
  { name: 'Wheelock Family Theatre', url: 'https://www.wheelockfamilytheatre.org', eventsUrl: 'https://www.wheelockfamilytheatre.org/shows/', city: 'Boston', state: 'MA' },
  { name: 'Puppet Showplace Theater', url: 'https://www.puppetshowplace.org', eventsUrl: 'https://www.puppetshowplace.org/shows/', city: 'Brookline', state: 'MA' },

  // Maryland
  { name: 'Chesapeake Shakespeare Company', url: 'https://www.chesapeakeshakespeare.com', eventsUrl: 'https://www.chesapeakeshakespeare.com/shows-events/', city: 'Baltimore', state: 'MD' },
  { name: 'Olney Theatre Center', url: 'https://www.olneytheatre.org', eventsUrl: 'https://www.olneytheatre.org/performances/', city: 'Olney', state: 'MD' },
  { name: 'Toby\'s Dinner Theatre', url: 'https://www.tobysdinnertheatre.com', eventsUrl: 'https://www.tobysdinnertheatre.com/events/', city: 'Columbia', state: 'MD' },

  // Maine
  { name: 'Portland Stage Company', url: 'https://www.portlandstage.org', eventsUrl: 'https://www.portlandstage.org/season/', city: 'Portland', state: 'ME' },
  { name: 'Children\'s Museum & Theatre of Maine', url: 'https://www.kitetails.org', eventsUrl: 'https://www.kitetails.org/events/', city: 'Portland', state: 'ME' },

  // Minnesota
  { name: 'Children\'s Theatre Company', url: 'https://www.childrenstheatre.org', eventsUrl: 'https://www.childrenstheatre.org/shows-events/', city: 'Minneapolis', state: 'MN' },
  { name: 'SteppingStone Theatre', url: 'https://www.steppingstonetheatre.org', eventsUrl: 'https://www.steppingstonetheatre.org/season/', city: 'Saint Paul', state: 'MN' },
  { name: 'In the Heart of the Beast Puppet Theatre', url: 'https://hobt.org', eventsUrl: 'https://hobt.org/events/', city: 'Minneapolis', state: 'MN' },

  // Mississippi
  { name: 'New Stage Theatre', url: 'https://www.newstagetheatre.com', eventsUrl: 'https://www.newstagetheatre.com/season/', city: 'Jackson', state: 'MS' },
  { name: 'Hattiesburg Saenger Theater', url: 'https://www.saengertheater.com', eventsUrl: 'https://www.saengertheater.com/events/', city: 'Hattiesburg', state: 'MS' },

  // North Carolina
  { name: 'Children\'s Theatre of Charlotte', url: 'https://www.ctcharlotte.org', eventsUrl: 'https://www.ctcharlotte.org/shows/', city: 'Charlotte', state: 'NC' },
  { name: 'Flat Rock Playhouse', url: 'https://www.flatrockplayhouse.org', eventsUrl: 'https://www.flatrockplayhouse.org/shows/', city: 'Flat Rock', state: 'NC' },
  { name: 'Durham Performing Arts Center', url: 'https://www.dpacnc.com', eventsUrl: 'https://www.dpacnc.com/events', city: 'Durham', state: 'NC' },

  // New Hampshire
  { name: 'Palace Theatre', url: 'https://www.palacetheatre.org', eventsUrl: 'https://www.palacetheatre.org/events/', city: 'Manchester', state: 'NH' },
  { name: 'Winnipesaukee Playhouse', url: 'https://www.winnipesaukeeplayhouse.org', eventsUrl: 'https://www.winnipesaukeeplayhouse.org/shows/', city: 'Meredith', state: 'NH' },

  // New Jersey
  { name: 'Paper Mill Playhouse', url: 'https://papermill.org', eventsUrl: 'https://papermill.org/shows-and-events/', city: 'Millburn', state: 'NJ' },
  { name: 'Growing Stage Children\'s Theatre', url: 'https://www.growingstage.com', eventsUrl: 'https://www.growingstage.com/season/', city: 'Netcong', state: 'NJ' },
  { name: 'George Street Playhouse', url: 'https://www.georgestreetplayhouse.org', eventsUrl: 'https://www.georgestreetplayhouse.org/shows-events/', city: 'New Brunswick', state: 'NJ' },

  // New York
  { name: 'New Victory Theater', url: 'https://www.newvictory.org', eventsUrl: 'https://www.newvictory.org/shows/', city: 'New York', state: 'NY' },
  { name: 'TADA! Youth Theater', url: 'https://www.tadatheater.com', eventsUrl: 'https://www.tadatheater.com/shows/', city: 'New York', state: 'NY' },
  { name: 'Swedish Cottage Marionette Theatre', url: 'https://www.cityparksfoundation.org/swedish-cottage-marionette-theatre/', eventsUrl: 'https://www.cityparksfoundation.org/swedish-cottage-marionette-theatre/', city: 'New York', state: 'NY' },
  { name: 'Syracuse Stage', url: 'https://www.syracusestage.org', eventsUrl: 'https://www.syracusestage.org/shows/', city: 'Syracuse', state: 'NY' },

  // Ohio
  { name: 'Columbus Children\'s Theatre', url: 'https://www.columbuschildrenstheatre.org', eventsUrl: 'https://www.columbuschildrenstheatre.org/shows/', city: 'Columbus', state: 'OH' },
  { name: 'Cleveland Play House', url: 'https://www.clevelandplayhouse.com', eventsUrl: 'https://www.clevelandplayhouse.com/shows-events/', city: 'Cleveland', state: 'OH' },
  { name: 'Cincinnati Playhouse in the Park', url: 'https://www.cincyplay.com', eventsUrl: 'https://www.cincyplay.com/shows-events/', city: 'Cincinnati', state: 'OH' },

  // Pennsylvania
  { name: 'Walnut Street Theatre', url: 'https://www.walnutstreettheatre.org', eventsUrl: 'https://www.walnutstreettheatre.org/whats-on/', city: 'Philadelphia', state: 'PA' },
  { name: 'Arden Theatre Company', url: 'https://www.ardentheatre.org', eventsUrl: 'https://www.ardentheatre.org/shows-events/', city: 'Philadelphia', state: 'PA' },
  { name: 'Pittsburgh CLO', url: 'https://www.pittsburghclo.org', eventsUrl: 'https://www.pittsburghclo.org/shows/', city: 'Pittsburgh', state: 'PA' },
  { name: 'People\'s Light Theatre', url: 'https://www.peopleslight.org', eventsUrl: 'https://www.peopleslight.org/events/', city: 'Malvern', state: 'PA' },

  // Rhode Island
  { name: 'Trinity Repertory Company', url: 'https://www.trinityrep.com', eventsUrl: 'https://www.trinityrep.com/whats-on/', city: 'Providence', state: 'RI' },
  { name: 'Gamm Theatre', url: 'https://www.gammtheatre.org', eventsUrl: 'https://www.gammtheatre.org/season/', city: 'Warwick', state: 'RI' },

  // South Carolina
  { name: 'Columbia Children\'s Theatre', url: 'https://www.columbiachildrenstheatre.com', eventsUrl: 'https://www.columbiachildrenstheatre.com/shows/', city: 'Columbia', state: 'SC' },
  { name: 'Charleston Stage Company', url: 'https://www.charlestonstage.com', eventsUrl: 'https://www.charlestonstage.com/shows/', city: 'Charleston', state: 'SC' },

  // Tennessee
  { name: 'Nashville Children\'s Theatre', url: 'https://www.nashvillechildrenstheatre.org', eventsUrl: 'https://www.nashvillechildrenstheatre.org/shows/', city: 'Nashville', state: 'TN' },
  { name: 'Orpheum Theatre Memphis', url: 'https://www.orpheum-memphis.com', eventsUrl: 'https://www.orpheum-memphis.com/events/', city: 'Memphis', state: 'TN' },
  { name: 'Chattanooga Theatre Centre', url: 'https://www.theatrecentre.com', eventsUrl: 'https://www.theatrecentre.com/shows/', city: 'Chattanooga', state: 'TN' },

  // Virginia
  { name: 'Virginia Rep', url: 'https://va-rep.org', eventsUrl: 'https://va-rep.org/performances/', city: 'Richmond', state: 'VA' },
  { name: 'Signature Theatre', url: 'https://www.sigtheatre.org', eventsUrl: 'https://www.sigtheatre.org/events/', city: 'Arlington', state: 'VA' },
  { name: 'Wolf Trap - Theatre-in-the-Woods', url: 'https://www.wolftrap.org', eventsUrl: 'https://www.wolftrap.org/calendar.aspx', city: 'Vienna', state: 'VA' },

  // Vermont
  { name: 'Flynn Center for the Performing Arts', url: 'https://www.flynnvt.org', eventsUrl: 'https://www.flynnvt.org/events/', city: 'Burlington', state: 'VT' },
  { name: 'Northern Stage', url: 'https://northernstage.org', eventsUrl: 'https://northernstage.org/season/', city: 'White River Junction', state: 'VT' },

  // Wisconsin
  { name: 'First Stage', url: 'https://www.firststage.org', eventsUrl: 'https://www.firststage.org/shows-events/', city: 'Milwaukee', state: 'WI' },
  { name: 'Children\'s Theater of Madison', url: 'https://www.ctmtheater.org', eventsUrl: 'https://www.ctmtheater.org/season/', city: 'Madison', state: 'WI' },
  { name: 'Milwaukee Repertory Theater', url: 'https://www.milwaukeerep.com', eventsUrl: 'https://www.milwaukeerep.com/shows-events/', city: 'Milwaukee', state: 'WI' },

  // West Virginia
  { name: 'Contemporary American Theater Festival', url: 'https://www.catf.org', eventsUrl: 'https://www.catf.org/plays/', city: 'Shepherdstown', state: 'WV' },
  { name: 'Greenbrier Valley Theatre', url: 'https://www.gvtheatre.org', eventsUrl: 'https://www.gvtheatre.org/season/', city: 'Lewisburg', state: 'WV' },
];

// ==========================================
// JUNK/INVALID TITLE FILTER
// ==========================================
function isJunkTitle(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 4 || t.length > 200) return true;
  if (/^\d+\s*events?\b/i.test(t)) return true;
  if (/^[MTWFS]\n/i.test(t)) return true;
  if (/^\d{1,2}\n/.test(t)) return true;
  const UI_JUNK = /^(skip to|rsvp|google calendar|icalendar|outlook|export|download|add to calendar|share this|list|month|day|week|this month|prev|next|view all|see all|show more|load more|back to|return to|sign up|log in|register|subscribe|more info|learn more|read more|click here|view details|event details|events search|views navigation)\b/i;
  if (UI_JUNK.test(t)) return true;
  const ERROR_JUNK = /^(sorry|no events|there are no|no results|nothing found|loading|please wait|search results|filter|we couldn't find|page not found|error|oops)/i;
  if (ERROR_JUNK.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  return false;
}

function isValidDateString(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 5) return false;
  if (/^\d{1,2}:\d{2}\s*(am|pm)/i.test(t) && !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t) && !/\d{1,2}\/\d{1,2}/.test(t)) return false;
  const hasMonth = /\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|oct|nov|dec|january|february|august|september|october|november|december)\b/i.test(t);
  const hasNumericDate = /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/.test(t);
  return hasMonth || hasNumericDate;
}

// ==========================================
// STRATEGY 1: WordPress REST API (The Events Calendar)
// ==========================================
async function tryWordPressAPI(theater, page) {
  const apiUrl = `${theater.url}/wp-json/tribe/events/v1/events/?per_page=50&start_date=now`;
  try {
    const response = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        return data;
      } catch (e) {
        return null;
      }
    }, apiUrl);

    if (!response || !response.events || !Array.isArray(response.events)) return null;

    const events = [];
    for (const ev of response.events) {
      const title = (ev.title || '').replace(/<[^>]*>/g, '').trim();
      if (!title || isJunkTitle(title)) continue;
      if (NON_FAMILY_PATTERNS.test(`${title} ${ev.description || ''}`)) continue;

      const description = (ev.description || '').replace(/<[^>]*>/g, '').trim().substring(0, 1000);
      const dateStr = ev.start_date || ev.utc_start_date || '';
      const imageUrl = ev.image?.url || '';
      const eventUrl = ev.url || theater.eventsUrl;

      events.push({
        title,
        eventDate: dateStr,
        date: dateStr,
        description: description || `${title} at ${theater.name}`,
        url: eventUrl,
        imageUrl,
        venue: theater.name,
        venueName: theater.name,
        city: theater.city,
        state: theater.state,
        category: 'Performing Arts',
        source_url: theater.eventsUrl,
        scraper_name: SCRAPER_NAME,
      });
    }

    return events.length > 0 ? events : null;
  } catch (err) {
    return null;
  }
}

// ==========================================
// STRATEGY 2: Puppeteer HTML Scraping
// ==========================================
async function tryHTMLScraping(theater, page) {
  try {
    await page.goto(theater.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(3000);

    const rawEvents = await page.evaluate((theaterName) => {
      const results = [];
      const seen = new Set();

      function addEvent(title, date, description, url, imageUrl) {
        if (!title || title.length < 4) return;
        const key = title.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          title: title.trim(),
          date: date || '',
          description: (description || '').substring(0, 1000),
          url: url || '',
          imageUrl: imageUrl || '',
          venueName: theaterName,
        });
      }

      // Strategy A: Tribe Events Calendar plugin
      document.querySelectorAll(
        '.tribe-events-single, .type-tribe_events, ' +
        '.tribe-common-g-row, .tribe-events-calendar-list__event, ' +
        '.tribe-events-pro-summary__event'
      ).forEach(card => {
        const titleEl = card.querySelector(
          '.tribe-events-list-event-title a, .tribe-events-calendar-list__event-title a, ' +
          '.tribe-events-pro-summary__event-title a, h2 a, h3 a'
        );
        const title = titleEl?.textContent?.trim() || card.querySelector('h2, h3')?.textContent?.trim();
        const dateEl = card.querySelector(
          '.tribe-events-schedule, .tribe-event-schedule-details, ' +
          '.tribe-events-calendar-list__event-datetime, time, .tribe-common-b2'
        );
        const date = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';
        const desc = card.querySelector('.tribe-events-list-event-description, .tribe-events-content, p')?.textContent?.trim();
        const url = titleEl?.getAttribute('href') || '';
        const img = card.querySelector('img')?.getAttribute('src') || '';
        addEvent(title, date, desc, url, img);
      });

      // Strategy B: Show/production cards (common on theater sites)
      if (results.length === 0) {
        document.querySelectorAll(
          '.show-card, .production-card, .show-item, .production-item, ' +
          '.performance-card, .season-show, [class*="show-card"], ' +
          '[class*="production"], .show, .performance, ' +
          '.event-card, .event-item, .events-listing, article.event, ' +
          '.views-row, .node--type-event'
        ).forEach(card => {
          const title = card.querySelector('h2, h3, h4, .show-title, .production-title, .title, [class*="title"] a')?.textContent?.trim();
          const date = card.querySelector('time, .date, .show-date, .performance-date, [class*="date"], .meta')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') || '';
          const desc = card.querySelector('p, .description, .synopsis, .show-description, [class*="desc"]')?.textContent?.trim();
          const url = card.querySelector('a')?.getAttribute('href') || '';
          const img = card.querySelector('img')?.getAttribute('src') || '';
          addEvent(title, date, desc, url, img);
        });
      }

      // Strategy C: Broad fallback — links in list/article structures
      if (results.length === 0) {
        document.querySelectorAll('article, .card, li.show, li.event, .list-item').forEach(card => {
          const linkEl = card.querySelector('a[href]');
          const title = card.querySelector('h2, h3, h4')?.textContent?.trim() || linkEl?.textContent?.trim();
          const date = card.querySelector('time, .date, span[class*="date"]')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') || '';
          const desc = card.querySelector('p')?.textContent?.trim();
          const url = linkEl?.getAttribute('href') || '';
          const img = card.querySelector('img')?.getAttribute('src') || '';
          addEvent(title, date, desc, url, img);
        });
      }

      return results;
    }, theater.name);

    return rawEvents.length > 0 ? rawEvents : null;
  } catch (err) {
    return null;
  }
}

// ==========================================
// SCRAPE A SINGLE THEATER
// ==========================================
async function scrapeTheater(theater, browser) {
  console.log(`\n🎭 ${theater.name} (${theater.city}, ${theater.state})`);
  console.log(`   🌐 ${theater.eventsUrl}`);

  const events = [];
  let page;

  try {
    page = await createStealthPage(browser);

    // Strategy 1: Try WordPress REST API first
    const apiEvents = await tryWordPressAPI(theater, page);
    if (apiEvents && apiEvents.length > 0) {
      console.log(`   ✅ WordPress API: ${apiEvents.length} events`);
      events.push(...apiEvents);
      await page.close();
      return events;
    }

    // Strategy 2: Puppeteer HTML scraping
    const htmlEvents = await tryHTMLScraping(theater, page);
    if (htmlEvents && htmlEvents.length > 0) {
      let skippedNonFamily = 0;

      for (const raw of htmlEvents) {
        if (isJunkTitle(raw.title)) continue;
        if (NON_FAMILY_PATTERNS.test(`${raw.title} ${raw.description || ''}`)) {
          skippedNonFamily++;
          continue;
        }

        // Resolve relative URLs
        let eventUrl = raw.url || theater.eventsUrl;
        if (eventUrl && eventUrl.startsWith('/')) {
          eventUrl = `${theater.url}${eventUrl}`;
        }

        let imageUrl = raw.imageUrl || '';
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `${theater.url}${imageUrl}`;
        }

        events.push({
          title: raw.title,
          eventDate: raw.date || '',
          date: raw.date || '',
          description: raw.description || `${raw.title} at ${theater.name}`,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: theater.name,
          venueName: theater.name,
          city: theater.city,
          state: theater.state,
          category: 'Performing Arts',
          source_url: theater.eventsUrl,
          scraper_name: SCRAPER_NAME,
        });
      }

      if (skippedNonFamily > 0) {
        console.log(`   🚫 Skipped ${skippedNonFamily} non-family events`);
      }
      console.log(`   ✅ HTML scrape: ${events.length} events`);
    } else {
      console.log(`   ⚠️ No events found`);
    }

    await page.close();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    if (page) await page.close().catch(() => {});
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================
async function scrapeChildrensTheater(filterStates = null) {
  console.log('\n\x1b[35m🎭🎪━━━━━━━━━━━━━ CHILDREN\'S THEATER SCRAPER ━━━━━━━━━━━━━━🎭🎪\x1b[0m');

  const theatersToScrape = filterStates
    ? THEATERS.filter(t => filterStates.includes(t.state))
    : THEATERS;

  console.log(`📍 Target: ${theatersToScrape.length} theaters across ${new Set(theatersToScrape.map(t => t.state)).size} states`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};
  let totalFound = 0;

  try {
    for (let i = 0; i < theatersToScrape.length; i++) {
      const theater = theatersToScrape[i];
      console.log(`\n[${i + 1}/${theatersToScrape.length}] ${theater.name}`);

      const theaterEvents = await scrapeTheater(theater, browser);
      allEvents.push(...theaterEvents);

      if (!stateResults[theater.state]) stateResults[theater.state] = 0;
      stateResults[theater.state] += theaterEvents.length;
      totalFound += theaterEvents.length;

      // Save in batches to keep memory manageable
      if (allEvents.length >= 200 || i === theatersToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          const venues = allEvents.map(e => ({
            name: e.venueName || e.venue,
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
                category: 'Performing Arts',
                platform: 'childrens-theater',
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

      // Polite delay between theaters
      if (i < theatersToScrape.length - 1) {
        await delay(3000);
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  console.log('\n\x1b[35m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalFound}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalFound,
    new: totalFound,
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

  scrapeChildrensTheater(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeChildrensTheaterCloudFunction() {
  try {
    const result = await scrapeChildrensTheater();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeChildrensTheater,
  scrapeChildrensTheaterCloudFunction,
};

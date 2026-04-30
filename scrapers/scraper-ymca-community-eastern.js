#!/usr/bin/env node

/**
 * YMCA & COMMUNITY CENTERS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for YMCAs, JCCs, Boys & Girls Clubs,
 * and community centers across all 28 eastern US states.
 *
 * Multi-strategy scraping per center:
 *   1. Try WordPress REST API: {url}/wp-json/tribe/events/v1/events/ (The Events Calendar plugin)
 *   2. Fall back to Puppeteer HTML scraping for event/program listing pages
 *   3. Look for: program listings, event calendars, class schedules
 *
 * Coverage: 28 states (~50-70 centers)
 *
 * Usage:
 *   node scrapers/scraper-ymca-community-eastern.js                    # All states
 *   node scrapers/scraper-ymca-community-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-ymca-community-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-ymca-community-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeYMCACommunityCloudFunction
 * Registry: Group 1
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'YMCA-Community-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie|singles\s*night)\b/i;

// Family-oriented keyword patterns to prioritize
const FAMILY_KEYWORDS = /\b(family|kids|children|youth|teen|tween|camp|swim\s*lesson|open\s*gym|open\s*swim|parent|toddler|preschool|baby|storytime|movie\s*night|game\s*night|art\s*class|dance\s*class|gymnastics|karate|martial\s*arts|basketball|soccer|t-ball|baseball|volleyball|after\s*school|before\s*school|spring\s*break|summer\s*camp|winter\s*camp|holiday\s*camp|science\s*club|coding|robotics|STEM|craft|cooking\s*class)\b/i;

// ==========================================
// CENTERS CONFIG (~50-70 YMCAs, JCCs, and community centers)
// ==========================================
const CENTERS = [
  // Alabama
  { name: 'YMCA of Greater Birmingham', url: 'https://www.ymcabham.org', eventsUrl: 'https://www.ymcabham.org/events', city: 'Birmingham', state: 'AL', type: 'ymca' },
  { name: 'YMCA of the Shoals', url: 'https://www.ymcashoals.org', eventsUrl: 'https://www.ymcashoals.org/events', city: 'Florence', state: 'AL', type: 'ymca' },

  // Connecticut
  { name: 'YMCA of Greater Hartford', url: 'https://www.ghymca.org', eventsUrl: 'https://www.ghymca.org/events', city: 'Hartford', state: 'CT', type: 'ymca' },
  { name: 'JCC of Greater New Haven', url: 'https://www.jccnh.org', eventsUrl: 'https://www.jccnh.org/events/', city: 'Woodbridge', state: 'CT', type: 'jcc' },

  // DC
  { name: 'YMCA of Metropolitan Washington', url: 'https://www.ymcadc.org', eventsUrl: 'https://www.ymcadc.org/events/', city: 'Washington', state: 'DC', type: 'ymca' },
  { name: 'Washington DCJCC', url: 'https://www.washingtondcjcc.org', eventsUrl: 'https://www.washingtondcjcc.org/events/', city: 'Washington', state: 'DC', type: 'jcc' },
  { name: 'Boys & Girls Clubs of Greater Washington', url: 'https://www.bgcgw.org', eventsUrl: 'https://www.bgcgw.org/events/', city: 'Washington', state: 'DC', type: 'community' },

  // Delaware
  { name: 'YMCA of Delaware', url: 'https://www.ymcade.org', eventsUrl: 'https://www.ymcade.org/events/', city: 'Wilmington', state: 'DE', type: 'ymca' },

  // Florida
  { name: 'YMCA of Central Florida', url: 'https://www.centralfloridaymca.org', eventsUrl: 'https://www.centralfloridaymca.org/events', city: 'Orlando', state: 'FL', type: 'ymca' },
  { name: 'YMCA of South Florida', url: 'https://www.ymcasouthflorida.org', eventsUrl: 'https://www.ymcasouthflorida.org/events', city: 'Fort Lauderdale', state: 'FL', type: 'ymca' },
  { name: 'Tampa Metropolitan Area YMCA', url: 'https://www.tampaymca.org', eventsUrl: 'https://www.tampaymca.org/events', city: 'Tampa', state: 'FL', type: 'ymca' },
  { name: 'Mandel JCC Palm Beach', url: 'https://www.jcconline.com', eventsUrl: 'https://www.jcconline.com/events/', city: 'Palm Beach Gardens', state: 'FL', type: 'jcc' },

  // Georgia
  { name: 'YMCA of Metro Atlanta', url: 'https://www.ymcaatlanta.org', eventsUrl: 'https://www.ymcaatlanta.org/events/', city: 'Atlanta', state: 'GA', type: 'ymca' },
  { name: 'Marcus JCC Atlanta', url: 'https://www.atlantajcc.org', eventsUrl: 'https://www.atlantajcc.org/events/', city: 'Atlanta', state: 'GA', type: 'jcc' },

  // Iowa
  { name: 'YMCA of Greater Des Moines', url: 'https://www.dmymca.org', eventsUrl: 'https://www.dmymca.org/events', city: 'Des Moines', state: 'IA', type: 'ymca' },
  { name: 'Cedar Rapids Metro YMCA', url: 'https://www.crmetroymca.org', eventsUrl: 'https://www.crmetroymca.org/events', city: 'Cedar Rapids', state: 'IA', type: 'ymca' },

  // Illinois
  { name: 'YMCA of Metropolitan Chicago', url: 'https://www.ymcachicago.org', eventsUrl: 'https://www.ymcachicago.org/events', city: 'Chicago', state: 'IL', type: 'ymca' },
  { name: 'JCC Chicago', url: 'https://www.jccchicago.org', eventsUrl: 'https://www.jccchicago.org/events/', city: 'Chicago', state: 'IL', type: 'jcc' },
  { name: 'YMCA of Rock River Valley', url: 'https://www.rockriverymca.org', eventsUrl: 'https://www.rockriverymca.org/events', city: 'Rockford', state: 'IL', type: 'ymca' },

  // Indiana
  { name: 'YMCA of Greater Indianapolis', url: 'https://www.indymca.org', eventsUrl: 'https://www.indymca.org/events', city: 'Indianapolis', state: 'IN', type: 'ymca' },
  { name: 'JCC Indianapolis', url: 'https://www.jccindy.org', eventsUrl: 'https://www.jccindy.org/events/', city: 'Indianapolis', state: 'IN', type: 'jcc' },

  // Kentucky
  { name: 'YMCA of Greater Louisville', url: 'https://www.ymcalouisville.org', eventsUrl: 'https://www.ymcalouisville.org/events', city: 'Louisville', state: 'KY', type: 'ymca' },
  { name: 'YMCA of Central Kentucky', url: 'https://www.ymcacky.org', eventsUrl: 'https://www.ymcacky.org/events', city: 'Lexington', state: 'KY', type: 'ymca' },

  // Massachusetts
  { name: 'YMCA of Greater Boston', url: 'https://www.ymcaboston.org', eventsUrl: 'https://www.ymcaboston.org/events', city: 'Boston', state: 'MA', type: 'ymca' },
  { name: 'JCC Greater Boston', url: 'https://www.bostonjcc.org', eventsUrl: 'https://www.bostonjcc.org/events/', city: 'Newton', state: 'MA', type: 'jcc' },

  // Maryland
  { name: 'Y of Central Maryland', url: 'https://www.ymaryland.org', eventsUrl: 'https://www.ymaryland.org/events', city: 'Baltimore', state: 'MD', type: 'ymca' },
  { name: 'JCC of Greater Baltimore', url: 'https://www.jcc.org', eventsUrl: 'https://www.jcc.org/events/', city: 'Owings Mills', state: 'MD', type: 'jcc' },
  { name: 'Bender JCC of Greater Washington', url: 'https://www.benderjccgw.org', eventsUrl: 'https://www.benderjccgw.org/events/', city: 'Rockville', state: 'MD', type: 'jcc' },

  // Maine
  { name: 'YMCA of Southern Maine', url: 'https://www.ymcaofsouthernmaine.org', eventsUrl: 'https://www.ymcaofsouthernmaine.org/events', city: 'Portland', state: 'ME', type: 'ymca' },

  // Minnesota
  { name: 'YMCA of the North', url: 'https://www.ymcanorth.org', eventsUrl: 'https://www.ymcanorth.org/events', city: 'Minneapolis', state: 'MN', type: 'ymca' },
  { name: 'JCC St. Paul', url: 'https://www.stpauljcc.org', eventsUrl: 'https://www.stpauljcc.org/events/', city: 'Saint Paul', state: 'MN', type: 'jcc' },

  // Mississippi
  { name: 'YMCA of Metropolitan Jackson', url: 'https://www.metrojacksonymca.org', eventsUrl: 'https://www.metrojacksonymca.org/events', city: 'Jackson', state: 'MS', type: 'ymca' },

  // North Carolina
  { name: 'YMCA of Greater Charlotte', url: 'https://www.ymcacharlotte.org', eventsUrl: 'https://www.ymcacharlotte.org/events', city: 'Charlotte', state: 'NC', type: 'ymca' },
  { name: 'YMCA of the Triangle', url: 'https://www.ymcatriangle.org', eventsUrl: 'https://www.ymcatriangle.org/events', city: 'Raleigh', state: 'NC', type: 'ymca' },

  // New Hampshire
  { name: 'Granite YMCA', url: 'https://www.graniteymca.org', eventsUrl: 'https://www.graniteymca.org/events', city: 'Manchester', state: 'NH', type: 'ymca' },

  // New Jersey
  { name: 'YMCA of Greater Monmouth County', url: 'https://www.ymcanj.org', eventsUrl: 'https://www.ymcanj.org/events', city: 'Freehold', state: 'NJ', type: 'ymca' },
  { name: 'JCC MetroWest', url: 'https://www.jccmetrowest.org', eventsUrl: 'https://www.jccmetrowest.org/events/', city: 'West Orange', state: 'NJ', type: 'jcc' },
  { name: 'Kaplen JCC on the Palisades', url: 'https://www.jccotp.org', eventsUrl: 'https://www.jccotp.org/events/', city: 'Tenafly', state: 'NJ', type: 'jcc' },

  // New York
  { name: 'YMCA of Greater New York', url: 'https://www.ymcanyc.org', eventsUrl: 'https://www.ymcanyc.org/events', city: 'New York', state: 'NY', type: 'ymca' },
  { name: 'JCC Manhattan', url: 'https://www.jccmanhattan.org', eventsUrl: 'https://www.jccmanhattan.org/events/', city: 'New York', state: 'NY', type: 'jcc' },
  { name: 'JCC of Mid-Westchester', url: 'https://www.jccmw.org', eventsUrl: 'https://www.jccmw.org/events/', city: 'Scarsdale', state: 'NY', type: 'jcc' },
  { name: 'YMCA of Greater Rochester', url: 'https://www.rochesterymca.org', eventsUrl: 'https://www.rochesterymca.org/events', city: 'Rochester', state: 'NY', type: 'ymca' },

  // Ohio
  { name: 'YMCA of Greater Cleveland', url: 'https://www.clevelandymca.org', eventsUrl: 'https://www.clevelandymca.org/events', city: 'Cleveland', state: 'OH', type: 'ymca' },
  { name: 'YMCA of Central Ohio', url: 'https://www.ymcacolumbus.org', eventsUrl: 'https://www.ymcacolumbus.org/events', city: 'Columbus', state: 'OH', type: 'ymca' },
  { name: 'Mandel JCC Cleveland', url: 'https://www.mandeljcc.org', eventsUrl: 'https://www.mandeljcc.org/events/', city: 'Beachwood', state: 'OH', type: 'jcc' },

  // Pennsylvania
  { name: 'YMCA of Greater Pittsburgh', url: 'https://www.ymcapgh.org', eventsUrl: 'https://www.ymcapgh.org/events', city: 'Pittsburgh', state: 'PA', type: 'ymca' },
  { name: 'Philadelphia Freedom Valley YMCA', url: 'https://www.philaymca.org', eventsUrl: 'https://www.philaymca.org/events', city: 'Philadelphia', state: 'PA', type: 'ymca' },
  { name: 'JCC of Greater Philadelphia', url: 'https://www.jccphilly.org', eventsUrl: 'https://www.jccphilly.org/events/', city: 'Philadelphia', state: 'PA', type: 'jcc' },

  // Rhode Island
  { name: 'YMCA of Greater Providence', url: 'https://www.gpymca.org', eventsUrl: 'https://www.gpymca.org/events', city: 'Providence', state: 'RI', type: 'ymca' },
  { name: 'JCC of Rhode Island', url: 'https://www.jccri.org', eventsUrl: 'https://www.jccri.org/events/', city: 'Providence', state: 'RI', type: 'jcc' },

  // South Carolina
  { name: 'YMCA of Columbia', url: 'https://www.columbiaymca.org', eventsUrl: 'https://www.columbiaymca.org/events', city: 'Columbia', state: 'SC', type: 'ymca' },
  { name: 'YMCA of Greater Charleston', url: 'https://www.charlestonymca.org', eventsUrl: 'https://www.charlestonymca.org/events', city: 'Charleston', state: 'SC', type: 'ymca' },

  // Tennessee
  { name: 'YMCA of Middle Tennessee', url: 'https://www.ymcamidtn.org', eventsUrl: 'https://www.ymcamidtn.org/events', city: 'Nashville', state: 'TN', type: 'ymca' },
  { name: 'YMCA of Memphis & the Mid-South', url: 'https://www.ymcamemphis.org', eventsUrl: 'https://www.ymcamemphis.org/events', city: 'Memphis', state: 'TN', type: 'ymca' },
  { name: 'Gordon JCC Nashville', url: 'https://www.gordonjcc.org', eventsUrl: 'https://www.gordonjcc.org/events/', city: 'Nashville', state: 'TN', type: 'jcc' },

  // Virginia
  { name: 'YMCA of Greater Richmond', url: 'https://www.ymcarichmond.org', eventsUrl: 'https://www.ymcarichmond.org/events', city: 'Richmond', state: 'VA', type: 'ymca' },
  { name: 'YMCA of South Hampton Roads', url: 'https://www.ymcashr.org', eventsUrl: 'https://www.ymcashr.org/events', city: 'Norfolk', state: 'VA', type: 'ymca' },
  { name: 'JCC of Northern Virginia', url: 'https://www.jccnv.org', eventsUrl: 'https://www.jccnv.org/events/', city: 'Fairfax', state: 'VA', type: 'jcc' },

  // Vermont
  { name: 'Greater Burlington YMCA', url: 'https://www.gbymca.org', eventsUrl: 'https://www.gbymca.org/events', city: 'Burlington', state: 'VT', type: 'ymca' },

  // Wisconsin
  { name: 'YMCA of Metropolitan Milwaukee', url: 'https://www.ymcamke.org', eventsUrl: 'https://www.ymcamke.org/events', city: 'Milwaukee', state: 'WI', type: 'ymca' },
  { name: 'YMCA of Dane County', url: 'https://www.ymcadanecounty.org', eventsUrl: 'https://www.ymcadanecounty.org/events', city: 'Madison', state: 'WI', type: 'ymca' },
  { name: 'Harry & Rose Samson Family JCC', url: 'https://www.jccmilwaukee.org', eventsUrl: 'https://www.jccmilwaukee.org/events/', city: 'Whitefish Bay', state: 'WI', type: 'jcc' },

  // West Virginia
  { name: 'YMCA of Kanawha Valley', url: 'https://www.ymcakvwv.org', eventsUrl: 'https://www.ymcakvwv.org/events', city: 'Charleston', state: 'WV', type: 'ymca' },
  { name: 'YMCA of the Eastern Panhandle', url: 'https://www.ymcaep.org', eventsUrl: 'https://www.ymcaep.org/events', city: 'Martinsburg', state: 'WV', type: 'ymca' },
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

/**
 * Categorize an event from a community center based on title/description
 */
function categorizeEvent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(swim|pool|aqua|water\s*aerobics|lifeguard|dive)\b/.test(text)) return 'Sports & Recreation';
  if (/\b(basketball|soccer|football|baseball|softball|volleyball|tennis|pickleball|sports?\s*league)\b/.test(text)) return 'Sports & Recreation';
  if (/\b(gymnastics|martial\s*arts|karate|judo|taekwondo|dance|ballet|cheer|fitness|yoga|zumba)\b/.test(text)) return 'Sports & Recreation';
  if (/\b(camp|summer\s*camp|spring\s*break\s*camp|winter\s*camp|holiday\s*camp|day\s*camp)\b/.test(text)) return 'Camps';
  if (/\b(art\s*class|craft|paint|draw|pottery|music\s*class|theater|drama|acting)\b/.test(text)) return 'Arts & Crafts';
  if (/\b(STEM|science|coding|robot|tech|computer|engineer)\b/i.test(text)) return 'STEM & Education';
  if (/\b(storytime|story\s*time|reading|book\s*club|literacy)\b/.test(text)) return 'Learning & Culture';
  return 'Community';
}

// ==========================================
// STRATEGY 1: WordPress REST API (The Events Calendar)
// ==========================================
async function tryWordPressAPI(center, page) {
  const apiUrl = `${center.url}/wp-json/tribe/events/v1/events/?per_page=50&start_date=now`;
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
      const eventUrl = ev.url || center.eventsUrl;
      const category = categorizeEvent(title, description);

      events.push({
        title,
        eventDate: dateStr,
        date: dateStr,
        description: description || `${title} at ${center.name}`,
        url: eventUrl,
        imageUrl,
        venue: center.name,
        venueName: center.name,
        city: center.city,
        state: center.state,
        category: category,
        source_url: center.eventsUrl,
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
async function tryHTMLScraping(center, page) {
  try {
    await page.goto(center.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(3000);

    const rawEvents = await page.evaluate((centerName) => {
      const results = [];
      const seen = new Set();

      function addEvent(title, date, description, url, imageUrl, ageRange) {
        if (!title || title.length < 4) return;
        // Reject when "date" is a pure time-only string ("9:00 AM", "12:00 PM").
        // Times alone aren't dates and pollute the logs as "invalid date".
        const dateStr = (date || '').trim();
        if (/^\d{1,2}(:\d{2})?\s*[AP]\.?M\.?$/i.test(dateStr)) return;
        const key = title.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          title: title.trim(),
          date: dateStr,
          description: (description || '').substring(0, 1000),
          url: url || '',
          imageUrl: imageUrl || '',
          ageRange: ageRange || '',
          venueName: centerName,
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

      // Strategy B: Program/event cards (common on YMCA/JCC sites)
      if (results.length === 0) {
        document.querySelectorAll(
          '.program-card, .event-card, .event-item, .program-item, ' +
          '.class-card, .activity-card, [class*="event-card"], ' +
          '[class*="program"], .event-listing, .events-listing, ' +
          '.views-row, .node--type-event, article.event, ' +
          '.upcoming-event, .calendar-event'
        ).forEach(card => {
          const title = card.querySelector('h2, h3, h4, .program-title, .event-title, .title, [class*="title"] a')?.textContent?.trim();
          const date = card.querySelector('time, .date, .event-date, .program-date, [class*="date"], .meta')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') || '';
          const desc = card.querySelector('p, .description, .excerpt, .event-description, [class*="desc"]')?.textContent?.trim();
          const url = card.querySelector('a')?.getAttribute('href') || '';
          const img = card.querySelector('img')?.getAttribute('src') || '';
          const age = card.querySelector('.age-range, .ages, [class*="age"]')?.textContent?.trim() || '';
          addEvent(title, date, desc, url, img, age);
        });
      }

      // Strategy C: Daxko widget events (many YMCAs use Daxko for scheduling)
      if (results.length === 0) {
        document.querySelectorAll(
          '[class*="daxko"], .program-offering, .offering-card, .schedule-item'
        ).forEach(card => {
          const title = card.querySelector('h2, h3, h4, .title, .name')?.textContent?.trim();
          // Prefer .date / time elements over .time / .schedule (which often hold "9:00 AM" only).
          const date = card.querySelector('.date, .event-date, .program-date')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') ||
                       card.querySelector('time')?.textContent?.trim() ||
                       card.querySelector('.schedule')?.textContent?.trim() ||
                       card.querySelector('.time')?.textContent?.trim() ||
                       '';
          const desc = card.querySelector('p, .description')?.textContent?.trim();
          const url = card.querySelector('a')?.getAttribute('href') || '';
          addEvent(title, date, desc, url, '');
        });
      }

      // Strategy D: Broad fallback
      if (results.length === 0) {
        document.querySelectorAll('article, .card, li.event, li.program, .list-item').forEach(card => {
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
    }, center.name);

    return rawEvents.length > 0 ? rawEvents : null;
  } catch (err) {
    return null;
  }
}

// ==========================================
// SCRAPE A SINGLE CENTER
// ==========================================
async function scrapeCenter(center, browser) {
  const typeEmoji = center.type === 'ymca' ? '🏋️' : center.type === 'jcc' ? '✡️' : '🏢';
  console.log(`\n${typeEmoji} ${center.name} (${center.city}, ${center.state})`);
  console.log(`   🌐 ${center.eventsUrl}`);

  const events = [];
  let page;

  try {
    page = await createStealthPage(browser);

    // Strategy 1: Try WordPress REST API first
    const apiEvents = await tryWordPressAPI(center, page);
    if (apiEvents && apiEvents.length > 0) {
      console.log(`   ✅ WordPress API: ${apiEvents.length} events`);
      events.push(...apiEvents);
      await page.close();
      return events;
    }

    // Strategy 2: Puppeteer HTML scraping
    const htmlEvents = await tryHTMLScraping(center, page);
    if (htmlEvents && htmlEvents.length > 0) {
      let skippedNonFamily = 0;

      for (const raw of htmlEvents) {
        if (isJunkTitle(raw.title)) continue;
        if (NON_FAMILY_PATTERNS.test(`${raw.title} ${raw.description || ''}`)) {
          skippedNonFamily++;
          continue;
        }

        // Resolve relative URLs
        let eventUrl = raw.url || center.eventsUrl;
        if (eventUrl && eventUrl.startsWith('/')) {
          eventUrl = `${center.url}${eventUrl}`;
        }

        let imageUrl = raw.imageUrl || '';
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `${center.url}${imageUrl}`;
        }

        const category = categorizeEvent(raw.title, raw.description || '');

        events.push({
          title: raw.title,
          eventDate: raw.date || '',
          date: raw.date || '',
          description: raw.description || `${raw.title} at ${center.name}`,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: center.name,
          venueName: center.name,
          city: center.city,
          state: center.state,
          category: category,
          source_url: center.eventsUrl,
          scraper_name: SCRAPER_NAME,
          ageRange: raw.ageRange || '',
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
async function scrapeYMCACommunity(filterStates = null) {
  console.log('\n\x1b[36m🏋️🏢━━━━━━━━━━━━━ YMCA & COMMUNITY CENTERS SCRAPER ━━━━━━━━━━━━━━🏋️🏢\x1b[0m');

  const centersToScrape = filterStates
    ? CENTERS.filter(c => filterStates.includes(c.state))
    : CENTERS;

  const ymcaCount = centersToScrape.filter(c => c.type === 'ymca').length;
  const jccCount = centersToScrape.filter(c => c.type === 'jcc').length;
  const communityCount = centersToScrape.filter(c => c.type === 'community').length;

  console.log(`📍 Target: ${centersToScrape.length} centers (${ymcaCount} YMCA, ${jccCount} JCC, ${communityCount} community) across ${new Set(centersToScrape.map(c => c.state)).size} states`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};
  let totalFound = 0;
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    for (let i = 0; i < centersToScrape.length; i++) {
      const center = centersToScrape[i];
      console.log(`\n[${i + 1}/${centersToScrape.length}] ${center.name}`);

      const centerEvents = await scrapeCenter(center, browser);
      allEvents.push(...centerEvents);

      if (!stateResults[center.state]) stateResults[center.state] = 0;
      stateResults[center.state] += centerEvents.length;
      totalFound += centerEvents.length;

      // Save in batches to keep memory manageable
      if (allEvents.length >= 200 || i === centersToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          // One venue entry per UNIQUE (venueName, city, state).
          const venueMap = new Map();
          for (const e of allEvents) {
            const name = (e.venueName || e.venue || '').trim();
            if (!name && !e.address) continue;
            const key = `${name}|${e.city || ''}|${e.state || ''}`;
            if (!venueMap.has(key)) {
              venueMap.set(key, {
                name: name || `${e.city}, ${e.state}`,
                address: e.address || '',
                city: e.city,
                state: e.state,
              });
            }
          }
          const venues = Array.from(venueMap.values());

          try {
            const result = await saveEventsWithGeocoding(
              allEvents,
              venues,
              {
                scraperName: SCRAPER_NAME,
                state: allEvents[0].state,
                category: 'Community',
                platform: 'ymca-community',
              }
            );
            const saved = result?.saved || result?.new || result?.imported || 0;
            const skipped = result?.skipped || 0;
            const errors = result?.errors || 0;
            totalSaved += saved;
            totalSkipped += skipped;
            totalErrors += errors;
            console.log(`   💾 Saved: ${saved} | ⏭️ Skipped: ${skipped} | ❌ Errors: ${errors}`);
          } catch (err) {
            console.error(`   ❌ Save error: ${err.message}`);
            totalErrors++;
          }
        }
        allEvents = [];
      }

      // Polite delay between centers
      if (i < centersToScrape.length - 1) {
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
  console.log('\n\x1b[36m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalFound}`);
  console.log(`Total saved: ${totalSaved} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalFound,
    new: totalSaved,
    duplicates: totalSkipped,
  });

  return {
    found: totalFound,
    new: totalSaved,
    saved: totalSaved,
    duplicates: totalSkipped,
    skipped: totalSkipped,
    errors: totalErrors,
    stateResults,
  };
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

  scrapeYMCACommunity(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeYMCACommunityCloudFunction() {
  try {
    const result = await scrapeYMCACommunity();
    return { success: true, ...result, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeYMCACommunity,
  scrapeYMCACommunityCloudFunction,
};

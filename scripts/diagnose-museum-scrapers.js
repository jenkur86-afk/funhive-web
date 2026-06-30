#!/usr/bin/env node
/**
 * CHILDREN'S MUSEUM SCRAPER DIAGNOSTIC
 *
 * Loads each failing museum site with full Puppeteer rendering, tries every
 * extraction strategy, and reports which found events + sample data.
 * For zero-match sites: dumps event-related CSS classes to guide new extractors.
 * Also probes TEC REST API endpoint on each site.
 *
 * Usage: node scripts/diagnose-museum-scrapers.js
 * Options:
 *   --venue "Museum Name"  diagnose a single site
 *   --skip-puppeteer       only probe REST APIs (faster)
 */

const path = require('path');
const axios = require('axios');
const https = require('https');

// Puppeteer launcher from scraper helpers
const { launchBrowser } = require('../scrapers/puppeteer-config');

// -----------------------------------------------------------------------
// Sites to diagnose — all 21 not resolved by Phase 1 URL/API fixes
// -----------------------------------------------------------------------
// Corrected URLs reflect all fixes from Phase 1+2 (2026-06-29)
const SITES = [
  { name: 'EarlyWorks',               url: 'https://earlyworks.com/explore/events/',                          hint: 'mec' },
  { name: 'Stepping Stones',           url: 'https://www.steppingstonesmuseum.org/calendar',                   hint: null },
  { name: 'Imagine Nation',            url: 'https://www.imaginenation.org/calendar',                          hint: null },
  { name: 'Delaware',                  url: 'https://delawarechildrensmuseum.org/events/',                     hint: null },
  { name: 'Atlanta',                   url: 'https://childrensmuseumatlanta.org/programs/',                    hint: null },
  { name: 'Chicago',                   url: 'https://www.chicagochildrensmuseum.org/program-calendar',         hint: 'squarespace' },
  { name: 'Kohl',                      url: 'https://www.kohlchildrensmuseum.org/events/',                     hint: null },
  { name: 'Indianapolis',              url: 'https://www.childrensmuseum.org/visit/experiences/special-events', hint: null },
  { name: 'Maine Discovery',           url: 'https://www.mainediscoverymuseum.org/special-events',             hint: 'squarespace' },
  { name: 'Boston',                    url: 'https://bostonchildrensmuseum.org/programs-events',               hint: null },
  { name: 'Discovery Acton',           url: 'https://www.discoveryacton.org/visit/events-programs',            hint: null },
  { name: 'Brooklyn',                  url: 'https://www.brooklynkids.org/calendar/',                          hint: 'events-manager' },
  { name: 'Long Island',               url: 'https://www.licm.org/calendar/',                                  hint: null },
  { name: 'Marbles',                   url: 'https://marbleskidsmuseum.org/events/',                           hint: null },
  { name: 'Cleveland',                 url: 'https://cmcleveland.org/events/',                                 hint: null },
  { name: 'Providence',                url: 'https://providencechildrensmuseum.org/events/',                   hint: 'eventon' },
  { name: 'Virginia Discovery',        url: 'https://www.vadm.org/events/',                                    hint: 'squarespace' },
  { name: 'Grand Rapids',              url: 'https://www.grcm.org/events',                                     hint: null },
  { name: 'Garden State',              url: 'https://www.discoverymuseum.com/events/',                         hint: null },
  { name: 'CMOM',                      url: 'https://cmom.org/visit/calendar/',                                hint: null },
];

// -----------------------------------------------------------------------
// Strategy selector chains (mirrors scraper-venue-events-childrens-museums.js)
// -----------------------------------------------------------------------
const STRATEGIES = {
  tec: {
    container: [
      'article.tribe-events-calendar-list__event',
      'article.tribe-event',
      '.tribe-events-calendar-list__event-row',
    ],
    title: ['a.tribe-events-calendar-list__event-title-link', 'a.tribe-event-url', '.tribe-events-calendar-list__event-title a'],
    date:  ['.tribe-events-calendar-list__event-datetime', 'time[datetime]', '.tribe-events-calendar-list__event-date-tag'],
  },
  mec: {
    container: ['article.mec-event-article', '.mec-event-article'],
    title: ['.mec-event-title a', 'h4.mec-event-title'],
    date:  ['.mec-start-date-details', '.mec-event-date', '.mec-start-date-label'],
  },
  squarespace: {
    container: ['.eventlist-event', '.sqs-block-event', '.eventlist-events-list li'],
    title: ['.eventlist-title a', 'a.eventlist-title-link', '.eventlist-title', 'h2.entry-title a'],
    date:  ['.eventlist-datetag', '.eventlist-meta-date', 'time.event-date', '.event-date-banner'],
  },
  webflow: {
    container: ['.w-dyn-item', '.calendar-event', '[class*="event-item"]'],
    title: ['h5', 'h4', 'h3', '.event-title', '[class*="title"]'],
    date:  ['.meta-tag', '.event-date', '.start-date', 'time', '[class*="date"]'],
  },
  eventon: {
    container: ['.eventon_list_event', '.evcal_list_event', '.evo_event'],
    title: ['.eventon_event_title', '.evcal_desc_title', '.evcal_event_title'],
    date:  ['.evcal_desc2 .date', '.evcal_date', '.evo_date', '[class*="date"]'],
  },
  'events-manager': {
    container: ['.event-single', '.em-item', '.event'],
    title: ['.event-title a', 'h3 a', 'h2 a', '.event-title'],
    date:  ['.event-date', 'time[datetime]', '.date'],
  },
};

// -----------------------------------------------------------------------
// Probe TEC REST API
// -----------------------------------------------------------------------
async function probeTecApi(baseUrl) {
  try {
    const apiUrl = new URL('/wp-json/tribe/events/v1/events?per_page=1', baseUrl).href;
    const resp = await axios.get(apiUrl, {
      headers: { 'User-Agent': 'FunHive-Diagnostic/1.0' },
      timeout: 8000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const data = resp.data;
    if (data && Array.isArray(data.events)) {
      return { available: true, count: data.total || data.events.length, apiUrl };
    }
    return { available: false };
  } catch (e) {
    return { available: false };
  }
}

// -----------------------------------------------------------------------
// Diagnose a single site with Puppeteer
// -----------------------------------------------------------------------
async function diagnoseSite(site) {
  const result = {
    name: site.name,
    url: site.url,
    hint: site.hint || '(none)',
    httpStatus: null,
    finalUrl: null,
    strategies: {},  // strategy → count
    sample: null,    // { title, date }
    eventClasses: [],
    tecApi: null,
  };

  // Probe REST API in parallel while Puppeteer loads
  const tecApiPromise = probeTecApi(site.url);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    let httpStatus = null;
    page.on('response', r => { if (r.url() === page.url() || !httpStatus) httpStatus = r.status(); });

    try {
      const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (response) httpStatus = response.status();
    } catch (e) {
      result.httpStatus = `ERR: ${e.message.substring(0, 80)}`;
      return result;
    }

    result.httpStatus = httpStatus;
    result.finalUrl = page.url();

    // Wait for JS rendering
    await new Promise(r => setTimeout(r, 5000));

    // Try each strategy
    const diagnosticData = await page.evaluate((strategies) => {
      function first(selectors) {
        for (const s of selectors) {
          const el = document.querySelector(s);
          if (el) return el;
        }
        return null;
      }

      const results = {};

      for (const [stratName, strat] of Object.entries(strategies)) {
        let containers = [];
        for (const sel of strat.container) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) { containers = Array.from(found); break; }
        }
        results[stratName] = { count: containers.length, sample: null };

        if (containers.length > 0) {
          const c = containers[0];
          let title = '';
          for (const s of strat.title) {
            const el = c.querySelector(s);
            if (el && el.textContent.trim()) { title = el.textContent.trim().substring(0, 80); break; }
          }
          let date = '';
          for (const s of strat.date) {
            const el = c.querySelector(s);
            if (el) {
              const attr = el.getAttribute('datetime');
              date = (attr && attr.length > 4 ? attr : el.textContent.trim()).substring(0, 60);
              if (date) break;
            }
          }
          results[stratName].sample = { title, date };
        }
      }

      // JSON-LD probe
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      let ldEvents = 0;
      let ldSample = null;
      ldScripts.forEach(s => {
        try {
          let d = JSON.parse(s.textContent);
          if (!Array.isArray(d)) d = d['@graph'] ? d['@graph'] : [d];
          d.forEach(item => {
            if (item['@type'] === 'Event' && item.name) {
              ldEvents++;
              if (!ldSample) ldSample = { title: item.name.substring(0, 80), date: item.startDate || '' };
            }
          });
        } catch(e) {}
      });
      results['json-ld'] = { count: ldEvents, sample: ldSample };

      // Collect all event-related class names (for zero-match sites)
      // Use getAttribute('class') — el.className is SVGAnimatedString on SVG elements
      const allClasses = new Set();
      document.querySelectorAll('[class]').forEach(el => {
        const cls = el.getAttribute('class') || '';
        cls.split(/\s+/).forEach(c => {
          if (c && /event|calendar|program|workshop/i.test(c)) allClasses.add(c);
        });
      });

      return { strategies: results, eventClasses: Array.from(allClasses).slice(0, 40) };
    }, STRATEGIES);

    result.strategies = diagnosticData.strategies;
    result.eventClasses = diagnosticData.eventClasses;

    // Find best match
    let bestCount = 0;
    for (const [strat, data] of Object.entries(result.strategies)) {
      if (data.count > bestCount) {
        bestCount = data.count;
        result.sample = data.sample ? { strategy: strat, ...data.sample } : null;
      }
    }

  } catch (e) {
    result.error = e.message.substring(0, 120);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  result.tecApi = await tecApiPromise;
  return result;
}

// -----------------------------------------------------------------------
// Print results table
// -----------------------------------------------------------------------
function printResult(r) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Museum : ${r.name}`);
  console.log(`URL    : ${r.url}`);
  console.log(`Hint   : ${r.hint}`);
  console.log(`HTTP   : ${r.httpStatus}${r.finalUrl && r.finalUrl !== r.url ? ` → ${r.finalUrl}` : ''}`);

  if (r.error) {
    console.log(`ERROR  : ${r.error}`);
    return;
  }

  // Strategies
  const working = [];
  for (const [strat, data] of Object.entries(r.strategies || {})) {
    if (data.count > 0) working.push(`${strat}(${data.count})`);
  }
  if (working.length) {
    console.log(`MATCH  : ${working.join(', ')}`);
    if (r.sample) console.log(`Sample : "${r.sample.title}" | date: "${r.sample.date}"`);
  } else {
    console.log('MATCH  : none');
    if (r.eventClasses.length) {
      console.log(`Classes: ${r.eventClasses.slice(0, 20).join(', ')}`);
    }
  }

  // TEC REST API
  if (r.tecApi && r.tecApi.available) {
    console.log(`TEC API: YES — ${r.tecApi.count} events | ${r.tecApi.apiUrl}`);
  } else {
    console.log('TEC API: none');
  }
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const venueFilter = args.includes('--venue') ? args[args.indexOf('--venue') + 1] : null;
  const skipPuppeteer = args.includes('--skip-puppeteer');

  let sites = SITES;
  if (venueFilter) {
    sites = SITES.filter(s => s.name.toLowerCase().includes(venueFilter.toLowerCase()));
    if (!sites.length) { console.error(`No site matching "${venueFilter}"`); process.exit(1); }
  }

  console.log(`\n🔬 Museum Scraper Diagnostic — ${sites.length} sites`);
  console.log('Running sequentially (Puppeteer opens/closes per site)\n');

  const results = [];

  if (skipPuppeteer) {
    for (const site of sites) {
      const tecApi = await probeTecApi(site.url);
      console.log(`${site.name.padEnd(22)} TEC API: ${tecApi.available ? `YES (${tecApi.count})` : 'no'}`);
      results.push({ name: site.name, url: site.url, tecApi });
    }
  } else {
    for (const site of sites) {
      process.stdout.write(`  Loading ${site.name}...`);
      const r = await diagnoseSite(site);
      process.stdout.write(' done\n');
      results.push(r);
      printResult(r);
    }
  }

  // Summary table
  console.log(`\n${'═'.repeat(70)}`);
  console.log('SUMMARY');
  console.log('─'.repeat(70));
  console.log(`${'Museum'.padEnd(22)} ${'HTTP'.padEnd(5)} ${'Best match'.padEnd(25)} TEC API`);
  console.log('─'.repeat(70));
  for (const r of results) {
    let best = '—';
    let bestCount = 0;
    for (const [strat, data] of Object.entries(r.strategies || {})) {
      if (data.count > bestCount) { bestCount = data.count; best = `${strat}(${data.count})`; }
    }
    const api = r.tecApi?.available ? `YES(${r.tecApi.count})` : '';
    console.log(`${r.name.padEnd(22)} ${String(r.httpStatus || '?').padEnd(5)} ${best.padEnd(25)} ${api}`);
  }
  console.log('─'.repeat(70));
}

main().catch(e => { console.error(e); process.exit(1); });

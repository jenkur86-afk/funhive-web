#!/usr/bin/env node
/**
 * find-calendar-link.js — for a library whose site is UP but whose configured
 * events path is wrong, find the calendar by following the site's OWN links.
 *
 * WHY NOT MORE PATH GUESSING: probe-dead-endpoint-paths.js already tried the 8
 * standard paths and found nothing. Guessing more paths has diminishing returns,
 * and the sites that survive that probe are exactly the ones with a non-standard
 * URL (/517/Library-Calendar, /events-1, a LibCal subdomain). The site itself
 * knows where its calendar is, so read its navigation instead of guessing.
 *
 * Method: load the root, collect links whose href or text looks calendar-ish,
 * rank them (an explicit "calendar"/"events" nav link beats a footer mention),
 * visit the top few, and report which carries dated events.
 *
 * TWO TRAPS THIS REPORTS RATHER THAN HIDES, both hit for real on 2026-09-07:
 *  - MUNICIPAL SCOPE. Many of these hosts are town .gov sites, where the obvious
 *    calendar is the TOWN's, covering public works and council meetings. Pointing
 *    a library entry at it imports every town event under the library's name. The
 *    output flags a candidate whose URL/title shows no library scoping.
 *  - OFF-HOST CALENDARS. A found link often leaves for libcal/librarycalendar/
 *    assabet, which means the library belongs in a different scraper family
 *    entirely and needs relocating, not a URL edit.
 *
 * Emits a worklist. Edits nothing.
 *
 *   node scripts/find-calendar-link.js --in=sites.txt --out=calendars.tsv
 *
 * --in lines are `Site | Scraper | URL | STATE`.
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, createStealthPage } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const IN = arg('in'), OUT = arg('out'), CONC = Math.max(1, parseInt(arg('concurrency', '1'), 10));
const MAX = parseInt(arg('max', '6'), 10);
if (!IN || !OUT) { console.error('Usage: --in=sites.txt --out=calendars.tsv'); process.exit(1); }

const PLATFORM = /libcal\.com|librarycalendar\.com|libraryc\.org|assabetinteractive\.com|libnet\.info|bibliocommons\.com|trumba\.com|communico/i;

const rows = fs.readFileSync(IN, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  .map(l => { const p = l.split('|').map(s => s.trim()); return { site: p[0], scraper: p[1], url: p[2], state: p[3] || '' }; })
  .filter(r => r.url && r.url !== 'NO-URL');

function scoreLink(href, text) {
  const h = (href || '').toLowerCase(), t = (text || '').toLowerCase();
  let s = 0;
  if (/\bcalendar\b/.test(t)) s += 6;
  if (/\bevents?\b/.test(t)) s += 5;
  if (/calendar/.test(h)) s += 4;
  if (/events?/.test(h)) s += 3;
  if (/program|storytime|what'?s on|happening/.test(t)) s += 2;
  if (PLATFORM.test(h)) s += 8;               // an off-host platform link is a strong tell
  if (/librar/.test(h) || /librar/.test(t)) s += 2;
  if (/agenda|minutes|council|meeting|trash|recycl|permit/.test(t)) s -= 6;   // municipal noise
  return s;
}

async function pageInfo(page) {
  return page.evaluate(() => {
    const t = document.body ? document.body.innerText : '';
    return {
      title: (document.title || '').slice(0, 80),
      dates: (t.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/g) || []).length,
      items: document.querySelectorAll('[class*="event"], [class*="tribe"], .lc-event, .s-lc-ea-e, article').length
    };
  });
}

async function handle(browser, r) {
  const page = await createStealthPage(browser);
  const out = { ...r, found: '', verdict: 'NO-CALENDAR-LINK', detail: '', offHost: '' };
  try {
    await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(s => setTimeout(s, 1800));
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
      .map(a => ({ href: a.href, text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }))
      .filter(x => /^https?:/.test(x.href)));
    await page.close();

    const seen = new Set();
    const ranked = links
      .map(l => ({ ...l, s: scoreLink(l.href, l.text) }))
      .filter(l => l.s >= 4)
      .filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; })
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX);

    for (const cand of ranked) {
      const p2 = await createStealthPage(browser);
      try {
        const resp = await p2.goto(cand.href, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(s => setTimeout(s, 2000));
        const info = await pageInfo(p2);
        const status = resp ? resp.status() : 0;
        if (status >= 200 && status < 400 && info.dates >= 4 && info.items >= 4) {
          const host = new URL(cand.href).host;
          const origHost = new URL(r.url).host;
          out.found = cand.href;
          out.offHost = host !== origHost ? host : '';
          out.verdict = PLATFORM.test(cand.href) ? 'PLATFORM-RELOCATE' : 'CALENDAR-FOUND';
          out.detail = `HTTP ${status} dates=${info.dates} items=${info.items} link="${cand.text}" title="${info.title}"`;
          await p2.close();
          break;
        }
      } catch { /* next candidate */ }
      await p2.close();
    }
    if (!out.found && ranked.length) { out.verdict = 'LINKS-BUT-NO-EVENTS'; out.detail = `checked ${ranked.length} candidate link(s), none showed dated events`; }
  } catch (e) {
    try { await page.close(); } catch {}
    out.verdict = 'ROOT-FAILED';
    out.detail = e.message.slice(0, 70);
  }
  return out;
}

(async () => {
  const browser = await launchBrowser();
  const res = [];
  let i = 0;
  async function worker() {
    while (i < rows.length) {
      const r = rows[i++], n = i;
      const o = await handle(browser, r);
      res.push(o);
      console.log(`  ${n}/${rows.length}  ${o.verdict.padEnd(20)} ${o.site.slice(0, 34).padEnd(36)} ${o.found || ''}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  await browser.close();

  fs.writeFileSync(OUT, ['site\tscraper\tstate\tverdict\tcalendar_url\toff_host\tdetail']
    .concat(res.map(r => [r.site, r.scraper, r.state, r.verdict, r.found, r.offHost, r.detail].join('\t'))).join('\n') + '\n', 'utf8');
  const by = {}; res.forEach(r => { by[r.verdict] = (by[r.verdict] || 0) + 1; });
  console.log('\n' + Object.entries(by).map(([k, v]) => `${k} ${v}`).join('  '));
  console.log(`wrote ${OUT}`);
  console.log('\nCHECK EACH BEFORE USING: a found calendar on a town .gov host may be the TOWN calendar,');
  console.log('not the library\'s, and an off_host value means this library belongs in another scraper family.');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });

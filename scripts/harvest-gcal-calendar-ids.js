#!/usr/bin/env node
/**
 * harvest-gcal-calendar-ids.js — find the Google Calendar IDs behind a library's
 * embedded calendar, so the site can be moved into the GoogleCalendar-* family.
 *
 * WHY A RAW FETCH AND NOT WebFetch OR PUPPETEER
 * The `_pending` note GCAL-IFRAME-CLUSTER says "WebFetch is NOT sufficient - it
 * converts to markdown and drops iframe elements entirely" and concludes "use the
 * browser/Puppeteer stack". The first half is right; the conclusion skips a third
 * option. The iframe we need is SERVER-RENDERED HTML on every site checked so far,
 * so a plain HTTPS GET sees it — no markdown conversion, and no Chrome. That
 * matters operationally: Step 3d forbids heavy concurrent Chrome while a rotation
 * is running, and this script is safe to run at any time.
 *
 * Puppeteer is still required for a site that INJECTS the iframe with JavaScript.
 * This script says so explicitly (`no-iframe-found`) rather than reporting absence
 * as proof, per the standing rule that an unresolved site is unknown, not safe.
 *
 * WHAT IT LOOKS FOR
 *   <iframe src="https://calendar.google.com/calendar/embed?...&src=<ID>&src=<ID>">
 * The `src` params are URL-encoded, and on some embeds base64-encoded, so both are
 * decoded. A calendar id is either an e-mail-shaped address (usually ending
 * @group.calendar.google.com) or a bare `c_...` id.
 *
 * It then VERIFIES each id against the public ICS endpoint and counts VEVENTs plus
 * the newest DTSTART, because a live-looking embed can front an abandoned calendar
 * (Berkeley Sangaree: 40 VEVENTs, newest 2024-04-13). An id is only worth wiring if
 * its feed actually carries future events.
 *
 * Usage:
 *   node scripts/harvest-gcal-calendar-ids.js --in=sites.txt [--out=result.json]
 *   node scripts/harvest-gcal-calendar-ids.js --url=https://example.org/events
 *
 * --in lines are `Site | Scraper | URL[ | STATE]`, the same shape
 * build-verify-input.js emits. Lines whose URL is GUARDED or NO-URL are skipped and
 * reported as such — never fetched, per the 2026-09-03 guarded-entry rule.
 *
 * Read-only: no database access, no writes outside --out.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const args = process.argv.slice(2);
const arg = k => {
  const a = args.find(x => x.startsWith(`--${k}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};
const IN = arg('in');
const OUT = arg('out');
const ONE = arg('url');
if (!IN && !ONE) {
  console.error('Usage: --in=sites.txt [--out=result.json]   or   --url=<events page>');
  process.exit(1);
}

// Paths to try when the configured URL itself carries no calendar iframe. Ordered
// most-likely-first. cobleighlibrary.org is the reason this list exists: its /events
// links onward to /events-calendar/events-calendar/, so the configured URL is a hop
// short of the calendar.
const CANDIDATE_PATHS = [
  '', '/events', '/events/', '/calendar', '/calendar/',
  '/events-calendar/events-calendar/', '/event-calendar/', '/events-calendar/',
  '/library-calendar/', '/programs/', '/whats-happening/', '/upcoming-events/',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function get(target, redirects = 0) {
  return new Promise(resolve => {
    let u;
    try { u = new URL(target); } catch (_) { return resolve({ err: 'bad-url' }); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || undefined,
        path: u.pathname + u.search,
        method: 'GET',
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        timeout: 25000,
        // Libraries run a lot of expired and mismatched certificates. The scrapers'
        // own browser stack passes --ignore-certificate-errors for exactly this
        // reason, so refusing here would report a live site as dead.
        rejectUnauthorized: false,
      },
      res => {
        const loc = res.headers.location;
        if (loc && res.statusCode >= 300 && res.statusCode < 400 && redirects < 5) {
          res.resume();
          return resolve(get(new URL(loc, target).href, redirects + 1));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => { if (body.length < 3_000_000) body += c; });
        res.on('end', () => resolve({ status: res.statusCode, body, finalUrl: target }));
      }
    );
    req.on('timeout', () => { req.destroy(); resolve({ err: 'timeout' }); });
    req.on('error', e => resolve({ err: e.code || e.message }));
    req.end();
  });
}

const ID_RE = /^(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|c_[A-Za-z0-9]+)$/;

function decodeMaybeBase64(value) {
  // Some embeds base64 the calendar id. Decode only when the result actually looks
  // like an id — a blind decode turns ordinary ids into mojibake.
  if (ID_RE.test(value)) return value;
  try {
    const d = Buffer.from(value, 'base64').toString('utf8');
    if (ID_RE.test(d)) return d;
  } catch (_) { /* not base64 */ }
  return null;
}

function extractCalendarIds(html) {
  const ids = new Set();
  // Every calendar.google.com embed URL on the page, whether in an iframe src, a
  // data- attribute, or inline script.
  const embedRe = /https?:\/\/(?:www\.)?calendar\.google\.com\/calendar\/(?:embed|htmlembed)\?([^"'<>\s\\]+)/gi;
  let m;
  while ((m = embedRe.exec(html)) !== null) {
    const qs = m[1].replace(/&amp;/g, '&');
    const partRe = /(?:^|&)src=([^&]+)/g;
    let p;
    while ((p = partRe.exec(qs)) !== null) {
      let raw;
      try { raw = decodeURIComponent(p[1]); } catch (_) { raw = p[1]; }
      const id = decodeMaybeBase64(raw);
      if (id) ids.add(id);
    }
  }
  // Bare group-calendar addresses sometimes appear outside an embed URL (an "add to
  // your calendar" link, or an ICS href).
  const bareRe = /[A-Za-z0-9._%+-]+@group\.calendar\.google\.com/g;
  while ((m = bareRe.exec(html)) !== null) ids.add(m[0]);
  return [...ids];
}

function icsUrl(id) {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
}

async function checkFeed(id) {
  const r = await get(icsUrl(id));
  if (r.err) return { id, ok: false, why: r.err };
  if (r.status !== 200) return { id, ok: false, why: `HTTP ${r.status}` };
  const vevents = (r.body.match(/BEGIN:VEVENT/g) || []).length;
  const starts = [...r.body.matchAll(/DTSTART[^:]*:(\d{8})/g)].map(x => x[1]).sort();
  const newest = starts.length ? starts[starts.length - 1] : null;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const hasRrule = /RRULE/.test(r.body);
  return {
    id,
    ok: true,
    vevents,
    newest,
    hasRrule,
    // An embed can front an abandoned calendar. Only a feed with a future DTSTART,
    // or a recurrence rule that will keep generating them, is worth wiring.
    live: !!(newest && (newest >= today || hasRrule)),
  };
}

async function harvestSite(site, scraper, url) {
  const tried = [];
  let base;
  try { base = new URL(url); } catch (_) { return { site, scraper, url, status: 'bad-url' }; }

  for (const path of CANDIDATE_PATHS) {
    const target = path ? new URL(path, base.origin).href : base.href;
    if (tried.some(t => t.url === target)) continue;
    const r = await get(target);
    tried.push({ url: target, status: r.status || r.err });
    if (r.err || r.status !== 200 || !r.body) continue;
    const ids = extractCalendarIds(r.body);
    if (ids.length) {
      const feeds = [];
      for (const id of ids) feeds.push(await checkFeed(id));
      return { site, scraper, url, status: 'found', foundOn: target, ids, feeds, tried };
    }
  }
  return { site, scraper, url, status: 'no-iframe-found', tried };
}

(async () => {
  const jobs = [];
  if (ONE) {
    jobs.push({ site: '(ad-hoc)', scraper: '(ad-hoc)', url: ONE });
  } else {
    const seen = new Set();
    for (const line of fs.readFileSync(IN, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const parts = line.split('|').map(s => s.trim());
      const [site, scraper, url] = parts;
      if (!url) continue;
      if (url === 'GUARDED' || url === 'NO-URL') {
        console.log(`  SKIP  ${url.padEnd(14)} ${scraper} | ${site}`);
        continue;
      }
      // One fetch per distinct host: several branches of one system share a URL.
      let host;
      try { host = new URL(url).origin; } catch (_) { host = url; }
      if (seen.has(host)) {
        console.log(`  SKIP  same-host     ${scraper} | ${site}  (${host})`);
        continue;
      }
      seen.add(host);
      jobs.push({ site, scraper, url });
    }
  }

  console.log(`\nHarvesting ${jobs.length} site(s) over plain HTTPS — no Chrome, safe during a rotation.\n`);
  const results = [];
  for (const j of jobs) {
    const r = await harvestSite(j.site, j.scraper, j.url);
    results.push(r);
    if (r.status === 'found') {
      const live = r.feeds.filter(f => f.ok && f.live).length;
      console.log(`  FOUND ${r.ids.length} id(s), ${live} live   ${r.scraper} | ${r.site}`);
      console.log(`        on ${r.foundOn}`);
      for (const f of r.feeds) {
        console.log(
          f.ok
            ? `        ${f.live ? 'LIVE ' : 'STALE'} ${f.vevents} VEVENT, newest ${f.newest}, rrule=${f.hasRrule}  ${f.id}`
            : `        DEAD  ${f.why}  ${f.id}`
        );
      }
    } else {
      const last = r.tried && r.tried.length ? r.tried[r.tried.length - 1].status : '?';
      console.log(`  ${r.status.toUpperCase().padEnd(16)} ${r.scraper} | ${r.site}  (last: ${last})`);
    }
  }

  const found = results.filter(r => r.status === 'found');
  console.log(`\n${found.length} of ${results.length} site(s) exposed a Google Calendar embed.`);
  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1), 'utf8');
    console.log(`wrote ${OUT}`);
  }
})();

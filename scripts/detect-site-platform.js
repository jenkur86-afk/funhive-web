#!/usr/bin/env node
/**
 * detect-site-platform.js — what platform is a configured library site ACTUALLY running?
 *
 * WHY THIS EXISTS
 * ---------------
 * The Step 3d verification backlog is dominated by one comment: "rendered fully but shows
 * no dated events, no event containers and no explicit empty-state message — cannot
 * distinguish". 392 sites sit at UNVERIFIABLE and 228 of them read like that. Re-fetching
 * them changes nothing, because the fetch was never the problem — the page really does
 * show no events to a DOM reader.
 *
 * But "no events in the DOM" has two completely different causes, and they need opposite
 * fixes:
 *
 *   1. The library genuinely has no upcoming events.               -> nothing to do
 *   2. The library's events live on a PLATFORM this codebase       -> move the entry to
 *      already parses — LibCal, BiblioCommons, Communico, Assabet,    that family's scraper.
 *      a Google Calendar iframe, The Events Calendar's REST API —     NOT selector work.
 *      and the WordPress DOM extractor cannot see any of them.
 *
 * A 30-site sample drawn from the UNVERIFIABLE backlog on 2026-08-23 found case 2 for a
 * third of them: Henrico County VA on LibCal, Warren County KY on BiblioCommons, Danbury
 * CT on Assabet, three Georgia and North Carolina libraries on Google Calendar iframes.
 * Every one of those is configured under WordPress-{state}, where it can only ever
 * return 0. This script is how that gets found at scale instead of one site at a time.
 *
 * It also separates out the sites whose URL is simply not a library any more (parked,
 * off-host, empty), which are a seed-data problem rather than a platform one — the same
 * bucket Defect A deals with, just without a state collision to make it visible.
 *
 * HOW IT FETCHES
 * --------------
 * node:http/https, not Chrome. See resolve-collision-host-state.js for the long version:
 * Chrome in this environment refuses http:// requests locally with ERR_BLOCKED_BY_CLIENT,
 * which made 16 of 35 hosts look unreachable when every one answered Node instantly.
 * Certificates are ignored (matching the scrapers' --ignore-certificate-errors), because
 * a lapsed cert says nothing about what platform a site runs.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not edit any config file and it does not decide anything. Moving a library
 * between scraper families changes which events get ingested under which name, so the
 * output is a worklist to be confirmed per site — the same posture as
 * resolve-collision-host-state.js. In particular a platform marker in the HTML is
 * evidence that the platform is REFERENCED, not proof that it holds this library's
 * events; confirm the feed returns real dated events before relocating anything.
 *
 * Usage:
 *   node scripts/detect-site-platform.js --in=sites.json            # [{name,url,state,scraper}]
 *   node scripts/detect-site-platform.js --in=... --out=result.json
 *   node scripts/detect-site-platform.js --in=... --concurrency=4
 */

const fs = require('fs');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);
const arg = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : null; };
const IN = arg('in');
const OUT = arg('out');
const CONCURRENCY = parseInt(arg('concurrency') || '4', 10);

if (!IN) { console.error('Missing --in=<json file of [{name,url,state,scraper}]>'); process.exit(1); }

const registrable = (h) => String(h || '').replace(/^www\./, '').toLowerCase().split('.').slice(-2).join('.');

function fetchNode(url, { timeout = 12000, max = 5 } = {}) {
  return new Promise((resolve) => {
    const step = (u, left) => {
      let mod;
      try { mod = u.startsWith('https:') ? https : http; } catch { return resolve({ err: 'BAD_URL' }); }
      const req = mod.get(u, {
        timeout,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && left > 0) {
          res.resume();
          let next;
          try { next = new URL(res.headers.location, u).href; } catch { return resolve({ err: 'BAD_REDIRECT' }); }
          return step(next, left - 1);
        }
        let body = '';
        res.on('data', (c) => { if (body.length < 300000) body += c; });
        res.on('end', () => resolve({ status: res.statusCode, finalUrl: u, body }));
      });
      req.on('timeout', () => { req.destroy(); resolve({ err: 'TIMEOUT' }); });
      req.on('error', (e) => resolve({ err: String(e.code || e.message).slice(0, 30) }));
    };
    step(url, max);
  });
}

const toText = (html) => String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Ordered most-specific first. Each pattern is a host or product string that only that
 * platform emits — deliberately NOT generic words like "calendar", which appear on every
 * library site on earth and would classify all of them.
 *
 * `family` names the registry scraper family that already parses this platform, so the
 * output says where a mis-filed entry should go rather than only what it is.
 */
const PLATFORMS = [
  [/\.libcal\.com|libcal\.js|libcal-/i, 'libcal', 'LibCal-{ST}'],
  [/\.bibliocommons\.com|bibliocommons\.js/i, 'bibliocommons', 'BiblioCommons-{ST}'],
  [/\.libnet\.info|communico/i, 'communico', 'Communico-{ST}'],
  [/assabetinteractive\.com|assabet/i, 'assabet', 'Assabet-NH-MA'],
  [/libraryinsight|librarymarket|\.libraryhost\./i, 'librarymarket', 'LibraryMarket-{ST}'],
  [/calendar\.google\.com/i, 'google-calendar', 'GoogleCalendar-Libraries'],
  [/eventkeeper|evanced|signupsigns|ekp\.plymouthrocket/i, 'eventkeeper', '(none — needs new scraper)'],
  [/libraryaware\.com|wowbrary/i, 'libraryaware', '(none — newsletter tool, not a calendar)'],
  [/tribe-events|the-events-calendar|tribe_events/i, 'tribe', 'WordPress-{ST} (REST feed available)'],
  [/squarespace/i, 'squarespace', 'Squarespace-Libraries'],
  [/civicplus|civicengage/i, 'civicplus', 'CivicEngage-Libraries'],
];

const PARKED_RE = /domain is for sale|namebright|godaddy\b|sedo\b|this domain|under construction|coming soon|sedang maintenance|buy this domain/i;

async function probe(site) {
  const r = await fetchNode(site.url);
  if (r.err) return { ...site, verdict: 'UNREACHABLE', detail: r.err };
  if (r.status >= 400) return { ...site, verdict: `HTTP_${r.status}`, detail: '' };

  let finalHost = '', configHost = '';
  try { finalHost = new URL(r.finalUrl).hostname; } catch {}
  try { configHost = new URL(site.url).hostname; } catch {}
  if (finalHost && configHost && registrable(finalHost) !== registrable(configHost)) {
    return { ...site, verdict: 'OFF_HOST', detail: registrable(finalHost), finalUrl: r.finalUrl };
  }

  const text = toText(r.body);
  if (text.length < 200) return { ...site, verdict: 'EMPTY', detail: `${text.length} chars of text` };
  if (PARKED_RE.test(text.slice(0, 1500))) return { ...site, verdict: 'PARKED', detail: text.slice(0, 80) };

  const hit = PLATFORMS.find(([re]) => re.test(r.body));
  if (hit) return { ...site, verdict: 'PLATFORM', platform: hit[1], belongsIn: hit[2], detail: hit[1] };
  return { ...site, verdict: 'PLAIN_HTML', detail: `${text.length} chars, no platform marker` };
}

async function main() {
  const sites = JSON.parse(fs.readFileSync(IN, 'utf8'));
  console.log(`probing ${sites.length} sites (concurrency ${CONCURRENCY})…\n`);
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < sites.length) {
      const s = sites[i++];
      const r = await probe(s).catch((e) => ({ ...s, verdict: 'ERROR', detail: String(e.message || e).slice(0, 50) }));
      results.push(r);
      console.log(`  ${String(results.length).padStart(4)}/${sites.length}  ${r.verdict.padEnd(12)} ${String(r.detail || '').padEnd(24).slice(0, 24)} ${r.state} ${r.name}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const by = {};
  results.forEach((r) => { by[r.verdict] = (by[r.verdict] || 0) + 1; });
  console.log('\n' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('   '));

  const plat = results.filter((r) => r.verdict === 'PLATFORM');
  if (plat.length) {
    const byPlat = {};
    plat.forEach((r) => { (byPlat[r.platform] = byPlat[r.platform] || []).push(r); });
    console.log('\nPLATFORM MISMATCHES — configured under one family, actually running another.');
    console.log('Confirm the feed carries real dated events before relocating any of these:');
    for (const [p, rows] of Object.entries(byPlat).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n  ${p}  (${rows.length})  -> ${rows[0].belongsIn}`);
      rows.forEach((r) => console.log(`     ${r.state} ${r.scraper.padEnd(15)} ${r.name.padEnd(42)} ${r.url}`));
    }
  }
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); console.log(`\nwrote ${OUT}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });

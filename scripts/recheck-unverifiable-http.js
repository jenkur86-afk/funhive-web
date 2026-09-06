#!/usr/bin/env node
/**
 * recheck-unverifiable-http.js — reclassify UNVERIFIABLE sites without Chrome.
 *
 * WHY THIS EXISTS
 * The UNVERIFIABLE backlog is ~800 sites and Step 3d's default tool,
 * verify-sites-puppeteer.js, cannot be run at any volume while a rotation is in
 * flight — `reports/fix-notes.json` records concurrent heavy Chrome as the leading
 * suspect for a 37-scraper launch failure, and a rotation is in flight most of the
 * day. That gate is why ~300 of these rows have sat unexamined for weeks.
 *
 * A large share of them do not need a browser. Two whole buckets are decidable from
 * the HTTP layer alone:
 *   - "TLS / certificate failure" (50 rows) — node with rejectUnauthorized:false
 *     sees straight past a self-signed or expired cert, exactly as the scrapers'
 *     own browser does with --ignore-certificate-errors.
 *   - "connection refused / reset / timeout" (96 rows) — a clean retry distinguishes
 *     a genuinely dead host from a transient blip, and DNS failure is conclusive.
 * A third, larger bucket is partly decidable: a page that renders nothing to a DOM
 * reader often names its real platform in the HTML, and that is a RELOCATION, not
 * selector work.
 *
 * WHAT IT WILL AND WILL NOT CONCLUDE
 * It never returns MATCHES from silence. The rule established in the 2026-08-10 Lake
 * Sinclair re-check and reaffirmed in verify-sites-puppeteer.js is that a page which
 * merely renders nothing is UNVERIFIABLE, not fine — closing those as
 * working-as-intended hides real extraction bugs. So:
 *   MISMATCH      — the host is provably dead (DNS failure, or 404/410 on every
 *                   candidate path), or the HTML names a platform this codebase
 *                   already parses, which makes it a relocation.
 *   MATCHES       — only when the page SAYS it has no upcoming events, in words.
 *   UNVERIFIABLE  — everything else, with the reason recorded and sharpened.
 *
 * Guarded entries are never fetched; their URL is already proven to belong to another
 * institution, so a fetch reports on the wrong library (the 2026-09-03 defect).
 *
 * Read-only apart from --out. Output is the [site, scraper, verdict, comment] tuple
 * format merge-verification-comments.js consumes.
 *
 * Usage:
 *   node scripts/recheck-unverifiable-http.js --in=sites.txt --out=verdicts.js
 *   node scripts/recheck-unverifiable-http.js --in=sites.txt --out=v.js --concurrency=6
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const IN = arg('in');
const OUT = arg('out');
const CONCURRENCY = Math.max(1, Math.min(12, Number(arg('concurrency') || 6)));
if (!IN) { console.error('Usage: --in=sites.txt [--out=verdicts.js] [--concurrency=6]'); process.exit(1); }

// No Chrome here, so concurrency is cheap — but stay polite to small library hosts.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PATHS = ['', '/events', '/events/', '/calendar', '/calendar/', '/events-calendar/', '/programs/'];

function get(target, redirects = 0) {
  return new Promise(resolve => {
    let u;
    try { u = new URL(target); } catch (_) { return resolve({ err: 'bad-url' }); }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request({
      hostname: u.hostname, port: u.port || undefined, path: (u.pathname || '/') + (u.search || ''),
      method: 'GET', headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, timeout: 20000,
      rejectUnauthorized: false,
    }, res => {
      const loc = res.headers.location;
      if (loc && res.statusCode >= 300 && res.statusCode < 400 && redirects < 5) {
        res.resume();
        let next;
        try { next = new URL(loc, target).href; } catch (_) { return resolve({ err: 'bad-redirect' }); }
        return resolve(get(next, redirects + 1));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { if (body.length < 1_500_000) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, finalUrl: target, redirected: redirects > 0 }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ err: 'ETIMEDOUT' }); });
    req.on('error', e => resolve({ err: e.code || e.message }));
    req.end();
  });
}

// Platforms this codebase already parses. A marker means RELOCATE, never selector work.
// Order matters: the most specific host wins, because a library page often links its
// catalogue as well as its calendar and the catalogue is the red herring that
// mislabelled Wilkinsburg and Princeton on 2026-08-27.
const PLATFORMS = [
  ['librarycalendar', /\blc-event\b|librarycalendar\.com/i, 'LibraryCalendar-Libraries'],
  ['libcal', /[a-z0-9-]+\.libcal\.com|\bs-lc-[a-z]/i, 'LibCal-*'],
  ['libnet / LibraryMarket', /[a-z0-9-]+\.libnet\.info|librarymarket\.com/i, 'LibraryMarket-*'],
  ['bibliocommons', /[a-z0-9-]+\.bibliocommons\.com/i, 'BiblioCommons-*'],
  ['communico', /communico|\.libnet\.info\/events/i, 'Communico-*'],
  ['google-calendar', /calendar\.google\.com\/calendar\/(embed|htmlembed)/i, 'GoogleCalendar-*'],
  ['assabet', /assabetinteractive\.com|\/calendar\/\d{4}-[a-z]+/i, 'Assabet-NH-MA'],
  ['the-events-calendar', /tribe_events|wp-json\/tribe\/events/i, 'WordPress TEC REST path'],
  ['whofi', /[a-z0-9-]+\.whofi\.com/i, 'no WhoFi extractor exists yet'],
];

// Wording that genuinely states there is nothing on. Silence is NOT one of these.
const EMPTY_STATE = /\b(no upcoming events|no events (are )?(scheduled|found|listed)|there are no events|no events at this time|nothing scheduled)\b/i;

async function probe(site, scraper, url) {
  let base;
  try { base = new URL(url); } catch (_) { return ['UNVERIFIABLE', 'configured URL is not parseable as a URL']; }

  const attempts = [];
  let best = null;
  for (const p of PATHS) {
    let target;
    try { target = p ? new URL(p, base.origin).href : base.href; } catch (_) { continue; }
    if (attempts.some(a => a.url === target)) continue;
    const r = await get(target);
    attempts.push({ url: target, status: r.status || r.err });
    if (r.err) continue;
    if (r.status === 200 && r.body) { best = { ...r, target }; break; }
    if (!best && r.status) best = { ...r, target };
  }

  // DNS failure on every attempt is conclusive: the host does not exist.
  const codes = attempts.map(a => String(a.status));
  if (codes.length && codes.every(c => c === 'ENOTFOUND' || c === 'EAI_AGAIN')) {
    return ['MISMATCH', `dead-domain: DNS does not resolve for ${base.hostname} on any of ${attempts.length} candidate paths (${codes[0]})`];
  }
  if (!best) {
    const uniq = [...new Set(codes)].join(', ');
    return ['UNVERIFIABLE', `host unreachable over plain HTTPS on ${attempts.length} candidate paths: ${uniq}. Needs the stealth browser to distinguish a block from an outage`];
  }
  if (best.status !== 200) {
    if (best.status === 403) return ['UNVERIFIABLE', `bot-block: HTTP 403 to a plain request on every candidate path. The stealth browser may still see past this`];
    if (best.status === 404 || best.status === 410) {
      return ['MISMATCH', `dead-endpoint: HTTP ${best.status} on all ${attempts.length} candidate paths including the site root - the configured URL is wrong, not the extraction`];
    }
    return ['UNVERIFIABLE', `HTTP ${best.status} on every candidate path; not conclusive either way`];
  }

  const html = best.body;
  for (const [name, re, family] of PLATFORMS) {
    if (re.test(html)) {
      return ['MISMATCH', `platform-mismatch: page serves ${name} markup, so this belongs in ${family}, not a WordPress DOM extractor. Detected over plain HTTPS at ${best.target}. CONFIRM THE FEED CARRIES REAL DATED EVENTS BEFORE RELOCATING - a platform marker proves the platform is REFERENCED, not that it holds this library events`];
    }
  }
  if (EMPTY_STATE.test(html)) {
    const m = html.match(EMPTY_STATE);
    return ['MATCHES', `live page states it has no upcoming events ("${m[0]}") - the zero is the real state of the site`];
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 200) {
    return ['UNVERIFIABLE', `page returns HTTP 200 but only ${text.length} characters of text - a JS-gated shell. Needs the stealth browser, which executes JavaScript`];
  }
  return ['UNVERIFIABLE', `reachable over plain HTTPS (HTTP 200, ${text.length} chars) with no platform marker and no empty-state wording. Silence is not evidence of an empty calendar - needs the stealth browser`];
}

(async () => {
  const jobs = [];
  for (const line of fs.readFileSync(IN, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [site, scraper, url] = line.split('|').map(s => s.trim());
    if (!site || !scraper) continue;
    if (url === 'GUARDED') {
      jobs.push({ site, scraper, url, pre: ['UNVERIFIABLE', 'GUARDED entry - the configured URL is already proven to belong to another institution, so this is a KNOWN COVERAGE GAP awaiting a correct URL, not an unverified site. Not fetched'] });
      continue;
    }
    if (!url || url === 'NO-URL') {
      jobs.push({ site, scraper, url, pre: ['UNVERIFIABLE', 'no URL could be resolved from the scraper config for this site'] });
      continue;
    }
    jobs.push({ site, scraper, url });
  }

  console.log(`\nRe-checking ${jobs.length} site(s) over plain HTTPS at concurrency ${CONCURRENCY} — no Chrome, safe during a rotation.\n`);
  const out = [];
  const tally = { MATCHES: 0, MISMATCH: 0, UNVERIFIABLE: 0 };
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const j = jobs[cursor++];
      const [verdict, comment] = j.pre || await probe(j.site, j.scraper, j.url);
      tally[verdict]++;
      out.push([j.site, j.scraper, verdict, comment]);
      done++;
      console.log(`  ${String(done).padStart(4)}/${jobs.length}  ${verdict.padEnd(13)} ${j.scraper} | ${j.site}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nMATCHES ${tally.MATCHES}  MISMATCH ${tally.MISMATCH}  UNVERIFIABLE ${tally.UNVERIFIABLE}`);
  if (OUT) {
    fs.writeFileSync(OUT, out.map(r => JSON.stringify(r)).join(',\n') + ',\n', 'utf8');
    console.log(`wrote ${OUT}`);
  }
})();

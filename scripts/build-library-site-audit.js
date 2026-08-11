#!/usr/bin/env node
/**
 * Builds the per-library-website event counts for LIBRARY-SITE-AUDIT.md
 * (Step 3b of the funhive-scraper-diagnosis task).
 *
 * The counts are only in stdout, not the database — FOUND measures what a page
 * displayed at scrape time, which is deliberately different from what survived
 * dedup/filtering/expiry. Never quote these as live coverage.
 *
 * Streams scrapers/logs/scraper-stdout.log (~35 MB — never read whole) and keeps
 * only the slice at/after --since. Recognised per-site log shapes:
 *
 *   LibCal / Communico / BiblioCommons / WordPress-{state}:
 *       📍 {library name} ({county} County, {ST})      then   Found {N} events
 *   LibraryMarket:
 *       📚 Scraping {library name}...                  then   ✅ Found {N} events
 *
 * A scraper whose output matches neither shape gets no per-site rows; the caller
 * falls back to that scraper's aggregate FOUND from the summary table and says so.
 *
 * Usage:
 *   node scripts/build-library-site-audit.js --since=2026-08-10T07:00:01Z
 *   node scripts/build-library-site-audit.js --since=... --out=path.md
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since='));
const outArg = args.find(a => a.startsWith('--out='));
if (!sinceArg) {
  console.error('Missing --since=<ISO timestamp>');
  process.exit(1);
}
const SINCE = new Date(sinceArg.split('=')[1]).getTime();
const OUT = outArg ? outArg.split('=')[1] : null;

const LOG = path.join(__dirname, '..', 'scrapers', 'logs', 'scraper-stdout.log');

const TS = /^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/;
const START = /🚀 Starting ([A-Za-z0-9_-]+)\.\.\./;
const SITE_PIN = /^\s*📍\s+(.+?)\s*$/;
const SITE_SCRAPING = /^\s*📚\s+Scraping\s+(.+?)\.\.\.\s*$/;
const FOUND = /Found\s+(\d+)\s+events/;

async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(LOG, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  let inWindow = false;
  let currentScraper = null;
  let pendingSite = null;
  const rows = [];

  for await (const line of rl) {
    const m = TS.exec(line);
    if (m) {
      const t = new Date(m[1]).getTime();
      if (!isNaN(t)) inWindow = t >= SINCE;
    }
    if (!inWindow) continue;

    const s = START.exec(line);
    if (s) { currentScraper = s[1]; pendingSite = null; continue; }

    const pin = SITE_PIN.exec(line);
    if (pin && !/Using |Created activity|Library branch detected/.test(pin[1])) {
      pendingSite = pin[1].trim();
      continue;
    }
    const scr = SITE_SCRAPING.exec(line);
    if (scr) { pendingSite = scr[1].trim(); continue; }

    const f = FOUND.exec(line);
    if (f && pendingSite && currentScraper) {
      rows.push({ scraper: currentScraper, site: pendingSite, count: parseInt(f[1], 10) });
      pendingSite = null;
    }
  }

  // Split "Name (County County, ST)" into name + state where present.
  const parsed = rows.map(r => {
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(r.site);
    let name = r.site, state = '';
    if (m) {
      name = m[1].trim();
      const st = /\b([A-Z]{2})\s*$/.exec(m[2]);
      if (st) state = st[1];
    }
    return { ...r, name, state };
  });

  // Dedup identical (scraper, name) pairs, keeping the highest count.
  const best = new Map();
  for (const r of parsed) {
    const k = `${r.scraper}|||${r.name}`;
    if (!best.has(k) || best.get(k).count < r.count) best.set(k, r);
  }
  const list = [...best.values()].sort(
    (a, b) => a.scraper.localeCompare(b.scraper) || a.name.localeCompare(b.name)
  );

  const scrapers = new Set(list.map(r => r.scraper));
  const zero = list.filter(r => r.count === 0);

  const out = [];
  out.push(`| Library Website | State | Scraper | Events Found |`);
  out.push(`|---|---|---|---|`);
  for (const r of list) {
    out.push(`| ${r.name.replace(/\|/g, '/')} | ${r.state || '—'} | ${r.scraper} | ${r.count} |`);
  }

  const body = out.join('\n');
  console.log(`per-site rows: ${list.length}   scrapers with per-site output: ${scrapers.size}   zero-event sites: ${zero.length}`);
  console.log(`scrapers: ${[...scrapers].sort().join(', ')}`);

  if (OUT) { fs.writeFileSync(OUT, body, 'utf8'); console.log(`wrote ${OUT}`); }
  else console.log('\n' + body.split('\n').slice(0, 20).join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });

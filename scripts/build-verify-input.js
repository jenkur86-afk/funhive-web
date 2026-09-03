#!/usr/bin/env node
/**
 * build-verify-input.js — turn a Step 3d worklist into the `sites.txt` that
 * verify-sites-puppeteer.js consumes.
 *
 * The worklist names sites; the verifier needs URLs. The URL for a site lives in its
 * scraper's own config array, which is the same place generate-site-report.js resolves
 * the report's Link column from — so the two agree by construction.
 *
 * A site whose URL cannot be resolved is emitted with the literal `NO-URL`, which the
 * verifier records as UNVERIFIABLE without a fetch. It is NOT dropped: a site missing
 * from the worklist is indistinguishable from a site that verified clean, which is the
 * failure the completeness rule exists to prevent.
 *
 * Usage:
 *   node scripts/build-verify-input.js --in=todo.json --out=sites.txt
 *
 * --in is [{site, scraper, state}, ...]; --out is `Site | Scraper | URL | STATE` lines.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const IN = arg('in');
const OUT = arg('out');
if (!IN || !OUT) { console.error('Usage: --in=todo.json --out=sites.txt'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
const all = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };

// Audit rows name sites "Belmont Branch Library (Belmont, NC)"; config says "Belmont Branch Library".
const cfgKey = name => String(name).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// scraper key -> Map(cfgKey(name) -> url), parsed from that scraper's file.
const perScraper = new Map();
const fileCache = new Map();

function entriesFor(file) {
  const abs = path.join(ROOT, 'scrapers', String(file).replace(/^\.\//, ''));
  if (fileCache.has(abs)) return fileCache.get(abs);
  let out = [];
  if (fs.existsSync(abs)) {
    // Strip comments first — several scrapers carry an AUTO-GENERATED header listing
    // libraries that are NOT in the live config, and counting those corrupts the result.
    const src = fs.readFileSync(abs, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // Scan forward from each `name:` for the nearest url-ish key, rather than matching a
    // balanced {...} block. A brace-balanced regex cannot span a nested object, and
    // several configs nest one — scraper-venue-events-science-arts.js writes
    // `{ name: "EcoTarium", eventsUrl: "...", extraction: { platform: 'tec' } }`, whose
    // only balanced match is the INNER extraction object, so every entry in that file
    // resolved to NO-URL and 5 sites were sent to the verifier with nothing to fetch.
    const nameRe = /["']?name["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
    const urlRe = /["']?(?:eventsUrl|calendarUrl|url)["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/;
    // Far enough to clear an entry's own fields, short enough not to steal the NEXT
    // entry's URL when this one genuinely has none.
    const WINDOW = 400;
    let nm;
    while ((nm = nameRe.exec(src))) {
      const name = nm[1] !== undefined ? nm[1] : nm[2];
      const after = src.slice(nm.index + nm[0].length, nm.index + nm[0].length + WINDOW);
      // Stop at the next `name:` so a URL-less entry cannot borrow its neighbour's.
      const nextName = after.search(/["']?name["']?\s*:/);
      const window = nextName >= 0 ? after.slice(0, nextName) : after;
      const uu = urlRe.exec(window);
      if (!uu) continue;
      // An entry carrying urlCollision has a URL we have already PROVEN points at a
      // different institution, and the scraper skips it at run time. Recording that
      // here is what stops the verifier fetching it — see the GUARDED note below.
      const guarded = /["']?urlCollision["']?\s*:/.test(window);
      out.push([name, uu[1] !== undefined ? uu[1] : uu[2], guarded]);
    }
  }
  fileCache.set(abs, out);
  return out;
}

function urlFor(scraper, site) {
  // A multi-site scraper_name is "<registryKey>-<slug>"; the config lives under the key.
  let key = scraper;
  if (!all[key]) {
    const cand = Object.keys(all).filter(k => scraper.startsWith(k + '-'))
      .sort((a, b) => b.length - a.length)[0];
    if (cand) key = cand;
  }
  const sc = all[key];
  if (!sc || !sc.file) return null;

  if (!perScraper.has(key)) {
    perScraper.set(key, new Map(entriesFor(sc.file).map(([n, u, g]) => [cfgKey(n), { url: u, guarded: g }])));
  }
  const idx = perScraper.get(key);
  const want = cfgKey(site);
  if (idx.has(want)) return idx.get(want);

  // Substring fallback: audit rows sometimes shorten or lengthen the config name.
  for (const [n, rec] of idx) {
    if (n && want && (n.includes(want) || want.includes(n))) return rec;
  }
  return null;
}

const todo = JSON.parse(fs.readFileSync(IN, 'utf8'));
const lines = [];
let resolved = 0, unresolved = 0, guarded = 0;
for (const t of todo) {
  const rec = urlFor(t.scraper, t.site);
  const st = (t.state && t.state !== '—') ? t.state : '';

  // GUARDED, not fetched. A urlCollision entry still emits "Found 0 events" by design
  // (the guard prints it so the library keeps an audit row), so it lands in the
  // zero-event population every cycle — and its configured URL is the one we already
  // PROVED belongs to another institution. Fetching it re-reads the wrong library and
  // produces advice about the wrong library.
  //
  // That is not hypothetical. On 2026-09-03 this sent "Brewster Ladies Library Assoc."
  // (WordPress-MA, Cape Cod) to brewsterlibrary.libcal.com — Brewster Public Library in
  // NEW YORK — and the verifier duly reported platform=libcal, "belongs in a LibCal-*
  // scraper". Acting on that would have re-created the exact wrong-state bug guarded on
  // 2026-08-27, and would have imported a New York library's events into Massachusetts.
  //
  // These sites are a KNOWN COVERAGE GAP, not an unknown one, so they are recorded
  // without a fetch rather than dropped — dropping them is the failure the completeness
  // rule exists to prevent.
  if (rec && rec.guarded) { guarded++; lines.push([t.site, t.scraper, 'GUARDED', st].filter((v, i) => i < 3 || v).join(' | ')); continue; }

  const u = rec && rec.url;
  if (u) resolved++; else unresolved++;
  lines.push([t.site, t.scraper, u || 'NO-URL', st].filter((v, i) => i < 3 || v).join(' | '));
}
fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
console.log(`${todo.length} sites -> ${OUT}   resolved ${resolved} | GUARDED ${guarded} | NO-URL ${unresolved}`);

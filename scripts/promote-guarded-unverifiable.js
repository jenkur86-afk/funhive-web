#!/usr/bin/env node
/**
 * promote-guarded-unverifiable.js — reclassify UNVERIFIABLE rows that are not
 * actually unknown.
 *
 * WHY THIS EXISTS
 * ---------------
 * Gate 4 counts UNVERIFIABLE rows as "unknown sites". A GUARDED entry is not
 * unknown: its configured URL has already been PROVEN to point at another
 * institution, which is why `urlCollision` was set and why the scraper skips it
 * at run time. Those rows are known-broken coverage gaps and belong in the
 * MISMATCH population, where the fix queue can act on them, not in the unknown
 * pile where they inflate gate 4 and hide how much of it is genuinely unread.
 *
 * THE CONTROL: the stored comment is NOT trusted. A row is promoted only when
 * this script finds a live `urlCollision` key on that site's own config entry,
 * parsed from the scraper file. Comment text is a claim; the config is the fact.
 * Rows whose guard cannot be confirmed are left UNVERIFIABLE and reported, per
 * the standing rule that an unresolved site is unknown rather than safe.
 *
 * Output is the standard [site, scraper, verdict, comment] tuple file that
 * merge-verification-comments.js consumes — this script never writes the store
 * itself, because hand-editing that JSON is how its format drifted before.
 *
 * Usage:
 *   node scripts/promote-guarded-unverifiable.js --out=verdicts-guarded.js
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const OUT = arg('out');
if (!OUT) { console.error('Usage: --out=verdicts-guarded.js'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
const all = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };
const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'verification-comments.json'), 'utf8'));

const cfgKey = name => String(name).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const fileCache = new Map();
function entriesFor(file) {
  const abs = path.join(ROOT, 'scrapers', String(file).replace(/^\.\//, ''));
  if (fileCache.has(abs)) return fileCache.get(abs);
  const out = [];
  if (fs.existsSync(abs)) {
    const src = fs.readFileSync(abs, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const nameRe = /["']?name["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
    const WINDOW = 400;
    let nm;
    while ((nm = nameRe.exec(src))) {
      const name = nm[1] !== undefined ? nm[1] : nm[2];
      const after = src.slice(nm.index + nm[0].length, nm.index + nm[0].length + WINDOW);
      const nextName = after.search(/["']?name["']?\s*:/);
      const window = nextName >= 0 ? after.slice(0, nextName) : after;
      const m = /["']?urlCollision["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/.exec(window);
      out.push([cfgKey(name), m ? (m[1] !== undefined ? m[1] : m[2]) : null]);
    }
  }
  fileCache.set(abs, out);
  return out;
}

const perScraper = new Map();
function guardReasonFor(scraper, site) {
  let key = scraper;
  if (!all[key]) {
    const cand = Object.keys(all).filter(k => scraper.startsWith(k + '-')).sort((a, b) => b.length - a.length)[0];
    if (cand) key = cand;
  }
  const sc = all[key];
  if (!sc || !sc.file) return undefined;
  if (!perScraper.has(key)) perScraper.set(key, new Map(entriesFor(sc.file)));
  const map = perScraper.get(key);
  const k = cfgKey(site);
  return map.has(k) ? map.get(k) : undefined;   // undefined = site not found in config
}

const promoted = [];
const unconfirmed = [];
let claimed = 0;

// Driven by the CONFIG, not by the comment. An earlier pass keyed off comment
// text ("GUARDED entry …") and so missed 42 rows that carry a real urlCollision
// but were commented differently — the guard is a fact about the config, and
// reading it from the config finds every instance regardless of how the row was
// described when it was last touched.
for (const [key, e] of Object.entries(store)) {
  if (e.verdict !== 'UNVERIFIABLE') continue;
  claimed++;
  const [scraper, site] = key.split('|||');
  const reason = guardReasonFor(scraper, site);

  if (typeof reason === 'string' && reason.length) {
    promoted.push([site, scraper, 'MISMATCH',
      `known-broken, GUARD CONFIRMED IN CONFIG 2026-09-06: the entry carries urlCollision "${reason.replace(/\s+/g, ' ').slice(0, 200)}", so the scraper skips it at run time and its configured URL is proven to serve another institution. Reclassified UNVERIFIABLE -> MISMATCH because a guarded entry is KNOWN-broken, not unknown: it is a real, itemised coverage gap awaiting a correct URL. No config was touched and no new evidence was gathered — this corrects a verdict, and the guard was confirmed against the live config rather than taken from the previous comment.`]);
  } else {
    unconfirmed.push([key, reason === undefined ? 'site not found in config' : 'no urlCollision on entry']);
  }
}

fs.writeFileSync(OUT, promoted.map(t => JSON.stringify(t) + ',').join('\n') + '\n', 'utf8');

console.log(`rows examined        : ${claimed}`);
console.log(`guard CONFIRMED       : ${promoted.length}  -> promoted to MISMATCH`);
console.log(`guard NOT confirmed   : ${unconfirmed.length}  -> left UNVERIFIABLE`);
for (const [k, why] of unconfirmed.slice(0, 20)) console.log(`   ${why.padEnd(26)} ${k}`);
if (unconfirmed.length > 20) console.log(`   … ${unconfirmed.length - 20} more`);
console.log(`\nwrote ${OUT}`);

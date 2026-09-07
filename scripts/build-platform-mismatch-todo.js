#!/usr/bin/env node
/**
 * build-platform-mismatch-todo.js — emit the worklist of OPEN platform-mismatch
 * sites, for discover-platform-host.js.
 *
 * WHY THIS IS REGENERATED RATHER THAN SAVED: the population is derived from
 * reports/verification-comments.json, which changes every diagnosis run as
 * verdicts are added, corrected or marked contained. A snapshot committed once
 * would silently describe yesterday's backlog — and yesterday's backlog already
 * contained 17 rows that turned out to be false positives. Rebuilding at run
 * time means the job always works the current list.
 *
 * Selection: verdict MISMATCH, no `status` (so guarded/contained/fixed rows are
 * excluded — those are not open work), and a comment naming a platform the
 * WordPress-style DOM scrapers structurally cannot read.
 *
 * Output is [{site, scraper, state}], the --in shape build-verify-input.js wants.
 *
 *   node scripts/build-platform-mismatch-todo.js --out=todo.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const OUT = arg('out');
if (!OUT) { console.error('Usage: --out=todo.json'); process.exit(1); }

const STORE = path.join(__dirname, '..', 'reports', 'verification-comments.json');
const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));

const PLATFORM_RE = /platform|libcal|bibliocommons|google-calendar|libnet|communico|assabet|fullcalendar|librarycalendar|trumba/i;

const out = [];
for (const [key, e] of Object.entries(store)) {
  if (e.verdict !== 'MISMATCH') continue;
  if (e.status) continue;                       // contained / fixed = not open work
  if (!PLATFORM_RE.test(String(e.comment || ''))) continue;

  const i = key.indexOf('|||');
  const scraper = key.slice(0, i);
  const site = key.slice(i + 3);

  // State from the site's own "(City, ST)" suffix first, then the scraper's
  // trailing state token. Never guessed from anything else.
  let state = '';
  const m = /,\s*([A-Z]{2})\)\s*$/.exec(site);
  if (m) state = m[1];
  if (!state) { const s = /-([A-Z]{2})$/.exec(scraper); if (s) state = s[1]; }

  out.push({ site, scraper, state });
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log(`open platform-mismatch sites: ${out.length} -> ${OUT}`);
const byScraper = {};
out.forEach(r => { byScraper[r.scraper] = (byScraper[r.scraper] || 0) + 1; });
Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([s, n]) => console.log(`  ${String(n).padStart(4)}  ${s}`));

#!/usr/bin/env node
/**
 * find-duplicate-library-coverage.js — find libraries configured in TWO scrapers
 * where one copy works and the other returns nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * Found 2026-09-06 while working one open bug: Clarksville-Montgomery County
 * Public Library was in BOTH WordPress-TN (mcgtn.org/library/events, a dead
 * endpoint, "Found 0 events" every run) and LibCal-TN (mcgtn.libcal.com, "Found
 * 48 events"). The zero copy had been sitting in the fix queue as an
 * extraction-failure for weeks. It was never an extraction bug — the library was
 * already covered, by a different scraper, on a different platform.
 *
 * This class is invisible to per-scraper diagnosis because each scraper looks
 * individually plausible: one honestly reports 0, the other honestly reports
 * events, and nothing joins them. It is only visible by grouping across scrapers
 * on the library NAME.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not conclude "covered elsewhere" on its own. Library names are mostly
 * geography and a name match is a hint, never proof — that is the Worcester rule
 * and the reason scripts/verify-coverage.js exists. This produces a WORKLIST of
 * candidate pairs to check by hand; the working copy's own logged event titles
 * are printed so the two can be compared before anything is removed. Same-state
 * pairs are reported separately from cross-state ones, because a cross-state
 * name match is far more likely to be two genuinely different libraries.
 *
 * Reads LIBRARY-SITE-AUDIT.md only. No database, no network.
 *
 *   node scripts/find-duplicate-library-coverage.js
 *   node scripts/find-duplicate-library-coverage.js --all   (include cross-state)
 */

const fs = require('fs');
const path = require('path');

const MD = path.join(__dirname, '..', 'LIBRARY-SITE-AUDIT.md');
const SHOW_ALL = process.argv.includes('--all');
const src = fs.readFileSync(MD, 'utf8');

// Only the most recent dated section: older sections describe older config.
const sections = [...src.matchAll(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/gm)];
if (!sections.length) { console.error('no dated sections'); process.exit(1); }
const last = sections[sections.length - 1];
const body = src.slice(last.index);
console.log(`Reading section ## ${last[1]}\n`);

const rows = [];
for (const line of body.split('\n')) {
  if (!line.trim().startsWith('|')) continue;
  const c = line.split('|').slice(1, -1).map(s => s.trim());
  if (c.length < 4) continue;
  if (/^library website$/i.test(c[0]) || /^-+$/.test(c[0])) continue;
  const n = parseInt(String(c[3]).replace(/,/g, ''), 10);
  if (Number.isNaN(n)) continue;
  if (/scraper aggregate/i.test(c[0])) continue;   // not a single site
  rows.push({ site: c[0], state: c[1], scraper: c[2], count: n });
}

// Normalise a library name to something comparable: drop the "(City, ST)" suffix
// and the words every library shares, so "Foo County Public Library" and "Foo
// County Library" collide but "Foo" and "Bar" do not.
const norm = s => String(s)
  .replace(/\s*\([^)]*\)\s*$/, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(public|free|memorial|regional|system|district|the|of)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const groups = new Map();
for (const r of rows) {
  const k = norm(r.site);
  if (!k || k.length < 6) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const sameState = [];
const crossState = [];
for (const [k, g] of groups) {
  const scrapers = new Set(g.map(x => x.scraper));
  if (scrapers.size < 2) continue;
  const working = g.filter(x => x.count > 0);
  const zero = g.filter(x => x.count === 0);
  if (!working.length || !zero.length) continue;
  // Only pairs where the ZERO copy is a different scraper from a WORKING one.
  const pairs = [];
  for (const z of zero) for (const w of working) if (z.scraper !== w.scraper) pairs.push([z, w]);
  if (!pairs.length) continue;
  const states = new Set(g.map(x => x.state).filter(s => s && s !== '—'));
  (states.size <= 1 ? sameState : crossState).push({ k, pairs });
}

function render(list, title) {
  console.log(`\n=== ${title}: ${list.length} ===`);
  for (const { pairs } of list) {
    const [z, w] = pairs[0];
    console.log(`\n  ${z.site}`);
    console.log(`     ZERO    ${z.scraper.padEnd(28)} ${z.state}`);
    console.log(`     WORKING ${w.scraper.padEnd(28)} ${w.state}  ${w.count} events`);
  }
}

render(sameState, 'SAME-STATE candidates — most likely genuine duplicates');
if (SHOW_ALL) render(crossState, 'CROSS-STATE name matches — usually DIFFERENT libraries, verify hard');
else console.log(`\n(${crossState.length} cross-state name matches suppressed; --all to see them)`);

console.log(`
NEXT STEP FOR EACH SAME-STATE CANDIDATE — do not remove anything on this output alone:
  1. Confirm both entries name the SAME institution (compare the two configured
     hosts and the working copy's logged event titles, not the names).
  2. Confirm the working copy really produced database rows, not just a FOUND count.
  3. Only then remove the zero copy, with the evidence in the removal comment, and
     mark the verdict fixed via mark-contained-mismatches.js --mark-fixed.`);

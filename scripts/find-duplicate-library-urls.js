#!/usr/bin/env node
/**
 * Find library config entries that share a URL across different libraries.
 *
 *   node scripts/find-duplicate-library-urls.js
 *
 * Read-only. No network, no database — pure static analysis of the scraper
 * config arrays, so it's safe and instant to run.
 *
 * Why this exists: most WordPress-{state} library entries had their domain
 * auto-generated from the town name as `https://www.{city}library.org` and were
 * never verified (see SCRAPER-FIX-LOG.jsonl, 2026-07-07). Town names repeat
 * across states, so that generator silently produced COLLISIONS — Pelham MA and
 * Pelham GA both got pelhamlibrary.org, which in reality belongs to Pelham NY.
 * Every colliding group is guaranteed to contain at least one wrong entry: one
 * domain cannot be the real website of two different libraries in two states.
 *
 * That makes this a static, zero-cost detector for a bug class that otherwise
 * only surfaces when a live audit happens to fetch both sites on the same day.
 * A collision is proof of a bug; a non-colliding URL still isn't proof of
 * correctness (it can point at an unrelated org, a parked domain, or another
 * state's library) — that needs the live verification pass in the daily
 * diagnosis, Step 3d.
 */

const fs = require('fs');
const path = require('path');

const SCRAPER_DIR = path.join(__dirname, '..', 'scrapers');

// Only collisions touching an ACTIVE scraper state can actually corrupt live
// data — entries for inactive regions never run (see region-config.json and
// isScraperActive() in scraper-registry.js). Pass --all to see everything.
const ACTIVE_ONLY = !process.argv.includes('--all');
let ACTIVE_STATES = new Set();
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(SCRAPER_DIR, 'region-config.json'), 'utf8'));
  for (const [, region] of Object.entries(cfg.regions || {})) {
    if (region.active) (region.states || []).forEach(s => ACTIVE_STATES.add(String(s).toUpperCase()));
  }
} catch (e) {
  console.error(`  ! could not read region-config.json (${e.message}); showing all states`);
}
const isActive = (st) => ACTIVE_STATES.size === 0 || ACTIVE_STATES.has(String(st).toUpperCase());

// Pull { name, url, eventsUrl, city, state } object literals out of a config file.
// Deliberately regex-based rather than require()-ing the scraper: these files
// launch Puppeteer and hit the network at import time.
function extractEntries(file) {
  const src = fs.readFileSync(file, 'utf8');
  const entries = [];
  const re = /\{\s*name:\s*'([^']*)'[^}]*?url:\s*'([^']*)'[^}]*?\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const block = m[0];
    const get = (key) => {
      const mm = block.match(new RegExp(key + ":\\s*'([^']*)'"));
      return mm ? mm[1] : null;
    };
    entries.push({
      name: m[1],
      url: get('url'),
      eventsUrl: get('eventsUrl'),
      city: get('city'),
      state: get('state'),
      file: path.basename(file),
    });
  }
  return entries;
}

// Compare on hostname only: www vs apex and /events vs /calendar are not what
// we're hunting. Two libraries sharing a HOST is the real signal.
function hostOf(u) {
  if (!u) return null;
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return null;
  }
}

const files = fs.readdirSync(SCRAPER_DIR)
  .filter(f => /^scraper-wordpress-libraries-[a-z]{2}\.js$/.test(f))
  .map(f => path.join(SCRAPER_DIR, f));

const all = [];
for (const f of files) {
  try {
    all.push(...extractEntries(f));
  } catch (e) {
    console.error(`  ! could not parse ${path.basename(f)}: ${e.message}`);
  }
}

const byHost = new Map();
for (const e of all) {
  const h = hostOf(e.url) || hostOf(e.eventsUrl);
  if (!h) continue;
  if (!byHost.has(h)) byHost.set(h, []);
  byHost.get(h).push(e);
}

// A collision that's just the same library listed twice in one state's file is
// a duplicate row, not a cross-wiring. Report those separately — different
// severity, different fix.
const crossState = [];
const sameState = [];
for (const [host, group] of byHost) {
  if (group.length < 2) continue;
  const states = new Set(group.map(g => g.state));
  if (states.size <= 1) { sameState.push({ host, group, states: [...states] }); continue; }
  // A cross-state collision only matters here if at least two ACTIVE states are
  // involved, or an active state collides with an inactive one — either way the
  // active entry's URL is suspect. Groups entirely inside inactive regions never
  // run and are noise for triage purposes.
  const activeStates = [...states].filter(isActive);
  if (ACTIVE_ONLY && activeStates.length === 0) continue;
  crossState.push({ host, group, states: [...states], activeStates });
}

crossState.sort((a, b) => b.group.length - a.group.length);
sameState.sort((a, b) => b.group.length - a.group.length);

console.log(`\nScanned ${files.length} WordPress-{state} config files, ${all.length} library entries.\n`);

console.log('='.repeat(72));
console.log(`CROSS-STATE COLLISIONS — ${crossState.length} host(s)`);
console.log('One domain cannot be the real site of libraries in two states.');
console.log('At least one entry in each group is wrong. Verify before editing.');
console.log('='.repeat(72));
for (const { host, group, states } of crossState) {
  console.log(`\n  ${host}   [${states.join(', ')}]`);
  for (const e of group) {
    const mark = isActive(e.state) ? '*' : ' ';
    console.log(`    ${mark} ${String(e.state).padEnd(3)} ${e.name}  (${e.city})  — ${e.file}`);
  }
}
console.log('\n  (* = entry is in an active scraper region and can affect live data)');

console.log('\n' + '='.repeat(72));
console.log(`SAME-STATE DUPLICATES — ${sameState.length} host(s)`);
console.log('Usually a branch sharing its parent system\'s site (often legitimate),');
console.log('or a duplicated row. Lower priority than the cross-state list above.');
console.log('='.repeat(72));
for (const { host, group } of sameState) {
  console.log(`\n  ${host}   [${group[0].state}]`);
  for (const e of group) {
    console.log(`      ${e.name}  (${e.city})  — ${e.file}`);
  }
}

console.log(`\nSummary: ${crossState.length} cross-state collision group(s), ${sameState.length} same-state group(s).\n`);

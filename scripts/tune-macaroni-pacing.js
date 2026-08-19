#!/usr/bin/env node
/**
 * tune-macaroni-pacing.js — reduce MacaroniKid per-event pacing cost (Tiers 2 & 3).
 *
 * WHY (measured 2026-08-19)
 * ------------------------
 * MacaroniKid is 65-74% of every rotation group's runtime (G1 20.5h of 31.8h,
 * G2 20.3h of 27.5h, G3 9.6h of 13.9h) at 9-40 minutes PER SITE. Strip it out and
 * every group finishes in 4-11h, comfortably inside the 24h trigger window.
 *
 * The cost is not page weight, it is the per-event loop:
 *
 *   TIER 2 — fixed sleeps on the per-event hot path:
 *     500ms  after page.goto + waitForSelector('body') on each EVENT page.
 *            Redundant: body is already awaited, so this is pure dead time.
 *     1000ms after each event save. Politeness pacing, but applied per EVENT
 *            rather than per SITE, so it scales with the largest cost driver.
 *     Combined: 1.5s of sleep per event. MacaroniKid-MA alone found 1527 events
 *     on 2026-08-14 => ~38 minutes of sleeping for one state.
 *
 *   TIER 3 — networkidle2 on the CALENDAR page goto:
 *     networkidle2 waits for network quiescence, which on ad-heavy MacaroniKid
 *     pages can run to the full 60s timeout. It is redundant in MOST of the
 *     family, where the goto is followed by explicit waitForSelector() calls
 *     that are the real readiness gate, and where the event-page goto already
 *     uses 'domcontentloaded'. This makes the calendar goto consistent.
 *
 *     NOT universally true, and the transform enforces that: ak/ar gate on a
 *     blind setTimeout(2000) instead of a selector wait, so this transform
 *     DECLINES them (see the precondition below). Verified by check 6 of
 *     test-macaroni-pacing.js, which caught the original blanket assumption.
 *
 * WHAT IS DELIBERATELY NOT TOUCHED
 * --------------------------------
 * The 2000ms and 3000ms sleeps are browser-lifecycle stability guards, not
 * pacing. Their own comments say so: 2000ms is "Wait for browser to fully
 * initialize (prevents 'Requesting main frame too early')" and 3000ms is "Wait
 * for clean shutdown before restarting". They fire once per browser restart,
 * not per event, so they cost almost nothing and removing them reintroduces a
 * known crash. This script asserts they survive untouched.
 *
 * Every edit is tagged with a MK-PACING comment so the change is greppable and
 * trivially revertible:  grep -rn "MK-PACING" scrapers/
 *
 * USAGE
 *   node scripts/tune-macaroni-pacing.js                 # dry run (default)
 *   node scripts/tune-macaroni-pacing.js --save          # apply
 *   node scripts/tune-macaroni-pacing.js --save --include-group1
 *
 * IN-FLIGHT SAFETY
 *   macaroni-runner-group{1,2,3}.js require() each state file LAZILY inside its
 *   loop, so a file edited while its group is mid-rotation is picked up by that
 *   run. Editing a file the running loop has not reached yet risks breaking a
 *   live rotation. Active Group 1 files are therefore EXCLUDED BY DEFAULT; pass
 *   --include-group1 only when no Group 1 rotation is running.
 */

const fs = require('fs');
const path = require('path');
const { MACARONI_SCRAPERS, isScraperActive, getActiveStates } = require('../scrapers/scraper-registry');

const SAVE = process.argv.includes('--save');
const INCLUDE_G1 = process.argv.includes('--include-group1');
const SCRAPERS_DIR = path.join(__dirname, '..', 'scrapers');

// ── The transforms ──────────────────────────────────────────────────────────
// Each is anchored on enough surrounding text that it cannot match the
// lifecycle guards, which use the same setTimeout(resolve, N) shape.
const TRANSFORMS = [
  {
    tier: 2,
    name: 'per-event settle 500ms -> 150ms',
    find: /await page\.waitForSelector\('body', \{ timeout: 5000 \}\);\n(\s*)await new Promise\(resolve => setTimeout\(resolve, 500\)\);/,
    replace: (m, indent) =>
      `await page.waitForSelector('body', { timeout: 5000 });\n${indent}` +
      `await new Promise(resolve => setTimeout(resolve, 150)); // MK-PACING per-event settle (was 500ms; body already awaited above)`
  },
  {
    tier: 2,
    name: 'per-event save pacing 1000ms -> 250ms',
    find: /(\n\s*)await new Promise\(resolve => setTimeout\(resolve, 1000\)\);/,
    replace: (m, lead) =>
      `${lead}await new Promise(resolve => setTimeout(resolve, 250)); // MK-PACING per-event politeness (was 1000ms)`
  },
  {
    tier: 3,
    name: "calendar goto networkidle2 -> domcontentloaded",
    // Timeout varies across the family (60000 in most, 30000 in ak/ar) — capture
    // and preserve it rather than hardcoding, so no file has its budget changed.
    //
    // PRECONDITION: dropping networkidle2 is only safe when an explicit
    // waitForSelector() follows the goto to act as the real readiness gate.
    // Most of the family has one. scraper-macaroni-ak.js and -ar.js do NOT —
    // they wait with a blind setTimeout(2000) "Wait for JS calendar to render"
    // instead. Removing network-quiescence there would leave the scrape gated
    // on nothing but a fixed sleep, so this transform declines those files.
    // (Found 2026-08-19 by test-macaroni-pacing.js check 6, which contradicted
    // this script's original assumption that every file had a selector wait.)
    precondition: (src) => {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const idx = code.search(/page\.goto\([^)]*\/events\/calendar/);
      return idx >= 0 && /page\.waitForSelector\s*\(/.test(code.slice(idx));
    },
    find: /waitUntil: 'networkidle2', timeout: (\d+)/,
    replace: (m, timeout) =>
      `waitUntil: 'domcontentloaded', timeout: ${timeout}` +
      ` /* MK-PACING was networkidle2; the waitForSelector calls below are the real readiness gate */`
  }
];

// ── Scope ───────────────────────────────────────────────────────────────────
const activeStates = getActiveStates();
const registered = new Map();   // basename -> {keys:[], group, active}
for (const [key, cfg] of Object.entries(MACARONI_SCRAPERS || {})) {
  const base = path.basename(cfg.file);
  if (!registered.has(base)) {
    registered.set(base, { keys: [], group: cfg.group, active: isScraperActive(cfg, activeStates) });
  }
  registered.get(base).keys.push(key);
}

const inFlight = new Set(
  [...registered.entries()].filter(([, v]) => v.active && v.group === 1).map(([b]) => b)
);

const all = fs.readdirSync(SCRAPERS_DIR).filter(f => /^scraper-macaroni-.*\.js$/.test(f)).sort();

const results = { changed: [], skippedInFlight: [], unregistered: [], noMatch: [], alreadyDone: [], declined: [] };

for (const base of all) {
  if (!registered.has(base)) { results.unregistered.push(base); continue; }
  if (inFlight.has(base) && !INCLUDE_G1) { results.skippedInFlight.push(base); continue; }

  const full = path.join(SCRAPERS_DIR, base);
  const before = fs.readFileSync(full, 'utf8');

  if (before.includes('MK-PACING')) { results.alreadyDone.push(base); continue; }

  let after = before;
  const applied = [];
  const declined = [];
  for (const t of TRANSFORMS) {
    if (!t.find.test(after)) continue;
    if (t.precondition && !t.precondition(after)) { declined.push(t.name); continue; }
    after = after.replace(t.find, t.replace);
    applied.push(t.name);
  }
  if (declined.length) results.declined.push({ base, declined });

  if (!applied.length) { results.noMatch.push(base); continue; }

  // Guard assertions — never ship a file whose stability sleeps were altered.
  const guardsIntact =
    (before.match(/setTimeout\(resolve, 2000\)/g) || []).length === (after.match(/setTimeout\(resolve, 2000\)/g) || []).length &&
    (before.match(/setTimeout\(resolve, 3000\)/g) || []).length === (after.match(/setTimeout\(resolve, 3000\)/g) || []).length;
  if (!guardsIntact) {
    console.error(`  ✗ ${base}: REFUSED — a 2000/3000ms lifecycle guard would have changed`);
    process.exitCode = 1;
    continue;
  }

  results.changed.push({ base, applied });
  if (SAVE) fs.writeFileSync(full, after, 'utf8');
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n=== MacaroniKid pacing tune ${SAVE ? '(SAVING)' : '(DRY RUN — pass --save to apply)'} ===\n`);
console.log(`  files examined      : ${all.length}`);
console.log(`  will change         : ${results.changed.length}`);
console.log(`  skipped (in-flight) : ${results.skippedInFlight.length}${results.skippedInFlight.length && !INCLUDE_G1 ? '  <- active Group 1, rerun with --include-group1 when idle' : ''}`);
console.log(`  already tuned       : ${results.alreadyDone.length}`);
console.log(`  unregistered (skip) : ${results.unregistered.length}`);
console.log(`  registered, no match: ${results.noMatch.length}`);

const byTier = {};
for (const c of results.changed) for (const a of c.applied) byTier[a] = (byTier[a] || 0) + 1;
console.log(`\n  transform hit counts:`);
for (const t of TRANSFORMS) console.log(`    [tier ${t.tier}] ${t.name}: ${byTier[t.name] || 0}`);

if (results.skippedInFlight.length) console.log(`\n  in-flight: ${results.skippedInFlight.join(', ')}`);
if (results.unregistered.length)    console.log(`  unregistered: ${results.unregistered.join(', ')}`);
if (results.noMatch.length)         console.log(`  no-match: ${results.noMatch.join(', ')}`);

if (results.declined.length) {
  console.log(`\n  ⛔ transforms DECLINED by precondition (unsafe for that file):`);
  for (const d of results.declined) console.log(`     ${d.base}: ${d.declined.join(', ')}`);
}

const partial = results.changed.filter(c => c.applied.length < TRANSFORMS.length);
if (partial.length) {
  console.log(`\n  ⚠️ partial matches (fewer than ${TRANSFORMS.length} transforms) — expected for structural outliers:`);
  for (const c of partial) console.log(`     ${c.base}: ${c.applied.join(' + ')}`);
}

console.log(`\n${SAVE ? 'Applied.' : 'Nothing written.'} Verify with: node scripts/test-macaroni-pacing.js\n`);

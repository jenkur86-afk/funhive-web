#!/usr/bin/env node
/**
 * check-name-drift-liveness.js — split scraper_name drift into drift that is
 * STILL HAPPENING and drift that is merely AGING OUT.
 *
 * WHY THIS EXISTS
 * ---------------
 * check-scraper-names.js counts distinct scraper_name values over a rolling
 * window of database rows. That answers "how many names in the window fail to
 * join the registry?" — but it CANNOT tell whether a bad name is still being
 * written or was fixed weeks ago and is simply waiting for its rows to expire.
 * Those need opposite responses, and conflating them has real cost: gate 6 has
 * been reported as an open 🟡 defect ("74.8% conform, 214 names drift") while
 * the code producing the worst offenders was corrected on 2026-08-25/27.
 *
 * Measured 2026-09-06 on the 23 largest drifting names — roughly 10,000 of the
 * ~17,500 drifting rows: every single one was last written on or before
 * 2026-08-27, and ZERO had been written in the previous three days. wordpress-NY
 * (1,507 rows) stopped dead on 2026-08-27, the day commit bb18d63 "Bring 38
 * scraper name declarations onto their registry key" landed, while WordPress-NY
 * is written daily. That is a fixed defect, not an open one.
 *
 * A name is LIVE if it has been written within --days (default 3, comfortably
 * more than one 3-day rotation). LIVE drift is real work. STALE drift is
 * bookkeeping that resolves itself.
 *
 * COST: one tiny indexed query per name (select scraped_at, limit 1), so it is
 * bounded by --top rather than by table size. Default 40 covers the bulk of the
 * rows; raise it deliberately.
 *
 *   node scripts/check-name-drift-liveness.js
 *   node scripts/check-name-drift-liveness.js --top=80 --days=3
 */

const { execFileSync } = require('child_process');
const path = require('path');
const { supabase } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'supabase-adapter'));

const args = process.argv.slice(2);
const num = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? parseInt(a.split('=')[1], 10) : d; };
const TOP = num('top', 40);
const DAYS = num('days', 3);

// Reuse check-scraper-names.js as the single source of what "drift" means, rather
// than re-implementing its classifier and letting the two definitions diverge.
let out;
try {
  out = execFileSync(process.execPath, [path.join(__dirname, 'check-scraper-names.js')], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
  });
} catch (e) {
  console.error('could not run check-scraper-names.js:', e.message);
  process.exit(1);
}

// Lines look like:  "   1507  CASE_MISMATCH  wordpress-NY"
const drift = [];
for (const line of out.split('\n')) {
  const m = /^\s*(\d+)\s+(CASE_MISMATCH|FORMAT_DRIFT|BAD_SLUG|FREE_TEXT|UNRELATED)\s+(.+?)\s*$/.exec(line);
  if (m) drift.push({ rows: parseInt(m[1], 10), cls: m[2], name: m[3] });
}
if (!drift.length) { console.error('no drift lines parsed — did check-scraper-names.js output format change?'); process.exit(1); }

drift.sort((a, b) => b.rows - a.rows);
const sample = drift.slice(0, TOP);
const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString();

(async () => {
  console.log(`\nDrift liveness — top ${sample.length} of ${drift.length} names, LIVE = written since ${cutoff.slice(0, 10)}\n`);
  let liveRows = 0, staleRows = 0, liveN = 0, staleN = 0;
  const live = [];

  for (const d of sample) {
    const { data, error } = await supabase
      .from('events').select('scraped_at')
      .eq('scraper_name', d.name)
      .order('scraped_at', { ascending: false })
      .limit(1);
    if (error) { console.log(`ERR   ${d.name}: ${error.message}`); continue; }
    const last = data && data[0] ? data[0].scraped_at : null;
    const isLive = !!last && last > cutoff;
    if (isLive) { liveN++; liveRows += d.rows; live.push(d); }
    else { staleN++; staleRows += d.rows; }
    console.log(`${(isLive ? 'LIVE' : 'STALE').padEnd(6)}${String(d.rows).padStart(6)}  ${d.cls.padEnd(15)}${d.name.padEnd(34)}${last ? last.slice(0, 10) : '(none)'}`);
  }

  const tot = liveRows + staleRows;
  console.log(`\n  LIVE  ${String(liveN).padStart(3)} names  ${String(liveRows).padStart(6)} rows  (${tot ? ((liveRows / tot) * 100).toFixed(1) : '0.0'}%)  <- real, still-accumulating drift`);
  console.log(`  STALE ${String(staleN).padStart(3)} names  ${String(staleRows).padStart(6)} rows  (${tot ? ((staleRows / tot) * 100).toFixed(1) : '0.0'}%)  <- already fixed, waiting to expire`);

  if (live.length) {
    console.log('\n  Work list — these are the only names worth renaming:');
    for (const d of live) console.log(`    ${String(d.rows).padStart(6)}  ${d.cls.padEnd(15)}${d.name}`);
  } else {
    console.log('\n  No live drift in the sample: every drifting name checked has stopped being');
    console.log('  written. Gate 6 will rise on its own as these rows age out of the window.');
    console.log('  Renaming anything here would change nothing — the code is already correct.');
  }
})().catch(e => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * check-source-url-coverage.js — which scrapers still fail to pass a listing URL?
 *
 * `source_url` is the field that says WHERE an event came from, as opposed to what someone
 * named it. It is what makes coverage questions answerable by exact host comparison instead
 * of by fuzzy venue-name matching (see scripts/verify-coverage.js for why that matters).
 *
 * THE TRAP THIS SCRIPT EXISTS TO AVOID
 * `flattenEvent()`/`saveEvent()` only began populating source_url at 2026-08-04 20:46 UTC.
 * Every row written before then is NULL because the code never set it — nothing to do with
 * the scraper. And because scrapers run on a 3-day rotation, at any given moment roughly
 * two-thirds of them have not run since any recent cutoff. Measuring naively produces a long
 * list of "broken" scrapers that are simply stale. A first pass at this on 2026-08-05 named
 * CivicRec, BCCLS, assabet and ZooAquariums as offenders; all four had merely not run yet.
 *
 * So this script reports three states, never two:
 *   OK        — ran since the cutoff, passes a listing URL
 *   MISSING   — ran since the cutoff and still does not pass one   <- the real finding
 *   UNPROVEN  — no rows since the cutoff, status unknown
 *
 * Read-only. Selective columns. Paginated with .order() before .range().
 *
 * Usage:
 *   node scripts/check-source-url-coverage.js
 *   node scripts/check-source-url-coverage.js --since=2026-08-07T00:00:00Z
 *   node scripts/check-source-url-coverage.js --all        # include pre-cutoff rows as context
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

// When flattenEvent()/saveEvent() started setting source_url (commit 1951ef0).
const FIX_TS = '2026-08-04T20:46:00Z';

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const since = arg('since') || FIX_TS;
const showAll = args.includes('--all');

// Collapse per-site scraper_name values onto the family that owns the source file.
// Many scrapers write a per-library or per-site name rather than the registry key.
function family(n) {
  if (!n) return '(null scraper_name)';
  if (/^Macaroni ?Kid /i.test(n)) return 'MacaroniKid-* (per-site names)';
  if (/^MacaroniKid-/i.test(n)) return 'MacaroniKid-* (registry names)';
  if (/^RecDeskParks-/i.test(n)) return 'RecDeskParks-*';
  if (/^CivicRec-Parks/i.test(n)) return 'CivicRec-Parks-Eastern-*';
  if (/^ActiveNet-Parks/i.test(n)) return 'ActiveNet-Parks-Eastern-*';
  if (/^LocalistParks-/i.test(n)) return 'LocalistParks-*';
  if (/^StateParksEvents-/i.test(n)) return 'StateParksEvents-*';
  if (/^wordpress-/i.test(n)) return 'WordPress-{state}';
  if (/^librarymarket-/i.test(n)) return 'LibraryMarket-*';
  if (/^BiblioCommons-/i.test(n)) return 'BiblioCommons-*';
  if (/^Communico/i.test(n)) return 'Communico-*';
  if (/BCCLS|libcal/i.test(n)) return 'LibCal-* / BCCLS';
  return n;
}

async function page(gte) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('events').select('scraper_name, source_url, url, created_at');
    if (gte) q = q.gte('created_at', gte);
    const { data, error } = await q.order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const recent = await page(since);
  const all = showAll ? await page(null) : null;

  console.log(`cutoff (source_url fix): ${since}`);
  console.log(`rows created since cutoff: ${recent.length}`);
  if (all) console.log(`rows in table overall    : ${all.length}`);

  const agg = src => {
    const f = {};
    src.forEach(r => {
      const k = family(r.scraper_name);
      const e = f[k] = f[k] || { n: 0, src: 0, url: 0, names: new Set() };
      e.n++; if (r.source_url) e.src++; if (r.url) e.url++;
      e.names.add(r.scraper_name);
    });
    return f;
  };

  const recentF = agg(recent);
  const allF = all ? agg(all) : null;

  const rows = Object.entries(recentF).map(([k, e]) => ({
    k, n: e.n, miss: e.n - e.src, pct: 100 * e.src / e.n,
    urlPct: 100 * e.url / e.n, names: e.names.size,
  }));

  const missing = rows.filter(r => r.pct < 99).sort((a, b) => b.miss - a.miss);
  const ok = rows.filter(r => r.pct >= 99).sort((a, b) => b.n - a.n);

  console.log(`\n=== MISSING — ran since the cutoff and still passes no listing URL (${missing.length}) ===`);
  if (!missing.length) console.log('  (none)');
  else {
    console.log('   MISSING  /ROWS   src%  evtUrl%  names  FAMILY');
    missing.forEach(r => console.log(
      `  ${String(r.miss).padStart(8)} /${String(r.n).padStart(5)}  ${r.pct.toFixed(0).padStart(4)}%  ${r.urlPct.toFixed(0).padStart(6)}%  ${String(r.names).padStart(5)}  ${r.k}`));
  }

  console.log(`\n=== OK — ran since the cutoff, passes a listing URL (${ok.length}) ===`);
  ok.slice(0, 25).forEach(r => console.log(`  ${String(r.n).padStart(6)} rows  ${r.k}`));
  if (ok.length > 25) console.log(`  … and ${ok.length - 25} more`);

  // UNPROVEN: families that exist historically but produced nothing since the cutoff.
  if (allF) {
    const unproven = Object.keys(allF).filter(k => !recentF[k])
      .map(k => ({ k, n: allF[k].n })).sort((a, b) => b.n - a.n);
    console.log(`\n=== UNPROVEN — no rows since the cutoff, status unknown (${unproven.length}) ===`);
    console.log('  These are NOT offenders. On a 3-day rotation most scrapers will sit here.');
    unproven.slice(0, 25).forEach(r => console.log(`  ${String(r.n).padStart(6)} historical rows  ${r.k}`));
    if (unproven.length > 25) console.log(`  … and ${unproven.length - 25} more`);
  } else {
    console.log('\n(run with --all to also list families that have not run since the cutoff)');
  }

  // Rows with no link of any kind. `url` predates the fix, so this is valid regardless of window.
  const dead = recent.filter(r => !r.source_url && !r.url);
  if (dead.length) {
    const byF = {};
    dead.forEach(r => { const k = family(r.scraper_name); byF[k] = (byF[k] || 0) + 1; });
    console.log(`\n=== NO LINK OF ANY KIND (no source_url and no url): ${dead.length} rows ===`);
    console.log('  `url` was never affected by the source_url fix, so this finding is window-independent.');
    Object.entries(byF).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`));
  }

  const tot = recent.length, totSrc = recent.filter(r => r.source_url).length;
  console.log(`\noverall since cutoff: ${totSrc}/${tot} (${tot ? (100 * totSrc / tot).toFixed(1) : '0'}%) have source_url`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

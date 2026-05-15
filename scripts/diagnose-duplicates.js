#!/usr/bin/env node

/**
 * DIAGNOSE DUPLICATE EVENTS — read-only investigation.
 *
 * Step 2b of fix-event-quality.js deletes events where
 *   (lower(name), lower(event_date), lower(venue))
 * collides. On 2026-05-14 it deleted 3576 dupes in a single run — way more
 * than the usual 0–2. This script reproduces that grouping (without deleting)
 * and reports patterns so we can find the scraper(s) producing the dupes:
 *
 *   - Which scrapers contribute to dupe groups?
 *   - Are dupes within-scraper (same scraper saving twice) or cross-scraper?
 *   - Do dupes share a URL but get different IDs? (URL drift)
 *   - Do dupes have different created_at? (re-scrape) or same? (same-run bug)
 *   - What does the URL variance look like? (trailing /, query strings, fragments)
 *
 * Usage:
 *   node scripts/diagnose-duplicates.js              # full report (top 30 groups)
 *   node scripts/diagnose-duplicates.js --limit=100  # more groups
 *   node scripts/diagnose-duplicates.js --csv        # also emit dupes-sample.csv
 *
 * Selective columns to keep egress low.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');
const fs = require('fs');

const LIMIT = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '30', 10);
const WRITE_CSV = process.argv.includes('--csv');

async function fetchAll() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, venue, url, source_url, scraper_name, created_at, city, state')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function normalizeUrl(u) {
  if (!u) return '';
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname}`.replace(/\/$/, '');
  } catch (_) {
    return u;
  }
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  DUPLICATE EVENT DIAGNOSIS (read-only)`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} events\n`);

  // Build dupe groups using the same key as fix-event-quality.js Step 2b
  const groups = new Map();
  for (const r of rows) {
    const key = [
      (r.name || '').toLowerCase().trim(),
      (r.event_date || '').toLowerCase().trim(),
      (r.venue || '').toLowerCase().trim(),
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const dupeGroups = [...groups.values()].filter(g => g.length > 1);
  const totalExtras = dupeGroups.reduce((sum, g) => sum + g.length - 1, 0);

  console.log(`Groups with duplicates: ${dupeGroups.length}`);
  console.log(`Total extra rows (would be deleted): ${totalExtras}\n`);

  if (dupeGroups.length === 0) return;

  // ── Pattern 1: within-scraper vs cross-scraper ──
  let withinScraper = 0;
  let crossScraper = 0;
  const crossScraperPairs = new Map(); // "A x B" -> count
  for (const g of dupeGroups) {
    const scrapers = new Set(g.map(r => r.scraper_name || 'unknown'));
    if (scrapers.size === 1) withinScraper++;
    else {
      crossScraper++;
      const sorted = [...scrapers].sort();
      const key = sorted.join(' × ');
      crossScraperPairs.set(key, (crossScraperPairs.get(key) || 0) + 1);
    }
  }
  console.log(`── Within-scraper vs cross-scraper ──`);
  console.log(`  Within-scraper (same scraper saved >1):  ${withinScraper} groups`);
  console.log(`  Cross-scraper (multiple scrapers):       ${crossScraper} groups`);

  console.log(`\n── Top cross-scraper combinations ──`);
  const topPairs = [...crossScraperPairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [pair, n] of topPairs) {
    console.log(`  ${String(n).padStart(4)} ${pair}`);
  }

  // ── Pattern 2: which scrapers contribute the most "extra" rows ──
  const extrasByScraper = new Map();
  for (const g of dupeGroups) {
    // Sort newest-first; the "extras" are everyone except the oldest
    g.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    for (let i = 1; i < g.length; i++) {
      const s = g[i].scraper_name || 'unknown';
      extrasByScraper.set(s, (extrasByScraper.get(s) || 0) + 1);
    }
  }
  console.log(`\n── Scrapers producing the most "extra" dupe rows ──`);
  const topExtras = [...extrasByScraper.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [s, n] of topExtras) {
    console.log(`  ${String(n).padStart(4)} ${s}`);
  }

  // ── Pattern 3: URL variance within groups (URL drift) ──
  let groupsWithUrlDrift = 0;
  let groupsWithSameUrl = 0;
  let groupsWithNoUrl = 0;
  for (const g of dupeGroups) {
    const urls = new Set();
    for (const r of g) {
      const u = normalizeUrl(r.url || r.source_url || '');
      if (u) urls.add(u);
    }
    if (urls.size === 0) groupsWithNoUrl++;
    else if (urls.size === 1) groupsWithSameUrl++;
    else groupsWithUrlDrift++;
  }
  console.log(`\n── URL variance within dupe groups ──`);
  console.log(`  All rows share one URL:     ${groupsWithSameUrl} groups (scraper save bug; same URL got different IDs)`);
  console.log(`  Multiple URLs in group:     ${groupsWithUrlDrift} groups (URL drift — same event, different URL per scrape)`);
  console.log(`  No URL on any row in group: ${groupsWithNoUrl} groups (details-based ID drift)`);

  // ── Pattern 4: created_at temporal pattern ──
  let sameRun = 0;
  let differentRuns = 0;
  for (const g of dupeGroups) {
    const times = g.map(r => r.created_at).filter(Boolean).map(t => new Date(t).getTime());
    if (times.length < 2) continue;
    const spread = Math.max(...times) - Math.min(...times);
    // <10 min apart → same run; otherwise different runs
    if (spread < 10 * 60 * 1000) sameRun++;
    else differentRuns++;
  }
  console.log(`\n── Temporal pattern (created_at spread within group) ──`);
  console.log(`  Same-run dupes (<10 min apart):       ${sameRun} groups (bug: same scrape produces multiple rows)`);
  console.log(`  Cross-run dupes (>=10 min apart):     ${differentRuns} groups (bug: re-scrape gets a new ID)`);

  // ── Pattern 5: sample groups, top of each category ──
  console.log(`\n── Sample groups (showing up to ${LIMIT}) ──`);
  const sorted = dupeGroups.sort((a, b) => b.length - a.length);
  for (const g of sorted.slice(0, LIMIT)) {
    const first = g[0];
    console.log(`\n  📋 "${(first.name || '').substring(0, 70)}" (${g.length} copies)`);
    console.log(`     event_date="${first.event_date}" venue="${first.venue}" city=${first.city}, ${first.state}`);
    for (const r of g) {
      const u = r.url || r.source_url || '';
      console.log(`       id=${r.id.substring(0, 12)} scraper=${r.scraper_name || '?'} created=${(r.created_at || '').substring(0, 16)} url=${u.substring(0, 60)}`);
    }
  }

  // ── Optional CSV ──
  if (WRITE_CSV) {
    const csvRows = ['group_key,id,name,event_date,venue,scraper_name,created_at,url'];
    const esc = (s) => `"${String(s || '').replace(/"/g, '""').replace(/\n/g, ' ').substring(0, 200)}"`;
    let groupId = 0;
    for (const g of dupeGroups) {
      groupId++;
      for (const r of g) {
        csvRows.push([
          groupId,
          esc(r.id), esc(r.name), esc(r.event_date), esc(r.venue),
          esc(r.scraper_name), esc(r.created_at),
          esc(r.url || r.source_url),
        ].join(','));
      }
    }
    fs.writeFileSync('dupes-sample.csv', csvRows.join('\n'));
    console.log(`\n💾 Wrote dupes-sample.csv with ${csvRows.length - 1} rows across ${dupeGroups.length} groups`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

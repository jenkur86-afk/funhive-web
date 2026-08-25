#!/usr/bin/env node
/**
 * Audits the "cancelled/closed" backlog BY DISTINCT TITLE, and separates rows
 * matched on the TITLE from rows matched only on the DESCRIPTION.
 *
 *   node scripts/audit-cancelled-backlog.js
 *   node scripts/audit-cancelled-backlog.js --limit=20000     # cap for a quick pass
 *   node scripts/audit-cancelled-backlog.js --csv=out.csv     # full per-title table
 *
 * Read-only. Never deletes; there is no --save on purpose.
 *
 * WHY
 * ---
 * scripts/fix-cancelled-events.js reports ~714 deletable rows. Reading its sample
 * first (the 2026-08-04 rule) surfaced "Wabash County Plan Commission Meeting",
 * "Theme Tea English Abbey" and a house-and-garden tour — titles with no closure
 * content at all. This script exists to explain that number before anyone acts on
 * it, because the difference between the two predicates is the whole story:
 *
 *   SHARED  isCancelledEvent() in supabase-adapter.js — the one that runs at save
 *           time for all 185+ scrapers. Its description rule matches ONLY
 *           cancelled/postponed/suspended, and deliberately NOT "closed", with an
 *           in-code comment saying "closed" in descriptions causes too many false
 *           positives (gates close, road closed, registration closed).
 *   LEGACY  fix-cancelled-events.js's own hand-rolled keyword scan. It never calls
 *           isCancelledEvent(). It ILIKEs five bare keywords — INCLUDING "closed"
 *           and "suspended" — across BOTH name and description, and applies its
 *           not-cancelled/rain-or-shine rescue to the NAME only, so a description
 *           saying "rain or shine, not cancelled" cannot rescue anything.
 *
 * That is the same predicate-fork defect recorded on 2026-08-22 for
 * fix-event-quality.js STEP 1b, which had drifted from isJunkTitle() the same way.
 *
 * Every row is classified into exactly one bucket so the counts reconcile:
 *   TITLE_MATCH        shared predicate fires on the title alone — safe to delete
 *   DESC_MATCH         shared predicate fires only with the description — review
 *   LEGACY_ONLY        only the forked keyword scan fires — the false-positive pool
 */
const { supabase, isCancelledEvent } = require('../scrapers/helpers/supabase-adapter');
const fs = require('fs');

const args = process.argv.slice(2);
const getArg = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const LIMIT = parseInt(getArg('limit', '0'), 10) || 0;
const CSV = getArg('csv');

// Faithful replica of fix-cancelled-events.js's logic, so the comparison is real.
const LEGACY_KEYWORDS = ['cancelled', 'canceled', 'postponed', 'closed', 'suspended'];
const LEGACY_RESCUE = /\b(not\s+cancelled|not\s+canceled|rain\s+or\s+shine|unless\s+cancelled)\b/i;
function legacyMatches(name, description) {
  const n = (name || '').toLowerCase();
  const d = (description || '').toLowerCase();
  if (LEGACY_RESCUE.test(name || '')) return false;   // rescue is NAME-only in the original
  return LEGACY_KEYWORDS.some(k => n.includes(k) || d.includes(k));
}

async function main() {
  console.log('\n=== CANCELLED BACKLOG AUDIT (read-only) ===\n');

  const buckets = { TITLE_MATCH: new Map(), DESC_MATCH: new Map(), LEGACY_ONLY: new Map() };
  const scrapersByBucket = { TITLE_MATCH: new Map(), DESC_MATCH: new Map(), LEGACY_ONLY: new Map() };
  let scanned = 0, from = 0;
  const PAGE = 1000;

  while (true) {
    // .order() before .range() — CLAUDE.md's paginator rule.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, venue, scraper_name')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`page ${from}: ${error.message}`);
    if (!data || !data.length) break;
    scanned += data.length;

    for (const e of data) {
      const name = e.name || '', desc = e.description || '';
      const shared = !!isCancelledEvent(name, desc);
      const sharedTitleOnly = !!isCancelledEvent(name, '');
      const legacy = legacyMatches(name, desc);
      if (!shared && !legacy) continue;

      let bucket;
      if (sharedTitleOnly) bucket = 'TITLE_MATCH';
      else if (shared) bucket = 'DESC_MATCH';
      else bucket = 'LEGACY_ONLY';

      const m = buckets[bucket];
      m.set(name, (m.get(name) || 0) + 1);
      const s = scrapersByBucket[bucket];
      if (!s.has(name)) s.set(name, new Set());
      s.get(name).add(e.scraper_name || '?');
    }

    if (data.length < PAGE) break;
    from += PAGE;
    if (LIMIT && scanned >= LIMIT) break;
  }

  const total = b => [...buckets[b].values()].reduce((a, c) => a + c, 0);
  console.log(`rows scanned: ${scanned}\n`);
  console.log('| bucket | distinct titles | rows | meaning |');
  console.log('|---|---|---|---|');
  console.log(`| TITLE_MATCH | ${buckets.TITLE_MATCH.size} | ${total('TITLE_MATCH')} | shared predicate fires on the TITLE — safe to delete |`);
  console.log(`| DESC_MATCH  | ${buckets.DESC_MATCH.size} | ${total('DESC_MATCH')} | shared predicate needs the DESCRIPTION — review |`);
  console.log(`| LEGACY_ONLY | ${buckets.LEGACY_ONLY.size} | ${total('LEGACY_ONLY')} | ONLY the forked keyword scan fires — false-positive pool |`);
  console.log(`\nlegacy-script total (what fix-cancelled-events.js would delete): ${total('TITLE_MATCH') + total('DESC_MATCH') + total('LEGACY_ONLY')}\n`);

  for (const b of ['TITLE_MATCH', 'DESC_MATCH', 'LEGACY_ONLY']) {
    const rows = [...buckets[b].entries()].sort((x, y) => y[1] - x[1]);
    console.log(`\n--- ${b} — ${rows.length} distinct titles ---`);
    rows.slice(0, 45).forEach(([t, c]) => {
      const scr = [...(scrapersByBucket[b].get(t) || [])].slice(0, 2).join(',');
      console.log(`  ${String(c).padStart(4)} x  ${JSON.stringify(t.slice(0, 78))}   [${scr}]`);
    });
    if (rows.length > 45) console.log(`  ...and ${rows.length - 45} more distinct titles`);
  }

  if (CSV) {
    const lines = ['bucket,count,title,scrapers'];
    for (const b of ['TITLE_MATCH', 'DESC_MATCH', 'LEGACY_ONLY']) {
      for (const [t, c] of buckets[b].entries()) {
        const scr = [...(scrapersByBucket[b].get(t) || [])].join(' ');
        lines.push(`${b},${c},"${t.replace(/"/g, '""')}","${scr}"`);
      }
    }
    fs.writeFileSync(CSV, lines.join('\n'));
    console.log(`\nwrote ${CSV}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });

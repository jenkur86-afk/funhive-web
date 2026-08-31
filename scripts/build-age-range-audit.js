#!/usr/bin/env node
/**
 * Builds the per-site age-range breakdown for AGE-RANGE-AUDIT.md (Step 3c of the
 * funhive-scraper-diagnosis task).
 *
 * `age_range` is a real column on events, so this is a DB query rather than a
 * stdout parse. One row per INDIVIDUAL SITE — grouping is (scraper_name, venue),
 * never scraper_name alone. See AGE-RANGE-AUDIT.md's "No aggregation, ever" rule:
 * collapsing many-site scrapers into one row hides individual sites that cross
 * the >=70% All-Ages flag threshold.
 *
 * Paginated reads use .order('id') before .range() per CLAUDE.md — an unordered
 * paginator returns overlapping pages (the 2026-05-15 incident lost ~17k events).
 * Selective .select() only; no SELECT *.
 *
 * Usage:
 *   node scripts/build-age-range-audit.js --since=2026-08-10T07:00:01Z
 *   node scripts/build-age-range-audit.js --since=... --out=path.md
 */
const fs = require('fs');
const { supabase } = require('../scrapers/helpers/supabase-adapter');

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since='));
const outArg = args.find(a => a.startsWith('--out='));
if (!sinceArg) {
  console.error('Missing --since=<ISO timestamp> (use today\'s run-start from scrapers/logs/scraper-run-<date>.log)');
  process.exit(1);
}
const SINCE = sinceArg.split('=')[1];
const OUT = outArg ? outArg.split('=')[1] : null;

/**
 * Sanitize one value for a Markdown table cell.
 *
 * A pipe ends the cell and a NEWLINE ends the whole table — every row after the
 * first offender is silently dropped by loadAges()/loadSites() and by the report
 * generator, with no error anywhere. That is the exact producer/consumer failure
 * class the diagnosis preflight exists to catch.
 *
 * Found live 2026-08-31: several KidsOutAndAbout-DMV rows carry a multi-line
 * venue ending "\n\n            See map: Google Maps". The 2026-08-31 age section
 * built as 1,913 sites and parsed back as 985 — 928 rows lost — because the first
 * such venue broke the table in half. Escaping pipes alone (which this builder
 * already did) is not enough; whitespace must be collapsed too.
 */
function cell(value) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .trim() || '—';
}

// The 6 standard brackets, in report order.
const BRACKETS = [
  'All Ages',
  'Babies & Toddlers (0-2)',
  'Preschool (3-5)',
  'Kids (6-8)',
  'Tweens (9-12)',
  'Teens (13-18)'
];

// Genuinely broad-content sources — excluded from the >=70% flag, not from the table.
const KNOWN_BROAD = new Set([
  'FestivalGuides-Eastern',
  'FairsFestivals-Eastern',
  'KidsOutAndAbout-Eastern',
  'KidsOutAndAbout-DMV',
  'Eventbrite-Family-Eastern'
]);

const FLAG_PCT = 0.70;
const FLAG_MIN_TOTAL = 20;

async function main() {
  console.log(`Reading events scraped since ${SINCE} ...`);

  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('events')
      .select('id, scraper_name, venue, age_range, source_url')
      .gte('scraped_at', SINCE)
      .order('id', { ascending: true })   // REQUIRED before .range()
      .range(from, from + PAGE - 1);

    if (error) { console.error('Query failed:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...data);
    process.stdout.write(`\r  ${rows.length} rows`);
    if (data.length < PAGE) break;
  }
  console.log(`\n  ${rows.length} rows total.`);

  // Group by (scraper_name, venue) — one entry per individual site.
  const sites = new Map();
  for (const r of rows) {
    const scraper = r.scraper_name || '(no scraper_name)';
    const venue = r.venue || '(no venue)';
    const key = `${scraper}|||${venue}`;
    if (!sites.has(key)) {
      sites.set(key, { scraper, venue, counts: {}, total: 0, link: r.source_url || '' });
    }
    const s = sites.get(key);
    const bracket = r.age_range || '(unset)';
    s.counts[bracket] = (s.counts[bracket] || 0) + 1;
    s.total++;
    if (!s.link && r.source_url) s.link = r.source_url;
  }

  const list = [...sites.values()].sort(
    (a, b) => a.scraper.localeCompare(b.scraper) || b.total - a.total
  );

  const flagged = list.filter(s => {
    if (KNOWN_BROAD.has(s.scraper)) return false;
    if (s.total < FLAG_MIN_TOTAL) return false;
    return (s.counts['All Ages'] || 0) / s.total >= FLAG_PCT;
  });

  const scrapersSeen = new Set(list.map(s => s.scraper));

  // Render
  // COLUMN ORDER IS LOAD-BEARING. scripts/generate-site-report.js's loadAges() matches
  // the header /Site \| Scraper \| All Ages/ and reads a fixed 10 columns: brackets at
  // indices 2-7, Total at 8, Link at 9. An earlier version of this builder emitted Link
  // in position 3 plus an extra "Other" column, so the header never matched and every
  // section it produced contributed ZERO rows to the report — silently, since the
  // generator just reported the rows it could parse. Do not reorder these.
  //
  // "Other" (rows whose age_range is unset or non-standard) is deliberately not its own
  // column: Total is the true row count, so the report derives the discrepancy itself and
  // renders it as "total != bracket sum". That is the same information, in the shape the
  // consumer already understands.
  const out = [];
  out.push(`| Site | Scraper | All Ages | Babies 0-2 | Preschool 3-5 | Kids 6-8 | Tweens 9-12 | Teens 13-18 | Total | Link |`);
  out.push(`|---|---|---|---|---|---|---|---|---|---|`);
  for (const s of list) {
    const cells = BRACKETS.map(b => s.counts[b] || 0);
    const link = s.link ? `[cal](${s.link})` : '—';
    out.push(`| ${cell(s.venue)} | ${cell(s.scraper)} | ${cells.join(' | ')} | ${s.total} | ${link} |`);
  }

  out.push('');
  out.push(`### Flagged: All Ages >= 70% (total >= ${FLAG_MIN_TOTAL} events)`);
  out.push('');
  if (flagged.length === 0) {
    out.push('_None._');
  } else {
    out.push(`| Site | Scraper | All Ages | Total | % |`);
    out.push(`|---|---|---|---|---|`);
    for (const s of flagged.sort((a, b) => b.total - a.total)) {
      const aa = s.counts['All Ages'] || 0;
      out.push(`| ${cell(s.venue)} | ${cell(s.scraper)} | ${aa} | ${s.total} | ${((aa / s.total) * 100).toFixed(0)}% |`);
    }
  }

  const body = out.join('\n');
  console.log(`\nsites: ${list.length}   scrapers: ${scrapersSeen.size}   flagged: ${flagged.length}`);

  if (OUT) {
    // Trailing newline is load-bearing — see the same note in
    // build-library-site-audit.js. The fragment is `cat`-ed into the audit file.
    fs.writeFileSync(OUT, body + '\n', 'utf8');
    console.log(`wrote ${OUT}`);
  } else {
    console.log('\n' + body.split('\n').slice(0, 25).join('\n'));
    console.log('\n(use --out=<file> to write the full table)');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

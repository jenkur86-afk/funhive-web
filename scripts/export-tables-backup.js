#!/usr/bin/env node
/**
 * Offline backup of the tables that CANNOT be rebuilt by re-running the scrapers.
 *
 * WRITTEN 2026-09-10 at project close-out. The Supabase project is on the free tier,
 * which pauses after roughly a week of inactivity and can eventually drop a long-dormant
 * project altogether. Re-running every scraper would regenerate `events`, but it would not
 * regenerate any of these three:
 *
 *   activities     61,436 venues. Includes the hand-curated VenueList-* families, which
 *                  are typed-out lists rather than discovered data — CLAUDE.md is explicit
 *                  that "a new venue won't appear until someone notices it and adds it
 *                  manually", and the two automated OSM discovery attempts were abandoned.
 *                  Losing this means re-typing it.
 *   click_events   2,262 rows of real user interaction analytics. Genuinely irreplaceable:
 *                  it is a record of what people did, and no amount of re-scraping
 *                  produces it. Also the table with no SELECT policy (see below).
 *   scraper_logs   9,772 per-run telemetry rows. This is the evidence base for the
 *                  runtime-balanced rotation groups and for ROTATION-STARVATION-LOG.md.
 *
 * `events` is deliberately NOT exported. It re-scrapes, and most of it is past-dated and
 * would be deleted by the first data-quality run after any restart, so a copy would be
 * archival at best. Pass --include-events if you want it anyway.
 *
 * TWO DELIBERATE DEPARTURES FROM THE USUAL RULES IN THIS REPO:
 *
 * 1. `select('*')` is correct here. CLAUDE.md forbids it for list and search queries
 *    because of egress, and that rule stands — but a backup that omits columns is not a
 *    backup. This runs once, at close-out, with the egress budget spent on purpose.
 * 2. The SERVICE ROLE key is required, not the anon key. `click_events` has an
 *    anonymous-INSERT-only policy and no SELECT policy at all, so the anon key reads it as
 *    empty rather than erroring — the failure mode is a silent zero-row backup, which is
 *    why this script asserts the key is present up front and refuses to run without it.
 *
 * Pagination still follows the house rule — `.order('id')` before `.range()`. An unordered
 * paginator returns overlapping pages, and here that would mean a backup with duplicated
 * and missing rows that looks complete.
 *
 * Output lands in scripts/exports/, which is gitignored: these files hold user analytics
 * and must not be committed to a public repo.
 *
 * Usage:
 *   node scripts/export-tables-backup.js
 *   node scripts/export-tables-backup.js --include-events
 *   node scripts/export-tables-backup.js --out=D:/backups
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const INCLUDE_EVENTS = args.includes('--include-events');
const OUT_DIR = arg('out') || path.join(__dirname, 'exports');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  console.error('The service role key is REQUIRED: click_events has no SELECT policy, so the');
  console.error('anon key would return zero rows silently and write an empty backup.');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

const TABLES = ['activities', 'click_events', 'scraper_logs'];
if (INCLUDE_EVENTS) TABLES.unshift('events');

async function exportTable(table) {
  const PAGE = 1000;
  let from = 0;
  const rows = [];
  process.stdout.write(`  ${table}: `);
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    process.stdout.write(`${rows.length} `);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const file = path.join(OUT_DIR, `${table}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 1));
  const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
  console.log(`-> ${rows.length} rows, ${mb} MB`);
  return { table, rows: rows.length, mb: Number(mb), file };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nBacking up to ${OUT_DIR}\n`);

  const summary = [];
  for (const t of TABLES) {
    try { summary.push(await exportTable(t)); }
    catch (e) { console.log(`\n  ✗ ${t}: ${e.message}`); summary.push({ table: t, rows: 0, mb: 0, error: e.message }); }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    reason: 'Project close-out backup of tables that re-running the scrapers cannot rebuild.',
    supabaseUrl: URL,
    includedEvents: INCLUDE_EVENTS,
    tables: summary,
    restoreNote: 'Each file is a JSON array of whole rows. To restore, upsert in batches on the primary key: supabase.from(<table>).upsert(batch, { onConflict: "id" }). Restore activities BEFORE events if events are ever restored too — events.activity_id is a foreign key into activities, and the scrapers already carry a retry-without-activity_id path for exactly this ordering problem.',
  };
  fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));

  const total = summary.reduce((n, s) => n + s.rows, 0);
  const mb = summary.reduce((n, s) => n + (s.mb || 0), 0).toFixed(1);
  console.log(`\n${total} rows across ${summary.length} tables, ${mb} MB total.`);
  console.log(`Manifest: ${path.join(OUT_DIR, 'MANIFEST.json')}`);
  console.log('\nThis directory is gitignored and holds user analytics — copy it somewhere');
  console.log('durable yourself; do NOT commit it.\n');
  const failed = summary.filter(s => s.error);
  if (failed.length) { console.error(`${failed.length} table(s) FAILED — the backup is incomplete.`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

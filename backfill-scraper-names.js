#!/usr/bin/env node
/**
 * Backfill scraper_name on events where it's NULL or literally 'unknown'.
 *
 * Strategy: use the event's URL, source_url, platform, and state to derive
 * the scraper that most likely imported it. Known patterns:
 *   - *.macaronikid.com                  → 'Macaroni Kid <State>'
 *   - *.libnet.info                      → 'LibNet Libraries <State>'
 *   - *.librarycalendar.com              → 'Library Calendar <State>'
 *   - *.librarymarket.com                → 'Library Market <State>'
 *   - *libcal*                           → 'LibCal Libraries <State>'
 *   - *bibliocommons*                    → 'BiblioCommons Libraries <State>'
 *   - *communico*                        → 'Communico Libraries <State>'
 *   - (other) → derived from domain: 'auto:<hostname>'
 *
 * Usage:
 *   node backfill-scraper-names.js          # dry run (shows what it would do)
 *   node backfill-scraper-names.js --save   # actually write changes
 */

// Reuse the project's Supabase client (handles env loading internally —
// same pattern as data-quality-check.js)
const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

function deriveScraperName(row) {
  const url = (row.url || row.source_url || '').toLowerCase();
  const state = (row.state || '').toUpperCase();
  const platform = (row.platform || '').toLowerCase();

  if (!url && !platform) {
    return 'auto:unidentified';
  }

  // Platform-based takes precedence (when scraper set metadata.platform)
  if (platform.includes('libcal')) return `LibCal Libraries ${state}`.trim();
  if (platform.includes('bibliocommons')) return `BiblioCommons Libraries ${state}`.trim();
  if (platform.includes('communico')) return `Communico Libraries ${state}`.trim();
  if (platform.includes('activecalendar')) return `ActiveCalendar ${state}`.trim();
  if (platform.includes('firespring')) return `Firespring ${state}`.trim();
  if (platform.includes('libnet')) return `LibNet Libraries ${state}`.trim();
  if (platform.includes('librarycalendar')) return `Library Calendar ${state}`.trim();
  if (platform.includes('librarymarket')) return `Library Market ${state}`.trim();

  // URL-pattern matches
  const match = url.match(/^https?:\/\/([^\/]+)/);
  if (!match) return 'auto:unidentified';
  const host = match[1].replace(/^www\./, '');

  // Macaroni Kid — strip subdomain to use as identifier if state is missing
  if (host.endsWith('.macaronikid.com')) {
    if (state) return `Macaroni Kid ${state}`;
    const sub = host.replace('.macaronikid.com', '');
    return `Macaroni Kid ${sub}`;
  }

  // Library calendar platforms
  if (host.endsWith('.libnet.info') || host.includes('libnet.info')) return `LibNet Libraries ${state}`.trim();
  if (host.endsWith('.librarycalendar.com') || host.includes('librarycalendar.com')) return `Library Calendar ${state}`.trim();
  if (host.endsWith('.librarymarket.com') || host.includes('librarymarket.com')) return `Library Market ${state}`.trim();
  if (host.includes('libcal')) return `LibCal Libraries ${state}`.trim();
  if (host.includes('bibliocommons')) return `BiblioCommons Libraries ${state}`.trim();
  if (host.includes('communico')) return `Communico Libraries ${state}`.trim();

  // Specific FunHive-built scrapers
  if (host.includes('aacpl')) return 'AACPL Library MD';
  if (host.includes('aacountymd') || host.includes('aarecparks')) return 'AA Rec Parks MD';
  if (host.includes('cabarrus')) return 'ActiveCalendar Cabarrus NC';
  if (host.includes('brooklynlibrary') || host.includes('brooklynpubliclibrary')) return 'Brooklyn Library NY';
  if (host.includes('lfpl.org')) return 'Louisville Library KY';
  if (host.includes('mdpls.org')) return 'Miami-Dade Library FL';
  if (host.includes('ocls.info')) return 'Orange County Library FL';

  // Fallback: derive from domain so at least it's identifiable
  return `auto:${host}`;
}

(async () => {
  console.log(SAVE ? '🔧 SAVE mode — writing changes\n' : '🧪 DRY RUN — no changes will be written (pass --save to apply)\n');

  // ---- Phase 1: fetch all target event IDs grouped by derived scraper_name ----
  console.log('Fetching events with missing scraper_name...');
  const PAGE = 1000;
  let offset = 0;
  const idsByBucket = {}; // { derivedName: [id1, id2, ...] }
  const unidentified = [];
  let totalScanned = 0;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, url, source_url, platform, state, scraper_name')
      .or('scraper_name.is.null,scraper_name.eq.unknown')
      .range(offset, offset + PAGE - 1);

    if (error) { console.error('Query error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const derived = deriveScraperName(row);
      if (!idsByBucket[derived]) idsByBucket[derived] = [];
      idsByBucket[derived].push(row.id);
      if (derived === 'auto:unidentified') {
        unidentified.push({ id: row.id, name: row.name, url: row.url, source_url: row.source_url });
      }
    }
    totalScanned += data.length;
    process.stdout.write(`  → Scanned ${totalScanned} events\r`);

    if (data.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`  → Scanned ${totalScanned} events total          `);

  // ---- Phase 2: show breakdown ----
  const sorted = Object.entries(idsByBucket).sort((a, b) => b[1].length - a[1].length);
  console.log(`\n📊 Breakdown by derived scraper_name:`);
  for (const [name, ids] of sorted) {
    console.log(`    ${String(ids.length).padStart(6)}  ${name}`);
  }

  if (unidentified.length > 0) {
    console.log(`\n⚠️  ${unidentified.length} events could not be identified from URL/platform.`);
    console.log('   Sample (first 5):');
    for (const r of unidentified.slice(0, 5)) {
      console.log(`    ${r.id}: "${(r.name || '').substring(0, 50)}" url=${r.url || '(none)'} source_url=${r.source_url || '(none)'}`);
    }
  }

  // ---- Phase 3: write updates grouped by scraper_name ----
  if (!SAVE) {
    console.log(`\n🧪 Dry run complete. ${totalScanned} events would be updated.`);
    console.log('\nRun with --save to apply: node backfill-scraper-names.js --save');
    return;
  }

  console.log(`\n🔧 Writing updates...`);
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const [name, ids] of sorted) {
    // UPDATE events SET scraper_name = $name WHERE id IN ($ids) — chunk by 500 IDs
    let updatedForBucket = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error: upErr } = await supabase
        .from('events')
        .update({ scraper_name: name })
        .in('id', chunk);
      if (upErr) {
        totalErrors++;
        console.error(`  ❌ ${name} chunk ${i}: ${upErr.message}`);
      } else {
        updatedForBucket += chunk.length;
      }
    }
    totalUpdated += updatedForBucket;
    console.log(`  ✓ ${String(updatedForBucket).padStart(6)}  ${name}`);
  }

  console.log(`\n✅ Done. ${totalUpdated}/${totalScanned} events updated${totalErrors ? ` (${totalErrors} errors)` : ''}.`);
})();

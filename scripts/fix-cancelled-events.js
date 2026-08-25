#!/usr/bin/env node
/**
 * Remove cancelled / closed / postponed events from the database.
 *
 * Usage:
 *   node scripts/fix-cancelled-events.js            # dry run (default)
 *   node scripts/fix-cancelled-events.js --save
 *   node scripts/fix-cancelled-events.js --save --ceiling=600
 *
 * REWRITTEN 2026-08-25. It now calls the SHARED isCancelledEvent() from
 * supabase-adapter.js — the same predicate that runs at save time for all 185+
 * scrapers — instead of its own keyword scan.
 *
 * WHY THAT MATTERED, measured rather than assumed
 * -----------------------------------------------
 * The previous version never called isCancelledEvent(). It ILIKE'd five bare
 * keywords — cancelled, canceled, postponed, closed, suspended — across BOTH name
 * and description, and applied its not-cancelled/rain-or-shine rescue to the NAME
 * only, so a description saying "rain or shine, not cancelled" could not rescue
 * anything. That is the same predicate-fork defect recorded on 2026-08-22 for
 * fix-event-quality.js STEP 1b.
 *
 * The shared predicate deliberately does NOT match a bare "closed" in a
 * description, with an in-code comment explaining why: gates close, roads close,
 * registration closes. The forked scan did, and a title-by-title audit
 * (scripts/audit-cancelled-backlog.js) showed the damage:
 *
 *   753 rows the old script would have deleted
 *   470 of them matched ONLY on the description — and 463 of those 470 were
 *       driven by the single word "closed"
 *   worst offenders: "Oconaluftee Indian Village - Fall Tours" (42 rows),
 *       "Gifford Aquatic Center" (38), "Kennedy Park Hike" (20),
 *       "Sprig Coffee Co. Pop-Up" (14) — all ordinary family events
 *
 * So running the old script with --save would have destroyed roughly 480 real
 * events to remove ~270 genuine closure notices. It was a loaded gun, and the
 * 714-row "backlog" it reported was ~64% false positives.
 *
 * A ceiling aborts the run rather than deleting an unexpected volume, and ids are
 * collected read-only BEFORE any delete, per CLAUDE.md's paginator rule.
 */
const { supabase, isCancelledEvent } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const ceilArg = process.argv.find(a => a.startsWith('--ceiling='));
const CEILING = ceilArg ? parseInt(ceilArg.split('=')[1], 10) : 600;

async function main() {
  console.log(`\n  FIX CANCELLED EVENTS — ${SAVE ? 'SAVE' : 'DRY RUN'}  ceiling=${CEILING}\n`);

  const victims = [];
  const byTitle = new Map();
  let scanned = 0, from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, venue, scraper_name')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`page ${from}: ${error.message}`);
    if (!data || !data.length) break;
    scanned += data.length;

    for (const e of data) {
      if (!isCancelledEvent(e.name || '', e.description || '')) continue;
      victims.push(e);
      byTitle.set(e.name, (byTitle.get(e.name) || 0) + 1);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`  rows scanned          : ${scanned}`);
  console.log(`  cancelled/closed rows : ${victims.length}  (${byTitle.size} distinct titles)\n`);

  if (!victims.length) { console.log('  Nothing to delete.\n'); return; }

  console.log('  BY DISTINCT TITLE (top 30):');
  [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([t, c]) => console.log(`    ${String(c).padStart(4)} x ${JSON.stringify(String(t).slice(0, 74))}`));
  if (byTitle.size > 30) console.log(`    ...and ${byTitle.size - 30} more distinct titles`);
  console.log('');

  if (victims.length > CEILING) {
    console.error(`  ABORT: ${victims.length} exceeds the ceiling of ${CEILING}. Read the ` +
      `title list above before raising --ceiling; a sudden jump means a rule got broader, ` +
      `and this step DELETES.`);
    process.exit(1);
  }

  if (!SAVE) { console.log('  Run with --save to delete.\n'); return; }

  const ids = victims.map(v => v.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await supabase.from('events').delete().in('id', chunk);
    if (error) throw new Error(`delete chunk ${i}: ${error.message}`);
    deleted += chunk.length;
  }
  console.log(`  ✅ Deleted ${deleted} cancelled/closed events.\n`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err.message); process.exit(1); });

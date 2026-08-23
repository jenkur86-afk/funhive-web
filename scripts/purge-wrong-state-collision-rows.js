#!/usr/bin/env node
/**
 * purge-wrong-state-collision-rows.js — remove events that a URL collision filed under
 * the WRONG STATE.
 *
 * WHAT THIS CLEANS UP
 * -------------------
 * scripts/disable-collided-urls.js stops NEW wrong-state rows arriving, but it is not
 * retroactive: rows already written keep the wrong state until they expire. They surface
 * on the site in the wrong state's results with geography geocoded to the CLAIMED city,
 * so they are wrong in every field a user can see — a Belfast MAINE event stored as New
 * York, a Sparta WISCONSIN event stored as New Jersey.
 *
 * FIRST RUN, 2026-08-23: 1,180 rows deleted across 76 proven hosts; 417 rows on those
 * same hosts carried the CORRECT state and were left alone, which is the check that the
 * host match is doing real work rather than matching everything. A re-run immediately
 * afterwards reported 0 wrong / 417 right. Re-running is safe and idempotent.
 *
 * WHY DELETE RATHER THAN RE-TAG THE STATE
 * ---------------------------------------
 * Re-tagging would fix one column and leave the rest inconsistent: city, address,
 * location GEOMETRY and geohash were all derived from the CLAIMED city, not the real
 * one. And for the hosts whose true state is inside the active region, the correct
 * entry already scrapes that library properly — belfastlibrary.org has 157 wrong NY rows
 * next to 44 correct ME ones — so re-tagging would create duplicates of rows that
 * already exist. For hosts whose true state is OUTSIDE the region (WI, TX, IL, IN, CA)
 * the events do not belong in FunHive at all.
 *
 * SAFETY, and why it is written this way
 * --------------------------------------
 * The 2026-05-15 incident destroyed ~17,000 events with a paginated .range() that had no
 * .order(), so rows appeared on several pages and a delete pass ate legitimate data.
 * This script therefore:
 *   - always .order('id') before .range()          (the rule from CLAUDE.md)
 *   - SELECTS ids in a complete read-only pass FIRST, then deletes only that fixed id
 *     list — the delete never walks a live, shifting result set
 *   - de-duplicates ids defensively even so
 *   - refuses to run if the kill list exceeds MAX_DELETE, so a GROUND_TRUTH typo that
 *     suddenly matches everything cannot cascade
 *   - is dry-run by default and prints per-host counts plus real samples
 *
 * GROUND_TRUTH is READ FROM disable-collided-urls.js rather than duplicated, so the
 * evidence for "this host is really state X" lives in exactly one place. A host is only
 * listed there after its state was read off the LIVE PAGE.
 *
 * Usage:
 *   node scripts/purge-wrong-state-collision-rows.js            # dry run
 *   node scripts/purge-wrong-state-collision-rows.js --save
 */

const fs = require('fs');
const path = require('path');
const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const PAGE = 1000;
const DELETE_BATCH = 200;
// A ceiling, not a target. The measured kill list on 2026-08-22 was 896; anything near
// an order of magnitude above that means GROUND_TRUTH or the host match is broken.
const MAX_DELETE = 3000;

function loadGroundTruth() {
  const src = fs.readFileSync(path.join(__dirname, 'disable-collided-urls.js'), 'utf8');
  const gt = {};
  for (const m of src.matchAll(/'([a-z0-9.-]+)':\s*\{ state: '([A-Z]{2}|DEAD)'/g)) gt[m[1]] = m[2];
  return gt;
}

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

async function main() {
  const GT = loadGroundTruth();
  // DEAD hosts are EXCLUDED on purpose, and this is not an oversight. A dead host has no
  // true state, so "wrong state" is undefined for it and there is nothing to compare
  // against. More importantly the rows it left behind are ambiguous rather than wrong:
  // franklinlibrary.org now 301s to a French running blog, but its 10 remaining rows are
  // tagged VT and Franklin VT is a real library, so they are most likely genuine events
  // scraped before the domain expired. Deleting them would destroy possibly-real data to
  // tidy up a host that already stopped being scraped. They age out via the normal
  // past-event cleanup instead.
  const hosts = Object.keys(GT).filter(h => GT[h] !== 'DEAD');
  console.log(`ground-truth hosts with a real state: ${hosts.length}`);
  if (!hosts.length) { console.log('nothing to do'); return; }

  // ---- pass 1: read-only, collect the kill list -------------------------------
  // Queried PER HOST rather than as one `scraper_name ilike '%wordpress%'` sweep. That
  // sweep is a full scan and died with "canceling statement due to statement timeout"
  // on 2026-08-22 while a rotation was hammering the same table — the same timeout the
  // scrapers' own dedup checks were logging that day. 76 narrow source_url filters cost
  // far less than one wide scan and each can be retried independently.
  const kill = [];
  const keep = [];
  const byHost = {};
  let scanned = 0;

  for (const host of hosts) {
    const truth = GT[host];
    for (let attempt = 1; ; attempt++) {
      let from = 0, ok = true;
      const got = [];
      for (;;) {
        const { data, error } = await supabase
          .from('events')
          .select('id, state, source_url, name, venue, scraper_name')
          .ilike('source_url', `%${host}%`)
          .order('id', { ascending: true })      // REQUIRED before .range() — see header
          .range(from, from + PAGE - 1);
        if (error) {
          if (/timeout/i.test(error.message) && attempt < 3) {
            console.error(`  ${host}: ${error.message} — retry ${attempt}/2`);
            ok = false; break;
          }
          console.error(`query failed for ${host}:`, error.message);
          process.exit(1);
        }
        if (!data || !data.length) break;
        got.push(...data);
        from += PAGE;
        if (data.length < PAGE) break;
      }
      if (!ok) { await new Promise(r => setTimeout(r, 3000)); continue; }

      scanned += got.length;
      for (const r of got) {
        // Re-check the host exactly: the ilike is a substring match and could in
        // principle catch a longer hostname that merely contains this one.
        if (hostOf(r.source_url) !== host) continue;
        if (r.state === truth) { keep.push(r); continue; }
        kill.push(r);
        const k = `${host} (really ${truth}) stored as ${r.state}`;
        byHost[k] = (byHost[k] || 0) + 1;
      }
      break;
    }
  }

  // Defensive de-dup: even with .order() in place, never let one id be issued twice.
  const ids = [...new Set(kill.map(r => r.id))];

  console.log(`rows scanned across ${hosts.length} hosts   : ${scanned}`);
  console.log(`on a ground-truth host, RIGHT state : ${keep.length}  (left alone)`);
  console.log(`on a ground-truth host, WRONG state : ${kill.length}  -> ${ids.length} distinct ids`);
  console.log('');
  Object.entries(byHost).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

  console.log('\nsamples (name — venue — stored state — source host):');
  for (const r of kill.slice(0, 12)) {
    console.log(`  "${(r.name || '').slice(0, 46)}" — ${(r.venue || '').slice(0, 30)} — ${r.state} — ${hostOf(r.source_url)}`);
  }

  if (!ids.length) { console.log('\nNothing to delete.'); return; }
  if (ids.length > MAX_DELETE) {
    console.error(`\nREFUSING: kill list of ${ids.length} exceeds MAX_DELETE ${MAX_DELETE}. ` +
      `That is far above the measured baseline and points at a broken GROUND_TRUTH or host match, ` +
      `not at real corruption. Investigate before raising the ceiling.`);
    process.exit(1);
  }

  if (!SAVE) { console.log('\nDry run — re-run with --save to delete.'); return; }

  // ---- pass 2: delete only the fixed id list ----------------------------------
  let done = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const batch = ids.slice(i, i + DELETE_BATCH);
    const { error } = await supabase.from('events').delete().in('id', batch);
    if (error) { console.error(`delete batch failed at ${i}:`, error.message); process.exit(1); }
    done += batch.length;
    process.stdout.write(`\r  deleted ${done}/${ids.length}`);
  }
  console.log(`\nDeleted ${done} wrong-state rows.`);
}

main().catch(e => { console.error(e); process.exit(1); });

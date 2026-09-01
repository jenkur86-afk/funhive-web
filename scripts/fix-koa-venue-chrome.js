#!/usr/bin/env node

/**
 * FIX KidsOutAndAbout-DMV venue chrome — one-off backfill.
 * Plan/evidence: SITE-IMPROVEMENT-REVIEW.md §1.3, fix-notes _pending
 * KIDSOUTANDABOUT-VENUE-NEWLINES.
 *
 * THE BUG WAS BIGGER THAN "CHROME IN THE VENUE". The scraper stored the whole
 * location block as the venue — "George Washington's Mount Vernon, 3200 Mount
 * Vernon Memorial Highway, Mount Vernon, VA 22121, United States \n\n See map:
 * Google Maps" — and left `address` NULL. Two source defects, both fixed
 * 2026-09-01 in scraper-kidsoutandabout-dmv.js:
 *   1. the "See map" strip only took effect when one of three address regexes
 *      matched (the cleaned string was a discarded local), so a bare venue name
 *      kept its chrome forever;
 *   2. the address split was gated on `!address && !city`, and the JSON-LD block
 *      above it usually supplies a city — so the split was skipped exactly where
 *      it was most needed. Every damaged row had an empty address.
 *
 * THIS SCRIPT APPLIES THE FIXED SCRAPER'S LOGIC VERBATIM (extractLocation below
 * is a copy of the post-fix block). That is deliberate: a backfill that "improves
 * on" its source diverges from it on the next scrape, and the two then fight.
 * Whatever this writes is exactly what the scraper will now produce.
 *
 * Fields are only ever filled where currently EMPTY (city/state/zip/address), so
 * a good JSON-LD value is never overwritten by a weaker parse. Venue is replaced,
 * because the stored one is known-bad.
 *
 * Usage:
 *   node scripts/fix-koa-venue-chrome.js          # dry run + samples
 *   node scripts/fix-koa-venue-chrome.js --save   # apply
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const MAX_UPDATES = 500;   // measured set is 65; refuse a runaway
const PAGE = 250;          // 1000 hit a statement timeout on this table 2026-09-01

// ── verbatim from scraper-kidsoutandabout-dmv.js (post-2026-09-01 fix) ────────
function extractLocation(rawVenue, knownCity, knownState, knownAddress) {
  let venue = rawVenue, address = knownAddress || '', city = knownCity || '',
      state = knownState || '', zipCode = '';
  if (venue) {
    venue = venue.replace(/\s*See\s*map:\s*Google\s*Maps\s*/gi, ' ')
                 .replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  }
  if (venue && /,/.test(venue)) {
    const cleanedVenue = venue.replace(/,?\s*(United States|USA)\s*$/i, '').trim();
    const fullAddrMatch = cleanedVenue.match(/^(.+?),\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
    if (fullAddrMatch) {
      venue = fullAddrMatch[1].trim();
      address = address || fullAddrMatch[2].trim();
      city = city || fullAddrMatch[3].trim();
      state = state || fullAddrMatch[4];
      zipCode = zipCode || (fullAddrMatch[5] || '').trim();
    } else {
      const streetMatch = cleanedVenue.match(/^(.+?),\s*([^,]+(?:Street|Road|Avenue|Drive|Boulevard|Blvd|Lane|Way|Pike|Pkwy|Parkway|Hwy|Highway|Rd|Dr|Ave|St|Ln|Ct|Pl|Circle|Trail|Tr)[^,]*),\s*([^,]+),\s*([A-Z]{2})/i);
      if (streetMatch) {
        venue = streetMatch[1].trim();
        address = address || streetMatch[2].trim();
        city = city || streetMatch[3].trim();
        state = state || streetMatch[4];
      } else {
        const nStreetMatch = cleanedVenue.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
        if (nStreetMatch) {
          venue = nStreetMatch[1].trim();
          city = city || nStreetMatch[2].trim();
          state = state || nStreetMatch[3];
          zipCode = zipCode || (nStreetMatch[4] || '').trim();
        }
      }
    }
  }
  return { venue, address, city, state, zipCode };
}

const isDirty = (v) => /[\r\n]/.test(v || '') || /see\s*map/i.test(v || '');

(async () => {
  console.log(`\n  FIX KidsOutAndAbout venue chrome   Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}\n`);
  const damaged = [];
  let from = 0, scanned = 0;
  for (;;) {
    const { data, error } = await supabase.from('events')
      .select('id, venue, city, state, zip_code, address')
      .like('scraper_name', 'KidsOutAndAbout%')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error(`  ❌ ${error.message}`); process.exitCode = 1; return; }
    if (!data.length) break;
    scanned += data.length;
    data.filter((r) => isDirty(r.venue)).forEach((r) => damaged.push(r));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`  scanned ${scanned} KidsOutAndAbout rows; ${damaged.length} have chrome in the venue\n`);
  if (!damaged.length) { console.log('  nothing to repair\n'); return; }

  const updates = [];
  for (const r of damaged) {
    const res = extractLocation(r.venue, r.city, r.state, r.address);
    if (isDirty(res.venue)) { console.log(`  ⚠️ still dirty, SKIPPING: ${JSON.stringify(r.venue)}`); continue; }
    const patch = { venue: res.venue };
    if (!r.address && res.address) patch.address = res.address;
    if (!r.city && res.city) patch.city = res.city;
    if (!r.state && res.state) patch.state = res.state;
    if (!r.zip_code && res.zipCode) patch.zip_code = res.zipCode;
    updates.push({ id: r.id, before: r.venue, patch });
  }

  const gained = (f) => updates.filter((u) => u.patch[f] !== undefined).length;
  console.log(`  ${updates.length} rows to update — gaining address:${gained('address')} city:${gained('city')} state:${gained('state')} zip:${gained('zip_code')}\n`);
  console.log('  samples:');
  updates.slice(0, 12).forEach((u) => {
    console.log(`    venue: ${JSON.stringify(u.patch.venue)}`);
    const extra = Object.entries(u.patch).filter(([k]) => k !== 'venue');
    if (extra.length) console.log(`           + ${extra.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}`);
  });

  if (!SAVE) { console.log('\n  👀 DRY RUN — re-run with --save to apply.\n'); return; }
  if (updates.length > MAX_UPDATES) {
    console.error(`\n  ❌ REFUSING: ${updates.length} exceeds the ${MAX_UPDATES} ceiling.`);
    process.exitCode = 1; return;
  }

  let ok = 0, deduped = 0, failed = 0;
  for (const u of updates) {
    const { error } = await supabase.from('events').update(u.patch).eq('id', u.id);
    if (!error) { ok++; continue; }

    if (!/idx_events_unique_content|duplicate key/i.test(error.message || '')) {
      failed++;
      if (failed <= 3) console.log(`    ⚠️ ${u.id}: ${error.message}`);
      continue;
    }

    // CROSS-SCRAPER DUPLICATE, confirmed rather than assumed.
    //
    // KidsOutAndAbout-Eastern and -DMV both cover the DC/MD/VA metro, so the
    // same event exists twice under different stable ids. Eastern strips the
    // "See map" chrome unconditionally and DMV did not, so the two rows differed
    // ONLY by the junk in the venue — which is why cleaning the DMV copy makes it
    // collide with the already-correct Eastern copy. The row is therefore a
    // genuine duplicate of one that is already right, and users were seeing the
    // event listed twice.
    //
    // Same rule as renameOrDedupe() in fix-venue-title-quality.js: PROVE the
    // clean twin exists before deleting anything. Never delete on the strength
    // of the error message alone.
    const { data: row } = await supabase.from('events')
      .select('name, event_date').eq('id', u.id).limit(1);
    if (!row || !row.length) { failed++; continue; }
    const { data: twin, error: twinErr } = await supabase.from('events')
      .select('id, scraper_name').eq('name', row[0].name).eq('event_date', row[0].event_date)
      .eq('venue', u.patch.venue).neq('id', u.id).limit(1);
    if (twinErr || !twin || !twin.length) {
      console.log(`    ⚠️ ${u.id} collided but no clean twin found — left alone`);
      failed++;
      continue;
    }
    const { error: delErr } = await supabase.from('events').delete().eq('id', u.id);
    if (delErr) { failed++; console.log(`    ⚠️ delete failed ${u.id}: ${delErr.message}`); }
    else deduped++;
  }
  console.log(`\n  ✅ ${ok} venues repaired` +
    (deduped ? `, 🔁 ${deduped} deleted as duplicates of an already-clean twin` : '') +
    (failed ? `, ⚠️ ${failed} FAILED` : '') + '\n');
})();

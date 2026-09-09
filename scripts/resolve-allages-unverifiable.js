#!/usr/bin/env node
/**
 * Resolves the ALL-AGES half of the UNVERIFIABLE backlog by reading each venue's stored
 * events, rather than by fetching its page.
 *
 * WHY A FETCH CANNOT ANSWER THESE
 * The all-ages population asks one question: is this venue's programming genuinely broad,
 * or is it age-targeted programming that the detector failed to bracket? That is a question
 * about the ROWS WE STORED, not about what the page shows today — a page can list a
 * toddler storytime that we bracketed perfectly well, and it can equally have moved on
 * since the rows were written. So `verify-sites-puppeteer.js` is the wrong instrument here
 * and its UNVERIFIABLE answers on this population are not informative.
 *
 * WHY THIS IS WORTH RUNNING NOW, having previously been written off
 * The pending note ALLAGES-VERDICTS-REFER-TO-EXPIRED-ROWS records that "40 of the 41
 * all-ages UNVERIFIABLE verdicts name a VENUE that now has ZERO rows", concluding that
 * they can never clear and that gate 4 has a floor of ~40. Re-measured 2026-09-09: only
 * **15 of 40** have zero rows. **25 still have rows**, several with 100-250. The venues
 * are mostly RecDesk-Parks and Eventbrite-Family-Eastern, which re-scrape continuously, so
 * a venue that was empty when the note was written is populated again now. The floor is
 * real but it is ~15, not ~40, and the other 25 are answerable today.
 *
 * HOW THE VERDICT IS DECIDED — by the shipped detector, not by a local keyword list.
 * For every row at that venue currently stored as All Ages, the title is re-run through
 * `detectAgeRange()`. If the detector returns a SPECIFIC bracket for a title that is stored
 * as All Ages, that row is mis-bracketed and it proves the venue is not genuinely broad:
 *
 *   MISMATCH    at least one stored All-Ages title resolves to a specific bracket.
 *               The evidence is quoted in the comment, so the verdict names its own reason.
 *   MATCHES     the venue has All-Ages rows and NOT ONE of them carries a signal the
 *               detector can read. That is the same standard the existing hand-written
 *               MATCHES comments used ("checked N All-Ages titles ... none carries an age
 *               signal").
 *   UNVERIFIABLE left exactly as it was when the venue has no rows to read. Those are the
 *               ~15 with nothing to go on, and they are NOT converted to MATCHES —
 *               silence is not evidence, which is the rule established for zero-event
 *               sites in the 2026-08-10 Lake Sinclair re-check and applies identically
 *               here.
 *
 * Using `detectAgeRange()` rather than a regex written here matters twice over: it cannot
 * drift from the save path, and every rule added to it (grades, "birth" bounds, Babytime,
 * the 2026-09-09 adults marker) automatically sharpens this audit too.
 *
 * Output is the tuple format `merge-verification-comments.js` consumes, so this drops into
 * the Step 3d flow with no glue. It WRITES NOTHING on its own.
 *
 * Usage:
 *   node scripts/resolve-allages-unverifiable.js --out=verdicts.js
 *   node scripts/resolve-allages-unverifiable.js --out=v.js --limit=5
 */
const fs = require('fs');
const path = require('path');
const { supabase, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('../scrapers/helpers/age-range-normalizer');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const OUT = arg('out');
const LIMIT = arg('limit') ? parseInt(arg('limit'), 10) : Infinity;

const STORE = path.join(__dirname, '..', 'reports', 'verification-comments.json');

// Broad-content sources excluded from the >=70% flag are also excluded from a MISMATCH
// here: a genuinely all-ages festival listing is not a detector bug. Same list as Step 3c.
const KNOWN_BROAD = [
  'FestivalGuides-Eastern', 'FairsFestivals-Eastern', 'KidsOutAndAbout-Eastern',
  'KidsOutAndAbout-DMV', 'Eventbrite-Family-Eastern',
];
const isBroadSource = s => KNOWN_BROAD.some(k => s === k || s.startsWith(k + '-'));

const quote = s => String(s).replace(/\s+/g, ' ').replace(/"/g, "'").trim().slice(0, 70);

(async () => {
  const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  const targets = Object.entries(store)
    .filter(([, v]) => v.verdict === 'UNVERIFIABLE' && v.population === 'allages')
    .slice(0, LIMIT);

  console.log(`${targets.length} all-ages UNVERIFIABLE verdicts to examine\n`);

  const tuples = [];
  const tally = { MATCHES: 0, MISMATCH: 0, UNVERIFIABLE: 0 };

  for (const [key, v] of targets) {
    const i = key.indexOf('|||');
    const scraper = key.slice(0, i);
    const venue = key.slice(i + 3);

    // .order() before .range() per CLAUDE.md; selective columns only.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, age_range')
      .eq('venue', venue)
      .order('id', { ascending: true })
      .range(0, 999);

    if (error) {
      console.log(`  ?  ${venue}: query failed — ${error.message}`);
      tally.UNVERIFIABLE++;
      continue;
    }

    const rows = data || [];
    const allAges = rows.filter(r => r.age_range === 'All Ages');

    if (rows.length === 0) {
      // Nothing to read. Leave the existing verdict untouched rather than inventing one.
      console.log(`  –  ${venue}: 0 stored rows — still UNVERIFIABLE (the real gate-4 floor)`);
      tally.UNVERIFIABLE++;
      continue;
    }
    if (allAges.length === 0) {
      tuples.push([venue, scraper, 'MATCHES',
        `re-read ${rows.length} stored rows for this venue on 2026-09-09: NONE is tagged All Ages, so the mostly-All-Ages condition that raised this verdict no longer holds`]);
      tally.MATCHES++;
      console.log(`  ✓  ${venue}: ${rows.length} rows, none All Ages -> MATCHES`);
      continue;
    }

    // The detector's opinion of each All-Ages title.
    const misbracketed = [];
    for (const r of allAges) {
      const d = detectAgeRange(r.name, '');
      if (!d) continue;
      const n = normalizeAgeRange(d);
      if (!n || n === 'All Ages') continue;
      misbracketed.push({ name: r.name, should: n });
    }

    if (misbracketed.length && !isBroadSource(scraper)) {
      const shown = misbracketed.slice(0, 3).map(m => `"${quote(m.name)}" -> ${m.should}`).join('; ');
      tuples.push([venue, scraper, 'MISMATCH',
        `age-detection gap, evidence from stored rows 2026-09-09: ${misbracketed.length} of ${allAges.length} All-Ages titles at this venue resolve to a SPECIFIC bracket when re-run through the shipped detectAgeRange - ${shown}. Not the venue being broad; these rows predate the rule that now reads them and cannot self-heal because a re-scrape skips a known event before the write.`]);
      tally.MISMATCH++;
      console.log(`  ✗  ${venue}: ${misbracketed.length}/${allAges.length} mis-bracketed -> MISMATCH`);
    } else if (misbracketed.length) {
      console.log(`  –  ${venue}: ${misbracketed.length} mis-bracketed but ${scraper} is a known-broad source — left UNVERIFIABLE`);
      tally.UNVERIFIABLE++;
    } else {
      tuples.push([venue, scraper, 'MATCHES',
        `re-read ${allAges.length} All-Ages titles for this venue on 2026-09-09 through the shipped detectAgeRange: not one resolves to a specific bracket, so the programming reads as genuinely broad rather than mis-tagged`]);
      tally.MATCHES++;
      console.log(`  ✓  ${venue}: ${allAges.length} All-Ages titles, none carries a readable signal -> MATCHES`);
    }
  }

  console.log(`\nMATCHES ${tally.MATCHES}  MISMATCH ${tally.MISMATCH}  still UNVERIFIABLE ${tally.UNVERIFIABLE}`);

  if (OUT) {
    fs.writeFileSync(OUT, 'module.exports = [\n' + tuples.map(t => JSON.stringify(t)).join(',\n') + '\n];\n');
    console.log(`wrote ${OUT} (${tuples.length} tuples)`);
    console.log('\nMerge with:');
    console.log(`  node scripts/merge-verification-comments.js --population=allages ${OUT} --save`);
  }
})().catch(e => { console.error(e); process.exit(1); });

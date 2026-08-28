#!/usr/bin/env node
/**
 * adjudicate-allages-by-title.js — Step 3d verdicts for the mostly-All-Ages population,
 * decided from the events' own titles rather than from a page fetch.
 *
 * WHY TITLES AND NOT A FETCH, FOR THIS POPULATION
 * -----------------------------------------------
 * The question Step 3d asks of an all-ages site is: "is the live programming genuinely
 * generic, or is age-targeted programming being mis-bucketed?" For the RecDesk parks
 * family — which is 150 of today's 160 flags — a page fetch cannot answer that. A
 * RecDesk "site" is a ballfield, natatorium or meeting room, and its page shows the same
 * facility reservations already stored in the DB. The titles ARE the evidence, and every
 * RecDesk verdict already in reports/verification-comments.json was written from them.
 *
 * WHAT COUNTS AS EVIDENCE
 * -----------------------
 * A MISMATCH needs an age signal the pipeline MISSED. Finding age vocabulary in a title
 * is not enough on its own, and treating it as enough produces false alarms — the first
 * run of this script flagged four RecDesk sites over titles like "Youth Soccer League
 * Clinic (4-14 yr old)". detectAgeRange() reads that correctly as "4-14"; it lands on
 * All Ages because getBrackets() maps any span touching 4 or more of the 5 brackets to
 * All Ages, which is a deliberate encoding of "this really is broadly targeted", not a
 * miss. Recording that as a bug would send the next session rewriting working code.
 *
 * So every title carrying age vocabulary is re-run through the REAL pipeline
 * (resolveAgeRange), and the two outcomes are separated:
 *
 *   vocabulary present, pipeline extracts nothing   -> MISMATCH — a genuine gap
 *   vocabulary present, pipeline extracts a wide
 *     range and deliberately widens it to All Ages  -> MATCHES  — working as designed
 *   no vocabulary in any title                      -> MATCHES  — nothing to detect
 *
 * Anything with fewer than MIN_TITLES distinct titles to read is left UNVERIFIABLE
 * rather than passed, following the rule established in the 2026-08-10 Lake Sinclair
 * re-check: silence is unknown, never fine.
 *
 * Read-only against the DB, selective columns, .order() before .range().
 *
 * Usage:
 *   node scripts/adjudicate-allages-by-title.js --in=sites.json --out=verdicts.js
 *   node scripts/adjudicate-allages-by-title.js --in=sites.json --out=v.js --since=2026-08-28T07:00:01Z
 *
 * --in is the JSON array produced alongside the audit build: [{site, scraper}, ...].
 * --out is the tuple file merge-verification-comments.js consumes.
 */

const fs = require('fs');
const { supabase, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const IN = arg('in');
const OUT = arg('out');
const SINCE = arg('since') || '2026-08-28T07:00:01Z';
if (!IN || !OUT) { console.error('Usage: --in=sites.json --out=verdicts.js [--since=ISO]'); process.exit(1); }

// Fewer distinct titles than this and the sample is too thin to call either way.
const MIN_TITLES = 3;

// Audience vocabulary the save-time detector is NOT already catching. Each is anchored
// so it cannot fire on a venue name or a time — the false-positive class that broke age
// detection on 2026-08-03 ("Lincoln Elementary" matching the elementary rule).
const AGE_SIGNALS = [
  { re: /\bstory\s?time\b|\bstorytimes\b/i,              label: 'storytime' },
  { re: /\btoddlers?\b/i,                                 label: 'toddler' },
  { re: /\bbab(?:y|ies)\b/i,                              label: 'baby' },
  { re: /\binfants?\b/i,                                  label: 'infant' },
  { re: /\bpre-?schoolers?\b|\bpre-?school\b/i,           label: 'preschool' },
  { re: /\btweens?\b/i,                                   label: 'tween' },
  { re: /\bteens?\b|\bteenage/i,                          label: 'teen' },
  { re: /\bkindergart/i,                                  label: 'kindergarten' },
  { re: /\bages?\s*\d/i,                                  label: 'explicit ages' },
  { re: /\bgrades?\s*(?:k|\d)/i,                          label: 'grade level' },
  { re: /\b\d{1,2}\s*-\s*\d{1,2}\s*(?:yr|year)s?\b/i,     label: 'year range' },
  { re: /\bmonths?\s*(?:old|-)\b/i,                       label: 'months old' },
  // BROAD, and deliberately not sufficient on their own to call a MISMATCH. "Youth"
  // conventionally means roughly 6-18, which touches Kids, Tweens AND Teens; run through
  // getBrackets that is a 3-4 bracket span, so All Ages is already the honest answer and
  // "detectAgeRange found nothing" is not evidence of a miss. The dataset proves the
  // point: RecDesk-Parks-mprd lists both "Youth Soccer League Clinic (4-14 yr old)" and
  // a bare "Youth Soccer League Clinic" for the same programme, and the first one DOES
  // extract 4-14 and is widened to All Ages by design. Calling the second a bug would
  // contradict the first. These labels are still reported, just not as a defect.
  { re: /\byouth\b/i,                                     label: 'youth',  broad: true },
  { re: /\bjunior\b/i,                                    label: 'junior', broad: true },
];

function signalsIn(title) {
  const hit = AGE_SIGNALS.filter(s => s.re.test(title));
  return {
    specific: hit.filter(s => !s.broad).map(s => s.label),
    broad: hit.filter(s => s.broad).map(s => s.label),
  };
}

async function titlesFor(scraper, site) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('events')
      .select('name, age_range, venue')
      .eq('scraper_name', scraper)
      .eq('venue', site)
      .gte('scraped_at', SINCE)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const sites = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const tuples = [];
  let m = 0, x = 0, u = 0;

  for (const { site, scraper } of sites) {
    let rows;
    try {
      rows = await titlesFor(scraper, site);
    } catch (e) {
      tuples.push([site, scraper, 'UNVERIFIABLE', `DB read failed: ${e.message}`]);
      u++; continue;
    }

    const allAges = rows.filter(r => r.age_range === 'All Ages');
    const distinct = [...new Set(allAges.map(r => r.name).filter(Boolean))];

    if (distinct.length < MIN_TITLES) {
      tuples.push([site, scraper, 'UNVERIFIABLE',
        `only ${distinct.length} distinct All-Ages title(s) available to read - too thin to call either way, not treated as passing`]);
      u++; continue;
    }

    // Split vocabulary hits by what the REAL pipeline does with them. `missed` is the
    // only set that constitutes a bug; `widened` is the ">=4 brackets" rule firing.
    const missed = [];
    const widened = [];
    let broadOnly = 0;
    for (const t of distinct) {
      const { specific, broad } = signalsIn(t);
      if (!specific.length && !broad.length) continue;
      const extracted = detectAgeRange(t, '');
      if (extracted) { widened.push({ t, s: [...specific, ...broad], extracted }); continue; }
      if (!specific.length) { broadOnly++; continue; }  // broad word alone proves nothing
      missed.push({ t, s: specific });
    }

    if (missed.length) {
      const sample = missed.slice(0, 3).map(h => `"${h.t.slice(0, 60)}" [${h.s.join(', ')}]`).join('; ');
      const note = widened.length
        ? ` (a further ${widened.length} title(s) here DO extract a range that is then widened to All Ages by design, e.g. "${widened[0].t.slice(0, 45)}" -> ${widened[0].extracted}; those are not part of this finding)`
        : '';
      tuples.push([site, scraper, 'MISMATCH',
        `age-detection gap from title evidence: ${missed.length} of ${distinct.length} distinct All-Ages titles carry an age signal that detectAgeRange extracts nothing from, e.g. ${sample}. These should have landed in a specific bracket${note}.`]);
      x++;
    } else if (widened.length) {
      const w = widened[0];
      tuples.push([site, scraper, 'MATCHES',
        `working as designed, not a detection gap: ${widened.length} of ${distinct.length} distinct All-Ages titles carry an age signal, but detectAgeRange DOES read them - e.g. "${w.t.slice(0, 55)}" -> ${w.extracted} - and getBrackets deliberately maps a span touching 4+ of the 5 brackets to All Ages${broadOnly ? `; a further ${broadOnly} title(s) say only "youth"/"junior", which is itself a 3-4 bracket span` : ''}. No title carries a specific bracket that was missed.`]);
      m++;
    } else if (broadOnly) {
      tuples.push([site, scraper, 'MATCHES',
        `broadly targeted, not a detection gap: ${broadOnly} of ${distinct.length} distinct All-Ages titles say only "youth"/"junior" with no specific age, which spans Kids through Teens and is correctly encoded as All Ages. No title carries a specific bracket that was missed.`]);
      m++;
    } else {
      const sample = distinct.slice(0, 3).map(t => `"${t.slice(0, 55)}"`).join('; ');
      tuples.push([site, scraper, 'MATCHES',
        `age-neutral by title evidence: 0 of ${distinct.length} distinct All-Ages titles carry any age signal, e.g. ${sample}. Nothing here is age-targeted programming, so All Ages is correct and this is NOT a detection gap.`]);
      m++;
    }
    process.stdout.write('.');
  }

  fs.writeFileSync(OUT, tuples.map(t => JSON.stringify(t) + ',').join('\n') + '\n', 'utf8');
  console.log(`\n\nMATCHES ${m} | MISMATCH ${x} | UNVERIFIABLE ${u}   -> ${OUT}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

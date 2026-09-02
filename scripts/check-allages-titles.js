#!/usr/bin/env node
/**
 * Judge a flagged ">=70% All Ages" site from the titles of its OWN All-Ages rows.
 *
 * Why this and not scripts/verify-sites-puppeteer.js, which Step 3d names as the
 * default path: that script answers "are there events on this page?", and its
 * MISMATCH bucket is `extraction-failure`. For the zero-event population that is
 * exactly right. For the all-ages population it is the wrong question — the
 * scraper found the events, so of course they are there, and merging those
 * verdicts would fill the Fix queue with `extraction-failure` rows for scrapers
 * whose extraction is fine.
 *
 * The all-ages question is "should these events have landed in a specific age
 * bracket?", and the strongest available evidence is the stored title of every
 * row the site tagged All Ages. A title containing "Storytime", "Circle Time",
 * "Toddler", "Teen" etc. is a detection miss that can be quoted, and needs no
 * fetch at all — so this is also zero-Chrome and near-zero egress.
 *
 * Verdicts follow Step 3d's three values:
 *   MISMATCH      >=1 All-Ages title carries an unambiguous age signal
 *   MATCHES       no age signal in any All-Ages title (genuinely broad programming)
 *   UNVERIFIABLE  no All-Ages rows could be read back for the pair
 *
 * Usage: node scripts/check-allages-titles.js --in=pairs.tsv --out=verdicts.js
 *   pairs.tsv lines: <site>\t<scraper>
 */
const fs = require('fs');
const { supabase } = require('../scrapers/helpers/supabase-adapter');

const args = process.argv.slice(2);
const inArg = args.find(a => a.startsWith('--in='));
const outArg = args.find(a => a.startsWith('--out='));
if (!inArg) { console.error('Missing --in=<file>'); process.exit(1); }
const OUT = outArg ? outArg.split('=').slice(1).join('=') : null;

// Guards mirroring detectAgeRange() in scrapers/helpers/supabase-adapter.js.
//
// These are load-bearing, not defensive padding. Without them this script reports
// "Family Storytime" as an age-detection miss — but that classification is a
// DELIBERATE, TESTED guard added on 2026-08-06 (see AGE-RANGE-AUDIT.md, "Post-fix
// re-measurement: storytime age detection"): a family-labelled storytime is meant
// to stay All Ages. On the first run of this script 8 sites came back MISMATCH and
// 6 of them were purely this, which would have put six fake extraction bugs in the
// Fix queue and invited someone to "fix" a rule that is working as specified.
//
// The asymmetry is intentional and copied from the adapter: an adults-labelled
// title is never a children's event, so ADULTS suppresses the signal outright.
const FAMILY_RE = /\bfamil(y|ies)\b/i;
const ADULTS_RE = /\badults?\b/i;

// Unambiguous age signals only. Deliberately conservative: a false MISMATCH here
// sends someone rewriting a detector that is working. "Family" and "kids" are
// NOT here — they are genuinely all-ages words, which is the whole point.
const AGE_SIGNALS = [
  [/\bstory\s*time\b|\bstorytime\b/i, 'storytime'],
  [/\bcircle\s*time\b/i, 'circle time'],
  [/\bbaby\b|\bbabies\b|\binfant\b/i, 'baby/infant'],
  [/\btoddler\b/i, 'toddler'],
  [/\bpreschool\b|\bpre-?k\b/i, 'preschool'],
  [/\btween\b/i, 'tween'],
  [/\bteen\b|\bY\.?A\.?\s+book\b/i, 'teen'],
  [/\bages?\s+\d{1,2}\s*(?:-|–|to)\s*\d{1,2}\b/i, 'explicit age range'],
  [/\bgrades?\s+\d{1,2}\s*(?:-|–|to)\s*\d{1,2}\b/i, 'explicit grade range'],
  [/\blap\s*sit\b|\bmother\s*goose\b|\brhyme\s*time\b/i, 'early-literacy program']
];

async function main() {
  const pairs = fs.readFileSync(inArg.split('=').slice(1).join('='), 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => { const [site, scraper] = l.split('\t'); return { site, scraper }; });

  const out = [];
  for (const p of pairs) {
    // Selective columns only, per CLAUDE.md. No pagination needed: this is one
    // venue's All-Ages rows, capped well under a page.
    const { data, error } = await supabase
      .from('events')
      .select('name')
      .eq('scraper_name', p.scraper)
      .eq('venue', p.site)
      .eq('age_range', 'All Ages')
      .order('id', { ascending: true })
      .limit(300);

    if (error || !data || !data.length) {
      out.push([p.site, p.scraper, 'UNVERIFIABLE',
        `could not read back All-Ages rows for this venue${error ? `: ${error.message.slice(0, 80)}` : ' (none returned)'}`]);
      continue;
    }

    const found = [];
    for (const row of data) {
      const title = row.name || '';
      // Same guards the shipped detector applies, so this script cannot contradict it.
      if (FAMILY_RE.test(title) || ADULTS_RE.test(title)) continue;
      for (const [re, label] of AGE_SIGNALS) {
        if (re.test(title)) {
          found.push({ label, title: title.slice(0, 60) });
          break;
        }
      }
    }

    if (found.length) {
      const pct = Math.round((found.length / data.length) * 100);
      const egs = [...new Map(found.map(f => [f.label, f])).values()].slice(0, 3)
        .map(f => `"${f.title}" (${f.label})`).join('; ');
      out.push([p.site, p.scraper, 'MISMATCH',
        `age-detection miss: ${found.length}/${data.length} (${pct}%) of this venue's All-Ages titles carry an unambiguous age signal, e.g. ${egs}`.slice(0, 240)]);
    } else {
      out.push([p.site, p.scraper, 'MATCHES',
        `checked ${data.length} All-Ages titles for this venue; none carries an age signal (storytime/toddler/teen/explicit range) — programming reads as genuinely broad`.slice(0, 240)]);
    }
  }

  const tally = out.reduce((a, r) => { a[r[2]] = (a[r[2]] || 0) + 1; return a; }, {});
  console.log(`MATCHES ${tally.MATCHES || 0}  MISMATCH ${tally.MISMATCH || 0}  UNVERIFIABLE ${tally.UNVERIFIABLE || 0}`);
  const body = out.map(r => JSON.stringify(r) + ',').join('\n');
  if (OUT) { fs.writeFileSync(OUT, body + '\n', 'utf8'); console.log(`wrote ${OUT}`); }
  else console.log(body);
}

main().catch(e => { console.error(e); process.exit(1); });

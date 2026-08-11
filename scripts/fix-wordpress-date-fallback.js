#!/usr/bin/env node
/**
 * Drops the time-only fallback from the WordPress-{state} date assignment.
 *
 * When dom-date-resolver was wired in, the old expression was kept as a fallback:
 *
 *   date: resolveEventDate(card) || (possibleDates[0].textContent...)
 *
 * That fallback can never recover a date. The resolver already inspects every
 * candidate the fallback would look at — and more — and returns '' precisely
 * because none of them held a real date. So the fallback only ever re-supplies
 * the bare clock time the resolver just rejected, turning "this card has no
 * date" into "this card has an invalid date".
 *
 * Two costs: it inflates the INVALID column, hiding the real signal, and it does
 * it loudest for cards that were never events at all — measured on WordPress-NC
 * 2026-08-11, the survivors included a newsletter signup box ("Email me about
 * Library Events!"), a filter widget ("Date Range All Dates Today Tomorrow This
 * Week...") and a relative timestamp ("3 months ago").
 *
 * With no fallback these become dateless, which event-save-helper already counts
 * separately from invalid-date. Neither is saved either way; the difference is
 * that the counter stops lying.
 *
 * Dry run by default; --save to write.
 */
const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const DIR = path.join(__dirname, '..', 'scrapers');

const PAIRS = [
  {
    from: "date: resolveEventDate(card) || (possibleDates.length > 0 ? possibleDates[0].textContent.trim() : ''),",
    to: 'date: resolveEventDate(card),'
  },
  {
    from: "date: resolveEventDate(card) || (date ? date.textContent.trim() : '')",
    to: 'date: resolveEventDate(card)'
  }
];

const ACTIVE = ['va','ga','nc','ct','tn','al','vt','md','ny','fl','nj','ms','me','pa','ma','ky','sc','wv','de','ri','nh'];

const changed = [];
const skipped = [];

for (const st of ACTIVE) {
  const file = `scraper-wordpress-libraries-${st}.js`;
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) continue;

  let src = fs.readFileSync(full, 'utf8');
  const hit = PAIRS.find(p => src.includes(p.from));
  if (!hit) { skipped.push({ file, reason: 'no fallback expression present' }); continue; }

  if (src.split(hit.from).length - 1 !== 1) {
    skipped.push({ file, reason: 'fallback expression does not occur exactly once' });
    continue;
  }

  src = src.replace(hit.from, hit.to);
  changed.push(file);
  if (SAVE) fs.writeFileSync(full, src, 'utf8');
}

console.log(`=== ${SAVE ? 'REWROTE' : 'WOULD REWRITE'} ${changed.length} files ===`);
changed.forEach(f => console.log('  ' + f));
if (skipped.length) {
  console.log(`\n=== SKIPPED ${skipped.length} ===`);
  skipped.forEach(s => console.log(`  ${s.file} — ${s.reason}`));
}
console.log(`\n${SAVE ? 'Saved.' : 'Dry run — pass --save to write.'}`);

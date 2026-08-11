#!/usr/bin/env node
/**
 * Adds the local `skipped` counter to scraper return objects that drop it.
 *
 * Why: before the 2026-08-10 .add() duplicate-miscount fix, duplicates were
 * counted as imports, so a scraper's `skipped` counter stayed near zero and
 * dropping it from the return was invisible. Now that duplicates route into
 * `skipped` correctly, any scraper that omits it from its return object
 * under-reports to the runner's normalizer:
 *
 *   local-scraper-runner.js : dupCount = num(stats_src?.skipped)
 *   macaroni-runner-group*.js: dupCount = num(result?.duplicates) || num(result?.skipped)
 *
 * With `skipped` missing, dupCount is 0 and FOUND collapses to `imported`
 * alone. Dorchester-County went from a healthy "12 found / 12 new" to a
 * ⚠️-flagged "0 / 0 / 0" this way while actually working correctly.
 *
 * This is a REPORTING fix only — no event data changes.
 *
 * Dry run by default; pass --save to write.
 *   node scripts/fix-dropped-skipped-return.js
 *   node scripts/fix-dropped-skipped-return.js --save
 */
const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const SCRAPER_DIR = path.join(__dirname, '..', 'scrapers');

// Return shapes that carry a count but drop `skipped`.
const PATTERNS = [
  { from: 'return { imported, failed };', to: 'return { imported, skipped, failed };' },
  {
    from: 'return { imported: saved, failed, total: rawEvents.length };',
    to: 'return { imported: saved, skipped, failed, total: rawEvents.length };'
  }
];

const files = fs.readdirSync(SCRAPER_DIR).filter(f => f.startsWith('scraper-') && f.endsWith('.js'));

const changed = [];
const skippedFiles = [];

for (const f of files) {
  const full = path.join(SCRAPER_DIR, f);
  const src = fs.readFileSync(full, 'utf8');

  const hit = PATTERNS.find(p => src.includes(p.from));
  if (!hit) continue;

  // Only safe if the enclosing scope actually declares and increments `skipped`.
  // Without both, adding it to the return would throw a ReferenceError.
  if (!/\blet\s+skipped\s*=\s*0/.test(src) || !/\bskipped\s*\+\+/.test(src)) {
    skippedFiles.push({ file: f, reason: 'no `let skipped = 0` + `skipped++` in file' });
    continue;
  }

  // Refuse to touch a file with more than one occurrence — the replacement
  // target must be unambiguous.
  const occurrences = src.split(hit.from).length - 1;
  if (occurrences !== 1) {
    skippedFiles.push({ file: f, reason: `${occurrences} occurrences of the return pattern` });
    continue;
  }

  const out = src.replace(hit.from, hit.to);
  changed.push({ file: f, from: hit.from, to: hit.to });
  if (SAVE) fs.writeFileSync(full, out, 'utf8');
}

console.log(`Scanned ${files.length} scraper files.\n`);
console.log(`=== ${SAVE ? 'REWROTE' : 'WOULD REWRITE'} ${changed.length} files ===\n`);
for (const c of changed) console.log(`  ${c.file}\n      ${c.from}\n   -> ${c.to}`);

if (skippedFiles.length) {
  console.log(`\n=== SKIPPED (unsafe to rewrite automatically) ===\n`);
  for (const s of skippedFiles) console.log(`  ${s.file} — ${s.reason}`);
}

console.log(`\n${SAVE ? 'Saved.' : 'Dry run — pass --save to write.'}`);

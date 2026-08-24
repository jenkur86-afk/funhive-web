#!/usr/bin/env node
/**
 * merge-verification-comments.js — merges Step 3d verification verdicts into the
 * durable store at reports/verification-comments.json.
 *
 * Step 3d's fetch batches each write bare comma-terminated tuples to a scratchpad file:
 *
 *   ["Site Name","Scraper-Name","MATCHES","one sentence of evidence"],
 *   ["Other Site","Scraper-Name","UNVERIFIABLE","403 bot-block on fetch"],
 *
 * This script parses those files, validates every row, and merges them into the JSON
 * store keyed "<scraper>|||<site>". Use it instead of hand-editing the JSON — the
 * previous hand-rolled format stored the two populations in different field orders
 * split by a hardcoded row index, which transposed site and scraper whenever the
 * zero-event count changed and made every comment vanish from the report.
 *
 * Tuple order is ALWAYS [site, scraper, verdict, comment] regardless of population.
 *
 * Usage:
 *   node scripts/merge-verification-comments.js --population=zero  f1.js f2.js        # dry run
 *   node scripts/merge-verification-comments.js --population=zero  f1.js f2.js --save
 *   node scripts/merge-verification-comments.js --validate                            # check store only
 *   node scripts/merge-verification-comments.js --migrate-renames [--save]            # carry verdicts across a scraper rename
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'reports', 'verification-comments.json');
const VERDICTS = ['MATCHES', 'MISMATCH', 'UNVERIFIABLE'];
const POPULATIONS = ['zero', 'allages'];

const args = process.argv.slice(2);
const save = args.includes('--save');
const validateOnly = args.includes('--validate');
const migrateRenames = args.includes('--migrate-renames');
const popArg = (args.find(a => a.startsWith('--population=')) || '').split('=')[1] || '';
const files = args.filter(a => !a.startsWith('--'));

function loadStore() {
  if (!fs.existsSync(STORE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('store is not a JSON object');
    }
    return parsed;
  } catch (e) {
    console.error(`FAIL: ${path.relative(ROOT, STORE)} is unreadable: ${e.message}`);
    console.error('Fix or delete it before merging — refusing to overwrite a corrupt store.');
    process.exit(1);
  }
}

// Validates the store's own shape. Catches drift from hand-edits.
function validateStore(store) {
  const problems = [];
  Object.entries(store).forEach(([k, v]) => {
    if (!k.includes('|||')) problems.push(`key missing ||| separator: ${JSON.stringify(k)}`);
    if (!v || typeof v !== 'object') { problems.push(`value not an object: ${k}`); return; }
    if (!VERDICTS.includes(v.verdict)) problems.push(`bad verdict ${JSON.stringify(v.verdict)}: ${k}`);
    if (typeof v.comment !== 'string' || !v.comment.trim()) problems.push(`empty comment: ${k}`);
    if (v.population && !POPULATIONS.includes(v.population)) problems.push(`bad population ${JSON.stringify(v.population)}: ${k}`);
  });
  return problems;
}

// Pulls every [a,b,c,d] tuple out of a loose JS-fragment file.
function parseTuples(text) {
  const rows = [];
  const bad = [];
  const re = /\[\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      rows.push(m.slice(1, 5).map(s => JSON.parse(s)));
    } catch (e) {
      bad.push(m[0].slice(0, 90));
    }
  }
  return { rows, bad };
}


/**
 * Carry a settled verdict across a SCRAPER RENAME.
 *
 * The store is keyed "<scraper>|||<site>", so renaming a scraper mints a SECOND key for a
 * site that has not changed at all, and the adjudication earned under the old name is
 * orphaned. Step 3d's own don't-re-verify rule — "check whether that site already has a
 * non-UNVERIFIABLE comment from a previous cycle; if so, carry it forward and skip the
 * fetch" — is keyed on the exact scraper name, so a rename defeats it and the site gets
 * re-fetched as if it had never been checked.
 *
 * Found 2026-08-23 when the report showed Jackson County Parks & Recreation twice, once
 * MATCHES under `CivicRec-Parks-Eastern` and once UNVERIFIABLE under
 * `CivicRec-Parks-Eastern-jackson-county-ms`, with identical counts. Same site, same 115
 * events; only the name had moved. Measured across the store: 18 rename pairs, 16 of which
 * had traded a settled verdict (15 MATCHES, 1 MISMATCH) for UNVERIFIABLE.
 *
 * This matters more going forward than backward. Gate 6 counts 283 scraper names still to
 * migrate, and the two largest drift families — CivicRec-Parks-* and RecDeskParks-* — are
 * hundreds of sites each. Every one of those renames would discard its verdicts.
 *
 * WHAT COUNTS AS A RENAME: one scraper name is a strict prefix of the other, separated by a
 * hyphen — `CivicRec-Parks-Eastern` -> `CivicRec-Parks-Eastern-jackson-county-ms`. That is
 * exactly the "<registryKey>-<siteSlug>" migration CLAUDE.md prescribes. Two unrelated
 * scrapers that happen to cover one venue are NOT a rename and are left alone.
 *
 * WHAT IT WILL NOT DO: it never overwrites a settled verdict with another settled one. If
 * both keys are settled and they disagree, that is a real disagreement between two
 * adjudications and a person should look — it is reported and skipped. Only the
 * settled -> UNVERIFIABLE direction is carried, which is the direction the rename broke.
 */
function migrateRenamePairs(store) {
  const bySite = {};
  for (const key of Object.keys(store)) {
    const i = key.indexOf('|||');
    if (i < 0) continue;
    (bySite[key.slice(i + 3)] = bySite[key.slice(i + 3)] || []).push({ key, scraper: key.slice(0, i) });
  }

  const carried = [], conflicts = [], skipped = [];
  for (const [site, rows] of Object.entries(bySite)) {
    if (rows.length < 2) continue;
    for (let a = 0; a < rows.length; a++) {
      for (let b = a + 1; b < rows.length; b++) {
        const [x, y] = [rows[a], rows[b]];
        const xIsOlder = y.scraper.startsWith(x.scraper + '-');
        const yIsOlder = x.scraper.startsWith(y.scraper + '-');
        if (!xIsOlder && !yIsOlder) continue;           // not a rename
        const oldRow = xIsOlder ? x : y;
        const newRow = xIsOlder ? y : x;
        const oldV = store[oldRow.key], newV = store[newRow.key];
        if (!oldV || !newV) continue;

        if (oldV.verdict === 'UNVERIFIABLE') { skipped.push({ site, why: 'old key was never settled either' }); continue; }
        if (newV.verdict !== 'UNVERIFIABLE') {
          if (newV.verdict !== oldV.verdict) conflicts.push({ site, oldRow, newRow, oldV, newV });
          else skipped.push({ site, why: 'both already agree' });
          continue;
        }
        carried.push({ site, oldRow, newRow, oldV, newV });
      }
    }
  }

  console.log(`rename pairs found      : ${carried.length + conflicts.length + skipped.length}`);
  console.log(`  verdict to carry      : ${carried.length}`);
  console.log(`  CONFLICTING, skipped  : ${conflicts.length}`);
  console.log(`  nothing to do         : ${skipped.length}`);

  conflicts.forEach(c => {
    console.log(`  ⚠️ CONFLICT ${c.site}`);
    console.log(`       ${c.oldRow.scraper} -> ${c.oldV.verdict}`);
    console.log(`       ${c.newRow.scraper} -> ${c.newV.verdict}   (left for a human)`);
  });

  carried.forEach(c => {
    console.log(`  ${c.oldV.verdict.padEnd(11)} ${c.oldRow.scraper} -> ${c.newRow.scraper}   [${c.site}]`);
    if (!save) return;
    store[c.newRow.key] = {
      verdict: c.oldV.verdict,
      comment: `${c.oldV.comment} [carried forward 2026-08-23 from the pre-rename key "${c.oldRow.scraper}"; the site did not change, only the scraper name.]`,
      population: c.newV.population || c.oldV.population,
    };
    // The old key is the pre-rename form of the same site, so leaving it renders the site
    // twice in the report — which is how this was noticed. Git history keeps the old value.
    delete store[c.oldRow.key];
  });

  return { carried: carried.length, conflicts: conflicts.length };
}

function main() {
  const store = loadStore();

  if (validateOnly) {
    const problems = validateStore(store);
    console.log(`Store: ${Object.keys(store).length} entries`);
    if (problems.length) {
      console.error(`\nFAIL: ${problems.length} problem(s):`);
      problems.slice(0, 25).forEach(p => console.error('  - ' + p));
      process.exit(1);
    }
    const tally = {};
    Object.values(store).forEach(v => { tally[v.verdict] = (tally[v.verdict] || 0) + 1; });
    console.log('Valid. Verdicts:', JSON.stringify(tally));
    return;
  }

  if (migrateRenames) {
    const r = migrateRenamePairs(store);
    if (!save) { console.log('\nDry run — re-run with --save to write.'); return; }
    if (r.carried) {
      const problems = validateStore(store);
      if (problems.length) {
        console.error(`\nREFUSING TO WRITE: migration would corrupt the store (${problems.length} problem(s))`);
        problems.slice(0, 10).forEach(p => console.error('  - ' + p));
        process.exit(1);
      }
      fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
      console.log(`\nWrote ${STORE} — store now holds ${Object.keys(store).length} entries`);
    } else {
      console.log('\nNothing to write.');
    }
    return;
  }

  if (!POPULATIONS.includes(popArg)) {
    console.error(`--population= is required and must be one of: ${POPULATIONS.join(', ')}`);
    process.exit(1);
  }
  if (!files.length) {
    console.error('No input files given.');
    process.exit(1);
  }

  let added = 0, updated = 0, unchanged = 0, invalid = 0, dupes = 0;
  const seen = new Set();
  const samples = [];

  files.forEach(f => {
    const abs = path.isAbsolute(f) ? f : path.join(process.cwd(), f);
    if (!fs.existsSync(abs)) { console.warn(`  ! missing input, skipped: ${f}`); return; }
    const { rows, bad } = parseTuples(fs.readFileSync(abs, 'utf8'));
    invalid += bad.length;
    bad.forEach(b => console.warn(`  ! unparseable tuple in ${path.basename(f)}: ${b}`));
    console.log(`  ${path.basename(f)}: ${rows.length} tuples`);

    rows.forEach(([site, scraper, verdict, comment]) => {
      if (!site || !scraper || !VERDICTS.includes(verdict) || !String(comment).trim()) {
        invalid++;
        console.warn(`  ! rejected: ${JSON.stringify([site, scraper, verdict]).slice(0, 110)}`);
        return;
      }
      const key = scraper + '|||' + site;
      if (seen.has(key)) { dupes++; return; }
      seen.add(key);

      const prev = store[key];
      if (!prev) {
        added++;
        if (samples.length < 5) samples.push(`+ ${key} -> ${verdict}`);
      } else if (prev.verdict === verdict && prev.comment === comment) {
        unchanged++;
        return;
      } else {
        updated++;
        if (samples.length < 5) samples.push(`~ ${key} : ${prev.verdict} -> ${verdict}`);
      }
      store[key] = { verdict, comment: String(comment).trim(), population: popArg };
    });
  });

  const problems = validateStore(store);
  if (problems.length) {
    console.error(`\nFAIL: merge would produce ${problems.length} invalid entr(ies); nothing written.`);
    problems.slice(0, 15).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  console.log(`\nadded ${added}, updated ${updated}, unchanged ${unchanged}, duplicate-in-input ${dupes}, invalid ${invalid}`);
  samples.forEach(s => console.log('  ' + s));
  console.log(`store would hold ${Object.keys(store).length} entries`);

  if (!save) {
    console.log('\nDry run — re-run with --save to write.');
    return;
  }
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(store, null, 1));
  console.log(`\nWrote ${path.relative(ROOT, STORE)}`);
}

main();

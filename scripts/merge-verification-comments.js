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

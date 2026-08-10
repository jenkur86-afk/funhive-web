/**
 * Audit every db.collection(...).add() call site in scrapers/ for the
 * "duplicate counted as imported" miscount.
 *
 * The Firestore-compat .add() in helpers/supabase-adapter.js returns one of:
 *   { id }                        -> a real insert
 *   { id, skipped:true, ... }     -> rejected by flattenEvent (past/junk/etc)
 *   { id, duplicate:true }        -> 23505, row already existed. NOT an import.
 *
 * A call site is BUGGY if it increments a success counter / logs success
 * without distinguishing `duplicate`. It is OK if it checks `.duplicate`,
 * or if it ignores the return entirely AND keeps no counter (rare).
 *
 * Read-only. Prints a classification table.
 */
const fs = require('fs');
const path = require('path');

const DIRS = ['C:/dev/funhive-web/scrapers', 'C:/dev/funhive-web/scrapers/helpers'];
const files = [];
for (const d of DIRS) {
  for (const f of fs.readdirSync(d)) {
    if (f.endsWith('.js')) files.push(path.join(d, f));
  }
}

// match: <maybe assignment> db|admin....collection('events'|'activities').add(
const ADD_RE = /(?:(const|let|var)\s+(\w+)\s*=\s*)?await\s+[\w.]*\bcollection\(\s*['"](events|activities)['"]\s*\)\s*\.add\(/g;

const results = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  ADD_RE.lastIndex = 0;
  while ((m = ADD_RE.exec(src)) !== null) {
    const assignedVar = m[2] || null;
    const collection = m[3];
    const line = src.slice(0, m.index).split('\n').length;
    // window of following code where the result would be handled
    const after = src.slice(m.index, m.index + 1200);

    const checksDuplicate = /\.duplicate\b/.test(after);
    const checksSkipped = /\.skipped\b/.test(after);
    // does something get counted / logged as success right after?
    const countsSuccess = /(imported|saved|newCount|added|inserted|created|success)\s*\+\+|(\+\+\s*(imported|saved|newCount|added))|(imported|saved|newCount|added)\s*\+=\s*1/i.test(after)
      || /console\.log\([^)]*✅/.test(after);

    let verdict;
    if (checksDuplicate) verdict = 'OK-checks-duplicate';
    else if (!assignedVar && !countsSuccess) verdict = 'OK-no-counter';
    else if (countsSuccess) verdict = 'BUGGY-counts-duplicate-as-new';
    else verdict = 'REVIEW';

    results.push({
      file: path.basename(file), line, collection, assignedVar,
      checksDuplicate, checksSkipped, countsSuccess, verdict,
    });
  }
}

const byVerdict = {};
for (const r of results) (byVerdict[r.verdict] ||= []).push(r);

console.log(`Scanned ${files.length} files, found ${results.length} events/activities .add() call sites.\n`);
for (const v of Object.keys(byVerdict).sort()) {
  console.log(`${v}: ${byVerdict[v].length}`);
}

console.log('\n=== BUGGY (counts a duplicate as a new save) ===');
const buggy = byVerdict['BUGGY-counts-duplicate-as-new'] || [];
const buggyFiles = [...new Set(buggy.map(r => r.file))].sort();
for (const f of buggyFiles) {
  const rows = buggy.filter(r => r.file === f);
  console.log(`  ${f}  (${rows.map(r => r.collection + '@' + r.line).join(', ')})${rows.some(r=>r.checksSkipped)?'':'   [also ignores .skipped]'}`);
}
console.log(`\n  ${buggyFiles.length} distinct files.`);

const review = byVerdict['REVIEW'] || [];
if (review.length) {
  console.log('\n=== REVIEW (assigned result, no obvious counter) ===');
  [...new Set(review.map(r => r.file))].sort().forEach(f => console.log('  ' + f));
}

fs.writeFileSync(
  'C:/Users/jenku/AppData/Local/Temp/claude/C--dev-funhive-web/f695c6b9-27fa-45c5-bf0a-07462451bb9b/scratchpad/add-audit.json',
  JSON.stringify(results, null, 1)
);

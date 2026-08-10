/**
 * Codemod: stop counting a {duplicate:true} .add() result as a new import.
 *
 * WHY (measured 2026-08-10): the Firestore-compat .add() in
 * helpers/supabase-adapter.js returns { id, duplicate:true } when the insert
 * hits a 23505 — the row already existed, nothing was written. 93 of the 96
 * events/activities .add() call sites branched only on `.skipped`, so every
 * duplicate fell into the success branch and incremented the scraper's
 * "imported" counter. That inflated the NEW column fleet-wide and, worse,
 * hid real data loss whenever distinct events collapsed onto one stable id:
 * Dorchester-County reported "Found 12, New 12" for months while writing
 * nothing at all.
 *
 * TRANSFORM — inserts a branch between the skipped and success branches:
 *
 *     if (res.skipped) { ... }
 *   + } else if (res.duplicate) {
 *   +   <counter>++;            // only when provably in scope
 *   + }
 *     else { ...success...; imported++; }
 *
 * SAFETY: the duplicate branch increments a counter ONLY when a `let`/`var`
 * declaration for it is found between the enclosing function's opening brace
 * and the call site (real brace-walk, not a window heuristic). Otherwise the
 * branch is left empty — that still fixes the miscount, because the point is
 * to keep `imported` truthful; under-reporting duplicates is harmless, while
 * referencing an out-of-scope identifier would be a runtime ReferenceError
 * that `node -c` cannot catch.
 *
 * Dry run by default; --save to write. Every touched file is syntax-checked.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SAVE = process.argv.includes('--save');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

const DIRS = [
  path.resolve(__dirname, '..', 'scrapers'),
  path.resolve(__dirname, '..', 'scrapers', 'helpers'),
];

const ADD_RE = /(?:(?:const|let|var)\s+(\w+)\s*=\s*)?await\s+[\w.]*\bcollection\(\s*['"](?:events|activities)['"]\s*\)\s*\.add\(/g;

/** Walk backwards from `idx` to the opening brace of the enclosing function body. */
function enclosingFunctionStart(src, idx) {
  let depth = 0;
  for (let i = idx; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        // Is this brace a FUNCTION body? `for (...)`, `if (...)` and `while (...)`
        // also end in `)`, so requiring a closing paren alone stops the walk at
        // the innermost loop and misses function-level counter declarations —
        // that bug made the first run of this codemod find 0 counters in scope.
        // Require an actual `function` keyword or an arrow.
        const before = src.slice(Math.max(0, i - 200), i);
        const isFunctionBrace = /=>\s*$/.test(before) || /\bfunction\b[^{}]*\)\s*$/.test(before);
        if (isFunctionBrace) return i;
        // not a function brace (if/for/try/while) — keep walking outward
      } else depth--;
    }
  }
  return 0;
}

/** Is `name` declared with let/var between the enclosing function start and idx? */
function declaredInScope(src, idx, name) {
  const start = enclosingFunctionStart(src, idx);
  const region = src.slice(start, idx);
  const re = new RegExp(`\\b(?:let|var)\\b[^;\\n]*\\b${name}\\b\\s*(?:=|,|;)`);
  return re.test(region);
}

const CANDIDATE_COUNTERS = ['skipped', 'duplicates', 'dupes', 'totalSkipped', 'skippedCount'];

const files = [];
for (const d of DIRS) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) files.push(path.join(d, f));
}

let changedFiles = 0, changedSites = 0, withCounter = 0, emptyBranch = 0;
const report = [];

for (const file of files) {
  if (ONLY && !file.includes(ONLY)) continue;
  let src = fs.readFileSync(file, 'utf8');
  const original = src;
  let fileSites = 0;

  // Re-scan from scratch after each edit, since indices shift.
  let guard = 0;
  for (;;) {
    if (++guard > 50) break;
    ADD_RE.lastIndex = 0;
    let m, target = null;
    while ((m = ADD_RE.exec(src)) !== null) {
      const varName = m[1];
      if (!varName) continue;
      const after = src.slice(m.index, m.index + 900);
      if (new RegExp(`\\b${varName}\\.duplicate\\b`).test(after)) continue; // already handled
      const ifRe = new RegExp(`if\\s*\\(\\s*${varName}\\.skipped\\s*\\)\\s*\\{`);
      const ifM = after.match(ifRe);
      if (!ifM) continue;
      target = { addIdx: m.index, varName, ifIdx: m.index + after.indexOf(ifM[0]) };
      break;
    }
    if (!target) break;

    // Find the matching close brace of the if-block, then require an `else {`.
    const openIdx = src.indexOf('{', target.ifIdx);
    let depth = 0, closeIdx = -1;
    for (let i = openIdx; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) { closeIdx = i; break; } }
    }
    if (closeIdx === -1) break;
    const tail = src.slice(closeIdx + 1, closeIdx + 40);
    const elseM = tail.match(/^(\s*)else\s*\{/);
    if (!elseM) break; // shape we don't handle; leave alone

    // indentation of the `if (res.skipped)` line
    const lineStart = src.lastIndexOf('\n', target.ifIdx) + 1;
    const indent = src.slice(lineStart, target.ifIdx).match(/^\s*/)[0];

    let counter = null;
    for (const c of CANDIDATE_COUNTERS) {
      if (declaredInScope(src, target.addIdx, c)) { counter = c; break; }
    }

    const body = counter
      ? `${indent}  ${counter}++;\n`
      : `${indent}  // no duplicate counter in scope — the point is that this is NOT an import\n`;

    const insert =
      ` else if (${target.varName}.duplicate) {\n` +
      `${indent}  // 23505: the row already existed, nothing was written. Counting this as\n` +
      `${indent}  // an import is what let collapsed-id scrapers report healthy NEW counts\n` +
      `${indent}  // while saving nothing (see SCRAPER-FIX-LOG.jsonl 2026-08-10).\n` +
      body +
      `${indent}}`;

    src = src.slice(0, closeIdx + 1) + insert + src.slice(closeIdx + 1);
    fileSites++; changedSites++;
    if (counter) withCounter++; else emptyBranch++;
    report.push({ file: path.basename(file), varName: target.varName, counter: counter || '(none)' });
  }

  if (src !== original) {
    changedFiles++;
    if (SAVE) {
      fs.writeFileSync(file, src);
      try {
        execFileSync(process.execPath, ['-c', file], { stdio: 'pipe' });
      } catch (e) {
        fs.writeFileSync(file, original);
        console.error(`  ❌ SYNTAX FAIL, reverted: ${path.basename(file)}`);
        console.error(String(e.stderr || e.message).split('\n').slice(0, 4).join('\n'));
      }
    }
  }
}

console.log(`${SAVE ? 'APPLIED' : 'DRY RUN'}: ${changedSites} sites across ${changedFiles} files`);
console.log(`  with duplicate counter: ${withCounter}`);
console.log(`  empty branch (no counter in scope): ${emptyBranch}`);
const byCounter = {};
report.forEach(r => byCounter[r.counter] = (byCounter[r.counter] || 0) + 1);
console.log('  counters used:', JSON.stringify(byCounter));
if (!SAVE) console.log('\nRe-run with --save to write.');

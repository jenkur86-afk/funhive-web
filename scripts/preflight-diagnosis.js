#!/usr/bin/env node
/**
 * PREFLIGHT for the funhive-scraper-diagnosis task. Run this FIRST, before Step 1.
 *
 * WHY THIS EXISTS
 * ---------------
 * The diagnosis routine is thorough about diagnosing scrapers and had no way at all to
 * notice when its OWN pipeline was broken. On 2026-08-16, three of the four bugs found
 * that day were in the audit tooling rather than in any scraper:
 *
 *   - build-age-range-audit.js emitted `Link` in column 3 plus an extra `Other` column.
 *     generate-site-report.js matches the header `Site | Scraper | All Ages` and reads a
 *     fixed 10 columns, so a section built by that script contributed ZERO rows to the
 *     HTML report. Nothing errored. It was caught only because someone happened to notice
 *     the report's row count had not moved after appending 2,547 rows.
 *   - build-library-site-audit.js kept the verb from "Scraping: {venue}" log lines, so 38
 *     site names could not join to their config entry or to a prior verdict.
 *   - The same class had already bitten before: see the comment at loadLibraries() about
 *     expectedCols being 4 rather than 5, where requiring the optional Link column
 *     silently dropped 622 rows from the 2026-08-10 section alone.
 *
 * The common shape is a PRODUCER and a CONSUMER that disagree about a format, where the
 * consumer's response to disagreement is to quietly parse nothing. This script asserts
 * those contracts up front so the run fails loudly instead of producing a plausible
 * report built on no data.
 *
 * HOW THE CONTRACT CHECK WORKS
 * ----------------------------
 * Both sides are re-derived from the real source files on every run — the expected header
 * is never hardcoded here. Hardcoding it would just create a third copy to drift.
 *   producer: the header literal each builder emits
 *   consumer: the (headerRegex, expectedCols) pairs passed to tableRows() in the report
 *   plus:     the newest dated section of each audit file, parsed for real
 *
 * WHAT THIS CANNOT CHECK
 * ----------------------
 * Harness tool permissions. On 2026-08-16 every Edit/Write tool call against the repo was
 * denied while Bash still worked, so the whole first pass produced a diagnosis and fixed
 * nothing. A Node script cannot detect that: fs.writeFileSync bypasses the tool layer
 * entirely and succeeds. The write check below covers real filesystem problems only
 * (read-only checkout, disk full, locked file). Detecting a harness denial requires the
 * agent to attempt one throwaway Edit via its own tool before starting — that probe lives
 * in the task file, not here.
 *
 * Usage:
 *   node scripts/preflight-diagnosis.js
 *   node scripts/preflight-diagnosis.js --skip-db     # offline / sandbox
 *   node scripts/preflight-diagnosis.js --json
 *
 * Exit codes: 0 = no FAILs (WARNs allowed), 1 = at least one FAIL. Treat 1 as
 * "stop and report this as the headline", not as something to work around.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SKIP_DB = args.includes('--skip-db');
const AS_JSON = args.includes('--json');

const HEARTBEAT_MAX_AGE_DAYS = 2;   // matches Step 0.3 of the task file

const results = [];
const record = (status, check, detail) => results.push({ status, check, detail });
const pass = (c, d) => record('PASS', c, d);
const warn = (c, d) => record('WARN', c, d);
const fail = (c, d) => record('FAIL', c, d);

// ---------------------------------------------------------------- shared with the report
// Lifted from generate-site-report.js at runtime rather than copied, so column counting
// here cannot drift from column counting there. That file calls main() at module scope,
// so it cannot simply be require()d — see the same note in project-status.js.
const REPORT_SRC_PATH = path.join(ROOT, 'scripts', 'generate-site-report.js');

function loadReportHelpers(src) {
  const cellsFn = src.match(/function cells\(line\)[\s\S]*?\n}/);
  if (!cellsFn) throw new Error('could not extract cells() from generate-site-report.js');
  const sepFn = src.match(/function isSeparator\(line\)[\s\S]*?\n}/);
  if (!sepFn) throw new Error('could not extract isSeparator() from generate-site-report.js');
  const scope = {};
  new Function('exports', `${cellsFn[0]}\n${sepFn[0]}\nexports.cells = cells; exports.isSeparator = isSeparator;`)(scope);
  return scope;
}

/** Every tableRows(md, /re/, N, ...) call site, tagged with its enclosing function. */
function consumerContracts(src) {
  const out = [];
  const re = /tableRows\(\s*md\s*,\s*\/((?:[^/\\]|\\.)+)\/([a-z]*)\s*,\s*(\d+)/g;
  let m;
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index);
    const fnMatch = [...before.matchAll(/function\s+(\w+)\s*\(/g)].pop();
    out.push({
      fn: fnMatch ? fnMatch[1] : '(unknown)',
      headerRe: new RegExp(m[1], m[2]),
      source: `/${m[1]}/${m[2]}`,
      expectedCols: parseInt(m[3], 10)
    });
  }
  return out;
}

/** The first header literal a builder emits — `out.push(\`| A | B | ... |\`)`. */
function producerHeader(builderSrc) {
  const m = builderSrc.match(/out\.push\(`(\|[^`]*\|)`\)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------- checks
function checkWritable() {
  const probe = path.join(ROOT, '.preflight-write-probe.tmp');
  try {
    fs.writeFileSync(probe, `preflight ${new Date().toISOString()}\n`, 'utf8');
    const back = fs.readFileSync(probe, 'utf8');
    fs.unlinkSync(probe);
    if (!back.startsWith('preflight')) throw new Error('readback mismatch');
    pass('filesystem writable', 'wrote, read back and removed a probe file in the repo root');
  } catch (e) {
    try { fs.unlinkSync(probe); } catch (_) {}
    fail('filesystem writable', `${e.message} — repo may be read-only, full, or locked`);
  }
}

function checkHeartbeat() {
  const file = path.join(ROOT, 'AGE-RANGE-AUDIT.md');
  if (!fs.existsSync(file)) return fail('audit heartbeat', 'AGE-RANGE-AUDIT.md not found');
  // Step 3c writes a dated section on EVERY run including clean ones, which is what makes
  // this a heartbeat. SCRAPER-FIX-LOG.jsonl is not usable for this: a day with nothing to
  // fix correctly produces no entry.
  const md = fs.readFileSync(file, 'utf8');
  const dates = (md.match(/^##\s+(20\d{2}-\d{2}-\d{2})/gm) || [])
    .map(h => h.match(/20\d{2}-\d{2}-\d{2}/)[0]).sort();
  if (!dates.length) return fail('audit heartbeat', 'no dated "## YYYY-MM-DD" section headings found');
  const newest = dates[dates.length - 1];
  const ageDays = Math.floor((Date.now() - Date.parse(newest + 'T00:00:00Z')) / 86400000);
  const detail = `newest section ${newest} (${ageDays}d old)`;
  if (ageDays > HEARTBEAT_MAX_AGE_DAYS) {
    fail('audit heartbeat', `${detail} — runs were MISSED; report the gap as the first line of the run report, and note the affected cycles have holes that will not backfill`);
  } else {
    pass('audit heartbeat', detail);
  }
}

function checkContracts() {
  if (!fs.existsSync(REPORT_SRC_PATH)) return fail('builder/report contracts', 'generate-site-report.js not found');
  const reportSrc = fs.readFileSync(REPORT_SRC_PATH, 'utf8');

  let helpers, consumers;
  try {
    helpers = loadReportHelpers(reportSrc);
    consumers = consumerContracts(reportSrc);
  } catch (e) {
    return fail('builder/report contracts', `${e.message} — the report's parser was refactored; update this preflight to match`);
  }
  if (!consumers.length) {
    return fail('builder/report contracts', 'found no tableRows() call sites to derive contracts from');
  }

  const colCount = line => helpers.cells(line).length;

  const BUILDERS = [
    { name: 'age-range', builder: 'scripts/build-age-range-audit.js', audit: 'AGE-RANGE-AUDIT.md' },
    { name: 'library-site', builder: 'scripts/build-library-site-audit.js', audit: 'LIBRARY-SITE-AUDIT.md' }
  ];

  for (const b of BUILDERS) {
    const bPath = path.join(ROOT, b.builder);
    if (!fs.existsSync(bPath)) { fail(`${b.name}: builder present`, `${b.builder} not found`); continue; }

    const header = producerHeader(fs.readFileSync(bPath, 'utf8'));
    if (!header) { fail(`${b.name}: header readable`, `no table header literal found in ${b.builder}`); continue; }

    const matched = consumers.filter(c => c.headerRe.test(header));
    if (!matched.length) {
      fail(`${b.name}: header matches report parser`,
        `${b.builder} emits "${header}" which matches NO tableRows() header regex ` +
        `(${consumers.map(c => c.source).join(', ')}) — sections it builds would contribute ZERO rows, silently`);
      continue;
    }
    const c = matched[0];
    const have = colCount(header);
    if (have < c.expectedCols) {
      fail(`${b.name}: column count`,
        `${b.builder} emits ${have} columns but ${c.fn}() requires >= ${c.expectedCols}; rows would be dropped`);
    } else {
      pass(`${b.name}: builder -> ${c.fn}()`, `header matches ${c.source}, ${have} cols >= ${c.expectedCols} required`);
    }

    // End-to-end on REAL data: does the newest dated section actually yield rows?
    // This is the check that would have caught 2026-08-16 directly, and it also covers
    // hand-written sections, which no source-level check can see.
    const aPath = path.join(ROOT, b.audit);
    if (!fs.existsSync(aPath)) { warn(`${b.name}: newest section parses`, `${b.audit} not found`); continue; }
    const md = fs.readFileSync(aPath, 'utf8');
    const heads = [...md.matchAll(/^##\s+(20\d{2}-\d{2}-\d{2})/gm)];
    if (!heads.length) { warn(`${b.name}: newest section parses`, `no dated sections in ${b.audit}`); continue; }
    const last = heads[heads.length - 1];
    const section = md.slice(last.index);
    let rows = 0, inTable = false;
    for (const line of section.split(/\r?\n/)) {
      if (!line.startsWith('|')) { inTable = false; continue; }
      if (!inTable) { if (c.headerRe.test(line)) inTable = true; continue; }
      if (helpers.isSeparator(line)) continue;
      if (helpers.cells(line).length >= c.expectedCols) rows++;
    }
    if (rows === 0) {
      fail(`${b.name}: newest section parses`,
        `${b.audit} section "${last[1]}" yields 0 rows under ${c.fn}() — that section is invisible to the report`);
    } else {
      pass(`${b.name}: newest section parses`, `${b.audit} "${last[1]}" -> ${rows} rows`);
    }
  }
}

async function checkDatabase() {
  if (SKIP_DB) return warn('database reachable', 'skipped (--skip-db)');
  try {
    const { supabase } = require(path.join(ROOT, 'scrapers', 'helpers', 'supabase-adapter'));
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error) return fail('database reachable', error.message);
    pass('database reachable', 'events responded to a 1-row probe');
  } catch (e) {
    fail('database reachable', e.message);
  }
}

// ---------------------------------------------------------------- main
(async () => {
  checkWritable();
  checkHeartbeat();
  checkContracts();
  await checkDatabase();

  const fails = results.filter(r => r.status === 'FAIL');
  const warns = results.filter(r => r.status === 'WARN');

  if (AS_JSON) {
    console.log(JSON.stringify({ ok: fails.length === 0, results }, null, 2));
  } else {
    console.log('\n=== DIAGNOSIS PREFLIGHT ===\n');
    const icon = { PASS: 'ok  ', WARN: 'WARN', FAIL: 'FAIL' };
    for (const r of results) console.log(`  [${icon[r.status]}] ${r.check}\n           ${r.detail}`);
    console.log('');
    if (fails.length) {
      console.log(`${fails.length} FAIL, ${warns.length} WARN — STOP. Report the failure(s) above as the`);
      console.log('headline of this run. A diagnosis produced on a broken pipeline looks identical');
      console.log('to a healthy one, which is the whole reason this check exists.\n');
    } else {
      console.log(`All checks passed${warns.length ? ` (${warns.length} warning)` : ''}. Proceed to Step 1.\n`);
    }
  }
  // Set exitCode rather than calling process.exit(). On Windows, exiting while the
  // Supabase client still has a handle closing trips a libuv assertion in async.c and
  // the process dies with 127 — which would make a fully PASSING preflight look like a
  // hard failure and defeat the entire point of this script. Setting exitCode lets node
  // drain its handles and exit on its own with the right code.
  process.exitCode = fails.length ? 1 : 0;
})();

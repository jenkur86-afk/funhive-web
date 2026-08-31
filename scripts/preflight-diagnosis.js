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
// 30h, not 24: FunHive-DataQuality runs daily at 1:00 PM and this preflight runs at
// 2:12 PM, so a healthy gap is ~23h. A 24h threshold would warn on every normal run.
const DQ_MAX_AGE_HOURS = 30;

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

// Did a ROTATION actually start today, and which recent days lost theirs?
//
// WHY THE EXISTING GUARDS CANNOT SEE THIS (diagnosed 2026-08-31)
// --------------------------------------------------------------
// Step 1's staleness guard is "if the newest line in scraper-summary.log is more than
// 24h old, the nightly task did not run". That guard is ANTI-CORRELATED with the failure
// it needs to catch. A rotation now takes ~26h (11.4h of regular scrapers + ~15h of the
// MacaroniKid tail) against a 24h trigger interval, and FunHive-Scrapers is registered
// MultipleInstances=IgnoreNew — so when a run overruns, the next day's trigger is
// DISCARDED SILENTLY while the overrunning run keeps writing fresh log lines. The very
// condition that drops a rotation guarantees the log looks healthy.
//
// Measured on 2026-08-29: the newest summary line was timestamped 18:36:16Z, minutes
// before the diagnosis ran, so the guard passed — but those lines were the 2026-08-28
// Group 1 run finishing at 08:43Z plus hand re-runs, and Group 2's calendar turn that
// day never happened. The gap went unreported for two more days.
//
// The fix is to stop inferring from log freshness and read the fact directly: the runner
// prints "Running Group N scrapers" exactly once per rotation, into a per-day log. A day
// with no such line had no rotation, whatever else is in the logs. No threshold, no
// duration assumption — just which days have the line and which do not.
//
// WARN, never FAIL, matching checkDataQualityFreshness(): a dropped rotation makes the
// DATA stale, not the diagnosis invalid. The audits, verification and report are all
// still worth doing — and failing here would halt the run on precisely the day the
// report is most needed.
const ROTATION_LOOKBACK_DAYS = 7;

function checkRotationStarted() {
  const logDir = path.join(ROOT, 'scrapers', 'logs');
  const groupRe = /Running Group (\d) scrapers/;

  const days = [];
  for (let i = 0; i < ROTATION_LOOKBACK_DAYS; i++) {
    const d = new Date(Date.now() - i * 86400000);
    // Local date: run-scrapers.bat names the log from the machine's own calendar day.
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const file = path.join(logDir, `scraper-run-${key}.log`);
    let group = null;
    if (fs.existsSync(file)) {
      const m = fs.readFileSync(file, 'utf8').match(groupRe);
      if (m) group = Number(m[1]);
    }
    days.push({ key, group, isToday: i === 0 });
  }

  const missing = days.filter(d => d.group === null);
  const ran = days.filter(d => d.group !== null);
  const today = days[0];
  const summary = days.map(d => `${d.key}=${d.group === null ? 'NONE' : 'G' + d.group}`).join(' ');

  if (today.group === null) {
    warn('rotation started today',
      `NO "Running Group N" line in scraper-run-${today.key}.log — today's rotation never started. ` +
      `Do NOT read a fresh scraper-summary.log as evidence it did: an overrunning run from a ` +
      `previous day keeps writing to it. Last ${ROTATION_LOOKBACK_DAYS} days: ${summary}`);
  } else {
    pass('rotation started today', `Group ${today.group} started (last ${ROTATION_LOOKBACK_DAYS} days: ${summary})`);
  }

  // Even when today is fine, a day missing from the window is a dropped rotation whose
  // group has now waited 6 days instead of 3. Report it separately so it is not lost
  // behind a green "today started" line.
  if (missing.length && today.group !== null) {
    warn('recent rotations all started',
      `${missing.length} of the last ${ROTATION_LOOKBACK_DAYS} days had NO rotation: ` +
      `${missing.map(d => d.key).join(', ')} — each is a dropped turn, and the group that ` +
      `lost it waits 6 days instead of 3. See ROTATION-STARVATION-LOG.md`);
  }

  // Which groups are actually behind, from the runner's own completion bookkeeping.
  const stateFile = path.join(logDir, 'group-last-run.json');
  if (!fs.existsSync(stateFile)) {
    warn('rotation groups current', 'scrapers/logs/group-last-run.json not found — cannot tell which group is starved');
    return;
  }
  let state;
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch (e) { return warn('rotation groups current', `group-last-run.json unreadable: ${e.message}`); }

  const ages = [1, 2, 3].map(g => {
    const last = state[String(g)];
    return { g, days: last ? (Date.now() - Date.parse(last)) / 86400000 : null };
  });
  const detail = ages.map(a => `G${a.g}=${a.days === null ? '?' : a.days.toFixed(1) + 'd'}`).join(' ');
  // A group's turns are 3 days apart and a run can take over a day, so ~4.2d is the
  // healthiest a lagging group legitimately reaches. Past 4.5d it has missed a turn.
  const behind = ages.filter(a => a.days !== null && a.days > 4.5);
  const groupsSeen = new Set(ran.map(d => d.group));
  const neverRan = [1, 2, 3].filter(g => !groupsSeen.has(g));

  if (behind.length) {
    warn('rotation groups current',
      `${behind.map(a => `Group ${a.g} has not completed in ${a.days.toFixed(1)} days`).join('; ')} ` +
      `(${detail}). Report this and check ROTATION-STARVATION-LOG.md before treating it as a normal mid-cycle gap.`);
  } else if (neverRan.length && ran.length >= ROTATION_LOOKBACK_DAYS - 1) {
    warn('rotation groups current',
      `Group(s) ${neverRan.join(', ')} did not run at all in the last ${ROTATION_LOOKBACK_DAYS} days (${detail})`);
  } else {
    pass('rotation groups current', detail);
  }
}

// The data-quality pass is the one scheduled dependency with no other alarm on it.
// Between 2026-08-12 and 2026-08-22 it did not run at ALL for ten days and nothing
// noticed: it was chained onto the end of run-scrapers.bat, rotations grew past the
// 12h ExecutionTimeLimit, Task Scheduler killed the batch before it reached that line,
// and the detached node child still finished the scrape — so every scraper table looked
// healthy while 8,206 stale/junk rows piled up behind them. It now owns its own task
// (FunHive-DataQuality, daily 1:00 PM), but a task can stop firing too, so check the
// artifact rather than trusting the schedule.
//
// WARN, never FAIL: a stale data-quality pass makes the DB dirty, not the diagnosis
// invalid. The rest of this run is still worth doing — it just needs saying out loud.
function checkDataQualityFreshness() {
  const file = path.join(ROOT, 'scrapers', 'logs', 'fix-all-recent.log');
  if (!fs.existsSync(file)) {
    return warn('data-quality pass ran recently', 'scrapers/logs/fix-all-recent.log not found — has FunHive-DataQuality ever run?');
  }
  const ageHours = (Date.now() - fs.statSync(file).mtimeMs) / 3600000;
  const detail = `fix-all-recent.log last written ${ageHours.toFixed(1)}h ago`;
  if (ageHours > DQ_MAX_AGE_HOURS) {
    warn('data-quality pass ran recently',
      `${detail} — expected daily. Check the TASK before the data: ` +
      `Get-ScheduledTaskInfo -TaskName FunHive-DataQuality | Select LastRunTime,LastTaskResult ` +
      `(267014 = SCHED_S_TASK_TERMINATED, it hit its time limit). Report this in the run report.`);
  } else {
    pass('data-quality pass ran recently', detail);
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
  checkRotationStarted();
  checkDataQualityFreshness();
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

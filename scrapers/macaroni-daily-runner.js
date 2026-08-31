#!/usr/bin/env node

/**
 * MACARONI DAILY RUNNER — entry point for the FunHive-Macaroni scheduled task.
 *
 * WHY THIS FILE EXISTS (2026-08-31 — ROTATION-STARVATION-LOG.md, Layer 2)
 * -----------------------------------------------------------------------
 * The MacaroniKid pass used to run as the TAIL of the nightly rotation inside
 * local-scraper-runner.js. That welded a ~15h MacaroniKid Group 1 pass onto an
 * ~11h regular pass — a ~26h task against a 24h trigger with
 * MultipleInstances=IgnoreNew and StartWhenAvailable=False, so every Group 1
 * run silently DELETED the next day's rotation (2026-08-26 and 2026-08-29 had
 * no rotation at all; Group 2 went 5-6 days between runs instead of 3).
 *
 * MacaroniKid is now its own task (FunHive-Macaroni, daily 3:00 PM), so a long
 * MacaroniKid run can delay the next rotation but can never delete it: the
 * rotation task's own duration is back under its trigger interval, and the two
 * tasks serialize on helpers/run-lock.js — the waiter runs LATE instead of
 * never, which is the whole point of the redesign.
 *
 * What this file owns:
 *   - MacaroniKid group selection: calendar day + starvation catch-up against
 *     macaroni-last-run.json (SEPARATE from the rotation's group-last-run.json
 *     — see group-catchup.js header for the 2026-08-31 completion semantics).
 *   - The already-ran-recently guard, so a manual run plus the scheduled
 *     trigger cannot burn ~15h re-scraping the same group twice in a day.
 *   - Acquiring the runner mutex (skipped with --no-lock when invoked by a
 *     parent that already holds it, e.g. local-scraper-runner --all).
 *   - Spawning macaroni-runner-group{N}.js and recording completion from its
 *     RESULTS FILE, not its exit code: the group runners exit non-zero when
 *     any state failed, but a fresh results file proves the state loop reached
 *     its natural end — which is what "completion" means. A crash mid-loop
 *     writes no fresh results file and the group stays marked starved.
 *
 * Usage:
 *   node macaroni-daily-runner.js                # scheduled path: pick group, lock, run
 *   node macaroni-daily-runner.js --group 2      # manual catch-up of a specific group
 *   node macaroni-daily-runner.js --no-lock      # caller already holds the runner lock
 *   node macaroni-daily-runner.js --dry-run      # show what would run, run nothing
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { getDayGroup } = require('./scraper-registry');
const { selectGroup, recordGroupCompletion, readState, MACARONI_STATE_FILE } = require('./helpers/group-catchup');
const { acquireRunLock } = require('./helpers/run-lock');
const { logSummary } = require('./helpers/scraper-summary-logger');

const LOG_FILE = path.join(__dirname, 'logs', `macaroni-daily-${new Date().toISOString().split('T')[0]}.log`);

// Re-running a ~15h group the same day is pure waste (dedup upserts make it
// harmless to the data, expensive to the machine). 20h rather than 24h so a
// trigger that fires slightly earlier than yesterday's still runs.
const RECENT_COMPLETION_HOURS = 20;

function log(message, level = 'info') {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (err) { /* logging must never kill the run */ }
}

function parseArgs(argv) {
  const options = { group: null, noLock: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--group' && argv[i + 1]) options.group = parseInt(argv[++i], 10);
    else if (argv[i] === '--no-lock') options.noLock = true;
    else if (argv[i] === '--dry-run') options.dryRun = true;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  log('='.repeat(60));
  log('🍝 FunHive MacaroniKid Daily Runner');
  log('='.repeat(60));

  // ── Pick the group ────────────────────────────────────────────────────────
  let group;
  if (options.group) {
    if (![1, 2, 3].includes(options.group)) {
      log(`❌ Invalid --group ${options.group}. Must be 1, 2, or 3.`, 'error');
      process.exit(1);
    }
    group = options.group;
    log(`📅 Explicit --group ${group}`);
  } else {
    const dayOfMonth = new Date().getDate();
    const calendarGroup = getDayGroup(dayOfMonth);
    const selection = selectGroup(calendarGroup, new Date(), MACARONI_STATE_FILE);
    group = selection.group;
    if (group !== calendarGroup) {
      log(`📅 Today is day ${dayOfMonth} → calendar Group ${calendarGroup}`);
      log(`🔁 CATCH-UP (macaroni ledger): ${selection.reason}`);
    } else {
      log(`📅 Today is day ${dayOfMonth} → Group ${group}`);
    }
  }

  // ── Already-ran-recently guard ────────────────────────────────────────────
  // macaroni-last-run.json is the authoritative ledger. group-last-run.json is
  // deliberately NOT consulted in steady state: under post-split semantics it
  // records the REGULAR rotation only, which finishes hours before this task's
  // trigger every single day — reading it here would make this guard skip
  // every scheduled MacaroniKid run forever.
  const macState = readState(MACARONI_STATE_FILE);
  let last = macState[String(group)];

  // TRANSITION SHIM — delete after 2026-09-02. The rotation that started
  // 2026-08-31T07:00Z runs PRE-split code from memory: it finishes its
  // MacaroniKid Group 1 tail on the morning of 2026-09-01 and records that
  // combined completion into group-last-run.json ONLY (macaroni-last-run.json
  // does not exist for it). Without this shim, the first FunHive-Macaroni
  // trigger that afternoon would see a stale macaroni ledger and re-run Group
  // 1's ~15h pass the same day it actually completed. The window is exact and
  // self-expiring: only a group-1 timestamp between the split deploy and end
  // of 2026-09-01 can have been written by that final pre-split run.
  if (group === 1 && !options.group) {
    const rotState = readState();
    const g1 = rotState['1'] ? new Date(rotState['1']).getTime() : 0;
    const windowStart = Date.parse('2026-08-31T20:00:00Z');
    const windowEnd = Date.parse('2026-09-02T00:00:00Z');
    if (g1 > windowStart && g1 < windowEnd && (!last || g1 > new Date(last).getTime())) {
      log(`🔀 Transition: treating pre-split combined completion ${rotState['1']} as Group 1 MacaroniKid completion`);
      last = rotState['1'];
    }
  }

  if (last) {
    const hours = (Date.now() - new Date(last).getTime()) / 3600000;
    if (hours < RECENT_COMPLETION_HOURS) {
      log(`⏭️  Group ${group} MacaroniKid completed ${hours.toFixed(1)}h ago (< ${RECENT_COMPLETION_HOURS}h) — skipping to avoid a same-day duplicate run.`);
      logSummary(`🍝 MacaroniKid daily: Group ${group} skipped — completed ${hours.toFixed(1)}h ago`);
      process.exit(0);
    }
  }

  if (options.dryRun) {
    log(`[DRY RUN] Would acquire runner lock${options.noLock ? ' (skipped: --no-lock)' : ''} and run macaroni-runner-group${group}.js`);
    process.exit(0);
  }

  // ── Serialize against the rotation ────────────────────────────────────────
  let releaseLock = null;
  if (!options.noLock) {
    try {
      releaseLock = await acquireRunLock('macaroni-daily-runner', { log: (m) => log(m) });
      process.on('exit', releaseLock);
    } catch (err) {
      // Loud, non-zero, in both this log and the summary log — a silent exit
      // here would recreate the invisible-drop bug this design removes.
      log(`💥 ${err.message}`, 'error');
      logSummary(`❌ MacaroniKid daily: Group ${group} DID NOT RUN — ${err.message}`);
      process.exit(1);
    }
  } else {
    log('🔗 --no-lock: caller holds the runner lock');
  }

  // ── Run the group ─────────────────────────────────────────────────────────
  const scriptPath = path.join(__dirname, `macaroni-runner-group${group}.js`);
  if (!fs.existsSync(scriptPath)) {
    log(`❌ MacaroniKid runner not found: ${scriptPath}`, 'error');
    process.exit(1);
  }

  log(`🚀 Spawning macaroni-runner-group${group}.js`);
  const spawnStartedAt = Date.now();
  const result = spawnSync(process.execPath, [scriptPath], { cwd: __dirname, stdio: 'inherit' });

  if (result.error) {
    log(`❌ Failed to launch macaroni-runner-group${group}.js: ${result.error.message}`, 'error');
    process.exit(1);
  }
  log(`${result.status === 0 ? '✅' : '⚠️'} macaroni-runner-group${group}.js exited with code ${result.status}`);

  // ── Record completion — from the results file, not the exit code ──────────
  // (See header. The group runners write logs/macaroni-group{N}-results.json
  // right before exiting IF their state loop ran to the end; the freshness
  // check rejects a stale file from a previous night.)
  const resultsPath = path.join(__dirname, 'logs', `macaroni-group${group}-results.json`);
  let completed = false;
  try {
    const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    if (new Date(raw.finishedAt).getTime() >= spawnStartedAt) {
      completed = true;
      const ok = Array.isArray(raw.success) ? raw.success.length : 0;
      const bad = Array.isArray(raw.failed) ? raw.failed.length : 0;
      log(`📒 Results file fresh: ${ok} state(s) succeeded, ${bad} failed — recording Group ${group} MacaroniKid completion`);
    } else {
      log(`⚠️ ${path.basename(resultsPath)} is stale (finishedAt ${raw.finishedAt}) — NOT recording completion; group stays eligible for catch-up`, 'error');
    }
  } catch (err) {
    log(`⚠️ Could not read ${path.basename(resultsPath)}: ${err.message} — NOT recording completion; group stays eligible for catch-up`, 'error');
  }
  if (completed) {
    recordGroupCompletion(group, new Date(), MACARONI_STATE_FILE);
  }

  process.exit(result.status === 0 && completed ? 0 : 1);
}

main().catch((err) => {
  log(`💥 Fatal: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});

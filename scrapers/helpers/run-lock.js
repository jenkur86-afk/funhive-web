/**
 * run-lock.js — one mutex for every full-group runner process.
 *
 * WHY THIS EXISTS (2026-08-31, rotation-starvation Layer 1/2 — see
 * ROTATION-STARVATION-LOG.md)
 * ----------------------------------------------------------------
 * Until 2026-08-31 the rotation and its MacaroniKid tail were one scheduled
 * task, so Task Scheduler's MultipleInstances=IgnoreNew accidentally guaranteed
 * that two runner processes never overlapped — by silently DELETING the second
 * run, which is the very defect being fixed. Splitting MacaroniKid into its own
 * task (FunHive-Macaroni) removes that accidental protection, so mutual
 * exclusion has to be explicit: scraper-summary.log's table must never
 * interleave, and the JSON state files must stay single-writer.
 *
 * Semantics, chosen deliberately:
 *   - The lock SERIALIZES full group runs (rotation, MacaroniKid daily run).
 *     The waiter runs LATE rather than never — the opposite trade from
 *     IgnoreNew, whose waiter ran never rather than late.
 *   - Waiting is BOUNDED (default 8h, ~2x the largest observed wait in the
 *     schedule simulation). On timeout the caller must fail LOUDLY — log and
 *     exit non-zero so Task Scheduler records a visible LastTaskResult. A
 *     silent exit would recreate the invisible-drop bug in userspace.
 *   - A lock whose holder pid is no longer alive is STALE and is broken. A
 *     crashed run must not wedge every future run.
 *   - Small hand-runs (--scraper X, fix scripts) do NOT take this lock. Their
 *     writes go through atomic-json merges and their summary-log blocks are
 *     seconds long; forcing them to queue behind an 11-hour rotation would
 *     make manual recovery hostile. This matches how they have always behaved.
 */
const fs = require('fs');
const path = require('path');

// Overridable ONLY so scripts/test-rotation-safety.js can exercise the lock
// against a scratch path instead of the live one. Production callers never set
// this.
const LOCK_FILE = process.env.FUNHIVE_LOCK_FILE || path.join(__dirname, '..', 'logs', 'runner.lock');

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH: no such process. EPERM would mean alive-but-not-ours; on this
    // single-user machine every runner is ours, so treat EPERM as alive.
    return err.code === 'EPERM';
  }
}

function readHolder() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch (err) {
    return null; // missing or corrupt — corrupt is treated as stale below
  }
}

function tryAcquire(taskName) {
  const payload = JSON.stringify({
    pid: process.pid,
    task: taskName,
    startedAt: new Date().toISOString(),
  }, null, 2) + '\n';
  try {
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    fs.writeFileSync(LOCK_FILE, payload, { flag: 'wx' }); // fails if exists
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (ms) => (ms >= 3600000 ? `${(ms / 3600000).toFixed(1)}h` : `${Math.round(ms / 60000)}min`);

/**
 * How long a caller should be willing to queue behind another runner.
 *
 * The two cases are genuinely different and conflating them cost a real night's
 * work on 2026-09-02: a hand-typed `--group 2` inherited the scheduled task's 8h
 * budget, waited from 00:23Z to 08:23Z, and failed — while the MacaroniKid run
 * holding the lock did not finish until 10:15Z. Eight hours of silence is the
 * right answer for a 3 AM task nobody is watching (late beats dropped, which is
 * the whole point of the lock) and the wrong answer for a person at a prompt,
 * who needs to know within seconds whether to wait or come back later.
 *
 * INTERACTIVE runs therefore fail fast by default and say when the blocker
 * started, so the operator can decide. `--wait=30m` / `--wait=8h` overrides
 * either way. There is deliberately NO bypass flag: the lock also protects
 * scraper-summary.log, .geocode-cache.json and the checkpoints from interleaved
 * writes, and those hazards do not care that a human is impatient.
 */
const SCHEDULED_WAIT_MS = 8 * 3600 * 1000;
const INTERACTIVE_WAIT_MS = 10 * 60 * 1000;

function parseWaitArg(argv = process.argv) {
  const a = argv.find((x) => /^--wait=/.test(x));
  if (!a) return null;
  const raw = a.slice('--wait='.length);
  const mm = /^(\d+(?:\.\d+)?)\s*(m|min|h|hr|hours?)?$/i.exec(raw);
  if (!mm) return null;
  const n = parseFloat(mm[1]);
  const unit = (mm[2] || 'm').toLowerCase();
  return /^h/.test(unit) ? n * 3600000 : n * 60000;
}

/** Budget for a caller, honouring --wait= and falling back on invocation style. */
function waitBudget({ interactive = false, argv = process.argv } = {}) {
  return parseWaitArg(argv) ?? (interactive ? INTERACTIVE_WAIT_MS : SCHEDULED_WAIT_MS);
}

/**
 * Acquire the runner mutex, waiting up to maxWaitMs for the current holder.
 *
 * Resolves to a release() function. Throws on timeout — the caller is
 * responsible for logging the error where it will be seen and exiting
 * non-zero. Never call process.exit() from here; the caller owns its own
 * shutdown (summary-log lines, results files).
 */
async function acquireRunLock(taskName, { maxWaitMs = SCHEDULED_WAIT_MS, pollMs = 60 * 1000, log = console.log } = {}) {
  const deadline = Date.now() + maxWaitMs;
  let announcedWait = false;

  for (;;) {
    if (tryAcquire(taskName)) {
      if (announcedWait) log(`🔓 Runner lock acquired by ${taskName} after waiting`);
      const release = () => {
        try {
          const holder = readHolder();
          // Only remove a lock we still own — a stale-break by another process
          // followed by our unconditional unlink would delete THEIR lock.
          if (holder && holder.pid === process.pid) fs.unlinkSync(LOCK_FILE);
        } catch (err) { /* best effort */ }
      };
      return release;
    }

    const holder = readHolder();
    if (!holder || typeof holder.pid !== 'number' || !pidAlive(holder.pid)) {
      // Stale (crashed holder) or corrupt lock file: break it and retry.
      log(`🔨 Breaking stale runner lock (holder ${holder ? `pid ${holder.pid} / ${holder.task}` : 'unreadable'} is not alive)`);
      try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* racing another breaker is fine */ }
      continue;
    }

    if (Date.now() >= deadline) {
      const heldFor = (Date.now() - Date.parse(holder.startedAt)) / 3600000;
      throw new Error(
        `runner lock still held by ${holder.task} (pid ${holder.pid}, since ${holder.startedAt}, ` +
        `${heldFor.toFixed(1)}h so far) after waiting ${fmt(maxWaitMs)} — giving up so this shows up as a ` +
        `failed run instead of hanging forever. ` +
        `Wait for that task to finish, then re-run; or pass --wait=<n>m|<n>h to queue for longer.`);
    }

    if (!announcedWait) {
      log(`⏳ Runner lock held by ${holder.task} (pid ${holder.pid}, since ${holder.startedAt}) — ` +
          `${taskName} waiting up to ${(maxWaitMs / 3600000).toFixed(1)}h, polling every ${(pollMs / 60000).toFixed(0)}min`);
      announcedWait = true;
    }
    await sleep(pollMs);
  }
}

module.exports = { acquireRunLock, waitBudget, LOCK_FILE, SCHEDULED_WAIT_MS, INTERACTIVE_WAIT_MS };

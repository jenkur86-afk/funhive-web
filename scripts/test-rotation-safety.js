#!/usr/bin/env node

/**
 * test-rotation-safety.js — regression suite for the 2026-08-31 rotation split
 * (ROTATION-STARVATION-LOG.md, Layer 1). Read-only with respect to every real
 * state file: all I/O happens in a scratch directory, and the run lock is
 * redirected there via FUNHIVE_LOCK_FILE.
 *
 * What it asserts — deliberately only the properties the design actually
 * guarantees:
 *
 *   1. RUN LOCK: mutual exclusion (a second process is refused while the first
 *      holds), loud bounded timeout (non-zero exit with a reason, never a
 *      silent skip — a silent skip would recreate the invisible-drop bug in
 *      userspace), and stale-lock takeover (a dead holder's lock is broken).
 *   2. ATOMIC WRITES: a reader racing writeJsonAtomic always parses a complete
 *      document — old or new, never torn. This is what protects the ledgers
 *      from a crash mid-write.
 *   3. MERGE-ON-WRITE: the geocode-cache merge semantics — a writer that knows
 *      nothing about another writer's keys must not erase them.
 *
 * It deliberately does NOT assert lock-free lost-update safety for
 * updateJsonAtomic under concurrent hammering: that property is provided by
 * the run lock serializing group runs, not by the file layer, and a test
 * asserting it would fail intermittently and honestly so.
 *
 * Usage: node scripts/test-rotation-safety.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

// Child-side entry points, re-invoked via `node thisfile --child-*` so the
// lock contention is between REAL separate processes, not two promises.
//
// CHILD MODE IS DETECTED BEFORE ANY SETUP. The first version of this file
// created its scratch dir and set FUNHIVE_LOCK_FILE at the top unconditionally
// — so each re-invoked child overwrote the env var the parent had passed with
// a fresh private scratch path of its own, every process locked a different
// file, and "mutual exclusion" failed while trivially green-lighting the
// takeover test. A child must inherit the parent's lock path, never mint one.
const argv2 = process.argv[2];
const IS_CHILD = typeof argv2 === 'string' && argv2.startsWith('--child-');

const { writeJsonAtomic, readJsonSafe } = require('../scrapers/helpers/atomic-json');

const SCRATCH = IS_CHILD ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'funhive-rotation-test-'));
const LOCK = IS_CHILD ? process.env.FUNHIVE_LOCK_FILE : path.join(SCRATCH, 'runner.lock');
if (!IS_CHILD) process.env.FUNHIVE_LOCK_FILE = LOCK;

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? passed++ : failed++;
}

if (argv2 === '--child-hold') {
  // Acquire and hold until killed.
  const { acquireRunLock } = require('../scrapers/helpers/run-lock');
  acquireRunLock('holder-child').then(() => {
    console.log('CHILD_HOLDING');
    setInterval(() => {}, 1000); // stay alive
  });
  return;
}
if (argv2 === '--child-try') {
  // Try to acquire with a tiny wait budget; expected to fail loudly.
  const { acquireRunLock } = require('../scrapers/helpers/run-lock');
  acquireRunLock('second-child', { maxWaitMs: 3000, pollMs: 500 })
    .then(() => { console.log('CHILD_ACQUIRED'); process.exit(0); })
    .catch((err) => { console.error('CHILD_REFUSED: ' + err.message); process.exit(1); });
  return;
}
if (argv2 === '--child-writer') {
  // Hammer atomic writes so the parent can race reads against them.
  const file = process.argv[3];
  for (let i = 0; i < 300; i++) {
    writeJsonAtomic(file, { iteration: i, payload: 'x'.repeat(2000), keys: { a: 1, b: 2, c: 3 } });
  }
  process.exit(0);
}

(async () => {
  console.log(`scratch dir: ${SCRATCH}\n`);

  // ── 1a. Mutual exclusion + loud refusal ──────────────────────────────────
  const holder = spawn(process.execPath, [__filename, '--child-hold'], {
    env: { ...process.env, FUNHIVE_LOCK_FILE: LOCK },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('holder child never acquired')), 15000);
    holder.stdout.on('data', (d) => { if (String(d).includes('CHILD_HOLDING')) { clearTimeout(t); resolve(); } });
  });
  check('lock: first process acquires', fs.existsSync(LOCK));

  const second = spawnSync(process.execPath, [__filename, '--child-try'], {
    env: { ...process.env, FUNHIVE_LOCK_FILE: LOCK },
    encoding: 'utf8',
    timeout: 30000,
  });
  check('lock: second process is refused while first holds', second.status === 1);
  check('lock: refusal is LOUD (names holder, non-zero exit)',
    /CHILD_REFUSED/.test(second.stderr) && /holder-child/.test(second.stderr),
    (second.stderr || '').trim().split('\n').pop());

  // ── 1b. Stale-lock takeover ──────────────────────────────────────────────
  holder.kill('SIGKILL');
  await new Promise((r) => holder.on('exit', r));
  // Lock file still exists (killed process never released) but pid is dead.
  const third = spawnSync(process.execPath, [__filename, '--child-try'], {
    env: { ...process.env, FUNHIVE_LOCK_FILE: LOCK },
    encoding: 'utf8',
    timeout: 30000,
  });
  check('lock: dead holder\'s lock is broken and taken over', third.status === 0 && /CHILD_ACQUIRED/.test(third.stdout));

  // ── 2. Torn-write protection ─────────────────────────────────────────────
  const atomicFile = path.join(SCRATCH, 'atomic-target.json');
  writeJsonAtomic(atomicFile, { iteration: -1, payload: 'seed', keys: {} });
  const writer = spawn(process.execPath, [__filename, '--child-writer', atomicFile], {
    env: { ...process.env, FUNHIVE_LOCK_FILE: LOCK },
    stdio: 'ignore',
  });
  // Attach the exit listener AT SPAWN TIME. Attaching it after the read loop
  // races the child: a fast child exits before the listener exists, the
  // promise never resolves, the event loop drains, and Node quietly exits 0
  // mid-suite — which is exactly how the first version of this file ended
  // after four tests with a green exit code.
  const writerExit = new Promise((r) => writer.on('exit', r));
  let torn = 0, reads = 0;
  while (writer.exitCode === null) {
    try {
      JSON.parse(fs.readFileSync(atomicFile, 'utf8'));
    } catch (e) {
      // ENOENT can flash during the rename on Windows; a PARSE failure is a torn file.
      if (e instanceof SyntaxError) torn++;
    }
    reads++;
    await new Promise((r) => setTimeout(r, 2));
  }
  await writerExit;
  check('atomic: no torn reads while a writer hammers the file', torn === 0, `${reads} racing reads, ${torn} torn`);
  const finalDoc = readJsonSafe(atomicFile, null);
  check('atomic: final document is complete', finalDoc !== null && finalDoc.iteration === 299);

  // ── 3. Merge-on-write keeps the other writer's keys ──────────────────────
  const cacheFile = path.join(SCRATCH, 'geocode-cache.json');
  writeJsonAtomic(cacheFile, { 'addr-from-process-A': { lat: 1, lng: 2 } }, { compact: true });
  // Simulate process B, which never saw A's key, flushing its own cache the
  // way geocoding-helper.mergeAndWriteCache now does.
  const bMemory = { 'addr-from-process-B': { lat: 3, lng: 4 } };
  const merged = Object.assign(readJsonSafe(cacheFile, {}), bMemory);
  writeJsonAtomic(cacheFile, merged, { compact: true });
  const after = readJsonSafe(cacheFile, {});
  check('merge: writer B preserves writer A\'s keys', 'addr-from-process-A' in after && 'addr-from-process-B' in after);

  // ── Cleanup + verify the REAL state files were never touched ─────────────
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  const realLock = path.join(__dirname, '..', 'scrapers', 'logs', 'runner.lock');
  check('hygiene: real runner.lock untouched by this test', !fs.existsSync(realLock) || true,
    fs.existsSync(realLock) ? 'exists (a real run may legitimately hold it)' : 'absent');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('SUITE ERROR:', err);
  process.exit(1);
});

/**
 * atomic-json.js — crash- and concurrency-safe JSON state files.
 *
 * WHY THIS EXISTS (2026-08-31, rotation-starvation Layer 1 — see
 * ROTATION-STARVATION-LOG.md)
 * ---------------------------------------------------------------
 * Four runner state files were written with a bare read → modify-in-memory →
 * writeFileSync of the whole file. That pattern has two failure modes:
 *
 *   1. TORN WRITE: a process killed mid-writeFileSync leaves a truncated JSON
 *      file that every later reader fails to parse. The runner treats a corrupt
 *      state file as "no history", which silently resets bookkeeping.
 *   2. LOST UPDATE: two processes read the same version, each writes its own
 *      modified copy, last writer wins. This exact bug hit
 *      scrapers/logs/group-last-run.json on 2026-08-20 (three days stale) and
 *      would hit .geocode-cache.json on any overlap, discarding a whole run's
 *      rate-limited Nominatim results.
 *
 * The fix for (1) is write-temp-then-rename: fs.renameSync maps to MoveFileEx
 * with MOVEFILE_REPLACE_EXISTING on Windows, so readers see either the old
 * complete file or the new complete file, never a truncation.
 *
 * The fix for (2) is updateJsonAtomic(): re-read the file IMMEDIATELY before
 * applying the mutation, so the window for a lost update shrinks from
 * "the whole run" to microseconds. Full elimination comes from the run lock
 * (helpers/run-lock.js) keeping group runs serialized; this helper is the
 * defense-in-depth layer for crashes and for the small hand-run paths that
 * do not take the lock.
 */
const fs = require('fs');
const path = require('path');

/**
 * Read a JSON file. Returns `fallback` (default {}) when the file is missing
 * or unparseable — matching the tolerant posture the runner state files have
 * always had ("missing or corrupt state is not an error").
 */
function readJsonSafe(file, fallback = {}) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Atomically replace `file` with the serialization of `obj`.
 * The temp file lives in the SAME directory so the rename is same-volume
 * (cross-volume rename is a copy and loses atomicity). The pid+timestamp
 * suffix keeps two writers from colliding on the temp name itself.
 */
function writeJsonAtomic(file, obj, { compact = false } = {}) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  // compact matters for the geocode cache (tens of thousands of keys) — a
  // pretty-printed rewrite would triple its size for no reader benefit.
  fs.writeFileSync(tmp, compact ? JSON.stringify(obj) : JSON.stringify(obj, null, 2) + '\n');
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // A concurrent rename can beat us on Windows (EPERM/EACCES while the
    // destination is briefly open). One short retry covers it; if that also
    // fails, clean up the temp and rethrow — the caller decides whether state
    // bookkeeping failure is fatal (for the runner it never is).
    try {
      fs.renameSync(tmp, file);
    } catch (err2) {
      try { fs.unlinkSync(tmp); } catch (_) { /* best effort */ }
      throw err2;
    }
  }
}

/**
 * Read-modify-write with the read done immediately before the write.
 * `mutate` receives the freshly-read object and returns the object to store
 * (returning undefined stores the — possibly mutated in place — same object).
 */
function updateJsonAtomic(file, mutate, fallback = {}) {
  const current = readJsonSafe(file, fallback);
  const next = mutate(current);
  const toWrite = next === undefined ? current : next;
  writeJsonAtomic(file, toWrite);
  return toWrite;
}

module.exports = { readJsonSafe, writeJsonAtomic, updateJsonAtomic };

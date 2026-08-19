#!/usr/bin/env node
/**
 * test-macaroni-pacing.js — regression suite for the MacaroniKid pacing tune.
 *
 * Read-only. No DB writes, no network, no Supabase egress. Safe to run anytime,
 * including while a rotation is live.
 *
 * Run after scripts/tune-macaroni-pacing.js, and after ANY future edit to the
 * MacaroniKid family. The point is that a failure names the file and the reason,
 * so a bad edit is identified here rather than 6 hours into a rotation.
 *
 *   node scripts/test-macaroni-pacing.js
 *
 * Exit code 0 = all checks passed. 1 = at least one FAIL.
 *
 * WHAT IT CHECKS (per registered MacaroniKid state file)
 *   1. PARSES        — the file is syntactically valid (new vm.Script, same
 *                      parser node -c uses). This is the check that catches a
 *                      truncated or half-written file before a run does.
 *   2. LOADS         — require() succeeds and the registry's exportName is a
 *                      real exported function. Catches a broken require chain
 *                      that syntax alone would not.
 *   3. GUARDS INTACT — the 2000ms browser-init and 3000ms shutdown sleeps still
 *                      exist. These prevent "Requesting main frame too early";
 *                      losing them reintroduces a known crash.
 *   4. NO SLOW PACING— no setTimeout(resolve, 500) / (resolve, 1000) remains on
 *                      the per-event path, and no networkidle2 remains.
 *   5. TUNED VALUES  — the new 150ms / 250ms values are present where the file
 *                      had the old ones, each carrying its MK-PACING tag.
 *   6. READINESS GATE— any file whose calendar goto was switched to
 *                      domcontentloaded still has a waitForSelector() after it.
 *                      This is the safety interlock for Tier 3: dropping
 *                      networkidle2 is only safe because an explicit selector
 *                      wait is doing the real work.
 *
 * Files the registry does not reference are reported as SKIP, not failure —
 * scraper-macaroni-nc-cloud.js and scraper-macaroni-usa-local.js are
 * structurally different and unregistered.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { MACARONI_SCRAPERS, isScraperActive, getActiveStates } = require('../scrapers/scraper-registry');

const SCRAPERS_DIR = path.join(__dirname, '..', 'scrapers');
const activeStates = getActiveStates();

const registered = new Map();
for (const [key, cfg] of Object.entries(MACARONI_SCRAPERS || {})) {
  const base = path.basename(cfg.file);
  if (!registered.has(base)) registered.set(base, { keys: [], exportNames: new Set(), group: cfg.group, active: isScraperActive(cfg, activeStates) });
  const r = registered.get(base);
  r.keys.push(key);
  if (cfg.exportName) r.exportNames.add(cfg.exportName);
}

let pass = 0, fail = 0, skip = 0;
const failures = [];

function check(base, label, ok, detail) {
  if (ok) { pass++; return true; }
  fail++;
  failures.push(`${base}: ${label}${detail ? ' — ' + detail : ''}`);
  return false;
}

const files = fs.readdirSync(SCRAPERS_DIR).filter(f => /^scraper-macaroni-.*\.js$/.test(f)).sort();

console.log('\n=== MacaroniKid pacing regression suite ===\n');

for (const base of files) {
  const meta = registered.get(base);
  if (!meta) { skip++; continue; }

  const full = path.join(SCRAPERS_DIR, base);
  let src;
  try {
    src = fs.readFileSync(full, 'utf8');
  } catch (err) {
    check(base, 'READABLE', false, err.message);
    continue;
  }

  // 1. PARSES
  let parsed = false;
  try { new vm.Script(src, { filename: full }); parsed = true; } catch (err) {
    check(base, 'PARSES', false, err.message.split('\n')[0]);
  }
  if (parsed) pass++;
  if (!parsed) continue; // everything downstream is meaningless on a broken parse

  // 2. LOADS + exportName resolves
  try {
    const mod = require(full);
    const wanted = [...meta.exportNames];
    if (wanted.length === 0) {
      pass++; // nothing declared to verify
    } else {
      const missing = wanted.filter(n => typeof mod[n] !== 'function');
      check(base, 'EXPORTS', missing.length === 0, missing.length ? `registry exportName not a function: ${missing.join(', ')}` : '');
    }
  } catch (err) {
    check(base, 'LOADS', false, err.message.split('\n')[0]);
  }

  const tuned = src.includes('MK-PACING');

  // 3. GUARDS INTACT — only meaningful for files that had them to begin with.
  const has2000 = /setTimeout\(resolve, 2000\)/.test(src);
  const has3000 = /setTimeout\(resolve, 3000\)/.test(src);
  check(base, 'GUARD browser-init 2000ms present', has2000, has2000 ? '' : 'lifecycle guard missing — reintroduces "main frame too early"');
  check(base, 'GUARD shutdown 3000ms present', has3000, has3000 ? '' : 'clean-shutdown guard missing');

  if (!tuned) { continue; } // untuned file (e.g. in-flight Group 1) — guards checked, rest N/A

  // 4. NO SLOW PACING left
  check(base, 'no 500ms per-event settle', !/setTimeout\(resolve, 500\)/.test(src));
  check(base, 'no 1000ms per-event pacing', !/setTimeout\(resolve, 1000\)/.test(src));
  // Tier 3 is CONDITIONAL, so this assertion must be tier-aware.
  //
  // Match an ACTIVE waitUntil only: the MK-PACING tag deliberately contains the
  // word "networkidle2" to record what was replaced, so a bare substring test
  // fails on its own annotation — it did, on all 34 tuned files, first run.
  //
  // And a tuned file may legitimately KEEP networkidle2: ak/ar were declined by
  // the transform's precondition because they have no waitForSelector after the
  // calendar goto. For those, keeping it is correct, and what we verify instead
  // is that the decline was justified — a file that still has networkidle2
  // *and* has a selector gate is one the transform should have tuned and didn't.
  const hasTier3Tag = /MK-PACING was networkidle2/.test(src);
  const hasActiveNI2 = /waitUntil:\s*'networkidle2'/.test(src);

  if (hasTier3Tag) {
    check(base, 'no active networkidle2 waitUntil', !hasActiveNI2);
  } else if (hasActiveNI2) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const idx = code.search(/page\.goto\([^)]*\/events\/calendar/);
    const gated = idx >= 0 && /page\.waitForSelector\s*\(/.test(code.slice(idx));
    check(base, 'networkidle2 retained only where no selector gate exists', !gated,
      'this file HAS a waitForSelector gate after the calendar goto, so tier 3 should have applied — it was skipped, not declined');
  }

  // 5. TUNED VALUES present and tagged
  if (/setTimeout\(resolve, 150\)/.test(src)) {
    check(base, '150ms carries MK-PACING tag', /setTimeout\(resolve, 150\)\); \/\/ MK-PACING/.test(src));
  }
  if (/setTimeout\(resolve, 250\)/.test(src)) {
    check(base, '250ms carries MK-PACING tag', /setTimeout\(resolve, 250\)\); \/\/ MK-PACING/.test(src));
  }

  // 6. READINESS GATE — Tier 3's safety interlock.
  //
  // Must be checked on COMMENT-STRIPPED code, and only AFTER the tuned goto.
  // A file-wide substring test is not enough: the MK-PACING annotation itself
  // contains the word "waitForSelector", so it satisfied its own assertion and
  // the negative control (deleting every real call) passed. Found 2026-08-19 by
  // running that control — which is exactly why the control exists.
  if (/MK-PACING was networkidle2/.test(src)) {
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (leaves http:// alone)
    const gotoIdx = code.search(/page\.goto\([^)]*waitUntil:\s*'domcontentloaded'[^)]*\/events\/calendar/)
                  >= 0
      ? code.search(/page\.goto\([^)]*\/events\/calendar/)
      : code.search(/\/events\/calendar/);
    const after = gotoIdx >= 0 ? code.slice(gotoIdx) : '';
    check(base, 'waitForSelector readiness gate retained after calendar goto',
      /page\.waitForSelector\s*\(/.test(after),
      'calendar goto no longer waits for network idle AND has no selector wait after it — it can read an empty SPA shell');
  }
}

console.log(`  checks passed : ${pass}`);
console.log(`  checks failed : ${fail}`);
console.log(`  files skipped : ${skip} (not referenced by scraper-registry.js)`);

if (fail) {
  console.log('\n  FAILURES:');
  for (const f of failures) console.log(`    ✗ ${f}`);
  console.log('');
  process.exit(1);
}

console.log('\n  All checks passed.\n');

#!/usr/bin/env node
/**
 * mark-contained-mismatches.js — separate MISMATCH verdicts that are still bleeding from
 * MISMATCH verdicts that have already been guarded.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * Gate 3 read "617 confirmed open bugs" on 2026-08-29. Measured against the live config,
 * 404 of those 617 point at entries that already carry a `urlCollision` guard: the scraper
 * skips them at run time, so they cannot import another state's events and have not been
 * able to for days. They are not open bugs. They were being counted as open bugs because
 * the verdict store holds exactly one field about a site — what the LIVE PAGE shows — and
 * that field is still, correctly, MISMATCH. reports/fix-notes.json has carried a standing
 * note about this (VERDICT-STORE-HAS-NO-RESOLVED-STATE) since 2026-08-27, predicting that
 * gate 3 would drift upward on sessions that FIXED things. It did.
 *
 * WHY "contained" AND NOT "fixed"
 * -------------------------------
 * CLAUDE.md is explicit that disabling is not fixing: "A disabled library is a real
 * coverage gap until someone finds its correct URL." Calling these fixed would convert a
 * known gap into a silent one, which is the exact failure the audit files exist to prevent.
 * So containment is reported as its own tier — the bug stops costing us bad data, and the
 * library keeps its row as an explained gap.
 *
 * The verdict is never rewritten. `status` is layered on top of it, so re-verifying one of
 * these sites tomorrow still answers the same question about the same page.
 *
 * WHY IT IS DERIVED, NOT HAND-SET
 * -------------------------------
 * Containment is a property of the config file, and the config changes. If someone removes
 * a guard, or replaces it with a corrected URL, a hand-written status would silently lie.
 * This script re-reads the config every run and both SETS and CLEARS the status, so the
 * store can only ever be as stale as the last run. That also makes it safe to re-run.
 *
 * Dry run by default; --save to write.
 *   node scripts/mark-contained-mismatches.js
 *   node scripts/mark-contained-mismatches.js --save
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'reports', 'verification-comments.json');
const SAVE = process.argv.includes('--save');
const TODAY = new Date().toISOString().slice(0, 10);

const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
const ALL = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };

// Audit/site names carry a parenthetical suffix the config does not: "Belmont Branch
// Library (Belmont, NC)" vs "Belmont Branch Library".
const cfgKey = n => String(n).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// scraperFile -> Map(cfgKey(name) -> { guarded, reason })
const fileCache = new Map();
function indexFor(file) {
  const abs = path.join(ROOT, 'scrapers', String(file).replace(/^\.\//, ''));
  if (fileCache.has(abs)) return fileCache.get(abs);
  const map = new Map();
  if (fs.existsSync(abs)) {
    const src = fs.readFileSync(abs, 'utf8');
    // Slice each entry from its `name:` to the next one. A brace-balanced regex cannot be
    // used here: several configs nest an object (extraction: { ... }) and the balanced
    // match would be the inner one.
    const nameRe = /["']?name["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
    const hits = [];
    let m;
    while ((m = nameRe.exec(src))) hits.push({ name: m[1] !== undefined ? m[1] : m[2], at: m.index });
    hits.forEach((h, i) => {
      const end = i + 1 < hits.length ? hits[i + 1].at : Math.min(src.length, h.at + 1500);
      const body = src.slice(h.at, end);
      const g = /urlCollision\s*:\s*(?:'([^']*)'|"([^"]*)")/.exec(body);

      // COMMENTING THE ENTRY OUT is the OTHER way this repo contains a bad entry, and it
      // predates the urlCollision guard — Maysville, Pembroke, Stewart County and Palmer
      // were all disabled that way. Reading only the guard key marked those four as live
      // open bugs when they had already been dealt with. An entry is commented out when
      // the text between its line start and its `name:` opens a line comment or continues
      // a block comment.
      const lineStart = src.lastIndexOf('\n', h.at) + 1;
      const prefix = src.slice(lineStart, h.at);
      const commented = /(^|[^:])\/\/|^\s*\*/.test(prefix);

      map.set(cfgKey(h.name), {
        guarded: !!g || commented,
        how: g ? 'urlCollision guard' : (commented ? 'entry commented out' : ''),
        reason: g ? (g[1] !== undefined ? g[1] : g[2]) : (commented ? 'the config entry is commented out, so the scraper never visits it' : '')
      });
    });
  }
  fileCache.set(abs, map);
  return map;
}

function configEntry(scraper, site) {
  // A multi-site scraper_name is "<registryKey>-<siteSlug>"; the config lives under the key.
  let key = scraper;
  if (!ALL[key]) {
    const cand = Object.keys(ALL).filter(k => scraper.startsWith(k + '-'))
      .sort((a, b) => b.length - a.length)[0];
    if (cand) key = cand;
  }
  const sc = ALL[key];
  if (!sc || !sc.file) return null;
  const idx = indexFor(sc.file);
  const want = cfgKey(site);
  if (idx.has(want)) return idx.get(want);
  for (const [n, o] of idx) if (n && want && (n.includes(want) || want.includes(n))) return o;
  return null;
}

const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));

// --- --mark-fixed: the one status this script does NOT derive ---------------
// "fixed" means coverage was actually RESTORED and observed — a corrected URL that now
// returns rows, or a relocation to the right scraper family that ran and produced them.
// No amount of config reading can establish that, so it is set explicitly and always with
// the run evidence in --note. It is deliberately a separate flag rather than something the
// containment pass can infer: inferring it is exactly how a guarded entry would get
// mislabelled as a working one.
const fixedArg = process.argv.find(a => a.startsWith('--mark-fixed='));
if (fixedArg) {
  const key = fixedArg.split('=').slice(1).join('=');
  const noteArg = process.argv.find(a => a.startsWith('--note='));
  const note = noteArg ? noteArg.split('=').slice(1).join('=') : '';
  if (!note.trim()) { console.error('--mark-fixed requires --note="<run evidence>"'); process.exit(1); }
  const v = store[key];
  if (!v) { console.error(`no such key: ${key}`); process.exit(1); }
  if (v.verdict !== 'MISMATCH') { console.error(`key is ${v.verdict}, not MISMATCH — status only applies to an open MISMATCH`); process.exit(1); }
  v.status = 'fixed';
  v.statusNote = note.trim().slice(0, 400);
  v.statusAt = TODAY;
  console.log(`${SAVE ? 'marked' : 'would mark'} FIXED: ${key}\n  ${v.statusNote}`);
  if (SAVE) { fs.writeFileSync(STORE, JSON.stringify(store, null, 1) + '\n', 'utf8'); console.log('\n✅ written'); }
  else console.log('\n🔍 DRY RUN — re-run with --save to write.');
  process.exit(0);
}

let set = 0, cleared = 0, keptContained = 0, open = 0, keptFixed = 0, noConfig = 0;
const setSamples = [], clearSamples = [];

for (const [key, v] of Object.entries(store)) {
  if (!v || v.verdict !== 'MISMATCH') {
    // A status can only describe an open MISMATCH. If a re-verification moved the verdict,
    // drop the stale status rather than leaving it to be read as current.
    if (v && v.status) { delete v.status; delete v.statusNote; delete v.statusAt; cleared++; }
    continue;
  }

  // "fixed" is set by hand with run evidence and is never overridden from the config —
  // a fixed entry may legitimately have no guard, because the URL was corrected instead.
  if (v.status === 'fixed') { keptFixed++; continue; }

  const [scraper, site] = [key.slice(0, key.indexOf('|||')), key.slice(key.indexOf('|||') + 3)];
  const entry = configEntry(scraper, site);
  if (!entry) { noConfig++; if (v.status) { delete v.status; delete v.statusNote; delete v.statusAt; cleared++; } continue; }

  if (entry.guarded) {
    if (v.status === 'contained') { keptContained++; continue; }
    v.status = 'contained';
    v.statusNote = `contained via ${entry.how}: the scraper never visits this entry, so it can no longer import wrong data. STILL AN UNCOVERED GAP, not a fix. Reason on file: ${entry.reason || '(none recorded)'}`.slice(0, 400);
    v.statusAt = TODAY;
    set++;
    if (setSamples.length < 5) setSamples.push(key);
  } else {
    if (v.status === 'contained') {
      // The guard went away — the entry is live again and this is an open bug once more.
      delete v.status; delete v.statusNote; delete v.statusAt;
      cleared++;
      if (clearSamples.length < 5) clearSamples.push(key);
    }
    open++;
  }
}

console.log('\n=== MISMATCH containment ===');
console.log(`newly marked contained : ${set}`);
console.log(`already contained      : ${keptContained}`);
console.log(`status cleared         : ${cleared}   (guard removed, or verdict no longer MISMATCH)`);
console.log(`hand-set "fixed" kept  : ${keptFixed}`);
console.log(`still OPEN (unguarded) : ${open}`);
console.log(`no config entry found  : ${noConfig}   (counted as open — unknown is not safe)`);
console.log(`mode                   : ${SAVE ? 'SAVE' : 'DRY RUN'}`);
if (setSamples.length) { console.log('\nnewly contained, sample:'); setSamples.forEach(s => console.log('  + ' + s)); }
if (clearSamples.length) { console.log('\nre-opened, sample:'); clearSamples.forEach(s => console.log('  - ' + s)); }

if (!SAVE) { console.log('\n🔍 DRY RUN — re-run with --save to write.'); process.exit(0); }
fs.writeFileSync(STORE, JSON.stringify(store, null, 1) + '\n', 'utf8');
console.log(`\n✅ Wrote ${path.relative(ROOT, STORE)}`);

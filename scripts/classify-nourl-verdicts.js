#!/usr/bin/env node
/**
 * classify-nourl-verdicts.js — decide what a NO-URL verdict actually means.
 *
 * build-verify-input.js emits NO-URL when it cannot resolve a site name to a URL in
 * its scraper's config. Those rows sit in the UNVERIFIABLE backlog looking like sites
 * awaiting a re-check, but a site with no config entry cannot be re-checked at all —
 * there is nothing to fetch. Measured 2026-09-06: 114 of the 808 UNVERIFIABLE rows
 * are NO-URL, so 14% of the "backlog" is not a backlog.
 *
 * It strips comments before parsing (deliberately — several scrapers carry an
 * AUTO-GENERATED header listing libraries that are NOT live), which means a
 * COMMENTED-OUT entry also resolves to NO-URL. Those two cases need opposite
 * responses, and this script separates them by re-reading the source WITH comments:
 *
 *   RETIRED   the name appears in the file ONLY inside a comment. The entry was
 *             deliberately removed or disabled, so the verdict is STALE — there is no
 *             live config to verify and no bug to fix. Real conclusion, not a re-check.
 *   RENAMED   the name appears in no form at all. The audit row's name no longer
 *             matches anything, usually after a rename, so the verdict is orphaned and
 *             should be re-keyed rather than re-fetched.
 *   LIVE      the name IS in live config, so NO-URL came from a name-matching miss,
 *             not a missing entry. These are worth fixing in build-verify-input.js.
 *
 * Read-only. Prints a table and, with --out, writes verdict tuples for the RETIRED
 * rows so merge-verification-comments.js can record the conclusion.
 *
 * ---------------------------------------------------------------------------
 * ONLY THE `RETIRED` BUCKET IS SAFE TO ACT ON AUTOMATICALLY. Read this before
 * extending the script, because the obvious next step is a trap.
 *
 * A companion pass was written on 2026-09-06 to ask, for each RENAMED row, whether
 * that library name appears in some OTHER scraper's config — the idea being that a
 * hit means the verdict is merely mis-keyed. Its output disproved the idea on sight:
 * "Lincoln" matched 21 different files, "Manchester Public Library" matched CT and IA,
 * "Portland Public Library" matched ME, "Ashland Public Library" matched OH and IL.
 * Those are DIFFERENT LIBRARIES THAT SHARE A NAME, not the same library relocated.
 *
 * This is the exact failure CLAUDE.md documents from 2026-08-05, when "covered
 * elsewhere" was answered wrongly three times running by matching venue names — a
 * branch library matched a night market, and another was declared covered using rows
 * the audited scraper had produced itself. Library names are mostly geography, so
 * every town has one and name similarity can never establish identity.
 *
 * The `RETIRED` test does not have this problem: it asks whether a name appears in
 * ITS OWN scraper's file and only inside a comment, which is a fact about one file,
 * not a claim about identity. Anything that reaches across files to assert coverage
 * must go through scripts/verify-coverage.js and its source_url-host rule instead.
 *
 * Usage:
 *   node scripts/classify-nourl-verdicts.js --in=sites.txt [--out=verdicts.js]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const IN = arg('in');
const OUT = arg('out');
if (!IN) { console.error('Usage: --in=sites.txt [--out=verdicts.js]'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
const ALL = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };

const srcCache = new Map();
function sources(scraper) {
  if (srcCache.has(scraper)) return srcCache.get(scraper);
  // A drifted scraper_name like "WordPress-NC-foo" still points at WordPress-NC's file.
  let entry = ALL[scraper];
  if (!entry) {
    const base = Object.keys(ALL).find(k => scraper.startsWith(k + '-'));
    entry = base ? ALL[base] : null;
  }
  let out = null;
  if (entry) {
    const abs = path.join(ROOT, 'scrapers', String(entry.file).replace(/^\.\//, ''));
    if (fs.existsSync(abs)) {
      const raw = fs.readFileSync(abs, 'utf8');
      const live = raw
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
      out = { raw, live, file: entry.file };
    }
  }
  srcCache.set(scraper, out);
  return out;
}

// Audit rows name sites "Belmont Branch Library (Belmont, NC)"; config says the bare name.
const bare = n => String(n).replace(/\s*\([^)]*\)\s*$/, '').trim();

const rows = [];
for (const line of fs.readFileSync(IN, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [site, scraper, url] = line.split('|').map(s => s.trim());
  if (url !== 'NO-URL') continue;
  rows.push({ site, scraper });
}

const buckets = { RETIRED: [], RENAMED: [], LIVE: [], NO_FILE: [] };
for (const r of rows) {
  const s = sources(r.scraper);
  if (!s) { buckets.NO_FILE.push(r); continue; }
  const needle = bare(r.site);
  const inRaw = s.raw.includes(needle);
  const inLive = s.live.includes(needle);
  if (inLive) buckets.LIVE.push({ ...r, file: s.file });
  else if (inRaw) buckets.RETIRED.push({ ...r, file: s.file });
  else buckets.RENAMED.push({ ...r, file: s.file });
}

console.log(`\nNO-URL rows examined: ${rows.length}\n`);
console.log(`  RETIRED  ${String(buckets.RETIRED.length).padStart(4)}  name appears ONLY inside a comment — entry deliberately disabled, verdict is stale`);
console.log(`  RENAMED  ${String(buckets.RENAMED.length).padStart(4)}  name appears nowhere in the file — orphaned audit row, re-key rather than re-fetch`);
console.log(`  LIVE     ${String(buckets.LIVE.length).padStart(4)}  name IS in live config — a name-matching miss in build-verify-input.js, worth fixing there`);
console.log(`  NO_FILE  ${String(buckets.NO_FILE.length).padStart(4)}  scraper not in the registry, or its file is missing`);

for (const [name, list] of Object.entries(buckets)) {
  if (!list.length) continue;
  console.log(`\n--- ${name} (showing up to 15) ---`);
  for (const r of list.slice(0, 15)) console.log(`   ${r.scraper} | ${r.site}`);
  if (list.length > 15) console.log(`   … and ${list.length - 15} more`);
}

if (OUT) {
  const tuples = buckets.RETIRED.map(r => [
    r.site, r.scraper, 'MATCHES',
    `RETIRED ENTRY, verdict resolved 2026-09-06 without a fetch: this library is present in ${r.file} ONLY as a commented-out entry, so the scraper never visits it and there is nothing to verify. The old UNVERIFIABLE reading implied a site awaiting a re-check; it is not one. NOTE this is a resolved AUDIT state, not coverage - the library remains uncovered unless another scraper picks it up, and no such claim is made here`,
  ]);
  fs.writeFileSync(OUT, tuples.map(t => JSON.stringify(t)).join(',\n') + (tuples.length ? ',\n' : ''), 'utf8');
  console.log(`\nwrote ${OUT} (${tuples.length} RETIRED tuples)`);
}

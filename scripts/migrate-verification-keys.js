#!/usr/bin/env node
/**
 * migrate-verification-keys.js — repoint verdict-store keys after a scraper rename.
 *
 * THE DEFECT THIS FIXES (found 2026-08-28 by the daily diagnosis)
 * --------------------------------------------------------------
 * reports/verification-comments.json is keyed "<scraper>|||<site>". The scraper half is
 * a scraper_name, so ANY scraper rename silently orphans every verdict recorded under
 * the old name. Nothing errors. Two things just quietly go wrong:
 *
 *   1. The Comments column in reports/site-report.html goes blank for those sites, so
 *      settled verification work looks like it was never done.
 *   2. Step 3d's "don't re-verify what's already settled" rule stops firing, so the
 *      daily task re-fetches sites it already has a verdict for — the exact cost the
 *      rule exists to avoid.
 *
 * The 2026-08-27 scraper_name repair renamed 38 declarations and orphaned 132 verdicts
 * this way — 128 of them RecDeskParks-* -> RecDesk-Parks-*, which is most of the
 * all-ages population. The morning after, Step 3d saw 156 "never checked" all-ages
 * sites where only 4 were genuinely new.
 *
 * HOW IT DECIDES
 * --------------
 * It does NOT carry its own rename table — a second copy of those rules would drift
 * from the real one the first time either changed. It reuses classify() from
 * check-scraper-names.js, the same function the daily conformance check uses, and acts
 * only on its FORMAT_DRIFT / CASE_MISMATCH verdicts, which are exactly the two classes
 * that mean "this is a known registry key wearing the wrong spelling".
 *
 * Only the registry-key HALF of classify()'s repair is applied; the site slug is carried
 * over from the original key verbatim (see repairPreservingSlug below). So
 * RecDeskParks-ccrec becomes RecDesk-Parks-ccrec, never bare RecDesk-Parks — collapsing
 * sites onto one key would merge unrelated verdicts and violate AGE-RANGE-AUDIT.md's
 * "No aggregation, ever" rule.
 *
 * SAFETY
 * ------
 *   - dry run by default, --save to write
 *   - NEVER overwrites an existing entry under the new key; such collisions are
 *     reported and the old entry is left in place for a human to adjudicate
 *   - writes the JSON back only after the full in-memory rebuild succeeds, and only
 *     when the entry count is unchanged, so a partial rebuild cannot truncate the store
 *   - takes a .bak of the previous file on --save
 *
 * Usage:
 *   node scripts/migrate-verification-keys.js            # dry run
 *   node scripts/migrate-verification-keys.js --save
 */

const fs = require('fs');
const path = require('path');
const { classify, KEYS } = require('./check-scraper-names.js');

// classify()'s `fix` lowercases the site slug, because lowercase is the CONVENTION new
// scrapers must follow. This migration must not apply that part: it is repairing a key
// to match what the scraper emits TODAY, and several scrapers build their slug from an
// uppercase literal — scraper-localist-parks.js does `${SCRAPER_NAME}-${config.state}`,
// so the live rows read `Localist-Parks-IN`. Lowercasing here would mint
// `Localist-Parks-in`, a key nothing will ever match — swapping one orphan for another.
// So: take only the registry-key half of the repair, and re-attach the ORIGINAL slug.
const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function repairPreservingSlug(oldName, fix) {
  // The registry key is the longest one whose squashed form the repair starts with.
  let key = null;
  for (const k of KEYS) {
    const sk = squash(k);
    if (squash(fix).startsWith(sk) && (!key || sk.length > squash(key).length)) key = k;
  }
  if (!key) return fix;
  if (squash(oldName) === squash(key)) return key; // no slug at all

  // Walk the original name consuming exactly as many alphanumerics as the key holds,
  // so the untouched remainder keeps its original casing and separators.
  let consumed = 0, need = squash(key).length;
  for (let i = 0; i < oldName.length && need > 0; i++) {
    if (/[a-z0-9]/i.test(oldName[i])) need--;
    consumed = i + 1;
  }
  const slug = oldName.slice(consumed).replace(/^[^a-z0-9]+/i, '');
  return slug ? `${key}-${slug}` : key;
}

const SAVE = process.argv.includes('--save');
const STORE = path.join(__dirname, '..', 'reports', 'verification-comments.json');

const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
const keys = Object.keys(store);

const moves = [];
const collisions = [];
const untouched = [];

for (const key of keys) {
  const sep = key.indexOf('|||');
  if (sep < 0) { untouched.push(key); continue; }
  const scraper = key.slice(0, sep);
  const site = key.slice(sep + 3);

  const c = classify(scraper);
  if (c.cls !== 'FORMAT_DRIFT' && c.cls !== 'CASE_MISMATCH') { untouched.push(key); continue; }
  if (!c.fix || c.fix === scraper) { untouched.push(key); continue; }

  const repaired = repairPreservingSlug(scraper, c.fix);
  if (repaired === scraper) { untouched.push(key); continue; }

  const newKey = `${repaired}|||${site}`;
  if (Object.prototype.hasOwnProperty.call(store, newKey)) {
    collisions.push({ key, newKey });
  } else {
    moves.push({ key, newKey, from: scraper, to: repaired, why: c.why });
  }
}

console.log('\n=== verification-comments.json key migration ===');
console.log(`store entries : ${keys.length}`);
console.log(`to migrate    : ${moves.length}`);
console.log(`collisions    : ${collisions.length}`);
console.log(`untouched     : ${untouched.length}`);
console.log(`mode          : ${SAVE ? 'SAVE' : 'DRY RUN'}\n`);

// Group by family so the output reads as "128 RecDeskParks -> RecDesk-Parks" rather
// than 128 near-identical lines.
const byScraper = {};
for (const m of moves) {
  const family = `${m.from.replace(/-[^-]*$/, '')} -> ${m.to.replace(/-[^-]*$/, '')}`;
  byScraper[family] = (byScraper[family] || 0) + 1;
}
if (moves.length) {
  console.log('Renames, grouped:');
  Object.entries(byScraper).sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));
  console.log('\nSample:');
  moves.slice(0, 5).forEach(m => console.log(`  ${m.key}\n    -> ${m.newKey}`));
}

if (collisions.length) {
  console.log('\n⚠️  Collisions - a verdict already exists under the new key, old one LEFT IN PLACE:');
  collisions.slice(0, 20).forEach(c => console.log(`  ${c.key}\n    would clash with ${c.newKey}`));
}

if (!moves.length) {
  console.log('\n✅ Nothing to migrate.');
  process.exit(0);
}

if (!SAVE) {
  console.log(`\n🔍 DRY RUN - would move ${moves.length} keys. Re-run with --save.`);
  process.exit(0);
}

const moveMap = new Map(moves.map(m => [m.key, m.newKey]));
const rebuilt = {};
for (const key of keys) {
  rebuilt[moveMap.get(key) || key] = store[key];
}

const before = keys.length;
const after = Object.keys(rebuilt).length;
if (after !== before) {
  console.error(`\n❌ Refusing to write: entry count changed ${before} -> ${after}. A rename must never lose or merge entries.`);
  process.exit(1);
}

fs.copyFileSync(STORE, STORE + '.bak');
fs.writeFileSync(STORE, JSON.stringify(rebuilt, null, 2) + '\n', 'utf8');
console.log(`\n✅ Migrated ${moves.length} keys. ${before} entries in, ${after} out. Backup at ${path.basename(STORE)}.bak`);

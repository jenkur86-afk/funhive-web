#!/usr/bin/env node
/**
 * verify-coverage.js — answer "is this library already covered by some OTHER scraper?"
 * to an evidence standard, so a redundant-entry deletion can be justified.
 *
 * WHY THIS EXISTS
 * Three ad-hoc attempts at this question on 2026-08-05 produced confident wrong answers:
 *   - "Cary Branch Library" matched "Cary Night Market VI" (a festival).
 *   - "Alamance County Public Library" matched "Barnes & Noble Alamance Crossing" (a bookstore).
 *   - "Bragtown Branch Library" was reported as covered by evidence that the audited
 *     scraper had itself produced — circular.
 * Each failure came from treating NAME SIMILARITY as IDENTITY. Library names are mostly
 * geography, so after stripping "library/county/public/branch" the remaining token is a
 * place name shared by every business in that town. It cannot establish identity.
 *
 * THE RULES THIS SCRIPT ENFORCES
 *  1. Identity is established by source_url HOST ONLY. Never by name similarity.
 *  2. The scraper under audit is excluded from its own evidence (--exclude-scraper),
 *     INCLUDING any per-site renamed form of it (Family-ST -> Family-ST-siteslug).
 *  3. Output is three-valued and defaults to INCONCLUSIVE. Only host evidence yields
 *     COVERED. Name matches are reported as hints alongside INCONCLUSIVE, never as proof.
 *  4. events and activities are queried and reported SEPARATELY. A venue row in
 *     activities is a place on a map; it produces no events and never counts as event
 *     coverage.
 *  5. Only rows currently in the database count. Scrape-time FOUND counts from
 *     LIBRARY-SITE-AUDIT.md are not coverage — they measure what a page showed, not what
 *     survived dedup, filtering and expiry.
 *
 * Usage:
 *   node scripts/verify-coverage.js --state=NC --exclude-scraper=wordpress-NC \
 *        --host=gastonlibrary.libcal.com --name="Belmont Branch Library"
 *   node scripts/verify-coverage.js --state=NC --exclude-scraper=wordpress-NC --summary
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const state = (arg('state') || '').toUpperCase();
const exclude = arg('exclude-scraper') || '';
const wantHost = (arg('host') || '').replace(/^www\./, '');
const wantName = arg('name') || '';
const summary = args.includes('--summary');

if (!state) { console.error('--state=XX is required'); process.exit(1); }
if (!exclude && !summary) {
  console.error('--exclude-scraper=<name> is required: evidence produced by the scraper under audit is circular.');
  process.exit(1);
}

const hostOf = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return null; } };
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Is this row's scraper the one under audit — INCLUDING a renamed form of it?
 *
 * norm() already handles the case and punctuation drift that makes "wordpress-CT" and
 * "WordPress-CT" the same scraper. What it did not handle is the per-site rename now in
 * flight across the fleet: `CivicRec-Parks-Eastern` -> `CivicRec-Parks-Eastern-jackson-county-ms`.
 * Under the old exact comparison, a renamed variant of the AUDITED scraper counted as
 * third-party evidence, so a scraper could be judged "covered elsewhere" by rows it had
 * produced itself under its new name — precisely the circular argument this file exists to
 * prevent, reintroduced by a migration that postdates it.
 *
 * Not hypothetical: gate 6 counts 283 names still to migrate, and CivicRec-Parks-* and
 * RecDeskParks-* are hundreds of sites each.
 *
 * A strict hyphen-prefix is the test, matching the rename shape CLAUDE.md prescribes. It is
 * deliberately directional-agnostic — either name may be the older one — and it will not
 * match an unrelated family, because "communico ct hplct" does not start with "wordpress ct".
 */
const isSelf = (rowScraper, audited) => {
  const a = norm(rowScraper);
  const b = norm(audited);
  if (!b) return false;
  return a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ');
};

async function pageAll(table, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols)
      .eq('state', state)
      .order('id', { ascending: true })       // deterministic paging — required before .range()
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const events = await pageAll('events', 'venue, scraper_name, source_url, city');
  const acts = await pageAll('activities', 'name, source, city');
  console.log(`state=${state}  events=${events.length}  activities=${acts.length}`);
  if (exclude) {
    const self = events.filter(e => isSelf(e.scraper_name, exclude)).length;
    console.log(`excluded from evidence: ${self} event rows produced by "${exclude}"`);
  }
  const others = events.filter(e => !isSelf(e.scraper_name, exclude));

  if (summary) {
    const byHost = {};
    others.forEach(e => { const h = hostOf(e.source_url); if (h) byHost[h] = (byHost[h] || 0) + 1; });
    const noSrc = others.filter(e => !e.source_url).length;
    console.log(`\nevent rows from other scrapers: ${others.length}`);
    console.log(`  usable (have source_url)    : ${others.length - noSrc}`);
    console.log(`  UNUSABLE (source_url null)  : ${noSrc}  <- cannot establish identity for these`);
    console.log(`  distinct source hosts       : ${Object.keys(byHost).length}`);
    Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 20)
      .forEach(([h, n]) => console.log('     ' + String(n).padStart(5) + '  ' + h));
    return;
  }

  // ---- Rule 1: identity by host only.
  let verdict = 'INCONCLUSIVE', why = '';
  const hostRows = wantHost ? others.filter(e => hostOf(e.source_url) === wantHost) : [];
  if (wantHost && hostRows.length) {
    verdict = 'COVERED';
    const who = [...new Set(hostRows.map(e => e.scraper_name))];
    why = `${hostRows.length} event row(s) carry source_url host "${wantHost}", produced by: ${who.join(', ')}`;
  } else if (wantHost) {
    // Absence of host rows is only meaningful if source_url is well populated.
    const cov = others.filter(e => e.source_url).length / Math.max(1, others.length);
    if (cov >= 0.9) {
      verdict = 'NOT_COVERED';
      why = `no event row carries host "${wantHost}", and source_url coverage is ${(100 * cov).toFixed(0)}% so absence is meaningful`;
    } else {
      why = `no event row carries host "${wantHost}", but source_url is only ${(100 * cov).toFixed(0)}% populated — absence proves nothing`;
    }
  } else {
    why = 'no --host given; identity cannot be established without one';
  }

  console.log(`\nVERDICT: ${verdict}`);
  console.log(`  ${why}`);

  // ---- Rule 3: name matches are hints, never proof.
  if (wantName) {
    const n = norm(wantName);
    const hint = others.filter(e => e.venue && (norm(e.venue).includes(n) || n.includes(norm(e.venue))));
    console.log(`\n  name-similarity hints for "${wantName}" (NOT evidence): ${hint.length}`);
    [...new Set(hint.map(e => `"${e.venue}" [${e.city}] via ${e.scraper_name}`))].slice(0, 6)
      .forEach(h => console.log('     ' + h));
    if (hint.length && verdict !== 'COVERED') {
      console.log('     ^ these are name coincidences until a source_url host confirms them.');
    }
  }

  // ---- Rule 4: activities reported separately, never as event coverage.
  if (wantName || wantHost) {
    const n = norm(wantName);
    const av = acts.filter(a =>
      (wantHost && hostOf(a.source) === wantHost) || (n && norm(a.name).includes(n)));
    console.log(`\n  activities (VENUE records — not event coverage): ${av.length}`);
    av.slice(0, 5).forEach(a => console.log(`     "${a.name}" [${a.city}] source=${a.source}`));
    if (av.length) console.log('     ^ a venue row is a place on a map. It produces no events.');
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

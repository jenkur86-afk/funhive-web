#!/usr/bin/env node
/**
 * check-scraper-names.js — audit `events.scraper_name` against `scraper-registry.js`.
 *
 * WHY THIS MATTERS
 * `scraper_name` is the only join between a database row and the registry entry that
 * produced it. When it drifts, three things silently break:
 *   1. Registry health/coverage reporting cannot match rows to scrapers.
 *   2. The daily audits (AGE-RANGE-AUDIT.md, LIBRARY-SITE-AUDIT.md) group by scraper_name,
 *      so drift either splits one scraper across many rows or collapses many sites into one.
 *   3. `scrapers/logs/scraper-summary.log` reports registry keys, so a mismatched
 *      scraper_name cannot be reconciled with its own run — this is what forced the age
 *      audit into created_at time-window archaeology.
 *
 * THE RULE (see CLAUDE.md "Scraper Naming"): every scraper_name must be either
 *   EXACT     — identical to a registry key, for single-site scrapers; or
 *   PREFIXED  — `<registryKey>-<siteSlug>`, for multi-site scrapers.
 * Anything else is drift.
 *
 * Read-only. Selective columns. Paginated with .order() before .range().
 *
 * Usage:
 *   node scripts/check-scraper-names.js
 *   node scripts/check-scraper-names.js --since=2026-08-01T00:00:00Z
 *   node scripts/check-scraper-names.js --strict     # exit 1 if any drift is found
 */

const path = require('path');
const { supabase } = require('../scrapers/helpers/supabase-adapter');
const reg = require('../scrapers/scraper-registry.js');

const args = process.argv.slice(2);
const arg = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
const since = arg('since') || '2026-08-01T00:00:00Z';
const strict = args.includes('--strict');

const KEYS = [...Object.keys(reg.SCRAPERS), ...Object.keys(reg.MACARONI_SCRAPERS)];
const KEYSET = new Set(KEYS);
const LOWER = new Map(KEYS.map(k => [k.toLowerCase(), k]));

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// Longest matching registry key wins, so "Activities-Eastern-US" beats "Activities".
function prefixKey(name) {
  let best = null;
  KEYS.forEach(k => { if (name.startsWith(k + '-') && (!best || k.length > best.length)) best = k; });
  return best;
}

function classify(name) {
  if (!name) return { cls: 'NULL', fix: null, why: 'scraper_name is null — set metadata.scraperName in the scraper' };
  if (KEYSET.has(name)) return { cls: 'EXACT', fix: null, why: '' };

  const pk = prefixKey(name);
  if (pk) {
    const slug = name.slice(pk.length + 1);
    if (SLUG_RE.test(slug)) return { cls: 'PREFIXED', fix: null, why: '' };
    return { cls: 'BAD_SLUG', fix: `${pk}-${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      why: `site slug "${slug}" must be lowercase [a-z0-9-]` };
  }

  // Case-only drift, e.g. wordpress-NY vs WordPress-NY.
  if (LOWER.has(name.toLowerCase())) {
    return { cls: 'CASE_MISMATCH', fix: LOWER.get(name.toLowerCase()),
      why: `differs from registry key only by case` };
  }
  const lp = [...LOWER.keys()].find(k => name.toLowerCase().startsWith(k + '-'));
  if (lp) {
    const real = LOWER.get(lp);
    return { cls: 'CASE_MISMATCH', fix: `${real}-${name.slice(lp.length + 1).toLowerCase()}`,
      why: `prefix differs from registry key "${real}" only by case` };
  }

  // Punctuation/format drift: same letters, different separators.
  // The suggested fix MUST preserve any site slug. Collapsing "RecDeskParks-ccrec" to bare
  // "RecDesk-Parks" would merge every site onto one name — the same aggregation that
  // AGE-RANGE-AUDIT.md's "No aggregation, ever" rule forbids.
  const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sq = squash(name);
  const whole = KEYS.find(k => squash(k) === sq);
  if (whole) return { cls: 'FORMAT_DRIFT', fix: whole, why: `matches registry key "${whole}" ignoring case and punctuation` };

  // Longest squashed-prefix match, so the remainder is the real site slug.
  let bestK = null;
  KEYS.forEach(k => {
    const sk = squash(k);
    if (sk.length >= 8 && sq.startsWith(sk) && (!bestK || sk.length > squash(bestK).length)) bestK = k;
  });
  if (bestK) {
    // Recover the slug from the original string by skipping the matched prefix's characters.
    let consumed = 0, need = squash(bestK).length;
    for (let i = 0; i < name.length && need > 0; i++) {
      if (/[a-z0-9]/i.test(name[i])) need--;
      consumed = i + 1;
    }
    const slug = name.slice(consumed).replace(/^[^a-z0-9]+/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { cls: 'FORMAT_DRIFT', fix: slug ? `${bestK}-${slug}` : bestK,
      why: `matches registry key "${bestK}" ignoring case and punctuation${slug ? `; site slug "${slug}" preserved` : ''}` };
  }

  if (/\s/.test(name)) return { cls: 'FREE_TEXT', fix: null, why: 'contains spaces — looks like a display name, not a scraper id' };
  return { cls: 'UNRELATED', fix: null, why: 'no registry key matches; scraper may be unregistered or writing a site name' };
}

// Exported so other tooling can reuse the SAME classification instead of re-deriving it.
// scripts/migrate-verification-keys.js needs it to repair verdict-store keys after a
// scraper rename; a second copy of these rules would drift from this one immediately.
module.exports = { classify, KEYS, KEYSET };

// Only run the audit when invoked directly — requiring this file must not hit the DB.
if (require.main !== module) return;

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('events')
      .select('scraper_name')
      .gte('created_at', since)
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) { console.error('query failed:', error.message); process.exit(1); }
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const counts = new Map();
  rows.forEach(r => counts.set(r.scraper_name, (counts.get(r.scraper_name) || 0) + 1));

  const groups = {};
  [...counts.entries()].forEach(([name, n]) => {
    const c = classify(name);
    (groups[c.cls] = groups[c.cls] || []).push({ name, n, ...c });
  });

  console.log(`registry keys: ${KEYS.length}`);
  console.log(`rows since ${since}: ${rows.length}`);
  console.log(`distinct scraper_name values: ${counts.size}\n`);

  const order = ['EXACT', 'PREFIXED', 'CASE_MISMATCH', 'FORMAT_DRIFT', 'BAD_SLUG', 'FREE_TEXT', 'UNRELATED', 'NULL'];
  const OK = new Set(['EXACT', 'PREFIXED']);
  order.forEach(cls => {
    const g = groups[cls];
    if (!g) return;
    const rowsN = g.reduce((s, x) => s + x.n, 0);
    console.log(`${OK.has(cls) ? '  OK  ' : ' DRIFT'} ${cls.padEnd(14)} ${String(g.length).padStart(4)} names  ${String(rowsN).padStart(7)} rows`);
  });

  const drift = order.filter(c => !OK.has(c)).flatMap(c => groups[c] || []).sort((a, b) => b.n - a.n);
  if (drift.length) {
    console.log(`\n=== DRIFT DETAIL (${drift.length} names, worst first) ===`);
    drift.slice(0, 40).forEach(d => {
      console.log(`  ${String(d.n).padStart(6)}  ${d.cls.padEnd(14)} ${d.name}`);
      console.log(`          ${d.why}${d.fix ? `\n          suggested: ${d.fix}` : ''}`);
    });
    if (drift.length > 40) console.log(`  … and ${drift.length - 40} more`);
  }

  // Multi-site scrapers must not collapse their sites onto one name.
  console.log('\n=== multi-site coverage (registry keys declaring >1 site) ===');
  const multi = Object.entries({ ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS })
    .filter(([, s]) => (s.sites || 0) > 1);
  multi.forEach(([k, s]) => {
    const seen = [...counts.keys()].filter(n => n === k || (n && n.startsWith(k + '-'))).length;
    if (!seen) return;
    const flag = seen === 1 && s.sites > 1 ? '  <-- COLLAPSED: all sites share one name' : '';
    console.log(`  ${k.padEnd(28)} declares ${String(s.sites).padStart(4)} sites, ${String(seen).padStart(4)} distinct scraper_name${flag}`);
  });

  const bad = drift.length;
  console.log(`\n${bad ? `${bad} name(s) drift from the registry convention.` : 'All scraper names conform.'}`);
  if (strict && bad) process.exit(1);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * age-specificity-by-section.js — gate 5, broken out per dated section.
 *
 * WHY: gate 5 ("age brackets resolved") is computed over the WHOLE of
 * AGE-RANGE-AUDIT.md, so every new section shifts it. Read as a time series it
 * looks like the metric rises and falls — and it has repeatedly been reported as
 * a regression. But each section is ONE rotation group, and the groups do not
 * carry the same content: RecDesk/parks-heavy groups are genuinely more
 * All-Ages than library-heavy ones. A cumulative number moving because the mix
 * changed is not a detection regression, and treating it as one sends people
 * looking for a bug in detectAgeRange() that is not there.
 *
 * This prints per-section specificity so the two can be told apart. Read-only,
 * local file only, zero database egress.
 *
 *   node scripts/age-specificity-by-section.js
 */

const fs = require('fs');
const path = require('path');

const AGE_MD = path.join(__dirname, '..', 'AGE-RANGE-AUDIT.md');
const src = fs.readFileSync(AGE_MD, 'utf8');
const lines = src.split('\n');

// Same header discipline as project-status.js: require the "babies" column so the
// >=70% flagged sub-table (which lacks it) cannot be counted a second time.
const MAIN = /\|\s*site\s*\|\s*scraper\s*\|\s*all ages\s*\|\s*babies/i;

let section = '(before first dated section)';
let cols = null;
const acc = new Map();

const cells = l => l.split('|').slice(1, -1).map(s => s.trim());
const toInt = s => { const m = String(s).replace(/,/g, '').match(/-?\d+/); return m ? parseInt(m[0], 10) : null; };

for (const line of lines) {
  const h = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(line.trim());
  if (h) { section = h[1]; cols = null; continue; }
  if (/^##\s/.test(line.trim())) { cols = null; continue; }

  if (line.trim().startsWith('|')) {
    if (MAIN.test(line)) { cols = cells(line).map(c => c.toLowerCase()); continue; }
    if (/^\|[\s:-]+\|/.test(line)) continue;
    if (!cols) continue;
    const c = cells(line);
    if (c.length !== cols.length) continue;
    const a = toInt(c[cols.indexOf('all ages')]);
    const ti = cols.findIndex(x => x.startsWith('total'));
    const t = ti >= 0 ? toInt(c[ti]) : null;
    if (a === null || t === null || t <= 0) continue;
    const cur = acc.get(section) || { allAges: 0, total: 0, rows: 0 };
    cur.allAges += a; cur.total += t; cur.rows++;
    acc.set(section, cur);
  }
}

// Which rotation group produced each section, read from that day's run log. This
// is the whole point: a section is one GROUP's content, and the groups differ in
// composition far more than detection quality varies.
const LOGDIR = path.join(__dirname, '..', 'scrapers', 'logs');
function groupFor(date) {
  const f = path.join(LOGDIR, `scraper-run-${date}.log`);
  if (!fs.existsSync(f)) return '?';
  const m = /Running Group (\d)/.exec(fs.readFileSync(f, 'utf8'));
  return m ? 'G' + m[1] : 'NONE';
}

const rows = [...acc.entries()].filter(([s]) => /^\d{4}-\d{2}-\d{2}$/.test(s)).sort();
console.log('\nPer-section age specificity (higher = more events in a specific bracket)\n');
console.log('section     grp    rows    events   allAges   specific%');
let cumA = 0, cumT = 0;
const byGroup = new Map();
for (const [s, v] of rows) {
  const spec = ((v.total - v.allAges) / v.total) * 100;
  cumA += v.allAges; cumT += v.total;
  const g = groupFor(s);
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push([s, spec]);
  console.log(`${s}  ${g.padEnd(5)} ${String(v.rows).padStart(5)}  ${String(v.total).padStart(8)}  ${String(v.allAges).padStart(8)}  ${spec.toFixed(1).padStart(8)}%`);
}
console.log(`\ncumulative (gate 5 as project-status computes it): ${(((cumT - cumA) / cumT) * 100).toFixed(1)}%`);

console.log('\nBy rotation group — this is the like-for-like comparison:');
for (const g of [...byGroup.keys()].sort()) {
  const v = byGroup.get(g).map(x => x[1]);
  if (!v.length) continue;
  const lo = Math.min(...v), hi = Math.max(...v);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  console.log(`  ${g.padEnd(5)} n=${String(v.length).padStart(2)}  mean ${mean.toFixed(1)}%   range ${lo.toFixed(1)}–${hi.toFixed(1)}%`);
  console.log(`        ${byGroup.get(g).map(([s, p]) => `${s.slice(5)}:${p.toFixed(0)}%`).join('  ')}`);
}

console.log(`
READ THIS BEFORE CALLING GATE 5 A REGRESSION.
Specificity is a property of WHICH GROUP RAN, not of detection quality: the
groups differ by tens of points because their content differs (parks/RecDesk
venues are genuinely All-Ages; library programmes are not). The cumulative gate
therefore moves whenever the group mix moves, and a fall is not evidence of a
detectAgeRange() regression. Two further confounders, both real:
  - The 2026-09-02 ROTATION REBALANCE changed which scrapers sit in which group,
    so a group's own history has a step change at that date and readings either
    side of it are not comparable.
  - Sections reconstructed after the fact (e.g. 2026-09-04 and 2026-09-05, both
    written on 09-05) attribute a scraped_at window to a date rather than to a
    group, so their group label is unreliable.
Compare same-group, same-side-of-the-rebalance readings, or do not compare.`);

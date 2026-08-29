#!/usr/bin/env node
/**
 * Rebuilds `reports/renders-nothing-sites.md` — the enumerated `CONFIGURED-ZERO`
 * population for MASTER-PLAN §10a.
 *
 * WHAT IT SELECTS
 * ---------------
 * Every entry in `reports/verification-comments.json` whose verdict is UNVERIFIABLE with the
 * "rendered fully but shows no dated events" comment: the page loaded cleanly under the
 * scrapers' own Puppeteer stack — no timeout, no bot-block, no TLS error — and then showed no
 * dated events and no event containers.
 *
 * These stay UNVERIFIABLE rather than MATCHES on purpose (the 2026-08-10 Lake Sinclair rule):
 * a page that merely renders nothing has not SAID it has no upcoming events. Contrast the ten
 * WordPress-NY libraries closed as MATCHES on 2026-08-27 — closed only because their own TEC
 * REST endpoint returned a literal `total: 0`, which is an affirmative answer.
 *
 * WHY EACH ROW CARRIES A STATUS
 * -----------------------------
 * A bare site list is not actionable. Each row is resolved back to its own scraper's config:
 *   open        — unguarded and present in config; this is the work
 *   guarded     — already carries urlCollision and is skipped at run time
 *   unresolved  — the audit name does not match a config entry, usually scraper_name drift
 *
 * TWO RESOLUTION SUBTLETIES, both learned by getting them wrong first:
 *  - The scraper key is resolved through the REGISTRY to that scraper's own file. Matching a
 *    library name across all files hits same-named libraries in other states — WordPress-NY
 *    alone has two entries called "Patterson Library".
 *  - Audit site names often carry a " (City, ST)" suffix the config lacks, so the bare name is
 *    tried as a fallback. Without it, 55 rows looked unresolvable that were not.
 *
 * Usage:
 *   node scripts/build-renders-nothing-list.js
 *   node scripts/build-renders-nothing-list.js --out=reports/renders-nothing-sites.md
 *   node scripts/build-renders-nothing-list.js --json=out.json    # machine-readable too
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { SCRAPERS, isScraperActive, getActiveStates } = require(path.join(ROOT, 'scrapers/scraper-registry'));
const active = getActiveStates();

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
// Resolve against the repo root, but let an absolute path through unchanged —
// path.join(ROOT, '/abs/path') silently produces a nonsense path under the repo.
const resolveOut = p => path.isAbsolute(p) ? p : path.join(ROOT, p);
const OUT = resolveOut(getArg('out', 'reports/renders-nothing-sites.md'));
const JSON_OUT = getArg('json', null);

const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/verification-comments.json'), 'utf8'));
const rows = Object.entries(store)
  .map(([k, v]) => { const [scraper, site] = k.split('|||'); return { scraper, site, ...v }; })
  .filter(r => r.verdict === 'UNVERIFIABLE' && /rendered fully but shows no dated events/i.test(r.comment || ''));

const cache = {};
const Q = String.fromCharCode(39), DQ = String.fromCharCode(34);

function resolve(scraper, site) {
  const key = Object.keys(SCRAPERS).find(k => k.toLowerCase() === scraper.toLowerCase());
  const reg = SCRAPERS[scraper] || (key ? SCRAPERS[key] : null);
  if (!reg) return { why: 'no registry key (scraper_name drift)' };
  if (!isScraperActive(reg, active)) return { why: 'inactive region' };
  const f = path.join(ROOT, 'scrapers', reg.file.replace(/^\.\//, ''));
  if (!fs.existsSync(f)) return { why: 'file missing' };
  const src = cache[f] || (cache[f] = fs.readFileSync(f, 'utf8'));
  const names = [site, site.replace(/\s*\([^)]*\)\s*$/, '').trim()];
  let i = -1;
  for (const n of names) {
    i = src.indexOf('name: ' + Q + n + Q);
    if (i === -1) i = src.indexOf('name: ' + DQ + n + DQ);
    if (i !== -1) break;
  }
  if (i === -1) return { why: 'name not found in its own config' };
  const entry = src.slice(i, src.indexOf('},', i) + 2);
  return {
    url: (/eventsUrl:\s*'([^']+)'/.exec(entry) || /url:\s*'([^']+)'/.exec(entry) || [])[1] || null,
    state: (/state:\s*'([A-Z]{2})'/.exec(entry) || [])[1] || null,
    city: (/city:\s*'([^']+)'/.exec(entry) || [])[1] || null,
    guarded: /urlCollision/.test(entry)
  };
}

const out = rows.map(r => ({ scraper: r.scraper, site: r.site, ...resolve(r.scraper, r.site) }));
const status = r => r.guarded ? 'guarded' : r.why ? 'unresolved' : 'open';

const groups = {};
out.forEach(r => (groups[r.scraper] = groups[r.scraper] || []).push(r));
const ordered = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
const open = out.filter(r => status(r) === 'open');
const guarded = out.filter(r => status(r) === 'guarded').length;
const unresolved = out.filter(r => status(r) === 'unresolved').length;
const today = new Date().toISOString().slice(0, 10);

let md = `# Sites that render but show nothing

Generated ${today} by \`scripts/build-renders-nothing-list.js\` from
\`reports/verification-comments.json\`. Do not hand-edit — re-run the script.

These ${out.length} sites load cleanly under the scrapers' own Puppeteer stack — no timeout, no
bot-block, no TLS error — and then present **no dated events and no event containers**.

They are recorded \`UNVERIFIABLE\`, not \`MATCHES\`, on purpose (the 2026-08-10 Lake Sinclair
rule): a page that merely renders nothing has not *said* it has no upcoming events, and treating
silence as confirmation is how a real extraction bug gets closed as working-as-intended. Compare
the ten WordPress-NY libraries closed as MATCHES on 2026-08-27 — closed only because their own
TEC REST endpoint returned a literal \`total: 0\`, which is an affirmative answer.

**This is MASTER-PLAN Phase 10's \`CONFIGURED-ZERO\` population. Read §10b before using it as a
denominator** — a "renders nothing" verdict describes what a verifier saw, not what the scraper
does, and those have already diverged twice (Assabet-NH-MA, and three TEC sites whose verdicts
predated the helper landing).

| | Count |
|---|---|
| Total | ${out.length} |
| **Open** — unguarded and present in config | **${open.length}** (${open.filter(r => r.url).length} with a URL recorded) |
| Guarded — already carries \`urlCollision\`, skipped at run time | ${guarded} |
| Unresolved — audit name not matched to a config entry | ${unresolved} |
| Scrapers | ${ordered.length} |
`;

const byScraper = {};
open.forEach(r => byScraper[r.scraper] = (byScraper[r.scraper] || 0) + 1);
md += `\nOpen rows by scraper: ` +
  Object.entries(byScraper).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') + `.\n`;

for (const [scraper, list] of ordered) {
  const o = list.filter(r => status(r) === 'open').length;
  md += `\n## ${scraper} — ${list.length} sites (${o} open)\n\n`;
  md += `| Library site | City | ST | Configured URL | Status |\n|---|---|---|---|---|\n`;
  for (const r of list.sort((a, b) => a.site.localeCompare(b.site))) {
    const st = status(r);
    md += `| ${r.site.replace(/\|/g, '\\|')} | ${r.city || '—'} | ${r.state || '—'} | ` +
          `${r.url ? '<' + r.url + '>' : '—'} | ${st === 'unresolved' ? (r.why || st) : st} |\n`;
  }
}

fs.writeFileSync(OUT, md);
console.log(`wrote ${path.relative(ROOT, OUT)} — ${out.length} rows / ${ordered.length} scrapers`);
console.log(`  open ${open.length}  guarded ${guarded}  unresolved ${unresolved}`);
if (JSON_OUT) {
  fs.writeFileSync(resolveOut(JSON_OUT), JSON.stringify(out, null, 1));
  console.log(`wrote ${JSON_OUT}`);
}

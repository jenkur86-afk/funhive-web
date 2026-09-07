#!/usr/bin/env node
/**
 * guard-dead-domains.js — add a urlCollision guard to config entries whose
 * configured URL is confirmed dead, parked, hijacked, or pointing at another
 * state's institution.
 *
 * WHY: a confirmed-dead entry that is still LIVE in config gets visited on every
 * rotation. It cannot produce data, it costs run time, and — when the domain has
 * been squatted rather than merely abandoned — it is one selector change away
 * from importing a gambling site's markup as library events. Guarding stops the
 * visit while KEEPING the row, so the library stays an explained gap in
 * LIBRARY-SITE-AUDIT.md rather than vanishing. Disabling is not deleting.
 *
 * EVIDENCE BAR: this only acts on verdicts whose comment names a specific,
 * durable destination — "redirects to forsale.godaddy.com", "serves an online
 * gambling site", "redirects to newportoregon.gov", a DNS failure. A bare
 * "HTTP 404 on the configured URL" is deliberately NOT enough: a 404 on one path
 * says nothing about the host, and treating it as death would have guarded
 * Seekonk PL, whose root returns 200 for the right library. Those are re-probed
 * separately.
 *
 * Dry run by default; --save to write. Skips entries already guarded.
 *
 *   node scripts/guard-dead-domains.js
 *   node scripts/guard-dead-domains.js --save
 */

const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const ROOT = path.join(__dirname, '..');
const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
const ALL = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };
const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'verification-comments.json'), 'utf8'));

const DURABLE = /redirects? to|parked|gambling|for-?sale|godaddy|squat|hijack|no DNS|ENOTFOUND|serves (a|an) /i;
const DEADISH = /dead|404|410|parked|gambling|hijack|squat|no DNS|ENOTFOUND/i;

function fileFor(scraper) {
  let key = scraper;
  if (!ALL[key]) {
    const c = Object.keys(ALL).filter(k => scraper.startsWith(k + '-')).sort((a, b) => b.length - a.length)[0];
    if (c) key = c;
  }
  const sc = ALL[key];
  return sc && sc.file ? path.join(ROOT, 'scrapers', sc.file.replace(/^\.\//, '')) : null;
}

// Audit names carry "(City, ST)"; config names do not.
const bare = n => String(n).replace(/\s*\([^)]*\)\s*$/, '').trim();

const targets = [];
for (const [key, e] of Object.entries(store)) {
  if (e.verdict !== 'MISMATCH' || e.status) continue;
  const c = String(e.comment || '');
  if (!DEADISH.test(c) || !DURABLE.test(c)) continue;
  const i = key.indexOf('|||');
  targets.push({ scraper: key.slice(0, i), site: key.slice(i + 3), comment: c });
}

let guarded = 0, already = 0, missing = 0;
const touched = new Set();
for (const t of targets) {
  const f = fileFor(t.scraper);
  if (!f || !fs.existsSync(f)) { console.log(`NO FILE   ${t.scraper} :: ${t.site}`); missing++; continue; }
  let s = fs.readFileSync(f, 'utf8');
  const nm = bare(t.site);
  const at = s.indexOf(`name: '${nm}'`);
  if (at < 0) { console.log(`NOT IN CONFIG  ${t.scraper} :: ${nm}`); missing++; continue; }
  const ls = s.lastIndexOf('\n', at) + 1;
  const le = s.indexOf('\n', at);
  const line = s.slice(ls, le);
  if (/urlCollision/.test(line)) { already++; continue; }
  if (/^\s*\/\//.test(line)) { already++; continue; }        // already commented out
  const close = line.lastIndexOf('}');
  if (close < 0) { missing++; continue; }

  const reason = `dead/hijacked domain, confirmed: ${t.comment.replace(/\s+/g, ' ').slice(0, 300)} Guarded 2026-09-07 so the rotation stops visiting it — a squatted domain is one selector change away from importing another site's markup as events. NOT deleted: this stays an explained OPEN COVERAGE GAP until a real URL is found.`;
  const patched = line.slice(0, close).replace(/,\s*$/, '') + `, urlCollision: ${JSON.stringify(reason)} ` + line.slice(close);
  if (SAVE) fs.writeFileSync(f, s.slice(0, ls) + patched + s.slice(le), 'utf8');
  console.log(`${SAVE ? 'guarded' : 'would guard'}  ${t.scraper} :: ${nm}`);
  touched.add(f);
  guarded++;
}

console.log(`\ncandidates ${targets.length}  ${SAVE ? 'guarded' : 'would guard'} ${guarded}  already ${already}  unresolvable ${missing}`);
console.log(`files touched: ${touched.size}`);
if (!SAVE) console.log('\nDRY RUN — re-run with --save to write.');

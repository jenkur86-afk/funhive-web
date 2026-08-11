#!/usr/bin/env node
/**
 * Applies verified library URLs to the WordPress-{state} config arrays.
 *
 * Input: the lookup tuples produced by the URL-verification pass —
 *   [name, city, state, verdict, url, eventsUrl, evidence]
 *
 *   FOUND / OWNS_HOST  -> rewrite that entry's url and eventsUrl in place.
 *                         This CLOSES a gap: the entry stops pointing at another
 *                         state's library and starts pointing at the real one.
 *   NOT_FOUND          -> comment the entry out and record it in
 *                         reports/defect-a-removals.md as a coverage gap. An
 *                         entry aimed at the wrong institution is worse than an
 *                         honest zero, so leaving it live is not an option.
 *
 * SAFETY RULES, all of which exist because this repo has been burned before:
 *  - An entry is matched on name AND state together. Library names repeat across
 *    states constantly ("Oxford Public Library" was claimed by five at once), so
 *    name alone would rewrite the wrong row.
 *  - Only lines that are currently LIVE (not already commented) are touched.
 *  - A FOUND row is rejected unless it carries a real http(s) URL and non-empty
 *    evidence. An unevidenced URL is exactly the guess that caused this mess.
 *  - A FOUND row is rejected if its new host still matches the old bad host.
 *
 * Dry run by default; --save to write.
 *   node scripts/apply-verified-urls.js <result files…>
 *   node scripts/apply-verified-urls.js <result files…> --save
 */
const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ROOT = path.join(__dirname, '..');

if (!files.length) {
  console.error('usage: node scripts/apply-verified-urls.js <lookup-result-*.txt …> [--save]');
  process.exit(1);
}

// ------------------------------------------------------------------ parse
const rows = [];
const bad = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`missing input: ${f}`); continue; }
  const text = fs.readFileSync(f, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/,\s*$/, '');
    if (!line.startsWith('[')) continue;
    let t;
    try { t = JSON.parse(line); } catch (e) { bad.push({ line: line.slice(0, 90), why: 'unparseable' }); continue; }
    if (!Array.isArray(t) || t.length < 7) { bad.push({ line: line.slice(0, 90), why: 'wrong arity' }); continue; }
    const [name, city, state, verdict, url, eventsUrl, evidence] = t;
    if (!['FOUND', 'OWNS_HOST', 'NOT_FOUND'].includes(verdict)) {
      bad.push({ line: line.slice(0, 90), why: `bad verdict ${verdict}` }); continue;
    }
    rows.push({ name, city, state, verdict, url, eventsUrl, evidence, src: path.basename(f) });
  }
}

const hostOf = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return ''; } };

const updated = [], removed = [], rejected = [], missing = [];

for (const r of rows) {
  const file = path.join(ROOT, 'scrapers', `scraper-wordpress-libraries-${String(r.state).toLowerCase()}.js`);
  if (!fs.existsSync(file)) { missing.push({ ...r, why: 'no state file' }); continue; }

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const idx = lines.findIndex(l =>
    !l.trim().startsWith('//') &&
    l.includes(`name: '${r.name}'`) &&
    l.includes(`state: '${r.state}'`)
  );
  if (idx === -1) { missing.push({ ...r, why: 'live entry not found (already removed?)' }); continue; }

  const oldHost = hostOf((lines[idx].match(/eventsUrl:\s*'([^']+)'/) || [])[1] || '');

  if (r.verdict === 'NOT_FOUND') {
    lines[idx] =
      `  // REMOVED 2026-08-11 (Defect A): no verifiable official site. ${String(r.evidence || '').slice(0, 150)}` +
      `\n  // RECORDED COVERAGE GAP - restore if a real URL is found.` +
      `\n  // ` + lines[idx].trim();
    removed.push(r);
    if (SAVE) fs.writeFileSync(file, lines.join('\n'), 'utf8');
    continue;
  }

  // FOUND / OWNS_HOST — validate before trusting.
  if (!/^https?:\/\//.test(String(r.url || ''))) { rejected.push({ ...r, why: 'no http(s) url' }); continue; }
  if (!String(r.evidence || '').trim()) { rejected.push({ ...r, why: 'no evidence given' }); continue; }
  const newHost = hostOf(r.url);
  if (!newHost) { rejected.push({ ...r, why: 'unparseable url' }); continue; }
  if (r.verdict === 'FOUND' && newHost === oldHost) {
    rejected.push({ ...r, why: `new host equals the old bad host (${oldHost})` });
    continue;
  }

  const ev = r.eventsUrl && /^https?:\/\//.test(r.eventsUrl) ? r.eventsUrl : r.url;
  let line = lines[idx];
  line = line.replace(/url:\s*'[^']*'/, `url: '${r.url}'`);
  line = line.replace(/eventsUrl:\s*'[^']*'/, `eventsUrl: '${ev}'`);
  if (!/eventsUrl:/.test(line)) { rejected.push({ ...r, why: 'entry has no eventsUrl field' }); continue; }

  lines[idx] = `  // URL corrected 2026-08-11 (was ${oldHost || 'unknown'}): ${String(r.evidence).slice(0, 140)}\n` + line;
  updated.push({ ...r, oldHost, newHost });
  if (SAVE) fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

// ------------------------------------------------------------------ report
console.log(`parsed tuples        : ${rows.length}   (malformed: ${bad.length})`);
console.log(`${SAVE ? 'CORRECTED' : 'would correct'} URLs   : ${updated.length}`);
console.log(`${SAVE ? 'REMOVED' : 'would remove'} entries  : ${removed.length}`);
console.log(`rejected (unsafe)    : ${rejected.length}`);
console.log(`not found in config  : ${missing.length}`);

if (updated.length) {
  console.log('\n=== URL CORRECTIONS (gap closed) ===');
  updated.forEach(r => console.log(`  ${r.state}  ${r.name.slice(0, 40).padEnd(40)} ${r.oldHost || '?'} -> ${r.newHost}`));
}
if (rejected.length) {
  console.log('\n=== REJECTED — not applied ===');
  rejected.forEach(r => console.log(`  ${r.state}  ${r.name.slice(0, 40).padEnd(40)} ${r.why}`));
}
if (bad.length) {
  console.log('\n=== MALFORMED INPUT LINES ===');
  bad.slice(0, 10).forEach(b => console.log(`  ${b.why}: ${b.line}`));
}

if (SAVE && removed.length) {
  const rowsMd = removed.map(r =>
    `| ${r.name} | ${r.city || ''} | ${r.state} | | no verifiable official site — ${String(r.evidence || '').slice(0, 120)} |`
  ).join('\n');
  fs.appendFileSync(path.join(ROOT, 'reports', 'defect-a-removals.md'),
    `\n\n## Removed 2026-08-11 — URL lookup found no verifiable site\n\n` +
    `Each was searched for during the collision cleanup and no official site could be verified.\n` +
    `Recorded so they can be restored if one is found later.\n\n` +
    `| Library | City | State | Old URL | Why |\n|---|---|---|---|---|\n${rowsMd}\n`);
  console.log(`\nAppended ${removed.length} rows to reports/defect-a-removals.md`);
}

console.log(`\n${SAVE ? 'Saved.' : 'Dry run — pass --save to write.'}`);

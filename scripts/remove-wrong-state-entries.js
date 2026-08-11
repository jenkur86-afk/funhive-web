#!/usr/bin/env node
/**
 * Comments out library config entries whose configured host verifiably serves a
 * library in a DIFFERENT state, using the confirmed-MISMATCH verdicts in
 * reports/verification-comments.json as evidence.
 *
 * WHY NOW. These entries were identified on 2026-08-09 but left in place, and
 * until today they were mostly harmless because the WordPress DOM extraction
 * could not read their pages anyway — they returned 0. That changed today: the
 * dom-date-resolver work took WordPress-NC from 141 invalid dates to 0 and
 * WordPress-TN from 54 to 0. A scraper that now extracts successfully from a
 * wrong-state host will start writing that other state's events under this
 * entry's name and state. Fixing extraction made these collisions dangerous,
 * so they get removed in the same pass.
 *
 * WHAT THIS IS NOT. This is not a claim that the library does not matter or has
 * no site. Every removal is appended to reports/defect-a-removals.md with its
 * name, city, state and old URL so it can be restored the moment a real URL is
 * verified. A removal is a RECORDED COVERAGE GAP.
 *
 * Entries whose verdict describes an extraction or rendering problem on the
 * RIGHT site are deliberately excluded — deleting those would destroy working
 * coverage. Only wrong-institution evidence qualifies.
 *
 * Dry run by default; --save to write.
 */
const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const ROOT = path.join(__dirname, '..');
const SCRATCH = process.env.COLLISION_INPUT ||
  'C:/Users/jenku/AppData/Local/Temp/claude/C--dev-funhive-web/f79d9954-3b23-4ad1-9252-56bf5c6b775e/scratchpad/collisions-wrongstate.json';

const rows = JSON.parse(fs.readFileSync(SCRATCH, 'utf8'));

// Hosts that are not a library at all, or no longer resolve to one. Same class
// of defect, but the verdict text names a city+abbreviation rather than a
// SHOUTED state name, so the automatic classifier does not catch them.
const EXTRA = [
  { name: 'Liberty Public Library', state: 'NY', trueState: 'TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX)' },
  { name: 'Liberty Public Library', state: 'NC', trueState: 'TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX)' },
  { name: 'Liberty Public Library', state: 'MS', trueState: 'TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX)' },
  { name: 'Macon County Public Library', state: 'TN', trueState: 'dead — 301s off-host to running-care.com, a French running blog' }
];

const all = [...rows.map(r => ({ name: r.name, state: r.state, trueState: r.trueState, url: r.url, city: r.city })), ...EXTRA];

const applied = [];
const notFound = [];

for (const r of all) {
  const file = path.join(ROOT, 'scrapers', `scraper-wordpress-libraries-${r.state.toLowerCase()}.js`);
  if (!fs.existsSync(file)) { notFound.push({ ...r, why: 'no state file' }); continue; }

  let src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // Match the entry line by exact name AND state, so a same-named library in
  // another state's file can never be hit.
  const idx = lines.findIndex(l =>
    !l.trim().startsWith('//') &&
    l.includes(`name: '${r.name}'`) &&
    l.includes(`state: '${r.state}'`)
  );
  if (idx === -1) { notFound.push({ ...r, why: 'entry line not found (already removed?)' }); continue; }

  const note =
    `  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in ` +
    `${r.trueState}, not ${r.state}. Confirmed live in reports/verification-comments.json. ` +
    `Removed now rather than later because today's date-extraction fixes mean this scraper ` +
    `CAN now read pages it previously failed on, which would have started importing another ` +
    `state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.`;

  lines[idx] = note + '\n  // ' + lines[idx].trim();
  if (SAVE) fs.writeFileSync(file, lines.join('\n'), 'utf8');
  applied.push(r);
}

console.log(`=== ${SAVE ? 'REMOVED' : 'WOULD REMOVE'} ${applied.length} wrong-state entries ===`);
const byState = {};
applied.forEach(r => (byState[r.state] = byState[r.state] || []).push(r));
Object.entries(byState).sort().forEach(([st, rs]) => {
  console.log(`  ${st} (${rs.length})`);
  rs.forEach(r => console.log(`      ${r.name.slice(0, 44).padEnd(44)} -> host serves ${r.trueState}`));
});

if (notFound.length) {
  console.log(`\n=== NOT APPLIED (${notFound.length}) ===`);
  notFound.forEach(r => console.log(`  ${r.state} ${r.name} — ${r.why}`));
}

if (SAVE && applied.length) {
  const ledger = path.join(ROOT, 'reports', 'defect-a-removals.md');
  const rowsMd = applied.map(r =>
    `| ${r.name} | ${r.city || ''} | ${r.state} | \`${r.url || ''}\` | host serves ${r.trueState} — removed 2026-08-11 |`
  ).join('\n');
  fs.appendFileSync(ledger,
    `\n\n## Removed 2026-08-11 — acted on the "identified but not acted on" backlog\n\n` +
    `These were listed as known collisions on 2026-08-09 but left in config. They became urgent\n` +
    `once the 2026-08-11 date-extraction fixes made these scrapers able to read pages they used to\n` +
    `fail on: a working extraction against a wrong-state host imports that state's events under the\n` +
    `wrong name. Each is a RECORDED COVERAGE GAP, restorable once a real URL is verified.\n\n` +
    `| Library | City | State | Old URL | Why |\n|---|---|---|---|---|\n${rowsMd}\n`
  );
  console.log(`\nAppended ${applied.length} rows to reports/defect-a-removals.md`);
}

console.log(`\n${SAVE ? 'Saved.' : 'Dry run — pass --save to write.'}`);

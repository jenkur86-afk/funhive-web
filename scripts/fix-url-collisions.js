#!/usr/bin/env node
/**
 * fix-url-collisions.js — MASTER-PLAN Defect A.
 *
 * The seed data guessed "{city}library.org" from each library's city, so 347 hosts are
 * claimed by two or more states at once. At most one claimant per host can be right;
 * the rest point at another state's library and, because the scraper still extracts
 * whatever it finds there, they write THAT library's events into the database under the
 * wrong name and state. Measured 2026-08-09: berlinlibrary.org is Berlin, WISCONSIN and
 * had produced 58 rows labelled NY/CT/MA/NJ/GA/NH; pelhamlibrary.org is Pelham, NEW YORK
 * and had produced 71 labelled AL/GA/MA. This is worse than no coverage — a visible zero
 * would at least be honest.
 *
 * Evidence comes from fetching each host ONCE and reading what the site says about
 * itself: postal "City, ST 12345" patterns, full state names, the TLS certificate's
 * alt-names, and the page title. Input is reports/url-collision-evidence.json.
 *
 * ACTS ONLY ON HIGH CONFIDENCE. An entry is removed when either:
 *   - the host is dead/parked (it can produce nothing anyway), or
 *   - the host's true state is established STRONGLY and differs from the entry's state.
 * "Strongly" means a corroborated signal, not just a numeric score: raw score alone is a
 * poor proxy, since "Welcome to Berlin Public Library in Wisconsin, USA" scores low but
 * is explicit. Everything else is left untouched and reported as identified-not-acted —
 * this project's worst incidents came from confident wrong calls, so ambiguity loses.
 *
 * Removal is not coverage loss here: these entries produce wrong-state data or nothing.
 * Every removed library is recorded in reports/defect-a-removals.md with its name, city,
 * state and old URL so it can be re-added when a real URL is found — the point is to stop
 * publishing another state's events, not to forget the library exists.
 *
 * Usage:
 *   node scripts/fix-url-collisions.js            # dry run
 *   node scripts/fix-url-collisions.js --save
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'reports', 'url-collision-evidence.json');
const REPORT = path.join(ROOT, 'reports', 'defect-a-removals.md');
const save = process.argv.includes('--save');

if (!fs.existsSync(EVIDENCE)) {
  console.error(`Missing ${path.relative(ROOT, EVIDENCE)} — run the host probe first.`);
  process.exit(1);
}
const { hostVerdict, probe, verdicts } = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

/**
 * Is the host's true state established strongly enough to delete another state's claim?
 * Two independent routes, because neither alone is sufficient:
 *   - a decisive numeric margin (several corroborating postal addresses), or
 *   - the page TITLE naming the state outright, which is about as explicit as a site gets.
 */
function isStrong(host, trueState) {
  const p = probe[host];
  if (!p || !trueState) return false;
  if (p.topScore >= 10 && p.topScore >= p.runnerUpScore * 2) return true;
  const title = String(p.title || '');
  const full = STATE_NAMES[trueState];
  if (full && new RegExp(`\\b${full}\\b`, 'i').test(title)) return true;
  if (new RegExp(`,\\s*${trueState}\\b`).test(title)) return true;
  return false;
}

// ---------- decide
const toRemove = [];      // entries we will delete
const identifiedOnly = []; // real but not confident enough to act on
for (const v of verdicts) {
  const hv = hostVerdict[v.host];
  if (!hv) continue;
  if (v.entryVerdict === 'DEAD_DOMAIN') {
    toRemove.push({ ...v, reason: `dead/parked domain (${hv.why})` });
  } else if (v.entryVerdict === 'WRONG_STATE') {
    if (isStrong(v.host, hv.trueState)) {
      toRemove.push({ ...v, reason: `host is ${hv.trueState}, entry claims ${v.state} — ${hv.title || hv.why}` });
    } else {
      identifiedOnly.push({ ...v, note: `evidence points to ${hv.trueState} but not conclusively (${hv.why})` });
    }
  }
}

// ---------- apply, file by file
const QUOTED = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
const field = n => new RegExp(`["']?${n}["']?\\s*:\\s*${QUOTED}`);
const val = m => (m ? String(m[1] !== undefined ? m[1] : m[2]).replace(/\\(.)/g, '$1') : '');
const blank = src => src
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/^([ \t]*)\/\/[^\n]*$/gm, m => ' '.repeat(m.length));

const byFile = new Map();
toRemove.forEach(r => {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
});

let removedCount = 0, filesTouched = 0, notFound = 0;
for (const [rel, items] of byFile) {
  const abs = path.join(ROOT, 'scrapers', rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const view = blank(src);

  const wanted = new Map(items.map(i => [`${i.name}|||${i.url}`, i]));
  const spans = [];
  const objRe = /\{[^{}]*\}/g;
  let o;
  while ((o = objRe.exec(view))) {
    const start = o.index, end = start + o[0].length;
    const raw = src.slice(start, end);
    const nm = field('name').exec(raw); if (!nm) continue;
    const url = val(field('url').exec(raw)) || val(field('eventsUrl').exec(raw));
    const key = `${val(nm)}|||${url}`;
    if (!wanted.has(key)) continue;
    spans.push({ start, end, item: wanted.get(key) });
    wanted.delete(key);
  }
  notFound += wanted.size;

  if (!spans.length) continue;
  let out = src;
  spans.sort((a, b) => b.start - a.start).forEach(s => {
    // Extend to swallow the whole line (plus its trailing comma/newline) when the object
    // sits alone on it, which is the shape of nearly every config entry here.
    let a = s.start, b = s.end;
    while (a > 0 && out[a - 1] !== '\n' && /\s/.test(out[a - 1])) a--;
    while (b < out.length && /[,\s]/.test(out[b]) && out[b] !== '\n') b++;
    if (out[b] === '\n' && /^\s*$/.test(out.slice(a, s.start))) b++;
    out = out.slice(0, a) + out.slice(b);
    removedCount++;
  });

  const header = `// ${items.length} entr${items.length === 1 ? 'y' : 'ies'} removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org\n`
    + `// domains resolve to a DIFFERENT state's library, or are dead. They were writing that\n`
    + `// other library's events under the wrong name and state. Every removed library is listed\n`
    + `// with its city, state and old URL in reports/defect-a-removals.md so it can be restored\n`
    + `// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.\n`;
  out = header + out;

  filesTouched++;
  if (save) fs.writeFileSync(abs, out);
}

// ---------- report
const lines = [
  '# Defect A — removed library entries',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/fix-url-collisions.js\`.`,
  '',
  'These entries were removed because their configured domain resolves to a **different**',
  "state's library, or is dead/parked. They were not producing that library's events — they",
  "were producing ANOTHER library's events under the wrong name and state, which is worse",
  'than an honest zero.',
  '',
  '**Nothing here is written off.** Each row keeps the library name, city, state and the old',
  'URL so it can be restored the moment a real URL is verified. A removal is a recorded',
  'coverage gap, not a decision that the library does not matter.',
  '',
  `**Removed: ${toRemove.length} entries across ${byFile.size} files.**`,
  '',
  '| Library | City | State | Old URL | Why |',
  '|---|---|---|---|---|',
  ...toRemove.map(r => `| ${r.name} | ${r.city || '—'} | ${r.state} | \`${r.host}\` | ${String(r.reason).replace(/\|/g, '\\|').slice(0, 160)} |`),
  '',
  '## Identified but NOT acted on',
  '',
  'Evidence suggests these are also wrong, but not conclusively enough to delete. They are',
  'left in place deliberately — a confident wrong call is the failure mode this project has',
  'paid for most.',
  '',
  `**${identifiedOnly.length} entries.**`,
  '',
  '| Library | City | State | Host | Note |',
  '|---|---|---|---|---|',
  ...identifiedOnly.map(r => `| ${r.name} | ${r.city || '—'} | ${r.state} | \`${r.host}\` | ${String(r.note).replace(/\|/g, '\\|').slice(0, 160)} |`),
  '',
];
if (save) fs.writeFileSync(REPORT, lines.join('\n'));

console.log(`\n${save ? 'WROTE' : 'DRY RUN'} — Defect A`);
console.log(`  entries removed        : ${removedCount} across ${filesTouched} files`);
console.log(`  planned but not located: ${notFound}`);
console.log(`  identified, not acted  : ${identifiedOnly.length}`);
const byReason = {};
toRemove.forEach(r => { const k = r.reason.startsWith('dead') ? 'dead/parked' : 'wrong state'; byReason[k] = (byReason[k] || 0) + 1; });
console.log(`  breakdown              : ${JSON.stringify(byReason)}`);
console.log('\nsamples:');
toRemove.slice(0, 12).forEach(r => console.log(`  ${r.state} "${r.name}" (${r.host}) — ${r.reason.slice(0, 90)}`));
if (!save) console.log('\n(dry run — re-run with --save to write)');

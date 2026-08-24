#!/usr/bin/env node
/**
 * Builds the Step 3d input file for scripts/verify-sites-puppeteer.js.
 *
 *   node scripts/build-verification-worklist.js --lib=<today's lib table>.md --out=sites.txt
 *   node scripts/build-verification-worklist.js --lib=... --out=... --limit=60
 *
 * Emits `Site | Scraper | URL | EXPECTED_STATE` lines for the zero-event
 * population, honouring Step 3d's don't-re-verify rule: a site that already has
 * a settled (non-UNVERIFIABLE) verdict in reports/verification-comments.json is
 * carried forward and NOT re-fetched. UNVERIFIABLE rows are re-checked, since
 * transient blocks often clear.
 *
 * Site -> URL resolution copies the config-parsing rules from
 * generate-site-report.js's loadConfigIndex() deliberately, including stripping
 * comments before parsing: several scrapers carry an AUTO-GENERATED header
 * comment listing libraries that are NOT in the real config, and counting those
 * as live entries is what once corrupted the report's Status column.
 *
 * A site with no resolvable config URL is emitted with `NO-URL`, which the
 * verifier records as UNVERIFIABLE without a fetch. It is emitted rather than
 * dropped on purpose — an absent row is indistinguishable from a site that does
 * not exist, which is the failure the whole report exists to prevent.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const getArg = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const LIB = getArg('lib');
const OUT = getArg('out');
const LIMIT = parseInt(getArg('limit', '0'), 10) || 0;
if (!LIB || !OUT) {
  console.error('Usage: --lib=<library table md> --out=<sites.txt> [--limit=N]');
  process.exit(1);
}

function cfgKey(name) {
  return String(name).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function loadConfigIndex() {
  const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
  const all = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };
  const idx = new Map();
  const fileCache = new Map();
  Object.entries(all).forEach(([key, sc]) => {
    if (!sc.file) return;
    const abs = path.join(ROOT, 'scrapers', String(sc.file).replace(/^\.\//, ''));
    if (!fs.existsSync(abs)) return;
    let entries = fileCache.get(abs);
    if (!entries) {
      const src = fs.readFileSync(abs, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      entries = [];
      const objRe = /\{[^{}]*\}/g;
      const nameRe = /["']?name["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/;
      const urlRe = /["']?url["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/;
      let o;
      while ((o = objRe.exec(src))) {
        const nm = nameRe.exec(o[0]); if (!nm) continue;
        const uu = urlRe.exec(o[0]); if (!uu) continue;
        entries.push([nm[1] !== undefined ? nm[1] : nm[2], uu[1] !== undefined ? uu[1] : uu[2]]);
      }
      fileCache.set(abs, entries);
    }
    entries.forEach(([n, u]) => idx.set(key + '|||' + cfgKey(n), u));
  });
  return idx;
}

const store = fs.existsSync(path.join(ROOT, 'reports', 'verification-comments.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'verification-comments.json'), 'utf8'))
  : {};
const idx = loadConfigIndex();

const rows = fs.readFileSync(LIB, 'utf8').trim().split('\n')
  .map(l => l.split('|').map(s => s.trim()))
  .filter(c => c.length >= 6 && /^\d+$/.test(c[4]))
  .map(c => ({ site: c[1], state: c[2], scraper: c[3], count: parseInt(c[4], 10) }));

const zero = rows.filter(r => r.count === 0);
let carried = 0, noUrl = 0;
const out = [];
for (const z of zero) {
  const k = z.scraper + '|||' + z.site;
  const e = store[k];
  if (e && e.verdict && e.verdict !== 'UNVERIFIABLE') { carried++; continue; }
  const url = idx.get(z.scraper + '|||' + cfgKey(z.site)) || 'NO-URL';
  if (url === 'NO-URL') noUrl++;
  out.push(`${z.site} | ${z.scraper} | ${url} | ${z.state && z.state !== '—' ? z.state : ''}`);
}

const final = LIMIT ? out.slice(0, LIMIT) : out;
fs.writeFileSync(OUT, final.join('\n') + '\n', 'utf8');
console.log(`zero-event sites: ${zero.length}`);
console.log(`  carried forward (settled verdict): ${carried}`);
console.log(`  needing verification: ${out.length}   (no config URL: ${noUrl})`);
console.log(`wrote ${final.length} lines to ${OUT}`);

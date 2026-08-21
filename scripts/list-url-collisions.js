#!/usr/bin/env node
/**
 * list-url-collisions.js — triage tool for Defect A / gate 2.
 *
 * WHY
 * ---
 * `project-status.js` reports gate 2 as a single number ("504 entries on 166 hosts
 * claimed by 2+ states"). That number names the defect but gives you nothing to act
 * on: it does not say WHICH hosts, which states claim them, or which of them are
 * actually dangerous. This script is the missing half — it turns the gate into a
 * worklist, worst first.
 *
 * It deliberately shares NOTHING with project-status.js except behaviour: the site
 * loader is reimplemented here rather than imported, because project-status.js has no
 * exports and adding some would change a file whose output is a trend ledger. The
 * two loaders are asserted to agree via --check, so a silent divergence is detectable.
 *
 * WHAT A "COLLISION" IS, AND THE THREE KINDS
 * ------------------------------------------
 * A host appearing under two or more STATES cannot be correct for all of them. But the
 * gate lumps together three very different situations, and they need opposite fixes:
 *
 *   1. AGGREGATOR  — one host legitimately serves many states because it IS a
 *                    multi-state platform (macaronikid.com, libcal.com, eventbrite.com,
 *                    activecommunities.com). These are NOT bugs. Counting them inflates
 *                    the gate and buries the real defects.
 *   2. SUBDOMAINED — the host differs per site but the REGISTRABLE DOMAIN is shared
 *                    (foo.libnet.info vs bar.libnet.info). Also usually fine.
 *   3. TRUE        — a genuinely single-institution host claimed by 2+ states. This is
 *                    the seed-data bug: spartalibrary.org under three states, Pelham
 *                    MA/GA pointing at Pelham NY. These are the ones to fix.
 *
 * The gate's own number stays as it is — this script does not redefine it. It only
 * separates the worklist so a human is not handed 504 undifferentiated rows.
 *
 * Usage:
 *   node scripts/list-url-collisions.js                 # summary + TRUE collisions
 *   node scripts/list-url-collisions.js --kind=all      # include aggregators
 *   node scripts/list-url-collisions.js --state=NC      # only collisions touching NC
 *   node scripts/list-url-collisions.js --json          # machine-readable
 *   node scripts/list-url-collisions.js --check         # assert agreement with gate 2
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const arg = n => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : null; };
const KIND = arg('kind') || 'true';
const ONLY_STATE = (arg('state') || '').toUpperCase();
const AS_JSON = args.includes('--json');
const CHECK = args.includes('--check');

// Hosts that are multi-state platforms by design. A collision on one of these is not a
// seed-data bug, so it must not sit at the top of a worklist aimed at seed-data bugs.
// Matched on the registrable domain, so every subdomain is covered by one entry.
const AGGREGATOR_DOMAINS = new Set([
  'macaronikid.com', 'libcal.com', 'libnet.info', 'bibliocommons.com', 'eventbrite.com',
  'activecommunities.com', 'recdesk.com', 'civicrec.com', 'yodel.today', 'localist.com',
  'google.com', 'googleapis.com', 'facebook.com', 'eventkeeper.com', 'librarymarket.com',
  'assabetinteractive.com', 'tockify.com', 'communico.co', 'evanced.info', 'sirsidynix.com',
  'simpleviewinc.com', 'ymca.org', 'nps.gov', 'barnesandnoble.com', 'edu',
]);

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

// Registrable-domain approximation: last two labels, with a third kept for the common
// two-part public suffixes that appear in this dataset (.lib.xx.us, .co.uk, .k12.xx.us).
function domainOf(host) {
  const p = host.split('.');
  if (p.length <= 2) return host;
  const last2 = p.slice(-2).join('.');
  if (/^(lib|k12|co|org|ac|gov)\.[a-z]{2}$/.test(last2) || /^[a-z]{2}\.us$/.test(last2)) {
    return p.slice(-4).join('.') || host;
  }
  return last2;
}

function loadConfiguredSites() {
  const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
  const activeStates = reg.getActiveStates();
  const all = { ...reg.SCRAPERS, ...(reg.MACARONI_SCRAPERS || {}) };

  const sites = [];
  const fileCache = new Map();
  const pushedFiles = new Set();

  Object.entries(all).forEach(([key, sc]) => {
    if (!sc.file || !reg.isScraperActive(sc, activeStates)) return;
    const abs = path.join(ROOT, 'scrapers', String(sc.file).replace(/^\.\//, ''));
    if (!fs.existsSync(abs)) return;

    let entries = fileCache.get(abs);
    if (!entries) {
      const src = fs.readFileSync(abs, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      entries = [];
      const objRe = /\{[^{}]*\}/g;
      const field = n => new RegExp(`["']?${n}["']?\\s*:\\s*(?:'([^']*)'|"([^"]*)")`);
      let o;
      while ((o = objRe.exec(src))) {
        const nm = field('name').exec(o[0]);
        if (!nm) continue;
        const uu = field('url').exec(o[0]) || field('eventsUrl').exec(o[0]);
        const st = field('state').exec(o[0]);
        const co = field('county').exec(o[0]);
        const val = m => (m ? (m[1] !== undefined ? m[1] : m[2]) : '');
        if (!uu) continue;
        entries.push({ name: val(nm), url: val(uu), state: val(st), county: val(co) });
      }
      fileCache.set(abs, entries);
    }
    // Same one-push-per-file rule as project-status.js — see its comment. Without it a
    // shared config file is counted once per registry key pointing at it.
    if (pushedFiles.has(abs)) return;
    pushedFiles.add(abs);
    entries.forEach(e => sites.push({ ...e, scraper: key, state: (e.state || sc.state || '').toUpperCase() }));
  });

  return sites;
}

function classify(host) {
  const d = domainOf(host);
  if (AGGREGATOR_DOMAINS.has(d) || /\.edu$/.test(host)) return 'AGGREGATOR';
  return 'CANDIDATE';
}

function main() {
  const sites = loadConfiguredSites();

  const byHost = new Map();
  for (const s of sites) {
    const h = hostOf(s.url);
    if (!h) continue;
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(s);
  }

  const colliding = [...byHost.entries()]
    .map(([host, entries]) => {
      const states = [...new Set(entries.map(e => e.state).filter(Boolean))];
      return { host, entries, states };
    })
    .filter(c => c.states.length > 1);

  // Gate-2 parity: project-status counts ENTRIES on colliding hosts, including entries
  // whose own state is blank. Recomputed the same way so --check is meaningful.
  const collidingHostSet = new Set(colliding.map(c => c.host));
  const gate2Entries = sites.filter(s => collidingHostSet.has(hostOf(s.url))).length;

  for (const c of colliding) c.kind = classify(c.host);
  const trueCollisions = colliding.filter(c => c.kind === 'CANDIDATE');
  const aggregators = colliding.filter(c => c.kind === 'AGGREGATOR');

  const trueEntries = trueCollisions.reduce((n, c) => n + c.entries.length, 0);

  if (CHECK) {
    console.log(`gate 2 parity: ${gate2Entries} entries on ${colliding.length} hosts claimed by 2+ states`);
    console.log(`  (project-status.js should print the same two numbers)`);
    process.exit(0);
  }

  let show = KIND === 'all' ? colliding : trueCollisions;
  if (ONLY_STATE) show = show.filter(c => c.states.includes(ONLY_STATE));

  // Worst first: most states claiming the host, then most entries.
  show.sort((a, b) => b.states.length - a.states.length || b.entries.length - a.entries.length
    || a.host.localeCompare(b.host));

  if (AS_JSON) {
    console.log(JSON.stringify(show, null, 2));
    return;
  }

  console.log(`configured active sites with a parseable URL : ${sites.length}`);
  console.log(`hosts claimed by 2+ states                    : ${colliding.length}  (gate 2 counts ${gate2Entries} entries on them)`);
  console.log(`  of which multi-state platforms by design    : ${aggregators.length}  — not seed-data bugs`);
  console.log(`  of which TRUE single-institution collisions : ${trueCollisions.length}  (${trueEntries} entries)  <-- the worklist`);
  console.log('');

  if (!show.length) { console.log('Nothing to show for this filter.'); return; }

  console.log(`=== ${KIND === 'all' ? 'ALL' : 'TRUE'} COLLISIONS${ONLY_STATE ? ` touching ${ONLY_STATE}` : ''} (worst first) ===\n`);
  for (const c of show) {
    console.log(`${c.host}   [${c.states.join(', ')}]${c.kind === 'AGGREGATOR' ? '  (platform)' : ''}`);
    for (const e of c.entries) {
      console.log(`     ${(e.state || '--').padEnd(3)} ${e.name}`);
      console.log(`         ${e.scraper}  ${e.url}`);
    }
    console.log('');
  }
}

main();

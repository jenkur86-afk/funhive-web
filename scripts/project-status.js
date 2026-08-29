#!/usr/bin/env node
/**
 * project-status.js — "how far from done?" in one command.
 *
 * WHY THIS EXISTS
 * reports/site-report.html answers "what is the state of every row?" exhaustively.
 * It does NOT answer "is the project getting better, and what is left?" — there was
 * no single place showing distance-to-done, and no trend, so status had to be
 * reassembled from memory each session. That is how stale claims creep in (e.g.
 * quoting an 84% All-Ages figure measured weeks earlier as if it were current).
 *
 * ZERO SUPABASE EGRESS. Everything here is computed from local files:
 *   LIBRARY-SITE-AUDIT.md, AGE-RANGE-AUDIT.md, reports/verification-comments.json,
 *   reports/fix-notes.json, scrapers/scraper-registry.js + each scraper's own config
 *   array, scrapers/utils/county-centroids.js, SCRAPER-FIX-LOG.jsonl.
 * Two gates genuinely need a database read (scraper_name conformance, source_url
 * coverage). Those are NOT guessed — they are declared in STALE_METRICS below with
 * the date they were measured and the command that refreshes them, and they render
 * marked STALE. A number that cannot be computed must look different from one that can.
 *
 * Usage:
 *   node scripts/project-status.js            # print Blocks B + C
 *   node scripts/project-status.js --save     # also prepend a dated entry to STATUS.md
 */

const fs = require('fs');
const path = require('path');
// Single source of truth for "is this host a multi-state platform rather than one
// institution?" — see the gate 2 comment below for why this is imported, not copied.
const { classify: classifyHost } = require('./list-url-collisions');

const ROOT = path.join(__dirname, '..');
const LIB_MD = path.join(ROOT, 'LIBRARY-SITE-AUDIT.md');
const AGE_MD = path.join(ROOT, 'AGE-RANGE-AUDIT.md');
const COMMENTS = path.join(ROOT, 'reports', 'verification-comments.json');
const FIX_NOTES = path.join(ROOT, 'reports', 'fix-notes.json');
const FIX_LOG = path.join(ROOT, 'SCRAPER-FIX-LOG.jsonl');
const COUNTY_COVERAGE = path.join(ROOT, 'reports', 'coverage-by-county.md');
const STATUS_MD = path.join(ROOT, 'STATUS.md');

const save = process.argv.includes('--save');
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Metrics that require a database read. Refresh these by running the stated command
 * and editing the value + date here. Deliberately NOT auto-filled with a guess — the
 * renderer marks them STALE so nobody mistakes an old measurement for a live one.
 */
const STALE_METRICS = {
  nameConformance: {
    value: 60.8, unit: '%', measured: '2026-08-23',
    detail: "439 of 722 distinct scraper_name values conform (37 EXACT + 402 PREFIXED); 283 drift. Conformance rose 54.2% -> 60.8% and the drift COUNT fell 322 -> 283, the first fall recorded here. The cause is the same mechanism as before and still NOT a repair: the 2026-08-22 Group 1 MacaroniKid tail minted 95 new fully-conforming per-site names (MacaroniKid-PA-* alone contributed 34), growing the denominator 703 -> 722 while old free-text rows aged out of the 2026-08-01 window. NO renaming has been performed on any run to date. Drift classes: FORMAT_DRIFT 72 names / 21550 rows (RecDeskParks-* remains the bulk and needs RecDesk-Parks-<slug>), FREE_TEXT 160 / 5605, CASE_MISMATCH 25 / 7418, UNRELATED 25 / 1188, BAD_SLUG 1 / 42. COLLAPSED entries: CivicEngage-Libraries 2 sites, CustomDrupal-Libraries 8, MacaroniKid-DE 2 — MacaroniKid-MD has RESOLVED (20 sites, 20 distinct names) now that the Group 2 tail reached MD, so that prediction held. One oddity worth not misreading: MacaroniKid-MA declares 10 sites but emits 27 distinct names, and MacaroniKid-AL/VA/SC similarly exceed their declared counts — that is a stale sites: N figure in the registry, not a naming fault.",
    refresh: 'node scripts/check-scraper-names.js',
  },
  sourceUrlCoverage: {
    value: 62, unit: '%', measured: '2026-08-05',
    detail: 'measured on NC events only; most families unmeasured until all 3 rotation groups run post-fix',
    refresh: 'node scripts/verify-coverage.js',
  },
};

// ---------------------------------------------------------------- markdown helpers

// Split a markdown table row on UNESCAPED pipes only. Venue names legitimately contain
// "|" (Eventbrite's "Venue | City" convention) and are written escaped as "\|" — a naive
// split on /\|/ silently shifts every column right of the escape, which on 2026-08-09
// made three real venues look like unregistered scrapers.
function cells(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.slice(1, -1).map(s => s.trim());   // drop the empties outside the outer pipes
}

const isSeparator = line => /^\|[\s:|-]+\|$/.test(line.trim());

/**
 * Scan every markdown table whose header matches `headerRe`, returning rows as objects
 * keyed by that table's OWN header names. Column positions are read per-table rather
 * than hardcoded: AGE-RANGE-AUDIT.md contains both a 10-column and an 11-column variant
 * (one cycle added an "Adults" bracket), so a fixed index reads the wrong column there.
 */
function tablesByHeader(md, headerRe) {
  const lines = md.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.trim().startsWith('|')) { header = null; continue; }
    if (isSeparator(line)) continue;
    const c = cells(line);
    if (!header) {
      if (headerRe.test(line)) header = c.map(h => h.toLowerCase());
      continue;
    }
    const row = {};
    header.forEach((h, i) => { row[h] = c[i] !== undefined ? c[i] : ''; });
    rows.push(row);
  }
  return rows;
}

// Header names drift slightly between cycles ("Total" vs "Total (today's new events)"),
// so match on a substring rather than an exact key.
function pick(row, ...substrings) {
  for (const sub of substrings) {
    const key = Object.keys(row).find(k => k.includes(sub));
    if (key !== undefined) return row[key];
  }
  return '';
}

function toInt(s) {
  const m = /(-?\d[\d,]*)/.exec(String(s || ''));
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

function pct(n, d) { return d > 0 ? Math.round((n / d) * 1000) / 10 : 0; }

// ---------------------------------------------------------------- scraper config parsing

/**
 * Extract every configured site from every ACTIVE scraper file: name, url, state, county.
 * Same regex approach as generate-site-report.js's loadConfigIndex (comments stripped
 * first, literal quoted values only). Reimplemented here rather than imported because
 * generate-site-report.js calls main() at module scope — requiring it would regenerate
 * the whole HTML report as a side effect.
 *
 * Known limitation, stated rather than hidden: a config entry whose url is a VARIABLE
 * reference (`url: LISTING_URL`) is invisible to this parser. That exact pattern in
 * scraper-sandhill-regional-library-nc.js made a 16-site scraper look like 0 sites on
 * 2026-08-09 and briefly collapsed 10 real branches in the site report. Entries missing
 * a parseable url are counted in `unparseable` and reported, never silently dropped.
 */
function loadConfiguredSites() {
  const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
  const activeStates = reg.getActiveStates();
  const all = { ...reg.SCRAPERS, ...(reg.MACARONI_SCRAPERS || {}) };

  const sites = [];
  let unparseable = 0;
  let disabledByCollision = 0;
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
        if (!nm) continue;                       // not a site entry
        // Fall back to eventsUrl: plenty of configs carry only that (and some carry a
        // bare `url` variable reference this regex cannot see). Without the fallback the
        // "unparseable" count reads far worse than reality — it counted 1,460 on the
        // first run, most of which were ordinary eventsUrl-only entries, not real gaps.
        const uu = field('url').exec(o[0]) || field('eventsUrl').exec(o[0]);
        const st = field('state').exec(o[0]);
        const co = field('county').exec(o[0]);
        const val = m => (m ? (m[1] !== undefined ? m[1] : m[2]) : '');
        if (!uu) { unparseable++; continue; }    // counted, not hidden
        // 2026-08-21: an entry flagged urlCollision is skipped at run time by a guard in
        // its scraper (scripts/disable-collided-urls.js), so it can no longer point at
        // another state's library — which is exactly what gate 2 measures. Excluded here
        // for that reason. THIS IS A METHODOLOGY CHANGE, and the drop it causes is a
        // genuine reduction in risk but NOT a URL being corrected: the wrong host is still
        // written in the config, the entry is merely disabled, and the library remains an
        // uncovered gap. See the data note rendered below.
        if (field('urlCollision').exec(o[0])) { disabledByCollision++; continue; }
        entries.push({ name: val(nm), url: val(uu), state: val(st), county: val(co) });
      }
      fileCache.set(abs, entries);
    }
    // Push each FILE's entries exactly once. fileCache above caches the PARSE, not the
    // insertion, so before 2026-08-18 every registry key pointing at a shared file pushed
    // that file's entire config again: the LibCal file is registered under 18 active keys
    // and contributed its 132 entries 18 times, Communico 16x, BiblioCommons 6x. Gates 1
    // and 2 were inflated by that multiple for exactly those families — and gate 2 is the
    // headline 🔴 that picks the "next action", so the number driving priorities was wrong.
    // Caught when adding two GoogleCalendar keys moved gate 2 by +2 with no new config:
    // one Sangaree entry had simply gone from being counted 1x to 3x.
    // Families are unaffected by picking a representative key: every key sharing a file
    // has the same family prefix (LibCal-*, Communico-*, BiblioCommons-*, GoogleCalendar-*),
    // and gate 1 groups on scraper.split('-')[0].
    if (pushedFiles.has(abs)) return;
    pushedFiles.add(abs);
    entries.forEach(e => sites.push({ ...e, scraper: key, state: e.state || sc.state || '' }));
  });

  return { sites, unparseable, disabledByCollision };
}

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

// ---------------------------------------------------------------- gates

function computeGates() {
  const g = {};
  const notes = [];

  // --- Gates 1 & 2 come from the scraper configs themselves.
  const { sites, unparseable, disabledByCollision } = loadConfiguredSites();
  const { getCountyCentroid } = require(path.join(ROOT, 'scrapers', 'utils', 'county-centroids.js'));

  // Gate 1 — county values that actually resolve to a centroid. When this fails, the
  // county tier of the geocoding chain is dead and events land on the STATE centroid.
  //
  // Reported per-family as well as fleet-wide, and the GATE TRACKS THE WORST FAMILY.
  // A fleet average hides this defect rather than showing it: measured 2026-08-09 the
  // fleet was 54.7% passing while WordPress-* alone was 4.3% (92 of 2,139) — healthy
  // families like BiblioCommons (97.6%) and Communico (82.1%) averaged the failure out
  // of sight. That is the same aggregation mistake AGE-RANGE-AUDIT.md's "No aggregation,
  // ever" rule exists to prevent, so the headline number is the worst family, not the mean.
  const withCounty = sites.filter(s => s.county && s.state);
  const countyOk = withCounty.filter(s => getCountyCentroid(s.county, s.state)).length;

  const byFamily = new Map();
  withCounty.forEach(s => {
    const fam = s.scraper.split('-')[0];
    if (!byFamily.has(fam)) byFamily.set(fam, { ok: 0, total: 0 });
    const f = byFamily.get(fam);
    f.total++;
    if (getCountyCentroid(s.county, s.state)) f.ok++;
  });
  // Only families with a meaningful sample can be "worst" — a 0/1 single-system scraper
  // is a rounding error, not the systemic defect worth putting in the headline.
  const ranked = [...byFamily.entries()]
    .filter(([, f]) => f.total >= 20)
    .map(([fam, f]) => ({ fam, ...f, pct: pct(f.ok, f.total) }))
    .sort((a, b) => a.pct - b.pct);
  const worst = ranked[0];

  g.countiesResolve = {
    now: worst ? worst.pct : pct(countyOk, withCounty.length),
    unit: '%', target: 100,
    detail: worst
      ? `worst family ${worst.fam}-*: ${worst.ok} of ${worst.total} resolve (${worst.pct}%). ` +
        `Fleet-wide ${countyOk} of ${withCounty.length} (${pct(countyOk, withCounty.length)}%) — ` +
        `the fleet figure is NOT the gate, it averages the defect away`
      : `${countyOk} of ${withCounty.length} configured counties resolve`,
    families: ranked.slice(0, 5),
  };

  // Gate 2 — a host appearing under two or more STATES cannot be right for all of them.
  // This is the locally-measurable proxy for "URLs verified live"; live verification is
  // a per-entry judgement no script can make, so this deliberately measures the defect
  // (collisions) rather than claiming to measure the fix.
  const byHost = new Map();
  sites.forEach(s => {
    const h = hostOf(s.url);
    if (!h) return;
    if (!byHost.has(h)) byHost.set(h, new Set());
    byHost.get(h).add((s.state || '').toUpperCase());
  });
  // 2026-08-26: aggregator hosts are EXCLUDED. macaronikid.com, libcal.com, libnet.info,
  // bibliocommons.com and the rest are multi-state platforms BY DESIGN — many states
  // legitimately share them — so counting them as collisions made this gate's target of 0
  // mathematically unreachable and kept it permanently red. The rule comes from
  // list-url-collisions.js rather than a second copy here, because a forked predicate is
  // exactly how fix-cancelled-events.js and fix-event-quality.js STEP 1b drifted from
  // their shared helpers.
  const collidingHostsAll = [...byHost.entries()].filter(([, states]) => states.size > 1);
  const collidingHosts = collidingHostsAll.filter(([h]) => classifyHost(h) !== 'AGGREGATOR');
  const aggregatorHosts = collidingHostsAll.length - collidingHosts.length;
  const collidingHostSet = new Set(collidingHosts.map(([h]) => h));
  const collidingEntries = sites.filter(s => collidingHostSet.has(hostOf(s.url))).length;
  // 2026-08-18: gates 1-2 dropped (gate 2: 536 -> 504) because loadConfiguredSites was
  // fixed to stop double-counting shared config files, NOT because collisions were
  // resolved. Any comparison against a STATUS.md entry dated on or before 2026-08-18 is
  // across a methodology change and is not a like-for-like trend.
  g.urlCollisions = { now: collidingEntries, unit: '', target: 0,
    detail: `${collidingEntries} entries on ${collidingHosts.length} single-institution hosts claimed by 2+ states` +
      (aggregatorHosts ? `; ${aggregatorHosts} multi-state platform host(s) excluded by design` : '') +
      (disabledByCollision ? `; a further ${disabledByCollision} disabled via urlCollision and excluded` : '') };
  notes.push('METHODOLOGY CHANGE 2026-08-26: gate 2 now excludes multi-state platform hosts ' +
    '(macaronikid.com, libcal.com, libnet.info, bibliocommons.com and the rest of AGGREGATOR_DOMAINS, ' +
    'imported from list-url-collisions.js rather than re-listed here). Those hosts are shared across states ' +
    'BY DESIGN, so counting them made the target of 0 unreachable and left the gate permanently red while ' +
    'the real seed-data defect was being worked. Gate 2 fell 9 -> 0 the moment this landed. THAT DROP IS A ' +
    'DEFINITION CHANGE, NOT WORK DONE — the nine true single-institution collisions were separately resolved ' +
    'the same day (see SCRAPER-FIX-LOG.jsonl 2026-08-26), and it is that fix, not this exclusion, that is the ' +
    'progress. Any comparison with a STATUS.md entry dated on or before 2026-08-25 crosses this change.');
  if (disabledByCollision) {
    notes.push(`METHODOLOGY CHANGE 2026-08-21: ${disabledByCollision} entries proven to point at another state's ` +
      'library were flagged urlCollision and are skipped at run time, so they are excluded from gate 2. ' +
      'Gate 2 fell 504 -> 448 as a result. That is a real reduction in RISK — those entries can no longer ' +
      'import another state\'s events — but it is NOT a URL being corrected: the wrong host is still in ' +
      'the config and each of those libraries is now an explicit, uncovered gap. Do not read the drop as ' +
      'coverage improving. Worklist: node scripts/list-url-collisions.js');
  }
  if (TODAY <= '2026-08-25') {
    notes.push('METHODOLOGY CHANGE 2026-08-18: gates 1-2 previously counted a shared config file once per registry key ' +
               'pointing at it (LibCal x18, Communico x16, BiblioCommons x6), inflating both. Gate 2 fell 536 -> 504 as a ' +
               'RESULT OF THE FIX, not because any collision was resolved. Do not read that delta as progress.');
  }
  if (unparseable) {
    notes.push(`${unparseable} config entries have no literal url string and are excluded from gates 1-2 ` +
               `(usually a variable reference — see loadConfiguredSites' header comment).`);
  }

  // --- Gates 3 & 4 come from the verification verdict store.
  let verdicts = {};
  try { verdicts = JSON.parse(fs.readFileSync(COMMENTS, 'utf8')); } catch { notes.push('verification-comments.json unreadable — gates 3-4 unavailable.'); }
  const vals = Object.values(verdicts);
  const count = v => vals.filter(x => x && x.verdict === v).length;
  // Gate 3 counts MISMATCHes that are STILL BLEEDING, not every MISMATCH ever recorded.
  // A verdict describes the live page and stays MISMATCH forever once true; `status`
  // (see scripts/mark-contained-mismatches.js) records what has been DONE about it. On
  // 2026-08-29, 404 of 617 pointed at config entries already carrying a urlCollision
  // guard — the scraper skips them, so they cannot import wrong data and have not been
  // able to for days. Counting those as open bugs is what made this gate drift UPWARD on
  // sessions that fixed things, exactly as the VERDICT-STORE-HAS-NO-RESOLVED-STATE note
  // in reports/fix-notes.json predicted.
  //
  // Contained is NOT fixed, and is never folded into a success number: each contained
  // entry is still an uncovered library, reported on its own row in STILL BROKEN below.
  const contained = vals.filter(x => x && x.verdict === 'MISMATCH' && x.status === 'contained').length;
  const fixedBugs = vals.filter(x => x && x.verdict === 'MISMATCH' && x.status === 'fixed').length;
  const openBugs = count('MISMATCH') - contained - fixedBugs;
  g.confirmedBugs = { now: openBugs, unit: '', target: 0, contained, fixedBugs,
    detail: `${count('MATCHES')} MATCHES / ${count('MISMATCH')} MISMATCH / ${count('UNVERIFIABLE')} UNVERIFIABLE. ` +
      `Of the MISMATCHes, ${openBugs} are OPEN (config entry still live), ${contained} are CONTAINED ` +
      `(guarded — cannot import wrong data, but still an uncovered gap) and ${fixedBugs} are FIXED ` +
      `(coverage restored and observed). Refresh: node scripts/mark-contained-mismatches.js --save` };
  g.unknownSites = { now: count('UNVERIFIABLE'), unit: '', target: 0,
    detail: 'never re-checked; the true bug count sits between the MISMATCH count and MISMATCH+UNVERIFIABLE' };

  // Numbers interpolated from the live store rather than written in, so this note cannot
  // drift from the gate it explains — the first draft of it hardcoded a count that was
  // already wrong by the end of the same session.
  if (TODAY <= '2026-09-05') {
    const totalMismatch = g.confirmedBugs.now + g.confirmedBugs.contained + g.confirmedBugs.fixedBugs;
    notes.push('METHODOLOGY CHANGE 2026-08-29: gate 3 now counts only MISMATCHes whose config entry is STILL ' +
               `LIVE. Of ${totalMismatch} MISMATCH verdicts, ${g.confirmedBugs.contained} point at entries that are ` +
               'already guarded with urlCollision or commented out — the scraper never visits them, so they cannot ' +
               `import wrong data and had not been able to for days — and ${g.confirmedBugs.fixedBugs} have had coverage ` +
               `restored and observed. Gate 3 therefore reads ${g.confirmedBugs.now}, not ${totalMismatch}. ` +
               'THAT DROP IS A DEFINITION CHANGE, NOT WORK DONE. The contained ones are not gone: they get their own ' +
               'row in STILL BROKEN, because a guarded entry gives the library no coverage and CLAUDE.md is explicit ' +
               'that a disabled library is a real gap until someone finds its correct URL. Any comparison with a ' +
               'STATUS.md entry dated on or before 2026-08-28 crosses this change. Containment is re-derived from the ' +
               'live config on every run by node scripts/mark-contained-mismatches.js, so removing a guard re-opens ' +
               'the bug automatically.');
  }

  // --- Gate 5 — share of audited events that landed in a SPECIFIC age bracket rather
  // than the All Ages catch-all. Computed from the age audit's own bracket columns.
  //
  // SCOPE, CORRECTED 2026-08-27: this reads EVERY dated section in AGE-RANGE-AUDIT.md,
  // not the newest one and not "the last completed audit cycle" as this comment used to
  // claim. The code and the comment had disagreed since the gate was written. It is
  // cumulative over all history, which is why it barely moves and why a day's work shows
  // up as a fraction of a point.
  //
  // DO NOT "FIX" THIS BY SCOPING IT TO THE NEWEST SECTION. Measured the same day, the
  // per-section values swing 13.3% -> 55.8% purely on which rotation GROUP ran:
  //   08-19 13.3%   08-22 14.4%   08-25 17.8%      <- RecDeskParks-* heavy (Group 1)
  //   08-23 55.1%   08-26 55.8%   08-27 49.8%      <- MacaroniKid/library heavy
  // The low days are dominated by RecDeskParks-* sites running at 1-3% specific, because
  // those calendars publish FIELD RESERVATIONS ("WRC softball - coordinating with soccer
  // (Mayeski Field 3)"), which carry no age because they are not programs. Scoping the
  // gate to one day would therefore make it oscillate on the rotation calendar and read
  // as a regression every third day — the same trap gate 1 avoids by refusing to average.
  // Cumulative is the lesser evil; the real fix is upstream (see the RECDESK-RESERVATIONS
  // note in reports/fix-notes.json), not in this metric.
  //
  // Measured as specificity (higher = better) rather than All-Ages share (lower = better)
  // because the owner set the goal on 2026-08-09 as "as high as possible, no fixed target".
  // A maximise-this goal has to be pointed at a maximise-this metric or every delta arrow
  // in the ledger reads backwards.
  //
  // target stays null and `ratchet` is set instead: some sources are GENUINELY all-ages
  // (festivals, general Eventbrite, KidsOutAndAbout — the same list Step 3c excludes from
  // flagging), so 100% is neither reachable nor desirable and any fixed number would be
  // invented. The ratchet compares against the best value ever recorded in STATUS.md, which
  // makes regressions visible without pretending to know the ceiling.
  let allAges = 0, totalEvents = 0;
  try {
    const ageRows = tablesByHeader(fs.readFileSync(AGE_MD, 'utf8'), /\|\s*site\s*\|\s*scraper\s*\|\s*all ages/i);
    ageRows.forEach(r => {
      const a = toInt(pick(r, 'all ages'));
      const t = toInt(pick(r, 'total'));
      if (a !== null && t !== null && t > 0) { allAges += a; totalEvents += t; }
    });
  } catch { notes.push('AGE-RANGE-AUDIT.md unreadable — gate 5 unavailable.'); }
  const specific = totalEvents - allAges;
  g.specificAgeShare = { now: pct(specific, totalEvents), unit: '%', target: null, ratchet: true,
    detail: totalEvents
      ? `${specific} of ${totalEvents} audited events carry a specific bracket; ${allAges} are All Ages. ` +
        `No fixed target by owner decision — some sources are genuinely all-ages, so the goal is ` +
        `"as high as possible" and the gate ratchets against the best value ever recorded. ` +
        `SCOPE: cumulative over EVERY dated section of AGE-RANGE-AUDIT.md, not just today's — ` +
        `so a single day's work moves it by a fraction of a point, and a small negative delta ` +
        `is NOT evidence of an age-detection regression. Per-section values swing 13.3%–55.8% ` +
        `purely on which rotation group ran; the low days are RecDeskParks-* facility ` +
        `reservations sitting at 1–3% specific, which have no age to detect`
      : 'no audit rows parsed' };

  // --- Gates 6 & 7 need a database read. Declared, dated, and marked — never guessed.
  g.nameConformance = { now: STALE_METRICS.nameConformance.value, unit: STALE_METRICS.nameConformance.unit,
    target: 100, stale: STALE_METRICS.nameConformance.measured,
    detail: STALE_METRICS.nameConformance.detail, refresh: STALE_METRICS.nameConformance.refresh };
  g.sourceUrlCoverage = { now: STALE_METRICS.sourceUrlCoverage.value, unit: STALE_METRICS.sourceUrlCoverage.unit,
    target: 90, stale: STALE_METRICS.sourceUrlCoverage.measured,
    detail: STALE_METRICS.sourceUrlCoverage.detail, refresh: STALE_METRICS.sourceUrlCoverage.refresh };

  // --- Gate 8 — the finish line: coverage measured against libraries that actually EXIST.
  // Phase 10 of MASTER-PLAN.md, correctly blocked on the gates above.
  const countyAuditExists = fs.existsSync(COUNTY_COVERAGE);
  g.countyCoverage = { now: countyAuditExists ? 1 : 0, unit: '', target: 1,
    detail: countyAuditExists ? 'reports/coverage-by-county.md exists' : 'not built — nobody can yet say what fraction of real libraries we cover' };

  return { gates: g, notes, sites };
}

// ---------------------------------------------------------------- rendering

const GATE_ORDER = [
  ['countiesResolve',    '1. Counties resolve',        'blocks nothing — mechanical once a city→county dataset is chosen'],
  ['urlCollisions',      '2. URLs unique per state',   'blocks gates 3 and 5 — selector work on a wrong URL imports the wrong library'],
  ['confirmedBugs',      '3. Zero open bugs',          'mostly blocked on gate 2'],
  ['unknownSites',       '4. Zero unknown sites',      'independent — re-checking is its own pass'],
  ['specificAgeShare',   '5. Age brackets resolved',   'no fixed target — maximise; ratchets vs best ever'],
  ['nameConformance',    '6. Names join to registry',  'planned migration, not daily work'],
  ['sourceUrlCoverage',  '7. Provenance (source_url)', 'partly blocked on rotation'],
  ['countyCoverage',     '8. Coverage known per county', 'FINAL — blocked on all of the above'],
];

function fmt(gate) {
  if (!gate) return '—';
  const v = gate.now === null || gate.now === undefined ? '—' : `${gate.now}${gate.unit || ''}`;
  return gate.stale ? `${v} ⚠stale` : v;
}
function fmtTarget(gate) {
  if (!gate) return '—';
  // A ratcheting gate has no fixed target by design; the bar is its own best-ever value.
  if (gate.ratchet) {
    return gate.best !== undefined ? `max (best ${gate.best}%)` : 'max';
  }
  if (gate.target === null || gate.target === undefined) return 'owner-set';
  return `${gate.target}${gate.unit || ''}`;
}

function renderTable(gates, prev) {
  const lines = [];
  lines.push('| Gate | Now | Δ | Target | Blocking |');
  lines.push('|---|---|---|---|---|');
  GATE_ORDER.forEach(([key, label, blocking]) => {
    const g = gates[key];
    let delta = '—';
    if (prev && prev[key] !== undefined && g && typeof g.now === 'number' && typeof prev[key] === 'number') {
      const d = Math.round((g.now - prev[key]) * 10) / 10;
      // Lower is better for the count-style gates; higher is better for the percentage ones.
      const lowerIsBetter = ['urlCollisions', 'confirmedBugs', 'unknownSites'].includes(key);
      if (d === 0) delta = '·';
      else {
        const improving = lowerIsBetter ? d < 0 : d > 0;
        delta = `${d > 0 ? '+' : ''}${d}${improving ? ' ✅' : ' ⚠️'}`;
      }
    }
    // Gate 3's "mostly blocked on gate 2" is only true while gate 2 is open. Leaving it
    // there once the collisions are cleared parks the largest actionable backlog on the
    // project behind work that is already done.
    const blockingNow = (key === 'confirmedBugs' && gates.urlCollisions && gates.urlCollisions.now === 0)
      ? 'unblocked — gate 2 is clear; these are now the main body of work'
      : blocking;
    lines.push(`| ${label} | ${fmt(g)} | ${delta} | ${fmtTarget(g)} | ${blockingNow} |`);
  });
  return lines.join('\n');
}

function renderBroken(gates, fixNotes) {
  const rows = [];
  const push = (sev, what, scale, why) => rows.push({ sev, what, scale, why });

  if (gates.countiesResolve.now < 100) {
    const fams = (gates.countiesResolve.families || [])
      .map(f => `${f.fam}-* ${f.pct}%`).join(', ');
    push('🔴', 'Fabricated counties — geocoding falls back to state centroid',
      gates.countiesResolve.detail + (fams ? `. Worst families: ${fams}` : ''),
      'needs a real city→county dataset; guessing one at a time is how this started');
  }
  if (gates.urlCollisions.now > 0) {
    push('🔴', 'URL collisions — entries may point at another state\'s library',
      gates.urlCollisions.detail, 'per-file live verification; the main body of MASTER-PLAN Phase 2');
  }
  if (gates.confirmedBugs.now > 0) {
    // The "blocked on the URL work" reason was true only while gate 2 was open. Once the
    // true collisions are cleared these become directly actionable, and saying otherwise
    // would park 563 fixable sites behind work that is already finished.
    push('🟠', 'Confirmed open bugs (MISMATCH, config entry still live)', `${gates.confirmedBugs.now} sites`,
      gates.urlCollisions.now > 0
        ? 'most blocked on the URL work above'
        : 'NOT blocked any more — gate 2 is clear, so these are directly actionable; dead-endpoint and extraction-failure buckets first');
  }
  // Reported as its own row, never folded into the gate-3 number and never presented as
  // resolved. A guarded entry stops costing us bad data; it does NOT give the library
  // coverage, and CLAUDE.md is explicit that a disabled library is a real gap until
  // someone finds its correct URL.
  if (gates.confirmedBugs.contained > 0) {
    push('🟠', 'Contained bugs — guarded, so no bad data, but the library is uncovered',
      `${gates.confirmedBugs.contained} sites`,
      'each needs a correct URL or a relocation to the right scraper family before it is genuinely fixed');
  }
  if (gates.unknownSites.now > 0) {
    push('🟠', 'Unknown sites (UNVERIFIABLE verdicts)',
      `${gates.unknownSites.now} sites`, 'bot-blocks / JS-only calendars / TLS failures — never re-checked');
  }
  // Flagged whenever most events still fall in the catch-all, and additionally whenever
  // specificity has regressed below its own best-ever — the ratchet, since there is no
  // fixed target to compare against.
  if (gates.specificAgeShare.now < 50 || gates.specificAgeShare.regressed) {
    push('🟠', gates.specificAgeShare.regressed
        ? 'Age detection REGRESSED below best-ever specificity'
        : 'Age detection — most events still land in the All Ages catch-all',
      `${gates.specificAgeShare.now}% resolved` +
        (gates.specificAgeShare.best ? ` (best ever ${gates.specificAgeShare.best}% on ${gates.specificAgeShare.bestDate})` : ''),
      'MASTER-PLAN Phase 5, not started');
  }
  if (gates.nameConformance.now < 100) {
    push('🟡', 'scraper_name drift — rows cannot join back to the registry',
      `${gates.nameConformance.now}% conform (as of ${gates.nameConformance.stale})`, 'deliberate migration, explicitly not daily work');
  }
  if (gates.countyCoverage.now < 1) {
    push('🟡', 'County-level coverage unknown',
      'no libraries audited against what exists', 'MASTER-PLAN Phase 10 — correctly last');
  }

  const pinned = Object.keys(fixNotes || {}).filter(k => !k.startsWith('_')).length;
  const pending = fixNotes && fixNotes._pending ? Object.keys(fixNotes._pending).length : 0;

  const lines = ['| | Broken | Scale | Why not fixed now |', '|---|---|---|---|'];
  rows.forEach(r => lines.push(`| ${r.sev} | ${r.what} | ${r.scale} | ${r.why} |`));
  return { table: lines.join('\n'), pinned, pending, count: rows.length };
}

function nextAction(gates) {
  // The single most useful thing to do next = the highest-severity gate that nothing blocks.
  if (gates.countiesResolve.now < 100) {
    return 'Defect B (counties). It is the only red gate nothing blocks, it is mechanical once a ' +
           'dataset is chosen, and it silently degrades every geocode in the fleet right now.';
  }
  if (gates.urlCollisions.now > 0) {
    return 'Defect A (URL collisions), worst-collision-state first — it gates the selector and ' +
           'age-detection work behind it.';
  }
  if (gates.unknownSites.now > 0) return 'Work down the UNVERIFIABLE backlog (MASTER-PLAN Phase 8).';
  if (gates.confirmedBugs.now > 0) return 'Clear the remaining confirmed MISMATCH bugs.';
  return 'Build the county-level coverage audit (MASTER-PLAN Phase 10) — the finish line.';
}

// ---------------------------------------------------------------- STATUS.md trend

// Each entry carries a machine-readable snapshot in an HTML comment. Trend is read from
// THOSE, never by re-parsing the human tables — markdown formatting drifts, and a parser
// that depends on it breaks silently (exactly what unescaped pipes did on 2026-08-09).
function readAllSnapshots() {
  if (!fs.existsSync(STATUS_MD)) return [];
  const md = fs.readFileSync(STATUS_MD, 'utf8');
  const out = [];
  for (const m of md.matchAll(/<!-- STATUS-DATA (.*?) -->/g)) {
    try {
      const snap = JSON.parse(m[1]);
      // Migration: gate 5 was recorded as allAgesShare (lower-is-better) before the owner
      // set the goal as maximise-specificity on 2026-08-09. Derive the new metric from the
      // old one so the trend line survives the flip instead of restarting at zero history.
      if (snap.specificAgeShare === undefined && typeof snap.allAgesShare === 'number') {
        snap.specificAgeShare = Math.round((100 - snap.allAgesShare) * 10) / 10;
      }
      out.push(snap);
    } catch { /* skip unparseable snapshot rather than abort the run */ }
  }
  return out;                      // newest first — entries are prepended
}

function readPrevious() {
  return readAllSnapshots()[0] || null;
}

/**
 * Drop the whole entry for `date`, heading through to the next dated heading.
 *
 * Done by walking headings rather than with one regex: the first implementation used
 * `/^## DATE[\s\S]*?(?=^## \d{4}-\d{2}-\d{2}|$)/m`, and under the `m` flag `$` matches
 * the end of ANY line, so the lazy quantifier stopped at the first newline and left the
 * rest of the old entry behind. Caught immediately (1 heading but 2 STATUS-DATA blocks
 * after a same-day re-run), but left alone it would have silently accumulated orphaned
 * tables under the wrong date and corrupted the trend ledger.
 */
function removeEntryFor(body, date) {
  const out = [];
  let skipping = false;
  for (const line of body.split(/\r?\n/)) {
    const m = /^## (\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (m) skipping = (m[1] === date);
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

function writeStatus(gates, tableMd, brokenMd, next, notes) {
  const snapshot = {};
  Object.entries(gates).forEach(([k, v]) => { snapshot[k] = v.now; });

  const entry = [
    `## ${TODAY}`,
    '',
    `<!-- STATUS-DATA ${JSON.stringify({ date: TODAY, ...snapshot })} -->`,
    '',
    '### Distance to 100%',
    '',
    tableMd,
    '',
    '### Still broken',
    '',
    brokenMd,
    '',
    `**Next action:** ${next}`,
    ...(notes.length ? ['', '**Data notes:**', ...notes.map(n => `- ${n}`)] : []),
    '',
  ].join('\n');

  const header = [
    '# FunHive Project Status',
    '',
    'Trend ledger. Newest entry first. Generated by `node scripts/project-status.js --save`',
    '(zero Supabase egress — local files only). Gates marked ⚠stale need a DB read to refresh;',
    'the command is in each gate\'s detail line and the value is dated, never guessed.',
    '',
    '---',
    '',
  ].join('\n');

  let body = '';
  if (fs.existsSync(STATUS_MD)) {
    const existing = fs.readFileSync(STATUS_MD, 'utf8');
    const idx = existing.indexOf('## ');
    body = idx === -1 ? '' : existing.slice(idx);
    body = removeEntryFor(body, TODAY);   // re-running the same day replaces, never stacks
  }
  fs.writeFileSync(STATUS_MD, header + entry + '\n' + body.trimStart());
}

// ---------------------------------------------------------------- main

function main() {
  const { gates, notes } = computeGates();
  let fixNotes = {};
  try { fixNotes = JSON.parse(fs.readFileSync(FIX_NOTES, 'utf8')); } catch {}

  const prev = readPrevious();

  // Ratchet for gate 5: the owner set no fixed target ("as high as possible"), so the
  // bar is the best value ever recorded. Anything below it is a regression worth naming.
  const history = readAllSnapshots().filter(s => typeof s.specificAgeShare === 'number');
  if (history.length && gates.specificAgeShare) {
    const best = history.reduce((a, b) => (b.specificAgeShare > a.specificAgeShare ? b : a));
    gates.specificAgeShare.best = best.specificAgeShare;
    gates.specificAgeShare.bestDate = best.date;
    gates.specificAgeShare.regressed = gates.specificAgeShare.now < best.specificAgeShare;
  }

  const tableMd = renderTable(gates, prev);
  const broken = renderBroken(gates, fixNotes);
  const next = nextAction(gates);

  console.log('\n=== DISTANCE TO 100% ===\n');
  console.log(tableMd);
  console.log('\n=== STILL BROKEN ===\n');
  console.log(broken.table);
  console.log(`\nPinned owner notes: ${broken.pinned}   Awaiting-confirmation entries: ${broken.pending}`);
  console.log(`\nNEXT ACTION: ${next}`);
  if (notes.length) {
    console.log('\nData notes:');
    notes.forEach(n => console.log(`  - ${n}`));
  }
  Object.entries(gates).filter(([, g]) => g.stale).forEach(([, g]) => {
    console.log(`  - STALE since ${g.stale}: ${g.detail}. Refresh: ${g.refresh}`);
  });

  if (save) {
    writeStatus(gates, tableMd, broken.table, next, notes);
    console.log(`\nWrote ${path.relative(ROOT, STATUS_MD)}${prev ? ` (trend vs ${prev.date})` : ' (first entry)'}`);
  } else {
    console.log('\n(dry run — re-run with --save to record this in STATUS.md)');
  }
}

main();

#!/usr/bin/env node
/**
 * generate-site-report.js — renders reports/site-report.html from the two audit files.
 *
 * Source of truth is LIBRARY-SITE-AUDIT.md + AGE-RANGE-AUDIT.md (plus the durable
 * verdict store reports/verification-comments.json). This script is a pure projection:
 * it reads no database and fetches nothing, so it adds zero Supabase egress.
 *
 * Completeness is the hard requirement. Every active scraper in scraper-registry.js
 * appears in the output even when it has no rows in either audit file, and every row
 * survives even when its state / link / count is missing. Missing data is rendered as
 * an explicit marker, never as an omitted row. See the Coverage panel.
 *
 * Usage: node scripts/generate-site-report.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB_MD = path.join(ROOT, 'LIBRARY-SITE-AUDIT.md');
const AGE_MD = path.join(ROOT, 'AGE-RANGE-AUDIT.md');
const COMMENTS_JSON = path.join(ROOT, 'reports', 'verification-comments.json');
const FIX_NOTES_JSON = path.join(ROOT, 'reports', 'fix-notes.json');
const OUT_HTML = path.join(ROOT, 'reports', 'site-report.html');
const RUN_LOG = path.join(ROOT, 'scrapers', 'logs', 'scraper-summary.log');

const MISSING = '—';

// Kept in sync with Step 3c of the diagnosis routine. Genuinely broad-content sources,
// excluded from the >=70% All Ages flag because a high All-Ages share is correct for them.
const KNOWN_LEGIT_ALL_AGES = [
  'FestivalGuides-Eastern', 'FairsFestivals-Eastern',
  'KidsOutAndAbout-Eastern', 'KidsOutAndAbout-DMV', 'Eventbrite-Family-Eastern',
];

// ---------------------------------------------------------------- markdown parsing

// Splits a markdown table row into trimmed cells, dropping the leading/trailing empties.
// Honors the `\|` escape: venue names legitimately contain pipes (e.g.
// "Hall Art Foundation | Reading, Vermont"), and the audit files escape them correctly.
// A naive split('|') shifts every later cell one position right, which silently moved
// venue-name fragments into the Scraper column and garbled that row's counts.
function cells(line) {
  const parts = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  if (parts.length && parts[0].trim() === '') parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
  return parts.map(s => s.trim());
}

function isSeparator(line) {
  return /^\|[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

// Pulls data rows out of EVERY table whose header matches `headerRe`.
// These audit files accumulate a section per run, each with its own table. An earlier version
// stopped at the first table, so rows added by later runs — including every WordPress-MD row
// after its 2026-08-06 rebuild — were invisible to the report and their verification comments
// never rendered. Later occurrences of the same (scraper, site) win, so the newest run's
// numbers are the ones shown.
function tableRows(md, headerRe, expectedCols, keyIdx) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith('|')) { inTable = false; continue; }   // leave the table, keep scanning
    if (!inTable) { if (headerRe.test(line)) inTable = true; continue; }
    if (isSeparator(line)) continue;
    const c = cells(line);
    if (c.length >= expectedCols) out.push(c);
  }
  if (!keyIdx) return out;
  // De-duplicate on (site, scraper), keeping the last — i.e. the most recent run's row.
  const seen = new Map();
  out.forEach(c => seen.set(keyIdx.map(i => (c[i] || '').toLowerCase()).join('|||'), c));
  return [...seen.values()];
}

// `[label](url)` -> {url, kind}. A bare em-dash (or anything unparseable) -> no link.
function parseLink(cell) {
  const m = /\[([^\]]*)\]\(([^)]+)\)/.exec(cell || '');
  if (!m) return { url: '', kind: '' };
  const label = m[1];
  // "link (event, DB fallback)" marks a single event page rather than a stable calendar URL.
  const kind = /fallback|event\b/i.test(label) ? 'event' : 'calendar';
  return { url: m[2], kind };
}

// "955 *(log shows aggregate ...)*" -> {n: 955, note: "log shows aggregate ..."}
// A cell with no digits yields n:null, which renders as an explicit missing marker.
function parseCount(cell) {
  const noteM = /\*\(([\s\S]*?)\)\*/.exec(cell || '');
  const note = noteM ? noteM[1].trim() : '';
  const numM = /(-?\d[\d,]*)/.exec((cell || '').replace(/\*\([\s\S]*?\)\*/, ''));
  const n = numM ? parseInt(numM[1].replace(/,/g, ''), 10) : null;
  return { n: Number.isFinite(n) ? n : null, note };
}

function parseIntOrNull(s) {
  const m = /(-?\d[\d,]*)/.exec(s || '');
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Age of the data the report projects — NOT when the report was generated.
// Prefer the `## YYYY-MM-DD` run headings Step 3c writes. Fall back to any date in the
// file, but never past today: these files quote future event dates in prose, and a naive
// max picked up 2026-11-05 as the "data date".
function newestDate(md, today) {
  const heads = (md.match(/^#{1,3}\s+.*?(20\d{2}-\d{2}-\d{2})/gm) || [])
    .map(h => (h.match(/20\d{2}-\d{2}-\d{2}/) || [])[0]).filter(Boolean);
  const pool = (heads.length ? heads : (md.match(/20\d{2}-\d{2}-\d{2}/g) || []))
    .filter(d => !today || d <= today).sort();
  return pool.length ? pool[pool.length - 1] : '';
}

// Last run per scraper, parsed from scrapers/logs/scraper-summary.log. That file is appended
// by every scraper run, so this makes the report reflect the 3am run without waiting for the
// 2:12pm diagnosis to rebuild the audit files. Local read, no database, no egress.
// Column layout changed over time: older runs omit INVALID, so parse by count.
function loadRunLog() {
  const out = new Map();
  if (!fs.existsSync(RUN_LOG)) return out;
  const lines = fs.readFileSync(RUN_LOG, 'utf8').split(/\r?\n/);
  // Capture the FULL timestamp, not just the date. Comparing by date alone made
  // "most recent" mean "last line in the file for that day", which is not the
  // same thing once a day contains several runs of one scraper.
  const re = /^\[((\d{4}-\d{2}-\d{2})T[^\]]*)\]\s+(?:⚠️\s*)?([A-Za-z][\w.\- ]*?)\s{2,}([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([\d,]+))?\s+([\d.]+)\s*$/;

  // A run ends by REPLAYING every scraper's result under a "PER-SCRAPER RESULTS"
  // header, stamped with the time the run finished rather than the time that
  // scraper actually ran. The 2026-08-10 nightly run took 29.6 hours (MacaroniKid
  // Group 1 alone ran 18h), so its recap landed on 2026-08-11 and re-asserted
  // CivicEngage-Libraries' stale 3am "0 found" over a real 354-found run from
  // earlier that morning — the report showed a fixed scraper as still broken.
  // Every recap row duplicates a row already logged live during the run, so
  // skipping recap blocks loses nothing.
  let inRecap = false;

  // Fail OPEN, not closed. Recap detection is a heuristic over a log format this
  // repo controls but has changed before; if the terminator wording ever drifts,
  // inRecap would stay true and every row after the first recap would be dropped
  // silently — far worse than the stale-row bug this replaced. The longest recap
  // ever emitted is 58 data lines (measured over the full cumulative log), so a
  // block running past 200 means the marker is gone: stop skipping and say so.
  const RECAP_SANITY_LIMIT = 200;
  let recapLines = 0;
  let recapOverflowed = false;

  for (const line of lines) {
    if (line.includes('PER-SCRAPER RESULTS')) { inRecap = true; recapLines = 0; continue; }
    if (inRecap && /succeeded/.test(line)) { inRecap = false; continue; }
    if (line.includes('FunHive Scraper Run')) { inRecap = false; continue; }
    if (inRecap) {
      if (++recapLines > RECAP_SANITY_LIMIT) {
        inRecap = false;
        recapOverflowed = true;
      } else {
        continue;
      }
    }

    const m = re.exec(line);
    if (!m) continue;
    const name = m[3].trim();
    if (!name || /^-+$/.test(name) || name === 'SCRAPER') continue;
    const nums = [m[4], m[5], m[6], m[7]].filter(v => v !== undefined).map(v => parseInt(String(v).replace(/,/g, ''), 10));
    // 4 numeric cols => FOUND NEW DUPES INVALID ; 3 => FOUND NEW DUPES (older format)
    const rec = { ts: m[1], date: m[2], found: nums[0], nu: nums[1], dupes: nums[2], invalid: nums.length > 3 ? nums[3] : null };
    const prev = out.get(name);
    if (!prev || rec.ts >= (prev.ts || prev.date)) out.set(name, rec);   // keep the most recent
  }
  if (recapOverflowed) {
    console.warn('  ⚠️  run-log recap block never terminated — the summary log format has changed.');
    console.warn('      Skipping was abandoned to avoid dropping rows, so Last-run may show a replayed');
    console.warn('      stale row again. Fix the block detection in loadRunLog().');
  }
  return out;
}

// Current configured URL per (scraper, site name), read straight from the scraper files.
// The audit tables are a snapshot of the last scrape; this is what the config says NOW, so a
// row can report "URL corrected, awaiting re-scrape" instead of silently showing a stale link.
function loadConfigIndex() {
  const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
  const all = { ...reg.SCRAPERS, ...reg.MACARONI_SCRAPERS };
  const idx = new Map();           // "scraper|||normalisedName" -> url
  const counts = new Map();        // scraper -> how many per-site entries it configures
  const byName = new Map();        // normalisedName -> Set(scrapers that configure it)
  const fileCache = new Map();
  Object.entries(all).forEach(([key, sc]) => {
    if (!sc.file) return;
    const abs = path.join(ROOT, 'scrapers', String(sc.file).replace(/^\.\//, ''));
    if (!fs.existsSync(abs)) return;
    let entries = fileCache.get(abs);
    if (!entries) {
      // Strip comments first. Several scrapers carry an AUTO-GENERATED header comment that
      // documents the generator's input list, including libraries that are NOT in the real
      // config — scraper-wordpress-libraries-md.js documents 11 while configuring 10. Parsing
      // raw source counts those as live entries and corrupts the Status column.
      const src = fs.readFileSync(abs, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      entries = [];
      const objRe = /\{[^{}]*\}/g;
      const nameRe = /["']?name["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/;
      const urlRe  = /["']?url["']?\s*:\s*(?:'([^']*)'|"([^"]*)")/;
      let o;
      while ((o = objRe.exec(src))) {
        const nm = nameRe.exec(o[0]); if (!nm) continue;
        const uu = urlRe.exec(o[0]);  if (!uu) continue;
        entries.push([nm[1] !== undefined ? nm[1] : nm[2], uu[1] !== undefined ? uu[1] : uu[2]]);
      }
      fileCache.set(abs, entries);
    }
    entries.forEach(([n, u]) => {
      idx.set(key + '|||' + cfgKey(n), u);
      const k = cfgKey(n);
      if (!byName.has(k)) byName.set(k, new Set());
      byName.get(k).add(key);
    });
    counts.set(key, (counts.get(key) || 0) + entries.length);
  });
  return { idx, counts, byName };
}
// Audit rows name sites "Belmont Branch Library (Belmont, NC)"; config says "Belmont Branch Library".
function cfgKey(name) {
  return String(name).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function hostOf(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return ''; } }

// ---------------------------------------------------------------- load sources

function loadSites() {
  if (!fs.existsSync(LIB_MD)) return { rows: [], error: 'LIBRARY-SITE-AUDIT.md not found' };
  const md = fs.readFileSync(LIB_MD, 'utf8');
  const dataDate = newestDate(md, new Date().toISOString().slice(0,10));
  const raw = tableRows(md, /Library Website\s*\|\s*State/i, 5, [0, 2]);   // site + scraper
  const rows = raw.map(c => {
    const { n, note } = parseCount(c[3]);
    const { url, kind } = parseLink(c[4]);
    const site = c[0] || MISSING;
    const state = c[1] || MISSING;
    const scraper = c[2] || MISSING;
    // gap = this row could not be broken down to a real per-site count.
    const gap = note || (/aggregate|not itemized|no per-library/i.test(site) ? 'aggregate row' : '');
    return [site, state, scraper, n, gap, url, kind];   // status appended later in main()
  });
  return { rows, dataDate, error: raw.length ? '' : 'no parseable rows in LIBRARY-SITE-AUDIT.md' };
}

function loadAges() {
  if (!fs.existsSync(AGE_MD)) return { rows: [], error: 'AGE-RANGE-AUDIT.md not found' };
  const md = fs.readFileSync(AGE_MD, 'utf8');
  const dataDate = newestDate(md, new Date().toISOString().slice(0,10));
  const raw = tableRows(md, /Site\s*\|\s*Scraper\s*\|\s*All Ages/i, 10, [0, 1]);   // site + scraper
  const rows = raw.map(c => {
    const nums = [2, 3, 4, 5, 6, 7, 8].map(i => parseIntOrNull(c[i]));
    const { url, kind } = parseLink(c[9]);
    const brackets = nums.slice(0, 6).map(v => (v === null ? 0 : v));
    let total = nums[6];
    // If Total is missing or inconsistent, fall back to the bracket sum so the row still
    // renders and still participates in the flag calculation.
    const sum = brackets.reduce((a, b) => a + b, 0);
    const totalNote = (total === null) ? 'total missing, using bracket sum'
      : (total !== sum ? `total ${total} != bracket sum ${sum}` : '');
    if (total === null) total = sum;
    return [c[0] || MISSING, c[1] || MISSING, ...brackets, total, url, kind, totalNote];
  });
  return { rows, dataDate, error: raw.length ? '' : 'no parseable rows in AGE-RANGE-AUDIT.md' };
}

function loadComments() {
  if (!fs.existsSync(COMMENTS_JSON)) return {};
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_JSON, 'utf8'));
  } catch (e) {
    console.warn('  ! verification-comments.json unreadable, continuing without verdicts:', e.message);
    return {};
  }
}

function loadFixNotes() {
  if (!fs.existsSync(FIX_NOTES_JSON)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(FIX_NOTES_JSON, 'utf8'));
    delete raw._README;
    return raw;
  } catch (e) {
    console.warn('  ! fix-notes.json unreadable, continuing without notes:', e.message);
    return {};
  }
}

// Full active roster — the completeness baseline.
function loadRoster() {
  const reg = require(path.join(ROOT, 'scrapers', 'scraper-registry.js'));
  const active = reg.getActiveStates();
  const out = [];
  const add = (map, family) => {
    Object.keys(map || {}).forEach(name => {
      const s = map[name];
      if (!reg.isScraperActive(s, active)) return;
      out.push({
        name,
        group: s.group != null ? String(s.group) : MISSING,
        state: s.state || MISSING,
        family,
        // Where the fix actually goes. Registry paths are './x.js' relative to scrapers/.
        file: s.file ? 'scrapers/' + String(s.file).replace(/^\.\//, '') : MISSING,
        exportName: s.exportName || MISSING,
      });
    });
  };
  add(reg.SCRAPERS, 'standard');
  add(reg.MACARONI_SCRAPERS, 'macaroni');
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- fix queue

// Root-cause buckets come from Step 3d of the diagnosis routine. Each needs a different
// fix, so mis-bucketing wastes real work — these are keyword HINTS off the verdict text,
// always shown next to the evidence that produced them, never presented as settled.
function classify(comments, population) {
  const blob = comments.join(' ').toLowerCase();
  if (/\bunrelated\b|parked|gambling|different (state|library|site)|dead domain|expired|for sale/.test(blob)) return 'dead-domain';
  if (/collision|same url|shared url|both point|points at|resolves to (a )?different/.test(blob)) return 'url-collision';
  return population === 'allages' ? 'age-detection' : 'extraction-failure';
}

const BUCKET_ACTION = {
  'dead-domain': 'The configured URL now serves an unrelated site. Fix the URL in the config array — do NOT touch extraction code.',
  'url-collision': 'Seed-data bug: several distinct sites share one URL that resolves to only one of them. Fix the per-site URLs in the config array — extraction is fine.',
  'extraction-failure': 'Right site, real server-rendered events, scraper still returns 0. Per-site DOM work; there is no generic patch for the WordPress-{state} family.',
  'age-detection': 'Live site shows clearly age-targeted programming that is not landing in a bracket. Check detectAgeRange()/resolveAgeRange() in scrapers/helpers/supabase-adapter.js plus any local detector in this file, then re-run `node scripts/test-age-detection.js`.',
};

function buildFixQueue({ sites, ages, comments, roster, fixNotes }) {
  const byScraper = new Map();
  const get = name => {
    if (!byScraper.has(name)) {
      byScraper.set(name, {
        name, mismatchZero: [], mismatchAges: [], unverifiable: 0,
        zeroSites: 0, flagged: [], evidence: [],
      });
    }
    return byScraper.get(name);
  };

  // Zero-event sites that a live check contradicted, plus raw zero counts.
  sites.forEach(r => { if (r[3] === 0) get(r[2]).zeroSites++; });

  Object.entries(comments).forEach(([key, c]) => {
    const idx = key.indexOf('|||');
    if (idx < 0) return;
    const scraper = key.slice(0, idx);
    const site = key.slice(idx + 3);
    const e = get(scraper);
    if (c.verdict === 'UNVERIFIABLE') { e.unverifiable++; return; }
    if (c.verdict !== 'MISMATCH') return;
    (c.population === 'allages' ? e.mismatchAges : e.mismatchZero).push(site);
    if (e.evidence.length < 3) e.evidence.push(`${site} — ${c.comment}`);
  });

  // Flagged >=70% All Ages, recomputed here so the queue does not depend on the page.
  const legit = new Set(KNOWN_LEGIT_ALL_AGES);
  ages.forEach(r => {
    if (r[8] >= 20 && !legit.has(r[1]) && (r[2] / r[8]) >= 0.7) get(r[1]).flagged.push(r[0]);
  });

  Object.keys(fixNotes).forEach(name => { if (name !== '_global' && name !== '_pending') get(name); });

  const rosterByName = new Map(roster.map(r => [r.name, r]));

  const rows = [...byScraper.values()].map(e => {
    const mism = e.mismatchZero.length + e.mismatchAges.length;
    const note = fixNotes[e.name] || null;
    const meta = rosterByName.get(e.name) || {};
    const pop = e.mismatchAges.length > e.mismatchZero.length ? 'allages' : 'zero';
    // A pinned note is a human judgement and outranks the keyword hint, so feed it in too.
    const signal = note ? [...e.evidence, note.note] : e.evidence;
    const bucket = mism ? classify(signal, pop) : (e.flagged.length ? 'age-detection' : '');
    // Confirmed bugs dominate; a pinned high-priority note outranks everything.
    let score = mism * 100 + e.flagged.length * 5 + e.zeroSites;
    if (note && note.priority === 'high') score += 10000;
    const affected = [...new Set([...e.mismatchZero, ...e.mismatchAges])];
    return [
      e.name, meta.group || MISSING, meta.file || MISSING,
      mism, e.flagged.length, e.zeroSites, e.unverifiable,
      bucket, bucket ? BUCKET_ACTION[bucket] : '',
      affected.slice(0, 12), e.evidence,
      note ? note.note : '', note ? (note.priority || 'normal') : '',
      score,
    ];
  })
    .filter(r => r[3] > 0 || r[4] > 0 || r[11])   // confirmed bug, flagged site, or a pinned note
    .sort((a, b) => b[13] - a[13]);

  return rows;
}

// ---------------------------------------------------------------- html

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Safe to embed inside <script>: escapes the sequences that could close the tag early.
function jsonLiteral(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildHtml(data) {
  const { sites, ages, comments, roster, coverage, runDate, notes, fixQueue, globalNote, pending, libDate, ageDate } = data;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FunHive Site Coverage — ${esc(runDate)}</title>
<style>
:root{
  --bg:#faf7f1; --surface:#ffffff; --surface-2:#f2ede2; --border:#e5ddc9;
  --text:#26221a; --text-dim:#6b6252; --text-faint:#9a8f78;
  --accent:#c1560c; --accent-soft:#f4dcc4; --accent-text:#7a3607;
  --ok:#3f7a4f; --ok-soft:#dcece0;
  --warn:#a06a08; --warn-soft:#f5e3bd;
  --crit:#a83e2c; --crit-soft:#f6ddd6;
  --row-hover:#f7f1e4;
  --shadow:0 1px 2px rgba(38,34,26,.06),0 6px 20px rgba(38,34,26,.05);
}
:root[data-theme="dark"]{
  --bg:#1a160f; --surface:#221c14; --surface-2:#2a2318; --border:#3a3122;
  --text:#f2ead9; --text-dim:#c2b498; --text-faint:#8a7d64;
  --accent:#f0985a; --accent-soft:#4a3016; --accent-text:#ffcfa0;
  --ok:#7cc492; --ok-soft:#22341f;
  --warn:#e0b04a; --warn-soft:#3a2f11;
  --crit:#e88b74; --crit-soft:#3a201a;
  --row-hover:#2c2416;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg:#1a160f; --surface:#221c14; --surface-2:#2a2318; --border:#3a3122;
    --text:#f2ead9; --text-dim:#c2b498; --text-faint:#8a7d64;
    --accent:#f0985a; --accent-soft:#4a3016; --accent-text:#ffcfa0;
    --ok:#7cc492; --ok-soft:#22341f;
    --warn:#e0b04a; --warn-soft:#3a2f11;
    --crit:#e88b74; --crit-soft:#3a201a;
    --row-hover:#2c2416;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35);
  }
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--text);
  font-family:"Segoe UI","Public Sans",ui-sans-serif,system-ui,-apple-system,sans-serif;
  font-size:14px;line-height:1.5;}
.wrap{max-width:1240px;margin:0 auto;padding:28px 20px 80px}
h1,h2{font-family:Charter,"Iowan Old Style","Palatino Linotype",Georgia,serif;font-weight:600;margin:0;text-wrap:balance}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--accent-text)}
header.top{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;
  padding-bottom:18px;margin-bottom:22px;border-bottom:1px solid var(--border)}
header.top h1{font-size:30px;letter-spacing:-.01em;margin-top:4px}
header.top .sub{color:var(--text-dim);margin-top:6px;font-size:13.5px;max-width:66ch}
.run-date .asof{font-size:11px;color:var(--text-faint);font-variant-numeric:tabular-nums}
.run-date{font-variant-numeric:tabular-nums;font-size:13px;color:var(--text-dim);text-align:right;line-height:1.5;
  background:var(--surface-2);border:1px solid var(--border);border-radius:999px;padding:5px 13px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:8px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px 15px;box-shadow:var(--shadow)}
.stat .n{font-size:23px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.stat .l{font-size:11.5px;color:var(--text-dim);margin-top:3px;line-height:1.35}
.stat.accent .n{color:var(--accent)} .stat.warn .n{color:var(--warn)} .stat.crit .n{color:var(--crit)}
.banner{margin:18px 0 4px;padding:11px 15px;border-radius:10px;border:1px solid var(--border);
  background:var(--surface-2);color:var(--text-dim);font-size:13px}
.banner.warn{border-color:var(--warn);background:var(--warn-soft);color:var(--text)}
.banner.pending{border-color:var(--accent);background:var(--accent-soft);color:var(--text)}
.banner.pending ul{margin:8px 0 0;padding-left:20px}
.banner.pending li{margin:5px 0;line-height:1.45}
.banner.pending .mono{font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;font-size:11.5px;color:var(--accent-text)}
.banner b{color:var(--text)}
nav.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:24px 0 0;border-bottom:1px solid var(--border)}
nav.tabs button{appearance:none;background:transparent;border:0;border-bottom:2px solid transparent;
  color:var(--text-dim);font:inherit;font-weight:600;font-size:13.5px;padding:9px 13px;cursor:pointer;margin-bottom:-1px}
nav.tabs button:hover{color:var(--text)}
nav.tabs button.active{color:var(--accent-text);border-bottom-color:var(--accent)}
section.panel{display:none;padding-top:18px} section.panel.active{display:block}
.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.toolbar input[type=search]{flex:1;min-width:220px;background:var(--surface);color:var(--text);
  border:1px solid var(--border);border-radius:9px;padding:8px 12px;font:inherit}
.toolbar input[type=search]:focus{outline:2px solid var(--accent);outline-offset:1px}
.count{font-size:12.5px;color:var(--text-faint);font-variant-numeric:tabular-nums;white-space:nowrap}
.tablewrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;font-size:13px}
thead th{position:sticky;top:0;z-index:1;background:var(--surface-2);text-align:left;font-weight:700;
  font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-dim);
  padding:9px 11px;border-bottom:1px solid var(--border);white-space:nowrap}
thead th[data-key]{cursor:pointer;user-select:none}
thead th[data-key]:hover{color:var(--text)}
thead th .arrow{opacity:.45;font-size:10px;margin-left:3px}
thead th.sorted{color:var(--accent-text)} thead th.sorted .arrow{opacity:1}
tbody td{padding:8px 11px;border-bottom:1px solid var(--border);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--row-hover)}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td.site{font-weight:600;min-width:180px}
td.scraper{color:var(--text-dim);font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;font-size:12px;white-space:nowrap}
td.comment-cell{min-width:260px;max-width:520px;color:var(--text-dim);font-size:12.5px}
a{color:var(--accent-text)} a:hover{text-decoration:none}
.tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  padding:1px 6px;border-radius:5px;margin-left:6px;vertical-align:1px;white-space:nowrap}
.tag.gap{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn)}
.tag.missing{background:var(--crit-soft);color:var(--crit);border:1px solid var(--crit)}
.tag.evt{background:var(--surface-2);color:var(--text-faint);border:1px solid var(--border)}
.verdict-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;
  padding:1px 6px;border-radius:5px;margin-right:6px;white-space:nowrap}
.verdict-pill.ok{background:var(--ok-soft);color:var(--ok);border:1px solid var(--ok)}
.verdict-pill.crit{background:var(--crit-soft);color:var(--crit);border:1px solid var(--crit)}
.verdict-pill.muted{background:var(--surface-2);color:var(--text-faint);border:1px solid var(--border)}
.pct-flag{display:inline-block;font-weight:700;padding:1px 6px;border-radius:5px;font-variant-numeric:tabular-nums}
.pct-flag.warn{background:var(--warn-soft);color:var(--warn)}
.pct-flag.crit{background:var(--crit-soft);color:var(--crit)}
.status{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;
  padding:1px 7px;border-radius:5px;white-space:nowrap}
.status.full{background:var(--ok-soft);color:var(--ok);border:1px solid var(--ok)}
.status.partial{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn)}
.status.none{background:var(--crit-soft);color:var(--crit);border:1px solid var(--crit)}
.status.unaudited{background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent)}
.notice{background:var(--accent-soft);border:1px solid var(--accent);color:var(--text);
  border-radius:10px;padding:12px 15px;font-size:13px;margin-bottom:12px}
.notice code{background:var(--surface);padding:1px 5px;border-radius:4px;font-size:12px}
.gnote{background:var(--surface-2);border:1px solid var(--border);border-left:3px solid var(--accent);
  border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--text-dim);margin-bottom:12px}
.gnote b{color:var(--text)}
td.detail{min-width:420px;max-width:720px;font-size:12.5px}
td.detail .pin{background:var(--surface-2);border-left:3px solid var(--text-faint);
  padding:6px 10px;border-radius:6px;margin-bottom:6px;color:var(--text)}
td.detail .pin.hi{border-left-color:var(--crit);background:var(--crit-soft)}
td.detail .action{color:var(--text-dim);margin-bottom:5px}
td.detail .filepath{font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;font-size:11.5px;
  color:var(--accent-text);margin-bottom:5px}
td.detail .affected{color:var(--text-dim);margin-bottom:5px;line-height:1.45}
td.detail .unv{color:var(--warn);margin-top:5px;font-size:12px}
td.detail details.ev{margin-top:4px}
td.detail details.ev summary{cursor:pointer;color:var(--accent-text);font-weight:600;font-size:12px}
td.detail details.ev div{color:var(--text-dim);margin:5px 0 0 10px;padding-left:8px;border-left:2px solid var(--border)}
td.statuscell{min-width:200px;max-width:330px}
.rowstat{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  padding:1px 6px;border-radius:5px;white-space:nowrap}
.rowstat.s-current{background:var(--ok-soft);color:var(--ok);border:1px solid var(--ok)}
.rowstat.s-refixed{background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent)}
.rowstat.s-unmatched{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn)}
.rowstat.s-no-link{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn)}
.rowstat.s-mismatch{background:var(--crit-soft);color:var(--crit);border:1px solid var(--crit)}
.rowstat.s-moved{background:var(--surface-2);color:var(--text-dim);border:1px solid var(--text-faint)}
.rowstat.s-unknown{background:var(--surface-2);color:var(--text-faint);border:1px solid var(--border)}
.rowstat.s-placeholder{background:var(--surface-2);color:var(--text-dim);border:1px dashed var(--text-faint)}
.statdetail{font-size:11.5px;color:var(--text-dim);margin-top:4px;line-height:1.4}
.rowstat.s-awaiting{background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent)}
.tag.await{background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent)}
td.runcell{white-space:nowrap;min-width:132px}
.runbadge{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;
  font-variant-numeric:tabular-nums}
.runbadge.ran-today{background:var(--ok-soft);color:var(--ok);border:1px solid var(--ok)}
.runbadge.ran-older{background:var(--surface-2);color:var(--text-dim);border:1px solid var(--border)}
.rundetail{font-size:11px;color:var(--text-dim);margin-top:3px;font-variant-numeric:tabular-nums}
.rundetail .bad{color:var(--crit)}
.pendbox{margin-top:7px;padding:7px 10px;border-left:3px solid var(--accent);background:var(--surface-2);border-radius:6px}
.pendbox .pd{font-size:11.5px;color:var(--text-dim);margin-top:4px;line-height:1.45}
.pendbox .pd.mono{font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;font-size:11px;color:var(--accent-text)}
.bucket{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:2px 7px;
  border-radius:5px;white-space:nowrap}
.bucket.b-dead-domain{background:var(--crit-soft);color:var(--crit);border:1px solid var(--crit)}
.bucket.b-url-collision{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn)}
.bucket.b-extraction-failure{background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent)}
.bucket.b-age-detection{background:var(--surface-2);color:var(--text-dim);border:1px solid var(--border)}
b.bug{color:var(--crit)}
.agebar{display:flex;height:8px;width:104px;border-radius:4px;overflow:hidden;background:var(--surface-2);margin-top:4px}
.agebar span{display:block;height:100%}
.seg-all{background:var(--text-faint)} .seg-babies{background:#e8846b} .seg-pre{background:#e8a33c}
.seg-kids{background:#5f9e63} .seg-tween{background:#4f8fbf} .seg-teen{background:#8b6bc4}
footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--border);color:var(--text-faint);font-size:12px}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <div>
    <div class="eyebrow">FunHive · daily scraper diagnosis</div>
    <h1>Sites, events, and age tagging</h1>
    <div class="sub">Every active scraper and every individual site from the current 3-day audit cycle. Rows with missing data are kept and marked, never dropped.</div>
  </div>
  <div class="run-date">Generated ${esc(runDate)}<br><span class="asof">library data ${esc(libDate || "?")} &middot; age data ${esc(ageDate || "?")}</span></div>
</header>

<div class="stats" id="stat-row"></div>
<div id="banners"></div>

<nav class="tabs">
  <button class="active" data-panel="sites">Library sites</button>
  <button data-panel="age">Age breakdown</button>
  <button data-panel="flag">Flagged ≥70% All Ages</button>
  <button data-panel="cov">Coverage</button>
  <button data-panel="fix">Fix queue</button>
</nav>

<section class="panel" id="panel-fix">
  <div class="notice">
    <b>Notes for Claude — read this before fixing scrapers.</b>
    One row per scraper with a confirmed bug, a flagged site, or a pinned note, worst first.
    <i>Likely bucket</i> is a keyword hint off the verdict text, not a verdict itself — confirm against the
    evidence and the live site before changing code, since each bucket needs a different fix.
    Add or edit notes in <code>reports/fix-notes.json</code>; this page is regenerated in full every run,
    so anything typed here is lost.
  </div>
  <div id="global-note"></div>
  <div class="toolbar"><input type="search" id="fix-search" placeholder="Filter by scraper, bucket, file, or note…"><span class="count" id="fix-count"></span></div>
  <div class="tablewrap"><table id="fix-table">
    <thead><tr>
      <th data-key="scraper">Scraper<span class="arrow">↕</span></th>
      <th data-key="group">Grp<span class="arrow">↕</span></th>
      <th data-key="mismatch">Bugs<span class="arrow">↕</span></th>
      <th data-key="flagged">Flagged<span class="arrow">↕</span></th>
      <th data-key="zero">Zero<span class="arrow">↕</span></th>
      <th data-key="bucket">Likely bucket<span class="arrow">↕</span></th>
      <th>What to do / evidence / notes</th>
    </tr></thead><tbody></tbody>
  </table></div>
</section>

<section class="panel active" id="panel-sites">
  <div class="toolbar"><input type="search" id="sites-search" placeholder="Filter by site, state, or scraper…"><span class="count" id="sites-count"></span></div>
  <div class="tablewrap"><table id="sites-table">
    <thead><tr>
      <th data-key="site">Site<span class="arrow">↕</span></th>
      <th data-key="state">State<span class="arrow">↕</span></th>
      <th data-key="scraper">Scraper<span class="arrow">↕</span></th>
      <th data-key="found">Events<span class="arrow">↕</span></th>
      <th>Link</th><th data-key="status">Status<span class="arrow">↕</span></th><th>Comments — is 0 really 0?</th>
    </tr></thead><tbody></tbody>
  </table></div>
</section>

<section class="panel" id="panel-age">
  <div class="toolbar"><input type="search" id="age-search" placeholder="Filter by site or scraper…"><span class="count" id="age-count"></span></div>
  <div class="tablewrap"><table id="age-table">
    <thead><tr>
      <th data-key="site">Site<span class="arrow">↕</span></th>
      <th data-key="scraper">Scraper<span class="arrow">↕</span></th>
      <th>Mix</th>
      <th data-key="allAges">All<span class="arrow">↕</span></th>
      <th data-key="babies">0-2<span class="arrow">↕</span></th>
      <th data-key="preschool">3-5<span class="arrow">↕</span></th>
      <th data-key="kids">6-8<span class="arrow">↕</span></th>
      <th data-key="tweens">9-12<span class="arrow">↕</span></th>
      <th data-key="teens">13-18<span class="arrow">↕</span></th>
      <th data-key="total">Total<span class="arrow">↕</span></th>
      <th>Link</th><th>Comments — does the site match?</th>
    </tr></thead><tbody></tbody>
  </table></div>
</section>

<section class="panel" id="panel-flag">
  <div class="toolbar"><input type="search" id="flag-search" placeholder="Filter by site or scraper…"><span class="count" id="flag-count"></span></div>
  <div class="tablewrap"><table id="flag-table">
    <thead><tr>
      <th data-key="scraper">Scraper<span class="arrow">↕</span></th>
      <th data-key="site">Site<span class="arrow">↕</span></th>
      <th data-key="pct">All Ages %<span class="arrow">↕</span></th>
      <th data-key="total">Events<span class="arrow">↕</span></th>
      <th>Link</th><th>Comments</th>
    </tr></thead><tbody></tbody>
  </table></div>
</section>

<section class="panel" id="panel-cov">
  <div class="toolbar"><input type="search" id="cov-search" placeholder="Filter by scraper, group, or status…"><span class="count" id="cov-count"></span></div>
  <div class="tablewrap"><table id="cov-table">
    <thead><tr>
      <th data-key="scraper">Scraper<span class="arrow">↕</span></th>
      <th data-key="group">Group<span class="arrow">↕</span></th>
      <th data-key="state">State<span class="arrow">↕</span></th>
      <th data-key="siteRows">Library rows<span class="arrow">↕</span></th>
      <th data-key="ageRows">Age rows<span class="arrow">↕</span></th>
      <th data-key="events">Events<span class="arrow">↕</span></th>
      <th data-key="status">Status<span class="arrow">↕</span></th>
      <th data-key="lastrun">Last run<span class="arrow">↕</span></th>
      <th>Why</th>
    </tr></thead><tbody></tbody>
  </table></div>
</section>

<footer>
  Generated by <code>scripts/generate-site-report.js</code> from <code>LIBRARY-SITE-AUDIT.md</code>,
  <code>AGE-RANGE-AUDIT.md</code>, and <code>reports/verification-comments.json</code>.
  Regenerated in full each run — edit the audit files, not this page.
</footer>
</div>

<script>
const SITES = ${jsonLiteral(sites)};
const AGES = ${jsonLiteral(ages)};
const COMMENTS = ${jsonLiteral(comments)};
const ROSTER = ${jsonLiteral(roster)};
const COVERAGE = ${jsonLiteral(coverage.map(r => [...r, r[8] ? r[8].date : '']))};
const FIXQUEUE = ${jsonLiteral(fixQueue)};
const GLOBAL_NOTE = ${jsonLiteral(globalNote)};
const PENDING = ${jsonLiteral(pending)};
const NOTES = ${jsonLiteral(notes)};
const LIB_DATE = ${jsonLiteral(libDate || '')};
const AGE_DATE = ${jsonLiteral(ageDate || '')};
const RUN_DATE = ${jsonLiteral(runDate)};
const KNOWN_LEGIT = new Set(${jsonLiteral(KNOWN_LEGIT_ALL_AGES)});
const MISSING = ${jsonLiteral(MISSING)};

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmt(n){return (n===null||n===undefined)?MISSING:Number(n).toLocaleString();}

// Last-run cell. TODAY is highlighted: that scraper has run since the audit files were built,
// so its numbers here are fresher than the counts in the other tabs.
function runCell(run){
  if(!run) return '<td class="runcell"><span class="rowstat s-unknown">never</span></td>';
  const today = RUN_DATE;
  const cls = run.date === today ? 'ran-today' : 'ran-older';
  const inv = (run.invalid === null || run.invalid === undefined) ? '' :
    ' · <b'+(run.invalid>0?' class="bad"':'')+'>'+run.invalid+' invalid</b>';
  return '<td class="runcell"><span class="runbadge '+cls+'">'+esc(run.date)+'</span>'
    + '<div class="rundetail">'+run.found+' found · '+run.nu+' new'+inv+'</div></td>';
}
function pendingBlock(scraper){
  const p = PENDING[scraper];
  if(!p) return '';
  return '<div class="pendbox"><span class="rowstat s-awaiting">awaiting</span> <b>'+esc(p.what||'')+'</b>'
    + (p.expect ? '<div class="pd">'+esc(p.expect)+'</div>' : '')
    + (p.confirm ? '<div class="pd mono">'+esc(p.confirm)+'</div>' : '')
    + '</div>';
}
function commentCell(scraper,site){
  const c = COMMENTS[scraper+'|||'+site];
  if(!c) return '<td class="comment-cell">'+MISSING+'</td>';
  const cls = c.verdict==='MISMATCH'?'crit':c.verdict==='MATCHES'?'ok':'muted';
  return '<td class="comment-cell"><span class="verdict-pill '+cls+'">'+esc(c.verdict)+'</span>'+esc(c.comment)+'</td>';
}
function linkCell(url,kind){
  if(!url) return '<td>'+MISSING+'</td>';
  const tag = kind==='event' ? '<span class="tag evt">event</span>' : '';
  return '<td><a href="'+esc(url)+'" target="_blank" rel="noopener">Visit ↗</a>'+tag+'</td>';
}

// Flagged is derived live from AGES — never a hand-maintained list.
const FLAGGED = AGES
  .filter(r => r[8] >= 20 && !KNOWN_LEGIT.has(r[1]) && (r[2]/r[8]) >= 0.7)
  .map(r => [r[1], r[0], +(100*r[2]/r[8]).toFixed(1), r[8], r[9], r[10]])
  .sort((a,b) => b[2]-a[2]);

// ---- stats
(function(){
  const totalFound = SITES.reduce((s,r)=> s + (r[3]||0), 0);
  const scraperSet = new Set(SITES.map(r=>r[2]));
  const ageTotal = AGES.reduce((s,r)=> s + (r[8]||0), 0);
  const cv = Object.values(COMMENTS);
  const mism = cv.filter(c=>c.verdict==='MISMATCH').length;
  const match = cv.filter(c=>c.verdict==='MATCHES').length;
  const covered = COVERAGE.filter(r=>r[6]!=='none').length;
  const missingCount = COVERAGE.filter(r=>r[6]==='none').length;
  document.getElementById('stat-row').innerHTML = [
    ['accent', SITES.length, 'Library sites tracked'],
    ['', fmt(totalFound), 'Events found (library audit)'],
    ['', scraperSet.size, 'Distinct library scrapers'],
    ['', fmt(AGES.length), 'Sites in age audit'],
    ['', fmt(ageTotal), 'New events tagged this cycle'],
    ['warn', FLAGGED.length, 'Sites flagged ≥70% All Ages'],
    ['', cv.length, 'Sites deep-dived'],
    ['crit', mism, 'Confirmed scraper bugs'],
    ['', match, 'Confirmed accurate'],
    ['accent', ROSTER.length, 'Active scrapers (registry)'],
    ['', covered, 'Scrapers with data this cycle'],
    [missingCount ? 'warn' : '', missingCount, 'Scrapers awaiting this cycle'],
    [Object.keys(PENDING).length ? 'accent' : '', Object.keys(PENDING).length, 'Scrapers with unverified changes'],
    ['accent', COVERAGE.filter(r => r[8] && r[8].date === RUN_DATE).length, 'Scrapers run today'],
  ].map(([cls,n,l]) => '<div class="stat '+cls+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');

  const b = [];
  if(NOTES.length) NOTES.forEach(n => b.push('<div class="banner warn">'+esc(n)+'</div>'));
  // No banner for the no-rows-yet count: the 'Scrapers awaiting this cycle' stat tile already
  // states it, and every Coverage row carries status 'none' with its own reason. Banners are
  // reserved for conditions no row or tile can express — currently only audit parse failures.
  document.getElementById('banners').innerHTML = b.join('');
})();

// ---- tabs
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.panel).classList.add('active');
  });
});

function buildTable({rows,tbody,ths,keyMap,searchInput,countEl,rowRenderer,searchFields}){
  let sortKey=null, sortDir=1;
  ths.forEach(th=>{ if(th.dataset.key!==undefined) th.dataset.sortIdx=keyMap[th.dataset.key]; });
  function render(){
    const q=(searchInput.value||'').toLowerCase().trim();
    let out = q ? rows.filter(r=>searchFields(r).toLowerCase().includes(q)) : rows.slice();
    if(sortKey!==null){
      out.sort((a,b)=>{
        const av=a[sortKey], bv=b[sortKey];
        if(av===null&&bv===null) return 0;
        if(av===null) return 1;      // missing values always sort last
        if(bv===null) return -1;
        if(typeof av==='number'&&typeof bv==='number') return (av-bv)*sortDir;
        return String(av).localeCompare(String(bv))*sortDir;
      });
    }
    tbody.innerHTML = out.map(rowRenderer).join('');
    countEl.textContent = out.length.toLocaleString()+' of '+rows.length.toLocaleString()+' rows';
  }
  searchInput.addEventListener('input',render);
  ths.forEach(th=>{
    if(th.dataset.key===undefined) return;
    th.addEventListener('click',()=>{
      const k=parseInt(th.dataset.sortIdx,10);
      if(sortKey===k) sortDir*=-1; else {sortKey=k;sortDir=1;}
      ths.forEach(c=>c.classList.remove('sorted'));
      th.classList.add('sorted');
      const a=th.querySelector('.arrow'); if(a) a.textContent = sortDir>0?'↑':'↓';
      render();
    });
  });
  render();
}

// Sites: [site,state,scraper,found,gap,url,kind]
buildTable({
  rows: SITES.slice().sort((a,b)=>(b[3]||0)-(a[3]||0)),
  tbody: document.querySelector('#sites-table tbody'),
  ths: Array.from(document.querySelectorAll('#sites-table thead th')),
  keyMap: {site:0,state:1,scraper:2,found:3,status:7},
  searchInput: document.getElementById('sites-search'),
  countEl: document.getElementById('sites-count'),
  searchFields: r => r[0]+' '+r[1]+' '+r[2]+' '+(r[7]||''),
  rowRenderer: r =>
    '<tr><td class="site">'+esc(r[0])+(r[4]?'<span class="tag gap" title="'+esc(r[4])+'">gap</span>':'')+'</td>'+
    '<td>'+esc(r[1])+'</td><td class="scraper">'+esc(r[2])+'</td>'+
    '<td class="num">'+(r[3]===null?'<span class="tag missing">no count</span>':fmt(r[3]))+'</td>'+
    linkCell(r[5],r[6]) +
    '<td class="statuscell"><span class="rowstat s-'+esc(r[7]||'unknown')+'">'+esc(r[7]||'unknown')+'</span>'+
      (r[8] ? '<div class="statdetail">'+esc(r[8])+'</div>' : '')+'</td>' +
    commentCell(r[2],r[0]) + '</tr>'
});

// Ages: [site,scraper,all,babies,pre,kids,tween,teen,total,url,kind,note]
buildTable({
  rows: AGES.slice().sort((a,b)=>(b[8]||0)-(a[8]||0)),
  tbody: document.querySelector('#age-table tbody'),
  ths: Array.from(document.querySelectorAll('#age-table thead th')),
  keyMap: {site:0,scraper:1,allAges:2,babies:3,preschool:4,kids:5,tweens:6,teens:7,total:8},
  searchInput: document.getElementById('age-search'),
  countEl: document.getElementById('age-count'),
  searchFields: r => r[0]+' '+r[1],
  rowRenderer: r => {
    const t=r[8]||1;
    const segs=[[r[2],'seg-all'],[r[3],'seg-babies'],[r[4],'seg-pre'],[r[5],'seg-kids'],[r[6],'seg-tween'],[r[7],'seg-teen']];
    const bar='<div class="agebar">'+segs.map(([v,c])=> v>0?'<span class="'+c+'" style="width:'+(100*v/t).toFixed(1)+'%"></span>':'').join('')+'</div>';
    return '<tr><td class="site">'+esc(r[0])+(r[11]?'<span class="tag gap" title="'+esc(r[11])+'">check</span>':'')+'</td>'+
      '<td class="scraper">'+esc(r[1])+'</td><td>'+bar+'</td>'+
      [2,3,4,5,6,7,8].map(i=>'<td class="num">'+fmt(r[i])+'</td>').join('')+
      linkCell(r[9],r[10]) + commentCell(r[1],r[0]) + '</tr>';
  }
});

// Flagged: [scraper,site,pct,total,url,kind]
buildTable({
  rows: FLAGGED,
  tbody: document.querySelector('#flag-table tbody'),
  ths: Array.from(document.querySelectorAll('#flag-table thead th')),
  keyMap: {scraper:0,site:1,pct:2,total:3},
  searchInput: document.getElementById('flag-search'),
  countEl: document.getElementById('flag-count'),
  searchFields: r => r[0]+' '+r[1],
  rowRenderer: r =>
    '<tr><td class="scraper">'+esc(r[0])+'</td><td class="site">'+esc(r[1])+'</td>'+
    '<td class="num"><span class="pct-flag '+(r[2]>=90?'crit':'warn')+'">'+r[2].toFixed(1)+'%</span></td>'+
    '<td class="num">'+fmt(r[3])+'</td>'+ linkCell(r[4],r[5]) + commentCell(r[0],r[1]) + '</tr>'
});

// Fix queue: [scraper,group,file,mismatch,flagged,zero,unverif,bucket,action,affected,evidence,note,priority,score]
(function(){
  if(GLOBAL_NOTE && GLOBAL_NOTE.note){
    document.getElementById('global-note').innerHTML =
      '<div class="gnote"><b>Always:</b> '+esc(GLOBAL_NOTE.note)+'</div>';
  }
  buildTable({
    rows: FIXQUEUE,
    tbody: document.querySelector('#fix-table tbody'),
    ths: Array.from(document.querySelectorAll('#fix-table thead th')),
    keyMap: {scraper:0,group:1,mismatch:3,flagged:4,zero:5,bucket:7},
    searchInput: document.getElementById('fix-search'),
    countEl: document.getElementById('fix-count'),
    searchFields: r => r[0]+' '+r[7]+' '+r[2]+' '+r[11]+' '+r[9].join(' '),
    rowRenderer: r => {
      const bucket = r[7] ? '<span class="bucket b-'+esc(r[7])+'">'+esc(r[7])+'</span>' : MISSING;
      let detail = '';
      if(r[11]) detail += '<div class="pin '+(r[12]==='high'?'hi':'')+'"><b>Pinned note'+
        (r[12]==='high'?' · high':'')+':</b> '+esc(r[11])+'</div>';
      if(r[8]) detail += '<div class="action">'+esc(r[8])+'</div>';
      if(r[2] && r[2]!==MISSING) detail += '<div class="filepath">'+esc(r[2])+'</div>';
      if(r[9].length) detail += '<div class="affected"><b>Affected:</b> '+r[9].map(esc).join(' · ')+
        (r[3]>r[9].length?' <i>+'+(r[3]-r[9].length)+' more</i>':'')+'</div>';
      if(r[10].length) detail += '<details class="ev"><summary>Evidence ('+r[10].length+')</summary>'+
        r[10].map(e=>'<div>'+esc(e)+'</div>').join('')+'</details>';
      if(r[6]) detail += '<div class="unv">'+r[6]+' site(s) UNVERIFIABLE — recheck before concluding anything.</div>';
      detail += pendingBlock(r[0]);
      return '<tr><td class="scraper">'+esc(r[0])+'</td><td class="num">'+esc(r[1])+'</td>'+
        '<td class="num">'+(r[3]?'<b class="bug">'+r[3]+'</b>':'0')+'</td>'+
        '<td class="num">'+fmt(r[4])+'</td><td class="num">'+fmt(r[5])+'</td>'+
        '<td>'+bucket+'</td><td class="detail">'+(detail||MISSING)+'</td></tr>';
    }
  });
})();

// Coverage: [scraper,group,state,siteRows,ageRows,events,status,why]
buildTable({
  rows: COVERAGE,
  tbody: document.querySelector('#cov-table tbody'),
  ths: Array.from(document.querySelectorAll('#cov-table thead th')),
  keyMap: {scraper:0,group:1,state:2,siteRows:3,ageRows:4,events:5,status:6,lastrun:9},
  searchInput: document.getElementById('cov-search'),
  countEl: document.getElementById('cov-count'),
  searchFields: r => r[0]+' '+r[1]+' '+r[2]+' '+r[6]+' '+(r[8]?r[8].date:'never')+(PENDING[r[0]]?' awaiting pending':''),
  rowRenderer: r =>
    '<tr><td class="scraper">'+esc(r[0])+(PENDING[r[0]]?'<span class="tag await">awaiting</span>':'')+'</td><td class="num">'+esc(r[1])+'</td><td>'+esc(r[2])+'</td>'+
    '<td class="num">'+fmt(r[3])+'</td><td class="num">'+fmt(r[4])+'</td><td class="num">'+fmt(r[5])+'</td>'+
    '<td><span class="status '+esc(r[6])+'">'+esc(r[6])+'</span></td>'+
    runCell(r[8]) +
    '<td class="comment-cell">'+esc(r[7])+pendingBlock(r[0])+'</td></tr>'
});
</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- main

function main() {
  console.log('Generating site report…');

  const notes = [];
  const { idx: cfgIdx, counts: cfgCounts, byName: cfgByName } = loadConfigIndex();
  const { rows: sitesRaw, dataDate: libDate, error: sitesErr } = loadSites();
  const { rows: ages, dataDate: ageDate, error: agesErr } = loadAges();
  if (sitesErr) notes.push('Library audit: ' + sitesErr + ' — the Library sites tab will be empty.');
  if (agesErr) notes.push('Age audit: ' + agesErr + ' — the Age breakdown and Flagged tabs will be empty.');

  // A site's own NAME TEXT can drift between audit cycles for the same real site
  // (e.g. "Anne Arundel County Public Library (AACPL)" vs "Anne Arundel County
  // Public Library" — tableRows()'s own dedup keys on the raw site string, so text
  // drift defeats it and both rows survive as if they were different sites). Collapse
  // on cfgKey(site) WITHIN THE SAME SCRAPER — the same normalization config-matching
  // already uses (strips a trailing "(...)" and punctuation) — keeping whichever row
  // appears LAST in file order (tableRows scans top-to-bottom across all `## date`
  // sections, so later position = more recent run).
  //
  // Deliberately NOT gated on cfgCounts(scraper)===0 ("single-system"): that count
  // comes from loadConfigIndex()'s regex parser, which only recognizes a LITERAL
  // quoted url string per config entry. A scraper whose LIBRARIES array sets
  // `url: SOME_CONSTANT` instead of a string literal silently undercounts to 0 even
  // when it configures many real sites — found 2026-08-09 live: this exact pattern
  // in scraper-sandhill-regional-library-nc.js (url: LISTING_URL, all 16 branches)
  // made SandhillRegional-NC register as cfgCounts===0, and an earlier version of
  // this collapse that trusted that count wiped 10 real branches down to 1 row —
  // exactly the "No aggregation, ever" rule this file's own header warns against.
  // cfgKey-per-site is safe regardless of whether cfgCounts is right, because two
  // real distinct branches (different names) never share a cfgKey.
  const sites = (() => {
    const byKey = new Map();   // "scraper|||cfgKey(site)" -> row (last one wins)
    const order = [];
    sitesRaw.forEach(r => {
      const k = r[2] + '|||' + cfgKey(r[0]);
      if (!byKey.has(k)) order.push(k);
      byKey.set(k, r);
    });
    return order.map(k => byKey.get(k));
  })();

  const comments = loadComments();
  const roster = loadRoster();
  const fixNotes = loadFixNotes();
  const runLog = loadRunLog();
  const globalNote = fixNotes._global || null;
  const pending = (fixNotes._pending && typeof fixNotes._pending === 'object' && !Array.isArray(fixNotes._pending)) ? fixNotes._pending : {};

  console.log(`  library rows : ${sites.length}`);
  console.log(`  age rows     : ${ages.length}`);
  console.log(`  verdicts     : ${Object.keys(comments).length}`);
  console.log(`  active roster: ${roster.length}`);

  // ---- completeness reconciliation.
  // Every active scraper gets a Coverage row whether or not it produced audit rows,
  // and any scraper that appears in the audits but NOT in the active roster is added
  // too (flagged), so nothing observed is silently discarded either.
  const siteCounts = new Map();
  const siteEvents = new Map();
  sites.forEach(r => {
    siteCounts.set(r[2], (siteCounts.get(r[2]) || 0) + 1);
    siteEvents.set(r[2], (siteEvents.get(r[2]) || 0) + (r[3] || 0));
  });
  const ageCounts = new Map();
  const ageEvents = new Map();
  ages.forEach(r => {
    ageCounts.set(r[1], (ageCounts.get(r[1]) || 0) + 1);
    ageEvents.set(r[1], (ageEvents.get(r[1]) || 0) + (r[8] || 0));
  });

  const rosterNames = new Set(roster.map(r => r.name));
  const coverage = roster.map(r => {
    const s = siteCounts.get(r.name) || 0;
    const a = ageCounts.get(r.name) || 0;
    const ev = (siteEvents.get(r.name) || 0) + (ageEvents.get(r.name) || 0);
    const run = runLog.get(r.name) || null;
    let status, why;
    if (s && a) { status = 'full'; why = 'Present in both audits.'; }
    else if (s || a) {
      status = 'partial';
      why = s ? 'Library audit only — no attributable new events in the age audit this cycle.'
              : 'Age audit only — not a library-family scraper, or its library rows have not landed yet.';
    } else if (run && run.found > 0 && (!libDate || run.date >= libDate)) {
      // It HAS produced events — the audit files just have not been rebuilt since. Steps 3b/3c
      // only run during the daily diagnosis, so a scraper built or run after the last audit
      // reads as "no data" unless we say otherwise. GoogleCalendar-MD hit this the day it was
      // built: 169 found, 116 saved, and a Coverage status of `none`.
      status = 'unaudited';
      why = `Ran ${run.date} and found ${run.found} event(s) (${run.nu} new), but the audit files were last rebuilt ${libDate || 'earlier'} so it has no rows there yet. Not a coverage gap — Steps 3b/3c will pick it up on the next diagnosis.`;
    } else {
      status = 'none';
      why = `No rows in either audit, and no run since ${libDate || 'the audit was built'} that found anything. Group ${r.group} — expected on that group's next run day.`;
    }
    return [r.name, r.group, r.state, s, a, ev, status, why, run];
  });

  // Scrapers seen in the audits that the registry no longer marks active.
  const orphans = [];
  [...siteCounts.keys(), ...ageCounts.keys()].forEach(name => {
    if (name === MISSING || rosterNames.has(name) || orphans.includes(name)) return;
    orphans.push(name);
  });
  orphans.sort().forEach(name => {
    coverage.push([
      name, MISSING, MISSING,
      siteCounts.get(name) || 0, ageCounts.get(name) || 0,
      (siteEvents.get(name) || 0) + (ageEvents.get(name) || 0),
      'partial',
      'Appears in the audit files but is not an active scraper in scraper-registry.js — stale row, renamed scraper, or an inactive-region entry. Kept so nothing is dropped.',
      runLog.get(name) || null,
    ]);
  });
  if (orphans.length) {
    notes.push(`${orphans.length} scraper name(s) in the audit files are not active in scraper-registry.js: ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? ', …' : ''}. Listed in Coverage.`);
  }

  const ranToday = coverage.filter(r => r[8] && r[8].date === new Date().toISOString().slice(0,10)).length;
  console.log(`  last-run data : ${runLog.size} scrapers in scraper-summary.log, ${ranToday} ran today`);
  const missing = coverage.filter(r => r[6] === 'none').length;
  console.log(`  coverage     : ${coverage.length} rows (${missing} awaiting this cycle, ${orphans.length} not in active registry)`);

  // Per-row status: compare the audit's link against what the config says today.
  // (cfgIdx/cfgCounts/cfgByName loaded earlier, before the single-system collapse above.)
  const rosterByName = new Map(roster.map(x => [x.name, x]));   // for state-aware "moved to" naming
  let nStale = 0, nGone = 0, nMoved = 0, nMismatch = 0;
  sites.forEach(r => {
    const cur = cfgIdx.get(r[2] + '|||' + cfgKey(r[0]));
    const auditHost = hostOf(r[5]);
    let status = 'unknown', detail = '';
    if (cur === undefined) {
      const owners = [...(cfgByName.get(cfgKey(r[0])) || [])].filter(k => k !== r[2]);
      if ((cfgCounts.get(r[2]) || 0) === 0) {
        // Single-system scraper: it has no per-site config array because it IS one site.
        // Reporting "unmatched" here was a false alarm — Pratt-Library, AACPL and
        // Howard-County all read as unmatched purely for lacking a list to match against.
        status = 'current';
        detail = 'single-system scraper — it covers one site and has no per-site config list to match against';
      } else if (owners.length) {
        // Deliberately handed to another scraper, which is different from "we lost it".
        // Several registry keys can share one file (the Communico and LibCal families do), so
        // prefer the key whose state matches this row — naming "Communico-CA" as the new owner
        // of a Maryland library would read as exactly the cross-state mix-up we keep fixing.
        // The new owner MUST serve the same state. Library names repeat across states, so a
        // name match alone is not a move: "Hightower Memorial Library" was removed from
        // WordPress-AL as having no website, and a same-named but entirely different library
        // exists in WordPress-GA. Claiming that as the new owner would repeat the exact
        // cross-state mix-up this project has spent days undoing.
        // A registry entry marked 'Multi' spans states by definition — its real
        // per-site state lives in each config entry, not on the registry key — so
        // comparing the key's state to the row's would never match and a genuine
        // hand-off reads as "removed with no replacement". Seen 2026-08-11 when
        // Williamson County Public Library moved from WordPress-TN to
        // CivicEngage-Libraries: the destination configures it as TN, but the key
        // is 'Multi', so the report told the owner the library had been dropped.
        // Multi keys still have to clear the name match above, which is what stops
        // this from re-opening the cross-state mix-up the guard exists to prevent.
        const sameState = owners.filter(k => {
          const st = (rosterByName.get(k) || {}).state;
          return st === r[1] || st === 'Multi';
        });
        if (sameState.length) {
          status = 'moved';
          detail = 'no longer configured in ' + r[2] + '; now configured by ' + sameState.slice(0, 3).join(', ')
            + '. Counts and link below are from the older run, before the move.';
          nMoved++;
        } else {
          status = 'unmatched';
          detail = 'no longer configured in ' + r[2] + '. A scraper elsewhere configures this NAME ('
            + owners.slice(0, 2).join(', ') + ') but for a different state, so it is not the same library. '
            + 'Treat as removed-with-no-replacement until someone confirms otherwise.';
          nGone++;
        }
      } else if (cfgKey(r[0]) === cfgKey(r[2])) {
        // The site column holds the SCRAPER's own name rather than a library
        // name — a legacy aggregate row from a cycle that recorded one line per
        // scraper instead of one per site. There is no library here to match, so
        // reporting it as "unmatched to config" reads like lost coverage when it
        // is really a malformed audit row. Surfaced by the owner 2026-08-11 on
        // "CivicEngage-Libraries (VA)".
        status = 'placeholder';
        detail = 'the audit put the scraper name in the site column instead of a library name, so there is nothing to match against config. '
          + 'A legacy aggregate row, not a coverage gap — the real per-site rows for this scraper are listed separately.';
      } else {
        status = 'unmatched';
        detail = 'could not be matched to an entry in ' + r[2] + "'s config, and no other scraper configures this name — the name may differ there, or the entry may have been removed. Not confirmed either way.";
        nGone++;
      }
    } else if (!auditHost) {
      // Config has this site, but the audit row itself never recorded a link to
      // verify against — there is no evidence this domain is still right, so it
      // must not render with the same green badge as a confirmed host match.
      status = 'no-link'; detail = 'no link recorded in the audit — nothing to verify the config domain against';
    } else if (hostOf(cur) === auditHost) {
      status = 'current'; detail = 'config still points at this domain';
    } else {
      status = 'refixed';
      detail = 'URL corrected since this scrape: config now points at ' + hostOf(cur) + '. Counts and link below are from the older run.';
      nStale++;
    }
    // A confirmed MISMATCH verdict is real, verified evidence that this specific
    // site is broken. 'current' only proves the config's URL hasn't changed — it
    // says nothing about whether the scraper actually extracts real events, so a
    // green "current" badge sitting next to a red MISMATCH verdict pill is a
    // direct visual contradiction (found 2026-08-09 on WordPress-GA — Auburn
    // Library read 'current' with 0 found while its own verification comment
    // said the live site has real, dated August events the scraper is missing).
    // Scoped to ONLY the 'current' case: 'refixed'/'moved'/'unmatched' already
    // carry their own more specific problem detail, and a MISMATCH verdict
    // recorded against an OLD URL may no longer even apply once refixed/moved —
    // overriding those too would need reasoning this fix doesn't attempt.
    // UNVERIFIABLE is deliberately NOT overridden either: it means unconfirmed
    // either way, not a proven bug, so downgrading 'current' to a false "broken"
    // reading would overclaim what is actually known.
    const verdict = comments[r[2] + '|||' + r[0]];
    if (verdict && verdict.verdict === 'MISMATCH' && status === 'current') {
      status = 'mismatch';
      detail = 'confirmed bug: ' + verdict.comment;
      nMismatch++;
    }
    r.push(status, detail, cur || '');
  });
  console.log(`  row status   : ${nStale} URL-corrected-since-scrape, ${nMoved} moved-to-another-scraper, ${nGone} unmatched-to-config, ${nMismatch} confirmed-mismatch`);

  const fixQueue = buildFixQueue({ sites, ages, comments, roster, fixNotes });
  const pinned = fixQueue.filter(r => r[11]).length;
  const bugs = fixQueue.reduce((s, r) => s + r[3], 0);
  console.log(`  fix queue    : ${fixQueue.length} scrapers (${bugs} confirmed bugs, ${pinned} pinned note(s))`);

  const runDate = new Date().toISOString().slice(0, 10);
  const html = buildHtml({ sites, ages, comments, roster, coverage, runDate, notes, fixQueue, globalNote, pending, libDate, ageDate });

  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html);
  console.log(`\nWrote ${path.relative(ROOT, OUT_HTML)} (${(html.length / 1024).toFixed(0)} KB)`);

  // Completeness assertion — every active scraper must be represented.
  const covered = new Set(coverage.map(r => r[0]));
  const dropped = roster.filter(r => !covered.has(r.name));
  if (dropped.length) {
    console.error(`\nFAIL: ${dropped.length} active scraper(s) missing from the report: ${dropped.map(d => d.name).join(', ')}`);
    process.exit(1);
  }
  console.log(`Completeness OK: all ${roster.length} active scrapers represented.`);
}

main();

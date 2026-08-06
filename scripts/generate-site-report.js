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

// Pulls every data row out of the first table whose header row matches `headerRe`.
function tableRows(md, headerRe, expectedCols) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith('|')) { if (inTable) break; continue; }
    if (!inTable) {
      if (headerRe.test(line)) { inTable = true; }
      continue;
    }
    if (isSeparator(line)) continue;
    const c = cells(line);
    if (c.length >= expectedCols) out.push(c);
  }
  return out;
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

// ---------------------------------------------------------------- load sources

function loadSites() {
  if (!fs.existsSync(LIB_MD)) return { rows: [], error: 'LIBRARY-SITE-AUDIT.md not found' };
  const md = fs.readFileSync(LIB_MD, 'utf8');
  const dataDate = newestDate(md, new Date().toISOString().slice(0,10));
  const raw = tableRows(md, /Library Website\s*\|\s*State/i, 5);
  const rows = raw.map(c => {
    const { n, note } = parseCount(c[3]);
    const { url, kind } = parseLink(c[4]);
    const site = c[0] || MISSING;
    const state = c[1] || MISSING;
    const scraper = c[2] || MISSING;
    // gap = this row could not be broken down to a real per-site count.
    const gap = note || (/aggregate|not itemized|no per-library/i.test(site) ? 'aggregate row' : '');
    return [site, state, scraper, n, gap, url, kind];
  });
  return { rows, dataDate, error: raw.length ? '' : 'no parseable rows in LIBRARY-SITE-AUDIT.md' };
}

function loadAges() {
  if (!fs.existsSync(AGE_MD)) return { rows: [], error: 'AGE-RANGE-AUDIT.md not found' };
  const md = fs.readFileSync(AGE_MD, 'utf8');
  const dataDate = newestDate(md, new Date().toISOString().slice(0,10));
  const raw = tableRows(md, /Site\s*\|\s*Scraper\s*\|\s*All Ages/i, 10);
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
      <th>Link</th><th>Comments — is 0 really 0?</th>
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
const COVERAGE = ${jsonLiteral(coverage)};
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
  ].map(([cls,n,l]) => '<div class="stat '+cls+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');

  const b = [];
  if(NOTES.length) NOTES.forEach(n => b.push('<div class="banner warn">'+esc(n)+'</div>'));
  const stale = [LIB_DATE, AGE_DATE].filter(d => d && d < RUN_DATE);
  if(stale.length){
    b.push('<div class="banner warn"><b>Counts and links below are last-scrape data, not current config.</b> '
      + 'The library audit is dated ' + esc(LIB_DATE || '?') + ' and the age audit ' + esc(AGE_DATE || '?')
      + ', while this page was generated ' + esc(RUN_DATE) + '. Scraper config edits made since the last run '
      + '(corrected URLs, renamed scrapers) will NOT appear here until those scrapers run again and Steps 3b/3c rebuild the audit files. '
      + 'A Link column showing an old domain means the audit is stale, not that the fix was lost.</div>');
  }
  if(PENDING && PENDING.length){
    b.push('<div class="banner pending"><b>Pending verification — '+PENDING.length+' item(s).</b> '
      + 'Each is a change already made whose effect has not been observed yet. Confirm it, then delete that entry from <code>reports/fix-notes.json</code>.'
      + '<ul>' + PENDING.map(function(p){ return '<li><b>'+esc(p.what||'')+'</b>'
          + (p.expect ? ' — expect: '+esc(p.expect) : '')
          + (p.confirm ? '<br><span class="mono">'+esc(p.confirm)+'</span>' : '')
          + (p.added ? ' <i>(added '+esc(p.added)+')</i>' : '') + '</li>'; }).join('') + '</ul></div>');
  }
  if(missingCount) b.push('<div class="banner"><b>'+missingCount+' of '+ROSTER.length+
    ' active scrapers have no rows yet this cycle.</b> They are listed in the Coverage tab with status <i>none</i> — most are simply assigned to a rotation group that has not run yet.</div>');
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
  keyMap: {site:0,state:1,scraper:2,found:3},
  searchInput: document.getElementById('sites-search'),
  countEl: document.getElementById('sites-count'),
  searchFields: r => r[0]+' '+r[1]+' '+r[2],
  rowRenderer: r =>
    '<tr><td class="site">'+esc(r[0])+(r[4]?'<span class="tag gap" title="'+esc(r[4])+'">gap</span>':'')+'</td>'+
    '<td>'+esc(r[1])+'</td><td class="scraper">'+esc(r[2])+'</td>'+
    '<td class="num">'+(r[3]===null?'<span class="tag missing">no count</span>':fmt(r[3]))+'</td>'+
    linkCell(r[5],r[6]) + commentCell(r[2],r[0]) + '</tr>'
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
  keyMap: {scraper:0,group:1,state:2,siteRows:3,ageRows:4,events:5,status:6},
  searchInput: document.getElementById('cov-search'),
  countEl: document.getElementById('cov-count'),
  searchFields: r => r[0]+' '+r[1]+' '+r[2]+' '+r[6],
  rowRenderer: r =>
    '<tr><td class="scraper">'+esc(r[0])+'</td><td class="num">'+esc(r[1])+'</td><td>'+esc(r[2])+'</td>'+
    '<td class="num">'+fmt(r[3])+'</td><td class="num">'+fmt(r[4])+'</td><td class="num">'+fmt(r[5])+'</td>'+
    '<td><span class="status '+esc(r[6])+'">'+esc(r[6])+'</span></td>'+
    '<td class="comment-cell">'+esc(r[7])+'</td></tr>'
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
  const { rows: sites, dataDate: libDate, error: sitesErr } = loadSites();
  const { rows: ages, dataDate: ageDate, error: agesErr } = loadAges();
  if (sitesErr) notes.push('Library audit: ' + sitesErr + ' — the Library sites tab will be empty.');
  if (agesErr) notes.push('Age audit: ' + agesErr + ' — the Age breakdown and Flagged tabs will be empty.');

  const comments = loadComments();
  const roster = loadRoster();
  const fixNotes = loadFixNotes();
  const globalNote = fixNotes._global || null;
  const pending = Array.isArray(fixNotes._pending) ? fixNotes._pending : [];

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
    let status, why;
    if (s && a) { status = 'full'; why = 'Present in both audits.'; }
    else if (s || a) {
      status = 'partial';
      why = s ? 'Library audit only — no attributable new events in the age audit this cycle.'
              : 'Age audit only — not a library-family scraper, or its library rows have not landed yet.';
    } else {
      status = 'none';
      why = `No rows yet this cycle. Group ${r.group} — expected on that group's next run day.`;
    }
    return [r.name, r.group, r.state, s, a, ev, status, why];
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
    ]);
  });
  if (orphans.length) {
    notes.push(`${orphans.length} scraper name(s) in the audit files are not active in scraper-registry.js: ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? ', …' : ''}. Listed in Coverage.`);
  }

  const missing = coverage.filter(r => r[6] === 'none').length;
  console.log(`  coverage     : ${coverage.length} rows (${missing} awaiting this cycle, ${orphans.length} not in active registry)`);

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

#!/usr/bin/env node

/**
 * SCRAPER FIX TRENDS
 *
 * Reads SCRAPER-FIX-LOG.jsonl (repo root) and reports trends across
 * diagnosis sessions: category breakdown, trend vs the prior window,
 * repeat-offender scrapers, and a gap-check against git history to catch
 * a stale log before it silently goes unmaintained (see SCRAPER-FIX-PLAN.md's
 * "Progress log" section for what that failure mode looks like — last real
 * entry 2026-05-15 despite continuous scraper commits since).
 *
 * Fully offline: only reads the local JSONL file and local `git log`. No
 * Supabase import, no egress.
 *
 * Usage:
 *   node scripts/scraper-fix-trends.js                    # last 30 days vs prior 30
 *   node scripts/scraper-fix-trends.js --days 90
 *   node scripts/scraper-fix-trends.js --repeat-threshold 2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'SCRAPER-FIX-LOG.jsonl');

const CATEGORIES = ['site-change', 'code-bug', 'seed-data', 'new-coverage', 'other'];

// Entries using a shared-infra/multi-scraper sentinel (a file path, or an
// "-ALL" suffix) are excluded from repeat-offender counting — they already
// represent "this affects many scrapers," not one recurring source.
function isSentinel(name) {
  return /\.js$/i.test(name) || name.includes('/') || /-ALL$/i.test(name);
}

function loadEntries() {
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`⚠️  ${LOG_FILE} does not exist yet — nothing to report.`);
    return [];
  }
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const entries = [];
  lines.forEach((line, i) => {
    try {
      const obj = JSON.parse(line);
      entries.push(obj);
    } catch (e) {
      console.error(`⚠️  Line ${i + 1} is not valid JSON, skipping: ${e.message}`);
    }
  });
  return entries;
}

// Plain YYYY-MM-DD string comparison throughout — avoids timezone/time-of-day
// off-by-one errors that come from comparing a midnight-parsed entry date
// against a `new Date()`-based window boundary that carries the current
// time-of-day (a boundary-day entry would otherwise look "just before" the
// window start simply because midnight < 1pm on the same calendar day).
function dateStr(d) {
  // Local calendar date, not UTC (toISOString() would shift the boundary by
  // several hours depending on timezone, which matters when "today" is used
  // as a window edge).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inWindow(entry, startStr, endStr) {
  return entry.date >= startStr && entry.date < endStr;
}

function row(label, value, total) {
  const n = String(value ?? '?').padStart(6);
  let pct = '';
  if (typeof value === 'number' && typeof total === 'number' && total > 0) {
    pct = ` (${((value / total) * 100).toFixed(1)}%)`;
  }
  console.log(`    ${label.padEnd(16)} ${n}${pct}`);
}

// Badge meaning is category-specific, not generic "up=bad":
//   code-bug / seed-data trending down or flat = healthy (these should get
//     exhausted over time as bugs/bad seed data get found and fixed).
//   site-change flat or proportional = expected, not a problem to fix — it's
//     the permanent cost of scraping 185+ independently-run external sites.
//   new-coverage / other are shown with no judgment badge.
function trendBadge(category, current, prior) {
  if (category === 'new-coverage' || category === 'other') return '⚪';
  if (prior === 0) return '⚪'; // no prior-window data yet — nothing to compare against
  if (category === 'site-change') {
    return current > prior * 1.5 ? '🟡' : '🟢';
  }
  // code-bug, seed-data
  if (current <= prior) return '🟢';
  if (current <= prior * 1.5) return '🟡';
  return '🔴';
}

function main() {
  const args = process.argv.slice(2);
  const options = { days: 30, repeatThreshold: 3 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--days' && args[i + 1]) {
      const v = parseInt(args[++i], 10);
      if (!Number.isInteger(v) || v <= 0) {
        console.error(`❌ --days must be a positive integer, got "${args[i]}"`);
        process.exit(1);
      }
      options.days = v;
    } else if (arg === '--repeat-threshold' && args[i + 1]) {
      const v = parseInt(args[++i], 10);
      if (!Number.isInteger(v) || v <= 0) {
        console.error(`❌ --repeat-threshold must be a positive integer, got "${args[i]}"`);
        process.exit(1);
      }
      options.repeatThreshold = v;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Scraper Fix Trends

Usage:
  node scripts/scraper-fix-trends.js                    # last 30 days vs prior 30
  node scripts/scraper-fix-trends.js --days 90
  node scripts/scraper-fix-trends.js --repeat-threshold 2
      `);
      process.exit(0);
    }
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1); // exclusive upper bound so "today" is included
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - options.days);
  const priorStart = new Date(windowStart);
  priorStart.setDate(priorStart.getDate() - options.days);

  const todayStr = dateStr(now);
  const tomorrowStr = dateStr(tomorrow);
  const windowStartStr = dateStr(windowStart);
  const priorStartStr = dateStr(priorStart);

  const entries = loadEntries();
  const thisWindow = entries.filter(e => inWindow(e, windowStartStr, tomorrowStr));
  const priorWindow = entries.filter(e => inWindow(e, priorStartStr, windowStartStr));

  console.log('\n' + '═'.repeat(60));
  console.log('  SCRAPER FIX TRENDS');
  console.log('═'.repeat(60));
  console.log(`  Window: last ${options.days} days (${windowStartStr} → ${todayStr})`);
  console.log(`  Entries in window: ${thisWindow.length}  (prior window: ${priorWindow.length})`);

  // ── Category breakdown ──
  console.log('\n📊 CATEGORY BREAKDOWN (this window)');
  console.log('─'.repeat(60));
  const counts = {};
  CATEGORIES.forEach(c => { counts[c] = thisWindow.filter(e => e.category === c).length; });
  CATEGORIES.forEach(c => row(c, counts[c], thisWindow.length));
  const uncategorized = thisWindow.filter(e => !CATEGORIES.includes(e.category));
  if (uncategorized.length > 0) {
    row('(unrecognized)', uncategorized.length, thisWindow.length);
  }

  // ── Trend vs prior window ──
  console.log('\n📈 TREND VS PRIOR WINDOW');
  console.log('─'.repeat(60));
  if (priorWindow.length === 0) {
    console.log('    ℹ️  Prior window has no entries yet (log is new or window is early)');
    console.log('       — trend badges are informational only until there is real history to compare.');
  }
  const priorCounts = {};
  CATEGORIES.forEach(c => { priorCounts[c] = priorWindow.filter(e => e.category === c).length; });
  CATEGORIES.forEach(c => {
    const badge = trendBadge(c, counts[c], priorCounts[c]);
    console.log(`    ${badge} ${c.padEnd(14)} ${String(priorCounts[c]).padStart(3)} → ${String(counts[c]).padStart(3)}`);
  });
  console.log('    (🟢 healthy  🟡 worth a glance  🔴 rising — code-bug/seed-data should trend down;');
  console.log('     site-change staying flat is expected, not a problem)');

  // ── Repeat offenders ──
  console.log('\n🔁 REPEAT OFFENDERS (this window, ≥' + options.repeatThreshold + ' fixes)');
  console.log('─'.repeat(60));
  const scraperCounts = {};
  thisWindow.forEach(e => {
    (e.scrapers || []).forEach(name => {
      if (isSentinel(name)) return;
      scraperCounts[name] = (scraperCounts[name] || 0) + 1;
    });
  });
  const offenders = Object.entries(scraperCounts)
    .filter(([, n]) => n >= options.repeatThreshold)
    .sort((a, b) => b[1] - a[1]);
  if (offenders.length === 0) {
    console.log('    None — no single source needed repeat fixes this window.');
  } else {
    offenders.forEach(([name, n]) => {
      console.log(`    ⚠️  ${name.padEnd(30)} ${n} fixes — consider an official API/RSS feed or dropping this source`);
    });
  }

  // ── Gap check ──
  console.log('\n🕳️  GAP CHECK (log vs git history)');
  console.log('─'.repeat(60));
  try {
    // date/subject per commit, so pure-"feat:" days (new-coverage, which the
    // logging instructions don't require an entry for) can be told apart
    // from days with a real fix commit that's missing its log line. Delimit
    // with git's own %x1f (unit separator) rather than a literal string —
    // execSync shells out via cmd.exe on Windows, which caret-escapes `^`
    // and mangles any custom delimiter built from shell-special characters.
    const gitOut = execSync(
      `git log --since="${windowStartStr}" --date=format:%Y-%m-%d --pretty=format:%ad%x1f%s -- scrapers/ database/ scripts/`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    const commitsByDate = {};
    gitOut.trim().split('\n').filter(Boolean).forEach(line => {
      const [date, subject] = line.split('\x1f');
      (commitsByDate[date] = commitsByDate[date] || []).push(subject);
    });
    const loggedDates = new Set(thisWindow.map(e => e.date));
    const allDates = Object.keys(commitsByDate).sort();
    const missingDates = allDates.filter(d => !loggedDates.has(d));
    const missingFixDates = missingDates.filter(d => commitsByDate[d].some(s => !/^feat:/i.test(s)));
    const missingFeatOnlyDates = missingDates.filter(d => !missingFixDates.includes(d));

    if (missingFixDates.length === 0) {
      console.log('    ✅ Every date with a non-feat commit in this window has a matching log entry.');
    } else {
      console.log(`    ⚠️  ${missingFixDates.length} date(s) had a likely fix commit but no fix-log entry:`);
      missingFixDates.forEach(d => console.log(`       - ${d}: ${commitsByDate[d].filter(s => !/^feat:/i.test(s)).join('; ')}`));
    }
    if (missingFeatOnlyDates.length > 0) {
      console.log(`    ℹ️  ${missingFeatOnlyDates.length} more date(s) had only "feat:" commits (new-coverage) — no entry expected: ${missingFeatOnlyDates.join(', ')}`);
    }
  } catch (e) {
    console.log(`    ⚠️  Could not run git log for gap check: ${e.message}`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

main();

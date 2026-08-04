/**
 * Shared formatting/writing for scrapers/logs/scraper-summary.log.
 *
 * Extracted from local-scraper-runner.js so that macaroni-runner-group{1,2,3}.js
 * (which run as separate child processes, not through local-scraper-runner.js's
 * runScraper()) can write rows into the exact same table instead of only
 * logging to their own separate logs/macaroni-group{N}-<date>.log file. Keeping
 * one shared formatter means the column layout can never drift between the two
 * callers.
 */
const fs = require('fs');
const path = require('path');

const SUMMARY_FILE = path.join(__dirname, '..', 'logs', 'scraper-summary.log');

// Fixed-width columns shared by EVERY per-scraper line written to scraper-summary.log —
// both the live line logged the moment each scraper finishes, and the recap table at the
// end of a run. Every row always shows Dupes and Invalid so a scraper with 0 invalid-date
// skips doesn't look indistinguishable from one that was never measured at all.
const SUMMARY_COL_WIDTH = 34;
const SUMMARY_TABLE_HEADER = `${'SCRAPER'.padEnd(SUMMARY_COL_WIDTH)} ${'FOUND'.padStart(6)} ${'NEW'.padStart(6)} ${'DUPES'.padStart(6)} ${'INVALID'.padStart(7)} ${'TIME(s)'.padStart(8)}`;
const SUMMARY_TABLE_DIVIDER = '-'.repeat(SUMMARY_TABLE_HEADER.length);

function logSummary(message) {
  try {
    const ts = new Date().toISOString();
    fs.appendFileSync(SUMMARY_FILE, `[${ts}] ${message}\n`);
  } catch (err) {
    // Ignore file write errors
  }
}

function formatSummaryRow(r) {
  if (!r.success) {
    const name = ('❌ ' + r.name).padEnd(SUMMARY_COL_WIDTH);
    const time = typeof r.duration === 'number' ? `  (${r.duration.toFixed(1)}s)` : '';
    return `${name} FAILED — ${(r.error || 'unknown error').slice(0, 40)}${time}`;
  }
  const found = r.stats?.found ?? 0;
  const prefix = found === 0 ? '⚠️  ' : '   ';
  const name = (prefix + r.name).padEnd(SUMMARY_COL_WIDTH);
  return `${name} ${String(found).padStart(6)} ${String(r.stats?.new ?? 0).padStart(6)} ${String(r.stats?.duplicates ?? 0).padStart(6)} ${String(r.stats?.invalidDate ?? 0).padStart(7)} ${String(r.duration?.toFixed(1) ?? '?').padStart(8)}`;
}

module.exports = {
  SUMMARY_FILE,
  SUMMARY_COL_WIDTH,
  SUMMARY_TABLE_HEADER,
  SUMMARY_TABLE_DIVIDER,
  logSummary,
  formatSummaryRow,
};

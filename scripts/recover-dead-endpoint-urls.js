#!/usr/bin/env node
/**
 * recover-dead-endpoint-urls.js — find the REAL calendar URL for library entries whose
 * configured events path is dead, instead of writing them off.
 *
 * WHY
 * ---
 * 53 of the still-live MISMATCH verdicts read "dead-endpoint: HTTP 404 on the configured
 * URL". That phrasing hides an important distinction, and the two halves need opposite
 * responses:
 *
 *   The HOST is dead      (DNS fails, parked, for-sale page)  -> guard it; real gap
 *   The host is FINE and  (chesapeakelibrary.org, rcls.org,   -> find the right path;
 *   only the PATH is 404   pomfretlibrary.org all resolve)       coverage is recoverable
 *
 * The configured paths were machine-generated as `{host}/events`, so a 404 on that exact
 * string says almost nothing about whether the library publishes a calendar. Most of these
 * hosts are real libraries with a working calendar at some other path. Guarding them all
 * would convert dozens of recoverable libraries into permanent gaps on the strength of one
 * guessed URL — the same mistake that produced the URLs in the first place.
 *
 * HOW IT JUDGES
 * -------------
 * It does NOT re-implement page judgement. collectSignals() and classify() are imported
 * from verify-sites-puppeteer.js, so a page probed here is judged by exactly the rules the
 * Step 3d verifier uses. A second copy would drift from that one immediately, and the two
 * tools would then disagree about the same page.
 *
 * For each entry it probes candidate URLs in order and stops at the first that classify()
 * calls an extraction-failure — which, in that function's vocabulary, means "this page has
 * real future-dated events". That is the signal we want: a path a scraper could read.
 *
 * VERDICTS
 *   RECOVERED   a candidate path shows future-dated events -> propose it as the new eventsUrl
 *   PLATFORM    a path exists but the events live on LibCal / BiblioCommons / Communico /
 *               TEC / a Google Calendar iframe -> RELOCATION to that family, not a URL edit
 *   ALIVE       host responds but no calendar found on any candidate -> still unknown, NOT dead
 *   DEAD        DNS failure, connection refused, or every candidate 4xx/5xx -> a real gap
 *
 * ALIVE and DEAD are deliberately separate. An unresolved host is unknown, not safe: this
 * repo's standing rule is never to disable on a guess, so only DEAD is ever a candidate for
 * guarding, and even then the evidence line is recorded with it.
 *
 * Read-only. Writes a report; it never edits a scraper file. Applying the result is a
 * separate, deliberate step.
 *
 * Usage:
 *   node scripts/recover-dead-endpoint-urls.js --in=entries.json --out=report.json
 *   node scripts/recover-dead-endpoint-urls.js --in=… --out=… --concurrency=3 --limit=10
 *
 * --in is [{scraper, site, url, eventsUrl, comment}, …].
 * Concurrency defaults to 3; do not raise it while a rotation is running — Chrome is heavy
 * and reports/fix-notes.json records concurrent heavy Chrome as the leading suspect for a
 * past 37-scraper launch failure.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { launchBrowser } = require(path.join(ROOT, 'scrapers', 'helpers', 'puppeteer-config'));
const { collectSignals, classify } = require('./verify-sites-puppeteer.js');

const args = process.argv.slice(2);
const argVal = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const IN = argVal('in');
const OUT = argVal('out');
const LIMIT = parseInt(argVal('limit', '0'), 10);
const CONCURRENCY = Math.max(1, parseInt(argVal('concurrency', '3'), 10));
const NAV_TIMEOUT = parseInt(argVal('timeout', '30000'), 10);
const SETTLE_MS = parseInt(argVal('settle', '2500'), 10);
if (!IN || !OUT) { console.error('Usage: --in=entries.json --out=report.json'); process.exit(1); }

// Ordered by how often each actually holds a public library's calendar, commonest first,
// so a hit usually costs 2-3 page loads rather than the full list.
const CANDIDATE_PATHS = [
  '/events/', '/calendar/', '/events-calendar/', '/event-calendar/',
  '/calendar-of-events/', '/upcoming-events/', '/programs/', '/events-programs/',
  '/whats-happening/', '/news-events/', '/library/events/', '/programs-events/',
  '/'
];

function candidatesFor(entry) {
  const out = [];
  const seen = new Set();
  const push = u => { if (u && !seen.has(u)) { seen.add(u); out.push(u); } };
  push(entry.eventsUrl);
  let origin = null;
  try { origin = new URL(entry.eventsUrl || entry.url).origin; } catch (e) { /* unparseable */ }
  if (origin) for (const p of CANDIDATE_PATHS) push(origin + p);
  return out;
}

async function probe(browser, url, state) {
  const page = await browser.newPage();
  const nav = { status: 0, finalUrl: url, error: '' };
  let sig = null;
  try {
    await page.setViewport({ width: 1440, height: 900 });
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
    nav.status = resp ? resp.status() : 0;
    nav.finalUrl = page.url();
    await new Promise(r => setTimeout(r, SETTLE_MS));
    sig = await page.evaluate(collectSignals);
  } catch (e) {
    nav.error = e.message || String(e);
    if (/timeout/i.test(nav.error)) {
      try { sig = await page.evaluate(collectSignals); nav.error = ''; nav.finalUrl = page.url(); } catch (_) {}
    }
  } finally {
    try { await page.close(); } catch (_) {}
  }
  const [verdict, comment] = classify({ state }, nav, sig);
  return { url, status: nav.status, finalUrl: nav.finalUrl, error: nav.error, verdict, comment };
}

async function recoverOne(browser, entry) {
  const cands = candidatesFor(entry);
  if (!cands.length) {
    return { ...entry, result: 'DEAD', evidence: 'no parseable URL in the config entry', tried: 0 };
  }

  const attempts = [];
  let firstPlatform = null;
  let anyAlive = false;

  for (const url of cands) {
    const r = await probe(browser, url, entry.state || '');
    attempts.push(`${url} -> ${r.status || r.error || '?'} ${r.verdict}`);

    // A DNS failure is a property of the HOST, so no other path can succeed. Stop early.
    if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(r.error || '') ||
        /dead-domain: DNS/i.test(r.comment)) {
      return { ...entry, result: 'DEAD', evidence: `DNS does not resolve (${new URL(url).hostname})`, tried: attempts.length, attempts };
    }
    if (r.status && r.status < 400) anyAlive = true;

    // classify() says "extraction-failure" exactly when it saw real future-dated events.
    if (/^extraction-failure:/.test(r.comment)) {
      const plat = /platform=([a-z-]+)/.exec(r.comment);
      if (plat && plat[1] !== 'tec-wordpress') {
        return { ...entry, result: 'PLATFORM', platform: plat[1], recoveredUrl: r.finalUrl,
          evidence: r.comment.slice(0, 220), tried: attempts.length, attempts };
      }
      return { ...entry, result: 'RECOVERED', recoveredUrl: r.finalUrl,
        evidence: r.comment.slice(0, 220), tried: attempts.length, attempts };
    }

    // A platform marker without dated events is still the actionable finding: the entry is
    // in the wrong scraper family and no path on this host will ever help.
    const p = /platform=([a-z-]+)/.exec(r.comment) || /Google Calendar iframe/.test(r.comment) && ['', 'google-calendar'];
    if (p && !firstPlatform) firstPlatform = { id: p[1], url: r.finalUrl, comment: r.comment };
  }

  if (firstPlatform) {
    return { ...entry, result: 'PLATFORM', platform: firstPlatform.id, recoveredUrl: firstPlatform.url,
      evidence: firstPlatform.comment.slice(0, 220), tried: attempts.length, attempts };
  }
  if (anyAlive) {
    return { ...entry, result: 'ALIVE', evidence: `host responds but no calendar found on ${attempts.length} candidate paths - UNKNOWN, not dead`, tried: attempts.length, attempts };
  }
  return { ...entry, result: 'DEAD', evidence: `every one of ${attempts.length} candidate paths failed`, tried: attempts.length, attempts };
}

(async () => {
  let entries = JSON.parse(fs.readFileSync(IN, 'utf8'));
  if (LIMIT > 0) entries = entries.slice(0, LIMIT);
  console.log(`Probing ${entries.length} entries for a live calendar path (concurrency ${CONCURRENCY})…`);

  const browser = await launchBrowser();
  const out = [];
  let i = 0, done = 0;

  const worker = async () => {
    while (i < entries.length) {
      const e = entries[i++];
      let r;
      try { r = await recoverOne(browser, e); }
      catch (err) { r = { ...e, result: 'ALIVE', evidence: `harness error: ${(err.message || '').slice(0, 90)}`, tried: 0 }; }
      out.push(r);
      done++;
      console.log(`  ${done}/${entries.length}  ${r.result.padEnd(9)} ${String(e.site).slice(0, 44)}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  try { await browser.close(); } catch (_) {}

  fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
  const tally = {};
  out.forEach(r => { tally[r.result] = (tally[r.result] || 0) + 1; });
  console.log('\n' + JSON.stringify(tally));
  console.log(`wrote ${OUT}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

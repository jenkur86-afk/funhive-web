#!/usr/bin/env node
/**
 * verify-sites-puppeteer.js — Step 3d verification using the SAME browser stack the
 * scrapers use, instead of WebFetch.
 *
 * WHY
 * ---
 * On 2026-08-16, 76 of 123 verification fetches (62%) came back UNVERIFIABLE: 403
 * bot-blocks, JS-only calendars, TLS handshake failures. That is not a property of the
 * sites — it is a property of the tool. WebFetch does a plain HTTP GET and cannot run
 * JavaScript; the scrapers drive Puppeteer with stealth args and --ignore-certificate-errors
 * and routinely succeed on exactly those pages.
 *
 * The consequence was worse than wasted effort. The question Step 3d needs answered is
 * "can THE SCRAPER see events here?", and a WebFetch 403 answers a different question and
 * is then recorded as if it answered the real one. This script asks the right question by
 * loading each page through scrapers/helpers/puppeteer-config.js's launchBrowser().
 *
 * WHAT IT DECIDES, AND WHAT IT DELIBERATELY DOES NOT
 * --------------------------------------------------
 * It fully automates "are there real future-dated events on this page?" — mechanical, and
 * the bulk of the volume. It does NOT try to automate "is this the right institution?",
 * the url-collision class (Salem CT resolving to Salem Oregon). That needs judgement. What
 * it does instead is COLLECT THE EVIDENCE for that judgement — final URL after redirects,
 * page title, ZIPs, phone area codes, and state mentions that conflict with the configured
 * state — and surface it, so an agent adjudicates from facts rather than re-fetching.
 *
 * A conflicting state mention is treated as decisive on its own, because it is the single
 * highest-yield signal in this dataset: gastonlibrary.org showing "Gastonia NC 28054" under
 * an SC entry, fayettevillelibrary.org serving a gambling site under three states at once.
 *
 * Output is the exact tuple format merge-verification-comments.js consumes:
 *   ["Site","Scraper","VERDICT","comment"],
 * so this drops into the existing Step 3d flow with no glue.
 *
 * Usage:
 *   node scripts/verify-sites-puppeteer.js --in=sites.txt --out=verdicts.js
 *   node scripts/verify-sites-puppeteer.js --in=sites.txt --out=v.js --concurrency=3 --limit=20
 *
 * Input lines: `Site Name | Scraper-Name | URL [| EXPECTED_STATE]`
 * A URL of `NO-URL` is recorded UNVERIFIABLE without a fetch.
 *
 * Concurrency defaults to 3. Chrome is heavy and reports/fix-notes.json records concurrent
 * heavy Chrome workloads as the leading suspect for a 37-scraper launch failure — do not
 * raise this while a rotation is running.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { launchBrowser } = require(path.join(ROOT, 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : dflt;
};
const IN = argVal('in');
const OUT = argVal('out');
const LIMIT = parseInt(argVal('limit', '0'), 10);
const CONCURRENCY = Math.max(1, parseInt(argVal('concurrency', '3'), 10));
const NAV_TIMEOUT = parseInt(argVal('timeout', '35000'), 10);
const SETTLE_MS = parseInt(argVal('settle', '3500'), 10);   // let JS calendars hydrate

// Only enforced when run directly — this file is also imported for its collectSignals /
// classify rules, and an import has no --in to give.
if (require.main === module && !IN) {
  console.error('Missing --in=<file>  (lines: Site | Scraper | URL [| ST])');
  process.exit(1);
}

// Platforms worth naming: each has a known, different remedy, so "which platform" is the
// actionable half of the finding. All 7 extraction-failures in one 2026-08-16 batch were
// WordPress scrapers pointed at libraries whose calendars live somewhere else entirely.
const PLATFORMS = [
  { id: 'libcal',           re: /libcal\.com|\.libcal\./i,            fix: 'belongs in a LibCal-* scraper' },
  { id: 'librarycalendar',  re: /librarycalendar\.com/i,              fix: 'belongs in LibraryCalendar-Libraries' },
  { id: 'bibliocommons',    re: /bibliocommons\.com/i,                fix: 'belongs in a BiblioCommons-* scraper' },
  { id: 'communico',        re: /libnet\.info|api\.communico\.co/i,   fix: 'belongs in a Communico-* scraper' },
  { id: 'librarymarket',    re: /librarymarket\.com/i,                fix: 'belongs in a LibraryMarket-* scraper' },
  { id: 'google-calendar',  re: /calendar\.google\.com/i,             fix: 'read its public .ics feed, as GoogleCalendar-MD does' },
  { id: 'tec-wordpress',    re: /tribe_events|tribe-events/i,         fix: 'TEC — use tec-rest-helper.js' },
  { id: 'trumba',           re: /trumba\.com/i,                       fix: 'Trumba embed' },
  { id: 'recdesk',          re: /recdesk\.com/i,                      fix: 'RecDesk' }
];

const EMPTY_RE = /no upcoming events|no events (?:are )?(?:currently )?(?:scheduled|found|listed)|there are no events|check back (?:soon|later)|0 events found|no results found/i;

function parseInput(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map(l => l.trim()).filter(Boolean)
    .map(l => {
      const p = l.split('|').map(s => s.trim());
      return { site: p[0], scraper: p[1], url: p[2] || '', state: (p[3] || '').toUpperCase() };
    })
    .filter(r => r.site && r.scraper);
}

/** Runs inside the page. Returns raw signals only — all judgement happens outside. */
function collectSignals() {
  const txt = (document.body ? document.body.innerText : '') || '';
  const html = document.documentElement ? document.documentElement.innerHTML : '';

  // 1. JSON-LD Events — the strongest, least ambiguous signal.
  const ld = [];
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const walk = n => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) return n.forEach(walk);
        const t = n['@type'];
        const isEvent = t === 'Event' || (Array.isArray(t) && t.includes('Event')) ||
                        (typeof t === 'string' && /Event$/.test(t));
        if (isEvent && n.startDate) ld.push({ name: String(n.name || '').slice(0, 90), date: String(n.startDate) });
        Object.values(n).forEach(walk);
      };
      walk(JSON.parse(el.textContent));
    } catch (_) {}
  }

  // 2. <time datetime> — used by TEC, Squarespace and most modern calendar themes.
  // A MONTH-GRID widget also emits one <time> per day cell whose text is just "17".
  // Counting those produced a false "20 future-dated events visible, e.g. 17 2026-08-17"
  // on sheppardlibrary.org/calendar.aspx, which is an empty month view. Day cells are
  // dropped here; a real event needs text with some substance to it.
  const times = [...document.querySelectorAll('time[datetime]')]
    .map(t => ({ date: t.getAttribute('datetime'), text: (t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }))
    .filter(t => t.text && !/^\d{1,2}$/.test(t.text) && t.text.length >= 4)
    .slice(0, 200);

  // 3. Known event-container selectors across the platforms this codebase already parses.
  const SEL = ['.eelistevent', '.tribe-events-calendar-list__event', '.tribe-events-list-event',
               '.eventlist-event', '.s-lc-ea-e', '.event-item', '.event-card', '.event--card',
               '.events-grid-cell-event', '[data-event-id]', '.em-event-list-item'];
  const hits = {};
  for (const s of SEL) { const n = document.querySelectorAll(s).length; if (n) hits[s] = n; }

  // 4. Titles from whichever container matched — gives quotable evidence.
  let sampleTitles = [];
  for (const s of SEL) {
    const els = document.querySelectorAll(s);
    if (els.length) {
      sampleTitles = [...els].slice(0, 5)
        .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90))
        .filter(Boolean);
      break;
    }
  }

  const iframes = [...document.querySelectorAll('iframe')].map(f => f.src).filter(Boolean).slice(0, 10);

  // 5. Yodel widget id. Many MacaroniKid sites migrated to the Yodel widget, which
  // renders NOTHING into the host page — so every one of them classified as
  // "rendered fully but shows no dated events" and was permanently UNVERIFIABLE
  // (34/34 on 2026-09-02). Same detection as scrapers/helpers/yodel-helper.js:
  // <body data-yenabled="1" data-yid="...">. verifyOne() follows this to the
  // widget origin and re-reads the signals there.
  const body = document.body;
  const yid = body && body.getAttribute('data-yenabled') === '1' &&
              (body.getAttribute('data-yid') || '').length > 10
    ? body.getAttribute('data-yid') : null;

  return {
    yid,
    title: (document.title || '').slice(0, 160),
    text: txt.slice(0, 20000),
    htmlSample: html.slice(0, 60000),
    ld, times, hits, sampleTitles, iframes,
    zips: (txt.match(/\b\d{5}(?:-\d{4})?\b/g) || []).slice(0, 20),
    stateMentions: (txt.match(/\b([A-Z]{2})\s+\d{5}\b/g) || []).slice(0, 20),
    areaCodes: (txt.match(/\((\d{3})\)\s*\d{3}-\d{4}/g) || []).slice(0, 10)
  };
}

/** Parse a date string without the UTC-midnight shift CLAUDE.md warns about. */
function toDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T00:00:00');
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function classify(row, nav, sig) {
  const ev = [];  // {name, date}
  if (sig) {
    for (const e of sig.ld) { const d = toDate(e.date); if (d) ev.push({ name: e.name, date: d }); }
    for (const t of sig.times) { const d = toDate(t.date); if (d) ev.push({ name: t.text, date: d }); }
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = ev.filter(e => e.date >= today).sort((a, b) => a.date - b.date);

  // Platform detection over the full HTML plus any iframe srcs and the final URL.
  const hay = sig ? `${sig.htmlSample} ${sig.iframes.join(' ')} ${nav.finalUrl}` : nav.finalUrl;
  const platform = PLATFORMS.find(p => p.re.test(hay));

  // Identity conflict: an address-shaped "ST 12345" that contradicts the configured state.
  let identity = '';
  if (row.state && sig) {
    const seen = [...new Set(sig.stateMentions.map(s => s.trim().slice(0, 2)))];
    const conflict = seen.filter(s => s !== row.state);
    if (conflict.length && !seen.includes(row.state)) {
      identity = `page addresses show ${conflict.join('/')} not ${row.state}`;
    }
  }

  const fmt = d => d.toISOString().slice(0, 10);
  const egs = future.slice(0, 2).map(e => `${(e.name || 'event').slice(0, 45)} ${fmt(e.date)}`).join('; ');

  // --- navigation-level outcomes -----------------------------------------
  if (nav.error) {
    const e = nav.error;
    if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(e))
      return ['MISMATCH', `dead-domain: DNS does not resolve (stealth browser, ${NAV_TIMEOUT}ms)`];
    if (/ERR_CONNECTION_REFUSED/i.test(e))
      return ['MISMATCH', 'dead-domain: connection refused'];
    if (/timeout/i.test(e))
      return ['UNVERIFIABLE', `navigation timeout after ${NAV_TIMEOUT}ms`];
    return ['UNVERIFIABLE', `navigation error: ${e.slice(0, 110)}`];
  }
  if (nav.status >= 400) {
    if (nav.status === 403) return ['UNVERIFIABLE', 'bot-block: 403 even under the stealth browser the scrapers use'];
    return ['MISMATCH', `dead-endpoint: HTTP ${nav.status} on the configured URL`];
  }

  // --- identity outranks content -----------------------------------------
  // If the page belongs to a different state, event counts are irrelevant: scraping it
  // would ingest another state's events under this entry's name.
  if (identity) {
    const t = sig.title ? ` title "${sig.title.slice(0, 60)}"` : '';
    return ['MISMATCH', `url-collision: ${identity};${t}`.slice(0, 240)];
  }

  // --- content -----------------------------------------------------------
  if (future.length) {
    const p = platform ? ` platform=${platform.id} (${platform.fix})` : '';
    return ['MISMATCH', `extraction-failure: ${future.length} future-dated events visible under Puppeteer, e.g. ${egs}.${p}`.slice(0, 240)];
  }

  const emptyHit = sig.text.match(EMPTY_RE);
  if (emptyHit) return ['MATCHES', `live page states no upcoming events ("${emptyHit[0].slice(0, 60)}")`];

  if (platform && platform.id === 'google-calendar')
    return ['UNVERIFIABLE', `events live in a cross-origin Google Calendar iframe — ${platform.fix}`];
  if (platform)
    return ['UNVERIFIABLE', `no dated events in DOM but platform=${platform.id} detected — ${platform.fix}`];

  const containers = Object.entries(sig.hits).map(([k, v]) => `${k}:${v}`).join(',');
  if (containers)
    return ['UNVERIFIABLE', `event containers present (${containers.slice(0, 90)}) but no parseable dates`];

  if (sig.text.trim().length < 400)
    return ['UNVERIFIABLE', `page rendered only ${sig.text.trim().length} chars of text — likely JS-gated or a shell`];

  // Absence of evidence is NOT evidence of absence, and this project has already ruled on
  // it: the 2026-08-10 Lake Sinclair re-check found nothing in a real browser and was still
  // recorded UNVERIFIABLE, not MATCHES, "per the projects rule that an unverifiable site is
  // unknown, not good". MATCHES is only returned above, where the page SAYS it has no
  // upcoming events. A calendar that needs a filter interaction, or one whose events load
  // on a later XHR, looks identical to an empty one from here — and calling that MATCHES
  // would close a real extraction bug as working-as-intended.
  return ['UNVERIFIABLE', 'rendered fully but shows no dated events, no event containers and no explicit empty-state message — cannot distinguish an empty calendar from one needing interaction'];
}

async function verifyOne(browser, row) {
  if (!row.url || row.url === 'NO-URL')
    return [row.site, row.scraper, 'UNVERIFIABLE', 'no URL in scraper config'];

  // GUARDED entries are never fetched. Their configured URL is already PROVEN to point
  // at a different institution and the scraper skips them at run time, so fetching it
  // reads the wrong library and yields advice about the wrong library — on 2026-09-03
  // it recommended moving a Cape Cod library into a LibCal scraper on the strength of a
  // New York library's page. This verdict is deliberately stable so the site stops
  // consuming a fetch every cycle, per Step 3d's don't-re-verify rule.
  if (row.url === 'GUARDED')
    return [row.site, row.scraper, 'UNVERIFIABLE',
      'entry guarded with urlCollision - not fetched, because its configured URL is already proven to belong to another institution. This library is a KNOWN COVERAGE GAP awaiting a correct URL or a relocation, not an unverified site; re-verifying it would only re-read the wrong library.'];

  const page = await browser.newPage();
  const nav = { status: 0, finalUrl: row.url, error: '' };
  let sig = null;
  try {
    await page.setViewport({ width: 1440, height: 900 });
    const resp = await page.goto(row.url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
    nav.status = resp ? resp.status() : 0;
    nav.finalUrl = page.url();
    await new Promise(r => setTimeout(r, SETTLE_MS));
    sig = await page.evaluate(collectSignals);
  } catch (e) {
    nav.error = e.message || String(e);
    // A timeout often still leaves a usable DOM — try to read it before giving up.
    if (/timeout/i.test(nav.error)) {
      try { sig = await page.evaluate(collectSignals); nav.error = ''; nav.finalUrl = page.url(); } catch (_) {}
    }
  } finally {
    try { await page.close(); } catch (_) {}
  }

  // Yodel follow-through. The host page is only a shell for these sites; the events
  // live at the widget origin, which is exactly what scraper-macaroni-*.js reads via
  // yodel-helper.js. Verifying the shell answers the wrong question — it says "no
  // events here" about a page that never had any. Re-read at the widget instead, and
  // say so in the comment so the verdict's basis stays visible.
  let yodelNote = '';
  if (sig && sig.yid && !nav.error && nav.status < 400) {
    const widgetUrl = `https://events.yodel.today/y/widget/${sig.yid}`;
    const wpage = await browser.newPage();
    try {
      await wpage.setViewport({ width: 1440, height: 900 });
      const wresp = await wpage.goto(widgetUrl, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
      await new Promise(r => setTimeout(r, SETTLE_MS));
      const wsig = await wpage.evaluate(collectSignals);
      if (wsig) {
        sig = wsig;
        nav.status = wresp ? wresp.status() : nav.status;
        nav.finalUrl = wpage.url();
        yodelNote = ' [read via Yodel widget, not the host page]';
      }
    } catch (e) {
      yodelNote = ` [Yodel widget unreachable: ${(e.message || '').slice(0, 60)}]`;
    } finally {
      try { await wpage.close(); } catch (_) {}
    }
  }

  let [verdict, comment] = classify(row, nav, sig);
  if (yodelNote) comment = `${comment}${yodelNote}`.slice(0, 250);

  // Record a cross-host redirect: it is how hijacked and rehomed domains announce themselves.
  // Skipped after a Yodel hop — that host change is ours, not the site's, and reporting it
  // as a redirect would label every MacaroniKid site a rehomed domain.
  if (!yodelNote) {
    try {
      const a = new URL(row.url).hostname.replace(/^www\./, '');
      const b = new URL(nav.finalUrl).hostname.replace(/^www\./, '');
      if (a !== b) comment = `${comment} [redirects to ${b}]`.slice(0, 250);
    } catch (_) {}
  }

  return [row.site, row.scraper, verdict, comment.replace(/[|\r\n]+/g, ' ').trim()];
}

// Exported so recover-dead-endpoint-urls.js probes and judges pages with the SAME rules
// this file uses. A second copy of collectSignals/classify would drift from this one the
// first time either changed, and the two tools would then disagree about the same page.
module.exports = { collectSignals, classify, verifyOne, PLATFORMS, EMPTY_RE, toDate };

// Requiring this file must not start a verification run or read process.argv.
if (require.main !== module) return;

(async () => {
  let rows = parseInput(IN);
  if (LIMIT > 0) rows = rows.slice(0, LIMIT);
  console.log(`Verifying ${rows.length} sites with the scrapers' own Puppeteer stack (concurrency ${CONCURRENCY})…`);

  const browser = await launchBrowser();
  const out = [];
  let done = 0, i = 0;

  const worker = async () => {
    while (i < rows.length) {
      const row = rows[i++];
      let res;
      try {
        res = await verifyOne(browser, row);
      } catch (e) {
        res = [row.site, row.scraper, 'UNVERIFIABLE', `harness error: ${(e.message || '').slice(0, 100)}`];
      }
      out.push(res);
      done++;
      process.stdout.write(`\r  ${done}/${rows.length}  ${res[2].padEnd(13)} ${String(res[0]).slice(0, 42).padEnd(42)}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  try { await browser.close(); } catch (_) {}

  const tally = out.reduce((a, r) => (a[r[2]] = (a[r[2]] || 0) + 1, a), {});
  console.log(`\n\nMATCHES ${tally.MATCHES || 0}  MISMATCH ${tally.MISMATCH || 0}  UNVERIFIABLE ${tally.UNVERIFIABLE || 0}`);

  const body = out.map(r => JSON.stringify(r) + ',').join('\n') + '\n';
  if (OUT) {
    fs.writeFileSync(OUT, body, 'utf8');
    console.log(`wrote ${OUT}`);
    console.log(`\nMerge with:\n  node scripts/merge-verification-comments.js --population=zero ${OUT} --save`);
  } else {
    console.log('\n' + body);
  }
  process.exitCode = 0;
})();

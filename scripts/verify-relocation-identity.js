#!/usr/bin/env node
/**
 * verify-relocation-identity.js — before moving a library to another scraper
 * family, prove the destination host actually serves THAT library.
 *
 * WHY: discover-platform-host.js finds which platform host a library's page
 * references. That establishes a PLATFORM, not an IDENTITY. Several of those
 * hosts are library SYSTEMS rather than the library itself
 * (delcolibraries.libcal.com, oslri.libcal.com, uhls.librarycalendar.com), and a
 * system host may serve dozens of branches — pointing one library's entry at it
 * imports the whole system under that library's name. Others simply do not match
 * the name at all (palmharbor.librarycalendar.com for East Lake Community
 * Library). Both cases look identical in a TSV.
 *
 * Library names are mostly geography, so name similarity can never settle this —
 * that is the Worcester/Pelham rule. This fetches the destination host and
 * reports what the PAGE says: its title, whether the expected library name
 * appears in its text, how many distinct branch/location names it advertises,
 * and any "City, ST" / ZIP signals. It returns EVIDENCE and a suggested verdict;
 * it does not edit config.
 *
 * Verdicts:
 *   OWN-CALENDAR  the page is that library, and only that library
 *   SYSTEM-SHARED the page serves several libraries, one of which matches
 *   NO-MATCH      the expected library is not mentioned
 *   UNREACHABLE   could not load
 *
 * A SYSTEM-SHARED destination is NOT a blocker, but it is a different job: the
 * entry needs a per-library filter, not a URL swap.
 *
 *   node scripts/verify-relocation-identity.js --in=rows.json --out=identity.tsv
 *
 * --in is [[site, state, host, family, sourceScraper], ...]
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, createStealthPage } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const IN = arg('in'), OUT = arg('out'), CONC = Math.max(1, parseInt(arg('concurrency', '2'), 10));
if (!IN || !OUT) { console.error('Usage: --in=rows.json --out=identity.tsv'); process.exit(1); }

const rows = JSON.parse(fs.readFileSync(IN, 'utf8'));

// Significant words of a library name, minus the parts every library shares.
const STOP = new Set(['public', 'free', 'library', 'libraries', 'memorial', 'branch',
  'county', 'community', 'regional', 'system', 'district', 'the', 'of', 'and']);
const tokens = n => String(n).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase()
  .split(/[^a-z]+/).filter(w => w.length > 2 && !STOP.has(w));

async function probe(browser, [site, state, host, family, src]) {
  const page = await createStealthPage(browser);
  const url = 'https://' + host;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = resp ? resp.status() : 0;
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate(() => ({
      title: (document.title || '').slice(0, 120),
      text: (document.body ? document.body.innerText : '').slice(0, 40000)
    }));
    await page.close();

    const hay = (info.title + ' ' + info.text).toLowerCase();
    const want = tokens(site);
    const hits = want.filter(w => hay.includes(w));
    const matched = want.length > 0 && hits.length / want.length >= 0.5;

    // How many distinct library-ish names does the page advertise? A single-tenant
    // calendar names one; a system calendar lists its branches.
    const names = new Set(
      (info.text.match(/[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}\s+(?:Library|Libraries)\b/g) || [])
        .map(s => s.replace(/\s+/g, ' ').trim())
    );
    const stateHits = state
      ? (info.text.match(new RegExp('\\b' + state + '\\b\\s*\\d{5}|,\\s*' + state + '\\b', 'g')) || []).length
      : 0;

    let verdict;
    if (!matched) verdict = 'NO-MATCH';
    else if (names.size > 3) verdict = 'SYSTEM-SHARED';
    else verdict = 'OWN-CALENDAR';

    return { site, state, host, family, src, status, verdict,
      title: info.title.replace(/\s+/g, ' '),
      detail: `nameTokens ${hits.length}/${want.length}; distinct library names on page ${names.size}; state signals ${stateHits}` };
  } catch (e) {
    try { await page.close(); } catch {}
    return { site, state, host, family, src, status: 0, verdict: 'UNREACHABLE', title: '', detail: e.message.slice(0, 80) };
  }
}

(async () => {
  const browser = await launchBrowser();
  const results = [];
  let i = 0;
  async function worker() {
    while (i < rows.length) {
      const r = rows[i++];
      const n = i;
      const out = await probe(browser, r);
      results.push(out);
      console.log(`  ${n}/${rows.length}  ${out.verdict.padEnd(14)} ${String(out.site).slice(0, 38).padEnd(40)} ${out.host}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  await browser.close();

  const lines = ['site\tstate\thost\tfamily\tsource\tstatus\tverdict\ttitle\tdetail'];
  for (const r of results) {
    lines.push([r.site, r.state, r.host, r.family, r.src, r.status, r.verdict, r.title, r.detail].join('\t'));
  }
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

  const by = {};
  results.forEach(r => { by[r.verdict] = (by[r.verdict] || 0) + 1; });
  console.log('\n' + Object.entries(by).map(([k, v]) => `${k} ${v}`).join('  '));
  console.log(`wrote ${OUT}`);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });

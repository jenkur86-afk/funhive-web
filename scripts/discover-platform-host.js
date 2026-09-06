#!/usr/bin/env node
/**
 * discover-platform-host.js — for a library whose events live on a platform its
 * current scraper cannot read, find the platform host it actually publishes on.
 *
 * WHY THIS EXISTS
 * ---------------
 * The largest bucket of open bugs is "platform-mismatch": ~108 sites configured
 * in a WordPress-{state} DOM scraper whose events are really on LibCal,
 * Communico, BiblioCommons, LibraryMarket/libnet, Assabet or a Google Calendar.
 * No selector work on the WordPress scraper can ever read those — the fix is to
 * RELOCATE the entry to the family scraper that already parses that platform.
 *
 * The blocker is that the verdicts say WHICH platform but almost never WHICH
 * HOST: of 108, only 2 named a concrete host. This finds the host by loading the
 * library's own configured page and reading the links, iframes and scripts it
 * serves — the same evidence a person would use, gathered mechanically.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not edit config. It emits a worklist with the evidence per site, because
 * the destination scraper also has to cover that state, and because a discovered
 * host still has to be confirmed as the SAME institution — identity comes from the
 * page, never the name. That is the rule the Worcester and Pelham incidents exist
 * to enforce.
 *
 * Uses the scrapers' own launchBrowser(), so it sees what a scraper would see.
 * Keep --concurrency low: Chrome is heavy and reports/fix-notes.json records
 * concurrent heavy Chrome workloads as the leading suspect for a 37-scraper
 * launch failure.
 *
 *   node scripts/discover-platform-host.js --in=sites.txt --out=hosts.tsv --concurrency=2
 *
 * --in lines are `Site | Scraper | URL | STATE` (the verify-sites-puppeteer format).
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, createStealthPage } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'puppeteer-config'));

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const IN = arg('in'), OUT = arg('out'), CONC = Math.max(1, parseInt(arg('concurrency', '2'), 10));
if (!IN || !OUT) { console.error('Usage: --in=sites.txt --out=hosts.tsv [--concurrency=2]'); process.exit(1); }

const rows = fs.readFileSync(IN, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const p = l.split('|').map(s => s.trim());
  return { site: p[0], scraper: p[1], url: p[2], state: p[3] || '' };
}).filter(r => r.url && r.url !== 'NO-URL');

// Platform -> the scraper family that already parses it. Kept here so the output
// says what to DO, not merely what was found.
const FAMILY = {
  'libcal.com': 'LibCal-*',
  'bibliocommons.com': 'BiblioCommons-*',
  'libnet.info': 'LibraryMarket-* / Communico-*',
  'assabetinteractive.com': 'Assabet-NH-MA',
  'librarycalendar.com': 'LibraryCalendar-Libraries',
  'libraryc.org': 'LibraryCalendar-Libraries',
  'calendar.google.com': 'GoogleCalendar-*',
  'trumba.com': 'EventActions-Libraries / Trumba-*',
  'recdesk.com': 'RecDesk-Parks'
};
const HOST_SRC = '([a-z0-9][a-z0-9-]*\\.(?:' +
  Object.keys(FAMILY).map(d => d.replace(/\./g, '\\.')).join('|') + '))';

async function probe(browser, r) {
  const page = await createStealthPage(browser);
  try {
    const resp = await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = resp ? resp.status() : 0;
    await new Promise(res => setTimeout(res, 1500));
    const found = await page.evaluate(() => {
      const out = [];
      const push = v => { if (v) out.push(String(v)); };
      document.querySelectorAll('a[href]').forEach(a => push(a.getAttribute('href')));
      document.querySelectorAll('iframe[src]').forEach(f => push(f.getAttribute('src')));
      document.querySelectorAll('script[src]').forEach(s => push(s.getAttribute('src')));
      push(location.href);
      return out.join(' \n ');
    });
    const re = new RegExp(HOST_SRC, 'ig');
    const hosts = [...new Set((found.match(re) || []).map(h => h.toLowerCase()))]
      .filter(h => !/^www\./.test(h));
    await page.close();
    const domain = hosts.length ? Object.keys(FAMILY).find(d => hosts[0].endsWith(d)) : null;
    return {
      ...r, status, hosts,
      family: domain ? FAMILY[domain] : '',
      note: hosts.length ? 'platform host referenced in page markup' : 'no platform host referenced on the page'
    };
  } catch (e) {
    try { await page.close(); } catch {}
    return { ...r, status: 0, hosts: [], family: '', note: 'fetch failed: ' + e.message.slice(0, 60) };
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
      console.log(`  ${n}/${rows.length}  ${(out.hosts[0] || '-').padEnd(34)} ${out.site.slice(0, 42)}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  await browser.close();

  const lines = ['site\tscraper\tstate\tstatus\tdiscovered_host\tsuggested_family\tnote'];
  for (const r of results) {
    lines.push([r.site, r.scraper, r.state, r.status, r.hosts.join(' '), r.family, r.note].join('\t'));
  }
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

  const hit = results.filter(r => r.hosts.length).length;
  console.log(`\nhosts discovered: ${hit}/${results.length}`);
  const byFam = {};
  results.filter(r => r.family).forEach(r => { byFam[r.family] = (byFam[r.family] || 0) + 1; });
  Object.entries(byFam).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  -> ${f}`));
  console.log(`\nwrote ${OUT}`);
  console.log('Each row still needs the SAME-INSTITUTION check before relocating — a discovered');
  console.log('host is evidence of a platform, not proof of identity.');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
